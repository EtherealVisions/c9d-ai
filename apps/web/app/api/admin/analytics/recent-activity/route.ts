import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { rbacService } from '@/lib/services/rbac-service'
import { createSupabaseClient } from '@/lib/database'

/**
 * GET /api/admin/analytics/recent-activity - Get recent system activity (Admin only)
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
      'admin.access'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const supabase = createSupabaseClient()

    // Get recent audit log events
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        resource_type,
        metadata,
        created_at,
        users (
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (auditError) {
      console.error('Failed to fetch audit logs:', auditError)
      return NextResponse.json(
        { error: 'Failed to fetch recent activity' },
        { status: 500 }
      )
    }

    // Transform audit logs into activity items
    const activities = (auditLogs || []).map((log: any) => {
      let type: 'user_created' | 'user_updated' | 'security_event' | 'system_event' = 'system_event'
      let description = ''
      let severity: 'info' | 'warning' | 'error' = 'info'

      switch (log.action) {
        case 'user_created':
          type = 'user_created'
          description = `New user registered: ${log.users?.email || 'Unknown'}`
          severity = 'info'
          break
        case 'user_updated':
          type = 'user_updated'
          description = `User profile updated: ${log.users?.email || 'Unknown'}`
          severity = 'info'
          break
        case 'sign_up':
          type = 'user_created'
          description = `User signed up: ${log.users?.email || 'Unknown'}`
          severity = 'info'
          break
        case 'sign_in':
          type = 'system_event'
          description = `User signed in: ${log.users?.email || 'Unknown'}`
          severity = 'info'
          break
        case 'suspicious_activity':
          type = 'security_event'
          description = `Suspicious activity detected for: ${log.users?.email || 'Unknown user'}`
          severity = 'error'
          break
        case 'account_locked':
          type = 'security_event'
          description = `Account locked: ${log.users?.email || 'Unknown user'}`
          severity = 'error'
          break
        case 'password_reset':
          type = 'security_event'
          description = `Password reset requested: ${log.users?.email || 'Unknown user'}`
          severity = 'warning'
          break
        case 'two_factor_enabled':
          type = 'security_event'
          description = `Two-factor authentication enabled: ${log.users?.email || 'Unknown user'}`
          severity = 'info'
          break
        case 'organization.created':
          type = 'system_event'
          description = `New organization created: ${log.metadata?.organizationName || 'Unknown'}`
          severity = 'info'
          break
        case 'membership.created':
          type = 'system_event'
          description = `New member added to organization: ${log.users?.email || 'Unknown'}`
          severity = 'info'
          break
        case 'role.assigned':
          type = 'system_event'
          description = `Role assigned to user: ${log.users?.email || 'Unknown'}`
          severity = 'info'
          break
        default:
          type = 'system_event'
          description = `System event: ${log.action.replace('_', ' ')}`
          severity = 'info'
      }

      return {
        id: log.id,
        type,
        description,
        timestamp: log.created_at,
        severity
      }
    })

    return NextResponse.json({
      activities,
      total: activities.length,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in GET /api/admin/analytics/recent-activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}