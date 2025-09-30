import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { rbacService } from '@/lib/services/rbac-service'
import { getDatabase } from '@/lib/db/connection'

/**
 * GET /api/admin/analytics/system-metrics - Get system-wide metrics (Admin only)
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
      'admin.access'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const db = getDatabase()

    // Get current date ranges
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (usersError) {
      console.error('Failed to fetch total users:', usersError)
    }

    // Get new users today
    const { count: newUsersToday, error: newUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    if (newUsersError) {
      console.error('Failed to fetch new users today:', newUsersError)
    }

    // Get new users yesterday for trend calculation
    const { count: newUsersYesterday, error: yesterdayUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    if (yesterdayUsersError) {
      console.error('Failed to fetch yesterday users:', yesterdayUsersError)
    }

    // Get authentication events for today
    const { data: todayAuthEvents, error: authEventsError } = await supabase
      .from('audit_logs')
      .select('action, user_id')
      .gte('created_at', today.toISOString())
      .in('action', ['sign_in', 'sign_up', 'suspicious_activity', 'account_locked'])

    if (authEventsError) {
      console.error('Failed to fetch auth events:', authEventsError)
    }

    const authEvents = todayAuthEvents || []

    // Get authentication events for yesterday for trend calculation
    const { data: yesterdayAuthEvents, error: yesterdayAuthError } = await supabase
      .from('audit_logs')
      .select('action')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())
      .eq('action', 'sign_in')

    if (yesterdayAuthError) {
      console.error('Failed to fetch yesterday auth events:', yesterdayAuthError)
    }

    // Calculate metrics
    const signInEvents = authEvents.filter(e => e.action === 'sign_in')
    const securityEvents = authEvents.filter(e => 
      ['suspicious_activity', 'account_locked'].includes(e.action)
    )

    // Calculate active users (unique users who signed in today)
    const activeUserIds = new Set(signInEvents.map(e => e.user_id).filter(Boolean))
    const activeUsers = activeUserIds.size

    // Calculate trends
    const userGrowthTrend = (newUsersToday || 0) > (newUsersYesterday || 0) ? 'up' : 
                           (newUsersToday || 0) < (newUsersYesterday || 0) ? 'down' : 'stable'

    const signInTrend = signInEvents.length > (yesterdayAuthEvents?.length || 0) ? 'up' : 
                       signInEvents.length < (yesterdayAuthEvents?.length || 0) ? 'down' : 'stable'

    // Determine system health
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (securityEvents.length > 5) {
      systemHealth = 'critical'
    } else if (securityEvents.length > 0) {
      systemHealth = 'warning'
    }

    const metrics = {
      totalUsers: totalUsers || 0,
      activeUsers,
      newUsersToday: newUsersToday || 0,
      totalSignIns: signInEvents.length,
      securityEvents: securityEvents.length,
      systemHealth,
      userGrowthTrend,
      signInTrend
    }

    return NextResponse.json({
      metrics,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in GET /api/admin/analytics/system-metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}