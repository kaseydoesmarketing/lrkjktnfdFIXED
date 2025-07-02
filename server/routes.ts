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
const createTestValidation = insertTestSchema.extend({
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
  
  console.log('Auth middleware - checking token:', sessionToken ? 'present' : 'missing');
  
  if (!sessionToken) {
    console.log('No session token provided');
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
      console.log('Session not found in database');
      res.status(401).json({ 
        error: 'Invalid session',
        code: 'INVALID_SESSION',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (session.expires < new Date()) {
      console.log('Session expired:', session.expires);
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
      console.log('User not found for session');
      res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('Authentication successful for user:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
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
      console.error('Demo login error:', error);
      res.status(500).json({ error: 'Demo login failed' });
    }
  });

  // Google OAuth routes
  app.get('/api/auth/google', async (req: Request, res: Response) => {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.log('OAuth credentials missing - falling back to demo mode');
        return res.redirect('/login?demo=true&error=oauth_config');
      }
      
      console.log('Starting OAuth flow with client ID ending in:', process.env.GOOGLE_CLIENT_ID?.slice(-10));
      const authUrl = googleAuthService.getAuthUrl();
      console.log('Generated OAuth URL:', authUrl);
      
      // Add note about OAuth app verification status
      console.log('Note: If OAuth fails, check Google Cloud Console OAuth consent screen status');
      console.log('App may need verification or publishing for external users');
      
      res.redirect(authUrl);
    } catch (error) {
      console.error('OAuth initialization error:', error);
      // Fallback to demo mode if OAuth fails
      res.redirect('/login?demo=true&error=oauth_failed');
    }
  });

  app.get('/api/auth/callback/google', async (req: Request, res: Response) => {
    try {
      console.log('OAuth callback received with query:', req.query);
      console.log('OAuth callback received with full URL:', req.url);
      console.log('OAuth callback headers:', req.headers);
      
      const { code, error, error_description } = req.query;
      
      if (error) {
        console.error('OAuth error:', error, error_description);
        return res.redirect(`/login?error=${error}&description=${encodeURIComponent(error_description as string || '')}`);
      }
      
      if (!code || typeof code !== 'string') {
        console.error('No authorization code provided');
        console.log('Full request query params:', Object.keys(req.query));
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
        console.error('Error getting YouTube channel:', error);
        // Continue without YouTube channel info
      }

      console.log('Creating or updating user...');
      // Create or update user
      let user = await storage.getUserByEmail(userInfo.email);
      
      if (!user) {
        console.log('Creating new user...');
        user = await storage.createUser({
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0],
          image: userInfo.picture,
          youtubeId: youtubeChannel?.id,
        });
        console.log('User created:', user.id);
      } else {
        console.log('Updating existing user:', user.id);
        user = await storage.updateUser(user.id, {
          name: userInfo.name || user.name,
          image: userInfo.picture || user.image,
          youtubeId: youtubeChannel?.id || user.youtubeId,
        });
      }

      console.log('Storing account tokens...');
      // Store or update account tokens
      const existingAccount = await storage.getAccountByProvider('google', userInfo.id);
      if (!existingAccount) {
        console.log('Creating new account record...');
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

      console.log('Creating session...');
      // Create session
      const sessionToken = authService.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      await storage.createSession({
        sessionToken,
        userId: user.id,
        expires: expiresAt,
      });

      console.log('OAuth flow completed successfully, redirecting to dashboard...');
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
      console.error('Error in OAuth callback:', error);
      console.error('Full error details:', error);
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
      console.error('Auth error:', error);
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
      console.error('Error fetching tests:', error);
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
      console.error('Error creating test:', error);
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
      console.error('Error updating test status:', error);
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
      console.error('Error deleting test:', error);
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
      console.error('Error fetching test results:', error);
      res.status(500).json({ error: 'Failed to fetch test results' });
    }
  });

  // Get recent videos from user's channel
  app.get('/api/videos/recent', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      // No demo data in dashboard - all users see only authentic data
      
      // Get user's account to access YouTube tokens
      const account = await storage.getAccountByUserId(user.id, 'google');
      if (!account || !account.accessToken) {
        return res.status(401).json({ error: 'YouTube account not connected' });
      }

      // Fetch videos using automatic token refresh system
      const videos = await youtubeService.getChannelVideos(user.id, 10);
      
      res.json(videos);
    } catch (error) {
      console.error('Error fetching recent videos:', error);
      
      // If YouTube API fails, provide helpful error message
      if ((error as any).message?.includes('quotaExceeded')) {
        return res.status(429).json({ error: 'YouTube API quota exceeded. Please try again later.' });
      }
      
      if ((error as any).message?.includes('invalid_credentials') || (error as any).message?.includes('invalid_grant')) {
        return res.status(401).json({ error: 'YouTube authorization expired. Please reconnect your account.' });
      }
      
      res.status(500).json({ error: 'Failed to fetch videos from YouTube. Please try again.' });
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
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Dashboard stats with proper authentication
  app.get('/api/dashboard/stats', requireAuth, async (req: Request, res: Response) => {
    try {
      const tests = await storage.getTestsByUserId(req.user!.id);
      
      const activeTests = tests.filter(t => t.status === 'active').length;
      const completedTests = tests.filter(t => t.status === 'completed').length;
      
      // Calculate total views and average CTR from all summaries
      let totalViews = 0;
      let totalImpressions = 0;
      let avgCtr = 0;
      
      const allSummaries = await Promise.all(
        tests.map(test => storage.getTitleSummariesByTestId(test.id))
      );
      
      const flatSummaries = allSummaries.flat();
      if (flatSummaries.length > 0) {
        totalViews = flatSummaries.reduce((sum, s) => sum + s.totalViews, 0);
        totalImpressions = flatSummaries.reduce((sum, s) => sum + s.totalImpressions, 0);
        avgCtr = flatSummaries.reduce((sum, s) => sum + s.finalCtr, 0) / flatSummaries.length;
      }

      res.json({
        activeTests,
        totalViews,
        avgCtr: avgCtr.toFixed(1),
        testsWon: completedTests,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
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
      console.error('Error collecting analytics:', error);
      res.status(500).json({ error: 'Failed to collect analytics' });
    }
  });

  // Debug route to test rotation system (no auth required for debugging)
  app.get('/api/debug-rotation/:testId/:titleOrder', async (req: Request, res: Response) => {
    console.log(`🔧 [DEBUG ROUTE] Route handler called for ${req.path}`);
    try {
      const { testId, titleOrder } = req.params;
      const order = parseInt(titleOrder);

      console.log(`🔧 [DEBUG ROUTE] Parsed testId: ${testId}, titleOrder: ${order}`);

      const test = await storage.getTest(testId);
      if (!test) {
        console.log(`🔧 [DEBUG ROUTE] Test not found: ${testId}`);
        return res.status(404).json({ error: 'Test not found' });
      }

      console.log(`🔧 [DEBUG ROUTE] Test found: ${test.id}, status: ${test.status}`);
      
      // Get titles for debugging
      const titles = await storage.getTitlesByTestId(testId);
      console.log(`🔧 [DEBUG ROUTE] Found ${titles.length} titles for test ${testId}`);
      
      // Trigger rotation with 6 second delay for immediate testing
      console.log(`🔧 [DEBUG ROUTE] Calling scheduler.scheduleRotation(${testId}, ${order}, 0.1)`);
      scheduler.scheduleRotation(testId, order, 0.1); 
      console.log(`🔧 [DEBUG ROUTE] Scheduler called successfully`);
      
      const response = { 
        success: true, 
        message: `Rotation scheduled for test ${testId}, titleOrder: ${order}`,
        titles: titles.map(t => ({ order: t.order, text: t.text, id: t.id }))
      };
      
      console.log(`🔧 [DEBUG ROUTE] Sending response:`, JSON.stringify(response, null, 2));
      return res.json(response);
    } catch (error) {
      console.error('🔧 [DEBUG ROUTE] Error in debug rotation:', error);
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
      console.error('AI Title Generation Error:', error);
      res.status(500).json({ 
        error: 'Failed to generate titles',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI Video Insights Generation - Intelligent Analysis
  app.post('/api/analyze-video', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { videoId, title, description, viewCount, duration, publishedAt } = req.body;

      if (!videoId || !title) {
        return res.status(400).json({ error: 'Video ID and title are required' });
      }

      // Use Claude to analyze video and generate optimization insights
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a YouTube optimization expert with deep knowledge of title testing, CTR optimization, and viral content strategies. Analyze video metadata and provide actionable insights for A/B testing success.`,
        messages: [{
          role: "user",
          content: `Analyze this YouTube video for title optimization potential:

Title: "${title}"
Description: "${description || 'No description provided'}"
Views: ${viewCount?.toLocaleString() || 'Unknown'}
Duration: ${duration || 'Unknown'}
Published: ${publishedAt ? new Date(publishedAt).toLocaleDateString() : 'Unknown'}

Provide analysis in JSON format with:
{
  "titleOptimizationScore": (score 1-100),
  "thumbnailScore": (estimated score 1-100 based on typical performance),
  "contentCategory": (category string),
  "suggestedImprovements": [array of 2-4 specific actionable suggestions],
  "viralPotential": ("Low", "Medium", or "High"),
  "recommendedTestVariants": [array of 2-3 title variants optimized for A/B testing]
}

Focus on mobile optimization, emotional triggers, curiosity gaps, and 2025 YouTube algorithm factors.`
        }]
      });

      const content = message.content[0];
      if (content.type === 'text') {
        try {
          const analysis = JSON.parse(content.text);
          
          res.json({
            videoId,
            analysis,
            generated_at: new Date().toISOString(),
            model: 'claude-sonnet-4-20250514'
          });
        } catch (parseError) {
          // Fallback if JSON parsing fails
          res.json({
            videoId,
            analysis: {
              titleOptimizationScore: Math.floor(Math.random() * 30) + 70,
              thumbnailScore: Math.floor(Math.random() * 25) + 65,
              contentCategory: 'General',
              suggestedImprovements: [
                'Consider adding emotional trigger words',
                'Test shorter title variants for mobile',
                'Add specific numbers or statistics'
              ],
              viralPotential: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
              recommendedTestVariants: [
                title + ' (You Won\'t Believe This)',
                'The Truth About ' + title,
                title.replace(/[?!]/g, '') + ' - REVEALED'
              ]
            },
            generated_at: new Date().toISOString(),
            model: 'claude-sonnet-4-20250514',
            note: 'Fallback analysis due to parsing error'
          });
        }
      } else {
        throw new Error('Unexpected response format from AI');
      }

    } catch (error) {
      console.error('AI Video Analysis Error:', error);
      res.status(500).json({ 
        error: 'Failed to analyze video',
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
          email: user.email,
          name: user.name,
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
      console.error('Error creating Stripe subscription:', error);
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
      console.error('Error checking subscription status:', error);
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
      console.error('Error updating subscription:', error);
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
      console.error('Subscription check error:', error);
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
      console.log(`Webhook signature verification failed.`, err?.message || err);
      return res.status(400).send(`Webhook Error: ${err?.message || 'Invalid signature'}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        
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
            
            console.log(`Activated ${plan} subscription for user ${userId}`);
          } catch (error) {
            console.error('Error activating subscription:', error);
          }
        }
        break;
        
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        console.log('Subscription cancelled:', subscription.id);
        
        // Find user by Stripe subscription ID and deactivate
        try {
          const user = await storage.getUserByStripeSubscriptionId(subscription.id);
          if (user) {
            await storage.updateUserSubscription(user.id, 'cancelled', null);
            console.log(`Deactivated subscription for user ${user.id}`);
          }
        } catch (error) {
          console.error('Error handling subscription cancellation:', error);
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
