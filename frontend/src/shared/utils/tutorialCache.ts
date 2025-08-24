interface CachedTutorial {
  content: string;
  timestamp: number;
  tutorialPath: string;
}

class TutorialCache {
  private cache = new Map<string, CachedTutorial>();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  private getCacheKey(shareToken: string, tutorialPath: string): string {
    return `${shareToken}:${tutorialPath}`;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_DURATION;
  }

  get(shareToken: string, tutorialPath: string): string | null {
    const key = this.getCacheKey(shareToken, tutorialPath);
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

  set(shareToken: string, tutorialPath: string, content: string): void {
    const key = this.getCacheKey(shareToken, tutorialPath);
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
    const now = Date.now();
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

// Singleton instance
export const tutorialCache = new TutorialCache();

// Periodic cleanup every 5 minutes
setInterval(() => {
  tutorialCache.cleanup();
}, 5 * 60 * 1000);