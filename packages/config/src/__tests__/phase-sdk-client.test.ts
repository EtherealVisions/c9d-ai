// Unit tests for PhaseSDKClient
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PhaseSDKClient, PhaseSDKErrorCode } from '../phase-sdk-client'
import { PhaseTokenLoader, type TokenSource } from '../phase-token-loader'

// Mock the Phase.dev SDK
const mockPhaseSDK = {
  init: vi.fn(),
  get: vi.fn(),
  apps: [
    {
      id: 'test-app-id',
      name: 'TestApp',
      environments: []
    }
  ]
}

vi.mock('@phase.dev/phase-node', () => ({
  default: function MockPhase() {
    return mockPhaseSDK
  }
}))

// Mock PhaseTokenLoader
vi.mock('../phase-token-loader', () => ({
  PhaseTokenLoader: {
    getValidatedToken: vi.fn(),
    loadServiceToken: vi.fn()
  }
}))

describe('PhaseSDKClient', () => {
  let client: PhaseSDKClient
  const mockTokenSource: TokenSource = {
    source: 'process.env',
    token: 'pss_service:v2:05daacdea651bb4c4e9eb559605d2570c93d9e7d9ccb69cb6b7738c8c6d4a8fb:7a5ef157249c3638f75706b902e772e87d10425d0c3e7d92a00bf9434761b97c:ea95e5e98e6d4f2ab5acf28054508e823d62779ee59261c8ea9b6940a0360d0a:f244cfb193bbd8a371b82b8d0fc3d3fb3028a245d08f805cbdb78a1ad26b880c'
  }

  beforeEach(() => {
    client = new PhaseSDKClient()
    vi.clearAllMocks()
    
    // Reset mock apps array
    mockPhaseSDK.apps = [
      {
        id: 'test-app-id',
        name: 'TestApp',
        environments: []
      }
    ]
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize successfully with valid token from process.env', async () => {
      // Mock token loading
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)

      const result = await client.initialize('TestApp', 'development')

      expect(result).toBe(true)
      expect(client.isInitialized()).toBe(true)
      expect(mockPhaseSDK.init).toHaveBeenCalledWith()
      expect(client.getTokenSource()).toEqual(mockTokenSource)
    })

    it('should initialize successfully with token from local .env.local', async () => {
      const localTokenSource: TokenSource = {
        source: 'local.env.local',
        token: 'pss_service:v2:05daacdea651bb4c4e9eb559605d2570c93d9e7d9ccb69cb6b7738c8c6d4a8fb:7a5ef157249c3638f75706b902e772e87d10425d0c3e7d92a00bf9434761b97c:ea95e5e98e6d4f2ab5acf28054508e823d62779ee59261c8ea9b6940a0360d0a:f244cfb193bbd8a371b82b8d0fc3d3fb3028a245d08f805cbdb78a1ad26b880c',
        path: '/path/to/.env.local'
      }
      
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(localTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)

      const result = await client.initialize('TestApp', 'development')

      expect(result).toBe(true)
      expect(client.getTokenSource()).toEqual(localTokenSource)
      expect(mockPhaseSDK.init).toHaveBeenCalledWith()
    })

    it('should initialize successfully with token from root .env', async () => {
      const rootTokenSource: TokenSource = {
        source: 'root.env',
        token: 'pss_service:v2:05daacdea651bb4c4e9eb559605d2570c93d9e7d9ccb69cb6b7738c8c6d4a8fb:7a5ef157249c3638f75706b902e772e87d10425d0c3e7d92a00bf9434761b97c:ea95e5e98e6d4f2ab5acf28054508e823d62779ee59261c8ea9b6940a0360d0a:f244cfb193bbd8a371b82b8d0fc3d3fb3028a245d08f805cbdb78a1ad26b880c',
        path: '/workspace/.env'
      }
      
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(rootTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)

      const result = await client.initialize('TestApp', 'production', '/workspace')

      expect(result).toBe(true)
      expect(client.getTokenSource()).toEqual(rootTokenSource)
      expect(PhaseTokenLoader.getValidatedToken).toHaveBeenCalledWith('/workspace')
    })

    it('should fail initialization when no token found', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(null)

      await expect(client.initialize('TestApp', 'development')).rejects.toMatchObject({
        code: PhaseSDKErrorCode.TOKEN_NOT_FOUND,
        message: expect.stringContaining('PHASE_SERVICE_TOKEN not found in any source'),
        isRetryable: false
      })

      expect(client.isInitialized()).toBe(false)
      expect(mockPhaseSDK.init).not.toHaveBeenCalled()
    })

    it('should fail initialization with empty app name', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)

      await expect(client.initialize('', 'development')).rejects.toMatchObject({
        code: PhaseSDKErrorCode.SDK_ERROR,
        message: expect.stringContaining('App name is required'),
        isRetryable: false,
        tokenSource: mockTokenSource
      })

      expect(client.isInitialized()).toBe(false)
    })

    it('should fail initialization with empty environment', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)

      await expect(client.initialize('TestApp', '')).rejects.toMatchObject({
        code: PhaseSDKErrorCode.SDK_ERROR,
        message: expect.stringContaining('Environment is required'),
        isRetryable: false,
        tokenSource: mockTokenSource
      })

      expect(client.isInitialized()).toBe(false)
    })

    it('should handle SDK initialization failure', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockRejectedValue(new Error('SDK initialization failed'))

      await expect(client.initialize('TestApp', 'development')).rejects.toMatchObject({
        code: PhaseSDKErrorCode.SDK_ERROR,
        message: expect.stringContaining('SDK initialization failed'),
        isRetryable: false,
        tokenSource: mockTokenSource
      })

      expect(client.isInitialized()).toBe(false)
    })

    it('should handle authentication errors during initialization', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockRejectedValue(new Error('401 Unauthorized'))

      await expect(client.initialize('TestApp', 'development')).rejects.toMatchObject({
        code: PhaseSDKErrorCode.AUTHENTICATION_FAILED,
        message: expect.stringContaining('authentication failed'),
        isRetryable: false,
        tokenSource: mockTokenSource
      })

      expect(client.isInitialized()).toBe(false)
    })

    it('should trim whitespace from app name and environment', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)

      const result = await client.initialize('  TestApp  ', '  development  ')

      expect(result).toBe(true)
      expect(client.getConfig()).toMatchObject({
        appName: 'TestApp',
        environment: 'development'
      })
    })
  })

  describe('getSecrets', () => {
    beforeEach(async () => {
      // Initialize client for secret tests
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)
      await client.initialize('TestApp', 'development')
    })

    it('should fetch secrets successfully with object response', async () => {
      const mockSecrets = {
        DATABASE_URL: 'postgresql://localhost:5432/test',
        API_KEY: 'secret-api-key-123',
        DEBUG: 'true'
      }

      // Mock the SDK response as an array of Secret objects
      const mockSecretsArray = [
        { key: 'DATABASE_URL', value: 'postgresql://localhost:5432/test' },
        { key: 'API_KEY', value: 'secret-api-key-123' },
        { key: 'DEBUG', value: 'true' }
      ]
      mockPhaseSDK.get.mockResolvedValue(mockSecretsArray)

      const result = await client.getSecrets()

      expect(result).toEqual({
        success: true,
        secrets: mockSecrets,
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })

      expect(mockPhaseSDK.get).toHaveBeenCalledWith({
        appId: 'test-app-id',
        envName: 'development'
      })
    })

    it('should fetch secrets successfully with array response', async () => {
      const mockSecretsArray = [
        { key: 'DATABASE_URL', value: 'postgresql://localhost:5432/test' },
        { key: 'API_KEY', value: 'secret-api-key-123' },
        { key: 'DEBUG', value: 'true' }
      ]

      mockPhaseSDK.get.mockResolvedValue(mockSecretsArray)

      const result = await client.getSecrets()

      expect(result).toEqual({
        success: true,
        secrets: {
          DATABASE_URL: 'postgresql://localhost:5432/test',
          API_KEY: 'secret-api-key-123',
          DEBUG: 'true'
        },
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })
    })

    it('should handle empty secrets response', async () => {
      mockPhaseSDK.get.mockResolvedValue({})

      const result = await client.getSecrets()

      expect(result).toEqual({
        success: true,
        secrets: {},
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })
    })

    it('should handle null secrets response', async () => {
      mockPhaseSDK.get.mockResolvedValue(null)

      const result = await client.getSecrets()

      expect(result).toEqual({
        success: true,
        secrets: {},
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })
    })

    it('should handle authentication error during secret fetch', async () => {
      mockPhaseSDK.get.mockRejectedValue(new Error('401 Unauthorized'))

      const result = await client.getSecrets()

      expect(result).toEqual({
        success: false,
        secrets: {},
        error: expect.stringContaining('authentication failed'),
        source: 'fallback',
        tokenSource: mockTokenSource
      })
    })

    it('should handle app not found error', async () => {
      mockPhaseSDK.get.mockRejectedValue(new Error('404 App not found'))

      const result = await client.getSecrets()

      expect(result).toEqual({
        success: false,
        secrets: {},
        error: expect.stringContaining('app "TestApp" or environment "development" not found'),
        source: 'fallback',
        tokenSource: mockTokenSource
      })
    })

    it('should handle network error', async () => {
      mockPhaseSDK.get.mockRejectedValue(new Error('Network error: ECONNREFUSED'))

      const result = await client.getSecrets()

      expect(result).toEqual({
        success: false,
        secrets: {},
        error: expect.stringContaining('Network error'),
        source: 'fallback',
        tokenSource: mockTokenSource
      })
    })

    it('should handle rate limit error', async () => {
      mockPhaseSDK.get.mockRejectedValue(new Error('429 Rate limit exceeded'))

      const result = await client.getSecrets()

      expect(result).toEqual({
        success: false,
        secrets: {},
        error: expect.stringContaining('rate limit exceeded'),
        source: 'fallback',
        tokenSource: mockTokenSource
      })
    })

    it('should fail when client not initialized', async () => {
      const uninitializedClient = new PhaseSDKClient()

      const result = await uninitializedClient.getSecrets()

      expect(result).toEqual({
        success: false,
        secrets: {},
        error: 'Phase.dev SDK client not initialized',
        source: 'fallback',
        tokenSource: undefined
      })
    })

    it('should filter out non-string values from object response', async () => {
      // Mock SDK response as array with mixed value types
      const mockSecretsArray = [
        { key: 'DATABASE_URL', value: 'postgresql://localhost:5432/test' },
        { key: 'API_KEY', value: 'secret-api-key-123' },
        { key: 'PORT', value: 3000 }, // number - should be filtered out
        { key: 'ENABLED', value: true }, // boolean - should be filtered out
        { key: 'CONFIG', value: { nested: 'object' } } // object - should be filtered out
      ]

      mockPhaseSDK.get.mockResolvedValue(mockSecretsArray)

      const result = await client.getSecrets()

      expect(result.secrets).toEqual({
        DATABASE_URL: 'postgresql://localhost:5432/test',
        API_KEY: 'secret-api-key-123'
      })
    })

    it('should handle malformed array response', async () => {
      const mockSecretsArray = [
        { key: 'DATABASE_URL', value: 'postgresql://localhost:5432/test' },
        { key: 'API_KEY' }, // missing value
        { value: 'orphaned-value' }, // missing key
        null, // null item
        'invalid-item' // string instead of object
      ]

      mockPhaseSDK.get.mockResolvedValue(mockSecretsArray)

      const result = await client.getSecrets()

      expect(result.secrets).toEqual({
        DATABASE_URL: 'postgresql://localhost:5432/test'
      })
    })
  })

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)
      mockPhaseSDK.get.mockResolvedValue({ TEST: 'value' })

      await client.initialize('TestApp', 'development')
      const result = await client.testConnection()

      expect(result).toBe(true)
    })

    it('should return false for failed connection', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)
      mockPhaseSDK.get.mockRejectedValue(new Error('Connection failed'))

      await client.initialize('TestApp', 'development')
      const result = await client.testConnection()

      expect(result).toBe(false)
    })

    it('should return false when client not initialized', async () => {
      const result = await client.testConnection()
      expect(result).toBe(false)
    })
  })

  describe('utility methods', () => {
    it('should return null token source when not initialized', () => {
      expect(client.getTokenSource()).toBeNull()
    })

    it('should return null config when not initialized', () => {
      expect(client.getConfig()).toBeNull()
    })

    it('should return false for isInitialized when not initialized', () => {
      expect(client.isInitialized()).toBe(false)
    })

    it('should clear cache (no-op for SDK)', () => {
      // This should not throw
      expect(() => client.clearCache()).not.toThrow()
    })

    it('should return diagnostic information', () => {
      const diagnostics = client.getDiagnostics()

      expect(diagnostics).toEqual({
        initialized: false,
        hasClient: false,
        hasConfig: false,
        tokenSource: undefined,
        config: undefined
      })
    })

    it('should return diagnostic information when initialized', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)

      await client.initialize('TestApp', 'development')
      const diagnostics = client.getDiagnostics()

      expect(diagnostics).toEqual({
        initialized: true,
        hasClient: true,
        hasConfig: true,
        tokenSource: mockTokenSource,
        config: {
          serviceToken: 'pss_service:v2:05daacdea651bb4c4e9eb559605d2570c93d9e7d9ccb69cb6b7738c8c6d4a8fb:7a5ef157249c3638f75706b902e772e87d10425d0c3e7d92a00bf9434761b97c:ea95e5e98e6d4f2ab5acf28054508e823d62779ee59261c8ea9b6940a0360d0a:f244cfb193bbd8a371b82b8d0fc3d3fb3028a245d08f805cbdb78a1ad26b880c',
          appName: 'TestApp',
          environment: 'development'
        }
      })
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)
      await client.initialize('TestApp', 'development')
    })

    it('should map 403 errors to AUTHENTICATION_FAILED', async () => {
      mockPhaseSDK.get.mockRejectedValue(new Error('403 Forbidden'))

      const result = await client.getSecrets()

      expect(result.error).toContain('access denied')
      expect(result.error).toContain('service token permissions')
    })

    it('should map invalid token errors to INVALID_TOKEN', async () => {
      mockPhaseSDK.get.mockRejectedValue(new Error('Invalid token provided'))

      const result = await client.getSecrets()

      expect(result.error).toContain('Invalid service token')
      expect(result.error).toContain('PHASE_SERVICE_TOKEN')
    })

    it('should map timeout errors to NETWORK_ERROR', async () => {
      mockPhaseSDK.get.mockRejectedValue(new Error('Request timeout'))

      const result = await client.getSecrets()

      expect(result.error).toContain('Network error')
      expect(result.error).toContain('service may be unavailable')
    })

    it('should handle unknown errors as SDK_ERROR', async () => {
      mockPhaseSDK.get.mockRejectedValue(new Error('Unknown SDK error'))

      const result = await client.getSecrets()

      expect(result.error).toContain('Phase.dev SDK error')
      expect(result.error).toContain('Unknown SDK error')
    })

    it('should handle non-Error objects', async () => {
      mockPhaseSDK.get.mockRejectedValue('String error')

      const result = await client.getSecrets()

      expect(result.error).toContain('Phase.dev SDK error')
      expect(result.error).toContain('String error')
    })

    it('should include token source in error details', async () => {
      mockPhaseSDK.get.mockRejectedValue(new Error('401 Unauthorized'))

      try {
        await client.getSecrets()
      } catch (error) {
        // This shouldn't throw, but if it does, check error structure
        expect(error).toHaveProperty('tokenSource', mockTokenSource)
      }

      // Check the result includes token source
      const result = await client.getSecrets()
      expect(result.tokenSource).toEqual(mockTokenSource)
    })
  })

  describe('token source variations', () => {
    it('should work with different token sources', async () => {
      const validToken = 'pss_service:v2:05daacdea651bb4c4e9eb559605d2570c93d9e7d9ccb69cb6b7738c8c6d4a8fb:7a5ef157249c3638f75706b902e772e87d10425d0c3e7d92a00bf9434761b97c:ea95e5e98e6d4f2ab5acf28054508e823d62779ee59261c8ea9b6940a0360d0a:f244cfb193bbd8a371b82b8d0fc3d3fb3028a245d08f805cbdb78a1ad26b880c'
      const tokenSources: TokenSource[] = [
        { source: 'process.env', token: validToken },
        { source: 'local.env.local', token: validToken, path: './.env.local' },
        { source: 'local.env', token: validToken, path: './.env' },
        { source: 'root.env.local', token: validToken, path: '/root/.env.local' },
        { source: 'root.env', token: validToken, path: '/root/.env' }
      ]

      for (const tokenSource of tokenSources) {
        const testClient = new PhaseSDKClient()
        vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(tokenSource)
        mockPhaseSDK.init.mockResolvedValue(undefined)

        const result = await testClient.initialize('TestApp', 'development')

        expect(result).toBe(true)
        expect(testClient.getTokenSource()).toEqual(tokenSource)
        expect(mockPhaseSDK.init).toHaveBeenCalledWith()
      }
    })
  })

  describe('edge cases', () => {
    it('should handle SDK returning undefined', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)
      mockPhaseSDK.get.mockResolvedValue(undefined)

      await client.initialize('TestApp', 'development')
      const result = await client.getSecrets()

      expect(result).toEqual({
        success: true,
        secrets: {},
        source: 'phase-sdk',
        tokenSource: mockTokenSource
      })
    })

    it('should handle very long app names and environments', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)

      const longAppName = 'A'.repeat(100)
      const longEnvironment = 'E'.repeat(100)

      const result = await client.initialize(longAppName, longEnvironment)

      expect(result).toBe(true)
      expect(client.getConfig()).toMatchObject({
        appName: longAppName,
        environment: longEnvironment
      })
    })

    it('should handle special characters in app names and environments', async () => {
      vi.mocked(PhaseTokenLoader.getValidatedToken).mockResolvedValue(mockTokenSource)
      mockPhaseSDK.init.mockResolvedValue(undefined)

      const specialAppName = 'Test-App_123.v2'
      const specialEnvironment = 'dev-test_env.1'

      const result = await client.initialize(specialAppName, specialEnvironment)

      expect(result).toBe(true)
      expect(client.getConfig()).toMatchObject({
        appName: specialAppName,
        environment: specialEnvironment
      })
    })
  })
})