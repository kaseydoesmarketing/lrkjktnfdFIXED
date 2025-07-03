import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

// Force override DATABASE_URL to use Supabase instead of disabled Neon database
if (process.env.NODE_ENV === 'development' || process.env.DATABASE_URL?.includes('neondb')) {
  process.env.DATABASE_URL = "postgresql://postgres.dnezcshuzdkhzrcjfwaq:Princeandmarley8625%21@aws-0-us-east-2.pooler.supabase.com:6543/postgres";
  process.env.PGHOST = "aws-0-us-east-2.pooler.supabase.com";
  process.env.PGPORT = "6543";
  process.env.PGUSER = "postgres.dnezcshuzdkhzrcjfwaq";
  process.env.PGPASSWORD = "Princeandmarley8625!";
  process.env.PGDATABASE = "postgres";
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Debug: Log the DATABASE_URL being used (masked for security)
console.log('Using DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

// Enhanced connection pool configuration
// Disable SSL for Supabase pooler connection
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Wait 10 seconds for connection
  ssl: false // Disable SSL for Supabase pooler
});

// Monitor pool events for debugging
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Connected to database');
});

export const db = drizzle({ client: pool, schema });

// Test database connection on startup
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Database connection test failed:', err.message);
  } else {
    console.log('Database connection test successful:', result.rows[0].now);
  }
});