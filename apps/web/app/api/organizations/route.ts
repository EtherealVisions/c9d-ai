/**
 * Organizations API endpoints
 * Handles CRUD operations for organizations with tenant isolation
 * Migrated to use Drizzle repositories and Zod validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { organizationService } from '@/lib/services/organization-service'
import { securityAuditService } from '@/lib/services/security-audit-service'
import { tenantIsolation } from '@/lib/middleware/tenant-isolation'
import { 
  withAuth, 
  withBodyValidation, 
  withErrorHandling, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/validation/middleware'
import { 
  createOrganizationSchema,
  organizationListResponseSchema,
  validateCreateOrganization,
  type CreateOrganization,
  type OrganizationListResponse
} from '@/lib/validation/schemas/organizations'
import { ValidationError } from '@/lib/validation/errors'

/**
 * GET /api/organizations
 * Get organizations for the authenticated user with tenant isolation
 */
async function getHandler(request: NextRequest, { requestContext }: any) {
  const { userId } = requestContext
  
  try {
    const result = await organizationService.getUserOrganizations(userId)
    
    if (result.error) {
      const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : 500
      
      // Log data access attempt
      await securityAuditService.logSecurityEvent({
        userId,
        action: 'organization.access_failed',
        resourceType: 'organization_list',
        severity: 'low',
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

    // Transform organizations to match API response schema
    const organizations = (result.data || []).map(org => ({
      ...org,
      memberCount: org.memberCount || 0,
      isOwner: org.isOwner || false,
      canEdit: org.canEdit || false,
      canDelete: org.canDelete || false,
      userPermissions: org.userPermissions || []
    }))

    // Log successful data access
    await securityAuditService.logDataAccessEvent(
      userId,
      '', // No specific organization for user's org list
      'read',
      'organization_list',
      'user_organizations',
      { organizationCount: organizations.length },
      requestContext.ip,
      requestContext.userAgent
    )

    // Validate response data
    const responseData: OrganizationListResponse = {
      organizations,
      pagination: {
        page: 1,
        limit: organizations.length,
        total: organizations.length,
        totalPages: 1
      }
    }

    const validatedResponse = organizationListResponseSchema.parse(responseData)
    return createSuccessResponse(validatedResponse)

  } catch (error) {
    console.error('Error in GET /api/organizations:', error)
    
    // Log the error
    await securityAuditService.logSecurityEvent({
      userId,
      action: 'api.error',
      resourceType: 'api_endpoint',
      resourceId: '/api/organizations',
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

export const GET = withAuth(withErrorHandling(getHandler))

/**
 * POST /api/organizations
 * Create a new organization with tenant isolation
 */
async function postHandler(
  request: NextRequest, 
  { body, requestContext }: { body: CreateOrganization, requestContext: any }
) {
  const { userId } = requestContext
  
  try {
    const result = await organizationService.createOrganization(userId, body)
    
    if (result.error) {
      const statusCode = result.code === 'VALIDATION_ERROR' ? 400 :
                        result.code === 'DUPLICATE_ORGANIZATION' ? 409 : 500
      
      // Log failed organization creation
      await securityAuditService.logSecurityEvent({
        userId,
        action: 'organization.create_failed',
        resourceType: 'organization',
        severity: 'low',
        metadata: {
          error: result.error,
          code: result.code,
          organizationName: body.name
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
    const organizationResponse = {
      ...result.data!,
      memberCount: 1, // Creator is the first member
      isOwner: true,
      canEdit: true,
      canDelete: true,
      userPermissions: ['organization.read', 'organization.write', 'organization.delete']
    }

    // Log successful organization creation
    await securityAuditService.logOrganizationEvent(
      userId,
      result.data!.id,
      'created',
      {
        organizationName: result.data!.name,
        organizationSlug: result.data!.slug
      },
      requestContext.ip,
      requestContext.userAgent
    )

    return createSuccessResponse(
      { organization: organizationResponse },
      { statusCode: 201 }
    )

  } catch (error) {
    console.error('Error in POST /api/organizations:', error)
    
    // Log the error
    await securityAuditService.logSecurityEvent({
      userId,
      action: 'api.error',
      resourceType: 'api_endpoint',
      resourceId: '/api/organizations',
      severity: 'medium',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'POST'
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

export const POST = withAuth(
  withBodyValidation(createOrganizationSchema, withErrorHandling(postHandler))
)