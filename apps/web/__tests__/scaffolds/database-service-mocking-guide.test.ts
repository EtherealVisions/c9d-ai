/**
 * Database Service Mocking Guide and Test Scaffold
 * Provides proper patterns for mocking Supabase clients in service tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Comprehensive Supabase client mock factory
export function createMockSupabaseClient() {
  // Create individual mock functions for each query method
  const mockSelect = vi.fn().mockReturnThis()
  const mockInsert = vi.fn().mockReturnThis()
  const mockUpdate = vi.fn().mockReturnThis()
  const mockDelete = vi.fn().mockReturnThis()
  const mockEq = vi.fn().mockReturnThis()
  const mockNeq = vi.fn().mockReturnThis()
  const mockIn = vi.fn().mockReturnThis()
  const mockOrder = vi.fn().mockReturnThis()
  const mockLimit = vi.fn().mockReturnThis()
  const mockSingle = vi.fn()
  const mockMaybeSingle = vi.fn()

  // Create the query builder chain
  const createQueryBuilder = () => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    neq: mockNeq,
    in: mockIn,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybeSingle
  })

  // Main client mock
  const mockClient = {
    from: vi.fn(() => createQueryBuilder()),
    // Expose mocks for test setup
    _mocks: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      neq: mockNeq,
      in: mockIn,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle
    }
  }

  return mockClient
}

// Mock the database module
vi.mock('@/lib/database', () => ({
  createSupabaseClient: () => createMockSupabaseClient()
}))

// Example service test using proper mocking
describe('Database Service Mocking Guide', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
  })

  describe('Proper Supabase Mocking Patterns', () => {
    it('should mock successful data retrieval', async () => {
      const mockData = { id: '1', name: 'Test User' }

      // Setup the mock chain properly
      mockSupabase._mocks.single.mockResolvedValue({
        data: mockData,
        error: null
      })

      // Simulate service call
      const { data, error } = await mockSupabase
        .from('users')
        .select('*')
        .eq('id', '1')
        .single()

      expect(data).toEqual(mockData)
      expect(error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should mock database errors', async () => {
      const mockError = { message: 'Connection failed', code: 'CONNECTION_ERROR' }

      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: mockError
      })

      const { data, error } = await mockSupabase
        .from('users')
        .select('*')
        .eq('id', '1')
        .single()

      expect(data).toBeNull()
      expect(error).toEqual(mockError)
    })

    it('should mock insert operations', async () => {
      const insertData = { name: 'New User', email: 'user@example.com' }
      const mockResult = { id: '123', ...insertData }

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockResult,
        error: null
      })

      const { data, error } = await mockSupabase
        .from('users')
        .insert(insertData)
        .select()
        .single()

      expect(data).toEqual(mockResult)
      expect(error).toBeNull()
      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(insertData)
    })

    it('should mock update operations', async () => {
      const updateData = { name: 'Updated User' }
      const mockResult = { id: '123', ...updateData }

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockResult,
        error: null
      })

      const { data, error } = await mockSupabase
        .from('users')
        .update(updateData)
        .eq('id', '123')
        .select()
        .single()

      expect(data).toEqual(mockResult)
      expect(error).toBeNull()
      expect(mockSupabase._mocks.update).toHaveBeenCalledWith(updateData)
      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('id', '123')
    })

    it('should mock complex query chains', async () => {
      const mockResults = [
        { id: '1', name: 'User 1', status: 'active' },
        { id: '2', name: 'User 2', status: 'active' }
      ]

      // For queries that don't use .single(), mock the promise directly
      const mockQuery = mockSupabase.from('users')
      vi.mocked(mockQuery.select().eq().order()).mockResolvedValue({
        data: mockResults,
        error: null
      })

      const { data, error } = await mockSupabase
        .from('users')
        .select('*')
        .eq('status', 'active')
        .order('name')

      expect(data).toEqual(mockResults)
      expect(error).toBeNull()
    })

    it('should handle not found scenarios', async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      })

      const { data, error } = await mockSupabase
        .from('users')
        .select('*')
        .eq('id', 'nonexistent')
        .single()

      expect(data).toBeNull()
      expect(error?.code).toBe('PGRST116')
    })
  })

  describe('Service Layer Testing Patterns', () => {
    it('should test service methods with proper error handling', async () => {
      // Example service method test pattern
      const testServiceMethod = async (userId: string) => {
        try {
          const { data, error } = await mockSupabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

          if (error) {
            throw new Error(`Database error: ${error.message}`)
          }

          return data
        } catch (error) {
          throw new Error(`Service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Test successful case
      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: { id: 'user-123', name: 'Test User' },
        error: null
      })

      const result = await testServiceMethod('user-123')
      expect(result).toEqual({ id: 'user-123', name: 'Test User' })

      // Test error case
      mockSupabase._mocks.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection failed' }
      })

      await expect(testServiceMethod('user-123')).rejects.toThrow('Database error: Connection failed')
    })
  })

  describe('Mock Reset and Cleanup', () => {
    it('should properly reset mocks between tests', () => {
      // Verify mocks are clean
      expect(mockSupabase._mocks.single).not.toHaveBeenCalled()
      expect(mockSupabase.from).not.toHaveBeenCalled()

      // Use mocks
      mockSupabase.from('test').select('*').single()

      // Verify usage
      expect(mockSupabase.from).toHaveBeenCalledWith('test')
      expect(mockSupabase._mocks.select).toHaveBeenCalledWith('*')
    })
  })
})