#!/usr/bin/env node

/**
 * Test script for Phase.dev integration
 * This script can be run locally or in CI/CD to validate Phase.dev connectivity
 */

const path = require('path');

// Add the web app to the module path
const webAppPath = path.join(__dirname, '../apps/web');
process.env.NODE_PATH = `${webAppPath}:${process.env.NODE_PATH || ''}`;
require('module').Module._initPaths();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, colors.cyan);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

async function testPhaseConfiguration() {
  logStep('CONFIG', 'Testing Phase.dev configuration...');
  
  try {
    const { createPhaseConfigFromEnv, validatePhaseConfig } = require('../apps/web/lib/config/phase');
    
    const config = createPhaseConfigFromEnv();
    
    if (!config) {
      logWarning('No Phase.dev configuration found (PHASE_SERVICE_TOKEN not set)');
      return false;
    }
    
    validatePhaseConfig(config);
    logSuccess(`Phase.dev configuration valid - App: ${config.appName}, Environment: ${config.environment}`);
    return true;
    
  } catch (error) {
    logError(`Phase.dev configuration invalid: ${error.message}`);
    return false;
  }
}

async function testPhaseConnection() {
  logStep('CONNECTION', 'Testing Phase.dev API connection...');
  
  try {
    const { PhaseEnvironmentLoader, createPhaseConfigFromEnv } = require('../apps/web/lib/config/phase');
    
    const config = createPhaseConfigFromEnv();
    if (!config) {
      logWarning('Skipping connection test - no Phase.dev configuration');
      return false;
    }
    
    const loader = new PhaseEnvironmentLoader();
    
    // Test with timeout
    const startTime = Date.now();
    const envVars = await Promise.race([
      loader.loadEnvironment(config),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    const varCount = Object.keys(envVars).length;
    
    logSuccess(`Phase.dev connection successful - ${varCount} variables loaded in ${duration}ms`);
    
    // Log some statistics (without exposing sensitive data)
    const stats = {
      totalVariables: varCount,
      responseTime: `${duration}ms`,
      cacheStatus: 'fresh'
    };
    
    log(`Connection stats: ${JSON.stringify(stats, null, 2)}`, colors.blue);
    return true;
    
  } catch (error) {
    logError(`Phase.dev connection failed: ${error.message}`);
    return false;
  }
}

async function testConfigurationManager() {
  logStep('MANAGER', 'Testing configuration manager...');
  
  try {
    const { CentralizedConfigManager, DEFAULT_VALIDATION_RULES } = require('../apps/web/lib/config/manager');
    
    const manager = new CentralizedConfigManager({
      validationRules: DEFAULT_VALIDATION_RULES.filter(rule => 
        // Only test non-sensitive validation rules
        ['DATABASE_URL'].includes(rule.key)
      )
    });
    
    await manager.initialize();
    
    const stats = manager.getStats();
    logSuccess(`Configuration manager initialized - ${stats.configCount} variables loaded`);
    
    log(`Manager stats: ${JSON.stringify({
      initialized: stats.initialized,
      configCount: stats.configCount,
      cacheEnabled: stats.cacheEnabled,
      phaseConfigured: stats.phaseConfigured
    }, null, 2)}`, colors.blue);
    
    return true;
    
  } catch (error) {
    logError(`Configuration manager test failed: ${error.message}`);
    return false;
  }
}

async function testFallbackBehavior() {
  logStep('FALLBACK', 'Testing fallback behavior...');
  
  try {
    const { loadEnvironmentWithFallback } = require('../apps/web/lib/config/phase');
    
    // Test with invalid configuration to trigger fallback
    const invalidConfig = {
      serviceToken: 'invalid-token',
      appName: 'AI.C9d.Web',
      environment: 'test'
    };
    
    const envVars = await loadEnvironmentWithFallback(invalidConfig);
    
    // Should fallback to process.env
    const hasProcessEnvVars = Object.keys(envVars).some(key => process.env[key]);
    
    if (hasProcessEnvVars) {
      logSuccess('Fallback behavior working correctly - using local environment variables');
      return true;
    } else {
      logWarning('Fallback behavior unclear - no matching environment variables found');
      return false;
    }
    
  } catch (error) {
    logError(`Fallback test failed: ${error.message}`);
    return false;
  }
}

async function testEnvironmentVariables() {
  logStep('ENV', 'Testing environment variable availability...');
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const availableVars = [];
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      availableVars.push(varName);
    } else {
      missingVars.push(varName);
    }
  }
  
  if (availableVars.length > 0) {
    logSuccess(`${availableVars.length} required environment variables available`);
  }
  
  if (missingVars.length > 0) {
    logWarning(`${missingVars.length} required environment variables missing: ${missingVars.join(', ')}`);
  }
  
  return missingVars.length === 0;
}

async function main() {
  log('🧪 Phase.dev Integration Test Suite', colors.bright);
  log('=====================================', colors.bright);
  
  const results = {
    configuration: false,
    connection: false,
    manager: false,
    fallback: false,
    environment: false
  };
  
  try {
    // Test 1: Configuration validation
    results.configuration = await testPhaseConfiguration();
    
    // Test 2: API connection (only if configuration is valid)
    if (results.configuration) {
      results.connection = await testPhaseConnection();
    }
    
    // Test 3: Configuration manager
    results.manager = await testConfigurationManager();
    
    // Test 4: Fallback behavior
    results.fallback = await testFallbackBehavior();
    
    // Test 5: Environment variables
    results.environment = await testEnvironmentVariables();
    
  } catch (error) {
    logError(`Test suite failed with unexpected error: ${error.message}`);
    process.exit(1);
  }
  
  // Summary
  log('\n📊 Test Results Summary', colors.bright);
  log('=======================', colors.bright);
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  for (const [test, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    const color = result ? colors.green : colors.red;
    log(`${status} ${test.toUpperCase()}`, color);
  }
  
  log(`\n📈 Overall: ${passed}/${total} tests passed`, 
    passed === total ? colors.green : colors.yellow);
  
  if (passed === total) {
    log('🎉 All tests passed! Phase.dev integration is working correctly.', colors.green + colors.bright);
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Check the logs above for details.', colors.yellow + colors.bright);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run the test suite
main().catch(error => {
  logError(`Test suite crashed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});