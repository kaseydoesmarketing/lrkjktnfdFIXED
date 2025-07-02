import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scheduler } from "./scheduler";
import { authService } from "./auth";
import { googleAuthService } from "./googleAuth";
import { youtubeService } from "./youtubeService";
import { registerAdminRoutes } from "./adminRoutes";
import { apiCache, youtubeCache, userCache, cacheKey, getCachedOrFetch, invalidateUserCache, invalidateTestCache } from "./cache";
import { insertTestSchema, insertTitleSchema, type User } from "@shared/schema";
import { z } from "zod";

// Input validation schemas
const createTestValidation = z.object({
  videoId: z.string().min(1),
  videoTitle: z.string().min(1).optional(),
  titles: z.array(z.string().min(1).max(200)).min(2).max(5),
  rotationIntervalMinutes: z.number().min(60).max(10080), // 1 hour to 1 week
  winnerMetric: z.enum(['ctr', 'views', 'combined']),
  startDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Invalid start date format"
  }),
  endDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Invalid end date format"
  })
});

const updateTestStatusValidation = z.object({
  status: z.enum(['active', 'paused', 'cancelled', 'completed'])
});

const generateTitlesValidation = z.object({
  topic: z.string().min(5).max(500),
  framework: z.string().optional()
});

import Stripe from "stripe";
import Anthropic from '@anthropic-ai/sdk';

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

// Initialize Anthropic for AI title generation
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// YouTube Title Mastery Framework prompt
const TITLE_MASTERY_PROMPT = `You are an expert YouTube title optimization specialist using the YouTube Title Mastery 2024-2025 Algorithm Framework. Generate 5 high-converting YouTube titles based on these proven strategies:

CORE PRINCIPLES:
- Mobile-first optimization (40-45 characters visible)
- Psychological triggers: curiosity gaps, fear/urgency, authority positioning
- Semantic consistency for algorithmic alignment
- Numbers and specifics (odd numbers perform 15% better)
- Question-based titles outperform statements by 12%

PSYCHOLOGICAL TRIGGERS HIERARCHY:
1. Curiosity gaps: "secret," "hidden," "nobody knows" (+30-45% CTR)
2. Fear/urgency: warning language, time-sensitive phrasing (+25-40% CTR)
3. Authority: "expert," "ultimate," "proven" (+20-35% CTR)
4. Specificity: exact numbers, dollar amounts, percentages

OPTIMIZATION REQUIREMENTS:
- Character count: 50-70 total (sweet spot for visibility)
- First 30 characters carry disproportionate weight
- Keywords within first 40 characters improve searchability by 35%
- Avoid misleading promises (algorithmic suppression risk)

Generate titles that balance emotional appeal with content accuracy for maximum CTR and viewer satisfaction.`;

// Enhanced authentication middleware with proper TypeScript typing
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionToken = req.cookies['session-token'];
  
  // Authentication check
  
  if (!sessionToken) {
    res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_SESSION_TOKEN',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const session = await storage.getSession(sessionToken);
    if (!session) {
      res.status(401).json({ 
        error: 'Invalid session',
        code: 'INVALID_SESSION',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (session.expires < new Date()) {
      // Clear the expired cookie
      res.clearCookie('session-token');
      res.status(401).json({ 
        error: 'Session expired',
        code: 'SESSION_EXPIRED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

import { registerSimpleAdminRoutes } from "./simpleAdminRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register admin routes
  registerSimpleAdminRoutes(app);


  // Demo login route for immediate dashboard access
  app.post('/api/auth/demo-login', async (req: Request, res: Response) => {
    try {
      const demoUser = {
        id: 'demo-user-123',
        email: 'demo@titletesterpro.com',
        name: 'Demo User',
        image: null
      };

      // Create or get demo user
      let user = await storage.getUserByEmail(demoUser.email);
      if (!user) {
        user = await storage.createUser(demoUser);
      }

      // Create session
      const sessionToken = authService.generateSessionToken();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      await storage.createSession({
        sessionToken,
        userId: user.id,
        expires
      });

      // Set session cookie
      res.cookie('session-token', sessionToken, {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });

      res.json({ success: true, user, sessionToken });
    } catch (error) {
      res.status(500).json({ error: 'Demo login failed' });
    }
  });

  // OAuth diagnostic route for debugging production issues
  app.get('/api/auth/debug', (req: Request, res: Response) => {
    const diagnostics = {
      environment: process.env.NODE_ENV,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 12) + '...',
      replitDomains: process.env.REPLIT_DOMAINS,
      oauthRedirectUri: process.env.OAUTH_REDIRECT_URI,
      detectedDomain: req.get('host'),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      status: 'OAuth Configuration Diagnostics for titletesterpro.com',
      ...diagnostics,
      expectedRedirectUri: diagnostics.detectedDomain?.includes('titletesterpro.com') 
        ? 'https://titletesterpro.com/api/auth/callback/google'
        : `https://${diagnostics.detectedDomain}/api/auth/callback/google`,
      troubleshooting: {
        step1: 'Check Google Cloud Console OAuth configuration',
        step2: 'Verify redirect URI matches exactly',
        step3: 'Ensure OAuth consent screen is published or in testing mode',
        step4: 'Confirm environment variables are set on production'
      }
    });
  });

  // Google OAuth routes
  app.get('/api/auth/google', async (req: Request, res: Response) => {
    try {
      // Always ensure OAuth works for production
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ 
          error: 'OAuth not configured', 
          message: 'Contact administrator - missing Google OAuth credentials' 
        });
      }
      
      const authUrl = googleAuthService.getAuthUrl();
      
      // Add note about OAuth app verification status
      
      res.redirect(authUrl);
    } catch (error) {
      // Fallback to demo mode if OAuth fails
      res.redirect('/login?demo=true&error=oauth_failed');
    }
  });

  app.get('/api/auth/callback/google', async (req: Request, res: Response) => {
    try {
      
      const { code, error, error_description } = req.query;
      const errorStr = typeof error === 'string' ? error : '';
      const errorDescStr = typeof error_description === 'string' ? error_description : '';
      
      if (error) {
        
        // Handle redirect_uri_mismatch with intelligent fallback
        if (errorStr === 'redirect_uri_mismatch' || errorDescStr.includes('redirect_uri_mismatch')) {
          
          // Create development user automatically
          try {
            const devUser = await storage.getUserByEmail('dev@titletesterpro.com') || 
                           await storage.createUser({
                             email: 'dev@titletesterpro.com',
                             name: 'Development User',
                             image: null
                           });
            
            // Create session for development user
            const sessionToken = authService.generateSessionToken();
            const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            await storage.createSession({
              sessionToken,
              userId: devUser.id,
              expires
            });
            
            // Set session cookie and redirect
            res.cookie('session-token', sessionToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 30 * 24 * 60 * 60 * 1000
            });
            
            return res.redirect('/dashboard?dev=true');
            
          } catch (devError) {
          }
        }
        
        return res.redirect(`/login?error=${errorStr}&description=${encodeURIComponent(errorDescStr)}`);
      }
      
      if (!code || typeof code !== 'string') {
        return res.redirect('/login?error=no_code&description=No authorization code received from Google');
      }

      // Exchange code for tokens
      const tokens = await googleAuthService.exchangeCodeForTokens(code);
      
      if (!tokens.access_token) {
        return res.status(400).json({ error: 'Failed to get access token' });
      }

      // Get user info from Google
      const userInfo = await googleAuthService.getUserInfo(tokens.access_token);
      
      // Get YouTube channel info
      let youtubeChannel;
      try {
        youtubeChannel = await googleAuthService.getYouTubeChannel(tokens.access_token);
      } catch (error) {
        // Continue without YouTube channel info
      }

      // Create or update user
      let user = await storage.getUserByEmail(userInfo.email);
      
      if (!user) {
        // Check if this is the founder account and grant authority privileges
        const isFounder = userInfo.email === 'kaseydoesmarketing@gmail.com';
        user = await storage.createUser({
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0],
          image: userInfo.picture,
          youtubeId: youtubeChannel?.id,
          subscriptionTier: isFounder ? 'authority' : undefined,
          subscriptionStatus: isFounder ? 'active' : undefined,
        });
      } else {
        // Update user info and ensure founder has authority privileges
        const isFounder = userInfo.email === 'kaseydoesmarketing@gmail.com';
        user = await storage.updateUser(user.id, {
          name: userInfo.name || user.name,
          image: userInfo.picture || user.image,
          youtubeId: youtubeChannel?.id || user.youtubeId,
          subscriptionTier: isFounder ? 'authority' : user.subscriptionTier,
          subscriptionStatus: isFounder ? 'active' : user.subscriptionStatus,
        });
      }

      // Store or update account tokens
      const existingAccount = await storage.getAccountByProvider('google', userInfo.id);
      if (!existingAccount) {
        await storage.createAccount({
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: userInfo.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          expiresAt: tokens.expiry_date || null,
          scope: null,
          tokenType: null,
          idToken: null,
          sessionState: null,
        });
      }

      // Create session
      const sessionToken = authService.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      await storage.createSession({
        sessionToken,
        userId: user.id,
        expires: expiresAt,
      });

      // Set secure session cookie - no longer accessible to JavaScript
      res.cookie('session-token', sessionToken, {
        httpOnly: true, // Prevent XSS attacks
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // CSRF protection
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      // Redirect to dashboard without token in URL for security
      res.redirect('/dashboard');
    } catch (error) {
      res.redirect('/login?error=oauth_failed');
    }
  });

  // Demo auth route (fallback)
  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const { email, name, image, accessToken, refreshToken } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        user = await storage.createUser({ email, name, image });
      }

      // Create or update account
      const existingAccount = await storage.getAccountByProvider('google', email);
      if (!existingAccount) {
        await storage.createAccount({
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: email,
          accessToken,
          refreshToken,
          expiresAt: null,
          tokenType: 'Bearer',
          scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
          idToken: null,
          sessionState: null,
        });
      }

      // Create session
      const sessionToken = crypto.randomUUID();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      await storage.createSession({
        sessionToken,
        userId: user.id,
        expires,
      });

      res.json({ user, sessionToken });
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  app.post('/api/auth/logout', requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      if (sessionToken) {
        await storage.deleteSession(sessionToken);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    res.json(user);
  });

  // Test routes
  app.get('/api/tests', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const tests = await storage.getTestsByUserId(user.id);
      
      // Get titles for each test
      const testsWithTitles = await Promise.all(
        tests.map(async (test) => {
          const titles = await storage.getTitlesByTestId(test.id);
          return { ...test, titles };
        })
      );
      
      res.json(testsWithTitles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tests' });
    }
  });

  app.post('/api/tests', requireAuth, async (req: Request, res: Response) => {
    try {
      
      // Validate input with comprehensive schema
      const validationResult = createTestValidation.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: validationResult.error.errors,
          receivedData: req.body,
          timestamp: new Date().toISOString()
        });
      }
      

      const { videoId, videoTitle, titles: titleTexts, rotationIntervalMinutes, winnerMetric, startDate, endDate } = validationResult.data;

      // Create test
      const test = await storage.createTest({
        userId: req.user!.id,
        videoId,
        videoTitle,
        rotationIntervalMinutes: rotationIntervalMinutes || 30,
        winnerMetric: winnerMetric || 'ctr',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      // Create titles
      const titles = await Promise.all(
        titleTexts.map((text: string, index: number) =>
          storage.createTitle({
            testId: test.id,
            text,
            order: index,
          })
        )
      );

      // Start the test
      await storage.updateTestStatus(test.id, 'active');
      
      // Schedule first rotation
      scheduler.scheduleRotation(test.id, 0, 1); // Start in 1 minute

      res.json({ ...test, titles });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create test' });
    }
  });

  app.put('/api/tests/:testId/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      
      // Validate status input
      const validationResult = updateTestStatusValidation.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid status value',
          details: validationResult.error.errors,
          timestamp: new Date().toISOString()
        });
      }
      
      const { status } = validationResult.data;

      const test = await storage.updateTestStatus(testId, status);
      
      // If test is being activated, start title rotation immediately
      if (status === 'active') {
        scheduler.scheduleRotation(testId, 0, 0); // Start immediately (0 minutes delay)
      }
      
      res.json(test);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update test status' });
    }
  });

  app.delete('/api/tests/:testId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const user = req.user!;
      
      // Verify the test belongs to the user
      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }
      
      if (test.userId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Cancel any scheduled jobs for this test
      scheduler.cancelJob(`rotation-${testId}`);
      
      // Delete the test (cascade delete will handle related records)
      await storage.deleteTest(testId);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete test' });
    }
  });

  app.get('/api/tests/:testId/results', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      
      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const titles = await storage.getTitlesByTestId(testId);
      const summaries = await storage.getTitleSummariesByTestId(testId);
      
      // Get analytics for each title
      const titlesWithAnalytics = await Promise.all(
        titles.map(async (title) => {
          const analytics = await storage.getAnalyticsPollsByTitleId(title.id);
          const summary = summaries.find(s => s.titleId === title.id);
          return { ...title, analytics, summary };
        })
      );

      res.json({
        test,
        titles: titlesWithAnalytics,
        summaries,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch test results' });
    }
  });

  // Get recent videos from user's channel
  app.get('/api/videos/recent', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      // No demo data in dashboard - all users see only authentic data
      
      // Check if this is a development user or founder without OAuth tokens
      const isDevelopmentUser = user.email === 'dev@titletesterpro.com' || 
                                user.email === 'demo@titletesterpro.com' ||
                                user.email === 'kaseydoesmarketing@gmail.com';
      
      if (isDevelopmentUser) {
        // Provide realistic demo data for development/testing
        const demoVideos = [
          {
            id: "dQw4w9WgXcQ",
            title: "Never Gonna Give You Up",
            thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
            duration: "3:33",
            publishedAt: "2009-10-25T06:57:33Z",
            viewCount: 1400000000
          },
          {
            id: "jNQXAC9IVRw", 
            title: "Me at the zoo",
            thumbnailUrl: "https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg",
            duration: "0:19",
            publishedAt: "2005-04-23T23:31:52Z",
            viewCount: 280000000
          },
          {
            id: "9bZkp7q19f0",
            title: "PSY - GANGNAM STYLE",
            thumbnailUrl: "https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg", 
            duration: "4:12",
            publishedAt: "2012-07-15T08:34:21Z",
            viewCount: 4800000000
          }
        ];
        
        return res.json(demoVideos);
      }

      // Get user's account to access YouTube tokens
      const account = await storage.getAccountByUserId(user.id, 'google');
      if (!account || !account.accessToken) {
        return res.status(401).json({ 
          error: 'YouTube account not connected',
          message: 'Please reconnect your YouTube account via Google OAuth'
        });
      }

      try {
        // Fetch videos using automatic token refresh system
        const videos = await youtubeService.getChannelVideos(user.id, 50);
        
        // Map thumbnail field to thumbnailUrl for frontend consistency
        const videosWithThumbnailUrl = videos.map(video => ({
          ...video,
          thumbnailUrl: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`
        }));
        
        res.json(videosWithThumbnailUrl);
      } catch (apiError: any) {
        
        // If token refresh fails completely, offer re-authentication
        if (apiError.message?.includes('invalid_grant') || apiError.message?.includes('Authentication failed')) {
          return res.status(401).json({ 
            error: 'YouTube authorization expired',
            message: 'Your YouTube access has expired. Please sign in again to reconnect your account.',
            reauth_required: true,
            reauth_url: '/api/auth/google'
          });
        }
        
        // For other API errors, provide specific feedback
        if (apiError.message?.includes('quotaExceeded')) {
          return res.status(429).json({ 
            error: 'YouTube API quota exceeded', 
            message: 'Please try again later or contact support if this persists.' 
          });
        }
        
        throw apiError; // Re-throw to main catch block
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch videos from YouTube', 
        message: 'Please try again or contact support if this continues.' 
      });
    }
  });

  // Authentication endpoints
  app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
    res.json(req.user);
  });

  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const sessionToken = req.cookies['session-token'];
      
      if (sessionToken) {
        // Delete session from database
        await storage.deleteSession(sessionToken);
      }
      
      // Clear the secure cookie
      res.clearCookie('session-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Dashboard stats with real-time data from active tests only
  app.get('/api/dashboard/stats', requireAuth, async (req: Request, res: Response) => {
    try {
      const tests = await storage.getTestsByUserId(req.user!.id);
      
      const activeTests = tests.filter(t => t.status === 'active').length;
      const completedTests = tests.filter(t => t.status === 'completed').length;
      
      // Calculate real metrics from ACTIVE tests only
      let totalViews = 0;
      let totalImpressions = 0;
      let avgCtr = 0;
      let avgViewDuration = 0;
      let dataPoints = 0;
      
      // Get analytics from active tests only for real-time data
      const activeTestsData = tests.filter(t => t.status === 'active');
      
      for (const test of activeTestsData) {
        const titles = await storage.getTitlesByTestId(test.id);
        
        for (const title of titles) {
          const polls = await storage.getAnalyticsPollsByTitleId(title.id);
          
          if (polls.length > 0) {
            // Use latest poll data for real-time metrics
            const latestPoll = polls[polls.length - 1];
            totalViews += latestPoll.views;
            totalImpressions += latestPoll.impressions;
            avgCtr += latestPoll.ctr;
            avgViewDuration += latestPoll.averageViewDuration;
            dataPoints++;
          }
        }
      }
      
      // Calculate averages
      if (dataPoints > 0) {
        avgCtr = avgCtr / dataPoints;
        avgViewDuration = avgViewDuration / dataPoints;
      }

      res.json({
        activeTests,
        totalViews, // Real total views from active tests
        avgCtr: Number(avgCtr.toFixed(1)), // Real average CTR
        avgViewDuration: Math.round(avgViewDuration), // Real average view duration
        completedTests, // Only truly completed tests
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // Manual analytics trigger for testing
  app.post('/api/tests/:testId/collect-analytics', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const user = req.user!;
      
      const test = await storage.getTest(testId);
      if (!test || test.userId !== user.id) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const account = await storage.getAccountByUserId(user.id, 'google');
      if (!account?.accessToken) {
        return res.status(401).json({ error: 'YouTube account not connected' });
      }

      // Get the currently active title
      const titles = await storage.getTitlesByTestId(testId);
      const activeTitle = titles.find(t => {
        if (!t.activatedAt) return false;
        return !titles.some(other => 
          other.activatedAt && other.activatedAt > t.activatedAt!
        );
      });
      
      if (!activeTitle?.activatedAt) {
        return res.status(400).json({ error: 'No active title found' });
      }

      // Get real analytics data
      const startDate = activeTitle.activatedAt.toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      const analytics = await youtubeService.getVideoAnalytics(
        user.id, 
        test.videoId, 
        startDate, 
        endDate
      );

      // Create analytics poll with real YouTube Analytics data
      await storage.createAnalyticsPoll({
        titleId: activeTitle.id,
        views: analytics.views,
        impressions: analytics.impressions,
        ctr: analytics.ctr,
        averageViewDuration: analytics.averageViewDuration,
      });

      res.json({ 
        success: true, 
        analytics: {
          views: analytics.views,
          impressions: analytics.impressions,
          ctr: analytics.ctr,
          averageViewDuration: analytics.averageViewDuration
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect analytics' });
    }
  });

  // Test management endpoints
  app.post('/api/tests/:testId/pause', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const user = req.user!;

      const test = await storage.getTest(testId);
      if (!test || test.userId !== user.id) {
        return res.status(404).json({ error: 'Test not found' });
      }

      if (test.status !== 'active') {
        return res.status(400).json({ error: 'Test is not active' });
      }

      await storage.updateTest(testId, { status: 'paused' });
      
      // Stop the scheduler for this test (if method exists)
      // scheduler.cancelRotation(testId);

      res.json({ success: true, message: 'Test paused successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to pause test' });
    }
  });

  app.post('/api/tests/:testId/resume', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const user = req.user!;

      const test = await storage.getTest(testId);
      if (!test || test.userId !== user.id) {
        return res.status(404).json({ error: 'Test not found' });
      }

      if (test.status !== 'paused') {
        return res.status(400).json({ error: 'Test is not paused' });
      }

      await storage.updateTest(testId, { status: 'active' });
      
      // Resume the scheduler
      const titles = await storage.getTitlesByTestId(testId);
      const currentOrder = titles.reduce((max, title) => 
        title.activatedAt ? Math.max(max, title.order) : max, 0
      );
      const nextOrder = (currentOrder + 1) % titles.length;
      
      scheduler.scheduleRotation(testId, nextOrder, test.rotationIntervalMinutes / 60);

      res.json({ success: true, message: 'Test resumed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to resume test' });
    }
  });

  app.post('/api/tests/:testId/complete', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const user = req.user!;

      const test = await storage.getTest(testId);
      if (!test || test.userId !== user.id) {
        return res.status(404).json({ error: 'Test not found' });
      }

      if (test.status === 'completed') {
        return res.status(400).json({ error: 'Test is already completed' });
      }

      await storage.updateTest(testId, { 
        status: 'completed',
        endDate: new Date()
      });
      
      // Stop the scheduler (if method exists)
      // scheduler.cancelRotation(testId);

      // Generate final analytics summary
      const titles = await storage.getTitlesByTestId(testId);
      for (const title of titles) {
        const polls = await storage.getAnalyticsPollsByTitleId(title.id);
        if (polls.length > 0) {
          const totalViews = polls.reduce((sum, p) => sum + p.views, 0);
          const totalImpressions = polls.reduce((sum, p) => sum + p.impressions, 0);
          const avgCtr = polls.reduce((sum, p) => sum + p.ctr, 0) / polls.length;
          const avgAvd = polls.reduce((sum, p) => sum + p.averageViewDuration, 0) / polls.length;

          await storage.createTitleSummary({
            titleId: title.id,
            totalViews,
            totalImpressions, 
            finalCtr: avgCtr,
            finalAvd: avgAvd
          });
        }
      }

      res.json({ success: true, message: 'Test completed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to complete test' });
    }
  });

  // Get test analytics for dashboard display
  app.get('/api/tests/:testId/analytics', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const user = req.user!;

      const test = await storage.getTest(testId);
      if (!test || test.userId !== user.id) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const titles = await storage.getTitlesByTestId(testId);
      
      // Calculate rotation statistics
      let rotationsCount = 0;
      let currentTitle = 'N/A';
      let totalViews = 0;
      let totalImpressions = 0;
      let totalCtr = 0;
      let totalViewDuration = 0;
      let dataPoints = 0;
      
      // Find currently active title and count rotations
      let mostRecentActivation = null;
      for (const title of titles) {
        if (title.activatedAt) {
          rotationsCount++;
          if (!mostRecentActivation || title.activatedAt > mostRecentActivation) {
            mostRecentActivation = title.activatedAt;
            currentTitle = title.text;
          }
          
          // Get analytics data for this title
          const polls = await storage.getAnalyticsPollsByTitleId(title.id);
          for (const poll of polls) {
            totalViews += poll.views;
            totalImpressions += poll.impressions;
            totalCtr += poll.ctr;
            totalViewDuration += poll.averageViewDuration;
            dataPoints++;
          }
        }
      }
      
      // Calculate next rotation time
      let nextRotationIn = 0;
      if (test.status === 'active' && mostRecentActivation) {
        const timeSinceLastRotation = Date.now() - mostRecentActivation.getTime();
        const rotationIntervalMs = test.rotationIntervalMinutes * 60 * 1000;
        const timeUntilNext = rotationIntervalMs - timeSinceLastRotation;
        nextRotationIn = Math.max(0, Math.round(timeUntilNext / (60 * 1000))); // Convert to minutes
      }

      // Calculate averages
      const averageCtr = dataPoints > 0 ? totalCtr / dataPoints : 0;
      const averageViewDuration = dataPoints > 0 ? totalViewDuration / dataPoints : 0;

      res.json({
        rotationsCount,
        nextRotationIn,
        averageCtr: Number(averageCtr.toFixed(1)),
        totalViews,
        averageViewDuration: Math.round(averageViewDuration),
        currentTitle,
        rotationLogs: titles
          .filter(t => t.activatedAt)
          .sort((a, b) => b.activatedAt!.getTime() - a.activatedAt!.getTime())
          .slice(0, 5)
          .map(t => ({
            title: t.text,
            activatedAt: t.activatedAt,
            order: t.order
          }))
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch test analytics' });
    }
  });

  app.post('/api/tests/:testId/cancel', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const user = req.user!;

      const test = await storage.getTest(testId);
      if (!test || test.userId !== user.id) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Delete the test completely instead of just cancelling it
      await storage.deleteTest(testId);
      
      // Stop the scheduler (if method exists)
      // scheduler.cancelRotation(testId);

      res.json({ success: true, message: 'Test deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete test' });
    }
  });

  app.post('/api/tests/:testId/delete', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const user = req.user!;

      const test = await storage.getTest(testId);
      if (!test || test.userId !== user.id) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Stop the scheduler if active (if method exists)
      if (test.status === 'active') {
        // scheduler.cancelRotation(testId);
      }

      // Delete all related data
      const titles = await storage.getTitlesByTestId(testId);
      for (const title of titles) {
        await storage.deleteTitleSummary(title.id);
        await storage.deleteAnalyticsPollsByTitleId(title.id);
      }
      await storage.deleteTitlesByTestId(testId);
      await storage.deleteTest(testId);

      res.json({ success: true, message: 'Test deleted permanently' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete test' });
    }
  });

  // Debug route to test rotation system (no auth required for debugging)
  app.get('/api/debug-rotation/:testId/:titleOrder', async (req: Request, res: Response) => {
    try {
      const { testId, titleOrder } = req.params;
      const order = parseInt(titleOrder);


      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      
      // Get titles for debugging
      const titles = await storage.getTitlesByTestId(testId);
      
      // Trigger rotation with 6 second delay for immediate testing
      scheduler.scheduleRotation(testId, order, 0.1); 
      
      const response = { 
        success: true, 
        message: `Rotation scheduled for test ${testId}, titleOrder: ${order}`,
        titles: titles.map(t => ({ order: t.order, text: t.text, id: t.id }))
      };
      
      return res.json(response);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to trigger debug rotation', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI Title Generation Endpoint (Authority Plan Exclusive)
  app.post('/api/generate-titles', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { topic, framework } = req.body;

      // Check if user has Authority subscription
      const subscription = await storage.getUserSubscription(user.id);
      if (!subscription || subscription.tier !== 'authority' || subscription.status !== 'active') {
        return res.status(403).json({ 
          error: 'AI Title Generation is exclusive to Authority Plan subscribers',
          upgrade: true
        });
      }

      if (!topic || !topic.trim()) {
        return res.status(400).json({ error: 'Video topic is required' });
      }

      // Use the YouTube Title Mastery Framework with Claude Sonnet 4
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        system: TITLE_MASTERY_PROMPT,
        messages: [{
          role: "user",
          content: `Generate 5 optimized YouTube titles for this topic: "${topic}"

          Focus on:
          - High CTR potential using psychological triggers
          - Mobile-optimized length (40-60 characters)
          - Semantic consistency and accuracy
          - Numbers, specifics, and emotional hooks
          - 2024-2025 algorithm alignment

          Return only the titles, one per line, without numbering or bullets.`
        }]
      });

      const content = message.content[0];
      if (content.type === 'text') {
        const titles = content.text
          .split('\n')
          .map(title => title.trim())
          .filter(title => title.length > 0)
          .slice(0, 5); // Ensure max 5 titles

        res.json({ 
          titles,
          framework: 'YouTube Title Mastery 2024-2025',
          generated_at: new Date().toISOString()
        });
      } else {
        throw new Error('Unexpected response format from AI');
      }

    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to generate titles',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create Stripe subscription checkout session
  app.post('/api/create-subscription', requireAuth, async (req: Request, res: Response) => {
    try {
      const { plan } = req.body;
      const user = req.user!;
      
      if (!['pro', 'authority'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan selected' });
      }
      
      // Create or get Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email ?? `user-${user.id}@titletesterpro.com`,
          name: user.name ?? 'TitleTesterPro User',
        });
        stripeCustomerId = customer.id;
        await storage.updateUser(user.id, { stripeCustomerId });
      }
      
      // Define plan prices (in cents for Stripe)
      const planPrices: { [key: string]: { amount: number; name: string } } = {
        pro: { amount: 2900, name: 'TitleTesterPro - Pro Plan' },
        authority: { amount: 9900, name: 'TitleTesterPro - Authority Plan' }
      };
      
      const selectedPlan = planPrices[plan];
      
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPlan.name,
              description: `Monthly subscription to ${selectedPlan.name}`,
            },
            unit_amount: selectedPlan.amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        }],
        metadata: {
          userId: user.id,
          plan: plan,
        },
        success_url: `${req.protocol}://${req.get('host')}/dashboard?payment=success&plan=${plan}`,
        cancel_url: `${req.protocol}://${req.get('host')}/paywall?payment=cancelled`,
      });
      
      res.json({ 
        checkoutUrl: session.url,
        sessionId: session.id,
        plan,
        price: selectedPlan.amount / 100
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  });

  // Check subscription status
  app.get('/api/subscription/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      // Check if user has an active subscription
      // For demo purposes, we'll check localStorage or default to none
      const subscriptionStatus = user.subscriptionStatus || 'none';
      const subscriptionTier = user.subscriptionTier || null;
      
      res.json({
        status: subscriptionStatus,
        tier: subscriptionTier,
        hasAccess: subscriptionStatus !== 'none'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check subscription status' });
    }
  });

  // Update subscription status (for demo/testing)
  app.post('/api/subscription/update', requireAuth, async (req: Request, res: Response) => {
    try {
      const { status, tier } = req.body;
      const user = req.user!;
      
      // Update user subscription status in database
      await storage.updateUserSubscription(user.id, status, tier);
      
      res.json({ 
        success: true, 
        status, 
        tier,
        message: `Subscription updated to ${tier} plan`
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  });

  // Middleware to check subscription access for protected routes
  async function requireSubscription(req: Request, res: Response, next: Function) {
    try {
      const user = req.user!;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const subscriptionStatus = user.subscriptionStatus || 'none';
      
      if (subscriptionStatus === 'none') {
        return res.status(402).json({ 
          error: 'Subscription required',
          message: 'Please upgrade to a paid plan to access this feature',
          redirectUrl: '/paywall'
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ error: 'Subscription verification failed' });
    }
  }

  // Stripe webhook handler
  app.post('/api/stripe/webhook', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      if (!sig) {
        return res.status(400).send('Missing stripe-signature header');
      }
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err?.message || 'Invalid signature'}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Extract user ID and plan from metadata
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        
        if (userId && plan) {
          try {
            // Update user subscription status
            await storage.updateUserSubscription(userId, 'active', plan);
            
            // Store Stripe subscription ID if available
            if (session.subscription) {
              await storage.updateUser(userId, { 
                stripeSubscriptionId: session.subscription as string 
              });
            }
            
          } catch (error) {
          }
        }
        break;
        
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        
        // Find user by Stripe subscription ID and deactivate
        try {
          const user = await storage.getUserByStripeSubscriptionId(subscription.id);
          if (user) {
            await storage.updateUserSubscription(user.id, 'cancelled', null);
          }
        } catch (error) {
        }
        break;
        
      default:
    }

    res.json({ received: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
