import axios from 'axios';
import { encryptToken } from '../auth';

/**
 * Refresh an expired access token using the refresh token
 * @param refreshToken - The encrypted refresh token from the database
 * @returns New encrypted access token and expiration time
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: number;
}> {
  console.log('🔄 [REFRESH] Attempting to refresh access token');
  
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  try {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('✅ [REFRESH] Successfully refreshed access token');
    
    return {
      accessToken: encryptToken(data.access_token),
      expiresAt: Date.now() + (data.expires_in * 1000)
    };
  } catch (error: any) {
    console.error('❌ [REFRESH] Failed to refresh token:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
}