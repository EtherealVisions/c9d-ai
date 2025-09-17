import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthRouterService } from '../auth-router-service'
import type { User } from '../../models/types'

// Simple mock for testing core functionality
vi.mock('../../database', () => ({
  createSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null })
            }),
            single: () => Promise.resolve({ data: null, error: null })
          }),
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => ({
            limit: () => ({
              single: () => Promise.resolve({ data: null, error: null })
            })
          })
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: {}, error: null })
        })
      })
    })
  })
}))

// Mock the auth-onboarding-integration to avoid complex dependencies
vi.mock('./auth-onboarding-integration', () => ({
  authOnboardingIntegration: {
    checkOnboardingRequirement: vi.fn().mockResolvedValue({
      shouldRedirectToOnboarding: true,
      onboardingUrl: '/onboarding/profile',
      reason: 'Onboarding incomplete'
    })
  }
}))

// Mock the onboarding-service to avoid database calls
vi.mock('../onboarding-service', () => ({
  OnboardingService: {
    getUserOnboardingSessions: vi.fn().mockResolvedValue([]),
    getOnboardingProgress: vi.fn().mockResolvedValue({
      completed: false,
      progress: 0,
      currentStep: 'profile'
    }),
    initializeOnboarding: vi.fn().mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: 'active'
    }),
    createOnboardingSession: vi.fn().mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: 'active'
    })
  }
}))

vi.mock('../user-service', () => ({
  userService: {
    getUser: vi.fn(),
    getUserByClerkId: vi.fn(),
    updateUserPreferences: vi.fn()
  }
}))

describe('AuthRouterService - Core Functionality', () => {
  let authRouterService: AuthRouterService
  let mockUser: User

  beforeEach(() => {
    vi.clearAllMocks()
    
    authRouterService = new AuthRouterService()
    
    mockUser = {
      id: 'user-1',
      clerkUserId: 'clerk-user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: undefined,
      preferences: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  describe('getPostAuthDestination', () => {
    it('should return redirect URL if valid', async () => {
      const redirectUrl = '/dashboard/analytics'
      
      const destination = await authRouterService.getPostAuthDestination(
        mockUser,
        redirectUrl
      )

      expect(destination).toEqual({
        url: redirectUrl,
        reason: 'User-requested redirect (validated)',
        metadata: {
          originalUrl: redirectUrl,
          validationPassed: true
        }
      })
    })

    it('should return onboarding URL if onboarding incomplete', async () => {
      // Mock incomplete onboarding
      mockUser.preferences = {
        onboardingCompleted: false,
        onboardingSteps: {}
      }

      const destination = await authRouterService.getPostAuthDestination(mockUser)

      expect(destination).toEqual({
        url: '/onboarding/profile',
        reason: 'Onboarding incomplete',
        requiresOnboarding: true,
        metadata: {
          onboardingProgress: 0,
          nextStep: 'profile'
        }
      })
    })

    it('should return dashboard if onboarding complete', async () => {
      // Mock completed onboarding
      mockUser.preferences = {
        onboardingCompleted: true,
        onboardingSteps: {
          profile: { completed: true },
          organization: { completed: true }
        }
      }

      const destination = await authRouterService.getPostAuthDestination(mockUser)

      expect(destination.url).toBe('/dashboard')
      expect(destination.reason).toContain('dashboard')
    })
  })

  describe('validateRedirectUrl', () => {
    it('should validate safe internal URLs', async () => {
      const validUrls = [
        '/dashboard',
        '/dashboard/analytics',
        '/onboarding/profile',
        '/settings/account'
      ]

      for (const url of validUrls) {
        const result = await authRouterService.validateRedirectUrl(url, { user: mockUser })
        expect(result.isValid).toBe(true)
      }
    })

    it('should reject unsafe URLs', async () => {
      const unsafeUrls = [
        'http://external.com',
        'https://malicious.site',
        'javascript:alert(1)',
        '//evil.com',
        'ftp://file.server'
      ]

      for (const url of unsafeUrls) {
        const result = await authRouterService.validateRedirectUrl(url, { user: mockUser })
        expect(result.isValid).toBe(false)
      }
    })
  })

  describe('getPersonalizedDashboard', () => {
    it('should return personalized dashboard', async () => {
      const destination = await authRouterService.getPersonalizedDashboard(mockUser)
      
      expect(destination.url).toBe('/dashboard')
      expect(destination.reason).toContain('dashboard')
    })

    it('should use user preferred dashboard if set', async () => {
      mockUser.preferences = {
        defaultDashboard: '/dashboard/analytics'
      }

      const destination = await authRouterService.getPersonalizedDashboard(mockUser)
      
      expect(destination.url).toBe('/dashboard/analytics')
      expect(destination.reason).toContain('preferred')
    })
  })
})