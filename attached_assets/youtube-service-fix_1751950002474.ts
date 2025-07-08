// server/youtubeService-fixed.ts
import { google, youtube_v3 } from 'googleapis';
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
    operation: (tokens: { accessToken: string; refreshToken: string }) => Promise<T>
  ): Promise<T> {
    console.log(`[YOUTUBE] Starting operation for user ${userId}`);
    
    // Get tokens from accounts table (single source of truth)
    const account = await storage.getAccountByUserId(userId, 'google');
    
    if (!account) {
      throw new Error('No Google account found for user - re-authentication required');
    }

    if (!account.accessToken || !account.refreshToken) {
      throw new Error('User account missing OAuth tokens - re-authentication required');
    }
    
    const accessToken = account.accessToken;
    const refreshToken = account.refreshToken;

    try {
      // Try the operation with current access token
      return await operation({ accessToken, refreshToken });
    } catch (error: any) {
      console.log(`[YOUTUBE] Operation failed:`, error.message);
      
      // Check if error is authentication-related (401 Unauthorized)
      if (error.code === 401 || error.status === 401 || 
          error.message?.includes('authentication') || 
          error.message?.includes('Invalid Credentials')) {
        
        console.log(`[YOUTUBE] Authentication error detected, attempting token refresh`);
        
        try {
          // Refresh the access token
          const refreshedTokens = await googleAuthService.refreshAccessToken(refreshToken);
          
          if (!refreshedTokens.access_token) {
            throw new Error('Failed to refresh access token');
          }
          
          // Update tokens in accounts table
          await storage.updateAccountTokens(account.id, {
            accessToken: refreshedTokens.access_token,
            refreshToken: refreshedTokens.refresh_token || refreshToken,
            expiresAt: refreshedTokens.expiry_date || null
          });
          
          console.log(`[YOUTUBE] Tokens refreshed successfully, retrying operation`);
          
          // Retry the operation with fresh tokens
          return await operation({ 
            accessToken: refreshedTokens.access_token,
            refreshToken: refreshedTokens.refresh_token || refreshToken
          });
          
        } catch (refreshError: any) {
          console.error(`[YOUTUBE] Token refresh failed:`, refreshError);
          throw new Error(`Authentication failed - re-authentication required: ${refreshError.message}`);
        }
      }
      
      // If not an auth error, throw the original error
      throw error;
    }
  }

  /**
   * Update video title on YouTube
   */
  async updateVideoTitle(videoId: string, newTitle: string, accessToken: string) {
    console.log(`[YOUTUBE] Updating video ${videoId} to title: "${newTitle}"`);
    
    const authClient = googleAuthService.createAuthenticatedClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: authClient });

    try {
      // First get current video data
      const videoResponse = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });

      if (!videoResponse.data.items?.length) {
        throw new Error('Video not found');
      }

      const currentVideo = videoResponse.data.items[0];
      console.log(`[YOUTUBE] Current video title: "${currentVideo.snippet?.title}"`);
      
      // Update the title
      await youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            ...currentVideo.snippet,
            title: newTitle,
            categoryId: currentVideo.snippet?.categoryId
          }
        }
      });

      console.log(`[YOUTUBE] Successfully updated video ${videoId} title to: "${newTitle}"`);
      return { success: true, newTitle };
      
    } catch (error: any) {
      console.error(`[YOUTUBE] Failed to update video title:`, error);
      throw error;
    }
  }

  /**
   * Get video analytics from YouTube Analytics API
   */
  async getVideoAnalytics(videoId: string, accessToken: string) {
    console.log(`[YOUTUBE] Fetching analytics for video ${videoId}`);
    
    const authClient = googleAuthService.createAuthenticatedClient(accessToken);
    const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: authClient });
    
    try {
      // Get analytics for the last 28 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);
      
      const response = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained',
        dimensions: 'video',
        filters: `video==${videoId}`,
      });
      
      const data = response.data.rows?.[0] || [];
      const analytics = {
        views: parseInt(data[1]) || 0,
        estimatedMinutesWatched: parseInt(data[2]) || 0,
        averageViewDuration: parseInt(data[3]) || 0,
        subscribersGained: parseInt(data[4]) || 0,
        impressions: 0, // Will be fetched separately
        clicks: 0, // Will be fetched separately
      };
      
      // Try to get impressions and clicks from YouTube Data API (if available)
      try {
        const youtube = google.youtube({ version: 'v3', auth: authClient });
        const videoStats = await youtube.videos.list({
          part: ['statistics'],
          id: [videoId]
        });
        
        if (videoStats.data.items?.[0]?.statistics) {
          const stats = videoStats.data.items[0].statistics;
          analytics.views = parseInt(stats.viewCount || '0');
          // Note: Impressions and clicks are not available through public API
          // They would need to be estimated or obtained through YouTube Studio API
        }
      } catch (err) {
        console.warn('[YOUTUBE] Could not fetch video statistics:', err);
      }
      
      console.log(`[YOUTUBE] Analytics fetched:`, analytics);
      return analytics;
      
    } catch (error: any) {
      console.error(`[YOUTUBE] Failed to fetch analytics:`, error);
      throw error;
    }
  }

  /**
   * Get user's YouTube channel videos
   */
  async getChannelVideos(userId: string) {
    return await this.withTokenRefresh(userId, async ({ accessToken }) => {
      const authClient = googleAuthService.createAuthenticatedClient(accessToken);
      const youtube = google.youtube({ version: 'v3', auth: authClient });

      // Get user's channel
      const channelResponse = await youtube.channels.list({
        part: ['contentDetails'],
        mine: true
      });

      if (!channelResponse.data.items?.length) {
        throw new Error('No YouTube channel found');
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
      
      // Get videos from uploads playlist
      const videosResponse = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails', 'status'],
        playlistId: uploadsPlaylistId,
        maxResults: 50
      });

      return videosResponse.data.items?.map(item => ({
        id: item.contentDetails?.videoId || '',
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        thumbnail: item.snippet?.thumbnails?.medium?.url || '',
        publishedAt: item.snippet?.publishedAt || '',
        status: item.status?.privacyStatus || 'unknown'
      })) || [];
    });
  }

  /**
   * Get video details
   */
  async getVideoInfo(videoId: string, accessToken: string) {
    const authClient = googleAuthService.createAuthenticatedClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: authClient });

    const response = await youtube.videos.list({
      part: ['snippet', 'statistics', 'status'],
      id: [videoId]
    });

    if (!response.data.items?.length) {
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    return {
      id: video.id || '',
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      thumbnail: video.snippet?.thumbnails?.medium?.url || '',
      publishedAt: video.snippet?.publishedAt || '',
      viewCount: parseInt(video.statistics?.viewCount || '0'),
      likeCount: parseInt(video.statistics?.likeCount || '0'),
      commentCount: parseInt(video.statistics?.commentCount || '0'),
      status: video.status?.privacyStatus || 'unknown'
    };
  }
}

export const youtubeService = new YouTubeService();