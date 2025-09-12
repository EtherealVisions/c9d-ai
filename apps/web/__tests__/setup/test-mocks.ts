/**
 * Common test mocks and utilities
 * Provides standardized mocking for frequently used modules
 */

import { vi } from 'vitest'

// Mock Clerk authentication
export const mockClerkAuth = () => {
  vi.mock('@clerk/nextjs/server', () => ({
    auth: vi.fn(() => ({ userId: 'test-user-id' })),
    currentUser: vi.fn(() => Promise.resolve({
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User'
    }))
  }))
}

// Mock database with proper Supabase client structure
export const mockDatabase = () => {
  const mockSupabaseClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          range: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        range: vi.fn(() => Promise.resolve({ data: [], error: null }))
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
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null }))
    }
  }

  vi.mock('@/lib/models/database', () => ({
    createSupabaseClient: vi.fn(() => mockSupabaseClient),
    createTypedSupabaseClient: vi.fn(() => ({
      setUserContext: vi.fn(),
      clearUserContext: vi.fn(),
      getClient: vi.fn(() => mockSupabaseClient),
      getUser: vi.fn(),
      getUserByClerkId: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      getUserWithMemberships: vi.fn(),
      getUserByEmail: vi.fn(),
      getOrganization: vi.fn(),
      getOrganizationBySlug: vi.fn(),
      createOrganization: vi.fn(),
      updateOrganization: vi.fn(),
      getOrganizationWithMembers: vi.fn(),
      getUserOrganizations: vi.fn(),
      getMembership: vi.fn(),
      createMembership: vi.fn(),
      updateMembership: vi.fn(),
      deleteMembership: vi.fn(),
      getRole: vi.fn(),
      getRolesByOrganization: vi.fn(),
      createRole: vi.fn(),
      getAllPermissions: vi.fn(),
      createPermission: vi.fn(),
      getInvitation: vi.fn(),
      getInvitationByToken: vi.fn(),
      getInvitationByOrgAndEmail: vi.fn(),
      getInvitationsByOrganization: vi.fn(),
      createInvitation: vi.fn(),
      updateInvitation: vi.fn(),
      createAuditLog: vi.fn(),
      getAuditLogs: vi.fn()
    })),
    TypedSupabaseClient: vi.fn(),
    DatabaseError: class DatabaseError extends Error {
      constructor(message: string, public code?: string, public details?: any) {
        super(message)
        this.name = 'DatabaseError'
      }
    },
    NotFoundError: class NotFoundError extends Error {
      constructor(resource: string, id: string) {
        super(`${resource} with id ${id} not found`)
        this.name = 'NotFoundError'
      }
    },
    ValidationError: class ValidationError extends Error {
      constructor(message: string, public details?: any) {
        super(message)
        this.name = 'ValidationError'
      }
    }
  }))
}

// Mock user sync service
export const mockUserSync = () => {
  vi.mock('@/lib/services/user-sync', () => ({
    userSyncService: {
      syncUserFromClerk: vi.fn(),
      ensureUserExists: vi.fn(),
      updateUserFromClerk: vi.fn()
    }
  }))
}

// Mock tenant isolation middleware
export const mockTenantIsolation = () => {
  vi.mock('@/lib/middleware/tenant-isolation', () => ({
    validateTenantAccess: vi.fn(() => Promise.resolve(true)),
    getTenantContext: vi.fn(() => ({ organizationId: 'test-org-id' })),
    setTenantContext: vi.fn()
  }))
}

// Mock security audit service
export const mockSecurityAudit = () => {
  vi.mock('@/lib/services/security-audit-service', () => ({
    securityAuditService: {
      logSecurityEvent: vi.fn(),
      logTenantViolation: vi.fn(),
      logAuthenticationEvent: vi.fn(),
      logDataAccess: vi.fn(),
      detectSuspiciousActivity: vi.fn()
    }
  }))
}

// Mock Next.js navigation
export const mockNextNavigation = () => {
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  }))
}

// Setup all common mocks
export const setupCommonMocks = () => {
  mockClerkAuth()
  mockDatabase()
  mockUserSync()
  mockTenantIsolation()
  mockSecurityAudit()
  mockNextNavigation()
}

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  clerkUserId: 'clerk_123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
  preferences: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

export const createMockOrganization = (overrides = {}) => ({
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'Test organization',
  avatarUrl: null,
  metadata: {},
  settings: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

export const createMockMembership = (overrides = {}) => ({
  id: 'membership-123',
  userId: 'user-123',
  organizationId: 'org-123',
  roleId: 'role-admin',
  status: 'active' as const,
  joinedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

export const createMockRole = (overrides = {}) => ({
  id: 'role-admin',
  name: 'Admin',
  description: 'Administrator role',
  organizationId: 'org-123',
  isSystemRole: false,
  permissions: ['organization.read', 'organization.write'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

export const createMockInvitation = (overrides = {}) => ({
  id: 'invitation-123',
  organizationId: 'org-123',
  email: 'invite@example.com',
  roleId: 'role-member',
  invitedBy: 'user-admin',
  token: 'invitation-token',
  status: 'pending' as const,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})