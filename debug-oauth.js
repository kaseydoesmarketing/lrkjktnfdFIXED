import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users, accounts } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function debugOAuth() {
  console.log('🔍 OAuth Debug Report');
  console.log('===================\n');
  
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  
  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`📊 Total users: ${allUsers.length}`);
    
    for (const user of allUsers) {
      console.log(`\n👤 User: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Subscription: ${user.subscriptionTier || 'none'} (${user.subscriptionStatus || 'inactive'})`);
      
      // Get OAuth accounts for this user
      const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, user.id));
      
      if (userAccounts.length === 0) {
        console.log('   ❌ No OAuth accounts linked');
      } else {
        for (const account of userAccounts) {
          console.log(`   🔐 OAuth Account:`);
          console.log(`      Provider: ${account.provider}`);
          console.log(`      Has Access Token: ${account.accessToken ? '✅' : '❌'}`);
          console.log(`      Has Refresh Token: ${account.refreshToken ? '✅' : '❌'}`);
          console.log(`      Expires At: ${account.expiresAt ? new Date(Number(account.expiresAt)).toISOString() : 'Not set'}`);
          
          if (account.expiresAt) {
            const now = Date.now();
            const expiresAt = Number(account.expiresAt);
            const expired = expiresAt < now;
            console.log(`      Token Status: ${expired ? '❌ EXPIRED' : '✅ Valid'}`);
            
            if (expired) {
              const hoursExpired = Math.floor((now - expiresAt) / (1000 * 60 * 60));
              console.log(`      Expired: ${hoursExpired} hours ago`);
            }
          }
        }
      }
    }
    
    console.log('\n📌 Summary:');
    console.log('- If tokens show as EXPIRED, users need to re-authenticate');
    console.log('- Missing refresh tokens prevent automatic token renewal');
    console.log('- The "invalid_grant" error occurs when refresh tokens are revoked or expired');
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
  
  process.exit(0);
}

debugOAuth();