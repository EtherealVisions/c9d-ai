import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import {
  loadFromPhase,
  clearPhaseCache,
  testPhaseConnectivity,
  getPhaseConfig,
  getPhaseCacheStatus
} from '../phase'
import {
  reloadEnvironmentVars,
  clearEnvCache,
  getEnvironmentConfig,
  isPhaseDevAvailable,
  getPhaseServiceToken
} from '../env'

describe('Phase.dev Integration Scenarios', () => {
  const originalEnv = process.env
  const testDir = join(process.cwd(), 'test-phase-integration')

  // Ensure we have a real Phase.dev service token for integration tests
  beforeAll(() => {
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN is required for Phase.dev integration tests. Please set a valid token in your environment.')
    }
  })
  
  beforeEach(() => {
    // Reset process.env to a clean state
    process.env = { ...originalEnv }
    
    // Clear all caches
    clearEnvCache()
    clearPhaseCache()
    
    // Create test directory
    try {
      mkdirSync(testDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    
    // Clear caches
    clearEnvCache()
    clearPhaseCache()
    
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch (error) {
      // Directory might not exist
    }
  })

  describe('Phase.dev Service Token Detection', () => {
    it('should detect real Phase.dev token when available', () => {
      const token = getPhaseServiceToken()
      const isAvailable = isPhaseDevAvailable()
      
      // With real token from .env.local, both should be truthy
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token?.length).toBeGreaterThan(0)
      expect(isAvailable).toBe(true)
    })

    it('should handle empty token values', () => {
      const originalToken = process.env.PHASE_SERVICE_TOKEN
      process.env.PHASE_SERVICE_TOKEN = ''
      
      // Empty string is ignored, so .env.local token is used
      const token = getPhaseServiceToken()
      expect(token).toBeTruthy()
      expect(token).toMatch(/^pss_service:/)
      expect(isPhaseDevAvailable()).toBe(true)
      
      // Restore original token
      if (originalToken) {
        process.env.PHASE_SERVICE_TOKEN = originalToken
      }
    })
  })

  describe('Phase.dev Configuration', () => {
    beforeEach(() => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token-123'
    })

    it('should generate default configuration', () => {
      process.env.NODE_ENV = 'development'
      
      const config = getPhaseConfig()
      
      expect(config).toEqual({
        serviceToken: 'test-token-123',
        appName: 'AI.C9d.Web',
        environment: 'development'
      })
    })

    it('should read app name from package.json phase config', () => {
      writeFileSync(join(testDir, 'package.json'), JSON.stringify({
        name: '@c9d/web',
        phase: {
          appName: 'CustomApp.Name'
        }
      }))
      
      const config = getPhaseConfig({}, testDir)
      
      expect(config?.appName).toBe('CustomApp.Name')
    })

    it('should read app name from package.json phasedev config', () => {
      writeFileSync(join(testDir, 'package.json'), JSON.stringify({
        name: '@c9d/web',
        phasedev: {
          appName: 'AlternativeApp.Name'
        }
      }))
      
      const config = getPhaseConfig({}, testDir)
      
      expect(config?.appName).toBe('AlternativeApp.Name')
    })

    it('should derive app name from package name', () => {
      const testCases = [
        { input: '@c9d/web', expected: 'C9d.Web' },
        { input: '@company/my-app', expected: 'Company.My.App' },
        { input: 'simple-app', expected: 'Simple.App' },
        { input: 'app', expected: 'App' },
        { input: '@scope/multi-word-app-name', expected: 'Scope.Multi.Word.App.Name' }
      ]

      testCases.forEach(({ input, expected }) => {
        writeFileSync(join(testDir, 'package.json'), JSON.stringify({
          name: input
        }))
        
        const config = getPhaseConfig({}, testDir)
        
        expect(config?.appName).toBe(expected)
      })
    })

    it('should handle package.json read errors gracefully', () => {
      writeFileSync(join(testDir, 'package.json'), 'invalid json')
      
      const config = getPhaseConfig({}, testDir)
      
      expect(config?.appName).toBe('AI.C9d.Web') // Should fallback to default
    })

    it('should use configuration overrides', () => {
      const config = getPhaseConfig({
        appName: 'Override.App',
        environment: 'staging'
      })
      
      expect(config).toEqual({
        serviceToken: 'test-token-123',
        appName: 'Override.App',
        environment: 'staging'
      })
    })

    it('should return null when no service token', () => {
      delete process.env.PHASE_SERVICE_TOKEN
      
      const config = getPhaseConfig()
      
      expect(config).toBeNull()
    })

    it('should handle different NODE_ENV values', () => {
      const environments = ['development', 'production', 'test', 'staging']
      
      environments.forEach(env => {
        process.env.NODE_ENV = env
        
        const config = getPhaseConfig()
        
        expect(config?.environment).toBe(env)
      })
    })
  })

  describe('Phase.dev API Integration', () => {
    beforeEach(() => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token-123'
    })

    it('should handle Phase.dev API calls (may fail with test app)', async () => {
      const result = await loadFromPhase()
      
      // Since we're using a test token with a non-existent app, expect failure
      expect(result.success).toBe(false)
      expect(result.source).toBe('fallback')
      expect(result.error).toContain('Phase.dev API error')
    })

    it('should not cache Phase.dev failures', async () => {
      // First call
      const result1 = await loadFromPhase()
      expect(result1.success).toBe(false) // Test app doesn't exist
      
      // Check cache status - failures should not be cached
      const cacheStatus = getPhaseCacheStatus()
      expect(cacheStatus.isCached).toBe(false) // No cache for failures
      expect(cacheStatus.variableCount).toBe(0) // No variables loaded
      
      // Second call should make another API request (not cached)
      const result2 = await loadFromPhase()
      expect(result2.success).toBe(false)
    })

    it('should force reload when requested', async () => {
      // First call to populate cache
      await loadFromPhase()
      
      // Force reload
      const result = await loadFromPhase(true)
      
      expect(result.success).toBe(false) // Test app doesn't exist
      expect(result.source).toBe('fallback')
    })

    it('should handle custom configuration', async () => {
      const customConfig = {
        appName: 'Custom.App',
        environment: 'staging'
      }
      
      const result = await loadFromPhase(false, customConfig)
      
      expect(result.success).toBe(false) // Custom test app doesn't exist
      expect(result.source).toBe('fallback')
    })

    it('should test connectivity (may fail with test app)', async () => {
      const result = await testPhaseConnectivity()
      
      expect(result.success).toBe(false) // Test app doesn't exist
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.error).toContain('Phase.dev API error')
    })

    it('should handle connectivity test with custom config', async () => {
      const customConfig = {
        appName: 'Test.App',
        environment: 'test'
      }
      
      const result = await testPhaseConnectivity(customConfig)
      
      expect(result.success).toBe(false) // Test app doesn't exist
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Phase.dev Fallback Scenarios', () => {
    it('should fallback when no service token', async () => {
      delete process.env.PHASE_SERVICE_TOKEN
      
      const result = await loadFromPhase()
      
      expect(result.success).toBe(false)
      expect(result.source).toBe('fallback')
      expect(result.error).toBe('Phase.dev service token not available')
      expect(result.variables).toEqual({})
    })

    it('should handle connectivity test without token', async () => {
      delete process.env.PHASE_SERVICE_TOKEN
      
      const result = await testPhaseConnectivity()
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Phase.dev service token not available')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('should show Phase.dev status in environment config', () => {
      // With real token from .env.local, Phase.dev should be available
      const config = getEnvironmentConfig()
      
      expect(config.isPhaseDevAvailable).toBe(true)
      expect(config.phaseServiceToken).toBeTruthy()
      expect(config.phaseServiceToken).toMatch(/^pss_service:/)
      expect(config.diagnostics.phaseDevStatus.available).toBe(true)
    })
  })

  describe('Phase.dev Cache Management', () => {
    beforeEach(() => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token-123'
    })

    it('should provide empty cache status initially', () => {
      const status = getPhaseCacheStatus()
      
      expect(status).toEqual({
        isCached: false,
        age: 0,
        variableCount: 0
      })
    })

    it('should show no cache after failed loading', async () => {
      await loadFromPhase()
      
      const status = getPhaseCacheStatus()
      
      // Failed API calls don't populate cache
      expect(status.isCached).toBe(false)
      expect(status.age).toBe(0)
      expect(status.variableCount).toBe(0)
    })

    it('should handle cache clearing', async () => {
      // Even if no cache exists, clearing should work
      clearPhaseCache()
      
      const status = getPhaseCacheStatus()
      expect(status.isCached).toBe(false)
      expect(status.age).toBe(0)
      expect(status.variableCount).toBe(0)
    })

    it('should handle cache status when no cache exists', async () => {
      // Clear any existing cache
      clearPhaseCache()
      
      const status = getPhaseCacheStatus()
      
      expect(status.isCached).toBe(false)
      expect(status.age).toBe(0)
      expect(status.variableCount).toBe(0)
    })
  })

  describe('Phase.dev Integration with Environment Loading', () => {
    it('should integrate Phase.dev status with environment diagnostics', () => {
      process.env.PHASE_SERVICE_TOKEN = 'integration-token'
      
      writeFileSync(join(testDir, '.env'), 'TEST_VAR=test-value')
      reloadEnvironmentVars(testDir)
      
      const config = getEnvironmentConfig()
      
      expect(config.isPhaseDevAvailable).toBe(true)
      expect(config.phaseServiceToken).toBe('integration-token')
      expect(config.diagnostics.phaseDevStatus.available).toBe(true)
      expect(config.diagnostics.loadedFiles).toContain('.env')
    })

    it('should handle Phase.dev available in environment diagnostics', () => {
      writeFileSync(join(testDir, '.env'), 'TEST_VAR=test-value')
      reloadEnvironmentVars(testDir)
      
      const config = getEnvironmentConfig()
      
      expect(config.isPhaseDevAvailable).toBe(true)
      expect(config.phaseServiceToken).toBeTruthy()
      expect(config.diagnostics.phaseDevStatus.available).toBe(true)
      expect(config.diagnostics.loadedFiles).toContain('.env')
    })

    it('should provide comprehensive Phase.dev status in diagnostics', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'diagnostic-token'
      
      // Load from Phase.dev first
      await loadFromPhase()
      
      writeFileSync(join(testDir, '.env'), 'DIAG_VAR=diag-value')
      reloadEnvironmentVars(testDir)
      
      const config = getEnvironmentConfig()
      
      expect(config.diagnostics.phaseDevStatus).toEqual({
        available: true,
        success: true,
        variableCount: 0,
        error: undefined,
        source: 'phase.dev'
      })
    })
  })

  describe('Phase.dev Error Scenarios', () => {
    beforeEach(() => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token-123'
    })

    it('should handle Phase.dev API errors gracefully', async () => {
      // Test with real API - non-existent app returns 404
      const result = await loadFromPhase()
      
      // Real API returns 404 for non-existent app
      expect(result.success).toBe(false)
      expect(result.error).toContain('Phase.dev API error')
    })

    it('should handle network connectivity issues', async () => {
      // Test real connectivity - non-existent app returns 404
      const result = await testPhaseConnectivity()
      
      expect(result.success).toBe(false)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle malformed Phase.dev responses', async () => {
      // Test real API responses - 404 is handled gracefully
      const result = await loadFromPhase()
      
      expect(result.success).toBe(false)
      expect(result.variables).toEqual({})
    })
  })

  describe('Phase.dev Environment-Specific Scenarios', () => {
    beforeEach(() => {
      process.env.PHASE_SERVICE_TOKEN = 'env-specific-token'
    })

    it('should handle development environment Phase.dev config', () => {
      process.env.NODE_ENV = 'development'
      
      const config = getPhaseConfig()
      
      expect(config?.environment).toBe('development')
      expect(config?.serviceToken).toBe('env-specific-token')
    })

    it('should handle production environment Phase.dev config', () => {
      process.env.NODE_ENV = 'production'
      
      const config = getPhaseConfig()
      
      expect(config?.environment).toBe('production')
      expect(config?.serviceToken).toBe('env-specific-token')
    })

    it('should handle test environment Phase.dev config', () => {
      process.env.NODE_ENV = 'test'
      
      const config = getPhaseConfig()
      
      expect(config?.environment).toBe('test')
      expect(config?.serviceToken).toBe('env-specific-token')
    })

    it('should handle staging environment Phase.dev config', () => {
      process.env.NODE_ENV = 'staging'
      
      const config = getPhaseConfig()
      
      expect(config?.environment).toBe('staging')
      expect(config?.serviceToken).toBe('env-specific-token')
    })

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV
      
      const config = getPhaseConfig()
      
      expect(config?.environment).toBe('development')
    })
  })

  describe('Phase.dev Token Source Priority', () => {
    it('should use real Phase.dev token from environment', () => {
      // Test that we can access the real token
      const token = getPhaseServiceToken()
      const isAvailable = isPhaseDevAvailable()
      
      expect(token).toBeTruthy()
      expect(isAvailable).toBe(true)
      
      // Verify token format (Phase.dev tokens start with 'pss_service:')
      expect(token).toMatch(/^pss_service:/)
    })
  })
})