/**
 * Database Metrics API
 * 
 * This endpoint provides access to database performance metrics
 * and monitoring data for administrative purposes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { 
  getDatabaseMetrics, 
  queryLogger
} from '@/lib/db/query-logger'
import { performanceMonitor } from '@/lib/db/performance-monitor'
import { 
  checkDatabaseHealth, 
  getConnectionStatus, 
  getPoolMetrics,
  getPerformanceMetrics
} from '@/lib/db/connection'

/**
 * GET /api/admin/database/metrics
 * 
 * Returns comprehensive database performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Add proper admin role check
    // For now, only allow in development or with specific env var
    const nodeEnv = process.env.NODE_ENV
    const allowMetrics = nodeEnv === 'development' || process.env.ALLOW_DB_METRICS === 'true'
    
    if (!allowMetrics) {
      return NextResponse.json(
        { error: 'Database metrics access not allowed' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const includeRecommendations = searchParams.get('recommendations') === 'true'
    const includeTrends = searchParams.get('trends') === 'true'
    const trendsHours = parseInt(searchParams.get('trendsHours') || '24')

    // Collect all metrics
    const [
      dbMetrics,
      connectionStatus,
      poolMetrics,
      performanceMetrics,
      queryMetrics,
      currentStatus
    ] = await Promise.all([
      getDatabaseMetrics(),
      checkDatabaseHealth(),
      getPoolMetrics(),
      getPerformanceMetrics(),
      queryLogger.getMetricsSummary(),
      performanceMonitor.getCurrentStatus()
    ])

    const response: any = {
      timestamp: new Date().toISOString(),
      status: currentStatus.status,
      connection: {
        connected: connectionStatus.connected,
        healthy: connectionStatus.healthy,
        lastCheck: connectionStatus.lastCheck,
        error: connectionStatus.error
      },
      performance: {
        database: dbMetrics,
        pool: poolMetrics,
        system: performanceMetrics,
        queries: queryMetrics,
        current: currentStatus.metrics
      },
      issues: currentStatus.issues
    }

    // Include performance recommendations if requested
    if (includeRecommendations) {
      try {
        response.recommendations = await performanceMonitor.generateRecommendations()
      } catch (error) {
        console.error('[DB Metrics API] Failed to generate recommendations:', error)
        response.recommendations = []
      }
    }

    // Include performance trends if requested
    if (includeTrends) {
      try {
        response.trends = performanceMonitor.getTrends(trendsHours)
      } catch (error) {
        console.error('[DB Metrics API] Failed to get trends:', error)
        response.trends = []
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[DB Metrics API] Failed to get database metrics:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve database metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/database/metrics
 * 
 * Update monitoring configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Add proper admin role check
    const nodeEnv = process.env.NODE_ENV
    const allowMetrics = nodeEnv === 'development' || process.env.ALLOW_DB_METRICS === 'true'
    
    if (!allowMetrics) {
      return NextResponse.json(
        { error: 'Database metrics configuration not allowed' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, config } = body

    switch (action) {
      case 'updateAlerts':
        performanceMonitor.updateAlertConfig(config)
        return NextResponse.json({ success: true, message: 'Alert configuration updated' })

      case 'clearMetrics':
        queryLogger.clearMetrics()
        performanceMonitor.clearTrends()
        return NextResponse.json({ success: true, message: 'Metrics cleared' })

      case 'startMonitoring':
        performanceMonitor.startMonitoring(config?.intervalMs)
        return NextResponse.json({ success: true, message: 'Performance monitoring started' })

      case 'stopMonitoring':
        performanceMonitor.stopMonitoring()
        return NextResponse.json({ success: true, message: 'Performance monitoring stopped' })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('[DB Metrics API] Failed to update configuration:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}