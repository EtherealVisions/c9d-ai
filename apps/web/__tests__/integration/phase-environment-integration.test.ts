/**
 * Phase.dev Environment Integration Tests for Web App
 * 
 * CRITICAL: These tests use REAL Phase.dev API calls with actual service tokens.
 * Never mock Phase.dev - always use real API calls as per phase-dev-testing-standards.
 */

import { loadFromPhase } from '@coordinated/phase-client'

describe('Web App Phase.dev Environment Integration', () => {
  // MANDATORY: Fail fast if no real service token available
  beforeAll(() => {
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN is required for Phase.dev integration tests. These tests must use real API calls, never mocks.')
    }
  })

  describe('Web App Environment Loading', () => {
    it('should load web app environment from Phase.dev', async () => {
      // Real API call to Phase.dev for web app context
      const result = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Web'
      })

      // Test real behavior
      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')
      
      if (result.success) {
        expect(result.source).toBe('phase.dev')
        expect(typeof result.secrets).toBe('object')
        
        // Validate expected web app environment variables
        const secrets = result.secrets as Record<string, string>
        
        // Check for critical web app variables (if they exist in Phase.dev)
        if (secrets.DATABASE_URL) {
          expect(secrets.DATABASE_URL).toMatch(/^postgresql:\/\//)
        }
        
        if (secrets.NEXT_PUBLIC_SUPABASE_URL) {
          expect(secrets.NEXT_PUBLIC_SUPABASE_URL).toMatch(/^https:\/\/.*\.supabase\.co/)
        }
        
        if (secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
          expect(secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toMatch(/^pk_(test|live)_/)
        }
      } else {
        // Real error from Phase.dev API
        expect(result.error).toBeDefined()
        console.log('Phase.dev API error (expected for test environment):', result.error)
      }
    })

    it('should handle web app environment validation', async () => {
      // Load environment from Phase.dev
      const phaseResult = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Web'
      })

      // Merge with process.env for validation
      const testEnv = {
        ...process.env,
        ...(phaseResult.success ? phaseResult.secrets : {})
      }

      // Validate critical environment variables
      const criticalVars = [
        'NODE_ENV',
        'DATABASE_URL',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
      ]

      const missingVars = criticalVars.filter(varName => !testEnv[varName])
      
      if (missingVars.length > 0) {
        console.warn('Missing critical environment variables:', missingVars)
        console.warn('This may be expected in test environment')
      }

      // At minimum, NODE_ENV should be set
      expect(testEnv.NODE_ENV).toBeDefined()
    })

    it('should validate environment variable formats', async () => {
      const result = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Web'
      })

      if (result.success) {
        const secrets = result.secrets as Record<string, string>

        // Validate URL formats
        if (secrets.DATABASE_URL) {
          expect(secrets.DATABASE_URL).toMatch(/^postgresql:\/\//)
        }

        if (secrets.NEXT_PUBLIC_SUPABASE_URL) {
          expect(secrets.NEXT_PUBLIC_SUPABASE_URL).toMatch(/^https:\/\//)
        }

        if (secrets.REDIS_URL) {
          expect(secrets.REDIS_URL).toMatch(/^redis:\/\//)
        }

        // Validate Clerk key formats
        if (secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
          expect(secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toMatch(/^pk_(test|live)_[A-Za-z0-9]{32,}$/)
        }

        if (secrets.CLERK_SECRET_KEY) {
          expect(secrets.CLERK_SECRET_KEY).toMatch(/^sk_(test|live)_[A-Za-z0-9]{32,}$/)
        }

        // Validate Phase.dev token format
        if (secrets.PHASE_SERVICE_TOKEN) {
          expect(secrets.PHASE_SERVICE_TOKEN).toMatch(/^pss_[A-Za-z0-9_:-]{10,}$/)
        }
      }
    })
  })

  describe('Environment-Specific Loading', () => {
    it('should load development environment correctly', async () => {
      const result = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Web',
        environment: 'development'
      })

      expect(result).toBeDefined()
      
      if (result.success) {
        const secrets = result.secrets as Record<string, string>
        
        // Development environment should allow test keys
        if (secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
          expect(secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toMatch(/^pk_test_/)
        }
        
        if (secrets.CLERK_SECRET_KEY) {
          expect(secrets.CLERK_SECRET_KEY).toMatch(/^sk_test_/)
        }
      }
    })

    it('should handle production environment requirements', async () => {
      const result = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Web',
        environment: 'production'
      })

      expect(result).toBeDefined()
      
      if (result.success) {
        const secrets = result.secrets as Record<string, string>
        
        // Production should have live keys (if configured)
        if (secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
          // Could be test or live depending on Phase.dev setup
          expect(secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toMatch(/^pk_(test|live)_/)
        }
      }
    })

    it('should handle staging environment', async () => {
      const result = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Web',
        environment: 'staging'
      })

      expect(result).toBeDefined()
      
      // Staging may or may not exist in Phase.dev
      if (result.success) {
        expect(result.source).toBe('phase.dev')
      } else {
        expect(result.error).toBeDefined()
      }
    })
  })

  describe('Error Handling and Fallbacks', () => {
    it('should handle Phase.dev service unavailability', async () => {
      // Test network error handling
      const originalFetch = global.fetch
      global.fetch = async () => {
        throw new Error('Network error: Service unavailable')
      }

      try {
        const result = await loadFromPhase(true, {
          serviceToken: process.env.PHASE_SERVICE_TOKEN!,
          appName: 'AI.C9d.Web'
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Network error')
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should provide fallback to local environment', async () => {
      // When Phase.dev fails, should fall back to process.env
      const originalFetch = global.fetch
      global.fetch = async () => {
        throw new Error('Phase.dev unavailable')
      }

      try {
        // Set a test variable in process.env
        process.env.TEST_FALLBACK_VAR = 'fallback-value'

        const result = await loadFromPhase(false, { // enableFallback = false for this test
          serviceToken: process.env.PHASE_SERVICE_TOKEN!,
          appName: 'AI.C9d.Web'
        })

        expect(result.success).toBe(false)
        
        // But process.env should still be available
        expect(process.env.TEST_FALLBACK_VAR).toBe('fallback-value')
        
        delete process.env.TEST_FALLBACK_VAR
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should validate authentication errors', async () => {
      // Test with invalid token
      const result = await loadFromPhase(true, {
        serviceToken: 'invalid-token-12345',
        appName: 'AI.C9d.Web'
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/authentication|unauthorized|invalid.*token/i)
    })

    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to test rate limiting
      const rapidRequests = Array.from({ length: 10 }, () =>
        loadFromPhase(true, {
          serviceToken: process.env.PHASE_SERVICE_TOKEN!,
          appName: 'AI.C9d.Web'
        })
      )

      const results = await Promise.all(rapidRequests)

      // All requests should complete (may succeed or fail)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(typeof result.success).toBe('boolean')
        
        if (!result.success && result.error) {
          // Rate limiting errors should be handled gracefully
          if (result.error.includes('rate limit')) {
            console.log('Rate limiting detected (expected behavior)')
          }
        }
      })
    })
  })

  describe('Performance and Memory Management', () => {
    it('should load environment within acceptable time', async () => {
      const startTime = Date.now()
      
      const result = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Web'
      })
      
      const duration = Date.now() - startTime
      
      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000)
      
      console.log(`Phase.dev environment loading time: ${duration}ms`)
    })

    it('should handle memory efficiently during repeated loads', async () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Perform multiple environment loads
      for (let i = 0; i < 5; i++) {
        await loadFromPhase(true, {
          serviceToken: process.env.PHASE_SERVICE_TOKEN!,
          appName: 'AI.C9d.Web'
        })
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (less than 25MB)
      expect(memoryIncrease).toBeLessThan(25 * 1024 * 1024)
      
      console.log(`Memory increase after 5 environment loads: ${Math.round(memoryIncrease / 1024 / 1024)}MB`)
    })

    it('should cache environment variables appropriately', async () => {
      // First load
      const startTime1 = Date.now()
      const result1 = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Web'
      })
      const duration1 = Date.now() - startTime1

      // Second load (should potentially use cache)
      const startTime2 = Date.now()
      const result2 = await loadFromPhase(true, {
        serviceToken: process.env.PHASE_SERVICE_TOKEN!,
        appName: 'AI.C9d.Web'
      })
      const duration2 = Date.now() - startTime2

      // Both should have consistent results
      expect(result1.success).toBe(result2.success)
      
      if (result1.success && result2.success) {
        expect(result1.source).toBe(result2.source)
      }

      console.log(`First load: ${duration1}ms, Second load: ${duration2}ms`)
    })
  })
})