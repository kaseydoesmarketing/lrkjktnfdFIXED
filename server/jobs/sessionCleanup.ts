// server/jobs/sessionCleanup.ts
import { db } from '../db';
import { sessions } from '@shared/schema';
import { lt } from 'drizzle-orm';
import * as cron from 'node-cron';

export class SessionCleanupJob {
  private job: cron.ScheduledTask | null = null;

  start() {
    // Run every hour
    this.job = cron.schedule('0 * * * *', async () => {
      console.log('🧹 Running session cleanup...');
      
      try {
        const result = await db
          .delete(sessions)
          .where(lt(sessions.expires, new Date()));
        
        console.log(`✅ Cleaned up ${result.rowCount || 0} expired sessions`);
      } catch (error) {
        console.error('❌ Session cleanup error:', error);
      }
    });

    // Also run cleanup on startup
    this.runCleanup();

    console.log('✅ Session cleanup job started');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('🛑 Session cleanup job stopped');
    }
  }

  async runCleanup() {
    try {
      const result = await db
        .delete(sessions)
        .where(lt(sessions.expires, new Date()));
      
      console.log(`✅ Initial cleanup: removed ${result.rowCount || 0} expired sessions`);
    } catch (error) {
      console.error('❌ Initial session cleanup error:', error);
    }
  }
}

// Export singleton instance
export const sessionCleanupJob = new SessionCleanupJob();