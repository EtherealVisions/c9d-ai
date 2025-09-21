#!/usr/bin/env tsx
/**
 * Database Monitoring CLI
 * 
 * This script provides command-line interface for database monitoring
 * and performance analysis.
 */

import { 
  checkDatabaseHealth, 
  getConnectionStatus, 
  getPoolMetrics,
  testDatabaseConnectivity
} from '../lib/db/connection'
import { 
  getDatabaseMetrics, 
  queryLogger,
  analyzeQuery
} from '../lib/db/query-logger'
import { performanceMonitor } from '../lib/db/performance-monitor'
import { validateSchemaIntegrity, getDatabaseInfo } from '../lib/db/utils'

/**
 * Display help information
 */
function showHelp() {
  console.log(`
Database Monitoring CLI

Usage: tsx scripts/db-monitor.ts [command] [options]

Commands:
  status      Show database connection status
  health      Perform comprehensive health check
  metrics     Show performance metrics
  analyze     Analyze query performance
  monitor     Start real-time monitoring
  info        Show database information
  help        Show this help message

Examples:
  tsx scripts/db-monitor.ts status
  tsx scripts/db-monitor.ts health
  tsx scripts/db-monitor.ts metrics
  tsx scripts/db-monitor.ts analyze "SELECT * FROM users"
  tsx scripts/db-monitor.ts monitor
`)
}

/**
 * Show database status
 */
async function showStatus() {
  try {
    console.log('📊 Database Status\n')
    
    const [connectionStatus, poolMetrics] = await Promise.all([
      getConnectionStatus(),
      getPoolMetrics()
    ])
    
    console.log('Connection Status:')
    console.log(`  Connected: ${connectionStatus.connected ? '✅' : '❌'}`)
    console.log(`  Healthy: ${connectionStatus.healthy ? '✅' : '❌'}`)
    console.log(`  Last Check: ${connectionStatus.lastCheck.toISOString()}`)
    if (connectionStatus.error) {
      console.log(`  Error: ${connectionStatus.error}`)
    }
    console.log()
    
    console.log('Connection Pool:')
    console.log(`  Total Connections: ${poolMetrics.totalConnections}`)
    console.log(`  Active Connections: ${poolMetrics.activeConnections}`)
    console.log(`  Idle Connections: ${poolMetrics.idleConnections}`)
    console.log(`  Waiting Connections: ${poolMetrics.waitingConnections}`)
    console.log()
    
  } catch (error) {
    console.error('❌ Failed to get database status:', error)
    process.exit(1)
  }
}

/**
 * Perform health check
 */
async function performHealthCheck() {
  try {
    console.log('🏥 Database Health Check\n')
    
    const [healthStatus, connectivity, schemaValidation] = await Promise.all([
      checkDatabaseHealth(),
      testDatabaseConnectivity(),
      validateSchemaIntegrity()
    ])
    
    console.log('Health Status:')
    console.log(`  Overall: ${healthStatus.healthy ? '✅ Healthy' : '❌ Unhealthy'}`)
    console.log(`  Response Time: ${healthStatus.metrics.responseTime || 'N/A'}ms`)
    console.log()
    
    console.log('Connectivity Test:')
    console.log(`  Success: ${connectivity.success ? '✅' : '❌'}`)
    console.log(`  Connection: ${connectivity.details.connection ? '✅' : '❌'}`)
    console.log(`  Authentication: ${connectivity.details.authentication ? '✅' : '❌'}`)
    console.log(`  Permissions: ${connectivity.details.permissions ? '✅' : '❌'}`)
    console.log(`  Schema: ${connectivity.details.schema ? '✅' : '❌'}`)
    console.log(`  Total Time: ${connectivity.timing.total}ms`)
    if (connectivity.error) {
      console.log(`  Error: ${connectivity.error}`)
    }
    console.log()
    
    console.log('Schema Validation:')
    console.log(`  Valid: ${schemaValidation.valid ? '✅' : '❌'}`)
    if (schemaValidation.issues.length > 0) {
      console.log('  Issues:')
      schemaValidation.issues.forEach(issue => {
        console.log(`    • ${issue}`)
      })
    }
    console.log('  Tables:')
    Object.entries(schemaValidation.tables).forEach(([table, exists]) => {
      console.log(`    ${table}: ${exists ? '✅' : '❌'}`)
    })
    console.log()
    
  } catch (error) {
    console.error('❌ Health check failed:', error)
    process.exit(1)
  }
}

/**
 * Show performance metrics
 */
async function showMetrics() {
  try {
    console.log('📈 Performance Metrics\n')
    
    const [dbMetrics, queryMetrics, currentStatus] = await Promise.all([
      getDatabaseMetrics(),
      queryLogger.getMetricsSummary(),
      performanceMonitor.getCurrentStatus()
    ])
    
    console.log('Database Metrics:')
    console.log(`  Active Connections: ${dbMetrics.activeConnections}`)
    console.log(`  Total Connections: ${dbMetrics.totalConnections}`)
    console.log(`  Cache Hit Ratio: ${dbMetrics.cacheHitRatio.toFixed(2)}%`)
    console.log(`  Average Query Time: ${dbMetrics.averageQueryTime.toFixed(2)}ms`)
    console.log(`  Slow Queries: ${dbMetrics.slowQueries}`)
    console.log(`  Blocked Queries: ${dbMetrics.blockedQueries}`)
    console.log()
    
    console.log('Query Metrics:')
    console.log(`  Total Queries: ${queryMetrics.totalQueries}`)
    console.log(`  Average Duration: ${queryMetrics.averageDuration}ms`)
    console.log(`  Slow Queries: ${queryMetrics.slowQueries}`)
    console.log(`  Failed Queries: ${queryMetrics.failedQueries}`)
    console.log()
    
    console.log('Current Status:')
    console.log(`  Status: ${currentStatus.status === 'healthy' ? '✅ Healthy' : currentStatus.status === 'warning' ? '⚠️ Warning' : '❌ Critical'}`)
    if (currentStatus.issues.length > 0) {
      console.log('  Issues:')
      currentStatus.issues.forEach((issue: string) => {
        console.log(`    • ${issue}`)
      })
    }
    console.log()
    
    // Show slow queries
    const slowQueries = queryLogger.getSlowQueries(5)
    if (slowQueries.length > 0) {
      console.log('Slowest Queries:')
      slowQueries.forEach((query, index) => {
        console.log(`  ${index + 1}. ${query.duration}ms - ${query.query.substring(0, 80)}...`)
      })
      console.log()
    }
    
  } catch (error) {
    console.error('❌ Failed to get metrics:', error)
    process.exit(1)
  }
}

/**
 * Analyze query performance
 */
async function analyzeQueryPerformance(query: string) {
  try {
    console.log('🔍 Query Analysis\n')
    console.log(`Query: ${query}\n`)
    
    const analysis = await analyzeQuery(query)
    
    console.log(`Severity: ${analysis.severity === 'info' ? '✅ Good' : analysis.severity === 'warning' ? '⚠️ Warning' : '❌ Critical'}`)
    if (analysis.estimatedCost) {
      console.log(`Estimated Cost: ${analysis.estimatedCost}`)
    }
    console.log()
    
    if (analysis.recommendations.length > 0) {
      console.log('Recommendations:')
      analysis.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`)
      })
      console.log()
    }
    
    if (analysis.executionPlan) {
      console.log('Execution Plan:')
      console.log(JSON.stringify(analysis.executionPlan, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Query analysis failed:', error)
    process.exit(1)
  }
}

/**
 * Start real-time monitoring
 */
async function startMonitoring() {
  try {
    console.log('🔄 Starting Real-time Monitoring\n')
    console.log('Press Ctrl+C to stop monitoring\n')
    
    performanceMonitor.startMonitoring(5000) // 5 second intervals
    
    // Display metrics every 10 seconds
    const displayInterval = setInterval(async () => {
      try {
        const status = performanceMonitor.getCurrentStatus()
        const timestamp = new Date().toISOString()
        
        console.clear()
        console.log(`🔄 Database Monitoring - ${timestamp}\n`)
        
        if (status.metrics) {
          console.log('Current Metrics:')
          console.log(`  Average Query Time: ${status.metrics.averageQueryTime.toFixed(2)}ms`)
          console.log(`  Active Connections: ${status.metrics.activeConnections}`)
          console.log(`  Cache Hit Ratio: ${status.metrics.cacheHitRatio.toFixed(2)}%`)
          console.log(`  Error Rate: ${status.metrics.errorRate.toFixed(2)}%`)
          console.log()
        }
        
        console.log(`Status: ${status.status === 'healthy' ? '✅ Healthy' : status.status === 'warning' ? '⚠️ Warning' : '❌ Critical'}`)
        
        if (status.issues.length > 0) {
          console.log('Issues:')
          status.issues.forEach((issue: string) => {
            console.log(`  • ${issue}`)
          })
        }
        
        console.log('\nPress Ctrl+C to stop monitoring')
        
      } catch (error) {
        console.error('Failed to update monitoring display:', error)
      }
    }, 10000)
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping monitoring...')
      clearInterval(displayInterval)
      performanceMonitor.stopMonitoring()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Failed to start monitoring:', error)
    process.exit(1)
  }
}

/**
 * Show database information
 */
async function showDatabaseInfo() {
  try {
    console.log('ℹ️ Database Information\n')
    
    const dbInfo = await getDatabaseInfo()
    
    console.log('Database Details:')
    console.log(`  Version: ${dbInfo.version}`)
    console.log(`  Encoding: ${dbInfo.encoding}`)
    console.log(`  Timezone: ${dbInfo.timezone}`)
    console.log(`  Max Connections: ${dbInfo.maxConnections}`)
    console.log(`  Shared Buffers: ${dbInfo.sharedBuffers}`)
    console.log()
    
  } catch (error) {
    console.error('❌ Failed to get database info:', error)
    process.exit(1)
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  switch (command) {
    case 'status':
      await showStatus()
      break
      
    case 'health':
      await performHealthCheck()
      break
      
    case 'metrics':
      await showMetrics()
      break
      
    case 'analyze':
      const query = args[1]
      if (!query) {
        console.error('❌ Query required for analysis')
        console.log('Usage: tsx scripts/db-monitor.ts analyze "SELECT * FROM users"')
        process.exit(1)
      }
      await analyzeQueryPerformance(query)
      break
      
    case 'monitor':
      await startMonitoring()
      break
      
    case 'info':
      await showDatabaseInfo()
      break
      
    case 'help':
    case '--help':
    case '-h':
      showHelp()
      break
      
    default:
      console.error(`❌ Unknown command: ${command}`)
      showHelp()
      process.exit(1)
  }
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Database monitoring CLI failed:', error)
    process.exit(1)
  })
}