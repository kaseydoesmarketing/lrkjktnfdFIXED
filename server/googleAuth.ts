import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleAuthService {
  private oauth2Client: OAuth2Client;
  
  constructor() {
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/auth/callback`
      : 'http://localhost:5000/api/auth/callback';
      
    console.log('OAuth2Client configuration:', {
      clientId: process.env.GOOGLE_CLIENT_ID,
      redirectUri: redirectUri,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    });
      
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
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