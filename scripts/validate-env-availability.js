#!/usr/bin/env node

/**
 * Validate environment variable availability for pnpm commands
 * This script ensures that critical environment variables are available
 * during build, test, and development commands across the monorepo.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Critical environment variables that should be available
 */
const CRITICAL_ENV_VARS = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

/**
 * Optional environment variables (Phase.dev integration)
 */
const OPTIONAL_ENV_VARS = [
  'PHASE_SERVICE_TOKEN',
  'NODE_ENV',
  'VERCEL',
  'DATABASE_URL'
];

/**
 * Commands to test environment variable availability
 */
const TEST_COMMANDS = [
  { name: 'typecheck', command: 'pnpm typecheck --filter=@c9d/web', timeout: 30000 },
  { name: 'lint', command: 'pnpm lint --filter=@c9d/web', timeout: 20000 },
  { name: 'test', command: 'pnpm test --filter=@c9d/web', timeout: 60000 },
  { name: 'build', command: 'pnpm build --filter=@c9d/web', timeout: 120000 }
];

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
 * Check if environment variable is available
 */
function checkEnvVar(varName, required = false) {
  const value = process.env[varName];
  const available = value && value.trim() !== '';
  
  if (available) {
    log(`  ✅ ${varName}: Available`, colors.green);
    return true;
  } else {
    const level = required ? '❌' : '⚠️';
    const colorLevel = required ? colors.red : colors.yellow;
    log(`  ${level} ${varName}: ${required ? 'Missing (Required)' : 'Missing (Optional)'}`, colorLevel);
    return !required;
  }
}

/**
 * Check Phase.dev integration
 */
function checkPhaseIntegration() {
  log('\n📋 Checking Phase.dev Integration:', colors.cyan);
  
  const hasPhaseToken = process.env.PHASE_SERVICE_TOKEN && process.env.PHASE_SERVICE_TOKEN.trim() !== '';
  
  if (hasPhaseToken) {
    log('  ✅ Phase.dev service token available', colors.green);
    log('  ✅ Phase.dev integration enabled', colors.green);
    return true;
  } else {
    log('  ⚠️  Phase.dev service token not found', colors.yellow);
    log('  ⚠️  Using fallback to local environment variables', colors.yellow);
    return false;
  }
}

/**
 * Check environment file availability
 */
function checkEnvFiles() {
  log('\n📁 Checking Environment Files:', colors.cyan);
  
  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.test'
  ];
  
  let foundFiles = 0;
  
  for (const envFile of envFiles) {
    const filePath = path.join(process.cwd(), envFile);
    if (fs.existsSync(filePath)) {
      log(`  ✅ ${envFile}: Found`, colors.green);
      foundFiles++;
    } else {
      log(`  ⚠️  ${envFile}: Not found`, colors.yellow);
    }
  }
  
  if (foundFiles === 0) {
    log('  ❌ No environment files found', colors.red);
    return false;
  }
  
  return true;
}

/**
 * Test command execution with environment variables
 */
async function testCommand(testConfig) {
  log(`\n🧪 Testing: ${testConfig.name}`, colors.cyan);
  
  try {
    const startTime = Date.now();
    
    // Execute command with timeout
    execSync(testConfig.command, {
      stdio: 'pipe',
      timeout: testConfig.timeout,
      encoding: 'utf8'
    });
    
    const duration = Date.now() - startTime;
    log(`  ✅ ${testConfig.name}: Passed (${duration}ms)`, colors.green);
    return true;
    
  } catch (error) {
    log(`  ❌ ${testConfig.name}: Failed`, colors.red);
    
    if (error.status) {
      log(`     Exit code: ${error.status}`, colors.red);
    }
    
    if (error.signal === 'SIGTERM') {
      log(`     Timeout after ${testConfig.timeout}ms`, colors.red);
    }
    
    if (error.stderr) {
      const stderr = error.stderr.toString().trim();
      if (stderr) {
        log(`     Error: ${stderr.split('\n')[0]}`, colors.red);
      }
    }
    
    return false;
  }
}

/**
 * Generate environment validation report
 */
function generateReport(results) {
  log('\n📊 Environment Validation Report:', colors.cyan);
  log('=' .repeat(50), colors.cyan);
  
  const { envVars, phaseIntegration, envFiles, commands } = results;
  
  // Environment variables summary
  const criticalPassed = envVars.critical.filter(r => r.passed).length;
  const criticalTotal = envVars.critical.length;
  const optionalPassed = envVars.optional.filter(r => r.passed).length;
  const optionalTotal = envVars.optional.length;
  
  log(`\nEnvironment Variables:`, colors.blue);
  log(`  Critical: ${criticalPassed}/${criticalTotal} available`, 
      criticalPassed === criticalTotal ? colors.green : colors.red);
  log(`  Optional: ${optionalPassed}/${optionalTotal} available`, colors.yellow);
  
  // Phase.dev integration
  log(`\nPhase.dev Integration:`, colors.blue);
  log(`  Status: ${phaseIntegration ? 'Enabled' : 'Disabled (using fallback)'}`, 
      phaseIntegration ? colors.green : colors.yellow);
  
  // Environment files
  log(`\nEnvironment Files:`, colors.blue);
  log(`  Status: ${envFiles ? 'Found' : 'Not found'}`, 
      envFiles ? colors.green : colors.yellow);
  
  // Command execution
  const commandsPassed = commands.filter(r => r.passed).length;
  const commandsTotal = commands.length;
  
  log(`\nCommand Execution:`, colors.blue);
  log(`  Status: ${commandsPassed}/${commandsTotal} commands passed`, 
      commandsPassed === commandsTotal ? colors.green : colors.red);
  
  // Overall status
  const overallPassed = criticalPassed === criticalTotal && commandsPassed === commandsTotal;
  
  log(`\nOverall Status:`, colors.blue);
  log(`  ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`, 
      overallPassed ? colors.green : colors.red);
  
  if (!overallPassed) {
    log('\n💡 Recommendations:', colors.yellow);
    
    if (criticalPassed < criticalTotal) {
      log('  • Set missing critical environment variables', colors.yellow);
      log('  • Check .env.example for required variables', colors.yellow);
    }
    
    if (!phaseIntegration) {
      log('  • Configure Phase.dev service token for centralized config', colors.yellow);
    }
    
    if (!envFiles) {
      log('  • Create .env.local file with required variables', colors.yellow);
    }
    
    if (commandsPassed < commandsTotal) {
      log('  • Fix failing commands before proceeding', colors.yellow);
      log('  • Check build logs for specific error details', colors.yellow);
    }
  }
  
  return overallPassed;
}

/**
 * Main validation function
 */
async function validateEnvironment() {
  log('🔍 Environment Variable Availability Validation', colors.cyan);
  log('=' .repeat(50), colors.cyan);
  
  const results = {
    envVars: {
      critical: [],
      optional: []
    },
    phaseIntegration: false,
    envFiles: false,
    commands: []
  };
  
  // Check critical environment variables
  log('\n🔑 Checking Critical Environment Variables:', colors.cyan);
  for (const varName of CRITICAL_ENV_VARS) {
    const passed = checkEnvVar(varName, true);
    results.envVars.critical.push({ name: varName, passed });
  }
  
  // Check optional environment variables
  log('\n🔧 Checking Optional Environment Variables:', colors.cyan);
  for (const varName of OPTIONAL_ENV_VARS) {
    const passed = checkEnvVar(varName, false);
    results.envVars.optional.push({ name: varName, passed });
  }
  
  // Check Phase.dev integration
  results.phaseIntegration = checkPhaseIntegration();
  
  // Check environment files
  results.envFiles = checkEnvFiles();
  
  // Test command execution (only if critical env vars are available)
  const criticalEnvAvailable = results.envVars.critical.every(r => r.passed);
  
  if (criticalEnvAvailable) {
    log('\n⚡ Testing Command Execution:', colors.cyan);
    
    for (const testConfig of TEST_COMMANDS) {
      const passed = await testCommand(testConfig);
      results.commands.push({ name: testConfig.name, passed });
    }
  } else {
    log('\n⚠️  Skipping command tests due to missing critical environment variables', colors.yellow);
  }
  
  // Generate report
  const overallPassed = generateReport(results);
  
  // Exit with appropriate code
  process.exit(overallPassed ? 0 : 1);
}

// Handle command line arguments
const args = process.argv.slice(2);
const skipTests = args.includes('--skip-tests');
const quickMode = args.includes('--quick');

if (quickMode) {
  // Quick mode: only check environment variables
  TEST_COMMANDS.length = 0;
}

if (skipTests) {
  // Skip command execution tests
  TEST_COMMANDS.length = 0;
}

// Run validation
validateEnvironment().catch(error => {
  log(`\n❌ Validation failed with error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});