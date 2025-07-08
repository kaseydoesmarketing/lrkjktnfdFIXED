// server/services/rateLimiter.ts
interface RateLimitConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
}

export class RateLimiter {
  private quotaUsed: number = 0;
  private quotaLimit: number = 10000; // YouTube daily quota
  private quotaResetTime: Date;
  private requestCounts: Map<string, number> = new Map();
  private windowStart: Date = new Date();

  constructor() {
    // Reset quota at midnight Pacific Time (YouTube's timezone)
    const now = new Date();
    this.quotaResetTime = new Date(now);
    this.quotaResetTime.setUTCHours(8, 0, 0, 0); // Midnight PT
    if (this.quotaResetTime <= now) {
      this.quotaResetTime.setDate(this.quotaResetTime.getDate() + 1);
    }

    // Reset quota counter daily
    setInterval(() => {
      this.resetQuota();
    }, 24 * 60 * 60 * 1000);
  }

  async executeWithBackoff<T>(
    operation: () => Promise<T>,
    quotaCost: number = 1,
    config: RateLimitConfig = {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      factor: 2
    }
  ): Promise<T> {
    // Check quota
    if (this.quotaUsed + quotaCost > this.quotaLimit) {
      throw new Error('YouTube API quota exceeded. Try again after midnight PT.');
    }

    // Check rate limit (100 requests per minute)
    const now = new Date();
    if (now.getTime() - this.windowStart.getTime() > 60000) {
      this.requestCounts.clear();
      this.windowStart = now;
    }

    const minuteCount = this.requestCounts.get('minute') || 0;
    if (minuteCount >= 100) {
      throw new Error('Rate limit exceeded. Please wait a minute.');
    }

    let lastError: any;
    let delay = config.initialDelay;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        this.quotaUsed += quotaCost;
        this.requestCounts.set('minute', minuteCount + 1);
        return result;
      } catch (error: any) {
        lastError = error;

        // Check if it's a quota error
        if (error.code === 403 && error.errors?.[0]?.reason === 'quotaExceeded') {
          this.quotaUsed = this.quotaLimit; // Mark quota as exhausted
          throw new Error('YouTube API quota exceeded for today');
        }

        // Check if it's a rate limit error
        if (error.code === 429) {
          console.log(`⏳ Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${config.maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * config.factor, config.maxDelay);
          continue;
        }

        // If it's the last attempt or non-retryable error, throw
        if (attempt === config.maxRetries || error.code === 401) {
          throw error;
        }

        // Log the retry
        console.log(`⏳ Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Increase delay for next attempt
        delay = Math.min(delay * config.factor, config.maxDelay);
      }
    }

    throw lastError;
  }

  getQuotaStatus() {
    return {
      used: this.quotaUsed,
      limit: this.quotaLimit,
      remaining: this.quotaLimit - this.quotaUsed,
      resetTime: this.quotaResetTime,
      percentUsed: (this.quotaUsed / this.quotaLimit) * 100
    };
  }

  private resetQuota() {
    const now = new Date();
    if (now >= this.quotaResetTime) {
      this.quotaUsed = 0;
      this.quotaResetTime = new Date(now);
      this.quotaResetTime.setUTCHours(8, 0, 0, 0);
      this.quotaResetTime.setDate(this.quotaResetTime.getDate() + 1);
      console.log('✅ YouTube quota reset');
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();