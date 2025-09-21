import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'
import { setupCommonMocks } from './__tests__/setup/common-mocks'
import { setupClerkTesting } from './__tests__/setup/clerk-testing-setup'

// Apply common mocks
setupCommonMocks()

// Setup official Clerk testing utilities
setupClerkTesting()

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

// Mock environment variables with proper test values
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_Y2xlcmstdGVzdC1rZXktZm9yLXRlc3RpbmctcHVycG9zZXMtb25seQ'
process.env.CLERK_SECRET_KEY = 'sk_test_Y2xlcmstdGVzdC1zZWNyZXQta2V5LWZvci10ZXN0aW5nLXB1cnBvc2VzLW9ubHk'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project-id.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QtcHJvamVjdC1pZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE5NTY1NzEyMDB9.test-anon-key-for-testing-purposes-only-with-sufficient-length'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QtcHJvamVjdC1pZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2NDA5OTUyMDAsImV4cCI6MTk1NjU3MTIwMH0.test-service-role-key-for-testing-purposes-only-with-sufficient-length'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
// Set NODE_ENV for tests (only if not already set)
if (!process.env.NODE_ENV) {
  // Use Object.defineProperty to avoid TypeScript read-only error
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    configurable: true
  })
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