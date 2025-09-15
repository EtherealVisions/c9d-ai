// Unit tests for EnvironmentFallbackManager
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EnvironmentFallbackManager, EnvironmentConfig, EnvironmentLoadingOptions } from '../environment-fallback-manager'
import { PhaseSDKClient } from '../phase-sdk-client'
import { PhaseTokenLoader } from '../phase-token-loader'
import { PhaseErrorHandler } from '../phase-error-handler'
import { existsSync, readFileSync } from 'fs'

// Mock dependencies
vi.mock('../phase-sdk-client')
vi.mock('../phase-token-loader')
vi.mock('../phase-error-handler')
vi.mock('fs')
vi.mock('dotenv')
vi.mock('dotenv-expand')

const mockPhaseSDKClient = vi.mocked(PhaseSDKClient)
const mockPhaseTokenLoader = vi.mocked(PhaseTokenLoader)
const mockPhaseErrorHandler = vi.mocked(PhaseErrorHandler)
const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)

describe('EnvironmentFallbackManager', () => {
  let mockSDKClient: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    mockSDKClient = {
      initialize: vi.fn(),
      getSecrets: vi.fn(),
      getTokenSource: vi.fn(),
      isInitialized: vi.fn()
    }
    
    mockPhaseSDKClient.mockImplementation(() => mockSDKClient)
    
    mockPhaseTokenLoader.getTokenSourceDiagnostics.mockReturnValue([
      {
        source: 'process.env',
        exists: true,
        hasToken: false,
        isActive: false
      }
    ])
    
    mockPhaseErrorHandler.handleSDKError.mockReturnValue({
      shouldFallback: true,
      userMessage: 'Phase.dev error',
      logMessage: 'Phase.dev error',
      retryable: false,
      fallbackStrategy: 'LOCAL_ENV_ONLY' as any
    })
    
    // Clear cache before each test
    EnvironmentFallbackManager.clearCache()
    
    // Reset process.env
    delete process.env.NODE_ENV
    delete process.env.PHASE_SERVICE_TOKEN
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadWithFallback', () => {
    it('should load configuration with Phase.dev success', async () => {
      // Setup - Phase.dev succeeds
      mockSDKClient.initialize.mockResolvedValue(true)
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: {
          'DATABASE_URL': 'postgres://phase-db',
          'API_KEY': 'phase-api-key'
        },
        source: 'phase-sdk',
        tokenSource: {
          source: 'process.env',
          token: 'test-token'
        }
      })
      
      // Setup local files
      mockExistsSync.mockImplementation((path) => {
        return path.toString().endsWith('.env.local')
      })
      
      mockReadFileSync.mockReturnValue('LOCAL_VAR=local-value')
      
      // Mock dotenv
      const mockDotenv = await import('dotenv')
      vi.mocked(mockDotenv.config).mockReturnValue({
        parsed: { LOCAL_VAR: 'local-value' }
      })
      
      const mockDotenvExpand = await import('dotenv-expand')
      vi.mocked(mockDotenvExpand.expand).mockReturnValue({
        parsed: { LOCAL_VAR: 'local-value' }
      })
      
      // Execute
      const config = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development'
      })
      
      // Verify
      expect(config.phaseStatus.success).toBe(true)
      expect(config.phaseStatus.source).toBe('phase-sdk')
      expect(config.phaseVariableCount).toBe(2)
      expect(config.variables.DATABASE_URL).toBe('postgres://phase-db')
      expect(config.variables.API_KEY).toBe('phase-api-key')
      expect(config.variables.LOCAL_VAR).toBe('local-value')
      expect(config.totalVariables).toBeGreaterThan(0)
      expect(config.diagnostics.loadingOrder).toContain('Phase.dev SDK initialization')
      expect(config.diagnostics.tokenSourceDiagnostics).toBeDefined()
    })
    
    it('should fallback to local environment when Phase.dev fails', async () => {
      // Setup - Phase.dev fails
      mockSDKClient.initialize.mockResolvedValue(false)
      mockSDKClient.getTokenSource.mockReturnValue({
        source: 'local.env.local',
        token: 'invalid-token',
        path: '/test/.env.local'
      })
      
      // Setup local files
      mockExistsSync.mockImplementation((path) => {
        return path.toString().endsWith('.env') || path.toString().endsWith('.env.local')
      })
      
      mockReadFileSync.mockImplementation((path) => {
        if (path.toString().endsWith('.env')) {
          return 'BASE_VAR=base-value\nDATABASE_URL=local-db'
        }
        if (path.toString().endsWith('.env.local')) {
          return 'LOCAL_VAR=local-override\nAPI_KEY=local-api-key'
        }
        return ''
      })
      
      // Mock dotenv
      const mockDotenv = await import('dotenv')
      vi.mocked(mockDotenv.config).mockReturnValueOnce({
        parsed: { BASE_VAR: 'base-value', DATABASE_URL: 'local-db' }
      }).mockReturnValueOnce({
        parsed: { LOCAL_VAR: 'local-override', API_KEY: 'local-api-key' }
      })
      
      const mockDotenvExpand = await import('dotenv-expand')
      vi.mocked(mockDotenvExpand.expand).mockReturnValue({
        parsed: { BASE_VAR: 'base-value', DATABASE_URL: 'local-db', LOCAL_VAR: 'local-override', API_KEY: 'local-api-key' }
      })
      
      // Execute
      const config = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development'
      })
      
      // Verify
      expect(config.phaseStatus.success).toBe(false)
      expect(config.phaseStatus.source).toBe('fallback')
      expect(config.phaseVariableCount).toBe(0)
      expect(config.variables.DATABASE_URL).toBe('local-db')
      expect(config.variables.API_KEY).toBe('local-api-key')
      expect(config.variables.LOCAL_VAR).toBe('local-override')
      expect(config.loadedFiles).toContain('.env')
      expect(config.loadedFiles).toContain('.env.local')
      expect(config.diagnostics.loadingOrder).toContain('Phase.dev SDK initialization failed')
    })
    
    it('should handle Phase.dev errors gracefully', async () => {
      // Setup - Phase.dev throws error
      const testError = new Error('Network timeout')
      mockSDKClient.initialize.mockRejectedValue(testError)
      
      mockPhaseErrorHandler.handleSDKError.mockReturnValue({
        shouldFallback: true,
        userMessage: 'Network error occurred',
        logMessage: 'Network timeout',
        retryable: true,
        fallbackStrategy: 'RETRY_WITH_BACKOFF' as any
      })
      
      // Setup local files
      mockExistsSync.mockReturnValue(false) // No local files
      
      // Execute
      const config = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development'
      })
      
      // Verify
      expect(config.phaseStatus.success).toBe(false)
      expect(config.phaseStatus.error).toBe('Network timeout')
      expect(config.phaseStatus.fallbackStrategy).toBe('RETRY_WITH_BACKOFF')
      expect(config.diagnostics.errorHandling).toBeDefined()
      expect(config.diagnostics.errorHandling?.fallbackStrategy).toBe('RETRY_WITH_BACKOFF')
      expect(config.diagnostics.loadingOrder).toContain('Phase.dev error: RETRY_WITH_BACKOFF')
    })
    
    it('should merge Phase.dev and local variables correctly', async () => {
      // Setup - Phase.dev succeeds with some variables
      mockSDKClient.initialize.mockResolvedValue(true)
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: {
          'DATABASE_URL': 'postgres://phase-db', // This should override local
          'PHASE_ONLY_VAR': 'phase-value'
        },
        source: 'phase-sdk',
        tokenSource: {
          source: 'process.env',
          token: 'test-token'
        }
      })
      
      // Setup local files with overlapping variables
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('DATABASE_URL=local-db\nLOCAL_ONLY_VAR=local-value')
      
      // Mock dotenv
      const mockDotenv = await import('dotenv')
      vi.mocked(mockDotenv.config).mockReturnValue({
        parsed: { DATABASE_URL: 'local-db', LOCAL_ONLY_VAR: 'local-value' }
      })
      
      const mockDotenvExpand = await import('dotenv-expand')
      vi.mocked(mockDotenvExpand.expand).mockReturnValue({
        parsed: { DATABASE_URL: 'local-db', LOCAL_ONLY_VAR: 'local-value' }
      })
      
      // Execute
      const config = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development'
      })
      
      // Verify
      expect(config.variables.DATABASE_URL).toBe('postgres://phase-db') // Phase.dev wins
      expect(config.variables.PHASE_ONLY_VAR).toBe('phase-value') // Phase.dev only
      expect(config.variables.LOCAL_ONLY_VAR).toBe('local-value') // Local only
      expect(config.phaseVariableCount).toBe(2)
      expect(config.totalVariables).toBeGreaterThanOrEqual(3)
    })
    
    it('should apply process.env overrides with highest priority', async () => {
      // Setup process.env override
      process.env.DATABASE_URL = 'process-env-db'
      process.env.PROCESS_ONLY_VAR = 'process-value'
      
      // Setup - Phase.dev succeeds
      mockSDKClient.initialize.mockResolvedValue(true)
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: {
          'DATABASE_URL': 'postgres://phase-db'
        },
        source: 'phase-sdk',
        tokenSource: {
          source: 'process.env',
          token: 'test-token'
        }
      })
      
      // Setup local files
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('DATABASE_URL=local-db')
      
      // Mock dotenv
      const mockDotenv = await import('dotenv')
      vi.mocked(mockDotenv.config).mockReturnValue({
        parsed: { DATABASE_URL: 'local-db' }
      })
      
      const mockDotenvExpand = await import('dotenv-expand')
      vi.mocked(mockDotenvExpand.expand).mockReturnValue({
        parsed: { DATABASE_URL: 'local-db' }
      })
      
      // Execute
      const config = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development'
      })
      
      // Verify
      expect(config.variables.DATABASE_URL).toBe('process-env-db') // process.env wins
      expect(config.variables.PROCESS_ONLY_VAR).toBe('process-value') // process.env only
      expect(config.diagnostics.loadingOrder.some(order => order.includes('Process environment overrides applied'))).toBe(true)
    })
    
    it('should use cache when available', async () => {
      // Setup - First call
      mockSDKClient.initialize.mockResolvedValue(true)
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: { 'TEST_VAR': 'test-value' },
        source: 'phase-sdk',
        tokenSource: { source: 'process.env', token: 'test-token' }
      })
      
      mockExistsSync.mockReturnValue(false)
      
      // First call
      const config1 = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development'
      })
      
      // Clear mocks to ensure second call doesn't make new API calls
      vi.clearAllMocks()
      
      // Second call (should use cache)
      const config2 = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development'
      })
      
      // Verify
      expect(config1.variables.TEST_VAR).toBe('test-value')
      expect(config2.variables.TEST_VAR).toBe('test-value')
      expect(config2.diagnostics.cacheInfo?.cached).toBe(true)
      expect(mockSDKClient.initialize).not.toHaveBeenCalled() // Should not be called on cached request
    })
    
    it('should force reload when requested', async () => {
      // Setup - First call
      mockSDKClient.initialize.mockResolvedValue(true)
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: { 'TEST_VAR': 'test-value' },
        source: 'phase-sdk',
        tokenSource: { source: 'process.env', token: 'test-token' }
      })
      
      mockExistsSync.mockReturnValue(false)
      
      // First call
      await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development'
      })
      
      // Setup for second call with different result
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: { 'TEST_VAR': 'updated-value' },
        source: 'phase-sdk',
        tokenSource: { source: 'process.env', token: 'test-token' }
      })
      
      // Second call with force reload
      const config2 = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development',
        forceReload: true
      })
      
      // Verify
      expect(config2.variables.TEST_VAR).toBe('updated-value')
      expect(config2.diagnostics.cacheInfo?.cached).toBe(false)
      expect(mockSDKClient.initialize).toHaveBeenCalledTimes(2) // Called twice due to force reload
    })
    
    it('should handle disabled Phase.dev integration', async () => {
      // Setup local files
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('LOCAL_VAR=local-value')
      
      // Mock dotenv
      const mockDotenv = await import('dotenv')
      vi.mocked(mockDotenv.config).mockReturnValue({
        parsed: { LOCAL_VAR: 'local-value' }
      })
      
      const mockDotenvExpand = await import('dotenv-expand')
      vi.mocked(mockDotenvExpand.expand).mockReturnValue({
        parsed: { LOCAL_VAR: 'local-value' }
      })
      
      // Execute with Phase.dev disabled
      const config = await EnvironmentFallbackManager.loadWithFallback({
        appName: 'TestApp',
        environment: 'development',
        enablePhaseIntegration: false
      })
      
      // Verify
      expect(config.phaseStatus.available).toBe(false)
      expect(config.phaseStatus.success).toBe(false)
      expect(config.variables.LOCAL_VAR).toBe('local-value')
      expect(config.diagnostics.loadingOrder).toContain('Phase.dev integration disabled')
      expect(mockSDKClient.initialize).not.toHaveBeenCalled()
    })
  })

  describe('loadLocalEnvironment', () => {
    it('should load .env files in correct order', async () => {
      // Setup files
      mockExistsSync.mockImplementation((path) => {
        const pathStr = path.toString()
        return pathStr.endsWith('.env') || pathStr.endsWith('.env.local') || pathStr.endsWith('.env.development')
      })
      
      mockReadFileSync.mockImplementation((path) => {
        const pathStr = path.toString()
        if (pathStr.endsWith('.env')) {
          return 'BASE_VAR=base\nSHARED_VAR=from-base'
        }
        if (pathStr.endsWith('.env.development')) {
          return 'DEV_VAR=dev\nSHARED_VAR=from-dev'
        }
        if (pathStr.endsWith('.env.local')) {
          return 'LOCAL_VAR=local\nSHARED_VAR=from-local'
        }
        return ''
      })
      
      // Mock dotenv to return different values for each file
      const mockDotenv = await import('dotenv')
      vi.mocked(mockDotenv.config)
        .mockReturnValueOnce({ parsed: { BASE_VAR: 'base', SHARED_VAR: 'from-base' } })
        .mockReturnValueOnce({ parsed: { DEV_VAR: 'dev', SHARED_VAR: 'from-dev' } })
        .mockReturnValueOnce({ parsed: { LOCAL_VAR: 'local', SHARED_VAR: 'from-local' } })
      
      const mockDotenvExpand = await import('dotenv-expand')
      vi.mocked(mockDotenvExpand.expand)
        .mockReturnValueOnce({ parsed: { BASE_VAR: 'base', SHARED_VAR: 'from-base' } })
        .mockReturnValueOnce({ parsed: { BASE_VAR: 'base', DEV_VAR: 'dev', SHARED_VAR: 'from-dev' } })
        .mockReturnValueOnce({ parsed: { BASE_VAR: 'base', DEV_VAR: 'dev', LOCAL_VAR: 'local', SHARED_VAR: 'from-local' } })
      
      // Execute
      const result = EnvironmentFallbackManager.loadLocalEnvironment('development', '/test')
      
      // Verify
      expect(result.loadedFiles).toEqual(['.env', '.env.development', '.env.local'])
      expect(result.variables.BASE_VAR).toBe('base')
      expect(result.variables.DEV_VAR).toBe('dev')
      expect(result.variables.LOCAL_VAR).toBe('local')
      expect(result.variables.SHARED_VAR).toBe('from-local') // .env.local should win
    })
    
    it('should handle missing files gracefully', async () => {
      // Setup - no files exist
      mockExistsSync.mockReturnValue(false)
      
      // Execute
      const result = EnvironmentFallbackManager.loadLocalEnvironment('development', '/test')
      
      // Verify
      expect(result.loadedFiles).toEqual([])
      expect(result.variables).toEqual({})
      expect(result.errors).toEqual([])
    })
    
    it('should handle file read errors', async () => {
      // Setup - file exists but can't be read
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })
      
      // Mock dotenv to return error
      const mockDotenv = await import('dotenv')
      vi.mocked(mockDotenv.config).mockReturnValue({
        error: new Error('Permission denied')
      })
      
      // Execute
      const result = EnvironmentFallbackManager.loadLocalEnvironment('development', '/test')
      
      // Verify
      expect(result.loadedFiles).toEqual([])
      expect(result.errors).toHaveLength(3) // .env, .env.development, .env.local
      expect(result.errors[0].error).toBe('Permission denied')
    })
  })

  describe('mergeWithLocalEnv', () => {
    it('should merge Phase.dev secrets with local variables correctly', () => {
      const phaseSecrets = {
        'DATABASE_URL': 'postgres://phase-db',
        'PHASE_VAR': 'phase-value'
      }
      
      const localVariables = {
        'DATABASE_URL': 'local-db',
        'LOCAL_VAR': 'local-value'
      }
      
      const tokenSource = {
        source: 'process.env' as const,
        token: 'test-token'
      }
      
      // Execute
      const merged = EnvironmentFallbackManager.mergeWithLocalEnv(phaseSecrets, localVariables, tokenSource)
      
      // Verify
      expect(merged.DATABASE_URL).toBe('postgres://phase-db') // Phase.dev wins
      expect(merged.PHASE_VAR).toBe('phase-value') // Phase.dev only
      expect(merged.LOCAL_VAR).toBe('local-value') // Local only
      expect(Object.keys(merged)).toHaveLength(3)
    })
  })

  describe('cache management', () => {
    it('should clear cache correctly', () => {
      // Setup cache with some data
      EnvironmentFallbackManager['cache'].set('test-key', {
        config: EnvironmentFallbackManager.createTestConfig(),
        timestamp: Date.now(),
        ttl: 5000
      })
      
      expect(EnvironmentFallbackManager.getCacheStats().size).toBe(1)
      
      // Execute
      EnvironmentFallbackManager.clearCache()
      
      // Verify
      expect(EnvironmentFallbackManager.getCacheStats().size).toBe(0)
    })
    
    it('should provide cache statistics', () => {
      // Setup cache with test data
      const now = Date.now()
      EnvironmentFallbackManager['cache'].set('key1', {
        config: EnvironmentFallbackManager.createTestConfig(),
        timestamp: now - 1000,
        ttl: 5000
      })
      EnvironmentFallbackManager['cache'].set('key2', {
        config: EnvironmentFallbackManager.createTestConfig(),
        timestamp: now - 2000,
        ttl: 5000
      })
      
      // Execute
      const stats = EnvironmentFallbackManager.getCacheStats()
      
      // Verify
      expect(stats.size).toBe(2)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
      expect(stats.oldestEntry).toBeGreaterThan(1000)
      expect(stats.newestEntry).toBeGreaterThan(0)
    })
  })

  describe('createTestConfig', () => {
    it('should create minimal test configuration', () => {
      const variables = {
        'NODE_ENV': 'test',
        'TEST_VAR': 'test-value'
      }
      
      // Execute
      const config = EnvironmentFallbackManager.createTestConfig(variables)
      
      // Verify
      expect(config.nodeEnv).toBe('test')
      expect(config.isTest).toBe(true)
      expect(config.isDevelopment).toBe(false)
      expect(config.variables).toEqual(variables)
      expect(config.totalVariables).toBe(2)
      expect(config.phaseStatus.success).toBe(false)
    })
  })

  describe('validateConfig', () => {
    it('should validate configuration correctly', () => {
      const config = EnvironmentFallbackManager.createTestConfig({
        'DATABASE_URL': 'postgres://test',
        'API_KEY': 'test-key'
      })
      
      // Execute
      const validation = EnvironmentFallbackManager.validateConfig(config, ['DATABASE_URL', 'API_KEY'])
      
      // Verify
      expect(validation.isValid).toBe(true)
      expect(validation.missingVars).toEqual([])
      expect(validation.errors).toEqual([])
    })
    
    it('should detect missing required variables', () => {
      const config = EnvironmentFallbackManager.createTestConfig({
        'API_KEY': 'test-key'
      })
      
      // Execute
      const validation = EnvironmentFallbackManager.validateConfig(config, ['DATABASE_URL', 'API_KEY'])
      
      // Verify
      expect(validation.isValid).toBe(false)
      expect(validation.missingVars).toEqual(['DATABASE_URL'])
    })
    
    it('should generate warnings for common issues', () => {
      const config = EnvironmentFallbackManager.createTestConfig({}, {
        phaseStatus: {
          available: true,
          success: false,
          variableCount: 0,
          source: 'fallback'
        },
        totalVariables: 0,
        loadedFiles: []
      })
      
      // Execute
      const validation = EnvironmentFallbackManager.validateConfig(config)
      
      // Verify
      expect(validation.warnings).toContain('Phase.dev is available but failed to load secrets')
      expect(validation.warnings).toContain('No environment variables loaded')
      expect(validation.warnings).toContain('No .env files found and Phase.dev not available')
    })
  })

  describe('getDiagnosticInfo', () => {
    it('should provide comprehensive diagnostic information', () => {
      const config = EnvironmentFallbackManager.createTestConfig({
        'DATABASE_URL': 'postgres://test'
      }, {
        phaseStatus: {
          available: true,
          success: false,
          variableCount: 0,
          error: 'Authentication failed',
          source: 'fallback'
        },
        loadedFiles: ['.env.local']
      })
      
      // Execute
      const diagnostics = EnvironmentFallbackManager.getDiagnosticInfo(config)
      
      // Verify
      expect(diagnostics.summary).toContain('Variables: 1')
      expect(diagnostics.summary).toContain('Phase.dev: fallback')
      expect(diagnostics.recommendations).toContain('Check Phase.dev configuration and token validity')
      expect(diagnostics.recommendations).toContain('Phase.dev error: Authentication failed')
      expect(diagnostics.details.totalVariables).toBe(1)
      expect(diagnostics.details.loadedFiles).toEqual(['.env.local'])
    })
  })
})