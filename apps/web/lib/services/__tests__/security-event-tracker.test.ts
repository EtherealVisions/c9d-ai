import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SecurityEventTracker } from '../security-event-tracker'
import { securityAuditService } from '../security-audit-service'
import { securityMonitoringService } from '../security-monitoring-service'
import { securityNotificationService } from '../security-notification-service'
import type { WebhookEvent } from '@clerk/nextjs/server'

// Mock dependencies
vi.mock('../security-audit-service')
vi.mock('../security-monitoring-service')
vi.mock('../security-notification-service')

const mockSecurityAuditService = vi.mocked(securityAuditService)
const mockSecurityMonitoringService = vi.mocked(securityMonitoringService)
const mockSecurityNotificationService = vi.mocked(securityNotificationService)

describe('SecurityEventTracker', () => {
  let tracker: SecurityEventTracker

  beforeEach(() => {
    tracker = new SecurityEventTracker()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('trackClerkWebhookEvent', () => {
    it('should track user.created event', async () => {
      const webhookEvent: WebhookEvent = {
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
      mockSecurityMonitoringService.monitorAuthenticationEvent.mockResolvedValue()
      mockSecurityNotificationService.sendSecurityNotification.mockResolvedValue([])

      await tracker.trackClerkWebhookEvent(webhookEvent)

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

      expect(mockSecurityMonitoringService.monitorAuthenticationEvent).toHaveBeenCalledWith(
        'user_123',
        'login',
        expect.objectContaining({
          isNewUser: true,
          registrationMethod: 'password'
        }),
        undefined,
        undefined
      )
    })

    it('should track session.created event', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'session.created',
        data: {
          id: 'session_123',
          user_id: 'user_456'
        }
      } as any

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityMonitoringService.monitorAuthenticationEvent.mockResolvedValue()
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue([])

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        'user_456',
        'login',
        expect.objectContaining({
          sessionId: 'session_123'
        }),
        undefined,
        undefined
      )

      expect(mockSecurityMonitoringService.monitorAuthenticationEvent).toHaveBeenCalledWith(
        'user_456',
        'login',
        expect.objectContaining({
          sessionId: 'session_123'
        }),
        undefined,
        undefined
      )
    })

    it('should track session.ended event', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'session.ended',
        data: {
          id: 'session_123',
          user_id: 'user_456',
          created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          updated_at: new Date().toISOString()
        }
      } as any

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        'user_456',
        'logout',
        expect.objectContaining({
          sessionId: 'session_123',
          sessionDuration: expect.any(Number)
        }),
        undefined,
        undefined
      )
    })

    it('should track user.updated event', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'user.updated',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'new@example.com' }],
          first_name: 'John'
        }
      } as any

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          action: 'user.profile_updated',
          resourceType: 'user_profile',
          severity: 'low'
        })
      )
    })

    it('should track user.deleted event', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'user.deleted',
        data: {
          id: 'user_123',
          deletion_reason: 'user_requested'
        }
      } as any

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          action: 'user.account_deleted',
          resourceType: 'user_account',
          severity: 'medium'
        })
      )
    })

    it('should handle unknown event types', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'unknown.event' as any,
        data: {}
      } as any

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(consoleSpy).toHaveBeenCalledWith('Unknown Clerk webhook event type:', 'unknown.event')
    })

    it('should handle webhook processing errors', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123'
        }
      } as any

      mockSecurityAuditService.logAuthenticationEvent.mockRejectedValue(new Error('Database error'))
      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      // Should not throw
      await expect(tracker.trackClerkWebhookEvent(webhookEvent)).resolves.toBeUndefined()

      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'security.webhook_processing_error',
          resourceType: 'webhook',
          severity: 'medium'
        })
      )
    })
  })

  describe('trackAuthenticationEvent', () => {
    it('should track successful authentication event', async () => {
      const eventData = {
        eventType: 'sign_in' as const,
        userId: 'user_123',
        success: true,
        method: 'password' as const,
        context: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          deviceInfo: {
            type: 'desktop' as const,
            os: 'Windows',
            browser: 'Chrome'
          },
          metadata: { sessionId: 'session_456' }
        }
      }

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityMonitoringService.monitorAuthenticationEvent.mockResolvedValue()

      await tracker.trackAuthenticationEvent(eventData)

      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        'user_123',
        'login',
        expect.objectContaining({
          success: true,
          method: 'password',
          sessionId: 'session_456'
        }),
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(mockSecurityMonitoringService.monitorAuthenticationEvent).toHaveBeenCalledWith(
        'user_123',
        'login',
        expect.objectContaining({
          method: 'password',
          deviceInfo: eventData.context.deviceInfo
        }),
        '192.168.1.1',
        'Mozilla/5.0'
      )
    })

    it('should track failed authentication event', async () => {
      const eventData = {
        eventType: 'sign_in' as const,
        userId: 'user_123',
        success: false,
        method: 'password' as const,
        failureReason: 'invalid_credentials',
        context: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {}
        }
      }

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityMonitoringService.monitorAuthenticationEvent.mockResolvedValue()

      await tracker.trackAuthenticationEvent(eventData)

      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        'user_123',
        'login',
        expect.objectContaining({
          success: false,
          method: 'password',
          failureReason: 'invalid_credentials'
        }),
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(mockSecurityMonitoringService.monitorAuthenticationEvent).toHaveBeenCalledWith(
        'user_123',
        'login_failed',
        expect.objectContaining({
          method: 'password',
          failureReason: 'invalid_credentials'
        }),
        '192.168.1.1',
        'Mozilla/5.0'
      )
    })

    it('should handle tracking errors gracefully', async () => {
      const eventData = {
        eventType: 'sign_in' as const,
        userId: 'user_123',
        success: true,
        context: {
          metadata: {}
        }
      }

      mockSecurityAuditService.logAuthenticationEvent.mockRejectedValue(new Error('Database error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Should not throw
      await expect(tracker.trackAuthenticationEvent(eventData)).resolves.toBeUndefined()

      expect(consoleSpy).toHaveBeenCalledWith('Error tracking authentication event:', expect.any(Error))
    })
  })

  describe('createSecurityIncident', () => {
    it('should create security incident and log event', async () => {
      const incident = {
        type: 'brute_force' as const,
        severity: 'high' as const,
        userId: 'user_123',
        organizationId: 'org_456',
        description: 'Multiple failed login attempts detected',
        evidence: { failedAttempts: 10, timeWindow: '5 minutes' },
        actions: ['Account temporarily locked', 'User notified']
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const createdIncident = await tracker.createSecurityIncident(incident)

      expect(createdIncident.id).toMatch(/^incident_/)
      expect(createdIncident.type).toBe(incident.type)
      expect(createdIncident.status).toBe('open')
      expect(createdIncident.detectedAt).toBeInstanceOf(Date)

      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: incident.userId,
          organizationId: incident.organizationId,
          action: 'security.incident_created',
          resourceType: 'security_incident',
          severity: incident.severity
        })
      )
    })

    it('should send critical incident notifications', async () => {
      const incident = {
        type: 'account_takeover' as const,
        severity: 'critical' as const,
        userId: 'user_123',
        description: 'Potential account takeover detected',
        evidence: { suspiciousIPs: ['1.2.3.4', '5.6.7.8'] },
        actions: ['Account locked', 'Password reset required']
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()
      mockSecurityNotificationService.sendSecurityNotification.mockResolvedValue([])

      const createdIncident = await tracker.createSecurityIncident(incident)

      expect(createdIncident.severity).toBe('critical')

      expect(mockSecurityNotificationService.sendSecurityNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: incident.userId,
          type: 'security_alert',
          title: 'Critical Security Incident',
          severity: 'critical',
          channels: ['email', 'in_app']
        })
      )
    })

    it('should handle incident creation errors', async () => {
      const incident = {
        type: 'brute_force' as const,
        severity: 'high' as const,
        description: 'Test incident',
        evidence: {},
        actions: []
      }

      mockSecurityAuditService.logSecurityEvent.mockRejectedValue(new Error('Database error'))

      await expect(tracker.createSecurityIncident(incident)).rejects.toThrow()
    })
  })

  describe('registration method extraction', () => {
    it('should detect OAuth registration', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123',
          external_accounts: [
            { provider: 'google' }
          ],
          email_addresses: []
        }
      } as any

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityMonitoringService.monitorAuthenticationEvent.mockResolvedValue()

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        'user_123',
        'login',
        expect.objectContaining({
          registrationMethod: 'oauth_google'
        }),
        undefined,
        undefined
      )
    })

    it('should detect password registration', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123',
          external_accounts: [],
          email_addresses: [
            { email_address: 'test@example.com' }
          ]
        }
      } as any

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityMonitoringService.monitorAuthenticationEvent.mockResolvedValue()

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        'user_123',
        'login',
        expect.objectContaining({
          registrationMethod: 'password'
        }),
        undefined,
        undefined
      )
    })

    it('should handle unknown registration method', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123',
          external_accounts: [],
          email_addresses: []
        }
      } as any

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityMonitoringService.monitorAuthenticationEvent.mockResolvedValue()

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        'user_123',
        'login',
        expect.objectContaining({
          registrationMethod: 'unknown'
        }),
        undefined,
        undefined
      )
    })
  })

  describe('new device detection', () => {
    it('should detect new device correctly', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'session.created',
        data: {
          id: 'session_123',
          user_id: 'user_456'
        }
      } as any

      // Mock no previous events (new device)
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue([])
      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityMonitoringService.monitorAuthenticationEvent.mockResolvedValue()

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(mockSecurityMonitoringService.monitorAuthenticationEvent).toHaveBeenCalledWith(
        'user_456',
        'login',
        expect.objectContaining({
          newDevice: true // Will be true since no previous events are mocked
        }),
        undefined,
        undefined
      )
    })
  })

  describe('session duration calculation', () => {
    it('should calculate session duration correctly', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'session.ended',
        data: {
          id: 'session_123',
          user_id: 'user_456',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T11:30:00Z'
        }
      } as any

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        'user_456',
        'logout',
        expect.objectContaining({
          sessionId: 'session_123',
          sessionDuration: 5400 // 1.5 hours in seconds
        }),
        undefined,
        undefined
      )
    })

    it('should handle missing timestamps', async () => {
      const webhookEvent: WebhookEvent = {
        type: 'session.ended',
        data: {
          id: 'session_123',
          user_id: 'user_456'
          // No timestamps
        }
      } as any

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()

      await tracker.trackClerkWebhookEvent(webhookEvent)

      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        'user_456',
        'logout',
        expect.objectContaining({
          sessionId: 'session_123',
          sessionDuration: 0
        }),
        undefined,
        undefined
      )
    })
  })

  describe('resolveSecurityIncident', () => {
    it('should resolve incident and log action', async () => {
      const incidentId = 'incident_123'
      const resolvedBy = 'admin_456'
      const notes = 'False positive - legitimate user activity'

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await tracker.resolveSecurityIncident(incidentId, 'false_positive', resolvedBy, notes)

      expect(consoleSpy).toHaveBeenCalledWith('Security incident resolved:', {
        incidentId,
        resolution: 'false_positive',
        resolvedBy,
        notes
      })

      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: resolvedBy,
          action: 'security.incident_resolved',
          resourceType: 'security_incident',
          resourceId: incidentId
        })
      )
    })

    it('should handle resolution errors', async () => {
      const incidentId = 'incident_123'
      const resolvedBy = 'admin_456'

      mockSecurityAuditService.logSecurityEvent.mockRejectedValue(new Error('Database error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Should not throw
      await expect(
        tracker.resolveSecurityIncident(incidentId, 'resolved', resolvedBy)
      ).resolves.toBeUndefined()

      expect(consoleSpy).toHaveBeenCalledWith('Error resolving security incident:', expect.any(Error))
    })
  })
})