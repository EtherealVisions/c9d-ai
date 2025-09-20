/**
 * Individual Membership API endpoints
 * Handles operations for specific user-organization memberships
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { membershipService } from '@/lib/services/membership-service'
import { validateUpdateMembership } from '@/lib/models/schemas'
import { z } from 'zod'

// Schema for updating membership via API
const updateMembershipApiSchema = z.object({
  roleId: z.string().uuid('Invalid role ID').optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional()
})

/**
 * PUT /api/memberships/[userId]/[organizationId] - Update membership
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; organizationId: string }> }
) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validatedData = updateMembershipApiSchema.parse(body)

    // Update membership
    const { userId, organizationId } = await params
    const result = await membershipService.updateMembership(
      userId,
      organizationId,
      validatedData,
      clerkUserId
    )

    if (result.error) {
      const statusCode = result.code === 'MEMBERSHIP_NOT_FOUND' ? 404 :
                        result.code === 'VALIDATION_ERROR' ? 400 : 500

      return NextResponse.json(
        { 
          error: result.error,
          code: result.code
        },
        { status: statusCode }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Error in PUT /api/memberships/[userId]/[organizationId]:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/memberships/[userId]/[organizationId] - Remove membership
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; organizationId: string } }
) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Remove membership
    const { userId, organizationId } = await params
    const result = await membershipService.removeMember(
      userId,
      organizationId,
      clerkUserId
    )

    if (result.error) {
      const statusCode = result.code === 'MEMBERSHIP_NOT_FOUND' ? 404 : 500

      return NextResponse.json(
        { 
          error: result.error,
          code: result.code
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/memberships/[userId]/[organizationId]:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}