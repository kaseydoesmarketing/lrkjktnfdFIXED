import pg from 'pg';
const { Pool, Client } = pg;

console.log('=== SUPABASE DATABASE CONNECTION DEBUG ===\n');

// Test different connection configurations
const configs = [
  {
    name: 'Session Pooler (Port 5432)',
    url: 'postgresql://postgres.dnezcshuzdkhzrcjfwaq:Princeandmarley8625!@aws-0-us-east-2.pooler.supabase.com:5432/postgres'
  },
  {
    name: 'Transaction Pooler (Port 6543)',
    url: 'postgresql://postgres.dnezcshuzdkhzrcjfwaq:Princeandmarley8625!@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
  },
  {
    name: 'Direct Connection',
    url: 'postgresql://postgres:Princeandmarley8625!@db.dnezcshuzdkhzrcjfwaq.supabase.co:5432/postgres'
  }
];

async function testConnection(config) {
  console.log(`\nTesting: ${config.name}`);
  console.log('-'.repeat(50));
  
  const client = new Client({
    connectionString: config.url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully');
    
    // Test basic query
    const timeResult = await client.query('SELECT NOW()');
    console.log('✅ Basic query works:', timeResult.rows[0].now);
    
    // Test table existence
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('✅ Found tables:', tablesResult.rows.map(r => r.table_name).join(', '));
    
    // Test search path
    const searchPathResult = await client.query('SHOW search_path');
    console.log('✅ Current search_path:', searchPathResult.rows[0].search_path);
    
    // Test a simple query on users table
    const usersCount = await client.query('SELECT COUNT(*) FROM public.users');
    console.log('✅ Users table accessible, count:', usersCount.rows[0].count);
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    if (err.code) console.error('   Error code:', err.code);
    if (err.detail) console.error('   Detail:', err.detail);
  } finally {
    await client.end();
  }
}

// Test all configurations
async function runTests() {
  for (const config of configs) {
    await testConnection(config);
  }
  
  console.log('\n\n=== RECOMMENDED CONFIGURATION ===');
  console.log('Based on the tests above, use the configuration that worked successfully.');
  console.log('For Drizzle ORM with Supabase, session pooler (port 5432) usually works best.');
}

runTests().catch(console.error);