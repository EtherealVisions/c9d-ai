/**
 * Fixed Clerk Authentication Mock Infrastructure
 * Addresses critical auth mock failures in E2E and integration tests
 */

import { vi } from 'vitest'

export interface MockAuthReturn {
  userId: string | null
  orgId?: string | null
  sessionId?: string | null
}

export interface MockUser {
  id: string
  emailAddresses: Array<{ emailAddress: string }>
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string
}

/**
 * Creates properly functioning Clerk auth mocks
 * Fixes the "mockReturnValue is not a function" errors
 */
export function createMockClerkAuth() {
  const mockAuth = vi.fn()
  const mockCurrentUser = vi.fn()
  
  // Setup default returns
  mockAuth.mockReturnValue({
    userId: null,
    orgId: null,
    sessionId: null
  })
  
  mockCurrentUser.mockResolvedValue(null)

  return {
    auth: mockAuth,
    currentUser: mockCurrentUser
  }
}

/**
 * Setup helper for tests requiring authentication
 */
export function setupClerkMocks() {
  const mocks = createMockClerkAuth()
  
  // Mock the Clerk modules
  vi.mock('@clerk/nextjs/server', () => ({
    auth: mocks.auth,
    currentUser: mocks.currentUser
  }))

  vi.mock('@clerk/nextjs', () => ({
    useAuth: () => ({
      isLoaded: true,
      userId: 'test-user-id',
      orgId: 'test-org-id'
    }),
    useUser: () => ({
      isLoaded: true,
      user: {
        id: 'test-user-id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User'
      }
    })
  }))

  return mocks
}

/**
 * Helper to mock authenticated user
 */
export function mockAuthenticatedUser(
  mocks: ReturnType<typeof createMockClerkAuth>,
  userId: string,
  orgId?: string
) {
  mocks.auth.mockReturnValue({
    userId,
    orgId: orgId || null,
    sessionId: 'test-session-id'
  })

  mocks.currentUser.mockResolvedValue({
    id: userId,
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
    imageUrl: 'https://example.com/avatar.jpg'
  })
}

/**
 * Helper to mock unauthenticated user
 */
export function mockUnauthenticatedUser(
  mocks: ReturnType<typeof createMockClerkAuth>
) {
  mocks.auth.mockReturnValue({
    userId: null,
    orgId: null,
    sessionId: null
  })

  mocks.currentUser.mockResolvedValue(null)
}

/**
 * Helper to mock organization admin
 */
export function mockOrganizationAdmin(
  mocks: ReturnType<typeof createMockClerkAuth>,
  userId: string,
  orgId: string
) {
  mocks.auth.mockReturnValue({
    userId,
    orgId,
    sessionId: 'test-session-id'
  })

  mocks.currentUser.mockResolvedValue({
    id: userId,
    emailAddresses: [{ emailAddress: 'admin@example.com' }],
    firstName: 'Admin',
    lastName: 'User',
    imageUrl: 'https://example.com/admin-avatar.jpg'
  })
}

/**
 * Reset all auth mocks to clean state
 */
export function resetClerkMocks(mocks: ReturnType<typeof createMockClerkAuth>) {
  vi.clearAllMocks()
  
  // Reset to unauthenticated state
  mockUnauthenticatedUser(mocks)
}

/**
 * Create mock for specific test scenarios
 */
export function createTestAuthScenario(scenario: 'authenticated' | 'unauthenticated' | 'admin') {
  const mocks = setupClerkMocks()
  
  switch (scenario) {
    case 'authenticated':
      mockAuthenticatedUser(mocks, 'test-user-id', 'test-org-id')
      break
    case 'admin':
      mockOrganizationAdmin(mocks, 'admin-user-id', 'test-org-id')
      break
    case 'unauthenticated':
    default:
      mockUnauthenticatedUser(mocks)
      break
  }
  
  return mocks
}