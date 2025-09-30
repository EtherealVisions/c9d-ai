#!/usr/bin/env tsx
/**
 * Environment Integration Test Runner
 * 
 * Runs comprehensive tests for the Phase.dev environment integration system.
 * This script validates the environment and runs different types of tests.
 */

import { execSync } from 'child_process'
import { validateTestEnvironment, printValidationResults } from './setup/test-environment-validation'

interface TestSuite {
  name: string
  command: string
  description: string
  required: boolean
}

const testSuites: TestSuite[] = [
  {
    name: 'Environment Validation',
    command: 'pnpm test:unit __tests__/setup/test-environment-validation.test.ts',
    description: 'Validates test environment configuration',
    required: true
  },
  {
    name: 'Phase.dev Integration',
    command: 'pnpm test:integration __tests__/integration/phase-environment-integration.test.ts',
    description: 'Tests real Phase.dev API integration',
    required: true
  },
  {
    name: 'Unit Tests with Environment',
    command: 'pnpm test:unit --testPathPattern="env|environment|phase"',
    description: 'Unit tests for environment-related functionality',
    required: true
  },
  {
    name: 'E2E Environment Tests',
    command: 'pnpm test:e2e __tests__/e2e/environment-integration.e2e.test.ts',
    description: 'End-to-end tests with environment integration',
    required: false
  }
]

async function runTestSuite(suite: TestSuite): Promise<{ success: boolean; output: string; error?: string }> {
  console.log(`\n🧪 Running: ${suite.name}`)
  console.log(`📝 Description: ${suite.description}`)
  console.log(`⚡ Command: ${suite.command}`)

  try {
    const output = execSync(suite.command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 300000 // 5 minutes timeout
    })

    console.log('✅ Passed')
    return { success: true, output }
  } catch (error: any) {
    console.log('❌ Failed')
    const errorOutput = error.stdout || error.stderr || error.message
    console.log('Error output:', errorOutput)
    return { success: false, output: errorOutput, error: error.message }
  }
}

async function main() {
  console.log('🚀 Starting Environment Integration Test Suite')
  console.log('=' .repeat(60))

  // Step 1: Validate test environment
  console.log('\n📋 Step 1: Validating Test Environment')
  const validation = await validateTestEnvironment()
  printValidationResults(validation)

  if (!validation.valid) {
    console.error('❌ Test environment validation failed. Cannot proceed with tests.')
    process.exit(1)
  }

  // Step 2: Run test suites
  console.log('\n📋 Step 2: Running Test Suites')
  
  const results: Array<{ suite: TestSuite; result: Awaited<ReturnType<typeof runTestSuite>> }> = []
  let allPassed = true

  for (const suite of testSuites) {
    const result = await runTestSuite(suite)
    results.push({ suite, result })

    if (!result.success) {
      allPassed = false
      
      if (suite.required) {
        console.log(`❌ Required test suite '${suite.name}' failed. This is a critical failure.`)
      } else {
        console.log(`⚠️  Optional test suite '${suite.name}' failed. This is not critical.`)
      }
    }
  }

  // Step 3: Summary
  console.log('\n📊 Test Results Summary')
  console.log('=' .repeat(60))

  const passedCount = results.filter(r => r.result.success).length
  const failedCount = results.length - passedCount
  const requiredFailures = results.filter(r => !r.result.success && r.suite.required).length

  console.log(`Total Test Suites: ${results.length}`)
  console.log(`Passed: ${passedCount}`)
  console.log(`Failed: ${failedCount}`)
  console.log(`Required Failures: ${requiredFailures}`)

  // Detailed results
  console.log('\n📋 Detailed Results:')
  results.forEach(({ suite, result }) => {
    const status = result.success ? '✅' : '❌'
    const required = suite.required ? '[REQUIRED]' : '[OPTIONAL]'
    console.log(`  ${status} ${suite.name} ${required}`)
  })

  // Environment status
  console.log('\n🌍 Environment Status:')
  console.log(`  Phase.dev Connectivity: ${validation.phaseConnectivity ? '✅' : '❌'}`)
  console.log(`  Memory Configuration: ${validation.memoryConfigured ? '✅' : '❌'}`)
  console.log(`  Required Variables: ${validation.requiredVarsPresent ? '✅' : '❌'}`)

  // Recommendations
  if (!allPassed) {
    console.log('\n💡 Recommendations:')
    
    if (!validation.phaseConnectivity) {
      console.log('  - Check PHASE_SERVICE_TOKEN is valid and Phase.dev service is accessible')
    }
    
    if (!validation.memoryConfigured) {
      console.log('  - Ensure NODE_OPTIONS includes --max-old-space-size=8192 or higher')
    }
    
    if (!validation.requiredVarsPresent) {
      console.log('  - Set required environment variables (PHASE_SERVICE_TOKEN, etc.)')
    }

    results.forEach(({ suite, result }) => {
      if (!result.success && suite.required) {
        console.log(`  - Fix issues in required test suite: ${suite.name}`)
      }
    })
  }

  // Exit with appropriate code
  if (requiredFailures > 0) {
    console.log('\n❌ Critical test failures detected. Environment integration is not working properly.')
    process.exit(1)
  } else if (failedCount > 0) {
    console.log('\n⚠️  Some optional tests failed, but core functionality is working.')
    process.exit(0)
  } else {
    console.log('\n✅ All tests passed! Environment integration is working correctly.')
    process.exit(0)
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason)
  process.exit(1)
})

// Run the test suite
main().catch((error) => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})