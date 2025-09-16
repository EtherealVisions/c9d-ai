/**
 * Fixed Supabase Client Mock - Version 2
 * Addresses critical mock infrastructure issues
 */

import { vi } from 'vitest'

export interface MockSupabaseQuery {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
  like: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>
  _mocks: {
    queries: Map<string, MockSupabaseQuery>
    resetAll: () => void
    setupTable: (tableName: string, config?: Partial<MockSupabaseQuery>) => MockSupabaseQuery
  }
}

/**
 * Creates a properly chained Supabase client mock
 * Fixes the method chaining issues in existing tests
 */
export function createFixedSupabaseClient(): MockSupabaseClient {
  const queries = new Map<string, MockSupabaseQuery>()

  const createQuery = (tableName?: string): MockSupabaseQuery => {
    const query: MockSupabaseQuery = {
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
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    }

    // Store query for later access if table name provided
    if (tableName) {
      queries.set(tableName, query)
    }

    return query
  }

  const mockFrom = vi.fn((tableName: string) => {
    // Return existing query for table or create new one
    return queries.get(tableName) || createQuery(tableName)
  })

  const client: MockSupabaseClient = {
    from: mockFrom,
    _mocks: {
      queries,
      resetAll: () => {
        queries.clear()
        mockFrom.mockClear()
      },
      setupTable: (tableName: string, config = {}) => {
        const query = createQuery(tableName)
        
        // Apply custom configuration
        Object.entries(config).forEach(([method, mockFn]) => {
          if (method in query && mockFn) {
            (query as any)[method] = mockFn
          }
        })

        return query
      }
    }
  }

  return client
}

/**
 * Helper to setup common database operation mocks
 */
export function setupDatabaseMocks(client: MockSupabaseClient) {
  return {
    // Setup successful select operation
    mockSelect: (tableName: string, data: any) => {
      const query = client._mocks.setupTable(tableName)
      query.single.mockResolvedValue({ data, error: null })
      return query
    },

    // Setup successful insert operation
    mockInsert: (tableName: string, data: any) => {
      const query = client._mocks.setupTable(tableName)
      query.single.mockResolvedValue({ data, error: null })
      return query
    },

    // Setup successful update operation
    mockUpdate: (tableName: string, data: any) => {
      const query = client._mocks.setupTable(tableName)
      query.single.mockResolvedValue({ data, error: null })
      return query
    },

    // Setup database error
    mockError: (tableName: string, error: any) => {
      const query = client._mocks.setupTable(tableName)
      query.single.mockResolvedValue({ data: null, error })
      return query
    },

    // Setup not found (PGRST116 error)
    mockNotFound: (tableName: string) => {
      const query = client._mocks.setupTable(tableName)
      query.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' }
      })
      return query
    }
  }
}

/**
 * Test helper for common service test patterns
 */
export function createServiceTestSetup() {
  const client = createFixedSupabaseClient()
  const helpers = setupDatabaseMocks(client)

  return {
    client,
    helpers,
    
    // Reset all mocks between tests
    reset: () => {
      client._mocks.resetAll()
    },

    // Quick setup for CRUD operations
    setupCrud: (tableName: string) => ({
      mockGet: (data: any) => helpers.mockSelect(tableName, data),
      mockCreate: (data: any) => helpers.mockInsert(tableName, data),
      mockUpdate: (data: any) => helpers.mockUpdate(tableName, data),
      mockError: (error: any) => helpers.mockError(tableName, error),
      mockNotFound: () => helpers.mockNotFound(tableName)
    })
  }
}