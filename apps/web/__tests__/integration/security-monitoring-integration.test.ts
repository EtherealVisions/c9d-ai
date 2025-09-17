import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { securityMonitoringService } from '../../lib/services/security-monitoring-service'
import { securityEventTracker } from '../../lib/services/security-event-tracker'
import { securityNotificationService } from '../../lib/services/security-notification-service'
import { securityAuditService } from '../../lib/services/security-audit-service'

// Mock dependencies
vi.mock('../../lib/services/security-audit-service')
vi.mock('../../lib/models/database')

const mockSecurityAuditService = vi.mocked(securityAuditService)

describe('Security Monitoring Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('End-to-End Security Event Processing', () => {
    it('should process authentication event through complete security pipeline', async () => {
      const userId = 'user-123'
      const ipAddress = '192.168.1.1'
      const userAgent = 'Mozilla/5.0'

      // Mock audit service responses
      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue([])
      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      // Test successful login monitoring
      await securityMonitoringService.monitorAuthenticationEvent(
        userId,
        'login',
        {
          sessionId: 'session-456',
          deviceInfo: { type: 'desktop', os: 'Windows', browser: 'Chrome' },
          location: { city: 'San Francisco', country: 'US' }
        },
        ipAddress,
        userAgent
      )

      // Verify authentication event was logged
      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        userId,
        'login',
        expect.objectContaining({
          sessionId: 'session-456'
        }),
        ipAddress,
        userAgent
      )

      // Verify suspicious activity detection was performed
      expect(mockSecurityAuditService.getSecurityEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          startDate: expect.any(Date),
          limit: 500
        })
      )
    })

    it('should handle suspicious activity detection and alerting', async () => {
      const userId = 'user-123'
      
      // Mock multiple failed login attempts
      const mockFailedLogins = Array.from({ length: 6 }, (_, i) => ({
        id: `log-${i}`,
        userId,
        organizationId: undefined,
        action: 'auth.login_failed',
        resourceType: 'authentication',
        resourceId: userId,
        metadata: { attempt: i + 1 },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(Date.now() - i * 60000),
        updatedAt: new Date(Date.now() - i * 60000)
      }))

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue(mockFailedLogins)
      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      // Test failed login monitoring that should trigger suspicious activity detection
      await securityMonitoringService.monitorAuthenticationEvent(
        userId,
        'login_failed',
        { reason: 'invalid_credentials' },
        '192.168.1.1',
        'Mozilla/5.0'
      )

      // Verify security alert was created
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'security.alert_created',
          resourceType: 'security_alert',
          severity: 'medium'
        })
      )
    })

    it('should process Clerk webhook events through event tracker', async () => {
      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [
            {
              email_address: 'test@example.com',
              verification: { status: 'verified' }
            }
          ],
          external_accounts: []
        }
      } as any

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()

      // Test webhook event processing
      await securityEventTracker.trackClerkWebhookEvent(webhookEvent)

      // Verify authentication event was logged for user registration
      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        'user_123',
        'login',
        expect.objectContaining({
          registrationMethod: 'password',
          emailVerified: true
        }),
        undefined,
        undefined
      )
    })

    it('should handle security incident creation and notification', async () => {
      const incident = {
        type: 'brute_force' as const,
        severity: 'critical' as const,
        userId: 'user-123',
        description: 'Multiple failed login attempts detected',
        evidence: { failedAttempts: 10, timeWindow: '5 minutes' },
        actions: ['Account temporarily locked', 'User notified']
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      // Test security incident creation
      const createdIncident = await securityEventTracker.createSecurityIncident(incident)

      expect(createdIncident.id).toMatch(/^incident_/)
      expect(createdIncident.type).toBe('brute_force')
      expect(createdIncident.severity).toBe('critical')
      expect(createdIncident.status).toBe('open')

      // Verify incident was logged
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: incident.userId,
          action: 'security.incident_created',
          resourceType: 'security_incident',
          severity: incident.severity
        })
      )
    })

    it('should send security notifications for various event types', async () => {
      const userId = 'user-123'

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      // Test password change notification
      const passwordChangeNotification = {
        userId,
        type: 'password_changed',
        title: 'Password Changed',
        message: 'Your password has been successfully changed.',
        severity: 'info' as const
      }

      const deliveries = await securityNotificationService.sendSecurityNotification(passwordChangeNotification)

      expect(deliveries).toHaveLength(2) // email and in_app by default
      expect(deliveries.every(d => d.status === 'sent')).toBe(true)
      expect(deliveries.every(d => d.userId === userId)).toBe(true)

      // Verify notification event was logged
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'security.notification_sent',
          resourceType: 'notification'
        })
      )
    })

    it('should calculate security metrics across all events', async () => {
      const mockEvents = [
        {
          id: 'log-1',
          userId: 'user-1',
          organizationId: 'org-1',
          action: 'security.alert_created',
          resourceType: 'security_alert',
          resourceId: 'alert-1',
          metadata: { severity: 'high', riskScore: 75 },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'log-2',
          userId: 'user-2',
          organizationId: 'org-1',
          action: 'security.suspicious_activity_detected',
          resourceType: 'user_account',
          resourceId: 'user-2',
          metadata: { severity: 'medium', riskScore: 50 },
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'log-3',
          userId: 'user-3',
          organizationId: 'org-1',
          action: 'auth.login_failed',
          resourceType: 'authentication',
          resourceId: 'user-3',
          metadata: { severity: 'low' },
          ipAddress: '192.168.1.3',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockSecurityAuditService.getSecurityEvents.mockResolvedValue(mockEvents)

      // Test security metrics calculation
      const metrics = await securityMonitoringService.getSecurityMetrics('org-1', 30)

      expect(metrics.totalEvents).toBe(3)
      expect(metrics.alertsGenerated).toBe(2)
      expect(metrics.suspiciousActivities).toBe(1)
      expect(metrics.averageRiskScore).toBe(63) // (75 + 50) / 2 = 62.5, rounded to 63
      expect(metrics.topThreats).toHaveLength(3)
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle service failures gracefully', async () => {
      const userId = 'user-123'

      // Mock service failure
      mockSecurityAuditService.logAuthenticationEvent.mockRejectedValue(new Error('Service unavailable'))

      // Should not throw error even when audit service fails
      await expect(
        securityMonitoringService.monitorAuthenticationEvent(userId, 'login', {})
      ).resolves.toBeUndefined()
    })

    it('should continue processing when notification service fails', async () => {
      const userId = 'user-123'

      mockSecurityAuditService.logSecurityEvent.mockRejectedValue(new Error('Database error'))

      // Should handle notification service failures gracefully
      await expect(
        securityNotificationService.sendSecurityNotification({
          userId,
          type: 'login_success',
          title: 'Login Successful',
          message: 'Test message',
          severity: 'info'
        })
      ).rejects.toThrow('Failed to send security notification')
    })

    it('should handle webhook processing errors without breaking the flow', async () => {
      const webhookEvent = {
        type: 'user.created',
        data: { id: 'user_123' }
      } as any

      mockSecurityAuditService.logAuthenticationEvent.mockRejectedValue(new Error('Database error'))
      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      // Should not throw error even when processing fails
      await expect(
        securityEventTracker.trackClerkWebhookEvent(webhookEvent)
      ).resolves.toBeUndefined()

      // Should log the error for debugging
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'security.webhook_processing_error',
          resourceType: 'webhook',
          severity: 'medium'
        })
      )
    })
  })
})