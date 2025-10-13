import { vi, beforeAll, afterAll, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { setupClerkMocks, cleanupTestData, createTestSupabaseClient } from './test-utils/setup-integration'

// Setup Clerk mocks globally
setupClerkMocks()

// Global test client
let testSupabaseClient: ReturnType<typeof createTestSupabaseClient>

beforeAll(() => {
  // Initialize test client
  testSupabaseClient = createTestSupabaseClient()
})

afterAll(async () => {
  // Cleanup test data
  if (testSupabaseClient) {
    await cleanupTestData(testSupabaseClient)
  }
})

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
  root: null,
  rootMargin: '',
  thresholds: []
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => children,
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

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    ...global.performance,
    getEntriesByType: vi.fn((type) => {
      if (type === 'navigation') {
        return [{
          domContentLoadedEventEnd: 1500,
          domContentLoadedEventStart: 1400,
          loadEventEnd: 2000,
          loadEventStart: 1900,
          domInteractive: 1000,
          fetchStart: 0,
          responseStart: 300,
          requestStart: 100
        }]
      }
      return []
    }),
    mark: vi.fn(),
    measure: vi.fn(),
    now: vi.fn(() => Date.now()),
  }
})