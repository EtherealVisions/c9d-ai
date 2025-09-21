/**
 * Repository Cache Service
 * 
 * This file implements Redis-based caching for repository operations with
 * cache invalidation strategies and performance optimization.
 */

import { Redis } from 'ioredis'
import { z } from 'zod'
import { DatabaseError, CacheError } from '@/lib/errors/custom-errors'

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  defaultTTL: number // Default time-to-live in seconds
  keyPrefix: string // Prefix for all cache keys
  enabled: boolean // Whether caching is enabled
  redis?: {
    host: string
    port: number
    password?: string
    db?: number
  }
}

/**
 * Cache key pattern for different entity types
 */
export interface CacheKeyPattern {
  entity: string // Entity name (user, organization, etc.)
  operation: string // Operation type (findById, findMany, etc.)
  params: Record<string, any> // Parameters for the operation
}

/**
 * Cache entry metadata
 */
export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  version: string
}

/**
 * Cache invalidation strategy
 */
export type InvalidationStrategy = 
  | 'immediate' // Invalidate immediately
  | 'lazy' // Invalidate on next access
  | 'ttl' // Let TTL handle expiration
  | 'pattern' // Invalidate by pattern matching

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  totalKeys: number
  memoryUsage: number
  operations: {
    gets: number
    sets: number
    deletes: number
    invalidations: number
  }
}

/**
 * Repository Cache Service Implementation
 */
export class RepositoryCacheService {
  private redis: Redis | null = null
  private config: CacheConfig
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalKeys: 0,
    memoryUsage: 0,
    operations: {
      gets: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0
    }
  }

  constructor(config: CacheConfig) {
    this.config = config
    this.initializeRedis()
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    if (!this.config.enabled) {
      return
    }

    try {
      // Try to get Redis URL from environment
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
      
      if (redisUrl) {
        this.redis = new Redis(redisUrl, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        })
      } else if (this.config.redis) {
        this.redis = new Redis({
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          db: this.config.redis.db || 0,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        })
      }

      if (this.redis) {
        this.redis.on('error', (error) => {
          console.error('[Cache] Redis connection error:', error)
        })

        this.redis.on('connect', () => {
          console.log('[Cache] Redis connected successfully')
        })
      }
    } catch (error) {
      console.error('[Cache] Failed to initialize Redis:', error)
      this.redis = null
    }
  }

  /**
   * Generate cache key from pattern
   */
  private generateKey(pattern: CacheKeyPattern): string {
    const { entity, operation, params } = pattern
    
    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|')
    
    return `${this.config.keyPrefix}:${entity}:${operation}:${sortedParams}`
  }

  /**
   * Get data from cache
   */
  async get<T>(pattern: CacheKeyPattern, schema?: z.ZodSchema<T>): Promise<T | null> {
    if (!this.config.enabled || !this.redis) {
      return null
    }

    try {
      this.stats.operations.gets++
      
      const key = this.generateKey(pattern)
      const cached = await this.redis.get(key)
      
      if (!cached) {
        this.stats.misses++
        this.updateHitRate()
        return null
      }

      const entry: CacheEntry<T> = JSON.parse(cached)
      
      // Check if entry is expired
      const now = Date.now()
      if (now - entry.timestamp > entry.ttl * 1000) {
        await this.delete(pattern)
        this.stats.misses++
        this.updateHitRate()
        return null
      }

      // Validate data if schema provided
      if (schema) {
        const result = schema.safeParse(entry.data)
        if (!result.success) {
          console.warn('[Cache] Invalid cached data, removing:', result.error)
          await this.delete(pattern)
          this.stats.misses++
          this.updateHitRate()
          return null
        }
        this.stats.hits++
        this.updateHitRate()
        return result.data
      }

      this.stats.hits++
      this.updateHitRate()
      return entry.data
    } catch (error) {
      console.error('[Cache] Error getting from cache:', error)
      this.stats.misses++
      this.updateHitRate()
      return null
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(
    pattern: CacheKeyPattern, 
    data: T, 
    ttl: number = this.config.defaultTTL
  ): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return
    }

    try {
      this.stats.operations.sets++
      
      const key = this.generateKey(pattern)
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: '1.0'
      }

      await this.redis.setex(key, ttl, JSON.stringify(entry))
    } catch (error) {
      console.error('[Cache] Error setting cache:', error)
      throw new CacheError('Failed to set cache entry')
    }
  }

  /**
   * Delete data from cache
   */
  async delete(pattern: CacheKeyPattern): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return
    }

    try {
      this.stats.operations.deletes++
      
      const key = this.generateKey(pattern)
      await this.redis.del(key)
    } catch (error) {
      console.error('[Cache] Error deleting from cache:', error)
      throw new CacheError('Failed to delete cache entry')
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(
    entityPattern: string, 
    strategy: InvalidationStrategy = 'immediate'
  ): Promise<number> {
    if (!this.config.enabled || !this.redis) {
      return 0
    }

    try {
      this.stats.operations.invalidations++
      
      const pattern = `${this.config.keyPrefix}:${entityPattern}*`
      const keys = await this.redis.keys(pattern)
      
      if (keys.length === 0) {
        return 0
      }

      switch (strategy) {
        case 'immediate':
          await this.redis.del(...keys)
          return keys.length
          
        case 'lazy':
          // Mark keys for lazy deletion (could implement with expiration)
          const pipeline = this.redis.pipeline()
          keys.forEach(key => pipeline.expire(key, 1)) // Expire in 1 second
          await pipeline.exec()
          return keys.length
          
        case 'ttl':
          // Let TTL handle expiration naturally
          return 0
          
        case 'pattern':
          // Delete keys matching specific patterns
          await this.redis.del(...keys)
          return keys.length
          
        default:
          return 0
      }
    } catch (error) {
      console.error('[Cache] Error invalidating by pattern:', error)
      throw new CacheError('Failed to invalidate cache by pattern')
    }
  }

  /**
   * Invalidate entity cache
   */
  async invalidateEntity(entity: string, id?: string): Promise<number> {
    const pattern = id ? `${entity}:*:*id*:${id}*` : `${entity}:*`
    return await this.invalidateByPattern(pattern)
  }

  /**
   * Invalidate related entities
   */
  async invalidateRelated(entity: string, relationField: string, relationId: string): Promise<number> {
    const pattern = `${entity}:*:*${relationField}*:${relationId}*`
    return await this.invalidateByPattern(pattern)
  }

  /**
   * Warm cache with data
   */
  async warmCache<T>(
    pattern: CacheKeyPattern,
    dataProvider: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    try {
      // Check if data is already cached
      const cached = await this.get(pattern)
      if (cached) {
        return cached as T
      }

      // Fetch fresh data
      const data = await dataProvider()
      
      // Cache the data
      await this.set(pattern, data, ttl)
      
      return data
    } catch (error) {
      console.error('[Cache] Error warming cache:', error)
      throw new CacheError('Failed to warm cache')
    }
  }

  /**
   * Batch operations for multiple cache entries
   */
  async batchGet<T>(patterns: CacheKeyPattern[]): Promise<(T | null)[]> {
    if (!this.config.enabled || !this.redis || patterns.length === 0) {
      return patterns.map(() => null)
    }

    try {
      const keys = patterns.map(pattern => this.generateKey(pattern))
      const pipeline = this.redis.pipeline()
      
      keys.forEach(key => pipeline.get(key))
      const results = await pipeline.exec()
      
      return results?.map((result, index) => {
        if (result && result[1]) {
          try {
            const entry: CacheEntry<T> = JSON.parse(result[1] as string)
            
            // Check expiration
            const now = Date.now()
            if (now - entry.timestamp <= entry.ttl * 1000) {
              this.stats.hits++
              return entry.data
            }
          } catch (error) {
            console.warn('[Cache] Error parsing batch result:', error)
          }
        }
        this.stats.misses++
        return null
      }) || patterns.map(() => null)
    } catch (error) {
      console.error('[Cache] Error in batch get:', error)
      return patterns.map(() => null)
    } finally {
      this.updateHitRate()
    }
  }

  /**
   * Batch set operations
   */
  async batchSet<T>(
    entries: Array<{
      pattern: CacheKeyPattern
      data: T
      ttl?: number
    }>
  ): Promise<void> {
    if (!this.config.enabled || !this.redis || entries.length === 0) {
      return
    }

    try {
      const pipeline = this.redis.pipeline()
      
      entries.forEach(({ pattern, data, ttl = this.config.defaultTTL }) => {
        const key = this.generateKey(pattern)
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          ttl,
          version: '1.0'
        }
        pipeline.setex(key, ttl, JSON.stringify(entry))
      })
      
      await pipeline.exec()
      this.stats.operations.sets += entries.length
    } catch (error) {
      console.error('[Cache] Error in batch set:', error)
      throw new CacheError('Failed to batch set cache entries')
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.config.enabled || !this.redis) {
      return this.stats
    }

    try {
      const info = await this.redis.info('memory')
      const memoryMatch = info.match(/used_memory:(\d+)/)
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0

      const keyCount = await this.redis.dbsize()

      return {
        ...this.stats,
        totalKeys: keyCount,
        memoryUsage
      }
    } catch (error) {
      console.error('[Cache] Error getting stats:', error)
      return this.stats
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return
    }

    try {
      const pattern = `${this.config.keyPrefix}:*`
      const keys = await this.redis.keys(pattern)
      
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }

      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0,
        operations: {
          gets: 0,
          sets: 0,
          deletes: 0,
          invalidations: 0
        }
      }
    } catch (error) {
      console.error('[Cache] Error clearing cache:', error)
      throw new CacheError('Failed to clear cache')
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
      this.redis = null
    }
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{
    healthy: boolean
    latency?: number
    error?: string
  }> {
    if (!this.config.enabled) {
      return { healthy: true }
    }

    if (!this.redis) {
      return { healthy: false, error: 'Redis not initialized' }
    }

    try {
      const start = Date.now()
      await this.redis.ping()
      const latency = Date.now() - start

      return { healthy: true, latency }
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 3600, // 1 hour
  keyPrefix: 'repo',
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_CACHE === 'true',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  }
}

/**
 * Global cache service instance
 */
let globalCacheService: RepositoryCacheService | undefined

/**
 * Get or create global cache service
 */
export function getCacheService(): RepositoryCacheService {
  if (!globalCacheService) {
    globalCacheService = new RepositoryCacheService(DEFAULT_CACHE_CONFIG)
  }
  return globalCacheService
}

/**
 * Set global cache service (useful for testing)
 */
export function setCacheService(service: RepositoryCacheService): void {
  globalCacheService = service
}

/**
 * Clear global cache service (useful for testing)
 */
export function clearCacheService(): void {
  if (globalCacheService) {
    globalCacheService.close()
    globalCacheService = undefined
  }
}