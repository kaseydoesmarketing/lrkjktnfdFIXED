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
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Clean up orphaned jobs every hour to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanupOrphanedJobs();
    }, 60 * 60 * 1000); // 1 hour
  }

  scheduleRotation(testId: string, titleOrder: number, delayMinutes: number) {
    const jobId = `rotate-${testId}-${titleOrder}`;
    const delay = delayMinutes * 60 * 1000; // Convert to milliseconds
    
    console.log(`[SCHEDULER] Scheduling rotation for test ${testId}, title order ${titleOrder} in ${delayMinutes} minutes`);
    
    // Cancel existing job if any
    this.cancelJob(jobId);
    
    const timeout = setTimeout(async () => {
      try {
        console.log(`[SCHEDULER] Starting rotation for test ${testId}, title order ${titleOrder}`);
        await this.executeRotation(testId, titleOrder);
      } catch (error: any) {
        console.error(`[SCHEDULER] Error in rotation for test ${testId}:`, error.message);
      } finally {
        this.jobs.delete(jobId);
      }
    }, delay);
    
    this.jobs.set(jobId, timeout);
    console.log(`[SCHEDULER] Rotation job ${jobId} scheduled successfully`);
  }

  schedulePoll(titleId: string, delayMinutes: number = 60) { // Increased from 15 to 60 minutes for cost optimization
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

  private async cleanupOrphanedJobs() {
    
    const jobsToCleanup: string[] = [];
    
    const jobKeys = Array.from(this.jobs.keys());
    for (const jobId of jobKeys) {
      if (jobId.startsWith('rotate-')) {
        const testId = jobId.split('-')[1];
        const test = await storage.getTest(testId);
        
        // Remove jobs for completed, cancelled, or non-existent tests
        if (!test || ['completed', 'cancelled'].includes(test.status)) {
          jobsToCleanup.push(jobId);
        }
      }
    }
    
    // Clean up identified orphaned jobs
    jobsToCleanup.forEach(jobId => this.cancelJob(jobId));
    
  }

  shutdown() {
    clearInterval(this.cleanupInterval);
    this.jobs.forEach((timeout, jobId) => {
      clearTimeout(timeout);
    });
    this.jobs.clear();
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
        // Reschedule if paused (now with longer interval)
        this.schedulePoll(titleId, 60);
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
    }
  }
}

export const scheduler = new Scheduler();
