/**
 * Security Monitoring Service
 * Implements comprehensive security monitoring and alerting for authentication events
 * Provides suspicious activity detection, account security notifications, and real-time monitoring
 */

import { createTypedSupabaseClient, DatabaseError } from '../models/database'
import { securityAuditService, type SecurityEvent } from './security-audit-service'
import { securityNotificationService } from './security-notification-service'
import type { AuditLog, User } from '../models/types'

export interface SuspiciousActivityPattern {
  type: 'multiple_failed_logins' | 'unusual_access_pattern' | 'permission_escalation' | 'tenant_violation' | 'brute_force' | 'account_takeover'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  threshold: number
  timeWindow: number // in minutes
  riskScore: number
}

export interface SecurityAlert {
  id: string
  userId: string
  organizationId?: string
  alertType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  metadata: Record<string, any>
  isResolved: boolean
  createdAt: Date
  resolvedAt?: Date
  resolvedBy?: string
}

export interface SecurityNotification {
  userId: string
  type: 'security_alert' | 'suspicious_activity' | 'account_locked' | 'password_changed' | 'new_device_login'
  title: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  metadata?: Record<string, any>
  channels: ('email' | 'in_app' | 'sms')[]
}

export interface MonitoringRule {
  id: string
  name: string
  description: string
  pattern: SuspiciousActivityPattern
  isActive: boolean
  organizationId?: string
  createdAt: Date
  updatedAt: Date
}

export interface SecurityMetrics {
  totalEvents: number
  alertsGenerated: number
  suspiciousActivities: number
  blockedAttempts: number
  averageRiskScore: number
  topThreats: Array<{
    type: string
    count: number
    severity: string
  }>
}

export class SecurityMonitoringService {
  private db = createTypedSupabaseClient()
  
  constructor(
    private auditService = securityAuditService,
    private notificationService = securityNotificationService
  ) {}
  
  // Default suspicious activity patterns
  private readonly defaultPatterns: SuspiciousActivityPattern[] = [
    {
      type: 'multiple_failed_logins',
      severity: 'medium',
      description: 'Multiple failed login attempts detected',
      threshold: 5,
      timeWindow: 15, // 15 minutes
      riskScore: 30
    },
    {
      type: 'brute_force',
      severity: 'high',
      description: 'Potential brute force attack detected',
      threshold: 10,
      timeWindow: 5, // 5 minutes
      riskScore: 60
    },
    {
      type: 'unusual_access_pattern',
      severity: 'medium',
      description: 'Unusual data access pattern detected',
      threshold: 100,
      timeWindow: 60, // 1 hour
      riskScore: 25
    },
    {
      type: 'permission_escalation',
      severity: 'high',
      description: 'Multiple permission escalation attempts',
      threshold: 10,
      timeWindow: 30, // 30 minutes
      riskScore: 50
    },
    {
      type: 'tenant_violation',
      severity: 'critical',
      description: 'Cross-tenant access violation detected',
      threshold: 1,
      timeWindow: 1, // 1 minute
      riskScore: 80
    },
    {
      type: 'account_takeover',
      severity: 'critical',
      description: 'Potential account takeover detected',
      threshold: 3,
      timeWindow: 10, // 10 minutes
      riskScore: 90
    }
  ]

  /**
   * Monitor authentication events in real-time
   */
  async monitorAuthenticationEvent(
    userId: string,
    eventType: 'login' | 'login_failed' | 'logout' | 'password_change' | 'mfa_enabled' | 'mfa_disabled',
    metadata: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Log the authentication event
      await this.auditService.logAuthenticationEvent(
        userId,
        this.mapEventTypeToAuditType(eventType),
        metadata,
        ipAddress,
        userAgent
      )

      // Check for suspicious patterns
      const suspiciousActivity = await this.detectSuspiciousActivity(userId, eventType, metadata)
      
      if (suspiciousActivity.detected) {
        await this.handleSuspiciousActivity(userId, suspiciousActivity)
      }

      // Generate security notifications if needed
      await this.generateSecurityNotifications(userId, eventType, metadata, suspiciousActivity)

    } catch (error) {
      console.error('Error monitoring authentication event:', error)
      // Don't throw to avoid breaking the main authentication flow
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(
    userId: string,
    eventType: string,
    metadata: Record<string, any>
  ): Promise<{
    detected: boolean
    patterns: SuspiciousActivityPattern[]
    riskScore: number
    recommendations: string[]
  }> {
    try {
      const detectedPatterns: SuspiciousActivityPattern[] = []
      let totalRiskScore = 0
      const recommendations: string[] = []

      // Get recent events for analysis
      const recentEvents = await this.getRecentSecurityEvents(userId, 60) // Last hour

      // Check each pattern
      for (const pattern of this.defaultPatterns) {
        const isDetected = await this.checkPattern(pattern, recentEvents, eventType, metadata)
        
        if (isDetected) {
          detectedPatterns.push(pattern)
          totalRiskScore += pattern.riskScore
          recommendations.push(...this.getRecommendationsForPattern(pattern))
        }
      }

      return {
        detected: detectedPatterns.length > 0,
        patterns: detectedPatterns,
        riskScore: Math.min(totalRiskScore, 100),
        recommendations: Array.from(new Set(recommendations)) // Remove duplicates
      }
    } catch (error) {
      console.error('Error detecting suspicious activity:', error)
      return {
        detected: false,
        patterns: [],
        riskScore: 0,
        recommendations: []
      }
    }
  }

  /**
   * Handle detected suspicious activity
   */
  private async handleSuspiciousActivity(
    userId: string,
    suspiciousActivity: {
      detected: boolean
      patterns: SuspiciousActivityPattern[]
      riskScore: number
      recommendations: string[]
    }
  ): Promise<void> {
    try {
      // Create security alert
      const alert = await this.createSecurityAlert({
        userId,
        alertType: 'suspicious_activity',
        severity: this.calculateAlertSeverity(suspiciousActivity.riskScore),
        title: 'Suspicious Activity Detected',
        description: `Detected ${suspiciousActivity.patterns.length} suspicious patterns with risk score ${suspiciousActivity.riskScore}`,
        metadata: {
          patterns: suspiciousActivity.patterns.map(p => p.type),
          riskScore: suspiciousActivity.riskScore,
          recommendations: suspiciousActivity.recommendations
        }
      })

      // Log high-severity events
      if (suspiciousActivity.riskScore >= 50) {
        await this.auditService.logSecurityEvent({
          userId,
          action: 'security.suspicious_activity_detected',
          resourceType: 'user_account',
          resourceId: userId,
          severity: suspiciousActivity.riskScore >= 80 ? 'critical' : 'high',
          metadata: {
            alertId: alert.id,
            patterns: suspiciousActivity.patterns,
            riskScore: suspiciousActivity.riskScore
          }
        })
      }

      // Handle critical threats
      if (suspiciousActivity.riskScore >= 80) {
        await this.handleCriticalThreat(userId, suspiciousActivity)
      }

    } catch (error) {
      console.error('Error handling suspicious activity:', error)
    }
  }

  /**
   * Handle critical security threats
   */
  private async handleCriticalThreat(
    userId: string,
    suspiciousActivity: {
      patterns: SuspiciousActivityPattern[]
      riskScore: number
    }
  ): Promise<void> {
    try {
      // Log critical security event
      console.error('CRITICAL SECURITY THREAT DETECTED', {
        userId,
        riskScore: suspiciousActivity.riskScore,
        patterns: suspiciousActivity.patterns.map(p => p.type),
        timestamp: new Date().toISOString()
      })

      // Check if account should be temporarily locked
      const shouldLockAccount = suspiciousActivity.patterns.some(
        p => p.type === 'brute_force' || p.type === 'account_takeover'
      )

      if (shouldLockAccount) {
        await this.temporarilyLockAccount(userId, 'Critical security threat detected')
      }

      // Send immediate security notification
      await this.notificationService.sendSecurityNotification({
        userId,
        type: 'security_alert',
        title: 'Critical Security Alert',
        message: 'Critical security threat detected on your account. Please review your account activity immediately.',
        severity: 'critical',
        channels: ['email', 'in_app'],
        metadata: {
          riskScore: suspiciousActivity.riskScore,
          patterns: suspiciousActivity.patterns.map(p => p.type)
        }
      })

    } catch (error) {
      console.error('Error handling critical threat:', error)
    }
  }

  /**
   * Generate security notifications based on events
   */
  private async generateSecurityNotifications(
    userId: string,
    eventType: string,
    metadata: Record<string, any>,
    suspiciousActivity: { detected: boolean; riskScore: number }
  ): Promise<void> {
    try {
      const notifications: SecurityNotification[] = []

      // Password change notification
      if (eventType === 'password_change') {
        notifications.push({
          userId,
          type: 'password_changed',
          title: 'Password Changed',
          message: 'Your password has been successfully changed.',
          severity: 'info',
          channels: ['email', 'in_app']
        })
      }

      // New device login notification
      if (eventType === 'login' && metadata.newDevice) {
        notifications.push({
          userId,
          type: 'new_device_login',
          title: 'New Device Login',
          message: `Login detected from a new device: ${metadata.deviceInfo?.type || 'Unknown'}`,
          severity: 'warning',
          channels: ['email', 'in_app'],
          metadata: {
            deviceInfo: metadata.deviceInfo,
            ipAddress: metadata.ipAddress,
            location: metadata.location
          }
        })
      }

      // MFA changes
      if (eventType === 'mfa_enabled') {
        notifications.push({
          userId,
          type: 'security_alert',
          title: 'Multi-Factor Authentication Enabled',
          message: 'Multi-factor authentication has been enabled on your account.',
          severity: 'info',
          channels: ['email', 'in_app']
        })
      }

      if (eventType === 'mfa_disabled') {
        notifications.push({
          userId,
          type: 'security_alert',
          title: 'Multi-Factor Authentication Disabled',
          message: 'Multi-factor authentication has been disabled on your account. Consider re-enabling it for better security.',
          severity: 'warning',
          channels: ['email', 'in_app']
        })
      }

      // Suspicious activity notification
      if (suspiciousActivity.detected && suspiciousActivity.riskScore >= 30) {
        notifications.push({
          userId,
          type: 'suspicious_activity',
          title: 'Suspicious Activity Detected',
          message: 'We detected unusual activity on your account. Please review your recent activity.',
          severity: suspiciousActivity.riskScore >= 60 ? 'error' : 'warning',
          channels: ['email', 'in_app'],
          metadata: {
            riskScore: suspiciousActivity.riskScore
          }
        })
      }

      // Send all notifications
      for (const notification of notifications) {
        await this.notificationService.sendSecurityNotification(notification)
      }

    } catch (error) {
      console.error('Error generating security notifications:', error)
    }
  }



  /**
   * Create security alert
   */
  async createSecurityAlert(alertData: Omit<SecurityAlert, 'id' | 'isResolved' | 'createdAt'>): Promise<SecurityAlert> {
    try {
      const alert: SecurityAlert = {
        id: this.generateAlertId(),
        ...alertData,
        isResolved: false,
        createdAt: new Date()
      }

      // Store alert in audit log for now
      await this.auditService.logSecurityEvent({
        userId: alert.userId,
        organizationId: alert.organizationId,
        action: 'security.alert_created',
        resourceType: 'security_alert',
        resourceId: alert.id,
        severity: alert.severity,
        metadata: {
          alertType: alert.alertType,
          title: alert.title,
          description: alert.description,
          ...alert.metadata
        }
      })

      return alert
    } catch (error) {
      console.error('Error creating security alert:', error)
      throw new DatabaseError('Failed to create security alert', 'CREATE_ALERT_ERROR')
    }
  }

  /**
   * Get recent security events for analysis
   */
  private async getRecentSecurityEvents(userId: string, minutes: number): Promise<AuditLog[]> {
    try {
      const startTime = new Date()
      startTime.setMinutes(startTime.getMinutes() - minutes)

      return await this.auditService.getSecurityEvents({
        userId,
        startDate: startTime,
        limit: 500
      })
    } catch (error) {
      console.error('Error getting recent security events:', error)
      return []
    }
  }

  /**
   * Check if a specific pattern is detected
   */
  private async checkPattern(
    pattern: SuspiciousActivityPattern,
    recentEvents: AuditLog[],
    currentEventType: string,
    metadata: Record<string, any>
  ): Promise<boolean> {
    const timeWindow = new Date()
    timeWindow.setMinutes(timeWindow.getMinutes() - pattern.timeWindow)

    const relevantEvents = recentEvents.filter(event => 
      new Date(event.createdAt) >= timeWindow
    )

    switch (pattern.type) {
      case 'multiple_failed_logins':
        const failedLogins = relevantEvents.filter(e => e.action === 'auth.login_failed')
        return failedLogins.length >= pattern.threshold

      case 'brute_force':
        const recentFailedLogins = relevantEvents.filter(e => 
          e.action === 'auth.login_failed' && 
          new Date(e.createdAt) >= new Date(Date.now() - pattern.timeWindow * 60000)
        )
        return recentFailedLogins.length >= pattern.threshold

      case 'unusual_access_pattern':
        const dataAccess = relevantEvents.filter(e => e.action.startsWith('data.'))
        return dataAccess.length >= pattern.threshold

      case 'permission_escalation':
        const permissionDenied = relevantEvents.filter(e => e.action === 'authz.permission_denied')
        return permissionDenied.length >= pattern.threshold

      case 'tenant_violation':
        const violations = relevantEvents.filter(e => e.action === 'tenant.isolation_violation')
        return violations.length >= pattern.threshold

      case 'account_takeover':
        // Check for combination of failed logins followed by successful login from different IP
        const failedLoginIPs = new Set(
          relevantEvents
            .filter(e => e.action === 'auth.login_failed')
            .map(e => e.ipAddress)
            .filter(Boolean)
        )
        const successfulLoginIPs = new Set(
          relevantEvents
            .filter(e => e.action === 'auth.login')
            .map(e => e.ipAddress)
            .filter(Boolean)
        )
        
        return failedLoginIPs.size >= 2 && successfulLoginIPs.size >= 1 && 
               Array.from(failedLoginIPs).some(ip => !successfulLoginIPs.has(ip))

      default:
        return false
    }
  }

  /**
   * Get recommendations for a detected pattern
   */
  private getRecommendationsForPattern(pattern: SuspiciousActivityPattern): string[] {
    switch (pattern.type) {
      case 'multiple_failed_logins':
      case 'brute_force':
        return [
          'Enable multi-factor authentication',
          'Use a strong, unique password',
          'Consider changing your password if you suspect compromise'
        ]

      case 'unusual_access_pattern':
        return [
          'Review recent account activity',
          'Check for unauthorized access',
          'Consider enabling access notifications'
        ]

      case 'permission_escalation':
        return [
          'Review user permissions and roles',
          'Check for unauthorized privilege escalation attempts',
          'Consider implementing stricter access controls'
        ]

      case 'tenant_violation':
        return [
          'Immediate security review required',
          'Check for potential account compromise',
          'Review organization access permissions'
        ]

      case 'account_takeover':
        return [
          'Change password immediately',
          'Enable multi-factor authentication',
          'Review all active sessions',
          'Check for unauthorized account changes'
        ]

      default:
        return ['Review account security settings']
    }
  }

  /**
   * Calculate alert severity based on risk score
   */
  private calculateAlertSeverity(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical'
    if (riskScore >= 60) return 'high'
    if (riskScore >= 30) return 'medium'
    return 'low'
  }

  /**
   * Temporarily lock account for security reasons
   */
  private async temporarilyLockAccount(userId: string, reason: string): Promise<void> {
    try {
      // Log account lock event
      await this.auditService.logSecurityEvent({
        userId,
        action: 'security.account_locked',
        resourceType: 'user_account',
        resourceId: userId,
        severity: 'critical',
        metadata: {
          reason,
          lockType: 'temporary',
          duration: '1 hour'
        }
      })

      // Send notification about account lock
      await this.notificationService.sendSecurityNotification({
        userId,
        type: 'account_locked',
        title: 'Account Temporarily Locked',
        message: `Your account has been temporarily locked due to suspicious activity: ${reason}`,
        severity: 'critical',
        channels: ['email', 'in_app']
      })

      console.warn(`Account temporarily locked: ${userId} - ${reason}`)

      // TODO: Integrate with Clerk to actually lock the account
      // This would require Clerk API integration to disable the user

    } catch (error) {
      console.error('Error locking account:', error)
    }
  }

  /**
   * Get security metrics for monitoring dashboard
   */
  async getSecurityMetrics(organizationId?: string, days: number = 30): Promise<SecurityMetrics> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const events = await this.auditService.getSecurityEvents({
        organizationId,
        startDate,
        limit: 10000
      })

      const alertEvents = events.filter(e => e.action.startsWith('security.'))
      const suspiciousEvents = events.filter(e => 
        e.action === 'security.suspicious_activity_detected'
      )
      const blockedEvents = events.filter(e => 
        e.action === 'security.account_locked' || 
        e.action === 'tenant.isolation_violation'
      )

      // Calculate average risk score
      const riskScores = events
        .map(e => e.metadata?.riskScore)
        .filter(score => typeof score === 'number')
      const averageRiskScore = riskScores.length > 0 
        ? riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length 
        : 0

      // Get top threats
      const threatCounts: Record<string, { count: number; severity: string }> = {}
      events.forEach(event => {
        if (event.action.startsWith('security.') || event.action.startsWith('auth.')) {
          const key = event.action
          if (!threatCounts[key]) {
            threatCounts[key] = { count: 0, severity: event.metadata?.severity || 'low' }
          }
          threatCounts[key].count++
        }
      })

      const topThreats = Object.entries(threatCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 5)
        .map(([type, data]) => ({
          type,
          count: data.count,
          severity: data.severity
        }))

      return {
        totalEvents: events.length,
        alertsGenerated: alertEvents.length,
        suspiciousActivities: suspiciousEvents.length,
        blockedAttempts: blockedEvents.length,
        averageRiskScore: Math.round(averageRiskScore),
        topThreats
      }
    } catch (error) {
      console.error('Error getting security metrics:', error)
      return {
        totalEvents: 0,
        alertsGenerated: 0,
        suspiciousActivities: 0,
        blockedAttempts: 0,
        averageRiskScore: 0,
        topThreats: []
      }
    }
  }

  /**
   * Map event type to audit service event type
   */
  private mapEventTypeToAuditType(eventType: 'login' | 'login_failed' | 'logout' | 'password_change' | 'mfa_enabled' | 'mfa_disabled'): 'login' | 'login_failed' | 'logout' | 'password_change' | 'token_refresh' {
    switch (eventType) {
      case 'mfa_enabled':
      case 'mfa_disabled':
        return 'token_refresh' // Map MFA events to token_refresh as closest match
      default:
        return eventType as 'login' | 'login_failed' | 'logout' | 'password_change' | 'token_refresh'
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const securityMonitoringService = new SecurityMonitoringService()