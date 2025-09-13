import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import {
  getPhaseConfig,
  loadFromPhase,
  clearPhaseCache,
  getPhaseCacheStatus,
  testPhaseConnectivity,
  getPhaseServiceToken,
  isPhaseDevAvailable
} from '../phase'

// Mock fs functions
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn()
}))

// Mock env module
vi.mock('../env', () => ({
  getOptionalEnvVar: vi.fn()
}))

const mockReadFileSync = vi.mocked(readFileSync)
const mockExistsSync = vi.mocked(existsSync)

// Import mocked env functions
import { getOptionalEnvVar } from '../env'
const mockGetOptionalEnvVar = vi.mocked(getOptionalEnvVar)

describe('Phase.dev Integration', () => {
  const originalEnv = process.env

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
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    
    // Clear cache after each test
    clearPhaseCache()
  })

  describe('getPhaseServiceToken', () => {
    it('should return token from process.env when available', () => {
      process.env.PHASE_SERVICE_TOKEN = 'process-token-123'
      
      const result = getPhaseServiceToken()
      
      expect(result).toBe('process-token-123')
    })

    it('should fallback to getOptionalEnvVar when not in process.env', () => {
      mockGetOptionalEnvVar.mockReturnValue('fallback-token-456')
      
      const result = getPhaseServiceToken()
      
      expect(result).toBe('fallback-token-456')
      expect(mockGetOptionalEnvVar).toHaveBeenCalledWith('PHASE_SERVICE_TOKEN')
    })

    it('should return null when token is not available anywhere', () => {
      const result = getPhaseServiceToken()
      
      expect(result).toBeNull()
    })
  })

  describe('isPhaseDevAvailable', () => {
    it('should return true when service token is available', () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      const result = isPhaseDevAvailable()
      
      expect(result).toBe(true)
    })

    it('should return false when service token is not available', () => {
      const result = isPhaseDevAvailable()
      
      expect(result).toBe(false)
    })
  })

  describe('getPhaseConfig', () => {
    it('should return null when service token is not available', () => {
      const result = getPhaseConfig()
      
      expect(result).toBeNull()
    })

    it('should return config with default app name when token is available', () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      process.env.NODE_ENV = 'development'
      
      mockExistsSync.mockReturnValue(false) // No package.json
      
      const result = getPhaseConfig()
      
      expect(result).toEqual({
        serviceToken: 'token-123',
        appName: 'AI.C9d.Web',
        environment: 'development'
      })
    })

    it('should read app name from package.json phase config', () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: '@c9d/web',
        phase: {
          appName: 'CustomApp.Name'
        }
      }))
      
      const result = getPhaseConfig()
      
      expect(result?.appName).toBe('CustomApp.Name')
    })

    it('should read app name from package.json phasedev config', () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: '@c9d/web',
        phasedev: {
          appName: 'AlternativeApp.Name'
        }
      }))
      
      const result = getPhaseConfig()
      
      expect(result?.appName).toBe('AlternativeApp.Name')
    })

    it('should derive app name from package name when no phase config', () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: '@c9d/web-app'
      }))
      
      const result = getPhaseConfig()
      
      expect(result?.appName).toBe('C9d.Web.App')
    })

    it('should handle package.json read errors gracefully', () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error')
      })
      
      const result = getPhaseConfig()
      
      expect(result?.appName).toBe('AI.C9d.Web') // Should fallback to default
    })

    it('should handle invalid JSON gracefully', () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('invalid json')
      
      const result = getPhaseConfig()
      
      expect(result?.appName).toBe('AI.C9d.Web') // Should fallback to default
    })

    it('should use overrides when provided', () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      const result = getPhaseConfig({
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
      const result = await loadFromPhase()
      
      expect(result).toEqual({
        variables: {},
        success: false,
        error: 'Phase.dev service token not available',
        source: 'fallback'
      })
    })

    it('should return success result when Phase.dev API succeeds', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      const result = await loadFromPhase()
      
      expect(result.success).toBe(true)
      expect(result.source).toBe('phase.dev')
      expect(result.variables).toEqual({}) // Empty for mock implementation
    })

    it('should use cached result on subsequent calls', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      const result1 = await loadFromPhase()
      const result2 = await loadFromPhase()
      
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      // Both should be successful and use cache
    })

    it('should force reload when requested', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      // First call to populate cache
      await loadFromPhase()
      
      // Force reload
      const result = await loadFromPhase(true)
      
      expect(result.success).toBe(true)
    })
  })

  describe('cache management', () => {
    describe('clearPhaseCache', () => {
      it('should clear the cache', async () => {
        process.env.PHASE_SERVICE_TOKEN = 'token-123'
        
        // Populate cache
        await loadFromPhase()
        
        let status = getPhaseCacheStatus()
        expect(status.isCached).toBe(true)
        
        // Clear cache
        clearPhaseCache()
        
        status = getPhaseCacheStatus()
        expect(status.isCached).toBe(false)
      })
    })

    describe('getPhaseCacheStatus', () => {
      it('should return empty status when no cache', () => {
        const status = getPhaseCacheStatus()
        
        expect(status).toEqual({
          isCached: false,
          age: 0,
          variableCount: 0
        })
      })

      it('should return cache status when cached', async () => {
        process.env.PHASE_SERVICE_TOKEN = 'token-123'
        
        await loadFromPhase()
        
        const status = getPhaseCacheStatus()
        
        expect(status.isCached).toBe(true)
        expect(status.age).toBeGreaterThanOrEqual(0)
        expect(status.variableCount).toBe(0) // Mock returns empty variables
      })
    })
  })

  describe('testPhaseConnectivity', () => {
    it('should test connectivity and return response time', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'token-123'
      
      const result = await testPhaseConnectivity()
      
      expect(result.success).toBe(true)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.error).toBeUndefined()
    })

    it('should return error when service token is not available', async () => {
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
      it(`should convert "${input}" to "${expected}"`, () => {
        process.env.PHASE_SERVICE_TOKEN = 'token-123'
        
        mockExistsSync.mockReturnValue(true)
        mockReadFileSync.mockReturnValue(JSON.stringify({
          name: input
        }))
        
        const result = getPhaseConfig()
        
        expect(result?.appName).toBe(expected)
      })
    })
  })
})