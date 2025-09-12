import { NextRequest, NextResponse } from 'next/server'
import { withUserSync, type AuthenticatedRequest } from '@/lib/middleware/auth'
import { userService } from '@/lib/services/user-service'

/**
 * GET /api/users/status - Get user account status
 */
async function getHandler(req: AuthenticatedRequest) {
  try {
    if (!req.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      )
    }

    const result = await userService.isUserActive(req.user.id)
    
    if (result.error) {
      return NextResponse.json(
        { error: { code: result.code, message: result.error } },
        { status: result.code === 'USER_NOT_FOUND' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      isActive: result.data,
      status: result.data ? 'active' : 'deactivated'
    })
  } catch (error) {
    console.error('Error in GET /api/users/status:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get user status' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users/status - Update user account status
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
    if (!body.action || !['deactivate', 'reactivate'].includes(body.action)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Action must be either "deactivate" or "reactivate"' 
          } 
        },
        { status: 400 }
      )
    }

    let result
    if (body.action === 'deactivate') {
      result = await userService.deactivateUser(req.user.id)
    } else {
      result = await userService.reactivateUser(req.user.id)
    }
    
    if (result.error) {
      const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : 500
      
      return NextResponse.json(
        { error: { code: result.code, message: result.error } },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      user: result.data,
      message: `Account ${body.action}d successfully`
    })
  } catch (error) {
    console.error('Error in PUT /api/users/status:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update user status' } },
      { status: 500 }
    )
  }
}

export const GET = withUserSync(getHandler)
export const PUT = withUserSync(putHandler)