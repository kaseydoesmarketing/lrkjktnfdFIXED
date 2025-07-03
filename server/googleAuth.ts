import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleAuthService {
  private oauth2Client: OAuth2Client;
  
  constructor() {
    // Determine the correct redirect URI based on the environment
    const replotDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
    
    // Smart redirect URI detection for both development and production
    let redirectUri;
    if (process.env.OAUTH_REDIRECT_URI) {
      // Environment variable override (highest priority)
      redirectUri = process.env.OAUTH_REDIRECT_URI;
    } else {
      // Auto-detect based on current environment
      const currentHost = process.env.REPLIT_DOMAINS || 'titletesterpro.com';
      
      if (currentHost.includes('replit.dev')) {
        // Development environment
        redirectUri = `https://${currentHost}/api/auth/callback/google`;
      } else if (currentHost.includes('titletesterpro.com') || process.env.NODE_ENV === 'production') {
        // Production environment
        redirectUri = 'https://titletesterpro.com/api/auth/callback/google';
      } else {
        // Fallback for unknown environments
        redirectUri = `https://${currentHost}/api/auth/callback/google`;
      }
    }
      
    
    // Validate OAuth configuration
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth not configured');
    }
      
    console.log('🔧 OAuth Configuration:');
    console.log('- Client ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('- Redirect URI:', redirectUri);
    console.log('- Current domain:', process.env.REPLIT_DOMAINS);
    
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  }

  getAuthUrl() {
    // MINIMAL SCOPES FOR TITLETESTERPRO FUNCTIONALITY
    // Following Google's principle of least privilege
    const scopes = [
      // USER AUTHENTICATION (Required)
      'https://www.googleapis.com/auth/userinfo.email',      // Get user's email for account creation
      'https://www.googleapis.com/auth/userinfo.profile',    // Get user's name and profile picture
      
      // YOUTUBE READ ACCESS (Feature: Video Selection)
      'https://www.googleapis.com/auth/youtube.readonly',    // Read user's videos for test creation
                                                             // Used by: getChannelVideos(), getVideoAnalytics()
      
      // YOUTUBE WRITE ACCESS (Feature: A/B Testing)
      'https://www.googleapis.com/auth/youtube',             // Update video titles during A/B tests
                                                             // Used by: updateVideoTitle()
                                                             // Note: No granular scope exists for title-only updates
      
      // ANALYTICS ACCESS (Feature: Performance Tracking)
      'https://www.googleapis.com/auth/yt-analytics.readonly' // Read video analytics for A/B test results
                                                             // Used by: getVideoAnalytics() for CTR, views, etc.
    ];
    
    // Note: Removed youtube.force-ssl as it's redundant - all API calls use HTTPS by default

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',          // Get refresh token for background updates
      scope: scopes.join(' '),
      prompt: 'consent',               // Always show consent screen
      include_granted_scopes: true,    // INCREMENTAL AUTHORIZATION ENABLED
      response_type: 'code'
    });

    console.log('📋 OAuth URL generated with incremental authorization enabled');
    console.log('📋 Requested scopes:', scopes);

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