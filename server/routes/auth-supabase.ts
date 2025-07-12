import { Router, Request, Response } from 'express';
import { supabase, getYouTubeTokens } from '../auth/supabase';
import { storage } from '../storage';

const router = Router();

// Dynamic redirect URI detection
function getRedirectUri(req: Request): string {
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol || 'http';
  
  // Check if we're in production
  if (host.includes('titletesterpro.com')) {
    return 'https://titletesterpro.com/api/auth/callback/google';
  }
  
  // Otherwise use current host
  return `${protocol}://${host}/api/auth/callback/google`;
}

// Remove manual OAuth routes - OAuth is handled entirely by Supabase on the frontend

// Get current user
router.get('/api/auth/user', async (req: Request, res: Response) => {
  console.log('🔍 [AUTH-USER] Checking authentication...');
  
  // Try to get token from Authorization header first, then cookie
  let token: string | undefined;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    console.log('🔑 [AUTH-USER] Found Bearer token in Authorization header');
  } else {
    token = req.cookies['sb-access-token'];
    console.log('🍪 [AUTH-USER] Checking cookies:', Object.keys(req.cookies));
  }
  
  if (!token) {
    console.log('❌ [AUTH-USER] No authentication token found');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  console.log('🔐 [AUTH-USER] Verifying token with Supabase...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('❌ [AUTH-USER] Invalid session:', error);
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    console.log('✅ [AUTH-USER] Session valid for user:', user.email);
    
    // Create user if doesn't exist
    let dbUser = await storage.getUserByEmail(user.email!);
    
    if (!dbUser) {
      console.log('🆕 [AUTH-USER] User not found in database, creating...');
      dbUser = await storage.createUser({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!.split('@')[0],
        image: user.user_metadata?.avatar_url || null,
        isFounder: user.email === 'kaseydoesmarketing@gmail.com',
        subscriptionStatus: user.email === 'kaseydoesmarketing@gmail.com' ? 'active' : 'inactive',
        subscriptionTier: user.email === 'kaseydoesmarketing@gmail.com' ? 'authority' : 'free'
      });
      console.log('✅ [AUTH-USER] User created successfully');
    }
    
    console.log('✅ [AUTH-USER] User found, returning user data');
    return res.json({ user: dbUser });
  } catch (error) {
    console.error('[AUTH-USER] Error verifying user:', error);
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

// Keep the /me endpoint for backward compatibility
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
    
    // Check if user has connected YouTube channel
    const hasYouTubeChannel = dbUser ? await storage.hasYouTubeChannel(dbUser.id) : false;
    
    res.json({ 
      user: dbUser,
      hasYouTubeChannel,
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

// Create user in database after OAuth
router.post('/api/auth/session/create', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  const { user } = req.body;
  
  if (!user) {
    return res.status(400).json({ error: 'No user data provided' });
  }
  
  try {
    // Verify the token with Supabase
    const { data: { user: verifiedUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !verifiedUser || verifiedUser.id !== user.id) {
      console.error('Invalid token or user mismatch:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log('✅ [AUTH-CREATE] Creating/updating user:', verifiedUser.email);
    
    // Create or update user in database
    const dbUser = await storage.getUserByEmail(verifiedUser.email!);
    if (!dbUser) {
      await storage.createUser({
        id: verifiedUser.id,
        email: verifiedUser.email!,
        name: verifiedUser.user_metadata?.full_name || verifiedUser.email!.split('@')[0],
        image: verifiedUser.user_metadata?.avatar_url || null,
        isFounder: verifiedUser.email === 'kaseydoesmarketing@gmail.com',
        subscriptionStatus: verifiedUser.email === 'kaseydoesmarketing@gmail.com' ? 'active' : 'inactive',
        subscriptionTier: verifiedUser.email === 'kaseydoesmarketing@gmail.com' ? 'authority' : 'free'
      });
      console.log('✅ [AUTH-CREATE] User created in database');
    } else {
      console.log('✅ [AUTH-CREATE] User already exists in database');
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get provider tokens and fetch YouTube data
router.get('/api/auth/provider-tokens', async (req: Request, res: Response) => {
  const token = req.cookies['sb-access-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Get the user to ensure we're authenticated
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // ALWAYS check accounts table first - this is the source of truth for YouTube tokens
    const account = await storage.getAccountByUserId(user.id, 'google');
    
    if (account && account.accessToken) {
      // We have tokens stored - user is connected
      console.log('✅ [PROVIDER-TOKENS] YouTube tokens found in accounts table');
      return res.json({
        hasTokens: true,
        needsReconnect: false,
        hasYouTubeAccess: true
      });
    }
    
    // No tokens stored - try to get them from Supabase using admin API
    console.log('🔑 [PROVIDER-TOKENS] Attempting to retrieve provider tokens from Supabase');
    
    try {
      // Use admin client to get user with app_metadata
      const { data: adminUser, error: adminError } = await supabase.auth.admin.getUserById(user.id);
      
      if (!adminError && adminUser?.user?.app_metadata) {
        const providerToken = adminUser.user.app_metadata.provider_token;
        const providerRefreshToken = adminUser.user.app_metadata.provider_refresh_token;
        
        if (providerToken) {
          console.log('✅ [PROVIDER-TOKENS] Found provider tokens in app_metadata');
          
          // Fetch YouTube channel data
          try {
            const youtubeResponse = await fetch(
              'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
              {
                headers: { 'Authorization': `Bearer ${providerToken}` }
              }
            );
            
            if (youtubeResponse.ok) {
              const data = await youtubeResponse.json();
              const channel = data.items?.[0];
              
              if (channel) {
                console.log('📺 [PROVIDER-TOKENS] YouTube channel found:', channel.snippet.title);
                
                // Update user with YouTube channel data
                await storage.updateUser(user.id, {
                  youtubeChannelId: channel.id,
                  youtubeChannelTitle: channel.snippet.title
                });
                
                // Save tokens to accounts table
                const { encryptToken } = await import('../auth');
                
                // Check if account already exists
                const existingAccount = await storage.getAccountByUserId(user.id, 'google');
                
                if (existingAccount) {
                  // Update existing account
                  await storage.updateAccountTokens(existingAccount.id, {
                    accessToken: encryptToken(providerToken),
                    refreshToken: providerRefreshToken ? encryptToken(providerRefreshToken) : existingAccount.refreshToken,
                    expiresAt: Date.now() + (3600 * 1000)
                  });
                } else {
                  // Create new account
                  await storage.createAccount({
                    userId: user.id,
                    type: 'oauth',
                    provider: 'google',
                    providerAccountId: user.id,
                    accessToken: encryptToken(providerToken),
                    refreshToken: providerRefreshToken ? encryptToken(providerRefreshToken) : null,
                    expiresAt: Date.now() + (3600 * 1000),
                    tokenType: 'Bearer',
                    scope: null,
                    idToken: null,
                    sessionState: null
                  });
                }
                
                return res.json({
                  hasTokens: true,
                  needsReconnect: false,
                  channelSaved: true
                });
              }
            }
          } catch (error) {
            console.error('❌ [PROVIDER-TOKENS] Failed to fetch YouTube data:', error);
          }
        }
      }
    } catch (adminError) {
      console.error('❌ [PROVIDER-TOKENS] Failed to get user from admin API:', adminError);
    }
    
    // No tokens available anywhere - user needs to reconnect
    console.log('⚠️ [PROVIDER-TOKENS] No YouTube tokens found in accounts table');
    return res.json({
      hasTokens: false,
      needsReconnect: true,
      hasYouTubeAccess: false,
      message: 'YouTube connection required. Please reconnect your Google account with YouTube permissions.'
    });
    
  } catch (error) {
    console.error('Get provider tokens error:', error);
    res.status(500).json({ error: 'Failed to check provider tokens' });
  }
});

// Sign out
router.post('/api/auth/signout', async (req: Request, res: Response) => {
  console.log('🚪 [SIGNOUT] Sign out request received');
  const token = req.cookies['sb-access-token'];
  console.log('🍪 [SIGNOUT] Token present:', !!token);
  
  if (token) {
    // Sign out from Supabase
    console.log('🔥 [SIGNOUT] Signing out from Supabase');
    await supabase.auth.signOut();
  }
  
  // Clear cookies
  console.log('🧹 [SIGNOUT] Clearing cookies');
  res.clearCookie('sb-access-token');
  res.clearCookie('sb-refresh-token');
  
  res.json({ success: true });
});

// Add GET logout endpoint for compatibility
router.get('/api/auth/logout', async (req: Request, res: Response) => {
  console.log('🚪 [LOGOUT] Logout request received');
  const token = req.cookies['sb-access-token'];
  console.log('🍪 [LOGOUT] Token present:', !!token);
  
  if (token) {
    // Sign out from Supabase
    console.log('🔥 [LOGOUT] Signing out from Supabase');
    await supabase.auth.signOut();
  }
  
  // Clear cookies
  console.log('🧹 [LOGOUT] Clearing cookies');
  res.clearCookie('sb-access-token');
  res.clearCookie('sb-refresh-token');
  
  res.json({ success: true });
});

// Set session cookies when frontend receives tokens
router.post('/api/auth/session', async (req: Request, res: Response) => {
  console.log('🔐 [SESSION] Setting session from frontend tokens');
  const { access_token, refresh_token, provider_token, provider_refresh_token, user_id } = req.body;
  
  console.log('📊 [SESSION] Received tokens:', {
    hasAccessToken: !!access_token,
    hasRefreshToken: !!refresh_token,
    hasProviderToken: !!provider_token,
    hasProviderRefreshToken: !!provider_refresh_token,
    userId: user_id
  });
  
  if (!access_token) {
    console.error('❌ [SESSION] No access token provided');
    return res.status(400).json({ error: 'Access token required' });
  }
  
  try {
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(access_token);
    
    if (error || !user) {
      console.error('❌ [SESSION] Invalid token:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log('✅ [SESSION] Token valid for user:', user.email);
    
    // Set cookies with development-friendly settings
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('🍪 [SESSION] Setting cookies, production mode:', isProduction);
    
    // Use secure cookies only in production or when using HTTPS
    const isSecure = isProduction || req.protocol === 'https' || !!process.env.REPLIT_DEPLOYMENT_ID;
    
    res.cookie('sb-access-token', access_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      domain: undefined // Let browser handle domain automatically
    });
    
    if (refresh_token) {
      res.cookie('sb-refresh-token', refresh_token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        domain: undefined // Let browser handle domain automatically
      });
    }
    
    // Create or update user in database
    let dbUser = await storage.getUserByEmail(user.email!);
    
    if (!dbUser) {
      console.log('👤 [SESSION] Creating new user:', user.email);
      dbUser = await storage.createUser({
        id: user.id,
        email: user.email!,
        name: user.user_metadata.full_name || user.email!.split('@')[0],
        image: user.user_metadata.avatar_url,
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive'
      });
    }
    
    // Try to get YouTube tokens and save them
    let youtubeAccessToken = provider_token;
    let youtubeRefreshToken = provider_refresh_token;
    
    // If no provider tokens in request, try Supabase Admin API
    if (!youtubeAccessToken) {
      console.log('🔍 [SESSION] No provider token in request, checking Supabase Admin API...');
      try {
        const adminClient = await import('./admin-client');
        const { data: adminUser } = await adminClient.supabaseAdmin.auth.admin.getUserById(user.id);
        
        if (adminUser?.user?.app_metadata) {
          youtubeAccessToken = adminUser.user.app_metadata.provider_token;
          youtubeRefreshToken = adminUser.user.app_metadata.provider_refresh_token;
          console.log('✅ [SESSION] Found provider tokens in app_metadata');
        }
      } catch (adminError) {
        console.error('⚠️ [SESSION] Failed to get tokens from admin API:', adminError);
      }
    }
    
    // If we have YouTube tokens, fetch channel info and save everything
    if (youtubeAccessToken) {
      console.log('📺 [SESSION] Fetching YouTube channel info with provider token...');
      
      try {
        const { google } = await import('googleapis');
        const youtube = google.youtube('v3');
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: youtubeAccessToken });
        
        const channelResponse = await youtube.channels.list({
          auth,
          part: ['snippet'],
          mine: true
        });
        
        const channel = channelResponse.data.items?.[0];
        if (channel) {
          console.log('✅ [SESSION] YouTube channel found:', channel.snippet?.title);
          
          // Encrypt tokens before saving
          const { encryptToken } = await import('../auth');
          const encryptedAccessToken = encryptToken(youtubeAccessToken);
          const encryptedRefreshToken = youtubeRefreshToken ? encryptToken(youtubeRefreshToken) : null;
          
          // Save YouTube tokens and channel info to accounts table
          const existingAccount = await storage.getAccountByUserId(user.id, 'google');
          
          if (existingAccount) {
            console.log('🔄 [SESSION] Updating existing account with YouTube info...');
            await storage.updateAccountTokens(existingAccount.id, {
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken || existingAccount.refreshToken,
              expiresAt: Date.now() + (3600 * 1000), // 1 hour expiry
              youtubeChannelId: channel.id,
              youtubeChannelTitle: channel.snippet?.title || null,
              youtubeChannelThumbnail: channel.snippet?.thumbnails?.default?.url || null
            });
          } else {
            console.log('➕ [SESSION] Creating new account with YouTube info...');
            await storage.createAccount({
              userId: user.id,
              type: 'oauth',
              provider: 'google',
              providerAccountId: user.id,
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              expiresAt: Date.now() + (3600 * 1000),
              tokenType: 'Bearer',
              scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
              idToken: null,
              sessionState: null,
              youtubeChannelId: channel.id,
              youtubeChannelTitle: channel.snippet?.title || null,
              youtubeChannelThumbnail: channel.snippet?.thumbnails?.default?.url || null
            });
          }
          
          // Also update users table for backward compatibility
          await storage.updateUserYouTubeTokens(user.id, {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            youtubeChannelId: channel.id,
            youtubeChannelTitle: channel.snippet?.title || null
          });
          
          console.log('✅ [SESSION] YouTube tokens and channel info saved successfully');
          
          // Update dbUser with fresh data
          dbUser = await storage.getUserByEmail(user.email!);
        }
      } catch (youtubeError) {
        console.error('❌ [SESSION] Failed to fetch YouTube channel:', youtubeError);
        // Don't fail the login if YouTube fetch fails
      }
    } else {
      console.log('⚠️ [SESSION] No YouTube tokens available to save');
    }
    
    console.log('✅ [SESSION] Session established');
    res.json({ success: true, user: dbUser });
    
  } catch (error) {
    console.error('💥 [SESSION] Error setting session:', error);
    res.status(500).json({ error: 'Failed to set session' });
  }
});

// Get temporary channels for multi-channel selection
router.get('/api/auth/channels', async (req: Request, res: Response) => {
  const token = req.cookies['sb-access-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Get temporary tokens from storage
    const tempData = await storage.getTempTokens(user.id);
    
    if (!tempData || !tempData.channels) {
      return res.status(404).json({ error: 'No channels found' });
    }
    
    res.json({ channels: tempData.channels });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Save selected channel
router.post('/api/auth/save-channel', async (req: Request, res: Response) => {
  const token = req.cookies['sb-access-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    const { channelId, channelTitle } = req.body;
    
    if (!channelId || !channelTitle) {
      return res.status(400).json({ error: 'Missing channel information' });
    }
    
    // Get temporary tokens
    const tempData = await storage.getTempTokens(user.id);
    
    if (!tempData) {
      return res.status(404).json({ error: 'No temporary tokens found' });
    }
    
    // Save the selected channel to the account
    await storage.upsertAccount(user.id, {
      accessToken: tempData.accessToken,
      refreshToken: tempData.refreshToken,
      youtubeChannelId: channelId,
      youtubeChannelTitle: channelTitle,
      expiresAt: tempData.expiresAt
    });
    
    // Update user with channel info
    await storage.updateUserYouTubeTokens(user.id, {
      accessToken: tempData.accessToken,
      refreshToken: tempData.refreshToken,
      youtubeChannelId: channelId,
      youtubeChannelTitle: channelTitle
    });
    
    // Delete temporary tokens
    await storage.deleteTempTokens(user.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save channel error:', error);
    res.status(500).json({ error: 'Failed to save channel' });
  }
});

export default router;