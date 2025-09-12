import { NextRequest, NextResponse } from 'next/server'
import { withUserSync, type AuthenticatedRequest } from '@/lib/middleware/auth'
import { userService } from '@/lib/services/user-service'
import { validateUpdateUser } from '@/lib/models/schemas'

/**
 * GET /api/users - Get current user profile
 */
async function getHandler(req: AuthenticatedRequest) {
  try {
    if (!req.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      )
    }

    const result = await userService.getUserWithMemberships(req.user.id)
    
    if (result.error) {
      return NextResponse.json(
        { error: { code: result.code, message: result.error } },
        { status: result.code === 'USER_NOT_FOUND' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      user: result.data
    })
  } catch (error) {
    console.error('Error in GET /api/users:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users - Update user profile
 */
async function putHandler(req: AuthenticatedRequest) {
  try {
    if (!req.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      )
    }

    const body = await req.json()
    
    // Validate the request body
    try {
      validateUpdateUser(body)
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid request data',
            details: validationError
          } 
        },
        { status: 400 }
      )
    }

    const result = await userService.updateUserProfile(req.user.id, body)
    
    if (result.error) {
      const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : 
                        result.code === 'VALIDATION_ERROR' ? 400 : 500
      
      return NextResponse.json(
        { error: { code: result.code, message: result.error } },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      user: result.data,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT /api/users:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update user profile' } },
      { status: 500 }
    )
  }
}

export const GET = withUserSync(getHandler)
export const PUT = withUserSync(putHandler)
export const PATCH = withUserSync(putHandler)