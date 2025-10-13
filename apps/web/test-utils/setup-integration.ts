import { vi } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// Test environment configuration
export const TEST_ENV = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/test',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key',
  TEST_RUN_ID: `test_${Date.now()}_${uuidv4().slice(0, 8)}`,
  WORKER_ID: process.env.VITEST_WORKER_ID || '1'
}

// Create isolated test namespace
export function getTestNamespace(): string {
  return `${TEST_ENV.TEST_RUN_ID}_worker_${TEST_ENV.WORKER_ID}`
}

// Create test-specific Supabase client
export function createTestSupabaseClient(): SupabaseClient {
  return createClient(TEST_ENV.SUPABASE_URL, TEST_ENV.SUPABASE_ANON_KEY, {
    db: {
      schema: getTestNamespace()
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

// Create admin Supabase client for test setup
export function createTestAdminClient(): SupabaseClient {
  return createClient(TEST_ENV.SUPABASE_URL, TEST_ENV.SUPABASE_SERVICE_KEY, {
    db: {
      schema: getTestNamespace()
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

// Test data factories
export const testFactories = {
  user: (overrides = {}) => ({
    id: uuidv4(),
    email: `test-${uuidv4()}@example.com`,
    username: `user_${uuidv4().slice(0, 8)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),
  
  organization: (overrides = {}) => ({
    id: uuidv4(),
    name: `Test Org ${uuidv4().slice(0, 8)}`,
    slug: `org-${uuidv4().slice(0, 8)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),
  
  membership: (userId: string, orgId: string, overrides = {}) => ({
    id: uuidv4(),
    user_id: userId,
    organization_id: orgId,
    role: 'member',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  })
}

// Test cleanup utilities
export async function cleanupTestData(client: SupabaseClient) {
  const namespace = getTestNamespace()
  
  try {
    // Clean up in reverse order of dependencies
    await client.from('audit_logs').delete().neq('id', '')
    await client.from('invitations').delete().neq('id', '')
    await client.from('memberships').delete().neq('id', '')
    await client.from('organizations').delete().neq('id', '')
    await client.from('users').delete().neq('id', '')
  } catch (error) {
    console.warn(`Test cleanup failed for namespace ${namespace}:`, error)
  }
}

// Mock Clerk for tests
export function setupClerkMocks() {
  vi.mock('@clerk/nextjs', () => ({
    auth: () => ({
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      getToken: vi.fn().mockResolvedValue('test-token')
    }),
    currentUser: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      username: 'testuser'
    }),
    useAuth: () => ({
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      isLoaded: true,
      isSignedIn: true
    }),
    useUser: () => ({
      user: {
        id: 'test-user-id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        username: 'testuser'
      },
      isLoaded: true,
      isSignedIn: true
    }),
    SignIn: () => null,
    SignUp: () => null,
    UserButton: () => null,
    ClerkProvider: ({ children }: any) => children,
  }))
}

// Performance measurement utilities
export const performanceUtils = {
  startMark: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`)
    }
  },
  
  endMark: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-end`)
      try {
        performance.measure(name, `${name}-start`, `${name}-end`)
        const measure = performance.getEntriesByName(name)[0]
        return measure?.duration || 0
      } catch (e) {
        return 0
      }
    }
    return 0
  }
}

// Test result collector
export class TestResultCollector {
  private results: any[] = []
  private startTime: number
  
  constructor() {
    this.startTime = Date.now()
  }
  
  addResult(test: string, status: 'pass' | 'fail' | 'skip', duration: number, error?: any) {
    this.results.push({
      test,
      status,
      duration,
      error: error?.message || error,
      timestamp: new Date().toISOString()
    })
  }
  
  getSummary() {
    const endTime = Date.now()
    const total = this.results.length
    const passed = this.results.filter(r => r.status === 'pass').length
    const failed = this.results.filter(r => r.status === 'fail').length
    const skipped = this.results.filter(r => r.status === 'skip').length
    
    return {
      total,
      passed,
      failed,
      skipped,
      passRate: total > 0 ? (passed / total * 100).toFixed(2) + '%' : '0%',
      duration: endTime - this.startTime,
      timestamp: new Date().toISOString(),
      namespace: getTestNamespace(),
      results: this.results
    }
  }
}

// Global test result collector
export const globalTestCollector = new TestResultCollector()