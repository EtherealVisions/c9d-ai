/**
 * Tenant Isolation Integration Tests
 * Simple integration tests to verify tenant isolation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { securityAuditService } from '../security-audit-service'
import { organizationService } from '../organization-service'

// Mock the database client
vi.mock('../../models/database', () => ({
  createTypedSupabaseClient: vi.fn(() => ({
    getUserOrganizations: vi.fn(),
    getOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    createAuditLog: vi.fn(),
    validateTenantAccess: vi.fn(),
    setUserContext: vi.fn(),
    clearUserContext: vi.fn()
  }))
}))

describe('Tenant Isolation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Security Audit Service', () => {
    it('should log security events successfully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await securityAuditService.logSecurityEvent({
        userId: 'user-123',
        organizationId: 'org-456',
        action: 'test.event',
        resourceType: 'test',
        severity: 'low',
        metadata: { test: true }
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security event logged: test.event (low)'),
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })

    it('should generate unique event IDs', () => {
      const service = securityAuditService as any
      const id1 = service.generateEventId()
      const id2 = service.generateEventId()

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^evt_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^evt_\d+_[a-z0-9]+$/)
    })

    it('should handle high severity events', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await securityAuditService.logSecurityEvent({
        userId: 'user-123',
        action: 'test.high_severity',
        resourceType: 'test',
        severity: 'high'
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('HIGH SEVERITY SECURITY EVENT'),
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })

    it('should handle critical severity events', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await securityAuditService.logSecurityEvent({
        userId: 'user-123',
        action: 'test.critical',
        resourceType: 'test',
        severity: 'critical'
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL SECURITY EVENT DETECTED'),
        expect.any(Object)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should log tenant isolation violations', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await securityAuditService.logTenantIsolationViolation({
        userId: 'user-123',
        attemptedOrganizationId: 'org-456',
        actualOrganizationIds: ['org-789'],
        action: 'organization.read',
        resourceType: 'organization',
        timestamp: new Date()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: Tenant isolation violation detected'),
        expect.any(Object)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should validate tenant access with empty organizations', async () => {
      const result = await securityAuditService.validateAndLogTenantAccess(
        'user-123',
        'org-456',
        'test.action',
        'test',
        'test-resource',
        [] // Empty organizations array
      )

      expect(result).toBe(false)
    })

    it('should validate tenant access with matching organization', async () => {
      const result = await securityAuditService.validateAndLogTenantAccess(
        'user-123',
        'org-456',
        'test.action',
        'test',
        'test-resource',
        ['org-456', 'org-789'] // User has access to org-456
      )

      expect(result).toBe(true)
    })

    it('should detect suspicious activity patterns', async () => {
      // Mock getSecurityEvents to return suspicious events
      const mockEvents = [
        // Multiple failed logins
        ...Array(6).fill(null).map((_, i) => ({
          id: `event-${i}`,
          userId: 'user-123',
          organizationId: 'org-456',
          action: 'auth.login_failed',
          resourceType: 'authentication',
          resourceId: 'user-123',
          metadata: { severity: 'medium' },
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      ]

      vi.spyOn(securityAuditService, 'getSecurityEvents').mockResolvedValue(mockEvents)

      const result = await securityAuditService.detectSuspiciousActivity('user-123', 'org-456')

      expect(result.suspiciousPatterns).toContain('Multiple failed login attempts')
      expect(result.riskScore).toBeGreaterThan(0)
      expect(result.recommendations).toContain('Consider enabling multi-factor authentication')
    })
  })

  describe('Organization Service Integration', () => {
    it('should handle tenant access validation errors gracefully', async () => {
      const result = await organizationService.getOrganization('org-456', 'user-123')

      // Should return an error due to tenant access validation
      expect(result.error).toBeDefined()
      expect(['TENANT_ACCESS_DENIED', 'GET_ORGANIZATION_ERROR']).toContain(result.code)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully in security audit', async () => {
      // This test verifies that security audit doesn't break the main flow
      // even when database operations fail
      const result = await securityAuditService.validateAndLogTenantAccess(
        'user-123',
        'org-456',
        'test.action',
        'test'
        // No userOrganizations provided, will try to query database
      )

      // Should return false due to error, but not throw
      expect(result).toBe(false)
    })

    it('should not throw errors when logging fails', async () => {
      // This should not throw even if the underlying database operation fails
      await expect(
        securityAuditService.logSecurityEvent({
          userId: 'user-123',
          action: 'test.event',
          resourceType: 'test',
          severity: 'low'
        })
      ).resolves.not.toThrow()
    })
  })
})