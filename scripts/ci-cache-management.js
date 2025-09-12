#!/usr/bin/env node

/**
 * CI/CD Cache Management Script
 * This script helps manage caching strategies for the CI/CD pipeline
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function getCacheInfo() {
  logStep('CACHE', 'Gathering cache information...');
  
  const cacheInfo = {
    turbo: {
      cacheDir: '.turbo/cache',
      size: 0,
      files: 0
    },
    pnpm: {
      cacheDir: null,
      size: 0
    },
    node_modules: {
      size: 0,
      packages: 0
    }
  };
  
  // Get Turbo cache info
  try {
    const turboCacheDir = path.join(process.cwd(), '.turbo/cache');
    if (fs.existsSync(turboCacheDir)) {
      const files = fs.readdirSync(turboCacheDir);
      cacheInfo.turbo.files = files.length;
      
      let totalSize = 0;
      files.forEach(file => {
        const filePath = path.join(turboCacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });
      cacheInfo.turbo.size = totalSize;
    }
  } catch (error) {
    logWarning(`Failed to get Turbo cache info: ${error.message}`);
  }
  
  // Get pnpm cache info
  try {
    const pnpmCacheDir = execSync('pnpm store path', { encoding: 'utf8' }).trim();
    cacheInfo.pnpm.cacheDir = pnpmCacheDir;
    
    if (fs.existsSync(pnpmCacheDir)) {
      const stats = execSync(`du -sb "${pnpmCacheDir}"`, { encoding: 'utf8' });
      cacheInfo.pnpm.size = parseInt(stats.split('\t')[0]);
    }
  } catch (error) {
    logWarning(`Failed to get pnpm cache info: ${error.message}`);
  }
  
  // Get node_modules info
  try {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      const packages = fs.readdirSync(nodeModulesPath).filter(dir => 
        !dir.startsWith('.') && fs.statSync(path.join(nodeModulesPath, dir)).isDirectory()
      );
      cacheInfo.node_modules.packages = packages.length;
      
      const stats = execSync(`du -sb "${nodeModulesPath}"`, { encoding: 'utf8' });
      cacheInfo.node_modules.size = parseInt(stats.split('\t')[0]);
    }
  } catch (error) {
    logWarning(`Failed to get node_modules info: ${error.message}`);
  }
  
  return cacheInfo;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function displayCacheInfo(cacheInfo) {
  log('\n📊 Cache Information', colors.bright);
  log('===================', colors.bright);
  
  log(`\nTurbo Cache:`, colors.blue);
  log(`  Directory: ${cacheInfo.turbo.cacheDir}`);
  log(`  Files: ${cacheInfo.turbo.files}`);
  log(`  Size: ${formatBytes(cacheInfo.turbo.size)}`);
  
  log(`\npnpm Cache:`, colors.blue);
  log(`  Directory: ${cacheInfo.pnpm.cacheDir || 'Not found'}`);
  log(`  Size: ${formatBytes(cacheInfo.pnpm.size)}`);
  
  log(`\nnode_modules:`, colors.blue);
  log(`  Packages: ${cacheInfo.node_modules.packages}`);
  log(`  Size: ${formatBytes(cacheInfo.node_modules.size)}`);
  
  const totalSize = cacheInfo.turbo.size + cacheInfo.pnpm.size + cacheInfo.node_modules.size;
  log(`\nTotal Cache Size: ${formatBytes(totalSize)}`, colors.bright);
}

function cleanTurboCache() {
  logStep('CLEAN', 'Cleaning Turbo cache...');
  
  try {
    execSync('turbo clean', { stdio: 'inherit' });
    
    const turboCacheDir = path.join(process.cwd(), '.turbo/cache');
    if (fs.existsSync(turboCacheDir)) {
      fs.rmSync(turboCacheDir, { recursive: true, force: true });
    }
    
    logSuccess('Turbo cache cleaned');
  } catch (error) {
    logError(`Failed to clean Turbo cache: ${error.message}`);
  }
}

function cleanPnpmCache() {
  logStep('CLEAN', 'Cleaning pnpm cache...');
  
  try {
    execSync('pnpm store prune', { stdio: 'inherit' });
    logSuccess('pnpm cache cleaned');
  } catch (error) {
    logError(`Failed to clean pnpm cache: ${error.message}`);
  }
}

function cleanNodeModules() {
  logStep('CLEAN', 'Cleaning node_modules...');
  
  try {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    }
    
    // Also clean package-specific node_modules
    const appsDir = path.join(process.cwd(), 'apps');
    const packagesDir = path.join(process.cwd(), 'packages');
    
    [appsDir, packagesDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        const subdirs = fs.readdirSync(dir);
        subdirs.forEach(subdir => {
          const nodeModulesPath = path.join(dir, subdir, 'node_modules');
          if (fs.existsSync(nodeModulesPath)) {
            fs.rmSync(nodeModulesPath, { recursive: true, force: true });
          }
        });
      }
    });
    
    logSuccess('node_modules cleaned');
  } catch (error) {
    logError(`Failed to clean node_modules: ${error.message}`);
  }
}

function optimizeCache() {
  logStep('OPTIMIZE', 'Optimizing cache configuration...');
  
  try {
    // Update Turbo configuration for better caching
    const turboConfigPath = path.join(process.cwd(), 'turbo.json');
    if (fs.existsSync(turboConfigPath)) {
      const turboConfig = JSON.parse(fs.readFileSync(turboConfigPath, 'utf8'));
      
      // Ensure remote cache is enabled
      if (!turboConfig.remoteCache) {
        turboConfig.remoteCache = { enabled: true };
      }
      
      // Add cache optimization settings
      if (!turboConfig.globalEnv) {
        turboConfig.globalEnv = [];
      }
      
      if (!turboConfig.globalEnv.includes('CI')) {
        turboConfig.globalEnv.push('CI');
      }
      
      fs.writeFileSync(turboConfigPath, JSON.stringify(turboConfig, null, 2));
      logSuccess('Turbo configuration optimized');
    }
    
    // Create .turbo directory if it doesn't exist
    const turboDir = path.join(process.cwd(), '.turbo');
    if (!fs.existsSync(turboDir)) {
      fs.mkdirSync(turboDir, { recursive: true });
    }
    
    // Create cache directory
    const cacheDir = path.join(turboDir, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    logSuccess('Cache optimization completed');
  } catch (error) {
    logError(`Failed to optimize cache: ${error.message}`);
  }
}

function generateCacheReport() {
  logStep('REPORT', 'Generating cache report...');
  
  const cacheInfo = getCacheInfo();
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      ci: !!process.env.CI
    },
    cache: cacheInfo,
    recommendations: []
  };
  
  // Generate recommendations
  if (cacheInfo.turbo.size > 1024 * 1024 * 100) { // > 100MB
    report.recommendations.push('Consider cleaning Turbo cache - size is over 100MB');
  }
  
  if (cacheInfo.pnpm.size > 1024 * 1024 * 1024) { // > 1GB
    report.recommendations.push('Consider pruning pnpm cache - size is over 1GB');
  }
  
  if (cacheInfo.node_modules.packages > 1000) {
    report.recommendations.push('Large number of packages detected - consider dependency audit');
  }
  
  const reportPath = path.join(process.cwd(), 'cache-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logSuccess(`Cache report generated: ${reportPath}`);
  return report;
}

function main() {
  const command = process.argv[2];
  
  log('🗄️  CI/CD Cache Management', colors.bright);
  log('==========================', colors.bright);
  
  switch (command) {
    case 'info':
      const cacheInfo = getCacheInfo();
      displayCacheInfo(cacheInfo);
      break;
      
    case 'clean':
      const target = process.argv[3];
      if (target === 'turbo') {
        cleanTurboCache();
      } else if (target === 'pnpm') {
        cleanPnpmCache();
      } else if (target === 'node_modules') {
        cleanNodeModules();
      } else {
        cleanTurboCache();
        cleanPnpmCache();
        cleanNodeModules();
      }
      break;
      
    case 'optimize':
      optimizeCache();
      break;
      
    case 'report':
      const report = generateCacheReport();
      displayCacheInfo(report.cache);
      
      if (report.recommendations.length > 0) {
        log('\n💡 Recommendations:', colors.yellow);
        report.recommendations.forEach((rec, index) => {
          log(`  ${index + 1}. ${rec}`);
        });
      }
      break;
      
    default:
      log('Usage: node scripts/ci-cache-management.js <command>', colors.yellow);
      log('Commands:', colors.yellow);
      log('  info                 - Display cache information');
      log('  clean [target]       - Clean cache (targets: turbo, pnpm, node_modules, or all)');
      log('  optimize             - Optimize cache configuration');
      log('  report               - Generate detailed cache report');
      break;
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Run the script
main();