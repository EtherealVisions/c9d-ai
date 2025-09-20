import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getEdgeConfig, getConfigValue } from './lib/config/edge-config'
import { getClerkConfig, validateClerkConfig } from './lib/config/clerk'

// Route protection levels
enum ProtectionLevel {
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  ONBOARDING_REQUIRED = 'onboarding_required',
  ORGANIZATION_REQUIRED = 'organization_required',
  ADMIN_ONLY = 'admin_only'
}

/**
 * Route protection configuration with different levels of access control
 */
const routeProtection = new Map<RegExp, ProtectionLevel>([
  // Public routes - no authentication required
  [/^\/$/, ProtectionLevel.PUBLIC],
  [/^\/sign-in/, ProtectionLevel.PUBLIC],
  [/^\/sign-up/, ProtectionLevel.PUBLIC],
  [/^\/verify-email/, ProtectionLevel.PUBLIC],
  [/^\/reset-password/, ProtectionLevel.PUBLIC],
  [/^\/api\/health/, ProtectionLevel.PUBLIC],
  [/^\/api\/webhooks/, ProtectionLevel.PUBLIC],
  [/^\/api\/example-error-handling/, ProtectionLevel.PUBLIC],
  
  // Authenticated routes - basic authentication required
  [/^\/dashboard/, ProtectionLevel.AUTHENTICATED],
  [/^\/profile/, ProtectionLevel.AUTHENTICATED],
  [/^\/settings/, ProtectionLevel.AUTHENTICATED],
  [/^\/api\/auth\/me/, ProtectionLevel.AUTHENTICATED],
  [/^\/api\/users/, ProtectionLevel.AUTHENTICATED],
  
  // Onboarding routes - authentication required, onboarding may be incomplete
  [/^\/onboarding/, ProtectionLevel.ONBOARDING_REQUIRED],
  [/^\/api\/auth\/onboarding/, ProtectionLevel.ONBOARDING_REQUIRED],
  
  // Organization routes - authentication + organization membership required
  [/^\/organizations/, ProtectionLevel.ORGANIZATION_REQUIRED],
  [/^\/api\/organizations/, ProtectionLevel.ORGANIZATION_REQUIRED],
  [/^\/api\/memberships/, ProtectionLevel.ORGANIZATION_REQUIRED],
  
  // Admin routes - admin privileges required
  [/^\/admin/, ProtectionLevel.ADMIN_ONLY],
  [/^\/api\/admin/, ProtectionLevel.ADMIN_ONLY],
  [/^\/api\/roles/, ProtectionLevel.ADMIN_ONLY]
])

/**
 * Get protection level for a given pathname
 */
function getProtectionLevel(pathname: string): ProtectionLevel {
  for (const [pattern, level] of routeProtection) {
    if (pattern.test(pathname)) {
      return level
    }
  }
  // Default to authenticated for unknown routes
  return ProtectionLevel.AUTHENTICATED
}

/**
 * Legacy route matchers for backward compatibility
 */
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
  '/organizations(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/admin(.*)',
  '/api/auth/me(.*)',
  '/api/auth/route(.*)',
  '/api/auth/onboarding(.*)',
  '/api/users(.*)',
  '/api/organizations(.*)',
  '/api/memberships(.*)',
  '/api/roles(.*)',
  '/api/admin(.*)'
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/verify-email(.*)',
  '/reset-password(.*)',
  '/api/health(.*)',
  '/api/webhooks(.*)',
  '/api/example-error-handling(.*)'
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
 * Get configuration value with fallback (edge-safe)
 */
function getConfigWithFallback(key: string): string | undefined {
  try {
    return getConfigValue(key);
  } catch (error) {
    console.warn(`[Middleware] Failed to get config '${key}':`, error);
    return undefined;
  }
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
 * Enhanced route guard that checks user permissions and onboarding status
 */
async function checkRouteAccess(
  authResult: any,
  req: NextRequest,
  protectionLevel: ProtectionLevel
): Promise<NextResponse | null> {
  const { userId, orgId } = authResult

  switch (protectionLevel) {
    case ProtectionLevel.PUBLIC:
      return null // Allow access

    case ProtectionLevel.AUTHENTICATED:
      if (!userId) {
        return createAuthRedirect(req, 'authentication_required')
      }
      return null // Allow access

    case ProtectionLevel.ONBOARDING_REQUIRED:
      if (!userId) {
        return createAuthRedirect(req, 'authentication_required')
      }
      // Allow access to onboarding routes regardless of onboarding status
      return null

    case ProtectionLevel.ORGANIZATION_REQUIRED:
      if (!userId) {
        return createAuthRedirect(req, 'authentication_required')
      }
      
      // Check if accessing organization-specific route
      const orgMatch = req.nextUrl.pathname.match(/^\/organizations\/([^\/]+)/)
      if (orgMatch) {
        const requestedOrgId = orgMatch[1]
        // For now, allow access - organization-specific checks can be added later
        // This would require database access which is not available in middleware
        console.log('[Middleware] Organization route access:', {
          userId,
          requestedOrgId,
          currentOrgId: orgId
        })
      }
      return null

    case ProtectionLevel.ADMIN_ONLY:
      if (!userId) {
        return createAuthRedirect(req, 'authentication_required')
      }
      // Admin check would require database access - defer to application layer
      console.log('[Middleware] Admin route access attempt:', {
        userId,
        route: req.nextUrl.pathname
      })
      return null

    default:
      return createAuthRedirect(req, 'unknown_protection_level')
  }
}

/**
 * Create authentication redirect response
 */
function createAuthRedirect(req: NextRequest, reason: string): NextResponse {
  const signInUrl = new URL('/sign-in', req.url)
  signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname + req.nextUrl.search)
  signInUrl.searchParams.set('reason', reason)
  
  console.log('[Middleware] Creating auth redirect:', {
    originalUrl: req.nextUrl.pathname,
    redirectUrl: signInUrl.toString(),
    reason
  })
  
  return NextResponse.redirect(signInUrl)
}

/**
 * Add security and configuration headers to responses (edge-safe)
 */
function addSecurityHeaders(response: NextResponse, req: NextRequest): NextResponse {
  // Add configuration status headers for debugging
  try {
    const config = getEdgeConfig();
    
    response.headers.set('X-Config-Initialized', 'true');
    response.headers.set('X-Config-Runtime', 'edge');
    response.headers.set('X-Config-Vars-Count', Object.keys(config.getAll()).length.toString());
    
  } catch (error) {
    console.warn('[Middleware] Failed to add config headers:', error);
    response.headers.set('X-Config-Status', 'error');
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add route protection info for debugging
  const protectionLevel = getProtectionLevel(req.nextUrl.pathname)
  response.headers.set('X-Route-Protection', protectionLevel);
  
  return response;
}

/**
 * Log security events for monitoring
 */
function logSecurityEvent(
  event: string,
  req: NextRequest,
  userId?: string,
  metadata?: Record<string, any>
): void {
  console.log('[Middleware Security]', {
    event,
    userId,
    pathname: req.nextUrl.pathname,
    userAgent: req.headers.get('user-agent'),
    ip: (req as any).ip || req.headers.get('x-forwarded-for'),
    timestamp: new Date().toISOString(),
    ...metadata
  })
}

export default clerkMiddleware(async (auth, req) => {
  const startTime = Date.now()
  
  try {
    // Validate critical configuration for API routes
    const configValidationResponse = validateCriticalConfig(req);
    if (configValidationResponse) {
      return configValidationResponse;
    }

    // Validate Clerk configuration
    const clerkConfig = getClerkConfig();
    const clerkValidation = validateClerkConfig(clerkConfig);
    
    if (!clerkValidation.valid && !isPublicRoute(req)) {
      logSecurityEvent('clerk_config_invalid', req, undefined, {
        errors: clerkValidation.errors
      })
      
      return NextResponse.json(
        {
          error: 'Authentication Configuration Error',
          message: 'Authentication service is not properly configured',
          details: clerkValidation.errors
        },
        { status: 503 }
      );
    }

    // Determine protection level for this route
    const protectionLevel = getProtectionLevel(req.nextUrl.pathname)
    
    // Handle public routes first
    if (protectionLevel === ProtectionLevel.PUBLIC) {
      logSecurityEvent('public_route_access', req)
      const response = NextResponse.next();
      return addSecurityHeaders(response, req);
    }

    // For protected routes, get authentication status
    let authResult: any
    try {
      authResult = await auth();
    } catch (error) {
      logSecurityEvent('auth_check_failed', req, undefined, {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return createAuthRedirect(req, 'authentication_failed')
    }

    // Check route access based on protection level
    const accessCheckResult = await checkRouteAccess(authResult, req, protectionLevel)
    if (accessCheckResult) {
      return accessCheckResult
    }

    // Log successful access
    logSecurityEvent('route_access_granted', req, authResult.userId, {
      protectionLevel,
      orgId: authResult.orgId,
      processingTime: Date.now() - startTime
    })

    // Create response with security headers
    const response = NextResponse.next();
    return addSecurityHeaders(response, req);

  } catch (error) {
    logSecurityEvent('middleware_error', req, undefined, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: Date.now() - startTime
    })

    // For unexpected errors, handle gracefully
    if (isProtectedRoute(req)) {
      return createAuthRedirect(req, 'system_error')
    }

    // For public routes, continue with error headers
    const response = NextResponse.next();
    response.headers.set('X-Middleware-Error', 'true');
    response.headers.set('X-Error-Time', new Date().toISOString());
    return addSecurityHeaders(response, req);
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