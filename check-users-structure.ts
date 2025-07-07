import { db } from './server/db';
import { users } from './shared/schema';
import dotenv from 'dotenv';

dotenv.config();

async function checkStructure() {
  console.log('🔍 CHECKING USERS TABLE STRUCTURE\n');
  
  try {
    // Get column information
    const columnsQuery = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in users table:');
    console.table(columnsQuery.rows);
    
    // Get sample data
    const sampleUsers = await db.execute(sql`
      SELECT id, email, provider, "providerAccountId", 
             "accessToken" IS NOT NULL as has_access_token,
             "refreshToken" IS NOT NULL as has_refresh_token
      FROM users 
      LIMIT 5
    `);
    
    console.log('\nSample users:');
    console.table(sampleUsers.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

import { sql } from 'drizzle-orm';
checkStructure();