import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { authRouterService } from '@/lib/services/auth-router-service'
import { userService } from '@/lib/services/user-service'
import { initializeAppConfig } from '@/lib/config/init'
import { z } from 'zod'

const UpdateOnboardingSchema = z.object({
  step: z.string().min(1),
  completed: z.boolean().optional().default(true),
  data: z.record(z.any()).optional()
})

const CompleteOnboardingSchema = z.object({
  skipRemaining: z.boolean().optional().default(false)
})

/**
 * POST /api/auth/onboarding
 * Updates onboarding progress for the current user
 */
export async function POST(request: NextRequest) {
  try {
    // Build-time safety check
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                       (process.env.VERCEL === '1' && process.env.CI === '1')
    
    if (isBuildTime) {
      return NextResponse.json(
        { error: { code: 'BUILD_TIME', message: 'API not available during build' } },
        { status: 503 }
      )
    }

    // Initialize configuration (only at runtime)
    try {
      await initializeAppConfig()
    } catch (configError) {
      console.warn('[Onboarding] Configuration initialization failed, using fallback:', configError)
    }

    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validatedData = UpdateOnboardingSchema.parse(body)

    // Get user from database
    const userResult = await userService.getUserByClerkId(userId)
    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    const user = userResult.data

    // Update onboarding progress
    await authRouterService.updateOnboardingProgress(
      user.id,
      validatedData.step,
      validatedData.completed
    )

    // If additional data is provided, update user preferences
    if (validatedData.data) {
      const currentPreferences = user.preferences || {}
      const stepData = currentPreferences.onboardingData || {}
      
      const updatedPreferences = {
        ...currentPreferences,
        onboardingData: {
          ...stepData,
          [validatedData.step]: validatedData.data
        }
      }

      await userService.updateUserPreferences(user.id, updatedPreferences)
    }

    // Get updated onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(user)

    // Get next destination
    const nextDestination = await authRouterService.getPostAuthDestination(user)

    return NextResponse.json({
      success: true,
      onboarding: onboardingStatus,
      nextDestination,
      step: validatedData.step,
      completed: validatedData.completed
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid request data',
            details: error.errors
          } 
        },
        { status: 400 }
      )
    }

    console.error('Onboarding update error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Internal server error' 
        } 
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/auth/onboarding
 * Completes the onboarding process for the current user
 */
export async function PUT(request: NextRequest) {
  try {
    // Build-time safety check
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                       (process.env.VERCEL === '1' && process.env.CI === '1')
    
    if (isBuildTime) {
      return NextResponse.json(
        { error: { code: 'BUILD_TIME', message: 'API not available during build' } },
        { status: 503 }
      )
    }

    // Initialize configuration (only at runtime)
    try {
      await initializeAppConfig()
    } catch (configError) {
      console.warn('[Onboarding] Configuration initialization failed, using fallback:', configError)
    }

    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const validatedData = CompleteOnboardingSchema.parse(body)

    // Get user from database
    const userResult = await userService.getUserByClerkId(userId)
    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    const user = userResult.data

    // Complete onboarding
    await authRouterService.completeOnboarding(user.id)

    // Get updated onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(user)

    // Get next destination (should be dashboard now)
    const nextDestination = await authRouterService.getPostAuthDestination(user)

    return NextResponse.json({
      success: true,
      onboarding: onboardingStatus,
      nextDestination,
      completedAt: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid request data',
            details: error.errors
          } 
        },
        { status: 400 }
      )
    }

    console.error('Onboarding completion error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Internal server error' 
        } 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/onboarding
 * Gets the current onboarding status for the user
 */
export async function GET(request: NextRequest) {
  try {
    // Build-time safety check
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                       (process.env.VERCEL === '1' && process.env.CI === '1')
    
    if (isBuildTime) {
      return NextResponse.json(
        { error: { code: 'BUILD_TIME', message: 'API not available during build' } },
        { status: 503 }
      )
    }

    // Initialize configuration (only at runtime)
    try {
      await initializeAppConfig()
    } catch (configError) {
      console.warn('[Onboarding] Configuration initialization failed, using fallback:', configError)
    }

    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get user from database
    const userResult = await userService.getUserByClerkId(userId)
    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    const user = userResult.data

    // Get onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(user)

    // Get next destination
    const nextDestination = await authRouterService.getPostAuthDestination(user)

    // Get onboarding data from preferences
    const onboardingData = user.preferences?.onboardingData || {}

    return NextResponse.json({
      onboarding: onboardingStatus,
      nextDestination,
      data: onboardingData,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    })

  } catch (error) {
    console.error('Onboarding status error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Internal server error' 
        } 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth/onboarding
 * Resets onboarding progress (admin function)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Build-time safety check
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                       (process.env.VERCEL === '1' && process.env.CI === '1')
    
    if (isBuildTime) {
      return NextResponse.json(
        { error: { code: 'BUILD_TIME', message: 'API not available during build' } },
        { status: 503 }
      )
    }

    // Initialize configuration (only at runtime)
    try {
      await initializeAppConfig()
    } catch (configError) {
      console.warn('[Onboarding] Configuration initialization failed, using fallback:', configError)
    }

    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get user from database
    const userResult = await userService.getUserByClerkId(userId)
    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    const user = userResult.data

    // Reset onboarding
    await authRouterService.resetOnboarding(user.id)

    // Get updated onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(user)

    // Get next destination (should be onboarding now)
    const nextDestination = await authRouterService.getPostAuthDestination(user)

    return NextResponse.json({
      success: true,
      onboarding: onboardingStatus,
      nextDestination,
      resetAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Onboarding reset error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Internal server error' 
        } 
      },
      { status: 500 }
    )
  }
}