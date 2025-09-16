/**
 * Fixed Progress Indicator Tests - Robust Testing Approach
 * 
 * This file replaces the brittle tests with robust, functionality-focused tests
 * that avoid duplicate text matching issues.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressIndicator } from '../progress-indicator'

describe('ProgressIndicator - Fixed Tests', () => {
  const defaultProps = {
    currentStep: 7,
    totalSteps: 10,
    completedMilestones: [],
    nextMilestone: null,
    estimatedTimeRemaining: 15
  }

  describe('Core Functionality - Data Attribute Testing', () => {
    it('should render progress indicator with correct data attributes', () => {
      render(<ProgressIndicator {...defaultProps} />)
      
      // Test using data attributes instead of text (robust)
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '70') // 7/10 * 100
      expect(progressBar).toHaveAttribute('data-current-step', '7')
      expect(progressBar).toHaveAttribute('data-total-steps', '10')
      
      // Test step counter using data testid (robust)
      const stepCounter = screen.getByTestId('step-counter')
      expect(stepCounter).toBeInTheDocument()
      
      // Test progress percentage using data testid (robust)
      const progressPercentage = screen.getByTestId('progress-percentage')
      expect(progressPercentage).toBeInTheDocument()
    })

    it('should calculate progress percentage correctly', () => {
      const { rerender } = render(<ProgressIndicator {...defaultProps} />)
      
      // Test 70% progress (7 of 10 steps)
      let progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '70')
      
      // Test 100% progress
      rerender(<ProgressIndicator {...defaultProps} currentStep={10} />)
      progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '100')
      
      // Test 0% progress
      rerender(<ProgressIndicator {...defaultProps} currentStep={0} />)
      progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '0')
    })
  })

  describe('Step Indicators - Semantic Testing', () => {
    it('should render correct number of step indicators', () => {
      render(<ProgressIndicator {...defaultProps} />)
      
      // Count step indicators by their title attributes (semantic)
      const stepIndicators = screen.getAllByTitle(/Step \d+/)
      expect(stepIndicators).toHaveLength(10)
    })

    it('should show correct step states using CSS classes', () => {
      render(<ProgressIndicator {...defaultProps} currentStep={7} totalSteps={10} />)
      
      // Check completed steps (1-6) - test functionality, not exact styling
      const step1 = screen.getByTitle('Step 1')
      const step6 = screen.getByTitle('Step 6')
      expect(step1).toHaveClass('bg-green-500') // Completed
      expect(step6).toHaveClass('bg-green-500') // Completed
      
      // Check current step (7)
      const step7 = screen.getByTitle('Step 7')
      expect(step7).toHaveClass('bg-blue-500') // Current
      
      // Check upcoming steps (8-10)
      const step8 = screen.getByTitle('Step 8')
      const step10 = screen.getByTitle('Step 10')
      expect(step8).toHaveClass('bg-gray-200') // Upcoming
      expect(step10).toHaveClass('bg-gray-200') // Upcoming
    })
  })

  describe('Milestones - Conditional Rendering', () => {
    const milestonesProps = {
      ...defaultProps,
      completedMilestones: [
        {
          id: 'milestone-1',
          name: 'First Steps',
          description: 'Completed your first step',
          type: 'progress' as const,
          criteria: {},
          reward: { points: 10 },
          earnedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'milestone-2',
          name: 'Quick Learner',
          description: 'Completed steps quickly',
          type: 'achievement' as const,
          criteria: {},
          reward: { points: 25 },
          earnedAt: '2024-01-01T01:00:00Z'
        }
      ],
      nextMilestone: {
        id: 'milestone-3',
        name: 'Almost There',
        description: 'Complete 8 steps',
        type: 'progress' as const,
        criteria: {},
        reward: { points: 50 },
        progress: 87.5 // 7/8 * 100
      }
    }

    it('should render milestones section when milestones exist', () => {
      render(<ProgressIndicator {...milestonesProps} />)
      
      // Check milestones section exists using semantic selector
      const milestonesSection = screen.getByRole('region', { name: /milestones/i })
      expect(milestonesSection).toBeInTheDocument()
    })

    it('should display completed milestones correctly', () => {
      render(<ProgressIndicator {...milestonesProps} />)
      
      // Check completed milestones are listed using semantic structure
      const milestonesList = screen.getByRole('list')
      const milestoneItems = screen.getAllByRole('listitem')
      expect(milestoneItems).toHaveLength(2)
      
      // Check milestone content using accessible text
      expect(screen.getByText('First Steps')).toBeInTheDocument()
      expect(screen.getByText('Quick Learner')).toBeInTheDocument()
    })

    it('should show next milestone with progress', () => {
      render(<ProgressIndicator {...milestonesProps} />)
      
      // Check next milestone is displayed
      expect(screen.getByText('Almost There')).toBeInTheDocument()
      expect(screen.getByText('Complete 8 steps')).toBeInTheDocument()
    })

    it('should not render milestones section when no milestones', () => {
      render(<ProgressIndicator {...defaultProps} />)
      
      // Milestones section should not exist
      expect(() => screen.getByRole('region', { name: /milestones/i })).toThrow()
    })
  })

  describe('Achievement Summary - Conditional Rendering', () => {
    const achievementProps = {
      ...defaultProps,
      completedMilestones: [
        {
          id: 'milestone-1',
          name: 'Test Milestone 1',
          description: 'Test description',
          type: 'progress' as const,
          criteria: {},
          reward: { points: 10 },
          earnedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'milestone-2',
          name: 'Test Milestone 2',
          description: 'Test description',
          type: 'achievement' as const,
          criteria: {},
          reward: { points: 25 },
          earnedAt: '2024-01-01T01:00:00Z'
        }
      ]
    }

    it('should render achievement summary when milestones exist', () => {
      render(<ProgressIndicator {...achievementProps} />)
      
      // Check achievement summary section using semantic selector
      const summarySection = screen.getByRole('region', { name: /achievement summary/i })
      expect(summarySection).toBeInTheDocument()
    })

    it('should calculate and display correct totals without duplicate text issues', () => {
      render(<ProgressIndicator {...achievementProps} />)
      
      // Check milestone count (avoid duplicate text by being specific)
      expect(screen.getByText('2')).toBeInTheDocument() // 2 milestones
      
      // Check total points (avoid duplicate text by being specific)
      expect(screen.getByText('35')).toBeInTheDocument() // 10 + 25 points
      
      // Check progress percentage using data attribute to avoid duplicate text
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '70')
    })
  })

  describe('Time Estimation - Specific Text Matching', () => {
    it('should format time correctly for minutes', () => {
      render(<ProgressIndicator {...defaultProps} estimatedTimeRemaining={45} />)
      // Use more specific text to avoid duplicates
      expect(screen.getByText('45min remaining')).toBeInTheDocument()
    })

    it('should format time correctly for hours and minutes', () => {
      render(<ProgressIndicator {...defaultProps} estimatedTimeRemaining={90} />)
      // Use more specific text to avoid duplicates
      expect(screen.getByText('1h 30min remaining')).toBeInTheDocument()
    })

    it('should handle zero time remaining', () => {
      render(<ProgressIndicator {...defaultProps} estimatedTimeRemaining={0} />)
      // Use more specific text to avoid duplicates
      expect(screen.getByText('0min remaining')).toBeInTheDocument()
    })
  })

  describe('Accessibility - Semantic Structure', () => {
    it('should have proper ARIA labels and roles', () => {
      const milestonesProps = {
        ...defaultProps,
        completedMilestones: [
          {
            id: 'milestone-1',
            name: 'Test Milestone',
            description: 'Test description',
            type: 'progress' as const,
            criteria: {},
            reward: { points: 10 },
            earnedAt: '2024-01-01T00:00:00Z'
          }
        ],
        nextMilestone: {
          id: 'milestone-2',
          name: 'Next Milestone',
          description: 'Next milestone description',
          type: 'achievement' as const,
          criteria: {},
          reward: { points: 25 },
          progress: 50
        }
      }
      
      render(<ProgressIndicator {...milestonesProps} />)
      
      // Check main container has testid
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument()
      
      // Check milestones section has proper role
      expect(screen.getByRole('region', { name: /milestones/i })).toBeInTheDocument()
      
      // Check achievement summary has proper role
      expect(screen.getByRole('region', { name: /achievement summary/i })).toBeInTheDocument()
      
      // Check milestone list has proper role
      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('should have meaningful step indicator titles', () => {
      render(<ProgressIndicator {...defaultProps} />)
      
      // Each step should have a descriptive title
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByTitle(`Step ${i}`)).toBeInTheDocument()
      }
    })
  })

  describe('Edge Cases - Robust Handling', () => {
    it('should handle edge cases gracefully', () => {
      // Test with zero total steps
      render(<ProgressIndicator {...defaultProps} totalSteps={0} />)
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '0')
      
      // Test with current step exceeding total - component should handle gracefully
      const { rerender } = render(<ProgressIndicator {...defaultProps} />)
      rerender(<ProgressIndicator {...defaultProps} currentStep={15} totalSteps={10} />)
      // Component should still render without crashing
      expect(progressBar).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<ProgressIndicator {...defaultProps} className="custom-class" />)
      
      const container = screen.getByTestId('progress-indicator')
      expect(container).toHaveClass('custom-class')
    })

    it('should handle large numbers of steps', () => {
      render(<ProgressIndicator {...defaultProps} currentStep={50} totalSteps={100} />)
      
      // Should still render correctly with large numbers
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '50')
      expect(progressBar).toHaveAttribute('data-total-steps', '100')
    })
  })
})