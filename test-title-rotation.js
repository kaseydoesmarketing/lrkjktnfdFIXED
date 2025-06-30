#!/usr/bin/env node

// Test script to verify title rotation logic
console.log('Testing Title Rotation Logic');
console.log('============================');

// Simulate the scheduler logic
function simulateRotation(testId, titleOrder, totalTitles) {
  console.log(`\nExecuting rotation for test ${testId}, titleOrder: ${titleOrder}`);
  console.log(`Total titles: ${totalTitles}`);
  
  // This simulates the current title being found
  if (titleOrder >= totalTitles) {
    console.log(`❌ No title found with order ${titleOrder}. Test should complete.`);
    return false; // Test completed
  }
  
  console.log(`✅ Current title (order ${titleOrder}): Title ${String.fromCharCode(65 + titleOrder)}`);
  
  // Schedule next rotation
  const nextTitleOrder = titleOrder + 1;
  console.log(`Next title order: ${nextTitleOrder}, titles.length: ${totalTitles}`);
  
  if (nextTitleOrder < totalTitles) {
    console.log(`✅ Scheduling next rotation: test ${testId}, titleOrder ${nextTitleOrder}`);
    return nextTitleOrder; // Continue rotation
  } else {
    console.log(`✅ All titles completed for test ${testId}. Marking as completed.`);
    return false; // Test completed
  }
}

// Test with 5 titles (orders 0, 1, 2, 3, 4)
console.log('\n🧪 Testing 5-title rotation (A, B, C, D, E)');
const testId = 'test-123';
const totalTitles = 5;

let currentOrder = 0;
let step = 1;

while (currentOrder !== false && step <= 10) { // Max 10 steps to prevent infinite loop
  console.log(`\n--- Step ${step} ---`);
  currentOrder = simulateRotation(testId, currentOrder, totalTitles);
  step++;
  
  if (currentOrder === false) {
    console.log('\n🎉 Test completed successfully!');
    break;
  }
  
  if (step > 10) {
    console.log('\n❌ ERROR: Infinite loop detected!');
    break;
  }
}

console.log('\n📊 Expected sequence:');
console.log('Step 1: Execute order 0 (Title A) → Schedule order 1');
console.log('Step 2: Execute order 1 (Title B) → Schedule order 2');
console.log('Step 3: Execute order 2 (Title C) → Schedule order 3');
console.log('Step 4: Execute order 3 (Title D) → Schedule order 4');
console.log('Step 5: Execute order 4 (Title E) → Complete test');
console.log('\nIf the real system stops at step 3, there might be an issue with:');
console.log('1. Job scheduling/execution');
console.log('2. Database queries not finding titles with order 3 or 4');
console.log('3. Test status changing unexpectedly');
console.log('4. Error in YouTube API calls preventing progression');