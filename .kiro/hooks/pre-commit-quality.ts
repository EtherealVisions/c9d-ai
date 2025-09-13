/**
 * Kiro Pre-Commit Quality Hook
 * 
 * This hook runs automatically before every commit to enforce quality standards.
 * It validates TypeScript compilation, tests, linting, and coverage requirements.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface QualityCheckResult {
  success: boolean;
  message: string;
  details?: string;
}

class PreCommitQualityHook {
  private errors: string[] = [];
  private warnings: string[] = [];

  private log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const colors = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      warning: '\x1b[33m', // yellow
      error: '\x1b[31m',   // red
      reset: '\x1b[0m'
    };

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    console.log(`${colors[type]}${icons[type]} ${message}${colors.reset}`);
  }

  private async runCommand(command: string, description: string): Promise<QualityCheckResult> {
    try {
      this.log(`Running: ${description}`, 'info');
      
      const output = execSync(command, { 
        cwd: process.cwd(),
        stdio: 'pipe',
        encoding: 'utf8'
      });

      this.log(`${description} - PASSED`, 'success');
      return { success: true, message: `${description} passed`, details: output };
      
    } catch (error: any) {
      const message = `${description} - FAILED`;
      this.log(message, 'error');
      this.errors.push(message);
      
      return { 
        success: false, 
        message, 
        details: error.stdout || error.message 
      };
    }
  }

  private async validateTypeScript(): Promise<boolean> {
    this.log('\n📝 TypeScript Compilation Check', 'info');
    
    const result = await this.runCommand(
      'pnpm typecheck',
      'TypeScript compilation'
    );

    if (!result.success) {
      this.errors.push('TypeScript compilation must pass with zero errors');
      this.log('Fix all TypeScript errors before committing', 'error');
      return false;
    }

    return true;
  }

  private async validateTests(): Promise<boolean> {
    this.log('\n🧪 Test Validation', 'info');
    
    // Run tests with coverage
    const testResult = await this.runCommand(
      'pnpm test:coverage',
      'Test suite with coverage'
    );

    if (!testResult.success) {
      this.errors.push('All tests must pass and meet coverage thresholds');
      return false;
    }

    // Validate coverage thresholds
    return this.validateCoverageThresholds();
  }

  private validateCoverageThresholds(): boolean {
    try {
      const coveragePath = join(process.cwd(), 'apps/web/coverage/coverage-summary.json');
      
      if (!existsSync(coveragePath)) {
        this.errors.push('Coverage summary not found');
        return false;
      }

      const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'));
      const total = coverage.total;

      // Global thresholds
      const thresholds = {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85
      };

      let allMet = true;

      for (const [metric, threshold] of Object.entries(thresholds)) {
        const actual = total[metric].pct;
        if (actual < threshold) {
          this.errors.push(`${metric} coverage (${actual}%) below threshold (${threshold}%)`);
          allMet = false;
        } else {
          this.log(`${metric} coverage: ${actual}% ✓`, 'success');
        }
      }

      return allMet;
    } catch (error: any) {
      this.errors.push(`Coverage validation failed: ${error.message}`);
      return false;
    }
  }

  private async validateLinting(): Promise<boolean> {
    this.log('\n🧹 Code Quality Check', 'info');
    
    const result = await this.runCommand(
      'pnpm lint',
      'ESLint validation'
    );

    if (!result.success) {
      this.errors.push('Code must pass linting without errors');
      return false;
    }

    return true;
  }

  private async validateFormatting(): Promise<boolean> {
    this.log('\n💅 Code Formatting Check', 'info');
    
    const result = await this.runCommand(
      'pnpm format:check',
      'Code formatting validation'
    );

    if (!result.success) {
      this.warnings.push('Code formatting issues detected. Run "pnpm format" to fix.');
      this.log('Run "pnpm format" to fix formatting issues', 'warning');
      return true; // Don't block commit for formatting
    }

    return true;
  }

  private async validateSecurity(): Promise<boolean> {
    this.log('\n🔒 Security Check', 'info');
    
    const result = await this.runCommand(
      'pnpm audit --audit-level moderate',
      'Security vulnerability scan'
    );

    if (!result.success) {
      this.warnings.push('Security vulnerabilities detected');
      this.log('Security vulnerabilities detected - review before production', 'warning');
      return true; // Don't block commit for security warnings
    }

    return true;
  }

  private generateReport(): boolean {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('📊 PRE-COMMIT QUALITY REPORT', 'info');
    this.log('='.repeat(60), 'info');

    this.log(`❌ Errors: ${this.errors.length}`, this.errors.length > 0 ? 'error' : 'success');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, this.warnings.length > 0 ? 'warning' : 'success');

    if (this.errors.length > 0) {
      this.log('\n🚫 COMMIT BLOCKED', 'error');
      this.log('Fix these issues before committing:', 'error');
      this.errors.forEach((error, index) => {
        this.log(`  ${index + 1}. ${error}`, 'error');
      });
      
      this.log('\n💡 Quick fixes:', 'info');
      this.log('  • Run "pnpm typecheck" to see TypeScript errors', 'info');
      this.log('  • Run "pnpm test:coverage" to see test failures', 'info');
      this.log('  • Run "pnpm lint --fix" to auto-fix linting issues', 'info');
      this.log('  • Run "pnpm format" to fix formatting', 'info');
      
      return false;
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  COMMIT ALLOWED WITH WARNINGS', 'warning');
      this.warnings.forEach((warning, index) => {
        this.log(`  ${index + 1}. ${warning}`, 'warning');
      });
    }

    this.log('\n✅ QUALITY CHECKS PASSED', 'success');
    this.log('🎉 Commit approved - all quality standards met!', 'success');
    
    return true;
  }

  async run(): Promise<boolean> {
    this.log('🚀 Running Pre-Commit Quality Checks...', 'info');
    this.log('Ensuring code meets quality standards before commit.\n', 'info');

    try {
      // Run all quality checks
      await this.validateTypeScript();
      await this.validateTests();
      await this.validateLinting();
      await this.validateFormatting();
      await this.validateSecurity();

      // Generate report and return success status
      return this.generateReport();

    } catch (error: any) {
      this.log(`Unexpected error during quality checks: ${error.message}`, 'error');
      return false;
    }
  }
}

// Export for use in other hooks
export { PreCommitQualityHook };

// Run if executed directly
if (require.main === module) {
  const hook = new PreCommitQualityHook();
  hook.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}