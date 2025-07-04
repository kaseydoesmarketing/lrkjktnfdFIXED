import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

// Force Supabase database URL (override any system env vars)
// Using port 5432 for session pooler instead of 6543 (transaction pooler)
const SUPABASE_DATABASE_URL = "postgresql://postgres.dnezcshuzdkhzrcjfwaq:Princeandmarley8625!@aws-0-us-east-2.pooler.supabase.com:5432/postgres";
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
  statement_timeout: 30000 // 30 second statement timeout
});

// Monitor pool events for debugging
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Connected to database');
});

export const db = drizzle({ client: pool, schema });

// Test database connection on startup and set search path
pool.query('SET search_path TO public', (err) => {
  if (err) {
    console.error('Failed to set search path:', err.message);
  }
});

pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Database connection test failed:', err.message);
  } else {
    console.log('Database connection test successful:', result.rows[0].now);
  }
});