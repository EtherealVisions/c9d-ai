import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { rbacService } from '@/lib/services/rbac-service'
import { createSupabaseClient } from '@/lib/database'

/**
 * GET /api/admin/analytics/auth-events - Get recent authentication events (Admin only)
 * Requirement 8.3: Provide analytics on sign-up rates, authentication methods, and user engagement
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    const hasPermission = await rbacService.hasPermission(
      userId,
      orgId,
      'analytics.read'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const filter = searchParams.get('filter') || 'all'

    const supabase = createSupabaseClient()

    // Build query based on filter
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        action,
        metadata,
        ip_address,
        user_agent,
        created_at,
        users (
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    switch (filter) {
      case 'sign_in':
        query = query.eq('action', 'sign_in')
        break
      case 'sign_up':
        query = query.eq('action', 'sign_up')
        break
      case 'security':
        query = query.in('action', ['suspicious_activity', 'account_locked', 'password_reset'])
        break
      case 'failures':
        query = query.in('action', ['suspicious_activity', 'account_locked'])
        break
      default:
        // All events - filter to authentication-related events only
        query = query.in('action', [
          'sign_in',
          'sign_up',
          'sign_out',
          'password_reset',
          'email_verification',
          'two_factor_enabled',
          'account_locked',
          'suspicious_activity',
          'session_created',
          'session_ended'
        ])
    }

    const { data: events, error: eventsError } = await query

    if (eventsError) {
      console.error('Failed to fetch auth events:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch authentication events' },
        { status: 500 }
      )
    }

    // Transform events for frontend consumption
    const transformedEvents = (events || []).map((event: any) => {
      // Parse user agent for device info
      const userAgent = event.user_agent || ''
      let deviceType = 'desktop'
      let browser = 'Unknown'
      let os = 'Unknown'

      if (/Mobile|Android|iPhone/.test(userAgent)) {
        deviceType = 'mobile'
      } else if (/iPad/.test(userAgent)) {
        deviceType = 'tablet'
      }

      if (/Chrome/.test(userAgent)) {
        browser = 'Chrome'
      } else if (/Firefox/.test(userAgent)) {
        browser = 'Firefox'
      } else if (/Safari/.test(userAgent)) {
        browser = 'Safari'
      } else if (/Edge/.test(userAgent)) {
        browser = 'Edge'
      }

      if (/Windows/.test(userAgent)) {
        os = 'Windows'
      } else if (/Mac/.test(userAgent)) {
        os = 'macOS'
      } else if (/Linux/.test(userAgent)) {
        os = 'Linux'
      } else if (/Android/.test(userAgent)) {
        os = 'Android'
      } else if (/iOS/.test(userAgent)) {
        os = 'iOS'
      }

      return {
        id: event.id,
        userId: event.user_id,
        type: event.action,
        metadata: {
          ...event.metadata,
          deviceType,
          browser,
          os
        },
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
        timestamp: event.created_at,
        user: event.users ? {
          email: event.users.email,
          firstName: event.users.first_name,
          lastName: event.users.last_name
        } : null
      }
    })

    return NextResponse.json({
      events: transformedEvents,
      total: transformedEvents.length,
      filter,
      limit,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in GET /api/admin/analytics/auth-events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}