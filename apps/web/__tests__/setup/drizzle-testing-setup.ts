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
 * Default test database configuration
 */
const DEFAULT_TEST_CONFIG: TestDatabaseConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'c9d_test',
  username: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  ssl: process.env.TEST_DB_SSL === 'true'
}

/**
 * Global test database instances
 */
let testConnection: postgres.Sql | null = null
let testDatabase: DrizzleDatabase | null = null
let testTransactionDatabase: DrizzleDatabase | null = null

/**
 * Create test database connection
 */
export function createTestConnection(config: Partial<TestDatabaseConfig> = {}): postgres.Sql {
  const finalConfig = { ...DEFAULT_TEST_CONFIG, ...config }
  
  const connectionString = `postgresql://${finalConfig.username}:${finalConfig.password}@${finalConfig.host}:${finalConfig.port}/${finalConfig.database}`
  
  return postgres(connectionString, {
    max: 1, // Single connection for tests
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: finalConfig.ssl ? 'require' : false,
    prepare: false, // Disable prepared statements for tests
    transform: {
      column: {
        from: postgres.fromCamel,
        to: postgres.toCamel,
      },
    },
    debug: process.env.TEST_DB_DEBUG === 'true' ? console.log : false,
  })
}

/**
 * Create test database instance with schema
 */
export function createTestDatabase(connection?: postgres.Sql): DrizzleDatabase {
  const conn = connection || getTestConnection()
  
  return drizzle(conn, {
    schema,
    logger: {
      logQuery: (query: string, params: unknown[]) => {
        if (process.env.TEST_DB_DEBUG === 'true') {
          console.log('[Test DB Query]', query, params)
        }
      }
    }
  }) as DrizzleDatabase
}

/**
 * Get or create global test connection
 */
export function getTestConnection(): postgres.Sql {
  if (!testConnection) {
    testConnection = createTestConnection()
  }
  return testConnection
}

/**
 * Get or create global test database
 */
export function getTestDatabase(): DrizzleDatabase {
  if (!testDatabase) {
    testDatabase = createTestDatabase()
  }
  return testDatabase
}

/**
 * Setup test database schema
 */
export async function setupTestDatabase(): Promise<void> {
  const connection = getTestConnection()
  const db = getTestDatabase()
  
  try {
    // Run migrations to set up schema
    await migrate(db as any, { migrationsFolder: './lib/db/migrations' })
    console.log('[Test DB] Schema setup completed')
  } catch (error) {
    console.error('[Test DB] Schema setup failed:', error)
    throw error
  }
}

/**
 * Clean test database
 */
export async function cleanTestDatabase(): Promise<void> {
  const connection = getTestConnection()
  
  try {
    // Get all table names from schema
    const tableNames = Object.keys(schema).filter(key => 
      schema[key as keyof typeof schema] && 
      typeof schema[key as keyof typeof schema] === 'object' &&
      '_.name' in (schema[key as keyof typeof schema] as any)
    )
    
    // Disable foreign key checks temporarily
    await connection`SET session_replication_role = replica`
    
    // Truncate all tables
    for (const tableName of tableNames) {
      const table = schema[tableName as keyof typeof schema] as any
      if (table && table._.name) {
        await connection`TRUNCATE TABLE ${connection(table._.name)} CASCADE`
      }
    }
    
    // Re-enable foreign key checks
    await connection`SET session_replication_role = DEFAULT`
    
    console.log('[Test DB] Database cleaned')
  } catch (error) {
    console.error('[Test DB] Database cleanup failed:', error)
    throw error
  }
}

/**
 * Teardown test database
 */
export async function teardownTestDatabase(): Promise<void> {
  try {
    if (testTransactionDatabase) {
      // Rollback any open transactions
      try {
        await (testTransactionDatabase as any).rollback()
      } catch {
        // Ignore rollback errors
      }
      testTransactionDatabase = null
    }
    
    if (testConnection) {
      await testConnection.end()
      testConnection = null
    }
    
    testDatabase = null
    console.log('[Test DB] Database connection closed')
  } catch (error) {
    console.error('[Test DB] Database teardown failed:', error)
  }
}

/**
 * Create isolated test transaction
 * Each test gets its own transaction that's rolled back after the test
 */
export async function createTestTransaction(): Promise<DrizzleDatabase> {
  const db = getTestDatabase()
  
  // Start a transaction
  const transaction = await (db as any).transaction(async (tx: any) => {
    // Return the transaction instance
    return tx
  })
  
  testTransactionDatabase = transaction
  return transaction
}

/**
 * Rollback test transaction
 */
export async function rollbackTestTransaction(): Promise<void> {
  if (testTransactionDatabase) {
    try {
      await (testTransactionDatabase as any).rollback()
    } catch (error) {
      console.warn('[Test DB] Transaction rollback failed:', error)
    } finally {
      testTransactionDatabase = null
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
 * Seed test database with fixtures
 */
export async function seedTestDatabase(
  fixtures: Partial<TestFixtures> = {},
  db?: DrizzleDatabase
): Promise<TestFixtures> {
  const database = db || getTestDatabase()
  const finalFixtures = { ...DEFAULT_TEST_FIXTURES, ...fixtures }
  
  try {
    // Insert roles first (referenced by memberships)
    for (const role of finalFixtures.roles) {
      await database.insert(schema.roles).values({
        id: role.id,
        name: role.name,
        permissions: role.permissions,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing()
    }
    
    // Insert users
    for (const user of finalFixtures.users) {
      await database.insert(schema.users).values({
        id: user.id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing()
    }
    
    // Insert organizations
    for (const org of finalFixtures.organizations) {
      await database.insert(schema.organizations).values({
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing()
    }
    
    // Insert memberships
    for (const membership of finalFixtures.memberships) {
      await database.insert(schema.organizationMemberships).values({
        id: `mem_${membership.userId}_${membership.organizationId}`,
        userId: membership.userId,
        organizationId: membership.organizationId,
        roleId: membership.roleId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing()
    }
    
    console.log('[Test DB] Database seeded with fixtures')
    return finalFixtures
  } catch (error) {
    console.error('[Test DB] Database seeding failed:', error)
    throw error
  }
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
 * Test database utilities for common operations
 */
export class TestDatabaseUtils {
  constructor(private db: DrizzleDatabase) {}
  
  /**
   * Create a test user
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
    
    const [user] = await this.db.insert(schema.users).values(userData).returning()
    return user
  }
  
  /**
   * Create a test organization
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
    
    const [org] = await this.db.insert(schema.organizations).values(orgData).returning()
    return org
  }
  
  /**
   * Create a test role
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
    
    const [role] = await this.db.insert(schema.roles).values(roleData).returning()
    return role
  }
  
  /**
   * Create a test membership
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
    
    const [membership] = await this.db.insert(schema.organizationMemberships).values(membershipData).returning()
    return membership
  }
  
  /**
   * Get count of records in a table
   */
  async getTableCount(tableName: keyof typeof schema): Promise<number> {
    const table = schema[tableName] as any
    if (!table) {
      throw new Error(`Table ${tableName} not found in schema`)
    }
    
    const result = await this.db.select({ count: sql`count(*)` }).from(table)
    return Number(result[0]?.count || 0)
  }
  
  /**
   * Check if a record exists
   */
  async recordExists(tableName: keyof typeof schema, id: string): Promise<boolean> {
    const table = schema[tableName] as any
    if (!table) {
      throw new Error(`Table ${tableName} not found in schema`)
    }
    
    const result = await this.db.select({ id: table.id }).from(table).where(sql`${table.id} = ${id}`).limit(1)
    return result.length > 0
  }
}

/**
 * Create test database utilities instance
 */
export function createTestDatabaseUtils(db?: DrizzleDatabase): TestDatabaseUtils {
  return new TestDatabaseUtils(db || getTestDatabase())
}

/**
 * Global test setup and teardown hooks
 */
export async function globalTestSetup(): Promise<void> {
  console.log('[Test DB] Starting global test setup...')
  
  try {
    await setupTestDatabase()
    console.log('[Test DB] Global test setup completed')
  } catch (error) {
    console.error('[Test DB] Global test setup failed:', error)
    throw error
  }
}

export async function globalTestTeardown(): Promise<void> {
  console.log('[Test DB] Starting global test teardown...')
  
  try {
    await teardownTestDatabase()
    console.log('[Test DB] Global test teardown completed')
  } catch (error) {
    console.error('[Test DB] Global test teardown failed:', error)
  }
}

/**
 * Per-test setup and teardown hooks
 */
export async function testSetup(): Promise<DrizzleDatabase> {
  // Clean the database before each test
  await cleanTestDatabase()
  
  // Create a fresh transaction for the test
  return createTestTransaction()
}

export async function testTeardown(): Promise<void> {
  // Rollback the test transaction
  await rollbackTestTransaction()
}