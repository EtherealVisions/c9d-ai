import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthRouterService, authRouterService } from '../auth-router-service'
import { userService } from '../user-service'
import type { User } from '../../models/types'

// Mock dependencies
vi.mock('../user-service', () => ({
  userService: {
    getUser: vi.fn(),
    updateUserPreferences: vi.fn()
  }
}))

vi.mock('../../database', () => ({
  createSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn()
            })),
            single: vi.fn()
          })),
          limit: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        })),
        count: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn()
        }))
      }))
    }))
  })
}))

vi.mock('./auth-onboarding-integration', () => ({
  authOnboardingIntegration: {
    checkOnboardingRequirement: vi.fn(),
    synchronizeOnboardingState: vi.fn()
  }
}))

describe('AuthRouterService - Comprehensive Coverage', () => {
  let service: AuthRouterService
  let mockUser: User
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    service = new AuthRouterService()
    
    mockUser = {
      id: 'user-123',
      clerkUserId: 'clerk-user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: undefined,
      emailVerified: true,
      lastSignInAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        onboardingCompleted: false,
        onboardingSteps: {},
        theme: 'system',
        language: 'en',
        timezone: 'UTC'
      }
    }

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null })
              })),
              single: vi.fn().mockResolvedValue({ data: null, error: null })
            })),
            limit: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null })
            }))
          })),
          in: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null })
              }))
            }))
          })),
          count: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null })
            }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [], error: null })
          }))
        }))
      }))
    }

    // Replace the service's supabase instance
    ;(service as any).supabase = mockSupabase
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getPostAuthDestination', () => {
    it('should return validated redirect URL when provided', async () => {
      const redirectUrl = '/dashboard/projects'
      
      // Mock URL validation to pass
      vi.spyOn(service, 'validateRedirectUrl').mockResolvedValue({
        isValid: true,
        sanitizedUrl: redirectUrl,
        reason: 'URL validation passed'
      })

      const result = await service.getPostAuthDestination(mockUser, redirectUrl)

      expect(result.url).toBe(redirectUrl)
      expect(result.reason).toBe('User-requested redirect (validated)')
      expect(result.metadata?.validationPassed).toBe(true)
    })

    it('should reject invalid redirect URL and continue with normal flow', async () => {
      const invalidRedirectUrl = 'javascript:alert("xss")'
      
      // Mock URL validation to fail
      vi.spyOn(service, 'validateRedirectUrl').mockResolvedValue({
        isValid: false,
        reason: 'Security validation failed',
        securityIssues: ['suspicious_parameters']
      })

      // Mock onboarding status as completed
      vi.spyOn(service, 'getOnboardingStatus').mockResolvedValue({
        completed: true,
        progress: 100,
        availableSteps: [],
        completedSteps: []
      })

      const result = await service.getPostAuthDestination(mockUser, invalidRedirectUrl)

      expect(result.url).not.toBe(invalidRedirectUrl)
      expect(result.reason).not.toBe('User-requested redirect (validated)')
    })

    it('should redirect to onboarding when incomplete', async () => {
      const onboardingStatus = {
        completed: false,
        currentStep: 'profile',
        nextStep: 'organization',
        progress: 25,
        availableSteps: ['profile', 'organization', 'team', 'preferences'],
        completedSteps: ['profile']
      }

      vi.spyOn(service, 'getOnboardingStatus').mockResolvedValue(onboardingStatus)
      vi.spyOn(service, 'getOnboardingDestination').mockResolvedValue('/onboarding/organization')

      const result = await service.getPostAuthDestination(mockUser)

      expect(result.url).toBe('/onboarding/organization')
      expect(result.reason).toBe('Onboarding incomplete')
      expect(result.requiresOnboarding).toBe(true)
      expect(result.metadata?.onboardingProgress).toBe(25)
    })

    it('should handle organization context when provided', async () => {
      const organizationId = 'org-123'
      
      // Mock onboarding as completed
      vi.spyOn(service, 'getOnboardingStatus').mockResolvedValue({
        completed: true,
        progress: 100,
        availableSteps: [],
        completedSteps: []
      })

      // Mock organization access verification
      vi.spyOn(service, 'verifyOrganizationAccess').mockResolvedValue({
        hasAccess: true,
        role: 'admin',
        organizationName: 'Test Org',
        membershipId: 'membership-123'
      })

      vi.spyOn(service, 'getOrganizationDestination').mockResolvedValue('/organizations/org-123/admin')

      const result = await service.getPostAuthDestination(mockUser, undefined, organizationId)

      expect(result.url).toBe('/organizations/org-123/admin')
      expect(result.reason).toBe('Organization context provided')
      expect(result.organizationContext).toBe(organizationId)
      expect(result.metadata?.userRole).toBe('admin')
    })

    it('should find best organization destination when no specific org provided', async () => {
      // Mock onboarding as completed
      vi.spyOn(service, 'getOnboardingStatus').mockResolvedValue({
        completed: true,
        progress: 100,
        availableSteps: [],
        completedSteps: []
      })

      // Mock best organization destination
      vi.spyOn(service, 'getBestOrganizationDestination').mockResolvedValue({
        url: '/organizations/primary-org/dashboard',
        reason: 'Primary organization dashboard',
        organizationContext: 'primary-org',
        metadata: {
          organizationName: 'Primary Org',
          isPrimary: true
        }
      })

      const result = await service.getPostAuthDestination(mockUser)

      expect(result.url).toBe('/organizations/primary-org/dashboard')
      expect(result.reason).toBe('Primary organization dashboard')
      expect(result.organizationContext).toBe('primary-org')
    })

    it('should use last visited destination when valid and recent', async () => {
      const lastVisitedUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          onboardingCompleted: true,
          lastVisitedPath: '/projects/my-project',
          lastVisitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        }
      }

      // Mock onboarding as completed
      vi.spyOn(service, 'getOnboardingStatus').mockResolvedValue({
        completed: true,
        progress: 100,
        availableSteps: [],
        completedSteps: []
      })

      // Mock no organization destination
      vi.spyOn(service, 'getBestOrganizationDestination').mockResolvedValue(null)

      // Mock last visited destination
      vi.spyOn(service, 'getLastVisitedDestination').mockResolvedValue({
        url: '/projects/my-project',
        reason: 'Last visited path (recent)',
        metadata: {
          lastVisitedAt: lastVisitedUser.preferences.lastVisitedAt,
          daysSince: 2
        }
      })

      const result = await service.getPostAuthDestination(lastVisitedUser)

      expect(result.url).toBe('/projects/my-project')
      expect(result.reason).toBe('Last visited path (recent)')
    })

    it('should fallback to personalized dashboard', async () => {
      // Mock onboarding as completed
      vi.spyOn(service, 'getOnboardingStatus').mockResolvedValue({
        completed: true,
        progress: 100,
        availableSteps: [],
        completedSteps: []
      })

      // Mock no organization destination
      vi.spyOn(service, 'getBestOrganizationDestination').mockResolvedValue(null)

      // Mock no last visited destination
      vi.spyOn(service, 'getLastVisitedDestination').mockResolvedValue(null)

      // Mock personalized dashboard
      vi.spyOn(service, 'getPersonalizedDashboard').mockResolvedValue({
        url: '/dashboard',
        reason: 'Default dashboard',
        metadata: {
          isPersonalized: false,
          isDefault: true
        }
      })

      const result = await service.getPostAuthDestination(mockUser)

      expect(result.url).toBe('/dashboard')
      expect(result.reason).toBe('Default dashboard')
    })

    it('should handle errors gracefully with fallback', async () => {
      // Mock onboarding status to throw error
      vi.spyOn(service, 'getOnboardingStatus').mockRejectedValue(new Error('Database error'))

      const result = await service.getPostAuthDestination(mockUser)

      expect(result.url).toBe('/dashboard')
      expect(result.reason).toBe('Fallback due to error')
      expect(result.metadata?.error).toBe(true)
    })

    it('should log routing decisions', async () => {
      const logSpy = vi.spyOn(service, 'logRoutingDecision').mockResolvedValue()

      // Mock onboarding as completed
      vi.spyOn(service, 'getOnboardingStatus').mockResolvedValue({
        completed: true,
        progress: 100,
        availableSteps: [],
        completedSteps: []
      })

      vi.spyOn(service, 'getBestOrganizationDestination').mockResolvedValue(null)
      vi.spyOn(service, 'getLastVisitedDestination').mockResolvedValue(null)
      vi.spyOn(service, 'getPersonalizedDashboard').mockResolvedValue({
        url: '/dashboard',
        reason: 'Default dashboard',
        metadata: {}
      })

      await service.getPostAuthDestination(mockUser)

      expect(logSpy).toHaveBeenCalledWith(
        mockUser.id,
        'default_destination',
        expect.objectContaining({
          destination: '/dashboard',
          reason: 'Default dashboard'
        })
      )
    })
  })

  describe('handleProtectedRoute', () => {
    it('should create sign-in URL with redirect parameter', () => {
      const pathname = '/protected/page'
      const result = service.handleProtectedRoute(pathname)

      expect(result).toContain('/sign-in')
      expect(result).toContain('redirect_url=%2Fprotected%2Fpage')
    })

    it('should preserve search parameters', () => {
      const pathname = '/protected/page'
      const searchParams = new URLSearchParams('param1=value1&param2=value2')
      
      const result = service.handleProtectedRoute(pathname, searchParams)

      expect(result).toContain('param1=value1')
      expect(result).toContain('param2=value2')
    })

    it('should not add redirect for root path', () => {
      const result = service.handleProtectedRoute('/')

      expect(result).toBe('/sign-in')
    })
  })

  describe('getOnboardingDestination', () => {
    it('should return dashboard when onboarding is completed', async () => {
      const completedStatus = {
        completed: true,
        progress: 100,
        availableSteps: [],
        completedSteps: []
      }

      const result = await service.getOnboardingDestination(mockUser, completedStatus)

      expect(result).toBe('/dashboard')
    })

    it('should use integrated onboarding system when available', async () => {
      const { authOnboardingIntegration } = await import('./auth-onboarding-integration')
      
      vi.mocked(authOnboardingIntegration.checkOnboardingRequirement).mockResolvedValue({
        shouldRedirectToOnboarding: true,
        onboardingUrl: '/onboarding/integrated/step-1'
      })

      const result = await service.getOnboardingDestination(mockUser)

      expect(result).toBe('/onboarding/integrated/step-1')
    })

    it('should fallback to simple routing when integrated system fails', async () => {
      const { authOnboardingIntegration } = await import('./auth-onboarding-integration')
      
      vi.mocked(authOnboardingIntegration.checkOnboardingRequirement).mockRejectedValue(
        new Error('Integration error')
      )

      const incompleteStatus = {
        completed: false,
        nextStep: 'organization',
        progress: 25,
        availableSteps: [],
        completedSteps: []
      }

      const result = await service.getOnboardingDestination(mockUser, incompleteStatus)

      expect(result).toBe('/onboarding/organization')
    })

    it('should handle different onboarding steps', async () => {
      const { authOnboardingIntegration } = await import('./auth-onboarding-integration')
      
      vi.mocked(authOnboardingIntegration.checkOnboardingRequirement).mockRejectedValue(
        new Error('Integration error')
      )

      const testCases = [
        { nextStep: 'profile', expected: '/onboarding/profile' },
        { nextStep: 'organization', expected: '/onboarding/organization' },
        { nextStep: 'team', expected: '/onboarding/team' },
        { nextStep: 'preferences', expected: '/onboarding/preferences' },
        { nextStep: 'tutorial', expected: '/onboarding/tutorial' },
        { nextStep: 'unknown', expected: '/onboarding/profile' }
      ]

      for (const testCase of testCases) {
        const status = {
          completed: false,
          nextStep: testCase.nextStep,
          progress: 25,
          availableSteps: [],
          completedSteps: []
        }

        const result = await service.getOnboardingDestination(mockUser, status)
        expect(result).toBe(testCase.expected)
      }
    })
  })

  describe('getOnboardingStatus', () => {
    it('should return completed status when onboarding is done', async () => {
      const completedUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          onboardingCompleted: true
        }
      }

      const result = await service.getOnboardingStatus(completedUser)

      expect(result.completed).toBe(true)
      expect(result.progress).toBe(100)
      expect(result.availableSteps).toEqual(['profile', 'organization', 'team', 'preferences', 'tutorial'])
      expect(result.completedSteps).toEqual(['profile', 'organization', 'team', 'preferences', 'tutorial'])
    })

    it('should calculate progress based on completed steps', async () => {
      const partialUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          onboardingSteps: {
            profile: true,
            organization: true
          }
        }
      }

      const result = await service.getOnboardingStatus(partialUser)

      expect(result.completed).toBe(false)
      expect(result.progress).toBe(40) // 2 out of 5 steps = 40%
      expect(result.currentStep).toBe('organization')
      expect(result.nextStep).toBe('team')
      expect(result.completedSteps).toEqual(['profile', 'organization'])
    })

    it('should skip organization step when user has organizations', async () => {
      vi.spyOn(service, 'shouldSkipOrganizationStep').mockResolvedValue(true)

      const userAtOrgStep = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          onboardingSteps: {
            profile: true
          }
        }
      }

      const result = await service.getOnboardingStatus(userAtOrgStep)

      expect(result.nextStep).toBe('team')
    })

    it('should skip team step when user preferences indicate so', async () => {
      vi.spyOn(service, 'shouldSkipOrganizationStep').mockResolvedValue(false)
      vi.spyOn(service, 'shouldSkipTeamStep').mockResolvedValue(true)

      const userAtTeamStep = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          onboardingSteps: {
            profile: true,
            organization: true
          }
        }
      }

      const result = await service.getOnboardingStatus(userAtTeamStep)

      expect(result.nextStep).toBe('preferences')
    })

    it('should handle errors gracefully', async () => {
      // Mock shouldSkipOrganizationStep to throw error
      vi.spyOn(service, 'shouldSkipOrganizationStep').mockRejectedValue(new Error('Database error'))

      const result = await service.getOnboardingStatus(mockUser)

      expect(result.completed).toBe(false)
      expect(result.nextStep).toBe('profile')
      expect(result.progress).toBe(0)
    })
  })

  describe('validateRedirectUrl', () => {
    it('should validate allowed URLs', async () => {
      const testCases = [
        '/dashboard',
        '/organizations/org-123',
        '/onboarding/profile',
        '/profile/settings',
        '/settings/preferences',
        '/projects/my-project',
        '/teams/team-123'
      ]

      for (const url of testCases) {
        const result = await service.validateRedirectUrl(url, { user: mockUser })
        expect(result.isValid).toBe(true)
        expect(result.sanitizedUrl).toBe(url)
      }
    })

    it('should reject blocked URLs', async () => {
      const testCases = [
        '/api/users',
        '/admin/dashboard',
        '/_next/static/file.js',
        '/sign-in',
        '/sign-up',
        '/verify-email',
        '/reset-password',
        '/webhooks/clerk'
      ]

      for (const url of testCases) {
        const result = await service.validateRedirectUrl(url, { user: mockUser })
        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toContain('blocked_path')
      }
    })

    it('should reject external origins', async () => {
      const result = await service.validateRedirectUrl('https://evil.com/dashboard', { user: mockUser })

      expect(result.isValid).toBe(false)
      expect(result.securityIssues).toContain('external_origin')
    })

    it('should reject suspicious parameters', async () => {
      const testCases = [
        '/dashboard?redirect=javascript:alert(1)',
        '/profile?data:text/html,<script>alert(1)</script>',
        '/settings?vbscript:msgbox(1)'
      ]

      for (const url of testCases) {
        const result = await service.validateRedirectUrl(url, { user: mockUser })
        expect(result.isValid).toBe(false)
        expect(result.securityIssues).toContain('suspicious_parameters')
      }
    })

    it('should validate organization access for org URLs', async () => {
      vi.spyOn(service, 'verifyOrganizationAccess').mockResolvedValue({
        hasAccess: false
      })

      const result = await service.validateRedirectUrl('/organizations/restricted-org', { user: mockUser })

      expect(result.isValid).toBe(false)
      expect(result.securityIssues).toContain('organization_access_denied')
    })

    it('should handle malformed URLs', async () => {
      const result = await service.validateRedirectUrl('not-a-valid-url', { user: mockUser })

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Invalid URL format')
      expect(result.securityIssues).toContain('malformed_url')
    })
  })

  describe('updateOnboardingProgress', () => {
    it('should update specific onboarding step', async () => {
      const mockGetUser = vi.mocked(userService.getUser)
      const mockUpdatePreferences = vi.mocked(userService.updateUserPreferences)

      mockGetUser.mockResolvedValue({
        data: mockUser,
        error: null
      })

      mockUpdatePreferences.mockResolvedValue({
        data: mockUser,
        error: null
      })

      await service.updateOnboardingProgress('user-123', 'profile', true)

      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          onboardingSteps: expect.objectContaining({
            profile: true
          }),
          lastOnboardingUpdate: expect.any(String)
        })
      )
    })

    it('should mark onboarding as completed when all steps are done', async () => {
      const userWithMostSteps = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          onboardingSteps: {
            profile: true,
            organization: true,
            team: true,
            preferences: true
          }
        }
      }

      const mockGetUser = vi.mocked(userService.getUser)
      const mockUpdatePreferences = vi.mocked(userService.updateUserPreferences)

      mockGetUser.mockResolvedValue({
        data: userWithMostSteps,
        error: null
      })

      mockUpdatePreferences.mockResolvedValue({
        data: userWithMostSteps,
        error: null
      })

      await service.updateOnboardingProgress('user-123', 'tutorial', true)

      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          onboardingCompleted: true,
          onboardingSteps: expect.objectContaining({
            tutorial: true
          })
        })
      )
    })

    it('should handle user not found error', async () => {
      const mockGetUser = vi.mocked(userService.getUser)

      mockGetUser.mockResolvedValue({
        data: null,
        error: 'User not found'
      })

      await expect(service.updateOnboardingProgress('invalid-user', 'profile', true))
        .rejects.toThrow('User not found')
    })
  })

  describe('completeOnboarding', () => {
    it('should complete onboarding and synchronize with integrated system', async () => {
      const mockGetUser = vi.mocked(userService.getUser)
      const mockUpdatePreferences = vi.mocked(userService.updateUserPreferences)
      const { authOnboardingIntegration } = await import('./auth-onboarding-integration')

      mockGetUser.mockResolvedValue({
        data: mockUser,
        error: null
      })

      mockUpdatePreferences.mockResolvedValue({
        data: mockUser,
        error: null
      })

      vi.mocked(authOnboardingIntegration.synchronizeOnboardingState).mockResolvedValue()

      await service.completeOnboarding('user-123')

      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          onboardingCompleted: true,
          onboardingCompletedAt: expect.any(String),
          onboardingSteps: {
            profile: true,
            organization: true,
            team: true,
            preferences: true,
            tutorial: true
          }
        })
      )

      expect(authOnboardingIntegration.synchronizeOnboardingState).toHaveBeenCalledWith('user-123')
    })

    it('should complete onboarding even if synchronization fails', async () => {
      const mockGetUser = vi.mocked(userService.getUser)
      const mockUpdatePreferences = vi.mocked(userService.updateUserPreferences)
      const { authOnboardingIntegration } = await import('./auth-onboarding-integration')

      mockGetUser.mockResolvedValue({
        data: mockUser,
        error: null
      })

      mockUpdatePreferences.mockResolvedValue({
        data: mockUser,
        error: null
      })

      vi.mocked(authOnboardingIntegration.synchronizeOnboardingState).mockRejectedValue(
        new Error('Sync failed')
      )

      // Should not throw error
      await expect(service.completeOnboarding('user-123')).resolves.not.toThrow()

      expect(mockUpdatePreferences).toHaveBeenCalled()
    })
  })

  describe('resetOnboarding', () => {
    it('should reset onboarding progress', async () => {
      const mockGetUser = vi.mocked(userService.getUser)
      const mockUpdatePreferences = vi.mocked(userService.updateUserPreferences)

      mockGetUser.mockResolvedValue({
        data: mockUser,
        error: null
      })

      mockUpdatePreferences.mockResolvedValue({
        data: mockUser,
        error: null
      })

      await service.resetOnboarding('user-123')

      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          onboardingCompleted: false,
          onboardingSteps: {},
          onboardingResetAt: expect.any(String)
        })
      )
    })
  })

  describe('logRoutingDecision', () => {
    it('should log routing decision to audit logs', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ data: [], error: null })
      mockSupabase.from.mockReturnValue({
        insert: insertSpy
      })

      await service.logRoutingDecision('user-123', 'test_decision', { test: 'metadata' })

      expect(insertSpy).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'auth.routing.test_decision',
        resource_type: 'authentication',
        resource_id: 'user-123',
        metadata: expect.objectContaining({
          test: 'metadata',
          timestamp: expect.any(String),
          service: 'AuthRouterService'
        })
      })
    })

    it('should not throw error when logging fails', async () => {
      const insertSpy = vi.fn().mockRejectedValue(new Error('Database error'))
      mockSupabase.from.mockReturnValue({
        insert: insertSpy
      })

      // Should not throw
      await expect(service.logRoutingDecision('user-123', 'test_decision'))
        .resolves.not.toThrow()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle user with no preferences', async () => {
      const userWithoutPreferences = {
        ...mockUser,
        preferences: undefined as any
      }

      const result = await service.getOnboardingStatus(userWithoutPreferences)

      expect(result.completed).toBe(false)
      expect(result.progress).toBe(0)
      expect(result.nextStep).toBe('profile')
    })

    it('should handle empty organization memberships', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
              }))
            }))
          }))
        }))
      })

      const result = await service.getUserPrimaryOrganization('user-123')

      expect(result).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database connection failed' } 
            })
          }))
        }))
      })

      const result = await service.verifyOrganizationAccess('user-123', 'org-123')

      expect(result.hasAccess).toBe(false)
    })
  })
})