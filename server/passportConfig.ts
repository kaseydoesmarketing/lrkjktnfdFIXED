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
  callbackURL: "/api/auth/google/callback",
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
        
        user = await storage.createUser({
          email,
          name,
          image: picture,
          googleId,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          youtubeChannelId: null,
          youtubeChannelTitle: null,
          subscriptionTier: 'free',
          subscriptionStatus: 'inactive'
        });
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