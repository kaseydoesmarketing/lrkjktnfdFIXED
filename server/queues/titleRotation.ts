import { Queue, Worker, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';
import { db } from '../storage.js';
import { youtubeAuthService } from '../services/youtubeAuth.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Create queue with proper configuration
export const titleRotationQueue = new Queue('title-rotation', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 10,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Queue scheduler for delayed/repeated jobs
new QueueScheduler('title-rotation', { connection });

// Worker that properly handles all titles
const titleRotationWorker = new Worker(
  'title-rotation',
  async (job) => {
    const { testId } = job.data;
    console.log(`🔄 Processing title rotation for test ${testId}`);
    
    try {
      // Get test details with all titles
      const testResult = await db.db.query(
        `SELECT t.*, 
         array_agg(
           json_build_object(
             'id', tt.id,
             'title', tt.title,
             'position', tt.position
           ) ORDER BY tt.position
         ) as titles
         FROM tests t
         LEFT JOIN test_titles tt ON t.id = tt.test_id
         WHERE t.id = $1 AND t.status = 'active'
         GROUP BY t.id`,
        [testId]
      );

      if (!testResult.rows[0]) {
        throw new Error('Test not found or inactive');
      }

      const test = testResult.rows[0];
      const titles = test.titles || [];
      
      if (titles.length === 0) {
        throw new Error('No titles found for test');
      }

      // Calculate next title index
      const currentIndex = test.current_title_index || 0;
      const nextIndex = (currentIndex + 1) % titles.length;
      const nextTitle = titles[nextIndex];

      console.log(`📝 Rotating from title ${currentIndex + 1}/${titles.length} to ${nextIndex + 1}/${titles.length}`);
      console.log(`   Current: "${titles[currentIndex]?.title || 'N/A'}"`);
      console.log(`   Next: "${nextTitle.title}"`);

      // Get YouTube client with auto-refresh
      const youtube = await youtubeAuthService.getYouTubeClient(test.channel_id);
      
      // Update YouTube video title
      await youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: test.video_id,
          snippet: {
            title: nextTitle.title,
            categoryId: test.category_id,
          },
        },
      });

      // Update test with new index
      await db.db.query(
        `UPDATE tests 
         SET current_title_index = $1, 
             last_rotation_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [nextIndex, testId]
      );

      // Log the rotation
      await db.db.query(
        `INSERT INTO rotation_logs (test_id, title_id, rotated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [testId, nextTitle.id]
      );

      // Update progress to show completion
      await job.updateProgress(100);

      console.log(`✅ Title rotation completed for test ${testId}`);

      return {
        success: true,
        testId,
        rotatedTo: nextTitle.title,
        titleIndex: nextIndex,
        totalTitles: titles.length,
      };
      
    } catch (error) {
      console.error(`❌ Title rotation failed for test ${testId}:`, error);
      
      // If it's an auth error, pause the test
      if (error.message?.includes('reauthorization required')) {
        await db.db.query(
          `UPDATE tests SET status = 'paused' WHERE id = $1`,
          [testId]
        );
      }
      
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process 5 tests simultaneously
    limiter: {
      max: 10,
      duration: 60000, // 10 rotations per minute to avoid YouTube rate limits
    },
  }
);

// Handle worker events
titleRotationWorker.on('completed', (job) => {
  console.log(`✅ Title rotation completed for test ${job.data.testId}`);
});

titleRotationWorker.on('failed', (job, err) => {
  console.error(`❌ Title rotation failed for test ${job?.data.testId}:`, err);
});

// Schedule recurring rotations
export async function scheduleTestRotations(testId: string, intervalHours: number) {
  const jobId = `rotation-${testId}`;
  
  // Remove existing schedule if any
  const existingJobs = await titleRotationQueue.getRepeatableJobs();
  const existingJob = existingJobs.find(job => job.id === jobId);
  if (existingJob) {
    await titleRotationQueue.removeRepeatableByKey(existingJob.key);
  }
  
  // Add new repeatable job
  await titleRotationQueue.add(
    'rotate-title',
    { testId },
    {
      repeat: {
        every: intervalHours * 60 * 60 * 1000, // Convert hours to milliseconds
      },
      jobId,
    }
  );
  
  console.log(`🔄 Scheduled rotation for test ${testId} every ${intervalHours} hours`);
}

// Cancel test rotations
export async function cancelTestRotations(testId: string) {
  const jobId = `rotation-${testId}`;
  
  const existingJobs = await titleRotationQueue.getRepeatableJobs();
  const existingJob = existingJobs.find(job => job.id === jobId);
  if (existingJob) {
    await titleRotationQueue.removeRepeatableByKey(existingJob.key);
    console.log(`🛑 Cancelled rotation schedule for test ${testId}`);
  }
}

// Memory leak prevention
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await titleRotationWorker.close();
  await connection.quit();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await titleRotationWorker.close();
  await connection.quit();
});