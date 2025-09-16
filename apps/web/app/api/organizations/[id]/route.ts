/**
 * Individual Organization API endpoints
 * Handles operations for specific organizations by ID with tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server'
import { organizationService } from '@/lib/services/organization-service'
import { securityAuditService } from '@/lib/services/security-audit-service'
import { tenantIsolation, type TenantAwareRequest } from '@/lib/middleware/tenant-isolation'
import { validateUpdateOrganization } from '@/lib/models/schemas'
import { ZodError } from 'zod'

/**
 * GET /api/organizations/[id]
 * Get organization by ID with tenant isolation
 */
export const GET = tenantIsolation.withOrganization()(async (
  request: TenantAwareRequest
) => {
  const params = { id: request.url.split('/').pop()! }
  try {
    if (!request.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    const result = await organizationService.getOrganization(params.id, request.user.id)
    
    if (result.error) {
      const statusCode = result.code === 'ORGANIZATION_NOT_FOUND' ? 404 :
                        result.code === 'TENANT_ACCESS_DENIED' ? 403 : 500
      
      // Log access attempt
      await securityAuditService.logSecurityEvent({
        userId: request.user.id,
        organizationId: params.id,
        action: 'organization.access_denied',
        resourceType: 'organization',
        resourceId: params.id,
        severity: result.code === 'TENANT_ACCESS_DENIED' ? 'medium' : 'low',
        metadata: {
          error: result.error,
          code: result.code
        },
        ipAddress: request.clientIp,
        userAgent: request.headers.get('user-agent') || undefined
      })
      
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      organization: result.data
    })
  } catch (error) {
    console.error('Error in GET /api/organizations/[id]:', error)
    
    // Log the error
    if (request.user) {
      await securityAuditService.logSecurityEvent({
        userId: request.user.id,
        organizationId: params.id,
        action: 'api.error',
        resourceType: 'api_endpoint',
        resourceId: `/api/organizations/${params.id}`,
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
 * PUT /api/organizations/[id]
 * Update organization by ID with tenant isolation
 */
export const PUT = tenantIsolation.withOrganization()(async (
  request: TenantAwareRequest
) => {
  const params = { id: request.url.split('/').pop()! }
  try {
    if (!request.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = validateUpdateOrganization(body)
    
    const result = await organizationService.updateOrganization(params.id, request.user.id, validatedData)
    
    if (result.error) {
      const statusCode = result.code === 'VALIDATION_ERROR' ? 400 :
                        result.code === 'ORGANIZATION_NOT_FOUND' ? 404 :
                        result.code === 'TENANT_ACCESS_DENIED' ? 403 : 500
      
      // Log failed update attempt
      await securityAuditService.logSecurityEvent({
        userId: request.user.id,
        organizationId: params.id,
        action: 'organization.update_failed',
        resourceType: 'organization',
        resourceId: params.id,
        severity: result.code === 'TENANT_ACCESS_DENIED' ? 'medium' : 'low',
        metadata: {
          error: result.error,
          code: result.code,
          attemptedUpdates: Object.keys(validatedData)
        },
        ipAddress: request.clientIp,
        userAgent: request.headers.get('user-agent') || undefined
      })
      
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      organization: result.data
    })
  } catch (error) {
    console.error('Error in PUT /api/organizations/[id]:', error)
    
    // Log the error
    if (request.user) {
      await securityAuditService.logSecurityEvent({
        userId: request.user.id,
        organizationId: params.id,
        action: 'api.error',
        resourceType: 'api_endpoint',
        resourceId: `/api/organizations/${params.id}`,
        severity: 'medium',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          method: 'PUT'
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

/**
 * DELETE /api/organizations/[id]
 * Delete organization by ID (soft delete) with tenant isolation
 */
export const DELETE = tenantIsolation.withOrganization()(async (
  request: TenantAwareRequest
) => {
  const params = { id: request.url.split('/').pop()! }
  try {
    if (!request.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    const result = await organizationService.deleteOrganization(params.id, request.user.id)
    
    if (result.error) {
      const statusCode = result.code === 'ORGANIZATION_NOT_FOUND' ? 404 :
                        result.code === 'TENANT_ACCESS_DENIED' ? 403 : 500
      
      // Log failed deletion attempt
      await securityAuditService.logSecurityEvent({
        userId: request.user.id,
        organizationId: params.id,
        action: 'organization.delete_failed',
        resourceType: 'organization',
        resourceId: params.id,
        severity: result.code === 'TENANT_ACCESS_DENIED' ? 'medium' : 'low',
        metadata: {
          error: result.error,
          code: result.code
        },
        ipAddress: request.clientIp,
        userAgent: request.headers.get('user-agent') || undefined
      })
      
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      )
    }

    // Log successful organization deletion (high severity due to data impact)
    await securityAuditService.logOrganizationEvent(
      request.user.id,
      params.id,
      'deleted',
      {
        organizationName: result.data!.name,
        organizationSlug: result.data!.slug,
        deletionType: 'soft_delete'
      },
      request.clientIp,
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json({
      message: 'Organization deleted successfully',
      organization: result.data
    })
  } catch (error) {
    console.error('Error in DELETE /api/organizations/[id]:', error)
    
    // Log the error
    if (request.user) {
      await securityAuditService.logSecurityEvent({
        userId: request.user.id,
        organizationId: params.id,
        action: 'api.error',
        resourceType: 'api_endpoint',
        resourceId: `/api/organizations/${params.id}`,
        severity: 'high', // High severity for deletion errors
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          method: 'DELETE'
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