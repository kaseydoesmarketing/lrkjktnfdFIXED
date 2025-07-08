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

// Initiate Google OAuth
router.get('/api/auth/google', async (req: Request, res: Response) => {
  console.log('🚀 [AUTH-GOOGLE] Starting Google OAuth flow');
  console.log('🌍 [AUTH-GOOGLE] Current origin:', req.headers.origin || 'No origin header');
  
  try {
    const origin = process.env.NODE_ENV === 'production' 
      ? 'https://titletesterpro.com'
      : (req.headers.origin || 'http://localhost:5173');
    
    const redirectUrl = `${origin}/api/auth/callback/google`;
    console.log('🔗 [AUTH-GOOGLE] Redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          // Request YouTube scopes along with basic profile
          scope: 'openid email profile https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly'
        }
      }
    });
    
    if (error) {
      console.error('❌ [AUTH-GOOGLE] OAuth error:', error);
      throw error;
    }
    
    if (data.url) {
      console.log('✅ [AUTH-GOOGLE] Redirecting to Google OAuth');
      res.redirect(data.url);
    } else {
      throw new Error('No redirect URL from Supabase');
    }
    
  } catch (error) {
    console.error('💥 [AUTH-GOOGLE] Error initiating OAuth:', error);
    res.redirect('/login?error=oauth_init_failed');
  }
});

// OAuth callback handler - Updated to properly handle YouTube tokens
router.get('/api/auth/callback/google', async (req: Request, res: Response) => {
  console.log('🔔 [CALLBACK] Google OAuth callback received');
  console.log('📍 [CALLBACK] Full URL:', req.url);
  console.log('❓ [CALLBACK] Query params:', req.query);
  
  const { code, error: oauthError } = req.query;
  
  if (oauthError) {
    console.error('❌ [CALLBACK] OAuth error:', oauthError);
    return res.redirect('/login?error=' + oauthError);
  }
  
  if (!code) {
    console.error('❌ [CALLBACK] No authorization code received');
    return res.redirect('/login?error=no_code');
  }
  
  try {
    console.log('🔐 [CALLBACK] Exchanging code for session');
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code as string);
    
    if (error) {
      console.error('❌ [CALLBACK] Error exchanging code:', error);
      return res.redirect('/login?error=exchange_failed');
    }
    
    if (!data.session) {
      console.error('❌ [CALLBACK] No session returned');
      return res.redirect('/login?error=no_session');
    }
    
    console.log('✅ [CALLBACK] Session created for user:', data.user.email);
    console.log('🎫 [CALLBACK] Provider token present:', !!data.session.provider_token);
    console.log('🔄 [CALLBACK] Provider refresh token present:', !!data.session.provider_refresh_token);
    
    // Set cookies for the session
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    
    if (data.session.refresh_token) {
      res.cookie('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      });
    }
    
    console.log('🍪 [CALLBACK] Cookies set successfully');
    
    // Create or update user in our database
    let dbUser = await storage.getUserByEmail(data.user.email!);
    
    if (!dbUser) {
      console.log('👤 [CALLBACK] Creating new user:', data.user.email);
      dbUser = await storage.createUser({
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata.full_name || data.user.email!.split('@')[0],
        image: data.user.user_metadata.avatar_url,
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive'
      });
    } else {
      console.log('👤 [CALLBACK] Updating existing user:', data.user.email);
      // Update user's last login
      await storage.updateUser(dbUser.id, {
        lastLogin: new Date()
      });
    }
    
    console.log('✅ [CALLBACK] Authentication complete, redirecting to dashboard');
    
    // Redirect to dashboard
    const redirectUrl = process.env.NODE_ENV === 'production' 
      ? 'https://titletesterpro.com/dashboard'
      : 'http://localhost:5173/dashboard';
      
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('💥 [CALLBACK] Unexpected error:', error);
    res.redirect('/login?error=callback_error');
  }
});

// Get current user
router.get('/api/auth/user', async (req: Request, res: Response) => {
  console.log('👤 [AUTH-USER] Getting current user');
  const token = req.cookies['sb-access-token'];
  console.log('🍪 [AUTH-USER] Cookie token present:', !!token);
  
  if (!token) {
    console.log('❌ [AUTH-USER] No auth token found in cookies');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    console.log('🔍 [AUTH-USER] Verifying token with Supabase');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ [AUTH-USER] Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    console.log('✅ [AUTH-USER] Supabase user found:', user.email);
    
    // Get user from our database
    const dbUser = await storage.getUserByEmail(user.email!);
    console.log('📦 [AUTH-USER] Database user found:', !!dbUser);
    
    res.json({ 
      user: dbUser,
      session: {
        access_token: token,
        expires_at: user.exp
      }
    });
    
  } catch (error) {
    console.error('💥 [AUTH-USER] Get user error:', error);
    res.status(401).json({ error: 'Session invalid' });
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
  const { access_token, refresh_token } = req.body;
  
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
    
    // Set cookies
    res.cookie('sb-access-token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    
    if (refresh_token) {
      res.cookie('sb-refresh-token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
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
    
    console.log('✅ [SESSION] Session established');
    res.json({ success: true, user: dbUser });
    
  } catch (error) {
    console.error('💥 [SESSION] Error setting session:', error);
    res.status(500).json({ error: 'Failed to set session' });
  }
});

export default router;