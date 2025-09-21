/**
 * Database Operations Performance Tests
 * 
 * Comprehensive performance and load tests for database operations including:
 * - Repository operation benchmarks
 * - Concurrent operation testing
 * - Memory usage analysis
 * - Query performance optimization
 * - Load testing scenarios
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  createTestDatabase,
  seedTestDatabase,
  cleanTestDatabase,
  createTestDatabaseUtils,
  testSetup,
  testTeardown
} from '../setup/drizzle-testing-setup'

// Import repositories for performance testing
import { UserRepository } from '@/lib/repositories/user-repository'
import { OrganizationRepository } from '@/lib/repositories/organization-repository'
import { RoleRepository } from '@/lib/repositories/role-repository'

// Import services for integration performance testing
import { UserService } from '@/lib/services/user-service'
import { OrganizationService } from '@/lib/services/organization-service'

describe('Database Operations Performance Tests', () => {
  let testDb: any
  let testUtils: any
  let userRepository: UserRepository
  let organizationRepository: OrganizationRepository
  let roleRepository: RoleRepository
  let userService: UserService
  let organizationService: OrganizationService

  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    SINGLE_CREATE: 50,        // Single record creation
    SINGLE_READ: 10,          // Single record retrieval
    SINGLE_UPDATE: 50,        // Single record update
    SINGLE_DELETE: 30,        // Single record deletion
    BULK_CREATE_100: 2000,    // 100 records creation
    BULK_READ_100: 500,       // 100 records retrieval
    BULK_UPDATE_100: 3000,    // 100 records update
    COMPLEX_QUERY: 1000,      // Complex query with joins
    CONCURRENT_OPS: 5000      // 50 concurrent operations
  }

  beforeAll(async () => {
    testDb = await testSetup()
    testUtils = createTestDatabaseUtils(testDb)
    
    userRepository = new UserRepository(testDb)
    organizationRepository = new OrganizationRepository(testDb)
    roleRepository = new RoleRepository(testDb)
    
    userService = new UserService(userRepository)
    organizationService = new OrganizationService(organizationRepository, userRepository, roleRepository)
  })

  afterAll(async () => {
    await testTeardown()
  })

  beforeEach(async () => {
    await cleanTestDatabase()
  })

  describe('Single Operation Performance', () => {
    describe('User Repository Performance', () => {
      it('should create users within performance threshold', async () => {
        const userData = {
          clerkUserId: 'clerk_perf_create',
          email: 'perf_create@example.com',
          firstName: 'Performance',
          lastName: 'Create'
        }

        const startTime = performance.now()
        const user = await userRepository.create(userData)
        const duration = performance.now() - startTime

        expect(user).toBeDefined()
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_CREATE)
        
        console.log(`User creation: ${duration.toFixed(2)}ms`)
      })

      it('should read users within performance threshold', async () => {
        // Create test user first
        const user = await testUtils.createTestUser()

        const startTime = performance.now()
        const foundUser = await userRepository.findById(user.id)
        const duration = performance.now() - startTime

        expect(foundUser).toBeDefined()
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_READ)
        
        console.log(`User read: ${duration.toFixed(2)}ms`)
      })

      it('should update users within performance threshold', async () => {
        const user = await testUtils.createTestUser()
        const updateData = { firstName: 'Updated' }

        const startTime = performance.now()
        const updatedUser = await userRepository.update(user.id, updateData)
        const duration = performance.now() - startTime

        expect(updatedUser.firstName).toBe('Updated')
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_UPDATE)
        
        console.log(`User update: ${duration.toFixed(2)}ms`)
      })

      it('should delete users within performance threshold', async () => {
        const user = await testUtils.createTestUser()

        const startTime = performance.now()
        await userRepository.delete(user.id)
        const duration = performance.now() - startTime

        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_DELETE)
        
        console.log(`User delete: ${duration.toFixed(2)}ms`)
      })
    })

    describe('Organization Repository Performance', () => {
      it('should perform organization CRUD operations efficiently', async () => {
        const orgData = {
          name: 'Performance Test Org',
          slug: 'performance-test-org'
        }

        // Create
        const createStart = performance.now()
        const org = await organizationRepository.create(orgData)
        const createDuration = performance.now() - createStart

        expect(createDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_CREATE)

        // Read
        const readStart = performance.now()
        const foundOrg = await organizationRepository.findById(org.id)
        const readDuration = performance.now() - readStart

        expect(readDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_READ)

        // Update
        const updateStart = performance.now()
        const updatedOrg = await organizationRepository.update(org.id, { 
          description: 'Updated description' 
        })
        const updateDuration = performance.now() - updateStart

        expect(updateDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_UPDATE)

        console.log(`Organization CRUD: Create ${createDuration.toFixed(2)}ms, Read ${readDuration.toFixed(2)}ms, Update ${updateDuration.toFixed(2)}ms`)
      })
    })

    describe('Role Repository Performance', () => {
      it('should perform role operations efficiently', async () => {
        const roleData = {
          name: 'Performance Role',
          permissions: ['user.read', 'user.write', 'org.read']
        }

        const startTime = performance.now()
        const role = await roleRepository.create(roleData)
        const duration = performance.now() - startTime

        expect(role).toBeDefined()
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_CREATE)
        
        console.log(`Role creation: ${duration.toFixed(2)}ms`)
      })
    })
  })

  describe('Bulk Operations Performance', () => {
    it('should handle bulk user creation efficiently', async () => {
      const userDataArray = Array.from({ length: 100 }, (_, i) => ({
        clerkUserId: `clerk_bulk_${i}`,
        email: `bulk${i}@example.com`,
        firstName: `Bulk${i}`,
        lastName: 'User'
      }))

      const startTime = performance.now()
      
      // Create users in parallel
      const userPromises = userDataArray.map(userData => 
        userRepository.create(userData)
      )
      const users = await Promise.all(userPromises)
      
      const duration = performance.now() - startTime

      expect(users).toHaveLength(100)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_CREATE_100)
      
      console.log(`Bulk user creation (100 users): ${duration.toFixed(2)}ms (${(duration/100).toFixed(2)}ms avg per user)`)
    })

    it('should handle bulk user retrieval efficiently', async () => {
      // Create test users first
      const users = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          testUtils.createTestUser({ email: `bulk_read_${i}@example.com` })
        )
      )

      const userIds = users.map(user => user.id)

      const startTime = performance.now()
      const retrievedUsers = await userRepository.findMany({
        where: { id: { in: userIds } }
      })
      const duration = performance.now() - startTime

      expect(retrievedUsers).toHaveLength(100)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_READ_100)
      
      console.log(`Bulk user retrieval (100 users): ${duration.toFixed(2)}ms`)
    })

    it('should handle bulk user updates efficiently', async () => {
      // Create test users first
      const users = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          testUtils.createTestUser({ email: `bulk_update_${i}@example.com` })
        )
      )

      const startTime = performance.now()
      
      // Update users in parallel
      const updatePromises = users.map((user, i) =>
        userRepository.update(user.id, { firstName: `Updated${i}` })
      )
      const updatedUsers = await Promise.all(updatePromises)
      
      const duration = performance.now() - startTime

      expect(updatedUsers).toHaveLength(100)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_UPDATE_100)
      
      console.log(`Bulk user updates (100 users): ${duration.toFixed(2)}ms (${(duration/100).toFixed(2)}ms avg per user)`)
    })
  })

  describe('Complex Query Performance', () => {
    it('should handle complex queries with joins efficiently', async () => {
      // Set up test data with relationships
      const role = await testUtils.createTestRole({ name: 'Complex Query Role' })
      const organization = await testUtils.createTestOrganization({ name: 'Complex Query Org' })
      
      // Create users with memberships
      const users = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          testUtils.createTestUser({ email: `complex_${i}@example.com` })
        )
      )

      // Create memberships
      await Promise.all(
        users.map(user =>
          testUtils.createTestMembership(user.id, organization.id, role.id)
        )
      )

      const startTime = performance.now()
      
      // Execute complex query with joins
      const usersWithRelations = await userRepository.findManyWithRelations({
        include: {
          memberships: {
            include: {
              organization: true,
              role: true
            }
          }
        },
        where: {
          memberships: {
            some: {
              organizationId: organization.id
            }
          }
        },
        limit: 50
      })
      
      const duration = performance.now() - startTime

      expect(usersWithRelations).toHaveLength(50)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY)
      
      console.log(`Complex query with joins (50 users with relations): ${duration.toFixed(2)}ms`)
    })

    it('should handle pagination efficiently', async () => {
      // Create test data
      await Promise.all(
        Array.from({ length: 200 }, (_, i) =>
          testUtils.createTestUser({ email: `pagination_${i}@example.com` })
        )
      )

      const pageSize = 20
      const totalPages = 10
      const startTime = performance.now()

      // Test pagination performance
      const pages = []
      for (let page = 1; page <= totalPages; page++) {
        const pageStart = performance.now()
        
        const pageResult = await userRepository.findMany({
          offset: (page - 1) * pageSize,
          limit: pageSize,
          orderBy: { createdAt: 'desc' }
        })
        
        const pageTime = performance.now() - pageStart
        pages.push({ page, users: pageResult, time: pageTime })
      }

      const totalTime = performance.now() - startTime
      const averagePageTime = totalTime / totalPages

      expect(pages).toHaveLength(totalPages)
      pages.forEach(page => {
        expect(page.users.length).toBeLessThanOrEqual(pageSize)
      })
      
      console.log(`Pagination performance (${totalPages} pages): ${totalTime.toFixed(2)}ms total, ${averagePageTime.toFixed(2)}ms avg per page`)
    })

    it('should handle search queries efficiently', async () => {
      // Create test data with searchable content
      await Promise.all(
        Array.from({ length: 100 }, (_, i) => {
          const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie']
          const firstName = names[i % names.length]
          return testUtils.createTestUser({ 
            firstName,
            lastName: `User${i}`,
            email: `search_${firstName.toLowerCase()}${i}@example.com`
          })
        })
      )

      const searchQueries = ['John', 'Jane', 'Bob', 'Alice', 'Charlie']
      const searchTimes = []

      for (const query of searchQueries) {
        const startTime = performance.now()
        
        const results = await userRepository.findMany({
          where: {
            OR: [
              { firstName: { ilike: `%${query}%` } },
              { lastName: { ilike: `%${query}%` } },
              { email: { ilike: `%${query}%` } }
            ]
          },
          limit: 50
        })
        
        const duration = performance.now() - startTime
        searchTimes.push(duration)
        
        expect(results.length).toBeGreaterThan(0)
      }

      const averageSearchTime = searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length
      
      console.log(`Search query performance: ${averageSearchTime.toFixed(2)}ms average across ${searchQueries.length} queries`)
    })
  })

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent user operations efficiently', async () => {
      const concurrentOperations = 50
      const startTime = performance.now()

      // Mix of concurrent operations
      const operations = Array.from({ length: concurrentOperations }, (_, i) => {
        if (i % 3 === 0) {
          // Create operation
          return userRepository.create({
            clerkUserId: `clerk_concurrent_${i}`,
            email: `concurrent${i}@example.com`,
            firstName: `Concurrent${i}`,
            lastName: 'User'
          })
        } else if (i % 3 === 1) {
          // Create and then read operation
          return userRepository.create({
            clerkUserId: `clerk_concurrent_read_${i}`,
            email: `concurrent_read${i}@example.com`,
            firstName: `ConcurrentRead${i}`,
            lastName: 'User'
          }).then(user => userRepository.findById(user.id))
        } else {
          // Create and then update operation
          return userRepository.create({
            clerkUserId: `clerk_concurrent_update_${i}`,
            email: `concurrent_update${i}@example.com`,
            firstName: `ConcurrentUpdate${i}`,
            lastName: 'User'
          }).then(user => 
            userRepository.update(user.id, { firstName: `Updated${i}` })
          )
        }
      })

      const results = await Promise.all(operations)
      const duration = performance.now() - startTime

      expect(results).toHaveLength(concurrentOperations)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPS)
      
      console.log(`Concurrent operations (${concurrentOperations} mixed ops): ${duration.toFixed(2)}ms`)
    })

    it('should handle concurrent read operations efficiently', async () => {
      // Create test data first
      const users = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          testUtils.createTestUser({ email: `concurrent_read_${i}@example.com` })
        )
      )

      const concurrentReads = 100
      const startTime = performance.now()

      // Perform concurrent reads
      const readPromises = Array.from({ length: concurrentReads }, (_, i) => {
        const user = users[i % users.length]
        return userRepository.findById(user.id)
      })

      const readResults = await Promise.all(readPromises)
      const duration = performance.now() - startTime

      expect(readResults).toHaveLength(concurrentReads)
      expect(readResults.every(result => result !== null)).toBe(true)
      
      console.log(`Concurrent read operations (${concurrentReads} reads): ${duration.toFixed(2)}ms`)
    })

    it('should handle concurrent write operations safely', async () => {
      const user = await testUtils.createTestUser()
      const concurrentUpdates = 20

      const startTime = performance.now()

      // Perform concurrent updates to the same user
      const updatePromises = Array.from({ length: concurrentUpdates }, (_, i) =>
        userRepository.update(user.id, { 
          firstName: `ConcurrentUpdate${i}`,
          updatedAt: new Date()
        })
      )

      const updateResults = await Promise.all(updatePromises)
      const duration = performance.now() - startTime

      expect(updateResults).toHaveLength(concurrentUpdates)
      
      // Verify final state is consistent
      const finalUser = await userRepository.findById(user.id)
      expect(finalUser).toBeDefined()
      expect(finalUser!.firstName).toMatch(/^ConcurrentUpdate\d+$/)
      
      console.log(`Concurrent write operations (${concurrentUpdates} updates): ${duration.toFixed(2)}ms`)
    })
  })

  describe('Service Layer Performance', () => {
    it('should handle service operations with validation efficiently', async () => {
      const serviceOperations = 50
      const startTime = performance.now()

      // Create users through service layer (includes validation)
      const userPromises = Array.from({ length: serviceOperations }, (_, i) =>
        userService.createUser({
          clerkUserId: `clerk_service_perf_${i}`,
          email: `service_perf${i}@example.com`,
          firstName: `ServicePerf${i}`,
          lastName: 'User'
        })
      )

      const users = await Promise.all(userPromises)
      const duration = performance.now() - startTime

      expect(users).toHaveLength(serviceOperations)
      
      console.log(`Service layer operations with validation (${serviceOperations} users): ${duration.toFixed(2)}ms`)
    })

    it('should handle complex service workflows efficiently', async () => {
      const startTime = performance.now()

      // Complex workflow: Create organization with multiple members
      const org = await organizationService.createOrganization({
        name: 'Performance Workflow Org',
        slug: 'performance-workflow-org'
      })

      const role = await roleRepository.create({
        name: 'Workflow Role',
        permissions: ['user.read', 'user.write']
      })

      // Create and add multiple members
      const memberPromises = Array.from({ length: 25 }, (_, i) =>
        userService.createUser({
          clerkUserId: `clerk_workflow_${i}`,
          email: `workflow${i}@example.com`,
          firstName: `Workflow${i}`,
          lastName: 'User'
        }).then(user =>
          organizationService.addMember(org.id, user.id, role.id)
        )
      )

      await Promise.all(memberPromises)

      // Get organization with all members
      const orgWithMembers = await organizationService.getOrganizationWithMembers(org.id)
      
      const duration = performance.now() - startTime

      expect(orgWithMembers.memberships).toHaveLength(25)
      
      console.log(`Complex service workflow (org + 25 members): ${duration.toFixed(2)}ms`)
    })
  })

  describe('Memory Usage Analysis', () => {
    it('should monitor memory usage during bulk operations', async () => {
      const initialMemory = process.memoryUsage()
      
      // Perform memory-intensive operations
      const users = await Promise.all(
        Array.from({ length: 1000 }, (_, i) =>
          userRepository.create({
            clerkUserId: `clerk_memory_${i}`,
            email: `memory${i}@example.com`,
            firstName: `Memory${i}`,
            lastName: 'User',
            preferences: {
              theme: i % 2 === 0 ? 'dark' : 'light',
              notifications: i % 3 === 0,
              settings: {
                feature1: true,
                feature2: false,
                data: Array.from({ length: 10 }, (_, j) => `item${j}`)
              }
            }
          })
        )
      )

      const finalMemory = process.memoryUsage()
      const memoryDelta = {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external
      }

      expect(users).toHaveLength(1000)
      
      console.log(`Memory usage for 1000 user operations:`)
      console.log(`  Heap Used: ${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`)
      console.log(`  Heap Total: ${(memoryDelta.heapTotal / 1024 / 1024).toFixed(2)}MB`)
      console.log(`  External: ${(memoryDelta.external / 1024 / 1024).toFixed(2)}MB`)

      // Memory usage should be reasonable (less than 100MB for this test)
      expect(Math.abs(memoryDelta.heapUsed)).toBeLessThan(100 * 1024 * 1024)
    })
  })

  describe('Load Testing Scenarios', () => {
    it('should handle realistic load scenarios', async () => {
      // Simulate realistic application load
      const scenarios = [
        // User registration burst
        {
          name: 'User Registration Burst',
          operation: () => Promise.all(
            Array.from({ length: 20 }, (_, i) =>
              userService.createUser({
                clerkUserId: `clerk_load_reg_${i}`,
                email: `load_reg${i}@example.com`,
                firstName: `LoadReg${i}`,
                lastName: 'User'
              })
            )
          )
        },
        // User profile updates
        {
          name: 'Profile Updates',
          operation: async () => {
            const users = await Promise.all(
              Array.from({ length: 15 }, (_, i) =>
                testUtils.createTestUser({ email: `load_update_${i}@example.com` })
              )
            )
            return Promise.all(
              users.map((user, i) =>
                userService.updateUser(user.id, { 
                  firstName: `Updated${i}`,
                  preferences: { theme: 'dark' }
                })
              )
            )
          }
        },
        // Organization operations
        {
          name: 'Organization Operations',
          operation: () => Promise.all(
            Array.from({ length: 10 }, (_, i) =>
              organizationService.createOrganization({
                name: `Load Test Org ${i}`,
                slug: `load-test-org-${i}`
              })
            )
          )
        }
      ]

      const results = []
      
      for (const scenario of scenarios) {
        const startTime = performance.now()
        await scenario.operation()
        const duration = performance.now() - startTime
        
        results.push({
          name: scenario.name,
          duration
        })
        
        console.log(`${scenario.name}: ${duration.toFixed(2)}ms`)
      }

      // All scenarios should complete within reasonable time
      results.forEach(result => {
        expect(result.duration).toBeLessThan(10000) // 10 seconds max
      })
    })

    it('should maintain performance under sustained load', async () => {
      const rounds = 5
      const operationsPerRound = 20
      const roundTimes = []

      for (let round = 0; round < rounds; round++) {
        const startTime = performance.now()
        
        // Perform mixed operations
        await Promise.all([
          // Create users
          ...Array.from({ length: operationsPerRound / 2 }, (_, i) =>
            userService.createUser({
              clerkUserId: `clerk_sustained_${round}_${i}`,
              email: `sustained_${round}_${i}@example.com`,
              firstName: `Sustained${round}${i}`,
              lastName: 'User'
            })
          ),
          // Create organizations
          ...Array.from({ length: operationsPerRound / 4 }, (_, i) =>
            organizationService.createOrganization({
              name: `Sustained Org ${round}_${i}`,
              slug: `sustained-org-${round}-${i}`
            })
          ),
          // Create roles
          ...Array.from({ length: operationsPerRound / 4 }, (_, i) =>
            roleRepository.create({
              name: `Sustained Role ${round}_${i}`,
              permissions: ['user.read']
            })
          )
        ])
        
        const roundTime = performance.now() - startTime
        roundTimes.push(roundTime)
        
        console.log(`Sustained load round ${round + 1}: ${roundTime.toFixed(2)}ms`)
      }

      // Performance should remain consistent across rounds
      const averageTime = roundTimes.reduce((sum, time) => sum + time, 0) / rounds
      const maxDeviation = Math.max(...roundTimes.map(time => Math.abs(time - averageTime)))
      
      console.log(`Sustained load average: ${averageTime.toFixed(2)}ms, max deviation: ${maxDeviation.toFixed(2)}ms`)
      
      // Performance shouldn't degrade significantly (max 50% deviation)
      expect(maxDeviation).toBeLessThan(averageTime * 0.5)
    })
  })
})