/**
 * Service Layer Segmentation Integration Tests - Drizzle Migration
 * Tests proper service boundaries, responsibilities, and integration patterns
 * Requirements: 5.4 - Update tests to use new database layer
 * 
 * This test suite validates:
 * - Clear service boundaries and responsibilities
 * - Proper service-to-service communication
 * - Database schema integrity with Drizzle connections
 * - Business logic validation with realistic scenarios
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import {
  createTestDatabase,
  seedTestDatabase,
  cleanTestDatabase,
  createTestDatabaseUtils,
  TestDatabaseUtils
} from '../../../__tests__/setup/drizzle-testing-setup'
import { getRepositoryFactory } from '@/lib/repositories/factory'
import type { User, Organization, Role } from '../../models/types'
import type { DrizzleDatabase } from '@/lib/db/connection'

// Mock services to use repository pattern
vi.mock('../user-service', () => ({
  userService: {
    createUser: vi.fn(),
    getUserById: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn()
  }
}))

vi.mock('../organization-service', () => ({
  organizationService: {
    createOrganization: vi.fn(),
    getOrganizationById: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn()
  }
}))

vi.mock('../rbac-service', () => ({
  rbacService: {
    hasPermission: vi.fn(),
    assignRole: vi.fn(),
    removeRole: vi.fn(),
    getUserRoles: vi.fn()
  }
}))

// Test data cleanup tracking
const testDataCleanup = {
  users: [] as string[],
  organizations: [] as string[],
  memberships: [] as { userId: string; organizationId: string }[],
  roles: [] as string[],
  auditLogs: [] as string[]
}

describe('Service Layer Segmentation Integration Tests - Drizzle Migration', () => {
  let testDb: DrizzleDatabase
  let testUtils: TestDatabaseUtils
  let repositoryFactory: ReturnType<typeof getRepositoryFactory>
  let testUser: User
  let testOrganization: Organization
  let testRole: Role

  beforeAll(async () => {
    // Setup test database with Drizzle
    testDb = createTestDatabase()
    testUtils = createTestDatabaseUtils(testDb)
    repositoryFactory = getRepositoryFactory()
    
    console.log('✅ Drizzle database setup completed')
  })

  beforeEach(async () => {
    // Create test user with realistic data
    const userData = {
      clerkUserId: `test_clerk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: `test.user.${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      preferences: {
        theme: 'light',
        notifications: { email: true, push: false }
      }
    }

    testUser = await db.createUser(userData)
    testDataCleanup.users.push(testUser.id)

    // Create test organization
    const orgData = {
      name: `Test Organization ${Date.now()}`,
      slug: `test-org-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      description: 'Test organization for service layer validation',
      metadata: { testData: true },
      settings: { allowPublicInvites: false }
    }

    testOrganization = await db.createOrganization(orgData)
    testDataCleanup.organizations.push(testOrganization.id)

    // Create test role
    const roleData = {
      name: `Test Role ${Date.now()}`,
      description: 'Test role for service validation',
      organizationId: testOrganization.id,
      isSystemRole: false,
      permissions: ['users:read', 'users:write', 'organizations:read']
    }

    testRole = await db.createRole(roleData)
    testDataCleanup.roles.push(testRole.id)
  })

  afterEach(async () => {
    // Clean up test data in reverse dependency order
    try {
      // Clean up memberships
      for (const membership of testDataCleanup.memberships) {
        await db.deleteMembership(membership.userId, membership.organizationId)
      }
      testDataCleanup.memberships = []

      // Clean up roles
      for (const roleId of testDataCleanup.roles) {
        try {
          const client = db.getClient()
          await client.from('roles').delete().eq('id', roleId)
        } catch (error) {
          console.warn(`Failed to cleanup role ${roleId}:`, error)
        }
      }
      testDataCleanup.roles = []

      // Clean up organizations
      for (const orgId of testDataCleanup.organizations) {
        try {
          const client = db.getClient()
          await client.from('organizations').delete().eq('id', orgId)
        } catch (error) {
          console.warn(`Failed to cleanup organization ${orgId}:`, error)
        }
      }
      testDataCleanup.organizations = []

      // Clean up users
      for (const userId of testDataCleanup.users) {
        try {
          const client = db.getClient()
          await client.from('users').delete().eq('id', userId)
        } catch (error) {
          console.warn(`Failed to cleanup user ${userId}:`, error)
        }
      }
      testDataCleanup.users = []

    } catch (error) {
      console.warn('Test cleanup failed:', error)
    }
  })

  describe('Service Boundary Validation', () => {
    it('should maintain clear boundaries between user and organization services', async () => {
      // User service should handle user-specific operations
      const userResult = await userService.getUser(testUser.id)
      expect(userResult.data).toBeDefined()
      expect(userResult.data?.id).toBe(testUser.id)
      expect(userResult.data?.email).toBe(testUser.email)

      // Organization service should handle organization-specific operations
      const orgResult = await organizationService.getOrganization(testOrganization.id)
      expect(orgResult.data).toBeDefined()
      expect(orgResult.data?.id).toBe(testOrganization.id)
      expect(orgResult.data?.name).toBe(testOrganization.name)

      // Services should not cross boundaries - user service shouldn't handle org data directly
      expect(userResult.data).not.toHaveProperty('organizations')
      expect(orgResult.data).not.toHaveProperty('users')
    })

    it('should properly coordinate between services for complex operations', async () => {
      // Create membership through membership service (proper coordination)
      const membershipData = {
        userId: testUser.id,
        organizationId: testOrganization.id,
        roleId: testRole.id,
        status: 'active' as const,
        joinedAt: new Date()
      }

      const membership = await db.createMembership(membershipData)
      testDataCleanup.memberships.push({ userId: testUser.id, organizationId: testOrganization.id })

      // Verify that services can work together to provide comprehensive data
      const userWithMemberships = await userService.getUserWithMemberships(testUser.id)
      expect(userWithMemberships.data?.memberships).toBeDefined()
      expect(userWithMemberships.data?.memberships.length).toBeGreaterThan(0)

      const orgWithMembers = await organizationService.getOrganizationWithMembers(testOrganization.id)
      expect(orgWithMembers.data?.memberships).toBeDefined()
      expect(orgWithMembers.data?.memberships.length).toBeGreaterThan(0)
    })

    it('should enforce proper service responsibilities for RBAC operations', async () => {
      // Create membership first
      const membershipData = {
        userId: testUser.id,
        organizationId: testOrganization.id,
        roleId: testRole.id,
        status: 'active' as const,
        joinedAt: new Date()
      }

      await db.createMembership(membershipData)
      testDataCleanup.memberships.push({ userId: testUser.id, organizationId: testOrganization.id })

      // RBAC service should handle permission checking
      const hasPermission = await rbacService.hasPermission(
        testUser.id,
        testOrganization.id,
        'users:read'
      )
      expect(hasPermission).toBe(true)

      // RBAC service should handle role management
      const userRoles = await rbacService.getUserRoles(testUser.id, testOrganization.id)
      expect(userRoles).toBeDefined()
      expect(Array.isArray(userRoles)).toBe(true)

      // Security audit service should handle audit logging
      await securityAuditService.logSecurityEvent({
        userId: testUser.id,
        organizationId: testOrganization.id,
        action: 'test.permission.check',
        resourceType: 'permission',
        severity: 'low',
        metadata: { permission: 'users:read', result: hasPermission }
      })

      // Each service should maintain its specific responsibility
      expect(typeof hasPermission).toBe('boolean')
      expect(Array.isArray(userRoles)).toBe(true)
    })
  })

  describe('Database Schema Integrity Validation', () => {
    it('should validate all required tables exist and are accessible', async () => {
      const client = db.getClient()

      // Test each table with actual database operations
      const tableTests = [
        { table: 'users', testQuery: () => client.from('users').select('id').limit(1) },
        { table: 'organizations', testQuery: () => client.from('organizations').select('id').limit(1) },
        { table: 'organization_memberships', testQuery: () => client.from('organization_memberships').select('id').limit(1) },
        { table: 'roles', testQuery: () => client.from('roles').select('id').limit(1) },
        { table: 'permissions', testQuery: () => client.from('permissions').select('id').limit(1) },
        { table: 'invitations', testQuery: () => client.from('invitations').select('id').limit(1) },
        { table: 'audit_logs', testQuery: () => client.from('audit_logs').select('id').limit(1) }
      ]

      for (const test of tableTests) {
        const { error } = await test.testQuery()
        expect(error).toBeNull()
        console.log(`✅ Table ${test.table} is accessible`)
      }
    })

    it('should validate foreign key relationships work correctly', async () => {
      // Create membership to test foreign key relationships
      const membershipData = {
        userId: testUser.id,
        organizationId: testOrganization.id,
        roleId: testRole.id,
        status: 'active' as const,
        joinedAt: new Date()
      }

      const membership = await db.createMembership(membershipData)
      testDataCleanup.memberships.push({ userId: testUser.id, organizationId: testOrganization.id })

      // Verify foreign key relationships are maintained
      expect(membership.userId).toBe(testUser.id)
      expect(membership.organizationId).toBe(testOrganization.id)
      expect(membership.roleId).toBe(testRole.id)

      // Test that related data can be queried through relationships
      const userWithMemberships = await db.getUserWithMemberships(testUser.id)
      expect(userWithMemberships?.memberships).toBeDefined()
      expect(userWithMemberships?.memberships.length).toBeGreaterThan(0)

      const orgWithMembers = await db.getOrganizationWithMembers(testOrganization.id)
      expect(orgWithMembers?.memberships).toBeDefined()
      expect(orgWithMembers?.memberships.length).toBeGreaterThan(0)
    })

    it('should validate data constraints and validation rules', async () => {
      const client = db.getClient()

      // Test unique constraints (email should be unique)
      const duplicateUserData = {
        clerk_user_id: `duplicate_${Date.now()}`,
        email: testUser.email, // Same email as existing user
        first_name: 'Duplicate',
        last_name: 'User',
        preferences: {}
      }

      const { error: duplicateError } = await client
        .from('users')
        .insert(duplicateUserData)

      // Should fail due to unique email constraint
      expect(duplicateError).toBeDefined()
      expect(duplicateError?.code).toBe('23505') // PostgreSQL unique violation

      // Test required field constraints
      const invalidOrgData = {
        // Missing required 'name' field
        slug: `invalid-org-${Date.now()}`,
        metadata: {},
        settings: {}
      }

      const { error: requiredFieldError } = await client
        .from('organizations')
        .insert(invalidOrgData)

      // Should fail due to missing required field
      expect(requiredFieldError).toBeDefined()
    })
  })

  describe('Business Logic Validation with Realistic Scenarios', () => {
    it('should validate complete user onboarding workflow', async () => {
      // Step 1: User profile update after initial creation
      const profileUpdate = {
        firstName: 'Updated',
        lastName: 'Name',
        preferences: {
          theme: 'dark',
          notifications: { email: true, push: true },
          language: 'en'
        }
      }

      const updateResult = await userService.updateUserProfile(testUser.id, profileUpdate)
      expect(updateResult.error).toBeUndefined()
      expect(updateResult.data?.firstName).toBe('Updated')
      expect(updateResult.data?.lastName).toBe('Name')

      // Step 2: Organization creation by user
      const newOrgData = {
        name: `User Created Org ${Date.now()}`,
        description: 'Organization created during onboarding',
        metadata: { createdBy: testUser.id },
        settings: { allowPublicInvites: true }
      }

      const orgResult = await organizationService.createOrganization(testUser.id, newOrgData)
      expect(orgResult.error).toBeUndefined()
      expect(orgResult.data?.name).toBe(newOrgData.name)
      
      if (orgResult.data) {
        testDataCleanup.organizations.push(orgResult.data.id)
      }

      // Step 3: Verify audit trail was created
      const auditLogs = await db.getAuditLogs({
        userId: testUser.id,
        limit: 10
      })
      expect(auditLogs.length).toBeGreaterThan(0)

      // Find the organization creation log
      const orgCreationLog = auditLogs.find(log => 
        log.action === 'organization.created' && 
        log.resourceId === orgResult.data?.id
      )
      expect(orgCreationLog).toBeDefined()
    })

    it('should validate complex permission scenarios with realistic data', async () => {
      // Create membership with specific role
      const membershipData = {
        userId: testUser.id,
        organizationId: testOrganization.id,
        roleId: testRole.id,
        status: 'active' as const,
        joinedAt: new Date()
      }

      await db.createMembership(membershipData)
      testDataCleanup.memberships.push({ userId: testUser.id, organizationId: testOrganization.id })

      // Test permission inheritance and validation
      const permissions = await rbacService.getUserPermissions(testUser.id, testOrganization.id)
      expect(permissions).toContain('users:read')
      expect(permissions).toContain('users:write')
      expect(permissions).toContain('organizations:read')

      // Test complex permission scenarios
      const permissionChecks = await rbacService.hasPermissions(testUser.id, testOrganization.id, [
        'users:read',
        'users:write',
        'users:delete', // Should not have this
        'organizations:read',
        'organizations:admin' // Should not have this
      ])

      expect(permissionChecks['users:read']).toBe(true)
      expect(permissionChecks['users:write']).toBe(true)
      expect(permissionChecks['users:delete']).toBe(false)
      expect(permissionChecks['organizations:read']).toBe(true)
      expect(permissionChecks['organizations:admin']).toBe(false)

      // Test resource access validation
      const canAccessUser = await rbacService.validateResourceAccess(
        testUser.id,
        testOrganization.id,
        'users',
        'read',
        testUser.id
      )
      expect(canAccessUser).toBe(true)

      const canDeleteUser = await rbacService.validateResourceAccess(
        testUser.id,
        testOrganization.id,
        'users',
        'delete',
        testUser.id
      )
      expect(canDeleteUser).toBe(false)
    })

    it('should validate tenant isolation with realistic multi-tenant scenarios', async () => {
      // Create second organization for isolation testing
      const secondOrgData = {
        name: `Isolated Org ${Date.now()}`,
        slug: `isolated-org-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        description: 'Organization for tenant isolation testing',
        metadata: { isolated: true },
        settings: { strict: true }
      }

      const secondOrg = await db.createOrganization(secondOrgData)
      testDataCleanup.organizations.push(secondOrg.id)

      // Create second user
      const secondUserData = {
        clerkUserId: `isolated_clerk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: `isolated.user.${Date.now()}@example.com`,
        firstName: 'Isolated',
        lastName: 'User',
        preferences: {}
      }

      const secondUser = await db.createUser(secondUserData)
      testDataCleanup.users.push(secondUser.id)

      // Create memberships in different organizations
      const membership1 = {
        userId: testUser.id,
        organizationId: testOrganization.id,
        roleId: testRole.id,
        status: 'active' as const,
        joinedAt: new Date()
      }

      const membership2 = {
        userId: secondUser.id,
        organizationId: secondOrg.id,
        roleId: testRole.id, // Same role, different org
        status: 'active' as const,
        joinedAt: new Date()
      }

      await db.createMembership(membership1)
      await db.createMembership(membership2)
      
      testDataCleanup.memberships.push(
        { userId: testUser.id, organizationId: testOrganization.id },
        { userId: secondUser.id, organizationId: secondOrg.id }
      )

      // Test tenant isolation - users should not access other organizations
      const user1OrgAccess = await organizationService.getOrganization(testOrganization.id, testUser.id)
      expect(user1OrgAccess.error).toBeUndefined()
      expect(user1OrgAccess.data?.id).toBe(testOrganization.id)

      const user1IsolationTest = await organizationService.getOrganization(secondOrg.id, testUser.id)
      expect(user1IsolationTest.error).toBeDefined()
      expect(user1IsolationTest.code).toBe('TENANT_ACCESS_DENIED')

      // Test that security audit service logs isolation violations
      const isolationResult = await securityAuditService.validateAndLogTenantAccess(
        testUser.id,
        secondOrg.id,
        'organization.read',
        'organization',
        secondOrg.id,
        [testOrganization.id] // User only has access to first org
      )

      expect(isolationResult).toBe(false)
    })

    it('should validate error handling and recovery scenarios', async () => {
      // Test handling of non-existent resources
      const nonExistentUserResult = await userService.getUser('00000000-0000-0000-0000-000000000000')
      expect(nonExistentUserResult.error).toBeDefined()
      expect(nonExistentUserResult.code).toBe('USER_NOT_FOUND')

      const nonExistentOrgResult = await organizationService.getOrganization('00000000-0000-0000-0000-000000000000')
      expect(nonExistentOrgResult.error).toBeDefined()
      expect(nonExistentOrgResult.code).toBe('ORGANIZATION_NOT_FOUND')

      // Test validation error handling
      const invalidUpdateResult = await userService.updateUserProfile(testUser.id, {
        email: 'invalid-email-format' // Invalid email
      } as any)
      expect(invalidUpdateResult.error).toBeDefined()
      expect(invalidUpdateResult.code).toBe('VALIDATION_ERROR')

      // Test permission denial scenarios
      const unauthorizedPermissionCheck = await rbacService.hasPermission(
        'non-existent-user',
        testOrganization.id,
        'admin:all'
      )
      expect(unauthorizedPermissionCheck).toBe(false)

      // Verify that errors don't break the system state
      const userStillExists = await userService.getUser(testUser.id)
      expect(userStillExists.error).toBeUndefined()
      expect(userStillExists.data?.id).toBe(testUser.id)
    })
  })

  describe('Service Integration Patterns', () => {
    it('should demonstrate proper service composition for complex workflows', async () => {
      // Complex workflow: User joins organization, gets role, performs actions
      
      // Step 1: Create membership
      const membershipData = {
        userId: testUser.id,
        organizationId: testOrganization.id,
        roleId: testRole.id,
        status: 'active' as const,
        joinedAt: new Date()
      }

      await db.createMembership(membershipData)
      testDataCleanup.memberships.push({ userId: testUser.id, organizationId: testOrganization.id })

      // Step 2: Verify permissions are available
      const hasReadPermission = await rbacService.hasPermission(
        testUser.id,
        testOrganization.id,
        'users:read'
      )
      expect(hasReadPermission).toBe(true)

      // Step 3: Perform authorized action (update organization)
      const orgUpdateResult = await organizationService.updateOrganization(
        testOrganization.id,
        testUser.id,
        {
          description: 'Updated by user with proper permissions'
        }
      )
      expect(orgUpdateResult.error).toBeUndefined()
      expect(orgUpdateResult.data?.description).toBe('Updated by user with proper permissions')

      // Step 4: Verify audit trail
      const auditLogs = await db.getAuditLogs({
        userId: testUser.id,
        organizationId: testOrganization.id,
        limit: 5
      })

      const updateLog = auditLogs.find(log => 
        log.action === 'organization.updated' && 
        log.resourceId === testOrganization.id
      )
      expect(updateLog).toBeDefined()
      expect(updateLog?.metadata).toHaveProperty('updatedFields')

      // Step 5: Test that services maintain consistency
      const updatedOrg = await organizationService.getOrganization(testOrganization.id, testUser.id)
      expect(updatedOrg.data?.description).toBe('Updated by user with proper permissions')
    })

    it('should validate service error propagation and handling', async () => {
      // Test that service errors are properly propagated and handled
      
      // Attempt to update non-existent user
      const invalidUserUpdate = await userService.updateUserProfile(
        '00000000-0000-0000-0000-000000000000',
        { firstName: 'Test' }
      )
      expect(invalidUserUpdate.error).toBeDefined()
      expect(invalidUserUpdate.code).toBe('USER_NOT_FOUND')

      // Attempt unauthorized organization access
      const unauthorizedOrgAccess = await organizationService.updateOrganization(
        testOrganization.id,
        'non-existent-user',
        { name: 'Unauthorized Update' }
      )
      expect(unauthorizedOrgAccess.error).toBeDefined()
      expect(['TENANT_ACCESS_DENIED', 'UPDATE_ORGANIZATION_ERROR']).toContain(unauthorizedOrgAccess.code)

      // Verify that failed operations don't affect system state
      const orgStillIntact = await organizationService.getOrganization(testOrganization.id)
      expect(orgStillIntact.data?.name).toBe(testOrganization.name)
      expect(orgStillIntact.data?.name).not.toBe('Unauthorized Update')
    })
  })
})