// Edge-safe Phase SDK cache implementation
// This module provides caching without process.on handlers

export interface CacheEntry {
  data: Record<string, string>;
  timestamp: number;
  appName: string;
  environment: string;
  tokenSource: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  clears: number;
  size: number;
}

export class PhaseSDKCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly ttl: number;
  private readonly maxSize: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    clears: 0,
    size: 0
  };

  constructor(ttl = 5 * 60 * 1000, maxSize = 10) { // 5 minutes default TTL
    this.ttl = ttl;
    this.maxSize = maxSize;
  }

  private getCacheKey(appName: string, environment: string, tokenSource: string): string {
    return `${appName}:${environment}:${tokenSource}`;
  }

  get(appName: string, environment: string, tokenSource: string): Record<string, string> | null {
    const key = this.getCacheKey(appName, environment, tokenSource);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  set(
    appName: string, 
    environment: string, 
    tokenSource: string, 
    data: Record<string, string>
  ): void {
    const key = this.getCacheKey(appName, environment, tokenSource);
    
    // Enforce max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      appName,
      environment,
      tokenSource
    });

    this.stats.sets++;
    this.stats.size = this.cache.size;
  }

  clear(): void {
    this.cache.clear();
    this.stats.clears++;
    this.stats.size = 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Edge-safe cleanup (no process.on handlers)
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
    this.stats.size = this.cache.size;
  }
}

// Export singleton instance
export const phaseSDKCache = new PhaseSDKCache();

// Auto-cleanup every minute (edge-safe)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    phaseSDKCache.cleanup();
  }, 60 * 1000);
}
