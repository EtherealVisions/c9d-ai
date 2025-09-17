import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SecurityMonitoringService } from '../security-monitoring-service'
import { securityAuditService } from '../security-audit-service'
import { securityNotificationService } from '../security-notification-service'
import type { AuditLog } from '../../models/types'

// Mock dependencies
vi.mock('../security-audit-service')
vi.mock('../security-notification-service')

const mockSecurityAuditService = vi.mocked(securityAuditService)
const mockSecurityNotificationService = vi.mocked(securityNotificationService)

describe('SecurityMonitoringService', () => {
  let service: SecurityMonitoringService

  beforeEach(() => {
    service = new SecurityMonitoringService(mockSecurityAuditService, mockSecurityNotificationService)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('monitorAuthenticationEvent', () => {
    it('should log authentication event and check for suspicious activity', async () => {
      const userId = 'user-123'
      const eventType = 'login'
      const metadata = { sessionId: 'session-456' }
      const ipAddress = '192.168.1.1'
      const userAgent = 'Mozilla/5.0'

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue([])

      await service.monitorAuthenticationEvent(userId, eventType, metadata, ipAddress, userAgent)

      expect(mockSecurityAuditService.logAuthenticationEvent).toHaveBeenCalledWith(
        userId,
        eventType,
        metadata,
        ipAddress,
        userAgent
      )
    })

    it('should handle suspicious activity detection', async () => {
      const userId = 'user-123'
      const eventType = 'login_failed'
      
      // Mock multiple failed login attempts
      const mockFailedLogins: AuditLog[] = Array.from({ length: 6 }, (_, i) => ({
        id: `log-${i}`,
        userId,
        organizationId: undefined,
        action: 'auth.login_failed',
        resourceType: 'authentication',
        resourceId: userId,
        metadata: { attempt: i + 1 },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(Date.now() - i * 60000), // 1 minute apart
        updatedAt: new Date(Date.now() - i * 60000)
      }))

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue(mockFailedLogins)
      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()
      mockSecurityNotificationService.sendSecurityNotification.mockResolvedValue([])

      await service.monitorAuthenticationEvent(userId, eventType, {}, '192.168.1.1', 'Mozilla/5.0')

      // Should detect suspicious activity and create alert
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'security.alert_created',
          severity: 'medium'
        })
      )
    })

    it('should handle critical threats with account locking', async () => {
      const userId = 'user-123'
      const eventType = 'login_failed'
      
      // Mock brute force pattern - 10 failed logins in 5 minutes
      const mockBruteForceAttempts: AuditLog[] = Array.from({ length: 10 }, (_, i) => ({
        id: `log-${i}`,
        userId,
        organizationId: undefined,
        action: 'auth.login_failed',
        resourceType: 'authentication',
        resourceId: userId,
        metadata: { attempt: i + 1 },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(Date.now() - i * 30000), // 30 seconds apart
        updatedAt: new Date(Date.now() - i * 30000)
      }))

      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue(mockBruteForceAttempts)
      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()
      mockSecurityNotificationService.sendSecurityNotification.mockResolvedValue([])

      await service.monitorAuthenticationEvent(userId, eventType, {}, '192.168.1.1', 'Mozilla/5.0')

      // Should detect brute force and lock account
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'security.account_locked',
          severity: 'critical'
        })
      )

      expect(mockSecurityNotificationService.sendSecurityNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: 'account_locked',
          severity: 'critical'
        })
      )
    })

    it('should not throw errors when monitoring fails', async () => {
      const userId = 'user-123'
      
      mockSecurityAuditService.logAuthenticationEvent.mockRejectedValue(new Error('Database error'))

      // Should not throw
      await expect(
        service.monitorAuthenticationEvent(userId, 'login', {})
      ).resolves.toBeUndefined()
    })
  })

  describe('detectSuspiciousActivity', () => {
    it('should detect multiple failed login attempts', async () => {
      const userId = 'user-123'
      const mockFailedLogins: AuditLog[] = Array.from({ length: 5 }, (_, i) => ({
        id: `log-${i}`,
        userId,
        organizationId: undefined,
        action: 'auth.login_failed',
        resourceType: 'authentication',
        resourceId: userId,
        metadata: {},
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(Date.now() - i * 60000),
        updatedAt: new Date(Date.now() - i * 60000)
      }))

      mockSecurityAuditService.getSecurityEvents.mockResolvedValue(mockFailedLogins)

      const result = await service.detectSuspiciousActivity(userId, 'login_failed', {})

      expect(result.detected).toBe(true)
      expect(result.patterns).toHaveLength(1)
      expect(result.patterns[0].type).toBe('multiple_failed_logins')
      expect(result.riskScore).toBeGreaterThan(0)
      expect(result.recommendations).toContain('Enable multi-factor authentication')
    })

    it('should detect unusual access patterns', async () => {
      const userId = 'user-123'
      const mockDataAccess: AuditLog[] = Array.from({ length: 100 }, (_, i) => ({
        id: `log-${i}`,
        userId,
        organizationId: undefined,
        action: 'data.read',
        resourceType: 'document',
        resourceId: `doc-${i}`,
        metadata: {},
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(Date.now() - i * 30000),
        updatedAt: new Date(Date.now() - i * 30000)
      }))

      mockSecurityAuditService.getSecurityEvents.mockResolvedValue(mockDataAccess)

      const result = await service.detectSuspiciousActivity(userId, 'data.read', {})

      expect(result.detected).toBe(true)
      expect(result.patterns.some(p => p.type === 'unusual_access_pattern')).toBe(true)
    })

    it('should detect tenant isolation violations', async () => {
      const userId = 'user-123'
      const mockViolations: AuditLog[] = [{
        id: 'log-1',
        userId,
        organizationId: undefined,
        action: 'tenant.isolation_violation',
        resourceType: 'organization',
        resourceId: 'org-456',
        metadata: {},
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
        updatedAt: new Date()
      }]

      mockSecurityAuditService.getSecurityEvents.mockResolvedValue(mockViolations)

      const result = await service.detectSuspiciousActivity(userId, 'tenant.isolation_violation', {})

      expect(result.detected).toBe(true)
      expect(result.patterns.some(p => p.type === 'tenant_violation')).toBe(true)
      expect(result.riskScore).toBeGreaterThanOrEqual(80)
    })

    it('should return no detection when no patterns match', async () => {
      const userId = 'user-123'
      
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue([])

      const result = await service.detectSuspiciousActivity(userId, 'login', {})

      expect(result.detected).toBe(false)
      expect(result.patterns).toHaveLength(0)
      expect(result.riskScore).toBe(0)
    })

    it('should handle errors gracefully', async () => {
      const userId = 'user-123'
      
      mockSecurityAuditService.getSecurityEvents.mockRejectedValue(new Error('Database error'))

      const result = await service.detectSuspiciousActivity(userId, 'login', {})

      expect(result.detected).toBe(false)
      expect(result.patterns).toHaveLength(0)
      expect(result.riskScore).toBe(0)
    })
  })

  describe('createSecurityAlert', () => {
    it('should create security alert and log event', async () => {
      const alertData = {
        userId: 'user-123',
        alertType: 'suspicious_activity',
        severity: 'medium' as const,
        title: 'Test Alert',
        description: 'Test description',
        metadata: { test: true }
      }

      mockSecurityAuditService.logSecurityEvent.mockResolvedValue()

      const alert = await service.createSecurityAlert(alertData)

      expect(alert.id).toMatch(/^alert_/)
      expect(alert.userId).toBe(alertData.userId)
      expect(alert.isResolved).toBe(false)
      expect(alert.createdAt).toBeInstanceOf(Date)

      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: alertData.userId,
          action: 'security.alert_created',
          resourceType: 'security_alert',
          severity: alertData.severity
        })
      )
    })

    it('should handle alert creation errors', async () => {
      const alertData = {
        userId: 'user-123',
        alertType: 'suspicious_activity',
        severity: 'medium' as const,
        title: 'Test Alert',
        description: 'Test description',
        metadata: {}
      }

      mockSecurityAuditService.logSecurityEvent.mockRejectedValue(new Error('Database error'))

      await expect(service.createSecurityAlert(alertData)).rejects.toThrow('Failed to create security alert')
    })
  })

  describe('getSecurityMetrics', () => {
    it('should calculate security metrics correctly', async () => {
      const mockEvents: AuditLog[] = [
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

      const metrics = await service.getSecurityMetrics('org-1', 30)

      expect(metrics.totalEvents).toBe(3)
      expect(metrics.alertsGenerated).toBe(2) // Both security.alert_created and security.suspicious_activity_detected
      expect(metrics.suspiciousActivities).toBe(1)
      expect(metrics.averageRiskScore).toBe(63) // (75 + 50) / 2 = 62.5, rounded to 63
      expect(metrics.topThreats).toHaveLength(3)
    })

    it('should handle empty events', async () => {
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue([])

      const metrics = await service.getSecurityMetrics('org-1', 30)

      expect(metrics.totalEvents).toBe(0)
      expect(metrics.alertsGenerated).toBe(0)
      expect(metrics.suspiciousActivities).toBe(0)
      expect(metrics.averageRiskScore).toBe(0)
      expect(metrics.topThreats).toHaveLength(0)
    })

    it('should handle metrics calculation errors', async () => {
      mockSecurityAuditService.getSecurityEvents.mockRejectedValue(new Error('Database error'))

      const metrics = await service.getSecurityMetrics('org-1', 30)

      expect(metrics.totalEvents).toBe(0)
      expect(metrics.alertsGenerated).toBe(0)
      expect(metrics.suspiciousActivities).toBe(0)
      expect(metrics.averageRiskScore).toBe(0)
      expect(metrics.topThreats).toHaveLength(0)
    })
  })

  describe('password change monitoring', () => {
    it('should send notification for password changes', async () => {
      const userId = 'user-123'
      
      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue([])
      mockSecurityNotificationService.sendSecurityNotification.mockResolvedValue([])

      await service.monitorAuthenticationEvent(userId, 'password_change', {})

      expect(mockSecurityNotificationService.sendSecurityNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: 'password_changed',
          title: 'Password Changed',
          severity: 'info'
        })
      )
    })
  })

  describe('MFA monitoring', () => {
    it('should send notification when MFA is enabled', async () => {
      const userId = 'user-123'
      
      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue([])
      mockSecurityNotificationService.sendSecurityNotification.mockResolvedValue([])

      await service.monitorAuthenticationEvent(userId, 'mfa_enabled', {})

      expect(mockSecurityNotificationService.sendSecurityNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: 'security_alert',
          title: 'Multi-Factor Authentication Enabled',
          severity: 'info'
        })
      )
    })

    it('should send warning when MFA is disabled', async () => {
      const userId = 'user-123'
      
      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue([])
      mockSecurityNotificationService.sendSecurityNotification.mockResolvedValue([])

      await service.monitorAuthenticationEvent(userId, 'mfa_disabled', {})

      expect(mockSecurityNotificationService.sendSecurityNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: 'security_alert',
          title: 'Multi-Factor Authentication Disabled',
          severity: 'warning'
        })
      )
    })
  })

  describe('new device detection', () => {
    it('should send notification for new device login', async () => {
      const userId = 'user-123'
      const metadata = { 
        newDevice: true,
        deviceInfo: { type: 'mobile', os: 'iOS' },
        ipAddress: '192.168.1.1',
        location: { city: 'San Francisco', country: 'US' }
      }
      
      mockSecurityAuditService.logAuthenticationEvent.mockResolvedValue()
      mockSecurityAuditService.getSecurityEvents.mockResolvedValue([])
      mockSecurityNotificationService.sendSecurityNotification.mockResolvedValue([])

      await service.monitorAuthenticationEvent(userId, 'login', metadata)

      expect(mockSecurityNotificationService.sendSecurityNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: 'new_device_login',
          title: 'New Device Login',
          severity: 'warning'
        })
      )
    })
  })
})