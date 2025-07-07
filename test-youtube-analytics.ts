import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { google } from "googleapis";
import { sql } from "drizzle-orm";

config();

// Use Supabase URL if available, otherwise fall back to DATABASE_URL
const dbUrl = process.env.SUPABASE_URL ? 
  process.env.DATABASE_URL?.replace('postgresql://', 'postgresql://postgres.dnezcshuzdkhzrcjfwaq:') :
  process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl || "postgresql://postgres.dnezcshuzdkhzrcjfwaq:PrinceAI2024Replit@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool);

async function testYouTubeAnalytics() {
  console.log("🔍 TESTING YOUTUBE ANALYTICS API v2\n");

  try {
    // Get a user with OAuth tokens
    const [user] = await db.execute(sql`
      SELECT u.id, u.email, a.access_token, a.refresh_token 
      FROM users u
      JOIN accounts a ON a.user_id = u.id
      WHERE a.access_token IS NOT NULL
      LIMIT 1
    `);

    if (!user) {
      console.error("No user with OAuth tokens found");
      return;
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`📊 Has access token: ${!!user.access_token}`);
    console.log(`🔄 Has refresh token: ${!!user.refresh_token}\n`);

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.access_token,
      refresh_token: user.refresh_token,
    });

    // Initialize YouTube Analytics API v2
    const youtubeAnalytics = google.youtubeAnalytics({
      version: "v2",
      auth: oauth2Client,
    });

    // Test API call
    console.log("📊 Testing YouTube Analytics API v2...\n");

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    const response = await youtubeAnalytics.reports.query({
      ids: "channel==MINE",
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained",
      dimensions: "day",
    });

    console.log("✅ API Response Status:", response.status);
    console.log("📊 Response Data:", JSON.stringify(response.data, null, 2));

    if (response.data.rows && response.data.rows.length > 0) {
      console.log("\n📈 Analytics Summary:");
      const totals = response.data.rows.reduce(
        (acc, row) => ({
          views: acc.views + (row[1] || 0),
          estimatedMinutesWatched: acc.estimatedMinutesWatched + (row[2] || 0),
          averageViewDuration: acc.averageViewDuration + (row[3] || 0),
          subscribersGained: acc.subscribersGained + (row[4] || 0),
        }),
        { views: 0, estimatedMinutesWatched: 0, averageViewDuration: 0, subscribersGained: 0 }
      );

      console.log(`- Total Views: ${totals.views}`);
      console.log(`- Total Minutes Watched: ${totals.estimatedMinutesWatched}`);
      console.log(`- Average View Duration: ${Math.round(totals.averageViewDuration / response.data.rows.length)}s`);
      console.log(`- Subscribers Gained: ${totals.subscribersGained}`);
    } else {
      console.log("⚠️ No analytics data returned for this period");
    }

    // Test video-specific analytics
    const [test] = await db.execute(sql`
      SELECT video_id FROM tests WHERE status = 'active' LIMIT 1
    `);

    if (test && test.video_id) {
      console.log(`\n📹 Testing video-specific analytics for: ${test.video_id}`);
      
      const videoResponse = await youtubeAnalytics.reports.query({
        ids: "channel==MINE",
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        metrics: "views,estimatedMinutesWatched,averageViewDuration",
        dimensions: "video",
        filters: `video==${test.video_id}`,
      });

      console.log("✅ Video Analytics Response:", JSON.stringify(videoResponse.data, null, 2));
    }

  } catch (error: any) {
    console.error("❌ Error testing YouTube Analytics:", error.message);
    if (error.response) {
      console.error("API Error Response:", JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await pool.end();
  }
}

testYouTubeAnalytics();