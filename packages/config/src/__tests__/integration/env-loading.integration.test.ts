import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import {
  getEnvVar,
  getAllEnvVars,
  clearEnvCache,
  getEnvironmentConfig,
  getEnvLoadingDiagnostics,
  reloadEnvironmentVars
} from '../../env'
import {
  loadFromPhase,
  clearPhaseCache,
  testPhaseConnectivity
} from '../../phase'

describe('Environment Variable Loading Integration Tests', () => {
  const originalEnv = process.env
  const testDir = join(process.cwd(), 'test-env-integration')

  // Ensure we have a real Phase.dev service token for integration tests
  beforeAll(() => {
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN is required for Phase.dev integration tests. Please set a valid token in your environment.')
    }
  })
  
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

  describe('Environment-specific .env file loading', () => {
    it('should load development environment variables correctly', async () => {
      process.env.NODE_ENV = 'development'
      
      // Create test .env files
      writeFileSync(join(testDir, '.env'), 'BASE_VAR=base-value\nSHARED_VAR=base-shared')
      writeFileSync(join(testDir, '.env.development'), 'DEV_VAR=dev-value\nSHARED_VAR=dev-shared')
      writeFileSync(join(testDir, '.env.local'), 'LOCAL_VAR=local-value\nSHARED_VAR=local-shared')
      
      const result = await reloadEnvironmentVars(testDir)
      
      expect(result.BASE_VAR).toBe('base-value')
      expect(result.DEV_VAR).toBe('dev-value')
      expect(result.LOCAL_VAR).toBe('local-value')
      expect(result.SHARED_VAR).toBe('local-shared') // .env.local should win
    })

    it('should load production environment variables correctly', async () => {
      process.env.NODE_ENV = 'production'
      
      // Create test .env files
      writeFileSync(join(testDir, '.env'), 'BASE_VAR=base-value\nSHARED_VAR=base-shared')
      writeFileSync(join(testDir, '.env.production'), 'PROD_VAR=prod-value\nSHARED_VAR=prod-shared')
      writeFileSync(join(testDir, '.env.local'), 'LOCAL_VAR=local-value\nSHARED_VAR=local-shared')
      
      const result = await reloadEnvironmentVars(testDir)
      
      expect(result.BASE_VAR).toBe('base-value')
      expect(result.PROD_VAR).toBe('prod-value')
      expect(result.LOCAL_VAR).toBe('local-value')
      expect(result.SHARED_VAR).toBe('local-shared') // .env.local should win
    })

    it('should load test environment variables correctly', async () => {
      process.env.NODE_ENV = 'test'
      
      // Create test .env files
      writeFileSync(join(testDir, '.env'), 'BASE_VAR=base-value')
      writeFileSync(join(testDir, '.env.test'), 'TEST_VAR=test-value\nDB_URL=test-db-url')
      
      const result = await reloadEnvironmentVars(testDir)
      
      expect(result.BASE_VAR).toBe('base-value')
      expect(result.TEST_VAR).toBe('test-value')
      expect(result.DB_URL).toBe('test-db-url')
    })

    it('should load staging environment variables correctly', async () => {
      process.env.NODE_ENV = 'staging'
      
      // Create test .env files
      writeFileSync(join(testDir, '.env'), 'BASE_VAR=base-value')
      writeFileSync(join(testDir, '.env.staging'), 'STAGING_VAR=staging-value\nAPI_URL=staging-api-url')
      
      const result = await reloadEnvironmentVars(testDir)
      
      expect(result.BASE_VAR).toBe('base-value')
      expect(result.STAGING_VAR).toBe('staging-value')
      expect(result.API_URL).toBe('staging-api-url')
    })
  })

  describe('Environment variable precedence', () => {
    it('should prioritize process.env over all file sources', async () => {
      process.env.NODE_ENV = 'development'
      process.env.PRECEDENCE_TEST = 'process-env-value'
      
      // Create test .env files with conflicting values
      writeFileSync(join(testDir, '.env'), 'PRECEDENCE_TEST=base-value')
      writeFileSync(join(testDir, '.env.development'), 'PRECEDENCE_TEST=dev-value')
      writeFileSync(join(testDir, '.env.local'), 'PRECEDENCE_TEST=local-value')
      
      const result = await reloadEnvironmentVars(testDir)
      
      expect(result.PRECEDENCE_TEST).toBe('process-env-value')
    })

    it('should prioritize .env.local over environment-specific files', async () => {
      process.env.NODE_ENV = 'development'
      
      // Create test .env files with conflicting values
      writeFileSync(join(testDir, '.env'), 'PRECEDENCE_TEST=base-value')
      writeFileSync(join(testDir, '.env.development'), 'PRECEDENCE_TEST=dev-value')
      writeFileSync(join(testDir, '.env.local'), 'PRECEDENCE_TEST=local-value')
      
      const result = await reloadEnvironmentVars(testDir)
      
      expect(result.PRECEDENCE_TEST).toBe('local-value')
    })

    it('should prioritize environment-specific files over .env', async () => {
      process.env.NODE_ENV = 'production'
      
      // Create test .env files with conflicting values
      writeFileSync(join(testDir, '.env'), 'PRECEDENCE_TEST=base-value')
      writeFileSync(join(testDir, '.env.production'), 'PRECEDENCE_TEST=prod-value')
      
      const result = await reloadEnvironmentVars(testDir)
      
      expect(result.PRECEDENCE_TEST).toBe('prod-value')
    })
  })

  describe('Phase.dev integration scenarios', () => {
    it('should handle Phase.dev unavailable scenario', async () => {
      // Temporarily clear the token to test unavailable scenario
      const originalToken = process.env.PHASE_SERVICE_TOKEN
      delete process.env.PHASE_SERVICE_TOKEN
      
      const result = await loadFromPhase()
      
      expect(result.success).toBe(false)
      expect(result.source).toBe('fallback')
      expect(result.error).toBe('Phase.dev service token not available')
      expect(result.variables).toEqual({})
      
      // Restore original token
      if (originalToken) {
        process.env.PHASE_SERVICE_TOKEN = originalToken
      }
    })

    it('should handle Phase.dev API calls (test app may not exist)', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token-123'
      
      const result = await loadFromPhase()
      
      // Test app likely doesn't exist, expect failure
      expect(result.success).toBe(false)
      expect(result.source).toBe('fallback')
      expect(result.error).toContain('Phase.dev API error')
    })

    it('should test Phase.dev connectivity (test app may not exist)', async () => {
      process.env.PHASE_SERVICE_TOKEN = 'test-token-123'
      
      const result = await testPhaseConnectivity()
      
      // Test app likely doesn't exist, expect failure
      expect(result.success).toBe(false)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.error).toContain('Phase.dev API error')
    })
  })

  describe('Caching behavior', () => {
    it('should cache environment variables and return cached values', async () => {
      writeFileSync(join(testDir, '.env'), 'CACHE_TEST=initial-value')
      
      // First load
      const result1 = await reloadEnvironmentVars(testDir)
      expect(result1.CACHE_TEST).toBe('initial-value')
      
      // Modify file
      writeFileSync(join(testDir, '.env'), 'CACHE_TEST=modified-value')
      
      // Second load without force reload should return cached value
      const result2 = await getAllEnvVars()
      expect(result2.CACHE_TEST).toBe('initial-value')
      
      // Force reload should return new value
      const result3 = await reloadEnvironmentVars(testDir)
      expect(result3.CACHE_TEST).toBe('modified-value')
    })

    it('should provide accurate cache diagnostics', async () => {
      writeFileSync(join(testDir, '.env'), 'DIAG_TEST=value')
      
      // Load environment variables
      reloadEnvironmentVars(testDir)
      
      const diagnostics = await getEnvLoadingDiagnostics()
      
      expect(diagnostics.loadedFiles).toContain('.env')
      expect(diagnostics.cacheAge).toBeGreaterThanOrEqual(0)
      expect(diagnostics.totalVariables).toBeGreaterThan(0)
      expect(diagnostics.phaseDevStatus).toHaveProperty('available')
    })
  })

  describe('Environment configuration integration', () => {
    it('should provide complete environment configuration', async () => {
      process.env.NODE_ENV = 'development'
      process.env.PHASE_SERVICE_TOKEN = 'dev-token'
      
      writeFileSync(join(testDir, '.env'), 'BASE_CONFIG=base-value')
      
      // Load environment variables first
      reloadEnvironmentVars(testDir)
      
      const config = getEnvironmentConfig()
      
      expect(config.nodeEnv).toBe('development')
      expect(config.isDevelopment).toBe(true)
      expect(config.isProduction).toBe(false)
      expect(config.isTest).toBe(false)
      expect(config.isStaging).toBe(false)
      expect(config.phaseServiceToken).toBe('dev-token')
      expect(config.isPhaseDevAvailable).toBe(true)
      expect(config.diagnostics).toHaveProperty('loadedFiles')
      expect(config.diagnostics).toHaveProperty('phaseDevStatus')
    })
  })

  describe('Validation and type conversion integration', () => {
    it('should validate and convert environment variables correctly', async () => {
      writeFileSync(join(testDir, '.env'), 'PORT=3000\nDEBUG=true')
      
      // Load environment variables
      reloadEnvironmentVars(testDir)
      
      // Test type conversions
      expect(getEnvVar('PORT')).toBe('3000')
      expect(getEnvVar('DEBUG')).toBe('true')
      
      // These would be used with the type conversion functions
      const config = getEnvironmentConfig()
      expect(config.nodeEnv).toBeDefined()
      expect(config.diagnostics.totalVariables).toBeGreaterThan(0)
    })
  })
})