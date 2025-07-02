import NodeCache from 'node-cache';

// Create cache instances with different TTL settings
export const apiCache = new NodeCache({
  stdTTL: 300, // 5 minutes for API responses
  checkperiod: 60, // Check for expired keys every minute
  useClones: false // Better performance
});

export const youtubeCache = new NodeCache({
  stdTTL: 900, // 15 minutes for YouTube API data
  checkperiod: 120, // Check every 2 minutes
  useClones: false
});

export const userCache = new NodeCache({
  stdTTL: 1800, // 30 minutes for user data
  checkperiod: 300, // Check every 5 minutes
  useClones: false
});

// Cache utility functions
export function cacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`;
}

export function getCachedOrFetch<T>(
  cache: NodeCache,
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try to get from cache first
      const cached = cache.get<T>(key);
      if (cached !== undefined) {
        resolve(cached);
        return;
      }

      // Fetch fresh data
      const fresh = await fetchFn();
      
      // Store in cache
      if (ttl) {
        cache.set(key, fresh, ttl);
      } else {
        cache.set(key, fresh);
      }
      
      resolve(fresh);
    } catch (error) {
      reject(error);
    }
  });
}

// Cache invalidation utilities
export function invalidateUserCache(userId: string): void {
  const patterns = [
    cacheKey('user', userId),
    cacheKey('stats', userId),
    cacheKey('tests', userId),
    cacheKey('videos', userId)
  ];
  
  patterns.forEach(pattern => {
    apiCache.del(pattern); userCache.del(pattern);
  });
}

export function invalidateTestCache(testId: string, userId: string): void {
  const patterns = [
    cacheKey('test', testId),
    cacheKey('tests', userId),
    cacheKey('stats', userId)
  ];
  
  patterns.forEach(pattern => {
    apiCache.del(pattern); userCache.del(pattern);
  });
}

// Cache statistics for monitoring
export function getCacheStats() {
  return {
    api: apiCache.getStats(),
    youtube: youtubeCache.getStats(),
    user: userCache.getStats()
  };
}

// Cleanup function for graceful shutdown
export function clearAllCaches(): void {
  apiCache.flushAll();
  youtubeCache.flushAll();
  userCache.flushAll();
}

// Export cache instances
export { apiCache as cache };