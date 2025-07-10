import cron from 'node-cron';
import { storage } from './storage';
import { youtubeService } from './youtubeService';
import { analyticsCollector } from './analyticsCollector';

const scheduledJobs = new Map<string, cron.ScheduledTask>();
const analyticsJobs = new Map<string, cron.ScheduledTask>();

export async function startRotationJob(testId: string, intervalMinutes: number) {
  // Remove existing job if present
  if (scheduledJobs.has(testId)) {
    scheduledJobs.get(testId)!.stop();
    scheduledJobs.delete(testId);
  }
  
  // Schedule new rotation
  const cronExpr = `*/${intervalMinutes} * * * *`;
  const job = cron.schedule(cronExpr, async () => {
    await rotateTitle(testId);
  });
  scheduledJobs.set(testId, job);
}

export async function rotateTitle(testId: string) {
  try {
    const test = await storage.getTest(testId);
    if (!test || test.status !== 'active') return;
    
    // Check if test has reached end date
    if (test.endDate && new Date() >= test.endDate) {
      await completeTest(testId);
      console.log(`Test ${testId} completed - reached end date`);
      return;
    }
    
    const titles = await storage.getTitlesByTestId(testId);
    let currentIndex = test.currentTitleIndex || 0;
    const nextIndex = (currentIndex + 1) % titles.length;
    const nextTitle = titles[nextIndex];
    
    // Update YouTube video title
    await youtubeService.updateVideoTitle(test.userId, test.videoId, nextTitle.text);
    
    // Update test state
    await storage.updateTestCurrentTitle(testId, nextIndex);
    await storage.logRotationEvent(testId, nextTitle.id, nextTitle.text, new Date(), nextIndex);
    
    // Collect analytics for the previous title before switching
    if (currentIndex !== undefined && titles[currentIndex]) {
      try {
        await analyticsCollector.forceCollectTestAnalytics(testId);
      } catch (error) {
        console.error(`Failed to collect analytics for test ${testId}:`, error);
      }
    }
    
    // Check if we've completed a full cycle
    if (nextIndex === 0 && test.rotationCount && test.rotationCount > 0) {
      // We've cycled through all titles at least once
      await completeTest(testId);
      console.log(`Test ${testId} completed - all titles tested`);
    }
  } catch (error) {
    console.error(`Error in title rotation for test ${testId}:`, error);
  }
}

// Analytics polling function
async function pollAnalytics(testId: string) {
  try {
    const test = await storage.getTest(testId);
    if (!test || test.status !== 'active') return;
    
    await analyticsCollector.forceCollectTestAnalytics(testId);
    console.log(`Analytics polled for test ${testId}`);
  } catch (error) {
    console.error(`Error polling analytics for test ${testId}:`, error);
  }
}

// Complete test and generate summaries
async function completeTest(testId: string) {
  try {
    // Collect final analytics
    await analyticsCollector.forceCollectTestAnalytics(testId);
    
    // Generate summaries for all titles
    const titles = await storage.getTitlesByTestId(testId);
    for (const title of titles) {
      const analyticsPolls = await storage.getAnalyticsPollsByTitleId(title.id);
      if (analyticsPolls.length > 0) {
        // Calculate final metrics
        const totalViews = analyticsPolls.reduce((sum, poll) => sum + poll.views, 0);
        const totalImpressions = analyticsPolls.reduce((sum, poll) => sum + poll.impressions, 0);
        const avgCtr = totalImpressions > 0 ? (totalViews / totalImpressions) * 100 : 0;
        const avgAvd = analyticsPolls.reduce((sum, poll) => sum + poll.averageViewDuration, 0) / analyticsPolls.length;
        
        // Create or update summary
        await storage.createTitleSummary({
          titleId: title.id,
          totalViews: totalViews,
          totalImpressions: totalImpressions,
          finalCtr: Math.round(avgCtr * 100) / 100,
          finalAvd: Math.round(avgAvd)
        });
      }
    }
    
    // Update test status to completed
    await storage.updateTestStatus(testId, 'completed');
    
    // Stop all scheduled jobs
    await stopScheduledTest(testId);
    
    // Determine winner
    const winner = await storage.determineTestWinner(testId);
    if (winner) {
      console.log(`Test ${testId} completed. Winner: "${winner}"`);
    }
  } catch (error) {
    console.error(`Error completing test ${testId}:`, error);
  }
}

// Start analytics polling job (every 5 minutes)
function startAnalyticsJob(testId: string) {
  if (analyticsJobs.has(testId)) {
    analyticsJobs.get(testId)!.stop();
    analyticsJobs.delete(testId);
  }
  
  const job = cron.schedule('*/5 * * * *', async () => {
    await pollAnalytics(testId);
  });
  analyticsJobs.set(testId, job);
}

// On Test Creation/Activation:
export async function scheduleTest(testId: string, intervalMinutes: number) {
  await startRotationJob(testId, intervalMinutes);
  startAnalyticsJob(testId);
}

export async function stopScheduledTest(testId: string) {
  // Stop rotation job
  const rotationJob = scheduledJobs.get(testId);
  if (rotationJob) {
    rotationJob.stop();
    scheduledJobs.delete(testId);
  }
  
  // Stop analytics job
  const analyticsJob = analyticsJobs.get(testId);
  if (analyticsJob) {
    analyticsJob.stop();
    analyticsJobs.delete(testId);
  }
}

export async function initializeScheduler() {
  console.log('Initializing scheduler...');
  // Schedule all active tests on startup
  const activeTests = await storage.getActiveTests();
  console.log(`Found ${activeTests.length} active tests`);
  
  for (const test of activeTests) {
    await scheduleTest(test.id, test.rotationIntervalMinutes || 60);
    console.log(`Scheduled test ${test.id} with ${test.rotationIntervalMinutes} minute intervals`);
  }
}

export async function pauseTest(testId: string) {
  await stopScheduledTest(testId);
  await storage.updateTestStatus(testId, 'paused');
}

export async function resumeTest(testId: string) {
  const test = await storage.getTest(testId);
  if (!test) throw new Error('Test not found');
  
  await storage.updateTestStatus(testId, 'active');
  await startRotationJob(testId, test.rotationIntervalMinutes || 60);
}

export async function triggerManualRotation(testId: string) {
  await rotateTitle(testId);
}

export function getSchedulerStatus() {
  return {
    activeTests: scheduledJobs.size
  };
}

// Clean up old jobs periodically
cron.schedule('0 * * * *', async () => {
  for (const [testId, job] of scheduledJobs.entries()) {
    const test = await storage.getTest(testId);
    if (!test || test.status !== 'active') {
      job.stop();
      scheduledJobs.delete(testId);
    }
  }
});

export const scheduler = {
  initializeScheduler,
  scheduleTest,
  stopScheduledTest,
  pauseTest,
  resumeTest,
  triggerManualRotation,
  getSchedulerStatus
};