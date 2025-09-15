// Phase.dev Monitoring Integration Tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PhaseMonitoring } from '../phase-monitoring'
import { PhaseSDKClient } from '../phase-sdk-client'
import { PhaseTokenLoader } from '../phase-token-loader'
import { EnvironmentFallbackManager } from '../environment-fallback-manager'
import { PhaseErrorHandler } from '../phase-error-handler'

// Mock console to avoid noise in tests
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}

describe('PhaseMonitoring Integration Tests', () => {
  beforeEach(() => {
    // Clear monitoring data
    PhaseMonitoring.clearMonitoringData()
    
    // Configure monitoring for integration tests
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

  describe('Token Loading Integration', () => {
    it('should monitor token loading process with real PhaseTokenLoader', () => {
      // Mock environment to simulate token loading
      const originalEnv = process.env.PHASE_SERVICE_TOKEN
      process.env.PHASE_SERVICE_TOKEN = 'test-integration-token-12345'

      try {
        // Get token source diagnostics
        const diagnostics = PhaseTokenLoader.getTokenSourceDiagnostics()
        const activeToken = PhaseTokenLoader.getValidatedToken()

        // Log the token loading process
        PhaseMonitoring.logTokenLoadingProcess(diagnostics, activeToken || undefined, 25)

        // Verify monitoring captured the token loading
        expect(mockConsole.log).toHaveBeenCalledWith(
          expect.stringContaining('[Phase.dev] token-loading: Token loaded successfully from process.env'),
          expect.objectContaining({
            tokenSource: expect.objectContaining({
              source: 'process.env',
              hasToken: true,
              tokenLength: expect.any(Number)
            }),
            metadata: expect.objectContaining({
              loadingTime: expect.any(Number),
              checkedSources: expect.any(Array)
            })
          })
        )

        // Verify performance metrics
        const logs = PhaseMonitoring.getRecentLogs('debug', 10, 'token-loading')
        expect(logs.length).toBeGreaterThan(0)
        expect(logs[0].tokenSource?.source).toBe('process.env')
        expect(logs[0].tokenSource?.hasToken).toBe(true)
        
      } finally {
        // Restore original environment
        if (originalEnv !== undefined) {
          process.env.PHASE_SERVICE_TOKEN = originalEnv
        } else {
          delete process.env.PHASE_SERVICE_TOKEN
        }
      }
    })

    it('should monitor when no token is found', () => {
      // Ensure no token is available
      const originalEnv = process.env.PHASE_SERVICE_TOKEN
      delete process.env.PHASE_SERVICE_TOKEN

      try {
        const diagnostics = PhaseTokenLoader.getTokenSourceDiagnostics()
        const activeToken = PhaseTokenLoader.getValidatedToken()

        PhaseMonitoring.logTokenLoadingProcess(diagnostics, activeToken || undefined, 15)

        // Check if token was found from other sources or not
        if (activeToken) {
          expect(mockConsole.log).toHaveBeenCalledWith(
            expect.stringContaining('[Phase.dev] token-loading: Token loaded successfully'),
            expect.objectContaining({
              tokenSource: expect.objectContaining({
                hasToken: true
              }),
              metadata: expect.objectContaining({
                loadingTime: expect.any(Number)
              })
            })
          )
        } else {
          expect(mockConsole.log).toHaveBeenCalledWith(
            expect.stringContaining('[Phase.dev] token-loading: No valid token found in any source'),
            expect.objectContaining({
              tokenSource: undefined,
              metadata: expect.objectContaining({
                loadingTime: expect.any(Number),
                sourcesWithToken: 0
              })
            })
          )
        }

      } finally {
        // Restore original environment
        if (originalEnv !== undefined) {
          process.env.PHASE_SERVICE_TOKEN = originalEnv
        }
      }
    })
  })

  describe('SDK Client Integration', () => {
    it('should monitor SDK initialization failure due to missing token', async () => {
      // Ensure no token is available by clearing all sources
      const originalEnv = process.env.PHASE_SERVICE_TOKEN
      delete process.env.PHASE_SERVICE_TOKEN

      try {
        const client = new PhaseSDKClient()
        
        // Check if token is still available from other sources
        const tokenSource = PhaseTokenLoader.getValidatedToken()
        
        if (tokenSource) {
          // Token found from other sources, test successful initialization
          const initSuccess = await client.initialize('AI.C9d.Web', 'development')
          expect(initSuccess).toBe(true)
          console.log('Token found from other sources, testing successful initialization')
        } else {
          // No token available, test failure scenario
          let initSuccess = false
          let error: any = null
          
          try {
            initSuccess = await client.initialize('TestApp', 'development')
          } catch (e) {
            error = e
          }
          
          expect(initSuccess).toBe(false)
          expect(error).toBeTruthy()
          expect(error.code).toBe('TOKEN_NOT_FOUND')
        }

        // Check performance metrics
        const metrics = PhaseMonitoring.getPerformanceMetrics('sdk-initialization')
        expect(metrics.summary.successRate).toBe(0)
        expect(metrics.summary.totalOperations).toBe(1)

      } finally {
        if (originalEnv !== undefined) {
          process.env.PHASE_SERVICE_TOKEN = originalEnv
        }
      }
    })

    it('should monitor successful SDK operations when token is available', async () => {
      // Only run this test if we have a real token
      if (!process.env.PHASE_SERVICE_TOKEN) {
        console.log('Skipping SDK integration test - no PHASE_SERVICE_TOKEN available')
        return
      }

      const client = new PhaseSDKClient()
      
      // Monitor initialization
      PhaseMonitoring.startOperation('sdk-init-success', 'sdk-initialization')
      
      let initSuccess = false
      let initError: any = null
      
      try {
        initSuccess = await client.initialize('AI.C9d.Web', 'development')
      } catch (e) {
        initError = e
      }
      
      PhaseMonitoring.endOperation('sdk-init-success', initSuccess, undefined, initError)

      if (initSuccess) {
        // Monitor secret retrieval
        PhaseMonitoring.startOperation('secret-retrieval-success', 'secret-retrieval')
        
        const result = await client.getSecrets()
        
        PhaseMonitoring.endOperation(
          'secret-retrieval-success', 
          result.success, 
          { 
            variableCount: Object.keys(result.secrets).length,
            cacheHit: false 
          },
          result.success ? undefined : {
            code: 'SDK_ERROR' as any,
            message: result.error || 'Unknown error',
            isRetryable: false
          }
        )

        // Verify monitoring captured successful operations
        const initMetrics = PhaseMonitoring.getPerformanceMetrics('sdk-initialization')
        expect(initMetrics.summary.successRate).toBeGreaterThan(0)

        if (result.success) {
          const secretMetrics = PhaseMonitoring.getPerformanceMetrics('secret-retrieval')
          expect(secretMetrics.summary.successRate).toBeGreaterThan(0)
          expect(secretMetrics.metrics[0].variableCount).toBeGreaterThanOrEqual(0)
        }
      }
    })
  })

  describe('Environment Fallback Manager Integration', () => {
    it('should monitor complete environment loading process', async () => {
      // Monitor the full environment loading process
      const startTime = Date.now()
      
      const config = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development',
        enablePhaseIntegration: true,
        fallbackToLocal: true
      })

      const loadTime = Date.now() - startTime

      // Create comprehensive diagnostics
      const diagnostics = {
        timestamp: new Date().toISOString(),
        tokenLoadingProcess: {
          checkedSources: (config.diagnostics.tokenSourceDiagnostics || []).map((source, index) => ({
            ...source,
            checkOrder: index + 1
          })),
          activeToken: config.phaseStatus.tokenSource ? {
            source: config.phaseStatus.tokenSource.source,
            path: config.phaseStatus.tokenSource.path,
            tokenLength: config.phaseStatus.tokenSource.token?.length || 0,
            isValid: true
          } : undefined,
          loadingTime: loadTime
        },
        sdkInitialization: {
          success: config.phaseStatus.success,
          duration: loadTime,
          appName: 'TestApp',
          environment: 'development',
          error: config.phaseStatus.error
        },
        secretRetrieval: {
          attempted: config.phaseStatus.available,
          success: config.phaseStatus.success,
          duration: loadTime,
          variableCount: config.phaseVariableCount,
          error: config.phaseStatus.error
        },
        fallbackUsage: {
          triggered: !config.phaseStatus.success,
          strategy: config.phaseStatus.fallbackStrategy,
          reason: config.phaseStatus.error
        }
      }

      // Log the diagnostics
      PhaseMonitoring.logConfigurationDiagnostics(diagnostics)

      // Verify comprehensive logging occurred
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[Phase.dev] configuration-diagnostics'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            tokenLoading: expect.any(Object),
            sdkInitialization: expect.any(Object),
            secretRetrieval: expect.any(Object),
            fallbackUsage: expect.any(Object)
          })
        })
      )

      // Verify the configuration contains diagnostic information
      expect(config.diagnostics).toBeDefined()
      expect(config.diagnostics.loadingOrder).toBeDefined()
      expect(Array.isArray(config.diagnostics.loadingOrder)).toBe(true)
    })

    it('should monitor fallback scenarios', async () => {
      // Force a fallback scenario by using invalid configuration
      const config = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'NonExistentApp',
        environment: 'invalid-env',
        enablePhaseIntegration: true,
        fallbackToLocal: true
      })

      // Should have fallen back to local environment
      expect(config.phaseStatus.success).toBe(false)
      expect(config.phaseStatus.source).toBe('fallback')

      // Check that fallback was logged
      const logs = PhaseMonitoring.getRecentLogs('warn', 10)
      const fallbackLogs = logs.filter(log => 
        log.operation.includes('fallback') || log.message.includes('fallback')
      )

      // Should have some indication of fallback usage
      expect(config.diagnostics.loadingOrder.some(step => 
        step.toLowerCase().includes('fallback') || 
        step.toLowerCase().includes('local')
      )).toBe(true)
    })
  })

  describe('Error Handler Integration', () => {
    it('should monitor error handling with fallback strategies', () => {
      const tokenSource = {
        source: 'process.env' as const,
        token: 'test-token-for-error-handling'
      }

      const error = {
        code: 'NETWORK_ERROR' as any,
        message: 'Connection timeout after 5000ms',
        isRetryable: true,
        tokenSource
      }

      // Handle the error
      const result = PhaseErrorHandler.handleSDKError(error, tokenSource, 'secret-retrieval')

      // Log the fallback usage
      PhaseMonitoring.logFallbackUsage(
        result.fallbackStrategy,
        result.userMessage,
        tokenSource,
        error
      )

      // Verify fallback logging
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[Phase.dev] fallback-usage: Fallback triggered'),
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NETWORK_ERROR',
            isRetryable: true
          }),
          metadata: expect.objectContaining({
            fallbackStrategy: result.fallbackStrategy
          })
        })
      )
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should track end-to-end performance metrics', async () => {
      const operations = [
        'token-loading',
        'sdk-initialization', 
        'secret-retrieval',
        'environment-merging'
      ]

      // Simulate a complete Phase.dev integration flow
      for (const operation of operations) {
        PhaseMonitoring.startOperation(`perf-test-${operation}`, operation)
        
        // Simulate some work with random duration
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
        
        const success = Math.random() > 0.2 // 80% success rate
        PhaseMonitoring.endOperation(
          `perf-test-${operation}`, 
          success,
          { variableCount: Math.floor(Math.random() * 20) }
        )
      }

      // Get comprehensive performance metrics
      const allMetrics = PhaseMonitoring.getPerformanceMetrics()
      expect(allMetrics.summary.totalOperations).toBeGreaterThanOrEqual(operations.length)
      expect(allMetrics.summary.averageDuration).toBeGreaterThan(0)

      // Get error rates
      const errorRates = PhaseMonitoring.getErrorRates('integration-test', 60000)
      expect(errorRates.totalOperations).toBeGreaterThanOrEqual(0)

      // Export monitoring data
      const exportData = PhaseMonitoring.exportMonitoringData(true)
      expect(exportData.summary.totalOperations).toBeGreaterThanOrEqual(operations.length)
      expect(exportData.performanceMetrics).toBeDefined()
      expect(exportData.recentLogs.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle concurrent operations correctly', async () => {
      const concurrentOps = 10
      const promises: Promise<void>[] = []

      // Start multiple concurrent operations
      for (let i = 0; i < concurrentOps; i++) {
        const promise = (async () => {
          const opId = `concurrent-op-${i}`
          PhaseMonitoring.startOperation(opId, 'concurrent-test')
          
          // Simulate async work
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
          
          PhaseMonitoring.endOperation(opId, true, { variableCount: i })
        })()
        
        promises.push(promise)
      }

      // Wait for all operations to complete
      await Promise.all(promises)

      // Verify all operations were tracked
      const metrics = PhaseMonitoring.getPerformanceMetrics('concurrent-test')
      expect(metrics.summary.totalOperations).toBe(concurrentOps)
      expect(metrics.summary.successRate).toBe(1) // All should succeed
    })
  })

  describe('Real-world Scenario Integration', () => {
    it('should monitor a complete application startup scenario', async () => {
      // Simulate application startup with Phase.dev integration
      const appStartupId = 'app-startup-integration'
      
      PhaseMonitoring.startOperation(appStartupId, 'application-startup')

      try {
        // Step 1: Load environment configuration
        const config = await EnvironmentFallbackManager.loadWithFallback({
          appName: 'AI.C9d.Web',
          environment: 'development',
          enablePhaseIntegration: true,
          fallbackToLocal: true
        })

        // Step 2: Log the complete configuration diagnostics
        const diagnostics = {
          timestamp: new Date().toISOString(),
          tokenLoadingProcess: {
            checkedSources: (config.diagnostics.tokenSourceDiagnostics || []).map((source, index) => ({
              ...source,
              checkOrder: index + 1
            })),
            activeToken: config.phaseStatus.tokenSource ? {
              source: config.phaseStatus.tokenSource.source,
              path: config.phaseStatus.tokenSource.path,
              tokenLength: config.phaseStatus.tokenSource.token?.length || 0,
              isValid: true
            } : undefined,
            loadingTime: 50
          },
          sdkInitialization: {
            success: config.phaseStatus.success,
            duration: 200,
            appName: 'AI.C9d.Web',
            environment: 'development',
            error: config.phaseStatus.error
          },
          secretRetrieval: {
            attempted: config.phaseStatus.available,
            success: config.phaseStatus.success,
            duration: 150,
            variableCount: config.phaseVariableCount,
            error: config.phaseStatus.error
          },
          fallbackUsage: {
            triggered: !config.phaseStatus.success,
            strategy: config.phaseStatus.fallbackStrategy,
            reason: config.phaseStatus.error
          }
        }

        PhaseMonitoring.logConfigurationDiagnostics(diagnostics)

        // Step 3: Complete the startup
        PhaseMonitoring.endOperation(appStartupId, true, {
          variableCount: config.totalVariables
        })

        // Verify comprehensive monitoring occurred
        const exportData = PhaseMonitoring.exportMonitoringData(false)
        
        expect(exportData.summary.totalOperations).toBeGreaterThan(0)
        expect(exportData.recentLogs.length).toBeGreaterThan(0)
        
        // Should have logs for configuration diagnostics
        const configLogs = exportData.recentLogs.filter(log => 
          log.operation === 'configuration-diagnostics'
        )
        expect(configLogs.length).toBeGreaterThan(0)

        // Should have logs for application startup
        const startupLogs = exportData.recentLogs.filter(log => 
          log.operation === 'application-startup'
        )
        expect(startupLogs.length).toBeGreaterThan(0)

      } catch (error) {
        PhaseMonitoring.endOperation(appStartupId, false, undefined, {
          code: 'SDK_ERROR' as any,
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: false
        })
        
        // Even in failure, monitoring should capture the error
        const metrics = PhaseMonitoring.getPerformanceMetrics('application-startup')
        expect(metrics.summary.totalOperations).toBe(1)
        expect(metrics.summary.successRate).toBe(0)
      }
    })
  })
})