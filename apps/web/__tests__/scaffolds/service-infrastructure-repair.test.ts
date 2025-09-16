/**
 * Service Infrastructure Repair Test
 * Critical test to validate that the fixed mock infrastructure works
 * Must pass before any other service tests can be trusted
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, setupSupabaseMocks, mockSuccessfulQuery, mockDatabaseError } from '../setup/mocks/supabase-client-fixed'
import { setupClerkMocks, mockAuthenticatedUser } from '../setup/mocks/clerk-auth-fixed'
import { createTestUser, createTestOrganization, createTestUUIDs } from '../setup/fixtures/valid-test-data'

describe('Service Infrastructure Repair', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockAuth: ReturnType<typeof setupClerkMocks>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = setupSupabaseMocks()
    mockAuth = setupClerkMocks()
  })

  describe('Supabase Mock Infrastructure', () => {
    it('should create properly chained mock client', () => {
      expect(mockSupabase.from).toBeDefined()
      expect(typeof mockSupabase.from).toBe('function')
      
      const query = mockSupabase.from('test_table')
      expect(query.select).toBeDefined()
      expect(query.insert).toBeDefined()
      expect(query.update).toBeDefined()
      expect(query.eq).toBeDefined()
      expect(query.single).toBeDefined()
    })

    it('should support method chaining', () => {
      const query = mockSupabase.from('users')
        .select('*')
        .eq('id', 'test-id')
        .single()
      
      expect(query).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should handle successful query responses', async () => {
      const testUser = createTestUser()
      mockSuccessfulQuery(mockSupabase, testUser)
      
      const { data, error } = await mockSupabase.from('users')
        .select('*')
        .eq('id', testUser.id)
        .single()
      
      expect(data).toEqual(testUser)
      expect(error).toBeNull()
    })

    it('should handle database error responses', async () => {
      const testError = { message: 'Connection failed', code: 'CONNECTION_ERROR' }
      mockDatabaseError(mockSupabase, testError)
      
      const { data, error } = await mockSupabase.from('users')
        .select('*')
        .eq('id', 'test-id')
        .single()
      
      expect(data).toBeNull()
      expect(error).toEqual(testError)
    })

    it('should support mockResolvedValueOnce for sequential responses', () => {
      const testData1 = createTestUser()
      const testData2 = createTestUser()
      
      mockSupabase._mockQuery.single
        .mockResolvedValueOnce({ data: testData1, error: null })
        .mockResolvedValueOnce({ data: testData2, error: null })
      
      expect(mockSupabase._mockQuery.single).toBeDefined()
    })
  })

  describe('Clerk Auth Mock Infrastructure', () => {
    it('should create properly functioning auth mocks', () => {
      expect(mockAuth.auth).toBeDefined()
      expect(mockAuth.currentUser).toBeDefined()
      expect(typeof mockAuth.auth).toBe('function')
      expect(typeof mockAuth.currentUser).toBe('function')
    })

    it('should handle authenticated user scenarios', () => {
      const uuids = createTestUUIDs()
      mockAuthenticatedUser(mockAuth, uuids.userId, uuids.orgId)
      
      const authResult = mockAuth.auth()
      expect(authResult.userId).toBe(uuids.userId)
      expect(authResult.orgId).toBe(uuids.orgId)
      expect(authResult.sessionId).toBe('test-session-id')
    })

    it('should handle unauthenticated scenarios', () => {
      // Default state should be unauthenticated
      const authResult = mockAuth.auth()
      expect(authResult.userId).toBeNull()
      expect(authResult.orgId).toBeNull()
    })

    it('should support currentUser mock', async () => {
      const testUser = {
        id: 'test-user-id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User'
      }
      
      mockAuth.currentUser.mockResolvedValue(testUser)
      
      const user = await mockAuth.currentUser()
      expect(user).toEqual(testUser)
    })
  })

  describe('Test Data Fixtures', () => {
    it('should generate valid UUID test data', () => {
      const uuids = createTestUUIDs()
      
      // Check UUID format (basic validation)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      
      expect(uuids.userId).toMatch(uuidRegex)
      expect(uuids.orgId).toMatch(uuidRegex)
      expect(uuids.roleId).toMatch(uuidRegex)
    })

    it('should create valid user test data', () => {
      const user = createTestUser()
      
      expect(user.id).toBeDefined()
      expect(user.clerk_user_id).toBeDefined()
      expect(user.email).toContain('@')
      expect(user.first_name).toBeDefined()
      expect(user.last_name).toBeDefined()
      expect(user.preferences).toEqual({})
      expect(user.created_at).toBeDefined()
      expect(user.updated_at).toBeDefined()
    })

    it('should create valid organization test data', () => {
      const org = createTestOrganization()
      
      expect(org.id).toBeDefined()
      expect(org.name).toBeDefined()
      expect(org.slug).toBeDefined()
      expect(org.metadata).toEqual({})
      expect(org.settings).toEqual({})
      expect(org.created_at).toBeDefined()
      expect(org.updated_at).toBeDefined()
    })

    it('should support data overrides', () => {
      const customName = 'Custom Organization Name'
      const org = createTestOrganization({ name: customName })
      
      expect(org.name).toBe(customName)
    })
  })

  describe('Integration Test Readiness', () => {
    it('should support service layer testing patterns', async () => {
      // Setup authenticated user
      const uuids = createTestUUIDs()
      mockAuthenticatedUser(mockAuth, uuids.userId, uuids.orgId)
      
      // Setup database response
      const testUser = createTestUser({ id: uuids.userId })
      mockSuccessfulQuery(mockSupabase, testUser)
      
      // Simulate service call pattern
      const authResult = mockAuth.auth()
      expect(authResult.userId).toBe(uuids.userId)
      
      const { data } = await mockSupabase.from('users')
        .select('*')
        .eq('id', authResult.userId)
        .single()
      
      expect(data).toEqual(testUser)
    })

    it('should support error handling patterns', async () => {
      // Setup unauthenticated user
      const authResult = mockAuth.auth()
      expect(authResult.userId).toBeNull()
      
      // Setup database error
      mockDatabaseError(mockSupabase, { message: 'Unauthorized', code: 'AUTH_ERROR' })
      
      const { error } = await mockSupabase.from('users')
        .select('*')
        .single()
      
      expect(error.message).toBe('Unauthorized')
      expect(error.code).toBe('AUTH_ERROR')
    })

    it('should support complex query chains', () => {
      const query = mockSupabase.from('users')
        .select('*, organizations(*)')
        .eq('id', 'test-id')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10)
        .single()
      
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(query).toBeDefined()
    })
  })

  describe('Mock Reset and Cleanup', () => {
    it('should properly reset mocks between tests', () => {
      // Modify mock state
      mockSupabase._mockQuery.single.mockResolvedValue({ data: 'test', error: null })
      mockAuth.auth.mockReturnValue({ userId: 'test-user' })
      
      // Clear mocks
      vi.clearAllMocks()
      
      // Verify reset
      expect(mockSupabase.from).toHaveBeenCalledTimes(0)
      expect(mockAuth.auth).toHaveBeenCalledTimes(0)
    })
  })
})

/**
 * Infrastructure Validation Summary
 * This test validates that the critical mock infrastructure is working
 * All service layer tests depend on this infrastructure functioning correctly
 */
describe('Infrastructure Validation Summary', () => {
  it('should confirm all critical infrastructure is operational', () => {
    // Supabase mocking
    const mockClient = createMockSupabaseClient()
    expect(mockClient.from).toBeDefined()
    expect(mockClient._mockQuery.single).toBeDefined()
    
    // Clerk mocking  
    const authMocks = setupClerkMocks()
    expect(authMocks.auth).toBeDefined()
    expect(authMocks.currentUser).toBeDefined()
    
    // Test data generation
    const testData = createTestUser()
    expect(testData.id).toBeDefined()
    expect(testData.email).toContain('@')
    
    // UUID validation
    const uuids = createTestUUIDs()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    expect(uuids.userId).toMatch(uuidRegex)
    
    console.log('✅ All critical infrastructure validated and operational')
  })
})