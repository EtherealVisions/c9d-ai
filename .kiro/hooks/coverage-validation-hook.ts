import { execSync } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

/**
 * Coverage Validation Hook
 * Automatically validates coverage thresholds before task completion
 */

export interface CoverageValidationResult {
  success: boolean
  message: string
  details?: string
  coverageData?: any
}

export class CoverageValidationHook {
  private rootDir: string
  private webAppDir: string

  constructor() {
    this.rootDir = process.cwd()
    this.webAppDir = path.join(this.rootDir, 'apps/web')
  }

  /**
   * Main hook execution - validates coverage before task completion
   */
  async execute(): Promise<CoverageValidationResult> {
    console.log('🎯 Executing coverage validation hook...')

    try {
      // Step 1: Run comprehensive coverage analysis
      const coverageResults = await this.runCoverageAnalysis()

      // Step 2: Validate coverage thresholds
      const validationResults = await this.validateCoverageThresholds()

      // Step 3: Generate coverage report
      await this.generateCoverageReport(validationResults)

      if (validationResults.passed) {
        return {
          success: true,
          message: '✅ Coverage validation passed - task completion approved',
          coverageData: validationResults
        }
      } else {
        return {
          success: false,
          message: '❌ CRITICAL: Coverage thresholds not met - task completion BLOCKED',
          details: this.formatCoverageViolations(validationResults.thresholdViolations),
          coverageData: validationResults
        }
      }

    } catch (error) {
      return {
        success: false,
        message: '❌ Coverage validation failed due to error',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Run comprehensive coverage analysis across all test types
   */
  private async runCoverageAnalysis(): Promise<void> {
    console.log('📊 Running comprehensive coverage analysis...')

    // Run unit tests with coverage
    try {
      execSync('pnpm test:coverage', {
        cwd: this.webAppDir,
        stdio: 'pipe'
      })
      console.log('✅ Unit test coverage completed')
    } catch (error) {
      console.error('❌ Unit test coverage failed:', error)
      throw new Error('Unit test coverage failed')
    }

    // Run integration tests with coverage (if available)
    try {
      execSync('pnpm test:integration --coverage', {
        cwd: this.webAppDir,
        stdio: 'pipe'
      })
      console.log('✅ Integration test coverage completed')
    } catch (error) {
      console.warn('⚠️ Integration test coverage not available, continuing...')
    }
  }

  /**
   * Validate coverage thresholds using the coverage reporter
   */
  private async validateCoverageThresholds(): Promise<any> {
    console.log('🎯 Validating coverage thresholds...')

    try {
      const result = execSync('node scripts/coverage-reporter.js validate', {
        cwd: this.rootDir,
        stdio: 'pipe',
        encoding: 'utf8'
      })

      return JSON.parse(result)
    } catch (error) {
      // If the script exits with non-zero code, it means thresholds weren't met
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout)
        } catch (parseError) {
          throw new Error('Failed to parse coverage validation results')
        }
      }
      throw error
    }
  }

  /**
   * Generate comprehensive coverage report
   */
  private async generateCoverageReport(validationResults: any): Promise<void> {
    console.log('📄 Generating coverage report...')

    try {
      execSync('node scripts/coverage-reporter.js generate', {
        cwd: this.rootDir,
        stdio: 'pipe'
      })
      console.log('✅ Coverage report generated')
    } catch (error) {
      console.warn('⚠️ Coverage report generation failed, continuing...')
    }
  }

  /**
   * Format coverage violations for display
   */
  private formatCoverageViolations(violations: any[]): string {
    if (!violations || violations.length === 0) {
      return 'No specific violations found'
    }

    const formatted = violations.map(violation => {
      const moduleInfo = violation.module ? ` in ${violation.module}` : ''
      return `• ${violation.type} ${violation.metric}${moduleInfo}: ${violation.actual}% < ${violation.expected}%`
    }).join('\n')

    return `Coverage threshold violations:\n${formatted}\n\nRun 'pnpm coverage:report' for detailed analysis.`
  }

  /**
   * Get coverage summary for display
   */
  async getCoverageSummary(): Promise<any> {
    try {
      const summaryPath = path.join(this.webAppDir, 'test-results', 'coverage-summary.json')
      const summaryContent = await fs.readFile(summaryPath, 'utf8')
      return JSON.parse(summaryContent)
    } catch (error) {
      return null
    }
  }
}

/**
 * Hook configuration for Kiro
 */
export const coverageValidationHookConfig = {
  name: 'Coverage Validation',
  description: 'Validates coverage thresholds before task completion',
  trigger: 'pre-task-completion',
  category: 'quality-assurance',
  priority: 'critical',
  
  async execute(): Promise<CoverageValidationResult> {
    const hook = new CoverageValidationHook()
    return await hook.execute()
  },

  // Configuration options
  options: {
    enforceThresholds: true,
    blockTaskCompletion: true,
    generateReports: true,
    showDetailedViolations: true
  },

  // Help text
  help: `
This hook validates test coverage before allowing task completion.

Coverage Requirements:
- Global: 85% minimum (branches, functions, lines, statements)
- Critical modules: 100% (services, models, API routes)
- Important modules: 95% (UI components, utils, hooks)
- Standard modules: 90% (components, pages)

Commands:
- pnpm coverage:report - Generate detailed coverage report
- pnpm coverage:validate - Validate coverage thresholds
- node scripts/coverage-reporter.js generate - Full coverage analysis

If coverage thresholds are not met, task completion will be BLOCKED.
  `
}

// Export for direct usage
export default coverageValidationHookConfig