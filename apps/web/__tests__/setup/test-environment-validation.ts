/**
 * Test Environment Validation
 * 
 * Validates that the test environment is properly configured for Phase.dev integration
 * and other critical testing requirements.
 */

import { loadFromPhase } from '@coordinated/phase-client'

export interface TestEnvironmentValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  phaseConnectivity: boolean
  requiredVarsPresent: boolean
  memoryConfigured: boolean
}

/**
 * Validates the test environment setup
 */
export async function validateTestEnvironment(): Promise<TestEnvironmentValidation> {
  const errors: string[] = []
  const warnings: string[] = []
  let phaseConnectivity = false
  let requiredVarsPresent = true
  let memoryConfigured = true

  // Check NODE_ENV
  if (process.env.NODE_ENV !== 'test') {
    warnings.push(`NODE_ENV is '${process.env.NODE_ENV}', expected 'test'`)
  }

  // Check memory configuration
  const nodeOptions = process.env.NODE_OPTIONS
  if (!nodeOptions || !nodeOptions.includes('--max-old-space-size')) {
    errors.push('NODE_OPTIONS missing --max-old-space-size configuration')
    memoryConfigured = false
  } else {
    const memoryMatch = nodeOptions.match(/--max-old-space-size=(\d+)/)
    if (memoryMatch) {
      const memorySize = parseInt(memoryMatch[1])
      if (memorySize < 8192) {
        warnings.push(`Memory allocation (${memorySize}MB) is below recommended 8192MB`)
      }
    }
  }

  // Check Phase.dev service token
  if (!process.env.PHASE_SERVICE_TOKEN) {
    errors.push('PHASE_SERVICE_TOKEN is required for Phase.dev integration tests')
    requiredVarsPresent = false
  } else {
    // Validate token format (flexible pattern)
    const tokenPattern = /^pss_[A-Za-z0-9_:-]{10,}$/
    if (!tokenPattern.test(process.env.PHASE_SERVICE_TOKEN)) {
      warnings.push('PHASE_SERVICE_TOKEN format may be non-standard')
    } else {
      // Test Phase.dev connectivity
      try {
        const result = await loadFromPhase(true, {
          serviceToken: process.env.PHASE_SERVICE_TOKEN,
          appName: 'AI.C9d.Test'
        })
        
        phaseConnectivity = true
        
        if (!result.success) {
          warnings.push(`Phase.dev API call failed: ${result.error}`)
        }
      } catch (error) {
        warnings.push(`Phase.dev connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  // Check critical environment variables
  const criticalVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  ]

  const missingCriticalVars = criticalVars.filter(varName => !process.env[varName])
  if (missingCriticalVars.length > 0) {
    warnings.push(`Missing critical environment variables: ${missingCriticalVars.join(', ')}`)
  }

  // Validate database URL format if present
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    warnings.push('DATABASE_URL should start with postgresql://')
  }

  // Validate Supabase URL format if present
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.match(/^https:\/\/.*\.supabase\.co/)) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL should be a valid Supabase URL')
  }

  // Validate Clerk key format if present
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.match(/^pk_(test|live)_/)) {
    warnings.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY should start with pk_test_ or pk_live_')
  }

  // Check test framework configuration
  if (typeof global.gc !== 'function') {
    warnings.push('Garbage collection not exposed (consider running with --expose-gc for better memory management)')
  }

  // Check for required test dependencies
  try {
    require('@testing-library/jest-dom')
  } catch {
    errors.push('@testing-library/jest-dom is not available')
  }

  try {
    require('@clerk/testing')
  } catch {
    errors.push('@clerk/testing is not available (required for Clerk integration tests)')
  }

  const valid = errors.length === 0

  return {
    valid,
    errors,
    warnings,
    phaseConnectivity,
    requiredVarsPresent,
    memoryConfigured
  }
}

/**
 * Prints test environment validation results
 */
export function printValidationResults(validation: TestEnvironmentValidation): void {
  console.log('\n=== Test Environment Validation ===')
  
  if (validation.valid) {
    console.log('✅ Test environment is valid')
  } else {
    console.log('❌ Test environment has issues')
  }

  if (validation.errors.length > 0) {
    console.log('\n🚨 Errors:')
    validation.errors.forEach(error => console.log(`  - ${error}`))
  }

  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    validation.warnings.forEach(warning => console.log(`  - ${warning}`))
  }

  console.log('\n📊 Status Summary:')
  console.log(`  Phase.dev Connectivity: ${validation.phaseConnectivity ? '✅' : '❌'}`)
  console.log(`  Required Variables: ${validation.requiredVarsPresent ? '✅' : '❌'}`)
  console.log(`  Memory Configuration: ${validation.memoryConfigured ? '✅' : '❌'}`)

  console.log('\n=== End Validation ===\n')
}

/**
 * Validates test environment and throws if critical issues found
 */
export async function ensureTestEnvironment(): Promise<void> {
  const validation = await validateTestEnvironment()
  
  if (!validation.valid) {
    printValidationResults(validation)
    throw new Error('Test environment validation failed. Please fix the errors above.')
  }

  if (validation.warnings.length > 0) {
    printValidationResults(validation)
  }
}

/**
 * Setup function to be called before test suites
 */
export async function setupTestEnvironment(): Promise<void> {
  try {
    await ensureTestEnvironment()
  } catch (error) {
    console.error('Test environment setup failed:', error)
    process.exit(1)
  }
}

// Export validation functions for use in tests
export {
  validateTestEnvironment as default
}