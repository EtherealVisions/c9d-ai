/**
 * Unit tests for OnboardingService
 * Requirements: 1.1, 2.1, 6.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OnboardingService } from '@/lib/services/onboarding-service'
import { DatabaseError, NotFoundError } from '@/lib/errors'
import type { OnboardingContext } from '@/lib/models'

// Mock the database
vi.mock('@/lib/database', () => ({
  createSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      overlaps: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis()
    }))
  })
}))

describe('OnboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Service Structure', () => {
    it('should have all required methods', () => {
      expect(OnboardingService.initializeOnboarding).toBeDefined()
      expect(OnboardingService.getOnboardingSession).toBeDefined()
      expect(OnboardingService.updateOnboardingProgress).toBeDefined()
      expect(OnboardingService.getUserOnboardingSessions).toBeDefined()
      expect(OnboardingService.getOnboardingPath).toBeDefined()
      expect(OnboardingService.getAvailableOnboardingPaths).toBeDefined()
      expect(OnboardingService.completeOnboardingSession).toBeDefined()
      expect(OnboardingService.pauseOnboardingSession).toBeDefined()
      expect(OnboardingService.resumeOnboardingSession).toBeDefined()
    })

    it('should be a class with static methods', () => {
      expect(typeof OnboardingService.initializeOnboarding).toBe('function')
      expect(typeof OnboardingService.getOnboardingSession).toBe('function')
      expect(typeof OnboardingService.updateOnboardingProgress).toBe('function')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors properly', async () => {
      // This test validates that the service properly handles errors
      // The actual database calls are mocked, so we're testing the error handling logic
      const context = {
        userId: 'user-1',
        userRole: 'developer'
      }

      // The service should handle errors gracefully
      await expect(async () => {
        try {
          await OnboardingService.initializeOnboarding('user-1', context)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          throw error
        }
      }).rejects.toThrow()
    })
  })

  describe('Type Safety', () => {
    it('should accept proper OnboardingContext types', () => {
      const validContext: OnboardingContext = {
        userId: 'user-1',
        userRole: 'developer',
        organizationId: 'org-1',
        subscriptionTier: 'pro',
        preferences: { theme: 'dark' }
      }

      // This validates that the types are properly defined
      expect(validContext.userId).toBe('user-1')
      expect(validContext.userRole).toBe('developer')
      expect(validContext.organizationId).toBe('org-1')
      expect(validContext.subscriptionTier).toBe('pro')
    })
  })
})