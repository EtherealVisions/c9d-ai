// Integration tests for PhaseSDKClient with real Phase.dev SDK
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { PhaseSDKClient, PhaseSDKErrorCode } from '../phase-sdk-client'

describe('PhaseSDKClient Integration Tests', () => {
  let client: PhaseSDKClient

  beforeAll(() => {
    // Ensure we have a real service token for integration tests
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN is required for Phase.dev integration tests')
    }
  })

  beforeEach(() => {
    client = new PhaseSDKClient()
  })

  describe('Real Phase.dev SDK Integration', () => {
    it('should initialize with real Phase.dev service token', async () => {
      const result = await client.initialize('AI.C9d.Web', 'development')

      expect(result).toBe(true)
      expect(client.isInitialized()).toBe(true)
      
      const tokenSource = client.getTokenSource()
      expect(tokenSource).toBeTruthy()
      expect(tokenSource?.token).toBeTruthy()
      
      const config = client.getConfig()
      expect(config).toEqual({
        serviceToken: tokenSource?.token,
        appName: 'AI.C9d.Web',
        environment: 'development'
      })
    })

    it('should fetch secrets from real Phase.dev service', async () => {
      await client.initialize('AI.C9d.Web', 'development')
      
      const result = await client.getSecrets()

      expect(result.success).toBe(true)
      expect(result.source).toBe('phase-sdk')
      expect(result.secrets).toBeDefined()
      expect(typeof result.secrets).toBe('object')
      expect(result.tokenSource).toBeTruthy()
      
      // Log the number of secrets for debugging (without exposing values)
      console.log(`[Integration Test] Fetched ${Object.keys(result.secrets).length} secrets from Phase.dev`)
    })

    it('should test connection successfully', async () => {
      await client.initialize('AI.C9d.Web', 'development')
      
      const connectionResult = await client.testConnection()

      expect(connectionResult).toBe(true)
    })

    it('should handle invalid app name gracefully', async () => {
      const result = await client.initialize('NonExistentApp12345', 'development')
      
      // Initialization should succeed (token is valid)
      expect(result).toBe(true)
      
      // But fetching secrets should fail
      const secretsResult = await client.getSecrets()
      
      expect(secretsResult.success).toBe(false)
      expect(secretsResult.source).toBe('fallback')
      expect(secretsResult.error).toBeTruthy()
      expect(secretsResult.error).toContain('not found')
    })

    it('should handle invalid environment gracefully', async () => {
      const result = await client.initialize('AI.C9d.Web', 'nonexistent-env')
      
      // Initialization should succeed (token is valid)
      expect(result).toBe(true)
      
      // But fetching secrets might fail depending on Phase.dev setup
      const secretsResult = await client.getSecrets()
      
      // This might succeed or fail depending on Phase.dev configuration
      // We just ensure it doesn't throw and returns proper structure
      expect(secretsResult).toHaveProperty('success')
      expect(secretsResult).toHaveProperty('source')
      expect(secretsResult).toHaveProperty('secrets')
    })

    it('should fail initialization with invalid service token', async () => {
      // Temporarily override the token loading to return invalid token
      const originalEnv = process.env.PHASE_SERVICE_TOKEN
      process.env.PHASE_SERVICE_TOKEN = 'invalid-token-12345'

      try {
        await expect(client.initialize('AI.C9d.Web', 'development')).rejects.toMatchObject({
          code: PhaseSDKErrorCode.INVALID_TOKEN,
          message: expect.stringContaining('Invalid service token'),
          isRetryable: false
        })

        expect(client.isInitialized()).toBe(false)
      } finally {
        // Restore original token
        process.env.PHASE_SERVICE_TOKEN = originalEnv
      }
    })

    it('should track token source correctly', async () => {
      await client.initialize('AI.C9d.Web', 'development')
      
      const tokenSource = client.getTokenSource()
      expect(tokenSource).toBeTruthy()
      expect(tokenSource?.source).toMatch(/^(process\.env|local\.env\.local|local\.env|root\.env\.local|root\.env)$/)
      expect(tokenSource?.token).toBeTruthy()
      
      // If token comes from file, should have path
      if (tokenSource?.source !== 'process.env') {
        expect(tokenSource?.path).toBeTruthy()
      }
    })

    it('should provide useful diagnostics', async () => {
      const initialDiagnostics = client.getDiagnostics()
      expect(initialDiagnostics.initialized).toBe(false)
      expect(initialDiagnostics.hasClient).toBe(false)
      expect(initialDiagnostics.hasConfig).toBe(false)

      await client.initialize('AI.C9d.Web', 'development')

      const postInitDiagnostics = client.getDiagnostics()
      expect(postInitDiagnostics.initialized).toBe(true)
      expect(postInitDiagnostics.hasClient).toBe(true)
      expect(postInitDiagnostics.hasConfig).toBe(true)
      expect(postInitDiagnostics.tokenSource).toBeTruthy()
      expect(postInitDiagnostics.config).toEqual({
        serviceToken: expect.any(String),
        appName: 'AI.C9d.Web',
        environment: 'development'
      })
    })

    it('should handle different environments', async () => {
      const environments = ['development', 'staging', 'production']
      
      for (const env of environments) {
        const testClient = new PhaseSDKClient()
        
        const initResult = await testClient.initialize('AI.C9d.Web', env)
        expect(initResult).toBe(true)
        
        const config = testClient.getConfig()
        expect(config?.environment).toBe(env)
        
        // Test connection for each environment
        const connectionResult = await testClient.testConnection()
        // Connection might succeed or fail depending on Phase.dev setup
        expect(typeof connectionResult).toBe('boolean')
      }
    })

    it('should handle workspace root path correctly', async () => {
      // Test with explicit root path
      const result = await client.initialize('AI.C9d.Web', 'development', process.cwd())
      
      expect(result).toBe(true)
      expect(client.isInitialized()).toBe(true)
      
      const tokenSource = client.getTokenSource()
      expect(tokenSource).toBeTruthy()
    })

    it('should maintain state correctly across multiple operations', async () => {
      // Initialize
      await client.initialize('AI.C9d.Web', 'development')
      expect(client.isInitialized()).toBe(true)
      
      // Test connection
      const connectionResult1 = await client.testConnection()
      expect(typeof connectionResult1).toBe('boolean')
      
      // Fetch secrets
      const secretsResult = await client.getSecrets()
      expect(secretsResult).toHaveProperty('success')
      
      // Test connection again
      const connectionResult2 = await client.testConnection()
      expect(typeof connectionResult2).toBe('boolean')
      
      // State should remain consistent
      expect(client.isInitialized()).toBe(true)
      expect(client.getTokenSource()).toBeTruthy()
      expect(client.getConfig()).toBeTruthy()
    })

    it('should handle cache operations', () => {
      // Cache operations should not throw
      expect(() => client.clearCache()).not.toThrow()
    })
  })

  describe('Error Scenarios with Real SDK', () => {
    it('should handle network timeouts gracefully', async () => {
      // This test depends on network conditions and Phase.dev service availability
      // We just ensure the client handles any network issues gracefully
      
      await client.initialize('AI.C9d.Web', 'development')
      
      // Multiple rapid requests to potentially trigger rate limiting or timeouts
      const promises = Array.from({ length: 5 }, () => client.getSecrets())
      const results = await Promise.all(promises)
      
      // All results should have proper structure
      results.forEach(result => {
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('source')
        expect(result).toHaveProperty('secrets')
        expect(result).toHaveProperty('tokenSource')
      })
    })

    it('should provide meaningful error messages', async () => {
      // Test with definitely invalid app name
      await client.initialize('InvalidApp999999', 'development')
      
      const result = await client.getSecrets()
      
      if (!result.success) {
        expect(result.error).toBeTruthy()
        expect(result.error).toContain('InvalidApp999999')
        expect(result.tokenSource).toBeTruthy()
      }
    })
  })

  describe('Performance Tests', () => {
    it('should initialize within reasonable time', async () => {
      const startTime = Date.now()
      
      await client.initialize('AI.C9d.Web', 'development')
      
      const initTime = Date.now() - startTime
      expect(initTime).toBeLessThan(5000) // Should initialize within 5 seconds
    })

    it('should fetch secrets within reasonable time', async () => {
      await client.initialize('AI.C9d.Web', 'development')
      
      const startTime = Date.now()
      const result = await client.getSecrets()
      const fetchTime = Date.now() - startTime
      
      expect(fetchTime).toBeLessThan(10000) // Should fetch within 10 seconds
      
      if (result.success) {
        console.log(`[Performance Test] Fetched secrets in ${fetchTime}ms`)
      }
    })

    it('should handle concurrent secret fetches', async () => {
      await client.initialize('AI.C9d.Web', 'development')
      
      const startTime = Date.now()
      
      // Make 3 concurrent requests
      const promises = Array.from({ length: 3 }, () => client.getSecrets())
      const results = await Promise.all(promises)
      
      const totalTime = Date.now() - startTime
      expect(totalTime).toBeLessThan(15000) // Should complete within 15 seconds
      
      // All requests should have consistent results
      const successCount = results.filter(r => r.success).length
      console.log(`[Performance Test] ${successCount}/3 concurrent requests succeeded in ${totalTime}ms`)
      
      // Results should be consistent (all success or all failure for same app/env)
      const firstResult = results[0]
      results.forEach(result => {
        expect(result.success).toBe(firstResult.success)
        if (result.success && firstResult.success) {
          expect(Object.keys(result.secrets)).toEqual(Object.keys(firstResult.secrets))
        }
      })
    })
  })
})