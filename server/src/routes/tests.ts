import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { tests, titles, users, accounts } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { quotaManager } from '../services/quotaManager.js';
import { pstScheduler } from '../scheduler/pstScheduler.js';

const router = Router();

router.post('/api/tests', async (req: Request, res: Response) => {
  try {
    const { videoId, videoTitle, titleVariants, rotationInterval, startDate, endDate } = req.body;
    
    if (!videoId || !titleVariants || titleVariants.length < 2) {
      return res.status(400).json({ error: 'Video ID and at least 2 title variants required' });
    }

    const userEmail = 'user@example.com';
    const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    
    if (user.length === 0) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = user[0].id;
    
    if (!await quotaManager.checkQuotaAvailable(userId, 'write')) {
      return res.status(429).json({ error: 'Daily quota exceeded' });
    }

    const testId = crypto.randomUUID();
    
    await db.insert(tests).values({
      id: testId,
      userId,
      videoId,
      videoTitle: videoTitle || `Test for ${videoId}`,
      rotationIntervalMinutes: rotationInterval || 1440,
      status: 'active',
      startDate: new Date(startDate || Date.now()),
      endDate: new Date(endDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
      currentTitleIndex: 0
    });

    for (let i = 0; i < titleVariants.length; i++) {
      await db.insert(titles).values({
        id: crypto.randomUUID(),
        testId,
        text: titleVariants[i],
        order: i,
        isActive: i === 0
      });
    }

    await pstScheduler.scheduleTest(testId, Math.floor((rotationInterval || 1440) / 60));
    
    await quotaManager.recordUsage(userId, 'create_test', 10);

    res.json({ 
      success: true, 
      testId,
      message: 'Test created and scheduled successfully'
    });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
});

router.get('/api/tests/active', async (req: Request, res: Response) => {
  try {
    const userEmail = 'user@example.com';
    const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    
    if (user.length === 0) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const activeTests = await db
      .select()
      .from(tests)
      .where(and(
        eq(tests.userId, user[0].id),
        eq(tests.status, 'active')
      ));

    const testsWithTitles = await Promise.all(
      activeTests.map(async (test) => {
        const testTitles = await db
          .select()
          .from(titles)
          .where(eq(titles.testId, test.id))
          .orderBy(titles.order);

        return {
          ...test,
          titles: testTitles,
          currentTitle: testTitles[test.currentTitleIndex] || testTitles[0]
        };
      })
    );

    res.json(testsWithTitles);
  } catch (error) {
    console.error('Get active tests error:', error);
    res.status(500).json({ error: 'Failed to get active tests' });
  }
});

router.post('/api/tests/:testId/pause', async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    
    await db.update(tests)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(tests.id, testId));
    
    await pstScheduler.stopTest(testId);
    
    res.json({ success: true, message: 'Test paused successfully' });
  } catch (error) {
    console.error('Pause test error:', error);
    res.status(500).json({ error: 'Failed to pause test' });
  }
});

router.post('/api/tests/:testId/resume', async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    
    const test = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
    if (test.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    await db.update(tests)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(tests.id, testId));
    
    await pstScheduler.scheduleTest(testId, Math.floor(test[0].rotationIntervalMinutes / 60));
    
    res.json({ success: true, message: 'Test resumed successfully' });
  } catch (error) {
    console.error('Resume test error:', error);
    res.status(500).json({ error: 'Failed to resume test' });
  }
});

router.get('/api/quota/status', async (req: Request, res: Response) => {
  try {
    const userEmail = 'user@example.com';
    const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    
    if (user.length === 0) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const quotaStatus = await quotaManager.getUserQuotaStatus(user[0].id);
    res.json(quotaStatus);
  } catch (error) {
    console.error('Get quota status error:', error);
    res.status(500).json({ error: 'Failed to get quota status' });
  }
});

export default router;
