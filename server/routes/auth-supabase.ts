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
  console.log('🚀 [AUTH] Starting Google OAuth flow');
  
  const redirectUri = getRedirectUri(req);
  console.log('🔗 [AUTH] Using redirect URI:', redirectUri);
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      scopes: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  
  console.log('✅ [AUTH] OAuth URL generated:', data?.url ? 'Yes' : 'No');
  console.log('❌ [AUTH] OAuth error:', error);
  
  if (error) {
    console.error('❌ [AUTH] OAuth initiation error:', error);
    return res.status(500).json({ error: error.message });
  }
  
  if (data.url) {
    console.log('🔄 [AUTH] Redirecting to Google OAuth:', data.url);
    res.redirect(data.url);
  } else {
    console.error('❌ [AUTH] No OAuth URL generated');
    res.status(500).json({ error: 'No OAuth URL generated' });
  }
});

// Handle OAuth callback
router.get('/api/auth/callback/google', async (req: Request, res: Response) => {
  console.log('🔙 [CALLBACK] OAuth callback received');
  const { code, error } = req.query;
  console.log('📝 [CALLBACK] Code present:', !!code);
  console.log('❌ [CALLBACK] Error present:', !!error);
  
  if (error) {
    console.error('❌ [CALLBACK] OAuth callback error:', error);
    return res.redirect('/login?error=oauth_error');
  }
  
  if (!code) {
    return res.redirect('/login?error=no_code');
  }
  
  try {
    // Exchange code for session
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code as string);
    
    if (sessionError || !data.session) {
      console.error('❌ [CALLBACK] Session exchange error:', sessionError);
      return res.redirect('/login?error=session_error');
    }
    
    console.log('✅ [CALLBACK] Session exchanged successfully for user:', data.session.user.email);
    
    // Set secure cookie with access token
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    
    console.log('🍪 [CALLBACK] Access token cookie set');
    
    // Also set refresh token
    res.cookie('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });
    
    console.log('🍪 [CALLBACK] Refresh token cookie set');
    
    // Create or update user in our database
    const { user } = data.session;
    let dbUser = await storage.getUserByEmail(user.email!);
    
    if (!dbUser) {
      console.log('👤 [CALLBACK] Creating new user:', user.email);
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
    } else {
      console.log('👤 [CALLBACK] User already exists:', user.email);
    }
    
    console.log('✅ [CALLBACK] OAuth complete, redirecting to dashboard');
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('OAuth callback processing error:', error);
    res.redirect('/login?error=processing_error');
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