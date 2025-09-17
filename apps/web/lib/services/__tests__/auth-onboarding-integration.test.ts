import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthOnboardingIntegrationService } from '../auth-onboarding-integration'
import type { User } from '../../models/types'

// Mock dependencies
vi.mock('../auth-router-service', () => ({
  authRouterService: {
    getOnboardingStatus: vi.fn(),
    getOnboardingDestination: vi.fn(),
    completeOnboarding: vi.fn(),
    updateOnboardingProgress: vi.fn()
  }
}))

vi.mock('../onboarding-service', () => ({
  OnboardingService: {
    getUserOnboardingSessions: vi.fn(),
    initializeOnboarding: vi.fn(),
    resumeOnboardingSession: vi.fn(),
    completeOnboarding: vi.fn()
  }
}))

vi.mock('../user-sync', () => ({
  userSyncService: {
    getUserByClerkId: vi.fn(),
    syncUser: vi.fn()
  }
}))

describe('AuthOnboardingIntegrationService', () => {
  const mockUser: User = {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkOnboardingRequirement', () => {
    it('should return no redirect when onboarding is completed', async () => {
      const { authRouterService } = require('../auth-router-service')
      
      authRouterService.getOnboardingStatus.mockResolvedValue({
        completed: true,
        progress: 100,
        completedSteps: ['profile', 'organization', 'team', 'preferences', 'tutorial']
      })

      const result = await AuthOnboardingIntegrationService.checkOnboardingRequirement(mockUser)

      expect(result.shouldRedirectToOnboarding).toBe(false)
      expect(result.reason).toBe('Onboarding already completed')
    })

    it('should resume existing active session', async () => {
      const { authRouterService } = require('../auth-router-service')
      const { OnboardingService } = require('../onboarding-service')
      
      authRouterService.getOnboardingStatus.mockResolvedValue({
        completed: false,
        progress: 50,
        nextStep: 'organization'
      })

      const mockSession = {
        id: 'session-1',
        status: 'active',
        current_step_id: 'step-2',
        progress_percentage: 50,
        path: {
          steps: [
            { id: 'step-1', step_order: 0 },
            { id: 'step-2', step_order: 1 }
          ]
        }
      }

      OnboardingService.getUserOnboardingSessions.mockResolvedValue([mockSession])

      const result = await AuthOnboardingIntegrationService.checkOnboardingRequirement(mockUser)

      expect(result.shouldRedirectToOnboarding).toBe(true)
      expect(result.reason).toBe('Resume existing onboarding session')
      expect(result.session).toEqual(mockSession)
      expect(result.onboardingUrl).toBe('/onboarding/session-1/step/step-2')
    })

    it('should create new session when no existing session', async () => {
      const { authRouterService } = require('../auth-router-service')
      const { OnboardingService } = require('../onboarding-service')
      
      authRouterService.getOnboardingStatus.mockResolvedValue({
        completed: false,
        progress: 0,
        nextStep: 'profile'
      })

      OnboardingService.getUserOnboardingSessions.mockResolvedValue([])
      
      const mockNewSession = {
        id: 'session-2',
        status: 'active',
        current_step_id: 'step-1',
        progress_percentage: 0,
        path_id: 'path-1',
        session_type: 'individual',
        path: {
          steps: [
            { id: 'step-1', step_order: 0 }
          ]
        }
      }

      OnboardingService.initializeOnboarding.mockResolvedValue(mockNewSession)

      const result = await AuthOnboardingIntegrationService.checkOnboardingRequirement(mockUser)

      expect(result.shouldRedirectToOnboarding).toBe(true)
      expect(result.reason).toBe('New onboarding session created')
      expect(result.session).toEqual(mockNewSession)
    })

    it('should handle errors gracefully with fallback', async () => {
      const { authRouterService } = require('../auth-router-service')
      
      authRouterService.getOnboardingStatus.mockRejectedValue(new Error('Service error'))
      authRouterService.getOnboardingDestination.mockResolvedValue('/onboarding/profile')

      const result = await AuthOnboardingIntegrationService.checkOnboardingRequirement(mockUser)

      expect(result.shouldRedirectToOnboarding).toBe(true)
      expect(result.reason).toBe('Fallback due to error')
      expect(result.onboardingUrl).toBe('/onboarding/profile')
    })
  })

  describe('completeOnboarding', () => {
    it('should complete onboarding successfully', async () => {
      const { authRouterService } = require('../auth-router-service')
      const { OnboardingService } = require('../onboarding-service')
      const { userSyncService } = require('../user-sync')
      
      OnboardingService.completeOnboarding.mockResolvedValue({
        success: true,
        completionData: { achievements: ['first_login'] }
      })

      userSyncService.getUserByClerkId.mockResolvedValue(mockUser)
      
      authRouterService.getPostAuthDestination.mockResolvedValue({
        url: '/dashboard',
        reason: 'Default dashboard'
      })

      const result = await AuthOnboardingIntegrationService.completeOnboarding('user-1', 'session-1')

      expect(result.success).toBe(true)
      expect(result.redirectUrl).toBe('/dashboard')
      expect(authRouterService.completeOnboarding).toHaveBeenCalledWith('user-1')
    })

    it('should handle completion errors gracefully', async () => {
      const { OnboardingService } = require('../onboarding-service')
      
      OnboardingService.completeOnboarding.mockResolvedValue({
        success: false
      })

      const result = await AuthOnboardingIntegrationService.completeOnboarding('user-1', 'session-1')

      expect(result.success).toBe(false)
      expect(result.redirectUrl).toBe('/dashboard') // Fallback
    })
  })

  describe('getComprehensiveOnboardingStatus', () => {
    it('should return comprehensive status with active session', async () => {
      const { authRouterService } = require('../auth-router-service')
      const { OnboardingService } = require('../onboarding-service')
      const { userSyncService } = require('../user-sync')
      
      userSyncService.getUserByClerkId.mockResolvedValue(mockUser)
      
      const mockStatus = {
        completed: false,
        progress: 25,
        nextStep: 'organization'
      }
      
      authRouterService.getOnboardingStatus.mockResolvedValue(mockStatus)
      
      const mockSession = {
        id: 'session-1',
        status: 'active',
        current_step_id: 'step-2',
        progress_percentage: 25
      }
      
      OnboardingService.getUserOnboardingSessions.mockResolvedValue([mockSession])

      const result = await AuthOnboardingIntegrationService.getComprehensiveOnboardingStatus('user-1')

      expect(result.authRouterStatus).toEqual(mockStatus)
      expect(result.onboardingSessions).toEqual([mockSession])
      expect(result.currentSession).toEqual(mockSession)
      expect(result.recommendedAction).toBe('complete')
    })

    it('should recommend start when no sessions exist', async () => {
      const { authRouterService } = require('../auth-router-service')
      const { OnboardingService } = require('../onboarding-service')
      const { userSyncService } = require('../user-sync')
      
      userSyncService.getUserByClerkId.mockResolvedValue(mockUser)
      
      authRouterService.getOnboardingStatus.mockResolvedValue({
        completed: false,
        progress: 0,
        nextStep: 'profile'
      })
      
      authRouterService.getOnboardingDestination.mockResolvedValue('/onboarding/profile')
      
      OnboardingService.getUserOnboardingSessions.mockResolvedValue([])

      const result = await AuthOnboardingIntegrationService.getComprehensiveOnboardingStatus('user-1')

      expect(result.recommendedAction).toBe('start')
      expect(result.nextUrl).toBe('/onboarding/profile')
    })

    it('should handle errors with safe defaults', async () => {
      const { userSyncService } = require('../user-sync')
      
      userSyncService.getUserByClerkId.mockResolvedValue(null)

      const result = await AuthOnboardingIntegrationService.getComprehensiveOnboardingStatus('user-1')

      expect(result.authRouterStatus.completed).toBe(false)
      expect(result.recommendedAction).toBe('start')
      expect(result.nextUrl).toBe('/onboarding/profile')
    })
  })

  describe('synchronizeOnboardingState', () => {
    it('should sync completed state from AuthRouter to OnboardingService', async () => {
      const { authRouterService } = require('../auth-router-service')
      const { OnboardingService } = require('../onboarding-service')
      const { userSyncService } = require('../user-sync')
      
      userSyncService.getUserByClerkId.mockResolvedValue(mockUser)
      
      authRouterService.getOnboardingStatus.mockResolvedValue({
        completed: true
      })
      
      const mockSession = {
        id: 'session-1',
        status: 'active'
      }
      
      OnboardingService.getUserOnboardingSessions.mockResolvedValue([mockSession])

      await AuthOnboardingIntegrationService.synchronizeOnboardingState('user-1')

      expect(OnboardingService.completeOnboardingSession).toHaveBeenCalledWith('session-1')
    })

    it('should sync completed state from OnboardingService to AuthRouter', async () => {
      const { authRouterService } = require('../auth-router-service')
      const { OnboardingService } = require('../onboarding-service')
      const { userSyncService } = require('../user-sync')
      
      userSyncService.getUserByClerkId.mockResolvedValue(mockUser)
      
      authRouterService.getOnboardingStatus.mockResolvedValue({
        completed: false
      })
      
      const mockSession = {
        id: 'session-1',
        status: 'completed'
      }
      
      OnboardingService.getUserOnboardingSessions.mockResolvedValue([mockSession])

      await AuthOnboardingIntegrationService.synchronizeOnboardingState('user-1')

      expect(authRouterService.completeOnboarding).toHaveBeenCalledWith('user-1')
    })

    it('should handle sync errors gracefully', async () => {
      const { userSyncService } = require('../user-sync')
      
      userSyncService.getUserByClerkId.mockResolvedValue(null)

      // Should not throw
      await expect(
        AuthOnboardingIntegrationService.synchronizeOnboardingState('user-1')
      ).resolves.toBeUndefined()
    })
  })

  describe('updateOnboardingStep', () => {
    it('should update step in both systems', async () => {
      const { authRouterService } = require('../auth-router-service')

      await AuthOnboardingIntegrationService.updateOnboardingStep(
        'user-1',
        'profile',
        true,
        'session-1'
      )

      expect(authRouterService.updateOnboardingProgress).toHaveBeenCalledWith(
        'user-1',
        'profile',
        true
      )
    })

    it('should handle update errors gracefully', async () => {
      const { authRouterService } = require('../auth-router-service')
      
      authRouterService.updateOnboardingProgress.mockRejectedValue(new Error('Update failed'))

      // Should not throw
      await expect(
        AuthOnboardingIntegrationService.updateOnboardingStep('user-1', 'profile', true)
      ).resolves.toBeUndefined()
    })
  })
})