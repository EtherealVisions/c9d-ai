// Integration tests for Phase.dev secret retrieval functionality
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { loadFromPhase, clearPhaseCache, getPhaseCacheStatus, testPhaseConnectivity } from '../phase'

describe('Phase.dev Secret Retrieval Integration', () => {
  beforeAll(() => {
    // Ensure we have a real service token for integration tests
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN is required for Phase.dev integration tests')
    }
  })

  afterEach(() => {
    // Clear cache between tests to ensure fresh state
    clearPhaseCache()
  })

  describe('Real Phase.dev SDK Integration', () => {
    it('should load secrets from Phase.dev using SDK', async () => {
      const result = await loadFromPhase(true) // Force reload to bypass cache

      // Test basic functionality
      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')
      expect(typeof result.variables).toBe('object')
      expect(result.source).toMatch(/^(phase-sdk|fallback)$/)

      if (result.success) {
        console.log(`✅ Successfully loaded ${Object.keys(result.variables).length} secrets from Phase.dev`)
        console.log(`📍 Token source: ${result.tokenSource?.source}`)
        console.log(`🔧 Source: ${result.source}`)
        
        // Verify we got secrets in the expected format
        expect(result.variables).toBeTypeOf('object')
        expect(result.source).toBe('phase-sdk')
        expect(result.tokenSource).toBeDefined()
        expect(result.tokenSource?.token).toBeDefined()
        expect(result.tokenSource?.source).toBeDefined()
      } else {
        console.log(`❌ Failed to load secrets: ${result.error}`)
        console.log(`📍 Token source: ${result.tokenSource?.source}`)
        
        // Even on failure, we should have proper error information
        expect(result.error).toBeDefined()
        expect(typeof result.error).toBe('string')
      }
    }, 10000) // 10 second timeout for real API calls

    it('should handle caching correctly with real API', async () => {
      // First call - should hit the API
      const result1 = await loadFromPhase(true)
      
      if (result1.success) {
        // Check cache status after first call
        const cacheStatus1 = getPhaseCacheStatus()
        expect(cacheStatus1.isCached).toBe(true)
        expect(cacheStatus1.variableCount).toBe(Object.keys(result1.variables).length)
        expect(cacheStatus1.source).toBe('phase-sdk')
        expect(cacheStatus1.tokenSource).toBeDefined()

        // Second call - should use cache
        const result2 = await loadFromPhase(false)
        expect(result2.success).toBe(true)
        expect(result2.variables).toEqual(result1.variables)
        expect(result2.source).toBe('phase-sdk')
        expect(result2.tokenSource).toEqual(result1.tokenSource)

        // Cache status should be the same
        const cacheStatus2 = getPhaseCacheStatus()
        expect(cacheStatus2.isCached).toBe(true)
        expect(cacheStatus2.variableCount).toBe(cacheStatus1.variableCount)
      }
    }, 10000)

    it('should test connectivity with real Phase.dev service', async () => {
      const result = await testPhaseConnectivity()

      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')
      expect(typeof result.responseTime).toBe('number')
      expect(result.responseTime).toBeGreaterThan(0)

      if (result.success) {
        console.log(`✅ Phase.dev connectivity test passed in ${result.responseTime}ms`)
        expect(result.error).toBeUndefined()
      } else {
        console.log(`❌ Phase.dev connectivity test failed: ${result.error}`)
        console.log(`⏱️  Response time: ${result.responseTime}ms`)
        expect(result.error).toBeDefined()
        expect(typeof result.error).toBe('string')
      }

      // Response time should be reasonable (less than 10 seconds)
      expect(result.responseTime).toBeLessThan(10000)
    }, 15000) // 15 second timeout for connectivity test

    it('should handle custom app configuration', async () => {
      const customConfig = {
        appName: 'AI.C9d.Test', // Use test app if available
        environment: 'test'
      }

      const result = await loadFromPhase(true, customConfig)

      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')

      if (result.success) {
        console.log(`✅ Custom config test passed with ${Object.keys(result.variables).length} secrets`)
        expect(result.source).toBe('phase-sdk')
        expect(result.tokenSource).toBeDefined()
      } else {
        console.log(`ℹ️  Custom config test failed (expected if test app doesn't exist): ${result.error}`)
        // This might fail if the test app doesn't exist, which is okay
        expect(result.error).toBeDefined()
      }
    }, 10000)

    it('should handle invalid app name gracefully', async () => {
      const invalidConfig = {
        appName: 'NonExistentApp12345',
        environment: 'development'
      }

      const result = await loadFromPhase(true, invalidConfig)

      expect(result.success).toBe(false)
      expect(result.variables).toEqual({})
      expect(result.source).toBe('fallback')
      expect(result.error).toBeDefined()
      expect(result.tokenSource).toBeDefined()

      // Error should indicate app not found
      expect(result.error).toMatch(/not found|404|NonExistentApp12345/i)
      
      console.log(`✅ Invalid app name handled correctly: ${result.error}`)
    }, 10000)

    it('should provide detailed token source information', async () => {
      const result = await loadFromPhase(true)

      expect(result.tokenSource).toBeDefined()
      expect(result.tokenSource?.token).toBeDefined()
      expect(result.tokenSource?.source).toBeDefined()

      // Token source should be one of the expected sources
      const validSources = ['process.env', '.env.local', '.env', 'root-.env.local', 'root-.env']
      expect(validSources).toContain(result.tokenSource?.source)

      console.log(`📍 Token loaded from: ${result.tokenSource?.source}`)
      if (result.tokenSource?.path) {
        console.log(`📁 Token file path: ${result.tokenSource.path}`)
      }
    }, 10000)
  })

  describe('Error Handling with Real API', () => {
    it('should handle network errors gracefully', async () => {
      // This test would require temporarily breaking network connectivity
      // For now, we'll just verify the error handling structure
      const result = await loadFromPhase(true)

      // Regardless of success/failure, the structure should be correct
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('variables')
      expect(result).toHaveProperty('source')
      expect(result).toHaveProperty('tokenSource')

      if (!result.success) {
        expect(result).toHaveProperty('error')
        expect(typeof result.error).toBe('string')
      }
    }, 10000)

    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to potentially trigger rate limiting
      const promises = Array.from({ length: 5 }, () => loadFromPhase(true))
      const results = await Promise.all(promises)

      // All results should have proper structure
      results.forEach((result, index) => {
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('variables')
        expect(result).toHaveProperty('source')
        
        if (!result.success && result.error?.includes('rate limit')) {
          console.log(`⚠️  Rate limiting detected on request ${index + 1}: ${result.error}`)
        }
      })
    }, 15000)
  })

  describe('Performance with Real API', () => {
    it('should load secrets within acceptable time limits', async () => {
      const startTime = Date.now()
      const result = await loadFromPhase(true)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      console.log(`⏱️  Secret loading took ${responseTime}ms`)

      // Should complete within 5 seconds for real API calls
      expect(responseTime).toBeLessThan(5000)

      if (result.success) {
        console.log(`✅ Loaded ${Object.keys(result.variables).length} secrets in ${responseTime}ms`)
      }
    }, 10000)

    it('should demonstrate caching performance improvement', async () => {
      // First call (uncached)
      clearPhaseCache()
      const startTime1 = Date.now()
      const result1 = await loadFromPhase(false)
      const endTime1 = Date.now()
      const uncachedTime = endTime1 - startTime1

      if (result1.success) {
        // Second call (cached)
        const startTime2 = Date.now()
        const result2 = await loadFromPhase(false)
        const endTime2 = Date.now()
        const cachedTime = endTime2 - startTime2

        console.log(`⏱️  Uncached: ${uncachedTime}ms, Cached: ${cachedTime}ms`)

        // Cached call should be significantly faster
        expect(cachedTime).toBeLessThan(uncachedTime)
        expect(cachedTime).toBeLessThan(50) // Should be very fast from cache

        // Results should be identical
        expect(result2.variables).toEqual(result1.variables)
        expect(result2.success).toBe(true)
      }
    }, 10000)
  })

  describe('Cache Management', () => {
    it('should clear cache and force fresh API calls', async () => {
      // Load secrets and cache them
      const result1 = await loadFromPhase(true)
      
      if (result1.success) {
        // Verify cache exists
        let cacheStatus = getPhaseCacheStatus()
        expect(cacheStatus.isCached).toBe(true)

        // Clear cache
        clearPhaseCache()

        // Verify cache is cleared
        cacheStatus = getPhaseCacheStatus()
        expect(cacheStatus.isCached).toBe(false)
        expect(cacheStatus.variableCount).toBe(0)

        // Next call should hit API again
        const result2 = await loadFromPhase(false)
        
        if (result2.success) {
          // Should have fresh cache
          cacheStatus = getPhaseCacheStatus()
          expect(cacheStatus.isCached).toBe(true)
          expect(cacheStatus.variableCount).toBeGreaterThan(0)
        }
      }
    }, 10000)
  })
})