// server/services/titleRotationService.ts
import { db } from '../db';
import { titles, testRotationLogs, tests, analyticsPolls } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class TitleRotationService {
  async rotateTitle(testId: string, newTitleId: string) {
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      try {
        // 1. Get current active title
        const currentTitle = await tx
          .select()
          .from(titles)
          .where(and(
            eq(titles.testId, testId),
            eq(titles.isActive, true)
          ))
          .limit(1);

        // 2. Deactivate current title
        if (currentTitle.length > 0) {
          await tx
            .update(titles)
            .set({ isActive: false })
            .where(eq(titles.id, currentTitle[0].id));
        }

        // 3. Activate new title
        const [newTitle] = await tx
          .update(titles)
          .set({ 
            isActive: true,
            activatedAt: new Date()
          })
          .where(eq(titles.id, newTitleId))
          .returning();

        if (!newTitle) {
          throw new Error('Failed to activate new title');
        }

        // 4. Get current analytics for logging
        const currentAnalytics = await tx
          .select()
          .from(analyticsPolls)
          .where(eq(analyticsPolls.titleId, currentTitle[0]?.id))
          .orderBy(analyticsPolls.polledAt, 'desc')
          .limit(1);

        // 5. Log the rotation
        await tx.insert(testRotationLogs).values({
          id: crypto.randomUUID(),
          testId,
          titleId: newTitleId,
          titleText: newTitle.text,
          rotatedAt: new Date(),
          rotationOrder: newTitle.order,
          viewsAtRotation: currentAnalytics[0]?.views || 0,
          ctrAtRotation: currentAnalytics[0]?.ctr || 0
        });

        // 6. Update test's last rotation time
        await tx
          .update(tests)
          .set({ 
            lastRotationAt: new Date(),
            currentTitleIndex: newTitle.order
          })
          .where(eq(tests.id, testId));

        console.log(`✅ Title rotated successfully for test ${testId}`);
        return { success: true, newTitle };

      } catch (error) {
        // Transaction will automatically rollback on error
        console.error('❌ Title rotation transaction failed:', error);
        throw error;
      }
    });
  }

  async collectAnalyticsWithTransaction(titleId: string, analyticsData: any) {
    return await db.transaction(async (tx) => {
      try {
        // 1. Insert analytics poll record
        const [poll] = await tx.insert(analyticsPolls).values({
          id: crypto.randomUUID(),
          titleId,
          polledAt: new Date(),
          views: analyticsData.views || 0,
          impressions: analyticsData.impressions || 0,
          ctr: analyticsData.ctr || 0,
          averageViewDuration: analyticsData.averageViewDuration || 0
        }).returning();

        // 2. Update title's latest metrics
        await tx
          .update(titles)
          .set({
            lastViews: analyticsData.views || 0,
            lastImpressions: analyticsData.impressions || 0,
            lastCtr: analyticsData.ctr || 0,
            lastAvd: analyticsData.averageViewDuration || 0,
            updatedAt: new Date()
          })
          .where(eq(titles.id, titleId));

        // 3. Check if test should be completed
        const [title] = await tx
          .select()
          .from(titles)
          .where(eq(titles.id, titleId))
          .limit(1);

        const [test] = await tx
          .select()
          .from(tests)
          .where(eq(tests.id, title.testId))
          .limit(1);

        // Auto-complete test if end date reached
        if (test && new Date() >= new Date(test.endDate)) {
          await tx
            .update(tests)
            .set({ 
              status: 'completed',
              completedAt: new Date()
            })
            .where(eq(tests.id, test.id));

          console.log(`✅ Test ${test.id} auto-completed`);
        }

        return { success: true, poll };

      } catch (error) {
        console.error('❌ Analytics collection transaction failed:', error);
        throw error;
      }
    });
  }
}

export const titleRotationService = new TitleRotationService();