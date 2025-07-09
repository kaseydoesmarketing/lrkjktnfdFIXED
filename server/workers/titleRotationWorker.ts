import '../queues/titleRotation.js';
import { scheduleTestRotations, cancelTestRotations } from '../queues/titleRotation.js';
import { db } from '../storage.js';

console.log('🚀 Title Rotation Worker starting...');

// Initialize active test schedules on startup
async function initializeSchedules() {
  try {
    console.log('📅 Initializing schedules for active tests...');
    
    const activeTests = await db.db.query(`
      SELECT id, rotation_interval_hours 
      FROM tests 
      WHERE status = 'active' 
      AND rotation_interval_hours IS NOT NULL
    `);
    
    for (const test of activeTests.rows) {
      await scheduleTestRotations(test.id, test.rotation_interval_hours);
    }
    
    console.log(`✅ Scheduled ${activeTests.rows.length} active tests`);
  } catch (error) {
    console.error('❌ Failed to initialize schedules:', error);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Initialize schedules
initializeSchedules();

console.log('✅ Title Rotation Worker ready');