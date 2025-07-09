// server/scheduler-fixed.ts
import cron from 'node-cron';
import { db } from './db';
import { tests, titles, analyticsPolls, testRotationLogs } from '@shared/schema';
import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';
import { youtubeService } from './youtubeService';
import { scheduleTestRotations, cancelTestRotations, titleRotationQueue } from './queues/titleRotation';
import { youtubeAPIService } from './services/youtube';

// Store active cron jobs (for analytics polling)
const activeJobs = new Map<string, cron.ScheduledTask>();

// Logging utility
const log = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔄 SCHEDULER: ${message}`, data || '');
};

const error = (message: string, err?: any) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ SCHEDULER ERROR: ${message}`, err || '');
};

// Title rotation logic
async function rotateTitle(testId: string) {
  log(`Starting title rotation for test ${testId}`);
  
  try {
    // Get test with all titles
    const test = await db.query.tests.findFirst({
      where: eq(tests.id, testId),
      with: {
        titles: {
          orderBy: [titles.order],
        },
        user: true,
      },
    });

    if (!test) {
      error(`Test ${testId} not found`);
      return;
    }

    if (test.status !== 'active') {
      log(`Test ${testId} is ${test.status}, skipping rotation`);
      return;
    }

    // Find current active title
    const currentTitle = test.titles.find(t => t.isActive);
    const currentOrder = currentTitle ? currentTitle.order : -1;
    
    log(`Current active title order: ${currentOrder} of ${test.titles.length - 1}`);

    // Deactivate current title
    if (currentTitle) {
      await db.update(titles)
        .set({ isActive: false })
        .where(eq(titles.id, currentTitle.id));
      
      log(`Deactivated title: "${currentTitle.text}" (order ${currentTitle.order})`);
    }

    // Find next title in sequence
    const nextOrder = currentOrder + 1;
    const nextTitle = test.titles.find(t => t.order === nextOrder);

    if (!nextTitle) {
      // All titles have been tested
      log(`All ${test.titles.length} titles tested for test ${testId}, marking as completed`);
      
      await db.update(tests)
        .set({ 
          status: 'completed',
          endDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(tests.id, testId));
      
      // Stop the cron job
      const job = activeJobs.get(testId);
      if (job) {
        job.stop();
        activeJobs.delete(testId);
        log(`Stopped cron job for completed test ${testId}`);
      }
      
      return;
    }

    // Update YouTube video title with token refresh
    log(`Updating YouTube video ${test.videoId} to: "${nextTitle.text}"`);
    
    try {
      await youtubeService.updateVideoTitle(
        test.userId,
        test.videoId,
        nextTitle.text
      );
      
      log(`✅ Successfully updated YouTube title to: "${nextTitle.text}"`);
    } catch (err: any) {
      error(`Failed to update YouTube title`, err);
      
      // If it's an auth error, pause the test
      if (err.message?.includes('401') || err.message?.includes('auth')) {
        await db.update(tests)
          .set({ 
            status: 'paused',
            updatedAt: new Date()
          })
          .where(eq(tests.id, testId));
        
        error(`Paused test ${testId} due to authentication error`);
        
        // Stop the cron job
        const job = activeJobs.get(testId);
        if (job) {
          job.stop();
          activeJobs.delete(testId);
        }
      }
      return;
    }

    // Activate next title
    await db.update(titles)
      .set({ 
        isActive: true,
        activatedAt: new Date()
      })
      .where(eq(titles.id, nextTitle.id));
    
    log(`✅ Activated title ${nextOrder + 1}/${test.titles.length}: "${nextTitle.text}"`);

    // Fetch initial analytics for the new title
    let analytics = null;
    try {
      analytics = await youtubeService.getVideoAnalytics(
        test.userId,
        test.videoId
      );
    } catch (err) {
      error('Failed to fetch analytics for rotation log', err);
    }

    // Log rotation event in testRotationLogs
    try {
      await db.insert(testRotationLogs).values({
        id: `rot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        testId: test.id,
        titleId: nextTitle.id,
        titleText: nextTitle.text,
        rotatedAt: new Date(),
        rotationOrder: nextOrder,
        durationMinutes: currentTitle && currentTitle.activatedAt 
          ? Math.floor((new Date().getTime() - new Date(currentTitle.activatedAt).getTime()) / 60000)
          : test.rotationIntervalMinutes,
        impressions: analytics?.impressions || 0,
        clicks: analytics?.clicks || 0,
        averageViewDuration: analytics?.averageViewDuration || 0
      });
      
      log('✅ Rotation logged successfully');
    } catch (err) {
      error('Failed to log rotation', err);
    }
    
  } catch (err) {
    error(`Error in title rotation for test ${testId}`, err);
  }
}

// Poll analytics for active test
async function pollAnalytics(testId: string) {
  try {
    const test = await db.query.tests.findFirst({
      where: eq(tests.id, testId),
      with: {
        titles: true,
      },
    });

    if (!test || test.status !== 'active') {
      return;
    }

    const activeTitle = test.titles.find(t => t.isActive);
    if (!activeTitle) {
      return;
    }

    log(`Polling analytics for test ${testId}, title: "${activeTitle.text}"`);

    const analytics = await youtubeService.withTokenRefresh(test.userId, async (tokens) => {
      return await youtubeService.getVideoAnalytics(
        test.videoId,
        tokens.accessToken!
      );
    });
    
    // Store analytics poll
    await db.insert(analyticsPolls).values({
      titleId: activeTitle.id,
      views: analytics.views || 0,
      impressions: analytics.impressions || 0,
      clicks: analytics.clicks || 0,
      averageViewDuration: analytics.averageViewDuration || 0,
      polledAt: new Date(),
    });
    
    log(`✅ Analytics polled for "${activeTitle.text}":`, {
      views: analytics.views,
      impressions: analytics.impressions,
      ctr: analytics.impressions > 0 ? ((analytics.clicks / analytics.impressions) * 100).toFixed(2) + '%' : '0%'
    });
    
  } catch (err: any) {
    error(`Failed to poll analytics for test ${testId}`, err);
  }
}

// Schedule a test
export async function scheduleTest(testId: string, rotationIntervalMinutes: number) {
  log(`Scheduling test ${testId} with ${rotationIntervalMinutes} minute intervals`);
  
  try {
    // Clear any existing analytics job
    const existingJob = activeJobs.get(testId);
    if (existingJob) {
      existingJob.stop();
      activeJobs.delete(testId);
      log(`Cleared existing analytics job for test ${testId}`);
    }
    
    // Cancel any existing BullMQ rotation jobs
    await cancelTestRotations(testId);
    
    // Schedule title rotation using BullMQ
    await scheduleTestRotations(testId, rotationIntervalMinutes);
    
    // Schedule analytics polling using cron (every 15 minutes)
    const analyticsJob = cron.schedule('*/15 * * * *', async () => {
      await pollAnalytics(testId);
    });
    
    activeJobs.set(testId, analyticsJob);
    analyticsJob.start();
    
    log(`✅ Test ${testId} scheduled with ${rotationIntervalMinutes} minute rotation intervals`);
  } catch (error) {
    log(`Failed to schedule test ${testId}`, error);
    throw error;
  }
}

// Initialize scheduler on startup
export async function initializeScheduler() {
  log('Initializing scheduler...');
  
  try {
    // Get all active tests
    const activeTests = await db.query.tests.findMany({
      where: eq(tests.status, 'active'),
      with: {
        titles: true,
      },
    });
    
    log(`Found ${activeTests.length} active tests to schedule`);
    
    // Schedule each active test
    for (const test of activeTests) {
      // Check if test has titles to rotate
      const activatedTitles = test.titles.filter(t => t.activatedAt).length;
      const remainingTitles = test.titles.filter(t => !t.activatedAt).length;
      
      if (remainingTitles === 0) {
        log(`Test ${test.id} has no remaining titles, marking as completed`);
        await db.update(tests)
          .set({ 
            status: 'completed',
            endDate: new Date()
          })
          .where(eq(tests.id, test.id));
        continue;
      }
      
      scheduleTest(test.id, test.rotationIntervalMinutes);
      
      log(`Scheduled test ${test.id}:`, {
        videoTitle: test.videoTitle,
        titlesActivated: activatedTitles,
        titlesRemaining: remainingTitles,
        rotationInterval: test.rotationIntervalMinutes
      });
    }
    
    // Poll analytics immediately for all active tests
    setTimeout(async () => {
      log('Running initial analytics poll for all active tests...');
      for (const test of activeTests) {
        await pollAnalytics(test.id);
      }
    }, 5000); // Wait 5 seconds after startup
    
    log('✅ Scheduler initialization complete');
    
  } catch (err) {
    error('Failed to initialize scheduler', err);
  }
}

// Stop a scheduled test
export async function stopScheduledTest(testId: string) {
  // Stop analytics polling
  const job = activeJobs.get(testId);
  if (job) {
    job.stop();
    activeJobs.delete(testId);
    log(`Stopped analytics polling for test ${testId}`);
  }
  
  // Cancel BullMQ rotation jobs
  await cancelTestRotations(testId);
  log(`Stopped all scheduled jobs for test ${testId}`);
}

// Pause a test
export async function pauseTest(testId: string) {
  await db.update(tests)
    .set({ 
      status: 'paused',
      updatedAt: new Date()
    })
    .where(eq(tests.id, testId));
  
  await stopScheduledTest(testId);
  log(`Paused test ${testId}`);
}

// Resume a test
export async function resumeTest(testId: string) {
  const test = await db.query.tests.findFirst({
    where: eq(tests.id, testId),
  });
  
  if (test) {
    await db.update(tests)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(tests.id, testId));
    
    await scheduleTest(testId, test.rotationIntervalMinutes);
    log(`Resumed test ${testId}`);
  }
}

// Manual rotation trigger (for debugging)
export async function triggerManualRotation(testId: string) {
  log(`Manual rotation triggered for test ${testId}`);
  // Add a rotation job immediately
  await titleRotationQueue.add('rotate-title', { testId }, {
    delay: 0,
  });
}

// Get scheduler status
export function getSchedulerStatus() {
  const status = {
    activeJobs: activeJobs.size,
    jobs: Array.from(activeJobs.keys()),
    uptime: process.uptime(),
  };
  
  log('Scheduler status:', status);
  return status;
}

// Export for compatibility with existing code
export const scheduler = {
  scheduleTest,
  startTest: scheduleTest,
  cancelJob: stopScheduledTest,
  rotateToNextTitle: triggerManualRotation,
  cancelRotation: stopScheduledTest,
  scheduleRotation: async (testId: string, delayMinutes: number) => {
    await scheduleTest(testId, delayMinutes);
  }
};