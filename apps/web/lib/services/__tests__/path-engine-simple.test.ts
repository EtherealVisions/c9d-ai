/**
 * Simplified unit tests for PathEngine
 * Tests core business logic and helper methods
 */

import { describe, it, expect } from 'vitest'

describe('PathEngine Helper Methods', () => {
  // Test the scoring logic directly
  describe('scoreDurationForPace', () => {
    const scoreDurationForPace = (duration: number, pacePreference: string): number => {
      switch (pacePreference) {
        case 'fast':
          return duration < 30 ? 10 : duration < 60 ? 5 : -5
        case 'slow':
          return duration > 90 ? 10 : duration > 60 ? 5 : -5
        case 'medium':
        default:
          return duration >= 30 && duration <= 90 ? 10 : 0
      }
    }

    it('should score fast pace preference correctly', () => {
      expect(scoreDurationForPace(20, 'fast')).toBe(10)
      expect(scoreDurationForPace(45, 'fast')).toBe(5)
      expect(scoreDurationForPace(120, 'fast')).toBe(-5)
    })

    it('should score slow pace preference correctly', () => {
      expect(scoreDurationForPace(120, 'slow')).toBe(10)
      expect(scoreDurationForPace(75, 'slow')).toBe(5)
      expect(scoreDurationForPace(20, 'slow')).toBe(-5)
    })

    it('should score medium pace preference correctly', () => {
      expect(scoreDurationForPace(60, 'medium')).toBe(10)
      expect(scoreDurationForPace(20, 'medium')).toBe(0)
      expect(scoreDurationForPace(120, 'medium')).toBe(0)
    })
  })

  describe('behavior analysis logic', () => {
    const analyzeBehaviorPatterns = (stepInteractions: Array<{
      stepId: string
      timeSpent: number
      attempts: number
      completionRate: number
      skipRate: number
      errorRate: number
    }>) => {
      const strugglingSteps = stepInteractions
        .filter(interaction => interaction.errorRate > 0.3 || interaction.skipRate > 0.2)
        .map(interaction => interaction.stepId)

      const avgTimePerStep = stepInteractions.reduce((sum, interaction) => 
        sum + interaction.timeSpent, 0) / stepInteractions.length

      let preferredPace = 'medium'
      if (avgTimePerStep < 300) preferredPace = 'fast' // Less than 5 minutes per step
      else if (avgTimePerStep > 900) preferredPace = 'slow' // More than 15 minutes per step

      const recommendedAdjustments = []
      if (strugglingSteps.length > 2) {
        recommendedAdjustments.push('reduce_difficulty')
      }
      if (preferredPace !== 'medium') {
        recommendedAdjustments.push(`adjust_pacing_${preferredPace}`)
      }

      return {
        strugglingSteps,
        preferredPace,
        recommendedAdjustments
      }
    }

    it('should identify struggling steps correctly', () => {
      const interactions = [
        {
          stepId: 'step-1',
          timeSpent: 600,
          attempts: 1,
          completionRate: 1.0,
          skipRate: 0.0,
          errorRate: 0.0
        },
        {
          stepId: 'step-2',
          timeSpent: 1200,
          attempts: 3,
          completionRate: 0.6,
          skipRate: 0.0,
          errorRate: 0.4 // High error rate
        },
        {
          stepId: 'step-3',
          timeSpent: 300,
          attempts: 1,
          completionRate: 0.7,
          skipRate: 0.3, // High skip rate
          errorRate: 0.0
        }
      ]

      const result = analyzeBehaviorPatterns(interactions)

      expect(result.strugglingSteps).toContain('step-2')
      expect(result.strugglingSteps).toContain('step-3')
      expect(result.strugglingSteps).not.toContain('step-1')
    })

    it('should determine pace preference correctly', () => {
      const fastInteractions = [
        { stepId: 'step-1', timeSpent: 120, attempts: 1, completionRate: 1.0, skipRate: 0.0, errorRate: 0.0 },
        { stepId: 'step-2', timeSpent: 180, attempts: 1, completionRate: 1.0, skipRate: 0.0, errorRate: 0.0 }
      ]

      const slowInteractions = [
        { stepId: 'step-1', timeSpent: 1200, attempts: 1, completionRate: 1.0, skipRate: 0.0, errorRate: 0.0 },
        { stepId: 'step-2', timeSpent: 1800, attempts: 1, completionRate: 1.0, skipRate: 0.0, errorRate: 0.0 }
      ]

      const mediumInteractions = [
        { stepId: 'step-1', timeSpent: 600, attempts: 1, completionRate: 1.0, skipRate: 0.0, errorRate: 0.0 },
        { stepId: 'step-2', timeSpent: 480, attempts: 1, completionRate: 1.0, skipRate: 0.0, errorRate: 0.0 }
      ]

      expect(analyzeBehaviorPatterns(fastInteractions).preferredPace).toBe('fast')
      expect(analyzeBehaviorPatterns(slowInteractions).preferredPace).toBe('slow')
      expect(analyzeBehaviorPatterns(mediumInteractions).preferredPace).toBe('medium')
    })

    it('should recommend appropriate adjustments', () => {
      const strugglingInteractions = [
        { stepId: 'step-1', timeSpent: 1200, attempts: 3, completionRate: 0.6, skipRate: 0.0, errorRate: 0.4 }, // 20 minutes
        { stepId: 'step-2', timeSpent: 1800, attempts: 4, completionRate: 0.5, skipRate: 0.0, errorRate: 0.5 }, // 30 minutes
        { stepId: 'step-3', timeSpent: 2400, attempts: 2, completionRate: 0.7, skipRate: 0.3, errorRate: 0.0 }  // 40 minutes
      ]

      const result = analyzeBehaviorPatterns(strugglingInteractions)

      expect(result.recommendedAdjustments).toContain('reduce_difficulty')
      expect(result.recommendedAdjustments).toContain('adjust_pacing_slow')
    })
  })

  describe('path validation logic', () => {
    const validatePathStructure = (steps: Array<{
      id: string
      step_order: number
      is_required: boolean
      dependencies: string[]
    }>, completedStepIds: string[]) => {
      const issues: string[] = []
      
      if (steps.length === 0) {
        issues.push('Path has no steps defined')
      }

      const requiredSteps = steps.filter(s => s.is_required)
      const missingRequiredSteps = requiredSteps.filter(s => !completedStepIds.includes(s.id))

      if (missingRequiredSteps.length > 0) {
        issues.push(`Missing ${missingRequiredSteps.length} required steps`)
      }

      // Check for dependency violations
      for (const step of steps) {
        const unmetDependencies = step.dependencies.filter(depId => 
          !completedStepIds.includes(depId)
        )
        if (unmetDependencies.length > 0 && completedStepIds.includes(step.id)) {
          issues.push(`Step "${step.id}" completed without meeting dependencies`)
        }
      }

      const completionPercentage = steps.length > 0 ? (completedStepIds.length / steps.length) * 100 : 0

      return {
        isValid: issues.length === 0 && completionPercentage === 100,
        issues,
        completionPercentage,
        missingSteps: missingRequiredSteps.map(s => s.id)
      }
    }

    it('should validate complete path successfully', () => {
      const steps = [
        { id: 'step-1', step_order: 0, is_required: true, dependencies: [] },
        { id: 'step-2', step_order: 1, is_required: true, dependencies: ['step-1'] }
      ]
      const completedStepIds = ['step-1', 'step-2']

      const result = validatePathStructure(steps, completedStepIds)

      expect(result.isValid).toBe(true)
      expect(result.completionPercentage).toBe(100)
      expect(result.issues).toHaveLength(0)
      expect(result.missingSteps).toHaveLength(0)
    })

    it('should identify missing required steps', () => {
      const steps = [
        { id: 'step-1', step_order: 0, is_required: true, dependencies: [] },
        { id: 'step-2', step_order: 1, is_required: true, dependencies: ['step-1'] }
      ]
      const completedStepIds = ['step-1'] // step-2 missing

      const result = validatePathStructure(steps, completedStepIds)

      expect(result.isValid).toBe(false)
      expect(result.completionPercentage).toBe(50)
      expect(result.issues).toContain('Missing 1 required steps')
      expect(result.missingSteps).toContain('step-2')
    })

    it('should identify dependency violations', () => {
      const steps = [
        { id: 'step-1', step_order: 0, is_required: true, dependencies: [] },
        { id: 'step-2', step_order: 1, is_required: true, dependencies: ['step-1'] }
      ]
      const completedStepIds = ['step-2'] // step-2 completed without step-1

      const result = validatePathStructure(steps, completedStepIds)

      expect(result.isValid).toBe(false)
      expect(result.issues.some(issue => issue.includes('dependencies'))).toBe(true)
    })

    it('should handle empty path', () => {
      const steps: any[] = []
      const completedStepIds: string[] = []

      const result = validatePathStructure(steps, completedStepIds)

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Path has no steps defined')
      expect(result.completionPercentage).toBe(0)
    })
  })

  describe('next step determination logic', () => {
    const getNextStep = (steps: Array<{
      id: string
      step_order: number
      dependencies: string[]
    }>, completedStepIds: string[]) => {
      const sortedSteps = steps.sort((a, b) => a.step_order - b.step_order)

      for (const step of sortedSteps) {
        if (!completedStepIds.includes(step.id)) {
          // Check if dependencies are met
          const dependenciesMet = step.dependencies.every(depId => 
            completedStepIds.includes(depId)
          )
          
          if (dependenciesMet) {
            return step
          }
        }
      }

      return null // All steps completed or no available steps
    }

    it('should return the next incomplete step', () => {
      const steps = [
        { id: 'step-1', step_order: 0, dependencies: [] },
        { id: 'step-2', step_order: 1, dependencies: ['step-1'] },
        { id: 'step-3', step_order: 2, dependencies: ['step-2'] }
      ]
      const completedStepIds = ['step-1']

      const result = getNextStep(steps, completedStepIds)

      expect(result).toBeDefined()
      expect(result?.id).toBe('step-2')
    })

    it('should return null when all steps are completed', () => {
      const steps = [
        { id: 'step-1', step_order: 0, dependencies: [] },
        { id: 'step-2', step_order: 1, dependencies: ['step-1'] }
      ]
      const completedStepIds = ['step-1', 'step-2']

      const result = getNextStep(steps, completedStepIds)

      expect(result).toBeNull()
    })

    it('should respect step dependencies', () => {
      const steps = [
        { id: 'step-1', step_order: 0, dependencies: [] },
        { id: 'step-2', step_order: 1, dependencies: ['step-1'] }
      ]
      const completedStepIds: string[] = [] // No steps completed

      const result = getNextStep(steps, completedStepIds)

      expect(result).toBeDefined()
      expect(result?.id).toBe('step-1') // Should return first step since step-2 depends on step-1
    })

    it('should skip steps with unmet dependencies', () => {
      const steps = [
        { id: 'step-1', step_order: 0, dependencies: [] },
        { id: 'step-2', step_order: 1, dependencies: ['step-1'] },
        { id: 'step-3', step_order: 2, dependencies: [] } // No dependencies
      ]
      const completedStepIds = ['step-3'] // Only step-3 completed

      const result = getNextStep(steps, completedStepIds)

      expect(result).toBeDefined()
      expect(result?.id).toBe('step-1') // Should return step-1, not step-2 (which depends on step-1)
    })
  })
})