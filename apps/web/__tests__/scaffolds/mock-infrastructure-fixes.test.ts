/**
 * Mock Infrastructure Fixes
 * Provides standardized mock factories for consistent testing
 */

import { vi } from 'vitest'

// Standardized Supabase Mock Factory
export function createStandardSupabaseMock() {
  const mockSingle = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockLimit = vi.fn()

  // Create chainable mock structure
  const createChainableMock = () => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybeSingle
  })

  // Configure all methods to return chainable mock
  mockSelect.mockReturnValue(createChainableMock())
  mockInsert.mockReturnValue(createChainableMock())
  mockUpdate.mockReturnValue(createChainableMock())
  mockDelete.mockReturnValue(createChainableMock())
  mockEq.mockReturnValue(createChainableMock())
  mockOrder.mockReturnValue(createChainableMock())
  mockLimit.mockReturnValue(createChainableMock())

  const mockFrom = vi.fn(() => createChainableMock())

  return {
    from: mockFrom,
    _mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle
    }
  }
}

// Progress Tracker Service Mock Helpers
export function setupProgressTrackerMocks(mockSupabase: any) {
  // Mock successful progress creation
  mockSupabase._mocks.single
    .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // No existing record
    .mockResolvedValueOnce({ 
      data: { 
        id: 'progress-123',
        session_id: 'session-123',
        step_id: 'step-456',
        status: 'in_progress',
        onboarding_steps: {},
        onboarding_sessions: {}
      }, 
      error: null 
    })

  return mockSupabase
}

// Path Engine Mock Helpers
export function setupPathEngineMocks(mockSupabase: any) {
  // Mock path generation success
  mockSupabase._mocks.single
    .mockResolvedValueOnce({
      data: [{
        id: 'path-123',
        name: 'Test Path',
        steps: []
      }],
      error: null
    })
    .mockResolvedValueOnce({
      data: { preferences: {} },
      error: null
    })
    .mockResolvedValueOnce({
      data: [],
      error: null
    })

  return mockSupabase
}

// Organization Onboarding Mock Helpers
export function setupOrganizationOnboardingMocks(mockSupabase: any) {
  // Mock organization config operations
  mockSupabase._mocks.single
    .mockResolvedValue({
      data: {
        id: 'config-123',
        organization_id: 'org-123',
        is_active: true
      },
      error: null
    })

  return mockSupabase
}

// Error Response Mock Factory
export function createErrorResponse(statusCode: number, message: string) {
  return {
    data: null,
    error: {
      message,
      code: statusCode === 404 ? 'PGRST116' : 'DATABASE_ERROR'
    }
  }
}

// Success Response Mock Factory
export function createSuccessResponse(data: any) {
  return {
    data,
    error: null
  }
}