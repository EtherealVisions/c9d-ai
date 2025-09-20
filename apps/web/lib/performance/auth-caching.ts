/**
 * Advanced caching strategies for authentication data and session management
 * 
 * This module provides sophisticated caching mechanisms for:
 * - User profile data with intelligent invalidation
 * - Session state with automatic refresh
 * - Form data persistence for better UX
 * - API response caching with stale-while-revalidate
 */

import { LRUCache } from 'lru-cache'

// Types for caching system
export interface CacheEntry<T> {
  data: T
  timestamp: number
  etag?: string
  lastModified?: string
  staleAt?: number
}

export interface CacheOptions {
  ttl?: number
  maxSize?: number
  staleWhileRevalidate?: number
  tags?: string[]
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  maxSize: number
  hitRate: number
}

// Cache configurations for different data types
const CACHE_CONFIGS = {
  userProfile: {
    maxSize: 100,
    ttl: 15 * 60 * 1000, // 15 minutes
    staleWhileRevalidate: 5 * 60 * 1000 // 5 minutes
  },
  sessionData: {
    maxSize: 50,
    ttl: 30 * 60 * 1000, // 30 minutes
    staleWhileRevalidate: 10 * 60 * 1000 // 10 minutes
  },
  formData: {
    maxSize: 20,
    ttl: 10 * 60 * 1000, // 10 minutes
    staleWhileRevalidate: 0 // No stale serving for forms
  },
  apiResponses: {
    maxSize: 200,
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: 2 * 60 * 1000 // 2 minutes
  }
}

/**
 * Advanced cache implementation with stale-while-revalidate support
 */
export class AdvancedCache<T> {
  private cache: LRUCache<string, CacheEntry<T>>
  private stats: CacheStats
  private revalidationPromises: Map<string, Promise<T>>
  private tags: Map<string, Set<string>>

  constructor(
    private config: typeof CACHE_CONFIGS.userProfile,
    private name: string = 'cache'
  ) {
    this.cache = new LRUCache({
      max: config.maxSize,
      ttl: config.ttl,
      allowStale: true,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    })

    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: config.maxSize,
      hitRate: 0
    }

    this.revalidationPromises = new Map()
    this.tags = new Map()
  }

  /**
   * Get data from cache with stale-while-revalidate support
   */
  async get(
    key: string,
    revalidateFn?: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const entry = this.cache.get(key)
    const now = Date.now()

    if (entry) {
      this.stats.hits++
      this.updateStats()

      // Check if data is fresh
      if (now - entry.timestamp < this.config.ttl) {
        return entry.data
      }

      // Check if we should serve stale while revalidating
      if (
        revalidateFn &&
        this.config.staleWhileRevalidate > 0 &&
        now - entry.timestamp < this.config.ttl + this.config.staleWhileRevalidate
      ) {
        // Serve stale data immediately
        this.revalidateInBackground(key, revalidateFn, options)
        return entry.data
      }
    }

    this.stats.misses++
    this.updateStats()

    // No cache hit or data is too stale
    if (revalidateFn) {
      return await this.fetchAndCache(key, revalidateFn, options)
    }

    return null
  }

  /**
   * Set data in cache with optional tags
   */
  set(key: string, data: T, options: CacheOptions = {}): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      etag: options.tags?.join(','),
      staleAt: options.ttl ? Date.now() + options.ttl : undefined
    }

    this.cache.set(key, entry, { ttl: options.ttl || this.config.ttl })

    // Handle tags
    if (options.tags) {
      options.tags.forEach(tag => {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set())
        }
        this.tags.get(tag)!.add(key)
      })
    }

    this.updateStats()
  }

  /**
   * Invalidate cache entries by key or tags
   */
  invalidate(keyOrTag: string, isTag: boolean = false): void {
    if (isTag) {
      const keys = this.tags.get(keyOrTag)
      if (keys) {
        keys.forEach(key => this.cache.delete(key))
        this.tags.delete(keyOrTag)
      }
    } else {
      this.cache.delete(keyOrTag)
      // Remove from all tags
      this.tags.forEach((keys, tag) => {
        if (keys.has(keyOrTag)) {
          keys.delete(keyOrTag)
          if (keys.size === 0) {
            this.tags.delete(tag)
          }
        }
      })
    }
    this.updateStats()
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.tags.clear()
    this.revalidationPromises.clear()
    this.updateStats()
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Fetch data and cache it
   */
  private async fetchAndCache(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    // Check if revalidation is already in progress
    const existingPromise = this.revalidationPromises.get(key)
    if (existingPromise) {
      return existingPromise
    }

    const promise = fetchFn()
    this.revalidationPromises.set(key, promise)

    try {
      const data = await promise
      this.set(key, data, options)
      return data
    } catch (error) {
      console.warn(`Cache fetch failed for key ${key}:`, error)
      throw error
    } finally {
      this.revalidationPromises.delete(key)
    }
  }

  /**
   * Revalidate data in background
   */
  private revalidateInBackground(
    key: string,
    revalidateFn: () => Promise<T>,
    options: CacheOptions
  ): void {
    // Don't start multiple revalidations for the same key
    if (this.revalidationPromises.has(key)) {
      return
    }

    const promise = revalidateFn()
    this.revalidationPromises.set(key, promise)

    promise
      .then(data => {
        this.set(key, data, options)
      })
      .catch(error => {
        console.warn(`Background revalidation failed for key ${key}:`, error)
      })
      .finally(() => {
        this.revalidationPromises.delete(key)
      })
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.cache.size
    this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0
  }
}

/**
 * User profile cache with intelligent invalidation
 */
export class UserProfileCache extends AdvancedCache<any> {
  constructor() {
    super(CACHE_CONFIGS.userProfile, 'userProfile')
  }

  /**
   * Get user profile with automatic refresh
   */
  async getUserProfile(
    userId: string,
    fetchFn?: () => Promise<any>
  ): Promise<any | null> {
    return this.get(`user:${userId}`, fetchFn, {
      tags: ['user', `user:${userId}`]
    })
  }

  /**
   * Update user profile in cache
   */
  setUserProfile(userId: string, profile: any): void {
    this.set(`user:${userId}`, profile, {
      tags: ['user', `user:${userId}`]
    })
  }

  /**
   * Invalidate user profile
   */
  invalidateUserProfile(userId: string): void {
    this.invalidate(`user:${userId}`)
  }

  /**
   * Invalidate all user profiles
   */
  invalidateAllUsers(): void {
    this.invalidate('user', true)
  }
}

/**
 * Session cache with automatic cleanup
 */
export class SessionCache extends AdvancedCache<any> {
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    super(CACHE_CONFIGS.sessionData, 'session')
    this.startCleanupTimer()
  }

  /**
   * Get session data
   */
  async getSession(
    sessionId: string,
    fetchFn?: () => Promise<any>
  ): Promise<any | null> {
    return this.get(`session:${sessionId}`, fetchFn, {
      tags: ['session', `session:${sessionId}`]
    })
  }

  /**
   * Set session data
   */
  setSession(sessionId: string, sessionData: any): void {
    this.set(`session:${sessionId}`, {
      ...sessionData,
      lastAccessed: Date.now()
    }, {
      tags: ['session', `session:${sessionId}`]
    })
  }

  /**
   * Touch session to update last accessed time
   */
  touchSession(sessionId: string): void {
    const key = `session:${sessionId}`
    const entry = this.cache.get(key)
    if (entry) {
      this.set(key, {
        ...entry.data,
        lastAccessed: Date.now()
      }, {
        tags: ['session', `session:${sessionId}`]
      })
    }
  }

  /**
   * Remove session
   */
  removeSession(sessionId: string): void {
    this.invalidate(`session:${sessionId}`)
  }

  /**
   * Start cleanup timer for expired sessions
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    this.cache.forEach((entry, key) => {
      if (entry.data.lastAccessed && now - entry.data.lastAccessed > 60 * 60 * 1000) {
        // Remove sessions not accessed for 1 hour
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach(key => this.cache.delete(key))
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

/**
 * Form data cache for better UX
 */
export class FormDataCache extends AdvancedCache<any> {
  constructor() {
    super(CACHE_CONFIGS.formData, 'formData')
  }

  /**
   * Save form state
   */
  saveFormState(formId: string, formData: any): void {
    this.set(`form:${formId}`, {
      ...formData,
      savedAt: Date.now()
    }, {
      tags: ['form', `form:${formId}`]
    })
  }

  /**
   * Restore form state
   */
  async restoreFormState(formId: string): Promise<any | null> {
    const data = await this.get(`form:${formId}`)
    
    // Only return data if it's recent (within 10 minutes)
    if (data && Date.now() - data.savedAt < 10 * 60 * 1000) {
      return data
    }
    
    return null
  }

  /**
   * Clear form state
   */
  clearFormState(formId: string): void {
    this.invalidate(`form:${formId}`)
  }

  /**
   * Clear all form states
   */
  clearAllForms(): void {
    this.invalidate('form', true)
  }
}

/**
 * API response cache with smart invalidation
 */
export class ApiResponseCache extends AdvancedCache<any> {
  constructor() {
    super(CACHE_CONFIGS.apiResponses, 'apiResponse')
  }

  /**
   * Cache API response
   */
  async cacheApiResponse(
    endpoint: string,
    params: Record<string, any>,
    fetchFn: () => Promise<any>
  ): Promise<any> {
    const cacheKey = this.generateCacheKey(endpoint, params)
    return this.get(cacheKey, fetchFn, {
      tags: ['api', endpoint, ...Object.keys(params)]
    })
  }

  /**
   * Invalidate API responses by endpoint
   */
  invalidateEndpoint(endpoint: string): void {
    this.invalidate(endpoint, true)
  }

  /**
   * Generate cache key from endpoint and parameters
   */
  private generateCacheKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')
    
    return `${endpoint}?${sortedParams}`
  }
}

// Singleton instances
export const userProfileCache = new UserProfileCache()
export const sessionCache = new SessionCache()
export const formDataCache = new FormDataCache()
export const apiResponseCache = new ApiResponseCache()

/**
 * Initialize all caches
 */
export const initializeCaches = (): void => {
  // Caches are initialized as singletons
  console.debug('Authentication caches initialized')
}

/**
 * Cleanup all caches
 */
export const cleanupCaches = (): void => {
  userProfileCache.clear()
  sessionCache.destroy()
  formDataCache.clear()
  apiResponseCache.clear()
}

/**
 * Get cache statistics for all caches
 */
export const getAllCacheStats = () => {
  return {
    userProfile: userProfileCache.getStats(),
    session: sessionCache.getStats(),
    formData: formDataCache.getStats(),
    apiResponse: apiResponseCache.getStats()
  }
}