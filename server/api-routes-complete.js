// ========================================
// COMPLETE API ROUTES FOR TITLETESTERPRO
// ========================================

import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import { storage } from './storage.js';
import { youtubeService } from './youtubeService.js';
import { scheduler } from './scheduler.js';

const app = express();

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://titletesterpro.com'] 
    : ['http://localhost:3000', process.env.REPLIT_DOMAIN ? `https://${process.env.REPLIT_DOMAIN}` : 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

const authenticateUser = async (req, res, next) => {
  try {
    const sessionToken = req.cookies['session-token'];
    
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
// HEALTH CHECK
// ========================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ========================================
// YOUTUBE QUOTA MONITORING
// ========================================

let quotaUsage = {
  used: 0,
  limit: 10000, // YouTube API daily quota
  resetTime: new Date().setHours(24, 0, 0, 0)
};

const trackQuotaUsage = (units) => {
  const now = Date.now();
  if (now > quotaUsage.resetTime) {
    quotaUsage.used = 0;
    quotaUsage.resetTime = new Date().setHours(24, 0, 0, 0);
  }
  quotaUsage.used += units;
};

app.get('/api/analytics/youtube-quota', authenticateUser, (req, res) => {
  res.json({
    ...quotaUsage,
    remaining: quotaUsage.limit - quotaUsage.used,
    percentUsed: ((quotaUsage.used / quotaUsage.limit) * 100).toFixed(2)
  });
});

// ========================================
// ENHANCED A/B TESTING ROUTES
// ========================================

// Start or schedule a test
app.post('/api/tests/:testId/start', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    const { startNow = false } = req.body;
    
    const test = await storage.getTest(testId);
    if (!test || test.userId !== req.user.id) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    if (startNow) {
      // Start immediately
      await scheduler.startTest(testId);
      trackQuotaUsage(50); // YouTube title update
    } else {
      // Schedule for later
      await scheduler.scheduleTest(testId, new Date(test.startDate));
    }
    
    await storage.updateTestStatus(testId, 'active');
    res.json({ success: true, message: 'Test started successfully' });
  } catch (error) {
    console.error('Error starting test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual title rotation
app.post('/api/tests/:testId/rotate-now', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    
    const test = await storage.getTest(testId);
    if (!test || test.userId !== req.user.id) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    await scheduler.rotateTitle(testId);
    trackQuotaUsage(50); // YouTube title update
    
    res.json({ success: true, message: 'Title rotated successfully' });
  } catch (error) {
    console.error('Error rotating title:', error);
    res.status(500).json({ error: error.message });
  }
});

// Force analytics collection
app.post('/api/analytics/collect/:testId', authenticateUser, async (req, res) => {
  try {
    const { testId } = req.params;
    
    const test = await storage.getTest(testId);
    if (!test || test.userId !== req.user.id) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    const analytics = await youtubeService.getVideoAnalytics(
      req.user.id,
      test.videoId,
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );
    
    trackQuotaUsage(100); // Analytics API call
    
    // Store analytics data
    const titles = await storage.getTitlesByTestId(testId);
    const activeTitle = titles.find(t => t.activatedAt && !titles.some(other => 
      other.activatedAt && other.activatedAt > t.activatedAt
    ));
    
    if (activeTitle) {
      await storage.createAnalyticsPoll({
        titleId: activeTitle.id,
        views: analytics.views,
        impressions: analytics.impressions,
        ctr: analytics.ctr,
        averageViewDuration: analytics.averageViewDuration
      });
    }
    
    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Error collecting analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// EXPORT COMPLETE APP
// ========================================

export default app;