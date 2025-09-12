/**
 * Comprehensive Mock Setup for Account Management Tests
 * Provides consistent mocking across all test suites
 */

import { vi } from 'vitest'

// Mock error classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Create comprehensive Supabase mock
export function createMockSupabaseClient() {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn()
  }

  return {
    from: vi.fn(() => mockChain),
    rpc: vi.fn(),
    // Add direct access to chain methods for easier mocking
    ...mockChain
  }
}

// Mock Clerk authentication
export function createMockClerkAuth() {
  return {
    auth: vi.fn(),
    currentUser: vi.fn(),
    clerkClient: {
      users: {
        getUser: vi.fn(),
        updateUser: vi.fn()
      }
    }
  }
}

// Mock RBAC service with proper database interface
export function createMockRBACService() {
  const mockDb = {
    getUserMembership: vi.fn(),
    getRole: vi.fn(),
    getUserRoles: vi.fn(),
    assignRole: vi.fn(),
    revokeRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    createAuditLog: vi.fn()
  }

  return {
    hasPermission: vi.fn(),
    getUserRoles: vi.fn(),
    getUserPermissions: vi.fn(),
    assignRole: vi.fn(),
    revokeRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    db: mockDb
  }
}

// Mock Organization service
export function createMockOrganizationService() {
  const mockDb = {
    createOrganization: vi.fn(),
    getOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
    getUserOrganizations: vi.fn(),
    createAuditLog: vi.fn()
  }

  return {
    createOrganization: vi.fn(),
    getOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
    getUserOrganizations: vi.fn(),
    db: mockDb
  }
}

// Mock Membership service
export function createMockMembershipService() {
  const mockDb = {
    inviteUser: vi.fn(),
    acceptInvitation: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    getOrganizationMembers: vi.fn(),
    createAuditLog: vi.fn()
  }

  return {
    inviteUser: vi.fn(),
    acceptInvitation: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    getOrganizationMembers: vi.fn(),
    db: mockDb
  }
}

// Mock User service
export function createMockUserService() {
  const mockDb = {
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    createAuditLog: vi.fn()
  }

  return {
    getCurrentUser: vi.fn(),
    getUserById: vi.fn(),
    updateUserProfile: vi.fn(),
    deleteUser: vi.fn(),
    db: mockDb
  }
}

// Setup comprehensive mocks for all services
export function setupComprehensiveMocks() {
  // Mock database module
  vi.mock('@/lib/models/database', () => ({
    createTypedSupabaseClient: vi.fn(() => createMockSupabaseClient()),
    ValidationError,
    NotFoundError,
    DatabaseError
  }))

  // Mock Clerk
  vi.mock('@clerk/nextjs/server', () => createMockClerkAuth())

  // Mock services
  vi.mock('@/lib/services/rbac-service', () => ({
    rbacService: createMockRBACService()
  }))

  vi.mock('@/lib/services/organization-service', () => ({
    organizationService: createMockOrganizationService()
  }))

  vi.mock('@/lib/services/membership-service', () => ({
    membershipService: createMockMembershipService()
  }))

  vi.mock('@/lib/services/user-service', () => ({
    userService: createMockUserService()
  }))
}

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  clerkUserId: 'clerk-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  avatarUrl: 'https://example.com/avatar.jpg',
  preferences: {},
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides
})

export const createMockOrganization = (overrides = {}) => ({
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-organization',
  description: 'A test organization',
  settings: {},
  metadata: {},
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides
})

export const createMockMembership = (overrides = {}) => ({
  id: 'membership-123',
  userId: 'user-123',
  organizationId: 'org-123',
  roleId: 'role-member',
  status: 'active',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides
})

export const createMockRole = (overrides = {}) => ({
  id: 'role-123',
  name: 'member',
  description: 'Standard member role',
  permissions: ['organization.read'],
  isSystem: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides
})

export const createMockInvitation = (overrides = {}) => ({
  id: 'invitation-123',
  organizationId: 'org-123',
  email: 'newuser@example.com',
  roleId: 'role-member',
  status: 'pending',
  invitedBy: 'user-123',
  token: 'invitation-token',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

// Helper to setup successful service responses
export function setupSuccessfulServiceResponses(mocks: any) {
  // User service responses
  mocks.userService.getCurrentUser.mockResolvedValue({
    success: true,
    data: createMockUser()
  })

  // Organization service responses
  mocks.organizationService.createOrganization.mockResolvedValue({
    success: true,
    data: createMockOrganization()
  })

  mocks.organizationService.getOrganization.mockResolvedValue({
    success: true,
    data: createMockOrganization()
  })

  mocks.organizationService.getUserOrganizations.mockResolvedValue({
    success: true,
    data: [createMockOrganization()]
  })

  // Membership service responses
  mocks.membershipService.inviteUser.mockResolvedValue({
    success: true,
    data: createMockInvitation()
  })

  mocks.membershipService.updateMemberRole.mockResolvedValue({
    success: true,
    data: createMockMembership()
  })

  // RBAC service responses
  mocks.rbacService.hasPermission.mockResolvedValue(true)
  mocks.rbacService.getUserRoles.mockResolvedValue([createMockRole()])
  mocks.rbacService.getUserPermissions.mockResolvedValue(['organization.read'])
}

// Helper to setup error responses
export function setupErrorServiceResponses(mocks: any, errorType: string = 'generic') {
  const errorResponse = {
    success: false,
    error: `Test ${errorType} error`,
    code: `TEST_${errorType.toUpperCase()}_ERROR`
  }

  // Apply error responses to all services
  Object.values(mocks).forEach((service: any) => {
    if (typeof service === 'object' && service !== null) {
      Object.keys(service).forEach(method => {
        if (typeof service[method] === 'function' && method !== 'db') {
          service[method].mockResolvedValue(errorResponse)
        }
      })
    }
  })
}