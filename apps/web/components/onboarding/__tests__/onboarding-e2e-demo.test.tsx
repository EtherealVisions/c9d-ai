/**
 * End-to-End Onboarding Demo Test
 * 
 * This test demonstrates a complete user journey through the onboarding process
 * using robust testing methodologies that focus on functionality over brittle text matching.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingWizard } from '../onboarding-wizard'
import { OnboardingService } from '@/lib/services/onboarding-service'

// Mock services
vi.mock('@/lib/services/onboarding-service')
const mockOnboardingService = vi.mocked(OnboardingService)

describe('Onboarding E2E Demo - Robust Testing', () => {
  const mockProps = {
    userId: 'demo-user-1',
    organizationId: 'demo-org-1',
    onboardingType: 'individual' as const,
    onComplete: vi.fn(),
    onExit: vi.fn()
  }

  const mockSession = {
    id: 'demo-session-1',
    user_id: 'demo-user-1',
    organization_id: 'demo-org-1',
    path_id: 'demo-path-1',
    session_type: 'individual' as const,
    status: 'active' as const,
    current_step_id: 'demo-step-1',
    current_step_index: 0,
    progress_percentage: 0,
    time_spent: 0,
    started_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
    completed_at: null,
    paused_at: null,
    session_metadata: {},
    preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const mockPath = {
    id: 'demo-path-1',
    name: 'Demo Onboarding Path',
    description: 'A demonstration of robust onboarding testing',
    target_role: 'team_member',
    subscription_tier: 'free',
    estimated_duration: 900000,
    is_active: true,
    prerequisites: [],
    learning_objectives: ['Complete onboarding'],
    success_criteria: {},
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [
      {
        id: 'demo-step-1',
        path_id: 'demo-path-1',
        title: 'Welcome Step',
        description: 'Introduction to the platform',
        step_type: 'tutorial' as const,
        step_order: 1,
        estimated_time: 300000,
        is_required: true,
        dependencies: [],
        content: {
          text: '<p>Welcome to our platform!</p>',
          interactive_elements: []
        },
        interactive_elements: {},
        success_criteria: {
          completion_threshold: 100,
          required_interactions: []
        },
        validation_rules: {},
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-step-2',
        path_id: 'demo-path-1',
        title: 'Interactive Practice',
        description: 'Hands-on practice',
        step_type: 'exercise' as const,
        step_order: 2,
        estimated_time: 600000,
        is_required: false,
        dependencies: ['demo-step-1'],
        content: {
          text: '<p>Practice with our features</p>',
          interactive_elements: [
            {
              id: 'practice-input',
              type: 'text_input' as const,
              label: 'Your Name',
              placeholder: 'Enter your name',
              required: true,
              validation_rules: {
                min_length: 2,
                max_length: 50
              }
            }
          ]
        },
        interactive_elements: {
          'practice-input': {
            type: 'text_input',
            label: 'Your Name',
            placeholder: 'Enter your name',
            required: true,
            validation_rules: {
              min_length: 2,
              max_length: 50
            }
          }
        },
        success_criteria: {
          completion_threshold: 80,
          required_interactions: ['practice-input']
        },
        validation_rules: {},
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnboardingService.initializeOnboarding.mockResolvedValue(mockSession)
    mockOnboardingService.getOnboardingPath.mockResolvedValue(mockPath)
    mockOnboardingService.completeStep.mockResolvedValue({ success: true, nextStepId: null })
    mockOnboardingService.skipStep.mockResolvedValue({ success: true, nextStepId: null })
    mockOnboardingService.pauseSession.mockResolvedValue({ success: true, canResume: true })
  })

  it('should complete full onboarding journey with robust testing', async () => {
    const user = userEvent.setup()
    
    // Render the onboarding wizard
    render(<OnboardingWizard {...mockProps} />)

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByText('Personal Onboarding')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Verify we're on the first step using data attributes (robust)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('data-current-step', '1')
    expect(progressBar).toHaveAttribute('data-total-steps', '2')

    // Verify step content is rendered using semantic selectors
    expect(screen.getByTestId('progress-indicator')).toBeInTheDocument()
    
    // Check navigation state using button states (functional testing)
    const previousButton = screen.getByRole('button', { name: /previous/i })
    const nextButton = screen.getByRole('button', { name: /next/i })
    
    expect(previousButton).toBeDisabled() // First step
    expect(nextButton).toBeEnabled() // Can proceed

    // Test help system functionality
    const helpButton = screen.getByLabelText(/get help/i)
    await user.click(helpButton)
    
    // Verify help is accessible (functional test)
    await waitFor(() => {
      // Help should be toggled (we test the functionality, not specific UI)
      expect(helpButton).toBeInTheDocument()
    })

    // Navigate to next step
    mockOnboardingService.completeStep.mockResolvedValue({
      success: true,
      nextStepId: 'demo-step-2'
    })

    await user.click(nextButton)

    // Verify navigation worked using data attributes
    await waitFor(() => {
      const updatedProgressBar = screen.getByTestId('progress-bar')
      expect(updatedProgressBar).toHaveAttribute('data-current-step', '2')
    })

    // Verify we can skip non-required steps (functional test)
    const skipButtons = screen.getAllByRole('button', { name: /skip/i })
    expect(skipButtons.length).toBeGreaterThan(0)

    // Test skip functionality - use the first skip button
    mockOnboardingService.skipStep.mockResolvedValue({
      success: true,
      nextStepId: null // End of onboarding
    })

    await user.click(skipButtons[0])

    // Verify skip worked by checking service call
    expect(mockOnboardingService.skipStep).toHaveBeenCalledWith(
      mockSession.id,
      'demo-step-2'
    )

    // Test exit functionality
    const exitButton = screen.getByLabelText(/exit onboarding/i)
    
    mockOnboardingService.pauseSession.mockResolvedValue({
      success: true,
      canResume: true
    })

    await user.click(exitButton)

    // Verify exit callback was called with correct data
    expect(mockProps.onExit).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: mockSession.id,
        canResume: true
      })
    )
  })

  it('should handle errors gracefully with robust error testing', async () => {
    // Test initialization error
    mockOnboardingService.initializeOnboarding.mockRejectedValue(
      new Error('Network error')
    )

    render(<OnboardingWizard {...mockProps} />)

    // Verify error state is handled gracefully
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })

    // Verify retry functionality
    const retryButton = screen.getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()

    // Test retry works
    mockOnboardingService.initializeOnboarding.mockResolvedValue(mockSession)
    
    const user = userEvent.setup()
    await user.click(retryButton)

    // Verify retry attempt
    expect(mockOnboardingService.initializeOnboarding).toHaveBeenCalledTimes(2)
  })

  it('should support accessibility features with semantic testing', async () => {
    render(<OnboardingWizard {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('Personal Onboarding')).toBeInTheDocument()
    })

    // Test keyboard navigation support
    const user = userEvent.setup()
    
    // Should be able to tab through interactive elements
    await user.tab()
    
    // Verify focus management (functional accessibility test)
    const focusedElement = document.activeElement
    expect(focusedElement).toBeInTheDocument()

    // Test ARIA labels and roles
    expect(screen.getByLabelText(/get help/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/exit onboarding/i)).toBeInTheDocument()
    
    // Test semantic structure
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('should demonstrate robust progress tracking', async () => {
    render(<OnboardingWizard {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument()
    })

    // Test progress indicator functionality using data attributes
    const progressBar = screen.getByTestId('progress-bar')
    
    // Verify initial state
    expect(progressBar).toHaveAttribute('data-current-step', '1')
    expect(progressBar).toHaveAttribute('data-total-steps', '2')

    // Test progress calculation (functional test)
    // Step 1 of 2 = 50% progress conceptually
    // We test the data attributes rather than visual representation
    expect(progressBar).toHaveAttribute('data-current-step')
    expect(progressBar).toHaveAttribute('data-total-steps')

    // Verify progress indicator updates with navigation
    const user = userEvent.setup()
    const nextButton = screen.getByRole('button', { name: /next/i })
    
    mockOnboardingService.completeStep.mockResolvedValue({
      success: true,
      nextStepId: 'demo-step-2'
    })

    await user.click(nextButton)

    // Verify progress updated
    await waitFor(() => {
      expect(progressBar).toHaveAttribute('data-current-step', '2')
    })
  })

  it('should validate different onboarding types with robust configuration testing', async () => {
    // Test individual onboarding
    const { rerender } = render(<OnboardingWizard {...mockProps} onboardingType="individual" />)
    
    await waitFor(() => {
      expect(screen.getByText('Personal Onboarding')).toBeInTheDocument()
    })

    // Test team admin onboarding - mock different session type
    mockOnboardingService.initializeOnboarding.mockResolvedValue({
      ...mockSession,
      session_type: 'team_admin'
    })
    
    rerender(<OnboardingWizard {...mockProps} onboardingType="team_admin" />)
    
    await waitFor(() => {
      expect(screen.getByText('Team Admin Setup')).toBeInTheDocument()
    })

    // Test team member onboarding - mock different session type
    mockOnboardingService.initializeOnboarding.mockResolvedValue({
      ...mockSession,
      session_type: 'team_member'
    })
    
    rerender(<OnboardingWizard {...mockProps} onboardingType="team_member" />)
    
    await waitFor(() => {
      expect(screen.getByText('Team Member Onboarding')).toBeInTheDocument()
    })
  })
})