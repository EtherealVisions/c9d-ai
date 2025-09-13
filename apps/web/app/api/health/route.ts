import { NextRequest, NextResponse } from 'next/server';
import { getConfigManager } from '@/lib/config/manager';
import { getBuildErrorHandler } from '@/lib/config/build-error-handler';

/**
 * Health check endpoint for deployment validation
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get configuration manager - this can throw if config manager fails
    const configManager = getConfigManager();
    
    // Perform comprehensive health check
    const healthStatus = await performHealthCheck(configManager);
    
    const responseTime = Date.now() - startTime;
    
    // Determine overall health status
    const isHealthy = healthStatus.checks.every(check => check.status === 'pass');
    const httpStatus = isHealthy ? 200 : 503;
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      checks: healthStatus.checks,
      details: healthStatus.details
    }, { status: httpStatus });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: [
        {
          name: 'health_check_execution',
          status: 'fail',
          message: 'Health check execution failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      ]
    }, { status: 500 });
  }
}

/**
 * Detailed health check implementation
 * Internal function used by the GET handler
 */
async function performHealthCheck(configManager: any) {
  const checks = [];
  const details: Record<string, any> = {};

  // 1. Configuration Manager Health
  try {
    const configHealth = configManager.getHealthStatus();
    checks.push({
      name: 'configuration_manager',
      status: configHealth.healthy ? 'pass' : 'fail',
      message: configHealth.healthy ? 'Configuration manager is healthy' : 'Configuration manager has issues',
      details: {
        initialized: configHealth.initialized,
        lastError: configHealth.lastError?.message,
        configValidation: configHealth.configValidation
      }
    });
    
    details.configurationManager = configHealth;
  } catch (error) {
    checks.push({
      name: 'configuration_manager',
      status: 'fail',
      message: 'Configuration manager check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // 2. Phase.dev Integration Health
  try {
    if (configManager.getStats().phaseConfigured) {
      const phaseHealth = configManager.phaseLoader?.getHealthStatus();
      checks.push({
        name: 'phase_integration',
        status: phaseHealth?.healthy ? 'pass' : 'fail',
        message: phaseHealth?.healthy ? 'Phase.dev integration is healthy' : 'Phase.dev integration has issues',
        details: {
          lastError: phaseHealth?.lastError,
          cacheValid: phaseHealth?.cacheValid,
          lastSuccessfulFetch: phaseHealth?.lastSuccessfulFetch
        }
      });
      
      details.phaseIntegration = phaseHealth;
    } else {
      checks.push({
        name: 'phase_integration',
        status: 'pass',
        message: 'Phase.dev integration not configured (using local environment)',
        details: { configured: false }
      });
    }
  } catch (error) {
    checks.push({
      name: 'phase_integration',
      status: 'fail',
      message: 'Phase.dev integration check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // 3. Environment Variables Check
  try {
    const requiredVars = [
      'DATABASE_URL',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !configManager.get(varName));
    
    checks.push({
      name: 'environment_variables',
      status: missingVars.length === 0 ? 'pass' : 'fail',
      message: missingVars.length === 0 
        ? 'All required environment variables are present'
        : `Missing required environment variables: ${missingVars.join(', ')}`,
      details: {
        required: requiredVars.length,
        present: requiredVars.length - missingVars.length,
        missing: missingVars
      }
    });
  } catch (error) {
    checks.push({
      name: 'environment_variables',
      status: 'fail',
      message: 'Environment variables check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // 4. Database Connection Check
  try {
    const databaseUrl = configManager.get('DATABASE_URL');
    if (databaseUrl) {
      // Basic URL validation
      const isValidUrl = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
      checks.push({
        name: 'database_configuration',
        status: isValidUrl ? 'pass' : 'fail',
        message: isValidUrl ? 'Database URL is properly configured' : 'Database URL format is invalid',
        details: { configured: !!databaseUrl, validFormat: isValidUrl }
      });
    } else {
      checks.push({
        name: 'database_configuration',
        status: 'fail',
        message: 'Database URL not configured',
        details: { configured: false }
      });
    }
  } catch (error) {
    checks.push({
      name: 'database_configuration',
      status: 'fail',
      message: 'Database configuration check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // 5. Build System Health
  try {
    const buildErrorHandler = getBuildErrorHandler();
    const diagnostics = buildErrorHandler.generateDiagnosticsReport();
    
    const hasErrors = diagnostics.errors.length > 0;
    const hasCriticalErrors = diagnostics.errors.some(error => error.severity === 'CRITICAL');
    
    checks.push({
      name: 'build_system',
      status: hasCriticalErrors ? 'fail' : hasErrors ? 'warn' : 'pass',
      message: hasCriticalErrors 
        ? 'Build system has critical errors'
        : hasErrors 
          ? 'Build system has non-critical errors'
          : 'Build system is healthy',
      details: {
        errors: diagnostics.errors.length,
        warnings: diagnostics.warnings.length,
        nodeVersion: diagnostics.nodeVersion,
        turboVersion: diagnostics.turboVersion,
        pnpmVersion: diagnostics.pnpmVersion
      }
    });
    
    details.buildSystem = diagnostics;
  } catch (error) {
    checks.push({
      name: 'build_system',
      status: 'fail',
      message: 'Build system check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // 6. Memory Usage Check
  try {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };
    
    // Warning if heap usage is over 80% of total
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const memoryStatus = heapUsagePercent > 80 ? 'warn' : 'pass';
    
    checks.push({
      name: 'memory_usage',
      status: memoryStatus,
      message: `Memory usage: ${memoryUsageMB.heapUsed}MB / ${memoryUsageMB.heapTotal}MB (${Math.round(heapUsagePercent)}%)`,
      details: memoryUsageMB
    });
    
    details.memoryUsage = memoryUsageMB;
  } catch (error) {
    checks.push({
      name: 'memory_usage',
      status: 'fail',
      message: 'Memory usage check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // 7. System Information
  try {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: Math.round(process.uptime()),
      pid: process.pid,
      cwd: process.cwd()
    };
    
    checks.push({
      name: 'system_info',
      status: 'pass',
      message: `Node.js ${systemInfo.nodeVersion} on ${systemInfo.platform}/${systemInfo.arch}`,
      details: systemInfo
    });
    
    details.systemInfo = systemInfo;
  } catch (error) {
    checks.push({
      name: 'system_info',
      status: 'fail',
      message: 'System information check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return { checks, details };
}

/**
 * Build information implementation
 * Internal function for build info
 */
async function getBuildInfo() {
  try {
    const buildErrorHandler = getBuildErrorHandler();
    const diagnostics = buildErrorHandler.generateDiagnosticsReport();
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      buildInfo: {
        nodeVersion: diagnostics.nodeVersion,
        pnpmVersion: diagnostics.pnpmVersion,
        turboVersion: diagnostics.turboVersion,
        environment: diagnostics.environment,
        workingDirectory: diagnostics.workingDirectory,
        buildStartTime: diagnostics.buildStartTime,
        buildDuration: diagnostics.buildDuration,
        memoryUsage: diagnostics.memoryUsage,
        errors: diagnostics.errors.map(error => ({
          type: error.type,
          severity: error.severity,
          message: error.message,
          recoverable: error.recoverable,
          timestamp: error.timestamp,
          suggestions: error.suggestions
        })),
        warnings: diagnostics.warnings
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}