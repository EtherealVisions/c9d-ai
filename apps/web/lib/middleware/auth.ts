import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { userSyncService } from '../services/user-sync'
import type { User } from '../database'

export interface AuthenticatedRequest extends NextRequest {
  user?: User
  clerkUserId?: string
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean
  syncUser?: boolean
}

/**
 * Authentication middleware for API routes
 * Validates JWT token and optionally syncs user with database
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextResponse) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = { requireAuth: true, syncUser: true }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const { userId } = await auth()

      // Check if authentication is required
      if (options.requireAuth && !userId) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        )
      }

      // Extend request with auth info
      const authReq = req as AuthenticatedRequest
      authReq.clerkUserId = userId || undefined

      // Sync user with database if requested and user is authenticated
      if (options.syncUser && userId) {
        try {
          const user = await userSyncService.getUserByClerkId(userId)
          if (user) {
            authReq.user = user
          } else {
            // User not found in database, might need to sync from Clerk
            console.warn(`User ${userId} not found in database`)
          }
        } catch (error) {
          console.error('Failed to sync user:', error)
          // Continue without user sync rather than failing the request
        }
      }

      // Call the actual handler
      return await handler(authReq, NextResponse.next())
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { 
          error: { 
            code: 'INTERNAL_ERROR', 
            message: 'Authentication middleware failed' 
          } 
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware specifically for user-related API routes
 * Ensures user exists in database and syncs if needed
 */
export function withUserSync(
  handler: (req: AuthenticatedRequest, res: NextResponse) => Promise<NextResponse>
) {
  return withAuth(async (req: AuthenticatedRequest, res: NextResponse) => {
    if (!req.clerkUserId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User ID not found' } },
        { status: 401 }
      )
    }

    // Ensure user exists in database
    if (!req.user) {
      try {
        // Try to get user from Clerk and sync
        const { currentUser } = await auth()
        if (currentUser) {
          const syncResult = await userSyncService.syncUser(currentUser)
          if (syncResult.error) {
            throw new Error(syncResult.error)
          }
          req.user = syncResult.user
        } else {
          throw new Error('Unable to fetch user from Clerk')
        }
      } catch (error) {
        console.error('Failed to sync user:', error)
        return NextResponse.json(
          { 
            error: { 
              code: 'USER_SYNC_FAILED', 
              message: 'Failed to synchronize user data' 
            } 
          },
          { status: 500 }
        )
      }
    }

    return await handler(req, res)
  })
}

/**
 * Utility function to extract user info from request
 */
export function getAuthenticatedUser(req: AuthenticatedRequest): User | null {
  return req.user || null
}

/**
 * Utility function to get Clerk user ID from request
 */
export function getClerkUserId(req: AuthenticatedRequest): string | null {
  return req.clerkUserId || null
}

/**
 * Error response helper for authentication errors
 */
export function createAuthErrorResponse(code: string, message: string, status: number = 401) {
  return NextResponse.json(
    { 
      error: { 
        code, 
        message,
        timestamp: new Date().toISOString()
      } 
    },
    { status }
  )
}