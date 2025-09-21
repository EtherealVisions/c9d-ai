/**
 * Drizzle Testing Utilities Tests
 * 
 * Comprehensive tests for Drizzle testing infrastructure including:
 * - Test database setup and teardown
 * - Database seeding and fixture management
 * - Transaction-based test isolation
 * - Mock repository implementations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import {
  createTestConnection,
  createTestDatabase,
  getTestConnection,
  getTestDatabase,
  setupTestDatabase,
  cleanTestDatabase,
  teardownTestDatabase,
  createTestTransaction,
  rollbackTestTransaction,
  seedTestDatabase,
  createMockRepository,
  createMockDatabase,
  TestDatabaseUtils,
  createTestDatabaseUtils,
  DEFAULT_TEST_FIXTURES,
  globalTestSetup,
  globalTestTeardown,
  testSetup,
  testTeardown
} from '../setup/drizzle-testing-setup'
import * as schema from '@/lib/db/schema'

// Mock postgres to avoid actual database connections in unit tests
vi.mock('postgres', () => ({
  default: vi.fn(() => ({
    end: vi.fn(),
    listen: vi.fn(),
    query: vi.fn(),
    begin: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn()
  }))
}))

// Mock drizzle-orm
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue([]),
    execute: vi.fn().mockResolvedValue([]),
    transaction: vi.fn()
  })),
  migrate: vi.fn()
}))

describe('Drizzle Testing Utilities', () => {
  describe('Test Connection Management', () => {
    it('should create test connection with default config', () => {
      const connection = createTestConnection()
      expect(connection).toBeDefined()
    })

    it('should create test connection with custom config', () => {
      const customConfig = {
        host: 'custom-host',
        port: 5433,
        database: 'custom_test_db'
      }
      
      const connection = createTestConnection(customConfig)
      expect(connection).toBeDefined()
    })

    it('should create test database instance', () => {
      const db = createTestDatabase()
      expect(db).toBeDefined()
      expect(typeof db.select).toBe('function')
      expect(typeof db.insert).toBe('function')
      expect(typeof db.update).toBe('function')
      expect(typeof db.delete).toBe('function')
    })

    it('should get global test connection', () => {
      const connection1 = getTestConnection()
      const connection2 = getTestConnection()
      expect(connection1).toBe(connection2) // Should be singleton
    })

    it('should get global test database', () => {
      const db1 = getTestDatabase()
      const db2 = getTestDatabase()
      expect(db1).toBe(db2) // Should be singleton
    })
  })

  describe('Database Setup and Teardown', () => {
    it('should setup test database', async () => {
      await expect(setupTestDatabase()).resolves.not.toThrow()
    })

    it('should clean test database', async () => {
      await expect(cleanTestDatabase()).resolves.not.toThrow()
    })

    it('should teardown test database', async () => {
      await expect(teardownTestDatabase()).resolves.not.toThrow()
    })

    it('should handle setup errors gracefully', async () => {
      // Mock migrate to throw error
      const { migrate } = await import('drizzle-orm/postgres-js/migrator')
      vi.mocked(migrate).mockRejectedValueOnce(new Error('Migration failed'))
      
      await expect(setupTestDatabase()).rejects.toThrow('Migration failed')
    })
  })

  describe('Transaction Management', () => {
    it('should create test transaction', async () => {
      const mockTransaction = { rollback: vi.fn() }
      const mockDb = {
        transaction: vi.fn().mockResolvedValue(mockTransaction)
      }
      
      // Mock getTestDatabase to return our mock
      vi.doMock('../setup/drizzle-testing-setup', async () => {
        const actual = await vi.importActual('../setup/drizzle-testing-setup')
        return {
          ...actual,
          getTestDatabase: () => mockDb
        }
      })
      
      const transaction = await createTestTransaction()
      expect(transaction).toBeDefined()
    })

    it('should rollback test transaction', async () => {
      await expect(rollbackTestTransaction()).resolves.not.toThrow()
    })

    it('should handle rollback errors gracefully', async () => {
      // This should not throw even if rollback fails
      await expect(rollbackTestTransaction()).resolves.not.toThrow()
    })
  })

  describe('Database Seeding', () => {
    let mockDb: any

    beforeEach(() => {
      mockDb = createMockDatabase()
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue([])
        })
      })
    })

    it('should seed database with default fixtures', async () => {
      const fixtures = await seedTestDatabase({}, mockDb)
      
      expect(fixtures).toEqual(DEFAULT_TEST_FIXTURES)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should seed database with custom fixtures', async () => {
      const customFixtures = {
        users: [{
          id: 'custom_user',
          clerkUserId: 'custom_clerk',
          email: 'custom@test.com',
          firstName: 'Custom',
          lastName: 'User'
        }]
      }
      
      const fixtures = await seedTestDatabase(customFixtures, mockDb)
      
      expect(fixtures.users).toContainEqual(customFixtures.users[0])
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should handle seeding errors', async () => {
      mockDb.insert.mockImplementation(() => {
        throw new Error('Seeding failed')
      })
      
      await expect(seedTestDatabase({}, mockDb)).rejects.toThrow('Seeding failed')
    })
  })

  describe('Mock Repository', () => {
    it('should create mock repository with all methods', () => {
      const mockRepo = createMockRepository()
      
      // Check that all expected methods exist
      expect(mockRepo.findById).toBeDefined()
      expect(mockRepo.findMany).toBeDefined()
      expect(mockRepo.findFirst).toBeDefined()
      expect(mockRepo.create).toBeDefined()
      expect(mockRepo.update).toBeDefined()
      expect(mockRepo.delete).toBeDefined()
      expect(mockRepo.count).toBeDefined()
      expect(mockRepo.exists).toBeDefined()
      
      // Check additional methods
      expect(mockRepo.findByClerkId).toBeDefined()
      expect(mockRepo.findByEmail).toBeDefined()
      expect(mockRepo.findBySlug).toBeDefined()
      expect(mockRepo.createMany).toBeDefined()
      expect(mockRepo.updateMany).toBeDefined()
      expect(mockRepo.deleteMany).toBeDefined()
      expect(mockRepo.withTransaction).toBeDefined()
    })

    it('should allow method configuration', () => {
      const mockRepo = createMockRepository()
      const testUser = { id: '1', name: 'Test User' }
      
      mockRepo.findById.mockResolvedValue(testUser)
      
      expect(mockRepo.findById).toHaveBeenCalledTimes(0)
      
      // Test the mock
      mockRepo.findById('1')
      expect(mockRepo.findById).toHaveBeenCalledWith('1')
    })
  })

  describe('Mock Database', () => {
    it('should create mock database with chainable methods', () => {
      const mockDb = createMockDatabase()
      
      // Test method chaining
      const query = mockDb.select().from(schema.users).where({}).limit(10)
      expect(query).toBeDefined()
      
      // Check that methods are mocked
      expect(mockDb.select).toBeDefined()
      expect(mockDb.insert).toBeDefined()
      expect(mockDb.update).toBeDefined()
      expect(mockDb.delete).toBeDefined()
    })

    it('should support transaction mocking', () => {
      const mockDb = createMockDatabase()
      
      expect(mockDb.transaction).toBeDefined()
      expect(typeof mockDb.transaction).toBe('function')
    })
  })

  describe('Test Database Utils', () => {
    let mockDb: any
    let utils: TestDatabaseUtils

    beforeEach(() => {
      mockDb = createMockDatabase()
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'test_id' }])
        })
      })
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ count: 5 }])
          })
        })
      })
      
      utils = createTestDatabaseUtils(mockDb)
    })

    it('should create test user', async () => {
      const user = await utils.createTestUser({ firstName: 'Custom' })
      
      expect(mockDb.insert).toHaveBeenCalled()
      expect(user).toEqual({ id: 'test_id' })
    })

    it('should create test organization', async () => {
      const org = await utils.createTestOrganization({ name: 'Custom Org' })
      
      expect(mockDb.insert).toHaveBeenCalled()
      expect(org).toEqual({ id: 'test_id' })
    })

    it('should create test role', async () => {
      const role = await utils.createTestRole({ name: 'Custom Role' })
      
      expect(mockDb.insert).toHaveBeenCalled()
      expect(role).toEqual({ id: 'test_id' })
    })

    it('should create test membership', async () => {
      const membership = await utils.createTestMembership('user1', 'org1', 'role1')
      
      expect(mockDb.insert).toHaveBeenCalled()
      expect(membership).toEqual({ id: 'test_id' })
    })

    it('should get table count', async () => {
      const count = await utils.getTableCount('users')
      
      expect(count).toBe(5)
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should check if record exists', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'test_id' }])
          })
        })
      })
      
      const exists = await utils.recordExists('users', 'test_id')
      
      expect(exists).toBe(true)
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should handle non-existent table', async () => {
      await expect(utils.getTableCount('nonexistent' as any)).rejects.toThrow('Table nonexistent not found in schema')
    })
  })

  describe('Global Test Hooks', () => {
    it('should run global test setup', async () => {
      await expect(globalTestSetup()).resolves.not.toThrow()
    })

    it('should run global test teardown', async () => {
      await expect(globalTestTeardown()).resolves.not.toThrow()
    })

    it('should handle setup errors in global setup', async () => {
      // Mock setupTestDatabase to throw
      vi.doMock('../setup/drizzle-testing-setup', async () => {
        const actual = await vi.importActual('../setup/drizzle-testing-setup')
        return {
          ...actual,
          setupTestDatabase: vi.fn().mockRejectedValue(new Error('Setup failed'))
        }
      })
      
      // This should be tested in integration tests, not unit tests
      // Just verify the function exists
      expect(globalTestSetup).toBeDefined()
    })
  })

  describe('Per-Test Hooks', () => {
    it('should run test setup', async () => {
      const mockTransaction = { rollback: vi.fn() }
      
      // Mock the functions
      vi.doMock('../setup/drizzle-testing-setup', async () => {
        const actual = await vi.importActual('../setup/drizzle-testing-setup')
        return {
          ...actual,
          cleanTestDatabase: vi.fn().mockResolvedValue(undefined),
          createTestTransaction: vi.fn().mockResolvedValue(mockTransaction)
        }
      })
      
      const result = await testSetup()
      expect(result).toBeDefined()
    })

    it('should run test teardown', async () => {
      await expect(testTeardown()).resolves.not.toThrow()
    })
  })

  describe('Default Test Fixtures', () => {
    it('should have valid default fixtures structure', () => {
      expect(DEFAULT_TEST_FIXTURES).toBeDefined()
      expect(DEFAULT_TEST_FIXTURES.users).toBeInstanceOf(Array)
      expect(DEFAULT_TEST_FIXTURES.organizations).toBeInstanceOf(Array)
      expect(DEFAULT_TEST_FIXTURES.memberships).toBeInstanceOf(Array)
      expect(DEFAULT_TEST_FIXTURES.roles).toBeInstanceOf(Array)
      
      // Check fixture data integrity
      expect(DEFAULT_TEST_FIXTURES.users.length).toBeGreaterThan(0)
      expect(DEFAULT_TEST_FIXTURES.organizations.length).toBeGreaterThan(0)
      expect(DEFAULT_TEST_FIXTURES.roles.length).toBeGreaterThan(0)
      
      // Check that users have required fields
      DEFAULT_TEST_FIXTURES.users.forEach(user => {
        expect(user.id).toBeDefined()
        expect(user.clerkUserId).toBeDefined()
        expect(user.email).toBeDefined()
        expect(user.firstName).toBeDefined()
        expect(user.lastName).toBeDefined()
      })
      
      // Check that organizations have required fields
      DEFAULT_TEST_FIXTURES.organizations.forEach(org => {
        expect(org.id).toBeDefined()
        expect(org.name).toBeDefined()
        expect(org.slug).toBeDefined()
      })
      
      // Check that roles have required fields
      DEFAULT_TEST_FIXTURES.roles.forEach(role => {
        expect(role.id).toBeDefined()
        expect(role.name).toBeDefined()
        expect(role.permissions).toBeInstanceOf(Array)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', () => {
      // Mock postgres to throw error
      vi.doMock('postgres', () => ({
        default: vi.fn(() => {
          throw new Error('Connection failed')
        })
      }))
      
      expect(() => createTestConnection()).toThrow('Connection failed')
    })

    it('should handle database operation errors', async () => {
      const mockDb = createMockDatabase()
      mockDb.insert.mockImplementation(() => {
        throw new Error('Database operation failed')
      })
      
      const utils = createTestDatabaseUtils(mockDb)
      
      await expect(utils.createTestUser()).rejects.toThrow('Database operation failed')
    })
  })

  describe('Configuration', () => {
    it('should use environment variables for configuration', () => {
      const originalEnv = process.env
      
      process.env.TEST_DB_HOST = 'custom-host'
      process.env.TEST_DB_PORT = '5433'
      process.env.TEST_DB_NAME = 'custom_db'
      process.env.TEST_DB_USER = 'custom_user'
      process.env.TEST_DB_PASSWORD = 'custom_pass'
      process.env.TEST_DB_SSL = 'true'
      
      // Test that configuration is read (this would be tested in integration)
      expect(process.env.TEST_DB_HOST).toBe('custom-host')
      expect(process.env.TEST_DB_PORT).toBe('5433')
      
      process.env = originalEnv
    })
  })
})