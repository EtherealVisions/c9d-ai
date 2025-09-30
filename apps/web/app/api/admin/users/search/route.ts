import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { userSyncService } from '@/lib/services/user-sync'
import { rbacService } from '@/lib/services/rbac-service'
import { getRepositoryFactory } from '@/lib/repositories/factory'

/**
 * GET /api/admin/users/search - Search users by email or ID (Admin only)
 * Requirement 8.1: Provide admin interfaces for user lookup, status management, and account actions
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = auth()
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    const hasPermission = await rbacService.hasPermission(
      userId,
      orgId,
      'user.read'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    const factory = getRepositoryFactory()
    const userRepo = factory.createUserRepository()
    
    // Search users by email or Clerk user ID
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.%${query}%,clerk_user_id.ilike.%${query}%`)
      .limit(20)
      .order('created_at', { ascending: false })

    if (searchError) {
      console.error('User search error:', searchError)
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      )
    }

    // Get analytics for each user
    const usersWithAnalytics = await Promise.all(
      (users || []).map(async (user) => {
        const analyticsResult = await userSyncService.getUserAnalytics(user.clerk_user_id)
        return {
          user: {
            id: user.id,
            clerkUserId: user.clerk_user_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            avatarUrl: user.avatar_url,
            preferences: user.preferences,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          },
          analytics: analyticsResult.analytics
        }
      })
    )

    return NextResponse.json({
      users: usersWithAnalytics,
      total: usersWithAnalytics.length
    })
  } catch (error) {
    console.error('Error in GET /api/admin/users/search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}