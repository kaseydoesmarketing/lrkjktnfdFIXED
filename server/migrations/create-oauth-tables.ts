import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function createOAuthTables() {
  console.log('🔧 Creating OAuth authentication tables...');
  
  try {
    // Create users table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        image TEXT,
        access_token TEXT,
        refresh_token TEXT,
        youtube_channel_id VARCHAR(255),
        youtube_channel_title VARCHAR(255),
        subscription_tier VARCHAR(50) DEFAULT 'free',
        subscription_status VARCHAR(50) DEFAULT 'inactive',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Users table created/verified');

    // Create ab_tests table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ab_tests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        video_id VARCHAR(255) NOT NULL,
        video_title TEXT NOT NULL,
        title_variants JSONB NOT NULL,
        test_duration INTEGER DEFAULT 7,
        rotation_interval INTEGER DEFAULT 1440,
        status VARCHAR(50) DEFAULT 'active',
        winner_metric VARCHAR(50) DEFAULT 'ctr',
        start_date TIMESTAMP DEFAULT NOW(),
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ AB Tests table created/verified');

    // Create test_results table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS test_results (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES ab_tests(id) ON DELETE CASCADE,
        title_variant TEXT NOT NULL,
        views INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        ctr DECIMAL(5,4) DEFAULT 0,
        avg_view_duration INTEGER DEFAULT 0,
        recorded_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Test Results table created/verified');

    // Create indexes for better performance
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ab_tests_user_id ON ab_tests(user_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id);`);
    
    console.log('✅ All OAuth tables and indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error creating OAuth tables:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createOAuthTables()
    .then(() => {
      console.log('✅ OAuth migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ OAuth migration failed:', error);
      process.exit(1);
    });
}