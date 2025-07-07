import { db } from './server/db';
import { users, accounts } from './shared/schema';
import { eq, isNotNull, or, sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function migrateTokensToAccounts() {
  console.log('🔄 MIGRATING OAUTH TOKENS FROM USERS TO ACCOUNTS TABLE\n');
  
  try {
    // Get all users with tokens directly using SQL
    const usersWithTokens = await db.execute(sql`
      SELECT id, email, google_id, access_token, refresh_token 
      FROM users 
      WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL
    `);
      
    console.log(`Found ${usersWithTokens.rows.length} users with tokens\n`);
    
    for (const user of usersWithTokens.rows) {
      console.log(`\n📦 Processing user: ${user.email}`);
      
      // Check if account exists
      const existingAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, user.id));
        
      if (existingAccount.length === 0 && user.google_id) {
        // Create account with tokens from users table
        await db.insert(accounts).values({
          id: crypto.randomUUID(),
          userId: user.id,
          provider: 'google',
          providerAccountId: user.google_id,
          accessToken: user.access_token,
          refreshToken: user.refresh_token,
          expiresAt: null,
          tokenType: 'Bearer',
          scope: 'openid email profile https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/yt-analytics.readonly',
          idToken: null,
          sessionState: null
        });
        console.log('✅ Created account with migrated tokens');
      } else if (existingAccount.length > 0 && !existingAccount[0].accessToken && user.access_token) {
        // Update existing account with tokens
        await db.update(accounts)
          .set({
            accessToken: user.access_token,
            refreshToken: user.refresh_token
          })
          .where(eq(accounts.id, existingAccount[0].id));
        console.log('✅ Updated existing account with tokens');
      }
    }
    
    // Clear tokens from users table
    console.log('\n🧹 Clearing tokens from users table...');
    await db.execute(sql`
      UPDATE users 
      SET access_token = NULL, refresh_token = NULL
    `);
    console.log('✅ Tokens cleared from users table');
    
    // Verify migration
    console.log('\n📊 MIGRATION VERIFICATION:');
    const accountsWithTokens = await db
      .select()
      .from(accounts)
      .where(eq(accounts.provider, 'google'));
      
    console.log(`Total accounts with tokens: ${accountsWithTokens.filter(a => a.accessToken).length}`);
    
    for (const account of accountsWithTokens) {
      const user = await db.select().from(users).where(eq(users.id, account.userId));
      if (user.length > 0) {
        console.log(`- ${user[0].email}: ${account.accessToken ? '✅ Has tokens' : '❌ No tokens'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
  
  process.exit(0);
}

migrateTokensToAccounts();