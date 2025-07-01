import type { Express } from "express";
import { storage } from "./storage";
import { anthropicService } from "./anthropicService";
import { eq, desc, count, avg, sum, sql } from "drizzle-orm";
import { db } from "./db";
import { users, tests, titles, analyticsPolls, accounts } from "@shared/schema";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  subscriptionTier: 'pro' | 'authority' | 'none';
  subscriptionStatus: 'active' | 'cancelled' | 'expired';
  createdAt: string;
  lastActive: string;
  testsCount: number;
  totalApiCalls: number;
  flagged: boolean;
  suspiciousActivity: string[];
}

interface AdminTest {
  id: string;
  userId: string;
  userEmail: string;
  videoId: string;
  videoTitle: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  titlesCount: number;
  rotationIntervalMinutes: number;
  totalRotations: number;
  apiCallsCount: number;
  createdAt: string;
  lastRotation: string;
  avgCtr: number;
  totalViews: number;
  flagged: boolean;
  suspiciousActivity: string[];
}

interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTests: number;
  activeTests: number;
  totalApiCalls: number;
  dailyApiCalls: number;
  avgTestsPerUser: number;
  platformHealth: 'excellent' | 'good' | 'warning' | 'critical';
  flaggedUsers: number;
  flaggedTests: number;
}

interface ApiQuotaStatus {
  current: number;
  limit: number;
  percentage: number;
  resetTime: string;
  projectsUsed: number;
  totalProjects: number;
}

// Admin authentication middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user;
    // Check if user is admin (you can define admin users by email or a role field)
    const adminEmails = [
      'KaseyDoesMarketing@gmail.com',
      'admin@titletesterpro.com'
    ];

    if (!adminEmails.includes(user.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
};

export function registerAdminRoutes(app: Express) {
  // Get platform metrics
  app.get('/api/admin/metrics', requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get basic counts
      const [totalUsersResult] = await db.select({ count: count() }).from(users);
      const [totalTestsResult] = await db.select({ count: count() }).from(tests);
      const [activeTestsResult] = await db.select({ count: count() })
        .from(tests)
        .where(eq(tests.status, 'active'));

      // Get active users (last 24 hours)
      const [activeUsersResult] = await db.select({ count: count() })
        .from(users)
        .where(sql`${users.updatedAt} > ${yesterday}`);

      // Get API call statistics
      const [apiCallsResult] = await db.select({ 
        total: count(),
        daily: count(sql`CASE WHEN ${analyticsPolls.createdAt} > ${yesterday} THEN 1 END`)
      }).from(analyticsPolls);

      // Get average tests per user
      const avgTestsResult = await db.select({
        userId: tests.userId,
        testCount: count()
      })
      .from(tests)
      .groupBy(tests.userId);

      const avgTestsPerUser = avgTestsResult.length > 0 
        ? avgTestsResult.reduce((sum, user) => sum + user.testCount, 0) / avgTestsResult.length 
        : 0;

      // Determine platform health using Claude AI analysis
      const healthMetrics = {
        totalUsers: totalUsersResult.count,
        activeUsers: activeUsersResult.count,
        totalTests: totalTestsResult.count,
        activeTests: activeTestsResult.count,
        apiCalls: apiCallsResult.total,
        dailyApiCalls: apiCallsResult.daily,
        avgTestsPerUser
      };

      const healthAnalysis = await anthropicService.analyzePlatformHealth(healthMetrics);

      const metrics: PlatformMetrics = {
        totalUsers: totalUsersResult.count,
        activeUsers: activeUsersResult.count,
        totalTests: totalTestsResult.count,
        activeTests: activeTestsResult.count,
        totalApiCalls: apiCallsResult.total,
        dailyApiCalls: apiCallsResult.daily,
        avgTestsPerUser: Number(avgTestsPerUser.toFixed(1)),
        platformHealth: healthAnalysis.health,
        flaggedUsers: 0, // Will be calculated based on flagging logic
        flaggedTests: 0
      };

      res.json(metrics);
    } catch (error: any) {
      console.error('Error getting admin metrics:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  // Get all users with admin details
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const usersData = await db.select({
        id: users.id,
        email: users.email,
        name: users.username,
        subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      }).from(users)
      .orderBy(desc(users.createdAt));

      // Get test counts and API usage for each user
      const adminUsers: AdminUser[] = await Promise.all(
        usersData.map(async (user) => {
          const [testCount] = await db.select({ count: count() })
            .from(tests)
            .where(eq(tests.userId, user.id));

          const [apiCount] = await db.select({ count: count() })
            .from(analyticsPolls)
            .innerJoin(titles, eq(analyticsPolls.titleId, titles.id))
            .innerJoin(tests, eq(titles.testId, tests.id))
            .where(eq(tests.userId, user.id));

          // Use Claude AI to detect suspicious activity
          const userActivity = {
            testsCount: testCount.count,
            apiCalls: apiCount.count,
            accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            subscriptionTier: user.subscriptionTier || 'none',
            subscriptionStatus: user.subscriptionStatus || 'none'
          };

          const suspiciousAnalysis = await anthropicService.detectSuspiciousUserActivity(userActivity);

          return {
            id: user.id,
            email: user.email,
            name: user.name || 'Unknown',
            subscriptionTier: (user.subscriptionTier as any) || 'none',
            subscriptionStatus: (user.subscriptionStatus as any) || 'none',
            createdAt: user.createdAt.toISOString(),
            lastActive: user.updatedAt.toISOString(),
            testsCount: testCount.count,
            totalApiCalls: apiCount.count,
            flagged: suspiciousAnalysis.flagged,
            suspiciousActivity: suspiciousAnalysis.reasons
          };
        })
      );

      res.json(adminUsers);
    } catch (error: any) {
      console.error('Error getting admin users:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // Get all tests with admin details
  app.get('/api/admin/tests', requireAdmin, async (req, res) => {
    try {
      const testsData = await db.select({
        id: tests.id,
        userId: tests.userId,
        videoId: tests.videoId,
        videoTitle: tests.videoTitle,
        status: tests.status,
        rotationIntervalMinutes: tests.rotationIntervalMinutes,
        winnerMetric: tests.winnerMetric,
        createdAt: tests.createdAt,
        updatedAt: tests.updatedAt,
        userEmail: users.email
      })
      .from(tests)
      .innerJoin(users, eq(tests.userId, users.id))
      .orderBy(desc(tests.createdAt));

      const adminTests: AdminTest[] = await Promise.all(
        testsData.map(async (test) => {
          // Get title count
          const [titleCount] = await db.select({ count: count() })
            .from(titles)
            .where(eq(titles.testId, test.id));

          // Get analytics data
          const analyticsData = await db.select({
            views: sum(analyticsPolls.views),
            impressions: sum(analyticsPolls.impressions),
            ctr: avg(analyticsPolls.ctr)
          })
          .from(analyticsPolls)
          .innerJoin(titles, eq(analyticsPolls.titleId, titles.id))
          .where(eq(titles.testId, test.id));

          const analytics = analyticsData[0];
          const totalViews = Number(analytics.views) || 0;
          const avgCtr = Number(analytics.ctr) || 0;

          // Get rotation count (API calls)
          const [rotationCount] = await db.select({ count: count() })
            .from(analyticsPolls)
            .innerJoin(titles, eq(analyticsPolls.titleId, titles.id))
            .where(eq(titles.testId, test.id));

          // Use Claude AI to detect suspicious test activity
          const testActivity = {
            rotationInterval: test.rotationIntervalMinutes,
            titlesCount: titleCount.count,
            totalRotations: rotationCount.count,
            avgCtr,
            totalViews,
            testAge: Math.floor((Date.now() - new Date(test.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            status: test.status
          };

          const suspiciousAnalysis = await anthropicService.detectSuspiciousTestActivity(testActivity);

          return {
            id: test.id,
            userId: test.userId,
            userEmail: test.userEmail,
            videoId: test.videoId,
            videoTitle: test.videoTitle,
            status: test.status as any,
            titlesCount: titleCount.count,
            rotationIntervalMinutes: test.rotationIntervalMinutes,
            totalRotations: rotationCount.count,
            apiCallsCount: rotationCount.count,
            createdAt: test.createdAt.toISOString(),
            lastRotation: test.updatedAt.toISOString(),
            avgCtr,
            totalViews,
            flagged: suspiciousAnalysis.flagged,
            suspiciousActivity: suspiciousAnalysis.reasons
          };
        })
      );

      res.json(adminTests);
    } catch (error: any) {
      console.error('Error getting admin tests:', error);
      res.status(500).json({ error: 'Failed to get tests' });
    }
  });

  // Get YouTube API quota status
  app.get('/api/admin/quota-status', requireAdmin, async (req, res) => {
    try {
      // Get API usage from last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [apiUsage] = await db.select({ count: count() })
        .from(analyticsPolls)
        .where(sql`${analyticsPolls.createdAt} > ${yesterday}`);

      // Estimate quota usage (each poll = ~2-3 quota units)
      const estimatedQuotaUsed = apiUsage.count * 2.5;
      const quotaLimit = 10000; // Default quota
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0); // Reset at midnight Pacific Time

      const quotaStatus: ApiQuotaStatus = {
        current: Math.round(estimatedQuotaUsed),
        limit: quotaLimit,
        percentage: (estimatedQuotaUsed / quotaLimit) * 100,
        resetTime: resetTime.toISOString(),
        projectsUsed: 1, // Single project for now
        totalProjects: 1
      };

      res.json(quotaStatus);
    } catch (error: any) {
      console.error('Error getting quota status:', error);
      res.status(500).json({ error: 'Failed to get quota status' });
    }
  });

  // Flag/unflag user
  app.post('/api/admin/users/:userId/:action', requireAdmin, async (req, res) => {
    try {
      const { userId, action } = req.params;
      
      if (!['flag', 'unflag', 'suspend', 'unsuspend'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      // For now, we'll just log the admin action
      // In a real system, you'd update a user flags table
      console.log(`Admin action: ${action} user ${userId} by ${req.user.email}`);

      res.json({ success: true, action, userId });
    } catch (error: any) {
      console.error('Error with user action:', error);
      res.status(500).json({ error: 'Failed to perform action' });
    }
  });

  // Flag/unflag test
  app.post('/api/admin/tests/:testId/:action', requireAdmin, async (req, res) => {
    try {
      const { testId, action } = req.params;
      
      if (!['flag', 'unflag', 'pause', 'cancel'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      if (action === 'pause' || action === 'cancel') {
        await storage.updateTestStatus(testId, action === 'pause' ? 'paused' : 'cancelled');
      }

      console.log(`Admin action: ${action} test ${testId} by ${req.user.email}`);

      res.json({ success: true, action, testId });
    } catch (error: any) {
      console.error('Error with test action:', error);
      res.status(500).json({ error: 'Failed to perform action' });
    }
  });

  // Export data endpoints
  app.get('/api/admin/export/:type', requireAdmin, async (req, res) => {
    try {
      const { type } = req.params;
      
      if (!['users', 'tests', 'metrics'].includes(type)) {
        return res.status(400).json({ error: 'Invalid export type' });
      }

      let csvData = '';
      const timestamp = new Date().toISOString().split('T')[0];

      if (type === 'users') {
        const usersData = await db.select().from(users);
        csvData = 'ID,Email,Name,Created,Subscription Tier,Status\n';
        usersData.forEach(user => {
          csvData += `${user.id},"${user.email}","${user.username || ''}",${user.createdAt.toISOString()},"${user.subscriptionTier || 'none'}","${user.subscriptionStatus || 'none'}"\n`;
        });
      } else if (type === 'tests') {
        const testsData = await db.select().from(tests);
        csvData = 'ID,User ID,Video ID,Title,Status,Created,Rotation Interval\n';
        testsData.forEach(test => {
          csvData += `${test.id},${test.userId},"${test.videoId}","${test.videoTitle}",${test.status},${test.createdAt.toISOString()},${test.rotationIntervalMinutes}\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="titletesterpro-${type}-${timestamp}.csv"`);
      res.send(csvData);
    } catch (error: any) {
      console.error('Error exporting data:', error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  });
}