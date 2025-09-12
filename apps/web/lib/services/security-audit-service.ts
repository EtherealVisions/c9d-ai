/**
 * Security Audit Service
 * Comprehensive audit logging for all account and organization operations
 * Provides security event detection and monitoring capabilities
 */

import { createTypedSupabaseClient, DatabaseError } from '../models/database'
import type { AuditLog } from '../models/types'

export interface SecurityEvent {
  userId?: string
  organizationId?: string
  action: string
  resourceType: string
  resourceId?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp?: Date
}

export interface SecurityEventFilter {
  userId?: string
  organizationId?: string
  action?: string
  resourceType?: string
  severity?: string[]
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface TenantIsolationViolation {
  userId: string
  attemptedOrganizationId: string
  actualOrganizationIds: string[]
  action: string
  resourceType: string
  resourceId?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export class SecurityAuditService {
  private db = createTypedSupabaseClient()

  /**
   * Log a security event with automatic severity assessment
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Enhance event with additional context
      const enhancedEvent = {
        ...event,
        timestamp: event.timestamp || new Date(),
        metadata: {
          ...event.metadata,
          severity: event.severity,
          eventId: this.generateEventId(),
          source: 'security-audit-service'
        }
      }

      // Create audit log entry
      await this.db.createAuditLog({
        userId: enhancedEvent.userId,
        organizationId: enhancedEvent.organizationId,
        action: enhancedEvent.action,
        resourceType: enhancedEvent.resourceType,
        resourceId: enhancedEvent.resourceId,
        metadata: enhancedEvent.metadata,
        ipAddress: enhancedEvent.ipAddress,
        userAgent: enhancedEvent.userAgent
      })

      // Handle high-severity events
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.handleHighSeverityEvent(enhancedEvent)
      }

      console.log(`Security event logged: ${event.action} (${event.severity})`, {
        userId: event.userId,
        organizationId: event.organizationId,
        resourceType: event.resourceType
      })
    } catch (error) {
      console.error('Failed to log security event:', error)
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log authentication events
   */
  async logAuthenticationEvent(
    userId: string,
    action: 'login' | 'logout' | 'login_failed' | 'token_refresh' | 'password_change',
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const severity = action === 'login_failed' ? 'medium' : 'low'
    
    await this.logSecurityEvent({
      userId,
      action: `auth.${action}`,
      resourceType: 'authentication',
      resourceId: userId,
      severity,
      metadata,
      ipAddress,
      userAgent
    })
  }

  /**
   * Log authorization events
   */
  async logAuthorizationEvent(
    userId: string,
    organizationId: string,
    action: 'permission_granted' | 'permission_denied' | 'role_assigned' | 'role_revoked',
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const severity = action === 'permission_denied' ? 'medium' : 'low'
    
    await this.logSecurityEvent({
      userId,
      organizationId,
      action: `authz.${action}`,
      resourceType,
      resourceId,
      severity,
      metadata,
      ipAddress,
      userAgent
    })
  }

  /**
   * Log tenant isolation violations
   */
  async logTenantIsolationViolation(violation: TenantIsolationViolation): Promise<void> {
    await this.logSecurityEvent({
      userId: violation.userId,
      organizationId: violation.attemptedOrganizationId,
      action: 'tenant.isolation_violation',
      resourceType: violation.resourceType,
      resourceId: violation.resourceId,
      severity: 'critical',
      metadata: {
        attemptedOrganizationId: violation.attemptedOrganizationId,
        actualOrganizationIds: violation.actualOrganizationIds,
        violationType: 'cross_tenant_access_attempt',
        ...violation.metadata
      }
    })

    // Additional alerting for critical violations
    console.error('CRITICAL: Tenant isolation violation detected', {
      userId: violation.userId,
      attemptedOrganizationId: violation.attemptedOrganizationId,
      action: violation.action,
      resourceType: violation.resourceType
    })
  }

  /**
   * Log data access events
   */
  async logDataAccessEvent(
    userId: string,
    organizationId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const severity = action === 'delete' ? 'medium' : 'low'
    
    await this.logSecurityEvent({
      userId,
      organizationId,
      action: `data.${action}`,
      resourceType,
      resourceId,
      severity,
      metadata,
      ipAddress,
      userAgent
    })
  }

  /**
   * Log organization management events
   */
  async logOrganizationEvent(
    userId: string,
    organizationId: string,
    action: 'created' | 'updated' | 'deleted' | 'member_added' | 'member_removed' | 'settings_changed',
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const severity = ['deleted', 'member_removed'].includes(action) ? 'medium' : 'low'
    
    await this.logSecurityEvent({
      userId,
      organizationId,
      action: `organization.${action}`,
      resourceType: 'organization',
      resourceId: organizationId,
      severity,
      metadata,
      ipAddress,
      userAgent
    })
  }

  /**
   * Get security events with filtering
   */
  async getSecurityEvents(filter: SecurityEventFilter = {}): Promise<AuditLog[]> {
    try {
      const auditLogs = await this.db.getAuditLogs({
        userId: filter.userId,
        organizationId: filter.organizationId,
        limit: filter.limit || 100,
        offset: filter.offset || 0,
        orderDirection: 'desc'
      })

      // Apply additional filtering
      let filteredLogs = auditLogs

      if (filter.action) {
        filteredLogs = filteredLogs.filter(log => log.action.includes(filter.action!))
      }

      if (filter.resourceType) {
        filteredLogs = filteredLogs.filter(log => log.resourceType === filter.resourceType)
      }

      if (filter.severity && filter.severity.length > 0) {
        filteredLogs = filteredLogs.filter(log => 
          filter.severity!.includes(log.metadata?.severity || 'low')
        )
      }

      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.createdAt >= filter.startDate!)
      }

      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.createdAt <= filter.endDate!)
      }

      return filteredLogs
    } catch (error) {
      console.error('Error getting security events:', error)
      throw new DatabaseError('Failed to retrieve security events', 'GET_SECURITY_EVENTS_ERROR')
    }
  }

  /**
   * Get security events summary for an organization
   */
  async getSecuritySummary(organizationId: string, days: number = 30): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    eventsBySeverity: Record<string, number>
    recentHighSeverityEvents: AuditLog[]
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const events = await this.getSecurityEvents({
        organizationId,
        startDate,
        limit: 1000
      })

      const eventsByType: Record<string, number> = {}
      const eventsBySeverity: Record<string, number> = {}
      const highSeverityEvents: AuditLog[] = []

      events.forEach(event => {
        // Count by resource type
        eventsByType[event.resourceType] = (eventsByType[event.resourceType] || 0) + 1

        // Count by severity
        const severity = event.metadata?.severity || 'low'
        eventsBySeverity[severity] = (eventsBySeverity[severity] || 0) + 1

        // Collect high severity events
        if (severity === 'high' || severity === 'critical') {
          highSeverityEvents.push(event)
        }
      })

      return {
        totalEvents: events.length,
        eventsByType,
        eventsBySeverity,
        recentHighSeverityEvents: highSeverityEvents.slice(0, 10)
      }
    } catch (error) {
      console.error('Error getting security summary:', error)
      throw new DatabaseError('Failed to generate security summary', 'GET_SECURITY_SUMMARY_ERROR')
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(userId: string, organizationId?: string): Promise<{
    suspiciousPatterns: string[]
    riskScore: number
    recommendations: string[]
  }> {
    try {
      const last24Hours = new Date()
      last24Hours.setHours(last24Hours.getHours() - 24)

      const recentEvents = await this.getSecurityEvents({
        userId,
        organizationId,
        startDate: last24Hours,
        limit: 500
      })

      const patterns: string[] = []
      let riskScore = 0
      const recommendations: string[] = []

      // Check for multiple failed login attempts
      const failedLogins = recentEvents.filter(e => e.action === 'auth.login_failed')
      if (failedLogins.length >= 5) {
        patterns.push('Multiple failed login attempts')
        riskScore += 30
        recommendations.push('Consider enabling multi-factor authentication')
      }

      // Check for unusual access patterns
      const accessEvents = recentEvents.filter(e => e.action.startsWith('data.'))
      if (accessEvents.length > 100) {
        patterns.push('Unusually high data access activity')
        riskScore += 20
        recommendations.push('Review recent data access patterns')
      }

      // Check for permission escalation attempts
      const permissionDenied = recentEvents.filter(e => e.action === 'authz.permission_denied')
      if (permissionDenied.length >= 10) {
        patterns.push('Multiple permission denied events')
        riskScore += 25
        recommendations.push('Review user permissions and role assignments')
      }

      // Check for cross-tenant access attempts
      const tenantViolations = recentEvents.filter(e => e.action === 'tenant.isolation_violation')
      if (tenantViolations.length > 0) {
        patterns.push('Tenant isolation violations detected')
        riskScore += 50
        recommendations.push('Immediate security review required')
      }

      return {
        suspiciousPatterns: patterns,
        riskScore: Math.min(riskScore, 100),
        recommendations
      }
    } catch (error) {
      console.error('Error detecting suspicious activity:', error)
      return {
        suspiciousPatterns: [],
        riskScore: 0,
        recommendations: ['Error analyzing activity patterns']
      }
    }
  }

  /**
   * Handle high-severity security events
   */
  private async handleHighSeverityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log to console for immediate visibility
      console.warn(`HIGH SEVERITY SECURITY EVENT: ${event.action}`, {
        userId: event.userId,
        organizationId: event.organizationId,
        resourceType: event.resourceType,
        severity: event.severity,
        timestamp: event.timestamp
      })

      // Additional handling for critical events
      if (event.severity === 'critical') {
        // Could integrate with external alerting systems here
        // For now, we'll just ensure it's prominently logged
        console.error(`CRITICAL SECURITY EVENT DETECTED`, event)
      }
    } catch (error) {
      console.error('Error handling high-severity event:', error)
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate tenant access and log violations
   */
  async validateAndLogTenantAccess(
    userId: string,
    organizationId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    userOrganizations?: string[]
  ): Promise<boolean> {
    try {
      // If user organizations are provided, use them; otherwise query
      let userOrgIds = userOrganizations
      if (!userOrgIds) {
        const userOrgs = await this.db.getUserOrganizations(userId)
        userOrgIds = userOrgs?.map(org => org.id) || []
      }

      const hasAccess = userOrgIds.includes(organizationId)

      if (!hasAccess) {
        // Log tenant isolation violation
        await this.logTenantIsolationViolation({
          userId,
          attemptedOrganizationId: organizationId,
          actualOrganizationIds: userOrgIds,
          action,
          resourceType,
          resourceId,
          timestamp: new Date(),
          metadata: {
            userOrganizationCount: userOrgIds.length,
            accessAttemptBlocked: true
          }
        })
      }

      return hasAccess
    } catch (error) {
      console.error('Error validating tenant access:', error)
      // Log the error but don't throw to avoid breaking the main operation
      await this.logSecurityEvent({
        userId,
        organizationId,
        action: 'tenant.validation_error',
        resourceType,
        resourceId,
        severity: 'high',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          action,
          resourceType
        }
      })
      return false
    }
  }
}

// Export singleton instance
export const securityAuditService = new SecurityAuditService()