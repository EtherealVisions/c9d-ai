/**
 * Database Performance Monitor
 * 
 * This file provides real-time performance monitoring, alerting,
 * and optimization recommendations for database operations.
 */

import { sql } from 'drizzle-orm'
import { db } from './connection'
import { queryLogger, type QueryMetrics, getDatabaseMetrics } from './query-logger'

/**
 * Performance alert configuration
 */
export interface AlertConfig {
  enabled: boolean
  thresholds: {
    slowQueryMs: number
    highConnectionCount: number
    lowCacheHitRatio: number
    highBlockedQueries: number
  }
  notifications: {
    console: boolean
    webhook?: string
    email?: string
  }
}

/**
 * Performance trend data
 */
export interface PerformanceTrend {
  timestamp: Date
  averageQueryTime: number
  activeConnections: number
  cacheHitRatio: number
  slowQueries: number
  errorRate: number
}

/**
 * Performance recommendation
 */
export interface PerformanceRecommendation {
  type: 'index' | 'query' | 'configuration' | 'maintenance'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  impact: string
  solution: string
  estimatedImprovement?: string
}

/**
 * Default alert configuration
 */
const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enabled: process.env.NODE_ENV === 'production',
  thresholds: {
    slowQueryMs: 1000,
    highConnectionCount: 80,
    lowCacheHitRatio: 90,
    highBlockedQueries: 5
  },
  notifications: {
    console: true
  }
}

/**
 * Performance monitor class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private trends: PerformanceTrend[] = []
  private maxTrendHistory = 1440 // 24 hours of minute-by-minute data
  private alertConfig: AlertConfig
  private monitoringInterval?: NodeJS.Timeout
  private lastAlerts: Map<string, Date> = new Map()
  private alertCooldown = 5 * 60 * 1000 // 5 minutes

  constructor(alertConfig: AlertConfig = DEFAULT_ALERT_CONFIG) {
    this.alertConfig = alertConfig
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs = 60000): void {
    if (this.monitoringInterval) {
      console.warn('[Performance Monitor] Monitoring already started')
      return
    }

    console.log('[Performance Monitor] Starting performance monitoring')
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics()
      } catch (error) {
        console.error('[Performance Monitor] Failed to collect metrics:', error)
      }
    }, intervalMs)

    // Collect initial metrics
    this.collectMetrics().catch(error => {
      console.error('[Performance Monitor] Failed to collect initial metrics:', error)
    })
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
      console.log('[Performance Monitor] Performance monitoring stopped')
    }
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const [dbMetrics, queryMetrics] = await Promise.all([
        getDatabaseMetrics(),
        this.getQueryMetrics()
      ])

      const trend: PerformanceTrend = {
        timestamp: new Date(),
        averageQueryTime: dbMetrics.averageQueryTime,
        activeConnections: dbMetrics.activeConnections,
        cacheHitRatio: dbMetrics.cacheHitRatio,
        slowQueries: dbMetrics.slowQueries,
        errorRate: queryMetrics.errorRate
      }

      // Add to trends
      this.trends.push(trend)
      
      // Maintain history size
      if (this.trends.length > this.maxTrendHistory) {
        this.trends = this.trends.slice(-this.maxTrendHistory)
      }

      // Check for alerts
      if (this.alertConfig.enabled) {
        await this.checkAlerts(trend, dbMetrics)
      }

    } catch (error) {
      console.error('[Performance Monitor] Failed to collect metrics:', error)
    }
  }

  /**
   * Get query metrics from logger
   */
  private getQueryMetrics(): { errorRate: number } {
    const summary = queryLogger.getMetricsSummary()
    const errorRate = summary.totalQueries > 0 
      ? (summary.failedQueries / summary.totalQueries) * 100 
      : 0

    return { errorRate }
  }

  /**
   * Check for performance alerts
   */
  private async checkAlerts(trend: PerformanceTrend, dbMetrics: any): Promise<void> {
    const alerts: string[] = []

    // Check slow queries
    if (trend.averageQueryTime > this.alertConfig.thresholds.slowQueryMs) {
      alerts.push(`High average query time: ${trend.averageQueryTime.toFixed(2)}ms`)
    }

    // Check connection count
    if (trend.activeConnections > this.alertConfig.thresholds.highConnectionCount) {
      alerts.push(`High connection count: ${trend.activeConnections}`)
    }

    // Check cache hit ratio
    if (trend.cacheHitRatio < this.alertConfig.thresholds.lowCacheHitRatio) {
      alerts.push(`Low cache hit ratio: ${trend.cacheHitRatio.toFixed(2)}%`)
    }

    // Check blocked queries
    if (dbMetrics.blockedQueries > this.alertConfig.thresholds.highBlockedQueries) {
      alerts.push(`High blocked queries: ${dbMetrics.blockedQueries}`)
    }

    // Check error rate
    if (trend.errorRate > 5) {
      alerts.push(`High error rate: ${trend.errorRate.toFixed(2)}%`)
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert, trend)
    }
  }

  /**
   * Send performance alert
   */
  private async sendAlert(message: string, trend: PerformanceTrend): Promise<void> {
    const alertKey = message.split(':')[0] // Use first part as key
    const now = new Date()
    const lastAlert = this.lastAlerts.get(alertKey)

    // Check cooldown
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < this.alertCooldown) {
      return
    }

    this.lastAlerts.set(alertKey, now)

    if (this.alertConfig.notifications.console) {
      console.warn(`🚨 [Performance Alert] ${message}`, {
        timestamp: trend.timestamp.toISOString(),
        metrics: {
          averageQueryTime: trend.averageQueryTime,
          activeConnections: trend.activeConnections,
          cacheHitRatio: trend.cacheHitRatio,
          errorRate: trend.errorRate
        }
      })
    }

    // TODO: Implement webhook and email notifications
    if (this.alertConfig.notifications.webhook) {
      // Send webhook notification
    }

    if (this.alertConfig.notifications.email) {
      // Send email notification
    }
  }

  /**
   * Get performance trends
   */
  getTrends(hours = 24): PerformanceTrend[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.trends.filter(t => t.timestamp >= cutoff)
  }

  /**
   * Get current performance status
   */
  getCurrentStatus(): {
    status: 'healthy' | 'warning' | 'critical'
    metrics: PerformanceTrend | null
    issues: string[]
  } {
    const latest = this.trends[this.trends.length - 1]
    if (!latest) {
      return { status: 'warning', metrics: null, issues: ['No metrics available'] }
    }

    const issues: string[] = []
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'

    // Check thresholds
    if (latest.averageQueryTime > this.alertConfig.thresholds.slowQueryMs) {
      issues.push('High average query time')
      status = 'warning'
    }

    if (latest.activeConnections > this.alertConfig.thresholds.highConnectionCount) {
      issues.push('High connection count')
      status = 'warning'
    }

    if (latest.cacheHitRatio < this.alertConfig.thresholds.lowCacheHitRatio) {
      issues.push('Low cache hit ratio')
      status = 'warning'
    }

    if (latest.errorRate > 10) {
      issues.push('High error rate')
      status = 'critical'
    }

    return { status, metrics: latest, issues }
  }

  /**
   * Generate performance recommendations
   */
  async generateRecommendations(): Promise<PerformanceRecommendation[]> {
    const recommendations: PerformanceRecommendation[] = []

    try {
      // Analyze slow queries
      const slowQueries = queryLogger.getSlowQueries(5)
      if (slowQueries.length > 0) {
        recommendations.push({
          type: 'query',
          severity: 'high',
          title: 'Optimize Slow Queries',
          description: `Found ${slowQueries.length} slow queries affecting performance`,
          impact: 'High - Slow queries increase response time and resource usage',
          solution: 'Review and optimize slow queries, add appropriate indexes',
          estimatedImprovement: '20-50% query performance improvement'
        })
      }

      // Check cache hit ratio
      const dbMetrics = await getDatabaseMetrics()
      if (dbMetrics.cacheHitRatio < 90) {
        recommendations.push({
          type: 'configuration',
          severity: 'medium',
          title: 'Improve Cache Hit Ratio',
          description: `Cache hit ratio is ${dbMetrics.cacheHitRatio.toFixed(2)}% (target: >95%)`,
          impact: 'Medium - Low cache hit ratio increases disk I/O',
          solution: 'Increase shared_buffers, optimize queries to use indexes',
          estimatedImprovement: '10-30% overall performance improvement'
        })
      }

      // Check for missing indexes
      const missingIndexes = await this.findMissingIndexes()
      if (missingIndexes.length > 0) {
        recommendations.push({
          type: 'index',
          severity: 'high',
          title: 'Add Missing Indexes',
          description: `Found ${missingIndexes.length} tables that could benefit from indexes`,
          impact: 'High - Missing indexes cause slow sequential scans',
          solution: `Add indexes on frequently queried columns: ${missingIndexes.join(', ')}`,
          estimatedImprovement: '50-90% query performance improvement'
        })
      }

      // Check for maintenance needs
      const maintenanceNeeded = await this.checkMaintenanceNeeds()
      if (maintenanceNeeded.length > 0) {
        recommendations.push({
          type: 'maintenance',
          severity: 'medium',
          title: 'Database Maintenance Required',
          description: 'Tables need maintenance to optimize performance',
          impact: 'Medium - Bloated tables and indexes reduce performance',
          solution: 'Run VACUUM ANALYZE on affected tables',
          estimatedImprovement: '10-25% performance improvement'
        })
      }

    } catch (error) {
      console.error('[Performance Monitor] Failed to generate recommendations:', error)
    }

    return recommendations
  }

  /**
   * Find missing indexes
   */
  private async findMissingIndexes(): Promise<string[]> {
    try {
      // This is a simplified check - in production, you'd want more sophisticated analysis
      const result = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch
        FROM pg_stat_user_tables
        WHERE seq_scan > idx_scan * 2
          AND seq_tup_read > 10000
        ORDER BY seq_tup_read DESC
        LIMIT 10
      `)

      return result.map((row: any) => `${row.schemaname}.${row.tablename}`)

    } catch (error) {
      console.error('[Performance Monitor] Failed to find missing indexes:', error)
      return []
    }
  }

  /**
   * Check maintenance needs
   */
  private async checkMaintenanceNeeds(): Promise<string[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_dead_tup,
          n_live_tup
        FROM pg_stat_user_tables
        WHERE n_dead_tup > n_live_tup * 0.1
          AND n_dead_tup > 1000
        ORDER BY n_dead_tup DESC
        LIMIT 10
      `)

      return result.map((row: any) => `${row.schemaname}.${row.tablename}`)

    } catch (error) {
      console.error('[Performance Monitor] Failed to check maintenance needs:', error)
      return []
    }
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config }
  }

  /**
   * Clear trends history
   */
  clearTrends(): void {
    this.trends = []
  }
}

/**
 * Export singleton instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance()

/**
 * Initialize performance monitoring in development
 */
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
  performanceMonitor.startMonitoring()
}