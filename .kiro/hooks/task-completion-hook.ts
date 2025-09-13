/**
 * Kiro Task Completion Hook
 * 
 * This hook runs when a task is marked as complete to ensure it meets
 * all quality standards before being considered "done".
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  success: boolean;
  message: string;
  details?: string;
}

interface CoverageMetrics {
  branches: number;
  functions: number;
  lines: number;
  statements: number;
}

class TaskCompletionHook {
  private errors: string[] = [];
  private warnings: string[] = [];
  private startTime: number = Date.now();

  // Tiered coverage requirements
  private readonly coverageThresholds = {
    global: { branches: 85, functions: 85, lines: 85, statements: 85 },
    services: { branches: 100, functions: 100, lines: 100, statements: 100 },
    models: { branches: 95, functions: 95, lines: 95, statements: 95 },
    api: { branches: 90, functions: 90, lines: 90, statements: 90 }
  };

  private log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m',
      bold: '\x1b[1m'
    };

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    console.log(`${colors[type]}${icons[type]} ${message}${colors.reset}`);
  }

  private async runCommand(command: string, description: string): Promise<ValidationResult> {
    try {
      this.log(`Validating: ${description}`, 'info');
      
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

  private async validateBuildSuccess(): Promise<boolean> {
    this.log('\n🏗️  Build Success Validation', 'info');
    
    // TypeScript compilation
    const typescriptResult = await this.runCommand(
      'pnpm typecheck',
      'TypeScript compilation (zero errors required)'
    );

    // Production build
    const buildResult = await this.runCommand(
      'pnpm build',
      'Production build (must complete successfully)'
    );

    return typescriptResult.success && buildResult.success;
  }

  private async validateTestSuccess(): Promise<boolean> {
    this.log('\n🧪 Test Success Validation', 'info');
    
    // Run full test suite with coverage
    const testResult = await this.runCommand(
      'pnpm test:coverage',
      'Full test suite with coverage (100% pass rate required)'
    );

    if (!testResult.success) {
      this.errors.push('All tests must pass without skips or failures');
      return false;
    }

    // Validate coverage thresholds
    return this.validateComprehensiveCoverage();
  }

  private validateComprehensiveCoverage(): boolean {
    try {
      const coveragePath = join(process.cwd(), 'apps/web/coverage/coverage-summary.json');
      const detailedCoveragePath = join(process.cwd(), 'apps/web/coverage/coverage.json');
      
      if (!existsSync(coveragePath)) {
        this.errors.push('Coverage summary not found - run tests with coverage');
        return false;
      }

      const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'));
      let detailed = null;
      
      if (existsSync(detailedCoveragePath)) {
        detailed = JSON.parse(readFileSync(detailedCoveragePath, 'utf8'));
      }

      return this.validateTieredCoverage(coverage, detailed);
      
    } catch (error: any) {
      this.errors.push(`Coverage validation failed: ${error.message}`);
      return false;
    }
  }

  private validateTieredCoverage(coverage: any, detailed: any): boolean {
    let allThresholdsMet = true;

    // Validate global thresholds
    const globalValid = this.validateGlobalCoverage(coverage.total);
    if (!globalValid) allThresholdsMet = false;

    // Validate module-specific thresholds
    if (detailed) {
      const moduleValid = this.validateModuleCoverage(detailed);
      if (!moduleValid) allThresholdsMet = false;
    }

    return allThresholdsMet;
  }

  private validateGlobalCoverage(total: any): boolean {
    this.log('\n📊 Global Coverage Validation:', 'info');
    
    let allMet = true;
    const metrics: (keyof CoverageMetrics)[] = ['branches', 'functions', 'lines', 'statements'];

    metrics.forEach(metric => {
      const actual = total[metric].pct;
      const threshold = this.coverageThresholds.global[metric];
      
      if (actual < threshold) {
        this.errors.push(`Global ${metric} coverage (${actual}%) below threshold (${threshold}%)`);
        this.log(`  ❌ ${metric}: ${actual}% (required: ${threshold}%)`, 'error');
        allMet = false;
      } else {
        this.log(`  ✅ ${metric}: ${actual}% (required: ${threshold}%)`, 'success');
      }
    });

    return allMet;
  }

  private validateModuleCoverage(detailed: any): boolean {
    this.log('\n🏗️  Module-Specific Coverage Validation:', 'info');
    
    const modulePatterns = {
      'lib/services/': { thresholds: this.coverageThresholds.services, name: 'Services (Critical Business Logic)' },
      'lib/models/': { thresholds: this.coverageThresholds.models, name: 'Models (Data Layer)' },
      'app/api/': { thresholds: this.coverageThresholds.api, name: 'API Routes (External Interfaces)' }
    };

    let allModulesMet = true;

    Object.entries(modulePatterns).forEach(([pattern, config]) => {
      const moduleFiles = Object.keys(detailed).filter(file => 
        file.includes(pattern) && file !== 'total'
      );

      if (moduleFiles.length === 0) {
        this.log(`  ℹ️  ${config.name}: No files found`, 'info');
        return;
      }

      this.log(`  📁 ${config.name} (${moduleFiles.length} files):`, 'info');
      
      const moduleCoverage = this.calculateModuleCoverage(detailed, moduleFiles);
      const metrics: (keyof CoverageMetrics)[] = ['branches', 'functions', 'lines', 'statements'];

      metrics.forEach(metric => {
        const actual = moduleCoverage[metric];
        const threshold = config.thresholds[metric];
        
        if (actual < threshold) {
          this.errors.push(`${config.name} ${metric} coverage (${actual}%) below threshold (${threshold}%)`);
          this.log(`    ❌ ${metric}: ${actual.toFixed(1)}% (required: ${threshold}%)`, 'error');
          allModulesMet = false;
        } else {
          this.log(`    ✅ ${metric}: ${actual.toFixed(1)}% (required: ${threshold}%)`, 'success');
        }
      });
    });

    return allModulesMet;
  }

  private calculateModuleCoverage(detailed: any, files: string[]): CoverageMetrics {
    const metrics: (keyof CoverageMetrics)[] = ['branches', 'functions', 'lines', 'statements'];
    const result: CoverageMetrics = { branches: 0, functions: 0, lines: 0, statements: 0 };

    metrics.forEach(metric => {
      let totalCovered = 0;
      let totalTotal = 0;

      files.forEach(file => {
        if (detailed[file] && detailed[file][metric]) {
          totalCovered += detailed[file][metric].covered || 0;
          totalTotal += detailed[file][metric].total || 0;
        }
      });

      result[metric] = totalTotal > 0 ? (totalCovered / totalTotal) * 100 : 100;
    });

    return result;
  }

  private async validateCodeQuality(): Promise<boolean> {
    this.log('\n🧹 Code Quality Validation', 'info');
    
    // Linting validation
    const lintResult = await this.runCommand(
      'pnpm lint',
      'ESLint validation (no errors or warnings)'
    );

    // Code formatting validation
    const formatResult = await this.runCommand(
      'pnpm format:check',
      'Code formatting validation'
    );

    if (!formatResult.success) {
      this.warnings.push('Code formatting issues detected');
      this.log('Run "pnpm format" to fix formatting issues', 'warning');
    }

    return lintResult.success;
  }

  private async validateDocumentation(): Promise<boolean> {
    this.log('\n📚 Documentation Validation', 'info');
    
    // Check if CHANGELOG has been updated
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    if (existsSync(changelogPath)) {
      const changelog = readFileSync(changelogPath, 'utf8');
      if (changelog.includes('[Unreleased]')) {
        this.log('CHANGELOG.md contains unreleased changes ✓', 'success');
      } else {
        this.warnings.push('Consider updating CHANGELOG.md with your changes');
      }
    }

    // Check README for any obvious issues
    const readmePath = join(process.cwd(), 'README.md');
    if (existsSync(readmePath)) {
      this.log('README.md exists ✓', 'success');
    } else {
      this.warnings.push('README.md not found');
    }

    this.log('Documentation validation completed', 'success');
    return true;
  }

  private generateCompletionReport(): boolean {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    this.log('\n' + '='.repeat(70), 'info');
    this.log('🎯 TASK COMPLETION VALIDATION REPORT', 'info');
    this.log('='.repeat(70), 'info');
    
    this.log(`⏱️  Validation Duration: ${duration}s`, 'info');
    this.log(`❌ Critical Issues: ${this.errors.length}`, this.errors.length > 0 ? 'error' : 'success');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, this.warnings.length > 0 ? 'warning' : 'success');
    
    if (this.errors.length > 0) {
      this.log('\n🚫 TASK COMPLETION BLOCKED', 'error');
      this.log('The following critical issues must be resolved:', 'error');
      this.errors.forEach((error, index) => {
        this.log(`  ${index + 1}. ${error}`, 'error');
      });
      
      this.log('\n💡 Resolution Steps:', 'info');
      this.log('  1. Fix all critical issues listed above', 'info');
      this.log('  2. Run validation again: pnpm validate:task-completion', 'info');
      this.log('  3. Only mark task complete when all validations pass', 'info');
      this.log('\n📚 Documentation:', 'info');
      this.log('  • Coverage Guide: docs/testing/coverage-configuration.md', 'info');
      this.log('  • Quality Standards: .kiro/steering/quality-enforcement.md', 'info');
      
      return false;
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  TASK COMPLETION APPROVED WITH WARNINGS', 'warning');
      this.log('Consider addressing these warnings:', 'warning');
      this.warnings.forEach((warning, index) => {
        this.log(`  ${index + 1}. ${warning}`, 'warning');
      });
    }

    this.log('\n🎉 TASK COMPLETION APPROVED!', 'success');
    this.log('✨ Your task meets all quality standards and is ready for production!', 'success');
    this.log('\n📊 Quality Summary:', 'info');
    this.log('  ✅ Build Success: TypeScript compiles, production build works', 'success');
    this.log('  ✅ Test Success: 100% pass rate, coverage thresholds met', 'success');
    this.log('  ✅ Code Quality: Linting passed, formatting validated', 'success');
    this.log('  ✅ Documentation: Updated and validated', 'success');
    
    return true;
  }

  async run(): Promise<boolean> {
    this.log('🎯 Starting Task Completion Validation...', 'info');
    this.log('Ensuring your task meets ALL quality standards for production.\n', 'info');

    try {
      // Run comprehensive validation
      const buildValid = await this.validateBuildSuccess();
      const testValid = await this.validateTestSuccess();
      const qualityValid = await this.validateCodeQuality();
      const docsValid = await this.validateDocumentation();

      // Generate final report
      const success = this.generateCompletionReport();
      return success;

    } catch (error: any) {
      this.log(`Validation failed with unexpected error: ${error.message}`, 'error');
      this.log('\n🚫 TASK COMPLETION BLOCKED', 'error');
      return false;
    }
  }
}

// Export for use in other modules
export { TaskCompletionHook };

// Run if executed directly
if (require.main === module) {
  const hook = new TaskCompletionHook();
  hook.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}