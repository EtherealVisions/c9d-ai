/**
 * Mock implementation of the database module for testing
 */

import { vi } from 'vitest'

// Mock the TypedSupabaseClient class
export class TypedSupabaseClient {
  private mockClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
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

  constructor(config: any) {
    // Mock constructor
  }

  setUserContext = vi.fn()
  clearUserContext = vi.fn()
  getClient = vi.fn(() => this.mockClient)

  // User operations
  getUser = vi.fn()
  getUserByClerkId = vi.fn()
  createUser = vi.fn()
  updateUser = vi.fn()
  getUserWithMemberships = vi.fn()
  getUserByEmail = vi.fn()

  // Organization operations
  getOrganization = vi.fn()
  getOrganizationBySlug = vi.fn()
  createOrganization = vi.fn()
  updateOrganization = vi.fn()
  getOrganizationWithMembers = vi.fn()
  getUserOrganizations = vi.fn()

  // Membership operations
  getMembership = vi.fn()
  createMembership = vi.fn()
  updateMembership = vi.fn()
  deleteMembership = vi.fn()

  // Role operations
  getRole = vi.fn()
  getRolesByOrganization = vi.fn()
  createRole = vi.fn()

  // Permission operations
  getAllPermissions = vi.fn()
  createPermission = vi.fn()

  // Invitation operations
  getInvitation = vi.fn()
  getInvitationByToken = vi.fn()
  getInvitationByOrgAndEmail = vi.fn()
  getInvitationsByOrganization = vi.fn()
  createInvitation = vi.fn()
  updateInvitation = vi.fn()

  // Audit log operations
  createAuditLog = vi.fn()
  getAuditLogs = vi.fn()
}

// Mock the factory function
export const createTypedSupabaseClient = vi.fn(() => new TypedSupabaseClient({}))

// Mock the validation function
export const validateDatabaseSchema = vi.fn(() => Promise.resolve({
  tables: {
    users: true,
    organizations: true,
    organization_memberships: true,
    roles: true,
    permissions: true,
    invitations: true,
    audit_logs: true
  },
  permissions: true,
  systemRoles: true
}))

// Mock error classes
export class DatabaseError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class NotFoundError extends DatabaseError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

// Mock the createSupabaseClient function that some tests expect
export const createSupabaseClient = vi.fn(() => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
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
}))