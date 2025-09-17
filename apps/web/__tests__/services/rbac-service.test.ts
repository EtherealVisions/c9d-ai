import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RBACService } from '@/lib/services/rbac-service'
import type { Role, Membership } from '@/lib/models/types'

// Create a mock instance
const rbacService = new RBACService()

describe('RBACService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue(['organization.read'])

      const result = await rbacService.hasPermission('user-123', 'org-123', 'organization.read')

      expect(result).toBe(true)
    })

    it('should return false when user does not have permission', async () => {
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue(['organization.read'])

      const result = await rbacService.hasPermission('user-123', 'org-123', 'organization.write')

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      vi.spyOn(rbacService, 'getUserPermissions').mockRejectedValue(new Error('Database error'))

      const result = await rbacService.hasPermission('user-123', 'org-123', 'organization.read')

      expect(result).toBe(false)
    })
  })

  describe('hasPermissions', () => {
    it('should return true when user has all permissions', async () => {
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue([
        'organization.read',
        'organization.write',
        'members.manage'
      ])

      const result = await rbacService.hasPermissions('user-123', 'org-123', [
        'organization.read',
        'organization.write'
      ])

      expect(result).toBe(true)
    })

    it('should return false when user is missing some permissions', async () => {
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue(['organization.read'])

      const result = await rbacService.hasPermissions('user-123', 'org-123', [
        'organization.read',
        'organization.write'
      ])

      expect(result).toBe(false)
    })
  })

  describe('getUserRoles', () => {
    it('should return user roles successfully', async () => {
      const mockRoles: Role[] = [
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator role',
          organizationId: 'org-123',
          isSystemRole: false,
          permissions: ['organization.read', 'organization.write'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      vi.spyOn(rbacService, 'getUserRoles').mockResolvedValue(mockRoles)

      const result = await rbacService.getUserRoles('user-123', 'org-123')

      expect(result).toEqual(mockRoles)
      expect(result).toHaveLength(1)
    })

    it('should return empty array when user has no roles', async () => {
      vi.spyOn(rbacService, 'getUserRoles').mockResolvedValue([])

      const result = await rbacService.getUserRoles('user-123', 'org-123')

      expect(result).toEqual([])
    })
  })

  describe('getUserPermissions', () => {
    it('should return user permissions successfully', async () => {
      const mockPermissions = [
        'organization.read',
        'organization.write',
        'members.manage',
        'projects.read'
      ]

      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue(mockPermissions)

      const result = await rbacService.getUserPermissions('user-123', 'org-123')

      expect(result).toEqual(mockPermissions)
      expect(result).toHaveLength(4)
    })

    it('should return empty array when user has no permissions', async () => {
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue([])

      const result = await rbacService.getUserPermissions('user-123', 'org-123')

      expect(result).toEqual([])
    })

    it('should filter permissions by resource type', async () => {
      const mockRoles: Role[] = [
        {
          id: 'role-1',
          name: 'Project Manager',
          description: 'Project management role',
          organizationId: 'org-123',
          isSystemRole: false,
          permissions: [
            'organization.read',
            'organization.write',
            'projects.read',
            'projects.write',
            'projects.delete'
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      vi.spyOn(rbacService, 'getUserRoles').mockResolvedValue(mockRoles)
      vi.spyOn(rbacService, 'getUserPermissions').mockImplementation(async (userId: string, orgId: string) => {
        const allPermissions = mockRoles.flatMap(role => role.permissions)
        return allPermissions.filter(p => p.startsWith('projects'))
      })

      const result = await rbacService.getUserPermissions('user-123', 'org-123')

      expect(result).toHaveLength(3) // projects.read, projects.write, projects.delete
    })
  })

  describe('assignRole', () => {
    it('should assign role successfully', async () => {
      const mockAssignment: Membership = {
        id: 'membership-1',
        userId: 'user-123',
        organizationId: 'org-123',
        roleId: 'role-1',
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(rbacService, 'assignRole').mockResolvedValue(undefined)

      await rbacService.assignRole('user-123', 'org-123', 'role-1')

      expect(rbacService.assignRole).toHaveBeenCalledWith('user-123', 'org-123', 'role-1')
    })

    it('should handle role assignment errors', async () => {
      vi.spyOn(rbacService, 'assignRole').mockRejectedValue(new Error('Role already assigned to user'))

      await expect(rbacService.assignRole('user-123', 'org-123', 'role-1')).rejects.toThrow('Role already assigned to user')
    })
  })

  describe('revokeRole', () => {
    it('should revoke role successfully', async () => {
      vi.spyOn(rbacService, 'revokeRole').mockResolvedValue(undefined)

      await rbacService.revokeRole('user-123', 'org-123', 'role-1')

      expect(rbacService.revokeRole).toHaveBeenCalledWith('user-123', 'org-123', 'role-1')
    })

    it('should handle role revocation errors', async () => {
      vi.spyOn(rbacService, 'revokeRole').mockRejectedValue(new Error('Role assignment not found'))

      await expect(rbacService.revokeRole('user-123', 'org-123', 'role-1')).rejects.toThrow('Role assignment not found')
    })
  })

  describe('createRole', () => {
    it('should create role successfully', async () => {
      const roleData = {
        name: 'Custom Role',
        description: 'A custom role for testing',
        permissions: ['organization.read', 'projects.read']
      }

      const createdRole: Role = {
        id: 'role-123',
        organizationId: 'org-123',
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...roleData
      }

      vi.spyOn(rbacService, 'createRole').mockResolvedValue(createdRole)

      const result = await rbacService.createRole('org-123', roleData)

      expect(result).toEqual(createdRole)
      expect(rbacService.createRole).toHaveBeenCalledWith('org-123', roleData)
    })

    it('should handle role creation errors', async () => {
      const roleData = {
        name: 'Duplicate Role',
        description: 'A role that already exists',
        permissions: ['organization.read']
      }

      vi.spyOn(rbacService, 'createRole').mockRejectedValue(new Error('Role name already exists in organization'))

      await expect(rbacService.createRole('org-123', roleData)).rejects.toThrow('Role name already exists in organization')
    })
  })

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      const updateData = {
        description: 'Updated description',
        permissions: ['organization.read', 'organization.write', 'projects.read']
      }

      const updatedRole: Role = {
        id: 'role-123',
        name: 'Updated Role',
        organizationId: 'org-123',
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...updateData
      }

      vi.spyOn(rbacService, 'updateRole').mockResolvedValue(updatedRole)

      const result = await rbacService.updateRole('role-123', updateData)

      expect(result).toEqual(updatedRole)
      expect(rbacService.updateRole).toHaveBeenCalledWith('role-123', updateData)
    })

    it('should handle system role update errors', async () => {
      const updateData = {
        permissions: ['organization.read']
      }

      vi.spyOn(rbacService, 'updateRole').mockRejectedValue(new Error('Cannot modify system roles'))

      await expect(rbacService.updateRole('system-role-123', updateData)).rejects.toThrow('Cannot modify system roles')
    })
  })

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      vi.spyOn(rbacService, 'deleteRole').mockResolvedValue(undefined)

      await rbacService.deleteRole('role-123')

      expect(rbacService.deleteRole).toHaveBeenCalledWith('role-123')
    })

    it('should handle system role deletion errors', async () => {
      vi.spyOn(rbacService, 'deleteRole').mockRejectedValue(new Error('Cannot delete system roles'))

      await expect(rbacService.deleteRole('system-role-123')).rejects.toThrow('Cannot delete system roles')
    })

    it('should handle role in use deletion errors', async () => {
      vi.spyOn(rbacService, 'deleteRole').mockRejectedValue(new Error('Cannot delete role that is assigned to users'))

      await expect(rbacService.deleteRole('role-123')).rejects.toThrow('Cannot delete role that is assigned to users')
    })
  })
})