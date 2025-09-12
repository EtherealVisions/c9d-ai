/**
 * Test Runner for Comprehensive Test Suite
 * Provides utilities for running and organizing tests systematically
 */

import { execSync } from 'child_process'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

interface TestResult {
  file: string
  passed: number
  failed: number
  total: number
  duration: number
  errors: string[]
}

interface TestSuite {
  name: string
  pattern: string
  description: string
}

export class TestRunner {
  private results: TestResult[] = []
  
  private testSuites: TestSuite[] = [
    {
      name: 'Integration Tests',
      pattern: '__tests__/integration/**/*.test.ts',
      description: 'Complete authentication and authorization flows'
    },
    {
      name: 'End-to-End Tests',
      pattern: '__tests__/e2e/**/*.test.ts',
      description: 'User registration, organization creation, and role management'
    },
    {
      name: 'Performance Tests',
      pattern: '__tests__/performance/**/*.test.ts',
      description: 'Permission checking and context switching performance'
    },
    {
      name: 'API Tests',
      pattern: '__tests__/api/**/*.test.ts',
      description: 'API endpoint testing with OpenAPI validation'
    },
    {
      name: 'Service Tests',
      pattern: '__tests__/services/**/*.test.ts',
      description: 'Service layer unit tests'
    },
    {
      name: 'Component Tests',
      pattern: 'components/__tests__/**/*.test.tsx',
      description: 'React component tests'
    }
  ]

  async runTestSuite(suiteName: string): Promise<TestResult[]> {
    const suite = this.testSuites.find(s => s.name === suiteName)
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`)
    }

    console.log(`\n🧪 Running ${suite.name}...`)
    console.log(`📝 ${suite.description}`)
    
    try {
      const output = execSync(
        `npm run test:run -- ${suite.pattern}`,
        { 
          encoding: 'utf8',
          cwd: process.cwd(),
          timeout: 60000 // 1 minute timeout
        }
      )
      
      return this.parseTestOutput(output, suite.name)
    } catch (error: any) {
      console.error(`❌ Test suite '${suiteName}' failed:`, error.message)
      return this.parseTestOutput(error.stdout || '', suite.name)
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Test Suite...\n')
    
    const startTime = Date.now()
    let totalPassed = 0
    let totalFailed = 0
    
    for (const suite of this.testSuites) {
      try {
        const results = await this.runTestSuite(suite.name)
        this.results.push(...results)
        
        const suitePassed = results.reduce((sum, r) => sum + r.passed, 0)
        const suiteFailed = results.reduce((sum, r) => sum + r.failed, 0)
        
        totalPassed += suitePassed
        totalFailed += suiteFailed
        
        console.log(`✅ ${suite.name}: ${suitePassed} passed, ${suiteFailed} failed`)
      } catch (error) {
        console.error(`❌ Failed to run ${suite.name}:`, error)
      }
    }
    
    const duration = Date.now() - startTime
    
    console.log('\n📊 Test Suite Summary:')
    console.log(`⏱️  Total Duration: ${duration}ms`)
    console.log(`✅ Total Passed: ${totalPassed}`)
    console.log(`❌ Total Failed: ${totalFailed}`)
    console.log(`📈 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`)
    
    this.generateReport()
  }

  private parseTestOutput(output: string, suiteName: string): TestResult[] {
    const results: TestResult[] = []
    
    // Parse vitest output format
    const lines = output.split('\n')
    let currentFile = ''
    let passed = 0
    let failed = 0
    let errors: string[] = []
    
    for (const line of lines) {
      if (line.includes('.test.')) {
        if (currentFile) {
          results.push({
            file: currentFile,
            passed,
            failed,
            total: passed + failed,
            duration: 0,
            errors: [...errors]
          })
        }
        
        currentFile = line.trim()
        passed = 0
        failed = 0
        errors = []
      }
      
      if (line.includes('✓') || line.includes('PASS')) {
        passed++
      }
      
      if (line.includes('✗') || line.includes('FAIL')) {
        failed++
        errors.push(line.trim())
      }
    }
    
    // Add the last file
    if (currentFile) {
      results.push({
        file: currentFile,
        passed,
        failed,
        total: passed + failed,
        duration: 0,
        errors: [...errors]
      })
    }
    
    return results
  }

  private generateReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.results.length,
        totalTests: this.results.reduce((sum, r) => sum + r.total, 0),
        totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
        totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
        successRate: 0
      },
      suites: this.testSuites.map(suite => ({
        name: suite.name,
        description: suite.description,
        results: this.results.filter(r => r.file.includes(suite.pattern.replace('**/*', '')))
      })),
      failedTests: this.results.filter(r => r.failed > 0),
      recommendations: this.generateRecommendations()
    }
    
    report.summary.successRate = (report.summary.totalPassed / report.summary.totalTests) * 100
    
    const reportPath = join(process.cwd(), '__tests__', 'test-report.json')
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    const failureRate = this.results.filter(r => r.failed > 0).length / this.results.length
    
    if (failureRate > 0.3) {
      recommendations.push('High failure rate detected. Consider reviewing test setup and mocking strategies.')
    }
    
    if (this.results.some(r => r.errors.some(e => e.includes('jest')))) {
      recommendations.push('Jest references found. Complete migration to Vitest.')
    }
    
    if (this.results.some(r => r.errors.some(e => e.includes('mock')))) {
      recommendations.push('Mock-related failures detected. Review mock implementations.')
    }
    
    if (this.results.some(r => r.errors.some(e => e.includes('timeout')))) {
      recommendations.push('Timeout errors detected. Consider increasing test timeouts or optimizing async operations.')
    }
    
    return recommendations
  }

  listTestSuites(): void {
    console.log('📋 Available Test Suites:\n')
    this.testSuites.forEach((suite, index) => {
      console.log(`${index + 1}. ${suite.name}`)
      console.log(`   📝 ${suite.description}`)
      console.log(`   🔍 Pattern: ${suite.pattern}\n`)
    })
  }
}

// CLI interface
if (require.main === module) {
  const runner = new TestRunner()
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    runner.runAllTests()
  } else if (args[0] === 'list') {
    runner.listTestSuites()
  } else {
    runner.runTestSuite(args[0])
  }
}