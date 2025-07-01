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
    
    // Cancel existing job if any
    this.cancelJob(jobId);
    
    const timeout = setTimeout(async () => {
      try {
        await this.executeRotation(testId, titleOrder);
      } catch (error: any) {
        console.error(`Scheduler job ${jobId} failed:`, error.message);
      } finally {
        this.jobs.delete(jobId);
      }
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
      const test = await storage.getTest(testId);
      if (!test || test.status !== 'active') {
        return;
      }

      const titles = await storage.getTitlesByTestId(testId);
      const currentTitle = titles.find(t => t.order === titleOrder);
      
      if (!currentTitle) {
        await storage.updateTestStatus(testId, 'completed');
        return;
      }

      // Update the YouTube video title using token refresh system
      try {
        await youtubeService.updateVideoTitle(test.userId, test.videoId, currentTitle.text);
        await storage.updateTitleActivation(currentTitle.id, new Date());
      } catch (error: any) {
        // Check if it's a token refresh failure
        if (error.message?.includes('authentication') || error.message?.includes('token refresh')) {
          await storage.updateTestStatus(testId, 'paused');
          return;
        }
        
        // Try again in 5 minutes for other errors
        this.scheduleRotation(testId, titleOrder, 5);
        return;
      }
      
      // Schedule next rotation
      const nextTitle = titles.find(t => t.order === titleOrder + 1);
      if (nextTitle) {
        this.scheduleRotation(testId, titleOrder + 1, test.rotationIntervalMinutes);
      } else {
        await storage.updateTestStatus(testId, 'completed');
      }
      
      // Schedule analytics polling for this title
      this.schedulePoll(currentTitle.id);
      
    } catch (error: any) {
      console.error('Scheduler rotation error:', error.message);
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
