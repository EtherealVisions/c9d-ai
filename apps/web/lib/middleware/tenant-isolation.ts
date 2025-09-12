/**
 * Tenant Isolation Middleware
 * Enforces strict tenant boundaries and prevents cross-tenant data access
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createTypedSupabaseClient } from '../models/database'
import { securityAuditService } from '../services/security-audit-service'
import type { User, Organization } from '../models/types'

export interface TenantContext {
  user: User
  organization: Organization
  userOrganizations: Organization[]
  permissions: string[]
  roles: string[]
}

export interface TenantIsolationOptions {
  requireOrganization?: boolean
  allowedActions?: string[]
  requiredPermissions?: string[]
  bypassForSystemAdmin?: boolean
}

export interface TenantAwareRequest extends NextRequest {
  tenantContext?: TenantContext
  user?: User
  organization?: Organization
  clientIp?: string
}

/**
 * Extract client IP address from request
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIp || cfConnectingIp || 'unknown'
}

/**
 * Extract organization ID from request
 */
function extractOrganizationId(request: NextRequest): string | null {
  // Try header first (most explicit)
  const headerOrgId = request.headers.get('x-organization-id')
  if (headerOrgId) return headerOrgId

  // Try query parameter
  const url = new URL(request.url)
  const queryOrgId = url.searchParams.get('organizationId') || url.searchParams.get('orgId')
  if (queryOrgId) return queryOrgId

  // Try path parameter extraction
  const pathMatch = request.nextUrl.pathname.match(/\/api\/organizations\/([^\/]+)/)
  if (pathMatch && pathMatch[1] !== 'route') return pathMatch[1]

  // Try other common path patterns
  const membershipMatch = request.nextUrl.pathname.match(/\/api\/memberships.*[?&]organizationId=([^&]+)/)
  if (membershipMatch) return membershipMatch[1]

  return null
}

/**
 * Get user from database by Clerk ID
 */
async function getUserFromClerkId(clerkUserId: string): Promise<User | null> {
  try {
    const db = createTypedSupabaseClient()
    return await db.getUserByClerkId(clerkUserId)
  } catch (error) {
    console.error('Error getting user from Clerk ID:', error)
    return null
  }
}

/**
 * Get user's organizations
 */
async function getUserOrganizations(userId: string): Promise<Organization[]> {
  try {
    const db = createTypedSupabaseClient()
    return await db.getUserOrganizations(userId)
  } catch (error) {
    console.error('Error getting user organizations:', error)
    return []
  }
}

/**
 * Validate tenant access
 */
async function validateTenantAccess(
  userId: string,
  organizationId: string,
  userOrganizations: Organization[]
): Promise<boolean> {
  return userOrganizations.some(org => org.id === organizationId)
}

/**
 * Core tenant isolation middleware
 */
export function withTenantIsolation(options: TenantIsolationOptions = {}) {
  return function tenantIsolationMiddleware(
    handler: (req: TenantAwareRequest) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const clientIp = getClientIp(request)
      const userAgent = request.headers.get('user-agent') || 'unknown'
      
      try {
        // Get authentication from Clerk
        const { userId: clerkUserId } = auth()
        
        if (!clerkUserId) {
          await securityAuditService.logSecurityEvent({
            action: 'tenant.access_denied_no_auth',
            resourceType: 'api_endpoint',
            resourceId: request.nextUrl.pathname,
            severity: 'medium',
            metadata: {
              path: request.nextUrl.pathname,
              method: request.method
            },
            ipAddress: clientIp,
            userAgent
          })

          return NextResponse.json(
            { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
            { status: 401 }
          )
        }

        // Get user from database
        const user = await getUserFromClerkId(clerkUserId)
        if (!user) {
          await securityAuditService.logSecurityEvent({
            action: 'tenant.user_not_found',
            resourceType: 'user',
            resourceId: clerkUserId,
            severity: 'high',
            metadata: {
              clerkUserId,
              path: request.nextUrl.pathname
            },
            ipAddress: clientIp,
            userAgent
          })

          return NextResponse.json(
            { error: { code: 'USER_NOT_FOUND', message: 'User not found in database' } },
            { status: 401 }
          )
        }

        // Get user's organizations
        const userOrganizations = await getUserOrganizations(user.id)

        // Extract organization ID from request
        const organizationId = extractOrganizationId(request)

        // Check if organization is required
        if (options.requireOrganization && !organizationId) {
          await securityAuditService.logSecurityEvent({
            userId: user.id,
            action: 'tenant.missing_organization_context',
            resourceType: 'api_endpoint',
            resourceId: request.nextUrl.pathname,
            severity: 'medium',
            metadata: {
              path: request.nextUrl.pathname,
              method: request.method,
              userOrganizationCount: userOrganizations.length
            },
            ipAddress: clientIp,
            userAgent
          })

          return NextResponse.json(
            { error: { code: 'ORGANIZATION_REQUIRED', message: 'Organization context required' } },
            { status: 400 }
          )
        }

        let organization: Organization | undefined
        
        // Validate tenant access if organization is specified
        if (organizationId) {
          const hasAccess = await validateTenantAccess(user.id, organizationId, userOrganizations)
          
          if (!hasAccess) {
            // Log tenant isolation violation
            await securityAuditService.logTenantIsolationViolation({
              userId: user.id,
              attemptedOrganizationId: organizationId,
              actualOrganizationIds: userOrganizations.map(org => org.id),
              action: `${request.method} ${request.nextUrl.pathname}`,
              resourceType: 'api_endpoint',
              resourceId: request.nextUrl.pathname,
              timestamp: new Date(),
              metadata: {
                method: request.method,
                path: request.nextUrl.pathname,
                clientIp,
                userAgent
              }
            })

            return NextResponse.json(
              { 
                error: { 
                  code: 'TENANT_ACCESS_DENIED', 
                  message: 'Access denied to organization resources' 
                } 
              },
              { status: 403 }
            )
          }

          // Find the organization object
          organization = userOrganizations.find(org => org.id === organizationId)
          
          if (!organization) {
            // This shouldn't happen if validation passed, but let's be safe
            await securityAuditService.logSecurityEvent({
              userId: user.id,
              organizationId,
              action: 'tenant.organization_not_found_after_validation',
              resourceType: 'organization',
              resourceId: organizationId,
              severity: 'high',
              metadata: {
                path: request.nextUrl.pathname,
                userOrganizationIds: userOrganizations.map(org => org.id)
              },
              ipAddress: clientIp,
              userAgent
            })

            return NextResponse.json(
              { error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found' } },
              { status: 404 }
            )
          }
        }

        // Log successful access
        await securityAuditService.logDataAccessEvent(
          user.id,
          organizationId || '',
          request.method.toLowerCase() as 'read' | 'create' | 'update' | 'delete',
          'api_endpoint',
          request.nextUrl.pathname,
          {
            method: request.method,
            path: request.nextUrl.pathname,
            hasOrganizationContext: !!organizationId
          },
          clientIp,
          userAgent
        )

        // Create tenant-aware request
        const tenantRequest = request as TenantAwareRequest
        tenantRequest.user = user
        tenantRequest.organization = organization
        tenantRequest.clientIp = clientIp

        // Set tenant context if organization is available
        if (organization) {
          tenantRequest.tenantContext = {
            user,
            organization,
            userOrganizations,
            permissions: [], // Would be populated by RBAC middleware
            roles: [] // Would be populated by RBAC middleware
          }
        }

        return await handler(tenantRequest)
      } catch (error) {
        console.error('Tenant isolation middleware error:', error)
        
        // Log the error
        await securityAuditService.logSecurityEvent({
          action: 'tenant.middleware_error',
          resourceType: 'api_endpoint',
          resourceId: request.nextUrl.pathname,
          severity: 'high',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            path: request.nextUrl.pathname,
            method: request.method
          },
          ipAddress: clientIp,
          userAgent
        })

        return NextResponse.json(
          { error: { code: 'TENANT_ISOLATION_ERROR', message: 'Tenant isolation check failed' } },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Convenience middleware for common tenant isolation patterns
 */
export const tenantIsolation = {
  /**
   * Require authenticated user with organization context
   */
  withOrganization: () => withTenantIsolation({ 
    requireOrganization: true 
  }),

  /**
   * Require authenticated user, organization context optional
   */
  authenticated: () => withTenantIsolation({ 
    requireOrganization: false 
  }),

  /**
   * Strict tenant isolation with specific permissions
   */
  withPermissions: (permissions: string[]) => withTenantIsolation({ 
    requireOrganization: true,
    requiredPermissions: permissions
  }),

  /**
   * Allow system admin bypass
   */
  withSystemAdminBypass: () => withTenantIsolation({ 
    requireOrganization: true,
    bypassForSystemAdmin: true
  })
}

/**
 * Helper function to validate tenant access in service methods
 */
export async function validateServiceTenantAccess(
  userId: string,
  organizationId: string,
  action: string,
  resourceType: string,
  resourceId?: string
): Promise<boolean> {
  return await securityAuditService.validateAndLogTenantAccess(
    userId,
    organizationId,
    action,
    resourceType,
    resourceId
  )
}

/**
 * Helper to create tenant isolation error response
 */
export function createTenantIsolationErrorResponse(
  code: string,
  message: string,
  status: number = 403
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        type: 'TENANT_ISOLATION_ERROR'
      }
    },
    { status }
  )
}