#!/usr/bin/env tsx
/**
 * Comprehensive Test Runner
 * Runs both mocked and real integration tests based on configuration
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

interface TestSuite {
  name: string
  pattern: string
  description: string
  requiresRealServices?: boolean
  services?: string[]
}

interface TestResults {
  suite: string
  passed: number
  failed: number
  total: number
  duration: number
  status: 'passed' | 'failed' | 'skipped'
}

class ComprehensiveTestRunner {
  private results: TestResults[] = []
  
  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests',
      pattern: '__tests__/**/*.test.ts __tests__/**/*.test.tsx',
      description: 'Unit tests with mocked dependencies',
      requiresRealServices: false
    },
    {
      name: 'Mocked Integration Tests',
      pattern: '__tests__/integration/auth-flow-fixed.integration.test.ts',
      description: 'Integration tests with comprehensive mocking',
      requiresRealServices: false
    },
    {
      name: 'Real Database Integration Tests',
      pattern: '__tests__/integration/real-database-integration.test.ts',
      description: 'Tests against actual database',
      requiresRealServices: true,
      services: ['database']
    },
    {
      name: 'Real Clerk Integration Tests',
      pattern: '__tests__/integration/real-clerk-integration.test.ts',
      description: 'Tests against actual Clerk API',
      requiresRealServices: true,
      services: ['clerk']
    },
    {
      name: 'End-to-End Tests',
      pattern: '__tests__/e2e/**/*.e2e.test.ts',
      description: 'Complete user workflow tests',
      requiresRealServices: false
    },
    {
      name: 'Performance Tests',
      pattern: '__tests__/performance/**/*.test.ts',
      description: 'Performance and load testing',
      requiresRealServices: false
    }
  ]

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Test Suite...\n')
    
    // Check environment configuration
    this.checkEnvironmentConfiguration()
    
    const startTime = Date.now()
    let totalPassed = 0
    let totalFailed = 0
    let totalSkipped = 0
    
    for (const suite of this.testSuites) {
      const result = await this.runTestSuite(suite)
      this.results.push(result)
      
      switch (result.status) {
        case 'passed':
          totalPassed += result.total
          break
        case 'failed':
          totalFailed += result.failed
          totalPassed += result.passed
          break
        case 'skipped':
          totalSkipped += result.total
          break
      }
    }
    
    const totalDuration = Date.now() - startTime
    
    // Generate comprehensive report
    this.generateReport(totalPassed, totalFailed, totalSkipped, totalDuration)
  }

  private checkEnvironmentConfiguration(): void {
    console.log('🔍 Checking test environment configuration...\n')
    
    // Check for test environment file
    const testEnvPath = join(process.cwd(), '.env.test.local')
    if (!existsSync(testEnvPath)) {
      console.log('⚠️  No .env.test.local file found. Real integration tests will be skipped.')
      console.log('   Copy .env.test to .env.test.local and configure your test credentials.\n')
    }
    
    // Check available services
    const hasDatabase = !!(process.env.TEST_DATABASE_URL && process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)
    const hasClerk = !!process.env.TEST_CLERK_SECRET_KEY
    
    console.log('📋 Available test services:')
    console.log(`   Database: ${hasDatabase ? '✅ Configured' : '❌ Not configured'}`)
    console.log(`   Clerk: ${hasClerk ? '✅ Configured' : '❌ Not configured'}`)
    console.log(`   Mocked Services: ✅ Always available\n`)
    
    if (!hasDatabase && !hasClerk) {
      console.log('ℹ️  Running with mocked services only. Configure real services for full integration testing.\n')
    }
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResults> {
    console.log(`\n🧪 Running ${suite.name}...`)
    console.log(`📝 ${suite.description}`)
    
    // Check if suite requires real services
    if (suite.requiresRealServices && suite.services) {
      const availableServices = this.getAvailableServices()
      const missingServices = suite.services.filter(service => !availableServices.includes(service))
      
      if (missingServices.length > 0) {
        console.log(`⏭️  Skipping - Missing services: ${missingServices.join(', ')}`)
        return {
          suite: suite.name,
          passed: 0,
          failed: 0,
          total: 0,
          duration: 0,
          status: 'skipped'
        }
      }
    }
    
    try {
      const startTime = Date.now()
      
      // Run the test suite
      const output = execSync(
        `npm run test:run -- ${suite.pattern}`,
        { 
          encoding: 'utf8',
          cwd: process.cwd(),
          timeout: 300000 // 5 minute timeout
        }
      )
      
      const duration = Date.now() - startTime
      const result = this.parseTestOutput(output, suite.name, duration)
      
      console.log(`✅ ${suite.name}: ${result.passed} passed, ${result.failed} failed (${duration}ms)`)
      
      return result
    } catch (error: any) {
      const duration = Date.now() - Date.now()
      console.log(`❌ ${suite.name}: Failed to execute`)
      
      // Try to parse output from error
      const output = error.stdout || error.message || ''
      const result = this.parseTestOutput(output, suite.name, duration)
      
      if (result.total === 0) {
        // If we couldn't parse any results, mark as failed
        return {
          suite: suite.name,
          passed: 0,
          failed: 1,
          total: 1,
          duration,
          status: 'failed'
        }
      }
      
      return result
    }
  }

  private getAvailableServices(): string[] {
    const services: string[] = []
    
    if (process.env.TEST_DATABASE_URL && process.env.TEST_SUPABASE_SERVICE_ROLE_KEY) {
      services.push('database')
    }
    
    if (process.env.TEST_CLERK_SECRET_KEY) {
      services.push('clerk')
    }
    
    return services
  }

  private parseTestOutput(output: string, suiteName: string, duration: number): TestResults {
    // Parse vitest output format
    const lines = output.split('\n')
    let passed = 0
    let failed = 0
    let total = 0
    
    // Look for test summary line
    for (const line of lines) {
      if (line.includes('Tests') && (line.includes('passed') || line.includes('failed'))) {
        const passedMatch = line.match(/(\d+) passed/)
        const failedMatch = line.match(/(\d+) failed/)
        
        if (passedMatch) passed = parseInt(passedMatch[1])
        if (failedMatch) failed = parseInt(failedMatch[1])
        
        total = passed + failed
        break
      }
    }
    
    // If no summary found, try to count individual test results
    if (total === 0) {
      for (const line of lines) {
        if (line.includes('✓')) passed++
        if (line.includes('✗') || line.includes('FAIL')) failed++
      }
      total = passed + failed
    }
    
    const status: 'passed' | 'failed' | 'skipped' = failed > 0 ? 'failed' : (total > 0 ? 'passed' : 'skipped')
    
    return {
      suite: suiteName,
      passed,
      failed,
      total,
      duration,
      status
    }
  }

  private generateReport(totalPassed: number, totalFailed: number, totalSkipped: number, totalDuration: number): void {
    console.log('\n' + '='.repeat(80))
    console.log('📊 COMPREHENSIVE TEST SUITE RESULTS')
    console.log('='.repeat(80))
    
    // Overall summary
    const totalTests = totalPassed + totalFailed + totalSkipped
    const successRate = totalTests > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100) : 0
    
    console.log(`\n📈 Overall Results:`)
    console.log(`   Total Tests: ${totalTests}`)
    console.log(`   ✅ Passed: ${totalPassed}`)
    console.log(`   ❌ Failed: ${totalFailed}`)
    console.log(`   ⏭️  Skipped: ${totalSkipped}`)
    console.log(`   📊 Success Rate: ${successRate.toFixed(1)}%`)
    console.log(`   ⏱️  Total Duration: ${totalDuration}ms`)
    
    // Suite breakdown
    console.log(`\n📋 Suite Breakdown:`)
    for (const result of this.results) {
      const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'
      console.log(`   ${statusIcon} ${result.suite}: ${result.passed}/${result.total} passed (${result.duration}ms)`)
    }
    
    // Test type analysis
    const mockedTests = this.results.filter(r => !this.testSuites.find(s => s.name === r.suite)?.requiresRealServices)
    const realIntegrationTests = this.results.filter(r => this.testSuites.find(s => s.name === r.suite)?.requiresRealServices)
    
    console.log(`\n🔍 Test Type Analysis:`)
    console.log(`   Mocked Tests: ${mockedTests.reduce((sum, r) => sum + r.total, 0)} tests`)
    console.log(`   Real Integration Tests: ${realIntegrationTests.reduce((sum, r) => sum + r.total, 0)} tests`)
    
    // Recommendations
    console.log(`\n💡 Recommendations:`)
    
    if (totalFailed > 0) {
      console.log(`   🔧 Fix ${totalFailed} failing tests to improve reliability`)
    }
    
    if (totalSkipped > 0) {
      console.log(`   ⚙️  Configure real services to run ${totalSkipped} skipped integration tests`)
    }
    
    if (successRate === 100 && totalFailed === 0) {
      console.log(`   🎉 Excellent! All tests are passing. Consider adding more edge case tests.`)
    }
    
    // Final status
    console.log('\n' + '='.repeat(80))
    if (totalFailed === 0 && totalPassed > 0) {
      console.log('🎉 TEST SUITE STATUS: ✅ ALL TESTS PASSING')
    } else if (totalFailed > 0) {
      console.log('⚠️  TEST SUITE STATUS: ❌ SOME TESTS FAILING')
    } else {
      console.log('❓ TEST SUITE STATUS: ⏭️  NO TESTS EXECUTED')
    }
    console.log('='.repeat(80))
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const runner = new ComprehensiveTestRunner()
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Comprehensive Test Runner

Usage: npm run test:comprehensive [options]

Options:
  --help, -h     Show this help message
  
Environment Variables:
  TEST_DATABASE_URL              Test database URL for real integration tests
  TEST_SUPABASE_SERVICE_ROLE_KEY Service role key for database tests
  TEST_CLERK_SECRET_KEY          Clerk secret key for authentication tests
  
Examples:
  npm run test:comprehensive                    # Run all available tests
  TEST_DATABASE_URL=... npm run test:comprehensive  # Run with real database tests
`)
    return
  }
  
  try {
    await runner.runAllTests()
  } catch (error) {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { ComprehensiveTestRunner }