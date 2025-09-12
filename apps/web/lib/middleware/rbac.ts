/**
 * RBAC Middleware for API route permission enforcement
 * Provides middleware functions to protect API routes with role-based access control
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { rbacService } from '../services/rbac-service'
import { createSupabaseClient } from '../database'

export interface RBACOptions {
  permissions?: string[]
  requireAll?: boolean // If true, user must have ALL permissions. If false, user needs ANY permission
  organizationRequired?: boolean
  allowSuperAdmin?: boolean
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    clerkUserId: string
    email: string
  }
  organization?: {
    id: string
    slug: string
  }
  rbacContext?: {
    userId: string
    organizationId: string
    permissions: string[]
    roles: string[]
  }
}

/**
 * Extract organization ID from request (from headers, query params, or path)
 */
function extractOrganizationId(request: NextRequest): string | null {
  // Try to get from X-Organization-ID header
  const headerOrgId = request.headers.get('X-Organization-ID')
  if (headerOrgId) return headerOrgId

  // Try to get from query parameters
  const url = new URL(request.url)
  const queryOrgId = url.searchParams.get('organizationId')
  if (queryOrgId) return queryOrgId

  // Try to extract from path parameters (e.g., /api/organizations/[id]/...)
  const pathMatch = request.nextUrl.pathname.match(/\/api\/organizations\/([^\/]+)/)
  if (pathMatch) return pathMatch[1]

  return null
}

/**
 * Get user from database using Clerk user ID
 */
async function getUserFromClerkId(clerkUserId: string) {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('id, clerk_user_id, email, first_name, last_name')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (error || !data) {
    throw new Error('User not found in database')
  }

  return {
    id: data.id,
    clerkUserId: data.clerk_user_id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name
  }
}

/**
 * Authentication middleware - verifies user is authenticated
 */
export function withAuth() {
  return async function authMiddleware(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Get authentication from Clerk
      const { userId: clerkUserId } = auth()
      
      if (!clerkUserId) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        )
      }

      // Get user from database
      const user = await getUserFromClerkId(clerkUserId)
      
      // Add user to request
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = user

      return handler(authenticatedRequest)
    } catch (error) {
      console.error('Authentication middleware error:', error)
      return NextResponse.json(
        { error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication failed' } },
        { status: 401 }
      )
    }
  }
}

/**
 * RBAC middleware - verifies user has required permissions
 */
export function withRBAC(options: RBACOptions = {}) {
  const {
    permissions = [],
    requireAll = false,
    organizationRequired = true,
    allowSuperAdmin = true
  } = options

  return function rbacMiddleware(
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ) {
    return withAuth()(async (request: AuthenticatedRequest): Promise<NextResponse> => {
      try {
        if (!request.user) {
          return NextResponse.json(
            { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
            { status: 401 }
          )
        }

        // Extract organization ID if required
        let organizationId: string | null = null
        if (organizationRequired || permissions.length > 0) {
          organizationId = extractOrganizationId(request)
          
          if (organizationRequired && !organizationId) {
            return NextResponse.json(
              { error: { code: 'ORGANIZATION_REQUIRED', message: 'Organization context required' } },
              { status: 400 }
            )
          }
        }

        // Check permissions if specified
        if (permissions.length > 0 && organizationId) {
          let hasRequiredPermissions = false

          if (requireAll) {
            // User must have ALL specified permissions
            hasRequiredPermissions = await rbacService.hasAllPermissions(
              request.user.id,
              organizationId,
              permissions
            )
          } else {
            // User must have ANY of the specified permissions
            hasRequiredPermissions = await rbacService.hasAnyPermission(
              request.user.id,
              organizationId,
              permissions
            )
          }

          // Check for super admin override
          if (!hasRequiredPermissions && allowSuperAdmin) {
            hasRequiredPermissions = await rbacService.hasPermission(
              request.user.id,
              organizationId,
              'system:admin'
            )
          }

          if (!hasRequiredPermissions) {
            return NextResponse.json(
              { 
                error: { 
                  code: 'INSUFFICIENT_PERMISSIONS', 
                  message: 'Insufficient permissions for this action',
                  details: { requiredPermissions: permissions }
                } 
              },
              { status: 403 }
            )
          }
        }

        // Add RBAC context to request
        if (organizationId) {
          const rbacContext = await rbacService.getRBACContext(request.user.id, organizationId)
          request.rbacContext = {
            userId: rbacContext.userId,
            organizationId: rbacContext.organizationId,
            permissions: rbacContext.userPermissions || [],
            roles: rbacContext.userRoles?.map(role => role.name) || []
          }

          // Add organization info to request
          const supabase = createSupabaseClient()
          const { data: orgData } = await supabase
            .from('organizations')
            .select('id, slug, name')
            .eq('id', organizationId)
            .single()

          if (orgData) {
            request.organization = {
              id: orgData.id,
              slug: orgData.slug
            }
          }
        }

        return handler(request)
      } catch (error) {
        console.error('RBAC middleware error:', error)
        return NextResponse.json(
          { error: { code: 'AUTHORIZATION_ERROR', message: 'Authorization check failed' } },
          { status: 500 }
        )
      }
    })
  }
}

/**
 * Convenience middleware for common permission patterns
 */
export const rbacMiddleware = {
  /**
   * Require user to be authenticated
   */
  authenticated: () => withRBAC({ organizationRequired: false }),

  /**
   * Require user to be a member of an organization
   */
  organizationMember: () => withRBAC({ 
    permissions: ['organization:read'],
    organizationRequired: true 
  }),

  /**
   * Require user to be an admin of an organization
   */
  organizationAdmin: () => withRBAC({ 
    permissions: ['organization:admin'],
    organizationRequired: true 
  }),

  /**
   * Require user to be able to manage members
   */
  memberManager: () => withRBAC({ 
    permissions: ['members:manage'],
    organizationRequired: true 
  }),

  /**
   * Require user to be able to manage roles
   */
  roleManager: () => withRBAC({ 
    permissions: ['roles:manage'],
    organizationRequired: true 
  }),

  /**
   * Require specific permissions
   */
  requirePermissions: (permissions: string[], requireAll = false) => withRBAC({ 
    permissions,
    requireAll,
    organizationRequired: true 
  }),

  /**
   * System admin only
   */
  systemAdmin: () => withRBAC({ 
    permissions: ['system:admin'],
    organizationRequired: false 
  })
}

/**
 * Helper function to check permissions in API route handlers
 */
export async function checkPermission(
  userId: string,
  organizationId: string,
  permission: string
): Promise<boolean> {
  try {
    return await rbacService.hasPermission(userId, organizationId, permission)
  } catch (error) {
    console.error('Permission check error:', error)
    return false
  }
}

/**
 * Helper function to get user's RBAC context
 */
export async function getRBACContext(userId: string, organizationId: string) {
  try {
    return await rbacService.getRBACContext(userId, organizationId)
  } catch (error) {
    console.error('RBAC context error:', error)
    return null
  }
}

/**
 * Error response helper for RBAC failures
 */
export function createRBACErrorResponse(
  code: string,
  message: string,
  status: number = 403,
  details?: Record<string, any>
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details && { details }),
        timestamp: new Date().toISOString()
      }
    },
    { status }
  )
}