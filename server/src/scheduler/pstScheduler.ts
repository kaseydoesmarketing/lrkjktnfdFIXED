import cron from 'node-cron';
import { DateTime } from 'luxon';
import { db } from '../db/index.js';
import { tests, titles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { quotaManager } from '../services/quotaManager.js';
import { dualOAuthService } from '../auth/dualOAuth.js';

export class PSTScheduler {
  private readonly MIDNIGHT_PST_CRON = '0 8 * * *';
  private scheduledJobs = new Map<string, cron.ScheduledTask>();

  startMidnightRotations() {
    console.log('🕛 Starting midnight PST scheduler...');
    
    cron.schedule(this.MIDNIGHT_PST_CRON, async () => {
      const pstTime = DateTime.now().setZone('America/Los_Angeles');
      console.log(`🌙 Midnight PST rotation triggered at ${pstTime.toISO()}`);
      
      if (pstTime.hour === 0) {
        await this.executeScheduledRotations();
      }
    }, {
      timezone: 'UTC'
    });
  }

  async scheduleTest(testId: string, intervalHours: number = 24) {
    if (this.scheduledJobs.has(testId)) {
      this.scheduledJobs.get(testId)!.stop();
      this.scheduledJobs.delete(testId);
    }

    const cronExpression = intervalHours === 24 
      ? this.MIDNIGHT_PST_CRON 
      : `0 */${intervalHours} * * *`;

    const job = cron.schedule(cronExpression, async () => {
      await this.rotateTestTitle(testId);
    }, {
      timezone: intervalHours === 24 ? 'UTC' : 'America/Los_Angeles'
    });

    this.scheduledJobs.set(testId, job);
    console.log(`📅 Scheduled test ${testId} with ${intervalHours}h intervals`);
  }

  async stopTest(testId: string) {
    const job = this.scheduledJobs.get(testId);
    if (job) {
      job.stop();
      this.scheduledJobs.delete(testId);
      console.log(`⏹️ Stopped scheduling for test ${testId}`);
    }
  }

  private async executeScheduledRotations() {
    try {
      const activeTests = await db
        .select()
        .from(tests)
        .where(eq(tests.status, 'active'));

      console.log(`🔄 Processing ${activeTests.length} active tests for midnight rotation`);

      for (const test of activeTests) {
        await this.rotateTestTitle(test.id);
      }
    } catch (error) {
      console.error('❌ Error in midnight rotation:', error);
    }
  }

  private async rotateTestTitle(testId: string) {
    try {
      const test = await db
        .select()
        .from(tests)
        .where(eq(tests.id, testId))
        .limit(1);

      if (!test[0] || test[0].status !== 'active') {
        return;
      }

      const testData = test[0];
      
      if (!await quotaManager.checkQuotaAvailable(testData.userId, 'write')) {
        console.log(`⚠️ Quota exceeded for user ${testData.userId}, skipping rotation`);
        return;
      }

      const testTitles = await db
        .select()
        .from(titles)
        .where(eq(titles.testId, testId))
        .orderBy(titles.order);

      if (testTitles.length === 0) return;

      const currentIndex = testData.currentTitleIndex || 0;
      const nextIndex = (currentIndex + 1) % testTitles.length;
      const nextTitle = testTitles[nextIndex];

      console.log(`🔄 Rotating test ${testId} to title: "${nextTitle.text}"`);

      await quotaManager.recordUsage(testData.userId, 'title_update', 50);

      await db
        .update(tests)
        .set({ 
          currentTitleIndex: nextIndex,
          updatedAt: new Date()
        })
        .where(eq(tests.id, testId));

      console.log(`✅ Successfully rotated test ${testId}`);

    } catch (error) {
      console.error(`❌ Error rotating test ${testId}:`, error);
    }
  }

  getSchedulerStatus() {
    return {
      activeScheduledTests: this.scheduledJobs.size,
      scheduledTests: Array.from(this.scheduledJobs.keys())
    };
  }
}

export const pstScheduler = new PSTScheduler();
