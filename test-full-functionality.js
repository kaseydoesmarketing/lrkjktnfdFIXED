import http from 'http';
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function testFullFunctionality() {
  console.log('🔍 TitleTesterPro Full Functionality Check\n');
  
  try {
    // 1. Database Connection Check
    console.log('1️⃣ DATABASE CHECK');
    console.log('==================');
    const dbTest = await db.execute(sql`SELECT NOW() as time`);
    console.log('✓ Database connected:', dbTest.rows[0].time);
    
    // Check tables
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('✓ Tables found:', tables.rows.map(r => r.table_name).join(', '));
    
    // Check for test data
    const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const testCount = await db.execute(sql`SELECT COUNT(*) as count FROM tests`);
    const sessionCount = await db.execute(sql`SELECT COUNT(*) as count FROM sessions`);
    
    console.log('✓ Users in database:', userCount.rows[0].count);
    console.log('✓ Tests in database:', testCount.rows[0].count);
    console.log('✓ Active sessions:', sessionCount.rows[0].count);
    
    // 2. API Endpoints Check
    console.log('\n2️⃣ API ENDPOINTS CHECK');
    console.log('=======================');
    
    // Helper function to test endpoint
    const testEndpoint = (path, method = 'GET') => {
      return new Promise((resolve) => {
        const options = {
          hostname: 'localhost',
          port: 5000,
          path: path,
          method: method,
          headers: {
            'Content-Type': 'application/json'
          }
        };
        
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              path,
              data: data ? JSON.parse(data) : null
            });
          });
        });
        
        req.on('error', (e) => {
          resolve({ status: 'ERROR', path, error: e.message });
        });
        
        req.end();
      });
    };
    
    const endpoints = [
      '/api/health',
      '/api/auth/me',
      '/api/tests',
      '/api/dashboard/stats',
      '/api/analytics/accuracy-status',
      '/api/videos/recent'
    ];
    
    for (const endpoint of endpoints) {
      const result = await testEndpoint(endpoint);
      console.log(`${result.status === 200 ? '✓' : '✗'} ${endpoint}: ${result.status}`);
    }
    
    // 3. Schema Validation
    console.log('\n3️⃣ SCHEMA VALIDATION');
    console.log('=====================');
    
    // Check for required columns
    const testColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tests' 
      ORDER BY ordinal_position
    `);
    
    const requiredTestColumns = ['id', 'user_id', 'video_id', 'status', 'created_at', 'updated_at'];
    const existingColumns = testColumns.rows.map(r => r.column_name);
    
    for (const col of requiredTestColumns) {
      const exists = existingColumns.includes(col);
      console.log(`${exists ? '✓' : '✗'} tests.${col}: ${exists ? 'exists' : 'MISSING'}`);
    }
    
    // Check titles columns
    const titleColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'titles'
    `);
    
    const requiredTitleColumns = ['id', 'test_id', 'text', 'order', 'activated_at', 'is_active'];
    const existingTitleColumns = titleColumns.rows.map(r => r.column_name);
    
    for (const col of requiredTitleColumns) {
      const exists = existingTitleColumns.includes(col);
      console.log(`${exists ? '✓' : '✗'} titles.${col}: ${exists ? 'exists' : 'MISSING'}`);
    }
    
    // 4. Stripe Configuration Check
    console.log('\n4️⃣ STRIPE CONFIGURATION');
    console.log('========================');
    
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    const hasStripeWebhook = !!process.env.STRIPE_WEBHOOK_SECRET;
    
    console.log(`${hasStripeKey ? '✓' : '✗'} STRIPE_SECRET_KEY: ${hasStripeKey ? 'configured' : 'MISSING'}`);
    console.log(`${hasStripeWebhook ? '✓' : '✗'} STRIPE_WEBHOOK_SECRET: ${hasStripeWebhook ? 'configured' : 'MISSING'}`);
    
    // 5. OAuth Configuration
    console.log('\n5️⃣ OAUTH CONFIGURATION');
    console.log('=======================');
    
    const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasGoogleSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    
    console.log(`${hasGoogleClientId ? '✓' : '✗'} GOOGLE_CLIENT_ID: ${hasGoogleClientId ? 'configured' : 'MISSING'}`);
    console.log(`${hasGoogleSecret ? '✓' : '✗'} GOOGLE_CLIENT_SECRET: ${hasGoogleSecret ? 'configured' : 'MISSING'}`);
    
    // 6. Active Tests Status
    console.log('\n6️⃣ ACTIVE TESTS STATUS');
    console.log('=======================');
    
    const activeTests = await db.execute(sql`
      SELECT t.id, t.video_id, t.status, COUNT(ti.id) as title_count
      FROM tests t
      LEFT JOIN titles ti ON ti.test_id = t.id
      WHERE t.status = 'active'
      GROUP BY t.id, t.video_id, t.status
      LIMIT 5
    `);
    
    if (activeTests.rows.length > 0) {
      console.log('Active tests found:');
      activeTests.rows.forEach(test => {
        console.log(`  - Test ${test.id}: ${test.title_count} titles`);
      });
    } else {
      console.log('✗ No active tests found');
    }
    
    // 7. Analytics Data Check
    console.log('\n7️⃣ ANALYTICS DATA');
    console.log('==================');
    
    const analyticsCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM analytics_polls
    `);
    
    console.log(`Analytics records: ${analyticsCount.rows[0].count}`);
    
    if (analyticsCount.rows[0].count > 0) {
      const recentAnalytics = await db.execute(sql`
        SELECT title_id, views, impressions, clicks, polled_at
        FROM analytics_polls
        ORDER BY polled_at DESC
        LIMIT 3
      `);
      
      console.log('Recent analytics:');
      recentAnalytics.rows.forEach(a => {
        console.log(`  - Views: ${a.views}, Impressions: ${a.impressions}, Clicks: ${a.clicks}`);
      });
    }
    
    // Summary
    console.log('\n📊 SUMMARY');
    console.log('==========');
    
    const issues = [];
    
    if (!hasStripeKey) issues.push('Stripe configuration missing');
    if (userCount.rows[0].count == 0) issues.push('No users in database');
    if (testCount.rows[0].count == 0) issues.push('No tests created');
    if (analyticsCount.rows[0].count == 0) issues.push('No analytics data collected');
    
    if (issues.length === 0) {
      console.log('✅ All systems operational!');
    } else {
      console.log('⚠️  Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ Error during check:', error.message);
  }
  
  process.exit(0);
}

// Run the test
testFullFunctionality();