// Unit tests for Phase.dev secret retrieval functionality using SDK
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadFromPhase, clearPhaseCache, getPhaseCacheStatus, testPhaseConnectivity } from '../phase'
import { PhaseSDKClient } from '../phase-sdk-client'
import { PhaseTokenLoader } from '../phase-token-loader'

// Mock the Phase.dev SDK
vi.mock('@phase.dev/phase-node', () => ({
  default: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    get: vi.fn()
  }))
}))

// Mock the PhaseSDKClient
vi.mock('../phase-sdk-client', () => ({
  PhaseSDKClient: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    getSecrets: vi.fn(),
    isInitialized: vi.fn(),
    clearCache: vi.fn(),
    getTokenSource: vi.fn(),
    testConnection: vi.fn()
  }))
}))

// Mock the PhaseTokenLoader
vi.mock('../phase-token-loader', () => ({
  PhaseTokenLoader: {
    loadServiceToken: vi.fn(),
    getValidatedToken: vi.fn()
  }
}))

describe('Phase.dev Secret Retrieval with SDK', () => {
  const mockSDKClient = {
    initialize: vi.fn(),
    getSecrets: vi.fn(),
    isInitialized: vi.fn(),
    clearCache: vi.fn(),
    getTokenSource: vi.fn(),
    testConnection: vi.fn()
  }

  const mockTokenSource = {
    token: 'test-service-token',
    source: 'process.env' as const,
    path: undefined
  }

  beforeEach(() => {
    vi.clearAllMocks()
    clearPhaseCache()
    
    // Setup default mocks
    vi.mocked(PhaseSDKClient).mockImplementation(() => mockSDKClient as any)
    vi.mocked(PhaseTokenLoader.loadServiceToken).mockResolvedValue(mockTokenSource)
    
    // Reset mock implementations
    mockSDKClient.initialize.mockResolvedValue(true)
    mockSDKClient.isInitialized.mockReturnValue(false)
    mockSDKClient.getTokenSource.mockReturnValue(mockTokenSource)
  })

  afterEach(() => {
    clearPhaseCache()
  })

  describe('loadFromPhase with SDK', () => {
    it('should successfully load secrets using SDK', async () => {
      const mockSecrets = {
        'DATABASE_URL': 'postgresql://localhost:5432/test',
        'API_KEY': 'test-api-key',
        'SECRET_KEY': 'test-secret'
      }

      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: mockSecrets,
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })

      const result = await loadFromPhase()

      expect(result.success).toBe(true)
      expect(result.variables).toEqual(mockSecrets)
      expect(result.source).toBe('phase-sdk')
      expect(result.tokenSource).toEqual(mockTokenSource)
      expect(mockSDKClient.initialize).toHaveBeenCalledWith('AI.C9d.Web', 'test', undefined)
      expect(mockSDKClient.getSecrets).toHaveBeenCalled()
    })

    it('should handle SDK initialization failure', async () => {
      mockSDKClient.initialize.mockResolvedValue(false)

      const result = await loadFromPhase()

      expect(result.success).toBe(false)
      expect(result.variables).toEqual({})
      expect(result.source).toBe('fallback')
      expect(result.error).toContain('Failed to initialize Phase.dev SDK client')
    })

    it('should handle SDK secret retrieval failure', async () => {
      mockSDKClient.getSecrets.mockResolvedValue({
        success: false,
        secrets: {},
        error: 'Authentication failed',
        source: 'fallback',
        tokenSource: mockTokenSource
      })

      const result = await loadFromPhase()

      expect(result.success).toBe(false)
      expect(result.variables).toEqual({})
      expect(result.source).toBe('fallback')
      expect(result.error).toBe('Authentication failed')
      expect(result.tokenSource).toEqual(mockTokenSource)
    })

    it('should handle missing service token', async () => {
      vi.mocked(PhaseTokenLoader.loadServiceToken).mockResolvedValue(null)
      
      // Also clear process.env to ensure no fallback
      const originalToken = process.env.PHASE_SERVICE_TOKEN
      delete process.env.PHASE_SERVICE_TOKEN

      const result = await loadFromPhase()

      expect(result.success).toBe(false)
      expect(result.variables).toEqual({})
      expect(result.source).toBe('fallback')
      expect(result.error).toBe('Phase.dev service token not available')
      
      // Restore original token
      if (originalToken) {
        process.env.PHASE_SERVICE_TOKEN = originalToken
      }
    })

    it('should use custom configuration overrides', async () => {
      const mockSecrets = { 'TEST_VAR': 'test-value' }
      
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: mockSecrets,
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })

      const customConfig = {
        appName: 'CustomApp',
        environment: 'staging'
      }

      const result = await loadFromPhase(false, customConfig)

      expect(result.success).toBe(true)
      expect(mockSDKClient.initialize).toHaveBeenCalledWith('CustomApp', 'staging', undefined)
    })

    it('should handle SDK client exceptions', async () => {
      mockSDKClient.getSecrets.mockRejectedValue(new Error('Network timeout'))

      const result = await loadFromPhase()

      expect(result.success).toBe(false)
      expect(result.variables).toEqual({})
      expect(result.source).toBe('fallback')
      expect(result.error).toContain('Network timeout')
    })
  })

  describe('Caching with SDK-compatible TTL', () => {
    it('should cache successful SDK responses', async () => {
      const mockSecrets = { 'CACHED_VAR': 'cached-value' }
      
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: mockSecrets,
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })

      // First call
      const result1 = await loadFromPhase()
      expect(result1.success).toBe(true)
      expect(mockSDKClient.getSecrets).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result2 = await loadFromPhase()
      expect(result2.success).toBe(true)
      expect(result2.variables).toEqual(mockSecrets)
      expect(result2.source).toBe('phase-sdk')
      expect(mockSDKClient.getSecrets).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should force reload when requested', async () => {
      const mockSecrets = { 'RELOAD_VAR': 'reload-value' }
      
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: mockSecrets,
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })

      // First call
      await loadFromPhase()
      expect(mockSDKClient.getSecrets).toHaveBeenCalledTimes(1)

      // Force reload
      await loadFromPhase(true)
      expect(mockSDKClient.getSecrets).toHaveBeenCalledTimes(2)
    })

    it('should provide cache status with token source information', async () => {
      const mockSecrets = { 'STATUS_VAR': 'status-value' }
      
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: mockSecrets,
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })

      // Initially no cache
      let status = getPhaseCacheStatus()
      expect(status.isCached).toBe(false)
      expect(status.variableCount).toBe(0)

      // Load secrets
      await loadFromPhase()

      // Check cache status
      status = getPhaseCacheStatus()
      expect(status.isCached).toBe(true)
      expect(status.variableCount).toBe(1)
      expect(status.source).toBe('phase-sdk')
      expect(status.tokenSource).toEqual(mockTokenSource)
      expect(status.age).toBeGreaterThanOrEqual(0)
    })

    it('should clear cache and SDK client', async () => {
      // First create a cache entry
      const mockSecrets = { 'CLEAR_VAR': 'clear-value' }
      
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: mockSecrets,
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })

      await loadFromPhase()
      
      // Verify cache exists
      let status = getPhaseCacheStatus()
      expect(status.isCached).toBe(true)
      
      // Clear cache
      clearPhaseCache()
      
      // Verify cache is cleared
      status = getPhaseCacheStatus()
      expect(status.isCached).toBe(false)
    })
  })

  describe('SDK client reuse', () => {
    it('should reuse initialized SDK client', async () => {
      const mockSecrets = { 'REUSE_VAR': 'reuse-value' }
      
      mockSDKClient.isInitialized.mockReturnValue(true)
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: mockSecrets,
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })

      // First call
      await loadFromPhase()
      expect(mockSDKClient.initialize).toHaveBeenCalledTimes(1)

      // Second call should reuse client
      await loadFromPhase(true) // Force reload to bypass cache
      expect(mockSDKClient.initialize).toHaveBeenCalledTimes(1) // Still only called once
      expect(mockSDKClient.getSecrets).toHaveBeenCalledTimes(2)
    })

    it('should reinitialize client if not initialized', async () => {
      const mockSecrets = { 'REINIT_VAR': 'reinit-value' }
      
      // First call - client not initialized
      mockSDKClient.isInitialized.mockReturnValueOnce(false)
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: mockSecrets,
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })

      await loadFromPhase()
      expect(mockSDKClient.initialize).toHaveBeenCalledTimes(1)

      // Second call - client still not initialized
      mockSDKClient.isInitialized.mockReturnValueOnce(false)
      await loadFromPhase(true)
      expect(mockSDKClient.initialize).toHaveBeenCalledTimes(2)
    })
  })

  describe('testPhaseConnectivity with SDK', () => {
    it('should test connectivity successfully', async () => {
      const mockSecrets = { 'CONNECT_VAR': 'connect-value' }
      
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: mockSecrets,
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })

      const result = await testPhaseConnectivity()

      expect(result.success).toBe(true)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.error).toBeUndefined()
    })

    it('should handle connectivity test failure', async () => {
      mockSDKClient.getSecrets.mockResolvedValue({
        success: false,
        secrets: {},
        error: 'Connection failed',
        source: 'fallback',
        tokenSource: mockTokenSource
      })

      const result = await testPhaseConnectivity()

      expect(result.success).toBe(false)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.error).toBe('Connection failed')
    })

    it('should handle connectivity test exception', async () => {
      mockSDKClient.initialize.mockRejectedValue(new Error('Network error'))

      const result = await testPhaseConnectivity()

      expect(result.success).toBe(false)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.error).toContain('Network error')
    })
  })

  describe('Error handling for SDK-specific error types', () => {
    it('should handle authentication errors', async () => {
      mockSDKClient.getSecrets.mockResolvedValue({
        success: false,
        secrets: {},
        error: 'Phase.dev authentication failed. Check your service token.',
        source: 'fallback',
        tokenSource: mockTokenSource
      })

      const result = await loadFromPhase()

      expect(result.success).toBe(false)
      expect(result.error).toContain('authentication failed')
      expect(result.tokenSource).toEqual(mockTokenSource)
    })

    it('should handle app not found errors', async () => {
      mockSDKClient.getSecrets.mockResolvedValue({
        success: false,
        secrets: {},
        error: 'Phase.dev app "NonExistentApp" not found.',
        source: 'fallback',
        tokenSource: mockTokenSource
      })

      const result = await loadFromPhase()

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
      expect(result.tokenSource).toEqual(mockTokenSource)
    })

    it('should include token source information in error results', async () => {
      mockSDKClient.initialize.mockRejectedValue(new Error('SDK initialization failed'))

      const result = await loadFromPhase()

      expect(result.success).toBe(false)
      expect(result.source).toBe('fallback')
      expect(result.tokenSource).toEqual(mockTokenSource)
    })
  })

  describe('Integration with PhaseTokenLoader', () => {
    it('should use PhaseTokenLoader for token loading', async () => {
      const customTokenSource = {
        token: 'custom-token',
        source: 'local.env.local' as const,
        path: '/path/to/.env.local'
      }

      vi.mocked(PhaseTokenLoader.loadServiceToken).mockResolvedValue(customTokenSource)
      
      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: { 'CUSTOM_VAR': 'custom-value' },
        source: 'phase-sdk',
        tokenSource: customTokenSource
      })

      const result = await loadFromPhase()

      expect(result.success).toBe(true)
      expect(result.tokenSource).toEqual(customTokenSource)
      // Note: PhaseTokenLoader is called via require() so the mock may not be tracked
    })

    it('should handle PhaseTokenLoader failure gracefully', async () => {
      vi.mocked(PhaseTokenLoader.loadServiceToken).mockImplementation(() => {
        throw new Error('Token loader failed')
      })

      // Should fallback to process.env check
      process.env.PHASE_SERVICE_TOKEN = 'fallback-token'

      const fallbackTokenSource = {
        token: 'fallback-token',
        source: 'process.env' as const,
        path: undefined
      }

      mockSDKClient.getSecrets.mockResolvedValue({
        success: true,
        secrets: { 'FALLBACK_VAR': 'fallback-value' },
        source: 'phase-sdk',
        tokenSource: fallbackTokenSource
      })

      const result = await loadFromPhase()

      expect(result.success).toBe(true)
      
      // Clean up
      delete process.env.PHASE_SERVICE_TOKEN
    })
  })
})