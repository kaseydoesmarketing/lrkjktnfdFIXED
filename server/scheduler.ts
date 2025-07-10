import cron from 'node-cron';
import { storage } from './storage';
import { youtubeService } from './youtubeService';

const scheduledJobs = new Map<string, cron.ScheduledTask>();

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
  const test = await storage.getTest(testId);
  if (!test || test.status !== 'active') return;
  
  const titles = await storage.getTitlesByTestId(testId);
  let currentIndex = test.currentTitleIndex || 0;
  const nextIndex = (currentIndex + 1) % titles.length;
  const nextTitle = titles[nextIndex];
  
  await youtubeService.updateVideoTitle(test.userId, test.videoId, nextTitle.text);
  await storage.updateTestCurrentTitle(testId, nextIndex);
  await storage.logRotationEvent(testId, nextTitle.id, nextTitle.text, new Date(), nextIndex);
  
  // Check for end date or last title to complete test, then stop the job
  if (nextIndex === 0) {
    // We've cycled through all titles
    await storage.updateTestStatus(testId, 'completed');
    await stopScheduledTest(testId);
  }
}

// On Test Creation/Activation:
export async function scheduleTest(testId: string, intervalMinutes: number) {
  await startRotationJob(testId, intervalMinutes);
}

export async function stopScheduledTest(testId: string) {
  const job = scheduledJobs.get(testId);
  if (job) {
    job.stop();
    scheduledJobs.delete(testId);
  }
}

export async function initializeScheduler() {
  // Schedule all active tests on startup
  const activeTests = await storage.getActiveTests();
  for (const test of activeTests) {
    await startRotationJob(test.id, test.rotationIntervalMinutes || 60);
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