/**
 * Organizations API endpoints
 * Handles CRUD operations for organizations with tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { organizationService } from '@/lib/services/organization-service'
import { securityAuditService } from '@/lib/services/security-audit-service'
import { tenantIsolation } from '@/lib/middleware/tenant-isolation'
import { validateCreateOrganization } from '@/lib/models/schemas'
import { ZodError } from 'zod'

/**
 * GET /api/organizations
 * Get organizations for the authenticated user with tenant isolation
 */
export const GET = tenantIsolation.authenticated()(async (request) => {
  try {
    if (!request.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    const result = await organizationService.getUserOrganizations(request.user.id)
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'USER_NOT_FOUND' ? 404 : 500 }
      )
    }

    // Log data access
    await securityAuditService.logDataAccessEvent(
      request.user.id,
      '', // No specific organization for user's org list
      'read',
      'organization_list',
      'user_organizations',
      { organizationCount: result.data?.length || 0 },
      request.clientIp,
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json({
      organizations: result.data || []
    })
  } catch (error) {
    console.error('Error in GET /api/organizations:', error)
    
    // Log the error
    if (request.user) {
      await securityAuditService.logSecurityEvent({
        userId: request.user.id,
        action: 'api.error',
        resourceType: 'api_endpoint',
        resourceId: '/api/organizations',
        severity: 'medium',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          method: 'GET'
        },
        ipAddress: request.clientIp,
        userAgent: request.headers.get('user-agent') || undefined
      })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/organizations
 * Create a new organization with tenant isolation
 */
export const POST = tenantIsolation.authenticated()(async (request) => {
  try {
    if (!request.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = validateCreateOrganization(body)
    
    const result = await organizationService.createOrganization(request.user.id, validatedData)
    
    if (result.error) {
      const statusCode = result.code === 'VALIDATION_ERROR' ? 400 :
                        result.code === 'DUPLICATE_ORGANIZATION' ? 409 : 500
      
      // Log failed organization creation
      await securityAuditService.logSecurityEvent({
        userId: request.user.id,
        action: 'organization.create_failed',
        resourceType: 'organization',
        severity: 'low',
        metadata: {
          error: result.error,
          code: result.code,
          organizationName: validatedData.name
        },
        ipAddress: request.clientIp,
        userAgent: request.headers.get('user-agent') || undefined
      })
      
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      )
    }

    // Log successful organization creation
    await securityAuditService.logOrganizationEvent(
      request.user.id,
      result.data!.id,
      'created',
      {
        organizationName: result.data!.name,
        organizationSlug: result.data!.slug
      },
      request.clientIp,
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json(
      { organization: result.data },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/organizations:', error)
    
    // Log the error
    if (request.user) {
      await securityAuditService.logSecurityEvent({
        userId: request.user.id,
        action: 'api.error',
        resourceType: 'api_endpoint',
        resourceId: '/api/organizations',
        severity: 'medium',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          method: 'POST'
        },
        ipAddress: request.clientIp,
        userAgent: request.headers.get('user-agent') || undefined
      })
    }
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})