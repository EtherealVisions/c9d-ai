#!/usr/bin/env node

/**
 * Phase.dev Configuration Debug Script
 * 
 * This script provides detailed debugging information about Phase.dev configuration,
 * token loading, and environment variable management. Use this for troubleshooting
 * complex Phase.dev integration issues.
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

function logHeader(message) {
  log(`\n${message}`, 'bright');
  log('='.repeat(message.length), 'bright');
}

function logSection(message) {
  log(`\n${message}`, 'cyan');
  log('-'.repeat(message.length), 'cyan');
}

/**
 * Debug token loading process
 */
async function debugTokenLoading() {
  logHeader('Phase.dev Token Loading Debug');
  
  try {
    const { PhaseTokenLoader } = require('../packages/config/src/phase-token-loader');
    
    logSection('Token Source Diagnostics');
    
    const diagnostics = await PhaseTokenLoader.getTokenSourceDiagnostics();
    
    if (diagnostics.length === 0) {
      log('❌ No PHASE_SERVICE_TOKEN found in any location', 'red');
      log('');
      log('Checked locations:', 'yellow');
      log('  1. process.env.PHASE_SERVICE_TOKEN');
      log('  2. ./.env.local');
      log('  3. ./.env');
      log('  4. ../.env.local (workspace root)');
      log('  5. ../.env (workspace root)');
      return;
    }
    
    log(`Found ${diagnostics.length} token source(s):`, 'green');
    log('');
    
    diagnostics.forEach((diagnostic, index) => {
      const priority = index + 1;
      const status = diagnostic.valid ? '✅ Valid' : '❌ Invalid';
      const color = diagnostic.valid ? 'green' : 'red';
      
      log(`${priority}. ${diagnostic.source}`, color);
      log(`   Path: ${diagnostic.path || 'Environment variable'}`, 'blue');
      log(`   Status: ${status}`, color);
      log(`   Token length: ${diagnostic.tokenLength} characters`, 'blue');
      log(`   Token preview: ${diagnostic.tokenPreview}`, 'blue');
      log('');
    });
    
    logSection('Active Token Selection');
    
    const tokenSource = await PhaseTokenLoader.getValidatedToken();
    
    if (tokenSource) {
      log('✅ Active token selected:', 'green');
      log(`   Source: ${tokenSource.source}`, 'blue');
      log(`   Path: ${tokenSource.path || 'Environment variable'}`, 'blue');
      log(`   Token length: ${tokenSource.token.length} characters`, 'blue');
      log(`   Token preview: ${tokenSource.token.substring(0, 10)}...`, 'blue');
    } else {
      log('❌ No valid token available', 'red');
    }
    
  } catch (error) {
    log(`❌ Token loading debug failed: ${error.message}`, 'red');
    console.error(error);
  }
}

/**
 * Debug SDK client initialization
 */
async function debugSDKClient() {
  logHeader('Phase.dev SDK Client Debug');
  
  try {
    const { PhaseSDKClient } = require('../packages/config/src/phase-sdk-client');
    
    logSection('SDK Client Initialization');
    
    const client = new PhaseSDKClient();
    
    log('Creating SDK client instance...', 'blue');
    
    const startTime = Date.now();
    const initialized = await client.initialize('AI.C9d.Web', 'development');
    const initTime = Date.now() - startTime;
    
    if (initialized) {
      log(`✅ SDK client initialized successfully (${initTime}ms)`, 'green');
      
      const diagnostics = client.getDiagnostics();
      log('');
      log('Client diagnostics:', 'cyan');
      log(`   Initialized: ${diagnostics.initialized}`, 'blue');
      log(`   App name: ${diagnostics.appName}`, 'blue');
      log(`   Environment: ${diagnostics.environment}`, 'blue');
      log(`   Token source: ${diagnostics.tokenSource?.source || 'Unknown'}`, 'blue');
      
      logSection('Connection Test');
      
      const connectionStart = Date.now();
      const connected = await client.testConnection();
      const connectionTime = Date.now() - connectionStart;
      
      if (connected) {
        log(`✅ Connection test successful (${connectionTime}ms)`, 'green');
      } else {
        log(`❌ Connection test failed (${connectionTime}ms)`, 'red');
      }
      
      logSection('Secret Retrieval Test');
      
      const secretStart = Date.now();
      const result = await client.getSecrets();
      const secretTime = Date.now() - secretStart;
      
      if (result.success) {
        log(`✅ Secret retrieval successful (${secretTime}ms)`, 'green');
        log(`   Retrieved ${Object.keys(result.secrets).length} secrets`, 'blue');
        
        // Show first few secret names (not values)
        const secretNames = Object.keys(result.secrets).slice(0, 5);
        if (secretNames.length > 0) {
          log('   Sample secrets:', 'blue');
          secretNames.forEach(name => {
            log(`     - ${name}`, 'blue');
          });
          if (Object.keys(result.secrets).length > 5) {
            log(`     ... and ${Object.keys(result.secrets).length - 5} more`, 'blue');
          }
        }
      } else {
        log(`❌ Secret retrieval failed (${secretTime}ms)`, 'red');
        log(`   Error: ${result.error}`, 'red');
      }
      
    } else {
      log(`❌ SDK client initialization failed (${initTime}ms)`, 'red');
    }
    
  } catch (error) {
    log(`❌ SDK client debug failed: ${error.message}`, 'red');
    console.error(error);
  }
}

/**
 * Debug environment loading process
 */
async function debugEnvironmentLoading() {
  logHeader('Environment Loading Debug');
  
  try {
    const { loadFromPhase, getPhaseCacheStatus } = require('../packages/config/src/phase');
    
    logSection('Cache Status');
    
    const cacheStatus = getPhaseCacheStatus();
    
    if (cacheStatus.isCached) {
      log('✅ Cache is active', 'green');
      log(`   Age: ${Math.round(cacheStatus.age / 1000)}s`, 'blue');
      log(`   Variables: ${cacheStatus.variableCount}`, 'blue');
      log(`   Source: ${cacheStatus.source}`, 'blue');
      log(`   Token source: ${cacheStatus.tokenSource?.source || 'Unknown'}`, 'blue');
    } else {
      log('ℹ️  No cache active', 'yellow');
    }
    
    logSection('Fresh Environment Loading');
    
    log('Loading environment variables (bypassing cache)...', 'blue');
    
    const loadStart = Date.now();
    const result = await loadFromPhase(true); // Force reload
    const loadTime = Date.now() - loadStart;
    
    if (result.success) {
      log(`✅ Environment loading successful (${loadTime}ms)`, 'green');
      log(`   Source: ${result.source}`, 'blue');
      log(`   Variables loaded: ${Object.keys(result.variables).length}`, 'blue');
      
      if (result.tokenSource) {
        log(`   Token source: ${result.tokenSource.source}`, 'blue');
      }
      
      // Check for required variables
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY',
        'DATABASE_URL'
      ];
      
      log('');
      log('Required variable check:', 'cyan');
      requiredVars.forEach(varName => {
        const exists = result.variables[varName];
        const status = exists ? '✅' : '❌';
        const color = exists ? 'green' : 'red';
        log(`   ${status} ${varName}`, color);
      });
      
      // Show environment variable categories
      log('');
      log('Variable categories:', 'cyan');
      
      const categories = {
        'Database': ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
        'Authentication': ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'CLERK_WEBHOOK_SECRET'],
        'Application': ['NODE_ENV', 'NEXT_PUBLIC_APP_URL', 'VERCEL_URL'],
        'Phase.dev': ['PHASE_SERVICE_TOKEN']
      };
      
      Object.entries(categories).forEach(([category, vars]) => {
        const found = vars.filter(varName => result.variables[varName]);
        log(`   ${category}: ${found.length}/${vars.length} variables`, found.length === vars.length ? 'green' : 'yellow');
      });
      
    } else {
      log(`❌ Environment loading failed (${loadTime}ms)`, 'red');
      log(`   Error: ${result.error}`, 'red');
    }
    
  } catch (error) {
    log(`❌ Environment loading debug failed: ${error.message}`, 'red');
    console.error(error);
  }
}

/**
 * Debug fallback manager
 */
async function debugFallbackManager() {
  logHeader('Environment Fallback Manager Debug');
  
  try {
    const { EnvironmentFallbackManager } = require('../packages/config/src/environment-fallback-manager');
    
    const manager = new EnvironmentFallbackManager();
    
    logSection('Phase.dev Only (No Fallback)');
    
    const phaseStart = Date.now();
    const phaseResult = await manager.loadEnvironment('AI.C9d.Web', 'development', {
      fallbackToLocal: false,
      forceReload: true
    });
    const phaseTime = Date.now() - phaseStart;
    
    if (phaseResult.success) {
      log(`✅ Phase.dev loading successful (${phaseTime}ms)`, 'green');
      log(`   Variables: ${Object.keys(phaseResult.variables).length}`, 'blue');
      log(`   Source: ${phaseResult.source}`, 'blue');
    } else {
      log(`❌ Phase.dev loading failed (${phaseTime}ms)`, 'red');
      log(`   Error: ${phaseResult.error}`, 'red');
    }
    
    logSection('With Local Fallback');
    
    const fallbackStart = Date.now();
    const fallbackResult = await manager.loadEnvironment('AI.C9d.Web', 'development', {
      fallbackToLocal: true,
      forceReload: true
    });
    const fallbackTime = Date.now() - fallbackStart;
    
    if (fallbackResult.success) {
      log(`✅ Fallback loading successful (${fallbackTime}ms)`, 'green');
      log(`   Variables: ${Object.keys(fallbackResult.variables).length}`, 'blue');
      log(`   Source: ${fallbackResult.source}`, 'blue');
      
      if (fallbackResult.diagnostics) {
        log('');
        log('Diagnostics:', 'cyan');
        log(`   Phase.dev attempted: ${fallbackResult.diagnostics.phaseAttempted}`, 'blue');
        log(`   Phase.dev success: ${fallbackResult.diagnostics.phaseSuccess}`, 'blue');
        log(`   Local fallback used: ${fallbackResult.diagnostics.localFallbackUsed}`, 'blue');
      }
    } else {
      log(`❌ Fallback loading failed (${fallbackTime}ms)`, 'red');
      log(`   Error: ${fallbackResult.error}`, 'red');
    }
    
  } catch (error) {
    log(`❌ Fallback manager debug failed: ${error.message}`, 'red');
    console.error(error);
  }
}

/**
 * Debug system information
 */
function debugSystemInfo() {
  logHeader('System Information');
  
  log(`Node.js version: ${process.version}`, 'blue');
  log(`Platform: ${process.platform}`, 'blue');
  log(`Architecture: ${process.arch}`, 'blue');
  log(`Working directory: ${process.cwd()}`, 'blue');
  
  // Check package versions
  try {
    const configPackage = require('../packages/config/package.json');
    log(`@c9d/config version: ${configPackage.version}`, 'blue');
    
    if (configPackage.dependencies['@phase.dev/phase-node']) {
      log(`Phase.dev SDK version: ${configPackage.dependencies['@phase.dev/phase-node']}`, 'blue');
    }
  } catch (error) {
    log('Could not read package information', 'yellow');
  }
  
  // Check environment variables
  logSection('Environment Variables');
  
  const envVars = [
    'NODE_ENV',
    'PHASE_SERVICE_TOKEN',
    'DEBUG'
  ];
  
  envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const displayValue = varName === 'PHASE_SERVICE_TOKEN' 
        ? `${value.substring(0, 10)}...` 
        : value;
      log(`   ${varName}: ${displayValue}`, 'blue');
    } else {
      log(`   ${varName}: (not set)`, 'yellow');
    }
  });
}

/**
 * Main debug function
 */
async function main() {
  log('🔍 Phase.dev Configuration Debug Tool', 'bright');
  log('====================================', 'bright');
  
  // Run all debug functions
  debugSystemInfo();
  await debugTokenLoading();
  await debugSDKClient();
  await debugEnvironmentLoading();
  await debugFallbackManager();
  
  logHeader('Debug Complete');
  log('');
  log('If you found issues, refer to:', 'cyan');
  log('  • Setup guide: docs/phase-dev-setup.md', 'blue');
  log('  • Troubleshooting: docs/troubleshooting-phase-dev.md', 'blue');
  log('  • Setup validation: pnpm run setup:phase-dev', 'blue');
}

// Run the debug if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    log(`❌ Debug script failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  debugTokenLoading,
  debugSDKClient,
  debugEnvironmentLoading,
  debugFallbackManager,
  debugSystemInfo
};