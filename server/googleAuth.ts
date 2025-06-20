import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleAuthService {
  private oauth2Client: OAuth2Client;
  
  constructor() {
    // Use environment variable if set, otherwise fall back to current domain
    const replotDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
    const redirectUri = process.env.OAUTH_REDIRECT_URI || 
      (replotDomain ? `https://${replotDomain}/api/auth/callback/google` : 
       'https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/api/auth/callback/google');
      
    console.log('OAuth redirect URI:', redirectUri);
    console.log('Google Client ID configured:', !!process.env.GOOGLE_CLIENT_ID);
    
    // Validate OAuth configuration
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('CRITICAL: Missing Google OAuth credentials!');
      throw new Error('Google OAuth not configured');
    }
      
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  }

  getAuthUrl() {
    // Minimal scopes for testing - only basic Google account access
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
      prompt: 'consent',
      include_granted_scopes: true,
      response_type: 'code'
    });

    console.log('Generated minimal OAuth URL (testing mode):', authUrl);
    return authUrl;
  }

  async exchangeCodeForTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async getUserInfo(accessToken: string) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    return {
      id: data.id!,
      email: data.email!,
      name: data.name,
      picture: data.picture
    };
  }

  async getYouTubeChannel(accessToken: string) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    
    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true
    });

    if (!response.data.items?.length) {
      throw new Error('No YouTube channel found');
    }

    const channel = response.data.items[0];
    return {
      id: channel.id!,
      title: channel.snippet?.title,
      description: channel.snippet?.description,
      thumbnails: channel.snippet?.thumbnails,
      subscriberCount: channel.statistics?.subscriberCount,
      viewCount: channel.statistics?.viewCount,
      videoCount: channel.statistics?.videoCount
    };
  }

  async refreshAccessToken(refreshToken: string) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  createAuthenticatedClient(accessToken: string, refreshToken?: string) {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    
    return client;
  }
}

export const googleAuthService = new GoogleAuthService();