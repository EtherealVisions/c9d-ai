import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { userSyncService } from '@/lib/services/user-sync'
import { rbacService } from '@/lib/services/rbac-service'
import { z } from 'zod'

// Validation schema for status updates
const UpdateStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'deactivated']),
  reason: z.string().min(1).max(500).optional()
})

/**
 * GET /api/admin/users/[clerkUserId] - Get user details with analytics (Admin only)
 * Requirement 8.1: Provide admin interfaces for user lookup, status management, and account actions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clerkUserId: string } }
) {
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

    const { clerkUserId } = params

    // Get user analytics
    const analyticsResult = await userSyncService.getUserAnalytics(clerkUserId)

    if (analyticsResult.error) {
      return NextResponse.json(
        { error: analyticsResult.error },
        { status: 404 }
      )
    }

    // Get user with memberships for admin view
    const userWithMemberships = await userSyncService.getUserWithMemberships(clerkUserId)

    return NextResponse.json({
      user: analyticsResult.user,
      analytics: analyticsResult.analytics,
      memberships: userWithMemberships
    })
  } catch (error) {
    console.error('Error in GET /api/admin/users/[clerkUserId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/[clerkUserId]/status - Update user status (Admin only)
 * Requirement 8.1: Provide admin interfaces for user lookup, status management, and account actions
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clerkUserId: string } }
) {
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
      'user.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { clerkUserId } = params

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate request body
    try {
      UpdateStatusSchema.parse(body)
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationError instanceof z.ZodError ? validationError.errors : validationError
        },
        { status: 400 }
      )
    }

    const { status, reason } = body

    const result = await userSyncService.updateUserStatus(
      clerkUserId,
      status,
      reason,
      userId
    )

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      user: result.user,
      syncMetadata: result.syncMetadata,
      message: `User status updated to ${status}`
    })
  } catch (error) {
    console.error('Error in PATCH /api/admin/users/[clerkUserId]/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}