#!/usr/bin/env node

/**
 * Enhanced Vercel build script with comprehensive error handling
 * This script runs during Vercel build process to:
 * 1. Load environment variables from Phase.dev
 * 2. Validate required configuration
 * 3. Execute the Turbo build process with error handling
 * 4. Generate diagnostic information on failures
 */

const { execSync } = require('child_process');
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

async function validatePhaseIntegration() {
  logStep('PHASE', 'Validating Phase.dev integration...');
  
  const phaseToken = process.env.PHASE_SERVICE_TOKEN;
  
  if (!phaseToken) {
    logWarning('PHASE_SERVICE_TOKEN not found - Phase.dev integration disabled');
    logWarning('Falling back to Vercel environment variables');
    return false;
  }
  
  if (phaseToken.length < 10) {
    logError('PHASE_SERVICE_TOKEN appears to be invalid (too short)');
    throw new Error('Invalid Phase.dev service token');
  }
  
  logSuccess('Phase.dev service token found and validated');
  return true;
}

async function testPhaseConnection() {
  logStep('PHASE', 'Testing Phase.dev connection...');
  
  try {
    // Import the Phase.dev configuration dynamically
    const { createPhaseConfigFromEnv, loadEnvironmentWithFallback } = require('../apps/web/lib/config/phase');
    
    const phaseConfig = createPhaseConfigFromEnv();
    if (!phaseConfig) {
      logWarning('No Phase.dev configuration found');
      return false;
    }
    
    // Test connection with a timeout
    const envVars = await Promise.race([
      loadEnvironmentWithFallback(phaseConfig),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Phase.dev connection timeout')), 15000)
      )
    ]);
    
    const phaseVarCount = Object.keys(envVars).filter(key => !process.env[key]).length;
    logSuccess(`Phase.dev connection successful - loaded ${phaseVarCount} additional variables`);
    return true;
    
  } catch (error) {
    logWarning(`Phase.dev connection failed: ${error.message}`);
    logWarning('Continuing with Vercel environment variables only');
    return false;
  }
}

function validateRequiredEnvironmentVariables() {
  logStep('ENV', 'Validating required environment variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    logError(`Missing required environment variables: ${missingVars.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  logSuccess(`All ${requiredVars.length} required environment variables are present`);
}

function runTurboBuild() {
  logStep('BUILD', 'Starting Turbo build process...');
  
  try {
    // Run the Turbo build command with enhanced error handling
    execSync('turbo build --filter=@c9d/web', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });
    
    logSuccess('Turbo build completed successfully');
    
  } catch (error) {
    logError(`Turbo build failed: ${error.message}`);
    
    // Generate detailed error diagnostics
    generateBuildDiagnostics(error);
    
    throw error;
  }
}

function generateBuildDiagnostics(buildError) {
  logStep('DIAGNOSTICS', 'Generating build diagnostics...');
  
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      error: {
        message: buildError.message,
        code: buildError.code,
        signal: buildError.signal,
        status: buildError.status
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
        env: process.env.NODE_ENV
      },
      system: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid
      },
      configuration: {
        phaseConfigured: !!process.env.PHASE_SERVICE_TOKEN,
        requiredEnvVars: checkRequiredEnvVars()
      },
      buildInfo: getBuildInfo()
    };
    
    // Write diagnostics to file
    const diagnosticsPath = path.join(process.cwd(), 'build-diagnostics.json');
    fs.writeFileSync(diagnosticsPath, JSON.stringify(diagnostics, null, 2));
    
    log(`📊 Build diagnostics written to: ${diagnosticsPath}`, colors.blue);
    
    // Log key diagnostic information
    logError('Build Error Details:');
    console.error(`  Error Code: ${buildError.code || 'N/A'}`);
    console.error(`  Exit Status: ${buildError.status || 'N/A'}`);
    console.error(`  Signal: ${buildError.signal || 'N/A'}`);
    
    logError('Environment Information:');
    console.error(`  Node.js: ${process.version}`);
    console.error(`  Platform: ${process.platform}/${process.arch}`);
    console.error(`  Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    
    // Check for common issues
    const suggestions = generateBuildSuggestions(buildError, diagnostics);
    if (suggestions.length > 0) {
      logError('Suggested Solutions:');
      suggestions.forEach((suggestion, index) => {
        console.error(`  ${index + 1}. ${suggestion}`);
      });
    }
    
  } catch (diagnosticError) {
    logWarning(`Failed to generate diagnostics: ${diagnosticError.message}`);
  }
}

function checkRequiredEnvVars() {
  const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const status = {};
  requiredVars.forEach(varName => {
    status[varName] = !!process.env[varName];
  });
  
  return status;
}

function getBuildInfo() {
  const info = {
    turboVersion: null,
    pnpmVersion: null,
    nextVersion: null
  };
  
  try {
    info.turboVersion = execSync('turbo --version', { encoding: 'utf8' }).trim();
  } catch (e) {
    // Turbo not available
  }
  
  try {
    info.pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
  } catch (e) {
    // pnpm not available
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'apps/web/package.json'), 'utf8'));
    info.nextVersion = packageJson.dependencies?.next || packageJson.devDependencies?.next;
  } catch (e) {
    // Package.json not readable
  }
  
  return info;
}

function generateBuildSuggestions(error, diagnostics) {
  const suggestions = [];
  const errorMessage = error.message.toLowerCase();
  
  // Memory-related issues
  if (diagnostics.system.memoryUsage.heapUsed > 1024 * 1024 * 1024) { // > 1GB
    suggestions.push('Consider increasing memory allocation for the build process');
  }
  
  // Dependency issues
  if (errorMessage.includes('module not found') || errorMessage.includes('cannot resolve')) {
    suggestions.push('Run "pnpm install" to ensure all dependencies are installed');
    suggestions.push('Clear node_modules and reinstall dependencies');
  }
  
  // TypeScript issues
  if (errorMessage.includes('typescript') || errorMessage.includes('type')) {
    suggestions.push('Run "turbo typecheck" to identify specific type errors');
    suggestions.push('Check tsconfig.json configuration');
  }
  
  // Phase.dev issues
  if (!diagnostics.configuration.phaseConfigured) {
    suggestions.push('Verify PHASE_SERVICE_TOKEN is set in Vercel environment variables');
  }
  
  // Environment variable issues
  const missingEnvVars = Object.entries(diagnostics.configuration.requiredEnvVars)
    .filter(([_, present]) => !present)
    .map(([varName]) => varName);
  
  if (missingEnvVars.length > 0) {
    suggestions.push(`Set missing environment variables: ${missingEnvVars.join(', ')}`);
  }
  
  // Cache issues
  if (errorMessage.includes('cache') || errorMessage.includes('turbo')) {
    suggestions.push('Clear Turbo cache and try rebuilding');
  }
  
  // Generic suggestions
  suggestions.push('Check the full build logs for more specific error details');
  suggestions.push('Try building locally to reproduce the issue');
  
  return suggestions;
}

function validateBuildOutput() {
  logStep('VALIDATE', 'Validating build output...');
  
  const buildPath = path.join(process.cwd(), 'apps/web/.next');
  
  if (!fs.existsSync(buildPath)) {
    logError('Build output directory not found');
    throw new Error('Build output directory not found');
  }
  
  const requiredFiles = [
    'static',
    'server',
    'BUILD_ID'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(buildPath, file);
    if (!fs.existsSync(filePath)) {
      logError(`Required build file missing: ${file}`);
      throw new Error(`Required build file missing: ${file}`);
    }
  }
  
  logSuccess('Build output validation passed');
}

async function main() {
  try {
    log('🚀 Starting Vercel build with Phase.dev integration', colors.bright);
    log('================================================', colors.bright);
    
    // Step 1: Validate Phase.dev integration
    const phaseEnabled = await validatePhaseIntegration();
    
    // Step 2: Test Phase.dev connection if enabled
    if (phaseEnabled) {
      await testPhaseConnection();
    }
    
    // Step 3: Validate required environment variables
    validateRequiredEnvironmentVariables();
    
    // Step 4: Run Turbo build
    runTurboBuild();
    
    // Step 5: Validate build output
    validateBuildOutput();
    
    log('================================================', colors.bright);
    log('🎉 Vercel build completed successfully!', colors.green + colors.bright);
    
  } catch (error) {
    log('================================================', colors.bright);
    logError(`Build failed: ${error.message}`);
    
    // Generate comprehensive diagnostics on failure
    generateBuildDiagnostics(error);
    
    // Log additional debugging information
    log('\n🔍 Debug Information:', colors.yellow);
    log(`Node.js version: ${process.version}`);
    log(`Working directory: ${process.cwd()}`);
    log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
    log(`Phase.dev token present: ${!!process.env.PHASE_SERVICE_TOKEN}`);
    log(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    
    process.exit(1);
  }
}

// Run the build script
main().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});