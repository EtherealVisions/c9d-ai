/**
 * Coverage Validation Script
 * Validates test coverage meets required thresholds
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

interface CoverageThresholds {
  services: number
  models: number
  apiRoutes: number
  components: number
  overall: number
}

interface CoverageReport {
  total: {
    lines: { pct: number }
    functions: { pct: number }
    branches: { pct: number }
    statements: { pct: number }
  }
  [key: string]: any
}

const COVERAGE_THRESHOLDS: CoverageThresholds = {
  services: 100,    // Critical business logic
  models: 95,       // Data layer
  apiRoutes: 90,    // External interfaces
  components: 85,   // UI components
  overall: 85       // Global minimum
}

class CoverageValidator {
  private coverageReport: CoverageReport | null = null

  async validateCoverage(): Promise<{
    success: boolean
    report: string
    missingTests: string[]
    recommendations: string[]
  }> {
    console.log('🔍 Starting coverage validation...')

    try {
      // Run tests with coverage
      console.log('📊 Running tests with coverage...')
      execSync('pnpm test:coverage', { 
        stdio: 'inherit',
        cwd: process.cwd()
      })

      // Load coverage report
      this.loadCoverageReport()

      // Validate thresholds
      const validation = this.validateThresholds()
      const missingTests = this.identifyMissingTests()
      const recommendations = this.generateRecommendations(validation)

      return {
        success: validation.overall.success,
        report: this.generateReport(validation),
        missingTests,
        recommendations
      }

    } catch (error) {
      console.error('❌ Coverage validation failed:', error)
      return {
        success: false,
        report: `Coverage validation failed: ${error}`,
        missingTests: [],
        recommendations: ['Fix test infrastructure before proceeding']
      }
    }
  }

  private loadCoverageReport(): void {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json')
    
    if (!existsSync(coveragePath)) {
      throw new Error('Coverage report not found. Run tests with coverage first.')
    }

    try {
      const reportContent = readFileSync(coveragePath, 'utf-8')
      this.coverageReport = JSON.parse(reportContent)
    } catch (error) {
      throw new Error(`Failed to parse coverage report: ${error}`)
    }
  }

  private validateThresholds() {
    if (!this.coverageReport) {
      throw new Error('Coverage report not loaded')
    }

    const results = {
      services: this.validateModuleCoverage('lib/services/', COVERAGE_THRESHOLDS.services),
      models: this.validateModuleCoverage('lib/models/', COVERAGE_THRESHOLDS.models),
      apiRoutes: this.validateModuleCoverage('app/api/', COVERAGE_THRESHOLDS.apiRoutes),
      components: this.validateModuleCoverage('components/', COVERAGE_THRESHOLDS.components),
      overall: this.validateOverallCoverage()
    }

    return results
  }

  private validateModuleCoverage(modulePath: string, threshold: number) {
    if (!this.coverageReport) return { success: false, coverage: 0, threshold }

    let totalLines = 0
    let coveredLines = 0

    // Aggregate coverage for all files in the module
    Object.entries(this.coverageReport).forEach(([filePath, coverage]: [string, any]) => {
      if (filePath.includes(modulePath) && coverage.lines) {
        totalLines += coverage.lines.total || 0
        coveredLines += coverage.lines.covered || 0
      }
    })

    const coveragePercentage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
    
    return {
      success: coveragePercentage >= threshold,
      coverage: Math.round(coveragePercentage * 100) / 100,
      threshold,
      totalLines,
      coveredLines
    }
  }

  private validateOverallCoverage() {
    if (!this.coverageReport?.total) {
      return { success: false, coverage: 0, threshold: COVERAGE_THRESHOLDS.overall }
    }

    const coverage = this.coverageReport.total.lines.pct
    
    return {
      success: coverage >= COVERAGE_THRESHOLDS.overall,
      coverage,
      threshold: COVERAGE_THRESHOLDS.overall
    }
  }

  private identifyMissingTests(): string[] {
    if (!this.coverageReport) return []

    const missingTests: string[] = []

    // Find files with low or no coverage
    Object.entries(this.coverageReport).forEach(([filePath, coverage]: [string, any]) => {
      if (filePath === 'total') return

      const lineCoverage = coverage.lines?.pct || 0
      
      if (lineCoverage < 50) {
        missingTests.push(`${filePath} (${lineCoverage}% coverage)`)
      }
    })

    return missingTests.slice(0, 20) // Limit to top 20 for readability
  }

  private generateRecommendations(validation: any): string[] {
    const recommendations: string[] = []

    if (!validation.services.success) {
      recommendations.push(
        `🔧 Services coverage is ${validation.services.coverage}% (target: ${validation.services.threshold}%). ` +
        'Add comprehensive unit tests for all service methods.'
      )
    }

    if (!validation.models.success) {
      recommendations.push(
        `📊 Models coverage is ${validation.models.coverage}% (target: ${validation.models.threshold}%). ` +
        'Add validation tests for all data models and schemas.'
      )
    }

    if (!validation.apiRoutes.success) {
      recommendations.push(
        `🌐 API routes coverage is ${validation.apiRoutes.coverage}% (target: ${validation.apiRoutes.threshold}%). ` +
        'Add integration tests for all API endpoints.'
      )
    }

    if (!validation.components.success) {
      recommendations.push(
        `⚛️ Components coverage is ${validation.components.coverage}% (target: ${validation.components.threshold}%). ` +
        'Add component tests for rendering, interactions, and edge cases.'
      )
    }

    if (!validation.overall.success) {
      recommendations.push(
        `📈 Overall coverage is ${validation.overall.coverage}% (target: ${validation.overall.threshold}%). ` +
        'Focus on testing critical paths and error scenarios.'
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All coverage thresholds met! Consider adding more edge case tests.')
    }

    return recommendations
  }

  private generateReport(validation: any): string {
    const sections = [
      '# Coverage Validation Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Coverage by Module',
      '',
      `### Services (Target: ${COVERAGE_THRESHOLDS.services}%)`,
      `- Coverage: ${validation.services.coverage}%`,
      `- Status: ${validation.services.success ? '✅ PASS' : '❌ FAIL'}`,
      `- Lines: ${validation.services.coveredLines}/${validation.services.totalLines}`,
      '',
      `### Models (Target: ${COVERAGE_THRESHOLDS.models}%)`,
      `- Coverage: ${validation.models.coverage}%`,
      `- Status: ${validation.models.success ? '✅ PASS' : '❌ FAIL'}`,
      `- Lines: ${validation.models.coveredLines}/${validation.models.totalLines}`,
      '',
      `### API Routes (Target: ${COVERAGE_THRESHOLDS.apiRoutes}%)`,
      `- Coverage: ${validation.apiRoutes.coverage}%`,
      `- Status: ${validation.apiRoutes.success ? '✅ PASS' : '❌ FAIL'}`,
      `- Lines: ${validation.apiRoutes.coveredLines}/${validation.apiRoutes.totalLines}`,
      '',
      `### Components (Target: ${COVERAGE_THRESHOLDS.components}%)`,
      `- Coverage: ${validation.components.coverage}%`,
      `- Status: ${validation.components.success ? '✅ PASS' : '❌ FAIL'}`,
      `- Lines: ${validation.components.coveredLines}/${validation.components.totalLines}`,
      '',
      `### Overall (Target: ${COVERAGE_THRESHOLDS.overall}%)`,
      `- Coverage: ${validation.overall.coverage}%`,
      `- Status: ${validation.overall.success ? '✅ PASS' : '❌ FAIL'}`,
      '',
      '## Summary',
      `Overall Status: ${Object.values(validation).every((v: any) => v.success) ? '✅ ALL THRESHOLDS MET' : '❌ COVERAGE BELOW THRESHOLD'}`,
      ''
    ]

    return sections.join('\n')
  }
}

// CLI execution
if (require.main === module) {
  const validator = new CoverageValidator()
  
  validator.validateCoverage().then(result => {
    console.log('\n' + result.report)
    
    if (result.missingTests.length > 0) {
      console.log('\n🔍 Files needing test coverage:')
      result.missingTests.forEach(test => console.log(`  - ${test}`))
    }
    
    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      result.recommendations.forEach(rec => console.log(`  ${rec}`))
    }
    
    process.exit(result.success ? 0 : 1)
  }).catch(error => {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  })
}

export { CoverageValidator, COVERAGE_THRESHOLDS }