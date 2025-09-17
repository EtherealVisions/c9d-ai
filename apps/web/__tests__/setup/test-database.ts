/**
 * Test Database Setup for Integration Testing
 * 
 * This module provides utilities for setting up and managing a real test database
 * for integration tests. We use a real Supabase instance to validate schemas,
 * constraints, and actual database behavior.
 */

import { createClient } from '@supabase/supabase-js'

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!TEST_SUPABASE_URL || !TEST_SUPABASE_ANON_KEY) {
  throw new Error('Test database configuration missing. Please set TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY environment variables.')
}

/**
 * Create a test database client with service role permissions
 */
export function createTestDatabaseClient() {
  return createClient(
    TEST_SUPABASE_URL || 'http://localhost:54321',
    TEST_SUPABASE_SERVICE_KEY || TEST_SUPABASE_ANON_KEY || 'test-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Create a test database client with regular user permissions
 */
export function createTestUserClient() {
  return createClient(
    TEST_SUPABASE_URL || 'http://localhost:54321',
    TEST_SUPABASE_ANON_KEY || 'test-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Test data cleanup utilities
 */
export class TestDatabaseManager {
  private client = createTestDatabaseClient()
  private testDataPrefix = 'test_'
  
  /**
   * Clean up all test data from the database
   */
  async cleanupTestData(): Promise<void> {
    const tables = [
      'audit_logs',
      'session_events',
      'user_sessions',
      'onboarding_sessions',
      'onboarding_steps',
      'organization_memberships',
      'organizations',
      'users'
    ]
    
    // Clean up in reverse dependency order to avoid foreign key constraints
    for (const table of tables) {
      try {
        await this.client
          .from(table as any)
          .delete()
          .like('id', `${this.testDataPrefix}%`)
        
        // Also clean up by email pattern for users
        if (table === 'users') {
          await this.client
            .from(table as any)
            .delete()
            .like('email', '%@test.example.com')
        }
      } catch (error) {
        console.warn(`Failed to clean up table ${table}:`, error)
      }
    }
  }
  
  /**
   * Create test user data
   */
  async createTestUser(overrides: Partial<any> = {}): Promise<any> {
    const userData = {
      id: `${this.testDataPrefix}user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clerk_user_id: `clerk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: `test.user.${Date.now()}@test.example.com`,
      first_name: 'Test',
      last_name: 'User',
      avatar_url: null,
      preferences: {},
      ...overrides
    }
    
    const { data, error } = await this.client
      .from('users')
      .insert(userData)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`)
    }
    
    return data
  }
  
  /**
   * Create test organization data
   */
  async createTestOrganization(overrides: Partial<any> = {}): Promise<any> {
    const orgData = {
      id: `${this.testDataPrefix}org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Test Organization ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
      description: 'Test organization for integration testing',
      avatar_url: null,
      metadata: {},
      settings: {},
      ...overrides
    }
    
    const { data, error } = await this.client
      .from('organizations')
      .insert(orgData)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create test organization: ${error.message}`)
    }
    
    return data
  }
  
  /**
   * Create test organization membership
   */
  async createTestMembership(userId: string, organizationId: string, role: string = 'member'): Promise<any> {
    const membershipData = {
      id: `${this.testDataPrefix}membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      organization_id: organizationId,
      role,
      status: 'active',
      joined_at: new Date().toISOString()
    }
    
    const { data, error } = await this.client
      .from('organization_memberships')
      .insert(membershipData)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create test membership: ${error.message}`)
    }
    
    return data
  }
  
  /**
   * Verify database connection and schema
   */
  async verifyDatabaseConnection(): Promise<boolean> {
    try {
      // Test basic connection
      const { data, error } = await this.client
        .from('users')
        .select('count')
        .limit(1)
      
      if (error) {
        console.error('Database connection test failed:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Database connection verification failed:', error)
      return false
    }
  }
  
  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(): Promise<{
    userCount: number
    organizationCount: number
    membershipCount: number
    sessionCount: number
  }> {
    const [users, orgs, memberships, sessions] = await Promise.all([
      this.client.from('users').select('count', { count: 'exact' }),
      this.client.from('organizations').select('count', { count: 'exact' }),
      this.client.from('organization_memberships').select('count', { count: 'exact' }),
      this.client.from('user_sessions').select('count', { count: 'exact' })
    ])
    
    return {
      userCount: users.count || 0,
      organizationCount: orgs.count || 0,
      membershipCount: memberships.count || 0,
      sessionCount: sessions.count || 0
    }
  }
}

/**
 * Global test database manager instance
 */
export const testDb = new TestDatabaseManager()

/**
 * Setup function for integration tests
 */
export async function setupIntegrationTest(): Promise<{
  testDb: TestDatabaseManager
  cleanup: () => Promise<void>
}> {
  // Verify database connection
  const isConnected = await testDb.verifyDatabaseConnection()
  if (!isConnected) {
    throw new Error('Cannot connect to test database. Please check your TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY environment variables.')
  }
  
  // Clean up any existing test data
  await testDb.cleanupTestData()
  
  return {
    testDb,
    cleanup: async () => {
      await testDb.cleanupTestData()
    }
  }
}

/**
 * Test environment validation
 */
export function validateTestEnvironment(): void {
  if (!TEST_SUPABASE_URL || !TEST_SUPABASE_ANON_KEY) {
    throw new Error(`
Test database configuration is missing. Please set the following environment variables:

- TEST_SUPABASE_URL: Your test Supabase project URL
- TEST_SUPABASE_ANON_KEY: Your test Supabase anon key
- TEST_SUPABASE_SERVICE_KEY: Your test Supabase service role key (optional)

You can use the same values as your development database for testing, or set up a separate test database.
    `)
  }
  
  // Warn if using production database
  if (TEST_SUPABASE_URL.includes('supabase.co') && !TEST_SUPABASE_URL.includes('test')) {
    console.warn(`
⚠️  WARNING: You appear to be using a production Supabase database for testing.
   This is not recommended as tests will create and delete data.
   Consider setting up a separate test database or using a local Supabase instance.
    `)
  }
}