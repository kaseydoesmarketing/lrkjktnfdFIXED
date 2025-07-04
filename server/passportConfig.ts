import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';
import { authService } from './auth';
import type { User } from '@shared/schema';

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing required Google OAuth credentials');
}

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/callback/google",
  passReqToCallback: true
},
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔍 Google OAuth callback triggered');
      
      // Extract user information from Google profile
      const email = profile.emails?.[0]?.value;
      const googleId = profile.id;
      const name = profile.displayName;
      const picture = profile.photos?.[0]?.value || null;
      
      if (!email || !googleId) {
        return done(new Error('Missing required user information from Google'));
      }
      
      console.log('📧 Processing user:', email);
      
      // Check if user exists
      let user = await storage.getUserByEmail(email);
      
      if (user) {
        // Update existing user with new tokens
        console.log('✅ Updating existing user');
        
        // Encrypt tokens before storing
        const encryptedAccessToken = authService.encryptToken(accessToken);
        const encryptedRefreshToken = refreshToken ? authService.encryptToken(refreshToken) : null;
        
        // Update user tokens and last login
        await storage.updateUser(user.id, {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          image: picture,
          lastLogin: new Date()
        });
        
        // Get updated user
        user = await storage.getUser(user.id);
      } else {
        // Create new user
        console.log('🆕 Creating new user');
        
        // Encrypt tokens before storing
        const encryptedAccessToken = authService.encryptToken(accessToken);
        const encryptedRefreshToken = refreshToken ? authService.encryptToken(refreshToken) : null;
        
        // Fetch YouTube channel info using the access token
        let youtubeChannelId = null;
        let youtubeChannelTitle = null;
        
        try {
          const { youtubeService } = await import('./youtubeService');
          const channelInfo = await youtubeService.getChannelInfo(accessToken);
          if (channelInfo) {
            youtubeChannelId = channelInfo.id;
            youtubeChannelTitle = channelInfo.title;
            console.log('✅ YouTube channel found:', youtubeChannelTitle);
          }
        } catch (error) {
          console.error('YouTube channel fetch failed, continuing without it');
        }
        
        user = await storage.createUser({
          email,
          name,
          image: picture,
          googleId,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          youtubeChannelId,
          youtubeChannelTitle,
          subscriptionTier: 'free',
          subscriptionStatus: 'inactive'
        });
      }
      
      // For both new and existing users, update YouTube channel info if we have tokens
      if (user && (user.accessToken || accessToken)) {
        try {
          const { youtubeService } = await import('./youtubeService');
          const tokenToUse = accessToken || (user.accessToken ? authService.decryptToken(user.accessToken) : null);
          
          if (tokenToUse) {
            const channelInfo = await youtubeService.getChannelInfo(tokenToUse);
            if (channelInfo && (!user.youtubeChannelId || !user.youtubeChannelTitle)) {
              await storage.updateUser(user.id, {
                youtubeChannelId: channelInfo.id,
                youtubeChannelTitle: channelInfo.title
              });
              user = await storage.getUser(user.id);
            }
          }
        } catch (error) {
          console.error('Failed to update YouTube channel info:', error);
        }
      }
      
      return done(null, user);
    } catch (error) {
      console.error('❌ OAuth error:', error);
      return done(error as Error);
    }
  }
));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;