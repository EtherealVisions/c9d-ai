/**
 * Individual Invitation API endpoints
 * Handles operations for specific invitations by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { membershipService } from '@/lib/services/membership-service'

/**
 * DELETE /api/invitations/[id] - Revoke invitation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Await params and revoke invitation
    const { id } = await params
    const result = await membershipService.revokeInvitation(id, clerkUserId)

    if (result.error) {
      const statusCode = result.code === 'INVITATION_NOT_FOUND' ? 404 :
                        result.code === 'INVITATION_NOT_PENDING' ? 400 : 500

      return NextResponse.json(
        { 
          error: result.error,
          code: result.code
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({ 
      message: 'Invitation revoked successfully',
      invitation: result.data
    })
  } catch (error) {
    console.error('Error in DELETE /api/invitations/[id]:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}