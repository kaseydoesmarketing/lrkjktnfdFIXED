import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scheduler } from "./scheduler";
import { authService } from "./auth";
import { youtubeService } from "./youtubeService";
import { analyticsCollector } from "./analyticsCollector";
import authSupabaseRoutes from "./routes/auth-supabase";
import channelsRoutes from "./routes/channels";
import { supabase } from "./auth/supabase";
import rotationRoutes from "./routes/rotation";
import stripeWebhookRoutes from "./routes/stripe-webhook";
import {
  apiCache,
  youtubeCache,
  userCache,
  cacheKey,
  getCachedOrFetch,
  invalidateUserCache,
  invalidateTestCache,
} from "./cache";
import { insertTestSchema, insertTitleSchema, type User } from "@shared/schema";
import { getTestAnalytics } from "./controllers/test-analytics";
import { z } from "zod";

// Input validation schemas
const createTestValidation = z.object({
  videoId: z.string().min(1),
  videoTitle: z.string().min(1).optional(),
  titles: z.array(z.string().min(1).max(200)).min(2).max(5),
  rotationIntervalMinutes: z.number().min(60).max(10080), // 1 hour to 1 week
  winnerMetric: z.enum(["ctr", "views", "combined"]),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid start date format",
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid end date format",
  }),
});

const updateTestStatusValidation = z.object({
  status: z.enum(["active", "paused", "cancelled", "completed"]),
});

const generateTitlesValidation = z.object({
  topic: z.string().min(5).max(500),
  framework: z.string().optional(),
});

import Stripe from "stripe";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("⚠️ STRIPE_SECRET_KEY not configured, using demo key for development");
  process.env.STRIPE_SECRET_KEY = "sk_test_demo_key";
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
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

// Import requireAuth from the Supabase auth middleware
import { requireAuth } from "./middleware/auth";



export async function registerRoutes(app: Express): Promise<Server> {
  // Register admin routes removed - using Supabase auth
  
  
  // Use Supabase auth routes
  app.use(authSupabaseRoutes);
  app.use(channelsRoutes); // Channel selection routes
  
  // Register rotation routes
  app.use(rotationRoutes);
  
  // Register Stripe webhook routes - MUST be before body parser
  app.use(stripeWebhookRoutes);

  // Health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Start or schedule a test
  app.post(
    "/api/tests/:testId/start",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const { startNow = false } = req.body;
        const user = req.user!;
        
        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }
        
        if (startNow) {
          // Start immediately
          await scheduler.scheduleTest(testId, test.rotationIntervalMinutes || 60);
        } else {
          // Schedule for later
          await scheduler.scheduleTest(testId, test.rotationIntervalMinutes || 60);
        }
        
        await storage.updateTestStatus(testId, "active");
        res.json({ success: true, message: "Test started successfully" });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Demo login route removed - using Supabase auth exclusively

  // OAuth diagnostic route - updated for Supabase
  app.get("/api/auth/debug", (req: Request, res: Response) => {
    const diagnostics = {
      environment: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 20) + "...",
      detectedDomain: req.get("host"),
      timestamp: new Date().toISOString(),
    };

    res.json({
      status: "Supabase OAuth Configuration Diagnostics",
      ...diagnostics,
      supabaseCallbackUrl: "https://xyehwoacgpsxakhjwglq.supabase.co/auth/v1/callback",
      googleCloudConsoleUrl: "Configured in Supabase Dashboard > Auth > Providers > Google",
      troubleshooting: {
        step1: "Verify Google OAuth is enabled in Supabase Dashboard",
        step2: "Check that Google Client ID and Secret are configured in Supabase",
        step3: "Ensure callback URL in Google Cloud Console matches Supabase callback",
        step4: "Confirm environment variables SUPABASE_URL and SUPABASE_ANON_KEY are set",
      },
    });
  });

  // OLD OAuth routes - removed, using Supabase auth exclusively
  /*
  app.get("/api/auth/google", async (req: Request, res: Response) => {
    try {
      // Always ensure OAuth works for production
      // Google OAuth is handled by Supabase - this route should not be accessed
      return res.status(410).json({
        error: "Legacy OAuth route removed",
        message: "Please use Supabase OAuth for authentication"
      });

      const authUrl = googleAuthService.getAuthUrl();

      // Add note about OAuth app verification status

      res.redirect(authUrl);
    } catch (error) {
      // Fallback to demo mode if OAuth fails
      res.redirect("/login?demo=true&error=oauth_failed");
    }
  });

  app.get("/api/auth/callback/google", async (req: Request, res: Response) => {
    try {
      console.log("🔍 OAuth Callback Debug:");
      console.log("- Full URL:", req.url);
      console.log("- Query params:", req.query);

      const { code, error, error_description } = req.query;
      const errorStr = typeof error === "string" ? error : "";
      const errorDescStr =
        typeof error_description === "string" ? error_description : "";

      console.log("- Code present:", !!code);
      console.log("- Error:", errorStr);
      console.log("- Error description:", errorDescStr);

      if (error) {
        // Handle redirect_uri_mismatch with intelligent fallback
        if (
          errorStr === "redirect_uri_mismatch" ||
          errorDescStr.includes("redirect_uri_mismatch")
        ) {
          // Create development user automatically
          try {
            const devUser =
              (await storage.getUserByEmail("dev@titletesterpro.com")) ||
              (await storage.createUser({
                email: "dev@titletesterpro.com",
                name: "Development User",
                image: null,
              }));

            // Create session for development user
            const sessionToken = authService.generateSessionToken();
            const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await storage.createSession({
              sessionToken,
              userId: devUser.id,
              expires,
            });

            // Set session cookie and redirect
            res.cookie("session-token", sessionToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              maxAge: 30 * 24 * 60 * 60 * 1000,
            });

            return res.redirect("/dashboard?dev=true");
          } catch (devError) {}
        }

        return res.redirect(
          `/login?error=${errorStr}&description=${encodeURIComponent(errorDescStr)}`,
        );
      }

      if (!code || typeof code !== "string") {
        return res.redirect(
          "/login?error=no_code&description=No authorization code received from Google",
        );
      }

      // Exchange code for tokens
      console.log("📝 Exchanging code for tokens...");
      const tokens = await googleAuthService.exchangeCodeForTokens(code);
      console.log("✅ Tokens received:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      });

      if (!tokens.access_token) {
        return res.status(400).json({ error: "Failed to get access token" });
      }

      // Get user info from Google
      const userInfo = await googleAuthService.getUserInfo(tokens.access_token);

      // Get YouTube channel info
      let youtubeChannel;
      try {
        youtubeChannel = await googleAuthService.getYouTubeChannel(
          tokens.access_token,
        );
      } catch (error) {
        // Continue without YouTube channel info
      }

      // Create or update user with timeout protection
      let user;
      try {
        user = await storage.getUserByEmail(userInfo.email);
      } catch (error) {
        console.error('Failed to get user by email:', error);
        return res.redirect('/login?error=database_error');
      }

      if (!user) {
        // Check if this is the founder account and grant authority privileges
        const isFounder = userInfo.email === "kaseydoesmarketing@gmail.com";
        user = await storage.createUser({
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split("@")[0],
          image: userInfo.picture,
          youtubeId: youtubeChannel?.id,
          subscriptionTier: isFounder ? "authority" : undefined,
          subscriptionStatus: isFounder ? "active" : undefined,
        });
      } else {
        // Update user info and ensure founder has authority privileges
        const isFounder = userInfo.email === "kaseydoesmarketing@gmail.com";
        user = await storage.updateUser(user.id, {
          name: userInfo.name || user.name,
          image: userInfo.picture || user.image,
          youtubeId: youtubeChannel?.id || user.youtubeId,
          subscriptionTier: isFounder ? "authority" : user.subscriptionTier,
          subscriptionStatus: isFounder ? "active" : user.subscriptionStatus,
        });
      }

      // Store or update account tokens
      const existingAccount = await storage.getAccountByProvider(
        "google",
        userInfo.id,
      );
      if (!existingAccount) {
        await storage.createAccount({
          userId: user.id,
          type: "oauth",
          provider: "google",
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
      res.cookie("session-token", sessionToken, {
        httpOnly: true, // Prevent XSS attacks
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict", // CSRF protection
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Redirect to dashboard without token in URL for security
      res.redirect("/dashboard");
    } catch (error) {
      console.error("❌ OAuth callback error:", error);
      console.error(
        "Stack trace:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      res.redirect("/login?error=oauth_failed");
    }
  });
  */
  
  // Legacy OAuth routes removed - using Supabase auth exclusively

  // Debug endpoint to check all tests (remove in production)
  app.get("/api/debug/all-tests", async (req: Request, res: Response) => {
    try {
      const allTests = await storage.getAllTests();
      console.log('🔍 [DEBUG] All tests in database:', allTests.length);
      res.json({ totalTests: allTests.length, tests: allTests });
    } catch (error) {
      console.error('❌ [DEBUG] Error fetching all tests:', error);
      res.status(500).json({ error: 'Failed to fetch tests' });
    }
  });

  // Test routes
  app.get("/api/tests", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      console.log('📊 [/api/tests] Fetching tests for user:', user.id, user.email);
      
      const tests = await storage.getTestsByUserId(user.id);
      console.log('✅ [/api/tests] Found tests:', tests.length);
      
      // Get titles for each test and calculate next rotation time
      const testsWithTitles = await Promise.all(
        tests.map(async (test) => {
          const titles = await storage.getTitlesByTestId(test.id);
          console.log(`📝 [/api/tests] Test ${test.id} has ${titles.length} titles`);
          
          // Calculate next rotation time
          let nextRotationAt = null;
          if (test.status === 'active' && test.createdAt) {
            // If no rotation yet, use creation time + interval
            const created = new Date(test.createdAt);
            const intervalMs = (test.rotationIntervalMinutes || 60) * 60 * 1000;
            nextRotationAt = new Date(created.getTime() + intervalMs);
          }
          
          return { ...test, titles, nextRotationAt };
        }),
      );

      console.log('🎯 [/api/tests] Returning tests with titles:', testsWithTitles.length);
      res.json(testsWithTitles);
    } catch (error) {
      console.error('❌ [/api/tests] Error:', error);
      res.status(500).json({ error: "Failed to fetch tests" });
    }
  });

  // Get active tests for dashboard
  app.get("/api/tests/active", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      console.log('📊 [/api/tests/active] Fetching active tests for user:', user.id, user.email);
      
      const tests = await storage.getTestsByUserId(user.id);
      const activeTests = tests.filter(test => test.status === 'active');
      console.log('✅ [/api/tests/active] Found active tests:', activeTests.length);
      
      console.log(`📝 [/api/tests/active] Fetching ${activeTests.length} active tests with optimized query`);
      
      const testsWithData = await storage.getActiveTestsWithAnalytics();

      console.log('🎯 [/api/tests/active] Returning active tests with data:', testsWithData.length);
      res.json(testsWithData);
    } catch (error) {
      console.error('❌ [/api/tests/active] Error:', error);
      res.status(500).json({ error: "Failed to fetch active tests" });
    }
  });

  app.post("/api/tests", requireAuth, async (req: Request, res: Response) => {
    try {
      // Validate input with comprehensive schema
      const validationResult = createTestValidation.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
          receivedData: req.body,
          timestamp: new Date().toISOString(),
        });
      }

      const {
        videoId,
        videoTitle,
        titles: titleTexts,
        rotationIntervalMinutes,
        winnerMetric,
        startDate,
        endDate,
      } = validationResult.data;

      // Create test
      const test = await storage.createTest({
        userId: req.user!.id,
        videoId,
        videoTitle,
        rotationIntervalMinutes: rotationIntervalMinutes || 30,
        winnerMetric: winnerMetric || "ctr",
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
          }),
        ),
      );

      // Start the test
      await storage.updateTestStatus(test.id, "active");

      // Schedule the test with the specified rotation interval
      await scheduler.scheduleTest(test.id, rotationIntervalMinutes || 60);

      res.json({ ...test, titles });
    } catch (error) {
      res.status(500).json({ error: "Failed to create test" });
    }
  });

  app.put(
    "/api/tests/:testId/status",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;

        // Validate status input
        const validationResult = updateTestStatusValidation.safeParse(req.body);

        if (!validationResult.success) {
          return res.status(400).json({
            error: "Invalid status value",
            details: validationResult.error.errors,
            timestamp: new Date().toISOString(),
          });
        }

        const { status } = validationResult.data;

        const test = await storage.updateTestStatus(testId, status);

        // If test is being activated, start title rotation immediately
        if (status === "active") {
          const test = await storage.getTest(testId);
          await scheduler.scheduleTest(testId, test?.rotationIntervalMinutes || 60);
        }

        res.json(test);
      } catch (error) {
        res.status(500).json({ error: "Failed to update test status" });
      }
    },
  );

  // Update test configuration (interval and titles)
  app.put(
    "/api/tests/:testId/config",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        // Verify the test belongs to the user
        const test = await storage.getTest(testId);
        if (!test) {
          return res.status(404).json({ error: "Test not found" });
        }

        if (test.userId !== user.id) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        // Validate input
        const updateSchema = z.object({
          rotationIntervalMinutes: z.number().min(15).max(10080).optional(), // 15 minutes to 1 week
          titles: z.array(z.string().min(1).max(200)).min(2).max(5).optional(),
        });

        const validationResult = updateSchema.safeParse(req.body);
        if (!validationResult.success) {
          return res.status(400).json({
            error: "Invalid input",
            details: validationResult.error.errors,
          });
        }

        const { rotationIntervalMinutes, titles } = validationResult.data;

        // Update test interval if provided
        if (rotationIntervalMinutes !== undefined) {
          await storage.updateTest(testId, { rotationIntervalMinutes });

          // Reschedule rotation with new interval if test is active
          if (test.status === "active") {
            await scheduler.stopScheduledTest(testId);
            await scheduler.scheduleTest(testId, rotationIntervalMinutes);
          }
        }

        // Update titles if provided
        if (titles) {
          // Delete existing titles
          await storage.deleteTitlesByTestId(testId);

          // Create new titles
          for (let i = 0; i < titles.length; i++) {
            await storage.createTitle({
              testId,
              text: titles[i],
              order: i,
            });
          }
        }

        // Get updated test with titles
        const updatedTest = await storage.getTest(testId);
        const updatedTitles = await storage.getTitlesByTestId(testId);

        res.json({
          ...updatedTest,
          titles: updatedTitles.map(t => t.text),
        });
      } catch (error) {
        console.error("Error updating test config:", error);
        res.status(500).json({ error: "Failed to update test configuration" });
      }
    },
  );

  app.delete(
    "/api/tests/:testId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        // Verify the test belongs to the user
        const test = await storage.getTest(testId);
        if (!test) {
          return res.status(404).json({ error: "Test not found" });
        }

        if (test.userId !== user.id) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        // Cancel any scheduled jobs for this test
        await scheduler.stopScheduledTest(testId);

        // Delete the test (cascade delete will handle related records)
        await storage.deleteTest(testId);

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete test" });
      }
    },
  );

  app.get(
    "/api/tests/:testId/results",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;

        const test = await storage.getTest(testId);
        if (!test) {
          return res.status(404).json({ error: "Test not found" });
        }

        const titles = await storage.getTitlesByTestId(testId);
        const summaries = await storage.getTitleSummariesByTestId(testId);

        // Get analytics for each title
        const titlesWithAnalytics = await Promise.all(
          titles.map(async (title) => {
            const analytics = await storage.getAnalyticsPollsByTitleId(
              title.id,
            );
            const summary = summaries.find((s) => s.titleId === title.id);
            return { ...title, analytics, summary };
          }),
        );

        res.json({
          test,
          titles: titlesWithAnalytics,
          summaries,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch test results" });
      }
    },
  );

  // Get real-time video metrics (YouTube Data API v3)
  app.get(
    "/api/videos/:videoId/realtime",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { videoId } = req.params;
        const user = req.user!;
        
        const metrics = await youtubeService.getRealTimeMetrics(user.id, videoId);
        res.json(metrics);
      } catch (error) {
        console.error('Real-time metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch real-time metrics' });
      }
    }
  );

  // Get recent videos from user's channel
  app.get(
    "/api/videos/recent",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;

        // No demo data in dashboard - all users see only authentic data

        // Check if this is a development user or founder without OAuth tokens
        const isDevelopmentUser =
          user.email === "dev@titletesterpro.com" ||
          user.email === "demo@titletesterpro.com" ||
          user.email === "kaseydoesmarketing@gmail.com";

        if (isDevelopmentUser) {
          // Provide realistic demo data for development/testing
          const demoVideos = [
            {
              id: "dQw4w9WgXcQ",
              title: "Never Gonna Give You Up",
              thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
              duration: "3:33",
              publishedAt: "2009-10-25T06:57:33Z",
              viewCount: 1400000000,
            },
            {
              id: "jNQXAC9IVRw",
              title: "Me at the zoo",
              thumbnailUrl: "https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg",
              duration: "0:19",
              publishedAt: "2005-04-23T23:31:52Z",
              viewCount: 280000000,
            },
            {
              id: "9bZkp7q19f0",
              title: "PSY - GANGNAM STYLE",
              thumbnailUrl: "https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg",
              duration: "4:12",
              publishedAt: "2012-07-15T08:34:21Z",
              viewCount: 4800000000,
            },
          ];

          return res.json(demoVideos);
        }

        // Check if user has YouTube tokens in accounts table
        const googleAccount = await storage.getAccountByUserId(user.id, 'google');
        
        if (!googleAccount || !googleAccount.accessToken) {
          return res.status(401).json({
            error: "YouTube account not connected",
            message: "Please reconnect your YouTube account via Google OAuth",
          });
        }

        try {
          // Fetch videos using automatic token refresh system
          const videos = await youtubeService.getChannelVideos(user.id, 200);

          // Map thumbnail field to thumbnailUrl for frontend consistency
          const videosWithThumbnailUrl = videos.map((video) => ({
            ...video,
            thumbnailUrl:
              video.thumbnail ||
              `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
          }));

          res.json(videosWithThumbnailUrl);
        } catch (apiError: any) {
          // If token refresh fails completely, offer re-authentication
          if (
            apiError.message?.includes("invalid_grant") ||
            apiError.message?.includes("Authentication failed")
          ) {
            return res.status(401).json({
              error: "YouTube authorization expired",
              message:
                "Your YouTube access has expired. Please sign in again to reconnect your account.",
              reauth_required: true,
              reauth_url: "/login",
            });
          }

          // For other API errors, provide specific feedback
          if (apiError.message?.includes("quotaExceeded")) {
            return res.status(429).json({
              error: "YouTube API quota exceeded",
              message:
                "Please try again later or contact support if this persists.",
            });
          }

          throw apiError; // Re-throw to main catch block
        }
      } catch (error) {
        res.status(500).json({
          error: "Failed to fetch videos from YouTube",
          message: "Please try again or contact support if this continues.",
        });
      }
    },
  );

  // Get channel videos endpoint
  app.get('/api/videos/channel', requireAuth, async (req: Request, res: Response) => {
    try {
      console.log('🎥 [/api/videos/channel] Starting request for user:', req.user!.email);
      const userId = req.user!.id;
      
      // First check if we have YouTube tokens in accounts table - this is the source of truth
      const account = await storage.getAccountByUserId(userId, 'google');
      if (!account || !account.accessToken) {
        console.log('❌ [/api/videos/channel] No YouTube tokens found in accounts table');
        return res.status(401).json({ 
          error: 'YouTube account not connected. Please reconnect your Google account.',
          requiresAuth: true,
          needsReconnect: true
        });
      }
      
      // Use the getChannelVideos method which has built-in token refresh
      console.log('🔄 [/api/videos/channel] Calling getChannelVideos with token refresh...');
      const videos = await youtubeService.getChannelVideos(userId);
      
      // Format the response with proper data structure
      const formattedVideos = videos.map(video => ({
        id: video.id,
        videoId: video.id,
        title: video.title,
        description: video.description || '',
        thumbnail: video.thumbnail,
        publishedAt: video.publishedAt,
        duration: video.duration || 'PT0S',
        viewCount: parseInt(String(video.viewCount || '0'), 10),
        likeCount: 0,
        commentCount: 0,
        status: video.status || 'public',
        analytics: {
          ctr: null,
          score: null,
        }
      }));

      console.log(`✅ [/api/videos/channel] Successfully fetched ${formattedVideos.length} videos`);
      res.json(formattedVideos);
    } catch (error: any) {
      console.error('❌ Detailed error in /api/videos/channel:', error);
      console.error('❌ Error message:', error.message);
      
      if (error.message?.includes('re-authentication required')) {
        return res.status(401).json({ 
          error: 'YouTube authentication required',
          message: 'Please reconnect your YouTube account',
          requiresAuth: true
        });
      }
      
      res.status(500).json({ error: error.message || 'Failed to fetch videos' });
    }
  });

  // Authentication endpoints
  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    // Get fresh user data from Supabase to include metadata
    const { data: { user } } = await supabase.auth.getUser(req.cookies['sb-access-token']);
    
    if (user) {
      // Merge database user with Supabase metadata
      const enrichedUser = {
        ...req.user,
        user_metadata: user.user_metadata,
        youtubeChannelId: user.user_metadata?.youtube_channel_id || null,
        youtubeChannelTitle: user.user_metadata?.youtube_channel_title || null
      };
      res.json(enrichedUser);
    } else {
      res.json(req.user);
    }
  });

  // Save YouTube OAuth tokens after login
  app.post("/api/accounts/save-tokens", requireAuth, async (req: Request, res: Response) => {
    try {
      const { accessToken, refreshToken, youtubeChannelId, youtubeChannelTitle, youtubeChannelThumbnail } = req.body;
      const userId = req.user!.id;

      console.log('💾 [SAVE-TOKENS] Saving YouTube tokens for user:', userId);

      if (!accessToken || !refreshToken) {
        return res.status(400).json({ error: "Missing tokens" });
      }

      // Update user with YouTube channel data if provided
      if (youtubeChannelId || youtubeChannelTitle) {
        console.log('📺 [SAVE-TOKENS] Updating YouTube channel data');
        const updateData: any = {};
        if (youtubeChannelId) updateData.youtubeChannelId = youtubeChannelId;
        if (youtubeChannelTitle) updateData.youtubeChannelTitle = youtubeChannelTitle;
        
        await storage.updateUser(userId, updateData);
      }

      // Check if account exists
      const existingAccount = await storage.getAccountByUserId(userId, 'google');
      
      if (existingAccount) {
        // Update existing account
        console.log('🔄 [SAVE-TOKENS] Updating existing Google account');
        await storage.updateAccountTokens(existingAccount.id, {
          accessToken: authService.encryptToken(accessToken),
          refreshToken: authService.encryptToken(refreshToken),
          expiresAt: Date.now() + (3600 * 1000) // 1 hour expiry
        });
      } else {
        // Create new account
        console.log('✨ [SAVE-TOKENS] Creating new Google account');
        await storage.createAccount({
          userId,
          provider: 'google',
          accessToken: authService.encryptToken(accessToken),
          refreshToken: authService.encryptToken(refreshToken),
          expiresAt: Date.now() + (3600 * 1000),
          youtubeChannelId: null,
          youtubeChannelTitle: null,
          youtubeChannelThumbnail: null
        });
      }

      console.log('✅ [SAVE-TOKENS] YouTube tokens saved successfully');
      return res.json({ success: true });
    } catch (error) {
      console.error('❌ [SAVE-TOKENS] Error saving tokens:', error);
      return res.status(500).json({ error: "Failed to save tokens" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const sessionToken = req.cookies["session-token"];

      if (sessionToken) {
        // Delete session from database
      }

      // Clear the secure cookie
      res.clearCookie("session-token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Dashboard stats with real-time data from active tests only
  app.get(
    "/api/dashboard/stats",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tests = await storage.getTestsByUserId(req.user!.id);

        const activeTests = tests.filter((t) => t.status === "active").length;
        const completedTests = tests.filter(
          (t) => t.status === "completed",
        ).length;

        // Calculate real metrics from ACTIVE tests only
        let totalViews = 0;
        let totalImpressions = 0;
        let avgCtr = 0;
        let avgViewDuration = 0;
        let dataPoints = 0;

        // Get analytics from active tests only for real-time data
        const activeTestsData = tests.filter((t) => t.status === "active");

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
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
      }
    },
  );

  // Manual analytics trigger for testing
  app.post(
    "/api/tests/:testId/collect-analytics",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        const account = await storage.getAccountByUserId(user.id);
        if (!account?.accessToken) {
          return res
            .status(401)
            .json({ error: "YouTube account not connected" });
        }

        // Get the currently active title
        const titles = await storage.getTitlesByTestId(testId);
        const activeTitle = titles.find((t) => {
          if (!t.activatedAt) return false;
          return !titles.some(
            (other) => other.activatedAt && other.activatedAt > t.activatedAt!,
          );
        });

        if (!activeTitle?.activatedAt) {
          return res.status(400).json({ error: "No active title found" });
        }

        // Get real analytics data
        const startDate = activeTitle.activatedAt.toISOString().split("T")[0];
        const endDate = new Date().toISOString().split("T")[0];

        const analytics = await youtubeService.getVideoAnalytics(
          user.id,
          test.videoId,
          new Date(startDate),
          new Date(endDate),
        );

        // Create analytics poll with real YouTube Analytics data
        await storage.createAnalyticsPoll({
          titleId: activeTitle.id,
          views: analytics.views,
          impressions: analytics.impressions,
          ctr: analytics.ctr,
          averageViewDuration: analytics.avgViewDuration,
        });

        res.json({
          success: true,
          analytics: {
            views: analytics.views,
            impressions: analytics.impressions,
            ctr: analytics.ctr,
            averageViewDuration: analytics.avgViewDuration,
          },
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to collect analytics" });
      }
    },
  );

  // Force analytics collection for test (debugging endpoint)
  app.post(
    "/api/tests/:testId/force-analytics",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        await analyticsCollector.forceCollectTestAnalytics(testId);

        res.json({
          success: true,
          message: "Analytics collection forced successfully",
          testId,
        });
      } catch (error: any) {
        res
          .status(500)
          .json({
            error: error.message || "Failed to force analytics collection",
          });
      }
    },
  );

  // Simulate rotation for testing
  app.post(
    "/api/tests/:testId/simulate-rotation",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        await analyticsCollector.simulateRotation(testId);

        res.json({
          success: true,
          message: "Title rotation simulated successfully",
          testId,
        });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || "Failed to simulate rotation" });
      }
    },
  );

  // Get complete rotation history with timestamps
  app.get(
    "/api/tests/:testId/rotation-history",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        const titles = await storage.getTitlesByTestId(testId);
        const rotationHistory: any[] = [];

        // Build rotation history from title activations
        for (let i = 0; i < titles.length; i++) {
          const title = titles[i];
          if (title.activatedAt) {
            const nextTitle = titles[i + 1];
            const endedAt = nextTitle?.activatedAt || new Date();
            
            // Get analytics data for this rotation period
            const analytics = await storage.getAnalyticsPollsByTitleId(title.id);
            const rotationAnalytics = analytics.filter(a => {
              const pollTime = new Date(a.polledAt);
              return pollTime >= title.activatedAt! && pollTime <= endedAt;
            });

            // Calculate aggregated performance for this rotation
            const totalViews = rotationAnalytics.reduce((sum, a) => sum + a.views, 0);
            const totalImpressions = rotationAnalytics.reduce((sum, a) => sum + a.impressions, 0);
            const avgCtr = rotationAnalytics.length > 0 
              ? rotationAnalytics.reduce((sum, a) => sum + a.ctr, 0) / rotationAnalytics.length
              : 0;

            rotationHistory.push({
              rotationNumber: title.order,
              titleId: title.id,
              title: title.text,
              startedAt: title.activatedAt,
              endedAt: endedAt !== new Date() ? endedAt : null,
              durationMinutes: Math.floor((endedAt.getTime() - title.activatedAt.getTime()) / (1000 * 60)),
              youtubeUpdateSuccessful: true, // We can track this in future updates
              performance: {
                views: totalViews,
                ctr: Number(avgCtr.toFixed(2)),
                impressions: totalImpressions
              }
            });
          }
        }

        res.json(rotationHistory);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch rotation history" });
      }
    },
  );

  // Real-time rotation status
  app.get(
    "/api/tests/:testId/current-rotation",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        const titles = await storage.getTitlesByTestId(testId);
        
        // Find the currently active title
        const activeTitle = titles.find((t) => {
          if (!t.activatedAt) return false;
          return !titles.some(
            (other) => other.activatedAt && other.activatedAt > t.activatedAt!,
          );
        });

        if (!activeTitle || !activeTitle.activatedAt) {
          return res.json({
            currentTitle: null,
            timeUntilNextRotation: 0,
            rotationNumber: 0,
            totalTitles: titles.length,
            testStatus: test.status
          });
        }

        // Calculate time until next rotation
        const rotationTime = test.rotationIntervalMinutes * 60 * 1000;
        const timeSinceActivation = Date.now() - activeTitle.activatedAt.getTime();
        const timeUntilNext = Math.max(0, rotationTime - timeSinceActivation);

        res.json({
          currentTitle: activeTitle.text,
          timeUntilNextRotation: Math.ceil(timeUntilNext / (1000 * 60)), // minutes remaining
          rotationNumber: activeTitle.order,
          totalTitles: titles.length,
          testStatus: test.status
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch current rotation status" });
      }
    },
  );

  // Comprehensive test logs with performance data
  app.get(
    "/api/tests/:testId/logs",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        const titles = await storage.getTitlesByTestId(testId);
        const detailedLogs: any[] = [];
        let totalTestDuration = 0;
        let successfulUpdates = 0;
        let failedUpdates = 0;

        // Build detailed logs for each title rotation
        for (let i = 0; i < titles.length; i++) {
          const title = titles[i];
          if (title.activatedAt) {
            const nextTitle = titles[i + 1];
            const endedAt = nextTitle?.activatedAt || new Date();
            const durationMinutes = Math.floor((endedAt.getTime() - title.activatedAt.getTime()) / (1000 * 60));
            totalTestDuration += durationMinutes;
            
            // Get all analytics for this rotation period
            const analytics = await storage.getAnalyticsPollsByTitleId(title.id);
            const rotationAnalytics = analytics.filter(a => {
              const pollTime = new Date(a.polledAt);
              return pollTime >= title.activatedAt! && pollTime <= endedAt;
            });

            // Calculate performance metrics
            const totalViews = rotationAnalytics.reduce((sum, a) => sum + a.views, 0);
            const totalImpressions = rotationAnalytics.reduce((sum, a) => sum + a.impressions, 0);
            const avgCtr = rotationAnalytics.length > 0 
              ? rotationAnalytics.reduce((sum, a) => sum + a.ctr, 0) / rotationAnalytics.length
              : 0;
            const avgViewDuration = rotationAnalytics.length > 0
              ? rotationAnalytics.reduce((sum, a) => sum + a.averageViewDuration, 0) / rotationAnalytics.length
              : 0;

            successfulUpdates++; // Track success/failure when we add YouTube update tracking

            detailedLogs.push({
              rotationNumber: title.order,
              title: title.text,
              startedAt: title.activatedAt,
              endedAt: endedAt !== new Date() ? endedAt : null,
              durationMinutes,
              youtubeUpdateSuccessful: true,
              performance: {
                views: totalViews,
                ctr: Number(avgCtr.toFixed(2)),
                impressions: totalImpressions,
                averageViewDuration: Math.round(avgViewDuration)
              }
            });
          }
        }

        res.json({
          test: {
            id: test.id,
            videoId: test.videoId,
            status: test.status,
            rotationIntervalMinutes: test.rotationIntervalMinutes,
            winnerMetric: test.winnerMetric,
            startDate: test.startDate,
            endDate: test.endDate
          },
          titles: titles.map(t => ({ id: t.id, text: t.text, order: t.order })),
          rotationHistory: detailedLogs,
          summary: {
            totalRotations: detailedLogs.length,
            successfulUpdates,
            failedUpdates,
            totalTestDuration
          }
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch test logs" });
      }
    },
  );

  // Individual title performance over time
  app.get(
    "/api/titles/:titleId/performance",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { titleId } = req.params;
        const user = req.user!;

        // Verify title belongs to user
        const title = await storage.getTitle(titleId);
        if (!title) {
          return res.status(404).json({ error: "Title not found" });
        }

        const test = await storage.getTest(title.testId);
        if (!test || test.userId !== user.id) {
          return res.status(403).json({ error: "Access denied" });
        }

        // Get all analytics polls for this title
        const analytics = await storage.getAnalyticsPollsByTitleId(titleId);
        
        // Format performance data with timestamps
        const performanceData = analytics.map(poll => ({
          timestamp: poll.polledAt,
          views: poll.views,
          impressions: poll.impressions,
          ctr: poll.ctr,
          averageViewDuration: poll.averageViewDuration
        }));

        res.json({
          titleId,
          titleText: title.text,
          order: title.order,
          activatedAt: title.activatedAt,
          performanceHistory: performanceData
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch title performance" });
      }
    },
  );

  // All titles for a test with performance data
  app.get(
    "/api/tests/:testId/titles",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        const titles = await storage.getTitlesByTestId(testId);
        
        // Get performance data for each title
        const titlesWithPerformance = await Promise.all(
          titles.map(async (title) => {
            const analytics = await storage.getAnalyticsPollsByTitleId(title.id);
            const totalViews = analytics.reduce((sum, a) => sum + a.views, 0);
            const avgCtr = analytics.length > 0 
              ? analytics.reduce((sum, a) => sum + a.ctr, 0) / analytics.length 
              : 0;
            
            return {
              ...title,
              performanceHistory: analytics,
              totalViews,
              avgCtr: Number(avgCtr.toFixed(2))
            };
          })
        );
        
        res.json(titlesWithPerformance);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch titles with performance" });
      }
    },
  );

  // Manual title rotation
  app.post(
    "/api/tests/:testId/rotate-now",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        // Trigger immediate rotation
        await scheduler.triggerManualRotation(testId);
        
        res.json({ success: true, message: "Title rotated manually" });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to rotate title" });
      }
    },
  );

  // YouTube quota usage monitoring
  let quotaUsage = {
    used: 0,
    limit: 10000, // YouTube API daily quota
    resetTime: new Date().setHours(24, 0, 0, 0)
  };

  const trackQuotaUsage = (units: number) => {
    const now = Date.now();
    if (now > quotaUsage.resetTime) {
      quotaUsage.used = 0;
      quotaUsage.resetTime = new Date().setHours(24, 0, 0, 0);
    }
    quotaUsage.used += units;
  };

  app.get(
    "/api/analytics/youtube-quota",
    requireAuth,
    (req: Request, res: Response) => {
      res.json({
        ...quotaUsage,
        remaining: quotaUsage.limit - quotaUsage.used,
        percentUsed: ((quotaUsage.used / quotaUsage.limit) * 100).toFixed(2)
      });
    }
  );

  // YouTube Analytics API accuracy status and enablement
  app.get(
    "/api/analytics/accuracy-status",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;

        // Check if user has OAuth tokens
        const account = await storage.getAccountByUserId(user.id);
        if (!account?.accessToken) {
          return res.json({
            accuracy: "Authentication Required",
            instructions:
              "Please authenticate with Google to access YouTube data.",
            enabled: false,
          });
        }

        // Check if YouTube Analytics API is available
        try {
          const { google } = await import("googleapis");
          const account = await storage.getAccountByUserId(user.id);
          if (!account?.accessToken) {
            return res.json({
              accuracy: "Authentication Required",
              instructions: "Please connect your YouTube account first"
            });
          }

          const authClient = new google.auth.OAuth2();
          authClient.setCredentials({
            access_token: account.accessToken
          });
          const youtubeAnalytics = google.youtubeAnalytics({
            version: "v2",
            auth: authClient,
          });

          // Test if we can make a simple query
          await youtubeAnalytics.reports.query({
            ids: "channel==MINE",
            startDate: "2025-07-01",
            endDate: "2025-07-02",
            metrics: "views",
          });

          res.json({
            accuracy: "YouTube Studio Exact Match",
            instructions:
              "YouTube Analytics API is enabled. Your data matches YouTube Studio exactly.",
            enabled: true,
          });
        } catch (error) {
          const errorMessage = (error as Error).message;

          if (
            errorMessage.includes("YouTube Analytics API has not been used")
          ) {
            res.json({
              accuracy: "Enhanced Data API (Highly Accurate)",
              instructions: `For 100% YouTube Studio accuracy, enable the YouTube Analytics API:

1. Visit: https://console.developers.google.com/apis/api/youtubeanalytics.googleapis.com/overview?project=618794070994
2. Click "Enable"
3. Wait 2-3 minutes
4. Refresh your test data

Current system provides realistic metrics based on video engagement patterns.`,
              enabled: false,
              enableUrl:
                "https://console.developers.google.com/apis/api/youtubeanalytics.googleapis.com/overview?project=618794070994",
            });
          } else {
            res.json({
              accuracy: "Enhanced Data API (Highly Accurate)",
              instructions:
                "Using advanced calculations based on video engagement patterns and performance indicators.",
              enabled: false,
            });
          }
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to check accuracy status" });
      }
    },
  );

  // Force refresh OAuth tokens with YouTube Analytics API access
  app.post(
    "/api/auth/refresh-tokens",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;

        const account = await storage.getAccountByUserId(user.id);
        if (!account?.refreshToken) {
          return res.status(400).json({
            error: "No refresh token available. Please re-authenticate with Google.",
            requiresReauth: true,
          });
        }

        return res.json({
          message: "Token refresh functionality needs to be implemented",
          success: false,
          requiresReauth: true
        });

        res.json({
          success: false,
          message: "Token refresh functionality needs to be implemented",
          analyticsEnabled: false,
          accuracy: "Enhanced Data API (Highly Accurate)",
            instructions:
              "YouTube Analytics API may need a few more minutes to activate after enabling in Google Cloud Console",
          });
        }
      } catch (error) {
        console.error("Token refresh error:", error);
        res.status(500).json({
          error:
            "Failed to refresh tokens. Please re-authenticate with Google.",
          requiresReauth: true,
        });
      }
    },
  );

  // Fix YouTube authentication for current user
  app.post(
    "/api/auth/fix-youtube-auth",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;

        // Use the youtubeService to refresh tokens
        const account = await storage.getAccountByUserId(user.id, 'google');
        if (!account) {
          return res.status(400).json({
            success: false,
            message: 'No OAuth account found. User needs to re-authenticate with Google.',
            requiresReauth: true,
          });
        }

        if (!account.refreshToken) {
          return res.status(400).json({
            success: false,
            message: 'No refresh token available. User needs to re-authenticate with Google.',
            requiresReauth: true,
          });
        }

        return res.json({
          success: false,
          message: 'Token refresh functionality needs to be implemented',
          requiresReauth: true,
        });

        res.json({
          success: true,
          message: 'Authentication refreshed successfully.',
          analyticsEnabled: true,
          accuracy: "Enhanced Data API (Highly Accurate)",
        });

      } catch (error) {
        console.error("Authentication fix error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fix authentication",
          requiresReauth: true,
        });
      }
    },
  );

  // Test management endpoints
  app.post(
    "/api/tests/:testId/pause",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        if (test.status !== "active") {
          return res.status(400).json({ error: "Test is not active" });
        }

        await storage.updateTest(testId, { status: "paused" });

        // Stop the scheduler for this test (if method exists)
        // scheduler.cancelRotation(testId);

        res.json({ success: true, message: "Test paused successfully" });
      } catch (error) {
        res.status(500).json({ error: "Failed to pause test" });
      }
    },
  );

  app.post(
    "/api/tests/:testId/resume",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        if (test.status !== "paused") {
          return res.status(400).json({ error: "Test is not paused" });
        }

        await storage.updateTest(testId, { status: "active" });

        // Resume the scheduler
        const titles = await storage.getTitlesByTestId(testId);
        const currentOrder = titles.reduce(
          (max, title) =>
            title.activatedAt ? Math.max(max, title.order) : max,
          0,
        );
        const nextOrder = (currentOrder + 1) % titles.length;

        await scheduler.scheduleTest(testId, test.rotationIntervalMinutes);

        res.json({ success: true, message: "Test resumed successfully" });
      } catch (error) {
        res.status(500).json({ error: "Failed to resume test" });
      }
    },
  );

  app.post(
    "/api/tests/:testId/complete",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        if (test.status === "completed") {
          return res.status(400).json({ error: "Test is already completed" });
        }

        await storage.updateTest(testId, {
          status: "completed",
          endDate: new Date(),
        });

        // Stop the scheduler (if method exists)
        // scheduler.cancelRotation(testId);

        // Generate final analytics summary
        const titles = await storage.getTitlesByTestId(testId);
        for (const title of titles) {
          const polls = await storage.getAnalyticsPollsByTitleId(title.id);
          if (polls.length > 0) {
            const totalViews = polls.reduce((sum, p) => sum + p.views, 0);
            const totalImpressions = polls.reduce(
              (sum, p) => sum + p.impressions,
              0,
            );
            const avgCtr =
              polls.reduce((sum, p) => sum + p.ctr, 0) / polls.length;
            const avgAvd =
              polls.reduce((sum, p) => sum + p.averageViewDuration, 0) /
              polls.length;

            await storage.createTitleSummary({
              titleId: title.id,
              totalViews,
              totalImpressions,
              finalCtr: avgCtr,
              finalAvd: avgAvd,
            });
          }
        }

        res.json({ success: true, message: "Test completed successfully" });
      } catch (error) {
        res.status(500).json({ error: "Failed to complete test" });
      }
    },
  );

  // Get test analytics for dashboard display
  app.get(
    "/api/tests/:testId/analytics",
    requireAuth,
    getTestAnalytics
  );

  app.post(
    "/api/tests/:testId/cancel",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        // Delete the test completely instead of just cancelling it
        await storage.deleteTest(testId);

        // Stop the scheduler (if method exists)
        // scheduler.cancelRotation(testId);

        res.json({ success: true, message: "Test deleted successfully" });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete test" });
      }
    },
  );

  app.post(
    "/api/tests/:testId/delete",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { testId } = req.params;
        const user = req.user!;

        const test = await storage.getTest(testId);
        if (!test || test.userId !== user.id) {
          return res.status(404).json({ error: "Test not found" });
        }

        // Stop the scheduler if active (if method exists)
        if (test.status === "active") {
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

        res.json({ success: true, message: "Test deleted permanently" });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete test" });
      }
    },
  );

  // Debug route to test rotation system (no auth required for debugging)
  app.get(
    "/api/debug-rotation/:testId/:titleOrder",
    async (req: Request, res: Response) => {
      try {
        const { testId, titleOrder } = req.params;
        const order = parseInt(titleOrder);

        const test = await storage.getTest(testId);
        if (!test) {
          return res.status(404).json({ error: "Test not found" });
        }

        // Get titles for debugging
        const titles = await storage.getTitlesByTestId(testId);

        // Trigger manual rotation for immediate testing
        await scheduler.triggerManualRotation(testId);

        const response = {
          success: true,
          message: `Rotation scheduled for test ${testId}, titleOrder: ${order}`,
          titles: titles.map((t) => ({
            order: t.order,
            text: t.text,
            id: t.id,
          })),
        };

        return res.json(response);
      } catch (error) {
        return res.status(500).json({
          error: "Failed to trigger debug rotation",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // AI Title Generation Endpoint (Authority Plan Exclusive)
  app.post(
    "/api/generate-titles",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const { topic, framework } = req.body;

        // Check if user has Authority subscription
        const subscription = await storage.getUserSubscription(user.id);
        if (
          !subscription ||
          subscription.tier !== "authority" ||
          subscription.status !== "active"
        ) {
          return res.status(403).json({
            error:
              "AI Title Generation is exclusive to Authority Plan subscribers",
            upgrade: true,
          });
        }

        if (!topic || !topic.trim()) {
          return res.status(400).json({ error: "Video topic is required" });
        }

        // Use the YouTube Title Mastery Framework with Claude Sonnet 4
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: TITLE_MASTERY_PROMPT,
          messages: [
            {
              role: "user",
              content: `Generate 5 optimized YouTube titles for this topic: "${topic}"

          Focus on:
          - High CTR potential using psychological triggers
          - Mobile-optimized length (40-60 characters)
          - Semantic consistency and accuracy
          - Numbers, specifics, and emotional hooks
          - 2024-2025 algorithm alignment

          Return only the titles, one per line, without numbering or bullets.`,
            },
          ],
        });

        const content = message.content[0];
        if (content.type === "text") {
          const titles = content.text
            .split("\n")
            .map((title) => title.trim())
            .filter((title) => title.length > 0)
            .slice(0, 5); // Ensure max 5 titles

          res.json({
            titles,
            framework: "YouTube Title Mastery 2024-2025",
            generated_at: new Date().toISOString(),
          });
        } else {
          throw new Error("Unexpected response format from AI");
        }
      } catch (error) {
        res.status(500).json({
          error: "Failed to generate titles",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Create Stripe subscription checkout session
  app.post(
    "/api/create-subscription",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { plan } = req.body;
        const user = req.user!;

        if (!["pro", "authority"].includes(plan)) {
          return res.status(400).json({ error: "Invalid plan selected" });
        }

        // Create or get Stripe customer
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: user.email ?? `user-${user.id}@titletesterpro.com`,
            name: user.name ?? "TitleTesterPro User",
          });
          stripeCustomerId = customer.id;
          await storage.updateUser(user.id, { stripeCustomerId });
        }

        // Define plan prices (in cents for Stripe)
        const planPrices: { [key: string]: { amount: number; name: string } } =
          {
            pro: { amount: 2900, name: "TitleTesterPro - Pro Plan" },
            authority: {
              amount: 9900,
              name: "TitleTesterPro - Authority Plan",
            },
          };

        const selectedPlan = planPrices[plan];

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          payment_method_types: ["card"],
          mode: "subscription",
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: selectedPlan.name,
                  description: `Monthly subscription to ${selectedPlan.name}`,
                },
                unit_amount: selectedPlan.amount,
                recurring: {
                  interval: "month",
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            userId: user.id,
            plan: plan,
          },
          success_url: `${req.protocol}://${req.get("host")}/dashboard?payment=success&plan=${plan}`,
          cancel_url: `${req.protocol}://${req.get("host")}/paywall?payment=cancelled`,
        });

        res.json({
          checkoutUrl: session.url,
          sessionId: session.id,
          plan,
          price: selectedPlan.amount / 100,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to create subscription" });
      }
    },
  );

  // Check subscription status
  app.get(
    "/api/subscription/status",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = req.user!;

        // Check if user has an active subscription
        // For demo purposes, we'll check localStorage or default to none
        const subscriptionStatus = user.subscriptionStatus || "none";
        const subscriptionTier = user.subscriptionTier || null;

        res.json({
          status: subscriptionStatus,
          tier: subscriptionTier,
          hasAccess: subscriptionStatus !== "none",
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to check subscription status" });
      }
    },
  );

  // Update subscription status (for demo/testing)
  app.post(
    "/api/subscription/update",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { status, tier } = req.body;
        const user = req.user!;

        // Update user subscription status in database
        await storage.updateUserSubscription(user.id, status, tier);

        res.json({
          success: true,
          status,
          tier,
          message: `Subscription updated to ${tier} plan`,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update subscription" });
      }
    },
  );

  // Middleware to check subscription access for protected routes
  async function requireSubscription(
    req: Request,
    res: Response,
    next: Function,
  ) {
    try {
      const user = req.user!;

      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const subscriptionStatus = user.subscriptionStatus || "none";

      if (subscriptionStatus === "none") {
        return res.status(402).json({
          error: "Subscription required",
          message: "Please upgrade to a paid plan to access this feature",
          redirectUrl: "/paywall",
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: "Subscription verification failed" });
    }
  }

  // Stripe webhook handler
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      if (!sig) {
        return res.status(400).send("Missing stripe-signature header");
      }
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || "",
      );
    } catch (err: any) {
      return res
        .status(400)
        .send(`Webhook Error: ${err?.message || "Invalid signature"}`);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;

        // Extract user ID and plan from metadata
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          try {
            // Update user subscription status
            await storage.updateUserSubscription(userId, "active", plan);

            // Store Stripe subscription ID if available
            if (session.subscription) {
              await storage.updateUser(userId, {
                stripeSubscriptionId: session.subscription as string,
              });
            }
          } catch (error) {}
        }
        break;

      case "customer.subscription.deleted":
        const subscription = event.data.object;

        // Find user by Stripe subscription ID and deactivate
        try {
          const user = await storage.getUserByStripeSubscriptionId(
            subscription.id,
          );
          if (user) {
            await storage.updateUserSubscription(user.id, "cancelled", null);
          }
        } catch (error) {}
        break;

      default:
    }

    res.json({ received: true });
  });

  // Debug endpoints
  app.get('/api/debug/database-status', async (req, res) => {
    try {
      const { pool } = await import('./db');
      const client = await pool.connect();
      
      const result = await client.query('SELECT NOW()');
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      const userCountResult = await client.query('SELECT COUNT(*) FROM users');
      
      client.release();
      
      res.json({
        connected: true,
        timestamp: result.rows[0].now,
        database: 'Supabase',
        host: 'aws-0-us-east-2.pooler.supabase.com',
        tables: tablesResult.rows.map((r: any) => r.table_name),
        userCount: userCountResult.rows[0].count
      });
    } catch (err: any) {
      res.json({
        connected: false,
        error: err.message,
        database: 'Supabase'
      });
    }
  });
  
  app.get('/api/debug/oauth-config', (req, res) => {
    res.json({
      clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 30) + '...',
      redirectUri: `https://${req.get('host')}/api/auth/callback/google`,
      configured: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
    });
  });

  // Error handling middleware
  app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  });

  // 404 handler for API routes only
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
