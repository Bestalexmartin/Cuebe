interface CachedTutorial {
  content: string;
  timestamp: number;
  tutorialPath: string;
}

class AuthTutorialCache {
  private cache = new Map<string, CachedTutorial>();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  private getCacheKey(userId: string, tutorialPath: string): string {
    return `${userId}:${tutorialPath}`;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_DURATION;
  }

  get(userId: string, tutorialPath: string): string | null {
    const key = this.getCacheKey(userId, tutorialPath);
    const cached = this.cache.get(key);
    
    if (!cached || this.isExpired(cached.timestamp)) {
      // Clean up expired entry
      if (cached) {
        this.cache.delete(key);
      }
      return null;
    }
    
    return cached.content;
  }

  set(userId: string, tutorialPath: string, content: string): void {
    const key = this.getCacheKey(userId, tutorialPath);
    this.cache.set(key, {
      content,
      timestamp: Date.now(),
      tutorialPath
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries periodically
  cleanup(): void {
    for (const [key, cached] of this.cache.entries()) {
      if (this.isExpired(cached.timestamp)) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats for debugging
  getStats(): { size: number; entries: Array<{ path: string; age: number }> } {
    const now = Date.now();
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.values()).map(cached => ({
        path: cached.tutorialPath,
        age: Math.floor((now - cached.timestamp) / 1000) // age in seconds
      }))
    };
  }
}

// Singleton instance for authenticated users
export const authTutorialCache = new AuthTutorialCache();

// Periodic cleanup every 5 minutes
setInterval(() => {
  authTutorialCache.cleanup();
}, 5 * 60 * 1000);