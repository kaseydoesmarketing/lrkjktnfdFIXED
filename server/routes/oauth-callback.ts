import { Router, Request, Response } from 'express';
import { supabase } from '../auth/supabase';
import axios from 'axios';
import { google } from 'googleapis';
import { encryptToken } from '../utils/encryption';
import { storage } from '../storage';

const router = Router();

router.get('/api/auth/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code) {
      console.error('❌ [OAuth] Missing OAuth code');
      return res.status(400).json({ error: 'Missing OAuth code' });
    }

    console.log('🔐 [OAuth] Processing callback with code');

    // Exchange code for session with Supabase
    const { data: session, error } = await supabase.auth.exchangeCodeForSession(code as string);
    if (error || !session) {
      console.error('❌ [OAuth] Supabase exchange failed:', error);
      return res.status(500).json({ error: 'OAuth session exchange failed' });
    }

    const user = session.user;
    console.log('✅ [OAuth] Session established for user:', user.email);

    // Get tokens from session
    let accessToken = session.provider_token;
    let refreshToken = session.provider_refresh_token;
    let expiresIn = 3600; // Default 1 hour

    // If tokens not available from Supabase, fall back to direct exchange
    if (!accessToken || !refreshToken) {
      console.warn('⚠️ [OAuth] Falling back to direct token exchange');
      const params = new URLSearchParams({
        code: code.toString(),
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/callback`,
        grant_type: 'authorization_code',
      });

      try {
        const { data } = await axios.post('https://oauth2.googleapis.com/token', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        expiresIn = data.expires_in;
      } catch (tokenError) {
        console.error('❌ [OAuth] Direct token exchange failed:', tokenError);
        return res.status(500).json({ error: 'OAuth token exchange failed' });
      }

      if (!accessToken || !refreshToken) {
        console.error('❌ [OAuth] Failed to obtain tokens');
        return res.status(500).json({ error: 'OAuth token exchange failed' });
      }
    }

    console.log('🎥 [OAuth] Fetching YouTube channel data');

    // Initialize YouTube API client
    const youtube = google.youtube({ version: 'v3', auth: accessToken });
    let retries = 3;
    let channelsResponse: any;

    // Retry logic for YouTube API
    while (retries--) {
      try {
        channelsResponse = await youtube.channels.list({ part: ['snippet'], mine: true });
        break;
      } catch (err: any) {
        console.warn(`⚠️ [OAuth] YouTube API error (retries left: ${retries}):`, err.message);
        if (!retries) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    const channels = channelsResponse?.data?.items;
    if (!channels || channels.length === 0) {
      console.error('❌ [OAuth] No YouTube channels found');
      return res.status(500).json({ error: 'No YouTube channels found' });
    }

    console.log(`✅ [OAuth] Found ${channels.length} YouTube channel(s)`);

    // Encrypt tokens
    const encAccess = encryptToken(accessToken);
    const encRefresh = encryptToken(refreshToken);
    const expiresAt = Date.now() + expiresIn * 1000;

    // Create or update user in database
    let dbUser = await storage.getUserByEmail(user.email!);
    if (!dbUser) {
      console.log('📝 [OAuth] Creating new user');
      dbUser = await storage.createUser({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!.split('@')[0],
        image: user.user_metadata?.avatar_url || null,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: 'free',
        subscriptionTier: null,
        youtubeChannelId: null,
        youtubeChannelTitle: null,
        accessToken: null,
        refreshToken: null
      });
    }

    // Handle multiple channels
    if (channels.length > 1) {
      console.log('🎬 [OAuth] Multiple channels detected, saving temporary tokens');
      await storage.saveTempTokens(user.id, {
        accessToken: encAccess,
        refreshToken: encRefresh,
        expiresAt,
        channels: channels.map((ch: any) => ({
          id: ch.id,
          title: ch.snippet.title,
          thumbnail: ch.snippet.thumbnails?.default?.url
        })),
      });

      // Set cookies for authentication
      res.cookie('sb-access-token', session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || !!process.env.REPLIT_DEPLOYMENT_ID,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      if (session.refresh_token) {
        res.cookie('sb-refresh-token', session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production' || !!process.env.REPLIT_DEPLOYMENT_ID,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/'
        });
      }

      return res.redirect('/select-channel');
    }

    // Single channel - save directly
    const channel = channels[0];
    await storage.upsertAccount(user.id, {
      accessToken: encAccess,
      refreshToken: encRefresh,
      youtubeChannelId: channel.id,
      youtubeChannelTitle: channel.snippet.title,
      expiresAt,
    });

    // Update user with channel info
    await storage.updateUserYouTubeTokens(user.id, {
      accessToken: encAccess,
      refreshToken: encRefresh,
      youtubeChannelId: channel.id,
      youtubeChannelTitle: channel.snippet.title,
    });

    console.log(`✅ [OAuth] Saved tokens & channel (${channel.snippet.title})`);

    // Set cookies for authentication
    res.cookie('sb-access-token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || !!process.env.REPLIT_DEPLOYMENT_ID,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    if (session.refresh_token) {
      res.cookie('sb-refresh-token', session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || !!process.env.REPLIT_DEPLOYMENT_ID,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      });
    }

    console.log('✅ [OAuth] Authentication complete, redirecting to dashboard');
    return res.redirect('/dashboard');

  } catch (err: any) {
    console.error('💥 [OAuth] Callback error:', err);
    return res.status(500).json({ error: 'Internal server error during OAuth callback' });
  }
});

export default router;