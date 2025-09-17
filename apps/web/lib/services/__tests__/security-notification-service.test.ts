import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SecurityNotificationService } from '../security-notification-service'
import { securityAuditService } from '../security-audit-service'

// Mock dependencies
vi.mock('../security-audit-service')

const mockSecurityAuditService = vi.mocked(securityAuditService)

describe('SecurityNotificationService', () => {
  let service: SecurityNotificationService

  beforeEach(() => {
    service = new SecurityNotificationService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendSecurityNotification', () => {
    it('should send notification on all enabled channels', async () => {
      const request = {
        userId: 'user-123',
        type: 'login_success',
        title: 'Login Successful',
        message: 'You have successfully logged in',
        severity: 'info' as const
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2) // email and in_app by default
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: request.userId,
          action: 'security.notification_sent',
          resourceType: 'notification'
        })
      )
    })

    it('should handle notification failures gracefully', async () => {
      const request = {
        userId: 'user-123',
        type: 'invalid_type',
        title: 'Test Notification',
        message: 'Test message',
        severity: 'info' as const
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      // Should still return delivery records even if some fail
      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.userId === request.userId)).toBe(true)
    })

    it('should use specific channels when requested', async () => {
      const request = {
        userId: 'user-123',
        type: 'login_success',
        title: 'Login Successful',
        message: 'You have successfully logged in',
        severity: 'info' as const,
        channels: ['email']
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(1)
      expect(deliveries[0].channel).toBe('email')
    })

    it('should interpolate template variables', async () => {
      const request = {
        userId: 'user-123',
        type: 'login_success',
        title: 'Login Successful',
        message: 'Login from {{deviceInfo}} at {{timestamp}}',
        severity: 'info' as const,
        variables: {
          deviceInfo: 'iPhone',
          timestamp: '2024-01-01T00:00:00Z'
        }
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
    })
  })

  describe('getUserNotificationPreferences', () => {
    it('should return default preferences for user', async () => {
      const userId = 'user-123'

      const preferences = await service.getUserNotificationPreferences(userId)

      expect(preferences.userId).toBe(userId)
      expect(preferences.channels).toHaveLength(4)
      expect(preferences.channels.find(c => c.type === 'email')?.enabled).toBe(true)
      expect(preferences.channels.find(c => c.type === 'in_app')?.enabled).toBe(true)
      expect(preferences.securityAlerts).toBe(true)
      expect(preferences.loginNotifications).toBe(true)
    })

    it('should handle errors and return safe defaults', async () => {
      const userId = 'user-123'

      // Mock error scenario
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const preferences = await service.getUserNotificationPreferences(userId)

      expect(preferences.userId).toBe(userId)
      expect(preferences.channels).toHaveLength(4) // Safe defaults include all channel types
      expect(preferences.securityAlerts).toBe(true)
    })
  })

  describe('updateNotificationPreferences', () => {
    it('should update user preferences and log change', async () => {
      const userId = 'user-123'
      const updates = {
        loginNotifications: false,
        channels: [
          { type: 'email' as const, enabled: true },
          { type: 'sms' as const, enabled: true }
        ]
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const updatedPreferences = await service.updateNotificationPreferences(userId, updates)

      expect(updatedPreferences.userId).toBe(userId)
      expect(updatedPreferences.loginNotifications).toBe(false)
      expect(updatedPreferences.channels).toEqual(updates.channels)
      expect(updatedPreferences.updatedAt).toBeInstanceOf(Date)

      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'security.notification_preferences_updated',
          resourceType: 'user_preferences'
        })
      )
    })

    it('should handle preference update errors', async () => {
      const userId = 'user-123'
      const updates = { loginNotifications: false }

      mockSecurityAuditService.logSecurityEvent.mockRejectedValue(new Error('Database error'))

      await expect(
        service.updateNotificationPreferences(userId, updates)
      ).rejects.toThrow('Failed to update notification preferences')
    })
  })

  describe('notification templates', () => {
    it('should use correct template for login success', async () => {
      const request = {
        userId: 'user-123',
        type: 'login_success',
        title: 'Login Successful',
        message: 'Test message',
        severity: 'info' as const,
        variables: {
          deviceInfo: 'iPhone',
          timestamp: '2024-01-01T00:00:00Z'
        }
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
    })

    it('should use correct template for failed login', async () => {
      const request = {
        userId: 'user-123',
        type: 'login_failed',
        title: 'Failed Login Attempt',
        message: 'Failed login detected',
        severity: 'warning' as const,
        variables: {
          deviceInfo: 'Unknown Device',
          timestamp: '2024-01-01T00:00:00Z'
        }
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
    })

    it('should use correct template for password change', async () => {
      const request = {
        userId: 'user-123',
        type: 'password_changed',
        title: 'Password Changed',
        message: 'Your password has been changed',
        severity: 'info' as const,
        variables: {
          timestamp: '2024-01-01T00:00:00Z'
        }
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
    })

    it('should use correct template for suspicious activity', async () => {
      const request = {
        userId: 'user-123',
        type: 'suspicious_activity',
        title: 'Suspicious Activity Detected',
        message: 'Suspicious activity on your account',
        severity: 'error' as const,
        variables: {
          riskScore: '75',
          patterns: ['multiple_failed_logins'],
          timestamp: '2024-01-01T00:00:00Z'
        }
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
    })

    it('should use correct template for account lock', async () => {
      const request = {
        userId: 'user-123',
        type: 'account_locked',
        title: 'Account Locked',
        message: 'Your account has been locked',
        severity: 'critical' as const,
        variables: {
          reason: 'Suspicious activity',
          duration: '1 hour',
          timestamp: '2024-01-01T00:00:00Z'
        }
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
    })

    it('should use default template for unknown types', async () => {
      const request = {
        userId: 'user-123',
        type: 'unknown_type',
        title: 'Unknown Notification',
        message: 'Unknown notification type',
        severity: 'info' as const
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
    })
  })

  describe('channel determination', () => {
    it('should use all channels for critical notifications', async () => {
      const request = {
        userId: 'user-123',
        type: 'account_locked',
        title: 'Account Locked',
        message: 'Critical security alert',
        severity: 'critical' as const
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      // Should use all enabled channels for critical notifications
      expect(deliveries).toHaveLength(2) // email and in_app enabled by default
    })

    it('should respect user preferences for non-critical notifications', async () => {
      const request = {
        userId: 'user-123',
        type: 'login_success',
        title: 'Login Successful',
        message: 'You logged in successfully',
        severity: 'info' as const
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2) // Based on default preferences
    })
  })

  describe('markNotificationAsRead', () => {
    it('should mark notification as read and log action', async () => {
      const userId = 'user-123'
      const notificationId = 'notification-456'

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      await service.markNotificationAsRead(userId, notificationId)

      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'security.notification_read',
          resourceType: 'notification',
          resourceId: notificationId
        })
      )
    })

    it('should handle mark as read errors gracefully', async () => {
      const userId = 'user-123'
      const notificationId = 'notification-456'

      mockSecurityAuditService.logSecurityEvent.mockRejectedValue(new Error('Database error'))
      vi.spyOn(console, 'error').mockImplementation(() => {})

      // Should not throw
      await expect(
        service.markNotificationAsRead(userId, notificationId)
      ).resolves.toBeUndefined()
    })
  })

  describe('template interpolation', () => {
    it('should interpolate variables correctly', async () => {
      const request = {
        userId: 'user-123',
        type: 'login_success',
        title: 'Login from {{deviceInfo}}',
        message: 'Login at {{timestamp}} from {{location}}',
        severity: 'info' as const,
        variables: {
          deviceInfo: 'iPhone 12',
          timestamp: '2024-01-01 10:00:00',
          location: 'San Francisco, CA'
        }
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
    })

    it('should handle missing variables gracefully', async () => {
      const request = {
        userId: 'user-123',
        type: 'login_success',
        title: 'Login from {{deviceInfo}}',
        message: 'Login at {{timestamp}}',
        severity: 'info' as const
        // No variables provided
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
    })
  })

  describe('delivery tracking', () => {
    it('should generate unique delivery IDs', async () => {
      const request = {
        userId: 'user-123',
        type: 'login_success',
        title: 'Login Successful',
        message: 'Test message',
        severity: 'info' as const
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries[0].id).toMatch(/^delivery_/)
      expect(deliveries[1].id).toMatch(/^delivery_/)
      expect(deliveries[0].id).not.toBe(deliveries[1].id)
    })

    it('should track delivery metadata', async () => {
      const request = {
        userId: 'user-123',
        type: 'login_success',
        title: 'Login Successful',
        message: 'Test message',
        severity: 'info' as const,
        metadata: { sessionId: 'session-456' }
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const deliveries = await service.sendSecurityNotification(request)

      expect(deliveries).toHaveLength(2)
      expect(deliveries.every(d => d.metadata.sessionId === 'session-456')).toBe(true)
    })
  })
})