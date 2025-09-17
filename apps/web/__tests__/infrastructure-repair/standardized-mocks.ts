/**
 * Standardized Mock Infrastructure
 * 
 * This module provides consistent, reliable mock patterns for all tests.
 * Fixes the mock chaining issues identified in the coverage analysis.
 */

import { vi } from 'vitest'

// ===================================================================
// SUPABASE MOCK INFRASTRUCTURE
// ===================================================================

export interface MockSupabaseResponse<T = any> {
  data: T | null
  error: any | null
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>
  auth: {
    getUser: ReturnType<typeof vi.fn>
    getSession: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
  }
  storage: {
    from: ReturnType<typeof vi.fn>
    upload: ReturnType<typeof vi.fn>
    download: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
  }
  _mocks: {
    [key: string]: ReturnType<typeof vi.fn>
  }
  _helpers: {
    mockSuccess: (data: any) => void
    mockError: (error: any) => void
    mockEmpty: () => void
    reset: () => void
  }
}

/**
 * Creates a properly chained Supabase mock client
 * Fixes all chaining issues seen in failing tests
 */
export function createStandardSupabaseMock(): MockSupabaseClient {
  // Create chainable object that returns itself for most methods
  const createChainableObject = (): any => {
    const chainable: any = {}
    
    // Add all methods to the chainable object
    const terminalMethods = ['select', 'insert', 'update', 'delete', 'upsert']
    terminalMethods.forEach(methodName => {
      chainable[methodName as keyof typeof chainable] = vi.fn()
      const method = chainable[methodName]
      const originalImpl = method.getMockImplementation()
      method.mockImplementation((...args) => {
        // Allow select, insert, update, delete to be terminal
        return chainable
      })
    })
    
    // Configure chainable methods to return chainable object
    Object.values(mocks).forEach(mock => {
      if (mock !== mocks.single && mock !== mocks.maybeSingle) {
        mock.mockReturnValue(chainable)
      }
    })
    
    // Configure terminal methods (methods that return promises)
    const defaultSupabaseResponse: MockSupabaseResponse = {
      data: null,
      error: null
    }
    
    mocks.single.mockResolvedValue(defaultSupabaseResponse)
    mocks.maybeSingle.mockResolvedValue(defaultSupabaseResponse)
    
    // Add promise methods for terminal usage
    chainable.then = (onResolve: any) => Promise.resolve(defaultSupabaseResponse).then(onResolve)
    chainable.catch = (onReject: any) => Promise.resolve(defaultSupabaseResponse).catch(onReject)
    chainable.finally = (onFinally: any) => Promise.resolve(defaultSupabaseResponse).finally(onFinally)
    
    return chainable
  }

  const mockFrom = vi.fn(() => createChainableObject())
  
  const mocks = {
    // Query building methods
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    like: vi.fn(),
    ilike: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    contains: vi.fn(),
    containedBy: vi.fn(),
    rangeGt: vi.fn(),
    rangeGte: vi.fn(),
    rangeLt: vi.fn(),
    rangeLte: vi.fn(),
    rangeAdjacent: vi.fn(),
    overlaps: vi.fn(),
    textSearch: vi.fn(),
    match: vi.fn(),
    not: vi.fn(),
    filter: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    abortSignal: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    csv: vi.fn(),
    geojson: vi.fn(),
    explain: vi.fn(),
    rollback: vi.fn()
  }

  // Configure chaining - each method returns chainable object
  Object.values(mocks).forEach(mock => {
    if (mock !== mocks.single && mock !== mocks.maybeSingle) {
      mock.mockReturnValue(createChainableObject())
    }
  })

  // Configure terminal methods to return success by default
  mocks.single.mockResolvedValueOnce({ data: null, error: null })
  mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

  const mockSupabaseClient: MockSupabaseClient = {
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    },
    storage: {
      from: mockFrom,
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null })
    },
    _mocks: mocks,
    _helpers: {
      mockSuccess: (data: any) => {
        mocks.single.mockResolvedValueOnce({ data, error: null })
        mocks.maybeSingle.mockResolvedValueOnce({ data, error: null })
      },
      mockError: (error: any) => {
        mocks.single.mockResolvedValueOnce({ data: null, error })
        mocks.maybeSingle.mockResolvedValueOnce({ data: null, error })
      },
      mockEmpty: () => {
        mocks.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      },
      reset: () => {
        Object.values(mocks).forEach(mock => {
          mock.mockClear()
        })
      }
    }
  }

  return mockSupabaseClient
}

// ===================================================================
// CLERK AUTH MOCK INFRASTRUCTURE  
// ===================================================================

export interface MockClerkUser {
  id: string
  emailAddresses: Array<{ emailAddress: string }>
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
}

export interface MockClerkSession {
  id: string
  user: MockClerkUser
  status: string
}

export interface MockClerkOrganization {
  id: string
  name: string
  slug: string
  membersCount: number
}

export interface MockClerkAuth {
  isSignedIn: boolean
  isLoaded: boolean
  userId: string | null
  user: MockClerkUser | null
  session: MockClerkSession | null
  organization: MockClerkOrganization | null
  signUp: {
    create: ReturnType<typeof vi.fn>
    prepareEmailAddressVerification: ReturnType<typeof vi.fn>
    attemptEmailAddressVerification: ReturnType<typeof vi.fn>
  }
  signIn: {
    create: ReturnType<typeof vi.fn>
    prepareFirstFactor: ReturnType<typeof vi.fn>
    attemptFirstFactor: ReturnType<typeof vi.fn>
    authenticateWithRedirect: ReturnType<typeof vi.fn>
  }
  setAuthenticated: (authenticated: boolean) => Partial<MockClerkAuth>
  _helpers: {
    setLoading: () => Partial<MockClerkAuth>
    mockError: (error: any) => Partial<MockClerkAuth>
    reset: () => void
  }
}

/**
 * Creates a standardized Clerk auth mock
 * Fixes authentication state mocking issues
 */
export function createStandardClerkMock(): MockClerkAuth {
  const mockUser: MockClerkUser = {
    id: 'user_test123',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
    imageUrl: 'https://example.com/avatar.jpg'
  }

  const mockSession: MockClerkSession = {
    id: 'sess_test123',
    user: mockUser,
    status: 'active'
  }

  const mockOrganization: MockClerkOrganization = {
    id: 'org_test123',
    name: 'Test Organization',
    slug: 'test-org',
    membersCount: 5
  }

  const mockAuth: MockClerkAuth = {
    isSignedIn: true,
    isLoaded: true,
    userId: mockUser.id,
    user: mockUser,
    session: mockSession,
    organization: mockOrganization,
    signUp: {
      create: vi.fn().mockResolvedValue({ createdUserId: mockUser.id }),
      prepareEmailAddressVerification: vi.fn().mockResolvedValue({}),
      attemptEmailAddressVerification: vi.fn().mockResolvedValue({})
    },
    signIn: {
      create: vi.fn().mockResolvedValue({}),
      prepareFirstFactor: vi.fn().mockResolvedValue({}),
      attemptFirstFactor: vi.fn().mockResolvedValue({}),
      authenticateWithRedirect: vi.fn().mockResolvedValue({})
    },
    setAuthenticated: (authenticated: boolean) => ({
      isSignedIn: authenticated,
      isLoaded: true,
      userId: authenticated ? mockUser.id : null,
      user: authenticated ? mockUser : null,
      session: authenticated ? mockSession : null,
      organization: authenticated ? mockOrganization : null
    }),
    _helpers: {
      setLoading: () => ({
        isLoaded: false,
        isSignedIn: false,
        userId: null,
        user: null,
        session: null,
        organization: null
      }),
      mockError: (error: any) => ({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        user: null,
        session: null,
        organization: null
      }),
      reset: () => {
        mockAuth.signUp.create.mockClear()
        mockAuth.signUp.prepareEmailAddressVerification.mockClear()
        mockAuth.signUp.attemptEmailAddressVerification.mockClear()
        mockAuth.signIn.create.mockClear()
        mockAuth.signIn.prepareFirstFactor.mockClear()
        mockAuth.signIn.attemptFirstFactor.mockClear()
        mockAuth.signIn.authenticateWithRedirect.mockClear()
      }
    }
  }

  return mockAuth
}

// ===================================================================
// NEXT.JS ROUTER MOCK INFRASTRUCTURE
// ===================================================================

export interface MockNextRouter {
  pathname: string
  route: string
  asPath: string
  query: Record<string, string>
  isLocaleDomain: boolean
  isReady: boolean
  isPreview: boolean
  basePath: string
  searchParams: URLSearchParams
  _helpers: {
    setPath: (path: string) => void
    setQuery: (query: Record<string, string>) => void
  }
  push: ReturnType<typeof vi.fn>
  replace: ReturnType<typeof vi.fn>
  back: ReturnType<typeof vi.fn>
  forward: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  prefetch: ReturnType<typeof vi.fn>
}

/**
 * Creates a standardized Next.js router mock
 * Fixes navigation and routing issues in tests
 */
export function createStandardRouterMock(): MockNextRouter {
  const mockRouter: MockNextRouter = {
    pathname: '/test-path',
    route: '/test-path',
    asPath: '/test-path',
    query: {},
    isLocaleDomain: true,
    isReady: true,
    isPreview: false,
    basePath: '',
    searchParams: new URLSearchParams(),
    _helpers: {
      setPath: (path: string) => {
        mockRouter.pathname = path
        mockRouter.route = path
        mockRouter.asPath = path
      },
      setQuery: (query: Record<string, string>) => {
        mockRouter.query = query
        mockRouter.searchParams = new URLSearchParams(query)
      }
    },
    push: vi.fn().mockResolvedValue(true),
    replace: vi.fn().mockResolvedValue(true),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined)
  }

  return mockRouter
}

// ===================================================================
// TEST UTILITIES
// ===================================================================

/**
 * Standardized async helper with timeout and promise handling
 * Fixes async test issues
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  errorMessage: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    })
  ])
}

/**
 * Standardized test data factory
 * Provides consistent test data across all tests
 */
export const createTestData = {
  user: (overrides: Partial<any> = {}) => ({
    id: 'user-test-123',
    clerk_user_id: 'clerk_user_test123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    avatar_url: 'https://example.com/avatar.jpg',
    preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  organization: (overrides: Partial<any> = {}) => ({
    id: 'org-test-123',
    name: 'Test Organization',
    slug: 'test-org',
    description: 'Test organization description',
    avatar_url: 'https://example.com/org-avatar.jpg',
    metadata: {},
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  session: (overrides: Partial<any> = {}) => ({
    id: 'session-test-123',
    user_id: 'user-test-123',
    path_id: 'path-test-123',
    current_step_id: 'step-1',
    status: 'active',
    score: 85,
    time_spent: 300,
    attempts: 1,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides
  }),

  progress: (overrides: Partial<any> = {}) => ({
    id: 'progress-test-123',
    session_id: 'session-test-123',
    step_id: 'step-1',
    status: 'completed',
    score: 85,
    time_spent: 300,
    attempts: 1,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides
  })
}

/**
 * Global test environment setup helper
 * Ensures consistent test environment
 */
export function setupTestEnvironment() {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  }
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  })
  
  // Mock fetch
  global.fetch = vi.fn()
  
  // Mock console methods to reduce noise in tests
  const consoleMock = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
  global.console = { ...console, ...consoleMock }
  
  return {
    localStorage: localStorageMock,
    fetch: global.fetch,
    console: consoleMock
  }
}

/**
 * Test cleanup helper
 * Ensures clean state between test fixtures
 */
export function cleanupTestEnvironment() {
  vi.clearAllMocks()
  vi.clearAllTimers()
  
  // Reset DOM if needed
  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
  }
}