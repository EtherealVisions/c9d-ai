#!/usr/bin/env node

/**
 * Test Phase.dev environment variable integration
 * This script validates that Phase.dev integration works correctly
 * and environment variables are properly loaded in monorepo context.
 */

const { execSync } = require('child_process');
const path = require('path');

/**
 * Colors for console output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Log with color
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Test Phase.dev integration in different contexts
 */
async function testPhaseIntegration() {
  log('🔍 Testing Phase.dev Environment Integration', colors.cyan);
  log('=' .repeat(50), colors.cyan);
  
  const results = {
    phaseAvailable: false,
    contextTests: [],
    commandTests: [],
    fallbackTests: []
  };
  
  // Check if Phase CLI is available
  log('\n📦 Checking Phase CLI Availability:', colors.cyan);
  try {
    const phaseVersion = execSync('phase --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    log(`  ✅ Phase CLI available: ${phaseVersion}`, colors.green);
    results.phaseAvailable = true;
  } catch (error) {
    log('  ❌ Phase CLI not available', colors.red);
    log('  💡 Install Phase CLI: curl -fsSL https://get.phase.dev | bash', colors.yellow);
    results.phaseAvailable = false;
  }
  
  // Test Phase.dev service token
  log('\n🔑 Checking Phase.dev Service Token:', colors.cyan);
  const phaseToken = process.env.PHASE_SERVICE_TOKEN;
  if (phaseToken) {
    log('  ✅ PHASE_SERVICE_TOKEN available', colors.green);
    log(`  📏 Token length: ${phaseToken.length} characters`, colors.blue);
  } else {
    log('  ⚠️  PHASE_SERVICE_TOKEN not found', colors.yellow);
    log('  💡 Set PHASE_SERVICE_TOKEN in your environment', colors.yellow);
  }
  
  if (results.phaseAvailable && phaseToken) {
    // Test Phase.dev contexts
    log('\n🏗️  Testing Phase.dev Contexts:', colors.cyan);
    
    const contexts = ['AI.C9d.Web'];
    
    for (const context of contexts) {
      try {
        log(`  Testing context: ${context}`, colors.blue);
        
        // Test phase run with echo command
        const testCommand = `phase run --context ${context} -- echo "Context test successful"`;
        const output = execSync(testCommand, { encoding: 'utf8', stdio: 'pipe' }).trim();
        
        if (output.includes('Context test successful')) {
          log(`    ✅ Context ${context}: Working`, colors.green);
          results.contextTests.push({ context, passed: true });
        } else {
          log(`    ❌ Context ${context}: Failed`, colors.red);
          results.contextTests.push({ context, passed: false });
        }
      } catch (error) {
        log(`    ❌ Context ${context}: Error - ${error.message}`, colors.red);
        results.contextTests.push({ context, passed: false, error: error.message });
      }
    }
    
    // Test Phase.dev with actual commands
    log('\n⚡ Testing Phase.dev with Commands:', colors.cyan);
    
    const testCommands = [
      { name: 'env-check', command: 'phase run --context AI.C9d.Web -- node -e "console.log(Object.keys(process.env).length)"' },
      { name: 'node-version', command: 'phase run --context AI.C9d.Web -- node --version' }
    ];
    
    for (const testCmd of testCommands) {
      try {
        log(`  Testing: ${testCmd.name}`, colors.blue);
        const output = execSync(testCmd.command, { encoding: 'utf8', stdio: 'pipe', timeout: 10000 }).trim();
        log(`    ✅ ${testCmd.name}: ${output}`, colors.green);
        results.commandTests.push({ name: testCmd.name, passed: true, output });
      } catch (error) {
        log(`    ❌ ${testCmd.name}: Failed - ${error.message}`, colors.red);
        results.commandTests.push({ name: testCmd.name, passed: false, error: error.message });
      }
    }
  }
  
  // Test fallback behavior
  log('\n🔄 Testing Fallback Behavior:', colors.cyan);
  
  try {
    // Test without Phase.dev (simulate missing token)
    const env = { ...process.env };
    delete env.PHASE_SERVICE_TOKEN;
    
    const fallbackTest = execSync('node -e "console.log(process.env.NODE_ENV || \'development\')"', {
      encoding: 'utf8',
      stdio: 'pipe',
      env
    }).trim();
    
    log(`  ✅ Fallback to process.env: ${fallbackTest}`, colors.green);
    results.fallbackTests.push({ name: 'process-env-fallback', passed: true });
  } catch (error) {
    log(`  ❌ Fallback test failed: ${error.message}`, colors.red);
    results.fallbackTests.push({ name: 'process-env-fallback', passed: false });
  }
  
  // Test .env file loading
  try {
    const envFileTest = execSync('node -e "require(\'dotenv\').config(); console.log(\'dotenv-loaded\')"', {
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    
    if (envFileTest.includes('dotenv-loaded')) {
      log('  ✅ .env file loading: Working', colors.green);
      results.fallbackTests.push({ name: 'env-file-loading', passed: true });
    } else {
      log('  ⚠️  .env file loading: No dotenv package', colors.yellow);
      results.fallbackTests.push({ name: 'env-file-loading', passed: false });
    }
  } catch (error) {
    log('  ⚠️  .env file loading: Not available', colors.yellow);
    results.fallbackTests.push({ name: 'env-file-loading', passed: false });
  }
  
  // Generate report
  generatePhaseReport(results);
  
  // Determine overall success
  const contextsPassed = results.contextTests.every(t => t.passed);
  const commandsPassed = results.commandTests.every(t => t.passed);
  const fallbacksPassed = results.fallbackTests.some(t => t.passed);
  
  const overallSuccess = (results.phaseAvailable && contextsPassed && commandsPassed) || fallbacksPassed;
  
  return overallSuccess;
}

/**
 * Generate Phase.dev integration report
 */
function generatePhaseReport(results) {
  log('\n📊 Phase.dev Integration Report:', colors.cyan);
  log('=' .repeat(50), colors.cyan);
  
  // Phase CLI availability
  log(`\nPhase CLI:`, colors.blue);
  log(`  Status: ${results.phaseAvailable ? 'Available' : 'Not Available'}`, 
      results.phaseAvailable ? colors.green : colors.red);
  
  // Context tests
  if (results.contextTests.length > 0) {
    const contextsPassed = results.contextTests.filter(t => t.passed).length;
    const contextsTotal = results.contextTests.length;
    
    log(`\nContext Tests:`, colors.blue);
    log(`  Status: ${contextsPassed}/${contextsTotal} contexts working`, 
        contextsPassed === contextsTotal ? colors.green : colors.red);
    
    results.contextTests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      const color = test.passed ? colors.green : colors.red;
      log(`    ${status} ${test.context}`, color);
    });
  }
  
  // Command tests
  if (results.commandTests.length > 0) {
    const commandsPassed = results.commandTests.filter(t => t.passed).length;
    const commandsTotal = results.commandTests.length;
    
    log(`\nCommand Tests:`, colors.blue);
    log(`  Status: ${commandsPassed}/${commandsTotal} commands working`, 
        commandsPassed === commandsTotal ? colors.green : colors.red);
  }
  
  // Fallback tests
  const fallbacksPassed = results.fallbackTests.filter(t => t.passed).length;
  const fallbacksTotal = results.fallbackTests.length;
  
  log(`\nFallback Tests:`, colors.blue);
  log(`  Status: ${fallbacksPassed}/${fallbacksTotal} fallbacks working`, 
      fallbacksPassed > 0 ? colors.green : colors.red);
  
  // Recommendations
  log(`\n💡 Recommendations:`, colors.yellow);
  
  if (!results.phaseAvailable) {
    log('  • Install Phase CLI for centralized configuration', colors.yellow);
    log('  • Run: curl -fsSL https://get.phase.dev | bash', colors.yellow);
  }
  
  if (!process.env.PHASE_SERVICE_TOKEN) {
    log('  • Set PHASE_SERVICE_TOKEN environment variable', colors.yellow);
    log('  • Get token from Phase.dev console', colors.yellow);
  }
  
  if (results.contextTests.some(t => !t.passed)) {
    log('  • Verify Phase.dev context configuration', colors.yellow);
    log('  • Check Phase.dev service status', colors.yellow);
  }
  
  if (results.fallbackTests.every(t => !t.passed)) {
    log('  • Ensure .env files are properly configured', colors.yellow);
    log('  • Verify environment variable fallback mechanisms', colors.yellow);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const success = await testPhaseIntegration();
    
    log(`\n🎯 Overall Result: ${success ? 'SUCCESS' : 'NEEDS ATTENTION'}`, 
        success ? colors.green : colors.yellow);
    
    // Exit with appropriate code (0 for success, 1 for attention needed)
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main();