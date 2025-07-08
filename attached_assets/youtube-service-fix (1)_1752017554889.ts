// server/youtubeService.ts
import { google } from 'googleapis';
import { googleAuthService } from './googleAuth';
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
   * Execute YouTube API operation with automatic token handling
   * Now uses Supabase to get OAuth tokens instead of accounts table
   */
  async withTokenRefresh<T>(
    userId: string,
    operation: (tokens: { accessToken: string; refreshToken: string }) => Promise<T>
  ): Promise<T> {
    try {
      console.log('🔄 [YOUTUBE] Getting tokens for user:', userId);
      
      // First, get the user from our database
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get the current session token from the global context (set by middleware)
      const sessionToken = (global as any).currentRequestToken;
      if (!sessionToken) {
        throw new Error('No session token found. Please re-authenticate.');
      }

      // Get the Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ [YOUTUBE] Failed to get Supabase session:', sessionError);
        throw new Error('No active session. Please reconnect your YouTube account.');
      }

      // Get provider tokens from Supabase
      // Supabase stores provider tokens when user authenticates with Google
      const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser(sessionToken);
      
      if (userError || !supabaseUser) {
        console.error('❌ [YOUTUBE] Failed to get Supabase user:', userError);
        throw new Error('Invalid session. Please reconnect your YouTube account.');
      }

      // Try to get fresh provider token from Supabase
      // This will automatically refresh if needed
      const { data: providerToken, error: tokenError } = await supabase.auth.refreshSession();
      
      if (tokenError || !providerToken.session) {
        console.error('❌ [YOUTUBE] Failed to refresh session:', tokenError);
        throw new Error('Failed to refresh authentication. Please reconnect your YouTube account.');
      }

      // Get the provider token (Google OAuth token)
      const accessToken = providerToken.session.provider_token;
      const refreshToken = providerToken.session.provider_refresh_token;

      if (!accessToken) {
        console.error('❌ [YOUTUBE] No provider token found in session');
        throw new Error('YouTube access token not found. Please reconnect your YouTube account.');
      }

      console.log('✅ [YOUTUBE] Got provider tokens from Supabase');

      // Execute the operation with the tokens
      try {
        return await operation({
          accessToken: accessToken,
          refreshToken: refreshToken || ''
        });
      } catch (error: any) {
        console.error('❌ [YOUTUBE] Operation failed:', error);
        
        // If we get a 401, the token might be expired
        if (error.code === 401 || error.response?.status === 401 || error.message?.includes('401')) {
          throw new Error('YouTube authentication expired. Please reconnect your YouTube account.');
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
      const authClient = googleAuthService.createAuthenticatedClient(accessToken);
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
      const authClient = googleAuthService.createAuthenticatedClient(accessToken);
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

      // Get analytics data
      const analyticsResponse = await youtubeAnalytics.reports.query({
        ids: `channel==${channelId}`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments',
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
          comments: 0
        };
      }

      return {
        views: data[1] as number,
        watchTime: data[2] as number,
        avgViewDuration: data[3] as number,
        likes: data[4] as number,
        comments: data[5] as number
      };
    });
  }

  async getRealTimeMetrics(userId: string, videoId: string) {
    console.log('📊 [YOUTUBE] Getting real-time metrics for video:', videoId);
    
    return await this.withTokenRefresh(userId, async ({ accessToken, refreshToken }) => {
      const authClient = googleAuthService.createAuthenticatedClient(accessToken);
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