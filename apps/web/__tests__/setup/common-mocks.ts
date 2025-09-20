/**
 * Common mock configurations to fix widespread test failures
 * This file provides standardized mocks that prevent common issues across the test suite
 */

import { vi } from 'vitest'

/**
 * Mock NextResponse to prevent constructor and method issues
 */
export function mockNextResponse() {
  vi.mock('next/server', async () => {
    const actual = await vi.importActual('next/server')
    
    // Create a proper NextResponse mock that can be used as constructor
    const MockNextResponse = function(body: any, init?: ResponseInit) {
      return {
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(body || ''),
        status: init?.status || 200,
        headers: new Headers(init?.headers),
        ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300
      }
    }
    
    // Add static methods
    MockNextResponse.json = vi.fn((data, init) => ({
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
      status: init?.status || 200,
      headers: new Headers(init?.headers),
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300
    }))
    
    MockNextResponse.next = vi.fn(() => ({
      status: 200,
      headers: new Headers(),
      ok: true
    }))
    
    return {
      ...actual,
      NextResponse: MockNextResponse
    }
  })
}

/**
 * Mock Supabase client to prevent database connection issues
 */
export function mockSupabaseClient() {
  const mockSelect = vi.fn().mockReturnThis()
  const mockInsert = vi.fn().mockReturnThis()
  const mockUpdate = vi.fn().mockReturnThis()
  const mockDelete = vi.fn().mockReturnThis()
  const mockUpsert = vi.fn().mockReturnThis()
  const mockEq = vi.fn().mockReturnThis()
  const mockIn = vi.fn().mockReturnThis()
  const mockGt = vi.fn().mockReturnThis()
  const mockLt = vi.fn().mockReturnThis()
  const mockOrder = vi.fn().mockReturnThis()
  const mockLimit = vi.fn().mockReturnThis()
  const mockSingle = vi.fn()
  const mockMaybe = vi.fn()

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    upsert: mockUpsert,
    eq: mockEq,
    in: mockIn,
    gt: mockGt,
    lt: mockLt,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybe
  }))

  return {
    from: mockFrom,
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    },
    // Expose mocks for test setup
    _mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      upsert: mockUpsert,
      eq: mockEq,
      in: mockIn,
      gt: mockGt,
      lt: mockLt,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybe
    }
  }
}

/**
 * Mock Clerk authentication to prevent auth issues
 */
export function mockClerkAuth(userId?: string, orgId?: string) {
  vi.mock('@clerk/nextjs/server', () => ({
    auth: vi.fn(() => ({
      userId: userId || 'test-user-id',
      orgId: orgId || 'test-org-id',
      sessionId: 'test-session-id'
    })),
    currentUser: vi.fn(() => ({
      id: userId || 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User'
    }))
  }))

  vi.mock('@clerk/nextjs', () => ({
    useAuth: vi.fn(() => ({
      isLoaded: true,
      userId: userId || 'test-user-id',
      orgId: orgId || 'test-org-id',
      isSignedIn: true
    })),
    useUser: vi.fn(() => ({
      isLoaded: true,
      user: {
        id: userId || 'test-user-id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User'
      }
    })),
    SignIn: vi.fn(() => null),
    SignUp: vi.fn(() => null),
    UserButton: vi.fn(() => null)
  }))
}

/**
 * Mock fetch to prevent network issues
 */
export function mockFetch() {
  const mockFetch = vi.fn()
  
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers()
  })
  
  global.fetch = mockFetch
  return mockFetch
}

/**
 * Mock console methods to prevent noise in tests
 */
export function mockConsole() {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
}

/**
 * Mock window and DOM APIs
 */
export function mockWindowAPIs() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  })

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  })
}

/**
 * Apply all common mocks - use this in vitest.setup.ts
 */
export function setupCommonMocks() {
  mockConsole()
  mockWindowAPIs()
  mockFetch()
}