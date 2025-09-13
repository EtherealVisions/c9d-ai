#!/usr/bin/env node

/**
 * Coverage Reporter Script
 * 
 * Generates detailed coverage reports and validates against tiered thresholds.
 * Provides actionable feedback for improving test coverage.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class CoverageReporter {
  constructor() {
    this.coveragePath = path.join(process.cwd(), 'apps/web/coverage/coverage-summary.json');
    this.detailedCoveragePath = path.join(process.cwd(), 'apps/web/coverage/coverage.json');
    
    // Tiered coverage thresholds
    this.thresholds = {
      global: { branches: 85, functions: 85, lines: 85, statements: 85 },
      'lib/services/': { branches: 100, functions: 100, lines: 100, statements: 100, name: 'Services (Critical)' },
      'lib/models/': { branches: 95, functions: 95, lines: 95, statements: 95, name: 'Models (Data Layer)' },
      'app/api/': { branches: 90, functions: 90, lines: 90, statements: 90, name: 'API Routes' }
    };
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  formatPercentage(value, threshold) {
    const color = value >= threshold ? colors.green : colors.red;
    return `${color}${value.toFixed(1)}%${colors.reset}`;
  }

  generateProgressBar(percentage, width = 20) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const color = percentage >= 85 ? colors.green : percentage >= 70 ? colors.yellow : colors.red;
    
    return `${color}${'█'.repeat(filled)}${colors.reset}${'░'.repeat(empty)}`;
  }

  async loadCoverageData() {
    try {
      if (!fs.existsSync(this.coveragePath)) {
        throw new Error('Coverage summary not found. Run tests with coverage first.');
      }

      const summary = JSON.parse(fs.readFileSync(this.coveragePath, 'utf8'));
      
      let detailed = null;
      if (fs.existsSync(this.detailedCoveragePath)) {
        detailed = JSON.parse(fs.readFileSync(this.detailedCoveragePath, 'utf8'));
      }

      return { summary, detailed };
    } catch (error) {
      throw new Error(`Failed to load coverage data: ${error.message}`);
    }
  }

  generateGlobalReport(coverage) {
    this.log('\n📊 GLOBAL COVERAGE REPORT', colors.bold + colors.cyan);
    this.log('='.repeat(60), colors.cyan);

    const total = coverage.total;
    const metrics = ['branches', 'functions', 'lines', 'statements'];

    // Header
    this.log(`${'Metric'.padEnd(12)} ${'Coverage'.padEnd(10)} ${'Threshold'.padEnd(10)} ${'Status'.padEnd(8)} Progress`);
    this.log('-'.repeat(60));

    let allPassed = true;

    metrics.forEach(metric => {
      const actual = total[metric].pct;
      const threshold = this.thresholds.global[metric];
      const passed = actual >= threshold;
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const progress = this.generateProgressBar(actual);

      if (!passed) allPassed = false;

      this.log(
        `${metric.padEnd(12)} ` +
        `${this.formatPercentage(actual, threshold).padEnd(18)} ` +
        `${threshold}%`.padEnd(10) +
        `${status.padEnd(15)} ` +
        `${progress} ${actual.toFixed(1)}%`
      );
    });

    this.log('-'.repeat(60));
    
    if (allPassed) {
      this.log('🎉 All global coverage thresholds met!', colors.green + colors.bold);
    } else {
      this.log('⚠️  Some global coverage thresholds not met', colors.red + colors.bold);
    }

    return allPassed;
  }

  generateModuleReport(coverage) {
    this.log('\n🏗️  MODULE-SPECIFIC COVERAGE REPORT', colors.bold + colors.magenta);
    this.log('='.repeat(80), colors.magenta);

    let allModulesPassed = true;

    Object.entries(this.thresholds).forEach(([pathPattern, thresholds]) => {
      if (pathPattern === 'global') return;

      const moduleFiles = Object.keys(coverage).filter(file => 
        file.includes(pathPattern) && file !== 'total'
      );

      if (moduleFiles.length === 0) {
        this.log(`\n📁 ${thresholds.name}: No files found`, colors.yellow);
        return;
      }

      this.log(`\n📁 ${thresholds.name} (${moduleFiles.length} files)`, colors.bold);
      this.log('-'.repeat(50));

      const moduleCoverage = this.calculateModuleCoverage(coverage, moduleFiles);
      let modulePassed = true;

      ['branches', 'functions', 'lines', 'statements'].forEach(metric => {
        const actual = moduleCoverage[metric];
        const threshold = thresholds[metric];
        const passed = actual >= threshold;
        const status = passed ? '✅' : '❌';
        const progress = this.generateProgressBar(actual);

        if (!passed) {
          modulePassed = false;
          allModulesPassed = false;
        }

        this.log(
          `  ${status} ${metric.padEnd(10)}: ` +
          `${this.formatPercentage(actual, threshold).padEnd(18)} ` +
          `(req: ${threshold}%) ${progress}`
        );
      });

      if (!modulePassed) {
        this.log(`  ⚠️  Module below required thresholds`, colors.red);
        this.generateUncoveredFilesReport(coverage, moduleFiles, pathPattern);
      }
    });

    return allModulesPassed;
  }

  calculateModuleCoverage(coverage, files) {
    const metrics = ['branches', 'functions', 'lines', 'statements'];
    const result = {};

    metrics.forEach(metric => {
      let totalCovered = 0;
      let totalTotal = 0;

      files.forEach(file => {
        if (coverage[file] && coverage[file][metric]) {
          totalCovered += coverage[file][metric].covered || 0;
          totalTotal += coverage[file][metric].total || 0;
        }
      });

      result[metric] = totalTotal > 0 ? (totalCovered / totalTotal) * 100 : 100;
    });

    return result;
  }

  generateUncoveredFilesReport(coverage, files, pathPattern) {
    this.log(`\n    📋 Files needing attention in ${pathPattern}:`, colors.yellow);
    
    files.forEach(file => {
      const fileCoverage = coverage[file];
      if (!fileCoverage) return;

      const linesPct = fileCoverage.lines ? fileCoverage.lines.pct : 0;
      if (linesPct < 90) { // Show files with less than 90% coverage
        this.log(`      • ${file}: ${linesPct.toFixed(1)}% lines covered`, colors.yellow);
      }
    });
  }

  generateActionableRecommendations(globalPassed, modulesPassed) {
    this.log('\n💡 ACTIONABLE RECOMMENDATIONS', colors.bold + colors.blue);
    this.log('='.repeat(50), colors.blue);

    if (globalPassed && modulesPassed) {
      this.log('🎉 Excellent! All coverage thresholds are met.', colors.green);
      this.log('Consider these enhancements:', colors.green);
      this.log('  • Add edge case testing for 100% branch coverage', colors.green);
      this.log('  • Review and improve test quality and assertions', colors.green);
      this.log('  • Add performance and integration tests', colors.green);
      return;
    }

    if (!globalPassed) {
      this.log('🎯 To improve global coverage:', colors.yellow);
      this.log('  1. Run: pnpm test:coverage --reporter=html', colors.yellow);
      this.log('  2. Open: apps/web/coverage/index.html', colors.yellow);
      this.log('  3. Focus on red (uncovered) lines', colors.yellow);
      this.log('  4. Add tests for uncovered branches and functions', colors.yellow);
    }

    if (!modulesPassed) {
      this.log('🏗️  To improve module-specific coverage:', colors.yellow);
      this.log('  1. Focus on critical modules first (Services, Models, APIs)', colors.yellow);
      this.log('  2. Test all error paths and edge cases', colors.yellow);
      this.log('  3. Ensure all public methods are tested', colors.yellow);
      this.log('  4. Add integration tests for complex workflows', colors.yellow);
    }

    this.log('\n📚 Resources:', colors.blue);
    this.log('  • Coverage Guide: docs/testing/coverage-configuration.md', colors.blue);
    this.log('  • Testing Standards: docs/testing/comprehensive-test-guide.md', colors.blue);
    this.log('  • Test Commands: docs/testing/test-commands.md', colors.blue);
  }

  generateSummary(globalPassed, modulesPassed) {
    const overallPassed = globalPassed && modulesPassed;
    
    this.log('\n' + '='.repeat(60), colors.bold);
    this.log('📈 COVERAGE VALIDATION SUMMARY', colors.bold);
    this.log('='.repeat(60), colors.bold);

    this.log(`Global Thresholds: ${globalPassed ? '✅ PASSED' : '❌ FAILED'}`);
    this.log(`Module Thresholds: ${modulesPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (overallPassed) {
      this.log('\n🎉 ALL COVERAGE REQUIREMENTS MET!', colors.green + colors.bold);
      this.log('Your code meets the quality standards for production.', colors.green);
    } else {
      this.log('\n⚠️  COVERAGE REQUIREMENTS NOT MET', colors.red + colors.bold);
      this.log('Please improve test coverage before marking task complete.', colors.red);
    }

    return overallPassed;
  }

  async generateReport() {
    try {
      this.log('📊 Generating Coverage Report...', colors.cyan + colors.bold);
      
      const { summary: coverage } = await this.loadCoverageData();
      
      const globalPassed = this.generateGlobalReport(coverage);
      const modulesPassed = this.generateModuleReport(coverage);
      
      this.generateActionableRecommendations(globalPassed, modulesPassed);
      const overallPassed = this.generateSummary(globalPassed, modulesPassed);
      
      return overallPassed;
      
    } catch (error) {
      this.log(`❌ Coverage report generation failed: ${error.message}`, colors.red);
      return false;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const reporter = new CoverageReporter();
  reporter.generateReport().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = CoverageReporter;