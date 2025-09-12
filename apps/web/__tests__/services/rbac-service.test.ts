/**
 * RBAC Service Unit Tests
 * Tests all RBAC service methods with proper mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/models/database')
vi.mock('@/lib/services/security-audit-service')

// Import after mocking
import { rbacService } from '@/lib/services/rbac-service'

describe('RBACService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.write'

      // Mock user membership
      const mockMembership = {
        id: 'membership-123',
        userId,
        organizationId,
        roleId: 'role-admin',
        status: 'active'
      }

      // Mock role with permissions
      const mockRole = {
        id: 'role-admin',
        name: 'Admin',
        permissions: ['organization.read', 'organization.write', 'members.manage']
      }

      vi.spyOn(rbacService['db'], 'getUserMembership').mockResolvedValue(mockMembership)
      vi.spyOn(rbacService['db'], 'getRole').mockResolvedValue(mockRole)

      const result = await rbacService.hasPermission(userId, organizationId, permission)

      expect(result).toBe(true)
    })

    it('should return false when user lacks permission', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.delete'

      // Mock user membership
      const mockMembership = {
        id: 'membership-123',
        userId,
        organizationId,
        roleId: 'role-member',
        status: 'active'
      }

      // Mock role with limited permissions
      const mockRole = {
        id: 'role-member',
        name: 'Member',
        permissions: ['organization.read']
      }

      vi.spyOn(rbacService['db'], 'getUserMembership').mockResolvedValue(mockMembership)
      vi.spyOn(rbacService['db'], 'getRole').mockResolvedValue(mockRole)

      const result = await rbacService.hasPermission(userId, organizationId, permission)

      expect(result).toBe(false)
    })

    it('should return false when user has no membership', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.read'

      vi.spyOn(rbacService['db'], 'getUserMembership').mockResolvedValue(null)

      const result = await rbacService.hasPermission(userId, organizationId, permission)

      expect(result).toBe(false)
    })

    it('should return false when membership is inactive', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.read'

      // Mock inactive membership
      const mockMembership = {
        id: 'membership-123',
        userId,
        organizationId,
        roleId: 'role-admin',
        status: 'inactive'
      }

      vi.spyOn(rbacService['db'], 'getUserMembership').mockResolvedValue(mockMembership)

      const result = await rbacService.hasPermission(userId, organizationId, permission)

      expect(result).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.read'

      vi.spyOn(rbacService['db'], 'getUserMembership').mockRejectedValue(new Error('Database error'))

      const result = await rbacService.hasPermission(userId, organizationId, permission)

      expect(result).toBe(false)
    })
  })

  describe('getUserRoles', () => {
    it('should return user roles in organization', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'

      const mockRoles = [
        {
          id: 'role-admin',
          name: 'Admin',
          description: 'Administrator role',
          organizationId,
          isSystemRole: false,
          permissions: ['organization.read', 'organization.write', 'members.manage'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'role-member',
          name: 'Member',
          description: 'Member role',
          organizationId,
          isSystemRole: false,
          permissions: ['organization.read'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      vi.spyOn(rbacService['db'], 'getUserRoles').mockResolvedValue(mockRoles)

      const result = await rbacService.getUserRoles(userId, organizationId)

      expect(result.data).toEqual(mockRoles)
      expect(result.data).toHaveLength(2)
      expect(result.error).toBeUndefined()
    })

    it('should return empty array when user has no roles', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'

      vi.spyOn(rbacService['db'], 'getUserRoles').mockResolvedValue([])

      const result = await rbacService.getUserRoles(userId, organizationId)

      expect(result.data).toEqual([])
      expect(result.error).toBeUndefined()
    })

    it('should handle database errors', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'

      vi.spyOn(rbacService['db'], 'getUserRoles').mockRejectedValue(new Error('Database error'))

      const result = await rbacService.getUserRoles(userId, organizationId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Database error')
      expect(result.code).toBe('GET_USER_ROLES_ERROR')
    })
  })

  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const roleId = 'role-admin'

      const mockAssignment = {
        id: 'assignment-123',
        userId,
        organizationId,
        roleId,
        assignedBy: 'admin-user',
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(rbacService['db'], 'assignRole').mockResolvedValue(mockAssignment)
      vi.spyOn(rbacService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await rbacService.assignRole(userId, organizationId, roleId)

      expect(result.data).toEqual(mockAssignment)
      expect(result.error).toBeUndefined()
      expect(rbacService['db'].createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'role.assigned'
        })
      )
    })

    it('should handle role assignment conflicts', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const roleId = 'role-admin'

      const DatabaseError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'DatabaseError'
        }
      }

      vi.spyOn(rbacService['db'], 'assignRole').mockRejectedValue(
        new DatabaseError('Role already assigned to user')
      )

      const result = await rbacService.assignRole(userId, organizationId, roleId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Role already assigned to user')
      expect(result.code).toBe('ASSIGN_ROLE_ERROR')
    })
  })

  describe('revokeRole', () => {
    it('should revoke role from user successfully', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const roleId = 'role-admin'

      vi.spyOn(rbacService['db'], 'revokeRole').mockResolvedValue(undefined)
      vi.spyOn(rbacService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await rbacService.revokeRole(userId, organizationId, roleId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBeUndefined()
      expect(rbacService['db'].createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'role.revoked'
        })
      )
    })

    it('should handle role revocation when role not assigned', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const roleId = 'role-admin'

      const NotFoundError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'NotFoundError'
        }
      }

      vi.spyOn(rbacService['db'], 'revokeRole').mockRejectedValue(
        new NotFoundError('Role assignment not found')
      )

      const result = await rbacService.revokeRole(userId, organizationId, roleId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Role assignment not found')
      expect(result.code).toBe('REVOKE_ROLE_ERROR')
    })
  })

  describe('getUserPermissions', () => {
    it('should return all user permissions in organization', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'

      const mockRoles = [
        {
          id: 'role-admin',
          name: 'Admin',
          permissions: ['organization.read', 'organization.write', 'members.manage']
        },
        {
          id: 'role-member',
          name: 'Member',
          permissions: ['organization.read', 'projects.read']
        }
      ]

      vi.spyOn(rbacService['db'], 'getUserRoles').mockResolvedValue(mockRoles)

      const result = await rbacService.getUserPermissions(userId, organizationId)

      // Should return unique permissions from all roles
      expect(result.data).toContain('organization.read')
      expect(result.data).toContain('organization.write')
      expect(result.data).toContain('members.manage')
      expect(result.data).toContain('projects.read')
      expect(result.error).toBeUndefined()
    })

    it('should return empty array when user has no roles', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'

      vi.spyOn(rbacService['db'], 'getUserRoles').mockResolvedValue([])

      const result = await rbacService.getUserPermissions(userId, organizationId)

      expect(result.data).toEqual([])
      expect(result.error).toBeUndefined()
    })

    it('should deduplicate permissions from multiple roles', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'

      const mockRoles = [
        {
          id: 'role-admin',
          name: 'Admin',
          permissions: ['organization.read', 'organization.write']
        },
        {
          id: 'role-member',
          name: 'Member',
          permissions: ['organization.read', 'projects.read'] // Duplicate organization.read
        }
      ]

      vi.spyOn(rbacService['db'], 'getUserRoles').mockResolvedValue(mockRoles)

      const result = await rbacService.getUserPermissions(userId, organizationId)

      // Should not have duplicate permissions
      const readPermissions = result.data?.filter(p => p === 'organization.read')
      expect(readPermissions).toHaveLength(1)
      expect(result.data).toHaveLength(3) // organization.read, organization.write, projects.read
    })
  })

  describe('createRole', () => {
    it('should create custom role successfully', async () => {
      const organizationId = 'org-456'
      const roleData = {
        name: 'Custom Role',
        description: 'A custom role for specific permissions',
        permissions: ['projects.read', 'projects.write']
      }

      const createdRole = {
        id: 'role-custom',
        name: roleData.name,
        description: roleData.description,
        organizationId,
        isSystemRole: false,
        permissions: roleData.permissions,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(rbacService['db'], 'createRole').mockResolvedValue(createdRole)
      vi.spyOn(rbacService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await rbacService.createRole(organizationId, roleData)

      expect(result.data).toEqual(createdRole)
      expect(result.error).toBeUndefined()
      expect(rbacService['db'].createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'role.created'
        })
      )
    })

    it('should handle duplicate role names', async () => {
      const organizationId = 'org-456'
      const roleData = {
        name: 'Existing Role',
        description: 'A role that already exists',
        permissions: ['projects.read']
      }

      const DatabaseError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'DatabaseError'
        }
      }

      vi.spyOn(rbacService['db'], 'createRole').mockRejectedValue(
        new DatabaseError('Role name already exists in organization')
      )

      const result = await rbacService.createRole(organizationId, roleData)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Role name already exists in organization')
      expect(result.code).toBe('CREATE_ROLE_ERROR')
    })
  })

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      const roleId = 'role-custom'
      const updateData = {
        name: 'Updated Role Name',
        description: 'Updated description',
        permissions: ['projects.read', 'projects.write', 'projects.delete']
      }

      const updatedRole = {
        id: roleId,
        name: updateData.name,
        description: updateData.description,
        organizationId: 'org-456',
        isSystemRole: false,
        permissions: updateData.permissions,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(rbacService['db'], 'updateRole').mockResolvedValue(updatedRole)
      vi.spyOn(rbacService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await rbacService.updateRole(roleId, updateData)

      expect(result.data).toEqual(updatedRole)
      expect(result.error).toBeUndefined()
      expect(rbacService['db'].createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'role.updated'
        })
      )
    })

    it('should prevent updating system roles', async () => {
      const roleId = 'role-system-admin'
      const updateData = {
        name: 'Hacked Admin Role',
        permissions: ['system.admin']
      }

      const ValidationError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'ValidationError'
        }
      }

      vi.spyOn(rbacService['db'], 'updateRole').mockRejectedValue(
        new ValidationError('Cannot modify system roles')
      )

      const result = await rbacService.updateRole(roleId, updateData)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Cannot modify system roles')
      expect(result.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('deleteRole', () => {
    it('should delete custom role successfully', async () => {
      const roleId = 'role-custom'

      vi.spyOn(rbacService['db'], 'deleteRole').mockResolvedValue(undefined)
      vi.spyOn(rbacService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await rbacService.deleteRole(roleId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBeUndefined()
      expect(rbacService['db'].createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'role.deleted'
        })
      )
    })

    it('should prevent deleting system roles', async () => {
      const roleId = 'role-system-admin'

      const ValidationError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'ValidationError'
        }
      }

      vi.spyOn(rbacService['db'], 'deleteRole').mockRejectedValue(
        new ValidationError('Cannot delete system roles')
      )

      const result = await rbacService.deleteRole(roleId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Cannot delete system roles')
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('should prevent deleting roles that are in use', async () => {
      const roleId = 'role-custom'

      const DatabaseError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'DatabaseError'
        }
      }

      vi.spyOn(rbacService['db'], 'deleteRole').mockRejectedValue(
        new DatabaseError('Cannot delete role that is assigned to users')
      )

      const result = await rbacService.deleteRole(roleId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Cannot delete role that is assigned to users')
      expect(result.code).toBe('DELETE_ROLE_ERROR')
    })
  })
})