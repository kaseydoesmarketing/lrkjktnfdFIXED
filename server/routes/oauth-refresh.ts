import { Router } from 'express';
import { google } from 'googleapis';
import { storage } from '../storage';
import { encryptToken } from '../utils/encryption';

const router = Router();
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.FRONTEND_URL}/auth/google/callback`
);

// Refresh Google OAuth token
router.post('/api/auth/refresh-google-token', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const account = await storage.getAccountByUserId(userId, 'google');
    if (!account || !account.refreshToken) {
      return res.status(404).json({ error: 'No Google account found' });
    }

    const { decryptToken } = await import('../utils/encryption');
    const refreshToken = decryptToken(account.refreshToken);
    
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh token');
    }

    // Update the stored tokens
    await storage.updateAccountTokens(account.id, {
      accessToken: encryptToken(credentials.access_token),
      refreshToken: account.refreshToken, // Keep encrypted refresh token
      expiresAt: credentials.expiry_date || Date.now() + 3600000
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;