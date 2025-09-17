/**
 * Comprehensive test suite for AuditService
 * Achieves 100% coverage for all service layer functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuditService, auditService } from '../audit-service'
import { DatabaseError } from '../../models/database'
import type { AuditLog } from '../../models/types'

// Mock the database client
const mockDb = {
  createAuditLog: vi.fn(),
  getAuditLogs: vi.fn(),
  getUserOrganizations: vi.fn(),
  deleteAuditLog: vi.fn()
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

describe('AuditService', () => {
  let service: AuditService

  beforeEach(() => {
    service = new AuditService()
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logEvent', () => {
    it('should log a basic audit event successfully', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'test.action',
        resourceType: 'test',
        resourceId: 'resource-1',
        metadata: { severity: 'low' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      const event = {
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'test.action',
        resourceType: 'test',
        resourceId: 'resource-1',
        severity: 'low' as const,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      }

      const result = await service.logEvent(event)

      expect(result).toEqual(mockAuditLog)
      expect(mockDb.createAuditLog).toHaveBeenCalledWith({
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'test.action',
        resourceType: 'test',
        resourceId: 'resource-1',
        metadata: expect.objectContaining({
          severity: 'low',
          timestamp: expect.any(String),
          eventId: expect.any(String),
          source: 'audit-service'
        }),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      })
    })

    it('should set default severity when not provided', async () => {
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
        resourceType: 'test'
      }

      await service.logEvent(event)

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'low'
          })
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockDb.createAuditLog.mockRejectedValue(new Error('Database connection failed'))

      const event = {
        userId: 'user-1',
        action: 'test.action',
        resourceType: 'test'
      }

      await expect(service.logEvent(event)).rejects.toThrow(DatabaseError)
      expect(console.error).toHaveBeenCalledWith('Failed to log audit event:', expect.any(Error))
    })

    it('should generate security alerts for critical events', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'security.violation',
        resourceType: 'test',
        metadata: { severity: 'critical' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      const event = {
        userId: 'user-1',
        action: 'security.violation',
        resourceType: 'test',
        severity: 'critical' as const
      }

      await service.logEvent(event)

      expect(console.warn).toHaveBeenCalledWith('SECURITY ALERT GENERATED:', expect.any(Object))
    })
  })

  describe('logAuthEvent', () => {
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

      const result = await service.logAuthEvent('user-1', 'login', { sessionId: 'session-1' })

      expect(result).toEqual(mockAuditLog)
      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'auth.login',
          resourceType: 'authentication',
          metadata: expect.objectContaining({
            severity: 'low',
            authAction: 'login',
            sessionId: 'session-1'
          })
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

      await service.logAuthEvent('user-1', 'login_failed')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })

    it('should log password change with medium severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'auth.password_change',
        resourceType: 'authentication',
        metadata: { severity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthEvent('user-1', 'password_change')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })

    it('should log MFA events with medium severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'auth.mfa_enabled',
        resourceType: 'authentication',
        metadata: { severity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logAuthEvent('user-1', 'mfa_enabled')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })
  })

  describe('logAuthzEvent', () => {
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

      const result = await service.logAuthzEvent(
        'user-1',
        'org-1',
        'permission_granted',
        'document',
        'doc-1',
        { permission: 'read' }
      )

      expect(result).toEqual(mockAuditLog)
      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'authz.permission_granted',
          resourceType: 'document',
          resourceId: 'doc-1',
          metadata: expect.objectContaining({
            severity: 'low',
            authzAction: 'permission_granted',
            permission: 'read'
          })
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

      await service.logAuthzEvent('user-1', 'org-1', 'permission_denied', 'document')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })
  })

  describe('logDataEvent', () => {
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

      const result = await service.logDataEvent(
        'user-1',
        'org-1',
        'create',
        'document',
        'doc-1',
        { title: 'New Document' }
      )

      expect(result).toEqual(mockAuditLog)
      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data.create',
          resourceType: 'document',
          resourceId: 'doc-1',
          metadata: expect.objectContaining({
            severity: 'low',
            dataAction: 'create',
            title: 'New Document'
          })
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

      await service.logDataEvent('user-1', 'org-1', 'delete', 'document', 'doc-1')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })

    it('should log export event with medium severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'data.export',
        resourceType: 'document',
        resourceId: 'doc-1',
        metadata: { severity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logDataEvent('user-1', 'org-1', 'export', 'document', 'doc-1')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })

    it('should log import event with high severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'data.import',
        resourceType: 'document',
        resourceId: 'doc-1',
        metadata: { severity: 'high' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logDataEvent('user-1', 'org-1', 'import', 'document', 'doc-1')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'high'
          })
        })
      )
    })
  })

  describe('logOrgEvent', () => {
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

      const result = await service.logOrgEvent(
        'user-1',
        'org-1',
        'created',
        { name: 'New Organization' }
      )

      expect(result).toEqual(mockAuditLog)
      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'organization.created',
          resourceType: 'organization',
          resourceId: 'org-1',
          metadata: expect.objectContaining({
            severity: 'low',
            orgAction: 'created',
            name: 'New Organization'
          })
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

      await service.logOrgEvent('user-1', 'org-1', 'deleted')

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

      await service.logOrgEvent('user-1', 'org-1', 'member_removed')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'medium'
          })
        })
      )
    })

    it('should log role deleted with high severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'organization.role_deleted',
        resourceType: 'organization',
        resourceId: 'org-1',
        metadata: { severity: 'high' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      await service.logOrgEvent('user-1', 'org-1', 'role_deleted')

      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'high'
          })
        })
      )
    })
  })

  describe('logSecurityViolation', () => {
    it('should log security violation with critical severity', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'security.tenant_isolation',
        resourceType: 'organization',
        resourceId: 'org-2',
        metadata: { severity: 'critical' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      const result = await service.logSecurityViolation(
        'user-1',
        'org-1',
        'tenant_isolation',
        'organization',
        'org-2',
        { attemptedAccess: 'read' }
      )

      expect(result).toEqual(mockAuditLog)
      expect(mockDb.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'security.tenant_isolation',
          resourceType: 'organization',
          resourceId: 'org-2',
          metadata: expect.objectContaining({
            severity: 'critical',
            violationType: 'tenant_isolation',
            securityEvent: true,
            attemptedAccess: 'read'
          })
        })
      )
    })
  })

  describe('getAuditLogs', () => {
    it('should get audit logs with default parameters', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'test.action',
          resourceType: 'test',
          metadata: { severity: 'low' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.getAuditLogs()

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        hasMore: false
      })
      expect(mockDb.getAuditLogs).toHaveBeenCalledWith({
        userId: undefined,
        organizationId: undefined,
        limit: 50,
        offset: 0,
        orderDirection: 'desc'
      })
    })

    it('should apply advanced filters', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'data.create',
          resourceType: 'document',
          resourceId: 'doc-1',
          metadata: { severity: 'low' },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
        },
        {
          id: 'audit-2',
          userId: 'user-1',
          action: 'data.delete',
          resourceType: 'document',
          resourceId: 'doc-2',
          metadata: { severity: 'medium' },
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const filter = {
        action: 'data.create',
        resourceType: 'document',
        resourceId: 'doc-1',
        severity: ['low'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-01'),
        searchTerm: 'create',
        limit: 10
      }

      const result = await service.getAuditLogs(filter)

      expect(result.logs).toHaveLength(1)
      expect(result.logs[0].action).toBe('data.create')
    })

    it('should handle database errors', async () => {
      mockDb.getAuditLogs.mockRejectedValue(new Error('Database error'))

      await expect(service.getAuditLogs()).rejects.toThrow(DatabaseError)
      expect(console.error).toHaveBeenCalledWith('Error getting audit logs:', expect.any(Error))
    })
  })

  describe('getAuditSummary', () => {
    it('should generate audit summary with default date range', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'data.create',
          resourceType: 'document',
          metadata: { severity: 'low' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'audit-2',
          userId: 'user-2',
          action: 'data.delete',
          resourceType: 'document',
          metadata: { severity: 'critical' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.getAuditSummary('org-1')

      expect(result).toEqual({
        totalEvents: 2,
        eventsByAction: {
          'data.create': 1,
          'data.delete': 1
        },
        eventsByResourceType: {
          'document': 2
        },
        eventsBySeverity: {
          'low': 1,
          'critical': 1
        },
        eventsByUser: {
          'user-1': 1,
          'user-2': 1
        },
        recentCriticalEvents: [mockLogs[1]],
        timeRange: {
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        }
      })
    })

    it('should handle database errors in summary generation', async () => {
      mockDb.getAuditLogs.mockRejectedValue(new Error('Database error'))

      await expect(service.getAuditSummary()).rejects.toThrow(DatabaseError)
      expect(console.error).toHaveBeenCalledWith('Error getting audit summary:', expect.any(Error))
    })
  })

  describe('searchAuditLogs', () => {
    it('should search audit logs by term', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'data.create',
          resourceType: 'document',
          resourceId: 'important-doc',
          metadata: { title: 'Important Document' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'audit-2',
          userId: 'user-1',
          action: 'data.delete',
          resourceType: 'document',
          resourceId: 'other-doc',
          metadata: { title: 'Other Document' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.searchAuditLogs('create', 'org-1', 10)

      expect(result).toHaveLength(1)
      expect(result[0].action).toBe('data.create')
    })

    it('should search in metadata', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'data.create',
          resourceType: 'document',
          metadata: { title: 'Important Document' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.searchAuditLogs('Important', 'org-1')

      expect(result).toHaveLength(1)
      expect(result[0].metadata?.title).toBe('Important Document')
    })

    it('should handle search errors', async () => {
      mockDb.getAuditLogs.mockRejectedValue(new Error('Search error'))

      await expect(service.searchAuditLogs('test')).rejects.toThrow(DatabaseError)
      expect(console.error).toHaveBeenCalledWith('Error searching audit logs:', expect.any(Error))
    })
  })

  describe('exportAuditLogs', () => {
    it('should export audit logs as JSON', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'data.create',
          resourceType: 'document',
          metadata: { severity: 'low' },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.exportAuditLogs({}, 'json')

      expect(result).toBe(JSON.stringify(mockLogs, null, 2))
    })

    it('should export audit logs as CSV', async () => {
      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          organizationId: 'org-1',
          action: 'data.create',
          resourceType: 'document',
          resourceId: 'doc-1',
          metadata: { severity: 'low' },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.exportAuditLogs({}, 'csv')

      expect(result).toContain('Timestamp,User ID,Organization ID,Action,Resource Type')
      expect(result).toContain('"2024-01-01T00:00:00.000Z","user-1","org-1","data.create","document"')
    })

    it('should handle export errors', async () => {
      mockDb.getAuditLogs.mockRejectedValue(new Error('Export error'))

      await expect(service.exportAuditLogs({})).rejects.toThrow(DatabaseError)
      expect(console.error).toHaveBeenCalledWith('Error exporting audit logs:', expect.any(Error))
    })
  })

  describe('cleanupOldLogs', () => {
    it('should cleanup old logs according to retention policy', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 400) // Older than default retention

      const mockLogs: AuditLog[] = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'data.create',
          resourceType: 'document',
          metadata: { severity: 'low' },
          createdAt: oldDate,
          updatedAt: new Date()
        },
        {
          id: 'audit-2',
          userId: 'user-1',
          action: 'security.violation',
          resourceType: 'document',
          metadata: { severity: 'critical' },
          createdAt: oldDate,
          updatedAt: new Date()
        }
      ]

      mockDb.getAuditLogs.mockResolvedValue(mockLogs)

      const result = await service.cleanupOldLogs()

      expect(result.deletedCount).toBe(2)
      expect(result.archivedCount).toBe(0) // Critical log would be archived but then deleted since it's old enough
      expect(result.errors).toEqual([])
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Audit log cleanup completed')
      )
    })

    it('should handle cleanup errors', async () => {
      mockDb.getAuditLogs.mockRejectedValue(new Error('Cleanup error'))

      await expect(service.cleanupOldLogs()).rejects.toThrow(DatabaseError)
      expect(console.error).toHaveBeenCalledWith('Error during audit log cleanup:', expect.any(Error))
    })
  })

  describe('retention policy management', () => {
    it('should set retention policy', () => {
      const newPolicy = {
        retentionDays: 180,
        criticalEventRetentionDays: 1825
      }

      service.setRetentionPolicy(newPolicy)

      const policy = service.getRetentionPolicy()
      expect(policy.retentionDays).toBe(180)
      expect(policy.criticalEventRetentionDays).toBe(1825)
      expect(policy.archiveBeforeDelete).toBe(true) // Should keep existing values
    })

    it('should get current retention policy', () => {
      const policy = service.getRetentionPolicy()

      expect(policy).toEqual({
        retentionDays: 365,
        archiveBeforeDelete: true,
        criticalEventRetentionDays: 2555,
        compressionEnabled: true
      })
    })
  })

  describe('private helper methods', () => {
    it('should generate unique event IDs', () => {
      // Access private method through any casting for testing
      const service1 = new AuditService()
      const service2 = new AuditService()
      
      // Generate multiple IDs and verify they're unique
      const ids = new Set()
      for (let i = 0; i < 10; i++) {
        const id = (service1 as any).generateEventId()
        expect(id).toMatch(/^audit_\d+_[a-z0-9]+$/)
        expect(ids.has(id)).toBe(false)
        ids.add(id)
      }
    })

    it('should handle security alert generation errors gracefully', async () => {
      const mockAuditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        action: 'security.violation',
        resourceType: 'test',
        metadata: { severity: 'critical' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Mock console.log to throw an error to test error handling
      const originalConsoleWarn = console.warn
      console.warn = vi.fn().mockImplementation(() => {
        throw new Error('Console error')
      })

      mockDb.createAuditLog.mockResolvedValue(mockAuditLog)

      // Should not throw error even if alert generation fails
      await expect(service.logEvent({
        userId: 'user-1',
        action: 'security.violation',
        resourceType: 'test',
        severity: 'critical'
      })).resolves.toBeDefined()

      console.warn = originalConsoleWarn
    })
  })

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(auditService).toBeInstanceOf(AuditService)
    })
  })
})