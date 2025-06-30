import { google } from 'googleapis';
import { googleAuthService } from './googleAuth';
import { storage } from './storage';

export class YouTubeService {
  private youtube;

  constructor() {
    this.youtube = google.youtube({ 
      version: 'v3', 
      auth: process.env.YOUTUBE_API_KEY 
    });
  }

  /**
   * Automatically refresh OAuth tokens when API calls fail due to expired tokens
   */
  async withTokenRefresh<T>(
    userId: string,
    operation: (accessToken: string) => Promise<T>
  ): Promise<T> {
    console.log(`🔑 [TOKEN REFRESH] Starting operation for user ${userId}`);
    
    const account = await storage.getAccountByUserId(userId, 'google');
    if (!account) {
      throw new Error('No Google account found for user');
    }

    if (!account.accessToken || !account.refreshToken) {
      throw new Error('User account missing OAuth tokens - re-authentication required');
    }

    try {
      // Try the operation with current access token
      console.log(`🔑 [TOKEN REFRESH] Attempting operation with current access token`);
      return await operation(account.accessToken);
    } catch (error: any) {
      console.log(`🔑 [TOKEN REFRESH] Operation failed:`, error.message);
      
      // Check if error is authentication-related (401 Unauthorized)
      if (error.code === 401 || error.status === 401 || error.message?.includes('authentication')) {
        console.log(`🔑 [TOKEN REFRESH] Authentication error detected, attempting token refresh`);
        
        try {
          // Refresh the access token
          const refreshedTokens = await googleAuthService.refreshAccessToken(account.refreshToken);
          console.log(`🔑 [TOKEN REFRESH] Successfully refreshed tokens`);
          
          // Calculate new expiry time (tokens typically expire in 1 hour)
          const expiresAt = refreshedTokens.expiry_date || (Date.now() + 3600 * 1000);
          
          // Update account with new tokens
          await storage.updateAccountTokens(account.id, {
            accessToken: refreshedTokens.access_token!,
            refreshToken: refreshedTokens.refresh_token || account.refreshToken,
            expiresAt
          });
          
          console.log(`🔑 [TOKEN REFRESH] Tokens updated in database, retrying operation`);
          
          // Retry the operation with fresh access token
          return await operation(refreshedTokens.access_token!);
        } catch (refreshError: any) {
          console.error(`🔑 [TOKEN REFRESH] Failed to refresh tokens:`, refreshError.message);
          throw new Error(`Authentication failed and token refresh unsuccessful: ${refreshError.message}`);
        }
      } else {
        // Re-throw non-authentication errors
        throw error;
      }
    }
  }

  async getChannelVideos(accessToken: string, maxResults: number = 10) {
    const authClient = googleAuthService.createAuthenticatedClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: authClient });

    // First get the channel's uploads playlist
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      mine: true
    });

    if (!channelResponse.data.items?.length) {
      throw new Error('No channel found');
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      throw new Error('No uploads playlist found');
    }

    // Get videos from uploads playlist
    const playlistResponse = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults
    });

    if (!playlistResponse.data.items?.length) {
      return [];
    }

    // Get detailed video information
    const videoIds = playlistResponse.data.items
      .map(item => item.snippet?.resourceId?.videoId)
      .filter((id): id is string => Boolean(id));
    
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

  async updateVideoTitle(userId: string, videoId: string, newTitle: string) {
    console.log(`🎬 [YOUTUBE API] Updating video ${videoId} to title: "${newTitle}" for user ${userId}`);
    
    return await this.withTokenRefresh(userId, async (accessToken: string) => {
      const authClient = googleAuthService.createAuthenticatedClient(accessToken);
      const youtube = google.youtube({ version: 'v3', auth: authClient });

      // First get current video data
      console.log(`🎬 [YOUTUBE API] Fetching current video data for ${videoId}`);
      const videoResponse = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });

      if (!videoResponse.data.items?.length) {
        console.error(`❌ [YOUTUBE API] Video ${videoId} not found in YouTube`);
        throw new Error('Video not found');
      }

      const currentVideo = videoResponse.data.items[0];
      console.log(`🎬 [YOUTUBE API] Current video title: "${currentVideo.snippet?.title}"`);
      
      // Update the title
      console.log(`🎬 [YOUTUBE API] Sending title update request to YouTube API`);
      await youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            ...currentVideo.snippet,
            title: newTitle
          }
        }
      });

      console.log(`✅ [YOUTUBE API] Successfully updated video ${videoId} title to: "${newTitle}"`);
      return { success: true, newTitle };
    });
  }

  // Legacy method for backward compatibility (will be removed)
  async updateVideoTitleLegacy(accessToken: string, videoId: string, newTitle: string) {
    try {
      console.log(`🎬 [YOUTUBE API] Legacy method - Updating video ${videoId} to title: "${newTitle}"`);
      
      const authClient = googleAuthService.createAuthenticatedClient(accessToken);
      const youtube = google.youtube({ version: 'v3', auth: authClient });

      // First get current video data
      console.log(`🎬 [YOUTUBE API] Fetching current video data for ${videoId}`);
      const videoResponse = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });

      if (!videoResponse.data.items?.length) {
        console.error(`❌ [YOUTUBE API] Video ${videoId} not found in YouTube`);
        throw new Error('Video not found');
      }

      const currentVideo = videoResponse.data.items[0];
      console.log(`🎬 [YOUTUBE API] Current video title: "${currentVideo.snippet?.title}"`);
      
      // Update the title
      console.log(`🎬 [YOUTUBE API] Sending title update request to YouTube API`);
      await youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            ...currentVideo.snippet,
            title: newTitle
          }
        }
      });

      console.log(`✅ [YOUTUBE API] Successfully updated video ${videoId} title to: "${newTitle}"`);
      return { success: true, newTitle };
    } catch (error: any) {
      console.error(`❌ [YOUTUBE API] Failed to update video ${videoId}:`, error.message);
      console.error(`❌ [YOUTUBE API] Error code:`, error.code);
      console.error(`❌ [YOUTUBE API] Error details:`, error.errors);
      throw error;
    }
  }

  async getVideoAnalytics(userId: string, videoId: string, startDate: string, endDate: string) {
    console.log(`📊 [YOUTUBE ANALYTICS] Getting analytics for video ${videoId} (${startDate} to ${endDate}) for user ${userId}`);
    
    return await this.withTokenRefresh(userId, async (accessToken: string) => {
      const authClient = googleAuthService.createAuthenticatedClient(accessToken);
    
    try {
      // Use YouTube Analytics API for accurate metrics
      const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: authClient });
      
      // Get detailed analytics data for the specific date range
      const analyticsResponse = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'views,impressions,ctr,averageViewDuration',
        filters: `video==${videoId}`,
        dimensions: 'day'
      });

      if (!analyticsResponse.data.rows || analyticsResponse.data.rows.length === 0) {
        // Fallback to Data API if Analytics API fails
        console.log('No analytics data found, falling back to basic statistics');
        return await this.getBasicVideoStats(accessToken, videoId);
      }

      // Sum up metrics across all days in the range
      let totalViews = 0;
      let totalImpressions = 0;
      let totalAvgViewDuration = 0;
      let daysWithData = 0;

      analyticsResponse.data.rows.forEach((row: any[]) => {
        if (row && row.length >= 4) {
          totalViews += parseInt(row[1]) || 0;
          totalImpressions += parseInt(row[2]) || 0;
          totalAvgViewDuration += parseInt(row[4]) || 0;
          daysWithData++;
        }
      });

      // Calculate accurate CTR from total impressions and views
      const accurateCtr = totalImpressions > 0 ? (totalViews / totalImpressions) * 100 : 0;

      return {
        views: totalViews,
        impressions: totalImpressions,
        ctr: accurateCtr,
        averageViewDuration: daysWithData > 0 ? totalAvgViewDuration / daysWithData : 0,
        likes: 0, // Not available in Analytics API
        comments: 0 // Not available in Analytics API
      };

    } catch (error) {
      console.error('YouTube Analytics API error:', error);
      // Fallback to basic statistics if Analytics API fails
      return await this.getBasicVideoStats(accessToken, videoId);
    }
    });
  }

  private async getBasicVideoStats(accessToken: string, videoId: string) {
    const authClient = googleAuthService.createAuthenticatedClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: authClient });
    
    const response = await youtube.videos.list({
      part: ['statistics'],
      id: [videoId]
    });

    if (!response.data.items?.length) {
      throw new Error('Video not found');
    }

    const stats = response.data.items[0].statistics;
    const views = parseInt(stats?.viewCount || '0');
    
    return {
      views,
      likes: parseInt(stats?.likeCount || '0'),
      comments: parseInt(stats?.commentCount || '0'),
      // Estimate impressions and CTR based on industry averages when Analytics API unavailable
      impressions: Math.round(views * 8), // Conservative impression-to-view ratio
      ctr: views > 0 ? Math.round((views / (views * 8)) * 100 * 100) / 100 : 0, // Calculate CTR from estimated impressions
      averageViewDuration: 0 // Not available in basic API
    };
  }

  async searchVideos(query: string, maxResults: number = 10) {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults,
      order: 'relevance'
    });

    return response.data.items?.map((item: any) => ({
      id: item.id?.videoId!,
      title: item.snippet?.title,
      description: item.snippet?.description,
      thumbnail: item.snippet?.thumbnails?.medium?.url,
      publishedAt: item.snippet?.publishedAt,
      channelTitle: item.snippet?.channelTitle
    })) || [];
  }

  extractVideoIdFromUrl(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}

export const youtubeService = new YouTubeService();