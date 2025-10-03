import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { userSyncService, AuthEventType } from '@/lib/services/user-sync'
import { authRouterService } from '@/lib/services/auth-router-service'
import { getRepositoryFactory } from '@/lib/repositories/factory'
import { initializeAppConfig, getAppConfigSync } from '@/lib/config/init'
import { withErrorHandling, createErrorResponse, createSuccessResponse } from '@/lib/validation/middleware'
import { userApiResponseSchema } from '@/lib/validation/schemas/users'

async function getHandler(request: NextRequest) {
  // Build-time safety check
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                     (process.env.VERCEL === '1' && process.env.CI === '1')
  
  if (isBuildTime) {
    return createErrorResponse('API not available during build', { 
      statusCode: 503
    })
  }

  // Get authentication state
  const { userId, orgId } = await auth()

  // Check if user is authenticated
  if (!userId) {
    return createErrorResponse('User not authenticated', { 
      statusCode: 401
    })
  }

  // Initialize configuration (only at runtime)
  try {
    await initializeAppConfig()
  } catch (configError) {
    console.warn('[Auth Me] Configuration initialization failed, using fallback:', configError)
  }

  // Check if we're in build mode or missing configuration
  const supabaseUrl = getAppConfigSync('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || supabaseUrl.includes('build-placeholder')) {
    return createErrorResponse('Database not configured', { 
      statusCode: 503
    })
  }

  // Get current user from Clerk
  const clerkUser = await currentUser()
  if (!clerkUser) {
    return createErrorResponse('User not found in Clerk', { 
      statusCode: 404
    })
  }

  // Extract request metadata for logging
  const userAgent = request.headers.get('user-agent') || undefined
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   undefined

  // Sync user with database
  const syncResult = await userSyncService.syncUser(clerkUser, {
    source: 'auth_me_endpoint',
    userAgent,
    ipAddress
  })
  
  if (syncResult.error) {
    return createErrorResponse(syncResult.error, { 
      statusCode: 500
    })
  }

  // Log authentication event if this is a new session
  await userSyncService.logAuthEvent(
    syncResult.user.id,
    AuthEventType.SIGN_IN,
    {
      source: 'auth_me_endpoint',
      clerkUserId: userId,
      organizationId: orgId
    },
    ipAddress,
    userAgent
  )

  // Get user's organizations using repository
  const repositoryFactory = getRepositoryFactory()
  const userRepository = repositoryFactory.createUserRepository()
  const organizationRepository = repositoryFactory.createOrganizationRepository()
  
  try {
    // Get user with memberships using Drizzle repository
    const userWithMemberships = await userRepository.findWithMemberships(syncResult.user.id)
    
    if (!userWithMemberships) {
      return createErrorResponse('User not found', { 
        statusCode: 404
      })
    }

    // Transform memberships to include organization details
    const organizations = userWithMemberships.memberships
      ?.filter(m => m.status === 'active')
      .map(m => ({
        ...m.organization,
        membership: {
          id: m.id,
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt
        }
      })) || []

    // Get onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(syncResult.user)

    // Get recommended next destination
    const nextDestination = await authRouterService.getPostAuthDestination(
      syncResult.user,
      undefined,
      orgId || undefined
    )

    // Validate and format response using Zod schema
    const responseData = {
      user: {
        ...syncResult.user,
        fullName: `${syncResult.user.firstName || ''} ${syncResult.user.lastName || ''}`.trim() || null,
        membershipCount: organizations.length,
        isActive: true
      },
      organizations,
      onboarding: onboardingStatus,
      nextDestination,
      isNew: syncResult.isNew,
      session: {
        clerkUserId: userId,
        organizationId: orgId,
        lastActivity: new Date().toISOString()
      }
    }

    return createSuccessResponse(responseData)
  } catch (error) {
    console.error('Failed to fetch user organizations:', error)
    return createErrorResponse('Failed to fetch organizations', { 
      statusCode: 500
    })
  }
}

export const GET = withErrorHandling(getHandler)