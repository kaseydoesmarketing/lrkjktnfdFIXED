// server/routes/rotation.ts - Add these routes to your Express server

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { tests, titles, testRotationLogs, analyticsPolls } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { 
  triggerManualRotation, 
  getSchedulerStatus, 
  scheduleTest,
  pauseTest,
  resumeTest 
} from '../scheduler-fixed';

const router = Router();

// Get rotation status for a test
router.get('/api/tests/:testId/rotation-status', requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user!.id;

    // Verify test ownership
    const test = await db.query.tests.findFirst({
      where: and(
        eq(tests.id, testId),
        eq(tests.userId, userId)
      ),
      with: {
        titles: {
          orderBy: [titles.order],
        },
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get current active title
    const activeTitle = test.titles.find(t => t.isActive);
    const activatedCount = test.titles.filter(t => t.activatedAt).length;

    // Get recent rotation logs
    const recentLogs = await db.query.testRotationLogs.findMany({
      where: eq(testRotationLogs.testId, testId),
      orderBy: [desc(testRotationLogs.rotatedAt)],
      limit: 5,
    });

    // Get recent analytics
    const titleIds = test.titles.map(t => t.id);
    const recentAnalytics = await db.query.analyticsPolls.findMany({
      where: titleIds.length > 0 ? eq(analyticsPolls.titleId, titleIds[0]) : undefined,
      orderBy: [desc(analyticsPolls.polledAt)],
      limit: 1,
    });

    // Check OAuth token status
    const account = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, userId),
        eq(accounts.provider, 'google')
      ),
    });

    const hasValidTokens = !!(account?.accessToken && account?.refreshToken);

    const response = {
      testId,
      status: test.status,
      rotationInterval: test.rotationIntervalMinutes,
      totalTitles: test.titles.length,
      activatedTitles: activatedCount,
      currentTitle: activeTitle ? {
        id: activeTitle.id,
        text: activeTitle.text,
        order: activeTitle.order,
        activatedAt: activeTitle.activatedAt,
        activeDurationMinutes: activeTitle.activatedAt 
          ? Math.floor((Date.now() - new Date(activeTitle.activatedAt).getTime()) / 60000)
          : 0
      } : null,
      nextTitleOrder: activeTitle ? activeTitle.order + 1 : 0,
      isComplete: activatedCount === test.titles.length,
      recentRotations: recentLogs.map(log => ({
        titleText: log.titleText,
        rotatedAt: log.rotatedAt,
        rotationOrder: log.rotationOrder,
        minutesAgo: Math.floor((Date.now() - new Date(log.rotatedAt).getTime()) / 60000)
      })),
      latestAnalytics: recentAnalytics[0] || null,
      hasValidTokens,
      schedulerStatus: getSchedulerStatus(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error getting rotation status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger rotation
router.post('/api/tests/:testId/rotate', requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user!.id;

    // Verify test ownership
    const test = await db.query.tests.findFirst({
      where: and(
        eq(tests.id, testId),
        eq(tests.userId, userId)
      ),
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (test.status !== 'active') {
      return res.status(400).json({ error: 'Test is not active' });
    }

    console.log(`Manual rotation requested for test ${testId} by user ${userId}`);
    
    // Trigger rotation
    await triggerManualRotation(testId);

    res.json({ 
      success: true, 
      message: 'Rotation triggered successfully',
      testId 
    });
  } catch (error: any) {
    console.error('Error triggering rotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fix stuck test (reset to first title)
router.post('/api/tests/:testId/reset', requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user!.id;

    // Verify test ownership
    const test = await db.query.tests.findFirst({
      where: and(
        eq(tests.id, testId),
        eq(tests.userId, userId)
      ),
      with: {
        titles: {
          orderBy: [titles.order],
        },
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Deactivate all titles
    await db.update(titles)
      .set({ isActive: false })
      .where(eq(titles.testId, testId));
    
    // Activate first title
    const firstTitle = test.titles.find(t => t.order === 0);
    if (firstTitle) {
      await db.update(titles)
        .set({ 
          isActive: true,
          activatedAt: new Date()
        })
        .where(eq(titles.id, firstTitle.id));
      
      // Reschedule the test
      if (test.status === 'active') {
        scheduleTest(testId, test.rotationIntervalMinutes);
      }
      
      res.json({ 
        success: true, 
        message: `Test reset to first title: "${firstTitle.text}"`,
        currentTitle: firstTitle.text
      });
    } else {
      res.status(400).json({ error: 'No titles found for this test' });
    }
  } catch (error: any) {
    console.error('Error resetting test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pause/Resume test
router.put('/api/tests/:testId/status', requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    const { status } = req.body;
    const userId = req.user!.id;

    if (!['active', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify test ownership
    const test = await db.query.tests.findFirst({
      where: and(
        eq(tests.id, testId),
        eq(tests.userId, userId)
      ),
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (status === 'paused') {
      await pauseTest(testId);
    } else {
      await resumeTest(testId);
    }

    res.json({ 
      success: true, 
      message: `Test ${status === 'paused' ? 'paused' : 'resumed'} successfully`,
      status 
    });
  } catch (error: any) {
    console.error('Error updating test status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get scheduler health
router.get('/api/scheduler/health', requireAuth, async (req, res) => {
  try {
    const status = getSchedulerStatus();
    
    // Get all active tests count
    const activeTestsCount = await db.select({ count: tests.id })
      .from(tests)
      .where(eq(tests.status, 'active'));
    
    // Get recent rotation count (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRotations = await db.select({ count: testRotationLogs.id })
      .from(testRotationLogs)
      .where(gte(testRotationLogs.rotatedAt, oneHourAgo));
    
    res.json({
      healthy: true,
      activeJobs: status.activeJobs,
      activeTests: activeTestsCount[0]?.count || 0,
      recentRotations: recentRotations[0]?.count || 0,
      uptimeMinutes: Math.floor(status.uptime / 60),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error checking scheduler health:', error);
    res.status(500).json({ 
      healthy: false, 
      error: error.message 
    });
  }
});

export default router;