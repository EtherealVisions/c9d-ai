import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingWizard } from '../onboarding-wizard'
import { OnboardingService } from '@/lib/services/onboarding-service'
import type { OnboardingSession, OnboardingPath } from '@/lib/models/onboarding-types'

// Mock services
vi.mock('@/lib/services/onboarding-service')

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
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
      {...props}
    >
      {children}
    </button>
  )
}))

// Mock child components with simple implementations
vi.mock('../interactive-step-component', () => ({
  InteractiveStepComponent: ({ step, onStepComplete, onNeedHelp }: any) => (
    <div data-testid="interactive-step">
      <h3>{step.title}</h3>
      <button onClick={() => onStepComplete({ 
        stepId: step.id, 
        status: 'completed', 
        timeSpent: 1000, 
        userActions: {} 
      })}>
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
  ContextualHelp: ({ onClose }: any) => (
    <div data-testid="contextual-help">
      <button onClick={onClose}>Close Help</button>
    </div>
  )
}))

describe('OnboardingWizard - Simplified Tests', () => {
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
      nextStep: mockPath.steps?.[1] || null,
      isPathComplete: false
    })
    vi.mocked(OnboardingService.pauseOnboardingSession).mockResolvedValue({
      ...mockSession,
      status: 'paused'
    })
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

      // Test functionality: should show some loading indication or content
      expect(screen.getByTestId('card')).toBeInTheDocument()
    })

    it('should initialize onboarding session on mount', async () => {
      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      await waitFor(() => {
        expect(OnboardingService.initializeOnboarding).toHaveBeenCalledWith(
          'user-1',
          expect.objectContaining({
            userId: 'user-1',
            userRole: 'individual'
          })
        )
      })
    })
  })

  describe('Basic Functionality', () => {
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
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      })

      expect(screen.getByTestId('interactive-step')).toBeInTheDocument()
      expect(screen.getByText('First Step')).toBeInTheDocument()
    })

    it('should show correct title for different onboarding types', async () => {
      const { rerender } = render(
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

      rerender(
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

      // Test functionality: navigation buttons should be present
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('should disable previous button on first step', async () => {
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

      // Test functionality: previous button should be disabled on first step
      const prevButton = screen.getByRole('button', { name: /previous/i })
      expect(prevButton).toBeDisabled()
    })
  })

  describe('Help System', () => {
    it('should handle help requests', async () => {
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
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      })

      // Test functionality: help button should be available
      expect(screen.getByRole('button', { name: /get help/i })).toBeInTheDocument()
    })
  })

  describe('Exit Handling', () => {
    it('should handle exit requests', async () => {
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
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      })

      // Test functionality: exit button should be available
      const exitButton = screen.getByRole('button', { name: /exit onboarding/i })
      expect(exitButton).toBeInTheDocument()
      
      await user.click(exitButton)
      expect(mockOnExit).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      vi.mocked(OnboardingService.initializeOnboarding).mockRejectedValue(
        new Error('Initialization failed')
      )

      render(
        <OnboardingWizard
          userId="user-1"
          onboardingType="individual"
          onComplete={mockOnComplete}
          onExit={mockOnExit}
        />
      )

      // Test functionality: should handle errors without crashing
      await waitFor(() => {
        expect(screen.getByTestId('card')).toBeInTheDocument()
      })
    })
  })
})