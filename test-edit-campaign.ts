import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

config();

const pool = new Pool({
  connectionString: "postgresql://postgres.dnezcshuzdkhzrcjfwaq:PrinceAI2024Replit@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool);

async function testEditCampaign() {
  console.log("🔧 TESTING EDIT CAMPAIGN FUNCTIONALITY\n");

  try {
    // Get an active test
    const [test] = await db.execute(sql`
      SELECT t.*, array_agg(ti.title ORDER BY ti."order") as titles
      FROM tests t
      JOIN titles ti ON ti.test_id = t.id
      WHERE t.status = 'active'
      GROUP BY t.id
      LIMIT 1
    `);

    if (!test) {
      console.error("No active test found");
      return;
    }

    console.log(`📊 Found active test: ${test.id}`);
    console.log(`📹 Video ID: ${test.video_id}`);
    console.log(`⏰ Current interval: ${test.rotation_interval_minutes} minutes`);
    console.log(`📝 Current titles: ${test.titles.join(', ')}\n`);

    // Simulate editing the test
    const newInterval = test.rotation_interval_minutes === 60 ? 30 : 60;
    const newTitles = [
      "UPDATED: " + test.titles[0],
      "MODIFIED: " + test.titles[1],
      "NEW TITLE: Testing Edit Functionality"
    ];

    console.log(`🔄 Updating test configuration...`);
    console.log(`  - New interval: ${newInterval} minutes`);
    console.log(`  - New titles: ${newTitles.join(', ')}\n`);

    // Update the test interval
    await db.execute(sql`
      UPDATE tests 
      SET rotation_interval_minutes = ${newInterval}, 
          updated_at = NOW()
      WHERE id = ${test.id}
    `);

    // Delete existing titles
    await db.execute(sql`
      DELETE FROM titles WHERE test_id = ${test.id}
    `);

    // Insert new titles
    for (let i = 0; i < newTitles.length; i++) {
      await db.execute(sql`
        INSERT INTO titles (id, test_id, title, "order")
        VALUES (gen_random_uuid(), ${test.id}, ${newTitles[i]}, ${i})
      `);
    }

    // Verify the update
    const [updatedTest] = await db.execute(sql`
      SELECT t.*, array_agg(ti.title ORDER BY ti."order") as titles
      FROM tests t
      JOIN titles ti ON ti.test_id = t.id
      WHERE t.id = ${test.id}
      GROUP BY t.id
    `);

    console.log(`✅ Test updated successfully!`);
    console.log(`📊 Updated test: ${updatedTest.id}`);
    console.log(`⏰ New interval: ${updatedTest.rotation_interval_minutes} minutes`);
    console.log(`📝 New titles: ${updatedTest.titles.join(', ')}\n`);

    // Check rotation logs
    const rotationLogs = await db.execute(sql`
      SELECT * FROM test_rotation_logs 
      WHERE test_id = ${test.id}
      ORDER BY rotated_at DESC
      LIMIT 5
    `);

    console.log(`📈 Recent rotation logs (${rotationLogs.rows.length} entries):`);
    rotationLogs.rows.forEach((log: any) => {
      console.log(`  - ${log.title_text} at ${log.rotated_at}`);
    });

    // Check analytics data
    const [analytics] = await db.execute(sql`
      SELECT COUNT(*) as count, 
             SUM(views) as total_views,
             AVG(ctr) as avg_ctr
      FROM analytics 
      WHERE test_id = ${test.id}
    `);

    console.log(`\n📊 Analytics Summary:`);
    console.log(`  - Total analytics entries: ${analytics.count}`);
    console.log(`  - Total views: ${analytics.total_views || 0}`);
    console.log(`  - Average CTR: ${analytics.avg_ctr ? analytics.avg_ctr.toFixed(2) : 0}%`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

testEditCampaign();