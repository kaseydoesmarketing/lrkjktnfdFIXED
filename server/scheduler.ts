import { storage } from './storage';
import { youtubeService } from './youtubeService';
import cron from 'node-cron';

interface ScheduledJob {
  testId: string;
  titleOrder: number;
  type: 'rotate' | 'poll';
}

class Scheduler {
  private jobs: Map<string, NodeJS.Timeout> = new Map();

  scheduleRotation(testId: string, titleOrder: number, delayMinutes: number) {
    const jobId = `rotate-${testId}-${titleOrder}`;
    const delay = delayMinutes * 60 * 1000; // Convert to milliseconds
    
    console.log(`⏰ [SCHEDULER DEBUG] Scheduling rotation job ${jobId} with delay ${delayMinutes} minutes (${delay}ms)`);
    
    // Cancel existing job if any
    this.cancelJob(jobId);
    
    const timeout = setTimeout(async () => {
      try {
        console.log(`🚀 [SCHEDULER DEBUG] Executing scheduled job: ${jobId}`);
        console.log(`🚀 [SCHEDULER DEBUG] Active jobs before execution: ${this.jobs.size}`);
        await this.executeRotation(testId, titleOrder);
        console.log(`🗑️ [SCHEDULER DEBUG] Job ${jobId} completed and removed from queue`);
      } catch (error) {
        console.error(`❌ [SCHEDULER DEBUG] Job ${jobId} failed with error:`, error);
        console.error(`❌ [SCHEDULER DEBUG] Job ${jobId} error stack:`, error.stack);
      } finally {
        this.jobs.delete(jobId);
        console.log(`🗑️ [SCHEDULER DEBUG] Job ${jobId} cleanup complete. Remaining jobs: ${this.jobs.size}`);
      }
    }, delay);
    
    this.jobs.set(jobId, timeout);
    console.log(`📋 [SCHEDULER DEBUG] Job ${jobId} added to queue. Total active jobs: ${this.jobs.size}`);
  }

  schedulePoll(titleId: string, delayMinutes: number = 15) {
    const jobId = `poll-${titleId}`;
    const delay = delayMinutes * 60 * 1000;
    
    const timeout = setTimeout(async () => {
      await this.executePoll(titleId);
    }, delay);
    
    this.jobs.set(jobId, timeout);
  }

  cancelJob(jobId: string) {
    const timeout = this.jobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.jobs.delete(jobId);
    }
  }

  private async executeRotation(testId: string, titleOrder: number) {
    try {
      console.log(`\n🔄 [ROTATION DEBUG] ==================== ROTATION STEP ====================`);
      console.log(`🔄 [ROTATION DEBUG] Test: ${testId} | Executing titleOrder: ${titleOrder}`);
      
      const test = await storage.getTest(testId);
      if (!test || test.status !== 'active') {
        console.log(`❌ [ROTATION DEBUG] Test ${testId} not found or not active. Status: ${test?.status}`);
        console.log(`🔄 [ROTATION DEBUG] ================= ROTATION ABORTED ===================\n`);
        return;
      }
      console.log(`✅ [ROTATION DEBUG] Test found and active: ${testId} | Status: ${test.status}`);

      const titles = await storage.getTitlesByTestId(testId);
      console.log(`📋 [ROTATION DEBUG] Found ${titles.length} titles for test ${testId}:`);
      titles.forEach(title => console.log(`   - Order ${title.order}: "${title.text}" (ID: ${title.id}, Activated: ${title.activatedAt || 'never'})`));
      
      // Verify title orders are sequential and complete
      const orders = titles.map(t => t.order).sort((a, b) => a - b);
      const expectedOrders = Array.from({ length: titles.length }, (_, i) => i);
      const missingOrders = expectedOrders.filter(order => !orders.includes(order));
      const extraOrders = orders.filter(order => !expectedOrders.includes(order));
      
      if (missingOrders.length > 0) {
        console.warn(`⚠️ [ROTATION DEBUG] Missing title orders: ${missingOrders}`);
      }
      if (extraOrders.length > 0) {
        console.warn(`⚠️ [ROTATION DEBUG] Unexpected title orders: ${extraOrders}`);
      }
      if (missingOrders.length === 0 && extraOrders.length === 0) {
        console.log(`✅ [ROTATION DEBUG] Title order sequence is complete: ${orders.join(', ')}`);
      }
      
      const currentTitle = titles.find(t => t.order === titleOrder);
      
      if (!currentTitle) {
        console.log(`❌ [ROTATION DEBUG] No title found with order ${titleOrder}. Available orders:`, titles.map(t => t.order));
        console.log(`🏁 [ROTATION DEBUG] Test completed - marking as completed`);
        await storage.updateTestStatus(testId, 'completed');
        return;
      }

      console.log(`📝 [ROTATION DEBUG] Current title (order ${titleOrder}): "${currentTitle.text}" (ID: ${currentTitle.id})`);

      // Get user account for YouTube API access
      const user = await storage.getUser(test.userId);
      if (!user) return;
      
      const account = await storage.getAccountByUserId(user.id, 'google');
      if (!account?.accessToken) {
        console.error('No YouTube access token found for user');
        return;
      }

      // Actually update the YouTube video title
      try {
        console.log(`📺 [ROTATION DEBUG] Attempting YouTube API call to update video ${test.videoId}`);
        await youtubeService.updateVideoTitle(account.accessToken, test.videoId, currentTitle.text);
        console.log(`✅ [ROTATION DEBUG] Successfully updated video ${test.videoId} to title: "${currentTitle.text}"`);
        
        // Update title activation
        await storage.updateTitleActivation(currentTitle.id, new Date());
        console.log(`✅ [ROTATION DEBUG] Title activation updated for title ID: ${currentTitle.id}`);
      } catch (error) {
        console.error('❌ [ROTATION DEBUG] Error updating YouTube title:', error);
        console.error('❌ [ROTATION DEBUG] Error details:', error.message);
        // Try again in 5 minutes if the update failed
        console.log(`⏰ [ROTATION DEBUG] Rescheduling rotation for test ${testId}, titleOrder ${titleOrder} in 5 minutes`);
        this.scheduleRotation(testId, titleOrder, 5);
        return;
      }
      
      // Schedule next rotation
      const nextTitleOrder = titleOrder + 1;
      console.log(`🔢 [ROTATION DEBUG] Next title order: ${nextTitleOrder}, titles.length: ${titles.length}`);
      console.log(`🔢 [ROTATION DEBUG] Available title orders:`, titles.map(t => t.order).sort((a, b) => a - b));
      
      // Check if there's actually a title with the next order
      const nextTitle = titles.find(t => t.order === nextTitleOrder);
      if (nextTitle) {
        console.log(`✅ [ROTATION DEBUG] Found next title with order ${nextTitleOrder}: "${nextTitle.text}"`);
        console.log(`✅ [ROTATION DEBUG] Scheduling next rotation: test ${testId}, titleOrder ${nextTitleOrder}, delay ${test.rotationIntervalMinutes} minutes`);
        this.scheduleRotation(testId, nextTitleOrder, test.rotationIntervalMinutes);
      } else {
        console.log(`🏁 [ROTATION DEBUG] No more titles found after order ${titleOrder}. All titles completed for test ${testId}. Marking as completed.`);
        await storage.updateTestStatus(testId, 'completed');
      }
      
      // Schedule analytics polling for this title
      this.schedulePoll(currentTitle.id);
      
      console.log(`🔄 [ROTATION DEBUG] ================== ROTATION COMPLETE ==================\n`);
      
    } catch (error) {
      console.error('❌ [ROTATION DEBUG] Critical error executing rotation:', error);
      console.error('❌ [ROTATION DEBUG] Error stack:', error.stack);
      console.log(`🔄 [ROTATION DEBUG] ================= ROTATION FAILED ===================\n`);
    }
  }

  private async executePoll(titleId: string) {
    try {
      const title = await storage.getTitle(titleId);
      if (!title || !title.activatedAt) {
        return;
      }

      const test = await storage.getTest(title.testId);
      if (!test || test.status === 'paused') {
        // Reschedule if paused
        this.schedulePoll(titleId, 15);
        return;
      }

      // Get real YouTube analytics data
      const user = await storage.getUser(test.userId);
      if (!user) return;
      
      const account = await storage.getAccountByUserId(user.id, 'google');
      if (!account?.accessToken) return;

      try {
        // Get analytics from the time the title was activated
        const startDate = title.activatedAt.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        
        const analytics = await youtubeService.getVideoAnalytics(
          account.accessToken, 
          test.videoId, 
          startDate, 
          endDate
        );

        // Use real analytics data from YouTube Analytics API
        await storage.createAnalyticsPoll({
          titleId: title.id,
          views: analytics.views,
          impressions: analytics.impressions,
          ctr: analytics.ctr,
          averageViewDuration: analytics.averageViewDuration,
        });
      } catch (error) {
        console.error('Error fetching YouTube analytics:', error);
        // Skip this poll if analytics fail - don't create fake data
        return;
      }

      // Check if title's active period is over
      const timeSinceActivation = Date.now() - title.activatedAt.getTime();
      const rotationDuration = test.rotationIntervalMinutes * 60 * 1000;
      
      if (timeSinceActivation < rotationDuration) {
        // Continue polling
        this.schedulePoll(titleId, 15);
      }
      
    } catch (error) {
      console.error('Error executing poll:', error);
    }
  }
}

export const scheduler = new Scheduler();
