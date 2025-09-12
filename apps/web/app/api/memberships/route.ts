/**
 * API endpoints for membership management operations
 * Handles creating memberships and listing organization members
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { membershipService } from '@/lib/services/membership-service'
import { validateCreateMembership } from '@/lib/models/schemas'
import { z } from 'zod'

// Schema for creating membership via API
const createMembershipApiSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  roleId: z.string().uuid('Invalid role ID'),
  status: z.enum(['active', 'inactive', 'pending']).optional()
})

// Schema for query parameters
const getMembershipsQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  userId: z.string().uuid('Invalid user ID').optional()
})

/**
 * POST /api/memberships - Create a new membership
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
    const validatedData = createMembershipApiSchema.parse(body)

    // Create membership
    const result = await membershipService.createMembership({
      userId: validatedData.userId,
      organizationId: validatedData.organizationId,
      roleId: validatedData.roleId,
      status: validatedData.status || 'active'
    })

    if (result.error) {
      const statusCode = result.code === 'MEMBERSHIP_EXISTS' ? 409 :
                        result.code === 'VALIDATION_ERROR' ? 400 :
                        result.code === 'INVALID_REFERENCE' ? 400 : 500

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
    console.error('Error in POST /api/memberships:', error)
    
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
 * GET /api/memberships - Get memberships (by organization or user)
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
      userId: searchParams.get('userId') || undefined
    }

    const validatedQuery = getMembershipsQuerySchema.parse(queryData)

    // Get memberships based on query parameters
    if (validatedQuery.organizationId) {
      // Get organization members
      const result = await membershipService.getOrganizationMembers(validatedQuery.organizationId)
      
      if (result.error) {
        const statusCode = result.code === 'ORGANIZATION_NOT_FOUND' ? 404 : 500
        return NextResponse.json(
          { 
            error: result.error,
            code: result.code
          },
          { status: statusCode }
        )
      }

      return NextResponse.json(result.data)
    } else if (validatedQuery.userId) {
      // Get user memberships (would need to implement this method)
      return NextResponse.json(
        { error: 'User memberships endpoint not implemented yet' },
        { status: 501 }
      )
    } else {
      return NextResponse.json(
        { error: 'Either organizationId or userId query parameter is required' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in GET /api/memberships:', error)
    
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