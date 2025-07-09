import { youtubeAuthService } from './youtubeAuth.js';

interface VideoStats {
  videoId: string;
  title?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  timestamp: Date;
}

export class YouTubeAPIService {
  private quotaTracker = new Map<string, number>();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private DAILY_QUOTA_LIMIT = 9000; // Leave 10% buffer from 10,000

  async getVideoStats(videoId: string, channelId: string, useCache = true): Promise<VideoStats> {
    const cacheKey = `stats:${videoId}`;
    
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`📊 Using cached stats for video ${videoId}`);
        return cached.data;
      }
    }

    // Make API request with quota tracking
    await this.checkQuota('videos.list');
    
    try {
      const youtube = await youtubeAuthService.getYouTubeClient(channelId);
      
      const response = await youtube.videos.list({
        part: ['statistics', 'snippet'],
        id: [videoId],
        fields: 'items(id,snippet/title,statistics(viewCount,likeCount,commentCount))',
      });

      const data = response.data.items?.[0];
      if (!data) {
        throw new Error('Video not found');
      }

      const stats: VideoStats = {
        videoId,
        title: data.snippet?.title,
        viewCount: parseInt(data.statistics?.viewCount || '0'),
        likeCount: parseInt(data.statistics?.likeCount || '0'),
        commentCount: parseInt(data.statistics?.commentCount || '0'),
        timestamp: new Date(),
      };

      // Cache the result
      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      console.log(`✅ Fetched and cached stats for video ${videoId}`);
      
      return stats;
    } catch (error: any) {
      if (error.code === 403 && error.message?.includes('quota')) {
        throw new Error('YouTube API quota exceeded - please try again later');
      }
      throw error;
    }
  }

  async getChannelVideos(channelId: string, maxResults = 10): Promise<any[]> {
    const cacheKey = `channel-videos:${channelId}:${maxResults}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📺 Using cached videos for channel ${channelId}`);
      return cached.data;
    }

    await this.checkQuota('search.list');

    try {
      const youtube = await youtubeAuthService.getYouTubeClient(channelId);
      
      // Get channel info first
      const channelResponse = await youtube.channels.list({
        part: ['contentDetails'],
        id: [channelId],
      });

      const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        throw new Error('Channel uploads playlist not found');
      }

      // Get videos from uploads playlist
      const response = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults,
      });

      const videos = response.data.items?.map(item => ({
        id: item.contentDetails?.videoId,
        title: item.snippet?.title,
        description: item.snippet?.description,
        thumbnail: item.snippet?.thumbnails?.high?.url,
        publishedAt: item.snippet?.publishedAt,
      })) || [];

      // Cache the result
      this.cache.set(cacheKey, { data: videos, timestamp: Date.now() });
      console.log(`✅ Fetched and cached ${videos.length} videos for channel`);
      
      return videos;
    } catch (error: any) {
      if (error.code === 403 && error.message?.includes('quota')) {
        throw new Error('YouTube API quota exceeded');
      }
      throw error;
    }
  }

  async updateVideoTitle(videoId: string, channelId: string, newTitle: string): Promise<void> {
    await this.checkQuota('videos.update');
    
    try {
      const youtube = await youtubeAuthService.getYouTubeClient(channelId);
      
      // First get the current snippet to preserve other fields
      const currentVideo = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId],
      });

      const snippet = currentVideo.data.items?.[0]?.snippet;
      if (!snippet) {
        throw new Error('Video not found');
      }

      // Update only the title
      await youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            ...snippet,
            title: newTitle,
          },
        },
      });

      console.log(`✅ Updated title for video ${videoId}`);
      
      // Clear cache for this video
      this.cache.delete(`stats:${videoId}`);
    } catch (error: any) {
      if (error.code === 403 && error.message?.includes('quota')) {
        throw new Error('YouTube API quota exceeded');
      }
      throw error;
    }
  }

  private async checkQuota(operation: string) {
    const today = new Date().toDateString();
    const key = `${today}:total`;
    
    const current = this.quotaTracker.get(key) || 0;
    const cost = this.getOperationCost(operation);
    
    if (current + cost > this.DAILY_QUOTA_LIMIT) {
      console.error(`⚠️ Quota limit approaching: ${current + cost}/${this.DAILY_QUOTA_LIMIT}`);
      throw new Error('Approaching daily quota limit');
    }
    
    this.quotaTracker.set(key, current + cost);
    console.log(`📊 Quota used today: ${current + cost}/${this.DAILY_QUOTA_LIMIT}`);
  }

  private getOperationCost(operation: string): number {
    const costs: Record<string, number> = {
      'videos.list': 1,
      'videos.update': 50,
      'search.list': 100,
      'channels.list': 1,
      'playlistItems.list': 1,
    };
    return costs[operation] || 1;
  }

  clearCache() {
    this.cache.clear();
    console.log('🧹 YouTube API cache cleared');
  }

  resetQuotaTracking() {
    this.quotaTracker.clear();
    console.log('🔄 Quota tracking reset');
  }
}

export const youtubeAPIService = new YouTubeAPIService();