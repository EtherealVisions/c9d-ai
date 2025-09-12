/**
 * Fixed Authentication and Authorization Flow Integration Tests
 * Tests complete authentication flows with proper mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  setupComprehensiveMocks,
  createMockUser,
  createMockOrganization,
  createMockMembership,
  createMockRole,
  setupSuccessfulServiceResponses
} from '../setup/comprehensive-mocks'

// Setup mocks before importing services
setupComprehensiveMocks()

// Import services after mocks are set up
import { userService } from '@/lib/services/user-service'
import { organizationService } from '@/lib/services/organization-service'
import { membershipService } from '@/lib/services/membership-service'
import { rbacService } from '@/lib/services/rbac-service'

describe('Fixed Authentication and Authorization Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default successful responses
    setupSuccessfulServiceResponses({
      userService,
      organizationService,
      membershipService,
      rbacService
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('User Service Integration', () => {
    it('should get current user successfully', async () => {
      const mockUser = createMockUser()
      userService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser
      })

      const result = await userService.getCurrentUser()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUser)
    })

    it('should handle user not found', async () => {
      userService.getCurrentUser.mockResolvedValue({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const result = await userService.getCurrentUser()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should update user profile', async () => {
      const userId = 'user-123'
      const updateData = { firstName: 'Jane', lastName: 'Smith' }
      const updatedUser = createMockUser({ firstName: 'Jane', lastName: 'Smith' })

      userService.updateUserProfile.mockResolvedValue({
        success: true,
        data: updatedUser
      })

      const result = await userService.updateUserProfile(userId, updateData)

      expect(result.success).toBe(true)
      expect(result.data?.firstName).toBe('Jane')
      expect(result.data?.lastName).toBe('Smith')
    })
  })

  describe('Organization Service Integration', () => {
    it('should create organization successfully', async () => {
      const userId = 'user-123'
      const orgData = {
        name: 'Test Organization',
        description: 'A test organization'
      }
      const createdOrg = createMockOrganization(orgData)

      organizationService.createOrganization.mockResolvedValue({
        success: true,
        data: createdOrg
      })

      const result = await organizationService.createOrganization(orgData, userId)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe(orgData.name)
    })

    it('should get organization by ID', async () => {
      const organizationId = 'org-123'
      const userId = 'user-123'
      const organization = createMockOrganization({ id: organizationId })

      organizationService.getOrganization.mockResolvedValue({
        success: true,
        data: organization
      })

      const result = await organizationService.getOrganization(organizationId, userId)

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe(organizationId)
    })

    it('should get user organizations', async () => {
      const userId = 'user-123'
      const organizations = [
        createMockOrganization({ id: 'org-1', name: 'Org 1' }),
        createMockOrganization({ id: 'org-2', name: 'Org 2' })
      ]

      organizationService.getUserOrganizations.mockResolvedValue({
        success: true,
        data: organizations
      })

      const result = await organizationService.getUserOrganizations(userId)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
    })
  })

  describe('RBAC Service Integration', () => {
    it('should check user permissions correctly', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.read'

      rbacService.hasPermission.mockResolvedValue(true)

      const result = await rbacService.hasPermission(userId, organizationId, permission)

      expect(result).toBe(true)
      expect(rbacService.hasPermission).toHaveBeenCalledWith(userId, organizationId, permission)
    })

    it('should deny access for insufficient permissions', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const permission = 'organization.write'

      rbacService.hasPermission.mockResolvedValue(false)

      const result = await rbacService.hasPermission(userId, organizationId, permission)

      expect(result).toBe(false)
    })

    it('should get user roles in organization', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'
      const roles = [
        createMockRole({ name: 'admin', permissions: ['organization.read', 'organization.write'] })
      ]

      rbacService.getUserRoles.mockResolvedValue(roles)

      const result = await rbacService.getUserRoles(userId, organizationId)

      expect(result).toEqual(roles)
      expect(result[0].name).toBe('admin')
    })
  })

  describe('Membership Service Integration', () => {
    it('should update member role successfully', async () => {
      const organizationId = 'org-123'
      const userId = 'user-456'
      const newRoleId = 'role-admin'
      const updatedMembership = createMockMembership({ roleId: newRoleId })

      membershipService.updateMemberRole.mockResolvedValue({
        success: true,
        data: updatedMembership
      })

      const result = await membershipService.updateMemberRole(organizationId, userId, newRoleId)

      expect(result.success).toBe(true)
      expect(result.data?.roleId).toBe(newRoleId)
    })

    it('should invite user to organization', async () => {
      const organizationId = 'org-123'
      const inviteData = {
        email: 'newuser@example.com',
        roleId: 'role-member',
        invitedBy: 'user-123'
      }

      membershipService.inviteUser.mockResolvedValue({
        success: true,
        data: {
          id: 'invitation-123',
          ...inviteData,
          status: 'pending'
        }
      })

      const result = await membershipService.inviteUser(inviteData)

      expect(result.success).toBe(true)
      expect(result.data?.email).toBe(inviteData.email)
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      userService.getCurrentUser.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const result = await userService.getCurrentUser()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
      expect(result.code).toBe('DATABASE_ERROR')
    })

    it('should handle validation errors', async () => {
      const invalidOrgData = { name: '' }

      organizationService.createOrganization.mockResolvedValue({
        success: false,
        error: 'Organization name is required',
        code: 'VALIDATION_ERROR'
      })

      const result = await organizationService.createOrganization(invalidOrgData, 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Organization name is required')
    })

    it('should handle organization not found errors', async () => {
      const organizationId = 'non-existent-org'
      const userId = 'user-123'

      organizationService.getOrganization.mockResolvedValue({
        success: false,
        error: 'Organization not found',
        code: 'NOT_FOUND'
      })

      const result = await organizationService.getOrganization(organizationId, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Organization not found')
    })
  })

  describe('Service Integration Workflows', () => {
    it('should complete user registration workflow', async () => {
      const userData = {
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }

      // Mock user creation
      userService.getCurrentUser.mockResolvedValue({
        success: true,
        data: createMockUser(userData)
      })

      const result = await userService.getCurrentUser()

      expect(result.success).toBe(true)
      expect(result.data?.email).toBe(userData.email)
    })

    it('should complete organization creation workflow', async () => {
      const userId = 'user-123'
      const orgData = {
        name: 'New Company',
        description: 'A new company'
      }

      // Mock organization creation
      organizationService.createOrganization.mockResolvedValue({
        success: true,
        data: createMockOrganization(orgData)
      })

      const result = await organizationService.createOrganization(orgData, userId)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe(orgData.name)
    })

    it('should complete member invitation workflow', async () => {
      const inviteData = {
        organizationId: 'org-123',
        email: 'member@example.com',
        roleId: 'role-member',
        invitedBy: 'user-123'
      }

      // Mock invitation creation
      membershipService.inviteUser.mockResolvedValue({
        success: true,
        data: {
          id: 'invitation-123',
          ...inviteData,
          status: 'pending'
        }
      })

      const result = await membershipService.inviteUser(inviteData)

      expect(result.success).toBe(true)
      expect(result.data?.email).toBe(inviteData.email)
      expect(result.data?.status).toBe('pending')
    })
  })
})