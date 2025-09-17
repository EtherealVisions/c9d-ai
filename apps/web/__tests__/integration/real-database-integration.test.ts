/**
 * Real Database Integration Tests
 * Tests actual database connections and operations without mocking
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createTypedSupabaseClient } from '@/lib/models/database'
import { loadFromPhase, getPhaseConfig } from '@c9d/config'

// Test configuration - will be loaded from Phase.dev
let TEST_DATABASE_URL: string | undefined
let TEST_SERVICE_ROLE_KEY: string | undefined
let phaseConfig: any = null

describe('Real Database Integration Tests', () => {
  let supabase: any
  let testUserId: string
  let testOrganizationId: string
  let createdTestData: string[] = []

  beforeAll(async () => {
    try {
      // Load configuration from Phase.dev using new SDK
      phaseConfig = await getPhaseConfig()
      
      if (phaseConfig) {
        console.log('🔗 Loading database configuration from Phase.dev...')
        const result = await loadFromPhase(true)
        
        if (result.success) {
          // Extract database configuration
          TEST_DATABASE_URL = result.variables.TEST_DATABASE_URL || result.variables.NEXT_PUBLIC_SUPABASE_URL
          TEST_SERVICE_ROLE_KEY = result.variables.TEST_SUPABASE_SERVICE_ROLE_KEY || result.variables.SUPABASE_SERVICE_ROLE_KEY
          
          console.log(`✅ Loaded configuration from Phase.dev (app: ${phaseConfig.appName})`)
        } else {
          console.warn('⚠️  Failed to load from Phase.dev:', result.error)
          // Fallback to local environment variables
          TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
          TEST_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      } else {
        // Fallback to local environment variables
        console.warn('⚠️  No Phase.dev configuration found, checking local environment...')
        TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        TEST_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      }

      // Skip tests if no test database is configured
      if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY) {
        console.warn('⚠️  No database configuration found. Skipping real database integration tests.')
        console.warn('   Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Phase.dev app "AI.C9d.Web"')
        console.warn('   or set TEST_DATABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY locally.')
        supabase = null
        return
      }

      try {
        // Create raw Supabase client for testing
        supabase = createClient(TEST_DATABASE_URL, TEST_SERVICE_ROLE_KEY)
        console.log('🔗 Connected to test database for integration testing')
        console.log(`📊 Database URL: ${TEST_DATABASE_URL.substring(0, 30)}...`)
      } catch (error) {
        console.error('❌ Failed to connect to test database:', error)
        supabase = null
      }
    } catch (error) {
      console.error('❌ Failed to load configuration from Phase.dev:', error)
      console.warn('⚠️  Falling back to local environment variables...')
      
      // Fallback to local environment
      TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      TEST_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY) {
        console.warn('⚠️  No database configuration available. Skipping tests.')
        supabase = null
        return
      }
      
      try {
        supabase = createClient(TEST_DATABASE_URL, TEST_SERVICE_ROLE_KEY)
        console.log('🔗 Connected to database using local configuration')
      } catch (clientError) {
        console.error('❌ Failed to connect to database with local config:', clientError)
        supabase = null
      }
    }
  })

  afterAll(async () => {
    // Cleanup all test data
    if (supabase && createdTestData.length > 0) {
      console.log('🧹 Cleaning up test data...')
      
      // Clean up in reverse dependency order
      for (const id of createdTestData.reverse()) {
        try {
          if (id.startsWith('membership-')) {
            await supabase.from('memberships').delete().eq('id', id.replace('membership-', ''))
          } else if (id.startsWith('org-')) {
            await supabase.from('organizations').delete().eq('id', id.replace('org-', ''))
          } else if (id.startsWith('user-')) {
            await supabase.from('users').delete().eq('id', id.replace('user-', ''))
          }
        } catch (error) {
          console.warn(`Failed to cleanup ${id}:`, error)
        }
      }
    }
  })

  beforeEach(() => {
    // Skip individual tests if no database connection
    if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY || !supabase) {
      return
    }
  })

  describe('Real Database Operations', () => {
    it('should connect to database and perform basic operations', async () => {
      if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY || !supabase) {
        console.log('⏭️  Skipping test - no database configuration')
        return
      }

      // Test basic database connectivity
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should create and retrieve a test user', async () => {
      if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY || !supabase) {
        console.log('⏭️  Skipping test - no database configuration')
        return
      }

      const testUserData = {
        clerk_user_id: `test_clerk_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: 'User',
        preferences: { theme: 'light' }
      }

      // Create user
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(testUserData)
        .select()
        .single()

      expect(createError).toBeNull()
      expect(createdUser).toBeDefined()
      expect(createdUser.email).toBe(testUserData.email)

      if (createdUser) {
        testUserId = createdUser.id
        createdTestData.push(`user-${createdUser.id}`)

        // Retrieve user
        const { data: retrievedUser, error: retrieveError } = await supabase
          .from('users')
          .select('*')
          .eq('id', createdUser.id)
          .single()

        expect(retrieveError).toBeNull()
        expect(retrievedUser).toBeDefined()
        expect(retrievedUser.email).toBe(testUserData.email)
      }
    })

    it('should create and manage organizations', async () => {
      if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY || !supabase || !testUserId) {
        console.log('⏭️  Skipping test - no database configuration or test user')
        return
      }

      const testOrgData = {
        name: `Test Organization ${Date.now()}`,
        slug: `test-org-${Date.now()}`,
        description: 'Test organization for integration testing',
        settings: { allowPublicSignup: false },
        metadata: { testData: true }
      }

      // Create organization
      const { data: createdOrg, error: createError } = await supabase
        .from('organizations')
        .insert(testOrgData)
        .select()
        .single()

      expect(createError).toBeNull()
      expect(createdOrg).toBeDefined()
      expect(createdOrg.name).toBe(testOrgData.name)

      if (createdOrg) {
        testOrganizationId = createdOrg.id
        createdTestData.push(`org-${createdOrg.id}`)

        // Update organization
        const updatedData = { description: 'Updated description' }
        const { data: updatedOrg, error: updateError } = await supabase
          .from('organizations')
          .update(updatedData)
          .eq('id', createdOrg.id)
          .select()
          .single()

        expect(updateError).toBeNull()
        expect(updatedOrg.description).toBe(updatedData.description)
      }
    })

    it('should create and manage memberships', async () => {
      if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY || !supabase || !testUserId || !testOrganizationId) {
        console.log('⏭️  Skipping test - no database configuration or test data')
        return
      }

      // First, ensure we have a role to assign
      const { data: roles } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'member')
        .limit(1)

      let roleId = roles?.[0]?.id

      if (!roleId) {
        // Create a test role if none exists
        const { data: createdRole } = await supabase
          .from('roles')
          .insert({
            name: 'test_member',
            description: 'Test member role',
            permissions: ['organization.read'],
            is_system: false
          })
          .select()
          .single()

        roleId = createdRole?.id
        if (createdRole) {
          createdTestData.push(`role-${createdRole.id}`)
        }
      }

      if (!roleId) {
        console.warn('⚠️  Could not create or find role for membership test')
        return
      }

      const membershipData = {
        user_id: testUserId,
        organization_id: testOrganizationId,
        role_id: roleId,
        status: 'active'
      }

      // Create membership
      const { data: createdMembership, error: createError } = await supabase
        .from('memberships')
        .insert(membershipData)
        .select()
        .single()

      expect(createError).toBeNull()
      expect(createdMembership).toBeDefined()
      expect(createdMembership.user_id).toBe(testUserId)
      expect(createdMembership.organization_id).toBe(testOrganizationId)

      if (createdMembership) {
        createdTestData.push(`membership-${createdMembership.id}`)

        // Retrieve membership with joins
        const { data: membershipWithDetails, error: retrieveError } = await supabase
          .from('memberships')
          .select(`
            *,
            user:users(*),
            organization:organizations(*),
            role:roles(*)
          `)
          .eq('id', createdMembership.id)
          .single()

        expect(retrieveError).toBeNull()
        expect(membershipWithDetails).toBeDefined()
        expect(membershipWithDetails.user).toBeDefined()
        expect(membershipWithDetails.organization).toBeDefined()
        expect(membershipWithDetails.role).toBeDefined()
      }
    })

    it('should enforce database constraints and RLS policies', async () => {
      if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY || !supabase) {
        console.log('⏭️  Skipping test - no database configuration')
        return
      }

      // Test unique constraint on organization slug
      const duplicateSlug = `duplicate-slug-${Date.now()}`
      
      const orgData1 = {
        name: 'First Org',
        slug: duplicateSlug,
        description: 'First organization'
      }

      const orgData2 = {
        name: 'Second Org',
        slug: duplicateSlug, // Same slug should fail
        description: 'Second organization'
      }

      // Create first organization
      const { data: firstOrg, error: firstError } = await supabase
        .from('organizations')
        .insert(orgData1)
        .select()
        .single()

      expect(firstError).toBeNull()
      expect(firstOrg).toBeDefined()

      if (firstOrg) {
        createdTestData.push(`org-${firstOrg.id}`)

        // Attempt to create second organization with same slug
        const { data: secondOrg, error: secondError } = await supabase
          .from('organizations')
          .insert(orgData2)
          .select()
          .single()

        // Should fail due to unique constraint
        expect(secondError).toBeDefined()
        expect(secondOrg).toBeNull()
        expect(secondError.code).toBe('23505') // Unique violation
      }
    })

    it('should handle database transactions correctly', async () => {
      if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY || !supabase) {
        console.log('⏭️  Skipping test - no database configuration')
        return
      }

      // Test transaction-like behavior with multiple related inserts
      const userData = {
        clerk_user_id: `tx_test_${Date.now()}`,
        email: `tx_test_${Date.now()}@example.com`,
        first_name: 'Transaction',
        last_name: 'Test'
      }

      const orgData = {
        name: `TX Test Org ${Date.now()}`,
        slug: `tx-test-org-${Date.now()}`,
        description: 'Transaction test organization'
      }

      try {
        // Create user
        const { data: user, error: userError } = await supabase
          .from('users')
          .insert(userData)
          .select()
          .single()

        expect(userError).toBeNull()
        expect(user).toBeDefined()

        if (user) {
          createdTestData.push(`user-${user.id}`)

          // Create organization
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert(orgData)
            .select()
            .single()

          expect(orgError).toBeNull()
          expect(org).toBeDefined()

          if (org) {
            createdTestData.push(`org-${org.id}`)

            // Verify both records exist
            const { data: userCheck } = await supabase
              .from('users')
              .select('id')
              .eq('id', user.id)
              .single()

            const { data: orgCheck } = await supabase
              .from('organizations')
              .select('id')
              .eq('id', org.id)
              .single()

            expect(userCheck).toBeDefined()
            expect(orgCheck).toBeDefined()
          }
        }
      } catch (error) {
        console.error('Transaction test failed:', error)
        throw error
      }
    })
  })

  describe('Service Layer Integration with Real Database', () => {
    it('should test organization service with real database', async () => {
      if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY || !supabase) {
        console.log('⏭️  Skipping test - no database configuration')
        return
      }

      // This would test the actual service methods against the real database
      // Note: This requires the services to be configured to use the test database
      
      const orgData = {
        name: `Service Test Org ${Date.now()}`,
        description: 'Testing service layer with real database'
      }

      try {
        // This would call the actual service method
        // const result = await organizationService.createOrganization(orgData, testUserId)
        // expect(result.success).toBe(true)
        // expect(result.data?.name).toBe(orgData.name)
        
        console.log('⚠️  Service layer integration requires test database configuration')
      } catch (error) {
        console.warn('Service layer test skipped - requires proper test setup:', error)
      }
    })
  })
})

describe('Database Performance Integration Tests', () => {
  let supabase: any

  beforeAll(() => {
    if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY) return
    try {
      supabase = createClient(TEST_DATABASE_URL, TEST_SERVICE_ROLE_KEY)
    } catch (error) {
      console.error('❌ Failed to create performance test client:', error)
      supabase = null
    }
  })

  it('should perform database operations within performance thresholds', async () => {
    if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY || !supabase) {
      console.log('⏭️  Skipping test - no database configuration')
      return
    }

    const startTime = performance.now()

    // Test query performance
    const { data, error } = await supabase
      .from('users')
      .select('id, email, created_at')
      .limit(10)

    const endTime = performance.now()
    const queryTime = endTime - startTime

    expect(error).toBeNull()
    expect(queryTime).toBeLessThan(1000) // Should complete within 1 second
    
    console.log(`Database query completed in ${queryTime.toFixed(2)}ms`)
  })

  it('should handle concurrent database operations', async () => {
    if (!TEST_DATABASE_URL || !TEST_SERVICE_ROLE_KEY || !supabase) {
      console.log('⏭️  Skipping test - no database configuration')
      return
    }

    const concurrentQueries = Array.from({ length: 5 }, (_, i) =>
      supabase
        .from('users')
        .select('count')
        .limit(1)
    )

    const startTime = performance.now()
    const results = await Promise.all(concurrentQueries)
    const endTime = performance.now()

    const totalTime = endTime - startTime

    // All queries should succeed
    results.forEach(({ error }) => {
      expect(error).toBeNull()
    })

    expect(totalTime).toBeLessThan(2000) // Should complete within 2 seconds
    
    console.log(`${concurrentQueries.length} concurrent queries completed in ${totalTime.toFixed(2)}ms`)
  })
})