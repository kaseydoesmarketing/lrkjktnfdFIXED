import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '../auth/supabase';
import { storage } from '../storage';

const router = Router();

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://ttro3.replit.app/api/auth/callback/google'
);

// Initiate OAuth
router.get('/api/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl', 
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    prompt: 'consent'
  });
  
  res.redirect(authUrl);
});

// Handle callback
router.get('/api/auth/callback/google', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('/login?error=no_code');
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    
    // Get user info
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = await response.json();
    
    // Create or update user
    let user = await storage.getUserByEmail(userInfo.email);
    if (!user) {
      user = await storage.createUser({
        email: userInfo.email,
        name: userInfo.name,
        image: userInfo.picture,
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive'
      });
    }
    
    // Store tokens in accounts table
    const existingAccount = await storage.getAccountByUserId(user.id, 'google');
    if (existingAccount) {
      await storage.updateAccountTokens(existingAccount.id, {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || existingAccount.refreshToken,
        expiresAt: tokens.expiry_date || null
      });
    } else {
      await storage.createAccount({
        userId: user.id,
        provider: 'google',
        providerAccountId: userInfo.id,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: tokens.expiry_date || null
      });
    }
    
    // Set cookies
    res.cookie('sb-access-token', tokens.access_token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    
    res.cookie('sb-refresh-token', tokens.refresh_token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
    });
    
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect('/login?error=oauth_failed');
  }
});

export default router;