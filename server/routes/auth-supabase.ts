import { Router, Request, Response } from 'express';
import { supabase, getYouTubeTokens } from '../auth/supabase';
import { storage } from '../storage';

const router = Router();

// Initiate Google OAuth
router.get('/api/auth/google', async (req: Request, res: Response) => {
  // Get the current domain dynamically
  const protocol = req.protocol;
  const host = req.get('host');
  const currentDomain = `${protocol}://${host}`;
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${currentDomain}/auth/callback`,
      scopes: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  
  console.log('OAuth URL:', data?.url);
  console.log('OAuth error:', error);
  
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
router.get('/api/auth/callback/google', async (req: Request, res: Response) => {
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
router.get('/api/auth/user', async (req: Request, res: Response) => {
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