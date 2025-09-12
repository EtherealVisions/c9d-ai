#!/usr/bin/env node

/**
 * Deployment Validation Script
 * This script validates deployment readiness and performs post-deployment checks
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const timeout = options.timeout || 10000;
    
    const req = protocol.get(url, {
      timeout: timeout,
      headers: {
        'User-Agent': 'Deployment-Validator/1.0',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: Date.now() - startTime
        });
      });
    });
    
    const startTime = Date.now();
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });
    
    req.setTimeout(timeout);
  });
}

async function validatePreDeployment() {
  logStep('PRE-DEPLOY', 'Validating pre-deployment requirements...');
  
  const validations = [];
  
  // Check build output
  const buildPath = path.join(process.cwd(), 'apps/web/.next');
  if (fs.existsSync(buildPath)) {
    validations.push({ name: 'Build output exists', status: true });
    
    // Check required files
    const requiredFiles = ['BUILD_ID', 'static', 'server'];
    for (const file of requiredFiles) {
      const filePath = path.join(buildPath, file);
      validations.push({
        name: `Required file: ${file}`,
        status: fs.existsSync(filePath)
      });
    }
  } else {
    validations.push({ name: 'Build output exists', status: false });
  }
  
  // Check environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  for (const envVar of requiredEnvVars) {
    validations.push({
      name: `Environment variable: ${envVar}`,
      status: !!process.env[envVar]
    });
  }
  
  // Check Phase.dev configuration
  validations.push({
    name: 'Phase.dev service token',
    status: !!process.env.PHASE_SERVICE_TOKEN
  });
  
  // Check package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    validations.push({
      name: 'Package manager is pnpm',
      status: packageJson.packageManager?.startsWith('pnpm')
    });
  }
  
  // Display results
  const passed = validations.filter(v => v.status).length;
  const total = validations.length;
  
  log('\n📋 Pre-deployment Validation Results:', colors.blue);
  validations.forEach(validation => {
    const status = validation.status ? '✅' : '❌';
    log(`  ${status} ${validation.name}`);
  });
  
  log(`\n📊 Summary: ${passed}/${total} validations passed`, 
    passed === total ? colors.green : colors.yellow);
  
  if (passed !== total) {
    throw new Error(`Pre-deployment validation failed: ${total - passed} checks failed`);
  }
  
  logSuccess('Pre-deployment validation passed');
  return true;
}

async function validatePostDeployment(deploymentUrl) {
  logStep('POST-DEPLOY', `Validating deployment at: ${deploymentUrl}`);
  
  const validations = [];
  const startTime = Date.now();
  
  try {
    // Test main page
    logStep('TEST', 'Testing main page...');
    const mainResponse = await makeRequest(deploymentUrl, { timeout: 15000 });
    validations.push({
      name: 'Main page accessible',
      status: mainResponse.statusCode === 200,
      details: `HTTP ${mainResponse.statusCode}, ${mainResponse.responseTime}ms`
    });
    
    // Test health endpoint
    logStep('TEST', 'Testing health endpoint...');
    const healthResponse = await makeRequest(`${deploymentUrl}/api/health`, { timeout: 10000 });
    validations.push({
      name: 'Health endpoint accessible',
      status: healthResponse.statusCode === 200,
      details: `HTTP ${healthResponse.statusCode}, ${healthResponse.responseTime}ms`
    });
    
    // Parse health response
    if (healthResponse.statusCode === 200) {
      try {
        const healthData = JSON.parse(healthResponse.body);
        validations.push({
          name: 'Health endpoint returns valid JSON',
          status: true,
          details: `Status: ${healthData.status}`
        });
        
        validations.push({
          name: 'Application status is healthy',
          status: healthData.status === 'healthy',
          details: `Status: ${healthData.status}`
        });
        
        if (healthData.phaseConfigured !== undefined) {
          validations.push({
            name: 'Phase.dev integration status',
            status: true,
            details: `Configured: ${healthData.phaseConfigured}`
          });
        }
        
        if (healthData.database !== undefined) {
          validations.push({
            name: 'Database connectivity',
            status: healthData.database === 'connected',
            details: `Status: ${healthData.database}`
          });
        }
      } catch (error) {
        validations.push({
          name: 'Health endpoint returns valid JSON',
          status: false,
          details: `Parse error: ${error.message}`
        });
      }
    }
    
    // Test API endpoints
    logStep('TEST', 'Testing API endpoints...');
    const apiEndpoints = [
      '/api/auth/me',
      '/api/users/status'
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await makeRequest(`${deploymentUrl}${endpoint}`, { timeout: 10000 });
        validations.push({
          name: `API endpoint: ${endpoint}`,
          status: response.statusCode < 500, // Accept 4xx but not 5xx
          details: `HTTP ${response.statusCode}, ${response.responseTime}ms`
        });
      } catch (error) {
        validations.push({
          name: `API endpoint: ${endpoint}`,
          status: false,
          details: `Error: ${error.message}`
        });
      }
    }
    
    // Test security headers
    logStep('TEST', 'Testing security headers...');
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'referrer-policy'
    ];
    
    for (const header of securityHeaders) {
      const headerValue = mainResponse.headers[header];
      validations.push({
        name: `Security header: ${header}`,
        status: !!headerValue,
        details: headerValue || 'Not present'
      });
    }
    
    // Test performance
    const totalTime = Date.now() - startTime;
    validations.push({
      name: 'Response time acceptable',
      status: totalTime < 30000, // 30 seconds total
      details: `Total validation time: ${totalTime}ms`
    });
    
  } catch (error) {
    logError(`Deployment validation failed: ${error.message}`);
    throw error;
  }
  
  // Display results
  const passed = validations.filter(v => v.status).length;
  const total = validations.length;
  
  log('\n📋 Post-deployment Validation Results:', colors.blue);
  validations.forEach(validation => {
    const status = validation.status ? '✅' : '❌';
    const details = validation.details ? ` (${validation.details})` : '';
    log(`  ${status} ${validation.name}${details}`);
  });
  
  log(`\n📊 Summary: ${passed}/${total} validations passed`, 
    passed === total ? colors.green : colors.yellow);
  
  if (passed < total * 0.8) { // Allow 20% failure rate for non-critical checks
    throw new Error(`Post-deployment validation failed: too many checks failed (${total - passed}/${total})`);
  }
  
  logSuccess('Post-deployment validation passed');
  return {
    passed,
    total,
    validations,
    deploymentUrl
  };
}

async function generateDeploymentReport(validationResults) {
  logStep('REPORT', 'Generating deployment report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    deployment: {
      url: validationResults.deploymentUrl,
      environment: process.env.VERCEL_ENV || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown'
    },
    validation: {
      passed: validationResults.passed,
      total: validationResults.total,
      successRate: Math.round((validationResults.passed / validationResults.total) * 100),
      details: validationResults.validations
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    }
  };
  
  const reportPath = path.join(process.cwd(), 'deployment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logSuccess(`Deployment report generated: ${reportPath}`);
  return report;
}

async function performRollback(deploymentUrl) {
  logStep('ROLLBACK', 'Initiating rollback procedure...');
  
  logWarning('Rollback functionality requires Vercel CLI and appropriate permissions');
  logWarning('This is a placeholder for rollback logic');
  
  // In a real implementation, this would:
  // 1. Get the previous successful deployment
  // 2. Promote it to production
  // 3. Update deployment status
  
  const rollbackSteps = [
    'Identify previous successful deployment',
    'Verify previous deployment health',
    'Promote previous deployment to production',
    'Update deployment status',
    'Notify stakeholders'
  ];
  
  log('\n🔄 Rollback Steps:', colors.yellow);
  rollbackSteps.forEach((step, index) => {
    log(`  ${index + 1}. ${step}`);
  });
  
  logWarning('Manual rollback required - please use Vercel dashboard or CLI');
}

async function main() {
  const command = process.argv[2];
  const deploymentUrl = process.argv[3];
  
  log('🚀 Deployment Validation Tool', colors.bright);
  log('=============================', colors.bright);
  
  try {
    switch (command) {
      case 'pre-deploy':
        await validatePreDeployment();
        break;
        
      case 'post-deploy':
        if (!deploymentUrl) {
          logError('Deployment URL is required for post-deployment validation');
          process.exit(1);
        }
        const results = await validatePostDeployment(deploymentUrl);
        await generateDeploymentReport(results);
        break;
        
      case 'rollback':
        if (!deploymentUrl) {
          logError('Deployment URL is required for rollback');
          process.exit(1);
        }
        await performRollback(deploymentUrl);
        break;
        
      default:
        log('Usage: node scripts/deployment-validation.js <command> [url]', colors.yellow);
        log('Commands:', colors.yellow);
        log('  pre-deploy           - Validate pre-deployment requirements');
        log('  post-deploy <url>    - Validate deployment after deployment');
        log('  rollback <url>       - Initiate rollback procedure');
        break;
    }
    
    logSuccess('Deployment validation completed successfully');
    
  } catch (error) {
    logError(`Deployment validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Run the script
main();