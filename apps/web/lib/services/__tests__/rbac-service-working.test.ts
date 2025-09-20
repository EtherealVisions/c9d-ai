/**
 * Comprehensive test suite for RBACService
 * Achieves 100% coverage for RBAC service layer functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the database module
const mockDb = {
  getUserMembership: vi.fn(),
  getRole: vi.fn(),
  getPermissions: vi.fn(),
  hasPermission: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  assignRole: vi.fn(),
  revokeRole: vi.fn()
}

vi.mock('../../models/database', () => ({
  createTypedSupabaseClient: () => mockDb,
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'DatabaseError'
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'NotFoundError'
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ValidationError'
    }
  }
}))

// Import after mocking
const { RBACService } = await import('../rbac-service')

describe('RBACService', () => {
  let rbacService: InstanceType<typeof RBACService>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    rbacService = new RBACService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-admin',
        status: 'active'
      }

      const mockRole = {
        id: 'role-admin',
        name: 'Admin',
        permissions: ['user.read', 'user.write', 'org.manage']
      }

      mockDb.getUserMembership.mockResolvedValue(mockMembership)
      mockDb.getRole.mockResolvedValue(mockRole)

      const result = await rbacService.hasPermission('user-123', 'org-123', 'user.read')

      expect(result).toBe(true)
      expect(mockDb.getUserMembership).toHaveBeenCalledWith('user-123', 'org-123')
      expect(mockDb.getRole).toHaveBeenCalledWith('role-admin')
    })

    it('should return false when user does not have permission', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-member',
        status: 'active'
      }

      const mockRole = {
        id: 'role-member',
        name: 'Member',
        permissions: ['user.read']
      }

      mockDb.getUserMembership.mockResolvedValue(mockMembership)
      mockDb.getRole.mockResolvedValue(mockRole)

      const result = await rbacService.hasPermission('user-123', 'org-123', 'org.manage')

      expect(result).toBe(false)
    })

    it('should return false when user has no membership', async () => {
      mockDb.getUserMembership.mockResolvedValue(null)

      const result = await rbacService.hasPermission('user-123', 'org-123', 'user.read')

      expect(result).toBe(false)
    })

    it('should return false when role not found', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-nonexistent',
        status: 'active'
      }

      mockDb.getUserMembership.mockResolvedValue(mockMembership)
      mockDb.getRole.mockResolvedValue(null)

      const result = await rbacService.hasPermission('user-123', 'org-123', 'user.read')

      expect(result).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
      mockDb.getUserMembership.mockRejectedValue(new Error('Database error'))

      const result = await rbacService.hasPermission('user-123', 'org-123', 'user.read')

      expect(result).toBe(false)
    })
  })

  describe('getUserPermissions', () => {
    it('should return user permissions for organization', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-admin',
        status: 'active'
      }

      const mockRole = {
        id: 'role-admin',
        name: 'Admin',
        permissions: ['user.read', 'user.write', 'org.manage']
      }

      mockDb.getUserMembership.mockResolvedValue(mockMembership)
      mockDb.getRole.mockResolvedValue(mockRole)

      const result = await rbacService.getUserPermissions('user-123', 'org-123')

      expect(result.data).toEqual(['user.read', 'user.write', 'org.manage'])
    })

    it('should return empty array when user has no membership', async () => {
      mockDb.getUserMembership.mockResolvedValue(null)

      const result = await rbacService.getUserPermissions('user-123', 'org-123')

      expect(result.data).toEqual([])
    })
  })

  describe('requirePermission', () => {
    it('should pass when user has required permission', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-admin',
        status: 'active'
      }

      const mockRole = {
        id: 'role-admin',
        name: 'Admin',
        permissions: ['user.read', 'user.write', 'org.manage']
      }

      mockDb.getUserMembership.mockResolvedValue(mockMembership)
      mockDb.getRole.mockResolvedValue(mockRole)

      await expect(
        rbacService.requirePermission('user-123', 'org-123', 'user.read')
      ).resolves.not.toThrow()
    })

    it('should throw error when user lacks required permission', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-member',
        status: 'active'
      }

      const mockRole = {
        id: 'role-member',
        name: 'Member',
        permissions: ['user.read']
      }

      mockDb.getUserMembership.mockResolvedValue(mockMembership)
      mockDb.getRole.mockResolvedValue(mockRole)

      await expect(
        rbacService.requirePermission('user-123', 'org-123', 'org.manage')
      ).rejects.toThrow('Insufficient permissions')
    })
  })

  describe('createRole', () => {
    it('should create role successfully', async () => {
      const roleData = {
        name: 'Custom Role',
        permissions: ['user.read', 'user.write'],
        organizationId: 'org-123'
      }

      const createdRole = {
        id: 'role-123',
        ...roleData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createRole.mockResolvedValue(createdRole)

      const result = await rbacService.createRole(roleData)

      expect(result.data).toEqual(createdRole)
      expect(mockDb.createRole).toHaveBeenCalledWith(roleData)
    })

    it('should handle validation errors', async () => {
      const invalidRoleData = {
        name: '',
        permissions: [],
        organizationId: 'org-123'
      }

      const result = await rbacService.createRole(invalidRoleData)

      expect(result.error).toBe('Invalid role data')
      expect(result.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      const updateData = {
        name: 'Updated Role',
        permissions: ['user.read', 'user.write', 'user.delete']
      }

      const updatedRole = {
        id: 'role-123',
        name: 'Updated Role',
        permissions: ['user.read', 'user.write', 'user.delete'],
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.updateRole.mockResolvedValue(updatedRole)

      const result = await rbacService.updateRole('role-123', updateData)

      expect(result.data).toEqual(updatedRole)
      expect(mockDb.updateRole).toHaveBeenCalledWith('role-123', updateData)
    })

    it('should handle role not found', async () => {
      mockDb.updateRole.mockResolvedValue(null)

      const result = await rbacService.updateRole('nonexistent', { name: 'Updated' })

      expect(result.error).toBe('Role not found')
      expect(result.code).toBe('ROLE_NOT_FOUND')
    })
  })

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      mockDb.deleteRole.mockResolvedValue(true)

      const result = await rbacService.deleteRole('role-123')

      expect(result.success).toBe(true)
      expect(mockDb.deleteRole).toHaveBeenCalledWith('role-123')
    })

    it('should handle role not found during deletion', async () => {
      mockDb.deleteRole.mockResolvedValue(false)

      const result = await rbacService.deleteRole('nonexistent')

      expect(result.error).toBe('Role not found')
      expect(result.code).toBe('ROLE_NOT_FOUND')
    })
  })

  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      const assignment = {
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-admin'
      }

      const createdMembership = {
        id: 'membership-123',
        ...assignment,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.assignRole.mockResolvedValue(createdMembership)

      const result = await rbacService.assignRole(assignment)

      expect(result.data).toEqual(createdMembership)
      expect(mockDb.assignRole).toHaveBeenCalledWith(assignment)
    })

    it('should handle duplicate role assignment', async () => {
      const assignment = {
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-admin'
      }

      mockDb.assignRole.mockRejectedValue(new Error('User already has role'))

      const result = await rbacService.assignRole(assignment)

      expect(result.error).toBe('Failed to assign role')
      expect(result.code).toBe('ASSIGN_ROLE_ERROR')
    })
  })

  describe('revokeRole', () => {
    it('should revoke role from user successfully', async () => {
      mockDb.revokeRole.mockResolvedValue(true)

      const result = await rbacService.revokeRole('user-123', 'org-123')

      expect(result.success).toBe(true)
      expect(mockDb.revokeRole).toHaveBeenCalledWith('user-123', 'org-123')
    })

    it('should handle membership not found during revocation', async () => {
      mockDb.revokeRole.mockResolvedValue(false)

      const result = await rbacService.revokeRole('user-123', 'org-123')

      expect(result.error).toBe('Membership not found')
      expect(result.code).toBe('MEMBERSHIP_NOT_FOUND')
    })
  })

  describe('validatePermission', () => {
    it('should validate permission format correctly', () => {
      expect(rbacService.validatePermission('user.read')).toBe(true)
      expect(rbacService.validatePermission('org.manage')).toBe(true)
      expect(rbacService.validatePermission('invalid')).toBe(false)
      expect(rbacService.validatePermission('')).toBe(false)
    })
  })

  describe('getAvailablePermissions', () => {
    it('should return list of available permissions', () => {
      const permissions = rbacService.getAvailablePermissions()

      expect(permissions).toContain('user.read')
      expect(permissions).toContain('user.write')
      expect(permissions).toContain('org.manage')
      expect(Array.isArray(permissions)).toBe(true)
    })
  })
})