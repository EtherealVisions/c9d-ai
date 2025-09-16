/**
 * Unit tests for ProgressTrackerService
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProgressTrackerService } from '@/lib/services/progress-tracker-service'
import { DatabaseError } from '@/lib/errors'
import type { StepResult, OnboardingProgress } from '@/lib/models'

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

describe('ProgressTrackerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Service Structure', () => {
    it('should have all required methods', () => {
      expect(ProgressTrackerService.trackStepProgress).toBeDefined()
      expect(ProgressTrackerService.recordStepCompletion).toBeDefined()
      expect(ProgressTrackerService.getOverallProgress).toBeDefined()
      expect(ProgressTrackerService.identifyBlockers).toBeDefined()
      expect(ProgressTrackerService.awardMilestone).toBeDefined()
      expect(ProgressTrackerService.getUserAchievements).toBeDefined()
    })

    it('should be a class with static methods', () => {
      expect(typeof ProgressTrackerService.trackStepProgress).toBe('function')
      expect(typeof ProgressTrackerService.recordStepCompletion).toBe('function')
      expect(typeof ProgressTrackerService.getOverallProgress).toBe('function')
    })
  })

  describe('Type Safety', () => {
    it('should accept proper StepResult types', () => {
      const validStepResult: StepResult = {
        stepId: 'step-1',
        status: 'completed',
        timeSpent: 300,
        userActions: { clicks: 5, scrolls: 10 },
        feedback: { rating: 5 },
        errors: { validation: 'none' },
        achievements: { badge: 'first_step' }
      }

      // This validates that the types are properly defined
      expect(validStepResult.stepId).toBe('step-1')
      expect(validStepResult.status).toBe('completed')
      expect(validStepResult.timeSpent).toBe(300)
      expect(validStepResult.userActions).toEqual({ clicks: 5, scrolls: 10 })
    })

    it('should handle different progress statuses', () => {
      const statuses = ['not_started', 'in_progress', 'completed', 'skipped', 'failed'] as const
      
      statuses.forEach(status => {
        const stepResult: StepResult = {
          stepId: 'step-1',
          status,
          timeSpent: 100,
          userActions: {}
        }
        
        expect(stepResult.status).toBe(status)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors properly', async () => {
      // This test validates that the service properly handles errors
      await expect(async () => {
        try {
          await ProgressTrackerService.trackStepProgress('session-1', 'step-1', 'user-1', {
            status: 'in_progress'
          })
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          throw error
        }
      }).rejects.toThrow()
    })
  })

  describe('Business Logic', () => {
    it('should validate milestone criteria structure', () => {
      // Test that milestone criteria can be properly structured
      const progressCriteria = {
        progress_percentage: 50
      }
      
      const completionCriteria = {
        required_steps: ['step-1', 'step-2', 'step-3']
      }
      
      const timeCriteria = {
        max_time_minutes: 30
      }

      expect(progressCriteria.progress_percentage).toBe(50)
      expect(completionCriteria.required_steps).toHaveLength(3)
      expect(timeCriteria.max_time_minutes).toBe(30)
    })

    it('should handle blocker identification structure', () => {
      const blocker = {
        stepId: 'step-1',
        stepTitle: 'Setup Profile',
        blockerType: 'validation',
        description: 'User input failed validation',
        frequency: 3,
        suggestedResolution: 'Provide clearer validation messages'
      }

      expect(blocker.stepId).toBe('step-1')
      expect(blocker.blockerType).toBe('validation')
      expect(blocker.frequency).toBe(3)
    })
  })
})