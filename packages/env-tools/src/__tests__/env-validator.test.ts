/**
 * Tests for environment validation system
 */

import { 
  loadEnvConfig, 
  validateEnvironment, 
  validateAllEnvironments,
  EnvConfig,
  EnvValidationResult 
} from '../env-validator'
import * as fs from 'fs'
import * as path from 'path'

// Mock fs module
jest.mock('fs')
const mockFs = fs as jest.Mocked<typeof fs>

describe('Environment Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('loadEnvConfig', () => {
    it('should load valid configuration', () => {
      const config: EnvConfig = {
        appName: 'TestApp',
        displayName: 'Test Application',
        envVars: {
          required: [
            {
              name: 'DATABASE_URL',
              description: 'Database connection string',
              type: 'string',
              validation: {
                pattern: '^postgresql://.*'
              }
            }
          ],
          optional: [
            {
              name: 'DEBUG',
              description: 'Enable debug mode',
              type: 'boolean',
              default: false
            }
          ]
        }
      }

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify(config))

      const result = loadEnvConfig('/path/to/config.json')
      expect(result).toEqual(config)
    })

    it('should throw error for missing file', () => {
      mockFs.existsSync.mockReturnValue(false)

      expect(() => loadEnvConfig('/path/to/missing.json'))
        .toThrow('Environment configuration not found')
    })

    it('should throw error for invalid JSON', () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue('invalid json')

      expect(() => loadEnvConfig('/path/to/invalid.json'))
        .toThrow('Failed to parse environment configuration')
    })
  })

  describe('validateEnvironment', () => {
    const basicConfig: EnvConfig = {
      appName: 'TestApp',
      displayName: 'Test Application',
      envVars: {
        required: [
          {
            name: 'DATABASE_URL',
            description: 'Database connection string',
            type: 'string',
            validation: {
              pattern: '^postgresql://.*'
            }
          },
          {
            name: 'PORT',
            description: 'Server port',
            type: 'number',
            validation: {
              min: 1000,
              max: 65535
            }
          }
        ],
        optional: [
          {
            name: 'DEBUG',
            description: 'Enable debug mode',
            type: 'boolean',
            default: false
          },
          {
            name: 'NODE_ENV',
            description: 'Node environment',
            type: 'string',
            enum: ['development', 'production', 'test']
          }
        ]
      }
    }

    it('should validate all required variables present and valid', () => {
      const env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        PORT: '3000',
        DEBUG: 'true',
        NODE_ENV: 'development'
      }

      const result = validateEnvironment(env, basicConfig)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.summary.valid).toBe(4)
      expect(result.summary.missing).toBe(0)
      expect(result.summary.invalid).toBe(0)
    })

    it('should report missing required variables', () => {
      const env = {
        PORT: '3000'
      }

      const result = validateEnvironment(env, basicConfig)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].variable).toBe('DATABASE_URL')
      expect(result.errors[0].type).toBe('missing')
      expect(result.errors[0].message).toContain('Required environment variable')
    })

    it('should validate type constraints', () => {
      const env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        PORT: 'not-a-number'
      }

      const result = validateEnvironment(env, basicConfig)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].variable).toBe('PORT')
      expect(result.errors[0].type).toBe('type_mismatch')
      expect(result.errors[0].message).toContain('must be a number')
    })

    it('should validate pattern constraints', () => {
      const env = {
        DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
        PORT: '3000'
      }

      const result = validateEnvironment(env, basicConfig)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].variable).toBe('DATABASE_URL')
      expect(result.errors[0].type).toBe('format_error')
      expect(result.errors[0].message).toContain('does not match required pattern')
    })

    it('should validate enum constraints', () => {
      const env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        PORT: '3000',
        NODE_ENV: 'invalid-env'
      }

      const result = validateEnvironment(env, basicConfig)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].variable).toBe('NODE_ENV')
      expect(result.errors[0].type).toBe('invalid')
      expect(result.errors[0].message).toContain('must be one of')
    })

    it('should validate numeric range constraints', () => {
      const env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        PORT: '99999'
      }

      const result = validateEnvironment(env, basicConfig)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].variable).toBe('PORT')
      expect(result.errors[0].type).toBe('invalid')
      expect(result.errors[0].message).toContain('must be at most')
    })

    it('should handle environment-specific overrides', () => {
      const configWithOverrides: EnvConfig = {
        ...basicConfig,
        environments: {
          production: {
            requiredOverrides: ['DEBUG'],
            optionalOverrides: []
          }
        }
      }

      const env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        PORT: '3000'
        // DEBUG is missing but should be required in production
      }

      const result = validateEnvironment(env, configWithOverrides, 'production')

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.variable === 'DEBUG' && e.type === 'missing')).toBe(true)
    })

    it('should run custom validation rules', () => {
      const configWithCustomRules: EnvConfig = {
        ...basicConfig,
        customValidation: {
          rules: [
            {
              name: 'port_not_3000',
              validator: 'function(env) { return env.PORT !== "3000"; }',
              errorMessage: 'Port should not be 3000 in production'
            }
          ]
        }
      }

      const env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        PORT: '3000'
      }

      const result = validateEnvironment(env, configWithCustomRules)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === 'custom_rule')).toBe(true)
    })

    it('should handle strict validation mode', () => {
      const strictConfig: EnvConfig = {
        ...basicConfig,
        validation: {
          strict: true,
          warnOnMissing: true,
          failOnInvalid: true
        }
      }

      const env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        PORT: '3000'
        // Missing optional NODE_ENV should cause failure in strict mode
      }

      const result = validateEnvironment(env, strictConfig)

      expect(result.valid).toBe(false) // Should fail due to missing optional var in strict mode
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should provide helpful suggestions', () => {
      const env = {}

      const result = validateEnvironment(env, basicConfig)

      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.suggestions.some(s => s.includes('required variables'))).toBe(true)
    })
  })

  describe('Format validation', () => {
    const formatConfig: EnvConfig = {
      appName: 'TestApp',
      displayName: 'Test Application',
      envVars: {
        required: [
          {
            name: 'API_URL',
            description: 'API endpoint URL',
            type: 'string',
            format: 'url'
          },
          {
            name: 'ADMIN_EMAIL',
            description: 'Administrator email',
            type: 'string',
            format: 'email'
          },
          {
            name: 'JWT_TOKEN',
            description: 'JWT authentication token',
            type: 'string',
            format: 'jwt'
          }
        ],
        optional: []
      }
    }

    it('should validate URL format', () => {
      const env = {
        API_URL: 'not-a-url',
        ADMIN_EMAIL: 'admin@example.com',
        JWT_TOKEN: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ'
      }

      const result = validateEnvironment(env, formatConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.variable === 'API_URL' && e.type === 'format_error')).toBe(true)
    })

    it('should validate email format', () => {
      const env = {
        API_URL: 'https://api.example.com',
        ADMIN_EMAIL: 'not-an-email',
        JWT_TOKEN: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ'
      }

      const result = validateEnvironment(env, formatConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.variable === 'ADMIN_EMAIL' && e.type === 'format_error')).toBe(true)
    })

    it('should validate JWT format', () => {
      const env = {
        API_URL: 'https://api.example.com',
        ADMIN_EMAIL: 'admin@example.com',
        JWT_TOKEN: 'not-a-jwt'
      }

      const result = validateEnvironment(env, formatConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.variable === 'JWT_TOKEN' && e.type === 'format_error')).toBe(true)
    })
  })

  describe('validateAllEnvironments', () => {
    beforeEach(() => {
      // Mock directory structure
      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('apps')) {
          return [
            { name: 'web', isDirectory: () => true },
            { name: 'api', isDirectory: () => true }
          ] as any
        }
        if (dir.includes('web')) {
          return [{ name: 'env.config.json', isDirectory: () => false }] as any
        }
        if (dir.includes('api')) {
          return [{ name: 'env.config.json', isDirectory: () => false }] as any
        }
        return [] as any
      })

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const config: EnvConfig = {
          appName: 'TestApp',
          displayName: 'Test Application',
          envVars: {
            required: [
              {
                name: 'DATABASE_URL',
                description: 'Database connection string',
                type: 'string'
              }
            ],
            optional: []
          }
        }
        return JSON.stringify(config)
      })
    })

    it('should validate all environments in directory', () => {
      // Mock environment with valid values
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'

      const result = validateAllEnvironments('/mock/root')

      expect(result.results).toHaveLength(2)
      expect(result.summary.total).toBe(2)
      expect(result.valid).toBe(true)
    })

    it('should handle validation failures across apps', () => {
      // Mock environment without required variable
      delete process.env.DATABASE_URL

      const result = validateAllEnvironments('/mock/root')

      expect(result.results).toHaveLength(2)
      expect(result.valid).toBe(false)
      expect(result.summary.invalid).toBe(2)
      expect(result.summary.errors).toBeGreaterThan(0)
    })
  })
})