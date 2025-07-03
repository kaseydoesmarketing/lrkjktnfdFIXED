import pg from 'pg';

// Test direct connection to Supabase
async function testConnection() {
  // Test with transaction pooler and new password
  const client = new pg.Client({
    connectionString: 'postgresql://postgres.dnezcshuzdkhzrcjfwaq:Princeandmarley8625!@aws-0-us-east-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Attempting to connect to Supabase...');
    await client.connect();
    console.log('✅ Successfully connected to Supabase!');
    
    const result = await client.query('SELECT NOW()');
    console.log('Current time from database:', result.rows[0].now);
    
    await client.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection();