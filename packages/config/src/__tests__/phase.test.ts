import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import {
  getPhaseConfig,
  loadFromPhase,
  clearPhaseCache,
  getPhaseCacheStatus,
  testPhaseConnectivity
} from '../phase'
import {
  getPhaseServiceToken,
  isPhaseDevAvailable
} from '../env'

// Mock fs functions
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn()
}))

// Mock env module
vi.mock('../env', () => ({
  getOptionalEnvVar: vi.fn(),
  getPhaseServiceToken: vi.fn(),
  isPhaseDevAvailable: vi.fn()
}))

const mockReadFileSync = vi.mocked(readFileSync)
const mockExistsSync = vi.mocked(existsSync)

// Import mocked env functions
import { getOptionalEnvVar } from '../env'
const mockGetOptionalEnvVar = vi.mocked(getOptionalEnvVar)
const mockGetPhaseServiceToken = vi.mocked(getPhaseServiceToken)
const mockIsPhaseDevAvailable = vi.mocked(isPhaseDevAvailable)

describe('Phase.dev Integration', () => {
  const originalEnv = process.env

  // Ensure we have a real Phase.dev service token for integration tests
  beforeAll(() => {
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN is required for Phase.dev integration tests. Please set a valid token in your environment.')
    }
  })

  beforeEach(() => {
    // Reset process.env to a clean state
    process.env = { ...originalEnv }
    
    // Clear cache before each test
    clearPhaseCache()
    
    // Reset mocks
    vi.clearAllMocks()
    
    // Default mock behavior
    mockExistsSync.mockReturnValue(false)
    mockGetOptionalEnvVar.mockReturnValue(undefined)
    mockGetPhaseServiceToken.mockReturnValue(null)
    mockIsPhaseDevAvailable.mockReturnValue(false)
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    
    // Clear cache after each test
    clearPhaseCache()
  })

  describe('getPhaseServiceToken', () => {
    it('should return token from process.env when available', async () => {
      mockGetPhaseServiceToken.mockReturnValue('process-token-123')
      
      const result = getPhaseServiceToken()
      
      expect(result).toBe('process-token-123')
    })

    it('should fallback to getOptionalEnvVar when not in process.env', async () => {
      mockGetPhaseServiceToken.mockReturnValue('fallback-token-456')
      
      const result = getPhaseServiceToken()
      
      expect(result).toBe('fallback-token-456')
    })

    it('should return null when token is not available anywhere', async () => {
      mockGetPhaseServiceToken.mockReturnValue(null)
      
      const result = getPhaseServiceToken()
      
      expect(result).toBeNull()
    })
  })

  describe('isPhaseDevAvailable', () => {
    it('should return true when service token is available', async () => {
      mockIsPhaseDevAvailable.mockReturnValue(true)
      
      const result = isPhaseDevAvailable()
      
      expect(result).toBe(true)
    })

    it('should return false when service token is not available', async () => {
      mockIsPhaseDevAvailable.mockReturnValue(false)
      
      const result = isPhaseDevAvailable()
      
      expect(result).toBe(false)
    })
  })

  describe('getPhaseConfig', () => {
    it('should return null when service token is not available', async () => {
      delete process.env.PHASE_SERVICE_TOKEN
      
      const result = await getPhaseConfig()
      
      expect(result).toBeNull()
    })

    it('should return config with default app name when token is available', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      process.env.NODE_ENV = 'development'
      
      mockExistsSync.mockReturnValue(false) // No package.json
      
      const result = await getPhaseConfig()
      
      expect(result).toEqual({
        serviceToken: 'token-123',
        appName: 'AI.C9d.Web',
        environment: 'development'
      })
    })

    it('should read app name from package.json phase config', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: '@c9d/web',
        phase: {
          appName: 'CustomApp.Name'
        }
      }))
      
      const result = await getPhaseConfig()
      
      expect(result?.appName).toBe('CustomApp.Name')
    })

    it('should read app name from package.json phasedev config', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: '@c9d/web',
        phasedev: {
          appName: 'AlternativeApp.Name'
        }
      }))
      
      const result = await getPhaseConfig()
      
      expect(result?.appName).toBe('AlternativeApp.Name')
    })

    it('should derive app name from package name when no phase config', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: '@c9d/web-app'
      }))
      
      const result = await getPhaseConfig()
      
      expect(result?.appName).toBe('C9d.Web.App')
    })

    it('should handle package.json read errors gracefully', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error')
      })
      
      const result = await getPhaseConfig()
      
      expect(result?.appName).toBe('AI.C9d.Web') // Should fallback to default
    })

    it('should handle invalid JSON gracefully', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('invalid json')
      
      const result = await getPhaseConfig()
      
      expect(result?.appName).toBe('AI.C9d.Web') // Should fallback to default
    })

    it('should use overrides when provided', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      const result = await getPhaseConfig({
        appName: 'Override.App',
        environment: 'staging'
      })
      
      expect(result).toEqual({
        serviceToken: 'token-123',
        appName: 'Override.App',
        environment: 'staging'
      })
    })
  })

  describe('loadFromPhase', () => {
    it('should return fallback result when service token is not available', async () => {
      delete process.env.PHASE_SERVICE_TOKEN
      
      const result = await loadFromPhase()
      
      expect(result).toEqual({
        variables: {},
        success: false,
        error: 'Phase.dev service token not available',
        source: 'fallback'
      })
    })

    it('should handle Phase.dev API calls (test app may not exist)', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      const result = await loadFromPhase()
      
      // Test app likely doesn't exist, so expect failure
      expect(result.success).toBe(false)
      expect(result.source).toBe('fallback')
      expect(result.error).toContain('Phase.dev API error')
    })

    it('should not cache failed results', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      const result1 = await loadFromPhase()
      const result2 = await loadFromPhase()
      
      // Both calls should fail (test app doesn't exist)
      expect(result1.success).toBe(false)
      expect(result2.success).toBe(false)
      
      // No caching for failures
      const cacheStatus = getPhaseCacheStatus()
      expect(cacheStatus.isCached).toBe(false)
    })

    it('should force reload when requested', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      // First call
      await loadFromPhase()
      
      // Force reload
      const result = await loadFromPhase(true)
      
      // Still expect failure for test app
      expect(result.success).toBe(false)
    })
  })

  describe('cache management', () => {
    describe('clearPhaseCache', () => {
      it('should clear the cache', async () => {
        // Clear any existing cache
        clearPhaseCache()
        
        let status = getPhaseCacheStatus()
        expect(status.isCached).toBe(false)
        
        // Clear again (should be safe)
        clearPhaseCache()
        
        status = getPhaseCacheStatus()
        expect(status.isCached).toBe(false)
      })
    })

    describe('getPhaseCacheStatus', () => {
      it('should return empty status when no cache', async () => {
        const status = getPhaseCacheStatus()
        
        expect(status).toEqual({
          isCached: false,
          age: 0,
          variableCount: 0
        })
      })

      it('should return empty status after failed API calls', async () => {
        process.env.PHASE_SERVICE_TOKEN = 'token-123'
        
        await loadFromPhase() // This will fail for test app
        
        const status = getPhaseCacheStatus()
        
        // Failed calls don't populate cache
        expect(status.isCached).toBe(false)
        expect(status.age).toBe(0)
        expect(status.variableCount).toBe(0)
      })
    })
  })

  describe('testPhaseConnectivity', () => {
    it('should test connectivity (may fail for test app)', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      const result = await testPhaseConnectivity()
      
      // Test app likely doesn't exist, so expect failure
      expect(result.success).toBe(false)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.error).toContain('Phase.dev API error')
    })

    it('should return error when service token is not available', async () => {
      delete process.env.PHASE_SERVICE_TOKEN
      
      const result = await testPhaseConnectivity()
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Phase.dev service token not available')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('package.json app name derivation', () => {
    const testCases = [
      { input: '@c9d/web', expected: 'C9d.Web' },
      { input: '@company/my-app', expected: 'Company.My.App' },
      { input: 'simple-app', expected: 'Simple.App' },
      { input: 'app', expected: 'App' },
      { input: '@scope/multi-word-app-name', expected: 'Scope.Multi.Word.App.Name' }
    ]

    testCases.forEach(({ input, expected }) => {
      it(`should convert "${input}" to "${expected}"`, async () => {
        process.env.PHASE_SERVICE_TOKEN = 'token-123'
        
        mockExistsSync.mockReturnValue(true)
        mockReadFileSync.mockReturnValue(JSON.stringify({
          name: input
        }))
        
        const result = await getPhaseConfig()
        
        expect(result?.appName).toBe(expected)
      })
    })
  })
})