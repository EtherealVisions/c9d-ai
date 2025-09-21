/**
 * Cached Repository Base Class
 * 
 * This file extends the base repository with caching capabilities, providing
 * automatic cache management, invalidation strategies, and performance optimization.
 */

import { z } from 'zod'
import { BaseRepository, FilterCondition, QueryOptions, RepositoryResult } from './base-repository'
import { 
  RepositoryCacheService, 
  getCacheService, 
  CacheKeyPattern, 
  InvalidationStrategy 
} from './cache-service'
import { DrizzleDatabase } from '@/lib/db/connection'

/**
 * Cache configuration for repository operations
 */
export interface RepositoryCacheConfig {
  enabled: boolean
  ttl: {
    findById: number
    findMany: number
    findOne: number
    count: number
    exists: number
  }
  invalidation: {
    onCreate: InvalidationStrategy
    onUpdate: InvalidationStrategy
    onDelete: InvalidationStrategy
  }
  warmCache: boolean // Whether to warm cache on startup
}

/**
 * Default cache configuration for repositories
 */
export const DEFAULT_REPOSITORY_CACHE_CONFIG: RepositoryCacheConfig = {
  enabled: true,
  ttl: {
    findById: 3600, // 1 hour
    findMany: 1800, // 30 minutes
    findOne: 3600, // 1 hour
    count: 900, // 15 minutes
    exists: 3600, // 1 hour
  },
  invalidation: {
    onCreate: 'immediate',
    onUpdate: 'immediate',
    onDelete: 'immediate'
  },
  warmCache: false
}

/**
 * Cached Repository Base Class
 * Extends BaseRepository with automatic caching capabilities
 */
export abstract class CachedRepository<TEntity, TInsert, TUpdate> extends BaseRepository<TEntity, TInsert, TUpdate> {
  protected abstract entityName: string
  protected cacheService: RepositoryCacheService
  protected cacheConfig: RepositoryCacheConfig
  protected abstract entitySchema: z.ZodSchema<TEntity>

  constructor(
    db: DrizzleDatabase,
    cacheConfig: Partial<RepositoryCacheConfig> = {}
  ) {
    super(db)
    this.cacheService = getCacheService()
    this.cacheConfig = { ...DEFAULT_REPOSITORY_CACHE_CONFIG, ...cacheConfig }
  }

  /**
   * Generate cache key pattern for operation
   */
  protected createCachePattern(operation: string, params: Record<string, any> = {}): CacheKeyPattern {
    return {
      entity: this.entityName,
      operation,
      params
    }
  }

  /**
   * Cached findById implementation
   */
  async findById(id: string): Promise<TEntity | null> {
    if (!this.cacheConfig.enabled) {
      return await super.findById(id)
    }

    try {
      const cachePattern = this.createCachePattern('findById', { id })
      
      // Try to get from cache first
      const cached = await this.cacheService.get(cachePattern, this.entitySchema)
      if (cached !== null) {
        return cached
      }

      // Fetch from database
      const result = await super.findById(id)
      
      // Cache the result (including null results to prevent cache stampede)
      if (result) {
        await this.cacheService.set(cachePattern, result, this.cacheConfig.ttl.findById)
      }

      return result
    } catch (error) {
      console.warn('[CachedRepository] Cache error in findById, falling back to database:', error)
      return await super.findById(id)
    }
  }

  /**
   * Cached findMany implementation
   */
  async findMany(options: QueryOptions = {}): Promise<RepositoryResult<TEntity>> {
    if (!this.cacheConfig.enabled) {
      return await super.findMany(options)
    }

    try {
      const cachePattern = this.createCachePattern('findMany', { options })
      
      // Try to get from cache first
      const cached = await this.cacheService.get(cachePattern)
      if (cached !== null) {
        return cached as RepositoryResult<TEntity>
      }

      // Fetch from database
      const result = await super.findMany(options)
      
      // Cache the result
      await this.cacheService.set(cachePattern, result, this.cacheConfig.ttl.findMany)

      return result
    } catch (error) {
      console.warn('[CachedRepository] Cache error in findMany, falling back to database:', error)
      return await super.findMany(options)
    }
  }

  /**
   * Cached findOne implementation
   */
  async findOne(filters: FilterCondition[]): Promise<TEntity | null> {
    if (!this.cacheConfig.enabled) {
      return await super.findOne(filters)
    }

    try {
      const cachePattern = this.createCachePattern('findOne', { filters })
      
      // Try to get from cache first
      const cached = await this.cacheService.get(cachePattern, this.entitySchema)
      if (cached !== null) {
        return cached
      }

      // Fetch from database
      const result = await super.findOne(filters)
      
      // Cache the result
      if (result) {
        await this.cacheService.set(cachePattern, result, this.cacheConfig.ttl.findOne)
      }

      return result
    } catch (error) {
      console.warn('[CachedRepository] Cache error in findOne, falling back to database:', error)
      return await super.findOne(filters)
    }
  }

  /**
   * Cached count implementation
   */
  async count(filters: FilterCondition[] = []): Promise<number> {
    if (!this.cacheConfig.enabled) {
      return await super.count(filters)
    }

    try {
      const cachePattern = this.createCachePattern('count', { filters })
      
      // Try to get from cache first
      const cached = await this.cacheService.get(cachePattern)
      if (cached !== null) {
        return cached as number
      }

      // Fetch from database
      const result = await super.count(filters)
      
      // Cache the result
      await this.cacheService.set(cachePattern, result, this.cacheConfig.ttl.count)

      return result
    } catch (error) {
      console.warn('[CachedRepository] Cache error in count, falling back to database:', error)
      return await super.count(filters)
    }
  }

  /**
   * Cached exists implementation
   */
  async exists(id: string): Promise<boolean> {
    if (!this.cacheConfig.enabled) {
      return await super.exists(id)
    }

    try {
      const cachePattern = this.createCachePattern('exists', { id })
      
      // Try to get from cache first
      const cached = await this.cacheService.get(cachePattern)
      if (cached !== null) {
        return cached as boolean
      }

      // Fetch from database
      const result = await super.exists(id)
      
      // Cache the result
      await this.cacheService.set(cachePattern, result, this.cacheConfig.ttl.exists)

      return result
    } catch (error) {
      console.warn('[CachedRepository] Cache error in exists, falling back to database:', error)
      return await super.exists(id)
    }
  }

  /**
   * Create with cache invalidation
   */
  async create(data: TInsert): Promise<TEntity> {
    const result = await super.create(data)
    
    if (this.cacheConfig.enabled) {
      await this.invalidateOnCreate(result)
    }
    
    return result
  }

  /**
   * Create many with cache invalidation
   */
  async createMany(data: TInsert[]): Promise<TEntity[]> {
    const results = await super.createMany(data)
    
    if (this.cacheConfig.enabled) {
      for (const result of results) {
        await this.invalidateOnCreate(result)
      }
    }
    
    return results
  }

  /**
   * Update with cache invalidation
   */
  async update(id: string, data: TUpdate): Promise<TEntity> {
    const result = await super.update(id, data)
    
    if (this.cacheConfig.enabled) {
      await this.invalidateOnUpdate(result)
    }
    
    return result
  }

  /**
   * Update many with cache invalidation
   */
  async updateMany(filters: FilterCondition[], data: TUpdate): Promise<TEntity[]> {
    const results = await super.updateMany(filters, data)
    
    if (this.cacheConfig.enabled) {
      for (const result of results) {
        await this.invalidateOnUpdate(result)
      }
    }
    
    return results
  }

  /**
   * Delete with cache invalidation
   */
  async delete(id: string): Promise<void> {
    // Get entity before deletion for cache invalidation
    let entity: TEntity | null = null
    if (this.cacheConfig.enabled) {
      entity = await this.findById(id)
    }
    
    await super.delete(id)
    
    if (this.cacheConfig.enabled && entity) {
      await this.invalidateOnDelete(entity)
    }
  }

  /**
   * Delete many with cache invalidation
   */
  async deleteMany(filters: FilterCondition[]): Promise<number> {
    // Get entities before deletion for cache invalidation
    let entities: TEntity[] = []
    if (this.cacheConfig.enabled) {
      const result = await this.findMany({ filters })
      entities = result.data
    }
    
    const count = await super.deleteMany(filters)
    
    if (this.cacheConfig.enabled) {
      for (const entity of entities) {
        await this.invalidateOnDelete(entity)
      }
    }
    
    return count
  }

  /**
   * Cache invalidation on create
   */
  protected async invalidateOnCreate(entity: TEntity): Promise<void> {
    try {
      const strategy = this.cacheConfig.invalidation.onCreate
      
      // Invalidate list queries
      await this.cacheService.invalidateByPattern(`${this.entityName}:findMany`, strategy)
      await this.cacheService.invalidateByPattern(`${this.entityName}:count`, strategy)
      
      // Invalidate related entity caches
      await this.invalidateRelatedCaches(entity, 'create')
    } catch (error) {
      console.warn('[CachedRepository] Error invalidating cache on create:', error)
    }
  }

  /**
   * Cache invalidation on update
   */
  protected async invalidateOnUpdate(entity: TEntity): Promise<void> {
    try {
      const strategy = this.cacheConfig.invalidation.onUpdate
      const entityId = (entity as any).id
      
      // Invalidate specific entity cache
      await this.cacheService.invalidateEntity(this.entityName, entityId)
      
      // Invalidate list queries
      await this.cacheService.invalidateByPattern(`${this.entityName}:findMany`, strategy)
      await this.cacheService.invalidateByPattern(`${this.entityName}:findOne`, strategy)
      await this.cacheService.invalidateByPattern(`${this.entityName}:count`, strategy)
      
      // Invalidate related entity caches
      await this.invalidateRelatedCaches(entity, 'update')
    } catch (error) {
      console.warn('[CachedRepository] Error invalidating cache on update:', error)
    }
  }

  /**
   * Cache invalidation on delete
   */
  protected async invalidateOnDelete(entity: TEntity): Promise<void> {
    try {
      const strategy = this.cacheConfig.invalidation.onDelete
      const entityId = (entity as any).id
      
      // Invalidate specific entity cache
      await this.cacheService.invalidateEntity(this.entityName, entityId)
      
      // Invalidate list queries
      await this.cacheService.invalidateByPattern(`${this.entityName}:findMany`, strategy)
      await this.cacheService.invalidateByPattern(`${this.entityName}:findOne`, strategy)
      await this.cacheService.invalidateByPattern(`${this.entityName}:count`, strategy)
      await this.cacheService.invalidateByPattern(`${this.entityName}:exists`, strategy)
      
      // Invalidate related entity caches
      await this.invalidateRelatedCaches(entity, 'delete')
    } catch (error) {
      console.warn('[CachedRepository] Error invalidating cache on delete:', error)
    }
  }

  /**
   * Invalidate related entity caches
   * Override in specific repositories to handle relationships
   */
  protected async invalidateRelatedCaches(
    entity: TEntity, 
    operation: 'create' | 'update' | 'delete'
  ): Promise<void> {
    // Default implementation - override in specific repositories
    // Example: For user updates, invalidate organization member lists
  }

  /**
   * Warm cache with commonly accessed data
   */
  async warmCache(): Promise<void> {
    if (!this.cacheConfig.enabled || !this.cacheConfig.warmCache) {
      return
    }

    try {
      // Override in specific repositories to implement cache warming
      console.log(`[CachedRepository] Warming cache for ${this.entityName}`)
    } catch (error) {
      console.warn('[CachedRepository] Error warming cache:', error)
    }
  }

  /**
   * Batch operations with caching
   */
  async batchFindByIds(ids: string[]): Promise<(TEntity | null)[]> {
    if (!this.cacheConfig.enabled || ids.length === 0) {
      // Fallback to individual queries
      return await Promise.all(ids.map(id => this.findById(id)))
    }

    try {
      // Create cache patterns for all IDs
      const patterns = ids.map(id => this.createCachePattern('findById', { id }))
      
      // Batch get from cache
      const cached = await this.cacheService.batchGet<TEntity>(patterns)
      
      // Find missing items
      const missing: { index: number; id: string }[] = []
      cached.forEach((item, index) => {
        if (item === null) {
          missing.push({ index, id: ids[index] })
        }
      })

      // Fetch missing items from database
      if (missing.length > 0) {
        const missingResults = await Promise.all(
          missing.map(({ id }) => super.findById(id))
        )

        // Update cache with missing items
        const cacheEntries = missing
          .map(({ index, id }, i) => ({
            pattern: this.createCachePattern('findById', { id }),
            data: missingResults[i],
            ttl: this.cacheConfig.ttl.findById
          }))
          .filter(entry => entry.data !== null)

        if (cacheEntries.length > 0) {
          await this.cacheService.batchSet(cacheEntries)
        }

        // Merge results
        missing.forEach(({ index }, i) => {
          cached[index] = missingResults[i]
        })
      }

      return cached
    } catch (error) {
      console.warn('[CachedRepository] Error in batch find, falling back to individual queries:', error)
      return await Promise.all(ids.map(id => this.findById(id)))
    }
  }

  /**
   * Get cache statistics for this repository
   */
  async getCacheStats(): Promise<{
    entityName: string
    config: RepositoryCacheConfig
    globalStats: Awaited<ReturnType<RepositoryCacheService['getStats']>>
  }> {
    const globalStats = await this.cacheService.getStats()
    
    return {
      entityName: this.entityName,
      config: this.cacheConfig,
      globalStats
    }
  }

  /**
   * Clear cache for this entity
   */
  async clearCache(): Promise<number> {
    if (!this.cacheConfig.enabled) {
      return 0
    }

    return await this.cacheService.invalidateByPattern(this.entityName)
  }
}