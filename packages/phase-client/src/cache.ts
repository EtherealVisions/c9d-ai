/**
 * In-memory cache implementation for Phase secrets
 * 
 * Security Note: Secrets are ONLY cached in memory, never written to disk.
 * Cache is cleared on process exit.
 */

import { CacheConfig, CacheEntry, EnvVars } from './types';
import * as crypto from 'crypto';

export class SecretCache {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private accessLog: Map<string, number> = new Map(); // Track access for LRU
  private memoryUsage: number = 0; // Track approximate memory usage in bytes
  private hasWarnedMemory: boolean = false; // Track if we've warned about memory
  private evictionCount: number = 0; // Track number of evictions
  
  // Default memory limit: 50MB (reasonable for most Node.js apps)
  private static readonly DEFAULT_MEMORY_MB = 50;
  // Warn when we reach 75% of memory limit
  private static readonly MEMORY_WARNING_THRESHOLD = 0.75;
  
  constructor(config: CacheConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      ttl: config.ttl ?? 300, // 5 minutes default
      maxMemoryMB: config.maxMemoryMB ?? SecretCache.DEFAULT_MEMORY_MB
    };
    
    // Clear cache on process exit
    if (this.config.enabled) {
      process.on('exit', () => this.clear());
      process.on('SIGINT', () => this.clear());
      process.on('SIGTERM', () => this.clear());
      
      // Monitor memory pressure
      this.startMemoryMonitoring();
    }
    
    if (process.env.PHASE_DEBUG === 'true') {
      console.log(`[SecretCache] Initialized with ${this.config.maxMemoryMB}MB memory limit`);
    }
  }
  
  /**
   * Get cached secrets for an environment
   * Returns null if not cached or expired
   */
  async get(environment: string): Promise<EnvVars | null> {
    if (!this.config.enabled) return null;
    
    const entry = this.memoryCache.get(environment);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (entry.expires <= Date.now()) {
      this.memoryCache.delete(environment);
      this.accessLog.delete(environment);
      return null;
    }
    
    // Update access time for LRU
    this.accessLog.set(environment, Date.now());
    
    // Return a copy to prevent mutations
    return { ...entry.data };
  }
  
  /**
   * Get stale cache (even if expired) for fallback scenarios
   */
  async getStale(environment: string): Promise<EnvVars | null> {
    if (!this.config.enabled) return null;
    
    const entry = this.memoryCache.get(environment);
    if (!entry) return null;
    
    // Return a copy even if expired
    return { ...entry.data };
  }
  
  /**
   * Cache secrets for an environment
   */
  async set(environment: string, data: EnvVars): Promise<void> {
    if (!this.config.enabled) return;
    
    const entry: CacheEntry = {
      data: { ...data }, // Store a copy
      environment,
      expires: Date.now() + ((this.config.ttl ?? 300) * 1000),
      checksum: this.calculateChecksum(data)
    };
    
    // Calculate size of new entry
    const entrySize = this.estimateSize(data);
    
    // Check memory limit
    const maxBytes = this.config.maxMemoryMB! * 1024 * 1024;
    const projectedUsage = this.memoryUsage + entrySize;
    
    // Check if we need to evict entries
    if (projectedUsage > maxBytes && this.memoryCache.size > 0) {
      // First eviction or every 10 evictions
      if (this.evictionCount === 0) {
        console.warn(`⚠️  [SecretCache] Memory limit reached (${this.config.maxMemoryMB}MB). Starting LRU eviction.`);
      } else if (this.evictionCount % 10 === 0) {
        console.warn(`⚠️  [SecretCache] Continued memory pressure. Total evictions: ${this.evictionCount}`);
      }
      
      // Evict entries until we have space
      while (this.memoryUsage + entrySize > maxBytes && this.memoryCache.size > 0) {
        this.evictLRU();
      }
    }
    
    // Check memory warning threshold
    const warningThreshold = maxBytes * SecretCache.MEMORY_WARNING_THRESHOLD;
    if (projectedUsage > warningThreshold && !this.hasWarnedMemory) {
      const percentUsed = Math.round((projectedUsage / maxBytes) * 100);
      console.warn(
        `⚠️  [SecretCache] Memory usage at ${percentUsed}% of ${this.config.maxMemoryMB}MB limit. ` +
        `Consider increasing maxMemoryMB or reducing cache TTL.`
      );
      this.hasWarnedMemory = true;
    }
    
    // Reset warning flag if we're back below 50% usage
    if (projectedUsage < maxBytes * 0.5) {
      this.hasWarnedMemory = false;
    }
    
    // Remove old entry if exists (to update memory calculation)
    if (this.memoryCache.has(environment)) {
      const oldEntry = this.memoryCache.get(environment)!;
      this.memoryUsage -= this.estimateSize(oldEntry.data);
    }
    
    // Add new entry
    this.memoryCache.set(environment, entry);
    this.accessLog.set(environment, Date.now());
    this.memoryUsage += entrySize;
  }
  
  /**
   * Remove cached secrets for a specific environment
   */
  async delete(environment: string): Promise<void> {
    const entry = this.memoryCache.get(environment);
    if (entry) {
      this.memoryUsage -= this.estimateSize(entry.data);
    }
    this.memoryCache.delete(environment);
    this.accessLog.delete(environment);
  }
  
  /**
   * Clear all cached secrets
   */
  async clear(): Promise<void> {
    // Overwrite memory before clearing for extra security
    for (const [key, entry] of this.memoryCache.entries()) {
      // Overwrite the data with random values
      const keys = Object.keys(entry.data);
      keys.forEach(k => {
        entry.data[k] = crypto.randomBytes(32).toString('hex');
      });
    }
    
    this.memoryCache.clear();
    this.accessLog.clear();
    this.memoryUsage = 0;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    memoryUsageMB: number;
    maxMemoryMB: number;
    percentUsed: number;
    ttl: number;
    environments: string[];
    oldestEntry?: string;
    newestEntry?: string;
    evictionCount: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
  } {
    let oldest: { env: string; time: number } | undefined;
    let newest: { env: string; time: number } | undefined;
    
    for (const [env, time] of this.accessLog.entries()) {
      if (!oldest || time < oldest.time) oldest = { env, time };
      if (!newest || time > newest.time) newest = { env, time };
    }
    
    const memoryUsageMB = this.memoryUsage / (1024 * 1024);
    const percentUsed = (this.memoryUsage / (this.config.maxMemoryMB! * 1024 * 1024)) * 100;
    
    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'critical';
    if (percentUsed >= 90) {
      healthStatus = 'critical';
    } else if (percentUsed >= 75) {
      healthStatus = 'warning';
    } else {
      healthStatus = 'healthy';
    }
    
    return {
      entries: this.memoryCache.size,
      memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
      maxMemoryMB: this.config.maxMemoryMB!,
      percentUsed: Math.round(percentUsed),
      ttl: this.config.ttl!,
      environments: Array.from(this.memoryCache.keys()),
      oldestEntry: oldest?.env,
      newestEntry: newest?.env,
      evictionCount: this.evictionCount,
      healthStatus
    };
  }
  
  /**
   * Calculate checksum for cache validation
   */
  private calculateChecksum(data: EnvVars): string {
    const content = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestTime = Date.now();
    let oldestKey: string | null = null;
    
    for (const [key, time] of this.accessLog.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const entry = this.memoryCache.get(oldestKey);
      const sizeMB = entry ? (this.estimateSize(entry.data) / (1024 * 1024)).toFixed(2) : '?';
      
      this.delete(oldestKey);
      this.evictionCount++;
      
      if (process.env.PHASE_DEBUG === 'true' || this.evictionCount === 1) {
        console.log(
          `🗑️  [SecretCache] Evicted LRU entry: ${oldestKey} (${sizeMB}MB). ` +
          `Memory: ${(this.memoryUsage / (1024 * 1024)).toFixed(2)}/${this.config.maxMemoryMB}MB`
        );
      }
    }
  }
  
  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: EnvVars): number {
    // Rough estimation: sum of key and value lengths * 2 (for Unicode)
    let size = 0;
    for (const [key, value] of Object.entries(data)) {
      size += (key.length + value.length) * 2;
    }
    return size;
  }
  
  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    // Check memory usage periodically and evict if needed
    const interval = setInterval(() => {
      const maxBytes = this.config.maxMemoryMB! * 1024 * 1024;
      const percentUsed = (this.memoryUsage / maxBytes) * 100;
      
      // Log if in critical state
      if (percentUsed >= 90) {
        console.warn(
          `⚠️  [SecretCache] Critical memory usage: ${percentUsed.toFixed(1)}% of ${this.config.maxMemoryMB}MB. ` +
          `${this.memoryCache.size} environments cached.`
        );
      }
      
      // Force eviction if over limit
      while (this.memoryUsage > maxBytes && this.memoryCache.size > 0) {
        console.warn(`⚠️  [SecretCache] Memory over limit. Forcing eviction.`);
        this.evictLRU();
      }
      
      // Clean up expired entries
      const now = Date.now();
      for (const [env, entry] of this.memoryCache.entries()) {
        if (entry.expires <= now) {
          if (process.env.PHASE_DEBUG === 'true') {
            console.log(`[SecretCache] Removing expired entry: ${env}`);
          }
          this.delete(env);
        }
      }
    }, 60000); // Check every minute
    
    // Don't prevent process exit
    interval.unref();
  }
  
  /**
   * Validate cached data integrity
   */
  async validate(environment: string): Promise<boolean> {
    const entry = this.memoryCache.get(environment);
    if (!entry) return false;
    
    const currentChecksum = this.calculateChecksum(entry.data);
    return currentChecksum === entry.checksum;
  }
}