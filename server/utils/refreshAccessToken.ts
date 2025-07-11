import axios from 'axios';
import { encryptToken } from './encryption';
import { storage } from '../storage';

export async function refreshAccessToken(refreshToken: string, userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}> {
  console.log('🔄 [REFRESH] Attempting to refresh access token');
  
  try {
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    });

    const response = await axios.post('https://oauth2.googleapis.com/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token, expires_in } = response.data;
    console.log('✅ [REFRESH] Successfully refreshed tokens');

    // Calculate expiration time
    const expiresAt = Date.now() + expires_in * 1000;

    // Encrypt the new tokens
    const encryptedAccess = encryptToken(access_token);
    const encryptedRefresh = encryptToken(refresh_token || refreshToken); // Use existing if not provided

    // Update the account with new tokens
    await storage.upsertAccount(userId, {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
    });

    // Also update the user table if needed
    await storage.updateUserYouTubeTokens(userId, {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
    });

    return {
      accessToken: access_token,
      refreshToken: refresh_token || refreshToken,
      expiresAt,
    };
  } catch (error: any) {
    console.error('❌ [REFRESH] Failed to refresh token:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
}