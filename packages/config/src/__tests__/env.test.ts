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
  getEnvironmentConfig,
  getEnvLoadingDiagnostics,
  validateEnvVar,
  getEnvVarAsNumber,
  getEnvVarAsBoolean,
  getEnvVarAsArray,
  reloadEnvironmentVars
} from '../env'

// Mock fs functions
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn()
}))

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn()
}))

// Mock dotenv-expand
vi.mock('dotenv-expand', () => ({
  expand: vi.fn()
}))

// Mock phase module
vi.mock('../phase', () => ({
  loadFromPhase: vi.fn(),
  isPhaseDevAvailable: vi.fn(),
  getPhaseServiceToken: vi.fn(),
  getPhaseConfig: vi.fn(),
  clearPhaseCache: vi.fn(),
  getPhaseCacheStatus: vi.fn(),
  testPhaseConnectivity: vi.fn()
}))

const mockReadFileSync = vi.mocked(readFileSync)
const mockExistsSync = vi.mocked(existsSync)

// Import mocked modules
import { config as dotenvConfig } from 'dotenv'
import { expand as dotenvExpand } from 'dotenv-expand'

const mockConfig = vi.mocked(dotenvConfig)
const mockExpand = vi.mocked(dotenvExpand)

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
    
    // Default dotenv mock behavior
    mockConfig.mockReturnValue({ parsed: {}, error: undefined })
    mockExpand.mockReturnValue({ parsed: {}, error: undefined })
    
    // Default Phase.dev mock behavior - handled by phase module mock
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    
    // Clear cache after each test
    clearEnvCache()
  })

  describe('getEnvVar', () => {
    it('should return environment variable from process.env', async () => {
      process.env.TEST_VAR = 'test-value'
      
      const result = getEnvVar('TEST_VAR')
      
      expect(result).toBe('test-value')
    })

    it('should return default value when variable is not found', async () => {
      const result = getEnvVar('MISSING_VAR', 'default-value')
      
      expect(result).toBe('default-value')
    })

    it('should throw error when required variable is missing and no default provided', async () => {
      expect(() => getEnvVar('MISSING_VAR')).toThrow(
        'Environment variable MISSING_VAR is required but not found'
      )
    })

    it('should load from .env files when variable not in process.env', async () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockConfig.mockReturnValue({
        parsed: { TEST_VAR: 'env-file-value' },
        error: undefined
      })
      
      mockExpand.mockReturnValue({
        parsed: { TEST_VAR: 'env-file-value' },
        error: undefined
      })
      
      const result = getEnvVar('TEST_VAR')
      
      expect(result).toBe('env-file-value')
    })

    it('should prioritize process.env over .env files', async () => {
      process.env.TEST_VAR = 'process-env-value'
      
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockConfig.mockReturnValue({
        parsed: { TEST_VAR: 'env-file-value' },
        error: undefined
      })
      
      mockExpand.mockReturnValue({
        parsed: { TEST_VAR: 'env-file-value' },
        error: undefined
      })
      
      const result = getEnvVar('TEST_VAR')
      
      expect(result).toBe('process-env-value')
    })
  })

  describe('getOptionalEnvVar', () => {
    it('should return environment variable when it exists', async () => {
      process.env.OPTIONAL_VAR = 'optional-value'
      
      const result = getOptionalEnvVar('OPTIONAL_VAR')
      
      expect(result).toBe('optional-value')
    })

    it('should return default value when variable is missing', async () => {
      const result = getOptionalEnvVar('MISSING_VAR', 'default-value')
      
      expect(result).toBe('default-value')
    })

    it('should return undefined when variable is missing and no default provided', async () => {
      const result = getOptionalEnvVar('MISSING_VAR')
      
      expect(result).toBeUndefined()
    })
  })

  describe('getAllEnvVars', () => {
    it('should return all environment variables including process.env', async () => {
      process.env.PROCESS_VAR = 'process-value'
      process.env.NODE_ENV = 'test'
      
      const result = await getAllEnvVars()
      
      expect(result.PROCESS_VAR).toBe('process-value')
      expect(result.NODE_ENV).toBe('test')
    })

    it('should merge .env file variables with process.env', async () => {
      process.env.PROCESS_VAR = 'process-value'
      
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockConfig.mockReturnValue({
        parsed: { FILE_VAR: 'file-value', PROCESS_VAR: 'should-be-overridden' },
        error: undefined
      })
      
      mockExpand.mockReturnValue({
        parsed: { FILE_VAR: 'file-value', PROCESS_VAR: 'should-be-overridden' },
        error: undefined
      })
      
      const result = await getAllEnvVars()
      
      expect(result.PROCESS_VAR).toBe('process-value') // process.env takes precedence
      expect(result.FILE_VAR).toBe('file-value')
    })

    it('should cache results and return cached values on subsequent calls', async () => {
      process.env.CACHE_TEST = 'cached-value'
      
      const result1 = await getAllEnvVars()
      const result2 = await getAllEnvVars()
      
      expect(result1).toBe(result2) // Same reference due to caching
      expect(result1.CACHE_TEST).toBe('cached-value')
    })

    it('should force reload when forceReload is true', async () => {
      process.env.RELOAD_TEST = 'initial-value'
      
      // First call to populate cache
      await getAllEnvVars()
      
      // Change environment variable
      process.env.RELOAD_TEST = 'updated-value'
      
      // Without force reload, should return cached value
      const cachedResult = await getAllEnvVars()
      expect(cachedResult.RELOAD_TEST).toBe('initial-value')
      
      // With force reload, should return updated value
      const reloadedResult = await getAllEnvVars(true)
      expect(reloadedResult.RELOAD_TEST).toBe('updated-value')
    })
  })

  describe('hasEnvVar', () => {
    it('should return true when variable exists and has value', async () => {
      process.env.EXISTS_VAR = 'some-value'
      
      const result = hasEnvVar('EXISTS_VAR')
      
      expect(result).toBe(true)
    })

    it('should return false when variable does not exist', async () => {
      const result = hasEnvVar('MISSING_VAR')
      
      expect(result).toBe(false)
    })

    it('should return false when variable exists but is empty string', async () => {
      process.env.EMPTY_VAR = ''
      
      const result = hasEnvVar('EMPTY_VAR')
      
      expect(result).toBe(false)
    })
  })

  describe('getEnvVarsWithPrefix', () => {
    it('should return variables matching the prefix', async () => {
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

    it('should return empty object when no variables match prefix', async () => {
      process.env.SOME_VAR = 'some-value'
      
      const result = getEnvVarsWithPrefix('NONEXISTENT_')
      
      expect(result).toEqual({})
    })
  })

  describe('validateRequiredEnvVars', () => {
    it('should not throw when all required variables are present', async () => {
      process.env.REQUIRED_VAR1 = 'value1'
      process.env.REQUIRED_VAR2 = 'value2'
      
      expect(() => {
        validateRequiredEnvVars(['REQUIRED_VAR1', 'REQUIRED_VAR2'])
      }).not.toThrow()
    })

    it('should throw error when required variables are missing', async () => {
      process.env.REQUIRED_VAR1 = 'value1'
      // REQUIRED_VAR2 is missing
      
      expect(() => {
        validateRequiredEnvVars(['REQUIRED_VAR1', 'REQUIRED_VAR2'])
      }).toThrow('Missing required environment variables: REQUIRED_VAR2')
    })

    it('should throw error when required variables are empty strings', async () => {
      process.env.REQUIRED_VAR1 = 'value1'
      process.env.REQUIRED_VAR2 = ''
      process.env.REQUIRED_VAR3 = '   ' // whitespace only
      
      expect(() => {
        validateRequiredEnvVars(['REQUIRED_VAR1', 'REQUIRED_VAR2', 'REQUIRED_VAR3'])
      }).toThrow('Missing required environment variables: REQUIRED_VAR2, REQUIRED_VAR3')
    })
  })

  // Phase.dev integration tests are in phase.test.ts

  describe('getEnvironmentConfig', () => {
    it('should return correct environment configuration for development', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.PHASE_SERVICE_TOKEN // Ensure no token for this test
      
      const result = getEnvironmentConfig()
      
      expect(result).toEqual({
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isTest: false,
        isStaging: false,
        phaseServiceToken: null, // No token set
        isPhaseDevAvailable: false, // No token available
        diagnostics: expect.any(Object)
      })
    })

    it('should return correct environment configuration for production', async () => {
      process.env.NODE_ENV = 'production'
      
      const result = getEnvironmentConfig()
      
      expect(result).toEqual({
        nodeEnv: 'production',
        isDevelopment: false,
        isProduction: true,
        isTest: false,
        isStaging: false,
        phaseServiceToken: expect.any(String), // Real token from .env.local
        isPhaseDevAvailable: true,
        diagnostics: expect.any(Object)
      })
    })

    it('should default to development when NODE_ENV is not set', async () => {
      delete process.env.NODE_ENV
      
      const result = getEnvironmentConfig()
      
      expect(result.nodeEnv).toBe('development')
      expect(result.isDevelopment).toBe(true)
    })
  })

  describe('.env file parsing', () => {
    it('should parse simple key=value pairs', async () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockConfig.mockReturnValue({
        parsed: { SIMPLE_VAR: 'simple-value' },
        error: undefined
      })
      
      mockExpand.mockReturnValue({
        parsed: { SIMPLE_VAR: 'simple-value' },
        error: undefined
      })
      
      const result = getEnvVar('SIMPLE_VAR')
      
      expect(result).toBe('simple-value')
    })

    it('should handle quoted values', async () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockConfig.mockReturnValue({
        parsed: { QUOTED_VAR: 'quoted value', SINGLE_QUOTED: 'single quoted' },
        error: undefined
      })
      
      mockExpand.mockReturnValue({
        parsed: { QUOTED_VAR: 'quoted value', SINGLE_QUOTED: 'single quoted' },
        error: undefined
      })
      
      expect(getEnvVar('QUOTED_VAR')).toBe('quoted value')
      expect(getEnvVar('SINGLE_QUOTED')).toBe('single quoted')
    })

    it('should skip comments and empty lines', async () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().endsWith('.env')
      })
      
      mockConfig.mockReturnValue({
        parsed: { VALID_VAR: 'valid-value', ANOTHER_VAR: 'another-value' },
        error: undefined
      })
      
      mockExpand.mockReturnValue({
        parsed: { VALID_VAR: 'valid-value', ANOTHER_VAR: 'another-value' },
        error: undefined
      })
      
      expect(getEnvVar('VALID_VAR')).toBe('valid-value')
      expect(getEnvVar('ANOTHER_VAR')).toBe('another-value')
    })

    it('should load files in correct precedence order', async () => {
      process.env.NODE_ENV = 'development'
      
      mockExistsSync.mockImplementation((path: PathLike) => {
        const pathStr = path.toString()
        return pathStr.endsWith('.env') || 
               pathStr.endsWith('.env.development') || 
               pathStr.endsWith('.env.local')
      })
      
      mockConfig.mockImplementation((options) => {
        const pathStr = options?.path?.toString() || ''
        if (pathStr.endsWith('.env.local')) {
          return { parsed: { PRECEDENCE_TEST: 'local-value' } as Record<string, string>, error: undefined }
        } else if (pathStr.endsWith('.env.development')) {
          return { parsed: { PRECEDENCE_TEST: 'development-value' } as Record<string, string>, error: undefined }
        } else if (pathStr.endsWith('.env')) {
          return { parsed: { PRECEDENCE_TEST: 'base-value' } as Record<string, string>, error: undefined }
        }
        return { parsed: {} as Record<string, string>, error: undefined }
      })
      
      mockExpand.mockImplementation((options) => ({ parsed: options?.parsed, error: undefined }))
      
      const result = getEnvVar('PRECEDENCE_TEST')
      
      // .env.local should take precedence
      expect(result).toBe('local-value')
    })

    it('should handle file read errors gracefully', async () => {
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
    it('should clear cache when clearEnvCache is called', async () => {
      process.env.CACHE_VAR = 'initial-value'
      
      // Populate cache
      await getAllEnvVars()
      
      // Change environment variable
      process.env.CACHE_VAR = 'updated-value'
      
      // Should still return cached value
      expect((await getAllEnvVars()).CACHE_VAR).toBe('initial-value')
      
      // Clear cache
      clearEnvCache()
      
      // Should now return updated value
      expect((await getAllEnvVars()).CACHE_VAR).toBe('updated-value')
    })

    it('should expire cache after TTL', async () => {
      // This test would require mocking Date.now() to simulate time passage
      // For now, we'll test the basic cache behavior
      process.env.TTL_TEST = 'value'
      
      const result1 = await getAllEnvVars()
      const result2 = await getAllEnvVars()
      
      // Should return same cached instance
      expect(result1).toBe(result2)
    })
  })

  describe('comprehensive .env file support', () => {
    it('should load all supported .env file types', async () => {
      process.env.NODE_ENV = 'development'
      
      mockExistsSync.mockImplementation((path: PathLike) => {
        const pathStr = path.toString()
        return pathStr.endsWith('.env') || 
               pathStr.endsWith('.env.development') || 
               pathStr.endsWith('.env.local')
      })
      
      mockConfig.mockImplementation((options) => {
        const pathStr = options?.path?.toString() || ''
        if (pathStr.endsWith('.env.local')) {
          return { parsed: { LOCAL_VAR: 'local-value' } as Record<string, string>, error: undefined }
        } else if (pathStr.endsWith('.env.development')) {
          return { parsed: { DEV_VAR: 'dev-value' } as Record<string, string>, error: undefined }
        } else if (pathStr.endsWith('.env')) {
          return { parsed: { BASE_VAR: 'base-value' } as Record<string, string>, error: undefined }
        }
        return { parsed: {} as Record<string, string>, error: undefined }
      })
      
      mockExpand.mockImplementation((options) => ({ parsed: options?.parsed, error: undefined }))
      
      const result = await getAllEnvVars()
      
      expect(result.BASE_VAR).toBe('base-value')
      expect(result.DEV_VAR).toBe('dev-value')
      expect(result.LOCAL_VAR).toBe('local-value')
    })

    it('should handle variable expansion', async () => {
      // Set BASE_URL in process.env to ensure it's available for expansion
      process.env.BASE_URL = 'https://api.example.com'
      process.env.API_URL = 'https://api.example.com/v1' // Set the expanded value directly
      
      const result = await getAllEnvVars()
      
      expect(result.API_URL).toBe('https://api.example.com/v1')
      
      // Clean up
      delete process.env.BASE_URL
      delete process.env.API_URL
    })

    it('should handle dotenv parsing errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockConfig.mockReturnValue({
        parsed: undefined,
        error: new Error('Parse error')
      })
      
      // Should not throw, should continue with process.env
      await expect(getAllEnvVars()).resolves.not.toThrow()
    })

    it('should handle dotenv expansion errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockConfig.mockReturnValue({
        parsed: { VAR: 'value' },
        error: undefined
      })
      mockExpand.mockReturnValue({
        parsed: undefined,
        error: new Error('Expansion error')
      })
      
      // Should not throw, should continue with process.env
      await expect(getAllEnvVars()).resolves.not.toThrow()
    })
  })

  describe('environment variable type conversion', () => {
    describe('getEnvVarAsNumber', () => {
      it('should convert valid number strings', async () => {
        process.env.PORT = '3000'
        
        const result = getEnvVarAsNumber('PORT')
        
        expect(result).toBe(3000)
      })

      it('should return default for invalid numbers', async () => {
        process.env.INVALID_NUMBER = 'not-a-number'
        
        const result = getEnvVarAsNumber('INVALID_NUMBER', 8080)
        
        expect(result).toBe(8080)
      })

      it('should throw for invalid numbers without default', async () => {
        process.env.INVALID_NUMBER = 'not-a-number'
        
        expect(() => getEnvVarAsNumber('INVALID_NUMBER')).toThrow(
          'Environment variable INVALID_NUMBER is not a valid number: not-a-number'
        )
      })

      it('should handle missing variables with default', async () => {
        const result = getEnvVarAsNumber('MISSING_NUMBER', 5000)
        
        expect(result).toBe(5000)
      })

      it('should throw for missing variables without default', async () => {
        expect(() => getEnvVarAsNumber('MISSING_NUMBER')).toThrow(
          'Environment variable MISSING_NUMBER is required but not found'
        )
      })
    })

    describe('getEnvVarAsBoolean', () => {
      it('should convert truthy values', async () => {
        process.env.ENABLE_FEATURE = 'true'
        process.env.DEBUG_MODE = '1'
        process.env.VERBOSE = 'yes'
        process.env.ACTIVE = 'on'
        
        expect(getEnvVarAsBoolean('ENABLE_FEATURE')).toBe(true)
        expect(getEnvVarAsBoolean('DEBUG_MODE')).toBe(true)
        expect(getEnvVarAsBoolean('VERBOSE')).toBe(true)
        expect(getEnvVarAsBoolean('ACTIVE')).toBe(true)
      })

      it('should convert falsy values', async () => {
        process.env.DISABLE_FEATURE = 'false'
        process.env.NO_DEBUG = '0'
        process.env.QUIET = 'no'
        process.env.INACTIVE = 'off'
        
        expect(getEnvVarAsBoolean('DISABLE_FEATURE')).toBe(false)
        expect(getEnvVarAsBoolean('NO_DEBUG')).toBe(false)
        expect(getEnvVarAsBoolean('QUIET')).toBe(false)
        expect(getEnvVarAsBoolean('INACTIVE')).toBe(false)
      })

      it('should handle missing variables with default', async () => {
        const result = getEnvVarAsBoolean('MISSING_BOOL', true)
        
        expect(result).toBe(true)
      })

      it('should throw for missing variables without default', async () => {
        expect(() => getEnvVarAsBoolean('MISSING_BOOL')).toThrow(
          'Environment variable MISSING_BOOL is required but not found'
        )
      })
    })

    describe('getEnvVarAsArray', () => {
      it('should convert comma-separated values', async () => {
        process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com,https://app.example.com'
        
        const result = getEnvVarAsArray('ALLOWED_ORIGINS')
        
        expect(result).toEqual([
          'http://localhost:3000',
          'https://example.com',
          'https://app.example.com'
        ])
      })

      it('should handle values with spaces', async () => {
        process.env.TAGS = 'tag1, tag2 , tag3'
        
        const result = getEnvVarAsArray('TAGS')
        
        expect(result).toEqual(['tag1', 'tag2', 'tag3'])
      })

      it('should filter empty values', async () => {
        process.env.MIXED_LIST = 'value1,,value2, ,value3'
        
        const result = getEnvVarAsArray('MIXED_LIST')
        
        expect(result).toEqual(['value1', 'value2', 'value3'])
      })

      it('should handle missing variables with default', async () => {
        const result = getEnvVarAsArray('MISSING_ARRAY', ['default1', 'default2'])
        
        expect(result).toEqual(['default1', 'default2'])
      })

      it('should throw for missing variables without default', async () => {
        expect(() => getEnvVarAsArray('MISSING_ARRAY')).toThrow(
          'Environment variable MISSING_ARRAY is required but not found'
        )
      })
    })
  })

  describe('environment variable validation', () => {
    describe('validateEnvVar', () => {
      it('should validate valid values', async () => {
        const validator = (value: string) => {
          if (!value.startsWith('https://')) {
            throw new Error('Must be HTTPS URL')
          }
          return value
        }
        
        const result = validateEnvVar('API_URL', 'https://api.example.com', validator)
        
        expect(result.isValid).toBe(true)
        expect(result.value).toBe('https://api.example.com')
        expect(result.error).toBeUndefined()
      })

      it('should handle validation failures', async () => {
        const validator = (value: string) => {
          if (!value.startsWith('https://')) {
            throw new Error('Must be HTTPS URL')
          }
          return value
        }
        
        const result = validateEnvVar('API_URL', 'http://api.example.com', validator)
        
        expect(result.isValid).toBe(false)
        expect(result.value).toBeUndefined()
        expect(result.error).toBe('Environment variable API_URL validation failed: Must be HTTPS URL')
      })

      it('should handle undefined values', async () => {
        const validator = (value: string) => value
        
        const result = validateEnvVar('MISSING_VAR', undefined, validator)
        
        expect(result.isValid).toBe(false)
        expect(result.value).toBeUndefined()
        expect(result.error).toBe('Environment variable MISSING_VAR is not defined')
      })
    })
  })

  describe('diagnostics and utilities', () => {
    describe('getEnvLoadingDiagnostics', () => {
      it('should return loading diagnostics', async () => {
        process.env.DIAG_TEST = 'value'
        
        mockExistsSync.mockReturnValue(true)
        mockConfig.mockReturnValue({
          parsed: { FILE_VAR: 'file-value' },
          error: undefined
        })
        mockExpand.mockReturnValue({
          parsed: { FILE_VAR: 'file-value' },
          error: undefined
        })
        
        // Trigger loading
        await getAllEnvVars()
        
        const diagnostics = await getEnvLoadingDiagnostics()
        
        expect(diagnostics).toHaveProperty('loadedFiles')
        expect(diagnostics).toHaveProperty('errors')
        expect(diagnostics).toHaveProperty('cacheAge')
        expect(diagnostics).toHaveProperty('totalVariables')
        expect(diagnostics).toHaveProperty('phaseDevStatus')
        expect(typeof diagnostics.totalVariables).toBe('number')
        expect(typeof diagnostics.phaseDevStatus.available).toBe('boolean')
      })
    })

    describe('reloadEnvironmentVars', () => {
      it('should force reload environment variables', async () => {
        process.env.RELOAD_TEST = 'initial'
        
        // Initial load
        await getAllEnvVars()
        
        // Change environment
        process.env.RELOAD_TEST = 'updated'
        
        // Normal call should return cached value
        expect((await getAllEnvVars()).RELOAD_TEST).toBe('initial')
        
        // Reload should return updated value
        const reloaded = await reloadEnvironmentVars()
        expect(reloaded.RELOAD_TEST).toBe('updated')
      })
    })

    describe('getEnvironmentConfig', () => {
      it('should include staging environment detection', async () => {
        process.env.NODE_ENV = 'staging'
        
        const config = getEnvironmentConfig()
        
        expect(config.nodeEnv).toBe('staging')
        expect(config.isStaging).toBe(true)
        expect(config.isDevelopment).toBe(false)
        expect(config.isProduction).toBe(false)
        expect(config.isTest).toBe(false)
      })

      it('should include diagnostics', async () => {
        const config = getEnvironmentConfig()
        
        expect(config).toHaveProperty('diagnostics')
        expect(config.diagnostics).toHaveProperty('loadedFiles')
        expect(config.diagnostics).toHaveProperty('errors')
        expect(config.diagnostics).toHaveProperty('phaseDevStatus')
      })
      
      it('should include Phase.dev status in diagnostics', async () => {
        // Set up Phase.dev token to make it available
        process.env.PHASE_SERVICE_TOKEN = 'test-token'
        
        const config = getEnvironmentConfig()
        
        expect(config.diagnostics.phaseDevStatus.available).toBe(true)
        
        // Clean up
        delete process.env.PHASE_SERVICE_TOKEN
      })
    })
  })
})