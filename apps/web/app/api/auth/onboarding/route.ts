import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { authRouterService } from '@/lib/services/auth-router-service'
import { userService } from '@/lib/services/user-service'
import { initializeAppConfig } from '@/lib/config/init'
import { z } from 'zod'
import { 
  withAuth, 
  withBodyValidation, 
  withErrorHandling, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/validation/middleware'
import { ValidationError } from '@/lib/validation/errors'

// Validation schemas for onboarding operations
const UpdateOnboardingSchema = z.object({
  step: z.string()
    .min(1, 'Step name is required')
    .max(50, 'Step name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Step name can only contain letters, numbers, hyphens, and underscores'),
  completed: z.boolean().optional().default(true),
  data: z.record(z.any()).optional().refine(
    (data) => {
      if (!data) return true
      // Validate that data object is not too large (prevent DoS)
      return JSON.stringify(data).length <= 10000
    },
    'Onboarding data is too large'
  )
})

const CompleteOnboardingSchema = z.object({
  skipRemaining: z.boolean().optional().default(false)
})

// Response schemas
const OnboardingResponseSchema = z.object({
  success: z.boolean(),
  onboarding: z.object({
    isComplete: z.boolean(),
    currentStep: z.string().optional(),
    completedSteps: z.array(z.string()),
    totalSteps: z.number(),
    progress: z.number().min(0).max(100)
  }),
  nextDestination: z.string().optional(),
  step: z.string().optional(),
  completed: z.boolean().optional(),
  completedAt: z.string().optional(),
  resetAt: z.string().optional()
})

/**
 * POST /api/auth/onboarding
 * Updates onboarding progress for the current user
 */
async function postHandler(
  request: NextRequest, 
  { body, requestContext }: { body: z.infer<typeof UpdateOnboardingSchema>, requestContext: any }
) {
  // Build-time safety check
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                     (process.env.VERCEL === '1' && process.env.CI === '1')
  
  if (isBuildTime) {
    return createErrorResponse('API not available during build', { 
      statusCode: 503, 
      requestId: requestContext.requestId 
    })
  }

  // Initialize configuration (only at runtime)
  try {
    await initializeAppConfig()
  } catch (configError) {
    console.warn('[Onboarding] Configuration initialization failed, using fallback:', configError)
  }

  const { userId } = requestContext

  // Get user from database using new service
  const userResult = await userService.getUserByClerkId(userId)
  if (userResult.error || !userResult.data) {
    return createErrorResponse('User not found', { 
      statusCode: 404, 
      requestId: requestContext.requestId 
    })
  }

  const user = userResult.data

  try {
    // Update onboarding progress
    await authRouterService.updateOnboardingProgress(
      user.id,
      body.step,
      body.completed
    )

    // If additional data is provided, update user preferences
    if (body.data) {
      const currentPreferences = user.preferences || {}
      const stepData = currentPreferences.onboardingData || {}
      
      const updatedPreferences = {
        ...currentPreferences,
        onboardingData: {
          ...stepData,
          [body.step]: body.data
        }
      }

      const updateResult = await userService.updateUserPreferences(user.id, updatedPreferences)
      if (updateResult.error) {
        throw new ValidationError('Failed to update user preferences', [{
          field: 'preferences',
          message: updateResult.error,
          code: 'UPDATE_FAILED'
        }])
      }
    }

    // Get updated onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(user)

    // Get next destination
    const nextDestination = await authRouterService.getPostAuthDestination(user)

    const responseData = {
      success: true,
      onboarding: onboardingStatus,
      nextDestination,
      step: body.step,
      completed: body.completed
    }

    // Validate response data
    const validatedResponse = OnboardingResponseSchema.parse(responseData)
    return createSuccessResponse(validatedResponse)

  } catch (error) {
    console.error('Onboarding update error:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to update onboarding progress', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const POST = withAuth(
  withBodyValidation(UpdateOnboardingSchema, withErrorHandling(postHandler))
)

/**
 * PUT /api/auth/onboarding
 * Completes the onboarding process for the current user
 */
async function putHandler(
  request: NextRequest, 
  { body, requestContext }: { body: z.infer<typeof CompleteOnboardingSchema>, requestContext: any }
) {
  // Build-time safety check
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                     (process.env.VERCEL === '1' && process.env.CI === '1')
  
  if (isBuildTime) {
    return createErrorResponse('API not available during build', { 
      statusCode: 503, 
      requestId: requestContext.requestId 
    })
  }

  // Initialize configuration (only at runtime)
  try {
    await initializeAppConfig()
  } catch (configError) {
    console.warn('[Onboarding] Configuration initialization failed, using fallback:', configError)
  }

  const { userId } = requestContext

  // Get user from database using new service
  const userResult = await userService.getUserByClerkId(userId)
  if (userResult.error || !userResult.data) {
    return createErrorResponse('User not found', { 
      statusCode: 404, 
      requestId: requestContext.requestId 
    })
  }

  const user = userResult.data

  try {
    // Complete onboarding
    await authRouterService.completeOnboarding(user.id)

    // Get updated onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(user)

    // Get next destination (should be dashboard now)
    const nextDestination = await authRouterService.getPostAuthDestination(user)

    const responseData = {
      success: true,
      onboarding: onboardingStatus,
      nextDestination,
      completedAt: new Date().toISOString()
    }

    // Validate response data
    const validatedResponse = OnboardingResponseSchema.parse(responseData)
    return createSuccessResponse(validatedResponse)

  } catch (error) {
    console.error('Onboarding completion error:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to complete onboarding', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const PUT = withAuth(
  withBodyValidation(CompleteOnboardingSchema, withErrorHandling(putHandler))
)

/**
 * GET /api/auth/onboarding
 * Gets the current onboarding status for the user
 */
async function getHandler(request: NextRequest, { requestContext }: any) {
  // Build-time safety check
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                     (process.env.VERCEL === '1' && process.env.CI === '1')
  
  if (isBuildTime) {
    return createErrorResponse('API not available during build', { 
      statusCode: 503, 
      requestId: requestContext.requestId 
    })
  }

  // Initialize configuration (only at runtime)
  try {
    await initializeAppConfig()
  } catch (configError) {
    console.warn('[Onboarding] Configuration initialization failed, using fallback:', configError)
  }

  const { userId } = requestContext

  // Get user from database using new service
  const userResult = await userService.getUserByClerkId(userId)
  if (userResult.error || !userResult.data) {
    return createErrorResponse('User not found', { 
      statusCode: 404, 
      requestId: requestContext.requestId 
    })
  }

  const user = userResult.data

  try {
    // Get onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(user)

    // Get next destination
    const nextDestination = await authRouterService.getPostAuthDestination(user)

    // Get onboarding data from preferences
    const onboardingData = user.preferences?.onboardingData || {}

    const responseData = {
      onboarding: onboardingStatus,
      nextDestination,
      data: onboardingData,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    }

    return createSuccessResponse(responseData)

  } catch (error) {
    console.error('Onboarding status error:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to get onboarding status', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const GET = withAuth(withErrorHandling(getHandler))

/**
 * DELETE /api/auth/onboarding
 * Resets onboarding progress (admin function)
 */
async function deleteHandler(request: NextRequest, { requestContext }: any) {
  // Build-time safety check
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                     (process.env.VERCEL === '1' && process.env.CI === '1')
  
  if (isBuildTime) {
    return createErrorResponse('API not available during build', { 
      statusCode: 503, 
      requestId: requestContext.requestId 
    })
  }

  // Initialize configuration (only at runtime)
  try {
    await initializeAppConfig()
  } catch (configError) {
    console.warn('[Onboarding] Configuration initialization failed, using fallback:', configError)
  }

  const { userId } = requestContext

  // Get user from database using new service
  const userResult = await userService.getUserByClerkId(userId)
  if (userResult.error || !userResult.data) {
    return createErrorResponse('User not found', { 
      statusCode: 404, 
      requestId: requestContext.requestId 
    })
  }

  const user = userResult.data

  try {
    // Reset onboarding
    await authRouterService.resetOnboarding(user.id)

    // Get updated onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(user)

    // Get next destination (should be onboarding now)
    const nextDestination = await authRouterService.getPostAuthDestination(user)

    const responseData = {
      success: true,
      onboarding: onboardingStatus,
      nextDestination,
      resetAt: new Date().toISOString()
    }

    // Validate response data
    const validatedResponse = OnboardingResponseSchema.parse(responseData)
    return createSuccessResponse(validatedResponse)

  } catch (error) {
    console.error('Onboarding reset error:', error)
    
    if (error instanceof ValidationError) {
      return error.toResponse()
    }
    
    return createErrorResponse('Failed to reset onboarding', { 
      statusCode: 500, 
      requestId: requestContext.requestId 
    })
  }
}

export const DELETE = withAuth(withErrorHandling(deleteHandler))