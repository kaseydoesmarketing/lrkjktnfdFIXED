import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scheduler } from "./scheduler";
import { authService } from "./auth";
import { googleAuthService } from "./googleAuth";
import { youtubeService } from "./youtubeService";
import { insertTestSchema, insertTitleSchema } from "@shared/schema";
import { z } from "zod";

// Session middleware
async function requireAuth(req: Request, res: Response, next: Function) {
  const sessionToken = req.cookies['session-token'] || req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const session = await storage.getSession(sessionToken);
    if (!session || session.expires < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
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
        id: authService.generateSessionToken(),
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
      // Set session token as cookie
      res.cookie('session-token', sessionToken, {
        httpOnly: false, // Allow frontend access
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      // Redirect to dashboard
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
    const user = (req as any).user;
    res.json(user);
  });

  // Test routes
  app.get('/api/tests', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
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
      const user = (req as any).user;
      const { videoId, videoTitle, titles: titleTexts, rotationIntervalMinutes, winnerMetric, startDate, endDate } = req.body;

      if (!videoId || !titleTexts || titleTexts.length < 2) {
        return res.status(400).json({ error: 'Video ID and at least 2 titles are required' });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      // Create test
      const test = await storage.createTest({
        userId: user.id,
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
      const { status } = req.body;
      
      if (!['active', 'paused'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

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
      const user = (req as any).user;
      
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
      const user = (req as any).user;
      
      // Get user's account to access YouTube tokens
      const account = await storage.getAccountByUserId(user.id, 'google');
      if (!account || !account.accessToken) {
        return res.status(401).json({ error: 'YouTube account not connected' });
      }

      // Fetch real videos from user's YouTube channel
      const videos = await youtubeService.getChannelVideos(account.accessToken, 10);
      
      res.json(videos);
    } catch (error) {
      console.error('Error fetching recent videos:', error);
      
      // If YouTube API fails, provide helpful error message
      if (error.message?.includes('quotaExceeded')) {
        return res.status(429).json({ error: 'YouTube API quota exceeded. Please try again later.' });
      }
      
      if (error.message?.includes('invalid_credentials') || error.message?.includes('invalid_grant')) {
        return res.status(401).json({ error: 'YouTube authorization expired. Please reconnect your account.' });
      }
      
      res.status(500).json({ error: 'Failed to fetch videos from YouTube. Please try again.' });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.['session-token'];
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'No session token' });
      }
      
      const session = await storage.getSession(sessionToken);
      if (!session || session.expires <= new Date()) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
      
      const tests = await storage.getTestsByUserId(session.userId);
      
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
      const user = (req as any).user;
      
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
      const activeTitle = titles.find(t => t.activatedAt && !titles.some(other => 
        other.activatedAt && other.activatedAt > t.activatedAt
      ));
      
      if (!activeTitle?.activatedAt) {
        return res.status(400).json({ error: 'No active title found' });
      }

      // Get real analytics data
      const startDate = activeTitle.activatedAt.toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      const analytics = await youtubeService.getVideoAnalytics(
        account.accessToken, 
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

  const httpServer = createServer(app);
  return httpServer;
}
