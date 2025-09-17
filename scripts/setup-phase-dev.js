#!/usr/bin/env node

/**
 * Phase.dev Setup and Validation Script
 * 
 * This script helps developers set up and validate their Phase.dev configuration
 * for the C9D AI platform. It checks token availability, validates SDK integration,
 * and provides troubleshooting guidance.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${message}`, 'bright');
  log('='.repeat(message.length), 'bright');
}

/**
 * Check if Phase.dev service token is available from any source
 */
async function checkPhaseToken() {
  logHeader('Phase.dev Token Validation');
  
  try {
    // Import the PhaseTokenLoader from the config package
    const { PhaseTokenLoader } = require('../packages/config/src/phase-token-loader');
    
    // Get token source diagnostics
    const diagnostics = await PhaseTokenLoader.getTokenSourceDiagnostics();
    
    if (diagnostics.length === 0) {
      logError('No PHASE_SERVICE_TOKEN found in any location');
      logInfo('Token loading precedence order:');
      logInfo('  1. process.env.PHASE_SERVICE_TOKEN (highest priority)');
      logInfo('  2. local .env.local file');
      logInfo('  3. local .env file');
      logInfo('  4. workspace root .env.local file');
      logInfo('  5. workspace root .env file (lowest priority)');
      return false;
    }
    
    // Display all found token sources
    logInfo('Found PHASE_SERVICE_TOKEN in the following locations:');
    diagnostics.forEach((diagnostic, index) => {
      const priority = index + 1;
      const status = diagnostic.valid ? '✅ Valid' : '❌ Invalid';
      const source = diagnostic.path ? `file: ${diagnostic.path}` : diagnostic.source;
      log(`  ${priority}. ${source} - ${status}`, diagnostic.valid ? 'green' : 'red');
    });
    
    // Get the validated token
    const tokenSource = await PhaseTokenLoader.getValidatedToken();
    
    if (tokenSource) {
      logSuccess(`Using token from: ${tokenSource.source}`);
      if (tokenSource.path) {
        logInfo(`Token file: ${tokenSource.path}`);
      }
      return true;
    } else {
      logError('No valid PHASE_SERVICE_TOKEN found');
      return false;
    }
    
  } catch (error) {
    logError(`Failed to check Phase.dev token: ${error.message}`);
    return false;
  }
}

/**
 * Test Phase.dev SDK connectivity
 */
async function testPhaseConnectivity() {
  logHeader('Phase.dev SDK Connectivity Test');
  
  try {
    const { testPhaseConnectivity } = require('../packages/config/src/phase');
    
    logInfo('Testing connection to Phase.dev...');
    const startTime = Date.now();
    
    const result = await testPhaseConnectivity();
    
    if (result.success) {
      logSuccess(`Connected to Phase.dev successfully (${result.responseTime}ms)`);
      return true;
    } else {
      logError(`Failed to connect to Phase.dev: ${result.error}`);
      logInfo(`Response time: ${result.responseTime}ms`);
      return false;
    }
    
  } catch (error) {
    logError(`SDK connectivity test failed: ${error.message}`);
    return false;
  }
}

/**
 * Load and validate environment variables from Phase.dev
 */
async function validateEnvironmentLoading() {
  logHeader('Environment Variable Loading Test');
  
  try {
    const { loadFromPhase } = require('../packages/config/src/phase');
    
    logInfo('Loading environment variables from Phase.dev...');
    
    const result = await loadFromPhase(true); // Force reload
    
    if (result.success) {
      const varCount = Object.keys(result.variables).length;
      logSuccess(`Loaded ${varCount} environment variables from Phase.dev`);
      
      if (result.tokenSource) {
        logInfo(`Token source: ${result.tokenSource.source}`);
      }
      
      // Check for common required variables
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY'
      ];
      
      const missingVars = requiredVars.filter(varName => !result.variables[varName]);
      
      if (missingVars.length === 0) {
        logSuccess('All required environment variables are available');
      } else {
        logWarning(`Missing required variables: ${missingVars.join(', ')}`);
        logInfo('Add these variables to your Phase.dev app configuration');
      }
      
      return true;
    } else {
      logError(`Failed to load environment variables: ${result.error}`);
      return false;
    }
    
  } catch (error) {
    logError(`Environment loading test failed: ${error.message}`);
    return false;
  }
}

/**
 * Validate Phase.dev app configuration
 */
async function validateAppConfiguration() {
  logHeader('Phase.dev App Configuration Validation');
  
  try {
    const { getPhaseConfig } = require('../packages/config/src/phase');
    
    const config = await getPhaseConfig();
    
    if (config) {
      logSuccess('Phase.dev configuration is valid');
      logInfo(`App Name: ${config.appName}`);
      logInfo(`Environment: ${config.environment}`);
      logInfo(`Token Length: ${config.serviceToken.length} characters`);
      return true;
    } else {
      logError('Phase.dev configuration is not available');
      return false;
    }
    
  } catch (error) {
    logError(`App configuration validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Check package dependencies
 */
function checkDependencies() {
  logHeader('Package Dependencies Check');
  
  try {
    // Check if @phase.dev/phase-node is installed
    const configPackageJson = require('../packages/config/package.json');
    
    if (configPackageJson.dependencies['@phase.dev/phase-node']) {
      logSuccess(`Phase.dev SDK installed: ${configPackageJson.dependencies['@phase.dev/phase-node']}`);
    } else {
      logError('Phase.dev SDK not found in dependencies');
      return false;
    }
    
    // Check if the SDK can be imported
    try {
      require('@phase.dev/phase-node');
      logSuccess('Phase.dev SDK can be imported successfully');
    } catch (error) {
      logError(`Phase.dev SDK import failed: ${error.message}`);
      return false;
    }
    
    return true;
    
  } catch (error) {
    logError(`Dependency check failed: ${error.message}`);
    return false;
  }
}

/**
 * Provide troubleshooting guidance
 */
function provideTroubleshootingGuidance() {
  logHeader('Troubleshooting Guidance');
  
  logInfo('If you encountered issues, try these solutions:');
  log('');
  
  log('1. PHASE_SERVICE_TOKEN not found:', 'yellow');
  log('   • Get your service token from https://console.phase.dev');
  log('   • Add it to your .env.local file: PHASE_SERVICE_TOKEN=your_token_here');
  log('   • Or set it as an environment variable: export PHASE_SERVICE_TOKEN=your_token_here');
  log('');
  
  log('2. Invalid or expired token:', 'yellow');
  log('   • Verify your token in the Phase.dev console');
  log('   • Generate a new service token if needed');
  log('   • Ensure the token has access to the AI.C9d.Web app');
  log('');
  
  log('3. Network connectivity issues:', 'yellow');
  log('   • Check your internet connection');
  log('   • Verify firewall settings allow HTTPS to console.phase.dev');
  log('   • Try running the test again in a few minutes');
  log('');
  
  log('4. Missing environment variables in Phase.dev:', 'yellow');
  log('   • Log into https://console.phase.dev');
  log('   • Select the AI.C9d.Web app');
  log('   • Add the required environment variables');
  log('   • Ensure they are set for the correct environment (development/production)');
  log('');
  
  log('5. SDK installation issues:', 'yellow');
  log('   • Run: pnpm install --filter=@c9d/config');
  log('   • Verify the @phase.dev/phase-node package is installed');
  log('   • Check for any peer dependency warnings');
  log('');
  
  log('For more help:', 'cyan');
  log('   • Documentation: docs/phase-dev-setup.md');
  log('   • Phase.dev docs: https://docs.phase.dev');
  log('   • Team support: Ask in #dev-support channel');
}

/**
 * Main setup and validation function
 */
async function main() {
  log('🚀 Phase.dev Setup and Validation Tool', 'bright');
  log('=====================================', 'bright');
  log('');
  
  const results = {
    dependencies: false,
    token: false,
    connectivity: false,
    environment: false,
    configuration: false
  };
  
  // Run all validation checks
  results.dependencies = checkDependencies();
  
  if (results.dependencies) {
    results.token = await checkPhaseToken();
    
    if (results.token) {
      results.configuration = await validateAppConfiguration();
      results.connectivity = await testPhaseConnectivity();
      
      if (results.connectivity) {
        results.environment = await validateEnvironmentLoading();
      }
    }
  }
  
  // Summary
  logHeader('Validation Summary');
  
  const checks = [
    { name: 'Package Dependencies', status: results.dependencies },
    { name: 'Phase.dev Token', status: results.token },
    { name: 'App Configuration', status: results.configuration },
    { name: 'SDK Connectivity', status: results.connectivity },
    { name: 'Environment Loading', status: results.environment }
  ];
  
  checks.forEach(check => {
    const status = check.status ? '✅ PASS' : '❌ FAIL';
    const color = check.status ? 'green' : 'red';
    log(`  ${check.name}: ${status}`, color);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  log('');
  if (allPassed) {
    logSuccess('🎉 All Phase.dev validation checks passed!');
    logInfo('Your Phase.dev integration is ready to use.');
  } else {
    logError('❌ Some validation checks failed.');
    logInfo('Please review the issues above and follow the troubleshooting guidance.');
    provideTroubleshootingGuidance();
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    logError(`Setup script failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  checkPhaseToken,
  testPhaseConnectivity,
  validateEnvironmentLoading,
  validateAppConfiguration,
  checkDependencies
};