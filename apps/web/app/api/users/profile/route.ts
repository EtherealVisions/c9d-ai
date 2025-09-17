import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { userSyncService } from '@/lib/services/user-sync'
import { z } from 'zod'

// Validation schemas for profile updates
const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
  preferences: z.record(z.any()).optional(),
  customFields: z.record(z.any()).optional()
})

const UpdatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().min(2).max(10).optional(),
  timezone: z.string().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    marketing: z.boolean().optional()
  }).optional(),
  dashboard: z.object({
    defaultView: z.string().optional(),
    itemsPerPage: z.number().min(5).max(100).optional()
  }).optional(),
  customFields: z.record(z.any()).optional()
})

/**
 * GET /api/users/profile - Get current user profile with analytics
 * Requirement 8.1: Provide admin interfaces for user lookup, status management, and account actions
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if analytics are requested
    const url = new URL(request.url)
    const includeAnalytics = url.searchParams.get('analytics') === 'true'

    if (includeAnalytics) {
      const analyticsResult = await userSyncService.getUserAnalytics(userId)
      
      if (analyticsResult.error) {
        return NextResponse.json(
          { error: analyticsResult.error },
          { status: 404 }
        )
      }

      return NextResponse.json({
        user: analyticsResult.user,
        analytics: analyticsResult.analytics
      })
    } else {
      const user = await userSyncService.getUserByClerkId(userId)
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ user })
    }
  } catch (error) {
    console.error('Error in GET /api/users/profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users/profile - Update user profile
 * Requirement 6.3: Support custom fields, validation rules, and user metadata collection
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
      UpdateProfileSchema.parse(body)
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationError instanceof z.ZodError ? validationError.errors : validationError
        },
        { status: 400 }
      )
    }

    // Extract metadata from request headers
    const metadata = {
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      source: 'profile_api'
    }

    const result = await userSyncService.updateUserProfile(userId, body, metadata)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      user: result.user,
      syncMetadata: result.syncMetadata,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT /api/users/profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/users/profile/preferences - Update user preferences
 * Requirement 6.3: Support custom fields, validation rules, and user metadata collection
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
      UpdatePreferencesSchema.parse(body)
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationError instanceof z.ZodError ? validationError.errors : validationError
        },
        { status: 400 }
      )
    }

    // Check if custom field validation should be enabled
    const url = new URL(request.url)
    const validateCustomFields = url.searchParams.get('validate') !== 'false'

    const result = await userSyncService.updateUserPreferences(
      userId, 
      body, 
      validateCustomFields
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
      message: 'Preferences updated successfully'
    })
  } catch (error) {
    console.error('Error in PATCH /api/users/profile/preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}