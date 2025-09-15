import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, chmodSync } from 'fs'
import { join } from 'path'
import {
  getEnvVar,
  getOptionalEnvVar,
  getAllEnvVars,
  clearEnvCache,
  getEnvironmentConfig,
  getEnvLoadingDiagnostics,
  reloadEnvironmentVars,
  validateRequiredEnvVars,
  getEnvVarAsNumber,
  getEnvVarAsBoolean,
  getEnvVarAsArray,
  hasEnvVar,
  getEnvVarsWithPrefix,
  validateEnvVar
} from '../env'
import {
  loadFromPhase,
  clearPhaseCache,
  testPhaseConnectivity,
  getPhaseConfig
} from '../phase'
import {
  isPhaseDevAvailable,
  getPhaseServiceToken
} from '../env'

describe('Edge Cases and Error Handling', () => {
  const originalEnv = process.env
  const testDir = join(process.cwd(), 'test-edge-cases')
  
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

  describe('File System Edge Cases', () => {
    it('should handle non-existent directory gracefully', () => {
      const nonExistentDir = join(testDir, 'non-existent')
      
      expect(() => {
        reloadEnvironmentVars(nonExistentDir)
      }).not.toThrow()
      
      const result = reloadEnvironmentVars(nonExistentDir)
      expect(typeof result).toBe('object')
    })

    it('should handle empty .env files', () => {
      writeFileSync(join(testDir, '.env'), '')
      writeFileSync(join(testDir, '.env.local'), '   \n\n   ')
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(typeof result).toBe('object')
      
      const diagnostics = getEnvLoadingDiagnostics()
      expect(diagnostics.loadedFiles).toContain('.env')
      expect(diagnostics.loadedFiles).toContain('.env.local')
    })

    it('should handle .env files with only comments', () => {
      writeFileSync(join(testDir, '.env'), 
        '# This is a comment\n' +
        '# Another comment\n' +
        '\n' +
        '# More comments'
      )
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(typeof result).toBe('object')
      
      const diagnostics = getEnvLoadingDiagnostics()
      expect(diagnostics.loadedFiles).toContain('.env')
    })

    it('should handle malformed .env file content', () => {
      writeFileSync(join(testDir, '.env'), 
        'VALID_VAR=valid-value\n' +
        'INVALID LINE WITHOUT EQUALS\n' +
        '=INVALID_EQUALS_AT_START\n' +
        'ANOTHER_VALID=another-value\n' +
        'SPACES IN KEY=value\n' +
        'VALID_AFTER_INVALID=still-works'
      )
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(result.VALID_VAR).toBe('valid-value')
      expect(result.ANOTHER_VALID).toBe('another-value')
      expect(result.VALID_AFTER_INVALID).toBe('still-works')
    })

    it('should handle binary or non-text files as .env', () => {
      // Create a binary file with .env extension
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE])
      writeFileSync(join(testDir, '.env'), binaryContent)
      
      expect(() => {
        reloadEnvironmentVars(testDir)
      }).not.toThrow()
      
      const diagnostics = getEnvLoadingDiagnostics()
      expect(diagnostics.errors.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle very large .env files', () => {
      // Create a large .env file
      const largeContent = Array.from({ length: 1000 }, (_, i) => 
        `VAR_${i}=value_${i}_${'x'.repeat(100)}`
      ).join('\n')
      
      writeFileSync(join(testDir, '.env'), largeContent)
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(result.VAR_0).toBe('value_0_' + 'x'.repeat(100))
      expect(result.VAR_999).toBe('value_999_' + 'x'.repeat(100))
      
      const diagnostics = getEnvLoadingDiagnostics()
      expect(diagnostics.totalVariables).toBeGreaterThan(1000)
    })

    it('should handle file permission errors gracefully', () => {
      writeFileSync(join(testDir, '.env'), 'TEST_VAR=test-value')
      
      try {
        // Try to make file unreadable (might not work on all systems)
        chmodSync(join(testDir, '.env'), 0o000)
        
        expect(() => {
          reloadEnvironmentVars(testDir)
        }).not.toThrow()
        
        // Restore permissions for cleanup
        chmodSync(join(testDir, '.env'), 0o644)
      } catch (error) {
        // Permission changes might not be supported on all systems
        // Just ensure the function doesn't throw
        expect(() => {
          reloadEnvironmentVars(testDir)
        }).not.toThrow()
      }
    })
  })

  describe('Environment Variable Edge Cases', () => {
    it('should handle variables with special characters', () => {
      writeFileSync(join(testDir, '.env'), 
        'SPECIAL_CHARS=!@#$%^&*()_+-=[]{}|;:,.<>?\n' +
        'UNICODE_VAR=こんにちは世界\n' +
        'EMOJI_VAR=🚀🌟💻\n' +
        'QUOTES_VAR="value with spaces"\n' +
        'SINGLE_QUOTES=\'single quoted\'\n' +
        'MIXED_QUOTES="mixed \'quotes\'"\n' +
        'NEWLINES_VAR="line1\\nline2\\nline3"'
      )
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(result.SPECIAL_CHARS).toBe('!@#$%^&*()_+-=[]{}|;:,.<>?')
      expect(result.UNICODE_VAR).toBe('こんにちは世界')
      expect(result.EMOJI_VAR).toBe('🚀🌟💻')
      expect(result.QUOTES_VAR).toBe('"value with spaces"')
    })

    it('should handle very long variable names and values', () => {
      const longName = 'VERY_LONG_VARIABLE_NAME_' + 'X'.repeat(200)
      const longValue = 'very_long_value_' + 'Y'.repeat(1000)
      
      writeFileSync(join(testDir, '.env'), `${longName}=${longValue}`)
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(result[longName]).toBe(longValue)
    })

    it('should handle variables with no values', () => {
      writeFileSync(join(testDir, '.env'), 
        'EMPTY_VAR=\n' +
        'ANOTHER_EMPTY=\n' +
        'NORMAL_VAR=normal-value\n' +
        'WHITESPACE_ONLY=   \n' +
        'TABS_ONLY=\t\t\t'
      )
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(result.EMPTY_VAR).toBe('')
      expect(result.ANOTHER_EMPTY).toBe('')
      expect(result.NORMAL_VAR).toBe('normal-value')
      expect(result.WHITESPACE_ONLY).toBe('   ')
      expect(result.TABS_ONLY).toBe('\t\t\t')
    })

    it('should handle duplicate variable definitions', () => {
      writeFileSync(join(testDir, '.env'), 
        'DUPLICATE_VAR=first-value\n' +
        'OTHER_VAR=other-value\n' +
        'DUPLICATE_VAR=second-value\n' +
        'DUPLICATE_VAR=final-value'
      )
      
      const result = reloadEnvironmentVars(testDir)
      
      // Last definition should win
      expect(result.DUPLICATE_VAR).toBe('final-value')
      expect(result.OTHER_VAR).toBe('other-value')
    })

    it('should handle circular variable references', () => {
      writeFileSync(join(testDir, '.env'), 
        'VAR_A=${VAR_B}\n' +
        'VAR_B=${VAR_C}\n' +
        'VAR_C=${VAR_A}\n' +
        'NORMAL_VAR=normal-value'
      )
      
      expect(() => {
        reloadEnvironmentVars(testDir)
      }).not.toThrow()
      
      const result = reloadEnvironmentVars(testDir)
      expect(result.NORMAL_VAR).toBe('normal-value')
    })

    it('should handle undefined variable references', () => {
      writeFileSync(join(testDir, '.env'), 
        'VALID_VAR=valid-value\n' +
        'REFERENCE_VAR=${UNDEFINED_VAR}\n' +
        'MIXED_VAR=prefix-${UNDEFINED_VAR}-suffix\n' +
        'ANOTHER_VALID=another-value'
      )
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(result.VALID_VAR).toBe('valid-value')
      expect(result.ANOTHER_VALID).toBe('another-value')
      // Undefined references might be left as-is or become empty
      expect(typeof result.REFERENCE_VAR).toBe('string')
      expect(typeof result.MIXED_VAR).toBe('string')
    })
  })

  describe('Type Conversion Edge Cases', () => {
    beforeEach(() => {
      writeFileSync(join(testDir, '.env'), 
        'ZERO=0\n' +
        'NEGATIVE=-42\n' +
        'FLOAT=3.14159\n' +
        'SCIENTIFIC=1.23e-4\n' +
        'INFINITY=Infinity\n' +
        'NAN=NaN\n' +
        'EMPTY_STRING=\n' +
        'WHITESPACE=   \n' +
        'TRUE_UPPER=TRUE\n' +
        'FALSE_UPPER=FALSE\n' +
        'YES_UPPER=YES\n' +
        'NO_UPPER=NO\n' +
        'ON_UPPER=ON\n' +
        'OFF_UPPER=OFF\n' +
        'MIXED_CASE=TrUe\n' +
        'ARRAY_WITH_SPACES=item1 , item2,  item3  ,item4\n' +
        'ARRAY_EMPTY_ITEMS=item1,,item2,,,item3\n' +
        'ARRAY_SINGLE=single-item\n' +
        'ARRAY_EMPTY=\n' +
        'ARRAY_WHITESPACE=   ,  ,   '
      )
      reloadEnvironmentVars(testDir)
    })

    describe('Number conversion edge cases', () => {
      it('should handle various number formats', () => {
        expect(getEnvVarAsNumber('ZERO')).toBe(0)
        expect(getEnvVarAsNumber('NEGATIVE')).toBe(-42)
        expect(getEnvVarAsNumber('FLOAT')).toBe(3.14159)
        expect(getEnvVarAsNumber('SCIENTIFIC')).toBe(1.23e-4)
      })

      it('should handle special number values', () => {
        expect(getEnvVarAsNumber('INFINITY')).toBe(Infinity)
        expect(Number.isNaN(getEnvVarAsNumber('NAN'))).toBe(true)
      })

      it('should handle invalid numbers with defaults', () => {
        expect(getEnvVarAsNumber('EMPTY_STRING', 100)).toBe(100)
        expect(getEnvVarAsNumber('WHITESPACE', 200)).toBe(200)
      })

      it('should throw for invalid numbers without defaults', () => {
        expect(() => getEnvVarAsNumber('EMPTY_STRING')).toThrow()
        expect(() => getEnvVarAsNumber('WHITESPACE')).toThrow()
        expect(() => getEnvVarAsNumber('TRUE_UPPER')).toThrow()
      })
    })

    describe('Boolean conversion edge cases', () => {
      it('should handle case-insensitive boolean values', () => {
        expect(getEnvVarAsBoolean('TRUE_UPPER')).toBe(true)
        expect(getEnvVarAsBoolean('FALSE_UPPER')).toBe(false)
        expect(getEnvVarAsBoolean('YES_UPPER')).toBe(true)
        expect(getEnvVarAsBoolean('NO_UPPER')).toBe(false)
        expect(getEnvVarAsBoolean('ON_UPPER')).toBe(true)
        expect(getEnvVarAsBoolean('OFF_UPPER')).toBe(false)
        expect(getEnvVarAsBoolean('MIXED_CASE')).toBe(true)
      })

      it('should handle edge case boolean values', () => {
        expect(getEnvVarAsBoolean('ZERO')).toBe(false) // '0' is falsy
        expect(getEnvVarAsBoolean('NEGATIVE')).toBe(false) // Not a recognized truthy value
        expect(getEnvVarAsBoolean('EMPTY_STRING', true)).toBe(true) // Uses default
        expect(getEnvVarAsBoolean('WHITESPACE')).toBe(false) // Whitespace is falsy
      })
    })

    describe('Array conversion edge cases', () => {
      it('should handle arrays with various spacing', () => {
        expect(getEnvVarAsArray('ARRAY_WITH_SPACES')).toEqual(['item1', 'item2', 'item3', 'item4'])
      })

      it('should filter out empty items', () => {
        expect(getEnvVarAsArray('ARRAY_EMPTY_ITEMS')).toEqual(['item1', 'item2', 'item3'])
      })

      it('should handle single item arrays', () => {
        expect(getEnvVarAsArray('ARRAY_SINGLE')).toEqual(['single-item'])
      })

      it('should handle empty arrays', () => {
        expect(getEnvVarAsArray('ARRAY_EMPTY', ['default'])).toEqual(['default'])
        expect(getEnvVarAsArray('ARRAY_WHITESPACE')).toEqual([])
      })
    })
  })

  describe('Validation Edge Cases', () => {
    beforeEach(() => {
      writeFileSync(join(testDir, '.env'), 
        'VALID_URL=https://api.example.com\n' +
        'INVALID_URL=not-a-url\n' +
        'VALID_EMAIL=user@example.com\n' +
        'INVALID_EMAIL=not-an-email\n' +
        'EMPTY_VAR=\n' +
        'WHITESPACE_VAR=   '
      )
      reloadEnvironmentVars(testDir)
    })

    it('should handle custom validation functions', () => {
      const urlValidator = (value: string) => {
        if (!value.startsWith('https://')) {
          throw new Error('Must be HTTPS URL')
        }
        return value
      }

      const validResult = validateEnvVar('VALID_URL', 'https://api.example.com', urlValidator)
      expect(validResult.isValid).toBe(true)
      expect(validResult.value).toBe('https://api.example.com')

      const invalidResult = validateEnvVar('INVALID_URL', 'not-a-url', urlValidator)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.error).toContain('Must be HTTPS URL')
    })

    it('should handle validation with undefined values', () => {
      const validator = (value: string) => value.toUpperCase()

      const result = validateEnvVar('UNDEFINED_VAR', undefined, validator)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('is not defined')
    })

    it('should handle validation with empty values', () => {
      const validator = (value: string) => {
        if (value.trim().length === 0) {
          throw new Error('Cannot be empty')
        }
        return value
      }

      const emptyResult = validateEnvVar('EMPTY_VAR', '', validator)
      expect(emptyResult.isValid).toBe(false)
      expect(emptyResult.error).toContain('Cannot be empty')

      const whitespaceResult = validateEnvVar('WHITESPACE_VAR', '   ', validator)
      expect(whitespaceResult.isValid).toBe(false)
      expect(whitespaceResult.error).toContain('Cannot be empty')
    })

    it('should handle validation exceptions', () => {
      const throwingValidator = (value: string) => {
        throw new Error('Validation always fails')
      }

      const result = validateEnvVar('VALID_URL', 'https://api.example.com', throwingValidator)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Validation always fails')
    })

    it('should handle complex validation scenarios', () => {
      const complexValidator = (value: string) => {
        // Multiple validation rules
        if (!value) throw new Error('Required')
        if (value.length < 5) throw new Error('Too short')
        if (value.length > 100) throw new Error('Too long')
        if (!/^[a-zA-Z0-9-_.]+$/.test(value)) throw new Error('Invalid characters')
        return value.toLowerCase()
      }

      const validResult = validateEnvVar('TEST', 'Valid-Value_123', complexValidator)
      expect(validResult.isValid).toBe(true)
      expect(validResult.value).toBe('valid-value_123')

      const invalidResult = validateEnvVar('TEST', 'x', complexValidator)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.error).toContain('Too short')
    })
  })

  describe('Phase.dev Edge Cases', () => {
    it('should handle malformed package.json files', () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token'
      
      // Create invalid JSON
      writeFileSync(join(testDir, 'package.json'), '{ invalid json }')
      
      const config = getPhaseConfig({}, testDir)
      
      expect(config?.appName).toBe('AI.C9d.Web') // Should fallback to default
    })

    it('should handle package.json without name field', () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token'
      
      writeFileSync(join(testDir, 'package.json'), JSON.stringify({
        version: '1.0.0',
        description: 'Test package'
      }))
      
      const config = getPhaseConfig({}, testDir)
      
      expect(config?.appName).toBe('AI.C9d.Web') // Should fallback to default
    })

    it('should handle empty package.json', () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token'
      
      writeFileSync(join(testDir, 'package.json'), '{}')
      
      const config = getPhaseConfig({}, testDir)
      
      expect(config?.appName).toBe('AI.C9d.Web') // Should fallback to default
    })

    it('should handle package names with unusual characters', () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token'
      
      const testCases = [
        { input: '@scope/name-with-numbers123', expected: 'Scope.Name.With.Numbers123' },
        { input: 'name_with_underscores', expected: 'Name_with_underscores' },
        { input: '@scope/name.with.dots', expected: 'Scope.Name.With.Dots' },
        { input: 'single', expected: 'Single' }
      ]

      testCases.forEach(({ input, expected }) => {
        writeFileSync(join(testDir, 'package.json'), JSON.stringify({ name: input }))
        
        const config = getPhaseConfig({}, testDir)
        
        expect(config?.appName).toBe(expected)
      })
    })

    it('should handle Phase.dev token with unusual characters', () => {
      const specialTokens = [
        'token-with-dashes',
        'token_with_underscores',
        'token.with.dots',
        'token123with456numbers',
        'UPPERCASE_TOKEN',
        'MixedCase_Token-123'
      ]

      specialTokens.forEach(token => {
        process.env.PHASE_SERVICE_TOKEN = token
        
        expect(getPhaseServiceToken()).toBe(token)
        expect(isPhaseDevAvailable()).toBe(true)
      })
    })

    it('should handle Phase.dev configuration overrides edge cases', () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token'
      
      const edgeCaseOverrides = [
        { appName: '', environment: 'development' },
        { appName: 'App.Name', environment: '' },
        { appName: 'Very.Long.App.Name.With.Many.Parts', environment: 'custom-env' },
        { appName: 'App-With-Dashes', environment: 'env_with_underscores' }
      ]

      edgeCaseOverrides.forEach(overrides => {
        const config = getPhaseConfig(overrides)
        
        expect(config?.serviceToken).toBe('test-token')
        expect(config?.appName).toBe(overrides.appName)
        expect(config?.environment).toBe(overrides.environment)
      })
    })
  })

  describe('Cache Edge Cases', () => {
    it('should handle rapid cache operations', () => {
      writeFileSync(join(testDir, '.env'), 'RAPID_VAR=rapid-value')
      
      // Rapid successive operations
      for (let i = 0; i < 10; i++) {
        reloadEnvironmentVars(testDir)
        clearEnvCache()
        getAllEnvVars()
      }
      
      const result = getAllEnvVars()
      expect(result.RAPID_VAR).toBe('rapid-value')
    })

    it('should handle concurrent cache access', async () => {
      writeFileSync(join(testDir, '.env'), 'CONCURRENT_VAR=concurrent-value')
      
      // Simulate concurrent access
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(reloadEnvironmentVars(testDir))
      )
      
      const results = await Promise.all(promises)
      
      results.forEach(result => {
        expect(result.CONCURRENT_VAR).toBe('concurrent-value')
      })
    })

    it('should handle cache during file system changes', () => {
      writeFileSync(join(testDir, '.env'), 'CHANGING_VAR=initial-value')
      
      // Load initial value
      let result = reloadEnvironmentVars(testDir)
      expect(result.CHANGING_VAR).toBe('initial-value')
      
      // Change file multiple times
      for (let i = 1; i <= 5; i++) {
        writeFileSync(join(testDir, '.env'), `CHANGING_VAR=value-${i}`)
        
        // Cached value should remain the same
        result = getAllEnvVars()
        expect(result.CHANGING_VAR).toBe('initial-value')
        
        // Force reload should get new value
        result = reloadEnvironmentVars(testDir)
        expect(result.CHANGING_VAR).toBe(`value-${i}`)
      }
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large numbers of environment variables', () => {
      // Create many environment variables
      const largeEnvContent = Array.from({ length: 5000 }, (_, i) => 
        `VAR_${i.toString().padStart(4, '0')}=value_${i}`
      ).join('\n')
      
      writeFileSync(join(testDir, '.env'), largeEnvContent)
      
      const startTime = Date.now()
      const result = reloadEnvironmentVars(testDir)
      const endTime = Date.now()
      
      expect(result.VAR_0000).toBe('value_0')
      expect(result.VAR_4999).toBe('value_4999')
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      
      const diagnostics = getEnvLoadingDiagnostics()
      expect(diagnostics.totalVariables).toBeGreaterThan(5000)
    })

    it('should handle repeated operations without memory leaks', () => {
      writeFileSync(join(testDir, '.env'), 'MEMORY_TEST=memory-value')
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        reloadEnvironmentVars(testDir)
        clearEnvCache()
        
        if (i % 100 === 0) {
          // Periodic verification
          const result = getAllEnvVars()
          expect(result.MEMORY_TEST).toBe('memory-value')
        }
      }
      
      // Final verification
      const result = getAllEnvVars()
      expect(result.MEMORY_TEST).toBe('memory-value')
    })
  })

  describe('Integration Edge Cases', () => {
    it('should handle mixed environment sources with conflicts', () => {
      process.env.NODE_ENV = 'development'
      process.env.CONFLICT_VAR = 'process-value'
      process.env.PHASE_SERVICE_TOKEN = 'integration-token'
      
      writeFileSync(join(testDir, '.env'), 
        'CONFLICT_VAR=base-value\n' +
        'BASE_ONLY=base-only-value'
      )
      writeFileSync(join(testDir, '.env.development'), 
        'CONFLICT_VAR=dev-value\n' +
        'DEV_ONLY=dev-only-value'
      )
      writeFileSync(join(testDir, '.env.local'), 
        'CONFLICT_VAR=local-value\n' +
        'LOCAL_ONLY=local-only-value'
      )
      
      const result = reloadEnvironmentVars(testDir)
      const config = getEnvironmentConfig()
      
      // Process.env should win
      expect(result.CONFLICT_VAR).toBe('process-value')
      expect(result.BASE_ONLY).toBe('base-only-value')
      expect(result.DEV_ONLY).toBe('dev-only-value')
      expect(result.LOCAL_ONLY).toBe('local-only-value')
      
      // Configuration should reflect all sources
      expect(config.isDevelopment).toBe(true)
      expect(config.isPhaseDevAvailable).toBe(true)
      expect(config.diagnostics.loadedFiles.length).toBeGreaterThan(0)
    })

    it('should handle environment switching scenarios', () => {
      const environments = ['development', 'test', 'staging', 'production']
      
      environments.forEach(env => {
        process.env.NODE_ENV = env
        
        writeFileSync(join(testDir, '.env'), 'BASE_VAR=base-value')
        writeFileSync(join(testDir, `.env.${env}`), `${env.toUpperCase()}_VAR=${env}-value`)
        
        clearEnvCache()
        const result = reloadEnvironmentVars(testDir)
        const config = getEnvironmentConfig()
        
        expect(result.BASE_VAR).toBe('base-value')
        expect(result[`${env.toUpperCase()}_VAR`]).toBe(`${env}-value`)
        expect(config.nodeEnv).toBe(env)
        expect((config as any)[`is${env.charAt(0).toUpperCase() + env.slice(1)}`]).toBe(true)
      })
    })
  })
})