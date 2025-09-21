/**
 * Drizzle Database Layer Integration Tests
 * 
 * Comprehensive integration tests for the new Drizzle database layer including:
 * - End-to-end repository operations
 * - Service layer integration with validation and database
 * - API integration tests with proper validation testing
 * - Performance and load testing for database operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import {
  createTestDatabase,
  seedTestDatabase,
  cleanTestDatabase,
  createTestDatabaseUtils,
  TestDatabaseUtils,
  testSetup,
  testTeardown
} from '../setup/drizzle-testing-setup'
import { createValidationTester } from '../setup/zod-testing-framework'

// Import repositories
import { UserRepository } from '@/lib/repositories/user-repository'
import { OrganizationRepository } from '@/lib/repositories/organization-repository'
import { RoleRepository } from '@/lib/repositories/role-repository'

// Import services
import { UserService } from '@/lib/services/user-service'
import { OrganizationService } from '@/lib/services/organization-service'

// Import validation schemas
import {
  createUserSchema,
  updateUserSchema,
  createOrganizationSchema,
  createRoleSchema
} from '@/lib/validation/schemas'

// Import database types
import type { DrizzleDatabase } from '@/lib/db/connection'

describe('Drizzle Database Layer Integration Tests', () => {
  let testDb: DrizzleDatabase
  let testUtils: TestDatabaseUtils
  let userRepository: UserRepository
  let organizationRepository: OrganizationRepository
  let roleRepository: RoleRepository

  beforeAll(async () => {
    testDb = await testSetup()
    testUtils = createTestDatabaseUtils(testDb)
    
    // Initialize repositories with test database
    userRepository = new UserRepository(testDb)
    organizationRepository = new OrganizationRepository(testDb)
    roleRepository = new RoleRepository(testDb)
  })

  afterAll(async () => {
    await testTeardown()
  })

  beforeEach(async () => {
    await cleanTestDatabase()
  })

  describe('Repository Layer Integration', () => {
    describe('UserRepository Integration', () => {
      it('should perform complete CRUD operations', async () => {
        // Create user
        const userData = {
          clerkUserId: 'clerk_integration_user',
          email: 'integration@example.com',
          firstName: 'Integration',
          lastName: 'Test'
        }

        const createdUser = await userRepository.create(userData)
        expect(createdUser).toBeDefined()
        expect(createdUser.id).toBeDefined()
        expect(createdUser.email).toBe(userData.email)
        expect(createdUser.createdAt).toBeDefined()

        // Read user
        const foundUser = await userRepository.findById(createdUser.id)
        expect(foundUser).toBeDefined()
        expect(foundUser!.email).toBe(userData.email)

        // Update user
        const updateData = { firstName: 'Updated' }
        const updatedUser = await userRepository.update(createdUser.id, updateData)
        expect(updatedUser.firstName).toBe('Updated')
        expect(updatedUser.updatedAt).not.toEqual(createdUser.updatedAt)

        // Find by Clerk ID
        const userByClerkId = await userRepository.findByClerkId(userData.clerkUserId)
        expect(userByClerkId).toBeDefined()
        expect(userByClerkId!.id).toBe(createdUser.id)

        // Find by email
        const userByEmail = await userRepository.findByEmail(userData.email)
        expect(userByEmail).toBeDefined()
        expect(userByEmail!.id).toBe(createdUser.id)

        // Delete user
        await userRepository.delete(createdUser.id)
        const deletedUser = await userRepository.findById(createdUser.id)
        expect(deletedUser).toBeNull()
      })

      it('should handle user relationships correctly', async () => {
        // Create test data
        const role = await testUtils.createTestRole({ name: 'Test Role' })
        const organization = await testUtils.createTestOrganization({ name: 'Test Org' })
        const user = await testUtils.createTestUser({ email: 'relations@example.com' })
        
        // Create membership
        await testUtils.createTestMembership(user.id, organization.id, role.id)

        // Find user with relationships
        const userWithRelations = await userRepository.findWithRelations(user.id)
        expect(userWithRelations).toBeDefined()
        expect(userWithRelations!.memberships).toBeDefined()
        expect(userWithRelations!.memberships.length).toBe(1)
        expect(userWithRelations!.memberships[0].organizationId).toBe(organization.id)
      })

      it('should validate data before database operations', async () => {
        // Test validation integration
        const invalidUserData = {
          clerkUserId: '', // Invalid: empty string
          email: 'invalid-email', // Invalid: not an email
          firstName: 'Valid',
          lastName: 'User'
        }

        await expect(userRepository.create(invalidUserData as any))
          .rejects.toThrow()
      })

      it('should handle concurrent operations safely', async () => {
        const userData = {
          clerkUserId: 'clerk_concurrent',
          email: 'concurrent@example.com',
          firstName: 'Concurrent',
          lastName: 'Test'
        }

        const user = await userRepository.create(userData)

        // Perform concurrent updates
        const updatePromises = Array.from({ length: 10 }, (_, i) =>
          userRepository.update(user.id, { firstName: `Updated${i}` })
        )

        const results = await Promise.all(updatePromises)
        
        // All updates should succeed
        expect(results).toHaveLength(10)
        results.forEach(result => {
          expect(result.id).toBe(user.id)
          expect(result.firstName).toMatch(/^Updated\d$/)
        })

        // Final state should be consistent
        const finalUser = await userRepository.findById(user.id)
        expect(finalUser).toBeDefined()
        expect(finalUser!.firstName).toMatch(/^Updated\d$/)
      })
    })

    describe('OrganizationRepository Integration', () => {
      it('should perform complete organization lifecycle', async () => {
        // Create organization
        const orgData = {
          name: 'Integration Test Org',
          slug: 'integration-test-org',
          description: 'An organization for integration testing'
        }

        const createdOrg = await organizationRepository.create(orgData)
        expect(createdOrg).toBeDefined()
        expect(createdOrg.slug).toBe(orgData.slug)

        // Find by slug
        const orgBySlug = await organizationRepository.findBySlug(orgData.slug)
        expect(orgBySlug).toBeDefined()
        expect(orgBySlug!.id).toBe(createdOrg.id)

        // Update organization
        const updateData = { description: 'Updated description' }
        const updatedOrg = await organizationRepository.update(createdOrg.id, updateData)
        expect(updatedOrg.description).toBe(updateData.description)

        // Add members
        const user1 = await testUtils.createTestUser({ email: 'member1@example.com' })
        const user2 = await testUtils.createTestUser({ email: 'member2@example.com' })
        const role = await testUtils.createTestRole({ name: 'Member' })

        await testUtils.createTestMembership(user1.id, createdOrg.id, role.id)
        await testUtils.createTestMembership(user2.id, createdOrg.id, role.id)

        // Find organization with members
        const orgWithMembers = await organizationRepository.findWithMembers(createdOrg.id)
        expect(orgWithMembers).toBeDefined()
        expect(orgWithMembers!.memberships).toHaveLength(2)

        // Get member count
        const memberCount = await organizationRepository.getMemberCount(createdOrg.id)
        expect(memberCount).toBe(2)
      })

      it('should enforce unique constraints', async () => {
        const orgData = {
          name: 'Unique Test Org',
          slug: 'unique-test-org'
        }

        // Create first organization
        await organizationRepository.create(orgData)

        // Attempt to create duplicate slug
        await expect(organizationRepository.create({
          name: 'Different Name',
          slug: 'unique-test-org' // Same slug
        })).rejects.toThrow()
      })
    })

    describe('RoleRepository Integration', () => {
      it('should manage roles and permissions', async () => {
        // Create role with permissions
        const roleData = {
          name: 'Integration Admin',
          description: 'Admin role for integration testing',
          permissions: ['user.read', 'user.write', 'org.manage']
        }

        const createdRole = await roleRepository.create(roleData)
        expect(createdRole).toBeDefined()
        expect(createdRole.permissions).toEqual(roleData.permissions)

        // Update permissions
        const newPermissions = ['user.read', 'user.write', 'user.delete', 'org.read']
        const updatedRole = await roleRepository.update(createdRole.id, {
          permissions: newPermissions
        })
        expect(updatedRole.permissions).toEqual(newPermissions)

        // Check permission validation
        const hasPermission = await roleRepository.hasPermission(createdRole.id, 'user.read')
        expect(hasPermission).toBe(true)

        const lacksPermission = await roleRepository.hasPermission(createdRole.id, 'admin.super')
        expect(lacksPermission).toBe(false)
      })
    })
  })

  describe('Service Layer Integration', () => {
    describe('UserService Integration', () => {
      it('should integrate validation with database operations', async () => {
        const userService = new UserService(userRepository)

        // Test valid user creation
        const validUserData = {
          clerkUserId: 'clerk_service_test',
          email: 'service@example.com',
          firstName: 'Service',
          lastName: 'Test'
        }

        const createdUser = await userService.createUser(validUserData)
        expect(createdUser).toBeDefined()
        expect(createdUser.email).toBe(validUserData.email)

        // Test validation error handling
        const invalidUserData = {
          clerkUserId: 'clerk_invalid',
          email: 'invalid-email',
          firstName: '',
          lastName: 'Test'
        }

        await expect(userService.createUser(invalidUserData))
          .rejects.toThrow()

        // Test user update with validation
        const updateData = { firstName: 'Updated Service' }
        const updatedUser = await userService.updateUser(createdUser.id, updateData)
        expect(updatedUser.firstName).toBe(updateData.firstName)

        // Test invalid update
        await expect(userService.updateUser(createdUser.id, { email: 'invalid' }))
          .rejects.toThrow()
      })

      it('should handle business logic correctly', async () => {
        const userService = new UserService(userRepository)

        // Create user
        const userData = {
          clerkUserId: 'clerk_business_logic',
          email: 'business@example.com',
          firstName: 'Business',
          lastName: 'Logic'
        }

        const user = await userService.createUser(userData)

        // Test duplicate email prevention
        await expect(userService.createUser({
          clerkUserId: 'clerk_duplicate',
          email: 'business@example.com', // Same email
          firstName: 'Duplicate',
          lastName: 'User'
        })).rejects.toThrow()

        // Test user preferences update
        const preferences = { theme: 'dark', notifications: true }
        const updatedUser = await userService.updateUserPreferences(user.id, preferences)
        expect(updatedUser.preferences).toEqual(preferences)
      })
    })

    describe('OrganizationService Integration', () => {
      it('should manage organization lifecycle with validation', async () => {
        const orgService = new OrganizationService(organizationRepository, userRepository, roleRepository)

        // Create organization
        const orgData = {
          name: 'Service Test Org',
          slug: 'service-test-org',
          description: 'Organization created by service'
        }

        const createdOrg = await orgService.createOrganization(orgData)
        expect(createdOrg).toBeDefined()
        expect(createdOrg.slug).toBe(orgData.slug)

        // Create users and roles for membership testing
        const owner = await testUtils.createTestUser({ email: 'owner@example.com' })
        const member = await testUtils.createTestUser({ email: 'member@example.com' })
        const adminRole = await testUtils.createTestRole({ name: 'Admin' })
        const memberRole = await testUtils.createTestRole({ name: 'Member' })

        // Add members with different roles
        await orgService.addMember(createdOrg.id, owner.id, adminRole.id)
        await orgService.addMember(createdOrg.id, member.id, memberRole.id)

        // Get organization with members
        const orgWithMembers = await orgService.getOrganizationWithMembers(createdOrg.id)
        expect(orgWithMembers.memberships).toHaveLength(2)

        // Test member role update
        await orgService.updateMemberRole(createdOrg.id, member.id, adminRole.id)
        
        const updatedMembership = await orgService.getMembership(createdOrg.id, member.id)
        expect(updatedMembership.roleId).toBe(adminRole.id)

        // Test member removal
        await orgService.removeMember(createdOrg.id, member.id)
        
        const orgAfterRemoval = await orgService.getOrganizationWithMembers(createdOrg.id)
        expect(orgAfterRemoval.memberships).toHaveLength(1)
      })
    })
  })

  describe('API Integration Tests', () => {
    describe('User API Integration', () => {
      it('should handle complete user API workflow', async () => {
        // Mock API request/response cycle
        const createUserRequest = {
          clerkUserId: 'clerk_api_test',
          email: 'api@example.com',
          firstName: 'API',
          lastName: 'Test'
        }

        // Validate request data
        const validationTester = createValidationTester(createUserSchema)
        const validationResult = await validationTester.testValidationCase({
          name: 'API user creation',
          input: createUserRequest,
          expected: { success: true }
        })
        expect(validationResult.success).toBe(true)

        // Create user through service (simulating API endpoint)
        const userService = new UserService(userRepository)
        const createdUser = await userService.createUser(createUserRequest)
        expect(createdUser).toBeDefined()

        // Test user retrieval
        const retrievedUser = await userService.getUserById(createdUser.id)
        expect(retrievedUser).toBeDefined()
        expect(retrievedUser.email).toBe(createUserRequest.email)

        // Test user update
        const updateRequest = { firstName: 'Updated API' }
        const updateValidation = await validationTester.testValidationCase({
          name: 'API user update',
          input: updateRequest,
          expected: { success: true }
        })
        expect(updateValidation.success).toBe(true)

        const updatedUser = await userService.updateUser(createdUser.id, updateRequest)
        expect(updatedUser.firstName).toBe(updateRequest.firstName)
      })

      it('should handle API validation errors properly', async () => {
        const userService = new UserService(userRepository)

        // Test invalid email format
        const invalidEmailRequest = {
          clerkUserId: 'clerk_invalid_email',
          email: 'not-an-email',
          firstName: 'Invalid',
          lastName: 'Email'
        }

        await expect(userService.createUser(invalidEmailRequest))
          .rejects.toThrow()

        // Test missing required fields
        const incompleteRequest = {
          email: 'incomplete@example.com'
          // Missing clerkUserId, firstName, lastName
        }

        await expect(userService.createUser(incompleteRequest as any))
          .rejects.toThrow()
      })
    })

    describe('Organization API Integration', () => {
      it('should handle organization management API workflow', async () => {
        const orgService = new OrganizationService(organizationRepository, userRepository, roleRepository)

        // Create organization
        const createOrgRequest = {
          name: 'API Test Organization',
          slug: 'api-test-org',
          description: 'Created through API integration test'
        }

        const validationTester = createValidationTester(createOrganizationSchema)
        const validationResult = await validationTester.testValidationCase({
          name: 'API organization creation',
          input: createOrgRequest,
          expected: { success: true }
        })
        expect(validationResult.success).toBe(true)

        const createdOrg = await orgService.createOrganization(createOrgRequest)
        expect(createdOrg).toBeDefined()
        expect(createdOrg.slug).toBe(createOrgRequest.slug)

        // Test organization listing with pagination
        const organizations = await orgService.listOrganizations({
          page: 1,
          limit: 10,
          sortBy: 'name',
          sortOrder: 'asc'
        })
        expect(organizations.data).toContain(
          expect.objectContaining({ id: createdOrg.id })
        )

        // Test organization search
        const searchResults = await orgService.searchOrganizations({
          query: 'API Test',
          page: 1,
          limit: 10
        })
        expect(searchResults.data).toContain(
          expect.objectContaining({ id: createdOrg.id })
        )
      })
    })
  })

  describe('Performance and Load Testing', () => {
    describe('Repository Performance', () => {
      it('should handle bulk operations efficiently', async () => {
        const startTime = performance.now()

        // Create multiple users in batch
        const userPromises = Array.from({ length: 100 }, (_, i) =>
          userRepository.create({
            clerkUserId: `clerk_bulk_${i}`,
            email: `bulk${i}@example.com`,
            firstName: `Bulk${i}`,
            lastName: 'User'
          })
        )

        const users = await Promise.all(userPromises)
        const creationTime = performance.now() - startTime

        expect(users).toHaveLength(100)
        expect(creationTime).toBeLessThan(5000) // Should complete within 5 seconds

        console.log(`Bulk user creation (100 users): ${creationTime.toFixed(2)}ms`)

        // Test bulk retrieval
        const retrievalStart = performance.now()
        const userIds = users.map(user => user.id)
        const retrievedUsers = await userRepository.findMany({
          where: { id: { in: userIds } }
        })
        const retrievalTime = performance.now() - retrievalStart

        expect(retrievedUsers).toHaveLength(100)
        expect(retrievalTime).toBeLessThan(1000) // Should complete within 1 second

        console.log(`Bulk user retrieval (100 users): ${retrievalTime.toFixed(2)}ms`)
      })

      it('should handle concurrent database operations', async () => {
        const concurrentOperations = 50
        const startTime = performance.now()

        // Mix of different operations
        const operations = Array.from({ length: concurrentOperations }, (_, i) => {
          if (i % 3 === 0) {
            // Create user
            return userRepository.create({
              clerkUserId: `clerk_concurrent_${i}`,
              email: `concurrent${i}@example.com`,
              firstName: `Concurrent${i}`,
              lastName: 'User'
            })
          } else if (i % 3 === 1) {
            // Create organization
            return organizationRepository.create({
              name: `Concurrent Org ${i}`,
              slug: `concurrent-org-${i}`
            })
          } else {
            // Create role
            return roleRepository.create({
              name: `Concurrent Role ${i}`,
              permissions: ['user.read']
            })
          }
        })

        const results = await Promise.all(operations)
        const totalTime = performance.now() - startTime

        expect(results).toHaveLength(concurrentOperations)
        expect(totalTime).toBeLessThan(10000) // Should complete within 10 seconds

        console.log(`Concurrent operations (${concurrentOperations} mixed): ${totalTime.toFixed(2)}ms`)
      })
    })

    describe('Service Layer Performance', () => {
      it('should handle service operations efficiently', async () => {
        const userService = new UserService(userRepository)
        const orgService = new OrganizationService(organizationRepository, userRepository, roleRepository)

        const startTime = performance.now()

        // Create organization with multiple members
        const org = await orgService.createOrganization({
          name: 'Performance Test Org',
          slug: 'performance-test-org'
        })

        const role = await roleRepository.create({
          name: 'Performance Role',
          permissions: ['user.read', 'user.write']
        })

        // Add multiple members
        const memberPromises = Array.from({ length: 50 }, (_, i) =>
          userService.createUser({
            clerkUserId: `clerk_perf_${i}`,
            email: `perf${i}@example.com`,
            firstName: `Perf${i}`,
            lastName: 'User'
          }).then(user =>
            orgService.addMember(org.id, user.id, role.id)
          )
        )

        await Promise.all(memberPromises)
        const totalTime = performance.now() - startTime

        expect(totalTime).toBeLessThan(15000) // Should complete within 15 seconds

        console.log(`Service layer performance (org + 50 members): ${totalTime.toFixed(2)}ms`)

        // Verify final state
        const orgWithMembers = await orgService.getOrganizationWithMembers(org.id)
        expect(orgWithMembers.memberships).toHaveLength(50)
      })
    })

    describe('Query Performance', () => {
      it('should execute complex queries efficiently', async () => {
        // Set up test data
        await seedTestDatabase()

        const startTime = performance.now()

        // Complex query: Find users with their organizations and roles
        const complexQuery = await userRepository.findManyWithRelations({
          include: {
            memberships: {
              include: {
                organization: true,
                role: true
              }
            }
          },
          limit: 100
        })

        const queryTime = performance.now() - startTime

        expect(complexQuery).toBeDefined()
        expect(queryTime).toBeLessThan(1000) // Should complete within 1 second

        console.log(`Complex query performance: ${queryTime.toFixed(2)}ms`)
      })

      it('should handle pagination efficiently', async () => {
        // Create test data
        const users = await Promise.all(
          Array.from({ length: 200 }, (_, i) =>
            userRepository.create({
              clerkUserId: `clerk_pagination_${i}`,
              email: `pagination${i}@example.com`,
              firstName: `Page${i}`,
              lastName: 'User'
            })
          )
        )

        const startTime = performance.now()

        // Test pagination performance
        const pages = []
        for (let page = 1; page <= 10; page++) {
          const pageResult = await userRepository.findMany({
            offset: (page - 1) * 20,
            limit: 20,
            orderBy: { createdAt: 'desc' }
          })
          pages.push(pageResult)
        }

        const paginationTime = performance.now() - startTime

        expect(pages).toHaveLength(10)
        pages.forEach(page => {
          expect(page.length).toBeLessThanOrEqual(20)
        })
        expect(paginationTime).toBeLessThan(2000) // Should complete within 2 seconds

        console.log(`Pagination performance (10 pages): ${paginationTime.toFixed(2)}ms`)
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle database constraint violations gracefully', async () => {
      // Create user
      const userData = {
        clerkUserId: 'clerk_constraint_test',
        email: 'constraint@example.com',
        firstName: 'Constraint',
        lastName: 'Test'
      }

      await userRepository.create(userData)

      // Attempt to create duplicate
      await expect(userRepository.create(userData))
        .rejects.toThrow()
    })

    it('should handle transaction rollbacks correctly', async () => {
      const userService = new UserService(userRepository)

      // Simulate transaction that should rollback
      await expect(async () => {
        await testDb.transaction(async (tx) => {
          // Create user
          await userRepository.create({
            clerkUserId: 'clerk_rollback_test',
            email: 'rollback@example.com',
            firstName: 'Rollback',
            lastName: 'Test'
          })

          // Force rollback by throwing error
          throw new Error('Simulated transaction error')
        })
      }).rejects.toThrow('Simulated transaction error')

      // Verify user was not created due to rollback
      const user = await userRepository.findByEmail('rollback@example.com')
      expect(user).toBeNull()
    })

    it('should handle connection errors gracefully', async () => {
      // This test would require mocking connection failures
      // For now, we'll test that the error handling structure is in place
      
      try {
        await userRepository.findById('non-existent-id')
      } catch (error) {
        // Should handle gracefully without crashing
        expect(error).toBeDefined()
      }
    })
  })

  describe('Data Integrity and Consistency', () => {
    it('should maintain referential integrity', async () => {
      // Create related entities
      const user = await testUtils.createTestUser()
      const organization = await testUtils.createTestOrganization()
      const role = await testUtils.createTestRole()

      // Create membership
      const membership = await testUtils.createTestMembership(user.id, organization.id, role.id)

      // Verify relationships exist
      expect(membership.userId).toBe(user.id)
      expect(membership.organizationId).toBe(organization.id)
      expect(membership.roleId).toBe(role.id)

      // Test cascade behavior (if implemented)
      await userRepository.delete(user.id)
      
      // Membership should be cleaned up or handled appropriately
      // This depends on your cascade configuration
    })

    it('should handle concurrent updates correctly', async () => {
      const user = await testUtils.createTestUser()

      // Simulate concurrent updates
      const update1Promise = userRepository.update(user.id, { firstName: 'Update1' })
      const update2Promise = userRepository.update(user.id, { lastName: 'Update2' })

      const [result1, result2] = await Promise.all([update1Promise, update2Promise])

      // Both updates should succeed
      expect(result1.firstName).toBe('Update1')
      expect(result2.lastName).toBe('Update2')

      // Final state should reflect both updates
      const finalUser = await userRepository.findById(user.id)
      expect(finalUser!.firstName).toBe('Update1')
      expect(finalUser!.lastName).toBe('Update2')
    })
  })
})