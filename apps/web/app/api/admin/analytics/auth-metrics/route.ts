import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { rbacService } from '@/lib/services/rbac-service'
import { createSupabaseClient } from '@/lib/database'

/**
 * GET /api/admin/analytics/auth-metrics - Get authentication metrics and analytics (Admin only)
 * Requirement 8.3: Provide analytics on sign-up rates, authentication methods, and user engagement
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = auth()
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
    const timeRange = searchParams.get('timeRange') || '7d'

    // Calculate date range
    const now = new Date()
    const daysBack = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))

    const supabase = createSupabaseClient()

    // Get authentication metrics from audit logs
    const { data: authEvents, error: eventsError } = await supabase
      .from('audit_logs')
      .select('action, metadata, created_at, ip_address, user_agent')
      .gte('created_at', startDate.toISOString())
      .in('action', [
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

    if (eventsError) {
      console.error('Failed to fetch auth events:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch authentication metrics' },
        { status: 500 }
      )
    }

    const events = authEvents || []

    // Calculate metrics
    const signInEvents = events.filter(e => e.action === 'sign_in')
    const signUpEvents = events.filter(e => e.action === 'sign_up')
    const suspiciousEvents = events.filter(e => e.action === 'suspicious_activity')
    const accountLockedEvents = events.filter(e => e.action === 'account_locked')
    const twoFactorEvents = events.filter(e => e.action === 'two_factor_enabled')
    const sessionEvents = events.filter(e => e.action === 'session_created')

    // Get active users count (users who signed in within the time range)
    const activeUserIds = new Set(signInEvents.map(e => e.user_id).filter(Boolean))
    const activeUsers = activeUserIds.size

    // Calculate social vs email sign-ins
    const socialSignIns = signInEvents.filter(e => 
      e.metadata?.signUpMethod === 'social' || e.metadata?.authMethod === 'social'
    ).length
    const emailSignIns = signInEvents.length - socialSignIns

    // Calculate failed attempts (approximate from suspicious activities and account locks)
    const failedAttempts = suspiciousEvents.length + accountLockedEvents.length

    // Calculate trends (compare with previous period)
    const previousPeriodStart = new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000))
    const { data: previousEvents } = await supabase
      .from('audit_logs')
      .select('action')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', startDate.toISOString())
      .in('action', ['sign_in', 'sign_up'])

    const previousSignIns = (previousEvents || []).filter(e => e.action === 'sign_in').length
    const previousSignUps = (previousEvents || []).filter(e => e.action === 'sign_up').length

    const signInTrend = signInEvents.length > previousSignIns ? 'up' : 
                       signInEvents.length < previousSignIns ? 'down' : 'stable'
    const signUpTrend = signUpEvents.length > previousSignUps ? 'up' : 
                       signUpEvents.length < previousSignUps ? 'down' : 'stable'

    // Device and location statistics
    const deviceStats = new Map<string, number>()
    const locationStats = new Map<string, number>()

    events.forEach(event => {
      // Device type from user agent
      const userAgent = event.user_agent || ''
      let deviceType = 'desktop'
      if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
        deviceType = /iPad/.test(userAgent) ? 'tablet' : 'mobile'
      }
      deviceStats.set(deviceType, (deviceStats.get(deviceType) || 0) + 1)

      // Location from IP (simplified - in production you'd use a GeoIP service)
      const ip = event.ip_address
      if (ip) {
        // For demo purposes, we'll just group by IP ranges
        const location = ip.startsWith('192.168') ? 'Local Network' : 
                        ip.startsWith('10.') ? 'Private Network' : 'External'
        locationStats.set(location, (locationStats.get(location) || 0) + 1)
      }
    })

    const metrics = {
      totalSignIns: signInEvents.length,
      totalSignUps: signUpEvents.length,
      activeUsers,
      suspiciousActivities: suspiciousEvents.length,
      failedAttempts,
      socialSignIns,
      emailSignIns,
      twoFactorEnabled: twoFactorEvents.length,
      signInTrend,
      signUpTrend
    }

    const deviceStatsArray = Array.from(deviceStats.entries()).map(([type, count]) => ({
      type: type as 'desktop' | 'mobile' | 'tablet',
      os: 'Various',
      browser: 'Various',
      count
    }))

    const locationStatsArray = Array.from(locationStats.entries()).map(([country, count]) => ({
      country,
      count
    }))

    return NextResponse.json({
      metrics,
      deviceStats: deviceStatsArray,
      locationStats: locationStatsArray,
      timeRange,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in GET /api/admin/analytics/auth-metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}