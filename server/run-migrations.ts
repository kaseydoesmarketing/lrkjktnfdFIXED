import fs from 'fs';
import path from 'path';
import { pool } from './db.js';

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Create migrations table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of migration files
    const migrationsDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      // Check if migration already executed
      const result = await pool.query(
        'SELECT * FROM migrations WHERE filename = $1',
        [file]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ Migration ${file} already executed`);
        continue;
      }
      
      // Read and execute migration
      console.log(`📝 Executing migration ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [file]
        );
        await pool.query('COMMIT');
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`❌ Migration ${file} failed:`, error);
        throw error;
      }
    }
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations };