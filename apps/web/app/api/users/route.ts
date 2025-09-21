import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/services/user-service'
import { 
  withAuth, 
  withBodyValidation, 
  withErrorHandling, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/validation/middleware'
import { 
  updateUserSchema, 
  userApiResponseSchema,
  validateUpdateUser,
  type UpdateUser,
  type UserApiResponse
} from '@/lib/validation/schemas/users'
import { ValidationError } from '@/lib/validation/errors'

/**
 * GET /api/users - Get current user profile
 */
async function getHandler(request: NextRequest, { requestContext }: any) {
  const { userId } = requestContext

  try {
    const result = await userService.getUserWithMemberships(userId)
    
    if (result.error) {
      const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : 500
      return createErrorResponse(result.error, { 
        statusCode, 
        requestId: requestContext.requestId 
      })
    }

    // Transform user data to match API response schema
    const userResponse: UserApiResponse = {
      ...result.data,
      fullName: `${result.data.firstName || ''} ${result.data.lastName || ''}`.trim() || null,
      membershipCount: result.data.memberships?.length || 0,
      isActive: true
    }

    // Validate response data
    const validatedResponse = userApiResponseSchema.parse(userResponse)
    return createSuccessResponse({ user: validatedResponse })

  } catch (error) {
    console.error('Error in GET /api/users:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to get user', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

/**
 * PUT /api/users - Update user profile
 */
async function putHandler(
  request: NextRequest, 
  { body, requestContext }: { body: UpdateUser, requestContext: any }
) {
  const { userId } = requestContext

  try {
    const result = await userService.updateUserProfile(userId, body)
    
    if (result.error) {
      const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : 
                        result.code === 'VALIDATION_ERROR' ? 400 : 500
      
      return createErrorResponse(result.error, { 
        statusCode, 
        requestId: requestContext.requestId 
      })
    }

    // Transform updated user data to match API response schema
    const userResponse: UserApiResponse = {
      ...result.data,
      fullName: `${result.data.firstName || ''} ${result.data.lastName || ''}`.trim() || null,
      membershipCount: result.data.memberships?.length || 0,
      isActive: true
    }

    // Validate response data
    const validatedResponse = userApiResponseSchema.parse(userResponse)
    
    return createSuccessResponse({
      success: true,
      data: validatedResponse,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/users:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to update user profile', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const GET = withAuth(withErrorHandling(getHandler))
export const PUT = withAuth(
  withBodyValidation(updateUserSchema, withErrorHandling(putHandler))
)
export const PATCH = withAuth(
  withBodyValidation(updateUserSchema, withErrorHandling(putHandler))
)