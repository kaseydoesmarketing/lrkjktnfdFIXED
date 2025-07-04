import { Router, Request, Response } from 'express';
import passport from './passportConfig';
import { authService } from './auth';
import { storage } from './storage';
import { youtubeService } from './youtubeService';

const router = Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/yt-analytics.readonly'
  ],
  accessType: 'offline',
  prompt: 'consent'
}));

// Google OAuth callback - keeping the EXACT same path as before
router.get('/callback/google', 
  passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.redirect('/login?error=no_user');
      }
      
      // Create session for the authenticated user
      const sessionToken = authService.generateSessionToken();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      await storage.createSession({
        sessionToken,
        userId: user.id,
        expires
      });
      
      // Set session cookie
      res.cookie('session-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      
      // Try to get YouTube channel info if we have access token
      if (user.accessToken) {
        try {
          const decryptedToken = authService.decryptToken(user.accessToken);
          const channelInfo = await youtubeService.getChannelInfo(decryptedToken);
          
          if (channelInfo) {
            await storage.updateUser(user.id, {
              youtubeChannelId: channelInfo.id,
              youtubeChannelTitle: channelInfo.snippet?.title || null
            });
          }
        } catch (error) {
          console.log('YouTube channel fetch failed, continuing without it');
        }
      }
      
      // Redirect to dashboard
      res.redirect('/dashboard');
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=oauth_callback_failed');
    }
  }
);

// Logout route
router.get('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    // Clear session cookie
    res.clearCookie('session-token');
    
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/user', async (req: Request, res: Response) => {
  const sessionToken = req.cookies['session-token'];
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const session = await storage.getSession(sessionToken);
    if (!session || session.expires < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't send sensitive data to frontend
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionTier: user.subscriptionTier,
      youtubeChannelId: user.youtubeChannelId,
      youtubeChannelTitle: user.youtubeChannelTitle
    };
    
    res.json({ user: safeUser });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;