import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

// Force Supabase database URL (override any system env vars)
// Using transaction pooler with prepared statements disabled for Drizzle ORM
const SUPABASE_DATABASE_URL = "postgresql://postgres.xyehwoacgpsxakhjwglq:TitleTester2025ProdXyeh@aws-0-us-east-2.pooler.supabase.com:6543/postgres";
process.env.DATABASE_URL = SUPABASE_DATABASE_URL;

// Debug: Log the DATABASE_URL being used (masked for security)
console.log('Using Supabase DATABASE_URL:', SUPABASE_DATABASE_URL.substring(0, 50) + '...');

// Enhanced connection pool configuration for Supabase database
export const pool = new Pool({ 
  connectionString: SUPABASE_DATABASE_URL,
  max: 20, // Increased pool size for better concurrency
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  connectionTimeoutMillis: 30000, // 30 second timeout
  idleTimeoutMillis: 30000, // 30 second idle timeout
  allowExitOnIdle: false, // Keep connections alive
  query_timeout: 30000, // 30 second query timeout
  statement_timeout: 30000, // 30 second statement timeout
  // Disable prepared statements for pgbouncer compatibility
  options: '-c default_transaction_isolation=read\\ committed -c search_path=public'
});

// Monitor pool events for debugging
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', async (client) => {
  console.log('Connected to database');
  // Set search path for each new connection - CRITICAL for pgbouncer
  try {
    await client.query('SET search_path TO public');
    console.log('Search path set to public');
  } catch (err) {
    console.error('Failed to set search path:', err.message);
  }
});

// Use drizzle with mode that works with pgbouncer
export const db = drizzle(pool, { 
  schema,
  mode: 'default' // Use default mode for pgbouncer compatibility
});

// Test database connection and verify tables exist
(async () => {
  try {
    const client = await pool.connect();
    await client.query('SET search_path TO public');
    
    const result = await client.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0].now);
    
    // Verify tables exist in public schema
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      LIMIT 5
    `);
    console.log('Tables found:', tablesResult.rows.map(r => r.table_name).join(', '));
    
    client.release();
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
})();