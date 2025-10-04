#!/usr/bin/env node

/**
 * Ensures env-wrapper is available before running database commands
 * This is important for deployment scenarios where packages need to be built first
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function log(message) {
  console.log(`[ensure-env-wrapper] ${message}`);
}

function checkEnvWrapperExists() {
  const envToolsPath = path.join(__dirname, '..', 'packages', 'env-tools', 'dist', 'cli.js');
  return fs.existsSync(envToolsPath);
}

function buildPackages() {
  log('Building packages to ensure env-wrapper is available...');
  try {
    execSync('pnpm build:packages', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    log('✅ Packages built successfully');
  } catch (error) {
    log('❌ Failed to build packages');
    process.exit(1);
  }
}

function main() {
  log('Checking if env-wrapper is available...');
  
  if (!checkEnvWrapperExists()) {
    log('env-wrapper not found, building packages...');
    buildPackages();
  } else {
    log('✅ env-wrapper is already available');
  }
  
  // Test that env-wrapper works
  try {
    execSync('pnpm exec env-wrapper --version', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    log('✅ env-wrapper is working correctly');
  } catch (error) {
    log('❌ env-wrapper test failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
