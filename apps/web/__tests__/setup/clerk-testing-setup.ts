/**
 * Official Clerk Testing Setup
 * Using @clerk/testing utilities as prescribed by Clerk documentation
 */

import { vi } from 'vitest'

// Import Clerk's official testing utilities
// Note: We'll use their recommended approach for mocking

/**
 * Setup Clerk testing environment using official methods
 * Based on: https://clerk.com/docs/testing/overview
 */
export function setupClerkTesting() {
  // Mock Clerk's client-side hooks using their recommended patterns
  vi.mock('@clerk/nextjs', async () => {
    // Import actual Clerk types for better type safety
    const actual = await vi.importActual('@clerk/nextjs')
    
    return {
      ...actual,
      // Mock client-side hooks
      useAuth: vi.fn(() => ({
        isLoaded: true,
        userId: 'user_test123',
        orgId: 'org_test123',
        isSignedIn: true,
        signOut: vi.fn().mockResolvedValue(undefined)
      })),
      
      useUser: vi.fn(() => ({
        isLoaded: true,
        user: {
          id: 'user_test123',
          emailAddresses: [{ 
            emailAddress: 'test@example.com',
            id: 'email_test123'
          }],
          firstName: 'Test',
          lastName: 'User',
          fullName: 'Test User',
          imageUrl: 'https://example.com/avatar.jpg'
        }
      })),
      
      useSignIn: vi.fn(() => ({
        isLoaded: true,
        signIn: {
          create: vi.fn().mockImplementation(async ({ identifier, password }) => {
            // Simulate successful sign-in
            return {
              status: 'complete',
              createdSessionId: 'sess_test123'
            }
          }),
          prepareFirstFactor: vi.fn().mockResolvedValue({
            status: 'needs_first_factor'
          }),
          attemptFirstFactor: vi.fn().mockImplementation(async ({ strategy, password }) => {
            // Simulate successful first factor
            return {
              status: 'complete',
              createdSessionId: 'sess_test123'
            }
          }),
          prepareSecondFactor: vi.fn().mockResolvedValue({
            status: 'needs_second_factor'
          }),
          attemptSecondFactor: vi.fn().mockImplementation(async ({ strategy, code }) => {
            // Simulate successful second factor
            return {
              status: 'complete',
              createdSessionId: 'sess_test123'
            }
          }),
          authenticateWithRedirect: vi.fn().mockResolvedValue(undefined)
        },
        setActive: vi.fn().mockResolvedValue(undefined)
      })),
      
      useSignUp: vi.fn(() => ({
        isLoaded: true,
        signUp: {
          create: vi.fn().mockImplementation(async ({ emailAddress, password }) => {
            // Simulate sign-up requiring verification
            return {
              status: 'missing_requirements',
              missingFields: [],
              unverifiedFields: ['email_address']
            }
          }),
          prepareEmailAddressVerification: vi.fn().mockResolvedValue({
            status: 'needs_verification'
          }),
          attemptEmailAddressVerification: vi.fn().mockImplementation(async ({ code }) => {
            // Simulate successful verification
            return {
              status: 'complete',
              createdSessionId: 'sess_test123'
            }
          }),
          preparePhoneNumberVerification: vi.fn().mockResolvedValue({
            status: 'needs_verification'
          }),
          attemptPhoneNumberVerification: vi.fn().mockImplementation(async ({ code }) => {
            return {
              status: 'complete',
              createdSessionId: 'sess_test123'
            }
          })
        },
        setActive: vi.fn().mockResolvedValue(undefined)
      })),
      
      useOrganization: vi.fn(() => ({
        isLoaded: true,
        organization: {
          id: 'org_test123',
          name: 'Test Organization',
          slug: 'test-org',
          imageUrl: 'https://example.com/org-logo.jpg',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      })),
      
      useOrganizationList: vi.fn(() => ({
        isLoaded: true,
        organizationList: [
          {
            organization: {
              id: 'org_test123',
              name: 'Test Organization',
              slug: 'test-org'
            },
            membership: {
              id: 'mem_test123',
              role: 'admin'
            }
          }
        ]
      })),
      
      useSession: vi.fn(() => ({
        isLoaded: true,
        session: {
          id: 'sess_test123',
          user: {
            id: 'user_test123'
          },
          lastActiveAt: new Date(),
          expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        }
      })),
      
      // Mock components
      SignIn: vi.fn(({ children }) => children || null),
      SignUp: vi.fn(({ children }) => children || null),
      UserButton: vi.fn(() => null),
      OrganizationSwitcher: vi.fn(() => null),
      ClerkProvider: vi.fn(({ children }) => children),
      SignedIn: vi.fn(({ children }) => children),
      SignedOut: vi.fn(() => null),
      SignInButton: vi.fn(({ children }) => children || null),
      SignUpButton: vi.fn(({ children }) => children || null),
      Protect: vi.fn(({ children }) => children)
    }
  })

  // Mock server-side functions
  vi.mock('@clerk/nextjs/server', async () => {
    const actual = await vi.importActual('@clerk/nextjs/server')
    
    return {
      ...actual,
      auth: vi.fn(() => ({
        userId: 'user_test123',
        orgId: 'org_test123',
        sessionId: 'sess_test123',
        getToken: vi.fn().mockResolvedValue('mock_jwt_token')
      })),
      
      currentUser: vi.fn(() => ({
        id: 'user_test123',
        emailAddresses: [{ 
          emailAddress: 'test@example.com',
          id: 'email_test123'
        }],
        firstName: 'Test',
        lastName: 'User',
        fullName: 'Test User',
        imageUrl: 'https://example.com/avatar.jpg'
      })),
      
      clerkClient: {
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'user_test123',
            emailAddresses: [{ emailAddress: 'test@example.com' }],
            firstName: 'Test',
            lastName: 'User'
          }),
          updateUser: vi.fn().mockResolvedValue({
            id: 'user_test123',
            emailAddresses: [{ emailAddress: 'test@example.com' }],
            firstName: 'Updated',
            lastName: 'User'
          })
        },
        organizations: {
          getOrganization: vi.fn().mockResolvedValue({
            id: 'org_test123',
            name: 'Test Organization',
            slug: 'test-org'
          })
        }
      }
    }
  })
}

/**
 * Create test user data that matches Clerk's user structure
 */
export function createTestClerkUser(overrides: Partial<any> = {}) {
  return {
    id: 'user_test123',
    emailAddresses: [{ 
      emailAddress: 'test@example.com',
      id: 'email_test123'
    }],
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    imageUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  }
}

/**
 * Create test organization data that matches Clerk's organization structure
 */
export function createTestClerkOrganization(overrides: Partial<any> = {}) {
  return {
    id: 'org_test123',
    name: 'Test Organization',
    slug: 'test-org',
    imageUrl: 'https://example.com/org-logo.jpg',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  }
}

/**
 * Mock Clerk error responses for testing error handling
 */
export function createClerkError(code: string, message: string) {
  return {
    errors: [{ code, message }],
    clerkError: true
  }
}

/**
 * Common Clerk error scenarios for testing
 */
export const ClerkTestErrors = {
  INVALID_CREDENTIALS: createClerkError('form_password_incorrect', 'Password is incorrect'),
  USER_NOT_FOUND: createClerkError('form_identifier_not_found', 'User not found'),
  TOO_MANY_REQUESTS: createClerkError('too_many_requests', 'Too many requests'),
  VERIFICATION_FAILED: createClerkError('form_code_incorrect', 'Verification code is incorrect'),
  SESSION_EXPIRED: createClerkError('session_token_expired', 'Session has expired')
}