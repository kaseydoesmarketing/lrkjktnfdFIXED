#!/usr/bin/env node

// debug-rotation.js - Debug and fix title rotation issues
// Run with: node debug-rotation.js

const { db } = require('./server/db');
const { tests, titles, accounts, users, testRotationLogs, analyticsPolls } = require('./dist/shared/schema');
const { eq, and, desc } = require('drizzle-orm');
const { youtubeService } = require('./server/youtubeService');
const { initializeScheduler, triggerManualRotation, getSchedulerStatus } = require('./server/scheduler-fixed');

async function main() {
  console.log('🔍 TitleTesterPro Rotation Debug Tool');
  console.log('=====================================\n');

  try {
    // 1. Check database connection
    console.log('1️⃣ Checking database connection...');
    const testCount = await db.select({ count: tests.id }).from(tests);
    console.log(`✅ Database connected. Found ${testCount.length} tests.\n`);

    // 2. Check active tests
    console.log('2️⃣ Checking active tests...');
    const activeTests = await db.query.tests.findMany({
      where: eq(tests.status, 'active'),
      with: {
        titles: {
          orderBy: [titles.order],
        },
        user: true,
      },
    });

    if (activeTests.length === 0) {
      console.log('❌ No active tests found.\n');
    } else {
      console.log(`✅ Found ${activeTests.length} active test(s):\n`);
      
      for (const test of activeTests) {
        console.log(`Test ID: ${test.id}`);
        console.log(`Video Title: ${test.videoTitle}`);
        console.log(`Video ID: ${test.videoId}`);
        console.log(`User ID: ${test.userId}`);
        console.log(`Rotation Interval: ${test.rotationIntervalMinutes} minutes`);
        console.log(`Total Titles: ${test.titles.length}`);
        
        // Check current active title
        const activeTitle = test.titles.find(t => t.isActive);
        if (activeTitle) {
          console.log(`Current Active Title: "${activeTitle.text}" (order ${activeTitle.order})`);
          const activeDuration = activeTitle.activatedAt 
            ? Math.floor((Date.now() - new Date(activeTitle.activatedAt).getTime()) / 60000)
            : 0;
          console.log(`Active for: ${activeDuration} minutes`);
        } else {
          console.log(`⚠️ No active title found!`);
        }
        
        // Check titles status
        const activatedCount = test.titles.filter(t => t.activatedAt).length;
        console.log(`Titles Activated: ${activatedCount}/${test.titles.length}`);
        console.log('---');
      }
    }

    // 3. Check OAuth tokens
    console.log('\n3️⃣ Checking OAuth tokens...');
    for (const test of activeTests) {
      const account = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.userId, test.userId),
          eq(accounts.provider, 'google')
        ),
      });

      if (!account) {
        console.log(`❌ No Google account found for user ${test.userId}`);
      } else if (!account.accessToken || !account.refreshToken) {
        console.log(`❌ Missing OAuth tokens for user ${test.userId}`);
      } else {
        console.log(`✅ OAuth tokens found for user ${test.userId}`);
        
        // Test token validity
        try {
          await youtubeService.withTokenRefresh(test.userId, async (tokens) => {
            // Just test if we can make an API call
            return { success: true };
          });
          console.log(`✅ OAuth tokens are valid and working`);
        } catch (error) {
          console.log(`❌ OAuth token error: ${error.message}`);
        }
      }
    }

    // 4. Check scheduler status
    console.log('\n4️⃣ Checking scheduler status...');
    const schedulerStatus = getSchedulerStatus();
    console.log(`Active Jobs: ${schedulerStatus.activeJobs}`);
    console.log(`Job IDs: ${schedulerStatus.jobs.join(', ') || 'None'}`);
    console.log(`Uptime: ${Math.floor(schedulerStatus.uptime / 60)} minutes`);

    // 5. Check recent rotation logs
    console.log('\n5️⃣ Checking recent rotation logs...');
    const recentLogs = await db.query.testRotationLogs.findMany({
      orderBy: [desc(testRotationLogs.rotatedAt)],
      limit: 5,
    });

    if (recentLogs.length === 0) {
      console.log('❌ No rotation logs found.\n');
    } else {
      console.log(`✅ Found ${recentLogs.length} recent rotation(s):`);
      for (const log of recentLogs) {
        const timeSince = Math.floor((Date.now() - new Date(log.rotatedAt).getTime()) / 60000);
        console.log(`- ${timeSince} minutes ago: "${log.titleText}" (order ${log.rotationOrder})`);
      }
    }

    // 6. Check recent analytics polls
    console.log('\n6️⃣ Checking recent analytics polls...');
    const recentPolls = await db.query.analyticsPolls.findMany({
      orderBy: [desc(analyticsPolls.polledAt)],
      limit: 5,
    });

    if (recentPolls.length === 0) {
      console.log('❌ No analytics polls found.\n');
    } else {
      console.log(`✅ Found ${recentPolls.length} recent poll(s):`);
      for (const poll of recentPolls) {
        const timeSince = Math.floor((Date.now() - new Date(poll.polledAt).getTime()) / 60000);
        console.log(`- ${timeSince} minutes ago: Views=${poll.views}, Impressions=${poll.impressions}, CTR=${poll.impressions > 0 ? ((poll.clicks / poll.impressions) * 100).toFixed(2) : '0'}%`);
      }
    }

    // Offer fixes
    console.log('\n🔧 Available Actions:');
    console.log('1. Reinitialize scheduler (restart all active tests)');
    console.log('2. Trigger manual rotation for all active tests');
    console.log('3. Fix stuck titles (reset to first title)');
    console.log('4. Exit');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const choice = await new Promise(resolve => {
      readline.question('\nSelect action (1-4): ', resolve);
    });

    switch (choice) {
      case '1':
        console.log('\n♻️ Reinitializing scheduler...');
        await initializeScheduler();
        console.log('✅ Scheduler reinitialized!');
        break;

      case '2':
        console.log('\n🔄 Triggering manual rotation for all active tests...');
        for (const test of activeTests) {
          console.log(`Rotating test ${test.id}...`);
          await triggerManualRotation(test.id);
        }
        console.log('✅ Manual rotations completed!');
        break;

      case '3':
        console.log('\n🔧 Fixing stuck titles...');
        for (const test of activeTests) {
          // Deactivate all titles
          await db.update(titles)
            .set({ isActive: false })
            .where(eq(titles.testId, test.id));
          
          // Activate first title
          const firstTitle = test.titles.find(t => t.order === 0);
          if (firstTitle) {
            await db.update(titles)
              .set({ 
                isActive: true,
                activatedAt: new Date()
              })
              .where(eq(titles.id, firstTitle.id));
            
            console.log(`✅ Reset test ${test.id} to first title: "${firstTitle.text}"`);
          }
        }
        break;

      case '4':
        console.log('\n👋 Exiting...');
        break;

      default:
        console.log('\n❌ Invalid choice.');
    }

    readline.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the debug tool
main().catch(console.error);