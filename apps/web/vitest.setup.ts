import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'
import { setupCommonMocks } from './__tests__/setup/common-mocks'
import { setupClerkTesting } from './__tests__/setup/clerk-testing-setup'
import { setupPhaseDevTesting } from './__tests__/setup/phase-testing-setup'

// Apply common mocks
setupCommonMocks()

// Setup official Clerk testing utilities
setupClerkTesting()

// Setup Phase.dev testing (for integration tests only)
// This will validate environment for Phase.dev integration tests
if (process.env.PHASE_SERVICE_TOKEN) {
  setupPhaseDevTesting()
}

// Mock accessibility context globally
vi.mock('@/contexts/accessibility-context', () => ({
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => children,
  useAccessibility: vi.fn(() => ({
    isTouchDevice: false,
    isHighContrast: false,
    isReducedMotion: false,
    announce: vi.fn(),
    setFocusVisible: vi.fn(),
    focusVisible: false
  })),
  useAnnouncement: vi.fn(() => ({
    announceError: vi.fn(),
    announceSuccess: vi.fn(),
    announceLoading: vi.fn(),
    announceInfo: vi.fn()
  })),
  useKeyboardNavigation: vi.fn(() => ({
    handleKeyDown: vi.fn(),
    focusNext: vi.fn(),
    focusPrevious: vi.fn(),
    focusFirst: vi.fn(),
    focusLast: vi.fn()
  }))
}))

// Global cleanup to prevent memory leaks
beforeEach(() => {
  // Don't clear mocks that are set up globally
  // Individual tests can override if needed
})

afterEach(() => {
  // Only restore mocks that were changed in individual tests
  // Keep global mocks intact
  if (global.gc) {
    global.gc()
  }
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Clerk mocking is now handled by setupClerkTesting() using official @clerk/testing utilities

// Mock ioredis for repository cache service
vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    flushall: vi.fn(),
    quit: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }))
}))

// Mock database connections to prevent real database attempts
vi.mock('@/lib/db/connection', () => {
  const { createMockDatabase } = require('./__tests__/setup/drizzle-testing-setup')
  return {
    getDatabase: () => createMockDatabase(),
    getConnection: () => ({
      end: vi.fn().mockResolvedValue(undefined),
      listen: vi.fn(),
      query: vi.fn().mockResolvedValue([])
    }),
    db: createMockDatabase(),
    checkDatabaseHealth: vi.fn().mockResolvedValue({
      connected: true,
      healthy: true,
      lastCheck: new Date(),
      metrics: { totalConnections: 0, activeConnections: 0, idleConnections: 0 }
    }),
    closeConnection: vi.fn().mockResolvedValue(undefined)
  }
})

// Mock postgres to prevent real connections
vi.mock('postgres', () => {
  return vi.fn().mockImplementation(() => ({
    end: vi.fn().mockResolvedValue(undefined),
    listen: vi.fn(),
    query: vi.fn().mockResolvedValue([]),
    [Symbol.for('nodejs.util.inspect.custom')]: () => '[Mock PostgreSQL Connection]'
  }))
})

// Mock drizzle-orm to prevent real database operations
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn().mockImplementation(() => {
    const { createMockDatabase } = require('./__tests__/setup/drizzle-testing-setup')
    return createMockDatabase()
  }),
  migrate: vi.fn().mockResolvedValue(undefined)
}))

// Mock drizzle-orm core functions - comprehensive mock to prevent real database operations
vi.mock('drizzle-orm', async (importOriginal) => {
  // Import original to get proper types, but override with mocks
  const actual = await importOriginal()
  
  return {
    ...actual,
    // Query builder functions
    eq: vi.fn((column, value) => ({ column, value, type: 'eq' })),
    and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
    or: vi.fn((...conditions) => ({ conditions, type: 'or' })),
    sql: vi.fn((strings, ...values) => ({ strings, values, type: 'sql' })),
    desc: vi.fn((column) => ({ column, type: 'desc' })),
    asc: vi.fn((column) => ({ column, type: 'asc' })),
    like: vi.fn((column, value) => ({ column, value, type: 'like' })),
    ilike: vi.fn((column, value) => ({ column, value, type: 'ilike' })),
    inArray: vi.fn((column, values) => ({ column, values, type: 'inArray' })),
    notInArray: vi.fn((column, values) => ({ column, values, type: 'notInArray' })),
    exists: vi.fn((query) => ({ query, type: 'exists' })),
    notExists: vi.fn((query) => ({ query, type: 'notExists' })),
    between: vi.fn((column, min, max) => ({ column, min, max, type: 'between' })),
    notBetween: vi.fn((column, min, max) => ({ column, min, max, type: 'notBetween' })),
    isNull: vi.fn((column) => ({ column, type: 'isNull' })),
    isNotNull: vi.fn((column) => ({ column, type: 'isNotNull' })),
    gt: vi.fn((column, value) => ({ column, value, type: 'gt' })),
    gte: vi.fn((column, value) => ({ column, value, type: 'gte' })),
    lt: vi.fn((column, value) => ({ column, value, type: 'lt' })),
    lte: vi.fn((column, value) => ({ column, value, type: 'lte' })),
    ne: vi.fn((column, value) => ({ column, value, type: 'ne' })),
    
    // Schema definition functions
    relations: vi.fn(() => ({})),
    one: vi.fn(() => ({})),
    many: vi.fn(() => ({})),
    
    // Table definition functions (if needed)
    pgTable: vi.fn(() => ({})),
    serial: vi.fn(() => ({})),
    text: vi.fn(() => ({})),
    varchar: vi.fn(() => ({})),
    integer: vi.fn(() => ({})),
    boolean: vi.fn(() => ({})),
    timestamp: vi.fn(() => ({})),
    json: vi.fn(() => ({})),
    jsonb: vi.fn(() => ({})),
    uuid: vi.fn(() => ({})),
    
    // Migration functions
    migrate: vi.fn().mockResolvedValue(undefined)
  }
})

// Mock repository factory to use mocks
vi.mock('@/lib/repositories/factory', () => {
  const { createMockRepository } = require('./__tests__/setup/drizzle-testing-setup')
  return {
    getRepositoryFactory: () => ({
      getUserRepository: () => createMockRepository(),
      getOrganizationRepository: () => createMockRepository(),
      getOrganizationMembershipRepository: () => createMockRepository(),
      getRoleRepository: () => createMockRepository()
    })
  }
})

// Mock NextResponse for API tests
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => {
      const response = {
        status: init?.status || 200,
        statusText: init?.statusText || 'OK',
        ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
        headers: new Headers(init?.headers),
        json: vi.fn().mockResolvedValue(data),
        clone: vi.fn(),
        body: JSON.stringify(data)
      }
      return response
    },
    redirect: (url: string, status = 302) => ({
      status,
      statusText: 'Redirect',
      ok: false,
      headers: new Headers({ Location: url }),
      json: vi.fn(),
      clone: vi.fn()
    })
  },
  NextRequest: vi.fn()
}))

// Environment variables should come from Phase.dev via env-wrapper CLI tool
// Only set NODE_ENV if not already set (tests should use 'test' environment)
if (!process.env.NODE_ENV) {
  // Use Object.defineProperty to avoid TypeScript read-only error
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    configurable: true
  })
}

// Ensure we have a test-specific database configuration that doesn't attempt real connections
// This will be overridden by Phase.dev if available, but provides a safe fallback
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
}


// Global test configuration
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock DOM methods that are missing in jsdom for Radix UI
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  value: vi.fn(() => false),
  writable: true
})

Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  value: vi.fn(),
  writable: true
})

Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  value: vi.fn(),
  writable: true
})

// Mock scrollIntoView for Radix UI components
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true
})

// Mock getBoundingClientRect for Radix UI positioning
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  value: vi.fn(() => ({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: vi.fn()
  })),
  writable: true
})

// Mock Response for API tests
global.Response = class MockResponse {
  status: number
  statusText: string
  ok: boolean
  headers: Headers
  body: any

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.status = init?.status || 200
    this.statusText = init?.statusText || 'OK'
    this.ok = this.status >= 200 && this.status < 300
    this.headers = new Headers(init?.headers)
    this.body = body
  }

  static json(data: any, init?: ResponseInit) {
    const response = new MockResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers
      }
    })
    response.json = vi.fn().mockResolvedValue(data)
    return response
  }

  static error() {
    return new MockResponse(null, { status: 500, statusText: 'Internal Server Error' })
  }

  static redirect(url: string, status = 302) {
    return new MockResponse(null, { 
      status, 
      headers: { Location: url }
    })
  }

  async json() {
    return JSON.parse(this.body || '{}')
  }

  async text() {
    return this.body || ''
  }

  clone() {
    return new MockResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers
    })
  }
} as any