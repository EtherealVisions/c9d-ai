/**
 * Repository Performance Monitor
 * 
 * This file provides performance monitoring and optimization utilities for
 * repository operations including query analysis, cache performance, and
 * operation metrics.
 */

import { performance } from 'perf_hooks'
import { getCacheService } from './cache-service'

/**
 * Performance metrics for repository operations
 */
export interface OperationMetrics {
  operation: string
  entity: string
  duration: number
  timestamp: number
  cacheHit: boolean
  queryCount: number
  resultCount: number
  error?: string
}

/**
 * Aggregated performance statistics
 */
export interface PerformanceStats {
  totalOperations: number
  averageDuration: number
  cacheHitRate: number
  slowQueries: OperationMetrics[]
  errorRate: number
  operationBreakdown: Record<string, {
    count: number
    averageDuration: number
    cacheHitRate: number
  }>
  entityBreakdown: Record<string, {
    count: number
    averageDuration: number
    cacheHitRate: number
  }>
}

/**
 * Performance monitoring configuration
 */
export interface MonitorConfig {
  enabled: boolean
  slowQueryThreshold: number // milliseconds
  maxMetricsHistory: number
  aggregationInterval: number // milliseconds
}

/**
 * Repository Performance Monitor Implementation
 */
export class RepositoryPerformanceMonitor {
  private metrics: OperationMetrics[] = []
  private config: MonitorConfig
  private aggregationTimer?: NodeJS.Timeout

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development' || process.env.ENABLE_PERF_MONITORING === 'true',
      slowQueryThreshold: 1000, // 1 second
      maxMetricsHistory: 10000,
      aggregationInterval: 60000, // 1 minute
      ...config
    }

    if (this.config.enabled) {
      this.startAggregation()
    }
  }

  /**
   * Record operation metrics
   */
  recordOperation(metrics: OperationMetrics): void {
    if (!this.config.enabled) {
      return
    }

    this.metrics.push(metrics)

    // Trim metrics if we exceed max history
    if (this.metrics.length > this.config.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsHistory)
    }

    // Log slow queries
    if (metrics.duration > this.config.slowQueryThreshold) {
      console.warn('[PerformanceMonitor] Slow query detected:', {
        operation: metrics.operation,
        entity: metrics.entity,
        duration: `${metrics.duration}ms`,
        cacheHit: metrics.cacheHit,
        resultCount: metrics.resultCount
      })
    }

    // Log errors
    if (metrics.error) {
      console.error('[PerformanceMonitor] Operation error:', {
        operation: metrics.operation,
        entity: metrics.entity,
        error: metrics.error,
        duration: `${metrics.duration}ms`
      })
    }
  }

  /**
   * Create a performance wrapper for repository methods
   */
  wrapMethod<T extends any[], R>(
    entity: string,
    operation: string,
    method: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    if (!this.config.enabled) {
      return method
    }

    return async (...args: T): Promise<R> => {
      const startTime = performance.now()
      let cacheHit = false
      let resultCount = 0
      let error: string | undefined

      try {
        const result = await method(...args)
        
        // Try to determine if this was a cache hit
        // This is a heuristic based on execution time
        const duration = performance.now() - startTime
        cacheHit = duration < 10 // Less than 10ms likely indicates cache hit

        // Try to count results
        if (Array.isArray(result)) {
          resultCount = result.length
        } else if (result && typeof result === 'object' && 'data' in result) {
          const repositoryResult = result as any
          if (Array.isArray(repositoryResult.data)) {
            resultCount = repositoryResult.data.length
          }
        } else if (result !== null && result !== undefined) {
          resultCount = 1
        }

        this.recordOperation({
          operation,
          entity,
          duration: performance.now() - startTime,
          timestamp: Date.now(),
          cacheHit,
          queryCount: 1,
          resultCount
        })

        return result
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error'
        
        this.recordOperation({
          operation,
          entity,
          duration: performance.now() - startTime,
          timestamp: Date.now(),
          cacheHit: false,
          queryCount: 1,
          resultCount: 0,
          error
        })

        throw err
      }
    }
  }

  /**
   * Get current performance statistics
   */
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        slowQueries: [],
        errorRate: 0,
        operationBreakdown: {},
        entityBreakdown: {}
      }
    }

    const totalOperations = this.metrics.length
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    const averageDuration = totalDuration / totalOperations
    
    const cacheHits = this.metrics.filter(m => m.cacheHit).length
    const cacheHitRate = (cacheHits / totalOperations) * 100
    
    const errors = this.metrics.filter(m => m.error).length
    const errorRate = (errors / totalOperations) * 100
    
    const slowQueries = this.metrics
      .filter(m => m.duration > this.config.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10) // Top 10 slowest

    // Operation breakdown
    const operationBreakdown: Record<string, any> = {}
    this.metrics.forEach(m => {
      if (!operationBreakdown[m.operation]) {
        operationBreakdown[m.operation] = {
          metrics: [],
          count: 0,
          totalDuration: 0,
          cacheHits: 0
        }
      }
      
      const breakdown = operationBreakdown[m.operation]
      breakdown.metrics.push(m)
      breakdown.count++
      breakdown.totalDuration += m.duration
      if (m.cacheHit) breakdown.cacheHits++
    })

    // Calculate averages for operations
    Object.keys(operationBreakdown).forEach(op => {
      const breakdown = operationBreakdown[op]
      breakdown.averageDuration = breakdown.totalDuration / breakdown.count
      breakdown.cacheHitRate = (breakdown.cacheHits / breakdown.count) * 100
      delete breakdown.metrics
      delete breakdown.totalDuration
      delete breakdown.cacheHits
    })

    // Entity breakdown
    const entityBreakdown: Record<string, any> = {}
    this.metrics.forEach(m => {
      if (!entityBreakdown[m.entity]) {
        entityBreakdown[m.entity] = {
          metrics: [],
          count: 0,
          totalDuration: 0,
          cacheHits: 0
        }
      }
      
      const breakdown = entityBreakdown[m.entity]
      breakdown.metrics.push(m)
      breakdown.count++
      breakdown.totalDuration += m.duration
      if (m.cacheHit) breakdown.cacheHits++
    })

    // Calculate averages for entities
    Object.keys(entityBreakdown).forEach(entity => {
      const breakdown = entityBreakdown[entity]
      breakdown.averageDuration = breakdown.totalDuration / breakdown.count
      breakdown.cacheHitRate = (breakdown.cacheHits / breakdown.count) * 100
      delete breakdown.metrics
      delete breakdown.totalDuration
      delete breakdown.cacheHits
    })

    return {
      totalOperations,
      averageDuration,
      cacheHitRate,
      slowQueries,
      errorRate,
      operationBreakdown,
      entityBreakdown
    }
  }

  /**
   * Get performance report
   */
  async getPerformanceReport(): Promise<{
    repository: PerformanceStats
    cache: Awaited<ReturnType<typeof getCacheService>>['getStats']
    recommendations: string[]
  }> {
    const repositoryStats = this.getStats()
    const cacheService = getCacheService()
    const cacheStats = await cacheService.getStats()

    const recommendations: string[] = []

    // Generate recommendations based on metrics
    if (repositoryStats.cacheHitRate < 50) {
      recommendations.push('Cache hit rate is low. Consider increasing cache TTL or warming cache for frequently accessed data.')
    }

    if (repositoryStats.averageDuration > 500) {
      recommendations.push('Average query duration is high. Consider adding database indexes or optimizing queries.')
    }

    if (repositoryStats.errorRate > 5) {
      recommendations.push('Error rate is high. Review error logs and improve error handling.')
    }

    if (repositoryStats.slowQueries.length > 0) {
      recommendations.push(`Found ${repositoryStats.slowQueries.length} slow queries. Review and optimize these operations.`)
    }

    // Cache-specific recommendations
    if (cacheStats.hitRate < 60) {
      recommendations.push('Cache hit rate is suboptimal. Review cache configuration and invalidation strategies.')
    }

    return {
      repository: repositoryStats,
      cache: cacheStats,
      recommendations
    }
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Start periodic aggregation and reporting
   */
  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      if (this.metrics.length > 0) {
        const stats = this.getStats()
        console.log('[PerformanceMonitor] Periodic stats:', {
          totalOperations: stats.totalOperations,
          averageDuration: `${stats.averageDuration.toFixed(2)}ms`,
          cacheHitRate: `${stats.cacheHitRate.toFixed(1)}%`,
          errorRate: `${stats.errorRate.toFixed(1)}%`,
          slowQueries: stats.slowQueries.length
        })
      }
    }, this.config.aggregationInterval)
  }

  /**
   * Stop monitoring and cleanup
   */
  stop(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer)
      this.aggregationTimer = undefined
    }
    this.clearMetrics()
  }
}

/**
 * Global performance monitor instance
 */
let globalPerformanceMonitor: RepositoryPerformanceMonitor | undefined

/**
 * Get or create global performance monitor
 */
export function getPerformanceMonitor(): RepositoryPerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new RepositoryPerformanceMonitor()
  }
  return globalPerformanceMonitor
}

/**
 * Set global performance monitor (useful for testing)
 */
export function setPerformanceMonitor(monitor: RepositoryPerformanceMonitor): void {
  globalPerformanceMonitor = monitor
}

/**
 * Clear global performance monitor (useful for testing)
 */
export function clearPerformanceMonitor(): void {
  if (globalPerformanceMonitor) {
    globalPerformanceMonitor.stop()
    globalPerformanceMonitor = undefined
  }
}

/**
 * Decorator for automatic performance monitoring
 */
export function monitored(entity: string, operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const monitor = getPerformanceMonitor()

    descriptor.value = monitor.wrapMethod(entity, operation, originalMethod)
    
    return descriptor
  }
}

/**
 * Performance monitoring middleware for repository methods
 */
export function withPerformanceMonitoring<T extends any[], R>(
  entity: string,
  operation: string,
  method: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  const monitor = getPerformanceMonitor()
  return monitor.wrapMethod(entity, operation, method)
}