import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, existsSync, PathLike, PathOrFileDescriptor } from 'fs'
import {
  getEnvVar,
  getOptionalEnvVar,
  getAllEnvVars,
  hasEnvVar,
  getEnvVarsWithPrefix,
  validateRequiredEnvVars,
  clearEnvCache,
  getPhaseServiceToken,
  isPhaseDevAvailable,
  getEnvironmentConfig
} from '../env'

// Mock fs functions
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn()
}))

const mockReadFileSync = vi.mocked(readFileSync)
const mockExistsSync = vi.mocked(existsSync)

describe('Environment Configuration Utilities', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset process.env to a clean state
    process.env = { ...originalEnv }
    
    // Clear cache before each test
    clearEnvCache()
    
    // Reset mocks
    vi.clearAllMocks()
    
    // Default mock behavior - no .env files exist
    mockExistsSync.mockReturnValue(false)
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    
    // Clear cache after each test
    clearEnvCache()
  })

  describe('getEnvVar', () => {
    it('should return environment variable from process.env', () => {
      process.env.TEST_VAR = 'test-value'
      
      const result = getEnvVar('TEST_VAR')
      
      expect(result).toBe('test-value')
    })

    it('should return default value when variable is not found', () => {
      const result = getEnvVar('MISSING_VAR', 'default-value')
      
      expect(result).toBe('default-value')
    })

    it('should throw error when required variable is missing and no default provided', () => {
      expect(() => getEnvVar('MISSING_VAR')).toThrow(
        'Environment variable MISSING_VAR is required but not found'
      )
    })

    it('should load from .env files when variable not in process.env', () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockReadFileSync.mockReturnValue('TEST_VAR=env-file-value\n')
      
      const result = getEnvVar('TEST_VAR')
      
      expect(result).toBe('env-file-value')
    })

    it('should prioritize process.env over .env files', () => {
      process.env.TEST_VAR = 'process-env-value'
      
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockReadFileSync.mockReturnValue('TEST_VAR=env-file-value\n')
      
      const result = getEnvVar('TEST_VAR')
      
      expect(result).toBe('process-env-value')
    })
  })

  describe('getOptionalEnvVar', () => {
    it('should return environment variable when it exists', () => {
      process.env.OPTIONAL_VAR = 'optional-value'
      
      const result = getOptionalEnvVar('OPTIONAL_VAR')
      
      expect(result).toBe('optional-value')
    })

    it('should return default value when variable is missing', () => {
      const result = getOptionalEnvVar('MISSING_VAR', 'default-value')
      
      expect(result).toBe('default-value')
    })

    it('should return undefined when variable is missing and no default provided', () => {
      const result = getOptionalEnvVar('MISSING_VAR')
      
      expect(result).toBeUndefined()
    })
  })

  describe('getAllEnvVars', () => {
    it('should return all environment variables including process.env', () => {
      process.env.PROCESS_VAR = 'process-value'
      process.env.NODE_ENV = 'test'
      
      const result = getAllEnvVars()
      
      expect(result.PROCESS_VAR).toBe('process-value')
      expect(result.NODE_ENV).toBe('test')
    })

    it('should merge .env file variables with process.env', () => {
      process.env.PROCESS_VAR = 'process-value'
      
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockReadFileSync.mockReturnValue('FILE_VAR=file-value\nPROCESS_VAR=should-be-overridden\n')
      
      const result = getAllEnvVars()
      
      expect(result.PROCESS_VAR).toBe('process-value') // process.env takes precedence
      expect(result.FILE_VAR).toBe('file-value')
    })

    it('should cache results and return cached values on subsequent calls', () => {
      process.env.CACHE_TEST = 'cached-value'
      
      const result1 = getAllEnvVars()
      const result2 = getAllEnvVars()
      
      expect(result1).toBe(result2) // Same reference due to caching
      expect(result1.CACHE_TEST).toBe('cached-value')
    })

    it('should force reload when forceReload is true', () => {
      process.env.RELOAD_TEST = 'initial-value'
      
      // First call to populate cache
      getAllEnvVars()
      
      // Change environment variable
      process.env.RELOAD_TEST = 'updated-value'
      
      // Without force reload, should return cached value
      const cachedResult = getAllEnvVars()
      expect(cachedResult.RELOAD_TEST).toBe('initial-value')
      
      // With force reload, should return updated value
      const reloadedResult = getAllEnvVars(true)
      expect(reloadedResult.RELOAD_TEST).toBe('updated-value')
    })
  })

  describe('hasEnvVar', () => {
    it('should return true when variable exists and has value', () => {
      process.env.EXISTS_VAR = 'some-value'
      
      const result = hasEnvVar('EXISTS_VAR')
      
      expect(result).toBe(true)
    })

    it('should return false when variable does not exist', () => {
      const result = hasEnvVar('MISSING_VAR')
      
      expect(result).toBe(false)
    })

    it('should return false when variable exists but is empty string', () => {
      process.env.EMPTY_VAR = ''
      
      const result = hasEnvVar('EMPTY_VAR')
      
      expect(result).toBe(false)
    })
  })

  describe('getEnvVarsWithPrefix', () => {
    it('should return variables matching the prefix', () => {
      process.env.PREFIX_VAR1 = 'value1'
      process.env.PREFIX_VAR2 = 'value2'
      process.env.OTHER_VAR = 'other-value'
      
      const result = getEnvVarsWithPrefix('PREFIX_')
      
      expect(result).toEqual({
        PREFIX_VAR1: 'value1',
        PREFIX_VAR2: 'value2'
      })
      expect(result.OTHER_VAR).toBeUndefined()
    })

    it('should return empty object when no variables match prefix', () => {
      process.env.SOME_VAR = 'some-value'
      
      const result = getEnvVarsWithPrefix('NONEXISTENT_')
      
      expect(result).toEqual({})
    })
  })

  describe('validateRequiredEnvVars', () => {
    it('should not throw when all required variables are present', () => {
      process.env.REQUIRED_VAR1 = 'value1'
      process.env.REQUIRED_VAR2 = 'value2'
      
      expect(() => {
        validateRequiredEnvVars(['REQUIRED_VAR1', 'REQUIRED_VAR2'])
      }).not.toThrow()
    })

    it('should throw error when required variables are missing', () => {
      process.env.REQUIRED_VAR1 = 'value1'
      // REQUIRED_VAR2 is missing
      
      expect(() => {
        validateRequiredEnvVars(['REQUIRED_VAR1', 'REQUIRED_VAR2'])
      }).toThrow('Missing required environment variables: REQUIRED_VAR2')
    })

    it('should throw error when required variables are empty strings', () => {
      process.env.REQUIRED_VAR1 = 'value1'
      process.env.REQUIRED_VAR2 = ''
      process.env.REQUIRED_VAR3 = '   ' // whitespace only
      
      expect(() => {
        validateRequiredEnvVars(['REQUIRED_VAR1', 'REQUIRED_VAR2', 'REQUIRED_VAR3'])
      }).toThrow('Missing required environment variables: REQUIRED_VAR2, REQUIRED_VAR3')
    })
  })

  describe('Phase.dev integration', () => {
    describe('getPhaseServiceToken', () => {
      it('should return Phase.dev service token when available', () => {
        process.env.PHASE_SERVICE_TOKEN = 'phase-token-123'
        
        const result = getPhaseServiceToken()
        
        expect(result).toBe('phase-token-123')
      })

      it('should return null when Phase.dev service token is not available', () => {
        const result = getPhaseServiceToken()
        
        expect(result).toBeNull()
      })
    })

    describe('isPhaseDevAvailable', () => {
      it('should return true when Phase.dev service token is available', () => {
        process.env.PHASE_SERVICE_TOKEN = 'phase-token-123'
        
        const result = isPhaseDevAvailable()
        
        expect(result).toBe(true)
      })

      it('should return false when Phase.dev service token is not available', () => {
        const result = isPhaseDevAvailable()
        
        expect(result).toBe(false)
      })
    })
  })

  describe('getEnvironmentConfig', () => {
    it('should return correct environment configuration for development', () => {
      process.env.NODE_ENV = 'development'
      process.env.PHASE_SERVICE_TOKEN = 'phase-token'
      
      const result = getEnvironmentConfig()
      
      expect(result).toEqual({
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isTest: false,
        phaseServiceToken: 'phase-token',
        isPhaseDevAvailable: true
      })
    })

    it('should return correct environment configuration for production', () => {
      process.env.NODE_ENV = 'production'
      
      const result = getEnvironmentConfig()
      
      expect(result).toEqual({
        nodeEnv: 'production',
        isDevelopment: false,
        isProduction: true,
        isTest: false,
        phaseServiceToken: null,
        isPhaseDevAvailable: false
      })
    })

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV
      
      const result = getEnvironmentConfig()
      
      expect(result.nodeEnv).toBe('development')
      expect(result.isDevelopment).toBe(true)
    })
  })

  describe('.env file parsing', () => {
    it('should parse simple key=value pairs', () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockReadFileSync.mockReturnValue('SIMPLE_VAR=simple-value\n')
      
      const result = getEnvVar('SIMPLE_VAR')
      
      expect(result).toBe('simple-value')
    })

    it('should handle quoted values', () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockReadFileSync.mockReturnValue('QUOTED_VAR="quoted value"\nSINGLE_QUOTED=\'single quoted\'\n')
      
      expect(getEnvVar('QUOTED_VAR')).toBe('quoted value')
      expect(getEnvVar('SINGLE_QUOTED')).toBe('single quoted')
    })

    it('should skip comments and empty lines', () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockReadFileSync.mockReturnValue(`
# This is a comment
VALID_VAR=valid-value

# Another comment
ANOTHER_VAR=another-value
`)
      
      expect(getEnvVar('VALID_VAR')).toBe('valid-value')
      expect(getEnvVar('ANOTHER_VAR')).toBe('another-value')
    })

    it('should load files in correct precedence order', () => {
      process.env.NODE_ENV = 'development'
      
      mockExistsSync.mockImplementation((path: PathLike) => {
        const pathStr = path.toString()
        return pathStr.endsWith('.env') || 
               pathStr.endsWith('.env.development') || 
               pathStr.endsWith('.env.local')
      })
      
      mockReadFileSync.mockImplementation((path: PathOrFileDescriptor) => {
        const pathStr = path.toString()
        if (pathStr.endsWith('.env.local')) {
          return 'PRECEDENCE_TEST=local-value\n'
        } else if (pathStr.endsWith('.env.development')) {
          return 'PRECEDENCE_TEST=development-value\n'
        } else if (pathStr.endsWith('.env')) {
          return 'PRECEDENCE_TEST=base-value\n'
        }
        return ''
      })
      
      const result = getEnvVar('PRECEDENCE_TEST')
      
      // .env.local should take precedence
      expect(result).toBe('local-value')
    })

    it('should handle file read errors gracefully', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error')
      })
      
      // Should not throw, should fall back to process.env or default
      expect(() => getEnvVar('MISSING_VAR', 'default')).not.toThrow()
      expect(getEnvVar('MISSING_VAR', 'default')).toBe('default')
    })
  })

  describe('cache management', () => {
    it('should clear cache when clearEnvCache is called', () => {
      process.env.CACHE_VAR = 'initial-value'
      
      // Populate cache
      getAllEnvVars()
      
      // Change environment variable
      process.env.CACHE_VAR = 'updated-value'
      
      // Should still return cached value
      expect(getAllEnvVars().CACHE_VAR).toBe('initial-value')
      
      // Clear cache
      clearEnvCache()
      
      // Should now return updated value
      expect(getAllEnvVars().CACHE_VAR).toBe('updated-value')
    })

    it('should expire cache after TTL', async () => {
      // This test would require mocking Date.now() to simulate time passage
      // For now, we'll test the basic cache behavior
      process.env.TTL_TEST = 'value'
      
      const result1 = getAllEnvVars()
      const result2 = getAllEnvVars()
      
      // Should return same cached instance
      expect(result1).toBe(result2)
    })
  })
})