/**
 * Drizzle Database Connection
 * 
 * This file provides the Drizzle database client configuration and connection setup.
 * It handles environment-specific configuration, connection pooling, health checks,
 * and performance monitoring.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Import configuration function with error handling
let getAppConfigSync: ((key: string) => string | undefined) | undefined

try {
  const configModule = require('../config/init')
  getAppConfigSync = configModule.getAppConfigSync
} catch (error) {
  console.warn('[Database Connection] Could not load config module, using process.env only:', error)
  getAppConfigSync = undefined
}

/**
 * Database connection status
 */
export interface ConnectionStatus {
  connected: boolean
  healthy: boolean
  lastCheck: Date
  error?: string
  metrics: {
    totalConnections: number
    activeConnections: number
    idleConnections: number
    responseTime?: number
  }
}

/**
 * Connection pool metrics
 */
interface PoolMetrics {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingConnections: number
}

/**
 * Global connection status tracking
 */
let connectionStatus: ConnectionStatus = {
  connected: false,
  healthy: false,
  lastCheck: new Date(),
  metrics: {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0
  }
}

/**
 * Get configuration value with fallback to process.env
 */
function getConfigValue(key: string): string | undefined {
  try {
    // Try to get from configuration manager first if available
    if (getAppConfigSync) {
      const configValue = getAppConfigSync(key)
      if (configValue) {
        return configValue
      }
    }
  } catch (error) {
    // Fallback to process.env if config manager fails
    console.warn(`[Database Connection] Failed to get config '${key}', using process.env fallback:`, error)
  }
  
  return process.env[key]
}

/**
 * Get database URL with proper fallback logic
 */
function getDatabaseUrl(): string {
  // During build time, return a placeholder URL
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                     (process.env.VERCEL === '1' && process.env.CI === '1')
  
  if (isBuildTime) {
    console.log('[Database] Build-time detected, using placeholder URL')
    return 'postgresql://postgres:password@localhost:5432/postgres'
  }
  
  // First try DATABASE_URL (direct PostgreSQL connection)
  const databaseUrl = getConfigValue('DATABASE_URL')
  if (databaseUrl && !databaseUrl.startsWith('$')) {
    return databaseUrl
  }
  
  // Fallback to constructing from Supabase configuration
  const supabaseUrl = getConfigValue('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getConfigValue('SUPABASE_SERVICE_ROLE_KEY')
  
  if (supabaseUrl && serviceRoleKey && !supabaseUrl.startsWith('$')) {
    // Extract project reference from Supabase URL
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
    return `postgresql://postgres:${serviceRoleKey}@db.${projectRef}.supabase.co:5432/postgres`
  }
  
  throw new Error(
    'Database configuration not found. Please set DATABASE_URL or configure Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)'
  )
}

/**
 * Create PostgreSQL connection with appropriate configuration
 */
function createPostgresConnection() {
  const nodeEnv = getConfigValue('NODE_ENV') || 'development'
  
  // In test environment, return a mock connection to prevent real database attempts
  if (nodeEnv === 'test') {
    console.log('[Database] Test environment detected, using mock connection')
    return createMockConnection()
  }
  
  const databaseUrl = getDatabaseUrl()
  
  // Connection configuration based on environment
  const connectionConfig = {
    // Connection pooling
    max: nodeEnv === 'production' ? 20 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    
    // SSL configuration for production
    ssl: nodeEnv === 'production' ? 'require' as const : false,
    
    // Prepared statements for better performance
    prepare: true,
    
    // Transform column names from snake_case to camelCase
    transform: {
      column: {
        from: postgres.fromCamel,
        to: postgres.toCamel,
      },
    },
    
    // Connection event handlers for monitoring
    onnotice: (notice: any) => {
      if (nodeEnv === 'development') {
        console.log('[Database] Notice:', notice)
      }
    },
    
    // Connection lifecycle hooks
    connection: {
      application_name: `c9d-web-${nodeEnv}`,
    },
    
    // Debug mode for development
    debug: nodeEnv === 'development' ? (connection: any, query: any, parameters: any) => {
      console.log('[Database Query]', query, parameters)
    } : false,
  }
  
  const connection = postgres(databaseUrl, connectionConfig)
  
  // Set up connection monitoring (not needed for mock connections)
  setupConnectionMonitoring(connection)
  
  return connection
}

/**
 * Create a mock Drizzle database for testing
 */
function createMockDrizzleDatabase() {
  const mockDb = {
    select: () => mockDb,
    insert: () => mockDb,
    update: () => mockDb,
    delete: () => mockDb,
    from: () => mockDb,
    where: () => mockDb,
    orderBy: () => mockDb,
    limit: () => mockDb,
    offset: () => mockDb,
    values: () => mockDb,
    set: () => mockDb,
    returning: () => Promise.resolve([]),
    onConflictDoNothing: () => mockDb,
    onConflictDoUpdate: () => mockDb,
    execute: () => Promise.resolve([]),
    then: (resolve: any) => resolve([]),
    catch: (reject: any) => Promise.resolve([]),
    // Transaction support
    transaction: (callback: any) => callback(mockDb),
    // Schema access
    ...schema
  }
  
  console.log('[Database] Mock Drizzle database created for testing')
  return mockDb as any
}

/**
 * Create a mock PostgreSQL connection for testing
 */
function createMockConnection(): postgres.Sql {
  const mockConnection = {
    end: async () => {
      console.log('[Database] Mock connection closed')
    },
    listen: () => {
      console.log('[Database] Mock connection listening')
    },
    query: async () => {
      console.log('[Database] Mock query executed')
      return []
    },
    // Add template literal support for SQL queries
    [Symbol.for('nodejs.util.inspect.custom')]: () => '[Mock PostgreSQL Connection]'
  } as any
  
  // Add template literal function for SQL queries
  const sqlHandler = async () => {
    console.log('[Database] Mock SQL query executed')
    return []
  }
  
  // Make the connection callable for template literals
  Object.setPrototypeOf(mockConnection, sqlHandler)
  
  return mockConnection
}

/**
 * Set up connection monitoring and event handlers
 */
function setupConnectionMonitoring(connection: postgres.Sql) {
  // Monitor connection events
  connection.listen('connect', () => {
    connectionStatus.connected = true
    connectionStatus.lastCheck = new Date()
    console.log('[Database] Connection established')
  })
  
  connection.listen('disconnect', () => {
    connectionStatus.connected = false
    connectionStatus.healthy = false
    connectionStatus.lastCheck = new Date()
    console.warn('[Database] Connection lost')
  })
  
  connection.listen('error', (error: Error) => {
    connectionStatus.healthy = false
    connectionStatus.error = error.message
    connectionStatus.lastCheck = new Date()
    console.error('[Database] Connection error:', error)
  })
}

/**
 * Global database connection instance
 * Uses singleton pattern to ensure single connection pool
 */
let globalConnection: postgres.Sql | undefined

/**
 * Get or create the database connection
 */
export function getConnection(): postgres.Sql {
  if (!globalConnection) {
    globalConnection = createPostgresConnection()
  }
  return globalConnection
}

/**
 * Create Drizzle database instance with schema
 */
export function createDrizzleDatabase() {
  const nodeEnv = getConfigValue('NODE_ENV') || 'development'
  
  // In test environment, return a mock database to prevent real database operations
  if (nodeEnv === 'test') {
    console.log('[Database] Test environment detected, using mock Drizzle database')
    return createMockDrizzleDatabase()
  }
  
  const connection = getConnection()
  
  return drizzle(connection, {
    schema,
    logger: {
      logQuery: (query: string, params: unknown[]) => {
        // Import query logger dynamically to avoid circular dependencies
        import('./query-logger').then(({ executeWithLogging }) => {
          // This is handled by the executeWithLogging wrapper
          if (nodeEnv === 'development') {
            console.log('[Drizzle Query]', query, params)
          }
        }).catch(() => {
          // Fallback to simple logging if query logger not available
          if (nodeEnv === 'development') {
            console.log('[Drizzle Query]', query, params)
          }
        })
      }
    },
  })
}

/**
 * Global database instance
 * Uses lazy initialization to avoid connection issues during module loading
 */
let globalDatabase: ReturnType<typeof createDrizzleDatabase> | undefined

/**
 * Get or create the database instance
 */
export function getDatabase() {
  if (!globalDatabase) {
    globalDatabase = createDrizzleDatabase()
  }
  return globalDatabase
}

/**
 * Database instance for use throughout the application
 * This is a getter that ensures lazy initialization
 */
export const db = new Proxy({} as ReturnType<typeof createDrizzleDatabase>, {
  get(target, prop) {
    const database = getDatabase()
    return (database as any)[prop]
  }
})

/**
 * Type definition for the database instance
 */
export type DrizzleDatabase = typeof db

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<ConnectionStatus> {
  const startTime = Date.now()
  
  try {
    const connection = getConnection()
    
    // Simple health check query
    await connection`SELECT 1 as health_check`
    
    const responseTime = Date.now() - startTime
    
    // Update connection status
    connectionStatus = {
      connected: true,
      healthy: true,
      lastCheck: new Date(),
      error: undefined,
      metrics: {
        ...connectionStatus.metrics,
        responseTime
      }
    }
    
    console.log(`[Database] Health check passed in ${responseTime}ms`)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    connectionStatus = {
      connected: false,
      healthy: false,
      lastCheck: new Date(),
      error: errorMessage,
      metrics: connectionStatus.metrics
    }
    
    console.error('[Database] Health check failed:', error)
  }
  
  return connectionStatus
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return { ...connectionStatus }
}

/**
 * Get connection pool metrics
 */
export async function getPoolMetrics(): Promise<PoolMetrics> {
  try {
    const connection = getConnection()
    
    // Query PostgreSQL stats for connection info
    const result = await connection`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `
    
    const metrics = result[0] || {
      total_connections: 0,
      active_connections: 0,
      idle_connections: 0,
      waiting_connections: 0
    }
    
    // Update connection status metrics
    connectionStatus.metrics = {
      totalConnections: Number(metrics.total_connections),
      activeConnections: Number(metrics.active_connections),
      idleConnections: Number(metrics.idle_connections),
      responseTime: connectionStatus.metrics.responseTime
    }
    
    return {
      totalConnections: Number(metrics.total_connections),
      activeConnections: Number(metrics.active_connections),
      idleConnections: Number(metrics.idle_connections),
      waitingConnections: Number(metrics.waiting_connections)
    }
    
  } catch (error) {
    console.error('[Database] Failed to get pool metrics:', error)
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingConnections: 0
    }
  }
}

/**
 * Test database connectivity with detailed diagnostics
 */
export async function testDatabaseConnectivity(): Promise<{
  success: boolean
  details: {
    connection: boolean
    authentication: boolean
    permissions: boolean
    schema: boolean
  }
  error?: string
  timing: {
    connection: number
    query: number
    total: number
  }
}> {
  const startTime = Date.now()
  const result = {
    success: false,
    details: {
      connection: false,
      authentication: false,
      permissions: false,
      schema: false
    },
    timing: {
      connection: 0,
      query: 0,
      total: 0
    }
  }
  
  try {
    // Test 1: Basic connection
    const connectionStart = Date.now()
    const connection = getConnection()
    result.details.connection = true
    result.timing.connection = Date.now() - connectionStart
    
    // Test 2: Authentication and basic query
    const queryStart = Date.now()
    await connection`SELECT current_user, current_database(), version()`
    result.details.authentication = true
    result.timing.query = Date.now() - queryStart
    
    // Test 3: Check permissions
    try {
      await connection`SELECT has_database_privilege(current_user, current_database(), 'CONNECT')`
      result.details.permissions = true
    } catch (error) {
      console.warn('[Database] Permission check failed:', error)
    }
    
    // Test 4: Check schema access
    try {
      await connection`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 1`
      result.details.schema = true
    } catch (error) {
      console.warn('[Database] Schema check failed:', error)
    }
    
    result.success = Object.values(result.details).every(Boolean)
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Database] Connectivity test failed:', error)
  }
  
  result.timing.total = Date.now() - startTime
  
  return result
}

/**
 * Monitor database performance metrics
 */
export async function getPerformanceMetrics(): Promise<{
  queryStats: {
    totalQueries: number
    avgQueryTime: number
    slowQueries: number
  }
  connectionStats: {
    totalConnections: number
    activeConnections: number
    maxConnections: number
  }
  cacheStats: {
    hitRatio: number
    bufferHits: number
    bufferReads: number
  }
}> {
  try {
    const connection = getConnection()
    
    // Get query statistics
    const queryStats = await connection`
      SELECT 
        sum(calls) as total_queries,
        avg(mean_exec_time) as avg_query_time,
        sum(calls) FILTER (WHERE mean_exec_time > 1000) as slow_queries
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
    `
    
    // Get connection statistics
    const connectionStats = await connection`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        setting::int as max_connections
      FROM pg_stat_activity, pg_settings 
      WHERE pg_settings.name = 'max_connections'
        AND datname = current_database()
      GROUP BY setting
    `
    
    // Get cache statistics
    const cacheStats = await connection`
      SELECT 
        sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) * 100 as hit_ratio,
        sum(blks_hit) as buffer_hits,
        sum(blks_read) as buffer_reads
      FROM pg_stat_database
      WHERE datname = current_database()
    `
    
    return {
      queryStats: {
        totalQueries: Number(queryStats[0]?.total_queries || 0),
        avgQueryTime: Number(queryStats[0]?.avg_query_time || 0),
        slowQueries: Number(queryStats[0]?.slow_queries || 0)
      },
      connectionStats: {
        totalConnections: Number(connectionStats[0]?.total_connections || 0),
        activeConnections: Number(connectionStats[0]?.active_connections || 0),
        maxConnections: Number(connectionStats[0]?.max_connections || 100)
      },
      cacheStats: {
        hitRatio: Number(cacheStats[0]?.hit_ratio || 0),
        bufferHits: Number(cacheStats[0]?.buffer_hits || 0),
        bufferReads: Number(cacheStats[0]?.buffer_reads || 0)
      }
    }
    
  } catch (error) {
    console.error('[Database] Failed to get performance metrics:', error)
    return {
      queryStats: { totalQueries: 0, avgQueryTime: 0, slowQueries: 0 },
      connectionStats: { totalConnections: 0, activeConnections: 0, maxConnections: 100 },
      cacheStats: { hitRatio: 0, bufferHits: 0, bufferReads: 0 }
    }
  }
}

/**
 * Close database connection (useful for testing and cleanup)
 */
export async function closeConnection(): Promise<void> {
  if (globalConnection) {
    try {
      await globalConnection.end()
      connectionStatus.connected = false
      connectionStatus.healthy = false
      console.log('[Database] Connection closed')
    } catch (error) {
      console.error('[Database] Error closing connection:', error)
    } finally {
      globalConnection = undefined
    }
  }
}