/**
 * Comprehensive Query Logger Tests
 * 
 * This test suite validates all query logging and performance monitoring
 * functionality with exceptional coverage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock database connection
const mockDb = {
  execute: vi.fn()
}

vi.mock('../../lib/db/connection', () => ({
  db: mockDb
}))

describe('Query Logger - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Reset environment
    delete process.env.NODE_ENV
    delete process.env.ENABLE_QUERY_LOGGING
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  describe('QueryLogger Class', () => {
    it('should create QueryLogger instance with default configuration', async () => {
      // Act
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      
      // Assert
      expect(logger).toBeDefined()
      expect(logger.getMetricsSummary().totalQueries).toBe(0)
    })

    it('should create QueryLogger with custom thresholds', async () => {
      // Arrange
      const customThresholds = {
        slow: 200,
        warning: 1000,
        critical: 5000
      }
      
      // Act
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger(customThresholds)
      
      // Assert
      expect(logger).toBeDefined()
    })

    it('should get singleton instance', async () => {
      // Act
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const instance1 = QueryLogger.getInstance()
      const instance2 = QueryLogger.getInstance()
      
      // Assert
      expect(instance1).toBe(instance2)
    })
  })

  describe('Query Logging', () => {
    it('should log query metrics successfully', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      
      const metrics = {
        query: 'SELECT * FROM users',
        params: ['test'],
        duration: 50,
        timestamp: new Date(),
        success: true,
        rowCount: 5,
        userId: 'user123',
        organizationId: 'org123'
      }
      
      // Act
      logger.logQuery(metrics)
      
      // Assert
      const summary = logger.getMetricsSummary()
      expect(summary.totalQueries).toBe(1)
      expect(summary.averageDuration).toBe(50)
      expect(summary.failedQueries).toBe(0)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should log failed query metrics', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const metrics = {
        query: 'SELECT * FROM invalid_table',
        params: [],
        duration: 100,
        timestamp: new Date(),
        success: false,
        error: 'Table does not exist'
      }
      
      // Act
      logger.logQuery(metrics)
      
      // Assert
      const summary = logger.getMetricsSummary()
      expect(summary.totalQueries).toBe(1)
      expect(summary.failedQueries).toBe(1)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should categorize queries by performance thresholds', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpies = {
        debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {})
      }
      
      // Act - Log queries with different durations
      logger.logQuery({
        query: 'Fast query',
        duration: 50,
        timestamp: new Date(),
        success: true
      })
      
      logger.logQuery({
        query: 'Slow query',
        duration: 150,
        timestamp: new Date(),
        success: true
      })
      
      logger.logQuery({
        query: 'Warning query',
        duration: 600,
        timestamp: new Date(),
        success: true
      })
      
      logger.logQuery({
        query: 'Critical query',
        duration: 3000,
        timestamp: new Date(),
        success: true
      })
      
      // Assert
      expect(consoleSpies.debug).toHaveBeenCalledTimes(1) // Fast query
      expect(consoleSpies.info).toHaveBeenCalledTimes(1)  // Slow query
      expect(consoleSpies.warn).toHaveBeenCalledTimes(1)  // Warning query
      expect(consoleSpies.error).toHaveBeenCalledTimes(1) // Critical query
      
      Object.values(consoleSpies).forEach(spy => spy.mockRestore())
    })

    it('should sanitize sensitive data in queries', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      
      const metrics = {
        query: "UPDATE users SET password = 'secret123', token = 'abc123' WHERE id = 1",
        duration: 50,
        timestamp: new Date(),
        success: true
      }
      
      // Act
      logger.logQuery(metrics)
      
      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[REDACTED]'),
        expect.any(Object)
      )
      
      consoleSpy.mockRestore()
    })

    it('should maintain metrics history with size limit', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      
      // Act - Log more than the history limit
      for (let i = 0; i < 1100; i++) {
        logger.logQuery({
          query: `Query ${i}`,
          duration: 50,
          timestamp: new Date(),
          success: true
        })
      }
      
      // Assert
      const summary = logger.getMetricsSummary()
      expect(summary.totalQueries).toBe(1000) // Should be capped at maxMetricsHistory
    })
  })

  describe('Metrics Summary', () => {
    it('should calculate metrics summary correctly', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      
      // Act - Log various queries
      logger.logQuery({
        query: 'Query 1',
        duration: 100,
        timestamp: new Date(),
        success: true
      })
      
      logger.logQuery({
        query: 'Query 2',
        duration: 200,
        timestamp: new Date(),
        success: true
      })
      
      logger.logQuery({
        query: 'Query 3',
        duration: 50,
        timestamp: new Date(),
        success: false,
        error: 'Error'
      })
      
      // Assert
      const summary = logger.getMetricsSummary()
      expect(summary.totalQueries).toBe(3)
      expect(summary.averageDuration).toBe(116.67) // (100 + 200 + 50) / 3
      expect(summary.slowQueries).toBe(2) // Queries > 100ms threshold
      expect(summary.failedQueries).toBe(1)
      expect(summary.recentQueries).toHaveLength(3)
    })

    it('should return empty summary when no queries logged', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      
      // Act
      const summary = logger.getMetricsSummary()
      
      // Assert
      expect(summary.totalQueries).toBe(0)
      expect(summary.averageDuration).toBe(0)
      expect(summary.slowQueries).toBe(0)
      expect(summary.failedQueries).toBe(0)
      expect(summary.recentQueries).toHaveLength(0)
    })
  })

  describe('Slow Queries', () => {
    it('should return slow queries sorted by duration', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      
      // Act - Log queries with different durations
      logger.logQuery({
        query: 'Medium query',
        duration: 300,
        timestamp: new Date(),
        success: true
      })
      
      logger.logQuery({
        query: 'Fastest query',
        duration: 50,
        timestamp: new Date(),
        success: true
      })
      
      logger.logQuery({
        query: 'Slowest query',
        duration: 500,
        timestamp: new Date(),
        success: true
      })
      
      // Assert
      const slowQueries = logger.getSlowQueries(2)
      expect(slowQueries).toHaveLength(2)
      expect(slowQueries[0].duration).toBe(500) // Slowest first
      expect(slowQueries[1].duration).toBe(300) // Medium second
    })

    it('should limit slow queries results', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      
      // Act - Log multiple slow queries
      for (let i = 0; i < 20; i++) {
        logger.logQuery({
          query: `Slow query ${i}`,
          duration: 200 + i,
          timestamp: new Date(),
          success: true
        })
      }
      
      // Assert
      const slowQueries = logger.getSlowQueries(5)
      expect(slowQueries).toHaveLength(5)
    })
  })

  describe('Configuration Management', () => {
    it('should update thresholds dynamically', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      
      // Act
      logger.updateThresholds({ slow: 50 })
      logger.logQuery({
        query: 'Test query',
        duration: 75,
        timestamp: new Date(),
        success: true
      })
      
      // Assert
      expect(consoleSpy).toHaveBeenCalled() // Should log as INFO (slow)
      
      consoleSpy.mockRestore()
    })

    it('should enable/disable logging', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      
      // Act
      logger.setEnabled(false)
      logger.logQuery({
        query: 'Test query',
        duration: 50,
        timestamp: new Date(),
        success: true
      })
      
      // Assert
      expect(consoleSpy).not.toHaveBeenCalled()
      expect(logger.getMetricsSummary().totalQueries).toBe(0)
      
      consoleSpy.mockRestore()
    })

    it('should clear metrics history', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      
      // Act
      logger.logQuery({
        query: 'Test query',
        duration: 50,
        timestamp: new Date(),
        success: true
      })
      
      logger.clearMetrics()
      
      // Assert
      const summary = logger.getMetricsSummary()
      expect(summary.totalQueries).toBe(0)
    })
  })

  describe('Execute With Logging', () => {
    it('should execute function and log metrics on success', async () => {
      // Arrange
      const { executeWithLogging } = await import('../../lib/db/query-logger')
      const mockFn = vi.fn().mockResolvedValue([{ id: 1, name: 'test' }])
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      
      // Act
      const result = await executeWithLogging(
        mockFn,
        'SELECT * FROM users',
        ['param1'],
        { userId: 'user123', organizationId: 'org123' }
      )
      
      // Assert
      expect(result).toEqual([{ id: 1, name: 'test' }])
      expect(mockFn).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should execute function and log metrics on failure', async () => {
      // Arrange
      const { executeWithLogging } = await import('../../lib/db/query-logger')
      const mockFn = vi.fn().mockRejectedValue(new Error('Query failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act & Assert
      await expect(executeWithLogging(
        mockFn,
        'SELECT * FROM invalid_table',
        []
      )).rejects.toThrow('Query failed')
      
      expect(mockFn).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should determine row count from array results', async () => {
      // Arrange
      const { executeWithLogging, QueryLogger } = await import('../../lib/db/query-logger')
      const logger = QueryLogger.getInstance()
      logger.clearMetrics()
      
      const mockFn = vi.fn().mockResolvedValue([1, 2, 3, 4, 5])
      
      // Act
      await executeWithLogging(mockFn, 'SELECT * FROM users')
      
      // Assert
      const summary = logger.getMetricsSummary()
      expect(summary.recentQueries[0].rowCount).toBe(5)
    })
  })

  describe('Query Analysis', () => {
    it('should analyze query and provide recommendations', async () => {
      // Arrange
      mockDb.execute.mockResolvedValue([{
        'QUERY PLAN': [{
          'Node Type': 'Seq Scan',
          'Total Cost': 1500,
          'Rows': 15000
        }]
      }])
      
      // Act
      const { analyzeQuery } = await import('../../lib/db/query-logger')
      const analysis = await analyzeQuery('SELECT * FROM users WHERE name LIKE \'%test%\'')
      
      // Assert
      expect(analysis.query).toBe('SELECT * FROM users WHERE name LIKE \'%test%\'')
      expect(analysis.severity).toBe('warning')
      expect(analysis.recommendations).toContain('Consider adding an index to avoid sequential scan')
      expect(analysis.recommendations).toContain('High estimated cost - consider query optimization')
      expect(analysis.recommendations).toContain('Large result set - consider adding LIMIT or filtering')
      expect(analysis.recommendations).toContain('Avoid SELECT * - specify only needed columns')
      expect(analysis.recommendations).toContain('Leading wildcard in LIKE prevents index usage')
      expect(analysis.estimatedCost).toBe(1500)
    })

    it('should handle query analysis failure gracefully', async () => {
      // Arrange
      mockDb.execute.mockRejectedValue(new Error('Analysis failed'))
      
      // Act
      const { analyzeQuery } = await import('../../lib/db/query-logger')
      const analysis = await analyzeQuery('SELECT * FROM users')
      
      // Assert
      expect(analysis.severity).toBe('warning')
      expect(analysis.recommendations).toContain('Query analysis failed: Analysis failed')
    })

    it('should provide recommendations for common query issues', async () => {
      // Arrange
      mockDb.execute.mockResolvedValue([{
        'QUERY PLAN': [{
          'Node Type': 'Index Scan',
          'Total Cost': 100,
          'Rows': 10
        }]
      }])
      
      // Act
      const { analyzeQuery } = await import('../../lib/db/query-logger')
      const analysis = await analyzeQuery('SELECT * FROM users ORDER BY created_at')
      
      // Assert
      expect(analysis.recommendations).toContain('Avoid SELECT * - specify only needed columns')
      expect(analysis.recommendations).toContain('Consider adding LIMIT to prevent large result sets')
      expect(analysis.recommendations).toContain('ORDER BY without LIMIT can be expensive for large tables')
    })
  })

  describe('Database Metrics', () => {
    it('should get database metrics successfully', async () => {
      // Arrange
      const mockConnectionStats = [{ total_connections: 10, active_connections: 3 }]
      const mockCacheStats = [{ cache_hit_ratio: 95.5 }]
      const mockQueryStats = [{ avg_query_time: 25.5, slow_queries: 2 }]
      const mockBlockedStats = [{ blocked_queries: 1 }]
      
      let callCount = 0
      mockDb.execute.mockImplementation(() => {
        const results = [mockConnectionStats, mockCacheStats, mockQueryStats, mockBlockedStats]
        return Promise.resolve(results[callCount++])
      })
      
      // Act
      const { getDatabaseMetrics } = await import('../../lib/db/query-logger')
      const metrics = await getDatabaseMetrics()
      
      // Assert
      expect(metrics.activeConnections).toBe(3)
      expect(metrics.totalConnections).toBe(10)
      expect(metrics.cacheHitRatio).toBe(95.5)
      expect(metrics.averageQueryTime).toBe(25.5)
      expect(metrics.slowQueries).toBe(2)
      expect(metrics.blockedQueries).toBe(1)
    })

    it('should handle database metrics failure gracefully', async () => {
      // Arrange
      mockDb.execute.mockRejectedValue(new Error('Metrics unavailable'))
      
      // Act
      const { getDatabaseMetrics } = await import('../../lib/db/query-logger')
      const metrics = await getDatabaseMetrics()
      
      // Assert
      expect(metrics.activeConnections).toBe(0)
      expect(metrics.totalConnections).toBe(0)
      expect(metrics.cacheHitRatio).toBe(0)
      expect(metrics.averageQueryTime).toBe(0)
      expect(metrics.slowQueries).toBe(0)
      expect(metrics.blockedQueries).toBe(0)
    })

    it('should handle missing pg_stat_statements extension', async () => {
      // Arrange
      let callCount = 0
      mockDb.execute.mockImplementation(() => {
        if (callCount === 2) { // Query stats call
          callCount++
          return Promise.reject(new Error('pg_stat_statements not available'))
        }
        callCount++
        return Promise.resolve([{}])
      })
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Act
      const { getDatabaseMetrics } = await import('../../lib/db/query-logger')
      const metrics = await getDatabaseMetrics()
      
      // Assert
      expect(metrics.averageQueryTime).toBe(0)
      expect(metrics.slowQueries).toBe(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('pg_stat_statements not available'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Environment Configuration', () => {
    it('should be enabled in development by default', async () => {
      // Arrange
      process.env.NODE_ENV = 'development'
      
      // Act
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      
      logger.logQuery({
        query: 'Test query',
        duration: 50,
        timestamp: new Date(),
        success: true
      })
      
      // Assert
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should be disabled in production by default', async () => {
      // Arrange
      process.env.NODE_ENV = 'production'
      
      // Act
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      
      logger.logQuery({
        query: 'Test query',
        duration: 50,
        timestamp: new Date(),
        success: true
      })
      
      // Assert
      expect(consoleSpy).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should be enabled in production when ENABLE_QUERY_LOGGING is true', async () => {
      // Arrange
      process.env.NODE_ENV = 'production'
      process.env.ENABLE_QUERY_LOGGING = 'true'
      
      // Act
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      
      logger.logQuery({
        query: 'Test query',
        duration: 50,
        timestamp: new Date(),
        success: true
      })
      
      // Assert
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Alert System', () => {
    it('should trigger alerts for critical queries', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act
      logger.logQuery({
        query: 'Very slow query',
        duration: 3000, // Above critical threshold
        timestamp: new Date(),
        success: true
      })
      
      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [DB Alert] Critical query performance detected'),
        expect.objectContaining({
          duration: '3000ms',
          threshold: '2000ms'
        })
      )
      
      consoleSpy.mockRestore()
    })

    it('should not trigger alerts for normal queries', async () => {
      // Arrange
      const { QueryLogger } = await import('../../lib/db/query-logger')
      const logger = new QueryLogger()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act
      logger.logQuery({
        query: 'Normal query',
        duration: 50,
        timestamp: new Date(),
        success: true
      })
      
      // Assert
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('🚨 [DB Alert]'),
        expect.any(Object)
      )
      
      consoleSpy.mockRestore()
    })
  })
})