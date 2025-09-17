import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { authRouterService } from '@/lib/services/auth-router-service'
import { userSyncService } from '@/lib/services/user-sync'
import { initializeAppConfig } from '@/lib/config/init'

/**
 * POST /api/auth/route
 * Determines the appropriate destination for authenticated users
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize configuration
    await initializeAppConfig()

    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json().catch(() => ({}))
    const { redirectUrl, organizationId } = body

    // Get current user from Clerk
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found in Clerk' } },
        { status: 404 }
      )
    }

    // Sync user with database
    const syncResult = await userSyncService.syncUser(clerkUser, {
      source: 'auth_route_endpoint'
    })
    
    if (syncResult.error) {
      return NextResponse.json(
        { error: { code: 'USER_SYNC_FAILED', message: syncResult.error } },
        { status: 500 }
      )
    }

    // Determine the appropriate destination
    const destination = await authRouterService.getPostAuthDestination(
      syncResult.user,
      redirectUrl,
      organizationId || orgId || undefined
    )

    // Get onboarding status for additional context
    const onboardingStatus = await authRouterService.getOnboardingStatus(syncResult.user)

    return NextResponse.json({
      destination,
      onboarding: onboardingStatus,
      user: {
        id: syncResult.user.id,
        email: syncResult.user.email,
        firstName: syncResult.user.firstName,
        lastName: syncResult.user.lastName
      }
    })

  } catch (error) {
    console.error('Auth route endpoint error:', error)
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
 * GET /api/auth/route
 * Gets routing information for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize configuration
    await initializeAppConfig()

    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const redirectUrl = searchParams.get('redirect_url') || undefined
    const organizationId = searchParams.get('organization_id') || undefined

    // Get current user from Clerk
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found in Clerk' } },
        { status: 404 }
      )
    }

    // Sync user with database
    const syncResult = await userSyncService.syncUser(clerkUser, {
      source: 'auth_route_get_endpoint'
    })
    
    if (syncResult.error) {
      return NextResponse.json(
        { error: { code: 'USER_SYNC_FAILED', message: syncResult.error } },
        { status: 500 }
      )
    }

    // Determine the appropriate destination
    const destination = await authRouterService.getPostAuthDestination(
      syncResult.user,
      redirectUrl,
      organizationId || orgId || undefined
    )

    // Get onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(syncResult.user)

    // Get user's organizations for context
    const organizations = await authRouterService.getUserOrganizations(syncResult.user.id)

    return NextResponse.json({
      destination,
      onboarding: onboardingStatus,
      organizations: organizations.map((org: any) => ({
        id: org.id,
        name: org.name,
        slug: org.slug
      })),
      user: {
        id: syncResult.user.id,
        email: syncResult.user.email,
        firstName: syncResult.user.firstName,
        lastName: syncResult.user.lastName
      }
    })

  } catch (error) {
    console.error('Auth route GET endpoint error:', error)
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