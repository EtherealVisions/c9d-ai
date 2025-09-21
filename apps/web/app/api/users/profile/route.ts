import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { userSyncService } from '@/lib/services/user-sync'
import { userService } from '@/lib/services/user-service'
import { z } from 'zod'
import { 
  withAuth, 
  withBodyValidation, 
  withQueryValidation,
  withErrorHandling, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/validation/middleware'
import { 
  updateUserSchema, 
  userPreferencesSchema,
  userApiResponseSchema,
  type UpdateUser,
  type UserPreferences,
  type UserApiResponse
} from '@/lib/validation/schemas/users'
import { ValidationError } from '@/lib/validation/errors'

// Query parameter schemas
const ProfileQuerySchema = z.object({
  analytics: z.enum(['true', 'false']).optional().transform(val => val === 'true')
})

const PreferencesQuerySchema = z.object({
  validate: z.enum(['true', 'false']).optional().transform(val => val !== 'false')
})

// Enhanced profile update schema with custom fields
const UpdateProfileSchema = updateUserSchema.extend({
  customFields: z.record(z.any()).optional().refine(
    (fields) => {
      if (!fields) return true
      // Validate that custom fields object is not too large (prevent DoS)
      return JSON.stringify(fields).length <= 50000
    },
    'Custom fields data is too large'
  )
})

// Response schemas
const ProfileResponseSchema = z.object({
  user: userApiResponseSchema.optional(),
  analytics: z.object({
    loginCount: z.number(),
    lastLoginAt: z.date().nullable(),
    accountAge: z.number(),
    organizationCount: z.number(),
    activityScore: z.number()
  }).optional(),
  syncMetadata: z.object({
    lastSyncAt: z.date(),
    source: z.string(),
    version: z.string()
  }).optional(),
  message: z.string().optional()
})

/**
 * GET /api/users/profile - Get current user profile with analytics
 * Requirement 8.1: Provide admin interfaces for user lookup, status management, and account actions
 */
async function getHandler(
  request: NextRequest, 
  { query, requestContext }: { query: z.infer<typeof ProfileQuerySchema>, requestContext: any }
) {
  const { userId } = requestContext

  try {
    if (query.analytics) {
      const analyticsResult = await userSyncService.getUserAnalytics(userId)
      
      if (analyticsResult.error) {
        return createErrorResponse(analyticsResult.error, { 
          statusCode: 404, 
          requestId: requestContext.requestId 
        })
      }

      // Transform user data to match API response schema
      const userResponse: UserApiResponse = {
        ...analyticsResult.user,
        fullName: `${analyticsResult.user.firstName || ''} ${analyticsResult.user.lastName || ''}`.trim() || null,
        membershipCount: 0, // Will be populated by analytics
        isActive: true
      }

      const responseData = {
        user: userApiResponseSchema.parse(userResponse),
        analytics: analyticsResult.analytics
      }

      return createSuccessResponse(responseData)
    } else {
      // Get user using new service
      const userResult = await userService.getUserByClerkId(userId)
      
      if (userResult.error || !userResult.data) {
        return createErrorResponse('User not found', { 
          statusCode: 404, 
          requestId: requestContext.requestId 
        })
      }

      // Transform user data to match API response schema
      const userResponse: UserApiResponse = {
        ...userResult.data,
        fullName: `${userResult.data.firstName || ''} ${userResult.data.lastName || ''}`.trim() || null,
        membershipCount: userResult.data.memberships?.length || 0,
        isActive: true
      }

      const responseData = {
        user: userApiResponseSchema.parse(userResponse)
      }

      return createSuccessResponse(responseData)
    }
  } catch (error) {
    console.error('Error in GET /api/users/profile:', error)
    
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
  withQueryValidation(ProfileQuerySchema, withErrorHandling(getHandler))
)

/**
 * PUT /api/users/profile - Update user profile
 * Requirement 6.3: Support custom fields, validation rules, and user metadata collection
 */
async function putHandler(
  request: NextRequest, 
  { body, requestContext }: { body: z.infer<typeof UpdateProfileSchema>, requestContext: any }
) {
  const { userId } = requestContext

  try {
    // Extract metadata from request headers
    const metadata = {
      userAgent: requestContext.userAgent,
      ipAddress: requestContext.ip,
      source: 'profile_api'
    }

    const result = await userSyncService.updateUserProfile(userId, body, metadata)

    if (result.error) {
      return createErrorResponse(result.error, { 
        statusCode: 400, 
        requestId: requestContext.requestId 
      })
    }

    // Transform user data to match API response schema
    const userResponse: UserApiResponse = {
      ...result.user,
      fullName: `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim() || null,
      membershipCount: 0, // Will be populated if needed
      isActive: true
    }

    const responseData = {
      user: userApiResponseSchema.parse(userResponse),
      syncMetadata: result.syncMetadata,
      message: 'Profile updated successfully'
    }

    // Validate response data
    const validatedResponse = ProfileResponseSchema.parse(responseData)
    return createSuccessResponse(validatedResponse)

  } catch (error) {
    console.error('Error in PUT /api/users/profile:', error)
    
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
  withBodyValidation(UpdateProfileSchema, withErrorHandling(putHandler))
)

/**
 * PATCH /api/users/profile/preferences - Update user preferences
 * Requirement 6.3: Support custom fields, validation rules, and user metadata collection
 */
async function patchHandler(
  request: NextRequest, 
  { 
    body, 
    query, 
    requestContext 
  }: { 
    body: UserPreferences, 
    query: z.infer<typeof PreferencesQuerySchema>, 
    requestContext: any 
  }
) {
  const { userId } = requestContext

  try {
    const validateCustomFields = query.validate

    const result = await userSyncService.updateUserPreferences(
      userId, 
      body, 
      validateCustomFields
    )

    if (result.error) {
      return createErrorResponse(result.error, { 
        statusCode: 400, 
        requestId: requestContext.requestId 
      })
    }

    // Transform user data to match API response schema
    const userResponse: UserApiResponse = {
      ...result.user,
      fullName: `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim() || null,
      membershipCount: 0, // Will be populated if needed
      isActive: true
    }

    const responseData = {
      user: userApiResponseSchema.parse(userResponse),
      syncMetadata: result.syncMetadata,
      message: 'Preferences updated successfully'
    }

    // Validate response data
    const validatedResponse = ProfileResponseSchema.parse(responseData)
    return createSuccessResponse(validatedResponse)

  } catch (error) {
    console.error('Error in PATCH /api/users/profile/preferences:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Internal server error', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const PATCH = withAuth(
  withBodyValidation(
    userPreferencesSchema, 
    withQueryValidation(PreferencesQuerySchema, withErrorHandling(patchHandler))
  )
)