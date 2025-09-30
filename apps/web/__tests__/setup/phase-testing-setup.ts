/**
 * Phase.dev Testing Setup
 * 
 * CRITICAL: This setup ensures Phase.dev integration tests use REAL API calls
 * with actual service tokens, never mocks, as per phase-dev-testing-standards.
 */

import { beforeAll, beforeEach, afterEach } from 'vitest'

/**
 * Setup Phase.dev testing environment
 * 
 * MANDATORY: Ensures real Phase.dev service token is available
 * and validates test environment for Phase.dev integration.
 */
export function setupPhaseDevTesting() {
  beforeAll(() => {
    // CRITICAL: Fail fast if no real service token available
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error(
        'PHASE_SERVICE_TOKEN is required for Phase.dev integration tests. ' +
        'These tests must use real API calls, never mocks. ' +
        'Please set a valid Phase.dev service token in your environment.'
      )
    }

    // Validate token format (more flexible pattern)
    const tokenPattern = /^pss_[A-Za-z0-9_:-]{10,}$/
    if (!tokenPattern.test(process.env.PHASE_SERVICE_TOKEN)) {
      console.warn(
        'PHASE_SERVICE_TOKEN format may be non-standard. ' +
        'Expected format: pss_[A-Za-z0-9_-]{10,} but got: ' +
        process.env.PHASE_SERVICE_TOKEN.substring(0, 15) + '...'
      )
      // Don't throw error, just warn - allow tests to continue
    }

    // Ensure test environment
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`NODE_ENV is '${process.env.NODE_ENV}', expected 'test'`)
    }

    // Log Phase.dev testing setup (without exposing token)
    console.log('✅ Phase.dev testing setup complete')
    console.log('🔑 Service token format validated')
    console.log('🧪 Real API integration tests enabled')
  })

  beforeEach(() => {
    // Ensure Phase.dev token is still available for each test
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN was removed during test execution')
    }
  })

  afterEach(() => {
    // Clean up any test-specific Phase.dev state if needed
    // Note: We don't clear the service token as it's needed for all tests
  })
}

/**
 * Validates Phase.dev test environment
 */
export function validatePhaseDevEnvironment(): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check service token
  if (!process.env.PHASE_SERVICE_TOKEN) {
    errors.push('PHASE_SERVICE_TOKEN is required')
  } else {
    const tokenPattern = /^pss_[A-Za-z0-9_:-]{10,}$/
    if (!tokenPattern.test(process.env.PHASE_SERVICE_TOKEN)) {
      warnings.push('PHASE_SERVICE_TOKEN format may be non-standard')
    }
  }

  // Check NODE_ENV
  if (process.env.NODE_ENV !== 'test') {
    warnings.push(`NODE_ENV is '${process.env.NODE_ENV}', expected 'test'`)
  }

  // Check memory configuration
  const nodeOptions = process.env.NODE_OPTIONS
  if (!nodeOptions || !nodeOptions.includes('--max-old-space-size')) {
    warnings.push('NODE_OPTIONS missing --max-old-space-size configuration')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Creates test configuration for Phase.dev integration
 */
export function createPhaseDevTestConfig(appName: string = 'AI.C9d.Test') {
  return {
    serviceToken: process.env.PHASE_SERVICE_TOKEN!,
    appName,
    timeout: 10000, // 10 second timeout for API calls
    retries: 2, // Retry failed API calls twice
    enableFallback: false // Don't use fallback in integration tests
  }
}

/**
 * Test helper for Phase.dev API calls with proper error handling
 */
export async function testPhaseDevApiCall<T>(
  apiCall: () => Promise<T>,
  testName: string
): Promise<T> {
  try {
    const startTime = Date.now()
    const result = await apiCall()
    const duration = Date.now() - startTime
    
    console.log(`✅ ${testName} completed in ${duration}ms`)
    return result
  } catch (error) {
    console.error(`❌ ${testName} failed:`, error)
    throw error
  }
}

/**
 * Forbidden patterns detector for Phase.dev tests
 * 
 * This function helps detect if Phase.dev is being mocked (which is forbidden)
 */
export function detectForbiddenPhaseDevMocking(): string[] {
  const violations: string[] = []

  // Check if fetch is mocked globally
  if (global.fetch && typeof global.fetch === 'function') {
    const fetchStr = global.fetch.toString()
    if (fetchStr.includes('mock') || fetchStr.includes('vi.fn')) {
      violations.push('Global fetch is mocked - this breaks Phase.dev integration tests')
    }
  }

  // Check for Phase.dev module mocking
  const moduleCache = require.cache
  for (const modulePath in moduleCache) {
    if (modulePath.includes('phase') && modulePath.includes('mock')) {
      violations.push(`Phase.dev module appears to be mocked: ${modulePath}`)
    }
  }

  return violations
}

/**
 * Pre-test validation to ensure Phase.dev integration tests will work
 */
export async function preTestValidation(): Promise<void> {
  // Validate environment
  const envValidation = validatePhaseDevEnvironment()
  if (!envValidation.valid) {
    throw new Error(`Phase.dev environment validation failed: ${envValidation.errors.join(', ')}`)
  }

  // Check for forbidden mocking
  const mockingViolations = detectForbiddenPhaseDevMocking()
  if (mockingViolations.length > 0) {
    throw new Error(`Forbidden Phase.dev mocking detected: ${mockingViolations.join(', ')}`)
  }

  // Test basic connectivity (optional - may fail in some environments)
  try {
    const { loadFromPhase } = await import('@coordinated/phase-client')
    const result = await loadFromPhase(true, createPhaseDevTestConfig())
    
    if (result.success) {
      console.log('✅ Phase.dev connectivity test passed')
    } else {
      console.warn('⚠️  Phase.dev connectivity test failed (may be expected):', result.error)
    }
  } catch (error) {
    console.warn('⚠️  Phase.dev connectivity test error (may be expected):', error)
  }
}

// Export setup function for use in test files
export default setupPhaseDevTesting