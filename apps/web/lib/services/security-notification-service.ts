/**
 * Security Notification Service
 * Handles security-related notifications across multiple channels
 * Provides email, in-app, and SMS notifications for security events
 */

import { createTypedSupabaseClient, DatabaseError } from '../models/database'
import { securityAuditService } from './security-audit-service'
import type { User } from '../models/types'

export interface NotificationChannel {
  type: 'email' | 'in_app' | 'sms' | 'push'
  enabled: boolean
  configuration?: Record<string, any>
}

export interface NotificationPreferences {
  userId: string
  channels: NotificationChannel[]
  securityAlerts: boolean
  loginNotifications: boolean
  passwordChanges: boolean
  deviceChanges: boolean
  suspiciousActivity: boolean
  accountLocks: boolean
  updatedAt: Date
}

export interface SecurityNotificationTemplate {
  id: string
  type: string
  title: string
  emailSubject?: string
  emailBody?: string
  inAppMessage?: string
  smsMessage?: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  variables: string[]
}

export interface NotificationDelivery {
  id: string
  userId: string
  notificationType: string
  channel: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  sentAt?: Date
  deliveredAt?: Date
  failureReason?: string
  metadata: Record<string, any>
}

export interface SecurityNotificationRequest {
  userId: string
  type: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  channels?: string[]
  variables?: Record<string, any>
  metadata?: Record<string, any>
  organizationId?: string
}

export class SecurityNotificationService {
  private db = createTypedSupabaseClient()

  // Default notification templates
  private readonly templates: SecurityNotificationTemplate[] = [
    {
      id: 'login_success',
      type: 'login_success',
      title: 'Successful Login',
      emailSubject: 'Login to your C9d.ai account',
      emailBody: 'You have successfully logged into your C9d.ai account from {{deviceInfo}} at {{timestamp}}.',
      inAppMessage: 'Login successful from {{deviceInfo}}',
      smsMessage: 'C9d.ai: Login from {{deviceInfo}} at {{timestamp}}',
      severity: 'info',
      variables: ['deviceInfo', 'timestamp', 'ipAddress', 'location']
    },
    {
      id: 'login_failed',
      type: 'login_failed',
      title: 'Failed Login Attempt',
      emailSubject: 'Failed login attempt on your C9d.ai account',
      emailBody: 'Someone attempted to log into your C9d.ai account from {{deviceInfo}} at {{timestamp}}. If this was not you, please secure your account immediately.',
      inAppMessage: 'Failed login attempt detected from {{deviceInfo}}',
      smsMessage: 'C9d.ai: Failed login attempt from {{deviceInfo}}. Secure your account if this was not you.',
      severity: 'warning',
      variables: ['deviceInfo', 'timestamp', 'ipAddress', 'location']
    },
    {
      id: 'password_changed',
      type: 'password_changed',
      title: 'Password Changed',
      emailSubject: 'Your C9d.ai password has been changed',
      emailBody: 'Your C9d.ai account password was successfully changed at {{timestamp}}. If you did not make this change, please contact support immediately.',
      inAppMessage: 'Your password has been changed successfully',
      smsMessage: 'C9d.ai: Your password was changed at {{timestamp}}',
      severity: 'info',
      variables: ['timestamp', 'ipAddress']
    },
    {
      id: 'new_device_login',
      type: 'new_device_login',
      title: 'New Device Login',
      emailSubject: 'New device login to your C9d.ai account',
      emailBody: 'Your C9d.ai account was accessed from a new device: {{deviceInfo}} at {{timestamp}} from {{location}}. If this was not you, please secure your account.',
      inAppMessage: 'Login from new device: {{deviceInfo}}',
      smsMessage: 'C9d.ai: New device login - {{deviceInfo}} from {{location}}',
      severity: 'warning',
      variables: ['deviceInfo', 'timestamp', 'location', 'ipAddress']
    },
    {
      id: 'suspicious_activity',
      type: 'suspicious_activity',
      title: 'Suspicious Activity Detected',
      emailSubject: 'Suspicious activity detected on your C9d.ai account',
      emailBody: 'We detected suspicious activity on your C9d.ai account. Risk score: {{riskScore}}/100. Please review your account activity and secure your account if necessary.',
      inAppMessage: 'Suspicious activity detected. Risk score: {{riskScore}}/100',
      smsMessage: 'C9d.ai: Suspicious activity detected. Check your account immediately.',
      severity: 'error',
      variables: ['riskScore', 'patterns', 'timestamp']
    },
    {
      id: 'account_locked',
      type: 'account_locked',
      title: 'Account Temporarily Locked',
      emailSubject: 'Your C9d.ai account has been temporarily locked',
      emailBody: 'Your C9d.ai account has been temporarily locked due to suspicious activity: {{reason}}. The lock will be automatically removed in {{duration}}. Contact support if you need immediate assistance.',
      inAppMessage: 'Your account has been temporarily locked for security reasons',
      smsMessage: 'C9d.ai: Account locked due to suspicious activity. Contact support if needed.',
      severity: 'critical',
      variables: ['reason', 'duration', 'timestamp']
    },
    {
      id: 'mfa_enabled',
      type: 'mfa_enabled',
      title: 'Multi-Factor Authentication Enabled',
      emailSubject: 'Multi-factor authentication enabled on your C9d.ai account',
      emailBody: 'Multi-factor authentication has been successfully enabled on your C9d.ai account at {{timestamp}}. Your account is now more secure.',
      inAppMessage: 'Multi-factor authentication has been enabled',
      smsMessage: 'C9d.ai: MFA enabled on your account',
      severity: 'info',
      variables: ['timestamp']
    },
    {
      id: 'mfa_disabled',
      type: 'mfa_disabled',
      title: 'Multi-Factor Authentication Disabled',
      emailSubject: 'Multi-factor authentication disabled on your C9d.ai account',
      emailBody: 'Multi-factor authentication has been disabled on your C9d.ai account at {{timestamp}}. Consider re-enabling it for better security.',
      inAppMessage: 'Multi-factor authentication has been disabled',
      smsMessage: 'C9d.ai: MFA disabled on your account. Consider re-enabling for security.',
      severity: 'warning',
      variables: ['timestamp']
    }
  ]

  /**
   * Send security notification to user
   */
  async sendSecurityNotification(request: SecurityNotificationRequest): Promise<NotificationDelivery[]> {
    try {
      // Get user notification preferences
      const preferences = await this.getUserNotificationPreferences(request.userId)
      
      // Get notification template
      const template = this.getTemplate(request.type)
      
      // Determine which channels to use
      const channels = this.determineChannels(request, preferences, template)
      
      const deliveries: NotificationDelivery[] = []

      // Send notification on each channel
      for (const channel of channels) {
        try {
          const delivery = await this.sendOnChannel(request, template, channel)
          deliveries.push(delivery)
        } catch (error) {
          console.error(`Failed to send notification on ${channel}:`, error)
          
          // Create failed delivery record
          deliveries.push({
            id: this.generateDeliveryId(),
            userId: request.userId,
            notificationType: request.type,
            channel,
            status: 'failed',
            failureReason: error instanceof Error ? error.message : 'Unknown error',
            metadata: request.metadata || {}
          })
        }
      }

      // Log notification event
      await securityAuditService.logSecurityEvent({
        userId: request.userId,
        organizationId: request.organizationId,
        action: 'security.notification_sent',
        resourceType: 'notification',
        severity: 'low',
        metadata: {
          notificationType: request.type,
          title: request.title,
          channels: channels,
          severity: request.severity,
          deliveryCount: deliveries.length,
          successCount: deliveries.filter(d => d.status === 'sent').length
        }
      })

      return deliveries

    } catch (error) {
      console.error('Error sending security notification:', error)
      throw new DatabaseError('Failed to send security notification', 'SEND_NOTIFICATION_ERROR')
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // For now, return default preferences
      // In a real implementation, this would query the database
      return {
        userId,
        channels: [
          { type: 'email', enabled: true },
          { type: 'in_app', enabled: true },
          { type: 'sms', enabled: false },
          { type: 'push', enabled: false }
        ],
        securityAlerts: true,
        loginNotifications: true,
        passwordChanges: true,
        deviceChanges: true,
        suspiciousActivity: true,
        accountLocks: true,
        updatedAt: new Date()
      }
    } catch (error) {
      console.error('Error getting notification preferences:', error)
      // Return safe defaults
      return {
        userId,
        channels: [
          { type: 'email', enabled: true },
          { type: 'in_app', enabled: true }
        ],
        securityAlerts: true,
        loginNotifications: false,
        passwordChanges: true,
        deviceChanges: true,
        suspiciousActivity: true,
        accountLocks: true,
        updatedAt: new Date()
      }
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const currentPreferences = await this.getUserNotificationPreferences(userId)
      
      const updatedPreferences: NotificationPreferences = {
        ...currentPreferences,
        ...preferences,
        userId,
        updatedAt: new Date()
      }

      // Log preference change
      await securityAuditService.logSecurityEvent({
        userId,
        action: 'security.notification_preferences_updated',
        resourceType: 'user_preferences',
        resourceId: userId,
        severity: 'low',
        metadata: {
          changes: preferences,
          previousPreferences: currentPreferences
        }
      })

      // TODO: Store in database
      console.log('Notification preferences updated:', updatedPreferences)

      return updatedPreferences

    } catch (error) {
      console.error('Error updating notification preferences:', error)
      throw new DatabaseError('Failed to update notification preferences', 'UPDATE_PREFERENCES_ERROR')
    }
  }

  /**
   * Send notification on specific channel
   */
  private async sendOnChannel(
    request: SecurityNotificationRequest,
    template: SecurityNotificationTemplate,
    channel: string
  ): Promise<NotificationDelivery> {
    const delivery: NotificationDelivery = {
      id: this.generateDeliveryId(),
      userId: request.userId,
      notificationType: request.type,
      channel,
      status: 'pending',
      metadata: request.metadata || {}
    }

    try {
      switch (channel) {
        case 'email':
          await this.sendEmailNotification(request, template)
          break
          
        case 'in_app':
          await this.sendInAppNotification(request, template)
          break
          
        case 'sms':
          await this.sendSMSNotification(request, template)
          break
          
        case 'push':
          await this.sendPushNotification(request, template)
          break
          
        default:
          throw new Error(`Unsupported notification channel: ${channel}`)
      }

      delivery.status = 'sent'
      delivery.sentAt = new Date()

      return delivery

    } catch (error) {
      delivery.status = 'failed'
      delivery.failureReason = error instanceof Error ? error.message : 'Unknown error'
      throw error
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    request: SecurityNotificationRequest,
    template: SecurityNotificationTemplate
  ): Promise<void> {
    try {
      const subject = this.interpolateTemplate(template.emailSubject || template.title, request.variables)
      const body = this.interpolateTemplate(template.emailBody || request.message, request.variables)

      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      console.log('Email notification sent:', {
        userId: request.userId,
        subject,
        body,
        severity: request.severity
      })

      // For now, just log the email content
      // In production, this would send actual emails

    } catch (error) {
      console.error('Error sending email notification:', error)
      throw error
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    request: SecurityNotificationRequest,
    template: SecurityNotificationTemplate
  ): Promise<void> {
    try {
      const message = this.interpolateTemplate(template.inAppMessage || request.message, request.variables)

      // TODO: Store in database for in-app notification system
      console.log('In-app notification sent:', {
        userId: request.userId,
        title: request.title,
        message,
        severity: request.severity
      })

      // In production, this would store the notification in a database table
      // that the frontend can query to show in-app notifications

    } catch (error) {
      console.error('Error sending in-app notification:', error)
      throw error
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    request: SecurityNotificationRequest,
    template: SecurityNotificationTemplate
  ): Promise<void> {
    try {
      const message = this.interpolateTemplate(template.smsMessage || request.message, request.variables)

      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log('SMS notification sent:', {
        userId: request.userId,
        message,
        severity: request.severity
      })

      // For now, just log the SMS content
      // In production, this would send actual SMS messages

    } catch (error) {
      console.error('Error sending SMS notification:', error)
      throw error
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    request: SecurityNotificationRequest,
    template: SecurityNotificationTemplate
  ): Promise<void> {
    try {
      // TODO: Integrate with push notification service (Firebase, Apple Push, etc.)
      console.log('Push notification sent:', {
        userId: request.userId,
        title: request.title,
        message: request.message,
        severity: request.severity
      })

      // For now, just log the push notification
      // In production, this would send actual push notifications

    } catch (error) {
      console.error('Error sending push notification:', error)
      throw error
    }
  }

  /**
   * Get notification template by type
   */
  private getTemplate(type: string): SecurityNotificationTemplate {
    const template = this.templates.find(t => t.type === type)
    
    if (!template) {
      // Return default template
      return {
        id: 'default',
        type,
        title: 'Security Notification',
        emailSubject: 'Security notification from C9d.ai',
        emailBody: 'A security event occurred on your account.',
        inAppMessage: 'Security notification',
        smsMessage: 'C9d.ai: Security notification',
        severity: 'info',
        variables: []
      }
    }

    return template
  }

  /**
   * Determine which channels to use for notification
   */
  private determineChannels(
    request: SecurityNotificationRequest,
    preferences: NotificationPreferences,
    template: SecurityNotificationTemplate
  ): string[] {
    // If specific channels are requested, use those
    if (request.channels && request.channels.length > 0) {
      return request.channels.filter(channel => 
        preferences.channels.some(c => c.type === channel && c.enabled)
      )
    }

    // Otherwise, determine based on notification type and preferences
    const enabledChannels = preferences.channels
      .filter(c => c.enabled)
      .map(c => c.type)

    // Check if user wants this type of notification
    const wantsNotification = this.userWantsNotificationType(request.type, preferences)
    
    if (!wantsNotification) {
      return []
    }

    // For critical notifications, always use all available channels
    if (template.severity === 'critical') {
      return enabledChannels
    }

    // For other notifications, use user preferences
    return enabledChannels
  }

  /**
   * Check if user wants this type of notification
   */
  private userWantsNotificationType(type: string, preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'login_success':
      case 'login_failed':
      case 'new_device_login':
        return preferences.loginNotifications

      case 'password_changed':
        return preferences.passwordChanges

      case 'suspicious_activity':
        return preferences.suspiciousActivity

      case 'account_locked':
        return preferences.accountLocks

      case 'mfa_enabled':
      case 'mfa_disabled':
        return preferences.securityAlerts

      default:
        return preferences.securityAlerts
    }
  }

  /**
   * Interpolate template variables
   */
  private interpolateTemplate(template: string, variables?: Record<string, any>): string {
    if (!variables) return template

    let result = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      result = result.replace(new RegExp(placeholder, 'g'), String(value))
    })

    return result
  }

  /**
   * Generate unique delivery ID
   */
  private generateDeliveryId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get notification delivery status
   */
  async getNotificationDeliveries(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationDelivery[]> {
    try {
      // TODO: Query from database
      // For now, return empty array
      return []
    } catch (error) {
      console.error('Error getting notification deliveries:', error)
      return []
    }
  }

  /**
   * Mark notification as read (for in-app notifications)
   */
  async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      // TODO: Update database
      console.log('Notification marked as read:', { userId, notificationId })

      // Log the action
      await securityAuditService.logSecurityEvent({
        userId,
        action: 'security.notification_read',
        resourceType: 'notification',
        resourceId: notificationId,
        severity: 'low'
      })

    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }
}

// Export singleton instance
export const securityNotificationService = new SecurityNotificationService()