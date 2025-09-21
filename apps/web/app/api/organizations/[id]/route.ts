/**
 * Individual Organization API endpoints
 * Handles operations for specific organizations by ID with tenant isolation
 * Migrated to use Drizzle repositories and Zod validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { organizationService } from '@/lib/services/organization-service'
import { securityAuditService } from '@/lib/services/security-audit-service'
import { 
  withAuth, 
  withBodyValidation, 
  withParamsValidation,
  withErrorHandling, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/validation/middleware'
import { 
  updateOrganizationSchema,
  organizationApiResponseSchema,
  validateUpdateOrganization,
  type UpdateOrganization,
  type OrganizationApiResponse
} from '@/lib/validation/schemas/organizations'
import { ValidationError } from '@/lib/validation/errors'
import { z } from 'zod'

// Path parameter validation schema
const organizationParamsSchema = z.object({
  id: z.string().uuid('Invalid organization ID')
})

/**
 * GET /api/organizations/[id]
 * Get organization by ID with tenant isolation
 */
async function getHandler(
  request: NextRequest, 
  { params, requestContext }: { params: z.infer<typeof organizationParamsSchema>, requestContext: any }
) {
  const { userId } = requestContext
  const { id: organizationId } = params
  
  try {
    const result = await organizationService.getOrganization(organizationId, userId)
    
    if (result.error) {
      const statusCode = result.code === 'ORGANIZATION_NOT_FOUND' ? 404 :
                        result.code === 'TENANT_ACCESS_DENIED' ? 403 : 500
      
      // Log access attempt
      await securityAuditService.logSecurityEvent({
        userId,
        organizationId,
        action: 'organization.access_denied',
        resourceType: 'organization',
        resourceId: organizationId,
        severity: result.code === 'TENANT_ACCESS_DENIED' ? 'medium' : 'low',
        metadata: {
          error: result.error,
          code: result.code
        },
        ipAddress: requestContext.ip,
        userAgent: requestContext.userAgent
      })
      
      return createErrorResponse(result.error, { 
        statusCode, 
        requestId: requestContext.requestId 
      })
    }

    // Transform organization to match API response schema
    const organizationResponse: OrganizationApiResponse = {
      ...result.data!,
      memberCount: result.data!.memberCount || 0,
      isOwner: result.data!.isOwner || false,
      canEdit: result.data!.canEdit || false,
      canDelete: result.data!.canDelete || false,
      userPermissions: result.data!.userPermissions || []
    }

    // Validate response data
    const validatedResponse = organizationApiResponseSchema.parse(organizationResponse)

    return createSuccessResponse({
      organization: validatedResponse
    })

  } catch (error) {
    console.error('Error in GET /api/organizations/[id]:', error)
    
    // Log the error
    await securityAuditService.logSecurityEvent({
      userId,
      organizationId,
      action: 'api.error',
      resourceType: 'api_endpoint',
      resourceId: `/api/organizations/${organizationId}`,
      severity: 'medium',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'GET'
      },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent
    })
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Internal server error', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const GET = withAuth(
  withParamsValidation(organizationParamsSchema, withErrorHandling(getHandler))
)

/**
 * PUT /api/organizations/[id]
 * Update organization by ID with tenant isolation
 */
async function putHandler(
  request: NextRequest, 
  { 
    params, 
    body, 
    requestContext 
  }: { 
    params: z.infer<typeof organizationParamsSchema>, 
    body: UpdateOrganization, 
    requestContext: any 
  }
) {
  const { userId } = requestContext
  const { id: organizationId } = params
  
  try {
    const result = await organizationService.updateOrganization(organizationId, userId, body)
    
    if (result.error) {
      const statusCode = result.code === 'VALIDATION_ERROR' ? 400 :
                        result.code === 'ORGANIZATION_NOT_FOUND' ? 404 :
                        result.code === 'TENANT_ACCESS_DENIED' ? 403 : 500
      
      // Log failed update attempt
      await securityAuditService.logSecurityEvent({
        userId,
        organizationId,
        action: 'organization.update_failed',
        resourceType: 'organization',
        resourceId: organizationId,
        severity: result.code === 'TENANT_ACCESS_DENIED' ? 'medium' : 'low',
        metadata: {
          error: result.error,
          code: result.code,
          attemptedUpdates: Object.keys(body)
        },
        ipAddress: requestContext.ip,
        userAgent: requestContext.userAgent
      })
      
      return createErrorResponse(result.error, { 
        statusCode, 
        requestId: requestContext.requestId 
      })
    }

    // Transform organization to match API response schema
    const organizationResponse: OrganizationApiResponse = {
      ...result.data!,
      memberCount: result.data!.memberCount || 0,
      isOwner: result.data!.isOwner || false,
      canEdit: result.data!.canEdit || false,
      canDelete: result.data!.canDelete || false,
      userPermissions: result.data!.userPermissions || []
    }

    // Log successful update
    await securityAuditService.logOrganizationEvent(
      userId,
      organizationId,
      'updated',
      {
        organizationName: result.data!.name,
        updatedFields: Object.keys(body)
      },
      requestContext.ip,
      requestContext.userAgent
    )

    // Validate response data
    const validatedResponse = organizationApiResponseSchema.parse(organizationResponse)

    return createSuccessResponse({
      organization: validatedResponse
    })

  } catch (error) {
    console.error('Error in PUT /api/organizations/[id]:', error)
    
    // Log the error
    await securityAuditService.logSecurityEvent({
      userId,
      organizationId,
      action: 'api.error',
      resourceType: 'api_endpoint',
      resourceId: `/api/organizations/${organizationId}`,
      severity: 'medium',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'PUT'
      },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent
    })
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }

    return createErrorResponse('Internal server error', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const PUT = withAuth(
  withParamsValidation(
    organizationParamsSchema,
    withBodyValidation(updateOrganizationSchema, withErrorHandling(putHandler))
  )
)

/**
 * DELETE /api/organizations/[id]
 * Delete organization by ID (soft delete) with tenant isolation
 */
async function deleteHandler(
  request: NextRequest, 
  { params, requestContext }: { params: z.infer<typeof organizationParamsSchema>, requestContext: any }
) {
  const { userId } = requestContext
  const { id: organizationId } = params
  
  try {
    const result = await organizationService.deleteOrganization(organizationId, userId)
    
    if (result.error) {
      const statusCode = result.code === 'ORGANIZATION_NOT_FOUND' ? 404 :
                        result.code === 'TENANT_ACCESS_DENIED' ? 403 : 500
      
      // Log failed deletion attempt
      await securityAuditService.logSecurityEvent({
        userId,
        organizationId,
        action: 'organization.delete_failed',
        resourceType: 'organization',
        resourceId: organizationId,
        severity: result.code === 'TENANT_ACCESS_DENIED' ? 'medium' : 'low',
        metadata: {
          error: result.error,
          code: result.code
        },
        ipAddress: requestContext.ip,
        userAgent: requestContext.userAgent
      })
      
      return createErrorResponse(result.error, { 
        statusCode, 
        requestId: requestContext.requestId 
      })
    }

    // Log successful organization deletion (high severity due to data impact)
    await securityAuditService.logOrganizationEvent(
      userId,
      organizationId,
      'deleted',
      {
        organizationName: result.data!.name,
        organizationSlug: result.data!.slug,
        deletionType: 'soft_delete'
      },
      requestContext.ip,
      requestContext.userAgent
    )

    return createSuccessResponse({
      message: 'Organization deleted successfully',
      organization: result.data
    })

  } catch (error) {
    console.error('Error in DELETE /api/organizations/[id]:', error)
    
    // Log the error
    await securityAuditService.logSecurityEvent({
      userId,
      organizationId,
      action: 'api.error',
      resourceType: 'api_endpoint',
      resourceId: `/api/organizations/${organizationId}`,
      severity: 'high', // High severity for deletion errors
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'DELETE'
      },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent
    })
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Internal server error', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const DELETE = withAuth(
  withParamsValidation(organizationParamsSchema, withErrorHandling(deleteHandler))
)