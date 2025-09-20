/**
 * Authentication Performance Optimization Module
 * 
 * This module provides performance optimizations for authentication pages including:
 * - Code splitting and lazy loading
 * - Caching strategies for user data and session management
 * - Bundle size optimization
 * - Loading performance enhancements
 */

import { lazy, ComponentType } from 'react'
import { LRUCache } from 'lru-cache'

// Types for performance optimization
export interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  bundleSize: number
  cacheHitRate: number
}

export interface CacheConfig {
  maxSize: number
  ttl: number // Time to live in milliseconds
  staleWhileRevalidate: number
}

export interface LazyComponentOptions {
  fallback?: ComponentType
  preload?: boolean
  chunkName?: string
}

// Default cache configurations
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
  staleWhileRevalidate: 2 * 60 * 1000 // 2 minutes
}

// User data cache for session management
const userDataCache = new LRUCache<string, any>({
  max: DEFAULT_CACHE_CONFIG.maxSize,
  ttl: DEFAULT_CACHE_CONFIG.ttl,
  allowStale: true,
  updateAgeOnGet: true,
  updateAgeOnHas: true
})

// Session cache for authentication state
const sessionCache = new LRUCache<string, any>({
  max: 50,
  ttl: 30 * 60 * 1000, // 30 minutes
  allowStale: true,
  updateAgeOnGet: true
})

// Form state cache for better UX
const formStateCache = new LRUCache<string, any>({
  max: 20,
  ttl: 10 * 60 * 1000, // 10 minutes
  allowStale: false
})

/**
 * Lazy load authentication components with optimized chunk splitting
 */
export const createLazyAuthComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): ComponentType<any> => {
  const LazyComponent = lazy(() => {
    // Add performance timing
    const startTime = performance.now()
    
    return importFn().then(module => {
      const loadTime = performance.now() - startTime
      
      // Track loading performance
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-component-loaded', {
          detail: { 
            component: options.chunkName || 'unknown',
            loadTime,
            timestamp: Date.now()
          }
        }))
      }
      
      return module
    })
  })

  // Add display name for debugging
  LazyComponent.displayName = `LazyAuth(${options.chunkName || 'Component'})`

  return LazyComponent
}

/**
 * Preload authentication components for better perceived performance
 */
export const preloadAuthComponents = async (): Promise<void> => {
  if (typeof window === 'undefined') return

  try {
    // Preload critical auth components
    const preloadPromises = [
      import('@/components/auth/sign-in-form'),
      import('@/components/auth/sign-up-form'),
      import('@/components/auth/password-reset-form')
    ]

    // Use requestIdleCallback for non-blocking preloading
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        Promise.all(preloadPromises).catch(console.warn)
      })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        Promise.all(preloadPromises).catch(console.warn)
      }, 100)
    }
  } catch (error) {
    console.warn('Failed to preload auth components:', error)
  }
}

/**
 * Cache user data with intelligent invalidation
 */
export class UserDataCache {
  private static instance: UserDataCache
  private cache = userDataCache

  static getInstance(): UserDataCache {
    if (!UserDataCache.instance) {
      UserDataCache.instance = new UserDataCache()
    }
    return UserDataCache.instance
  }

  /**
   * Get user data from cache
   */
  get(userId: string): any | null {
    return this.cache.get(userId) || null
  }

  /**
   * Set user data in cache
   */
  set(userId: string, userData: any, customTtl?: number): void {
    if (customTtl) {
      this.cache.set(userId, userData, { ttl: customTtl })
    } else {
      this.cache.set(userId, userData)
    }
  }

  /**
   * Invalidate user data cache
   */
  invalidate(userId: string): void {
    this.cache.delete(userId)
  }

  /**
   * Clear all cached user data
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: this.cache.calculatedSize / (this.cache.calculatedSize + this.cache.size)
    }
  }
}

/**
 * Session management cache with automatic cleanup
 */
export class SessionCache {
  private static instance: SessionCache
  private cache = sessionCache

  static getInstance(): SessionCache {
    if (!SessionCache.instance) {
      SessionCache.instance = new SessionCache()
    }
    return SessionCache.instance
  }

  /**
   * Get session data
   */
  getSession(sessionId: string): any | null {
    return this.cache.get(sessionId) || null
  }

  /**
   * Set session data
   */
  setSession(sessionId: string, sessionData: any): void {
    this.cache.set(sessionId, {
      ...sessionData,
      lastAccessed: Date.now()
    })
  }

  /**
   * Update session last accessed time
   */
  touchSession(sessionId: string): void {
    const session = this.cache.get(sessionId)
    if (session) {
      this.cache.set(sessionId, {
        ...session,
        lastAccessed: Date.now()
      })
    }
  }

  /**
   * Remove session from cache
   */
  removeSession(sessionId: string): void {
    this.cache.delete(sessionId)
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: this.cache.calculatedSize / (this.cache.calculatedSize + this.cache.size)
    }
  }
}

/**
 * Form state persistence for better UX
 */
export class FormStateCache {
  private static instance: FormStateCache
  private cache = formStateCache

  static getInstance(): FormStateCache {
    if (!FormStateCache.instance) {
      FormStateCache.instance = new FormStateCache()
    }
    return FormStateCache.instance
  }

  /**
   * Save form state
   */
  saveFormState(formId: string, formData: any): void {
    this.cache.set(formId, {
      data: formData,
      timestamp: Date.now()
    })
  }

  /**
   * Restore form state
   */
  restoreFormState(formId: string): any | null {
    const cached = this.cache.get(formId)
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) { // 10 minutes
      return cached.data
    }
    return null
  }

  /**
   * Clear form state
   */
  clearFormState(formId: string): void {
    this.cache.delete(formId)
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: this.cache.calculatedSize / (this.cache.calculatedSize + this.cache.size)
    }
  }
}

/**
 * Performance monitoring for authentication flows
 */
export class AuthPerformanceMonitor {
  private static instance: AuthPerformanceMonitor
  private metrics: Map<string, PerformanceMetrics> = new Map()

  static getInstance(): AuthPerformanceMonitor {
    if (!AuthPerformanceMonitor.instance) {
      AuthPerformanceMonitor.instance = new AuthPerformanceMonitor()
    }
    return AuthPerformanceMonitor.instance
  }

  /**
   * Start performance measurement
   */
  startMeasurement(id: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`auth-${id}-start`)
    }
  }

  /**
   * End performance measurement
   */
  endMeasurement(id: string): PerformanceMetrics | null {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return null
    }

    try {
      performance.mark(`auth-${id}-end`)
      performance.measure(`auth-${id}`, `auth-${id}-start`, `auth-${id}-end`)
      
      const measure = performance.getEntriesByName(`auth-${id}`)[0]
      const metrics: PerformanceMetrics = {
        loadTime: measure.duration,
        renderTime: measure.duration,
        bundleSize: 0, // Would need to be calculated separately
        cacheHitRate: this.calculateCacheHitRate()
      }

      this.metrics.set(id, metrics)
      
      // Clean up performance entries
      performance.clearMarks(`auth-${id}-start`)
      performance.clearMarks(`auth-${id}-end`)
      performance.clearMeasures(`auth-${id}`)

      return metrics
    } catch (error) {
      console.warn('Performance measurement failed:', error)
      return null
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(id: string): PerformanceMetrics | null {
    return this.metrics.get(id) || null
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics)
  }

  /**
   * Calculate cache hit rate across all caches
   */
  private calculateCacheHitRate(): number {
    const userCache = UserDataCache.getInstance()
    const sessionCache = SessionCache.getInstance()
    
    const userStats = userCache.getStats()
    const sessionStats = sessionCache.getStats()
    
    return (userStats.hitRate + sessionStats.hitRate) / 2
  }
}

/**
 * Bundle size optimization utilities
 */
export const optimizeBundleSize = {
  /**
   * Dynamic import with error handling
   */
  async dynamicImport<T>(importFn: () => Promise<T>): Promise<T | null> {
    try {
      return await importFn()
    } catch (error) {
      console.error('Dynamic import failed:', error)
      return null
    }
  },

  /**
   * Preload critical resources
   */
  preloadCriticalResources(): void {
    if (typeof window === 'undefined') return

    // Preload critical CSS
    const criticalCSS = [
      '/styles/auth.css',
      '/styles/mobile-optimizations.css'
    ]

    criticalCSS.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = href
      document.head.appendChild(link)
    })

    // Preload critical fonts
    const criticalFonts = [
      '/fonts/inter-var.woff2'
    ]

    criticalFonts.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = 'font/woff2'
      link.crossOrigin = 'anonymous'
      link.href = href
      document.head.appendChild(link)
    })
  }
}

/**
 * Initialize performance optimizations
 */
export const initializeAuthPerformance = (): void => {
  if (typeof window === 'undefined') return

  // Initialize caches
  UserDataCache.getInstance()
  SessionCache.getInstance()
  FormStateCache.getInstance()
  AuthPerformanceMonitor.getInstance()

  // Preload critical resources
  optimizeBundleSize.preloadCriticalResources()

  // Set up performance observers
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.name.includes('auth-component-loaded')) {
          console.debug('Auth component loaded:', entry)
        }
      })
    })

    observer.observe({ entryTypes: ['measure', 'navigation'] })
  }

  // Clean up caches periodically
  setInterval(() => {
    const userCache = UserDataCache.getInstance()
    const sessionCache = SessionCache.getInstance()
    const formCache = FormStateCache.getInstance()

    // Force garbage collection on caches
    userCache.clear()
    sessionCache.clearSessions()
    formCache.clearFormState('expired')
  }, 30 * 60 * 1000) // Every 30 minutes
}

// Export singleton instances
export const userDataCache_instance = UserDataCache.getInstance()
export const sessionCache_instance = SessionCache.getInstance()
export const formStateCache_instance = FormStateCache.getInstance()
export const performanceMonitor = AuthPerformanceMonitor.getInstance()