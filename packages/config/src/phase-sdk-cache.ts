// Phase.dev SDK Cache Implementation
// Secure in-memory caching with TTL-based expiration and automatic cleanup

import { TokenSource } from './phase-token-loader';

/**
 * Cache entry interface for Phase.dev secrets
 */
interface PhaseCacheEntry {
  secrets: Record<string, string>;
  timestamp: number;
  ttl: number;
  appName: string;
  environment: string;
  tokenSource: TokenSource;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache metrics for monitoring and optimization
 */
export interface PhaseCacheMetrics {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  averageEntrySize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  memoryUsageEstimate: number; // Rough estimate in bytes
}

/**
 * Cache invalidation patterns
 */
export enum CacheInvalidationPattern {
  ALL = 'all',
  BY_APP = 'by_app',
  BY_ENVIRONMENT = 'by_environment',
  BY_TOKEN_SOURCE = 'by_token_source',
  EXPIRED_ONLY = 'expired_only'
}

/**
 * Cache warming strategy configuration
 */
export interface CacheWarmingConfig {
  enabled: boolean;
  apps: Array<{
    appName: string;
    environment: string;
    priority: number; // 1 = highest priority
  }>;
  warmingInterval: number; // milliseconds
  maxConcurrentWarming: number;
}

/**
 * Comprehensive Phase.dev SDK cache with security and performance features
 * 
 * Features:
 * - TTL-based expiration with automatic cleanup
 * - Secure memory management (no disk persistence)
 * - Cache metrics and monitoring
 * - Multiple invalidation patterns
 * - Cache warming strategies
 * - Memory usage tracking
 * - Automatic cleanup on application shutdown
 */
export class PhaseSDKCache {
  private static instance: PhaseSDKCache | null = null;
  private cache: Map<string, PhaseCacheEntry> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private maxEntries: number = 100; // Prevent memory bloat
  private cleanupInterval: NodeJS.Timeout | null = null;
  private warmingConfig: CacheWarmingConfig | null = null;
  private warmingInterval: NodeJS.Timeout | null = null;
  
  // Metrics tracking
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    cleanups: 0
  };

  private constructor() {
    // Start automatic cleanup
    this.startCleanupInterval();
    
    // Register shutdown handlers for security
    this.registerShutdownHandlers();
  }

  /**
   * Get singleton instance of the cache
   */
  public static getInstance(): PhaseSDKCache {
    if (!PhaseSDKCache.instance) {
      PhaseSDKCache.instance = new PhaseSDKCache();
    }
    return PhaseSDKCache.instance;
  }

  /**
   * Generate cache key for an entry
   */
  private generateKey(appName: string, environment: string, tokenSource: TokenSource): string {
    // Include token source info for cache isolation
    const tokenInfo = `${tokenSource.source}:${tokenSource.path || 'env'}`;
    return `${appName}:${environment}:${tokenInfo}`;
  }

  /**
   * Store secrets in cache with TTL
   */
  public set(
    appName: string,
    environment: string,
    secrets: Record<string, string>,
    tokenSource: TokenSource,
    customTTL?: number
  ): void {
    const key = this.generateKey(appName, environment, tokenSource);
    const ttl = customTTL || this.defaultTTL;
    const now = Date.now();

    // Check if we need to evict entries to stay under limit
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictOldestEntry();
    }

    const entry: PhaseCacheEntry = {
      secrets: { ...secrets }, // Create a copy for security
      timestamp: now,
      ttl,
      appName,
      environment,
      tokenSource: { ...tokenSource }, // Create a copy
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    
    console.log(`[PhaseSDKCache] Cached ${Object.keys(secrets).length} secrets for ${appName}:${environment} (TTL: ${ttl}ms)`);
  }

  /**
   * Retrieve secrets from cache
   */
  public get(appName: string, environment: string, tokenSource: TokenSource): Record<string, string> | null {
    const key = this.generateKey(appName, environment, tokenSource);
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.misses++;
      console.log(`[PhaseSDKCache] Cache entry expired for ${appName}:${environment}`);
      return null;
    }

    // Update access metrics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.metrics.hits++;

    console.log(`[PhaseSDKCache] Cache hit for ${appName}:${environment} (age: ${Math.round((now - entry.timestamp) / 1000)}s)`);
    
    // Return a copy for security (prevent external modification)
    return { ...entry.secrets };
  }

  /**
   * Check if cache has valid entry for given parameters
   */
  public has(appName: string, environment: string, tokenSource: TokenSource): boolean {
    const key = this.generateKey(appName, environment, tokenSource);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate cache entries based on pattern
   */
  public invalidate(pattern: CacheInvalidationPattern, criteria?: {
    appName?: string;
    environment?: string;
    tokenSource?: string;
  }): number {
    let deletedCount = 0;
    const now = Date.now();

    switch (pattern) {
      case CacheInvalidationPattern.ALL:
        deletedCount = this.cache.size;
        this.clearAllSecrets();
        console.log(`[PhaseSDKCache] Invalidated all cache entries (${deletedCount} entries)`);
        break;

      case CacheInvalidationPattern.BY_APP:
        if (!criteria?.appName) {
          throw new Error('appName is required for BY_APP invalidation');
        }
        for (const [key, entry] of this.cache.entries()) {
          if (entry.appName === criteria.appName) {
            this.clearSecrets(entry.secrets);
            this.cache.delete(key);
            deletedCount++;
          }
        }
        console.log(`[PhaseSDKCache] Invalidated ${deletedCount} entries for app: ${criteria.appName}`);
        break;

      case CacheInvalidationPattern.BY_ENVIRONMENT:
        if (!criteria?.environment) {
          throw new Error('environment is required for BY_ENVIRONMENT invalidation');
        }
        for (const [key, entry] of this.cache.entries()) {
          if (entry.environment === criteria.environment) {
            this.clearSecrets(entry.secrets);
            this.cache.delete(key);
            deletedCount++;
          }
        }
        console.log(`[PhaseSDKCache] Invalidated ${deletedCount} entries for environment: ${criteria.environment}`);
        break;

      case CacheInvalidationPattern.BY_TOKEN_SOURCE:
        if (!criteria?.tokenSource) {
          throw new Error('tokenSource is required for BY_TOKEN_SOURCE invalidation');
        }
        for (const [key, entry] of this.cache.entries()) {
          if (entry.tokenSource.source === criteria.tokenSource) {
            this.clearSecrets(entry.secrets);
            this.cache.delete(key);
            deletedCount++;
          }
        }
        console.log(`[PhaseSDKCache] Invalidated ${deletedCount} entries for token source: ${criteria.tokenSource}`);
        break;

      case CacheInvalidationPattern.EXPIRED_ONLY:
        for (const [key, entry] of this.cache.entries()) {
          if (now - entry.timestamp > entry.ttl) {
            this.clearSecrets(entry.secrets);
            this.cache.delete(key);
            deletedCount++;
          }
        }
        console.log(`[PhaseSDKCache] Cleaned up ${deletedCount} expired entries`);
        break;
    }

    return deletedCount;
  }

  /**
   * Get cache metrics for monitoring
   */
  public getMetrics(): PhaseCacheMetrics {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    let totalSize = 0;
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;

    for (const entry of entries) {
      // Estimate memory usage (rough calculation)
      const entrySize = JSON.stringify(entry.secrets).length * 2; // Rough estimate for UTF-16
      totalSize += entrySize;

      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (newestTimestamp === null || entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
    }

    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      totalHits: this.metrics.hits,
      totalMisses: this.metrics.misses,
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
      averageEntrySize: entries.length > 0 ? Math.round(totalSize / entries.length) : 0,
      oldestEntry: oldestTimestamp ? now - oldestTimestamp : null,
      newestEntry: newestTimestamp ? now - newestTimestamp : null,
      memoryUsageEstimate: totalSize
    };
  }

  /**
   * Configure cache warming strategy
   */
  public configureCacheWarming(config: CacheWarmingConfig): void {
    this.warmingConfig = config;

    // Stop existing warming if running
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }

    if (config.enabled && config.apps.length > 0) {
      this.startCacheWarming();
      console.log(`[PhaseSDKCache] Cache warming configured for ${config.apps.length} apps`);
    }
  }

  /**
   * Manually warm cache for specific app/environment
   */
  public async warmCache(
    appName: string,
    environment: string,
    tokenSource: TokenSource,
    secretLoader: (appName: string, environment: string) => Promise<Record<string, string>>
  ): Promise<boolean> {
    try {
      console.log(`[PhaseSDKCache] Warming cache for ${appName}:${environment}`);
      
      const secrets = await secretLoader(appName, environment);
      this.set(appName, environment, secrets, tokenSource);
      
      console.log(`[PhaseSDKCache] Successfully warmed cache for ${appName}:${environment} with ${Object.keys(secrets).length} secrets`);
      return true;
    } catch (error) {
      console.error(`[PhaseSDKCache] Failed to warm cache for ${appName}:${environment}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache entries securely
   */
  public clear(): void {
    const entryCount = this.cache.size;
    this.clearAllSecrets();
    console.log(`[PhaseSDKCache] Cleared all cache entries (${entryCount} entries)`);
  }

  /**
   * Get cache status information
   */
  public getStatus(): {
    enabled: boolean;
    entryCount: number;
    maxEntries: number;
    defaultTTL: number;
    cleanupRunning: boolean;
    warmingEnabled: boolean;
    memoryUsage: number;
  } {
    const metrics = this.getMetrics();
    
    return {
      enabled: true,
      entryCount: this.cache.size,
      maxEntries: this.maxEntries,
      defaultTTL: this.defaultTTL,
      cleanupRunning: this.cleanupInterval !== null,
      warmingEnabled: this.warmingConfig?.enabled || false,
      memoryUsage: metrics.memoryUsageEstimate
    };
  }

  /**
   * Update cache configuration
   */
  public configure(options: {
    defaultTTL?: number;
    maxEntries?: number;
    cleanupInterval?: number;
  }): void {
    if (options.defaultTTL !== undefined) {
      this.defaultTTL = options.defaultTTL;
      console.log(`[PhaseSDKCache] Updated default TTL to ${options.defaultTTL}ms`);
    }

    if (options.maxEntries !== undefined) {
      this.maxEntries = options.maxEntries;
      console.log(`[PhaseSDKCache] Updated max entries to ${options.maxEntries}`);
      
      // Evict entries if we're now over the limit
      while (this.cache.size > this.maxEntries) {
        this.evictOldestEntry();
      }
    }

    if (options.cleanupInterval !== undefined) {
      this.restartCleanupInterval(options.cleanupInterval);
    }
  }

  /**
   * Securely clear secrets from memory
   */
  private clearSecrets(secrets: Record<string, string>): void {
    // Overwrite secret values with random data for security
    for (const key in secrets) {
      if (secrets.hasOwnProperty(key)) {
        // Overwrite with random string of same length
        const originalLength = secrets[key].length;
        secrets[key] = Array(originalLength).fill(0).map(() => 
          Math.random().toString(36).charAt(2)
        ).join('');
        
        // Then delete the property
        delete secrets[key];
      }
    }
  }

  /**
   * Clear all secrets securely
   */
  private clearAllSecrets(): void {
    for (const entry of this.cache.values()) {
      this.clearSecrets(entry.secrets);
    }
    this.cache.clear();
  }

  /**
   * Evict the oldest cache entry
   */
  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.clearSecrets(entry.secrets);
        this.cache.delete(oldestKey);
        this.metrics.evictions++;
        console.log(`[PhaseSDKCache] Evicted oldest entry: ${entry.appName}:${entry.environment}`);
      }
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      const deletedCount = this.invalidate(CacheInvalidationPattern.EXPIRED_ONLY);
      if (deletedCount > 0) {
        this.metrics.cleanups++;
      }
    }, 2 * 60 * 1000);
  }

  /**
   * Restart cleanup interval with new timing
   */
  private restartCleanupInterval(intervalMs: number): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      const deletedCount = this.invalidate(CacheInvalidationPattern.EXPIRED_ONLY);
      if (deletedCount > 0) {
        this.metrics.cleanups++;
      }
    }, intervalMs);

    console.log(`[PhaseSDKCache] Updated cleanup interval to ${intervalMs}ms`);
  }

  /**
   * Start cache warming process
   */
  private startCacheWarming(): void {
    if (!this.warmingConfig || !this.warmingConfig.enabled) {
      return;
    }

    // Sort apps by priority (1 = highest priority)
    const sortedApps = [...this.warmingConfig.apps].sort((a, b) => a.priority - b.priority);

    this.warmingInterval = setInterval(async () => {
      console.log(`[PhaseSDKCache] Starting cache warming cycle for ${sortedApps.length} apps`);
      
      // Process apps with concurrency limit
      const concurrency = this.warmingConfig!.maxConcurrentWarming;
      for (let i = 0; i < sortedApps.length; i += concurrency) {
        const batch = sortedApps.slice(i, i + concurrency);
        
        // Note: Actual warming would require a secret loader function
        // This is just the framework - implementation would need to be provided
        console.log(`[PhaseSDKCache] Would warm cache for batch: ${batch.map(app => `${app.appName}:${app.environment}`).join(', ')}`);
      }
    }, this.warmingConfig.warmingInterval);
  }

  /**
   * Register shutdown handlers for security cleanup
   */
  private registerShutdownHandlers(): void {
    const cleanup = () => {
      console.log('[PhaseSDKCache] Application shutdown detected, clearing cache for security');
      this.shutdown();
    };

    // Handle various shutdown signals
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[PhaseSDKCache] Uncaught exception, clearing cache:', error);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[PhaseSDKCache] Unhandled rejection, clearing cache:', reason);
      this.shutdown();
    });
  }

  /**
   * Shutdown cache and cleanup resources
   */
  public shutdown(): void {
    console.log('[PhaseSDKCache] Shutting down cache...');
    
    // Stop intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }

    // Clear all secrets securely
    this.clearAllSecrets();
    
    // Reset singleton
    PhaseSDKCache.instance = null;
    
    console.log('[PhaseSDKCache] Cache shutdown complete');
  }
}

/**
 * Convenience function to get cache instance
 */
export function getPhaseSDKCache(): PhaseSDKCache {
  return PhaseSDKCache.getInstance();
}

/**
 * Convenience function to clear cache
 */
export function clearPhaseSDKCache(): void {
  PhaseSDKCache.getInstance().clear();
}