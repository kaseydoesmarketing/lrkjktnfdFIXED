// Test script to manually trigger the scheduler debugging system
const { scheduler } = require('./server/scheduler.ts');

console.log('🧪 Testing scheduler debugging system...');

// Test with the actual test ID from the database
const testId = 'db0806e1-1779-4b0c-a113-421a969aa6ed';
const titleOrder = 2;

console.log(`📋 Triggering rotation for test ${testId}, titleOrder: ${titleOrder}`);

// Schedule rotation with immediate execution (0.1 minutes = 6 seconds)
scheduler.scheduleRotation(testId, titleOrder, 0.1);

console.log('✅ Rotation scheduled. Check logs in 6 seconds...');

// Keep the script running for 30 seconds to see the output
setTimeout(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}, 30000);