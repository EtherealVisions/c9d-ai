import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { userSyncService } from '@/lib/services/user-sync'
import { createSupabaseClient } from '@/lib/database'
import { initializeAppConfig, getAppConfigSync } from '@/lib/config/init'

export async function GET(request: NextRequest) {
  try {
    // Initialize configuration
    await initializeAppConfig();

    // Check if we're in build mode
    const supabaseUrl = getAppConfigSync('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' } },
        { status: 503 }
      )
    }

    const { userId } = auth()
    
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

    // Sync user with database
    const syncResult = await userSyncService.syncUser(clerkUser)
    if (syncResult.error) {
      return NextResponse.json(
        { error: { code: 'USER_SYNC_FAILED', message: syncResult.error } },
        { status: 500 }
      )
    }

    // Get user's organizations
    const supabase = createSupabaseClient()
    const { data: memberships, error: membershipsError } = await supabase
      .from('organization_memberships')
      .select(`
        *,
        organization:organizations (*)
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

    const organizations = memberships?.map(m => m.organization).filter(Boolean) || []

    return NextResponse.json({
      user: syncResult.user,
      organizations,
      isNew: syncResult.isNew
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