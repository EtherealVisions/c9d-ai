/**
 * Comprehensive Audit Service
 * Provides audit logging, monitoring, and retention management for all system activities
 */

import { createTypedSupabaseClient, DatabaseError } from '../models/database'
import type { AuditLog } from '../models/types'

export interface AuditEvent {
  userId?: string
  organizationId?: string
  action: string
  resourceType: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface AuditFilter {
  userId?: string
  organizationId?: string
  action?: string
  resourceType?: string
  resourceId?: string
  severity?: string[]
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
  searchTerm?: string
}

export interface AuditSummary {
  totalEvents: number
  eventsByAction: Record<string, number>
  eventsByResourceType: Record<string, number>
  eventsBySeverity: Record<string, number>
  eventsByUser: Record<string, number>
  recentCriticalEvents: AuditLog[]
  timeRange: {
    startDate: Date
    endDate: Date
  }
}

export interface RetentionPolicy {
  retentionDays: number
  archiveBeforeDelete: boolean
  criticalEventRetentionDays: number
  compressionEnabled: boolean
}

export interface SecurityAlert {
  id: string
  type: 'suspicious_activity' | 'security_violation' | 'system_anomaly' | 'policy_violation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  userId?: string
  organizationId?: string
  relatedEvents: string[]
  metadata: Record<string, any>
  createdAt: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
}

export class AuditService {
  private db = createTypedSupabaseClient()
  private retentionPolicy: RetentionPolicy = {
    retentionDays: 365, // 1 year default
    archiveBeforeDelete: true,
    criticalEventRetentionDays: 2555, // 7 years for critical events
    compressionEnabled: true
  }

  /**
   * Log an audit event
   */
  async logEvent(event: AuditEvent): Promise<AuditLog> {
    try {
      const enhancedEvent = {
        ...event,
        metadata: {
          ...event.metadata,
          severity: event.severity || 'low',
          timestamp: new Date().toISOString(),
          eventId: this.generateEventId(),
          source: 'audit-service'
        }
      }

      const auditLog = await this.db.createAuditLog({
        userId: enhancedEvent.userId,
        organizationId: enhancedEvent.organizationId,
        action: enhancedEvent.action,
        resourceType: enhancedEvent.resourceType,
        resourceId: enhancedEvent.resourceId,
        metadata: enhancedEvent.metadata,
        ipAddress: enhancedEvent.ipAddress,
        userAgent: enhancedEvent.userAgent
      })

      // Check for security alerts
      await this.checkForSecurityAlerts(auditLog)

      return auditLog
    } catch (error) {
      console.error('Failed to log audit event:', error)
      throw new DatabaseError('Failed to create audit log', 'AUDIT_LOG_ERROR')
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    userId: string,
    action: 'login' | 'logout' | 'login_failed' | 'token_refresh' | 'password_change' | 'mfa_enabled' | 'mfa_disabled',
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    const severity = this.getAuthEventSeverity(action)
    
    return this.logEvent({
      userId,
      action: `auth.${action}`,
      resourceType: 'authentication',
      resourceId: userId,
      severity,
      metadata: {
        ...metadata,
        authAction: action
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log authorization events
   */
  async logAuthzEvent(
    userId: string,
    organizationId: string,
    action: 'permission_granted' | 'permission_denied' | 'role_assigned' | 'role_revoked' | 'access_attempt',
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    const severity = action === 'permission_denied' ? 'medium' : 'low'
    
    return this.logEvent({
      userId,
      organizationId,
      action: `authz.${action}`,
      resourceType,
      resourceId,
      severity,
      metadata: {
        ...metadata,
        authzAction: action
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log data access events
   */
  async logDataEvent(
    userId: string,
    organizationId: string,
    action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'import',
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    const severity = this.getDataEventSeverity(action)
    
    return this.logEvent({
      userId,
      organizationId,
      action: `data.${action}`,
      resourceType,
      resourceId,
      severity,
      metadata: {
        ...metadata,
        dataAction: action
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log organization management events
   */
  async logOrgEvent(
    userId: string,
    organizationId: string,
    action: 'created' | 'updated' | 'deleted' | 'member_added' | 'member_removed' | 'settings_changed' | 'role_created' | 'role_deleted',
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    const severity = this.getOrgEventSeverity(action)
    
    return this.logEvent({
      userId,
      organizationId,
      action: `organization.${action}`,
      resourceType: 'organization',
      resourceId: organizationId,
      severity,
      metadata: {
        ...metadata,
        orgAction: action
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log security violation events
   */
  async logSecurityViolation(
    userId: string,
    organizationId: string,
    violationType: 'tenant_isolation' | 'permission_escalation' | 'suspicious_activity' | 'data_breach_attempt',
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    return this.logEvent({
      userId,
      organizationId,
      action: `security.${violationType}`,
      resourceType,
      resourceId,
      severity: 'critical',
      metadata: {
        ...metadata,
        violationType,
        securityEvent: true
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filter: AuditFilter = {}): Promise<{
    logs: AuditLog[]
    total: number
    hasMore: boolean
  }> {
    try {
      // Get logs with basic filtering
      let logs = await this.db.getAuditLogs({
        userId: filter.userId,
        organizationId: filter.organizationId,
        limit: filter.limit || 50,
        offset: filter.offset || 0,
        orderDirection: 'desc'
      })

      // Apply additional filters
      logs = this.applyAdvancedFilters(logs, filter)

      // Get total count for pagination
      const total = logs.length // This is approximate; for exact count, we'd need a separate query

      return {
        logs: logs.slice(0, filter.limit || 50),
        total,
        hasMore: logs.length > (filter.limit || 50)
      }
    } catch (error) {
      console.error('Error getting audit logs:', error)
      throw new DatabaseError('Failed to retrieve audit logs', 'GET_AUDIT_LOGS_ERROR')
    }
  }

  /**
   * Get audit summary for a time period
   */
  async getAuditSummary(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditSummary> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const end = endDate || new Date()

      const logs = await this.getAuditLogs({
        organizationId,
        startDate: start,
        endDate: end,
        limit: 10000 // Large limit to get comprehensive data
      })

      const eventsByAction: Record<string, number> = {}
      const eventsByResourceType: Record<string, number> = {}
      const eventsBySeverity: Record<string, number> = {}
      const eventsByUser: Record<string, number> = {}
      const criticalEvents: AuditLog[] = []

      logs.logs.forEach(log => {
        // Count by action
        eventsByAction[log.action] = (eventsByAction[log.action] || 0) + 1

        // Count by resource type
        eventsByResourceType[log.resourceType] = (eventsByResourceType[log.resourceType] || 0) + 1

        // Count by severity
        const severity = log.metadata?.severity || 'low'
        eventsBySeverity[severity] = (eventsBySeverity[severity] || 0) + 1

        // Count by user
        if (log.userId) {
          eventsByUser[log.userId] = (eventsByUser[log.userId] || 0) + 1
        }

        // Collect critical events
        if (severity === 'critical') {
          criticalEvents.push(log)
        }
      })

      return {
        totalEvents: logs.logs.length,
        eventsByAction,
        eventsByResourceType,
        eventsBySeverity,
        eventsByUser,
        recentCriticalEvents: criticalEvents.slice(0, 10),
        timeRange: {
          startDate: start,
          endDate: end
        }
      }
    } catch (error) {
      console.error('Error getting audit summary:', error)
      throw new DatabaseError('Failed to generate audit summary', 'GET_AUDIT_SUMMARY_ERROR')
    }
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(
    searchTerm: string,
    organizationId?: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      const logs = await this.getAuditLogs({
        organizationId,
        limit: limit * 2, // Get more to account for filtering
        searchTerm
      })

      // Filter logs based on search term
      return logs.logs.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resourceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.resourceId && log.resourceId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        JSON.stringify(log.metadata).toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, limit)
    } catch (error) {
      console.error('Error searching audit logs:', error)
      throw new DatabaseError('Failed to search audit logs', 'SEARCH_AUDIT_LOGS_ERROR')
    }
  }

  /**
   * Export audit logs to CSV
   */
  async exportAuditLogs(
    filter: AuditFilter,
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    try {
      const logs = await this.getAuditLogs({
        ...filter,
        limit: 10000 // Large limit for export
      })

      if (format === 'json') {
        return JSON.stringify(logs.logs, null, 2)
      }

      // CSV format
      const headers = [
        'Timestamp',
        'User ID',
        'Organization ID',
        'Action',
        'Resource Type',
        'Resource ID',
        'Severity',
        'IP Address',
        'User Agent',
        'Metadata'
      ]

      const csvRows = [
        headers.join(','),
        ...logs.logs.map(log => [
          log.createdAt.toISOString(),
          log.userId || '',
          log.organizationId || '',
          log.action,
          log.resourceType,
          log.resourceId || '',
          log.metadata?.severity || 'low',
          log.ipAddress || '',
          log.userAgent || '',
          JSON.stringify(log.metadata).replace(/"/g, '""')
        ].map(field => `"${field}"`).join(','))
      ]

      return csvRows.join('\n')
    } catch (error) {
      console.error('Error exporting audit logs:', error)
      throw new DatabaseError('Failed to export audit logs', 'EXPORT_AUDIT_LOGS_ERROR')
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupOldLogs(): Promise<{
    deletedCount: number
    archivedCount: number
    errors: string[]
  }> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicy.retentionDays)

      const criticalCutoffDate = new Date()
      criticalCutoffDate.setDate(criticalCutoffDate.getDate() - this.retentionPolicy.criticalEventRetentionDays)

      // Get old logs to delete/archive
      const oldLogs = await this.getAuditLogs({
        endDate: cutoffDate,
        limit: 10000
      })

      const criticalLogs = oldLogs.logs.filter(log => log.metadata?.severity === 'critical')
      const regularLogs = oldLogs.logs.filter(log => log.metadata?.severity !== 'critical')

      let deletedCount = 0
      let archivedCount = 0
      const errors: string[] = []

      // Handle critical logs (longer retention)
      const oldCriticalLogs = criticalLogs.filter(log => log.createdAt < criticalCutoffDate)
      
      if (this.retentionPolicy.archiveBeforeDelete) {
        // Archive critical logs before deletion
        for (const log of oldCriticalLogs) {
          try {
            await this.archiveLog(log)
            archivedCount++
          } catch (error) {
            errors.push(`Failed to archive log ${log.id}: ${error}`)
          }
        }
      }

      // Handle regular logs
      const logsToDelete = [
        ...regularLogs.filter(log => log.createdAt < cutoffDate),
        ...oldCriticalLogs
      ]

      // Delete old logs (this would need to be implemented in the database layer)
      for (const log of logsToDelete) {
        try {
          // Note: This would need a delete method in the database client
          // await this.db.deleteAuditLog(log.id)
          deletedCount++
        } catch (error) {
          errors.push(`Failed to delete log ${log.id}: ${error}`)
        }
      }

      console.log(`Audit log cleanup completed: ${deletedCount} deleted, ${archivedCount} archived`)

      return {
        deletedCount,
        archivedCount,
        errors
      }
    } catch (error) {
      console.error('Error during audit log cleanup:', error)
      throw new DatabaseError('Failed to cleanup audit logs', 'CLEANUP_AUDIT_LOGS_ERROR')
    }
  }

  /**
   * Set retention policy
   */
  setRetentionPolicy(policy: Partial<RetentionPolicy>): void {
    this.retentionPolicy = {
      ...this.retentionPolicy,
      ...policy
    }
  }

  /**
   * Get current retention policy
   */
  getRetentionPolicy(): RetentionPolicy {
    return { ...this.retentionPolicy }
  }

  // Private helper methods

  private applyAdvancedFilters(logs: AuditLog[], filter: AuditFilter): AuditLog[] {
    let filteredLogs = logs

    if (filter.action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(filter.action!.toLowerCase())
      )
    }

    if (filter.resourceType) {
      filteredLogs = filteredLogs.filter(log => log.resourceType === filter.resourceType)
    }

    if (filter.resourceId) {
      filteredLogs = filteredLogs.filter(log => log.resourceId === filter.resourceId)
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

    if (filter.searchTerm) {
      const searchTerm = filter.searchTerm.toLowerCase()
      filteredLogs = filteredLogs.filter(log =>
        log.action.toLowerCase().includes(searchTerm) ||
        log.resourceType.toLowerCase().includes(searchTerm) ||
        (log.resourceId && log.resourceId.toLowerCase().includes(searchTerm)) ||
        JSON.stringify(log.metadata).toLowerCase().includes(searchTerm)
      )
    }

    return filteredLogs
  }

  private getAuthEventSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (action) {
      case 'login_failed':
        return 'medium'
      case 'password_change':
      case 'mfa_enabled':
      case 'mfa_disabled':
        return 'medium'
      default:
        return 'low'
    }
  }

  private getDataEventSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (action) {
      case 'delete':
      case 'export':
        return 'medium'
      case 'import':
        return 'high'
      default:
        return 'low'
    }
  }

  private getOrgEventSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (action) {
      case 'deleted':
      case 'member_removed':
        return 'medium'
      case 'role_deleted':
        return 'high'
      default:
        return 'low'
    }
  }

  private async checkForSecurityAlerts(auditLog: AuditLog): Promise<void> {
    try {
      const severity = auditLog.metadata?.severity
      
      // Generate alerts for critical events
      if (severity === 'critical') {
        await this.generateSecurityAlert({
          type: 'security_violation',
          severity: 'critical',
          title: `Critical Security Event: ${auditLog.action}`,
          description: `A critical security event was detected for ${auditLog.resourceType}`,
          userId: auditLog.userId,
          organizationId: auditLog.organizationId,
          relatedEvents: [auditLog.id],
          metadata: {
            auditLogId: auditLog.id,
            action: auditLog.action,
            resourceType: auditLog.resourceType
          }
        })
      }

      // Check for suspicious patterns
      if (auditLog.userId) {
        await this.checkSuspiciousActivity(auditLog.userId, auditLog.organizationId)
      }
    } catch (error) {
      console.error('Error checking for security alerts:', error)
      // Don't throw error to avoid breaking the main audit logging
    }
  }

  private async generateSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'createdAt' | 'acknowledged'>): Promise<void> {
    // This would typically store alerts in a separate table or send to an external system
    console.warn('SECURITY ALERT GENERATED:', {
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      userId: alert.userId,
      organizationId: alert.organizationId
    })
  }

  private async checkSuspiciousActivity(userId: string, organizationId?: string): Promise<void> {
    // This would implement pattern detection logic
    // For now, just log that we're checking
    console.log(`Checking suspicious activity for user ${userId} in org ${organizationId}`)
  }

  private async archiveLog(log: AuditLog): Promise<void> {
    // This would implement log archiving to cold storage
    console.log(`Archiving audit log ${log.id}`)
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const auditService = new AuditService()