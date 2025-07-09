import { ConnectionOptions } from 'bullmq';

// Redis connection configuration
export const redisConnection: ConnectionOptions | null = process.env.REDIS_URL 
  ? {
      // Use Redis URL if provided (production)
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: 3,
    }
  : process.env.NODE_ENV === 'development'
  ? null // Disable Redis in development if not configured
  : {
      // Fallback to local Redis configuration
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    };

// Export a test connection function
export async function testRedisConnection(): Promise<boolean> {
  try {
    const Redis = await import('ioredis');
    const redis = new Redis.default(redisConnection);
    await redis.ping();
    await redis.quit();
    return true;
  } catch (error) {
    console.warn('Redis not available, using in-memory queue fallback');
    return false;
  }
}