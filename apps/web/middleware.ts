import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getConfigManager } from './lib/config/manager'

/**
 * Protected routes that require authentication
 */
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/users(.*)',
  '/api/organizations(.*)',
  '/api/memberships(.*)',
  '/api/roles(.*)',
])

/**
 * API routes that should have configuration validation
 */
const isApiRoute = createRouteMatcher([
  '/api/(.*)',
])

/**
 * Health check route that provides configuration status
 */
const isHealthRoute = createRouteMatcher([
  '/api/health',
  '/health',
])

/**
 * Get configuration value with fallback
 */
function getConfigWithFallback(key: string): string | undefined {
  try {
    const configManager = getConfigManager();
    if (configManager.isInitialized()) {
      return configManager.get(key);
    }
  } catch (error) {
    console.warn(`[Middleware] Failed to get config '${key}' from manager, using process.env:`, error);
  }
  
  return process.env[key];
}

/**
 * Validate critical configuration for API routes
 */
function validateCriticalConfig(req: NextRequest): NextResponse | null {
  // Skip validation for health check routes
  if (isHealthRoute(req)) {
    return null;
  }

  // Only validate for API routes
  if (!isApiRoute(req)) {
    return null;
  }

  const criticalVars = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars: string[] = [];
  
  for (const varName of criticalVars) {
    const value = getConfigWithFallback(varName);
    if (!value || value.trim() === '') {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error('[Middleware] Critical configuration missing for API route:', {
      route: req.nextUrl.pathname,
      missingVars,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        error: 'Configuration Error',
        message: 'Critical configuration variables are missing',
        details: {
          missingVariables: missingVars,
          route: req.nextUrl.pathname
        }
      },
      { status: 503 } // Service Unavailable
    );
  }

  return null;
}

/**
 * Add configuration headers to responses
 */
function addConfigHeaders(response: NextResponse, req: NextRequest): NextResponse {
  // Add configuration status headers for debugging
  try {
    const configManager = getConfigManager();
    const stats = configManager.getStats();
    
    response.headers.set('X-Config-Initialized', stats.initialized.toString());
    response.headers.set('X-Config-Healthy', stats.healthy.toString());
    response.headers.set('X-Config-Phase-Enabled', stats.phaseConfigured.toString());
    
    // Add timestamp for cache debugging
    response.headers.set('X-Config-Last-Refresh', stats.lastRefresh.toISOString());
    
  } catch (error) {
    console.warn('[Middleware] Failed to add config headers:', error);
    response.headers.set('X-Config-Status', 'error');
  }

  return response;
}

export default clerkMiddleware(async (auth, req) => {
  try {
    // Validate critical configuration for API routes
    const configValidationResponse = validateCriticalConfig(req);
    if (configValidationResponse) {
      return configValidationResponse;
    }

    // Handle protected routes
    if (isProtectedRoute(req)) {
      try {
        const authResult = await auth();
        if (!authResult.userId) {
          throw new Error('User not authenticated');
        }
      } catch (error) {
        console.error('[Middleware] Authentication failed for protected route:', {
          route: req.nextUrl.pathname,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        
        // Let Clerk handle the authentication error
        throw error;
      }
    }

    // Create response and add configuration headers
    const response = NextResponse.next();
    return addConfigHeaders(response, req);

  } catch (error) {
    console.error('[Middleware] Unexpected error:', {
      route: req.nextUrl.pathname,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Re-throw to let Clerk handle authentication errors
    throw error;
  }
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}