// server/youtubeService.ts - Updated methods with rate limiting
import { rateLimiter } from './services/rateLimiter';

// Add this to the existing YouTubeService class

export class YouTubeService {
  // ... existing code ...

  async getChannelVideos(userId: string, maxResults = 10): Promise<any[]> {
    return this.withTokenRefresh(userId, async (youtube) => {
      return rateLimiter.executeWithBackoff(
        async () => {
          try {
            // Get the user's channel
            const channelResponse = await youtube.channels.list({
              part: ['contentDetails'],
              mine: true
            });

            if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
              console.log('No channel found for user');
              return [];
            }

            const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
            if (!uploadsPlaylistId) {
              console.log('No uploads playlist found');
              return [];
            }

            // Get videos from uploads playlist
            const playlistResponse = await youtube.playlistItems.list({
              part: ['snippet', 'contentDetails'],
              playlistId: uploadsPlaylistId,
              maxResults: maxResults
            });

            const videos = playlistResponse.data.items || [];
            
            // Get video details with statistics
            if (videos.length > 0) {
              const videoIds = videos.map(v => v.contentDetails?.videoId).filter(Boolean);
              
              const videosResponse = await youtube.videos.list({
                part: ['snippet', 'statistics', 'contentDetails'],
                id: videoIds
              });

              return videosResponse.data.items?.map((video: any) => ({
                id: video.id!,
                title: video.snippet?.title,
                description: video.snippet?.description,
                thumbnail: video.snippet?.thumbnails?.medium?.url,
                publishedAt: video.snippet?.publishedAt,
                viewCount: parseInt(video.statistics?.viewCount || '0'),
                likeCount: parseInt(video.statistics?.likeCount || '0'),
                commentCount: parseInt(video.statistics?.commentCount || '0'),
                duration: video.contentDetails?.duration,
                status: video.snippet?.liveBroadcastContent === 'none' ? 'published' : video.snippet?.liveBroadcastContent
              })) || [];
            }

            return [];
          } catch (error: any) {
            console.error('Error fetching channel videos:', error);
            
            // If quota exceeded, return friendly error
            if (error.message?.includes('quota')) {
              throw new Error('YouTube API limit reached. Please try again tomorrow.');
            }
            
            throw error;
          }
        },
        3 // Quota cost for this operation
      );
    });
  }

  async updateVideoTitle(videoId: string, newTitle: string, userId: string): Promise<void> {
    return this.withTokenRefresh(userId, async (youtube) => {
      return rateLimiter.executeWithBackoff(
        async () => {
          const response = await youtube.videos.update({
            part: ['snippet'],
            requestBody: {
              id: videoId,
              snippet: {
                title: newTitle,
                categoryId: '22' // Keep existing category
              }
            }
          });

          if (!response.data) {
            throw new Error('Failed to update video title');
          }

          console.log(`✅ Title updated successfully for video ${videoId}`);
        },
        50 // YouTube API quota cost for video update
      );
    });
  }

  async getVideoAnalytics(videoId: string, startDate: Date, endDate: Date, userId: string) {
    return this.withTokenRefresh(userId, async (youtube, youtubeAnalytics) => {
      return rateLimiter.executeWithBackoff(
        async () => {
          const response = await youtubeAnalytics.reports.query({
            ids: 'channel==MINE',
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained',
            dimensions: 'video',
            filters: `video==${videoId}`
          });

          return response.data.rows?.[0] || null;
        },
        10 // Analytics query cost
      );
    });
  }

  // Add quota status endpoint
  getQuotaStatus() {
    return rateLimiter.getQuotaStatus();
  }
}

// Add API endpoint to check quota status
router.get('/api/youtube/quota-status', requireAuth, async (req, res) => {
  try {
    const status = youtubeService.getQuotaStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting quota status:', error);
    res.status(500).json({ error: 'Failed to get quota status' });
  }
});