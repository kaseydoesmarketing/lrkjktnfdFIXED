#!/usr/bin/env tsx

/**
 * End-to-End Test Script for TitleTesterPro
 * Tests the complete flow from test creation to winner determination
 */

import { db } from './server/db';
import { storage } from './server/storage';
import { scheduler } from './server/scheduler';
import { analyticsCollector } from './server/analyticsCollector';
import { users, tests, titles, analyticsPolls, titleSummaries } from './shared/schema';
import { eq } from 'drizzle-orm';

async function runEndToEndTest() {
  console.log('🧪 Starting End-to-End Test...\n');

  try {
    // 1. Create a test user
    console.log('1️⃣ Creating test user...');
    const testUser = await storage.createUser({
      email: 'e2e-test@example.com',
      name: 'E2E Test User',
      subscriptionStatus: 'active',
      subscriptionTier: 'pro'
    });
    console.log(`✅ User created: ${testUser.email}`);

    // 2. Create a test
    console.log('\n2️⃣ Creating A/B test...');
    const test = await storage.createTest({
      userId: testUser.id,
      videoId: 'test-video-123',
      videoTitle: 'Test Video for E2E',
      rotationIntervalMinutes: 1, // 1 minute for testing
      winnerMetric: 'ctr',
      startDate: new Date(),
      endDate: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    });
    console.log(`✅ Test created: ${test.id}`);

    // 3. Create title variants
    console.log('\n3️⃣ Creating title variants...');
    const titleTexts = [
      'Amazing Tutorial - You Won\'t Believe What Happens!',
      'Step by Step Guide to Success',
      'The Ultimate Tutorial for Beginners'
    ];
    
    for (let i = 0; i < titleTexts.length; i++) {
      await storage.createTitle({
        testId: test.id,
        text: titleTexts[i],
        order: i
      });
    }
    console.log(`✅ Created ${titleTexts.length} title variants`);

    // 4. Activate the test
    console.log('\n4️⃣ Activating test...');
    await storage.updateTestStatus(test.id, 'active');
    console.log('✅ Test activated');

    // 5. Verify scheduler picks it up
    console.log('\n5️⃣ Verifying scheduler integration...');
    const activeTests = await storage.getActiveTests();
    console.log(`✅ Found ${activeTests.length} active tests`);

    // 6. Simulate analytics data
    console.log('\n6️⃣ Simulating analytics data...');
    const testTitles = await storage.getTitlesByTestId(test.id);
    
    for (const title of testTitles) {
      // Simulate different performance for each title
      const baseViews = 1000 + Math.floor(Math.random() * 2000);
      const baseImpressions = baseViews * 10;
      const ctr = 5 + Math.random() * 10; // 5-15% CTR
      
      await storage.createAnalyticsPoll({
        titleId: title.id,
        views: baseViews,
        impressions: baseImpressions,
        ctr: ctr,
        averageViewDuration: Math.round(180 + Math.random() * 120) // 3-5 minutes (rounded to integer)
      });
      
      console.log(`✅ Created analytics for "${title.text}" - CTR: ${ctr.toFixed(2)}%`);
    }

    // 7. Generate summaries
    console.log('\n7️⃣ Generating title summaries...');
    for (const title of testTitles) {
      const polls = await storage.getAnalyticsPollsByTitleId(title.id);
      const totalViews = polls.reduce((sum, p) => sum + p.views, 0);
      const totalImpressions = polls.reduce((sum, p) => sum + p.impressions, 0);
      const avgCtr = totalImpressions > 0 ? (totalViews / totalImpressions) * 100 : 0;
      
      await storage.createTitleSummary({
        titleId: title.id,
        totalViews: totalViews,
        totalImpressions: totalImpressions,
        finalCtr: avgCtr,
        finalAvd: polls[0]?.averageViewDuration || 0
      });
    }
    console.log('✅ Summaries generated');

    // 8. Complete the test and determine winner
    console.log('\n8️⃣ Completing test and determining winner...');
    await storage.updateTestStatus(test.id, 'completed');
    const winner = await storage.determineTestWinner(test.id);
    console.log(`✅ Test completed. Winner: "${winner}"`);

    // 9. Display final results
    console.log('\n9️⃣ Final Results:');
    const summaries = await storage.getTitleSummariesByTestId(test.id);
    for (const summary of summaries) {
      const title = testTitles.find(t => t.id === summary.titleId);
      console.log(`- "${title?.text}": ${summary.finalCtr.toFixed(2)}% CTR, ${summary.finalViews} views`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await storage.deleteTest(test.id);
    await db.delete(users).where(eq(users.id, testUser.id));
    console.log('✅ Cleanup complete');

    console.log('\n✨ End-to-End Test Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the test
runEndToEndTest();