import { storage } from './storage';
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
      const test = await storage.getTest(testId);
      if (!test || test.status !== 'active') {
        return;
      }

      const titles = await storage.getTitlesByTestId(testId);
      const currentTitle = titles.find(t => t.order === titleOrder);
      
      if (!currentTitle) {
        // Test completed
        await storage.updateTestStatus(testId, 'completed');
        return;
      }

      // Simulate YouTube API call to update title
      console.log(`Updating video ${test.videoId} to title: "${currentTitle.text}"`);
      
      // Update title activation
      await storage.updateTitleActivation(currentTitle.id, new Date());
      
      // Schedule next rotation
      const nextTitleOrder = titleOrder + 1;
      if (nextTitleOrder < titles.length) {
        this.scheduleRotation(testId, nextTitleOrder, test.rotationIntervalMinutes);
      } else {
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

      // Simulate YouTube Analytics API call
      const mockAnalytics = {
        views: Math.floor(Math.random() * 1000) + 100,
        impressions: Math.floor(Math.random() * 10000) + 1000,
        ctr: Math.random() * 10 + 2, // 2-12%
        averageViewDuration: Math.floor(Math.random() * 300) + 60, // 1-6 minutes
      };

      await storage.createAnalyticsPoll({
        titleId: title.id,
        views: mockAnalytics.views,
        impressions: mockAnalytics.impressions,
        ctr: mockAnalytics.ctr,
        averageViewDuration: mockAnalytics.averageViewDuration,
      });

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
