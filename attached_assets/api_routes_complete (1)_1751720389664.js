// ========================================
// COMPLETE API ROUTES FOR TITLETESTERPRO
// ========================================

import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import { storage } from './storage-service-complete.js';
import { createStripeRoutes } from './stripe-payment-integration.js';
import { youtubeService, abTestEngine, createEnhancedRoutes } from './youtube-api-backend-system.js';

const app = express();

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'https://your-replit-url.repl.co'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.replace('Bearer ', '') || req.headers['x-session-token'];
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token provided' });
    }

    const session = await storage.getSession(sessionToken);
    if (!session || session.expires < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.sessionToken = sessionToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// ========================================
// OAUTH & AUTHENTICATION ROUTES
// ========================================

// OAuth initiation
app.get('/api/auth/youtube', (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI
  );

  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.force-ssl'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  res.json({ authUrl });
});

// OAuth callback
app.get('/api/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.OAUTH_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from YouTube
    const youtube = google.youtube('v3');
    const channelResponse = await youtube.channels.list({
      auth: oauth2Client,
      part: 'snippet,statistics',
      mine: true
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return res.status(400).json({ error: 'No YouTube channel found' });
    }

    const channel = channelResponse.data.items[0];
    
    // Create or update user
    const existingUser = await storage.getUserByEmail(channel.snippet.title + '@youtube.local');
    
    let user;
    if (existingUser) {
      user = await storage.updateUser(existingUser.id, {
        youtubeChannelId: channel.id,
        youtubeChannelTitle: channel.snippet.title,
        image: channel.snippet.thumbnails?.default?.url
      });
      
      await storage.updateUserTokens(user.id, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date
      });
    } else {
      user = await storage.createUser({
        email: channel.snippet.title + '@youtube.local',
        name: channel.snippet.title,
        image: channel.snippet.thumbnails?.default?.url,
        youtubeId: channel.id,
        youtubeChannelTitle: channel.snippet.title
      });
      
      await storage.updateUserTokens(user.id, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date
      });
    }

    // Create session
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await storage.createSession({
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // Redirect with session token
    const redirectUrl = process.env.NODE_ENV === 'production' 
      ? `https://your-domain.com/dashboard?sessionToken=${sessionToken}`
      : `http://localhost:3000/dashboard?sessionToken=${sessionToken}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'OAuth authentication failed' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateUser, (req, res) => {
  const { accessToken, refreshToken, ...safeUser } = req.user;
  res.json(safeUser);
});

// Logout
app.post('/api/auth/logout', authenticateUser, async (req, res) => {
  try {
    await storage.deleteSession(req.sessionToken);
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ========================================
// DASHBOARD STATS ROUTES
// ========================================

app.get('/api/dashboard/stats', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get dashboard stats from storage
    const stats = await storage.getDashboardStats(userId);
    
    // Add trending data (mock for now, replace with real calculations)
    const trendingStats = {
      activeTests: Math.floor(Math.random() * 20) + 5,
      totalViews: Math.floor(Math.random() * 5000) + 1000,
      avgCtr: (Math.random() * 2).toFixed(1),
      completedTests: Math.floor(Math.random() * 5) + 1
    };

    res.json({
      ...stats,
      trending: trendingStats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ========================================
// VIDEO ROUTES
// ========================================

app.get('/api/videos/recent', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get videos from YouTube API
    const allVideos = await youtubeService.getAllChannelVideos(userId, 200);
    
    // Store/update videos in database
    for (const video of allVideos) {
      await storage.upsertYouTubeVideo(userId, video);
    }
    
    // Return paginated results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVideos = allVideos.slice(startIndex, endIndex);
    
    res.json({
      videos: paginatedVideos,
      totalCount: allVideos.length,
      hasMore: endIndex < allVideos.length,
      currentPage: page,
      totalPages: Math.ceil(allVideos.length / limit)
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

app.get('/api/videos/:videoId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;
    
    const video = await storage.getYouTubeVideo(userId, videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// ========================================
// A/B TESTING ROUTES
// ========================================

app.get('/api/tests', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const tests = await storage.getTestsByUserId(userId);
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

app.post('/api/tests', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const testData = {
      ...req.body,
      userId
    };
    
    const test = await abTestEngine.createTest(userId, testData);
    res.json(test);
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
});

app.get('/api/tests/:testId', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    const status = await abTestEngine.getTestStatus(testId);
    res.json(status);
  } catch (error) {
    console.error('Error fetching test status:', error);
    res.status(500).json({ error: 'Failed to fetch test status' });
  }
});

app.post('/api/tests/:testId/pause', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    await abTestEngine.pauseTest(testId);
    res.json({ success: true, message: 'Test paused' });
  } catch (error) {
    console.error('Error pausing test:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tests/:testId/resume', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    await abTestEngine.resumeTest(testId);
    res.json({ success: true, message: 'Test resumed' });
  } catch (error) {
    console.error('Error resuming test:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tests/:testId/end', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    const result = await abTestEngine.endTest(testId);
    res.json(result);
  } catch (error) {
    console.error('Error ending test:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// TITLE GENERATION ROUTES (Claude Integration)
// ========================================

app.post('/api/titles/generate', authenticateUser, async (req, res) => {
  try {
    const { videoTitle, niche, style } = req.body;
    
    // This would integrate with Claude API
    const prompt = `Generate 5 optimized YouTube title variants for a video titled "${videoTitle}" in the ${niche} niche. Style: ${style}. Focus on CTR optimization.`;
    
    // Mock response for now - replace with actual Claude API call
    const suggestions = [
      `${videoTitle} (SHOCKING Truth)`,
      `Why ${videoTitle} Changes Everything`,
      `The ${videoTitle} Secret Nobody Talks About`,
      `${videoTitle}: What They Don't Want You to Know`,
      `I Can't Believe This About ${videoTitle}`
    ];
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Error generating titles:', error);
    res.status(500).json({ error: 'Failed to generate titles' });
  }
});

// ========================================
// TITLE TESTING LOG ROUTES
// ========================================

// Get title rotation history/logs for a test
app.get('/api/tests/:testId/rotation-history', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    const history = await storage.getTitleRotationHistory(testId);
    res.json(history);
  } catch (error) {
    console.error('Error fetching rotation history:', error);
    res.status(500).json({ error: 'Failed to fetch rotation history' });
  }
});

// Get performance logs for a specific title
app.get('/api/titles/:titleId/performance', authenticateUser, async (req, res) => {
  try {
    const { titleId } = req.params;
    const performance = await storage.getTitlePerformance(titleId);
    res.json(performance);
  } catch (error) {
    console.error('Error fetching title performance:', error);
    res.status(500).json({ error: 'Failed to fetch title performance' });
  }
});

// Get all titles for a test with their performance data
app.get('/api/tests/:testId/titles', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    const titles = await storage.getTitlesByTestId(testId);
    
    // Get performance data for each title
    const titlesWithPerformance = await Promise.all(
      titles.map(async (title) => {
        const performance = await storage.getTitlePerformance(title.id);
        return {
          ...title,
          performanceHistory: performance,
          totalViews: performance.reduce((sum, p) => sum + (p.views || 0), 0),
          avgCtr: performance.length > 0 
            ? performance.reduce((sum, p) => sum + (p.ctr || 0), 0) / performance.length 
            : 0
        };
      })
    );
    
    res.json(titlesWithPerformance);
  } catch (error) {
    console.error('Error fetching titles with performance:', error);
    res.status(500).json({ error: 'Failed to fetch titles with performance' });
  }
});

// Get real-time rotation status
app.get('/api/tests/:testId/current-rotation', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await storage.getTest(testId);
    const titles = await storage.getTitlesByTestId(testId);
    const activeTitle = titles.find(t => t.isActive);
    
    let timeRemaining = 0;
    let rotationNumber = 0;
    
    if (activeTitle && activeTitle.activatedAt && test.rotationIntervalMinutes) {
      const timeSinceActivation = Date.now() - new Date(activeTitle.activatedAt).getTime();
      const rotationIntervalMs = test.rotationIntervalMinutes * 60 * 1000;
      timeRemaining = Math.max(0, rotationIntervalMs - timeSinceActivation);
      
      // Get rotation count
      const history = await storage.getTitleRotationHistory(testId);
      rotationNumber = history.length;
    }
    
    res.json({
      testId,
      currentTitle: activeTitle,
      timeUntilNextRotation: Math.ceil(timeRemaining / (60 * 1000)), // minutes
      rotationNumber,
      totalTitles: titles.length,
      testStatus: test.status
    });
  } catch (error) {
    console.error('Error fetching current rotation:', error);
    res.status(500).json({ error: 'Failed to fetch current rotation' });
  }
});

// Manual title rotation (for testing/debugging)
app.post('/api/tests/:testId/rotate-now', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    await abTestEngine.rotateToNextTitle(testId);
    res.json({ success: true, message: 'Title rotated manually' });
  } catch (error) {
    console.error('Error rotating title:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed test logs (comprehensive view)
app.get('/api/tests/:testId/logs', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    
    // Get test details
    const test = await storage.getTest(testId);
    const titles = await storage.getTitlesByTestId(testId);
    const rotationHistory = await storage.getTitleRotationHistory(testId);
    
    // Get performance data for each rotation
    const detailedLogs = await Promise.all(
      rotationHistory.map(async (rotation) => {
        const title = titles.find(t => t.id === rotation.titleId);
        const performance = await storage.getTitlePerformance(rotation.titleId);
        
        // Find performance data for this specific rotation period
        const rotationPerformance = performance.find(p => 
          new Date(p.rotationStart).getTime() === new Date(rotation.startedAt).getTime()
        );
        
        return {
          rotationId: rotation.id,
          rotationNumber: rotation.rotationNumber,
          title: title?.text || 'Unknown Title',
          startedAt: rotation.startedAt,
          endedAt: rotation.endedAt,
          durationMinutes: rotation.durationMinutes,
          youtubeUpdateSuccessful: rotation.youtubeUpdateSuccessful,
          youtubeUpdateError: rotation.youtubeUpdateError,
          performance: rotationPerformance || {
            views: 0,
            impressions: 0,
            ctr: 0,
            averageViewDuration: 0
          }
        };
      })
    );
    
    res.json({
      test,
      titles,
      rotationHistory: detailedLogs,
      summary: {
        totalRotations: rotationHistory.length,
        successfulUpdates: rotationHistory.filter(r => r.youtubeUpdateSuccessful).length,
        failedUpdates: rotationHistory.filter(r => !r.youtubeUpdateSuccessful).length,
        totalTestDuration: test.startDate ? 
          Math.floor((new Date() - new Date(test.startDate)) / (1000 * 60)) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching test logs:', error);
    res.status(500).json({ error: 'Failed to fetch test logs' });
  }
});

// ========================================
// ANALYTICS ROUTES
// ========================================

app.get('/api/analytics/youtube-quota', authenticateUser, (req, res) => {
  try {
    const quotaUsage = youtubeService.getQuotaUsage();
    res.json(quotaUsage);
  } catch (error) {
    console.error('Error getting quota usage:', error);
    res.status(500).json({ error: 'Failed to get quota usage' });
  }
});

app.post('/api/analytics/collect/:testId', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    await abTestEngine.collectCurrentAnalytics(testId);
    res.json({ success: true, message: 'Analytics collected' });
  } catch (error) {
    console.error('Error collecting analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// USER MANAGEMENT ROUTES
// ========================================

app.get('/api/user/profile', authenticateUser, (req, res) => {
  const { accessToken, refreshToken, ...safeUser } = req.user;
  res.json(safeUser);
});

app.put('/api/user/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    
    const updatedUser = await storage.updateUser(userId, updates);
    const { accessToken, refreshToken, ...safeUser } = updatedUser;
    
    res.json(safeUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ========================================
// HEALTH CHECK & SYSTEM ROUTES
// ========================================

app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await storage.healthCheck();
    const systemStats = await storage.getSystemStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      system: systemStats,
      youtube: youtubeService.getQuotaUsage()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.get('/api/stats/system', authenticateUser, async (req, res) => {
  try {
    const stats = await storage.getSystemStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ error: 'Failed to fetch system stats' });
  }
});

// ========================================
// STRIPE INTEGRATION
// ========================================

// Create Stripe routes
createStripeRoutes(app);

// ========================================
// ENHANCED ROUTES (from YouTube service)
// ========================================

// Add enhanced routes for additional functionality
createEnhancedRoutes(app, youtubeService, abTestEngine, storage);

// ========================================
// ERROR HANDLING
// ========================================

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ========================================
// SERVER STARTUP
// ========================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 TitleTesterPro API server running on port ${PORT}`);
  console.log(`📊 Dashboard available at: http://localhost:${PORT}/api/health`);
  console.log(`🔐 OAuth flow: http://localhost:${PORT}/api/auth/youtube`);
  
  // Initialize services
  if (process.env.NODE_ENV !== 'test') {
    console.log('🔧 Initializing services...');
    youtubeService.resetQuotaCounter();
    console.log('✅ All services initialized');
  }
});

export default app;