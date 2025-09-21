/**
 * API endpoints for membership management operations
 * Handles creating memberships and listing organization members
 * Migrated to use Drizzle repositories and Zod validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { membershipService } from '@/lib/services/membership-service'
import { 
  withAuth, 
  withBodyValidation, 
  withQueryValidation,
  withErrorHandling, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/validation/middleware'
import { 
  createOrganizationMembershipSchema,
  organizationMembershipListResponseSchema,
  type CreateOrganizationMembership,
  type OrganizationMembershipListResponse
} from '@/lib/validation/schemas/organizations'
import { ValidationError } from '@/lib/validation/errors'
import { z } from 'zod'

// Schema for query parameters
const getMembershipsQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  userId: z.string().uuid('Invalid user ID').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20')
})

/**
 * POST /api/memberships - Create a new membership
 */
async function postHandler(
  request: NextRequest, 
  { body, requestContext }: { body: CreateOrganizationMembership, requestContext: any }
) {
  const { userId: clerkUserId } = requestContext
  
  try {
    // Create membership using validated data
    const result = await membershipService.createMembership({
      userId: body.userId,
      organizationId: body.organizationId,
      roleId: body.roleId,
      status: body.status
    })

    if (result.error) {
      const statusCode = result.code === 'MEMBERSHIP_EXISTS' ? 409 :
                        result.code === 'VALIDATION_ERROR' ? 400 :
                        result.code === 'INVALID_REFERENCE' ? 400 : 500

      return createErrorResponse(result.error, { 
        statusCode, 
        requestId: requestContext.requestId 
      })
    }

    return createSuccessResponse(result.data, { statusCode: 201 })

  } catch (error) {
    console.error('Error in POST /api/memberships:', error)
    
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
  withBodyValidation(createOrganizationMembershipSchema, withErrorHandling(postHandler))
)

/**
 * GET /api/memberships - Get memberships (by organization or user)
 */
async function getHandler(
  request: NextRequest, 
  { query, requestContext }: { query: z.infer<typeof getMembershipsQuerySchema>, requestContext: any }
) {
  const { userId: clerkUserId } = requestContext
  
  try {
    // Get memberships based on query parameters
    if (query.organizationId) {
      // Get organization members
      const result = await membershipService.getOrganizationMembers(query.organizationId)
      
      if (result.error) {
        const statusCode = result.code === 'ORGANIZATION_NOT_FOUND' ? 404 : 500
        return createErrorResponse(result.error, { 
          statusCode, 
          requestId: requestContext.requestId 
        })
      }

      // Transform to match API response schema
      const responseData: OrganizationMembershipListResponse = {
        members: result.data || [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: result.data?.length || 0,
          totalPages: Math.ceil((result.data?.length || 0) / query.limit)
        }
      }

      // Validate response data
      const validatedResponse = organizationMembershipListResponseSchema.parse(responseData)
      return createSuccessResponse(validatedResponse)

    } else if (query.userId) {
      // Get user memberships - implement this functionality
      return createErrorResponse('User memberships endpoint not implemented yet', { 
        statusCode: 501, 
        requestId: requestContext.requestId 
      })
    } else {
      return createErrorResponse('Either organizationId or userId query parameter is required', { 
        statusCode: 400, 
        requestId: requestContext.requestId 
      })
    }

  } catch (error) {
    console.error('Error in GET /api/memberships:', error)
    
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
  withQueryValidation(getMembershipsQuerySchema, withErrorHandling(getHandler))
)