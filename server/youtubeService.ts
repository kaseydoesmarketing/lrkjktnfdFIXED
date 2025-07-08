import { google } from 'googleapis';
import { googleAuthService } from './googleAuth';
import { supabase, getYouTubeTokens } from './auth/supabase';
import { rateLimiter } from './services/rateLimiter';
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
   * Get YouTube tokens from Supabase session
   */
  async getTokensFromSession(sessionToken: string) {
    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
    
    if (error || !user) {
      throw new Error('Invalid session');
    }
    
    // Supabase stores provider tokens in identities
    const googleIdentity = user.identities?.find(id => id.provider === 'google');
    
    if (!googleIdentity) {
      throw new Error('No Google identity found');
    }
    
    // Get fresh tokens - Supabase handles refresh automatically
    const { data: { session } } = await supabase.auth.getSession();
    
    return {
      accessToken: session?.provider_token || '',
      refreshToken: session?.provider_refresh_token || '',
      userId: user.id
    };
  }

  /**
   * Execute YouTube API operation with automatic token handling
   */
  async withTokenRefresh<T>(
    userId: string,
    operation: (tokens: { accessToken: string; refreshToken: string }) => Promise<T>
  ): Promise<T> {
    try {
      // Get user's OAuth tokens from the accounts table
      const accounts = await storage.getAccountsByUserId(userId);
      const googleAccount = accounts.find(acc => acc.provider === 'google');
      
      if (!googleAccount || !googleAccount.accessToken) {
        throw new Error('No YouTube access token found. Please reconnect your YouTube account.');
      }
      
      // Try the operation with the current token
      try {
        return await operation({
          accessToken: googleAccount.accessToken,
          refreshToken: googleAccount.refreshToken || ''
        });
      } catch (error: any) {
        // If we get a 401, try to refresh the token
        if (error.code === 401 || error.response?.status === 401 || error.message?.includes('401')) {
          console.log('🔄 [YOUTUBE] Token expired, attempting refresh...');
          
          if (!googleAccount.refreshToken) {
            throw new Error('Authentication expired - please sign in again');
          }
          
          // Refresh the token using Google Auth Service
          const refreshedTokens = await googleAuthService.refreshAccessToken(googleAccount.refreshToken);
          
          // Update the stored tokens
          await storage.updateAccount(googleAccount.id, {
            accessToken: refreshedTokens.access_token!,
            expiresAt: refreshedTokens.expiry_date || null
          });
          
          // Retry the operation with the new token
          return await operation({
            accessToken: refreshedTokens.access_token!,
            refreshToken: googleAccount.refreshToken
          });
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

  // Rest of YouTube methods remain the same...
  async getChannelVideos(userId: string) {
    return await this.withTokenRefresh(userId, async ({ accessToken }) => {
      const authClient = googleAuthService.createAuthenticatedClient(accessToken);
      const youtube = google.youtube({ version: 'v3', auth: authClient });

      const channelResponse = await youtube.channels.list({
        part: ['contentDetails'],
        mine: true
      });

      if (!channelResponse.data.items?.length) {
        throw new Error('No YouTube channel found');
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
      
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

  // Update video title method remains the same
  async updateVideoTitle(userId: string, videoId: string, newTitle: string) {
    return await this.withTokenRefresh(userId, async ({ accessToken }) => {
      const authClient = googleAuthService.createAuthenticatedClient(accessToken);
      const youtube = google.youtube({ version: 'v3', auth: authClient });

      const videoResponse = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });

      if (!videoResponse.data.items?.length) {
        throw new Error('Video not found');
      }

      const currentVideo = videoResponse.data.items[0];
      
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

      return { success: true, newTitle };
    });
  }

  async getVideoAnalytics(userId: string, videoId: string) {
    return await this.withTokenRefresh(userId, async ({ accessToken }) => {
      const authClient = googleAuthService.createAuthenticatedClient(accessToken);
      const youtube = google.youtube({ version: 'v3', auth: authClient });
      
      try {
        const videoResponse = await youtube.videos.list({
          part: ['statistics'],
          id: [videoId]
        });
        
        if (!videoResponse.data.items?.length) {
          throw new Error('Video not found');
        }
        
        const stats = videoResponse.data.items[0].statistics;
        const views = parseInt(stats?.viewCount || '0');
        
        return {
          views,
          impressions: Math.round(views / 0.05), // Estimate based on 5% CTR
          ctr: 5.0, // Default estimate
          averageViewDuration: 120, // 2 minutes estimate
          likes: parseInt(stats?.likeCount || '0'),
          comments: parseInt(stats?.commentCount || '0')
        };
      } catch (error) {
        console.error('Error fetching video analytics:', error);
        throw error;
      }
    });
  }
}

export const youtubeService = new YouTubeService();