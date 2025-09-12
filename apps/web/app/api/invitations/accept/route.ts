/**
 * API endpoint for accepting invitations
 * Handles invitation token validation and membership creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { membershipService } from '@/lib/services/membership-service'
import { z } from 'zod'

// Schema for accepting invitation via API
const acceptInvitationApiSchema = z.object({
  token: z.string().min(1, 'Invitation token is required')
})

/**
 * POST /api/invitations/accept - Accept an invitation
 */
export async function POST(request: NextRequest) {
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
    const validatedData = acceptInvitationApiSchema.parse(body)

    // Accept invitation
    const result = await membershipService.acceptInvitation(
      validatedData.token,
      clerkUserId
    )

    if (result.error) {
      const statusCode = result.code === 'INVALID_INVITATION_TOKEN' ? 404 :
                        result.code === 'INVITATION_NOT_PENDING' ? 400 :
                        result.code === 'INVITATION_EXPIRED' ? 410 :
                        result.code === 'USER_ALREADY_MEMBER' ? 409 : 500

      return NextResponse.json(
        { 
          error: result.error,
          code: result.code
        },
        { status: statusCode }
      )
    }

    return NextResponse.json(
      {
        message: 'Invitation accepted successfully',
        membership: result.data
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in POST /api/invitations/accept:', error)
    
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