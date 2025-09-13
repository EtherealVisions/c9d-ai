#!/usr/bin/env node

/**
 * Test Command Validation Script
 * 
 * This script validates that all package.json files follow the correct
 * test command patterns to ensure tests run once and exit by default.
 */

const fs = require('fs');
const path = require('path');

class TestCommandValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate a single package.json file
   */
  validatePackageJson(packagePath) {
    try {
      const fullPath = path.resolve(packagePath);
      if (!fs.existsSync(fullPath)) {
        this.warnings.push(`⚠️  Package file not found: ${packagePath}`);
        return;
      }

      const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const scripts = pkg.scripts || {};
      const packageName = pkg.name || path.dirname(packagePath);

      console.log(`\n🔍 Validating ${packageName} (${packagePath})`);

      // Check default test command
      this.validateDefaultTestCommand(scripts, packagePath);
      
      // Check explicit run command
      this.validateExplicitRunCommand(scripts, packagePath);
      
      // Check watch mode commands
      this.validateWatchModeCommands(scripts, packagePath);

      console.log(`✅ ${packageName}: Test commands validated`);

    } catch (error) {
      this.errors.push(`❌ Error validating ${packagePath}: ${error.message}`);
    }
  }

  /**
   * Validate the default test command
   */
  validateDefaultTestCommand(scripts, packagePath) {
    const testCommand = scripts.test;
    
    if (!testCommand) {
      this.warnings.push(`⚠️  ${packagePath}: No default test command found`);
      return;
    }

    // Check if default test command uses watch mode
    if (this.isWatchModeCommand(testCommand)) {
      this.errors.push(
        `❌ ${packagePath}: Default test command uses watch mode: "${testCommand}"\n` +
        `   Fix: Change to "vitest run" or similar non-watch command`
      );
    }
  }

  /**
   * Validate explicit run command
   */
  validateExplicitRunCommand(scripts, packagePath) {
    const testRunCommand = scripts['test:run'];
    
    if (!testRunCommand) {
      this.warnings.push(`⚠️  ${packagePath}: No explicit test:run command found`);
      return;
    }

    if (this.isWatchModeCommand(testRunCommand)) {
      this.errors.push(
        `❌ ${packagePath}: test:run command uses watch mode: "${testRunCommand}"\n` +
        `   Fix: Use non-watch command for test:run`
      );
    }
  }

  /**
   * Validate watch mode commands
   */
  validateWatchModeCommands(scripts, packagePath) {
    const watchCommands = ['test:dev', 'test:watch'];
    let hasWatchCommand = false;

    watchCommands.forEach(cmdName => {
      const command = scripts[cmdName];
      if (command) {
        hasWatchCommand = true;
        
        if (!this.isWatchModeCommand(command)) {
          this.warnings.push(
            `⚠️  ${packagePath}: ${cmdName} command doesn't appear to use watch mode: "${command}"`
          );
        }
      }
    });

    if (!hasWatchCommand && scripts.test) {
      this.warnings.push(
        `⚠️  ${packagePath}: No explicit watch mode command found`
      );
    }
  }

  /**
   * Check if a command uses watch mode
   */
  isWatchModeCommand(command) {
    const watchPatterns = [
      /vitest(?!\s+run)/,  // vitest without "run"
      /jest.*--watch/,
      /--watch/,
      /--watchAll/
    ];

    return watchPatterns.some(pattern => pattern.test(command));
  }

  /**
   * Run all validations
   */
  validate() {
    console.log('🚀 Starting test command validation...\n');

    // Find all package.json files
    const packageFiles = [
      'package.json',
      'apps/web/package.json'
    ];

    // Validate each package.json
    packageFiles.forEach(file => this.validatePackageJson(file));

    // Report results
    this.reportResults();
  }

  /**
   * Report validation results
   */
  reportResults() {
    console.log('\n📊 Validation Results:');
    console.log('='.repeat(50));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All test commands are properly configured!');
      console.log('✅ Tests will run once and exit by default');
      console.log('✅ Watch mode is available through explicit commands');
      return;
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS (must be fixed):');
      this.errors.forEach(error => console.log(`   ${error}\n`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (recommended fixes):');
      this.warnings.forEach(warning => console.log(`   ${warning}\n`));
    }

    if (this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new TestCommandValidator();
  try {
    validator.validate();
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

module.exports = TestCommandValidator;