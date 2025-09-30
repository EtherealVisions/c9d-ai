/**
 * Tests for Test Environment Validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateTestEnvironment, printValidationResults } from './test-environment-validation'

describe('Test Environment Validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment to known state
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('validateTestEnvironment', () => {
    it('should pass validation with proper test environment', async () => {
      // Set up proper test environment
      process.env.NODE_ENV = 'test'
      process.env.NODE_OPTIONS = '--max-old-space-size=8192'
      process.env.PHASE_SERVICE_TOKEN = 'pss_' + 'a'.repeat(32)
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'

      const result = await validateTestEnvironment()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.memoryConfigured).toBe(true)
      expect(result.requiredVarsPresent).toBe(true)
    })

    it('should fail validation without PHASE_SERVICE_TOKEN', async () => {
      process.env.NODE_ENV = 'test'
      process.env.NODE_OPTIONS = '--max-old-space-size=8192'
      delete process.env.PHASE_SERVICE_TOKEN

      const result = await validateTestEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('PHASE_SERVICE_TOKEN'))).toBe(true)
      expect(result.requiredVarsPresent).toBe(false)
    })

    it('should fail validation with invalid PHASE_SERVICE_TOKEN format', async () => {
      process.env.NODE_ENV = 'test'
      process.env.NODE_OPTIONS = '--max-old-space-size=8192'
      process.env.PHASE_SERVICE_TOKEN = 'invalid-token-format'

      const result = await validateTestEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('format is invalid'))).toBe(true)
    })

    it('should fail validation without proper memory configuration', async () => {
      process.env.NODE_ENV = 'test'
      process.env.PHASE_SERVICE_TOKEN = 'pss_' + 'a'.repeat(32)
      delete process.env.NODE_OPTIONS

      const result = await validateTestEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('NODE_OPTIONS'))).toBe(true)
      expect(result.memoryConfigured).toBe(false)
    })

    it('should warn about low memory allocation', async () => {
      process.env.NODE_ENV = 'test'
      process.env.NODE_OPTIONS = '--max-old-space-size=4096' // Below recommended
      process.env.PHASE_SERVICE_TOKEN = 'pss_' + 'a'.repeat(32)

      const result = await validateTestEnvironment()

      expect(result.warnings.some(w => w.includes('below recommended'))).toBe(true)
    })

    it('should warn about wrong NODE_ENV', async () => {
      process.env.NODE_ENV = 'development'
      process.env.NODE_OPTIONS = '--max-old-space-size=8192'
      process.env.PHASE_SERVICE_TOKEN = 'pss_' + 'a'.repeat(32)

      const result = await validateTestEnvironment()

      expect(result.warnings.some(w => w.includes('NODE_ENV'))).toBe(true)
    })

    it('should warn about missing critical environment variables', async () => {
      process.env.NODE_ENV = 'test'
      process.env.NODE_OPTIONS = '--max-old-space-size=8192'
      process.env.PHASE_SERVICE_TOKEN = 'pss_' + 'a'.repeat(32)
      // Don't set critical vars

      const result = await validateTestEnvironment()

      expect(result.warnings.some(w => w.includes('Missing critical environment variables'))).toBe(true)
    })

    it('should validate database URL format', async () => {
      process.env.NODE_ENV = 'test'
      process.env.NODE_OPTIONS = '--max-old-space-size=8192'
      process.env.PHASE_SERVICE_TOKEN = 'pss_' + 'a'.repeat(32)
      process.env.DATABASE_URL = 'mysql://wrong-protocol'

      const result = await validateTestEnvironment()

      expect(result.warnings.some(w => w.includes('should start with postgresql'))).toBe(true)
    })

    it('should validate Supabase URL format', async () => {
      process.env.NODE_ENV = 'test'
      process.env.NODE_OPTIONS = '--max-old-space-size=8192'
      process.env.PHASE_SERVICE_TOKEN = 'pss_' + 'a'.repeat(32)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://wrong-domain.com'

      const result = await validateTestEnvironment()

      expect(result.warnings.some(w => w.includes('should be a valid Supabase URL'))).toBe(true)
    })

    it('should validate Clerk key format', async () => {
      process.env.NODE_ENV = 'test'
      process.env.NODE_OPTIONS = '--max-old-space-size=8192'
      process.env.PHASE_SERVICE_TOKEN = 'pss_' + 'a'.repeat(32)
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'invalid-clerk-key'

      const result = await validateTestEnvironment()

      expect(result.warnings.some(w => w.includes('should start with pk_test_ or pk_live_'))).toBe(true)
    })
  })

  describe('printValidationResults', () => {
    it('should print validation results without throwing', () => {
      const validation = {
        valid: true,
        errors: [],
        warnings: ['Test warning'],
        phaseConnectivity: true,
        requiredVarsPresent: true,
        memoryConfigured: true
      }

      // Should not throw
      expect(() => printValidationResults(validation)).not.toThrow()
    })

    it('should handle validation with errors', () => {
      const validation = {
        valid: false,
        errors: ['Test error'],
        warnings: [],
        phaseConnectivity: false,
        requiredVarsPresent: false,
        memoryConfigured: false
      }

      // Should not throw
      expect(() => printValidationResults(validation)).not.toThrow()
    })
  })

  describe('Real environment validation', () => {
    it('should validate current test environment', async () => {
      // This test validates the actual current environment
      const result = await validateTestEnvironment()

      // Log results for debugging
      console.log('Current environment validation:', {
        valid: result.valid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        phaseConnectivity: result.phaseConnectivity
      })

      if (result.errors.length > 0) {
        console.log('Validation errors:', result.errors)
      }

      if (result.warnings.length > 0) {
        console.log('Validation warnings:', result.warnings)
      }

      // The test should always complete, even if validation fails
      expect(typeof result.valid).toBe('boolean')
      expect(Array.isArray(result.errors)).toBe(true)
      expect(Array.isArray(result.warnings)).toBe(true)
    })
  })
})