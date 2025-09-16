import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthRouterService } from '../auth-router-service'
import type { User } from '../../models/types'

// Mock dependencies
vi.mock('../../database', () => ({
  createSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              single: vi.fn().mockResolvedValue({ data: [], error: null })
            })),
            single: vi.fn().mockResolvedValue({ data: [], error: null })
          })),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null })
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: {}, error: null })
        }))
      }))
    }))
  })
}))

vi.mock('../user-service', () => ({
  userService: {
    getUser: vi.fn(),
    getUserByClerkId: vi.fn(),
    updateUserPreferences: vi.fn()
  }
}))

vi.mock('./auth-onboarding-integration', () => ({
  authOnboardingIntegration: {
    checkOnboardingRequirement: vi.fn().mockResolvedValue({
      shouldRedirectToOnboarding: true,
      onboardingUrl: '/onboarding/profile',
      reason: 'Onboarding incomplete'
    })
  }
}))

describe('AuthRouterService', () => {
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
      avatarUrl: null,
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

    it('should return organization dashboard if organization context provided', async () => {
      // Mock completed onboarding
      mockUser.preferences = {
        onboardingCompleted: true
      }

      // Mock the supabase client to return organization access
      const mockSupabase = authRouterService['supabase']
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'membership-1',
                    organization: { name: 'Test Org' },
                    role: { name: 'member' }
                  },
                  error: null
                })
              })
            })
          })
        })
      })
      mockSupabase.from = mockFrom

      const organizationId = 'org-1'
      const destination = await authRouterService.getPostAuthDestination(
        mockUser,
        undefined,
        organizationId
      )

      expect(destination).toEqual({
        url: `/organizations/${organizationId}/dashboard`,
        reason: 'Organization context provided',
        organizationContext: organizationId,
        metadata: {
          userRole: 'member',
          organizationName: 'Test Org'
        }
      })
    })

    it('should return default dashboard if no specific context', async () => {
      // Mock completed onboarding
      mockUser.preferences = {
        onboardingCompleted: true
      }

      // Mock no organizations - using the mocked supabase from beforeEach
      // The mock is already set up in the vi.mock at the top

      const destination = await authRouterService.getPostAuthDestination(mockUser)

      expect(destination).toEqual({
        url: '/dashboard',
        reason: 'Default dashboard',
        metadata: {
          isPersonalized: false,
          isDefault: true
        }
      })
    })

    it('should handle errors gracefully', async () => {
      // Mock error in onboarding status check
      mockUser.preferences = null as any

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
  })

  describe('handleProtectedRoute', () => {
    it('should create sign-in URL with redirect parameter', () => {
      const pathname = '/dashboard/analytics'
      const searchParams = new URLSearchParams('tab=overview')

      const result = authRouterService.handleProtectedRoute(pathname, searchParams)

      expect(result).toBe('/sign-in?redirect_url=%2Fdashboard%2Fanalytics&tab=overview')
    })

    it('should handle root path without redirect parameter', () => {
      const pathname = '/'

      const result = authRouterService.handleProtectedRoute(pathname)

      expect(result).toBe('/sign-in')
    })
  })

  describe('getOnboardingStatus', () => {
    it('should return completed status for completed onboarding', async () => {
      mockUser.preferences = {
        onboardingCompleted: true
      }

      const status = await authRouterService.getOnboardingStatus(mockUser)

      expect(status).toEqual({
        completed: true,
        progress: 100,
        availableSteps: ['profile', 'organization', 'team', 'preferences', 'tutorial'],
        completedSteps: ['profile', 'organization', 'team', 'preferences', 'tutorial']
      })
    })

    it('should calculate progress for partial onboarding', async () => {
      mockUser.preferences = {
        onboardingCompleted: false,
        onboardingSteps: {
          profile: true,
          organization: true
        }
      }

      const status = await authRouterService.getOnboardingStatus(mockUser)

      expect(status).toEqual({
        completed: false,
        currentStep: 'organization',
        nextStep: 'team',
        progress: 40, // 2 out of 5 steps
        availableSteps: ['profile', 'organization', 'team', 'preferences', 'tutorial'],
        completedSteps: ['profile', 'organization']
      })
    })

    it('should handle missing preferences', async () => {
      mockUser.preferences = {}

      const status = await authRouterService.getOnboardingStatus(mockUser)

      expect(status).toEqual({
        completed: false,
        currentStep: undefined,
        nextStep: 'profile',
        progress: 0,
        availableSteps: ['profile', 'organization', 'team', 'preferences', 'tutorial'],
        completedSteps: []
      })
    })
  })

  describe('getOnboardingDestination', () => {
    it('should return dashboard for completed onboarding', async () => {
      const status = {
        completed: true,
        progress: 100
      }

      const destination = await authRouterService.getOnboardingDestination(mockUser, status)

      expect(destination).toBe('/dashboard')
    })

    it('should return next step URL for incomplete onboarding', async () => {
      const status = {
        completed: false,
        nextStep: 'organization',
        progress: 20
      }

      const destination = await authRouterService.getOnboardingDestination(mockUser, status)

      expect(destination).toBe('/onboarding/organization')
    })

    it('should default to profile step for unknown next step', async () => {
      const status = {
        completed: false,
        nextStep: 'unknown-step',
        progress: 0
      }

      const destination = await authRouterService.getOnboardingDestination(mockUser, status)

      expect(destination).toBe('/onboarding/profile')
    })
  })

  // Note: updateOnboardingProgress, completeOnboarding, and resetOnboarding tests
  // are covered by integration tests since they depend on the user-service
})