/**
 * Real Clerk Integration Tests
 * Tests actual Clerk authentication and user management without mocking
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { loadFromPhase, getPhaseConfig } from '@c9d/config'

// Test configuration - will be loaded from Phase.dev
let TEST_CLERK_SECRET_KEY: string | undefined
let TEST_USER_EMAIL: string | undefined
let phaseConfig: any = null

// Dynamic import of Clerk client to handle missing configuration
let clerkClient: any = null

describe('Real Clerk Integration Tests', () => {
  let testUserId: string | null = null
  let createdTestUsers: string[] = []

  beforeAll(async () => {
    try {
      // Load configuration from Phase.dev using new SDK
      phaseConfig = await getPhaseConfig()
      
      if (phaseConfig) {
        console.log('🔗 Loading Clerk configuration from Phase.dev...')
        const result = await loadFromPhase(true)
        
        if (result.success) {
          // Extract Clerk configuration
          TEST_CLERK_SECRET_KEY = result.variables.CLERK_SECRET_KEY || result.variables.TEST_CLERK_SECRET_KEY
          TEST_USER_EMAIL = result.variables.TEST_USER_EMAIL || 'test@example.com'
          
          console.log(`✅ Loaded configuration from Phase.dev (app: ${phaseConfig.appName})`)
        } else {
          console.warn('⚠️  Failed to load from Phase.dev:', result.error)
          // Fallback to local environment variables
          TEST_CLERK_SECRET_KEY = process.env.TEST_CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY
          TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
        }
      } else {
        // Fallback to local environment variables
        console.warn('⚠️  No Phase.dev configuration found, checking local environment...')
        TEST_CLERK_SECRET_KEY = process.env.TEST_CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY
        TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
      }

      // Skip tests if no Clerk configuration
      if (!TEST_CLERK_SECRET_KEY) {
        console.warn('⚠️  No Clerk secret key found. Skipping real Clerk integration tests.')
        console.warn('   Configure CLERK_SECRET_KEY in Phase.dev app "AI.C9d.Web" or set TEST_CLERK_SECRET_KEY locally.')
        clerkClient = null
        return
      }

      try {
        // Dynamically import and initialize Clerk client
        const { clerkClient: clerk } = await import('@clerk/nextjs/server')
        clerkClient = clerk
        
        // Test if the client is properly initialized
        if (!clerkClient || !clerkClient.users) {
          console.warn('⚠️  Clerk client not properly initialized. Skipping tests.')
          clerkClient = null
          return
        }
        
        console.log('🔗 Connected to Clerk for integration testing')
        console.log(`📧 Test email: ${TEST_USER_EMAIL}`)
      } catch (error) {
        console.error('❌ Failed to initialize Clerk client:', error)
        clerkClient = null
      }
    } catch (error) {
      console.error('❌ Failed to load configuration from Phase.dev:', error)
      console.warn('⚠️  Falling back to local environment variables...')
      
      // Fallback to local environment
      TEST_CLERK_SECRET_KEY = process.env.TEST_CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY
      TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
      
      if (!TEST_CLERK_SECRET_KEY) {
        console.warn('⚠️  No Clerk configuration available. Skipping tests.')
        clerkClient = null
        return
      }
      
      try {
        const { clerkClient: clerk } = await import('@clerk/nextjs/server')
        clerkClient = clerk
        console.log('🔗 Connected to Clerk using local configuration')
      } catch (clientError) {
        console.error('❌ Failed to initialize Clerk client with local config:', clientError)
        clerkClient = null
      }
    }
  })

  afterAll(async () => {
    // Cleanup test users
    if (clerkClient && createdTestUsers.length > 0) {
      console.log('🧹 Cleaning up test users from Clerk...')
      
      for (const userId of createdTestUsers) {
        try {
          await clerkClient.users.deleteUser(userId)
          console.log(`✅ Deleted test user: ${userId}`)
        } catch (error) {
          console.warn(`⚠️  Failed to cleanup user ${userId}:`, error)
        }
      }
    }
  })

  beforeEach(() => {
    // Skip individual tests if no Clerk configuration
    if (!TEST_CLERK_SECRET_KEY || !clerkClient) {
      return
    }
  })

  describe('Clerk User Management', () => {
    it('should connect to Clerk and retrieve user count', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient) {
        console.log('⏭️  Skipping test - no Clerk configuration')
        return
      }

      try {
        // Test basic Clerk connectivity
        const users = await clerkClient.users.getUserList({ limit: 1 })
        
        expect(users).toBeDefined()
        expect(Array.isArray(users.data)).toBe(true)
        expect(typeof users.totalCount).toBe('number')
        
        console.log(`✅ Clerk connection successful. Total users: ${users.totalCount}`)
      } catch (error) {
        console.error('❌ Clerk connection failed:', error)
        throw error
      }
    })

    it('should create a test user in Clerk', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient) {
        console.log('⏭️  Skipping test - no Clerk configuration')
        return
      }

      const testUserData = {
        emailAddress: [`test_${Date.now()}@example.com`],
        firstName: 'Test',
        lastName: 'User',
        password: 'TestPassword123!',
        skipPasswordChecks: true,
        skipPasswordRequirement: false
      }

      try {
        const createdUser = await clerkClient.users.createUser(testUserData)
        
        expect(createdUser).toBeDefined()
        expect(createdUser.id).toBeDefined()
        expect(createdUser.emailAddresses[0].emailAddress).toBe(testUserData.emailAddress[0])
        expect(createdUser.firstName).toBe(testUserData.firstName)
        expect(createdUser.lastName).toBe(testUserData.lastName)

        testUserId = createdUser.id
        createdTestUsers.push(createdUser.id)
        
        console.log(`✅ Created test user: ${createdUser.id}`)
      } catch (error) {
        console.error('❌ Failed to create test user:', error)
        throw error
      }
    })

    it('should retrieve and update user information', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient || !testUserId) {
        console.log('⏭️  Skipping test - no Clerk configuration or test user')
        return
      }

      try {
        // Retrieve user
        const retrievedUser = await clerkClient.users.getUser(testUserId)
        
        expect(retrievedUser).toBeDefined()
        expect(retrievedUser.id).toBe(testUserId)
        expect(retrievedUser.firstName).toBe('Test')

        // Update user
        const updatedUser = await clerkClient.users.updateUser(testUserId, {
          firstName: 'Updated',
          lastName: 'TestUser'
        })

        expect(updatedUser.firstName).toBe('Updated')
        expect(updatedUser.lastName).toBe('TestUser')
        
        console.log(`✅ Updated test user: ${testUserId}`)
      } catch (error) {
        console.error('❌ Failed to retrieve/update user:', error)
        throw error
      }
    })

    it('should handle user metadata', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient || !testUserId) {
        console.log('⏭️  Skipping test - no Clerk configuration or test user')
        return
      }

      try {
        const metadata = {
          testData: true,
          createdAt: new Date().toISOString(),
          preferences: {
            theme: 'dark',
            notifications: true
          }
        }

        // Update user metadata
        const updatedUser = await clerkClient.users.updateUser(testUserId, {
          publicMetadata: metadata
        })

        expect(updatedUser.publicMetadata).toEqual(metadata)
        
        console.log(`✅ Updated user metadata for: ${testUserId}`)
      } catch (error) {
        console.error('❌ Failed to update user metadata:', error)
        throw error
      }
    })

    it('should list and filter users', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient) {
        console.log('⏭️  Skipping test - no Clerk configuration')
        return
      }

      try {
        // List users with pagination
        const userList = await clerkClient.users.getUserList({
          limit: 5,
          offset: 0
        })

        expect(userList.data).toBeDefined()
        expect(Array.isArray(userList.data)).toBe(true)
        expect(userList.totalCount).toBeGreaterThanOrEqual(0)

        // Filter users by email if we have test users
        if (createdTestUsers.length > 0) {
          const testUser = await clerkClient.users.getUser(createdTestUsers[0])
          const testEmail = testUser.emailAddresses[0].emailAddress
          
          const filteredUsers = await clerkClient.users.getUserList({
            emailAddress: [testEmail]
          })

          expect(filteredUsers.data.length).toBeGreaterThan(0)
          expect(filteredUsers.data[0].emailAddresses[0].emailAddress).toBe(testEmail)
        }
        
        console.log(`✅ Listed users successfully. Found: ${userList.data.length}`)
      } catch (error) {
        console.error('❌ Failed to list users:', error)
        throw error
      }
    })

    it('should handle user sessions and tokens', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient || !testUserId) {
        console.log('⏭️  Skipping test - no Clerk configuration or test user')
        return
      }

      try {
        // Get user sessions
        const sessions = await clerkClient.sessions.getSessionList({
          userId: testUserId
        })

        expect(sessions).toBeDefined()
        expect(Array.isArray(sessions.data)).toBe(true)
        
        // Note: New test users typically won't have active sessions
        console.log(`✅ Retrieved sessions for user: ${testUserId}. Active sessions: ${sessions.data.length}`)
      } catch (error) {
        console.error('❌ Failed to retrieve user sessions:', error)
        throw error
      }
    })
  })

  describe('Clerk Organization Management', () => {
    let testOrgId: string | null = null
    let createdTestOrgs: string[] = []

    afterAll(async () => {
      // Cleanup test organizations
      if (clerkClient && createdTestOrgs.length > 0) {
        for (const orgId of createdTestOrgs) {
          try {
            await clerkClient.organizations.deleteOrganization(orgId)
            console.log(`✅ Deleted test organization: ${orgId}`)
          } catch (error) {
            console.warn(`⚠️  Failed to cleanup organization ${orgId}:`, error)
          }
        }
      }
    })

    it('should create and manage Clerk organizations', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient || !testUserId) {
        console.log('⏭️  Skipping test - no Clerk configuration or test user')
        return
      }

      try {
        const orgData = {
          name: `Test Organization ${Date.now()}`,
          slug: `test-org-${Date.now()}`,
          createdBy: testUserId
        }

        // Create organization
        const createdOrg = await clerkClient.organizations.createOrganization(orgData)
        
        expect(createdOrg).toBeDefined()
        expect(createdOrg.id).toBeDefined()
        expect(createdOrg.name).toBe(orgData.name)
        expect(createdOrg.slug).toBe(orgData.slug)

        testOrgId = createdOrg.id
        createdTestOrgs.push(createdOrg.id)
        
        console.log(`✅ Created test organization: ${createdOrg.id}`)

        // Update organization
        const updatedOrg = await clerkClient.organizations.updateOrganization(createdOrg.id, {
          name: `Updated ${orgData.name}`
        })

        expect(updatedOrg.name).toBe(`Updated ${orgData.name}`)
        
        console.log(`✅ Updated test organization: ${createdOrg.id}`)
      } catch (error) {
        console.error('❌ Failed to create/update organization:', error)
        throw error
      }
    })

    it('should manage organization memberships', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient || !testUserId || !testOrgId) {
        console.log('⏭️  Skipping test - no Clerk configuration or test data')
        return
      }

      try {
        // Create organization membership
        const membership = await clerkClient.organizations.createOrganizationMembership({
          organizationId: testOrgId,
          userId: testUserId,
          role: 'org:admin'
        })

        expect(membership).toBeDefined()
        expect(membership.organization.id).toBe(testOrgId)
        expect(membership.publicUserData.userId).toBe(testUserId)
        expect(membership.role).toBe('org:admin')
        
        console.log(`✅ Created organization membership: ${membership.id}`)

        // List organization memberships
        const memberships = await clerkClient.organizations.getOrganizationMembershipList({
          organizationId: testOrgId
        })

        expect(memberships.data.length).toBeGreaterThan(0)
        expect(memberships.data.some(m => m.publicUserData.userId === testUserId)).toBe(true)
        
        console.log(`✅ Listed organization memberships: ${memberships.data.length}`)
      } catch (error) {
        console.error('❌ Failed to manage organization membership:', error)
        throw error
      }
    })
  })

  describe('Clerk Performance Tests', () => {
    it('should perform Clerk operations within performance thresholds', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient) {
        console.log('⏭️  Skipping test - no Clerk configuration')
        return
      }

      const startTime = performance.now()

      try {
        // Test API response time
        const users = await clerkClient.users.getUserList({ limit: 5 })
        
        const endTime = performance.now()
        const responseTime = endTime - startTime

        expect(users).toBeDefined()
        expect(responseTime).toBeLessThan(5000) // Should complete within 5 seconds
        
        console.log(`✅ Clerk API response time: ${responseTime.toFixed(2)}ms`)
      } catch (error) {
        console.error('❌ Clerk performance test failed:', error)
        throw error
      }
    })

    it('should handle concurrent Clerk operations', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient) {
        console.log('⏭️  Skipping test - no Clerk configuration')
        return
      }

      const concurrentOperations = Array.from({ length: 3 }, () =>
        clerkClient.users.getUserList({ limit: 1 })
      )

      const startTime = performance.now()
      
      try {
        const results = await Promise.all(concurrentOperations)
        const endTime = performance.now()
        const totalTime = endTime - startTime

        // All operations should succeed
        results.forEach(result => {
          expect(result).toBeDefined()
          expect(Array.isArray(result.data)).toBe(true)
        })

        expect(totalTime).toBeLessThan(10000) // Should complete within 10 seconds
        
        console.log(`✅ ${concurrentOperations.length} concurrent Clerk operations completed in ${totalTime.toFixed(2)}ms`)
      } catch (error) {
        console.error('❌ Concurrent Clerk operations failed:', error)
        throw error
      }
    })
  })

  describe('Clerk Error Handling', () => {
    it('should handle invalid user operations gracefully', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient) {
        console.log('⏭️  Skipping test - no Clerk configuration')
        return
      }

      try {
        // Attempt to get non-existent user
        await clerkClient.users.getUser('invalid_user_id')
        
        // Should not reach here
        expect(true).toBe(false)
      } catch (error: any) {
        // Should catch the error gracefully
        expect(error).toBeDefined()
        expect(error.status || error.statusCode).toBe(404)
        
        console.log(`✅ Handled invalid user error correctly: ${error.message}`)
      }
    })

    it('should handle rate limiting appropriately', async () => {
      if (!TEST_CLERK_SECRET_KEY || !clerkClient) {
        console.log('⏭️  Skipping test - no Clerk configuration')
        return
      }

      // Note: This test might not trigger rate limiting in test environment
      // but demonstrates how to handle it
      
      try {
        const rapidRequests = Array.from({ length: 10 }, () =>
          clerkClient.users.getUserList({ limit: 1 })
        )

        const results = await Promise.all(rapidRequests)
        
        // All should succeed in test environment
        expect(results.length).toBe(10)
        
        console.log(`✅ Handled rapid requests successfully`)
      } catch (error: any) {
        // If rate limited, should handle gracefully
        if (error.status === 429) {
          console.log(`✅ Rate limiting handled correctly: ${error.message}`)
        } else {
          throw error
        }
      }
    })
  })
})