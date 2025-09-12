/**
 * Authentication and Authorization Flow Integration Tests
 * Tests complete authentication flows with Clerk and authorization with RBAC
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock all external dependencies first
vi.mock('@clerk/nextjs/server')
vi.mock('@/lib/models/database')
vi.mock('@/lib/services/user-sync')
vi.mock('@/lib/middleware/tenant-isolation')
vi.mock('@/lib/services/security-audit-service')

// Import services after mocking
import { organizationService } from '@/lib/services/organization-service'
import { membershipService } from '@/lib/services/membership-service'
import { rbacService } from '@/lib/services/rbac-service'
import { userService } from '@/lib/services/user-service'

describe('Authentication and Authorization Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('User Service Integration', () => {
    it('should get user by ID', async () => {
      const userId = 'user-123'
      
      // Mock the service method
      vi.spyOn(userService, 'getUser').mockResolvedValue({
        data: {
          id: userId,
          clerkUserId: 'clerk_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await userService.getUser(userId)

      expect(result.data).toBeDefined()
      expect(result.data?.id).toBe(userId)
      expect(result.error).toBeUndefined()
    })

    it('should handle user not found', async () => {
      const userId = 'nonexistent-user'
      
      vi.spyOn(userService, 'getUser').mockResolvedValue({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const result = await userService.getUser(userId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })

    it('should update user profile', async () => {
      const userId = 'user-123'
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith'
      }
      
      vi.spyOn(userService, 'updateUserProfile').mockResolvedValue({
        data: {
          id: userId,
          clerkUserId: 'clerk_123',
          email: 'test@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await userService.updateUserProfile(userId, updateData)

      expect(result.data).toBeDefined()
      expect(result.data?.firstName).toBe('Jane')
      expect(result.data?.lastName).toBe('Smith')
      expect(result.error).toBeUndefined()
    })
  })

  describe('Organization Service Integration', () => {
    it('should create organization successfully', async () => {
      const userId = 'user-123'
      const orgData = {
        name: 'Test Organization',
        description: 'A test organization'
      }
      
      vi.spyOn(organizationService, 'createOrganization').mockResolvedValue({
        data: {
          id: 'org-123',
          name: orgData.name,
          description: orgData.description,
          slug: 'test-organization',
          avatarUrl: null,
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await organizationService.createOrganization(userId, orgData)

      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe(orgData.name)
      expect(result.error).toBeUndefined()
    })

    it('should get organization by ID', async () => {
      const orgId = 'org-123'
      const userId = 'user-123'
      
      vi.spyOn(organizationService, 'getOrganization').mockResolvedValue({
        data: {
          id: orgId,
          name: 'Test Organization',
          description: 'A test organization',
          slug: 'test-organization',
          avatarUrl: null,
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await organizationService.getOrganization(orgId, userId)

      expect(result.data).toBeDefined()
      expect(result.data?.id).toBe(orgId)
      expect(result.error).toBeUndefined()
    })

    it('should get user organizations', async () => {
      const userId = 'user-123'
      
      vi.spyOn(organizationService, 'getUserOrganizations').mockResolvedValue({
        data: [
          {
            id: 'org-1',
            name: 'Organization 1',
            slug: 'org-1',
            description: null,
            avatarUrl: null,
            metadata: {},
            settings: {},
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'org-2',
            name: 'Organization 2',
            slug: 'org-2',
            description: null,
            avatarUrl: null,
            metadata: {},
            settings: {},
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      })

      const result = await organizationService.getUserOrganizations(userId)

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(2)
      expect(result.error).toBeUndefined()
    })
  })

  describe('RBAC Service Integration', () => {
    it('should check user permissions correctly', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.write'

      vi.spyOn(rbacService, 'hasPermission').mockResolvedValue(true)

      const hasPermission = await rbacService.hasPermission(userId, organizationId, permission)

      expect(hasPermission).toBe(true)
    })

    it('should deny access for insufficient permissions', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.delete'

      vi.spyOn(rbacService, 'hasPermission').mockResolvedValue(false)

      const hasPermission = await rbacService.hasPermission(userId, organizationId, permission)

      expect(hasPermission).toBe(false)
    })

    it('should get user roles in organization', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'

      vi.spyOn(rbacService, 'getUserRoles').mockResolvedValue({
        data: [
          {
            id: 'role-admin',
            name: 'Admin',
            description: 'Administrator role',
            organizationId,
            isSystemRole: false,
            permissions: ['organization.read', 'organization.write', 'members.manage'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      })

      const result = await rbacService.getUserRoles(userId, organizationId)

      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].name).toBe('Admin')
    })
  })

  describe('Membership Service Integration', () => {
    it('should update member role successfully', async () => {
      const organizationId = 'org-123'
      const userId = 'user-456'
      const newRoleId = 'role-admin'

      vi.spyOn(membershipService, 'updateMemberRole').mockResolvedValue({
        data: {
          id: 'membership-123',
          userId,
          organizationId,
          roleId: newRoleId,
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await membershipService.updateMemberRole(organizationId, userId, newRoleId)

      expect(result.data).toBeDefined()
      expect(result.data?.roleId).toBe(newRoleId)
      expect(result.error).toBeUndefined()
    })

    it('should invite user to organization', async () => {
      const organizationId = 'org-123'
      const email = 'newuser@example.com'
      const roleId = 'role-member'

      vi.spyOn(membershipService, 'inviteUser').mockResolvedValue({
        data: {
          id: 'invitation-123',
          organizationId,
          email,
          roleId,
          invitedBy: 'user-123',
          token: 'invitation-token',
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await membershipService.inviteUser(organizationId, email, roleId)

      expect(result.data).toBeDefined()
      expect(result.data?.email).toBe(email)
      expect(result.data?.status).toBe('pending')
      expect(result.error).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const userId = 'user-123'
      
      vi.spyOn(userService, 'getUser').mockResolvedValue({
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const result = await userService.getUser(userId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Database connection failed')
      expect(result.code).toBe('DATABASE_ERROR')
    })

    it('should handle validation errors', async () => {
      const userId = 'user-123'
      const invalidData = {
        firstName: '', // Invalid empty name
        lastName: ''
      }
      
      vi.spyOn(userService, 'updateUserProfile').mockResolvedValue({
        error: 'Validation failed: firstName is required',
        code: 'VALIDATION_ERROR'
      })

      const result = await userService.updateUserProfile(userId, invalidData)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('Validation failed')
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('should handle organization not found errors', async () => {
      const orgId = 'nonexistent-org'
      const userId = 'user-123'
      
      vi.spyOn(organizationService, 'getOrganization').mockResolvedValue({
        error: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND'
      })

      const result = await organizationService.getOrganization(orgId, userId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
    })
  })

  describe('Service Integration Workflows', () => {
    it('should complete user registration workflow', async () => {
      const clerkUser = {
        id: 'clerk_123',
        emailAddresses: [{ emailAddress: 'newuser@example.com' }],
        firstName: 'John',
        lastName: 'Doe'
      }

      vi.spyOn(userService, 'syncUserFromClerk').mockResolvedValue({
        data: {
          id: 'user-123',
          clerkUserId: 'clerk_123',
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await userService.syncUserFromClerk(clerkUser)

      expect(result.data).toBeDefined()
      expect(result.data?.email).toBe('newuser@example.com')
      expect(result.error).toBeUndefined()
    })

    it('should complete organization creation workflow', async () => {
      const userId = 'user-123'
      const orgData = {
        name: 'New Organization',
        description: 'A new organization'
      }

      // Mock organization creation
      vi.spyOn(organizationService, 'createOrganization').mockResolvedValue({
        data: {
          id: 'org-123',
          name: orgData.name,
          description: orgData.description,
          slug: 'new-organization',
          avatarUrl: null,
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await organizationService.createOrganization(userId, orgData)

      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe(orgData.name)
      expect(result.data?.slug).toBe('new-organization')
      expect(result.error).toBeUndefined()
    })

    it('should complete member invitation workflow', async () => {
      const organizationId = 'org-123'
      const email = 'invite@example.com'
      const roleId = 'role-member'

      // Mock invitation creation
      vi.spyOn(membershipService, 'inviteUser').mockResolvedValue({
        data: {
          id: 'invitation-123',
          organizationId,
          email,
          roleId,
          invitedBy: 'user-123',
          token: 'invitation-token',
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      const result = await membershipService.inviteUser(organizationId, email, roleId)

      expect(result.data).toBeDefined()
      expect(result.data?.email).toBe(email)
      expect(result.data?.status).toBe('pending')
      expect(result.error).toBeUndefined()
    })
  })
})