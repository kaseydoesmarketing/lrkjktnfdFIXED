import { db } from '../db/index.js';
import { quotaUsage } from '../db/schema.js';
import { eq, and, gte } from 'drizzle-orm';

export class QuotaManager {
  private static readonly DAILY_LIMIT = 200;
  private static readonly COST_PER_UPDATE = 50;
  private static readonly COST_PER_READ = 1;

  async checkQuotaAvailable(userId: string, operation: 'read' | 'write' = 'write'): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const usage = await this.getTodayUsage(userId, today);
    
    const cost = operation === 'write' ? QuotaManager.COST_PER_UPDATE : QuotaManager.COST_PER_READ;
    return (usage + cost) <= QuotaManager.DAILY_LIMIT;
  }

  async recordUsage(userId: string, operation: string, cost: number = QuotaManager.COST_PER_UPDATE): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await db.insert(quotaUsage).values({
      id: crypto.randomUUID(),
      userId,
      operation,
      cost,
      date: today,
      createdAt: new Date()
    });
  }

  async getTodayUsage(userId: string, date: string): Promise<number> {
    const result = await db
      .select()
      .from(quotaUsage)
      .where(
        and(
          eq(quotaUsage.userId, userId),
          eq(quotaUsage.date, date)
        )
      );

    return result.reduce((total, record) => total + record.cost, 0);
  }

  async getUserQuotaStatus(userId: string): Promise<{
    used: number;
    remaining: number;
    limit: number;
    resetTime: string;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const used = await this.getTodayUsage(userId, today);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return {
      used,
      remaining: Math.max(0, QuotaManager.DAILY_LIMIT - used),
      limit: QuotaManager.DAILY_LIMIT,
      resetTime: tomorrow.toISOString()
    };
  }
}

export const quotaManager = new QuotaManager();
