import { Request, Response } from 'express';
import { db } from '../db';
import { tests, titles, analyticsPolls, testRotationLogs } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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
    const polls = await db
      .select()
      .from(analyticsPolls)
      .where(sql`${analyticsPolls.titleId} = ANY(${testTitleIds})`)
      .orderBy(desc(analyticsPolls.polledAt));

    // Get rotation logs
    const rotationLogs = await db
      .select({
        id: testRotationLogs.id,
        titleText: titles.text,
        titleOrder: titles.order,
        rotatedAt: testRotationLogs.rotatedAt,
        durationMinutes: testRotationLogs.durationMinutes,
        viewsAtRotation: testRotationLogs.viewsAtRotation,
        ctrAtRotation: testRotationLogs.ctrAtRotation,
        impressionsAtRotation: testRotationLogs.impressionsAtRotation,
      })
      .from(testRotationLogs)
      .innerJoin(titles, eq(testRotationLogs.titleId, titles.id))
      .where(eq(testRotationLogs.testId, testId))
      .orderBy(desc(testRotationLogs.rotatedAt));

    // Calculate aggregate metrics
    const totalViews = polls.reduce((sum, poll) => sum + (poll.views || 0), 0);
    const totalImpressions = polls.reduce((sum, poll) => sum + (poll.impressions || 0), 0);
    const totalClicks = polls.reduce((sum, poll) => sum + (poll.clicks || 0), 0);
    const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Per-title metrics
    const titleMetrics = test.titles.map(title => {
      const titlePolls = polls.filter(p => p.titleId === title.id);
      const views = titlePolls.reduce((sum, p) => sum + (p.views || 0), 0);
      const impressions = titlePolls.reduce((sum, p) => sum + (p.impressions || 0), 0);
      const clicks = titlePolls.reduce((sum, p) => sum + (p.clicks || 0), 0);
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const avgViewDuration = titlePolls.length > 0
        ? titlePolls.reduce((sum, p) => sum + (p.averageViewDuration || 0), 0) / titlePolls.length
        : 0;

      return {
        titleId: title.id,
        titleText: title.text,
        order: title.order,
        views,
        impressions,
        clicks,
        ctr,
        avgViewDuration,
        pollCount: titlePolls.length,
      };
    });

    // Response
    return res.json({
      test: {
        id: test.id,
        videoId: test.videoId,
        videoTitle: test.videoTitle,
        status: test.status,
        rotationInterval: test.rotationInterval,
        createdAt: test.createdAt,
        lastRotation: test.lastRotation,
        nextRotation: test.nextRotation,
      },
      aggregateMetrics: {
        totalViews,
        totalImpressions,
        totalClicks,
        overallCtr,
        pollCount: polls.length,
      },
      titleMetrics,
      rotationLogs: rotationLogs as RotationLog[],
      recentPolls: polls.slice(0, 10), // Last 10 polls
    });
  } catch (error) {
    console.error('Error fetching test analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch test analytics' });
  }
}