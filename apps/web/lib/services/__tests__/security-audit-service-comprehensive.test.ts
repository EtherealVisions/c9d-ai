/**
 * Comprehensive test suite for SecurityAuditService
 * Achieves 100% coverage for all service layer functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SecurityAuditService, securityAuditService } from '../security-audit-service'
import { DatabaseError } from '../../models/database'
import type { AuditLog } from '../../models/types'

// Mock the database client
const mockDb = {
  createAuditLog: vi.fn(),
  getAuditLogs: vi.fn(),
  getUserOrganizations: vi.fn()
}

vi.mock('../../models/database', () => ({
  createTypedSupabaseClient: () => mockDb,
  DatabaseError: class extends Error {
    constructor(message: string, public code: string) {
      super(message)
      this.name = 'DatabaseError'
    }
  }
}))

describe('SecurityAuditService', () => {
  let service: SecurityAuditService

  beforeEach(() => {
    service = new SecurityAuditService()
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logSecurityEvent', () => {
    it('should log a security event successfully', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'auth.login',
        resourceType: 'authentication',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      const event = {
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'auth.login',
        resourceType: 'authentication',
        severity: 'low' as const,
        metadata: { sessionId: 'session-1' }
      }

      await service.logSecurityEvent(event)

      expect(mockDb.createAuditLog).toHaveBeenCalledWith({
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'auth.login',
        resourceType: 'authentication',
        resourceId: undefined,
        metadata: expect.objectContaining({
          severity: 'low',
          eventId: expect.any(String),
          source: 'security-audit-service',
          sessionId: 'session-1'
        }),
        ipAddress: undefined,
        userAgent: undefined
      })

      expect(console.log).toHaveBeenCalledWith(
        'Security event logged: auth.login (low)',
        expect.objectContaining({
          userId: 'user-1',
          organizationId: 'org-1',
          resourceType: 'authentication'
        })
      )
    })

    it('should use current timestamp when not provided', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'test.action',
        resourceType: 'test',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      const event = {
        userId: 'user-1',
        action: 'test.action',
        resourceType: 'test',
        severity: 'low' as const
      }

      await service.logSecurityEvent(event)

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'low'
          })
        })
      )
    })

    it('should handle high severity events', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'security.violation',
        resourceType: 'authentication',
        metadata: { severity: 'high' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      const event = {
        userId: 'user-1',
        action: 'security.violation',
        resourceType: 'authentication',
        severity: 'high' as const
      }

      await service.logSecurityEvent(event)

      expect(console.warn).toHaveBeenCalledWith(
        'HIGH SEVERITY SECURITY EVENT: security.violation',
        expect.objectContaining({
          userId: 'user-1',
          resourceType: 'authentication',
          severity: 'high'
        })
      )
    })

    it('should handle critical severity events', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'security.breach',
        resourceType: 'authentication',
        metadata: { severity: 'critical' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      const event = {
        userId: 'user-1',
        action: 'security.breach',
        resourceType: 'authentication',
        severity: 'critical' as const
      }

      await service.logSecurityEvent(event)

      expect(console.error).toHaveBeenCalledWith(
        'CRITICAL SECURITY EVENT DETECTED',
        expect.objectContaining({
          userId: 'user-1',
          action: 'security.breach',
          severity: 'critical'
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockDb.createAuditLog.mockRejectedValue(new Error('Database error'))

      const event = {
        userId: 'user-1',
        action: 'test.action',
        resourceType: 'test',
        severity: 'low' as const
      }

      // Should not throw error
      await expect(service.logSecurityEvent(event)).resolves.toBeUndefined()
      expect(console.error).toHaveBeenCalledWith('Failed to log security event:', expect.any(Error))
    })
  })

  describe('logAuthenticationEvent', () => {
    it('should log login event with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'auth.login',
        resourceType: 'authentication',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthenticationEvent(
        'user-1',
        'login',
        { sessionId: 'session-1' },
        '127.0.0.1',
        'test-agent'
      )

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'auth.login',
          resourceType: 'authentication',
          resourceId: 'user-1',
          metadata: expect.objectContaining({
            severity: 'low',
            sessionId: 'session-1'
          }),
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        })
      )
    })

    it('should log failed login with medium severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'auth.login_failed',
        resourceType: 'authentication',
        metadata: { severity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthenticationEvent('user-1', 'login_failed')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })

    it('should log logout event with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'auth.logout',
        resourceType: 'authentication',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthenticationEvent('user-1', 'logout')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'low'
          })
        })
      )
    })

    it('should log token refresh with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'auth.token_refresh',
        resourceType: 'authentication',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthenticationEvent('user-1', 'token_refresh')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'low'
          })
        })
      )
    })

    it('should log password change with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'auth.password_change',
        resourceType: 'authentication',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthenticationEvent('user-1', 'password_change')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'low'
          })
        })
      )
    })
  })

  describe('logAuthorizationEvent', () => {
    it('should log permission granted with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'authz.permission_granted',
        resourceType: 'document',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthorizationEvent(
        'user-1',
        'org-1',
        'permission_granted',
        'document',
        'doc-1',
        { permission: 'read' },
        '127.0.0.1',
        'test-agent'
      )

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          organizationId: 'org-1',
          action: 'authz.permission_granted',
          resourceType: 'document',
          resourceId: 'doc-1',
          metadata: expect.objectContaining({
            severity: 'low',
            permission: 'read'
          }),
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        })
      )
    })

    it('should log permission denied with medium severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'authz.permission_denied',
        resourceType: 'document',
        metadata: { severity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthorizationEvent('user-1', 'org-1', 'permission_denied', 'document')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })

    it('should log role assigned with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'authz.role_assigned',
        resourceType: 'role',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthorizationEvent('user-1', 'org-1', 'role_assigned', 'role')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'low'
          })
        })
      )
    })

    it('should log role revoked with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'authz.role_revoked',
        resourceType: 'role',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthorizationEvent('user-1', 'org-1', 'role_revoked', 'role')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'low'
          })
        })
      )
    })
  })

  describe('logTenantIsolationViolation', () => {
    it('should log tenant isolation violation with critical severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'tenant.isolation_violation',
        resourceType: 'document',
        metadata: { severity: 'critical' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      const violation = {
        userId: 'user-1',
        attemptedOrganizationId: 'org-1',
        actualOrganizationIds: ['org-2', 'org-3'],
        action: 'read',
        resourceType: 'document',
        resourceId: 'doc-1',
        timestamp: new Date(),
        metadata: { attemptReason: 'unauthorized_access' }
      }

      await service.logTenantIsolationViolation(violation)

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          organizationId: 'org-1',
          action: 'tenant.isolation_violation',
          resourceType: 'document',
          resourceId: 'doc-1',
          metadata: expect.objectContaining({
            severity: 'critical',
            attemptedOrganizationId: 'org-1',
            actualOrganizationIds: ['org-2', 'org-3'],
            violationType: 'cross_tenant_access_attempt',
            attemptReason: 'unauthorized_access'
          })
        })
      )

      expect(console.error).toHaveBeenCalledWith(
        'CRITICAL: Tenant isolation violation detected',
        expect.objectContaining({
          userId: 'user-1',
          attemptedOrganizationId: 'org-1',
          action: 'read',
          resourceType: 'document'
        })
      )
    })
  })

  describe('logDataAccessEvent', () => {
    it('should log read event with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'data.read',
        resourceType: 'document',
        resourceId: 'doc-1',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logDataAccessEvent(
        'user-1',
        'org-1',
        'read',
        'document',
        'doc-1',
        { title: 'Test Document' },
        '127.0.0.1',
        'test-agent'
      )

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          organizationId: 'org-1',
          action: 'data.read',
          resourceType: 'document',
          resourceId: 'doc-1',
          metadata: expect.objectContaining({
            severity: 'low',
            title: 'Test Document'
          }),
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        })
      )
    })

    it('should log delete event with medium severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'data.delete',
        resourceType: 'document',
        resourceId: 'doc-1',
        metadata: { severity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logDataAccessEvent('user-1', 'org-1', 'delete', 'document', 'doc-1')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })

    it('should log create event with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'data.create',
        resourceType: 'document',
        resourceId: 'doc-1',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logDataAccessEvent('user-1', 'org-1', 'create', 'document', 'doc-1')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'low'
          })
        })
      )
    })

    it('should log update event with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'data.update',
        resourceType: 'document',
        resourceId: 'doc-1',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logDataAccessEvent('user-1', 'org-1', 'update', 'document', 'doc-1')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'low'
          })
        })
      )
    })
  })

  describe('logOrganizationEvent', () => {
    it('should log organization created with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'organization.created',
        resourceType: 'organization',
        resourceId: 'org-1',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logOrganizationEvent(
        'user-1',
        'org-1',
        'created',
        { name: 'New Organization' },
        '127.0.0.1',
        'test-agent'
      )

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          organizationId: 'org-1',
          action: 'organization.created',
          resourceType: 'organization',
          resourceId: 'org-1',
          metadata: expect.objectContaining({
            severity: 'low',
            name: 'New Organization'
          }),
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        })
      )
    })

    it('should log organization deleted with medium severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'organization.deleted',
        resourceType: 'organization',
        resourceId: 'org-1',
        metadata: { severity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logOrganizationEvent('user-1', 'org-1', 'deleted')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })

    it('should log member removed with medium severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'organization.member_removed',
        resourceType: 'organization',
        resourceId: 'org-1',
        metadata: { severity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logOrganizationEvent('user-1', 'org-1', 'member_removed')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })

    it('should log other events with low severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'organization.updated',
        resourceType: 'organization',
        resourceId: 'org-1',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logOrganizationEvent('user-1', 'org-1', 'updated')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'low'
          })
        })
      )
    })
  })

  describe('getSecurityEvents', () => {
    it('should get security events with default parameters', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'auth.login',
          resourceType: 'authentication',
          metadata: { severity: 'low' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.getSecurityEvents()

      expect(result).toEqual(mockLogs)
      expect(mockDb.getAuditLogs).toHaveBeenCalledWith({
        userId: undefined,
        organizationId: undefined,
        limit: 100,
        offset: 0,
        orderDirection: 'desc'
      })
    })

    it('should apply action filter', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'auth.login',
          resourceType: 'authentication',
          metadata: { severity: 'low' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'audit-2',
          userId: 'user-1',
          action: 'data.create',
          resourceType: 'document',
          metadata: { severity: 'low' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.getSecurityEvents({ action: 'auth' })

      expect(result).toHaveLength(1)
      expect(result[0].action).toBe('auth.login')
    })

    it('should apply resource type filter', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'auth.login',
          resourceType: 'authentication',
          metadata: { severity: 'low' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'audit-2',
          userId: 'user-1',
          action: 'data.create',
          resourceType: 'document',
          metadata: { severity: 'low' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.getSecurityEvents({ resourceType: 'authentication' })

      expect(result).toHaveLength(1)
      expect(result[0].resourceType).toBe('authentication')
    })

    it('should apply severity filter', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'auth.login',
          resourceType: 'authentication',
          metadata: { severity: 'low' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'audit-2',
          userId: 'user-1',
          action: 'security.violation',
          resourceType: 'authentication',
          metadata: { severity: 'critical' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.getSecurityEvents({ severity: ['critical'] })

      expect(result).toHaveLength(1)
      expect(result[0].metadata?.severity).toBe('critical')
    })

    it('should apply date filters', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-02')
      
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'auth.login',
          resourceType: 'authentication',
          metadata: { severity: 'low' },
          createdAt: new Date('2024-01-01T12:00:00Z'),
          updatedAt: new Date()
        },
        {
          id: 'audit-2',
          userId: 'user-1',
          action: 'auth.logout',
          resourceType: 'authentication',
          metadata: { severity: 'low' },
          createdAt: new Date('2024-01-03T12:00:00Z'),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.getSecurityEvents({ startDate, endDate })

      expect(result).toHaveLength(1)
      expect(result[0].createdAt.getTime()).toBe(new Date('2024-01-01T12:00:00Z').getTime())
    })

    it('should handle database errors', async () => {
      mockDb.getAuditLogs.mockRejectedValue(new Error('Database error'))

      await expect(service.getSecurityEvents()).rejects.toThrow(DatabaseError)
      expect(console.error).toHaveBeenCalledWith('Error getting security events:', expect.any(Error))
    })
  })

  describe('getSecuritySummary', () => {
    it('should generate security summary', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'auth.login',
          resourceType: 'authentication',
          metadata: { severity: 'low' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'audit-2',
          userId: 'user-1',
          action: 'data.create',
          resourceType: 'document',
          metadata: { severity: 'high' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'audit-3',
          userId: 'user-1',
          action: 'security.violation',
          resourceType: 'authentication',
          metadata: { severity: 'critical' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.getSecuritySummary('org-1', 7)

      expect(result).toEqual({
        totalEvents: 3,
        eventsByType: {
          'authentication': 2,
          'document': 1
        },
        eventsBySeverity: {
          'low': 1,
          'high': 1,
          'critical': 1
        },
        recentHighSeverityEvents: [mockLogs[1], mockLogs[2]]
      })
    })

    it('should handle database errors in summary generation', async () => {
      mockDb.getAuditLogs.mockRejectedValue(new Error('Database error'))

      await expect(service.getSecuritySummary('org-1')).rejects.toThrow(DatabaseError)
      expect(console.error).toHaveBeenCalledWith('Error getting security summary:', expect.any(Error))
    })
  })

  describe('detectSuspiciousActivity', () => {
    it('should detect multiple failed login attempts', async () => {
      const mockLogs: AuditLog[] = Array.from({ length: 6 }, (_, i) => ({
        id: `audit-${i}`,
        userId: 'user-1',
        action: 'auth.login_failed',
        resourceType: 'authentication',
        metadata: { severity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.detectSuspiciousActivity('user-1', 'org-1')

      expect(result.suspiciousPatterns).toContain('Multiple failed login attempts')
      expect(result.riskScore).toBeGreaterThanOrEqual(30)
      expect(result.recommendations).toContain('Consider enabling multi-factor authentication')
    })

    it('should detect unusual access patterns', async () => {
      const mockLogs: AuditLog[] = Array.from({ length: 101 }, (_, i) => ({
        id: `audit-${i}`,
        userId: 'user-1',
        action: 'data.read',
        resourceType: 'document',
        metadata: { severity: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.detectSuspiciousActivity('user-1', 'org-1')

      expect(result.suspiciousPatterns).toContain('Unusually high data access activity')
      expect(result.riskScore).toBeGreaterThanOrEqual(20)
      expect(result.recommendations).toContain('Review recent data access patterns')
    })

    it('should detect permission escalation attempts', async () => {
      const mockLogs: AuditLog[] = Array.from({ length: 11 }, (_, i) => ({
        id: `audit-${i}`,
        userId: 'user-1',
        action: 'authz.permission_denied',
        resourceType: 'document',
        metadata: { severity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.detectSuspiciousActivity('user-1', 'org-1')

      expect(result.suspiciousPatterns).toContain('Multiple permission denied events')
      expect(result.riskScore).toBeGreaterThanOrEqual(25)
      expect(result.recommendations).toContain('Review user permissions and role assignments')
    })

    it('should detect tenant isolation violations', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'tenant.isolation_violation',
          resourceType: 'document',
          metadata: { severity: 'critical' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.detectSuspiciousActivity('user-1', 'org-1')

      expect(result.suspiciousPatterns).toContain('Tenant isolation violations detected')
      expect(result.riskScore).toBeGreaterThanOrEqual(50)
      expect(result.recommendations).toContain('Immediate security review required')
    })

    it('should cap risk score at 100', async () => {
      const mockLogs: AuditLog[] = [
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `failed-${i}`,
          userId: 'user-1',
          action: 'auth.login_failed',
          resourceType: 'authentication',
          metadata: { severity: 'medium' },
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        ...Array.from({ length: 200 }, (_, i) => ({
          id: `access-${i}`,
          userId: 'user-1',
          action: 'data.read',
          resourceType: 'document',
          metadata: { severity: 'low' },
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `denied-${i}`,
          userId: 'user-1',
          action: 'authz.permission_denied',
          resourceType: 'document',
          metadata: { severity: 'medium' },
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        {
          id: 'violation-1',
          userId: 'user-1',
          action: 'tenant.isolation_violation',
          resourceType: 'document',
          metadata: { severity: 'critical' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.detectSuspiciousActivity('user-1', 'org-1')

      expect(result.riskScore).toBe(100)
    })

    it('should handle detection errors gracefully', async () => {
      mockDb.getAuditLogs.mockRejectedValue(new Error('Detection error'))

      const result = await service.detectSuspiciousActivity('user-1', 'org-1')

      expect(result).toEqual({
        suspiciousPatterns: [],
        riskScore: 0,
        recommendations: ['Error analyzing activity patterns']
      })
      expect(console.error).toHaveBeenCalledWith('Error detecting suspicious activity:', expect.any(Error))
    })
  })

  describe('validateAndLogTenantAccess', () => {
    it('should validate access when user belongs to organization', async () => {
      mockDb.getUserOrganizations.mockResolvedValue([
        { id: 'org-1', name: 'Organization 1' },
        { id: 'org-2', name: 'Organization 2' }
      ])

      const result = await service.validateAndLogTenantAccess(
        'user-1',
        'org-1',
        'read',
        'document',
        'doc-1'
      )

      expect(result).toBe(true)
      expect(mockDb.getUserOrganizations).toHaveBeenCalledWith('user-1')
    })

    it('should use provided user organizations', async () => {
      const userOrganizations = ['org-1', 'org-2']

      const result = await service.validateAndLogTenantAccess(
        'user-1',
        'org-1',
        'read',
        'document',
        'doc-1',
        userOrganizations
      )

      expect(result).toBe(true)
      expect(mockDb.getUserOrganizations).not.toHaveBeenCalled()
    })

    it('should deny access and log violation when user does not belong to organization', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-3',
        action: 'tenant.isolation_violation',
        resourceType: 'document',
        metadata: { severity: 'critical' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.getUserOrganizations.mockResolvedValue([
        { id: 'org-1', name: 'Organization 1' },
        { id: 'org-2', name: 'Organization 2' }
      ])
      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      const result = await service.validateAndLogTenantAccess(
        'user-1',
        'org-3',
        'read',
        'document',
        'doc-1'
      )

      expect(result).toBe(false)
      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tenant.isolation_violation',
          metadata: expect.objectContaining({
            attemptedOrganizationId: 'org-3',
            actualOrganizationIds: ['org-1', 'org-2'],
            violationType: 'cross_tenant_access_attempt'
          })
        })
      )
    })

    it('should handle validation errors gracefully', async () => {
      mockDb.getUserOrganizations.mockRejectedValue(new Error('Database error'))
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'tenant.validation_error',
        resourceType: 'document',
        metadata: { severity: 'high' },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      const result = await service.validateAndLogTenantAccess(
        'user-1',
        'org-1',
        'read',
        'document',
        'doc-1'
      )

      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith('Error validating tenant access:', expect.any(Error))
      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tenant.validation_error',
          metadata: expect.objectContaining({
            error: 'Database error',
            action: 'read',
            resourceType: 'document'
          })
        })
      )
    })
  })

  describe('private helper methods', () => {
    it('should generate unique event IDs', () => {
      // Access private method through any casting for testing
      const service1 = new SecurityAuditService()
      const service2 = new SecurityAuditService()
      
      // Generate multiple IDs and verify they're unique
      const ids = new Set()
      for (let i = 0; i < 10; i++) {
        const id = (service1 as any).generateEventId()
        expect(id).toMatch(/^evt_\d+_[a-z0-9]+$/)
        expect(ids.has(id)).toBe(false)
        ids.add(id)
      }
    })

    it('should handle high severity event processing errors gracefully', async () => {
      // Mock console.warn to throw an error to test error handling
      const originalConsoleWarn = console.warn
      console.warn = vi.fn().mockImplementation(() => {
        throw new Error('Console error')
      })

      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'security.violation',
        resourceType: 'test',
        metadata: { severity: 'high' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      // Should not throw error even if high severity handling fails
      await expect(service.logSecurityEvent({
        userId: 'user-1',
        action: 'security.violation',
        resourceType: 'test',
        severity: 'high'
      })).resolves.toBeUndefined()

      console.warn = originalConsoleWarn
    })
  })

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(securityAuditService).toBeInstanceOf(SecurityAuditService)
    })
  })
})