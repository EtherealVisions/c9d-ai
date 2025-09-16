/**
 * Emergency Mock Infrastructure Fix
 * Addresses critical mock chaining failures causing widespread test failures
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Fixed Supabase Mock Implementation
export function createFixedSupabaseMock() {
  const mockSingle = vi.fn()
  const mockMaybeSingle = vi.fn()
  
  // Create properly chained mock methods
  const createChainableMock = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: mockSingle,
    maybeSingle: mockMaybeSingle
  })
  
  const mockFrom = vi.fn(() => createChainableMock())
  
  return {
    from: mockFrom,
    _mocks: {
      from: mockFrom,
      single: mockSingle,
      maybeSingle: mockMaybeSingle
    }
  }
}

// Fixed Clerk Auth Mock Implementation  
export function createFixedClerkMock(options: {
  userId?: string
  orgId?: string
  isAuthenticated?: boolean
} = {}) {
  const {
    userId = 'test-user-id',
    orgId = 'test-org-id', 
    isAuthenticated = true
  } = options
  
  return {
    auth: vi.fn(() => ({
      userId: isAuthenticated ? userId : null,
      orgId: isAuthenticated ? orgId : null,
      sessionId: isAuthenticated ? 'test-session-id' : null
    })),
    useAuth: vi.fn(() => ({
      isLoaded: true,
      userId: isAuthenticated ? userId : null,
      orgId: isAuthenticated ? orgId : null,
      isSignedIn: isAuthenticated
    })),
    useUser: vi.fn(() => ({
      user: isAuthenticated ? {
        id: userId,
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User'
      } : null,
      isLoaded: true
    }))
  }
}

// Fixed Phase.dev Mock Implementation
export function createFixedPhaseMock(options: {
  shouldSucceed?: boolean
  mockData?: Record<string, string>
} = {}) {
  const { shouldSucceed = true, mockData = {} } = options
  
  return {
    loadFromPhase: vi.fn().mockResolvedValue({
      success: shouldSucceed,
      source: shouldSucceed ? 'phase.dev' : 'fallback',
      data: shouldSucceed ? mockData : {},
      error: shouldSucceed ? null : 'Mock error'
    })
  }
}

describe('Mock Infrastructure Emergency Fix', () => {
  describe('Supabase Mock Chaining', () => {
    it('should properly chain database operations', () => {
      const mockSupabase = createFixedSupabaseMock()
      
      // Test method chaining
      const query = mockSupabase.from('users')
        .select('*')
        .eq('id', 'test-id')
        .order('created_at')
      
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(query.single).toBeDefined()
      expect(typeof query.single).toBe('function')
    })
    
    it('should handle mock responses correctly', async () => {
      const mockSupabase = createFixedSupabaseMock()
      const mockData = { id: 'test-id', name: 'Test User' }
      
      // Setup mock response
      mockSupabase._mocks.single.mockResolvedValue({
        data: mockData,
        error: null
      })
      
      // Execute query
      const result = await mockSupabase.from('users')
        .select('*')
        .eq('id', 'test-id')
        .single()
      
      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })
    
    it('should handle error responses correctly', async () => {
      const mockSupabase = createFixedSupabaseMock()
      const mockError = { message: 'Not found', code: 'PGRST116' }
      
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: mockError
      })
      
      const result = await mockSupabase.from('users')
        .select('*')
        .eq('id', 'nonexistent')
        .single()
      
      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })
  
  describe('Clerk Auth Mock', () => {
    it('should provide authenticated user state', () => {
      const mockClerk = createFixedClerkMock({
        userId: 'user-123',
        orgId: 'org-456',
        isAuthenticated: true
      })
      
      const authResult = mockClerk.auth()
      expect(authResult.userId).toBe('user-123')
      expect(authResult.orgId).toBe('org-456')
      expect(authResult.sessionId).toBe('test-session-id')
    })
    
    it('should provide unauthenticated state', () => {
      const mockClerk = createFixedClerkMock({
        isAuthenticated: false
      })
      
      const authResult = mockClerk.auth()
      expect(authResult.userId).toBeNull()
      expect(authResult.orgId).toBeNull()
      expect(authResult.sessionId).toBeNull()
    })
    
    it('should provide user hook data', () => {
      const mockClerk = createFixedClerkMock({
        userId: 'user-123',
        isAuthenticated: true
      })
      
      const userResult = mockClerk.useUser()
      expect(userResult.user).toBeDefined()
      expect(userResult.user?.id).toBe('user-123')
      expect(userResult.isLoaded).toBe(true)
    })
  })
  
  describe('Phase.dev Mock', () => {
    it('should provide successful environment loading', async () => {
      const mockPhase = createFixedPhaseMock({
        shouldSucceed: true,
        mockData: { 
          DATABASE_URL: 'mock://database',
          API_KEY: 'mock-api-key'
        }
      })
      
      const result = await mockPhase.loadFromPhase()
      
      expect(result.success).toBe(true)
      expect(result.source).toBe('phase.dev')
      expect(result.data).toEqual({
        DATABASE_URL: 'mock://database',
        API_KEY: 'mock-api-key'
      })
    })
    
    it('should handle loading failures', async () => {
      const mockPhase = createFixedPhaseMock({
        shouldSucceed: false
      })
      
      const result = await mockPhase.loadFromPhase()
      
      expect(result.success).toBe(false)
      expect(result.source).toBe('fallback')
      expect(result.error).toBe('Mock error')
    })
  })
  
  describe('Integration Testing', () => {
    it('should work together in service tests', async () => {
      const mockSupabase = createFixedSupabaseMock()
      const mockClerk = createFixedClerkMock()
      const mockPhase = createFixedPhaseMock()
      
      // Setup service test scenario
      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: 'user-123', email: 'test@example.com' },
        error: null
      })
      
      // Simulate service call
      const authResult = mockClerk.auth()
      const phaseResult = await mockPhase.loadFromPhase()
      const dbResult = await mockSupabase.from('users')
        .select('*')
        .eq('id', authResult.userId)
        .single()
      
      // Verify integration
      expect(authResult.userId).toBe('test-user-id')
      expect(phaseResult.success).toBe(true)
      expect(dbResult.data).toBeDefined()
      expect(dbResult.error).toBeNull()
    })
  })
})

// Export for use in other tests
export const MockInfrastructure = {
  createFixedSupabaseMock,
  createFixedClerkMock,
  createFixedPhaseMock
}