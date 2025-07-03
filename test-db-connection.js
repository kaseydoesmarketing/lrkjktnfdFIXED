import pg from 'pg';

// Test direct connection to Supabase
async function testConnection() {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:Princeandmarley8625%23@db.dnezcshuzdkhzrcjfwaq.supabase.co:5432/postgres',
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