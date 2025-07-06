import { Request, Response } from 'express';
import { db } from '../db';
import { tests, titles, analyticsPolls, testRotationLogs } from '../../shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { youtubeService } from '../youtubeService';

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
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;

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

    // Fetch latest YouTube stats for the video (lifetime-to-date)
    let lifetimeStats = null;
    try {
      lifetimeStats = await youtubeService.getVideoAnalytics(
        userId,
        test.videoId,
        test.createdAt.toISOString().split('T')[0], // start from test creation
        new Date().toISOString().split('T')[0]      // up to now
      );
    } catch (err) {
      console.error('Failed to fetch YouTube lifetime stats:', err);
    }

    // Get all analytics polls for this test
    const testTitleIds = test.titles.map((t: any) => t.id);
    const polls = testTitleIds.length > 0 
      ? await db
          .select()
          .from(analyticsPolls)
          .where(inArray(analyticsPolls.titleId, testTitleIds))
          .orderBy(desc(analyticsPolls.polledAt))
      : [];

    // Get rotation logs (now including impressions, views, ctr at rotation)
    const rotationEvents = await db
      .select({
        id: testRotationLogs.id,
        titleId: testRotationLogs.titleId,
        rotationNumber: testRotationLogs.rotationNumber,
        rotatedAt: testRotationLogs.rotatedAt,
        impressions: testRotationLogs.impressionsAtRotation,
        views: testRotationLogs.viewsAtRotation,
        ctr: testRotationLogs.ctrAtRotation,
        // Optionally join to get the title text
      })
      .from(testRotationLogs)
      .where(eq(testRotationLogs.testId, testId))
      .orderBy(desc(testRotationLogs.rotatedAt));

    // Calculate aggregate metrics
    const totalViews = polls.reduce((sum: number, poll: any) => sum + (poll.views || 0), 0);
    const totalImpressions = polls.reduce((sum: number, poll: any) => sum + (poll.impressions || 0), 0);
    const totalClicks = polls.reduce((sum: number, poll: any) => sum + (poll.clicks || 0), 0);
    const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Per-title metrics
    const titleMetrics = test.titles.map((title: any) => {
      const titlePolls = polls.filter((p: any) => p.titleId === title.id);
      const views = titlePolls.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
      const impressions = titlePolls.reduce((sum: number, p: any) => sum + (p.impressions || 0), 0);
      const clicks = titlePolls.reduce((sum: number, p: any) => sum + (p.clicks || 0), 0);
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const avgViewDuration = titlePolls.length > 0
        ? titlePolls.reduce((sum: number, p: any) => sum + (p.averageViewDuration || 0), 0) / titlePolls.length
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
      rotationLogs: rotationEvents as RotationLog[],
      rotationEvents,
      recentPolls: polls.slice(0, 10), // Last 10 polls
      lifetimeStats,
    });
  } catch (error) {
    console.error('Error fetching test analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch test analytics' });
  }
}