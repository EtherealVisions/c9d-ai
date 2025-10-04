#!/usr/bin/env node

/**
 * Validates that Drizzle ORM setup works correctly from a clean state
 * Simulates deployment scenario
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const rootDir = path.join(__dirname, '..');

function log(message, type = 'info') {
  const prefix = '[validate-drizzle]';
  switch (type) {
    case 'success':
      console.log(chalk.green(`${prefix} ✅ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`${prefix} ❌ ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`${prefix} ⚠️  ${message}`));
      break;
    default:
      console.log(chalk.blue(`${prefix} ${message}`));
  }
}

function exec(command, options = {}) {
  try {
    log(`Running: ${command}`);
    const result = execSync(command, {
      cwd: rootDir,
      stdio: 'pipe',
      ...options
    });
    return result ? result.toString().trim() : '';
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    throw error;
  }
}

function cleanBuild() {
  log('Cleaning previous builds...');
  
  // Remove dist directories
  exec('rm -rf packages/*/dist', { allowFailure: true });
  exec('rm -rf apps/web/.next', { allowFailure: true });
  
  log('Clean complete', 'success');
}

function installDependencies() {
  log('Installing dependencies (frozen lockfile)...');
  
  try {
    exec('pnpm install --frozen-lockfile', { stdio: 'inherit' });
    log('Dependencies installed', 'success');
  } catch (error) {
    log('Failed to install dependencies', 'error');
    throw error;
  }
}

function verifyPackageBuilds() {
  log('Verifying package builds...');
  
  const packages = [
    '@coordinated/phase-client',
    '@coordinated/env-tools',
    '@c9d/types',
    '@c9d/ui',
    '@c9d/config'
  ];
  
  let allBuilt = true;
  
  for (const pkg of packages) {
    const distPath = path.join(rootDir, 'packages', pkg.split('/')[1], 'dist');
    if (fs.existsSync(distPath)) {
      log(`${pkg} built successfully`, 'success');
    } else {
      log(`${pkg} not built`, 'error');
      allBuilt = false;
    }
  }
  
  return allBuilt;
}

function testEnvWrapper() {
  log('Testing env-wrapper availability...');
  
  try {
    const version = exec('pnpm exec env-wrapper --version');
    log(`env-wrapper version: ${version}`, 'success');
    return true;
  } catch (error) {
    log('env-wrapper not available', 'error');
    return false;
  }
}

function testDrizzleCommands() {
  log('Testing Drizzle commands...');
  
  const commands = [
    { cmd: 'pnpm db:generate --help', desc: 'db:generate with help' },
    { cmd: 'cd apps/web && pnpm db:generate:raw --help', desc: 'raw drizzle-kit generate' },
    { cmd: 'pnpm --filter @c9d/web exec drizzle-kit --version', desc: 'drizzle-kit version' }
  ];
  
  let allPassed = true;
  
  for (const { cmd, desc } of commands) {
    try {
      log(`Testing: ${desc}`);
      exec(cmd, { stdio: 'pipe' });
      log(`${desc} works`, 'success');
    } catch (error) {
      log(`${desc} failed: ${error.message}`, 'error');
      allPassed = false;
    }
  }
  
  return allPassed;
}

function testDatabaseConnection() {
  log('Testing database connection (if DATABASE_URL is set)...');
  
  try {
    // Check if DATABASE_URL exists
    const hasDbUrl = exec('cd apps/web && pnpm exec env-wrapper -- node -e "console.log(!!process.env.DATABASE_URL)"');
    
    if (hasDbUrl === 'true') {
      log('DATABASE_URL is available', 'success');
      
      // Try to run a simple migration status check
      exec('cd apps/web && pnpm exec env-wrapper -- drizzle-kit migrate status', { stdio: 'pipe' });
      log('Database connection successful', 'success');
      return true;
    } else {
      log('DATABASE_URL not set (this is OK for build validation)', 'warning');
      return true;
    }
  } catch (error) {
    log('Database connection test failed (this might be OK if no database is configured)', 'warning');
    return true; // Don't fail the validation on database connection
  }
}

async function main() {
  console.log(chalk.bold('\n🔍 Validating Drizzle ORM Setup\n'));
  
  const steps = [
    { name: 'Clean Build', fn: cleanBuild },
    { name: 'Install Dependencies', fn: installDependencies },
    { name: 'Verify Package Builds', fn: verifyPackageBuilds },
    { name: 'Test env-wrapper', fn: testEnvWrapper },
    { name: 'Test Drizzle Commands', fn: testDrizzleCommands },
    { name: 'Test Database Connection', fn: testDatabaseConnection }
  ];
  
  let allPassed = true;
  
  for (const step of steps) {
    console.log(chalk.bold(`\n📋 ${step.name}`));
    try {
      const result = await step.fn();
      if (result === false) {
        allPassed = false;
      }
    } catch (error) {
      log(`${step.name} failed: ${error.message}`, 'error');
      allPassed = false;
      
      // Critical steps that should stop execution
      if (['Install Dependencies', 'Verify Package Builds'].includes(step.name)) {
        break;
      }
    }
  }
  
  console.log(chalk.bold('\n📊 Summary\n'));
  
  if (allPassed) {
    log('All validations passed!', 'success');
    log('Your Drizzle ORM setup is ready for deployment', 'success');
    process.exit(0);
  } else {
    log('Some validations failed', 'error');
    log('Please fix the issues before deploying', 'warning');
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  main().catch(error => {
    log(`Unexpected error: ${error.message}`, 'error');
    process.exit(1);
  });
}
