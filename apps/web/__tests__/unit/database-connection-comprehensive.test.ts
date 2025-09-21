/**
 * Comprehensive Database Connection Tests
 * 
 * This test suite validates all database connection functionality
 * with exceptional coverage and mocking for reliability.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock postgres module
const mockPostgres = vi.fn()
const mockConnection = {
  listen: vi.fn(),
  end: vi.fn().mockResolvedValue(undefined),
  query: vi.fn()
}

vi.mock('postgres', () => ({
  default: mockPostgres.mockReturnValue(mockConnection),
  fromCamel: vi.fn(),
  toCamel: vi.fn()
}))

// Mock drizzle-orm
const mockDrizzle = vi.fn()
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: mockDrizzle.mockReturnValue({
    query: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn()
  })
}))

// Mock schema
vi.mock('../../lib/db/schema', () => ({
  users: {},
  organizations: {},
  roles: {}
}))

// Mock config module
const mockGetAppConfigSync = vi.fn()
vi.mock('../../lib/config/init', () => ({
  getAppConfigSync: mockGetAppConfigSync
}))

// Mock the entire connection module to avoid circular dependencies
vi.mock('../../lib/db/connection', async () => {
  const actual = await vi.importActual('../../lib/db/connection')
  return {
    ...actual,
    // We'll override specific functions in tests
  }
})

describe('Database Connection - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    delete process.env.DATABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('Configuration Management', () => {
    it('should use DATABASE_URL when available', async () => {
      // Arrange
      const testUrl = 'postgresql://user:pass@localhost:5432/testdb'
      mockGetAppConfigSync.mockReturnValue(testUrl)
      
      // Act
      const { getConnection } = await import('../../lib/db/connection')
      getConnection()
      
      // Assert
      expect(mockPostgres).toHaveBeenCalledWith(
        testUrl,
        expect.objectContaining({
          max: 5,
          idle_timeout: 20,
          connect_timeout: 10,
          ssl: false,
          prepare: true
        })
      )
    })

    it('should construct URL from Supabase credentials when DATABASE_URL not available', async () => {
      // Arrange
      mockGetAppConfigSync
        .mockReturnValueOnce(undefined) // DATABASE_URL
        .mockReturnValueOnce('https://abc123.supabase.co') // SUPABASE_URL
        .mockReturnValueOnce('service-role-key') // SERVICE_ROLE_KEY
      
      // Act
      const { getConnection } = await import('../../lib/db/connection')
      getConnection()
      
      // Assert
      expect(mockPostgres).toHaveBeenCalledWith(
        'postgresql://postgres:service-role-key@db.abc123.supabase.co:5432/postgres',
        expect.any(Object)
      )
    })

    it('should throw error when no database configuration is available', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue(undefined)
      
      // Act & Assert
      const { getConnection } = await import('../../lib/db/connection')
      expect(() => getConnection()).toThrow(
        'Database configuration not found. Please set DATABASE_URL or configure Supabase credentials'
      )
    })

    it('should use production configuration in production environment', async () => {
      // Arrange
      const testUrl = 'postgresql://user:pass@prod:5432/db'
      mockGetAppConfigSync
        .mockReturnValueOnce(testUrl) // DATABASE_URL
        .mockReturnValue('production') // NODE_ENV
      
      // Act
      const { getConnection } = await import('../../lib/db/connection')
      getConnection()
      
      // Assert
      expect(mockPostgres).toHaveBeenCalledWith(
        testUrl,
        expect.objectContaining({
          max: 20, // Production pool size
          ssl: 'require' // Production SSL
        })
      )
    })
  })

  describe('Connection Management', () => {
    it('should return singleton connection instance', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      
      // Act
      const { getConnection } = await import('../../lib/db/connection')
      const conn1 = getConnection()
      const conn2 = getConnection()
      
      // Assert
      expect(conn1).toBe(conn2)
      expect(mockPostgres).toHaveBeenCalledTimes(1)
    })

    it('should setup connection monitoring', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      
      // Act
      const { getConnection } = await import('../../lib/db/connection')
      getConnection()
      
      // Assert
      expect(mockConnection.listen).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockConnection.listen).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(mockConnection.listen).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('should close connection properly', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      
      // Act
      const { getConnection, closeConnection } = await import('../../lib/db/connection')
      getConnection()
      await closeConnection()
      
      // Assert
      expect(mockConnection.end).toHaveBeenCalled()
    })
  })

  describe('Database Instance', () => {
    it('should create Drizzle database instance with lazy loading', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      
      // Act
      const { getDatabase } = await import('../../lib/db/connection')
      const db = getDatabase()
      
      // Assert
      expect(mockDrizzle).toHaveBeenCalledWith(
        mockConnection,
        expect.objectContaining({
          schema: expect.any(Object),
          logger: expect.any(Object)
        })
      )
      expect(db).toBeDefined()
    })

    it('should handle database proxy correctly', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      const mockDb = { query: vi.fn(), select: vi.fn() }
      mockDrizzle.mockReturnValue(mockDb)
      
      // Act
      const { db } = await import('../../lib/db/connection')
      const queryResult = db.query
      
      // Assert
      expect(queryResult).toBe(mockDb.query)
    })
  })

  describe('Health Checks', () => {
    it('should perform successful health check', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      const mockQuery = vi.fn().mockResolvedValue([{ health_check: 1 }])
      mockConnection.query = mockQuery
      mockPostgres.mockReturnValue({
        ...mockConnection,
        '`SELECT 1 as health_check`': mockQuery
      })
      
      // Act
      const { checkDatabaseHealth } = await import('../../lib/db/connection')
      const result = await checkDatabaseHealth()
      
      // Assert
      expect(result.healthy).toBe(true)
      expect(result.connected).toBe(true)
      expect(result.metrics.responseTime).toBeGreaterThan(0)
    })

    it('should handle health check failure', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      const mockQuery = vi.fn().mockRejectedValue(new Error('Connection failed'))
      mockConnection.query = mockQuery
      mockPostgres.mockReturnValue({
        ...mockConnection,
        '`SELECT 1 as health_check`': mockQuery
      })
      
      // Act
      const { checkDatabaseHealth } = await import('../../lib/db/connection')
      const result = await checkDatabaseHealth()
      
      // Assert
      expect(result.healthy).toBe(false)
      expect(result.connected).toBe(false)
      expect(result.error).toBe('Connection failed')
    })
  })

  describe('Connection Status', () => {
    it('should return current connection status', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      
      // Act
      const { getConnectionStatus } = await import('../../lib/db/connection')
      const status = getConnectionStatus()
      
      // Assert
      expect(status).toHaveProperty('connected')
      expect(status).toHaveProperty('healthy')
      expect(status).toHaveProperty('lastCheck')
      expect(status).toHaveProperty('metrics')
      expect(status.metrics).toHaveProperty('totalConnections')
      expect(status.metrics).toHaveProperty('activeConnections')
      expect(status.metrics).toHaveProperty('idleConnections')
    })
  })

  describe('Pool Metrics', () => {
    it('should get pool metrics successfully', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      const mockMetrics = [{
        total_connections: 5,
        active_connections: 2,
        idle_connections: 3,
        waiting_connections: 0
      }]
      const mockQuery = vi.fn().mockResolvedValue(mockMetrics)
      mockPostgres.mockReturnValue({
        ...mockConnection,
        '`SELECT count(*) as total_connections, count(*) FILTER (WHERE state = \'active\') as active_connections, count(*) FILTER (WHERE state = \'idle\') as idle_connections, count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections FROM pg_stat_activity WHERE datname = current_database()`': mockQuery
      })
      
      // Act
      const { getPoolMetrics } = await import('../../lib/db/connection')
      const metrics = await getPoolMetrics()
      
      // Assert
      expect(metrics.totalConnections).toBe(5)
      expect(metrics.activeConnections).toBe(2)
      expect(metrics.idleConnections).toBe(3)
      expect(metrics.waitingConnections).toBe(0)
    })

    it('should handle pool metrics failure gracefully', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      const mockQuery = vi.fn().mockRejectedValue(new Error('Query failed'))
      mockPostgres.mockReturnValue({
        ...mockConnection,
        '`SELECT count(*) as total_connections, count(*) FILTER (WHERE state = \'active\') as active_connections, count(*) FILTER (WHERE state = \'idle\') as idle_connections, count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections FROM pg_stat_activity WHERE datname = current_database()`': mockQuery
      })
      
      // Act
      const { getPoolMetrics } = await import('../../lib/db/connection')
      const metrics = await getPoolMetrics()
      
      // Assert
      expect(metrics.totalConnections).toBe(0)
      expect(metrics.activeConnections).toBe(0)
      expect(metrics.idleConnections).toBe(0)
      expect(metrics.waitingConnections).toBe(0)
    })
  })

  describe('Connectivity Testing', () => {
    it('should perform comprehensive connectivity test', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      const mockQueries = [
        [{ current_user: 'test', current_database: 'testdb', version: 'PostgreSQL 14' }],
        [{ has_database_privilege: true }],
        [{ table_name: 'users' }]
      ]
      let queryIndex = 0
      const mockQuery = vi.fn().mockImplementation(() => Promise.resolve(mockQueries[queryIndex++]))
      mockPostgres.mockReturnValue({
        ...mockConnection,
        '`SELECT current_user, current_database(), version()`': mockQuery,
        '`SELECT has_database_privilege(current_user, current_database(), \'CONNECT\')`': mockQuery,
        '`SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 1`': mockQuery
      })
      
      // Act
      const { testDatabaseConnectivity } = await import('../../lib/db/connection')
      const result = await testDatabaseConnectivity()
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.details.connection).toBe(true)
      expect(result.details.authentication).toBe(true)
      expect(result.details.permissions).toBe(true)
      expect(result.details.schema).toBe(true)
      expect(result.timing.total).toBeGreaterThan(0)
    })

    it('should handle connectivity test failure', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://invalid:invalid@invalid:5432/invalid')
      mockPostgres.mockImplementation(() => {
        throw new Error('Connection refused')
      })
      
      // Act
      const { testDatabaseConnectivity } = await import('../../lib/db/connection')
      const result = await testDatabaseConnectivity()
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection refused')
      expect(result.details.connection).toBe(false)
    })
  })

  describe('Performance Metrics', () => {
    it('should get performance metrics successfully', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      const mockQueryStats = [{ total_queries: 100, avg_query_time: 50, slow_queries: 5 }]
      const mockConnectionStats = [{ total_connections: 10, active_connections: 3, max_connections: 100 }]
      const mockCacheStats = [{ hit_ratio: 95.5, buffer_hits: 1000, buffer_reads: 50 }]
      
      let queryIndex = 0
      const mockQuery = vi.fn().mockImplementation(() => {
        const results = [mockQueryStats, mockConnectionStats, mockCacheStats]
        return Promise.resolve(results[queryIndex++])
      })
      
      mockPostgres.mockReturnValue({
        ...mockConnection,
        '`SELECT sum(calls) as total_queries, avg(mean_exec_time) as avg_query_time, sum(calls) FILTER (WHERE mean_exec_time > 1000) as slow_queries FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())`': mockQuery,
        '`SELECT count(*) as total_connections, count(*) FILTER (WHERE state = \'active\') as active_connections, setting::int as max_connections FROM pg_stat_activity, pg_settings WHERE pg_settings.name = \'max_connections\' AND datname = current_database() GROUP BY setting`': mockQuery,
        '`SELECT sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) * 100 as hit_ratio, sum(blks_hit) as buffer_hits, sum(blks_read) as buffer_reads FROM pg_stat_database WHERE datname = current_database()`': mockQuery
      })
      
      // Act
      const { getPerformanceMetrics } = await import('../../lib/db/connection')
      const metrics = await getPerformanceMetrics()
      
      // Assert
      expect(metrics.queryStats.totalQueries).toBe(100)
      expect(metrics.queryStats.avgQueryTime).toBe(50)
      expect(metrics.queryStats.slowQueries).toBe(5)
      expect(metrics.connectionStats.totalConnections).toBe(10)
      expect(metrics.connectionStats.activeConnections).toBe(3)
      expect(metrics.connectionStats.maxConnections).toBe(100)
      expect(metrics.cacheStats.hitRatio).toBe(95.5)
      expect(metrics.cacheStats.bufferHits).toBe(1000)
      expect(metrics.cacheStats.bufferReads).toBe(50)
    })

    it('should handle performance metrics failure gracefully', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      const mockQuery = vi.fn().mockRejectedValue(new Error('Stats not available'))
      mockPostgres.mockReturnValue({
        ...mockConnection,
        '`SELECT sum(calls) as total_queries, avg(mean_exec_time) as avg_query_time, sum(calls) FILTER (WHERE mean_exec_time > 1000) as slow_queries FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())`': mockQuery
      })
      
      // Act
      const { getPerformanceMetrics } = await import('../../lib/db/connection')
      const metrics = await getPerformanceMetrics()
      
      // Assert
      expect(metrics.queryStats.totalQueries).toBe(0)
      expect(metrics.queryStats.avgQueryTime).toBe(0)
      expect(metrics.queryStats.slowQueries).toBe(0)
      expect(metrics.connectionStats.totalConnections).toBe(0)
      expect(metrics.connectionStats.activeConnections).toBe(0)
      expect(metrics.connectionStats.maxConnections).toBe(100)
      expect(metrics.cacheStats.hitRatio).toBe(0)
      expect(metrics.cacheStats.bufferHits).toBe(0)
      expect(metrics.cacheStats.bufferReads).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle configuration errors gracefully', async () => {
      // Arrange
      mockGetAppConfigSync.mockImplementation(() => {
        throw new Error('Config error')
      })
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
      
      // Act
      const { getConnection } = await import('../../lib/db/connection')
      const connection = getConnection()
      
      // Assert
      expect(connection).toBeDefined()
      expect(mockPostgres).toHaveBeenCalledWith(
        'postgresql://test:test@localhost:5432/test',
        expect.any(Object)
      )
    })

    it('should handle connection close errors gracefully', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      mockConnection.end.mockRejectedValue(new Error('Close error'))
      
      // Act
      const { getConnection, closeConnection } = await import('../../lib/db/connection')
      getConnection()
      
      // Should not throw
      await expect(closeConnection()).resolves.toBeUndefined()
    })
  })

  describe('Environment Specific Behavior', () => {
    it('should use development configuration by default', async () => {
      // Arrange
      mockGetAppConfigSync.mockReturnValue('postgresql://test:test@localhost:5432/test')
      
      // Act
      const { getConnection } = await import('../../lib/db/connection')
      getConnection()
      
      // Assert
      expect(mockPostgres).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          max: 5, // Development pool size
          ssl: false, // Development SSL
          debug: expect.any(Function) // Development debug
        })
      )
    })

    it('should disable debug logging in production', async () => {
      // Arrange
      mockGetAppConfigSync
        .mockReturnValueOnce('postgresql://test:test@localhost:5432/test')
        .mockReturnValue('production')
      
      // Act
      const { getConnection } = await import('../../lib/db/connection')
      getConnection()
      
      // Assert
      expect(mockPostgres).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          debug: false
        })
      )
    })
  })
})