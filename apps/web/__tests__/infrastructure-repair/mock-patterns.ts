/**
 * Standardized Mock Patterns for Test Infrastructure Repair
 */

import { vi } from 'vitest'

// Supabase Mock with proper chaining
export function createSupabaseMock() {
  const mockResponse = { data: null, error: null }
  
  const createChainable = () => {
    const chainable: any = {}
    const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit', 'single']
    
    methods.forEach(method => {
      chainable[method] = vi.fn().mockReturnValue(chainable)
    })
    
    chainable.single.mockResolvedValue(mockResponse)
    return chainable
  }

  return {
    from: vi.fn().mockReturnValue(createChainable()),
    _helpers: {
      mockSuccess: (data: any) => mockResponse.data = data,
      mockError: (error: any) => mockResponse.error = error
    }
  }
}

// Clerk Mock with authentication states
export function createClerkMock() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: 'test-user-id',
    user: { id: 'test-user-id', emailAddresses: [{ emailAddress: 'test@example.com' }] },
    signUp: {
      create: vi.fn().mockResolvedValue({ createdUserId: 'test-user-id' }),
      isLoaded: true
    },
    signIn: {
      create: vi.fn().mockResolvedValue({ createdSessionId: 'test-session-id' }),
      isLoaded: true
    }
  }
}

// Router Mock for Next.js
export function createRouterMock() {
  return {
    push: vi.fn().mockResolvedValue(true),
    replace: vi.fn().mockResolvedValue(true),
    back: vi.fn(),
    pathname: '/test-path',
    query: {},
    asPath: '/test-path'
  }
}