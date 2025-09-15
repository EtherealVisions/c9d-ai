import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import {
  getEnvVar,
  getOptionalEnvVar,
  getAllEnvVars,
  clearEnvCache,
  reloadEnvironmentVars,
  getPhaseServiceToken,
  isPhaseDevAvailable
} from '../env'

describe('Basic Environment Variable Functionality', () => {
  const originalEnv = process.env
  const testDir = join(process.cwd(), 'test-basic-functionality')
  
  beforeEach(() => {
    // Reset process.env to a clean state
    process.env = { ...originalEnv }
    
    // Clear cache
    clearEnvCache()
    
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
    
    // Clear cache
    clearEnvCache()
    
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch (error) {
      // Directory might not exist
    }
  })

  describe('Basic Environment Variable Access', () => {
    it('should get environment variable from process.env', () => {
      process.env.TEST_VAR = 'test-value'
      
      const result = getEnvVar('TEST_VAR')
      
      expect(result).toBe('test-value')
    })

    it('should return default value when variable is not found', () => {
      const result = getEnvVar('MISSING_VAR', 'default-value')
      
      expect(result).toBe('default-value')
    })

    it('should get optional environment variable', () => {
      process.env.OPTIONAL_VAR = 'optional-value'
      
      const result = getOptionalEnvVar('OPTIONAL_VAR')
      
      expect(result).toBe('optional-value')
    })

    it('should return undefined for missing optional variable', () => {
      const result = getOptionalEnvVar('MISSING_OPTIONAL')
      
      expect(result).toBeUndefined()
    })
  })

  describe('Environment File Loading', () => {
    it('should load variables from .env file', () => {
      writeFileSync(join(testDir, '.env'), 'FILE_VAR=file-value')
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(result.FILE_VAR).toBe('file-value')
    })

    it('should prioritize process.env over .env files', () => {
      process.env.PRIORITY_VAR = 'process-value'
      writeFileSync(join(testDir, '.env'), 'PRIORITY_VAR=file-value')
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(result.PRIORITY_VAR).toBe('process-value')
    })

    it('should load environment-specific files', () => {
      process.env.NODE_ENV = 'development'
      
      writeFileSync(join(testDir, '.env'), 'BASE_VAR=base-value')
      writeFileSync(join(testDir, '.env.development'), 'DEV_VAR=dev-value')
      
      const result = reloadEnvironmentVars(testDir)
      
      expect(result.BASE_VAR).toBe('base-value')
      expect(result.DEV_VAR).toBe('dev-value')
    })

    it('should handle .env.local with highest priority among files', () => {
      writeFileSync(join(testDir, '.env'), 'PRECEDENCE_VAR=base-value')
      writeFileSync(join(testDir, '.env.local'), 'PRECEDENCE_VAR=local-value')
      
      const result = reloadEnvironmentVars(testDir)
      
      // Debug: log the actual result
      console.log('Debug - result.PRECEDENCE_VAR:', result.PRECEDENCE_VAR)
      console.log('Debug - all env vars:', Object.keys(result).filter(k => k.includes('PRECEDENCE')))
      
      expect(result.PRECEDENCE_VAR).toBe('local-value')
    })
  })

  describe('Phase.dev Integration', () => {
    it('should detect Phase.dev availability from process.env', () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token'
      
      expect(getPhaseServiceToken()).toBe('test-token')
      expect(isPhaseDevAvailable()).toBe(true)
    })

    it('should still detect Phase.dev availability from .env.local', () => {
      delete process.env.PHASE_SERVICE_TOKEN
      
      // Real token from .env.local is still available
      const token = getPhaseServiceToken()
      expect(token).toBeTruthy()
      expect(token).toMatch(/^pss_service:/)
      expect(isPhaseDevAvailable()).toBe(true)
    })

    it('should detect real Phase.dev token', () => {
      const token = getPhaseServiceToken()
      const isAvailable = isPhaseDevAvailable()
      
      expect(token).toBeTruthy()
      expect(isAvailable).toBe(true)
      expect(token).toMatch(/^pss_service:/)
    })
  })

  describe('Caching Behavior', () => {
    it('should cache environment variables', () => {
      writeFileSync(join(testDir, '.env'), 'CACHE_VAR=initial-value')
      
      // First load
      const result1 = reloadEnvironmentVars(testDir)
      expect(result1.CACHE_VAR).toBe('initial-value')
      
      // Modify file
      writeFileSync(join(testDir, '.env'), 'CACHE_VAR=modified-value')
      
      // Should return cached value
      const result2 = getAllEnvVars()
      expect(result2.CACHE_VAR).toBe('initial-value')
      
      // Force reload should get new value
      const result3 = reloadEnvironmentVars(testDir)
      expect(result3.CACHE_VAR).toBe('modified-value')
    })

    it('should clear cache when requested', () => {
      writeFileSync(join(testDir, '.env'), 'CLEAR_VAR=value')
      
      // Load and cache
      reloadEnvironmentVars(testDir)
      
      // Modify file
      writeFileSync(join(testDir, '.env'), 'CLEAR_VAR=new-value')
      
      // Clear cache
      clearEnvCache()
      
      // Should get new value
      const result = reloadEnvironmentVars(testDir)
      expect(result.CLEAR_VAR).toBe('new-value')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing .env files gracefully', () => {
      expect(() => {
        reloadEnvironmentVars(testDir)
      }).not.toThrow()
      
      const result = reloadEnvironmentVars(testDir)
      expect(typeof result).toBe('object')
    })

    it('should handle malformed .env files', () => {
      writeFileSync(join(testDir, '.env'), 
        'VALID_VAR=valid-value\n' +
        'INVALID LINE\n' +
        'ANOTHER_VALID=another-value'
      )
      
      expect(() => {
        reloadEnvironmentVars(testDir)
      }).not.toThrow()
      
      const result = reloadEnvironmentVars(testDir)
      expect(result.VALID_VAR).toBe('valid-value')
      expect(result.ANOTHER_VALID).toBe('another-value')
    })
  })
})