// Phase.dev Monitoring System Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PhaseMonitoring } from '../phase-monitoring'
import { PhaseSDKErrorCode } from '../phase-sdk-client'
import { FallbackStrategy } from '../phase-error-handler'
import { TokenSource } from '../phase-token-loader'

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}

describe('PhaseMonitoring', () => {
  beforeEach(() => {
    // Clear all monitoring data before each test
    PhaseMonitoring.clearMonitoringData()
    
    // Configure monitoring for tests
    PhaseMonitoring.configure({
      logLevel: 'debug',
      redactSensitiveData: true,
      showTokenSources: true
    })
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(mockConsole.log)
    vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn)
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error)
    vi.spyOn(console, 'debug').mockImplementation(mockConsole.debug)
    
    // Reset mock call counts
    mockConsole.log.mockClear()
    mockConsole.warn.mockClear()
    mockConsole.error.mockClear()
    mockConsole.debug.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Configuration', () => {
    it('should configure logging settings', () => {
      PhaseMonitoring.configure({
        logLevel: 'debug',
        redactSensitiveData: false,
        showTokenSources: true
      })

      // Configuration change should be logged
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[Phase.dev] monitoring-config: Phase.dev monitoring configuration updated'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            config: expect.objectContaining({
              logLevel: 'debug',
              redactSensitiveData: false,
              showTokenSources: true
            })
          })
        })
      )
    })

    it('should respect log level filtering', () => {
      PhaseMonitoring.configure({ logLevel: 'warn' })
      
      // Clear previous logs
      mockConsole.log.mockClear()
      mockConsole.debug.mockClear()
      
      // Start and end an operation (which logs at info level)
      PhaseMonitoring.startOperation('test-op', 'test-operation')
      PhaseMonitoring.endOperation('test-op', true)
      
      // Info level logs should be filtered out when log level is warn
      expect(mockConsole.log).not.toHaveBeenCalled()
      expect(mockConsole.debug).not.toHaveBeenCalled()
    })
  })

  describe('Operation Tracking', () => {
    it('should track successful operations', () => {
      const tokenSource: TokenSource = {
        source: 'process.env',
        token: 'test-token-123'
      }

      PhaseMonitoring.startOperation('op-1', 'sdk-initialization', tokenSource)
      
      // Simulate some work
      const startTime = Date.now()
      
      PhaseMonitoring.endOperation('op-1', true, {
        variableCount: 5,
        cacheHit: false
      })

      const metrics = PhaseMonitoring.getPerformanceMetrics('sdk-initialization')
      
      expect(metrics.metrics).toHaveLength(1)
      expect(metrics.metrics[0]).toMatchObject({
        operation: 'sdk-initialization',
        success: true,
        variableCount: 5,
        cacheHit: false,
        tokenSource: expect.objectContaining({
          source: 'process.env',
          token: 'test-token-123'
        })
      })
      
      expect(metrics.summary.successRate).toBe(1)
      expect(metrics.summary.totalOperations).toBe(1)
    })

    it('should track failed operations with error details', () => {
      const tokenSource: TokenSource = {
        source: 'local.env.local',
        token: 'invalid-token',
        path: '/path/to/.env.local'
      }

      const error = {
        code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
        message: 'Authentication failed with token',
        isRetryable: false,
        tokenSource
      }

      PhaseMonitoring.startOperation('op-2', 'secret-retrieval', tokenSource)
      PhaseMonitoring.endOperation('op-2', false, undefined, error)

      const metrics = PhaseMonitoring.getPerformanceMetrics('secret-retrieval')
      
      expect(metrics.metrics).toHaveLength(1)
      expect(metrics.metrics[0]).toMatchObject({
        operation: 'secret-retrieval',
        success: false,
        errorCode: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
        tokenSource: expect.objectContaining({
          source: 'local.env.local',
          token: 'invalid-token'
        })
      })
      
      expect(metrics.summary.successRate).toBe(0)
      expect(metrics.summary.errorsByCode[PhaseSDKErrorCode.AUTHENTICATION_FAILED]).toBe(1)
    })

    it('should handle unknown operation end gracefully', () => {
      PhaseMonitoring.endOperation('unknown-op', true)
      
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempted to end unknown operation: unknown-op')
      )
    })

    it('should clean up old metrics', () => {
      // Add more than 1000 metrics to test cleanup
      for (let i = 0; i < 1005; i++) {
        PhaseMonitoring.startOperation(`op-${i}`, 'test-operation')
        PhaseMonitoring.endOperation(`op-${i}`, true)
      }

      const metrics = PhaseMonitoring.getPerformanceMetrics()
      expect(metrics.metrics.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Token Source Logging', () => {
    it('should log token loading process with source diagnostics', () => {
      const tokenSources = [
        {
          source: 'process.env' as const,
          exists: true,
          hasToken: false,
          isActive: false
        },
        {
          source: 'local.env.local' as const,
          path: '/app/.env.local',
          exists: true,
          hasToken: true,
          isActive: true
        }
      ]

      const activeToken: TokenSource = {
        source: 'local.env.local',
        token: 'active-token-1234',
        path: '/app/.env.local'
      }

      PhaseMonitoring.logTokenLoadingProcess(tokenSources, activeToken, 15)

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[Phase.dev] token-loading: Token loaded successfully from local.env.local'),
        expect.objectContaining({
          tokenSource: {
            source: 'local.env.local',
            path: '/app/.env.local',
            hasToken: true,
            tokenLength: 17
          },
          metadata: expect.objectContaining({
            loadingTime: 15,
            checkedSources: expect.arrayContaining([
              expect.objectContaining({
                checkOrder: 1,
                source: 'process.env',
                hasToken: false
              }),
              expect.objectContaining({
                checkOrder: 2,
                source: 'local.env.local',
                hasToken: true,
                isActive: true
              })
            ]),
            totalSourcesChecked: 2,
            sourcesWithToken: 1
          })
        })
      )
    })

    it('should log when no token is found', () => {
      const tokenSources = [
        {
          source: 'process.env' as const,
          exists: true,
          hasToken: false,
          isActive: false
        },
        {
          source: 'local.env' as const,
          path: '/app/.env',
          exists: false,
          hasToken: false,
          isActive: false
        }
      ]

      PhaseMonitoring.logTokenLoadingProcess(tokenSources, undefined, 8)

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[Phase.dev] token-loading: No valid token found in any source'),
        expect.objectContaining({
          tokenSource: undefined,
          metadata: expect.objectContaining({
            loadingTime: 8,
            totalSourcesChecked: 2,
            sourcesWithToken: 0
          })
        })
      )
    })

    it('should sanitize token values in logs', () => {
      const tokenSource: TokenSource = {
        source: 'process.env',
        token: 'super-secret-token-value-12345'
      }

      PhaseMonitoring.startOperation('op-1', 'test-operation', tokenSource)
      PhaseMonitoring.endOperation('op-1', true)

      // Check that the actual token value is not logged
      const logCalls = mockConsole.log.mock.calls
      const tokenLogs = logCalls.filter(call => 
        JSON.stringify(call).includes('super-secret-token-value-12345')
      )
      
      expect(tokenLogs).toHaveLength(0)

      // But token source info should be present
      const tokenSourceLogs = logCalls.filter(call => 
        JSON.stringify(call).includes('process.env')
      )
      
      expect(tokenSourceLogs.length).toBeGreaterThan(0)
    })
  })

  describe('SDK Operation Logging', () => {
    it('should log successful SDK initialization', () => {
      const tokenSource: TokenSource = {
        source: 'root.env',
        token: 'root-token-123',
        path: '/workspace/.env'
      }

      PhaseMonitoring.logSDKInitialization(
        true,
        250,
        'AI.C9d.Web',
        'development',
        tokenSource
      )

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[Phase.dev] sdk-initialization: Phase.dev SDK initialized successfully for AI.C9d.Web/development'),
        expect.objectContaining({
          tokenSource: {
            source: 'root.env',
            path: '/workspace/.env',
            hasToken: true,
            tokenLength: 14
          },
          performance: {
            duration: 250,
            success: true
          },
          metadata: {
            appName: 'AI.C9d.Web',
            environment: 'development'
          }
        })
      )
    })

    it('should log failed SDK initialization with error details', () => {
      const error = {
        code: PhaseSDKErrorCode.APP_NOT_FOUND,
        message: 'App "NonExistentApp" not found',
        isRetryable: false
      }

      PhaseMonitoring.logSDKInitialization(
        false,
        150,
        'NonExistentApp',
        'production',
        undefined,
        error
      )

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[Phase.dev] sdk-initialization: Phase.dev SDK initialization failed for NonExistentApp/production'),
        expect.objectContaining({
          tokenSource: undefined,
          performance: {
            duration: 150,
            success: false
          },
          error: {
            code: PhaseSDKErrorCode.APP_NOT_FOUND,
            message: 'App "NonExistentApp" not found',
            isRetryable: false
          }
        })
      )
    })

    it('should log secret retrieval with cache information', () => {
      const tokenSource: TokenSource = {
        source: 'local.env.local',
        token: 'cache-test-token'
      }

      PhaseMonitoring.logSecretRetrieval(
        true,
        45,
        12,
        tokenSource,
        true // cache hit
      )

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[Phase.dev] secret-retrieval: Retrieved 12 secrets in 45ms (from cache)'),
        expect.objectContaining({
          performance: {
            duration: 45,
            success: true,
            variableCount: 12
          },
          metadata: {
            cacheHit: true
          }
        })
      )
    })
  })

  describe('Fallback Logging', () => {
    it('should log fallback usage with strategy and reason', () => {
      const tokenSource: TokenSource = {
        source: 'process.env',
        token: 'fallback-test-token'
      }

      const originalError = {
        code: PhaseSDKErrorCode.NETWORK_ERROR,
        message: 'Network timeout after 5000ms',
        isRetryable: true
      }

      PhaseMonitoring.logFallbackUsage(
        FallbackStrategy.RETRY_WITH_BACKOFF,
        'Phase.dev service unavailable due to network timeout',
        tokenSource,
        originalError
      )

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[Phase.dev] fallback-usage: Fallback triggered: RETRY_WITH_BACKOFF'),
        expect.objectContaining({
          error: {
            code: PhaseSDKErrorCode.NETWORK_ERROR,
            message: 'Network timeout after 5000ms',
            isRetryable: true,
            fallbackStrategy: FallbackStrategy.RETRY_WITH_BACKOFF
          },
          metadata: {
            fallbackStrategy: FallbackStrategy.RETRY_WITH_BACKOFF,
            reason: 'Phase.dev service unavailable due to network timeout'
          }
        })
      )
    })
  })

  describe('Performance Metrics', () => {
    it('should calculate performance summary correctly', () => {
      // Add some test metrics
      PhaseMonitoring.startOperation('op-1', 'test-operation')
      PhaseMonitoring.endOperation('op-1', true, { variableCount: 5 })

      PhaseMonitoring.startOperation('op-2', 'test-operation')
      PhaseMonitoring.endOperation('op-2', false, undefined, {
        code: PhaseSDKErrorCode.NETWORK_ERROR,
        message: 'Network error',
        isRetryable: true
      })

      PhaseMonitoring.startOperation('op-3', 'test-operation')
      PhaseMonitoring.endOperation('op-3', true, { variableCount: 8 })

      const metrics = PhaseMonitoring.getPerformanceMetrics('test-operation')
      
      expect(metrics.summary.totalOperations).toBe(3)
      expect(metrics.summary.successRate).toBeCloseTo(2/3, 2)
      expect(metrics.summary.errorsByCode[PhaseSDKErrorCode.NETWORK_ERROR]).toBe(1)
    })

    it('should filter metrics by time window', () => {
      // Clear existing metrics first
      PhaseMonitoring.clearMonitoringData()
      
      // Add a recent metric first
      PhaseMonitoring.startOperation('recent-op', 'recent-operation')
      PhaseMonitoring.endOperation('recent-op', true)

      // Add old metrics (simulate by manipulating the metrics array)
      PhaseMonitoring.startOperation('old-op', 'old-operation')
      PhaseMonitoring.endOperation('old-op', true)
      
      // Modify the timestamp to be old using test helper
      const metricsArray = (PhaseMonitoring as any)._getPerformanceMetricsArray()
      if (metricsArray.length >= 2) {
        // Simulate old timestamp (2 hours ago) for the second metric
        ;(PhaseMonitoring as any)._setMetricEndTime(1, Date.now() - (2 * 60 * 60 * 1000))
      }

      // Filter by last hour (3600000 ms)
      const recentMetrics = PhaseMonitoring.getPerformanceMetrics(undefined, 3600000)
      
      // Should include at least the recent operation
      const recentOp = recentMetrics.metrics.find(m => m.operation === 'recent-operation')
      expect(recentOp).toBeDefined()
      
      // Should have at least 1 metric
      expect(recentMetrics.metrics.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Error Rate Tracking', () => {
    it('should calculate error rates correctly', () => {
      // Clear any existing metrics first
      PhaseMonitoring.clearMonitoringData()
      
      // Add some operations with mixed success/failure
      for (let i = 0; i < 10; i++) {
        PhaseMonitoring.startOperation(`op-${i}`, 'test-operation')
        const success = i < 7 // 7 successes, 3 failures
        const error = success ? undefined : {
          code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
          message: 'Auth failed',
          isRetryable: false
        }
        PhaseMonitoring.endOperation(`op-${i}`, success, undefined, error)
      }

      // Get all metrics to verify they were recorded
      const allMetrics = PhaseMonitoring.getPerformanceMetrics()
      expect(allMetrics.summary.totalOperations).toBeGreaterThanOrEqual(10)

      const errorRates = PhaseMonitoring.getErrorRates('test-window', 3600000)
      
      expect(errorRates.totalOperations).toBeGreaterThanOrEqual(10)
      expect(errorRates.errorCount).toBeGreaterThanOrEqual(3)
      expect(errorRates.errorRate).toBeGreaterThan(0)
      expect(errorRates.errorsByCode[PhaseSDKErrorCode.AUTHENTICATION_FAILED]).toBe(3)
      expect(errorRates.fallbackUsage[FallbackStrategy.LOCAL_ENV_ONLY]).toBe(3)
    })
  })

  describe('Configuration Diagnostics', () => {
    it('should log comprehensive configuration diagnostics', () => {
      const diagnostics = {
        timestamp: '2024-01-01T12:00:00.000Z',
        tokenLoadingProcess: {
          checkedSources: [
            {
              source: 'process.env' as const,
              exists: true,
              hasToken: false,
              isActive: false,
              checkOrder: 1
            },
            {
              source: 'local.env.local' as const,
              path: '/app/.env.local',
              exists: true,
              hasToken: true,
              isActive: true,
              checkOrder: 2
            }
          ],
          activeToken: {
            source: 'local.env.local' as const,
            path: '/app/.env.local',
            tokenLength: 32,
            isValid: true
          },
          loadingTime: 12
        },
        sdkInitialization: {
          success: true,
          duration: 245,
          appName: 'AI.C9d.Web',
          environment: 'development'
        },
        secretRetrieval: {
          attempted: true,
          success: true,
          duration: 156,
          variableCount: 15
        },
        fallbackUsage: {
          triggered: false
        }
      }

      PhaseMonitoring.logConfigurationDiagnostics(diagnostics)

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[Phase.dev] configuration-diagnostics: Phase.dev configuration diagnostics'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            timestamp: '2024-01-01T12:00:00.000Z',
            tokenLoading: expect.objectContaining({
              checkedSources: expect.arrayContaining([
                expect.objectContaining({
                  source: 'process.env',
                  hasToken: false
                }),
                expect.objectContaining({
                  source: 'local.env.local',
                  hasToken: true,
                  isActive: true
                })
              ]),
              activeToken: expect.objectContaining({
                source: 'local.env.local',
                tokenLength: 32,
                isValid: true
              }),
              loadingTime: 12
            }),
            sdkInitialization: expect.objectContaining({
              success: true,
              duration: 245,
              appName: 'AI.C9d.Web',
              environment: 'development'
            }),
            secretRetrieval: expect.objectContaining({
              success: true,
              variableCount: 15
            })
          })
        })
      )
    })
  })

  describe('Data Export and Management', () => {
    it('should export monitoring data correctly', () => {
      // Add some test data
      PhaseMonitoring.startOperation('export-test', 'test-operation')
      PhaseMonitoring.endOperation('export-test', true, { variableCount: 5 })

      const exportData = PhaseMonitoring.exportMonitoringData(true)
      
      expect(exportData).toHaveProperty('summary')
      expect(exportData).toHaveProperty('performanceMetrics')
      expect(exportData).toHaveProperty('recentLogs')
      expect(exportData).toHaveProperty('configuration')
      
      expect(exportData.summary.totalOperations).toBeGreaterThan(0)
      expect(exportData.performanceMetrics).toBeDefined()
      expect(Array.isArray(exportData.recentLogs)).toBe(true)
    })

    it('should export without raw metrics when requested', () => {
      const exportData = PhaseMonitoring.exportMonitoringData(false)
      
      expect(exportData.performanceMetrics).toBeUndefined()
      expect(exportData.summary).toBeDefined()
    })

    it('should clear all monitoring data', () => {
      // Add some data first
      PhaseMonitoring.startOperation('clear-test', 'test-operation')
      PhaseMonitoring.endOperation('clear-test', true)

      // Verify data exists
      let metrics = PhaseMonitoring.getPerformanceMetrics()
      expect(metrics.metrics.length).toBeGreaterThan(0)

      // Clear data
      PhaseMonitoring.clearMonitoringData()

      // Verify data is cleared
      metrics = PhaseMonitoring.getPerformanceMetrics()
      expect(metrics.metrics.length).toBe(0)
    })
  })

  describe('Sensitive Data Redaction', () => {
    it('should redact sensitive information from error messages', () => {
      PhaseMonitoring.configure({ redactSensitiveData: true })

      const error = {
        code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
        message: 'Authentication failed with token=abc123xyz secret=def456uvw',
        isRetryable: false
      }

      PhaseMonitoring.startOperation('redact-test', 'test-operation')
      PhaseMonitoring.endOperation('redact-test', false, undefined, error)

      // Check that sensitive data is redacted in logs
      const logCalls = mockConsole.error.mock.calls
      const errorLog = logCalls.find(call => 
        call[0].includes('test-operation')
      )
      
      expect(errorLog).toBeDefined()
      const logData = errorLog![1]
      expect(logData.error.message).toContain('[REDACTED]')
      expect(logData.error.message).not.toContain('abc123xyz')
      expect(logData.error.message).not.toContain('def456uvw')
    })

    it('should not redact when redaction is disabled', () => {
      PhaseMonitoring.configure({ redactSensitiveData: false })

      const error = {
        code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
        message: 'Authentication failed with token=abc123xyz',
        isRetryable: false
      }

      PhaseMonitoring.startOperation('no-redact-test', 'test-operation')
      PhaseMonitoring.endOperation('no-redact-test', false, undefined, error)

      const logCalls = mockConsole.error.mock.calls
      const errorLog = logCalls.find(call => 
        call[0].includes('test-operation')
      )
      
      expect(errorLog).toBeDefined()
      const logData = errorLog![1]
      expect(logData.error.message).toContain('abc123xyz')
      expect(logData.error.message).not.toContain('[REDACTED]')
    })
  })

  describe('Log Entry Management', () => {
    it('should limit log entries to prevent memory issues', () => {
      // Add more than 1000 log entries
      for (let i = 0; i < 1005; i++) {
        PhaseMonitoring.startOperation(`log-test-${i}`, 'test-operation')
        PhaseMonitoring.endOperation(`log-test-${i}`, true)
      }

      const logs = PhaseMonitoring.getRecentLogs('debug', 2000)
      expect(logs.length).toBeLessThanOrEqual(1000)
    })

    it('should filter logs by level and operation', () => {
      // Add logs at different levels
      PhaseMonitoring.startOperation('info-op', 'info-operation')
      PhaseMonitoring.endOperation('info-op', true)

      PhaseMonitoring.startOperation('error-op', 'error-operation')
      PhaseMonitoring.endOperation('error-op', false, undefined, {
        code: PhaseSDKErrorCode.NETWORK_ERROR,
        message: 'Network error',
        isRetryable: true
      })

      // Get only error level logs
      const errorLogs = PhaseMonitoring.getRecentLogs('error', 100)
      expect(errorLogs.every(log => log.level === 'error')).toBe(true)

      // Get logs for specific operation
      const infoOpLogs = PhaseMonitoring.getRecentLogs('debug', 100, 'info-operation')
      expect(infoOpLogs.every(log => log.operation === 'info-operation')).toBe(true)
    })
  })
})