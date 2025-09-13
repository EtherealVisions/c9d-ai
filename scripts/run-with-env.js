#!/usr/bin/env node

/**
 * Run commands with environment variable loading
 * This script provides a unified way to run commands with proper environment variable loading,
 * supporting both Phase.dev integration and fallback to local environment variables.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
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
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

/**
 * Log with color (only in verbose mode)
 */
function log(message, color = colors.reset) {
  if (process.env.VERBOSE === 'true' || process.env.DEBUG === 'true') {
    console.log(`${color}${message}${colors.reset}`);
  }
}

/**
 * Check if Phase CLI is available
 */
function isPhaseAvailable() {
  try {
    execSync('phase --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if Phase.dev service token is available
 */
function hasPhaseToken() {
  return !!(process.env.PHASE_SERVICE_TOKEN && process.env.PHASE_SERVICE_TOKEN.trim());
}

/**
 * Load environment variables from .env files
 */
function loadEnvFiles() {
  const envVars = {};
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Define the order of .env files to load (later files override earlier ones)
  const envFiles = [
    '.env',
    `.env.${nodeEnv}`,
    '.env.local'
  ];

  // Find workspace root (look for pnpm-workspace.yaml)
  let rootPath = process.cwd();
  while (rootPath !== path.dirname(rootPath)) {
    if (fs.existsSync(path.join(rootPath, 'pnpm-workspace.yaml'))) {
      break;
    }
    rootPath = path.dirname(rootPath);
  }

  for (const envFile of envFiles) {
    const envPath = path.join(rootPath, envFile);
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const parsed = parseEnvFile(envContent);
        Object.assign(envVars, parsed);
        log(`[EnvLoader] Loaded ${Object.keys(parsed).length} variables from ${envFile}`, colors.dim);
      } catch (error) {
        log(`[EnvLoader] Failed to load ${envFile}: ${error.message}`, colors.yellow);
      }
    }
  }

  return envVars;
}

/**
 * Parse .env file content
 */
function parseEnvFile(content) {
  const env = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Parse key=value pairs
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, equalIndex).trim();
    let value = trimmedLine.slice(equalIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

/**
 * Run command with Phase.dev
 */
function runWithPhase(command, args) {
  log('[EnvLoader] Using Phase.dev for environment variables', colors.green);
  
  const phaseArgs = [
    'run',
    '--context',
    'AI.C9d.Web',
    '--',
    command,
    ...args
  ];
  
  const child = spawn('phase', phaseArgs, {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('close', (code) => {
    process.exit(code);
  });
  
  child.on('error', (error) => {
    console.error(`[EnvLoader] Phase.dev execution failed: ${error.message}`);
    process.exit(1);
  });
}

/**
 * Run command with fallback environment loading
 */
function runWithFallback(command, args) {
  log('[EnvLoader] Using fallback environment variable loading', colors.yellow);
  
  // Load environment variables from .env files
  const fileEnv = loadEnvFiles();
  
  // Merge environment variables with proper precedence:
  // 1. process.env (highest priority - runtime environment)
  // 2. .env files (lower priority - local configuration)
  const mergedEnv = {
    ...fileEnv,
    ...process.env
  };
  
  log(`[EnvLoader] Loaded ${Object.keys(fileEnv).length} variables from .env files`, colors.dim);
  log(`[EnvLoader] Total environment variables: ${Object.keys(mergedEnv).length}`, colors.dim);
  
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: mergedEnv
  });
  
  child.on('close', (code) => {
    process.exit(code);
  });
  
  child.on('error', (error) => {
    console.error(`[EnvLoader] Command execution failed: ${error.message}`);
    process.exit(1);
  });
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node run-with-env.js <command> [args...]');
    process.exit(1);
  }
  
  const [command, ...commandArgs] = args;
  
  // Determine which environment loading strategy to use
  const phaseAvailable = isPhaseAvailable();
  const phaseToken = hasPhaseToken();
  const usePhase = phaseAvailable && phaseToken;
  
  if (usePhase) {
    runWithPhase(command, commandArgs);
  } else {
    if (!phaseAvailable && phaseToken) {
      log('[EnvLoader] Phase CLI not available, falling back to local environment', colors.yellow);
    } else if (phaseAvailable && !phaseToken) {
      log('[EnvLoader] Phase service token not found, falling back to local environment', colors.yellow);
    } else {
      log('[EnvLoader] Phase.dev not configured, using local environment', colors.dim);
    }
    
    runWithFallback(command, commandArgs);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  process.exit(130);
});

process.on('SIGTERM', () => {
  process.exit(143);
});

// Run the main function
main();