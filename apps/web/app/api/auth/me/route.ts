import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { userSyncService, AuthEventType } from '@/lib/services/user-sync'
import { authRouterService } from '@/lib/services/auth-router-service'
import { createSupabaseClient } from '@/lib/database'
import { initializeAppConfig, getAppConfigSync } from '@/lib/config/init'

export async function GET(request: NextRequest) {
  try {
    // Build-time safety check
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                       (process.env.VERCEL === '1' && process.env.CI === '1')
    
    if (isBuildTime) {
      // Return a build-time stub response
      return NextResponse.json(
        { error: { code: 'BUILD_TIME', message: 'API not available during build' } },
        { status: 503 }
      )
    }

    // Initialize configuration (only at runtime)
    try {
      await initializeAppConfig();
    } catch (configError) {
      console.warn('[Auth Me] Configuration initialization failed, using fallback:', configError)
    }

    // Check if we're in build mode or missing configuration
    const supabaseUrl = getAppConfigSync('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('build-placeholder')) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } },
        { status: 503 }
      )
    }

    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get current user from Clerk
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found in Clerk' } },
        { status: 404 }
      )
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
      return NextResponse.json(
        { error: { code: 'USER_SYNC_FAILED', message: syncResult.error } },
        { status: 500 }
      )
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

    // Get user's organizations
    const supabase = createSupabaseClient()
    const { data: memberships, error: membershipsError } = await supabase
      .from('organization_memberships')
      .select(`
        *,
        organization:organizations (*),
        role:roles (*)
      `)
      .eq('user_id', syncResult.user.id)
      .eq('status', 'active')

    if (membershipsError) {
      console.error('Failed to fetch user organizations:', membershipsError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to fetch organizations' } },
        { status: 500 }
      )
    }

    const organizations = memberships?.map((m: any) => ({
      ...m.organization,
      membership: {
        id: m.id,
        role: m.role,
        status: m.status,
        joinedAt: m.joined_at
      }
    })).filter(Boolean) || []

    // Get onboarding status
    const onboardingStatus = await authRouterService.getOnboardingStatus(syncResult.user)

    // Get recommended next destination
    const nextDestination = await authRouterService.getPostAuthDestination(
      syncResult.user,
      undefined,
      orgId || undefined
    )

    return NextResponse.json({
      user: syncResult.user,
      organizations,
      onboarding: onboardingStatus,
      nextDestination,
      isNew: syncResult.isNew,
      session: {
        clerkUserId: userId,
        organizationId: orgId,
        lastActivity: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Auth me endpoint error:', error)
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