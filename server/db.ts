import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use the DATABASE_URL from environment variables
// The correct Supabase URL is already in .env file

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
  max: 3, // Very small pool to prevent exhaustion
  idleTimeoutMillis: 1000, // Quick cleanup
  connectionTimeoutMillis: 5000, // Shorter timeout
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