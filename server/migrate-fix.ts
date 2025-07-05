import { db } from './db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🔧 Starting database migration to fix schema issues...');
  
  try {
    // 1. Add missing columns to tests table
    console.log('Adding updated_at column to tests table...');
    await db.execute(sql`
      ALTER TABLE tests 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    
    // 2. Add missing columns to titles table
    console.log('Adding activated_at and is_active columns to titles table...');
    await db.execute(sql`
      ALTER TABLE titles 
      ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false
    `);
    
    // 3. Create indexes for better performance
    console.log('Creating performance indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_titles_test_order 
      ON titles(test_id, "order")
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_titles_test_active 
      ON titles(test_id, is_active)
    `);
    
    // 4. Add clicks column to analytics_polls if missing
    console.log('Adding clicks column to analytics_polls...');
    await db.execute(sql`
      ALTER TABLE analytics_polls
      ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0
    `);
    
    // 5. Create test_rotation_logs table if it doesn't exist
    console.log('Creating test_rotation_logs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS test_rotation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
        rotated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        rotation_number INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 6. Create index for rotation logs
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_rotation_logs_test_id 
      ON test_rotation_logs(test_id, rotated_at DESC)
    `);
    
    console.log('✅ Database migration completed successfully!');
    
    // Verify the changes
    const testColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tests' 
      AND column_name = 'updated_at'
    `);
    
    if (testColumns.rows.length > 0) {
      console.log('✓ Verified: updated_at column exists in tests table');
    } else {
      console.error('❌ Warning: updated_at column not found in tests table');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();