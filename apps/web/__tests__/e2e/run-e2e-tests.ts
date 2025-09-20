#!/usr/bin/env tsx

/**
 * Comprehensive E2E Test Runner
 * 
 * This script runs all E2E tests with proper setup, validation, and reporting.
 * It ensures the application is ready for testing and provides detailed results.
 */

import { execSync } from 'child_process'
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'

interface TestResult {
  suite: string
  passed: number
  failed: number
  skipped: number
  duration: number
  errors: string[]
}

interface TestReport {
  timestamp: string
  environment: string
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  totalDuration: number
  suites: TestResult[]
  summary: string
  recommendations: string[]
}

class E2ETestRunner {
  private results: TestResult[] = []
  private startTime: number = 0
  private baseUrl: string
  private headless: boolean
  private browser: string
  private workers: number

  constructor(options: {
    baseUrl?: string
    headless?: boolean
    browser?: string
    workers?: number
  } = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3007'
    this.headless = options.headless !== false
    this.browser = options.browser || 'chromium'
    this.workers = options.workers || 1
  }

  /**
   * Run all E2E tests
   */
  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting comprehensive E2E test suite...')
    this.startTime = Date.now()

    try {
      // Pre-flight checks
      await this.preflightChecks()

      // Run test suites
      await this.runTestSuite('Authentication Flows', 'auth-flows.e2e.test.ts')
      await this.runTestSuite('Onboarding Flows', 'onboarding-flows.e2e.test.ts')
      await this.runTestSuite('Dashboard Navigation', 'dashboard-navigation.e2e.test.ts')
      await this.runTestSuite('Error Handling', 'error-handling.e2e.test.ts')

      // Generate report
      const report = this.generateReport()
      await this.saveReport(report)

      return report

    } catch (error) {
      console.error('❌ E2E test suite failed:', error)
      throw error
    }
  }

  /**
   * Pre-flight checks to ensure environment is ready
   */
  private async preflightChecks(): Promise<void> {
    console.log('🔍 Running pre-flight checks...')

    // Check if application is running
    try {
      const response = await fetch(this.baseUrl)
      if (!response.ok) {
        throw new Error(`Application not responding at ${this.baseUrl}`)
      }
      console.log('✅ Application is running')
    } catch (error) {
      console.error('❌ Application is not accessible')
      throw new Error(`Cannot reach application at ${this.baseUrl}. Please start the development server.`)
    }

    // Check Playwright installation
    try {
      execSync('npx playwright --version', { stdio: 'pipe' })
      console.log('✅ Playwright is installed')
    } catch (error) {
      console.error('❌ Playwright is not installed')
      throw new Error('Playwright is not installed. Run: npm install @playwright/test')
    }

    // Check test files exist
    const testFiles = [
      'auth-flows.e2e.test.ts',
      'onboarding-flows.e2e.test.ts',
      'dashboard-navigation.e2e.test.ts',
      'error-handling.e2e.test.ts'
    ]

    for (const file of testFiles) {
      const filePath = join(__dirname, file)
      if (!existsSync(filePath)) {
        throw new Error(`Test file not found: ${file}`)
      }
    }
    console.log('✅ All test files are present')

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    if (missingVars.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`)
      console.warn('Some tests may fail due to missing configuration')
    } else {
      console.log('✅ Required environment variables are set')
    }

    console.log('✅ Pre-flight checks completed')
  }

  /**
   * Run a specific test suite
   */
  private async runTestSuite(suiteName: string, fileName: string): Promise<void> {
    console.log(`\n📋 Running ${suiteName}...`)
    const startTime = Date.now()

    try {
      const command = [
        'npx playwright test',
        `__tests__/e2e/${fileName}`,
        `--project=${this.browser}`,
        `--workers=${this.workers}`,
        this.headless ? '--headed=false' : '--headed',
        '--reporter=json'
      ].join(' ')

      const result = execSync(command, { 
        stdio: 'pipe',
        encoding: 'utf-8',
        cwd: process.cwd()
      })

      // Parse Playwright JSON output
      const testResult = this.parsePlaywrightResult(result, suiteName)
      testResult.duration = Date.now() - startTime

      this.results.push(testResult)

      console.log(`✅ ${suiteName} completed: ${testResult.passed} passed, ${testResult.failed} failed`)

    } catch (error) {
      const duration = Date.now() - startTime
      const errorResult: TestResult = {
        suite: suiteName,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        errors: [error instanceof Error ? error.message : String(error)]
      }

      this.results.push(errorResult)
      console.error(`❌ ${suiteName} failed:`, error)
    }
  }

  /**
   * Parse Playwright JSON result
   */
  private parsePlaywrightResult(output: string, suiteName: string): TestResult {
    try {
      const result = JSON.parse(output)
      
      return {
        suite: suiteName,
        passed: result.stats?.passed || 0,
        failed: result.stats?.failed || 0,
        skipped: result.stats?.skipped || 0,
        duration: result.stats?.duration || 0,
        errors: result.errors || []
      }
    } catch (error) {
      // Fallback parsing if JSON is malformed
      const lines = output.split('\n')
      const passedMatch = output.match(/(\d+) passed/)
      const failedMatch = output.match(/(\d+) failed/)
      const skippedMatch = output.match(/(\d+) skipped/)

      return {
        suite: suiteName,
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
        duration: 0,
        errors: lines.filter(line => line.includes('Error:') || line.includes('Failed:'))
      }
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): TestReport {
    const totalDuration = Date.now() - this.startTime
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0)
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0)

    const passRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : '0'
    
    let summary = `E2E Test Results: ${totalPassed}/${totalTests} tests passed (${passRate}%)`
    if (totalFailed > 0) {
      summary += `, ${totalFailed} failed`
    }
    if (totalSkipped > 0) {
      summary += `, ${totalSkipped} skipped`
    }

    const recommendations = this.generateRecommendations()

    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      suites: this.results,
      summary,
      recommendations
    }
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = []

    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0)
    const passRate = totalTests > 0 ? (this.results.reduce((sum, r) => sum + r.passed, 0) / totalTests) : 0

    if (totalFailed > 0) {
      recommendations.push('Review failed tests and fix underlying issues before deployment')
    }

    if (passRate < 0.9) {
      recommendations.push('Test pass rate is below 90% - investigate and improve test reliability')
    }

    const authSuite = this.results.find(r => r.suite.includes('Authentication'))
    if (authSuite && authSuite.failed > 0) {
      recommendations.push('Authentication tests are failing - verify Clerk configuration and test credentials')
    }

    const errorSuite = this.results.find(r => r.suite.includes('Error'))
    if (errorSuite && errorSuite.failed > 0) {
      recommendations.push('Error handling tests are failing - improve application error handling and recovery')
    }

    const slowSuites = this.results.filter(r => r.duration > 60000) // > 1 minute
    if (slowSuites.length > 0) {
      recommendations.push(`Slow test suites detected: ${slowSuites.map(s => s.suite).join(', ')} - optimize test performance`)
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests are passing! Consider adding more edge case coverage.')
    }

    return recommendations
  }

  /**
   * Save test report to file
   */
  private async saveReport(report: TestReport): Promise<void> {
    const reportPath = join(process.cwd(), 'apps/web/test-results/e2e-test-report.json')
    const htmlReportPath = join(process.cwd(), 'apps/web/test-results/e2e-test-report.html')

    // Save JSON report
    writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report)
    writeFileSync(htmlReportPath, htmlReport)

    console.log(`\n📊 Test report saved to: ${reportPath}`)
    console.log(`📊 HTML report saved to: ${htmlReportPath}`)
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: TestReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .suite { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .suite-header { background: #f8f9fa; padding: 10px; font-weight: bold; }
        .suite-content { padding: 15px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; }
        .error { background: #f8d7da; padding: 10px; border-radius: 3px; margin: 5px 0; font-family: monospace; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>E2E Test Report</h1>
            <p>Generated: ${report.timestamp}</p>
            <p>Environment: ${report.environment}</p>
        </div>
        
        <div class="summary">
            <h2>Summary</h2>
            <p>${report.summary}</p>
            <p>Total Duration: ${(report.totalDuration / 1000).toFixed(1)}s</p>
        </div>
        
        <div class="suites">
            <h2>Test Suites</h2>
            ${report.suites.map(suite => `
                <div class="suite">
                    <div class="suite-header">${suite.suite}</div>
                    <div class="suite-content">
                        <p>
                            <span class="passed">✅ ${suite.passed} passed</span> | 
                            <span class="failed">❌ ${suite.failed} failed</span> | 
                            <span class="skipped">⏭️ ${suite.skipped} skipped</span>
                        </p>
                        <p>Duration: ${(suite.duration / 1000).toFixed(1)}s</p>
                        ${suite.errors.length > 0 ? `
                            <h4>Errors:</h4>
                            ${suite.errors.map(error => `<div class="error">${error}</div>`).join('')}
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h2>Recommendations</h2>
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
</body>
</html>
    `
  }

  /**
   * Print summary to console
   */
  printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 E2E TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Tests: ${report.totalTests}`)
    console.log(`✅ Passed: ${report.totalPassed}`)
    console.log(`❌ Failed: ${report.totalFailed}`)
    console.log(`⏭️  Skipped: ${report.totalSkipped}`)
    console.log(`⏱️  Duration: ${(report.totalDuration / 1000).toFixed(1)}s`)
    console.log(`📈 Pass Rate: ${report.totalTests > 0 ? (report.totalPassed / report.totalTests * 100).toFixed(1) : 0}%`)
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:')
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`)
      })
    }
    
    console.log('='.repeat(60))
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const options = {
    baseUrl: args.includes('--base-url') ? args[args.indexOf('--base-url') + 1] : undefined,
    headless: !args.includes('--headed'),
    browser: args.includes('--browser') ? args[args.indexOf('--browser') + 1] : 'chromium',
    workers: args.includes('--workers') ? parseInt(args[args.indexOf('--workers') + 1]) : 1
  }

  const runner = new E2ETestRunner(options)
  
  try {
    const report = await runner.runAllTests()
    runner.printSummary(report)
    
    // Exit with error code if tests failed
    if (report.totalFailed > 0) {
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ E2E test execution failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { E2ETestRunner, type TestReport, type TestResult }