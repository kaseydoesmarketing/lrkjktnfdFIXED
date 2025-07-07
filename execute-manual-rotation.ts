import { db } from './server/db';
import { tests, titles, testRotationLogs, users, accounts } from './shared/schema';
import { eq, and } from 'drizzle-orm';
import { youtubeService } from './server/youtubeService';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function validateTokensAndRotate() {
  console.log('MANUAL ROTATION EXECUTION AND TOKEN VALIDATION\n');
  
  try {
    // Get active test
    const activeTests = await db
      .select()
      .from(tests)
      .where(eq(tests.status, 'active'))
      .limit(1);
      
    if (activeTests.length === 0) {
      console.log('No active tests found');
      return;
    }
    
    const test = activeTests[0];
    console.log(`Processing test: ${test.id} for video: ${test.videoId}`);
    
    // Get user and account
    const user = await db.select().from(users).where(eq(users.id, test.userId));
    if (!user[0]) {
      console.log('User not found');
      return;
    }
    
    const account = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, test.userId), eq(accounts.provider, 'google')));
      
    if (!account[0] || !account[0].accessToken) {
      console.log('No OAuth tokens found in accounts table');
      return;
    }
    
    console.log(`\n1. TOKEN VALIDATION for user: ${user[0].email}`);
    console.log('================================================');
    
    // Validate token using Google tokeninfo endpoint
    try {
      const tokenInfoResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${account[0].accessToken}`
      );
      
      console.log('Token Info Response:');
      console.log('- Email:', tokenInfoResponse.data.email);
      console.log('- Scopes:', tokenInfoResponse.data.scope);
      console.log('- Expires in:', tokenInfoResponse.data.expires_in, 'seconds');
      console.log('- Issued to:', tokenInfoResponse.data.issued_to);
      
      // Check for required scopes
      const requiredScopes = [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/yt-analytics.readonly'
      ];
      
      const scopes = tokenInfoResponse.data.scope.split(' ');
      const hasAllScopes = requiredScopes.every(scope => scopes.includes(scope));
      console.log('\nRequired scopes present:', hasAllScopes ? 'YES' : 'NO');
      
    } catch (error: any) {
      console.log('Token validation failed:', error.response?.data || error.message);
    }
    
    console.log(`\n2. EXECUTING MANUAL ROTATION`);
    console.log('================================================');
    
    // Get titles for the test
    const testTitles = await db
      .select()
      .from(titles)
      .where(eq(titles.testId, test.id))
      .orderBy(titles.order);
      
    console.log(`Found ${testTitles.length} titles for test`);
    
    // Determine next title
    const currentIndex = test.currentTitleIndex || 0;
    const nextIndex = (currentIndex + 1) % testTitles.length;
    const nextTitle = testTitles[nextIndex];
    
    console.log(`Current title index: ${currentIndex}`);
    console.log(`Next title index: ${nextIndex}`);
    console.log(`Next title: "${nextTitle.title}"`);
    
    try {
      // Execute rotation via YouTube API
      console.log('\nUpdating video title via YouTube API...');
      await youtubeService.updateVideoTitle(test.userId, test.videoId, nextTitle.title);
      console.log('Video title updated successfully!');
      
      // Log the rotation
      const rotationLog = await db.insert(testRotationLogs).values({
        id: crypto.randomUUID(),
        testId: test.id,
        titleId: nextTitle.id,
        rotationOrder: currentIndex + 1,
        titleText: nextTitle.title,
        rotatedAt: new Date()
      }).returning();
      
      console.log('\nRotation logged:', rotationLog[0]);
      
      // Update test
      await db.update(tests)
        .set({ 
          currentTitleIndex: nextIndex,
          updatedAt: new Date()
        })
        .where(eq(tests.id, test.id));
        
      console.log('Test updated with new title index');
      
    } catch (error: any) {
      console.error('Rotation failed:', error.message);
    }
    
    console.log(`\n3. VERIFYING ROTATION LOGS IN DATABASE`);
    console.log('================================================');
    
    // Query rotation logs
    const logs = await db
      .select()
      .from(testRotationLogs)
      .where(eq(testRotationLogs.testId, test.id))
      .orderBy(testRotationLogs.rotatedAt);
      
    console.log(`\nTotal rotation logs for test: ${logs.length}`);
    if (logs.length > 0) {
      console.log('\nRotation History:');
      logs.forEach((log, idx) => {
        console.log(`${idx + 1}. [${log.rotatedAt.toISOString()}] Order: ${log.rotationOrder} - "${log.titleText}"`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

validateTokensAndRotate();