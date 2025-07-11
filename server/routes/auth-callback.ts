import { Router, Request, Response } from 'express';
import { supabase } from '../auth/supabase';
import { storage } from '../storage';
import { google } from 'googleapis';
import fetch from 'node-fetch';

const router = Router();

// Google OAuth callback URL - must be configured in Supabase Dashboard
// Expected URL: https://xyehwoacgpsxakhjwglq.supabase.co/auth/v1/callback

// OAuth callback handler to ensure we capture YouTube tokens
router.get('/api/auth/callback', async (req: Request, res: Response) => {
  console.log('🔄 [AUTH-CALLBACK] OAuth callback received');
  
  try {
    const code = req.query.code as string;
    const error = req.query.error as string;
    
    if (error) {
      console.error('❌ [AUTH-CALLBACK] OAuth error:', error);
      return res.redirect(`/login?error=${encodeURIComponent(error)}`);
    }
    
    if (!code) {
      console.error('❌ [AUTH-CALLBACK] No authorization code received');
      return res.redirect('/login?error=no_code');
    }
    
    console.log('🔑 [AUTH-CALLBACK] Authorization code received');
    
    // Exchange code for session with Supabase
    const { data, error: supabaseError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (supabaseError || !data.session) {
      console.error('❌ [AUTH-CALLBACK] Supabase exchange error:', supabaseError);
      return res.redirect('/login?error=exchange_failed');
    }
    
    const { session, user } = data;
    console.log('✅ [AUTH-CALLBACK] Supabase session created for:', user.email);
    
    // Set cookies for the session
    res.cookie('sb-access-token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: '/'
    });
    
    if (session.refresh_token) {
      res.cookie('sb-refresh-token', session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days
        path: '/'
      });
    }
    
    // Try to get provider tokens from Supabase Admin API
    let providerToken = session.provider_token;
    let providerRefreshToken = session.provider_refresh_token;
    
    if (!providerToken) {
      console.log('🔍 [AUTH-CALLBACK] No provider token in session, checking admin API');
      
      try {
        const { data: adminUser, error: adminError } = await supabase.auth.admin.getUserById(user.id);
        
        if (!adminError && adminUser?.user?.app_metadata) {
          providerToken = adminUser.user.app_metadata.provider_token;
          providerRefreshToken = adminUser.user.app_metadata.provider_refresh_token;
          console.log('✅ [AUTH-CALLBACK] Found provider tokens in app_metadata');
        }
      } catch (error) {
        console.error('⚠️ [AUTH-CALLBACK] Could not retrieve from admin API:', error);
      }
    }
    
    // If still no tokens, we need to manually exchange with Google
    if (!providerToken && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      console.log('🔄 [AUTH-CALLBACK] Manually exchanging code with Google');
      
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/callback`,
            grant_type: 'authorization_code'
          })
        });
        
        if (tokenResponse.ok) {
          const tokens = await tokenResponse.json() as any;
          providerToken = tokens.access_token;
          providerRefreshToken = tokens.refresh_token;
          console.log('✅ [AUTH-CALLBACK] Successfully exchanged code with Google');
        }
      } catch (error) {
        console.error('❌ [AUTH-CALLBACK] Failed to exchange with Google:', error);
      }
    }
    
    // Ensure user exists in our database
    let dbUser = await storage.getUserByEmail(user.email!);
    if (!dbUser) {
      dbUser = await storage.createUser({
        id: user.id,
        email: user.email!,
        name: user.user_metadata.full_name || user.email!.split('@')[0],
        image: user.user_metadata.avatar_url,
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive'
      });
    }
    
    // If we have provider tokens, fetch YouTube channel and save everything
    if (providerToken) {
      console.log('📺 [AUTH-CALLBACK] Fetching YouTube channel data');
      
      try {
        const youtubeResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
          {
            headers: { 'Authorization': `Bearer ${providerToken}` }
          }
        );
        
        if (youtubeResponse.ok) {
          const data = await youtubeResponse.json() as any;
          const channel = data.items?.[0];
          
          if (channel) {
            console.log('✅ [AUTH-CALLBACK] YouTube channel found:', channel.snippet.title);
            
            // Update user with YouTube channel data
            await storage.updateUser(user.id, {
              youtubeChannelId: channel.id,
              youtubeChannelTitle: channel.snippet.title
            });
            
            // Save or update OAuth tokens in accounts table
            const { encryptToken } = await import('../auth');
            const existingAccount = await storage.getAccountByUserId(user.id, 'google');
            
            if (existingAccount) {
              await storage.updateAccountTokens(existingAccount.id, {
                accessToken: encryptToken(providerToken),
                refreshToken: providerRefreshToken ? encryptToken(providerRefreshToken) : existingAccount.refreshToken,
                expiresAt: Date.now() + (3600 * 1000),
                // Store YouTube channel info in account metadata
                idToken: JSON.stringify({
                  youtubeChannelId: channel.id,
                  youtubeChannelTitle: channel.snippet.title
                })
              });
            } else {
              await storage.createAccount({
                userId: user.id,
                type: 'oauth',
                provider: 'google',
                providerAccountId: user.id,
                accessToken: encryptToken(providerToken),
                refreshToken: providerRefreshToken ? encryptToken(providerRefreshToken) : null,
                expiresAt: Date.now() + (3600 * 1000),
                tokenType: 'Bearer',
                scope: 'youtube youtube.readonly youtube.force-ssl yt-analytics.readonly userinfo.email userinfo.profile',
                idToken: JSON.stringify({
                  youtubeChannelId: channel.id,
                  youtubeChannelTitle: channel.snippet.title
                }),
                sessionState: null
              });
            }
            
            console.log('✅ [AUTH-CALLBACK] YouTube tokens and channel saved to accounts table');
          }
        }
      } catch (error) {
        console.error('❌ [AUTH-CALLBACK] Failed to fetch YouTube data:', error);
      }
    } else {
      console.warn('⚠️ [AUTH-CALLBACK] No provider tokens available - user will need to reconnect');
    }
    
    // Redirect to dashboard
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('💥 [AUTH-CALLBACK] Unexpected error:', error);
    res.redirect('/login?error=callback_error');
  }
});

// Modified session endpoint to handle OAuth callback data
router.post('/api/auth/session', async (req: Request, res: Response) => {
  console.log('🔐 [SESSION] Session request received');
  
  try {
    const { access_token, refresh_token, provider_token, provider_refresh_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'No access token provided' });
    }
    
    // Set Supabase session cookies
    res.cookie('sb-access-token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: '/'
    });
    
    if (refresh_token) {
      res.cookie('sb-refresh-token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days
        path: '/'
      });
    }
    
    // If provider tokens were sent, save them immediately
    if (provider_token) {
      const { data: { user }, error } = await supabase.auth.getUser(access_token);
      
      if (!error && user) {
        console.log('💾 [SESSION] Saving provider tokens for user:', user.email);
        
        // Fetch YouTube channel data
        try {
          const youtubeResponse = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
            {
              headers: { 'Authorization': `Bearer ${provider_token}` }
            }
          );
          
          if (youtubeResponse.ok) {
            const data = await youtubeResponse.json() as any;
            const channel = data.items?.[0];
            
            if (channel) {
              // Update user with YouTube channel data
              await storage.updateUser(user.id, {
                youtubeChannelId: channel.id,
                youtubeChannelTitle: channel.snippet.title
              });
              
              // Save tokens
              const { encryptToken } = await import('../auth');
              const existingAccount = await storage.getAccountByUserId(user.id, 'google');
              
              if (existingAccount) {
                await storage.updateAccountTokens(existingAccount.id, {
                  accessToken: encryptToken(provider_token),
                  refreshToken: provider_refresh_token ? encryptToken(provider_refresh_token) : existingAccount.refreshToken,
                  expiresAt: Date.now() + (3600 * 1000)
                });
              } else {
                await storage.createAccount({
                  userId: user.id,
                  type: 'oauth',
                  provider: 'google',
                  providerAccountId: user.id,
                  accessToken: encryptToken(provider_token),
                  refreshToken: provider_refresh_token ? encryptToken(provider_refresh_token) : null,
                  expiresAt: Date.now() + (3600 * 1000),
                  tokenType: 'Bearer',
                  scope: null,
                  idToken: null,
                  sessionState: null
                });
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch YouTube data:', error);
        }
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Failed to set session' });
  }
});

export default router;