/**
 * Unit tests for RBACService - Drizzle Migration
 * Tests permission checking, role management, and access control functionality
 * Requirements: 5.4 - Update tests to use new database layer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RBACService } from '../rbac-service'
import { createMockDatabase } from '../../../__tests__/setup/drizzle-testing-setup'
import type { DrizzleDatabase } from '@/lib/db/connection'

// Mock Drizzle database
const mockDatabase = createMockDatabase()

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getDatabase: () => mockDatabase
}))

// Mock repository factory
vi.mock('@/lib/repositories/factory', () => ({
  getRepositoryFactory: () => ({
    getUserRepository: () => ({
      findById: vi.fn(),
      findByClerkId: vi.fn(),
      findMany: vi.fn()
    }),
    getOrganizationRepository: () => ({
      findById: vi.fn(),
      findMany: vi.fn()
    }),
    getOrganizationMembershipRepository: () => ({
      findByUserId: vi.fn(),
      findByUserAndOrganization: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }),
    getRoleRepository: () => ({
      findById: vi.fn(),
      findByName: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    })
  })
}))

// Mock Drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((column, value) => ({ column, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  or: vi.fn((...conditions) => ({ conditions, type: 'or' })),
  inArray: vi.fn((column, values) => ({ column, values, type: 'inArray' })),
  desc: vi.fn((column) => ({ column, type: 'desc' })),
  asc: vi.fn((column) => ({ column, type: 'asc' }))
}))

// Mock schema imports
vi.mock('@/lib/db/schema/users', () => ({
  users: {
    id: 'id',
    clerkUserId: 'clerkUserId',
    email: 'email'
  },
  organizationMemberships: {
    id: 'id',
    userId: 'userId',
    organizationId: 'organizationId',
    roleId: 'roleId'
  },
  roles: {
    id: 'id',
    name: 'name',
    permissions: 'permissions'
  }
}))
    getRolesByOrganization: vi.fn(),
    createRole: vi.fn(),
    getAllPermissions: vi.fn(),
    createPermission: vi.fn()
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

describe('RBACService', () => {
  let rbacService: RBACService
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000'
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440001'

  beforeEach(() => {
    rbacService = new RBACService()
    vi.clearAllMocks()
  })

  it('should be instantiable', () => {
    expect(rbacService).toBeInstanceOf(RBACService)
  })

  it('should have all required methods', () => {
    expect(typeof rbacService.hasPermission).toBe('function')
    expect(typeof rbacService.hasPermissions).toBe('function')
    expect(typeof rbacService.hasAnyPermission).toBe('function')
    expect(typeof rbacService.hasAllPermissions).toBe('function')
    expect(typeof rbacService.getUserRoles).toBe('function')
    expect(typeof rbacService.getUserPermissions).toBe('function')
    expect(typeof rbacService.assignRole).toBe('function')
    expect(typeof rbacService.revokeRole).toBe('function')
    expect(typeof rbacService.createRole).toBe('function')
    expect(typeof rbacService.updateRole).toBe('function')
    expect(typeof rbacService.deleteRole).toBe('function')
    expect(typeof rbacService.getOrganizationRoles).toBe('function')
    expect(typeof rbacService.getAvailablePermissions).toBe('function')
    expect(typeof rbacService.validateResourceAccess).toBe('function')
    expect(typeof rbacService.getRBACContext).toBe('function')
  })

  describe('permission checking logic', () => {
    it('should handle permission checking with mocked methods', async () => {
      // Mock getUserPermissions to return permissions including the required one
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue([
        'users:read', 'users:write', 'organizations:admin'
      ])

      const result = await rbacService.hasPermission(mockUserId, mockOrgId, 'users:read')
      
      expect(result).toBe(true)
      expect(rbacService.getUserPermissions).toHaveBeenCalledWith(mockUserId, mockOrgId)
    })

    it('should return false when user does not have the required permission', async () => {
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue(['users:read'])

      const result = await rbacService.hasPermission(mockUserId, mockOrgId, 'users:write')
      
      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      vi.spyOn(rbacService, 'getUserPermissions').mockRejectedValue(new Error('Database error'))

      const result = await rbacService.hasPermission(mockUserId, mockOrgId, 'users:read')
      
      expect(result).toBe(false)
    })

    it('should check multiple permissions correctly', async () => {
      vi.spyOn(rbacService, 'getUserPermissions').mockResolvedValue([
        'users:read', 'organizations:admin'
      ])

      const result = await rbacService.hasPermissions(mockUserId, mockOrgId, [
        'users:read', 'users:write', 'organizations:admin'
      ])
      
      expect(result).toEqual({
        'users:read': true,
        'users:write': false,
        'organizations:admin': true
      })
    })

    it('should validate resource access correctly', async () => {
      vi.spyOn(rbacService, 'hasPermission').mockResolvedValue(true)

      const result = await rbacService.validateResourceAccess(
        mockUserId, 
        mockOrgId, 
        'users', 
        'read'
      )
      
      expect(result).toBe(true)
      expect(rbacService.hasPermission).toHaveBeenCalledWith(mockUserId, mockOrgId, 'users:read')
    })
  })
})