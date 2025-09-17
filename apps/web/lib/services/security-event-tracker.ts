/**
 * Security Event Tracker
 * Tracks and processes security events from various sources including Clerk webhooks
 * Provides comprehensive audit trails and real-time security monitoring
 */

import { securityAuditService } from './security-audit-service'
import { securityMonitoringService } from './security-monitoring-service'
import { securityNotificationService } from './security-notification-service'
import type { WebhookEvent } from '@clerk/nextjs/server'

export interface SecurityEventContext {
  userId?: string
  organizationId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet'
    os?: string
    browser?: string
    version?: string
  }
  location?: {
    country?: string
    region?: string
    city?: string
    timezone?: string
  }
  metadata?: Record<string, any>
}

export interface AuthenticationEventData {
  eventType: 'sign_in' | 'sign_out' | 'sign_up' | 'session_created' | 'session_ended' | 'password_reset' | 'email_verification'
  userId: string
  success: boolean
  method?: 'password' | 'oauth_google' | 'oauth_github' | 'oauth_microsoft' | 'magic_link'
  failureReason?: string
  context: SecurityEventContext
}

export interface SecurityIncident {
  id: string
  type: 'brute_force' | 'account_takeover' | 'suspicious_login' | 'data_breach' | 'privilege_escalation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  organizationId?: string
  description: string
  detectedAt: Date
  resolvedAt?: Date
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
  evidence: Record<string, any>
  actions: string[]
}

export class SecurityEventTracker {
  /**
   * Track authentication event from Clerk webhook
   */
  async trackClerkWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      const context = this.extractContextFromWebhook(event)
      
      switch (event.type) {
        case 'user.created':
          await this.trackUserRegistration(event.data, context)
          break
          
        case 'session.created':
          await this.trackSessionCreated(event.data, context)
          break
          
        case 'session.ended':
          await this.trackSessionEnded(event.data, context)
          break
          
        case 'user.updated':
          await this.trackUserUpdated(event.data, context)
          break
          
        case 'user.deleted':
          await this.trackUserDeleted(event.data, context)
          break
          
        default:
          // Log unknown event type
          console.log('Unknown Clerk webhook event type:', event.type)
      }
    } catch (error) {
      console.error('Error tracking Clerk webhook event:', error)
      
      // Log the error but don't throw to avoid breaking webhook processing
      await securityAuditService.logSecurityEvent({
        action: 'security.webhook_processing_error',
        resourceType: 'webhook',
        severity: 'medium',
        metadata: {
          eventType: event.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Track user registration event
   */
  private async trackUserRegistration(userData: any, context: SecurityEventContext): Promise<void> {
    const userId = userData.id
    
    // Log registration event
    await securityAuditService.logAuthenticationEvent(
      userId,
      'login', // Clerk doesn't have separate sign_up event in webhooks
      {
        registrationMethod: this.extractRegistrationMethod(userData),
        emailVerified: userData.email_addresses?.[0]?.verification?.status === 'verified',
        ...context.metadata
      },
      context.ipAddress,
      context.userAgent
    )

    // Monitor for suspicious registration patterns
    await securityMonitoringService.monitorAuthenticationEvent(
      userId,
      'login',
      {
        isNewUser: true,
        registrationMethod: this.extractRegistrationMethod(userData),
        ...context.metadata
      },
      context.ipAddress,
      context.userAgent
    )

    // Send welcome notification if appropriate
    if (userData.email_addresses?.[0]?.verification?.status === 'verified') {
      await securityNotificationService.sendSecurityNotification({
        userId,
        type: 'login_success',
        title: 'Welcome to C9d.ai',
        message: 'Your account has been successfully created and verified.',
        severity: 'info',
        variables: {
          timestamp: new Date().toISOString(),
          deviceInfo: this.formatDeviceInfo(context.deviceInfo),
          ipAddress: context.ipAddress,
          location: this.formatLocation(context.location)
        },
        metadata: context.metadata
      })
    }
  }

  /**
   * Track session created event
   */
  private async trackSessionCreated(sessionData: any, context: SecurityEventContext): Promise<void> {
    const userId = sessionData.user_id
    const sessionId = sessionData.id
    
    // Determine if this is a new device
    const isNewDevice = await this.isNewDevice(userId, context)
    
    // Log session creation
    await securityAuditService.logAuthenticationEvent(
      userId,
      'login',
      {
        sessionId,
        newDevice: isNewDevice,
        ...context.metadata
      },
      context.ipAddress,
      context.userAgent
    )

    // Monitor authentication event
    await securityMonitoringService.monitorAuthenticationEvent(
      userId,
      'login',
      {
        sessionId,
        newDevice: isNewDevice,
        deviceInfo: context.deviceInfo,
        location: context.location,
        ...context.metadata
      },
      context.ipAddress,
      context.userAgent
    )
  }

  /**
   * Track session ended event
   */
  private async trackSessionEnded(sessionData: any, context: SecurityEventContext): Promise<void> {
    const userId = sessionData.user_id
    const sessionId = sessionData.id
    
    // Log session end
    await securityAuditService.logAuthenticationEvent(
      userId,
      'logout',
      {
        sessionId,
        sessionDuration: this.calculateSessionDuration(sessionData),
        ...context.metadata
      },
      context.ipAddress,
      context.userAgent
    )
  }

  /**
   * Track user updated event
   */
  private async trackUserUpdated(userData: any, context: SecurityEventContext): Promise<void> {
    const userId = userData.id
    const changes = this.extractUserChanges(userData)
    
    // Log user update
    await securityAuditService.logSecurityEvent({
      userId,
      action: 'user.profile_updated',
      resourceType: 'user_profile',
      resourceId: userId,
      severity: 'low',
      metadata: {
        changes,
        ...context.metadata
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })

    // Check for security-relevant changes
    if (changes.includes('password') || changes.includes('email') || changes.includes('phone')) {
      await this.handleSecurityRelevantUserChange(userId, changes, context)
    }
  }

  /**
   * Track user deleted event
   */
  private async trackUserDeleted(userData: any, context: SecurityEventContext): Promise<void> {
    const userId = userData.id
    
    // Log user deletion
    await securityAuditService.logSecurityEvent({
      userId,
      action: 'user.account_deleted',
      resourceType: 'user_account',
      resourceId: userId,
      severity: 'medium',
      metadata: {
        deletionReason: userData.deletion_reason || 'user_requested',
        ...context.metadata
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    })
  }

  /**
   * Track manual authentication event (for non-Clerk events)
   */
  async trackAuthenticationEvent(eventData: AuthenticationEventData): Promise<void> {
    try {
      // Log the authentication event
      const clerkEventType = this.mapToClerkEventType(eventData.eventType)
      
      await securityAuditService.logAuthenticationEvent(
        eventData.userId,
        clerkEventType,
        {
          success: eventData.success,
          method: eventData.method,
          failureReason: eventData.failureReason,
          ...eventData.context.metadata
        },
        eventData.context.ipAddress,
        eventData.context.userAgent
      )

      // Monitor for suspicious activity
      if (eventData.success) {
        await securityMonitoringService.monitorAuthenticationEvent(
          eventData.userId,
          'login',
          {
            method: eventData.method,
            deviceInfo: eventData.context.deviceInfo,
            location: eventData.context.location,
            ...eventData.context.metadata
          },
          eventData.context.ipAddress,
          eventData.context.userAgent
        )
      } else {
        await securityMonitoringService.monitorAuthenticationEvent(
          eventData.userId,
          'login_failed',
          {
            method: eventData.method,
            failureReason: eventData.failureReason,
            deviceInfo: eventData.context.deviceInfo,
            ...eventData.context.metadata
          },
          eventData.context.ipAddress,
          eventData.context.userAgent
        )
      }

    } catch (error) {
      console.error('Error tracking authentication event:', error)
    }
  }

  /**
   * Create security incident
   */
  async createSecurityIncident(incident: Omit<SecurityIncident, 'id' | 'detectedAt' | 'status'>): Promise<SecurityIncident> {
    try {
      const fullIncident: SecurityIncident = {
        id: this.generateIncidentId(),
        ...incident,
        detectedAt: new Date(),
        status: 'open'
      }

      // Log incident creation
      await securityAuditService.logSecurityEvent({
        userId: incident.userId,
        organizationId: incident.organizationId,
        action: 'security.incident_created',
        resourceType: 'security_incident',
        resourceId: fullIncident.id,
        severity: incident.severity,
        metadata: {
          incidentType: incident.type,
          description: incident.description,
          evidence: incident.evidence,
          actions: incident.actions
        }
      })

      // Send critical incident notifications
      if (incident.severity === 'critical' && incident.userId) {
        await securityNotificationService.sendSecurityNotification({
          userId: incident.userId,
          type: 'security_alert',
          title: 'Critical Security Incident',
          message: `A critical security incident has been detected: ${incident.description}`,
          severity: 'critical',
          channels: ['email', 'in_app'],
          metadata: {
            incidentId: fullIncident.id,
            incidentType: incident.type
          }
        })
      }

      return fullIncident

    } catch (error) {
      console.error('Error creating security incident:', error)
      throw error
    }
  }

  /**
   * Extract context from Clerk webhook
   */
  private extractContextFromWebhook(event: WebhookEvent): SecurityEventContext {
    // Clerk webhooks don't always include IP/device info
    // This would need to be enhanced based on actual webhook payload structure
    return {
      metadata: {
        webhookId: event.data.id,
        eventType: event.type,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Extract registration method from user data
   */
  private extractRegistrationMethod(userData: any): string {
    if (userData.external_accounts?.length > 0) {
      const provider = userData.external_accounts[0].provider
      return `oauth_${provider}`
    }
    
    if (userData.email_addresses?.length > 0) {
      return 'password'
    }
    
    return 'unknown'
  }

  /**
   * Check if this is a new device for the user
   */
  private async isNewDevice(userId: string, context: SecurityEventContext): Promise<boolean> {
    try {
      // Get recent login events for this user
      const recentEvents = await securityAuditService.getSecurityEvents({
        userId,
        action: 'auth.login',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        limit: 100
      })

      // Check if we've seen this device/IP combination before
      const currentFingerprint = this.createDeviceFingerprint(context)
      
      const seenBefore = recentEvents.some(event => {
        const eventFingerprint = this.createDeviceFingerprint({
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          deviceInfo: event.metadata?.deviceInfo
        })
        return eventFingerprint === currentFingerprint
      })

      return !seenBefore

    } catch (error) {
      console.error('Error checking if new device:', error)
      return false // Assume not new device on error
    }
  }

  /**
   * Create device fingerprint for comparison
   */
  private createDeviceFingerprint(context: SecurityEventContext): string {
    const parts = [
      context.ipAddress || '',
      context.userAgent || '',
      context.deviceInfo?.type || '',
      context.deviceInfo?.os || ''
    ]
    
    return parts.join('|')
  }

  /**
   * Calculate session duration
   */
  private calculateSessionDuration(sessionData: any): number {
    if (sessionData.created_at && sessionData.updated_at) {
      const start = new Date(sessionData.created_at).getTime()
      const end = new Date(sessionData.updated_at).getTime()
      return Math.round((end - start) / 1000) // Duration in seconds
    }
    return 0
  }

  /**
   * Extract user changes from update event
   */
  private extractUserChanges(userData: any): string[] {
    const changes: string[] = []
    
    // This would need to be enhanced based on actual Clerk webhook payload
    if (userData.email_addresses) changes.push('email')
    if (userData.phone_numbers) changes.push('phone')
    if (userData.password_digest) changes.push('password')
    if (userData.first_name || userData.last_name) changes.push('name')
    if (userData.profile_image_url) changes.push('avatar')
    
    return changes
  }

  /**
   * Handle security-relevant user changes
   */
  private async handleSecurityRelevantUserChange(
    userId: string,
    changes: string[],
    context: SecurityEventContext
  ): Promise<void> {
    try {
      // Send notifications for security-relevant changes
      if (changes.includes('password')) {
        await securityMonitoringService.monitorAuthenticationEvent(
          userId,
          'password_change',
          context.metadata || {},
          context.ipAddress,
          context.userAgent
        )
      }

      if (changes.includes('email')) {
        await securityNotificationService.sendSecurityNotification({
          userId,
          type: 'security_alert',
          title: 'Email Address Changed',
          message: 'Your email address has been updated.',
          severity: 'info',
          variables: {
            timestamp: new Date().toISOString()
          }
        })
      }

    } catch (error) {
      console.error('Error handling security-relevant user change:', error)
    }
  }

  /**
   * Map event type to Clerk event type
   */
  private mapToClerkEventType(eventType: string): 'login' | 'logout' | 'login_failed' | 'token_refresh' | 'password_change' {
    switch (eventType) {
      case 'sign_in':
        return 'login'
      case 'sign_out':
        return 'logout'
      case 'password_reset':
        return 'password_change'
      default:
        return 'login'
    }
  }

  /**
   * Format device info for display
   */
  private formatDeviceInfo(deviceInfo?: SecurityEventContext['deviceInfo']): string {
    if (!deviceInfo) return 'Unknown device'
    
    const parts: string[] = [deviceInfo.type]
    if (deviceInfo.os) parts.push(deviceInfo.os)
    if (deviceInfo.browser) parts.push(deviceInfo.browser)
    
    return parts.join(' - ')
  }

  /**
   * Format location for display
   */
  private formatLocation(location?: SecurityEventContext['location']): string {
    if (!location) return 'Unknown location'
    
    const parts = []
    if (location.city) parts.push(location.city)
    if (location.region) parts.push(location.region)
    if (location.country) parts.push(location.country)
    
    return parts.join(', ') || 'Unknown location'
  }

  /**
   * Generate unique incident ID
   */
  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get security incidents for organization
   */
  async getSecurityIncidents(
    organizationId?: string,
    status?: SecurityIncident['status'],
    limit: number = 50
  ): Promise<SecurityIncident[]> {
    try {
      // TODO: Query from database
      // For now, return empty array
      return []
    } catch (error) {
      console.error('Error getting security incidents:', error)
      return []
    }
  }

  /**
   * Resolve security incident
   */
  async resolveSecurityIncident(
    incidentId: string,
    resolution: 'resolved' | 'false_positive',
    resolvedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      // TODO: Update database
      console.log('Security incident resolved:', {
        incidentId,
        resolution,
        resolvedBy,
        notes
      })

      // Log incident resolution
      await securityAuditService.logSecurityEvent({
        userId: resolvedBy,
        action: 'security.incident_resolved',
        resourceType: 'security_incident',
        resourceId: incidentId,
        severity: 'low',
        metadata: {
          resolution,
          notes
        }
      })

    } catch (error) {
      console.error('Error resolving security incident:', error)
    }
  }
}

// Export singleton instance
export const securityEventTracker = new SecurityEventTracker()