/**
 * Database Query Logger
 * 
 * This file provides comprehensive query logging, performance monitoring,
 * and query analysis capabilities for the Drizzle database layer.
 */

import { sql } from 'drizzle-orm'
import { db } from './connection'

/**
 * Log levels for query logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Query execution metrics
 */
export interface QueryMetrics {
  query: string
  params?: any[]
  duration: number
  timestamp: Date
  success: boolean
  error?: string
  rowCount?: number
  connectionId?: string
  userId?: string
  organizationId?: string
}

/**
 * Performance thresholds
 */
export interface PerformanceThresholds {
  slow: number      // Queries slower than this (ms) are considered slow
  warning: number   // Queries slower than this (ms) trigger warnings
  critical: number  // Queries slower than this (ms) are critical
}

/**
 * Query analysis result
 */
export interface QueryAnalysis {
  query: string
  executionPlan?: any
  recommendations: string[]
  severity: 'info' | 'warning' | 'critical'
  estimatedCost?: number
}

/**
 * Default performance thresholds
 */
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  slow: 100,      // 100ms
  warning: 500,   // 500ms
  critical: 2000  // 2 seconds
}

/**
 * Query logger class
 */
export class QueryLogger {
  private static instance: QueryLogger
  private metrics: QueryMetrics[] = []
  private maxMetricsHistory = 1000
  private thresholds: PerformanceThresholds
  private logLevel: LogLevel
  private enabled: boolean

  constructor(
    thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS,
    logLevel: LogLevel = LogLevel.INFO
  ) {
    this.thresholds = thresholds
    this.logLevel = logLevel
    this.enabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_QUERY_LOGGING === 'true'
  }

  /**
   * Get singleton instance
   */
  static getInstance(): QueryLogger {
    if (!QueryLogger.instance) {
      QueryLogger.instance = new QueryLogger()
    }
    return QueryLogger.instance
  }

  /**
   * Log a query execution
   */
  logQuery(metrics: QueryMetrics): void {
    if (!this.enabled) return

    // Add to metrics history
    this.metrics.push(metrics)
    
    // Maintain history size
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }

    // Determine log level based on performance
    let level = LogLevel.DEBUG
    if (metrics.duration > this.thresholds.critical) {
      level = LogLevel.ERROR
    } else if (metrics.duration > this.thresholds.warning) {
      level = LogLevel.WARN
    } else if (metrics.duration > this.thresholds.slow) {
      level = LogLevel.INFO
    }

    // Only log if meets minimum log level
    if (this.shouldLog(level)) {
      this.writeLog(level, metrics)
    }

    // Trigger alerts for critical queries
    if (metrics.duration > this.thresholds.critical) {
      this.triggerAlert(metrics)
    }
  }

  /**
   * Check if should log at given level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const currentIndex = levels.indexOf(this.logLevel)
    const messageIndex = levels.indexOf(level)
    return messageIndex >= currentIndex
  }

  /**
   * Write log entry
   */
  private writeLog(level: LogLevel, metrics: QueryMetrics): void {
    const logData = {
      level,
      timestamp: metrics.timestamp.toISOString(),
      duration: `${metrics.duration}ms`,
      success: metrics.success,
      query: this.sanitizeQuery(metrics.query),
      params: metrics.params,
      rowCount: metrics.rowCount,
      userId: metrics.userId,
      organizationId: metrics.organizationId,
      error: metrics.error
    }

    const message = `[DB Query] ${metrics.success ? '✅' : '❌'} ${metrics.duration}ms - ${this.sanitizeQuery(metrics.query)}`

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message, logData)
        break
      case LogLevel.INFO:
        console.info(message, logData)
        break
      case LogLevel.WARN:
        console.warn(message, logData)
        break
      case LogLevel.ERROR:
        console.error(message, logData)
        break
    }
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data patterns
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'")
      .trim()
  }

  /**
   * Trigger alert for critical queries
   */
  private triggerAlert(metrics: QueryMetrics): void {
    console.error(`🚨 [DB Alert] Critical query performance detected:`, {
      duration: `${metrics.duration}ms`,
      threshold: `${this.thresholds.critical}ms`,
      query: this.sanitizeQuery(metrics.query),
      timestamp: metrics.timestamp.toISOString()
    })

    // In production, this could send alerts to monitoring systems
    // e.g., Sentry, DataDog, CloudWatch, etc.
  }

  /**
   * Get query metrics summary
   */
  getMetricsSummary(): {
    totalQueries: number
    averageDuration: number
    slowQueries: number
    failedQueries: number
    recentQueries: QueryMetrics[]
  } {
    const totalQueries = this.metrics.length
    const averageDuration = totalQueries > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries 
      : 0
    const slowQueries = this.metrics.filter(m => m.duration > this.thresholds.slow).length
    const failedQueries = this.metrics.filter(m => !m.success).length
    const recentQueries = this.metrics.slice(-10)

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowQueries,
      failedQueries,
      recentQueries
    }
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit = 10): QueryMetrics[] {
    return this.metrics
      .filter(m => m.duration > this.thresholds.slow)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Update thresholds
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }
}

/**
 * Query execution wrapper with logging
 */
export async function executeWithLogging<T>(
  queryFn: () => Promise<T>,
  queryString: string,
  params?: any[],
  context?: { userId?: string; organizationId?: string }
): Promise<T> {
  const logger = QueryLogger.getInstance()
  const startTime = Date.now()
  const timestamp = new Date()

  try {
    const result = await queryFn()
    const duration = Date.now() - startTime

    // Determine row count if possible
    let rowCount: number | undefined
    if (Array.isArray(result)) {
      rowCount = result.length
    } else if (result && typeof result === 'object' && 'length' in result) {
      rowCount = (result as any).length
    }

    logger.logQuery({
      query: queryString,
      params,
      duration,
      timestamp,
      success: true,
      rowCount,
      userId: context?.userId,
      organizationId: context?.organizationId
    })

    return result

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.logQuery({
      query: queryString,
      params,
      duration,
      timestamp,
      success: false,
      error: errorMessage,
      userId: context?.userId,
      organizationId: context?.organizationId
    })

    throw error
  }
}

/**
 * Analyze query performance
 */
export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  const recommendations: string[] = []
  let severity: 'info' | 'warning' | 'critical' = 'info'
  let executionPlan: any
  let estimatedCost: number | undefined

  try {
    // Get query execution plan
    const planResult = await db.execute(sql.raw(`EXPLAIN (FORMAT JSON, ANALYZE false) ${query}`))
    executionPlan = planResult[0]?.['QUERY PLAN']

    if (executionPlan && executionPlan[0]) {
      const plan = executionPlan[0]
      estimatedCost = plan['Total Cost']

      // Analyze execution plan for recommendations
      if (plan['Node Type'] === 'Seq Scan') {
        recommendations.push('Consider adding an index to avoid sequential scan')
        severity = 'warning'
      }

      if (estimatedCost && estimatedCost > 1000) {
        recommendations.push('High estimated cost - consider query optimization')
        severity = estimatedCost > 10000 ? 'critical' : 'warning'
      }

      if (plan['Rows'] && plan['Rows'] > 10000) {
        recommendations.push('Large result set - consider adding LIMIT or filtering')
        severity = 'warning'
      }
    }

    // Analyze query text for common issues
    const queryLower = query.toLowerCase()

    if (queryLower.includes('select *')) {
      recommendations.push('Avoid SELECT * - specify only needed columns')
      severity = 'warning'
    }

    if (queryLower.includes('like \'%') && queryLower.includes('%\'')) {
      recommendations.push('Leading wildcard in LIKE prevents index usage')
      severity = 'warning'
    }

    if (!queryLower.includes('limit') && queryLower.includes('select')) {
      recommendations.push('Consider adding LIMIT to prevent large result sets')
    }

    if (queryLower.includes('order by') && !queryLower.includes('limit')) {
      recommendations.push('ORDER BY without LIMIT can be expensive for large tables')
    }

  } catch (error) {
    recommendations.push(`Query analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    severity = 'warning'
  }

  return {
    query,
    executionPlan,
    recommendations,
    severity,
    estimatedCost
  }
}

/**
 * Get database performance metrics
 */
export async function getDatabaseMetrics(): Promise<{
  activeConnections: number
  totalConnections: number
  cacheHitRatio: number
  averageQueryTime: number
  slowQueries: number
  blockedQueries: number
}> {
  try {
    // Get connection stats
    const connectionStats = await db.execute(sql`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `)

    // Get cache hit ratio
    const cacheStats = await db.execute(sql`
      SELECT 
        sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) * 100 as cache_hit_ratio
      FROM pg_stat_database
      WHERE datname = current_database()
    `)

    // Get query stats (requires pg_stat_statements extension)
    let queryStats: any[] = []
    try {
      queryStats = await db.execute(sql`
        SELECT 
          avg(mean_exec_time) as avg_query_time,
          count(*) FILTER (WHERE mean_exec_time > 1000) as slow_queries
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      `)
    } catch (error) {
      // pg_stat_statements might not be available
      console.warn('[DB Metrics] pg_stat_statements not available:', error)
    }

    // Get blocked queries
    const blockedStats = await db.execute(sql`
      SELECT count(*) as blocked_queries
      FROM pg_stat_activity
      WHERE wait_event IS NOT NULL
        AND datname = current_database()
    `)

    return {
      activeConnections: Number(connectionStats[0]?.active_connections || 0),
      totalConnections: Number(connectionStats[0]?.total_connections || 0),
      cacheHitRatio: Number(cacheStats[0]?.cache_hit_ratio || 0),
      averageQueryTime: Number(queryStats[0]?.avg_query_time || 0),
      slowQueries: Number(queryStats[0]?.slow_queries || 0),
      blockedQueries: Number(blockedStats[0]?.blocked_queries || 0)
    }

  } catch (error) {
    console.error('[DB Metrics] Failed to get database metrics:', error)
    return {
      activeConnections: 0,
      totalConnections: 0,
      cacheHitRatio: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      blockedQueries: 0
    }
  }
}

/**
 * Export singleton instance
 */
export const queryLogger = QueryLogger.getInstance()