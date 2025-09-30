/**
 * Drizzle Testing Setup and Utilities
 * 
 * This file provides comprehensive testing utilities for Drizzle ORM including:
 * - Test database setup and teardown
 * - Database seeding and fixture management
 * - Transaction-based test isolation
 * - Mock repository implementations
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import { vi } from 'vitest'
import * as schema from '@/lib/db/schema'
import type { DrizzleDatabase } from '@/lib/db/connection'

/**
 * Test database configuration
 */
interface TestDatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
}

/**
 * Default test database configuration - DISABLED for pure mock testing
 * Tests should never attempt real database connections
 */
const DEFAULT_TEST_CONFIG: TestDatabaseConfig = {
  host: 'mock-host',
  port: 0,
  database: 'mock-database',
  username: 'mock-user',
  password: 'mock-password',
  ssl: false
}

/**
 * Global test database instances - All mocked
 */
let testConnection: postgres.Sql | null = null
let testDatabase: DrizzleDatabase | null = null
let testTransactionDatabase: DrizzleDatabase | null = null

/**
 * Create test database connection - MOCK ONLY
 * This function should never create real connections in tests
 */
export function createTestConnection(config: Partial<TestDatabaseConfig> = {}): postgres.Sql {
  // Return a mock connection that never attempts real database operations
  const mockConnection = {
    end: vi.fn().mockResolvedValue(undefined),
    listen: vi.fn(),
    query: vi.fn().mockResolvedValue([]),
    // Add template literal function for SQL queries
    [Symbol.for('nodejs.util.inspect.custom')]: () => '[Mock PostgreSQL Connection]'
  } as any
  
  // Add template literal support for SQL queries
  const sqlHandler = vi.fn().mockResolvedValue([])
  Object.setPrototypeOf(mockConnection, sqlHandler)
  
  return mockConnection
}

/**
 * Create test database instance with schema - MOCK ONLY
 */
export function createTestDatabase(connection?: postgres.Sql): DrizzleDatabase {
  // Return the mock database instead of creating a real Drizzle instance
  return createMockDatabase()
}

/**
 * Get or create global test connection - MOCK ONLY
 */
export function getTestConnection(): postgres.Sql {
  if (!testConnection) {
    testConnection = createTestConnection()
  }
  return testConnection
}

/**
 * Get or create global test database - MOCK ONLY
 */
export function getTestDatabase(): DrizzleDatabase {
  if (!testDatabase) {
    testDatabase = createTestDatabase()
  }
  return testDatabase
}

/**
 * Setup test database schema - MOCK ONLY
 * No real database operations in tests
 */
export async function setupTestDatabase(): Promise<void> {
  // Mock setup - no real database operations
  console.log('[Test DB] Mock schema setup completed')
}

/**
 * Clean test database - MOCK ONLY
 * No real database operations in tests
 */
export async function cleanTestDatabase(): Promise<void> {
  // Mock cleanup - no real database operations
  console.log('[Test DB] Mock database cleaned')
}

/**
 * Teardown test database - MOCK ONLY
 * No real database operations in tests
 */
export async function teardownTestDatabase(): Promise<void> {
  try {
    // Reset mock instances
    testTransactionDatabase = null
    testConnection = null
    testDatabase = null
    console.log('[Test DB] Mock database connection closed')
  } catch (error) {
    console.error('[Test DB] Mock database teardown failed:', error)
  }
}

/**
 * Create isolated test transaction - MOCK ONLY
 * Returns a mock database instance for transaction testing
 */
export async function createTestTransaction(): Promise<DrizzleDatabase> {
  // Return a fresh mock database for transaction isolation
  testTransactionDatabase = createMockDatabase()
  return testTransactionDatabase
}

/**
 * Rollback test transaction - MOCK ONLY
 * Cleans up mock transaction state
 */
export async function rollbackTestTransaction(): Promise<void> {
  if (testTransactionDatabase) {
    try {
      // Reset mock state
      testTransactionDatabase = null
      console.log('[Test DB] Mock transaction rolled back')
    } catch (error) {
      console.warn('[Test DB] Mock transaction rollback failed:', error)
    }
  }
}

/**
 * Test fixture data types
 */
export interface TestFixtures {
  users: Array<{
    id: string
    clerkUserId: string
    email: string
    firstName: string
    lastName: string
  }>
  organizations: Array<{
    id: string
    name: string
    slug: string
  }>
  memberships: Array<{
    userId: string
    organizationId: string
    roleId: string
  }>
  roles: Array<{
    id: string
    name: string
    permissions: string[]
  }>
}

/**
 * Default test fixtures
 */
export const DEFAULT_TEST_FIXTURES: TestFixtures = {
  users: [
    {
      id: 'user_test_1',
      clerkUserId: 'clerk_user_1',
      email: 'user1@test.com',
      firstName: 'Test',
      lastName: 'User1'
    },
    {
      id: 'user_test_2',
      clerkUserId: 'clerk_user_2',
      email: 'user2@test.com',
      firstName: 'Test',
      lastName: 'User2'
    }
  ],
  organizations: [
    {
      id: 'org_test_1',
      name: 'Test Organization 1',
      slug: 'test-org-1'
    },
    {
      id: 'org_test_2',
      name: 'Test Organization 2',
      slug: 'test-org-2'
    }
  ],
  memberships: [
    {
      userId: 'user_test_1',
      organizationId: 'org_test_1',
      roleId: 'role_admin'
    },
    {
      userId: 'user_test_2',
      organizationId: 'org_test_1',
      roleId: 'role_member'
    }
  ],
  roles: [
    {
      id: 'role_admin',
      name: 'Admin',
      permissions: ['user.read', 'user.write', 'org.read', 'org.write']
    },
    {
      id: 'role_member',
      name: 'Member',
      permissions: ['user.read', 'org.read']
    }
  ]
}

/**
 * Seed test database with fixtures - MOCK ONLY
 * Returns fixtures without performing real database operations
 */
export async function seedTestDatabase(
  fixtures: Partial<TestFixtures> = {},
  db?: DrizzleDatabase
): Promise<TestFixtures> {
  const finalFixtures = { ...DEFAULT_TEST_FIXTURES, ...fixtures }
  
  // Mock seeding - just return the fixtures without database operations
  console.log('[Test DB] Mock database seeded with fixtures')
  return finalFixtures
}

/**
 * Mock repository factory for unit tests
 */
export function createMockRepository<T extends Record<string, any>>() {
  return {
    findById: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    exists: vi.fn(),
    // Add any additional methods your repositories use
    findByClerkId: vi.fn(),
    findByEmail: vi.fn(),
    findBySlug: vi.fn(),
    findWithRelations: vi.fn(),
    createWithRelations: vi.fn(),
    updateWithRelations: vi.fn(),
    // Batch operations
    createMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    // Transaction support
    withTransaction: vi.fn(),
  } as T
}

/**
 * Mock database instance for unit tests
 */
export function createMockDatabase(): DrizzleDatabase {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    execute: vi.fn(),
    then: vi.fn(),
    catch: vi.fn(),
    // Transaction support
    transaction: vi.fn(),
    // Schema access
    ...schema
  }
  
  // Make methods chainable
  Object.keys(mockDb).forEach(key => {
    if (typeof mockDb[key as keyof typeof mockDb] === 'function' && key !== 'execute' && key !== 'then' && key !== 'catch') {
      mockDb[key as keyof typeof mockDb] = vi.fn().mockReturnValue(mockDb)
    }
  })
  
  return mockDb as any
}

/**
 * Test database utilities for common operations - MOCK ONLY
 * All operations return mock data without real database calls
 */
export class TestDatabaseUtils {
  constructor(private db: DrizzleDatabase) {}
  
  /**
   * Create a test user - MOCK ONLY
   */
  async createTestUser(overrides: Partial<any> = {}) {
    const userData = {
      id: `user_${Date.now()}`,
      clerkUserId: `clerk_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
    
    // Return mock user data without database operation
    return userData
  }
  
  /**
   * Create a test organization - MOCK ONLY
   */
  async createTestOrganization(overrides: Partial<any> = {}) {
    const orgData = {
      id: `org_${Date.now()}`,
      name: `Test Org ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
    
    // Return mock organization data without database operation
    return orgData
  }
  
  /**
   * Create a test role - MOCK ONLY
   */
  async createTestRole(overrides: Partial<any> = {}) {
    const roleData = {
      id: `role_${Date.now()}`,
      name: `Test Role ${Date.now()}`,
      permissions: ['test.read'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
    
    // Return mock role data without database operation
    return roleData
  }
  
  /**
   * Create a test membership - MOCK ONLY
   */
  async createTestMembership(userId: string, organizationId: string, roleId: string, overrides: Partial<any> = {}) {
    const membershipData = {
      id: `mem_${userId}_${organizationId}`,
      userId,
      organizationId,
      roleId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
    
    // Return mock membership data without database operation
    return membershipData
  }
  
  /**
   * Get count of records in a table - MOCK ONLY
   */
  async getTableCount(tableName: keyof typeof schema): Promise<number> {
    // Return mock count
    return 0
  }
  
  /**
   * Check if a record exists - MOCK ONLY
   */
  async recordExists(tableName: keyof typeof schema, id: string): Promise<boolean> {
    // Return mock existence check
    return false
  }
}

/**
 * Create test database utilities instance
 */
export function createTestDatabaseUtils(db?: DrizzleDatabase): TestDatabaseUtils {
  return new TestDatabaseUtils(db || getTestDatabase())
}

/**
 * Global test setup and teardown hooks - MOCK ONLY
 * No real database operations in tests
 */
export async function globalTestSetup(): Promise<void> {
  console.log('[Test DB] Starting mock global test setup...')
  
  try {
    await setupTestDatabase()
    console.log('[Test DB] Mock global test setup completed')
  } catch (error) {
    console.error('[Test DB] Mock global test setup failed:', error)
    throw error
  }
}

export async function globalTestTeardown(): Promise<void> {
  console.log('[Test DB] Starting mock global test teardown...')
  
  try {
    await teardownTestDatabase()
    console.log('[Test DB] Mock global test teardown completed')
  } catch (error) {
    console.error('[Test DB] Mock global test teardown failed:', error)
  }
}

/**
 * Per-test setup and teardown hooks - MOCK ONLY
 * Returns mock database instances for testing
 */
export async function testSetup(): Promise<DrizzleDatabase> {
  // Clean mock state before each test
  await cleanTestDatabase()
  
  // Create a fresh mock transaction for the test
  return createTestTransaction()
}

export async function testTeardown(): Promise<void> {
  // Rollback mock transaction
  await rollbackTestTransaction()
}