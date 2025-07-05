import cron from 'node-cron';
import { db } from './db';
import { tests, titles, analyticPolls } from './db/schema';
import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';
import { updateVideoTitle, getVideoAnalytics, withTokenRefresh } from './youtube';

// Store active cron jobs
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
      await withTokenRefresh(test.userId, async (tokens) => {
        await updateVideoTitle(
          test.videoId,
          nextTitle.text,
          tokens.accessToken!
        );
      });
      
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
    
    // Log rotation summary
    log(`Rotation complete:`, {
      testId,
      previousTitle: currentTitle?.text || 'None',
      previousOrder: currentOrder,
      newTitle: nextTitle.text,
      newOrder: nextOrder,
      totalTitles: test.titles.length,
      remainingTitles: test.titles.length - nextOrder - 1
    });
    
  } catch (err) {
    error(`Failed to rotate title for test ${testId}`, err);
  }
}

// Analytics polling logic
async function pollAnalytics(testId: string) {
  log(`Polling analytics for test ${testId}`);
  
  try {
    const test = await db.query.tests.findFirst({
      where: eq(tests.id, testId),
      with: {
        titles: true,
        user: true,
      },
    });

    if (!test || test.status !== 'active') {
      log(`Test ${testId} not active, skipping analytics poll`);
      return;
    }

    // Get current active title
    const activeTitle = test.titles.find(t => t.isActive);
    if (!activeTitle) {
      log(`No active title for test ${testId}`);
      return;
    }

    // Fetch YouTube analytics with token refresh
    try {
      const analytics = await withTokenRefresh(test.userId, async (tokens) => {
        return await getVideoAnalytics(
          test.videoId,
          tokens.accessToken!
        );
      });
      
      // Store analytics poll
      await db.insert(analyticPolls).values({
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
    
  } catch (err) {
    error(`Error in analytics polling for test ${testId}`, err);
  }
}

// Schedule a test
export function scheduleTest(testId: string, rotationIntervalMinutes: number) {
  log(`Scheduling test ${testId} with ${rotationIntervalMinutes} minute intervals`);
  
  // Clear any existing job
  const existingJob = activeJobs.get(testId);
  if (existingJob) {
    existingJob.stop();
    activeJobs.delete(testId);
    log(`Cleared existing job for test ${testId}`);
  }
  
  // Create cron pattern (run every N minutes)
  const cronPattern = `*/${rotationIntervalMinutes} * * * *`;
  
  // Schedule rotation job
  const rotationJob = cron.schedule(cronPattern, async () => {
    await rotateTitle(testId);
  });
  
  // Schedule analytics polling (every 5 minutes)
  const analyticsJob = cron.schedule('*/5 * * * *', async () => {
    await pollAnalytics(testId);
  });
  
  // Combine jobs
  const combinedJob = {
    start: () => {
      rotationJob.start();
      analyticsJob.start();
    },
    stop: () => {
      rotationJob.stop();
      analyticsJob.stop();
    }
  };
  
  activeJobs.set(testId, combinedJob as any);
  combinedJob.start();
  
  log(`✅ Test ${testId} scheduled with pattern: ${cronPattern}`);
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
export function stopScheduledTest(testId: string) {
  const job = activeJobs.get(testId);
  if (job) {
    job.stop();
    activeJobs.delete(testId);
    log(`Stopped scheduled test ${testId}`);
  }
}

// Pause a test
export async function pauseTest(testId: string) {
  await db.update(tests)
    .set({ 
      status: 'paused',
      updatedAt: new Date()
    })
    .where(eq(tests.id, testId));
  
  stopScheduledTest(testId);
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
    
    scheduleTest(testId, test.rotationIntervalMinutes);
    log(`Resumed test ${testId}`);
  }
}

// Manual rotation trigger (for debugging)
export async function triggerManualRotation(testId: string) {
  log(`Manual rotation triggered for test ${testId}`);
  await rotateTitle(testId);
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