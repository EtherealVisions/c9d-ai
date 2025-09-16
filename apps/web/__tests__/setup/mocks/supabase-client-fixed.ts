/**
 * Fixed Supabase Client Mock Infrastructure
 * Addresses critical mock chain failures in service layer tests
 */

import { vi } from 'vitest'

export interface MockQuery {
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
  mockResolvedValue: ReturnType<typeof vi.fn>
  mockResolvedValueOnce: ReturnType<typeof vi.fn>
  mockRejectedValue: ReturnType<typeof vi.fn>
  mockRejectedValueOnce: ReturnType<typeof vi.fn>
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>
  _mockQuery: MockQuery
}

/**
 * Creates a properly chained Supabase mock client
 * Fixes the "mockResolvedValueOnce is not a function" errors
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  // Create mock methods that return 'this' for chaining
  const mockQuery: MockQuery = {
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
    single: vi.fn(),
    maybeSingle: vi.fn(),
    mockResolvedValue: vi.fn(),
    mockResolvedValueOnce: vi.fn(),
    mockRejectedValue: vi.fn(),
    mockRejectedValueOnce: vi.fn()
  }

  // Setup default responses
  mockQuery.single.mockResolvedValue({ data: null, error: null })
  mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null })

  // Add mock methods to the query object for direct access
  mockQuery.mockResolvedValue.mockImplementation((value) => {
    mockQuery.single.mockResolvedValue(value)
    return mockQuery
  })

  mockQuery.mockResolvedValueOnce.mockImplementation((value) => {
    mockQuery.single.mockResolvedValueOnce(value)
    return mockQuery
  })

  mockQuery.mockRejectedValue.mockImplementation((error) => {
    mockQuery.single.mockRejectedValue(error)
    return mockQuery
  })

  mockQuery.mockRejectedValueOnce.mockImplementation((error) => {
    mockQuery.single.mockRejectedValueOnce(error)
    return mockQuery
  })

  const mockFrom = vi.fn(() => mockQuery)

  return {
    from: mockFrom,
    _mockQuery: mockQuery
  }
}

/**
 * Setup helper for service tests
 * Provides consistent mock configuration
 */
export function setupSupabaseMocks() {
  const mockClient = createMockSupabaseClient()
  
  // Mock the database module
  vi.mock('@/lib/database', () => ({
    createSupabaseClient: () => mockClient
  }))

  return mockClient
}

/**
 * Helper to setup successful database responses
 */
export function mockSuccessfulQuery(mockClient: MockSupabaseClient, data: any) {
  mockClient._mockQuery.single.mockResolvedValueOnce({
    data,
    error: null
  })
}

/**
 * Helper to setup database error responses
 */
export function mockDatabaseError(mockClient: MockSupabaseClient, error: any) {
  mockClient._mockQuery.single.mockResolvedValueOnce({
    data: null,
    error
  })
}

/**
 * Helper to setup not found responses
 */
export function mockNotFound(mockClient: MockSupabaseClient) {
  mockClient._mockQuery.single.mockResolvedValueOnce({
    data: null,
    error: { code: 'PGRST116', message: 'Not found' }
  })
}

/**
 * Reset all mocks to clean state
 */
export function resetSupabaseMocks(mockClient: MockSupabaseClient) {
  vi.clearAllMocks()
  
  // Reset to default responses
  mockClient._mockQuery.single.mockResolvedValue({ data: null, error: null })
  mockClient._mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
}