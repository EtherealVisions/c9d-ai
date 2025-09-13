import { NextRequest, NextResponse } from 'next/server'
import { getConfigManager } from '../../../lib/config/manager'

/**
 * Health check endpoint that provides application and configuration status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const configManager = getConfigManager();
    
    // Get configuration statistics
    const configStats = configManager.getStats();
    
    // Get detailed health status
    const healthStatus = configManager.getHealthStatus();
    
    // Perform a comprehensive health check
    const healthCheck = await configManager.performHealthCheck();
    
    // Determine overall health status
    const isHealthy = configStats.healthy && healthCheck.healthy;
    
    // Prepare response data
    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      configuration: {
        initialized: configStats.initialized,
        healthy: configStats.healthy,
        configCount: configStats.configCount,
        lastRefresh: configStats.lastRefresh,
        phaseConfigured: configStats.phaseConfigured,
        cacheEnabled: configStats.cacheEnabled
      },
      checks: {
        configuration: healthCheck.checks.configValidation,
        phaseConnection: healthCheck.checks.phaseConnection,
        initialization: healthCheck.checks.initialization
      },
      errors: healthCheck.errors,
      lastError: configStats.lastError ? {
        name: configStats.lastError.name,
        message: configStats.lastError.message,
        timestamp: configStats.lastError instanceof Error ? new Date().toISOString() : undefined
      } : null
    };

    // Return appropriate status code
    const statusCode = isHealthy ? 200 : 503;
    
    return NextResponse.json(healthData, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': isHealthy ? 'healthy' : 'unhealthy',
        'X-Config-Initialized': configStats.initialized.toString(),
        'X-Phase-Configured': configStats.phaseConfigured.toString()
      }
    });

  } catch (error) {
    console.error('[Health] Health check failed:', error);
    
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'Health check failed',
      },
      configuration: {
        initialized: false,
        healthy: false
      }
    };

    return NextResponse.json(errorResponse, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': 'error'
      }
    });
  }
}

/**
 * Handle HEAD requests for simple health checks
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    const configManager = getConfigManager();
    const isHealthy = configManager.isInitialized() && configManager.getStats().healthy;
    
    return new NextResponse(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        'X-Health-Status': isHealthy ? 'healthy' : 'unhealthy',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Health-Status': 'error',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}