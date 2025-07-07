const { google } = require('googleapis');
const { db } = require('./server/db.js');
const { users } = require('./shared/schema.js');
const { eq } = require('drizzle-orm');
require('dotenv').config();

async function debugYouTubeAnalytics() {
  console.log('🔍 DEBUG: YouTube Analytics API Test\n');
  
  try {
    // Get user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, 'liftedkulture-6202@pages.plusgoogle.com'))
      .limit(1);
      
    if (!user.length || !user[0].googleAccessToken) {
      console.error('❌ No user found or no access token available');
      return;
    }

    console.log('✅ User found:', user[0].email);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/api/auth/callback/google'
    );
    
    oauth2Client.setCredentials({
      access_token: user[0].googleAccessToken,
      refresh_token: user[0].googleRefreshToken
    });

    // Step 1: Verify token scopes
    console.log('\n📋 Step 1: Checking token scopes...');
    try {
      const tokenInfo = await oauth2Client.getTokenInfo(user[0].googleAccessToken);
      console.log('Token scopes:', tokenInfo.scopes);
      const hasAnalyticsScope = tokenInfo.scopes?.includes('https://www.googleapis.com/auth/yt-analytics.readonly');
      console.log('Has Analytics scope:', hasAnalyticsScope ? '✅ YES' : '❌ NO');
    } catch (tokenError) {
      console.log('⚠️ Could not check token info:', tokenError.message);
    }

    // Step 2: Get channel info
    console.log('\n📺 Step 2: Getting channel info...');
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'contentDetails'],
      mine: true
    });

    if (!channelResponse.data.items?.length) {
      console.error('❌ No channel found');
      return;
    }

    const channel = channelResponse.data.items[0];
    console.log('Channel ID:', channel.id);
    console.log('Channel Title:', channel.snippet?.title);

    // Step 3: Get a recent video
    console.log('\n🎥 Step 3: Getting recent video...');
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    const playlistResponse = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 1
    });

    if (!playlistResponse.data.items?.length) {
      console.error('❌ No videos found');
      return;
    }

    const videoId = playlistResponse.data.items[0].snippet?.resourceId?.videoId;
    console.log('Video ID:', videoId);
    console.log('Video Title:', playlistResponse.data.items[0].snippet?.title);

    // Step 4: Test YouTube Analytics API with different metric combinations
    console.log('\n📊 Step 4: Testing YouTube Analytics API...');
    const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });
    
    // Test different metric combinations
    const metricTests = [
      { name: 'Basic views', metrics: 'views' },
      { name: 'Views with impressions', metrics: 'views,impressions' },
      { name: 'Views with clicks', metrics: 'views,impressionClickThroughRate' },
      { name: 'All core metrics', metrics: 'views,likes,dislikes,comments,averageViewDuration' }
    ];

    for (const test of metricTests) {
      console.log(`\n🧪 Testing ${test.name}...`);
      try {
        const analyticsResponse = await youtubeAnalytics.reports.query({
          ids: 'channel==MINE',
          startDate: '2025-01-01',
          endDate: '2025-01-07',
          metrics: test.metrics,
          filters: `video==${videoId}`,
          dimensions: 'day'
        });
        
        console.log(`✅ ${test.name} works!`);
        console.log('Response:', JSON.stringify(analyticsResponse.data, null, 2));
      } catch (error) {
        console.log(`❌ ${test.name} failed:`, error.message);
        if (error.response?.data) {
          console.log('Error details:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    // Step 5: Test without video filter
    console.log('\n🧪 Testing channel-wide analytics...');
    try {
      const channelAnalytics = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: '2025-01-01',
        endDate: '2025-01-07',
        metrics: 'views,estimatedMinutesWatched',
        dimensions: 'day'
      });
      
      console.log('✅ Channel analytics works!');
      console.log('Total views:', channelAnalytics.data.rows?.reduce((sum, row) => sum + (row[1] || 0), 0) || 0);
    } catch (error) {
      console.log('❌ Channel analytics failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
  
  process.exit(0);
}

debugYouTubeAnalytics();