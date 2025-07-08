// server/auth/supabase.ts
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
);

// Helper to get YouTube tokens from Supabase session
export async function getYouTubeTokens(accessToken: string) {
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    throw new Error('Invalid session');
  }
  
  // Get the Google OAuth tokens from user metadata
  const providerToken = user.app_metadata.provider_token;
  const providerRefreshToken = user.app_metadata.provider_refresh_token;
  
  if (!providerToken) {
    throw new Error('No YouTube access token found');
  }
  
  return {
    accessToken: providerToken,
    refreshToken: providerRefreshToken,
    userId: user.id,
    email: user.email
  };
}

// ===================================
// server/routes/auth-supabase.ts
import { Router, Request, Response } from 'express';
import { supabase, getYouTubeTokens } from '../auth/supabase';
import { storage } from '../storage';

const router = Router();

// Initiate Google OAuth
router.get('/api/auth/google', async (req: Request, res: Response) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.CLIENT_URL || 'http://localhost:5000'}/api/auth/callback`,
      scopes: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  
  if (error) {
    console.error('OAuth initiation error:', error);
    return res.status(500).json({ error: error.message });
  }
  
  if (data.url) {
    res.redirect(data.url);
  } else {
    res.status(500).json({ error: 'No OAuth URL generated' });
  }
});

// Handle OAuth callback
router.get('/api/auth/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error('OAuth callback error:', error);
    return res.redirect('/login?error=oauth_error');
  }
  
  if (!code) {
    return res.redirect('/login?error=no_code');
  }
  
  try {
    // Exchange code for session
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code as string);
    
    if (sessionError || !data.session) {
      console.error('Session exchange error:', sessionError);
      return res.redirect('/login?error=session_error');
    }
    
    // Set secure cookie with access token
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    
    // Also set refresh token
    res.cookie('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });
    
    // Create or update user in our database
    const { user } = data.session;
    let dbUser = await storage.getUserByEmail(user.email!);
    
    if (!dbUser) {
      // Create new user
      dbUser = await storage.createUser({
        id: user.id,
        email: user.email!,
        name: user.user_metadata.full_name || user.email!.split('@')[0],
        image: user.user_metadata.avatar_url,
        // YouTube channel info can be fetched later
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive'
      });
    }
    
    console.log('✅ OAuth success for user:', dbUser.email);
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('OAuth callback processing error:', error);
    res.redirect('/login?error=processing_error');
  }
});

// Get current user
router.get('/api/auth/me', async (req: Request, res: Response) => {
  const token = req.cookies['sb-access-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Get user from our database
    const dbUser = await storage.getUserByEmail(user.email!);
    
    res.json({ 
      user: dbUser,
      session: {
        access_token: token,
        expires_at: user.exp
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Session invalid' });
  }
});

// Refresh session
router.post('/api/auth/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies['sb-refresh-token'];
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }
  
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error || !data.session) {
      return res.status(401).json({ error: 'Failed to refresh session' });
    }
    
    // Update cookies
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ error: 'Refresh failed' });
  }
});

// Sign out
router.post('/api/auth/signout', async (req: Request, res: Response) => {
  const token = req.cookies['sb-access-token'];
  
  if (token) {
    // Sign out from Supabase
    await supabase.auth.signOut();
  }
  
  // Clear cookies
  res.clearCookie('sb-access-token');
  res.clearCookie('sb-refresh-token');
  
  res.json({ success: true });
});

export default router;

// ===================================
// server/youtubeService-supabase.ts - Updated YouTube service
import { google } from 'googleapis';
import { googleAuthService } from './googleAuth';
import { supabase, getYouTubeTokens } from './auth/supabase';

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
    // For Supabase, we need the session token from the request context
    // This should be passed from the route handler
    const sessionToken = (global as any).currentRequestToken;
    
    if (!sessionToken) {
      throw new Error('No session token available');
    }
    
    try {
      const tokens = await this.getTokensFromSession(sessionToken);
      return await operation(tokens);
    } catch (error: any) {
      console.error('[YOUTUBE] API Error:', error);
      
      // Supabase automatically refreshes tokens
      // If still failing, user needs to re-authenticate
      if (error.code === 401 || error.message?.includes('401')) {
        throw new Error('Authentication expired - please sign in again');
      }
      
      throw error;
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
  async updateVideoTitle(videoId: string, newTitle: string, accessToken: string) {
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
  }
}

export const youtubeService = new YouTubeService();

// ===================================
// Middleware to inject session token - server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

export function injectSessionToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies['sb-access-token'];
  if (token) {
    (global as any).currentRequestToken = token;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies['sb-access-token'];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}