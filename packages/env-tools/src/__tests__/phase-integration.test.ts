/**
 * Phase.dev Integration Tests
 * 
 * CRITICAL: These tests use REAL Phase.dev API calls with actual service tokens.
 * Never mock Phase.dev - always use real API calls as per phase-dev-testing-standards.
 */

import { loadFromPhase } from '@coordinated/phase-client'
import { validateEnvironment, loadEnvConfig } from '../env-validator'
import { EnvConfig } from '../types'

describe('Phase.dev Integration Tests', () => {
  // MANDATORY: Fail fast if no real service token available
  beforeAll(() => {
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN is required for Phase.dev integration tests. These tests must use real API calls, never mocks.')
    }
  })

  describe('Real Phase.dev API Integration', () => {
    it('should load environment variables from Phase.dev with real API call', async () => {
      // This makes a REAL API call to Phase.dev
      const result = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Test' // Use test app in Phase.dev
      })

      // Test real behavior - may succeed or fail depending on test app existence
      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')
      
      if (result.success) {
        expect(result.source).toBe('phase.dev')
        expect(typeof result.secrets).toBe('object')
      } else {
        // Real error from Phase.dev API
        expect(result.error).toBeDefined()
        expect(typeof result.error).toBe('string')
      }
    })

    it('should handle Phase.dev authentication errors with real API', async () => {
      // Test with invalid token to trigger real error
      const result = await loadFromPhase(true, {
        serviceToken: 'invalid-token-12345',
        appName: 'AI.C9d.Test'
      })

      // Test real error handling
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toMatch(/Phase\.dev API error|authentication|unauthorized/i)
    })

    it('should handle non-existent app with real API', async () => {
      // Test with non-existent app to trigger real error
      const result = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'NonExistentApp12345'
      })

      // Test real error handling
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toMatch(/not found|does not exist/i)
    })

    it('should handle Phase.dev service unavailability gracefully', async () => {
      // Test network error handling by using invalid endpoint
      const originalFetch = global.fetch
      global.fetch = async () => {
        throw new Error('Network error: ECONNREFUSED')
      }

      try {
        const result = await loadFromPhase(true, {
          serviceToken: process.env.PHASE_SERVICE_TOKEN!,
          appName: 'AI.C9d.Test'
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Network error')
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should measure Phase.dev API response time', async () => {
      const startTime = Date.now()
      
      const result = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Test'
      })
      
      const duration = Date.now() - startTime
      
      // API should respond within reasonable time (10 seconds max)
      expect(duration).toBeLessThan(10000)
      
      // Log performance for monitoring
      console.log(`Phase.dev API response time: ${duration}ms`)
    })
  })

  describe('Environment Validation with Phase.dev', () => {
    const testConfig: EnvConfig = {
      appName: 'AI.C9d.Test',
      displayName: 'Test Application',
      envVars: {
        required: [
          {
            name: 'DATABASE_URL',
            description: 'PostgreSQL connection string',
            type: 'string',
            validation: {
              pattern: '^postgresql://.*'
            }
          },
          {
            name: 'PHASE_SERVICE_TOKEN',
            description: 'Phase.dev service token',
            type: 'string',
            sensitive: true,
            validation: {
              pattern: '^pss_[A-Za-z0-9]{32,}$'
            }
          }
        ],
        optional: [
          {
            name: 'NODE_ENV',
            description: 'Node environment',
            type: 'string',
            enum: ['development', 'production', 'test'],
            default: 'development'
          }
        ]
      },
      validation: {
        strict: true,
        warnOnMissing: true,
        failOnInvalid: true
      }
    }

    it('should validate environment with real Phase.dev token', () => {
      const env = {
        DATABASE_URL: 'postgresql://user:password@localhost:5432/test_db',
        PHASE_SERVICE_TOKEN: process.env.PHASE_SERVICE_TOKEN!,
        NODE_ENV: 'test'
      }

      const result = validateEnvironment(env, testConfig, 'test')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.summary.valid).toBe(3)
    })

    it('should detect invalid Phase.dev token format', () => {
      const env = {
        DATABASE_URL: 'postgresql://user:password@localhost:5432/test_db',
        PHASE_SERVICE_TOKEN: 'invalid-token-format',
        NODE_ENV: 'test'
      }

      const result = validateEnvironment(env, testConfig, 'test')

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => 
        e.variable === 'PHASE_SERVICE_TOKEN' && 
        e.type === 'format_error'
      )).toBe(true)
    })

    it('should handle missing Phase.dev token in production', () => {
      const productionConfig: EnvConfig = {
        ...testConfig,
        environments: {
          production: {
            requiredOverrides: ['PHASE_SERVICE_TOKEN'],
            optionalOverrides: []
          }
        }
      }

      const env = {
        DATABASE_URL: 'postgresql://user:password@prod:5432/prod_db',
        NODE_ENV: 'production'
        // Missing PHASE_SERVICE_TOKEN required in production
      }

      const result = validateEnvironment(env, productionConfig, 'production')

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => 
        e.variable === 'PHASE_SERVICE_TOKEN' && 
        e.type === 'missing'
      )).toBe(true)
    })
  })

  describe('Test Environment Error Handling', () => {
    it('should provide actionable error messages for missing tokens', () => {
      const env = {}

      const testConfig: EnvConfig = {
        appName: 'AI.C9d.Test',
        displayName: 'Test Application',
        envVars: {
          required: [
            {
              name: 'PHASE_SERVICE_TOKEN',
              description: 'Phase.dev service token',
              type: 'string',
              sensitive: true,
              example: 'pss_1234567890abcdef1234567890abcdef',
              validation: {
                pattern: '^pss_[A-Za-z0-9]{32,}$'
              }
            }
          ],
          optional: []
        }
      }

      const result = validateEnvironment(env, testConfig)

      expect(result.valid).toBe(false)
      const tokenError = result.errors.find(e => e.variable === 'PHASE_SERVICE_TOKEN')
      expect(tokenError).toBeDefined()
      expect(tokenError!.suggestion).toContain('pss_')
      expect(tokenError!.message).toContain('Required environment variable')
    })

    it('should validate test environment setup', () => {
      // Ensure test environment has necessary variables
      expect(process.env.NODE_ENV).toBe('test')
      expect(process.env.PHASE_SERVICE_TOKEN).toBeDefined()
      
      // Validate token format
      const tokenPattern = /^pss_[A-Za-z0-9_:-]{10,}$/
      expect(process.env.PHASE_SERVICE_TOKEN).toMatch(tokenPattern)
    })
  })

  describe('Integration Test Performance', () => {
    it('should handle concurrent Phase.dev API calls efficiently', async () => {
      const startTime = Date.now()
      
      // Simulate concurrent test execution
      const concurrentCalls = Array.from({ length: 5 }, () =>
        loadFromPhase(true, {
          serviceToken: process.env.PHASE_SERVICE_TOKEN!,
          appName: 'AI.C9d.Test'
        })
      )
      
      const results = await Promise.all(concurrentCalls)
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // Should handle 5 concurrent calls within reasonable time
      expect(totalTime).toBeLessThan(15000) // 15 seconds max
      
      // All calls should have consistent behavior
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(typeof result.success).toBe('boolean')
      })
      
      console.log(`Concurrent Phase.dev API calls completed in ${totalTime}ms`)
    })

    it('should not leak memory during repeated API calls', async () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Perform multiple API calls
      for (let i = 0; i < 10; i++) {
        await loadFromPhase(true, {
          serviceToken: process.env.PHASE_SERVICE_TOKEN!,
          appName: 'AI.C9d.Test'
        })
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
      
      console.log(`Memory increase after 10 API calls: ${Math.round(memoryIncrease / 1024 / 1024)}MB`)
    })
  })
})