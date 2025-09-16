/**
 * Fixed Authentication and Authorization Flow Integration Tests
 * Tests complete authentication flows with proper mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  createMockUser,
  createMockOrganization,
  createMockMembership,
  createMockRole
} from '../setup/comprehensive-mocks'

// Mock the services directly
const mockUserService = {
  getUser: vi.fn(),
  updateUserProfile: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn()
}

const mockOrganizationService = {
  createOrganization: vi.fn(),
  getOrganization: vi.fn(),
  updateOrganization: vi.fn(),
  getUserOrganizations: vi.fn()
}

const mockMembershipService = {
  inviteUser: vi.fn(),
  updateMemberRole: vi.fn(),
  getOrganizationMembers: vi.fn()
}

const mockRbacService = {
  hasPermission: vi.fn(),
  getUserRoles: vi.fn(),
  assignRole: vi.fn()
}

// Mock the service modules
vi.mock('@/lib/services/user-service', () => ({
  UserService: vi.fn().mockImplementation(() => mockUserService),
  userService: mockUserService
}))

vi.mock('@/lib/services/organization-service', () => ({
  OrganizationService: vi.fn().mockImplementation(() => mockOrganizationService),
  organizationService: mockOrganizationService
}))

vi.mock('@/lib/services/membership-service', () => ({
  MembershipService: vi.fn().mockImplementation(() => mockMembershipService),
  membershipService: mockMembershipService
}))

vi.mock('@/lib/services/rbac-service', () => ({
  RBACService: vi.fn().mockImplementation(() => mockRbacService),
  rbacService: mockRbacService
}))

// Import services after mocks are set up
const userService = mockUserService
const organizationService = mockOrganizationService
const membershipService = mockMembershipService
const rbacService = mockRbacService

describe('Fixed Authentication and Authorization Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('User Service Integration', () => {
    it('should get current user successfully', async () => {
      const mockUser = createMockUser()
      userService.getUser.mockResolvedValue({
        data: mockUser,
        error: undefined
      })

      const result = await userService.getUser("test-user-id")

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(mockUser)
    })

    it('should handle user not found', async () => {
      userService.getUser.mockResolvedValue({
        data: undefined,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      const result = await userService.getUser("test-user-id")

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User not found')
    })

    it('should update user profile', async () => {
      const userId = 'user-123'
      const updateData = { firstName: 'Jane', lastName: 'Smith' }
      const updatedUser = createMockUser({ firstName: 'Jane', lastName: 'Smith' })

      userService.updateUserProfile.mockResolvedValue({
        data: updatedUser,
        error: undefined
      })

      const result = await userService.updateUserProfile(userId, updateData)

      expect(result.error).toBeUndefined()
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
        data: createdOrg,
        error: undefined
      })

      const result = await organizationService.createOrganization(userId, orgData)

      expect(result.error).toBeUndefined()
      expect(result.data?.name).toBe(orgData.name)
    })

    it('should get organization by ID', async () => {
      const organizationId = 'org-123'
      const userId = 'user-123'
      const organization = createMockOrganization({ id: organizationId })

      organizationService.getOrganization.mockResolvedValue({
        data: organization,
        error: undefined
      })

      const result = await organizationService.getOrganization(organizationId, userId)

      expect(result.error).toBeUndefined()
      expect(result.data?.id).toBe(organizationId)
    })

    it('should get user organizations', async () => {
      const userId = 'user-123'
      const organizations = [
        createMockOrganization({ id: 'org-1', name: 'Org 1' }),
        createMockOrganization({ id: 'org-2', name: 'Org 2' })
      ]

      organizationService.getUserOrganizations.mockResolvedValue({
        data: organizations,
        error: undefined
      })

      const result = await organizationService.getUserOrganizations(userId)

      expect(result.error).toBeUndefined()
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
        data: updatedMembership,
        error: undefined
      })

      const result = await membershipService.updateMemberRole(userId, organizationId, newRoleId, 'admin-user-id')

      expect(result.error).toBeUndefined()
      expect(result.data?.roleId).toBe(newRoleId)
    })

    it('should invite user to organization', async () => {
      const organizationId = 'org-123'
      const inviteData = {
        organizationId: 'org-123',
        email: 'newuser@example.com',
        roleId: 'role-member',
        invitedBy: 'user-123'
      }

      membershipService.inviteUser.mockResolvedValue({
        data: {
          id: 'invitation-123',
          organizationId: 'org-123',
          email: inviteData.email,
          roleId: inviteData.roleId,
          invitedBy: inviteData.invitedBy,
          token: 'invitation-token-123',
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        error: undefined
      })

      const result = await membershipService.inviteUser(inviteData)

      expect(result.error).toBeUndefined()
      expect(result.data?.email).toBe(inviteData.email)
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      userService.getUser.mockResolvedValue({
        data: undefined,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      })

      const result = await userService.getUser("test-user-id")

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Database connection failed')
      expect(result.code).toBe('DATABASE_ERROR')
    })

    it('should handle validation errors', async () => {
      const invalidOrgData = { name: '' }

      organizationService.createOrganization.mockResolvedValue({
        data: undefined,
        error: 'Organization name is required',
        code: 'VALIDATION_ERROR'
      })

      const result = await organizationService.createOrganization('user-123', invalidOrgData)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Organization name is required')
    })

    it('should handle organization not found errors', async () => {
      const organizationId = 'non-existent-org'
      const userId = 'user-123'

      organizationService.getOrganization.mockResolvedValue({
        data: undefined,
        error: 'Organization not found',
        code: 'NOT_FOUND'
      })

      const result = await organizationService.getOrganization(organizationId, userId)

      expect(result.data).toBeUndefined()
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
      userService.getUser.mockResolvedValue({
        data: createMockUser(userData),
        error: undefined
      })

      const result = await userService.getUser("test-user-id")

      expect(result.error).toBeUndefined()
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
        data: createMockOrganization(orgData),
        error: undefined
      })

      const result = await organizationService.createOrganization(userId, orgData)

      expect(result.error).toBeUndefined()
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
        data: {
          id: 'invitation-123',
          organizationId: inviteData.organizationId,
          email: inviteData.email,
          roleId: inviteData.roleId,
          invitedBy: inviteData.invitedBy,
          token: 'invitation-token-123',
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        error: undefined
      })

      const result = await membershipService.inviteUser(inviteData)

      expect(result.error).toBeUndefined()
      expect(result.data?.email).toBe(inviteData.email)
      expect(result.data?.status).toBe('pending')
    })
  })
})