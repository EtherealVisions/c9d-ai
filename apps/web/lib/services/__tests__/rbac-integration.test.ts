/**
 * Integration tests for RBAC system
 * Tests the complete flow of permission checking and role management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RBACService } from '../rbac-service'
import { checkPermission, getRBACContext } from '../../middleware/rbac'

// Mock the database module with more realistic responses
vi.mock('../../database', () => ({
  createSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  })),
  database: {
    getClient: () => ({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    })
  }
}))

// Mock the schemas module
vi.mock('../../models/schemas', () => ({
  validateRole: vi.fn((data) => data),
  validateCreateRole: vi.fn((data) => data),
  validateUpdateRole: vi.fn((data) => data)
}))

describe('RBAC Integration Tests', () => {
  let rbacService: RBACService
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000'
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440001'

  beforeEach(() => {
    rbacService = new RBACService()
    vi.clearAllMocks()
  })

  describe('Complete RBAC workflow', () => {
    it('should handle permission checking with mocked service methods', async () => {
      // Mock user permissions
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue([
        'users:read', 'users:write', 'organizations:admin', 'roles:manage'
      ])

      // Test individual permission checks
      const canWriteUsers = await rbacService.hasPermission(mockUserId, mockOrgId, 'users:write')
      expect(canWriteUsers).toBe(true)

      const canDeleteUsers = await rbacService.hasPermission(mockUserId, mockOrgId, 'users:delete')
      expect(canDeleteUsers).toBe(false)

      // Test multiple permission checks
      const permissionResults = await rbacService.hasPermissions(mockUserId, mockOrgId, [
        'users:read', 'users:write', 'users:delete'
      ])
      expect(permissionResults).toEqual({
        'users:read': true,
        'users:write': true,
        'users:delete': false
      })

      // Test resource access validation
      const canAccessUserResource = await rbacService.validateResourceAccess(
        mockUserId, mockOrgId, 'users', 'write'
      )
      expect(canAccessUserResource).toBe(true)
    })

    it('should prevent unauthorized actions', async () => {
      // Mock user with limited permissions (Member role)
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue(['users:read'])

      // Test that user cannot perform admin actions
      const canManageRoles = await rbacService.hasPermission(mockUserId, mockOrgId, 'roles:manage')
      expect(canManageRoles).toBe(false)

      const canDeleteUsers = await rbacService.hasPermission(mockUserId, mockOrgId, 'users:delete')
      expect(canDeleteUsers).toBe(false)

      // Test that user can perform allowed actions
      const canReadUsers = await rbacService.hasPermission(mockUserId, mockOrgId, 'users:read')
      expect(canReadUsers).toBe(true)

      // Test resource access validation fails for unauthorized actions
      const canAccessAdminResource = await rbacService.validateResourceAccess(
        mockUserId, mockOrgId, 'roles', 'manage'
      )
      expect(canAccessAdminResource).toBe(false)
    })

    it('should handle complex permission scenarios', async () => {
      // Mock user with multiple permissions
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue([
        'users:read', 'users:write', 'content:read', 'content:write'
      ])

      // Test ANY permission logic (user needs at least one)
      const hasAnyUserPermission = await rbacService.hasAnyPermission(mockUserId, mockOrgId, [
        'users:delete', 'users:write', 'roles:manage'
      ])
      expect(hasAnyUserPermission).toBe(true)

      const hasAnyAdminPermission = await rbacService.hasAnyPermission(mockUserId, mockOrgId, [
        'roles:manage', 'system:admin'
      ])
      expect(hasAnyAdminPermission).toBe(false)

      // Test ALL permission logic (user needs all specified permissions)
      const hasAllContentPermissions = await rbacService.hasAllPermissions(mockUserId, mockOrgId, [
        'content:read', 'content:write'
      ])
      expect(hasAllContentPermissions).toBe(true)

      const hasAllUserPermissions = await rbacService.hasAllPermissions(mockUserId, mockOrgId, [
        'users:read', 'users:write', 'users:delete'
      ])
      expect(hasAllUserPermissions).toBe(false)
    })
  })

  describe('Service integration', () => {
    it('should demonstrate RBAC service functionality', async () => {
      // This test demonstrates how the RBAC service would be used in practice
      
      // Mock a user with admin permissions
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue([
        'users:read', 'users:write', 'organizations:admin'
      ])

      // Test that admin can perform various actions
      const canReadUsers = await rbacService.hasPermission(mockUserId, mockOrgId, 'users:read')
      const canWriteUsers = await rbacService.hasPermission(mockUserId, mockOrgId, 'users:write')
      const canAdminOrg = await rbacService.hasPermission(mockUserId, mockOrgId, 'organizations:admin')
      
      expect(canReadUsers).toBe(true)
      expect(canWriteUsers).toBe(true)
      expect(canAdminOrg).toBe(true)

      // Test resource access validation
      const canAccessUserResource = await rbacService.validateResourceAccess(
        mockUserId, mockOrgId, 'users', 'write'
      )
      expect(canAccessUserResource).toBe(true)

      // Test that admin cannot perform actions they don't have permission for
      const canDeleteSystem = await rbacService.hasPermission(mockUserId, mockOrgId, 'system:delete')
      expect(canDeleteSystem).toBe(false)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle permission check errors gracefully', async () => {
      // Mock getUserPermissions to throw an error
      vi.spyOn(rbacService, 'getUserPermissions').mockRejectedValue(new Error('Database connection failed'))

      // Should return false on error
      const hasPermission = await rbacService.hasPermission(mockUserId, mockOrgId, 'users:read')
      expect(hasPermission).toBe(false)
    })

    it('should handle non-existent users and organizations', async () => {
      // Mock empty permissions
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue([])

      const hasPermission = await rbacService.hasPermission('non-existent-user', 'non-existent-org', 'users:read')
      expect(hasPermission).toBe(false)

      const userPermissions = await rbacService.getUserPermissions('non-existent-user', 'non-existent-org')
      expect(userPermissions).toEqual([])
    })

    it('should handle empty permission arrays', async () => {
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue([])

      const hasAnyPermission = await rbacService.hasAnyPermission(mockUserId, mockOrgId, ['users:read', 'users:write'])
      expect(hasAnyPermission).toBe(false)

      const hasAllPermissions = await rbacService.hasAllPermissions(mockUserId, mockOrgId, ['users:read'])
      expect(hasAllPermissions).toBe(false)
    })
  })
})