/**
 * Emergency fix for Supabase client mocking infrastructure
 * Addresses critical mock chain method failures
 */

import { vi } from 'vitest'

export function createMockSupabaseClient() {
  // Create a comprehensive mock query object with proper chaining
  const createMockQuery = () => {
    const mockQuery = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      or: vi.fn(),
      like: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      mockResolvedValue: vi.fn(),
      mockResolvedValueOnce: vi.fn()
    }

    // Set up proper chaining - each method returns the query object
    mockQuery.select.mockReturnValue(mockQuery)
    mockQuery.insert.mockReturnValue(mockQuery)
    mockQuery.update.mockReturnValue(mockQuery)
    mockQuery.delete.mockReturnValue(mockQuery)
    mockQuery.eq.mockReturnValue(mockQuery)
    mockQuery.neq.mockReturnValue(mockQuery)
    mockQuery.or.mockReturnValue(mockQuery)
    mockQuery.like.mockReturnValue(mockQuery)
    mockQuery.order.mockReturnValue(mockQuery)
    mockQuery.limit.mockReturnValue(mockQuery)

    // Set up default resolved values
    mockQuery.single.mockResolvedValue({ data: null, error: null })
    mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
    mockQuery.mockResolvedValue.mockResolvedValue({ data: [], error: null })
    
    // Set up mockResolvedValueOnce to work with chaining
    mockQuery.mockResolvedValueOnce.mockImplementation((value) => {
      mockQuery.single.mockResolvedValueOnce(value)
      return mockQuery
    })

    return mockQuery
  }

  const mockSupabase = {
    from: vi.fn(() => createMockQuery()),
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user' } }, 
        error: null 
      }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    }
  }

  return mockSupabase
}

export function createMockQueryBuilder() {
  return createMockSupabaseClient().from
}

// Helper to create specific mock responses
export function mockSupabaseResponse(data: any, error: any = null) {
  return { data, error }
}

// Helper to create mock error responses
export function mockSupabaseError(message: string, code: string = 'GENERIC_ERROR') {
  return { data: null, error: { message, code } }
}

// Helper for not found errors
export function mockNotFoundError() {
  return mockSupabaseError('Not found', 'PGRST116')
}

// Helper for database errors
export function mockDatabaseError(message: string = 'Database error') {
  return mockSupabaseError(message, 'DATABASE_ERROR')
}