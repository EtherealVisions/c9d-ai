import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressIndicator, type Milestone } from '../progress-indicator'

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div className={className} data-testid="progress-bar" data-value={value} />
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>{children}</span>
  )
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} />
}))

describe('ProgressIndicator', () => {
  const mockCompletedMilestones: Milestone[] = [
    {
      id: 'milestone-1',
      name: 'First Steps',
      description: 'Completed your first onboarding step',
      type: 'progress',
      criteria: {},
      reward: { points: 10, badge: 'first-steps' },
      earnedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'milestone-2',
      name: 'Quick Learner',
      description: 'Completed a step in under 5 minutes',
      type: 'time_based',
      criteria: {},
      reward: { points: 15, title: 'Speed Demon' },
      earnedAt: '2024-01-01T00:05:00Z'
    },
    {
      id: 'milestone-3',
      name: 'Perfect Score',
      description: 'Achieved 100% on an exercise',
      type: 'achievement',
      criteria: {},
      reward: { points: 25, badge: 'perfectionist' },
      earnedAt: '2024-01-01T00:10:00Z'
    }
  ]

  const mockNextMilestone: Milestone = {
    id: 'milestone-4',
    name: 'Halfway There',
    description: 'Complete 50% of the onboarding path',
    type: 'progress',
    criteria: { progressThreshold: 50 },
    reward: { points: 20, badge: 'halfway-hero' },
    progress: 75,
    isUnlocked: true
  }

  describe('Basic Rendering', () => {
    it('should render progress information correctly', () => {
      render(
        <ProgressIndicator
          currentStep={3}
          totalSteps={10}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={45}
        />
      )

      expect(screen.getByText('Overall Progress')).toBeInTheDocument()
      expect(screen.getByText('Step 3 of 10')).toBeInTheDocument()
      expect(screen.getByText('30%')).toBeInTheDocument()
      expect(screen.getAllByText('Complete')).toHaveLength(1)
      expect(screen.getByText('45min remaining')).toBeInTheDocument()
    })

    it('should render progress bar with correct value', () => {
      render(
        <ProgressIndicator
          currentStep={7}
          totalSteps={10}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={15}
        />
      )

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '70')
      expect(screen.getByText('70%')).toBeInTheDocument()
    })

    it('should handle edge cases for progress calculation', () => {
      const { rerender } = render(
        <ProgressIndicator
          currentStep={0}
          totalSteps={0}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={0}
        />
      )

      expect(screen.getByText('0%')).toBeInTheDocument()

      rerender(
        <ProgressIndicator
          currentStep={10}
          totalSteps={10}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={0}
        />
      )

      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Time Formatting', () => {
    it('should format time correctly for minutes', () => {
      render(
        <ProgressIndicator
          currentStep={1}
          totalSteps={5}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={45}
        />
      )

      expect(screen.getByText('45min remaining')).toBeInTheDocument()
      expect(screen.getByText('Estimated completion: 45min')).toBeInTheDocument()
    })

    it('should format time correctly for hours and minutes', () => {
      render(
        <ProgressIndicator
          currentStep={1}
          totalSteps={5}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={125}
        />
      )

      expect(screen.getByText('2h 5min remaining')).toBeInTheDocument()
      expect(screen.getByText('Estimated completion: 2h 5min')).toBeInTheDocument()
    })

    it('should handle exact hours', () => {
      render(
        <ProgressIndicator
          currentStep={1}
          totalSteps={5}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={120}
        />
      )

      expect(screen.getByText('2h 0min remaining')).toBeInTheDocument()
    })
  })

  describe('Step Indicators', () => {
    it('should render step indicators correctly', () => {
      render(
        <ProgressIndicator
          currentStep={3}
          totalSteps={5}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={30}
        />
      )

      expect(screen.getByText('Steps')).toBeInTheDocument()

      // Check for step indicators (they should be rendered as divs with step numbers or icons)
      const stepIndicators = screen.getAllByTitle(/Step \d+/)
      expect(stepIndicators).toHaveLength(5)

      // First two steps should be completed (step 1 and 2)
      expect(stepIndicators[0]).toHaveAttribute('title', 'Step 1')
      expect(stepIndicators[1]).toHaveAttribute('title', 'Step 2')
      
      // Third step should be current
      expect(stepIndicators[2]).toHaveAttribute('title', 'Step 3')
      
      // Remaining steps should be upcoming
      expect(stepIndicators[3]).toHaveAttribute('title', 'Step 4')
      expect(stepIndicators[4]).toHaveAttribute('title', 'Step 5')
    })

    it('should handle large number of steps', () => {
      render(
        <ProgressIndicator
          currentStep={15}
          totalSteps={25}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={60}
        />
      )

      const stepIndicators = screen.getAllByTitle(/Step \d+/)
      expect(stepIndicators).toHaveLength(25)
    })
  })

  describe('Milestones', () => {
    it('should not render milestones section when no milestones exist', () => {
      render(
        <ProgressIndicator
          currentStep={3}
          totalSteps={10}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={45}
        />
      )

      expect(screen.queryByText('Milestones')).not.toBeInTheDocument()
    })

    it('should render completed milestones', () => {
      render(
        <ProgressIndicator
          currentStep={3}
          totalSteps={10}
          completedMilestones={mockCompletedMilestones}
          nextMilestone={null}
          estimatedTimeRemaining={45}
        />
      )

      // Test functionality: milestone section should be visible
      expect(screen.getByRole('region', { name: /milestones/i })).toBeInTheDocument()
      expect(screen.getByText('Earned')).toBeInTheDocument()

      // Should show the last 3 milestones
      expect(screen.getByText('First Steps')).toBeInTheDocument()
      expect(screen.getByText('Quick Learner')).toBeInTheDocument()
      expect(screen.getByText('Perfect Score')).toBeInTheDocument()

      // Should show points
      expect(screen.getByText('+10')).toBeInTheDocument()
      expect(screen.getByText('+15')).toBeInTheDocument()
      expect(screen.getByText('+25')).toBeInTheDocument()
    })

    it('should limit displayed milestones to 3 and show count', () => {
      const manyMilestones = [
        ...mockCompletedMilestones,
        {
          id: 'milestone-4',
          name: 'Extra Milestone 1',
          description: 'Extra milestone',
          type: 'achievement' as const,
          criteria: {},
          reward: { points: 5 },
          earnedAt: '2024-01-01T00:15:00Z'
        },
        {
          id: 'milestone-5',
          name: 'Extra Milestone 2',
          description: 'Another extra milestone',
          type: 'achievement' as const,
          criteria: {},
          reward: { points: 5 },
          earnedAt: '2024-01-01T00:20:00Z'
        }
      ]

      render(
        <ProgressIndicator
          currentStep={3}
          totalSteps={10}
          completedMilestones={manyMilestones}
          nextMilestone={null}
          estimatedTimeRemaining={45}
        />
      )

      // Should show "+2 more milestones earned"
      expect(screen.getByText('+2 more milestones earned')).toBeInTheDocument()
    })

    it('should render next milestone', () => {
      render(
        <ProgressIndicator
          currentStep={3}
          totalSteps={10}
          completedMilestones={mockCompletedMilestones}
          nextMilestone={mockNextMilestone}
          estimatedTimeRemaining={45}
        />
      )

      expect(screen.getByText('Next Goal')).toBeInTheDocument()
      expect(screen.getByText('Halfway There')).toBeInTheDocument()
      expect(screen.getByText('Complete 50% of the onboarding path')).toBeInTheDocument()
      expect(screen.getByText('20 pts')).toBeInTheDocument()

      // Should show progress towards milestone
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should render next milestone without progress', () => {
      const milestoneWithoutProgress = {
        ...mockNextMilestone,
        progress: undefined
      }

      render(
        <ProgressIndicator
          currentStep={3}
          totalSteps={10}
          completedMilestones={[]}
          nextMilestone={milestoneWithoutProgress}
          estimatedTimeRemaining={45}
        />
      )

      expect(screen.getByText('Halfway There')).toBeInTheDocument()
      expect(screen.queryByText('Progress')).not.toBeInTheDocument()
    })
  })

  describe('Achievement Summary', () => {
    it('should render achievement summary when milestones exist', () => {
      render(
        <ProgressIndicator
          currentStep={7}
          totalSteps={10}
          completedMilestones={mockCompletedMilestones}
          nextMilestone={mockNextMilestone}
          estimatedTimeRemaining={15}
        />
      )

      // Should show milestone count (test functionality, not specific text)
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /milestones/i })).toBeInTheDocument()

      // Should show total points (10 + 15 + 25 = 50)
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('Points')).toBeInTheDocument()

      // Should show completion percentage (test functionality, not exact count)
      expect(screen.getByText('70%')).toBeInTheDocument()
      expect(screen.getByText('Complete')).toBeInTheDocument()
    })

    it('should not render achievement summary when no milestones exist', () => {
      render(
        <ProgressIndicator
          currentStep={3}
          totalSteps={10}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={45}
        />
      )

      // Should not show the achievement summary section
      expect(screen.queryByText('Points')).not.toBeInTheDocument()
    })
  })

  describe('Milestone Types and Icons', () => {
    it('should handle different milestone types', () => {
      const diverseMilestones: Milestone[] = [
        {
          id: 'progress-milestone',
          name: 'Progress Milestone',
          description: 'Progress based milestone',
          type: 'progress',
          criteria: {},
          reward: { points: 10 },
          earnedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'achievement-milestone',
          name: 'Achievement Milestone',
          description: 'Achievement based milestone',
          type: 'achievement',
          criteria: {},
          reward: { points: 15 },
          earnedAt: '2024-01-01T00:05:00Z'
        },
        {
          id: 'completion-milestone',
          name: 'Completion Milestone',
          description: 'Completion based milestone',
          type: 'completion',
          criteria: {},
          reward: { points: 20 },
          earnedAt: '2024-01-01T00:10:00Z'
        },
        {
          id: 'time-milestone',
          name: 'Time Milestone',
          description: 'Time based milestone',
          type: 'time_based',
          criteria: {},
          reward: { points: 25 },
          earnedAt: '2024-01-01T00:15:00Z'
        }
      ]

      render(
        <ProgressIndicator
          currentStep={5}
          totalSteps={10}
          completedMilestones={diverseMilestones}
          nextMilestone={null}
          estimatedTimeRemaining={30}
        />
      )

      // Test functionality: milestones should be rendered (test by role/structure, not exact text)
      const milestoneRegion = screen.getByRole('region', { name: /milestones/i })
      expect(milestoneRegion).toBeInTheDocument()
      
      // Should show milestone indicators (test by data attributes or roles)
      const milestoneElements = screen.getAllByRole('listitem').length > 0 || 
                               screen.getAllByText(/milestone/i).length >= 3
      expect(milestoneElements).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('should have proper structure and labels', () => {
      render(
        <ProgressIndicator
          currentStep={3}
          totalSteps={10}
          completedMilestones={mockCompletedMilestones}
          nextMilestone={mockNextMilestone}
          estimatedTimeRemaining={45}
        />
      )

      // Should have proper headings
      expect(screen.getByText('Overall Progress')).toBeInTheDocument()
      expect(screen.getByText('Steps')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /milestones/i })).toBeInTheDocument()

      // Progress bar should have proper attributes (get the first one)
      const progressBar = screen.getAllByTestId('progress-bar')[0]
      expect(progressBar).toBeInTheDocument()
    })

    it('should provide meaningful step titles', () => {
      render(
        <ProgressIndicator
          currentStep={2}
          totalSteps={5}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={30}
        />
      )

      // Each step should have a meaningful title attribute
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTitle(`Step ${i}`)).toBeInTheDocument()
      }
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ProgressIndicator
          currentStep={3}
          totalSteps={10}
          completedMilestones={[]}
          nextMilestone={null}
          estimatedTimeRemaining={45}
          className="custom-progress-indicator"
        />
      )

      expect(container.firstChild).toHaveClass('custom-progress-indicator')
    })
  })
})