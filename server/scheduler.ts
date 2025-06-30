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
    
    console.log(`Scheduling rotation job ${jobId} with delay ${delayMinutes} minutes`);
    
    const timeout = setTimeout(async () => {
      await this.executeRotation(testId, titleOrder);
    }, delay);
    
    this.jobs.set(jobId, timeout);
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
      console.log(`Executing rotation for test ${testId}, titleOrder: ${titleOrder}`);
      
      const test = await storage.getTest(testId);
      if (!test || test.status !== 'active') {
        console.log(`Test ${testId} not found or not active. Status: ${test?.status}`);
        return;
      }

      const titles = await storage.getTitlesByTestId(testId);
      console.log(`Found ${titles.length} titles for test ${testId}:`, titles.map(t => ({ order: t.order, text: t.text })));
      
      const currentTitle = titles.find(t => t.order === titleOrder);
      
      if (!currentTitle) {
        console.log(`No title found with order ${titleOrder}. Test completed.`);
        await storage.updateTestStatus(testId, 'completed');
        return;
      }

      console.log(`Current title (order ${titleOrder}): ${currentTitle.text}`);

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
        await youtubeService.updateVideoTitle(account.accessToken, test.videoId, currentTitle.text);
        console.log(`✅ Successfully updated video ${test.videoId} to title: "${currentTitle.text}"`);
        
        // Update title activation
        await storage.updateTitleActivation(currentTitle.id, new Date());
        console.log(`✅ Title activation updated for title ID: ${currentTitle.id}`);
      } catch (error) {
        console.error('❌ Error updating YouTube title:', error);
        console.error('Error details:', error.message);
        // Try again in 5 minutes if the update failed
        console.log(`⏰ Rescheduling rotation for test ${testId}, titleOrder ${titleOrder} in 5 minutes`);
        this.scheduleRotation(testId, titleOrder, 5);
        return;
      }
      
      // Schedule next rotation
      const nextTitleOrder = titleOrder + 1;
      console.log(`Next title order: ${nextTitleOrder}, titles.length: ${titles.length}`);
      
      if (nextTitleOrder < titles.length) {
        console.log(`Scheduling next rotation: test ${testId}, titleOrder ${nextTitleOrder}, delay ${test.rotationIntervalMinutes} minutes`);
        this.scheduleRotation(testId, nextTitleOrder, test.rotationIntervalMinutes);
      } else {
        console.log(`All titles completed for test ${testId}. Marking as completed.`);
        await storage.updateTestStatus(testId, 'completed');
      }
      
      // Schedule analytics polling for this title
      this.schedulePoll(currentTitle.id);
      
    } catch (error) {
      console.error('Error executing rotation:', error);
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
