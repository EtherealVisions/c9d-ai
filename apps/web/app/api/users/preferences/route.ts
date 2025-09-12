import { NextRequest, NextResponse } from 'next/server'
import { withUserSync, type AuthenticatedRequest } from '@/lib/middleware/auth'
import { userService } from '@/lib/services/user-service'

/**
 * GET /api/users/preferences - Get user preferences
 */
async function getHandler(req: AuthenticatedRequest) {
  try {
    if (!req.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      )
    }

    const result = await userService.getUserPreferences(req.user.id)
    
    if (result.error) {
      return NextResponse.json(
        { error: { code: result.code, message: result.error } },
        { status: result.code === 'USER_NOT_FOUND' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      preferences: result.data
    })
  } catch (error) {
    console.error('Error in GET /api/users/preferences:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get user preferences' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users/preferences - Update user preferences
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
    
    // Basic validation for preferences object
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Preferences must be an object' } },
        { status: 400 }
      )
    }

    const result = await userService.updateUserPreferences(req.user.id, body)
    
    if (result.error) {
      const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : 500
      
      return NextResponse.json(
        { error: { code: result.code, message: result.error } },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      user: result.data,
      message: 'Preferences updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT /api/users/preferences:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update user preferences' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/preferences - Reset user preferences to defaults
 */
async function deleteHandler(req: AuthenticatedRequest) {
  try {
    if (!req.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      )
    }

    const result = await userService.resetUserPreferences(req.user.id)
    
    if (result.error) {
      const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : 500
      
      return NextResponse.json(
        { error: { code: result.code, message: result.error } },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      user: result.data,
      message: 'Preferences reset to defaults successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/users/preferences:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to reset user preferences' } },
      { status: 500 }
    )
  }
}

export const GET = withUserSync(getHandler)
export const PUT = withUserSync(putHandler)
export const PATCH = withUserSync(putHandler)
export const DELETE = withUserSync(deleteHandler)