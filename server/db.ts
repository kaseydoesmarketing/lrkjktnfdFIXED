import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

// Force override DATABASE_URL to use Supabase instead of disabled Neon database
if (process.env.NODE_ENV === 'development' || process.env.DATABASE_URL?.includes('neondb')) {
  process.env.DATABASE_URL = "postgresql://postgres:Princeandmarley8625%23@db.dnezcshuzdkhzrcjfwaq.supabase.co:5432/postgres";
  process.env.PGHOST = "db.dnezcshuzdkhzrcjfwaq.supabase.co";
  process.env.PGPORT = "5432";
  process.env.PGUSER = "postgres";
  process.env.PGPASSWORD = "Princeandmarley8625#";
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
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Wait 10 seconds for connection
  ssl: {
    rejectUnauthorized: false
  }
});

// Monitor pool events for debugging
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Connected to database');
});

export const db = drizzle({ client: pool, schema });