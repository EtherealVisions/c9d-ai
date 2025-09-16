/**
 * E2E Testing Framework Setup
 * 
 * This file provides a comprehensive testing framework setup for E2E tests
 * that can be reused across all authenticated E2E test scenarios.
 */

import { vi } from 'vitest'

/**
 * Standard E2E Test Framework Configuration
 * 
 * Provides consistent mocking and setup for all E2E tests involving authentication
 */
export function setupE2EFramework() {
  // Mock Next.js router
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  }

  vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter
  }))

  // Mock Clerk authentication
  const mockSignIn = {
    create: vi.fn(),
    authenticateWithRedirect: vi.fn(),
    prepareFirstFactor: vi.fn()
  }

  const mockSetActive = vi.fn()

  vi.mock('@clerk/nextjs', () => ({
    useSignIn: () => ({
      signIn: mockSignIn,
      isLoaded: true,
      setActive: mockSetActive
    }),
    useAuth: () => ({
      userId: null,
      sessionId: null,
      orgId: null,
      isLoaded: true
    })
  }))

  // Mock session management service
  const mockSessionService = {
    initializeSession: vi.fn(),
    updateSessionActivity: vi.fn(),
    revokeSession: vi.fn()
  }

  vi.mock('@/lib/services/session-management-service', () => ({
    sessionManagementService: mockSessionService,
    useSessionManagement: () => ({
      initializeSession: mockSessionService.initializeSession,
      updateActivity: mockSessionService.updateSessionActivity,
      revokeSession: mockSessionService.revokeSession,
      isSessionActive: false
    })
  }))

  // Mock configuration
  vi.mock('@/lib/config/clerk', () => ({
    getSocialProviders: () => [
      { id: 'google', name: 'Google', enabled: true, icon: 'google', strategy: 'oauth_google' },
      { id: 'github', name: 'GitHub', enabled: true, icon: 'github', strategy: 'oauth_github' },
      { id: 'microsoft', name: 'Microsoft', enabled: true, icon: 'microsoft', strategy: 'oauth_microsoft' }
    ]
  }))

  // Mock localStorage
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }

  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  })

  return {
    mockRouter,
    mockSignIn,
    mockSetActive,
    mockSessionService,
    mockLocalStorage
  }
}

/**
 * E2E Test Scenarios
 * 
 * Pre-configured test scenarios for common authentication flows
 */
export const E2EScenarios = {
  /**
   * Successful Authentication Scenario
   */
  successfulAuth: {
    mockSignInResponse: {
      status: 'complete',
      createdSessionId: 'session-success'
    },
    expectedCredentials: {
      identifier: 'user@example.com',
      password: 'password123'
    }
  },

  /**
   * 2FA Required Scenario
   */
  twoFactorAuth: {
    mockSignInResponse: {
      status: 'needs_second_factor'
    },
    expectedCredentials: {
      identifier: 'user@example.com',
      password: 'password123'
    }
  },

  /**
   * Authentication Error Scenarios
   */
  authErrors: {
    incorrectPassword: {
      error: {
        errors: [{ 
          code: 'form_password_incorrect', 
          message: 'Incorrect password' 
        }]
      }
    },
    userNotFound: {
      error: {
        errors: [{ 
          code: 'form_identifier_not_found', 
          message: 'User not found' 
        }]
      }
    },
    rateLimited: {
      error: {
        errors: [{ 
          code: 'too_many_requests', 
          message: 'Too many requests' 
        }]
      }
    },
    networkError: new Error('Network error')
  },

  /**
   * Social Authentication Scenarios
   */
  socialAuth: {
    google: {
      strategy: 'oauth_google',
      redirectUrl: '/dashboard',
      redirectUrlComplete: '/dashboard'
    },
    github: {
      strategy: 'oauth_github',
      redirectUrl: '/dashboard',
      redirectUrlComplete: '/dashboard'
    },
    microsoft: {
      strategy: 'oauth_microsoft',
      redirectUrl: '/dashboard',
      redirectUrlComplete: '/dashboard'
    }
  }
}

/**
 * E2E Test Utilities
 * 
 * Helper functions for common E2E test operations
 */
export const E2EUtils = {
  /**
   * Simulate successful authentication flow
   */
  async simulateSuccessfulAuth(mocks: ReturnType<typeof setupE2EFramework>) {
    const { mockSignIn, mockSetActive, mockSessionService } = mocks
    const scenario = E2EScenarios.successfulAuth

    mockSignIn.create.mockResolvedValue(scenario.mockSignInResponse)
    mockSetActive.mockResolvedValue({})
    mockSessionService.initializeSession.mockResolvedValue({ success: true })

    // Execute authentication flow
    const authResult = await mockSignIn.create(scenario.expectedCredentials)
    await mockSetActive({ session: authResult.createdSessionId })
    await mockSessionService.initializeSession()

    return authResult
  },

  /**
   * Simulate authentication error
   */
  async simulateAuthError(mocks: ReturnType<typeof setupE2EFramework>, errorType: keyof typeof E2EScenarios.authErrors) {
    const { mockSignIn } = mocks
    const error = E2EScenarios.authErrors[errorType]

    mockSignIn.create.mockRejectedValue(error)

    try {
      await mockSignIn.create(E2EScenarios.successfulAuth.expectedCredentials)
    } catch (thrownError) {
      return thrownError
    }
  },

  /**
   * Simulate social authentication
   */
  async simulateSocialAuth(mocks: ReturnType<typeof setupE2EFramework>, provider: keyof typeof E2EScenarios.socialAuth) {
    const { mockSignIn } = mocks
    const authParams = E2EScenarios.socialAuth[provider]

    mockSignIn.authenticateWithRedirect.mockResolvedValue({})
    await mockSignIn.authenticateWithRedirect(authParams)

    return authParams
  },

  /**
   * Simulate remember me functionality
   */
  simulateRememberMe(mocks: ReturnType<typeof setupE2EFramework>, enabled: boolean) {
    const { mockLocalStorage } = mocks

    if (enabled) {
      mockLocalStorage.setItem('c9d-remember-me', 'true')
    } else {
      mockLocalStorage.removeItem('c9d-remember-me')
    }
  },

  /**
   * Simulate navigation
   */
  simulateNavigation(mocks: ReturnType<typeof setupE2EFramework>, path: string) {
    const { mockRouter } = mocks
    mockRouter.push(path)
    return path
  }
}

/**
 * E2E Test Assertions
 * 
 * Common assertions for E2E test validation
 */
export const E2EAssertions = {
  /**
   * Assert successful authentication flow
   */
  assertSuccessfulAuth(mocks: ReturnType<typeof setupE2EFramework>, sessionId: string) {
    const { mockSignIn, mockSetActive, mockSessionService } = mocks

    expect(mockSignIn.create).toHaveBeenCalledWith(E2EScenarios.successfulAuth.expectedCredentials)
    expect(mockSetActive).toHaveBeenCalledWith({ session: sessionId })
    expect(mockSessionService.initializeSession).toHaveBeenCalled()
  },

  /**
   * Assert authentication error handling
   */
  assertAuthError(mocks: ReturnType<typeof setupE2EFramework>, errorType: keyof typeof E2EScenarios.authErrors) {
    const { mockSignIn, mockSetActive, mockSessionService } = mocks

    expect(mockSignIn.create).toHaveBeenCalled()
    expect(mockSetActive).not.toHaveBeenCalled()
    expect(mockSessionService.initializeSession).not.toHaveBeenCalled()
  },

  /**
   * Assert social authentication
   */
  assertSocialAuth(mocks: ReturnType<typeof setupE2EFramework>, provider: keyof typeof E2EScenarios.socialAuth) {
    const { mockSignIn } = mocks
    const expectedParams = E2EScenarios.socialAuth[provider]

    expect(mockSignIn.authenticateWithRedirect).toHaveBeenCalledWith(expectedParams)
  },

  /**
   * Assert navigation
   */
  assertNavigation(mocks: ReturnType<typeof setupE2EFramework>, expectedPath: string) {
    const { mockRouter } = mocks
    expect(mockRouter.push).toHaveBeenCalledWith(expectedPath)
  },

  /**
   * Assert remember me functionality
   */
  assertRememberMe(mocks: ReturnType<typeof setupE2EFramework>, enabled: boolean) {
    const { mockLocalStorage } = mocks

    if (enabled) {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('c9d-remember-me', 'true')
    } else {
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('c9d-remember-me')
    }
  }
}

/**
 * E2E Test Cleanup
 * 
 * Cleanup utilities for E2E tests
 */
export function cleanupE2EFramework() {
  vi.clearAllMocks()
  vi.restoreAllMocks()
}

/**
 * Complete E2E Test Setup
 * 
 * One-function setup for complete E2E testing framework
 */
export function setupCompleteE2EFramework() {
  const mocks = setupE2EFramework()
  
  return {
    mocks,
    scenarios: E2EScenarios,
    utils: E2EUtils,
    assertions: E2EAssertions,
    cleanup: cleanupE2EFramework
  }
}