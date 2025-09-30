/**
 * Integration tests for environment validation system
 */

import { 
  validateEnvironment, 
  loadEnvConfig,
  EnvConfig 
} from '../env-validator'

describe('Environment Validation Integration', () => {
  describe('Real-world configuration scenarios', () => {
    const webAppConfig: EnvConfig = {
      appName: 'AI.C9d.Web',
      displayName: 'C9D Web Application',
      envVars: {
        required: [
          {
            name: 'DATABASE_URL',
            description: 'PostgreSQL connection string',
            type: 'string',
            validation: {
              pattern: '^postgresql://.*',
              minLength: 20
            }
          },
          {
            name: 'NEXT_PUBLIC_SUPABASE_URL',
            description: 'Supabase project URL',
            type: 'string',
            format: 'url',
            validation: {
              pattern: '^https://.*\\.supabase\\.co$'
            }
          },
          {
            name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
            description: 'Clerk publishable key',
            type: 'string',
            validation: {
              pattern: '^pk_(test|live)_[A-Za-z0-9]{32,}$'
            }
          },
          {
            name: 'CLERK_SECRET_KEY',
            description: 'Clerk secret key',
            type: 'string',
            sensitive: true,
            validation: {
              pattern: '^sk_(test|live)_[A-Za-z0-9]{32,}$'
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
          },
          {
            name: 'REDIS_URL',
            description: 'Redis connection URL',
            type: 'string',
            format: 'url',
            validation: {
              pattern: '^redis://.*'
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
        ]
      },
      validation: {
        strict: true,
        warnOnMissing: true,
        failOnInvalid: true
      },
      environments: {
        development: {
          requiredOverrides: [],
          optionalOverrides: ['REDIS_URL', 'PHASE_SERVICE_TOKEN']
        },
        production: {
          requiredOverrides: ['REDIS_URL', 'PHASE_SERVICE_TOKEN'],
          optionalOverrides: []
        }
      },
      customValidation: {
        rules: [
          {
            name: 'clerk_keys_match_environment',
            description: 'Clerk keys should match the same environment',
            validator: 'function(env) { const pubKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; const secretKey = env.CLERK_SECRET_KEY; if (pubKey && secretKey) { const pubEnv = pubKey.includes("_test_") ? "test" : "live"; const secretEnv = secretKey.includes("_test_") ? "test" : "live"; return pubEnv === secretEnv; } return true; }',
            errorMessage: 'Clerk publishable key and secret key must be from the same environment'
          }
        ]
      }
    }

    it('should validate complete development environment', () => {
      const env = {
        DATABASE_URL: 'postgresql://user:password@localhost:5432/c9d_dev',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abcdefghijklmnopqrstuvwxyz123456',
        CLERK_SECRET_KEY: 'sk_test_abcdefghijklmnopqrstuvwxyz123456',
        NODE_ENV: 'development'
      }

      const result = validateEnvironment(env, webAppConfig, 'development')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.summary.valid).toBe(5)
    })

    it('should validate production environment with additional requirements', () => {
      const env = {
        DATABASE_URL: 'postgresql://user:password@prod-host:5432/c9d_prod',
        NEXT_PUBLIC_SUPABASE_URL: 'https://prod-project.supabase.co',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_abcdefghijklmnopqrstuvwxyz123456',
        CLERK_SECRET_KEY: 'sk_live_abcdefghijklmnopqrstuvwxyz123456',
        NODE_ENV: 'production',
        REDIS_URL: 'redis://prod-redis:6379',
        PHASE_SERVICE_TOKEN: 'pss_abcdefghijklmnopqrstuvwxyz123456'
      }

      const result = validateEnvironment(env, webAppConfig, 'production')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.summary.valid).toBe(7)
    })

    it('should fail production validation without required overrides', () => {
      const env = {
        DATABASE_URL: 'postgresql://user:password@prod-host:5432/c9d_prod',
        NEXT_PUBLIC_SUPABASE_URL: 'https://prod-project.supabase.co',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_abcdefghijklmnopqrstuvwxyz123456',
        CLERK_SECRET_KEY: 'sk_live_abcdefghijklmnopqrstuvwxyz123456',
        NODE_ENV: 'production'
        // Missing REDIS_URL and PHASE_SERVICE_TOKEN required in production
      }

      const result = validateEnvironment(env, webAppConfig, 'production')

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
      expect(result.errors.some(e => e.variable === 'REDIS_URL')).toBe(true)
      expect(result.errors.some(e => e.variable === 'PHASE_SERVICE_TOKEN')).toBe(true)
    })

    it('should detect mismatched Clerk environment keys', () => {
      const env = {
        DATABASE_URL: 'postgresql://user:password@localhost:5432/c9d_dev',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abcdefghijklmnopqrstuvwxyz123456',
        CLERK_SECRET_KEY: 'sk_live_abcdefghijklmnopqrstuvwxyz123456', // Mismatched environment
        NODE_ENV: 'development'
      }

      const result = validateEnvironment(env, webAppConfig, 'development')

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === 'custom_rule')).toBe(true)
      expect(result.errors.some(e => e.message.includes('same environment'))).toBe(true)
    })

    it('should provide comprehensive error messages and suggestions', () => {
      const env = {
        DATABASE_URL: 'mysql://wrong-protocol',
        NEXT_PUBLIC_SUPABASE_URL: 'https://wrong-domain.com',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'invalid-key-format',
        CLERK_SECRET_KEY: 'also-invalid',
        NODE_ENV: 'invalid-environment'
      }

      const result = validateEnvironment(env, webAppConfig, 'development')

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(5)
      expect(result.suggestions.length).toBeGreaterThan(0)
      
      // Check that each error has a helpful suggestion
      result.errors.forEach(error => {
        if (error.suggestion) {
          expect(error.suggestion).toBeTruthy()
          expect(error.suggestion.length).toBeGreaterThan(0)
        }
      })
    })

    it('should handle complex validation scenarios', () => {
      const env = {
        DATABASE_URL: 'postgresql://u:p@h:5432/db', // Valid but minimal
        NEXT_PUBLIC_SUPABASE_URL: 'https://valid-project.supabase.co',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_' + 'a'.repeat(32),
        CLERK_SECRET_KEY: 'sk_test_' + 'b'.repeat(32),
        NODE_ENV: 'development',
        REDIS_URL: 'redis://localhost:6379',
        PHASE_SERVICE_TOKEN: 'pss_' + 'c'.repeat(32)
      }

      const result = validateEnvironment(env, webAppConfig, 'development')

      expect(result.valid).toBe(true)
      expect(result.summary.total).toBe(7)
      expect(result.summary.valid).toBe(7)
      expect(result.summary.missing).toBe(0)
      expect(result.summary.invalid).toBe(0)
    })
  })

  describe('Package configuration scenarios', () => {
    const packageConfig: EnvConfig = {
      appName: 'AI.C9d',
      displayName: 'C9D Shared Package',
      envVars: {
        required: [],
        optional: [
          {
            name: 'NODE_ENV',
            description: 'Node environment',
            type: 'string',
            enum: ['development', 'production', 'test'],
            default: 'development'
          },
          {
            name: 'DEBUG',
            description: 'Enable debug logging',
            type: 'boolean',
            default: false
          }
        ]
      },
      validation: {
        strict: false,
        warnOnMissing: false,
        failOnInvalid: false
      }
    }

    it('should validate package with minimal requirements', () => {
      const env = {
        NODE_ENV: 'development'
      }

      const result = validateEnvironment(env, packageConfig)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle empty environment gracefully', () => {
      const env = {}

      const result = validateEnvironment(env, packageConfig)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      // Should not warn about missing optional vars when warnOnMissing is false
      expect(result.warnings).toHaveLength(0)
    })

    it('should validate boolean type conversion', () => {
      const env = {
        DEBUG: 'true'
      }

      const result = validateEnvironment(env, packageConfig)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle invalid boolean values', () => {
      const env = {
        DEBUG: 'maybe'
      }

      const result = validateEnvironment(env, packageConfig)

      // Should be valid because failOnInvalid is false for packages
      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.variable === 'DEBUG')).toBe(true)
    })
  })

  describe('Error message quality', () => {
    const testConfig: EnvConfig = {
      appName: 'TestApp',
      displayName: 'Test Application',
      envVars: {
        required: [
          {
            name: 'API_KEY',
            description: 'API authentication key',
            type: 'string',
            example: 'ak_1234567890abcdef',
            validation: {
              pattern: '^ak_[a-f0-9]{16}$',
              minLength: 19,
              maxLength: 19
            }
          }
        ],
        optional: []
      }
    }

    it('should provide specific pattern suggestions', () => {
      const env = {
        API_KEY: 'wrong-format'
      }

      const result = validateEnvironment(env, testConfig)

      expect(result.valid).toBe(false)
      const error = result.errors.find(e => e.variable === 'API_KEY')
      expect(error).toBeDefined()
      expect(error!.suggestion).toContain('ak_1234567890abcdef')
    })

    it('should provide length-specific error messages', () => {
      const env = {
        API_KEY: 'ak_123' // Too short
      }

      const result = validateEnvironment(env, testConfig)

      expect(result.valid).toBe(false)
      const error = result.errors.find(e => e.variable === 'API_KEY')
      expect(error).toBeDefined()
      expect(error!.message).toContain('at least 19 characters')
    })
  })
})