// server/youtubeService.ts
import { google } from 'googleapis';

import { supabase } from './auth/supabase';
import { rateLimiter } from './services/rateLimiter';
import { storage } from './storage';
import type { User } from '@shared/schema';

export class YouTubeService {
  private youtube;

  constructor() {
    this.youtube = google.youtube({ 
      version: 'v3', 
      auth: process.env.YOUTUBE_API_KEY 
    });
  }

  /**
   * Create an authenticated OAuth2 client for YouTube API
   */
  createAuthenticatedClient(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken
    });
    return oauth2Client;
  }

  /**
   * Refresh Google OAuth access token using refresh token
   * Since Supabase manages OAuth, we can't directly refresh Google tokens
   * Instead, we'll throw an error to prompt re-authentication
   */
  async refreshGoogleAccessToken(refreshToken: string): Promise<string> {
    console.log('⚠️ [YOUTUBE] Google token expired - re-authentication required');
    // With Supabase Auth, we cannot refresh Google tokens directly
    // User must re-authenticate through Supabase OAuth flow
    throw new Error('YouTube authentication expired. Please sign in again to reconnect your account.');
  }

  /**
   * Execute YouTube API operation with automatic token handling
   * Uses tokens from accounts table with automatic refresh
   */
  async withTokenRefresh<T>(
    userId: string,
    operation: (tokens: { accessToken: string; refreshToken: string }) => Promise<T>
  ): Promise<T> {
    try {
      console.log('🔄 [YOUTUBE] Getting tokens for user:', userId);
      
      // Get the Google account with OAuth tokens from accounts table
      const account = await storage.getAccountByUserId(userId, 'google');
      
      if (!account || !account.accessToken || !account.refreshToken) {
        console.error('❌ [YOUTUBE] No Google account found for user:', userId);
        throw new Error('YouTube account not connected. Please reconnect your Google account.');
      }

      // Decrypt the tokens
      let accessToken = '';
      let refreshToken = '';
      
      try {
        const { decryptToken } = await import('./auth');
        accessToken = decryptToken(account.accessToken);
        refreshToken = decryptToken(account.refreshToken);
      } catch (decryptError) {
        console.error('❌ [YOUTUBE] Failed to decrypt tokens:', decryptError);
        throw new Error('Failed to decrypt YouTube tokens. Please reconnect your Google account.');
      }

      console.log('✅ [YOUTUBE] Tokens retrieved from accounts table');

      // Execute the operation with the tokens
      try {
        return await operation({
          accessToken: accessToken,
          refreshToken: refreshToken
        });
      } catch (error: any) {
        console.error('❌ [YOUTUBE] Operation failed:', error);
        
        // If we get a 401, the token might be expired - try to refresh
        if (error.code === 401 || error.response?.status === 401 || error.message?.includes('401')) {
          console.log('🔄 [YOUTUBE] Token expired, attempting refresh...');
          
          try {
            // Refresh the Google OAuth token
            const newAccessToken = await this.refreshGoogleAccessToken(refreshToken);
            
            // Update the accounts table with new token
            const { encryptToken } = await import('./auth');
            await storage.updateAccountTokens(account.id, {
              accessToken: encryptToken(newAccessToken),
              refreshToken: encryptToken(refreshToken), // Keep the same refresh token
              expiresAt: Date.now() + (3600 * 1000) // 1 hour expiry
            });
            
            console.log('✅ [YOUTUBE] Token refreshed successfully');
            
            // Retry the operation with new token
            return await operation({
              accessToken: newAccessToken,
              refreshToken: refreshToken
            });
          } catch (refreshError) {
            console.error('❌ [YOUTUBE] Token refresh failed:', refreshError);
            throw new Error('YouTube authentication expired. Please reconnect your Google account.');
          }
        }
        
        throw error;
      }
    } catch (error: any) {
      console.error('[YOUTUBE] API Error:', error);
      
      if (error.message?.includes('re-authentication required') || 
          error.message?.includes('sign in again') ||
          error.message?.includes('reconnect')) {
        throw error;
      }
      
      throw new Error(`YouTube API error: ${error.message || 'Unknown error'}`);
    }
  }

  async getChannelVideos(userId: string, maxResults: number = 200) {
    console.log(`📺 [YOUTUBE API] Getting channel videos for user ${userId}`);
    
    return await this.withTokenRefresh(userId, async ({ accessToken, refreshToken }) => {
      const authClient = this.createAuthenticatedClient(accessToken);
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

      // Get videos from uploads playlist with pagination
      let allVideos: any[] = [];
      let nextPageToken: string | undefined = undefined;
      const pageSize = Math.min(maxResults, 50); // YouTube API max is 50 per request

      do {
        const playlistResponse: any = await youtube.playlistItems.list({
          part: ['snippet'],
          playlistId: uploadsPlaylistId,
          maxResults: pageSize,
          pageToken: nextPageToken
        });

        if (playlistResponse.data.items?.length) {
          allVideos.push(...playlistResponse.data.items);
        }

        nextPageToken = playlistResponse.data.nextPageToken;
        
        // Continue until we have enough videos or no more pages
      } while (nextPageToken && allVideos.length < maxResults);

      if (!allVideos.length) {
        return [];
      }

      // Get detailed video information
      const videoIds = allVideos
        .map(item => item.snippet?.resourceId?.videoId)
        .filter((id): id is string => Boolean(id))
        .slice(0, maxResults);
      
      // YouTube API allows up to 50 video IDs per request
      const videoDetails: any[] = [];
      for (let i = 0; i < videoIds.length; i += 50) {
        const batchIds = videoIds.slice(i, i + 50);
        
        const videosResponse = await youtube.videos.list({
          part: ['snippet', 'statistics', 'contentDetails'],
          id: batchIds
        });

        if (videosResponse.data.items?.length) {
          videoDetails.push(...videosResponse.data.items);
        }
      }

      console.log(`✅ [YOUTUBE API] Successfully fetched ${videoDetails.length} videos`);
      
      return videoDetails.map((video: any) => ({
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
      }));
    });
  }

  async updateVideoTitle(userId: string, videoId: string, newTitle: string) {
    return await this.withTokenRefresh(userId, async ({ accessToken, refreshToken }) => {
      const authClient = this.createAuthenticatedClient(accessToken);
      const youtube = google.youtube({ version: 'v3', auth: authClient });

      // First get the current video details
      const videoResponse = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });

      if (!videoResponse.data.items?.length) {
        throw new Error('Video not found');
      }

      const video = videoResponse.data.items[0];
      const snippet = video.snippet!;

      // Update only the title, preserve everything else
      const updateResponse = await youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            ...snippet,
            title: newTitle,
            categoryId: snippet.categoryId!
          }
        }
      });

      return updateResponse.data;
    });
  }

  async getVideoAnalytics(userId: string, videoId: string, startDate: Date, endDate: Date) {
    return await this.withTokenRefresh(userId, async ({ accessToken, refreshToken }) => {
      const authClient = this.createAuthenticatedClient(accessToken);
      const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: authClient });

      // First get the channel ID
      const youtube = google.youtube({ version: 'v3', auth: authClient });
      const channelResponse = await youtube.channels.list({
        part: ['id'],
        mine: true
      });

      if (!channelResponse.data.items?.length) {
        throw new Error('No channel found');
      }

      const channelId = channelResponse.data.items[0].id!;

      // Get analytics data including CTR and impressions
      const analyticsResponse = await youtubeAnalytics.reports.query({
        ids: `channel==${channelId}`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,impressions,clicks',
        dimensions: 'video',
        filters: `video==${videoId}`,
        maxResults: 1
      });

      const data = analyticsResponse.data.rows?.[0];
      if (!data) {
        return {
          views: 0,
          watchTime: 0,
          avgViewDuration: 0,
          likes: 0,
          comments: 0,
          impressions: 0,
          clicks: 0,
          ctr: 0
        };
      }

      // Extract values from the response (skip the first item which is video ID)
      const views = (data[1] as number) || 0;
      const estimatedMinutesWatched = (data[2] as number) || 0;
      const averageViewDuration = (data[3] as number) || 0;
      const likes = (data[4] as number) || 0;
      const comments = (data[5] as number) || 0;
      const impressions = (data[6] as number) || 0;
      const clicks = (data[7] as number) || 0;
      
      // Calculate CTR using the formula: CTR = (clicks / impressions) * 100
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      return {
        views,
        watchTime: estimatedMinutesWatched,
        avgViewDuration: averageViewDuration,
        likes,
        comments,
        impressions,
        clicks,
        ctr: Math.round(ctr * 100) / 100 // Round to 2 decimal places
      };
    });
  }

  async getRealTimeMetrics(userId: string, videoId: string) {
    console.log('📊 [YOUTUBE] Getting real-time metrics for video:', videoId);
    
    return await this.withTokenRefresh(userId, async ({ accessToken, refreshToken }) => {
      const authClient = this.createAuthenticatedClient(accessToken);
      const youtube = google.youtube({ version: 'v3', auth: authClient });

      const response = await youtube.videos.list({
        part: ['statistics', 'contentDetails'],
        id: [videoId]
      });

      if (!response.data.items?.length) {
        throw new Error('Video not found');
      }

      const video = response.data.items[0];
      const stats = video.statistics!;

      return {
        viewCount: parseInt(stats.viewCount || '0'),
        likeCount: parseInt(stats.likeCount || '0'),
        commentCount: parseInt(stats.commentCount || '0'),
        duration: video.contentDetails?.duration || 'PT0S'
      };
    });
  }
}

export const youtubeService = new YouTubeService();