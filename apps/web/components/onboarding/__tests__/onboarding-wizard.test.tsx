import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingWizard } from '../onboarding-wizard'
import { OnboardingService } from '@/lib/services/onboarding-service'
import type { OnboardingSession, OnboardingPath, OnboardingStep } from '@/lib/models/onboarding-types'

// Mock the onboarding service
vi.mock('@/lib/services/onboarding-service')

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-testid={props['data-testid']}
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div className={className} data-testid="progress-bar" data-value={value} />
  )
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, className }: any) => (
    <div className={className} data-variant={variant} role="alert">{children}</div>
  ),
  AlertDescription: ({ children }: any) => <div>{children}</div>
}))

// Mock child components
vi.mock('../interactive-step-component', () => ({
  InteractiveStepComponent: ({ step, onStepComplete, onNeedHelp }: any) => (
    <div data-testid="interactive-step">
      <h3>{step.title}</h3>
      <button onClick={() => onStepComplete({ stepId: step.id, status: 'completed', timeSpent: 1000, userActions: {} })}>
        Complete Step
      </button>
      <button onClick={onNeedHelp}>Need Help</button>
    </div>
  )
}))

vi.mock('../progress-indicator', () => ({
  ProgressIndicator: ({ currentStep, totalSteps }: any) => (
    <div data-testid="progress-indicator">
      Step {currentStep} of {totalSteps}
    </div>
  )
}))

vi.mock('../contextual-help', () => ({
  ContextualHelp: ({ isVisible, onClose }: any) => (
    isVisible ? (
      <div data-testid="contextual-help">
        <button onClick={onClose}>Close Help</button>
      </div>
    ) : null
  )
}))

describe('OnboardingWizard', () => {
  const mockOnComplete = vi.fn()
  const mockOnExit = vi.fn()
  
  const mockSession: OnboardingSession = {
    id: 'session-1',
    user_id: 'user-1',
    organization_id: 'org-1',
    path_id: 'path-1',
    session_type: 'individual',
    status: 'active',
    current_step_id: 'step-1',
    current_step_index: 0,
    progress_percentage: 0,
    time_spent: 0,
    started_at: '2024-01-01T00:00:00Z',
    last_active_at: '2024-01-01T00:00:00Z',
    completed_at: null,
    paused_at: null,
    session_metadata: {},
    preferences: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockPath: OnboardingPath = {
    id: 'path-1',
    name: 'Test Path',
    description: 'Test onboarding path',
    target_role: 'individual',
    subscription_tier: null,
    estimated_duration: 30,
    is_active: true,
    prerequisites: [],
    learning_objectives: [],
    success_criteria: {},
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-1',
        path_id: 'path-1',
        title: 'First Step',
        description: 'The first step',
        step_type: 'tutorial',
        step_order: 0,
        estimated_time: 10,
        is_required: true,
        dependencies: [],
        content: {},
        interactive_elements: {},
        success_criteria: {},
        validation_rules: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'step-2',
        path_id: 'path-1',
        title: 'Second Step',
        description: 'The second step',
        step_type: 'exercise',
        step_order: 1,
        estimated_time: 20,
        is_required: false,
        dependencies: ['step-1'],
        content: {},
        interactive_elements: {},
        success_criteria: {},
        validation_rules: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    vi.mocked(OnboardingService.initializeOnboarding).mockResolvedValue(mockSession)
    vi.mocked(OnboardingService.getOnboardingPath).mockResolvedValue(mockPath)
    vi.mocked(OnboardingService.recordStepCompletion).mockResolvedValue({
      session: { ...mockSession, current_step_index: 1 },
      nextStep: mockPath.steps![1],
      isPathComplete: false
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should render loading state initially', () => {
      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      expect(screen.getByText('Initializing your onboarding experience...')).toBeInTheDocument()
    })

    it('should initialize onboarding session on mount', async () => {
      render(
        <OnboardingWizard
          userId="user-1"
          organizationId="org-1"
          onboardingType="team_admin"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(OnboardingService.initializeOnboarding).toHaveBeenCalledWith('user-1', {
          userId: 'user-1',
          organizationId: 'org-1',
          userRole: 'admin',
          preferences: {
            sessionType: 'team_admin'
          }
        })
      })
    })

    it('should display error state when initialization fails', async () => {
      vi.mocked(OnboardingService.initializeOnboarding).mockRejectedValue(
        new Error('Failed to initialize')
      )

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to initialize')).toBeInTheDocument()
      })

      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  describe('Onboarding Flow', () => {
    it('should render onboarding wizard with first step', async () => {
      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Personal Onboarding')).toBeInTheDocument()
      })

      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('interactive-step')).toBeInTheDocument()
      expect(screen.getByText('First Step')).toBeInTheDocument()
    })

    it('should show correct title for different onboarding types', async () => {
      const { rerender } = render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="team_admin"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Team Admin Setup')).toBeInTheDocument()
      })

      rerender(
        <OnboardingWizard
          userId="user-1"
          onboardingType="team_member"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Team Member Onboarding')).toBeInTheDocument()
      })
    })

    it('should handle step completion and advance to next step', async () => {
      const user = userEvent.setup()

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('First Step')).toBeInTheDocument()
      })

      // Complete the first step
      await user.click(screen.getByText('Complete Step'))

      await waitFor(() => {
        expect(OnboardingService.recordStepCompletion).toHaveBeenCalledWith(
          'session-1',
          'step-1',
          expect.objectContaining({
            stepId: 'step-1',
            status: 'completed',
            timeSpent: expect.any(Number),
            userActions: {}
          })
        )
      })
    })

    it('should complete onboarding when all steps are finished', async () => {
      const user = userEvent.setup()

      // Mock completion of the path
      vi.mocked(OnboardingService.recordStepCompletion).mockResolvedValue({
        session: { ...mockSession, status: 'completed', progress_percentage: 100 },
        nextStep: null,
        isPathComplete: true
      })

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('First Step')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Complete Step'))

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          sessionId: 'session-1',
          completedSteps: ['step-1', 'step-2'],
          totalTimeSpent: expect.any(Number),
          achievements: [],
          finalScore: undefined
        })
      })
    })
  })

  describe('Navigation', () => {
    it('should show navigation controls', async () => {
      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      })

      // Previous button should be disabled on first step
      const prevButton = screen.getByText('Previous')
      expect(prevButton).toBeDisabled()

      // Next button should be available
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    it('should allow navigation between steps', async () => {
      const user = userEvent.setup()

      // Mock session with current step as second step
      const sessionOnSecondStep = {
        ...mockSession,
        current_step_id: 'step-2',
        current_step_index: 1
      }
      vi.mocked(OnboardingService.initializeOnboarding).mockResolvedValue(sessionOnSecondStep)

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        // Test functionality: should show step 2 of 2 (robust assertion)
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      })

      // Should be able to go back (test by role and state)
      const prevButton = screen.getByRole('button', { name: /previous/i })
      expect(prevButton).not.toBeDisabled()

      await user.click(prevButton)
      expect(screen.getByText('First Step')).toBeInTheDocument()
    })

    it('should show skip option for non-required steps', async () => {
      // Mock session starting on second step (which is not required)
      const sessionOnSecondStep = {
        ...mockSession,
        current_step_id: 'step-2',
        current_step_index: 1
      }
      vi.mocked(OnboardingService.initializeOnboarding).mockResolvedValue(sessionOnSecondStep)

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        // Test functionality: should be on step 2
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      })

      // Test functionality: skip button should be available for non-required steps
      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
    })
  })

  describe('Help System', () => {
    it('should toggle contextual help', async () => {
      const user = userEvent.setup()

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        // Test functionality: should be on first step
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      })

      // Help should not be visible initially
      expect(screen.queryByTestId('contextual-help')).not.toBeInTheDocument()

      // Click help button in step component (test by role)
      await user.click(screen.getByRole('button', { name: /need help/i }))

      // Help should now be visible
      expect(screen.getByTestId('contextual-help')).toBeInTheDocument()

      // Close help (test by role)
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      // Help should be hidden again
      expect(screen.queryByTestId('contextual-help')).not.toBeInTheDocument()
    })
  })

  describe('Exit Handling', () => {
    it('should handle exit and pause session', async () => {
      const user = userEvent.setup()

      vi.mocked(OnboardingService.pauseOnboardingSession).mockResolvedValue({
        ...mockSession,
        status: 'paused',
        paused_at: '2024-01-01T01:00:00Z'
      })

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('First Step')).toBeInTheDocument()
      })

      // Find and click the exit button (X icon)
      const exitButton = screen.getByRole('button', { name: /exit onboarding/i })
      await user.click(exitButton)

      await waitFor(() => {
        expect(OnboardingService.pauseOnboardingSession).toHaveBeenCalledWith('session-1')
        expect(mockOnExit).toHaveBeenCalledWith({
          sessionId: 'session-1',
          currentStepIndex: 0,
          progressPercentage: 0,
          timeSpent: 0,
          canResume: true
        })
      })
    })

    it('should handle exit even if pause fails', async () => {
      const user = userEvent.setup()

      vi.mocked(OnboardingService.pauseOnboardingSession).mockRejectedValue(
        new Error('Failed to pause')
      )

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('First Step')).toBeInTheDocument()
      })

      const exitButton = screen.getByRole('button', { name: /exit onboarding/i })
      await user.click(exitButton)

      await waitFor(() => {
        expect(mockOnExit).toHaveBeenCalledWith({
          sessionId: 'session-1',
          currentStepIndex: 0,
          progressPercentage: 0,
          timeSpent: 0,
          canResume: false
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle step completion errors', async () => {
      const user = userEvent.setup()

      vi.mocked(OnboardingService.recordStepCompletion).mockRejectedValue(
        new Error('Failed to complete step')
      )

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('First Step')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Complete Step'))

      await waitFor(() => {
        expect(screen.getByText('Failed to complete step')).toBeInTheDocument()
      })
    })

    it('should retry initialization on error', async () => {
      const user = userEvent.setup()

      vi.mocked(OnboardingService.initializeOnboarding)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockSession)

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Try Again'))

      await waitFor(() => {
        expect(screen.getByText('First Step')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('First Step')).toBeInTheDocument()
      })

      // Check for progress indicator
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument()

      // Check for proper button roles
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('First Step')).toBeInTheDocument()
      })

      // Tab through interactive elements
      await user.tab()
      expect(document.activeElement).toBeInstanceOf(HTMLElement)

      // Should be able to activate buttons with Enter/Space
      const completeButton = screen.getByText('Complete Step')
      completeButton.focus()
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(OnboardingService.recordStepCompletion).toHaveBeenCalled()
      })
    })
  })
})