import { Request, Response } from 'express';
import { db } from '../lib/db';
import { tests, titles, analyticPolls } from '../lib/db/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

interface RotationLog {
  id: string;
  titleText: string;
  titleOrder: number;
  rotatedAt: Date;
  durationMinutes: number;
  viewsAtRotation: number;
  ctrAtRotation: number;
  impressionsAtRotation: number;
}

export async function getTestAnalytics(req: Request, res: Response) {
  try {
    const { testId } = req.params;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get test with titles
    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.userId, userId)),
      with: {
        titles: {
          orderBy: [titles.order],
        },
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get all analytics polls for this test
    const testTitleIds = test.titles.map(t => t.id);
    const polls = await db.query.analyticPolls.findMany({
      where: sql`${analyticPolls.titleId} IN ${testTitleIds}`,
      orderBy: [desc(analyticPolls.polledAt)],
    });

    // Calculate aggregate metrics
    const totalViews = polls.reduce((sum, poll) => sum + (poll.views || 0), 0);
    const totalImpressions = polls.reduce((sum, poll) => sum + (poll.impressions || 0), 0);
    const totalClicks = polls.reduce((sum, poll) => sum + (poll.clicks || 0), 0);
    const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    
    // Calculate average view duration
    const pollsWithAvd = polls.filter(p => p.averageViewDuration && p.averageViewDuration > 0);
    const averageAvd = pollsWithAvd.length > 0
      ? pollsWithAvd.reduce((sum, p) => sum + p.averageViewDuration!, 0) / pollsWithAvd.length
      : 0;

    // Build rotation logs from title activation history
    const rotationLogs: RotationLog[] = [];
    const activatedTitles = test.titles
      .filter(t => t.activatedAt)
      .sort((a, b) => new Date(a.activatedAt!).getTime() - new Date(b.activatedAt!).getTime());

    for (let i = 0; i < activatedTitles.length; i++) {
      const title = activatedTitles[i];
      const nextTitle = activatedTitles[i + 1];
      
      // Calculate duration this title was active
      const activatedTime = new Date(title.activatedAt!).getTime();
      const deactivatedTime = nextTitle 
        ? new Date(nextTitle.activatedAt!).getTime()
        : new Date().getTime();
      const durationMinutes = Math.floor((deactivatedTime - activatedTime) / (1000 * 60));

      // Get analytics for this title during its active period
      const titlePolls = polls.filter(p => 
        p.titleId === title.id &&
        new Date(p.polledAt).getTime() >= activatedTime &&
        new Date(p.polledAt).getTime() < deactivatedTime
      );

      const titleViews = titlePolls.reduce((sum, p) => sum + (p.views || 0), 0);
      const titleImpressions = titlePolls.reduce((sum, p) => sum + (p.impressions || 0), 0);
      const titleClicks = titlePolls.reduce((sum, p) => sum + (p.clicks || 0), 0);
      const titleCtr = titleImpressions > 0 ? (titleClicks / titleImpressions) * 100 : 0;

      rotationLogs.push({
        id: `${title.id}-${i}`,
        titleText: title.text,
        titleOrder: title.order,
        rotatedAt: title.activatedAt!,
        durationMinutes,
        viewsAtRotation: titleViews,
        ctrAtRotation: titleCtr,
        impressionsAtRotation: titleImpressions,
      });
    }

    // Find current active title
    const currentTitle = test.titles.find(t => t.isActive);
    const currentTitleIndex = currentTitle ? currentTitle.order : 0;

    // Calculate time until next rotation
    let nextRotationIn = 0;
    if (test.status === 'active' && currentTitle && currentTitle.activatedAt) {
      const activatedTime = new Date(currentTitle.activatedAt).getTime();
      const nextRotationTime = activatedTime + (test.rotationIntervalMinutes * 60 * 1000);
      const now = new Date().getTime();
      nextRotationIn = Math.max(0, Math.floor((nextRotationTime - now) / (1000 * 60)));
    }

    const analytics = {
      testId: test.id,
      totalViews,
      totalImpressions,
      averageCtr,
      averageAvd,
      rotationsCount: rotationLogs.length,
      currentTitleIndex,
      nextRotationIn,
      rotationLogs,
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching test analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

// Test action endpoints
export async function pauseTest(req: Request, res: Response) {
  try {
    const { testId } = req.params;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.userId, userId)),
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    await db.update(tests)
      .set({ 
        status: 'paused',
        updatedAt: new Date()
      })
      .where(eq(tests.id, testId));

    res.json({ success: true, message: 'Test paused' });
  } catch (error) {
    console.error('Error pausing test:', error);
    res.status(500).json({ error: 'Failed to pause test' });
  }
}

export async function resumeTest(req: Request, res: Response) {
  try {
    const { testId } = req.params;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.userId, userId)),
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    await db.update(tests)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(tests.id, testId));

    res.json({ success: true, message: 'Test resumed' });
  } catch (error) {
    console.error('Error resuming test:', error);
    res.status(500).json({ error: 'Failed to resume test' });
  }
}

export async function completeTest(req: Request, res: Response) {
  try {
    const { testId } = req.params;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.userId, userId)),
      with: {
        titles: true,
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Mark test as completed
    await db.update(tests)
      .set({ 
        status: 'completed',
        endDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tests.id, testId));

    // Deactivate all titles
    await db.update(titles)
      .set({ isActive: false })
      .where(sql`${titles.testId} = ${testId}`);

    res.json({ success: true, message: 'Test completed' });
  } catch (error) {
    console.error('Error completing test:', error);
    res.status(500).json({ error: 'Failed to complete test' });
  }
}

export async function deleteTest(req: Request, res: Response) {
  try {
    const { testId } = req.params;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.userId, userId)),
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Delete all related data (cascading delete should handle this if foreign keys are set up)
    await db.delete(tests).where(eq(tests.id, testId));

    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
}

// Dashboard stats endpoint
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's tests
    const userTests = await db.query.tests.findMany({
      where: eq(tests.userId, userId),
      with: {
        titles: true,
      },
    });

    const activeTests = userTests.filter(t => t.status === 'active').length;
    const completedTests = userTests.filter(t => t.status === 'completed').length;

    // Get all analytics for user's tests
    const allTitleIds = userTests.flatMap(t => t.titles.map(title => title.id));
    const allPolls = await db.query.analyticPolls.findMany({
      where: sql`${analyticPolls.titleId} IN ${allTitleIds}`,
    });

    const totalViews = allPolls.reduce((sum, p) => sum + (p.views || 0), 0);

    // Calculate average CTR improvement (mock data for now)
    const averageCtrImprovement = 23.5; // This would be calculated from real data

    res.json({
      activeTests,
      completedTests,
      totalViews,
      averageCtrImprovement,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}