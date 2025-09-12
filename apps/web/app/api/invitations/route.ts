/**
 * API endpoints for invitation management operations
 * Handles creating invitations and listing organization invitations
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { membershipService } from '@/lib/services/membership-service'
import { validateCreateInvitation } from '@/lib/models/schemas'
import { z } from 'zod'

// Schema for creating invitation via API
const createInvitationApiSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  email: z.string().email('Invalid email format'),
  roleId: z.string().uuid('Invalid role ID'),
  expiresAt: z.string().datetime().optional()
})

// Schema for query parameters
const getInvitationsQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  status: z.enum(['pending', 'accepted', 'expired', 'revoked']).optional()
})

/**
 * POST /api/invitations - Create a new invitation
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
    const validatedData = createInvitationApiSchema.parse(body)

    // Create invitation
    const result = await membershipService.inviteUser({
      organizationId: validatedData.organizationId,
      email: validatedData.email,
      roleId: validatedData.roleId,
      invitedBy: clerkUserId,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
    })

    if (result.error) {
      const statusCode = result.code === 'USER_ALREADY_MEMBER' ? 409 :
                        result.code === 'INVITATION_EXISTS' ? 409 :
                        result.code === 'VALIDATION_ERROR' ? 400 : 500

      return NextResponse.json(
        { 
          error: result.error,
          code: result.code
        },
        { status: statusCode }
      )
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/invitations:', error)
    
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
 * GET /api/invitations - Get invitations (by organization and optionally by status)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryData = {
      organizationId: searchParams.get('organizationId') || undefined,
      status: searchParams.get('status') || undefined
    }

    const validatedQuery = getInvitationsQuerySchema.parse(queryData)

    if (!validatedQuery.organizationId) {
      return NextResponse.json(
        { error: 'organizationId query parameter is required' },
        { status: 400 }
      )
    }

    // Get organization invitations
    const result = await membershipService.getOrganizationInvitations(
      validatedQuery.organizationId,
      validatedQuery.status as any
    )

    if (result.error) {
      return NextResponse.json(
        { 
          error: result.error,
          code: result.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Error in GET /api/invitations:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
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