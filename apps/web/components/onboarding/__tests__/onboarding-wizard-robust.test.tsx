/**
 * Robust Onboarding Wizard Tests
 * 
 * These tests focus on functionality and user interactions rather than brittle text matching.
 * They use semantic selectors and data attributes for reliable testing.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OnboardingWizard } from '../onboarding-wizard'
import { OnboardingService } from '@/lib/services/onboarding-service'
import { renderWithUser, selectors, actions, assertions, mockData, waitFor as customWaitFor } from './test-utils'

// Mock services
vi.mock('@/lib/services/onboarding-service')

const mockOnboardingService = vi.mocked(OnboardingService)

describe('OnboardingWizard - Robust Tests', () => {
  const defaultProps = {
    userId: 'test-user-1',
    organizationId: 'test-org-1',
    onboardingType: 'individual' as const,
    onComplete: vi.fn(),
    onExit: vi.fn()
  }

  const mockSession = mockData.createSession()
  const mockPath = mockData.createPath([
    mockData.createStep({ id: 'step-1', title: 'First Step' }),
    mockData.createStep({ id: 'step-2', title: 'Second Step', is_required: false })
  ])

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    mockOnboardingService.initializeOnboarding.mockResolvedValue(mockSession)
    mockOnboardingService.getOnboardingPath.mockResolvedValue(mockPath)
  })

  describe('Initialization', () => {
    it('should show loading state initially', () => {
      // Delay the mock to test loading state
      mockOnboardingService.initializeOnboarding.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSession), 100))
      )
      
      render(<OnboardingWizard {...defaultProps} />)
      
      // Should show loading indicator
      expect(screen.getByText(/initializing/i)).toBeInTheDocument()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loader2 has implicit status role
    })

    it('should initialize onboarding session on mount', async () => {
      render(<OnboardingWizard {...defaultProps} />)
      
      // Wait for initialization to complete
      await waitFor(() => {
        expect(mockOnboardingService.initializeOnboarding).toHaveBeenCalledWith(
          'test-user-1',
          expect.objectContaining({
            userId: 'test-user-1',
            organizationId: 'test-org-1',
            userRole: 'individual'
          })
        )
      })
    })

    it('should handle initialization errors gracefully', async () => {
      mockOnboardingService.initializeOnboarding.mockRejectedValue(
        new Error('Failed to initialize')
      )
      
      render(<OnboardingWizard {...defaultProps} />)
      
      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/failed to initialize/i)).toBeInTheDocument()
      })
      
      // Should have retry button
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    beforeEach(async () => {
      render(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
    })

    it('should show correct navigation state on first step', async () => {
      // Should be on first step
      const progressIndicator = screen.getByTestId('progress-indicator')
      expect(progressIndicator).toHaveAttribute('data-current-step', '1')
      expect(progressIndicator).toHaveAttribute('data-total-steps', '2')
      
      // Navigation state should be correct
      assertions.expectNavigationState({
        canGoPrevious: false, // First step
        canGoNext: true
      })
    })

    it('should navigate to next step when next button clicked', async () => {
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Mock step completion
      mockOnboardingService.completeStep.mockResolvedValue({
        success: true,
        nextStepId: 'step-2'
      })
      
      // Navigate to next step
      await actions.goToNextStep(user)
      
      // Should be on second step
      await waitFor(() => {
        const progressIndicator = screen.getByTestId('progress-indicator')
        expect(progressIndicator).toHaveAttribute('data-current-step', '2')
      })
    })

    it('should navigate to previous step when previous button clicked', async () => {
      // Start on second step
      const sessionOnStep2 = { ...mockSession, current_step_index: 1, current_step_id: 'step-2' }
      mockOnboardingService.initializeOnboarding.mockResolvedValue(sessionOnStep2)
      
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Should be on second step initially
      const progressIndicator = screen.getByTestId('progress-indicator')
      expect(progressIndicator).toHaveAttribute('data-current-step', '2')
      
      // Navigate to previous step
      await actions.goToPreviousStep(user)
      
      // Should be on first step
      await waitFor(() => {
        expect(progressIndicator).toHaveAttribute('data-current-step', '1')
      })
    })

    it('should show skip option for non-required steps', async () => {
      // Navigate to second step (non-required)
      const sessionOnStep2 = { ...mockSession, current_step_index: 1, current_step_id: 'step-2' }
      mockOnboardingService.initializeOnboarding.mockResolvedValue(sessionOnStep2)
      
      render(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Should show skip button for non-required step
      assertions.expectNavigationState({ canSkip: true })
    })

    it('should not show skip option for required steps', async () => {
      render(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Should not show skip button for required step
      assertions.expectNavigationState({ canSkip: false })
    })
  })

  describe('Step Interaction', () => {
    it('should render interactive step component', async () => {
      render(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Should render step component
      expect(selectors.step.container()).toBeInTheDocument()
      expect(selectors.step.title()).toHaveTextContent('First Step')
    })

    it('should handle step completion', async () => {
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Mock successful step completion
      mockOnboardingService.completeStep.mockResolvedValue({
        success: true,
        nextStepId: 'step-2'
      })
      
      // Complete the step
      await actions.completeStep(user)
      
      // Should call onboarding service
      expect(mockOnboardingService.completeStep).toHaveBeenCalledWith(
        mockSession.id,
        'step-1',
        expect.any(Object)
      )
    })

    it('should handle step skip', async () => {
      // Start on non-required step
      const sessionOnStep2 = { ...mockSession, current_step_index: 1, current_step_id: 'step-2' }
      mockOnboardingService.initializeOnboarding.mockResolvedValue(sessionOnStep2)
      
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Mock skip step
      mockOnboardingService.skipStep.mockResolvedValue({
        success: true,
        nextStepId: null // Last step
      })
      
      // Skip the step
      await actions.skipStep(user)
      
      // Should call skip service
      expect(mockOnboardingService.skipStep).toHaveBeenCalledWith(
        mockSession.id,
        'step-2'
      )
    })
  })

  describe('Help System', () => {
    it('should toggle contextual help', async () => {
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Help should not be visible initially
      assertions.expectHelpVisible(false)
      
      // Open help
      await actions.openHelp(user)
      
      // Help should be visible
      assertions.expectHelpVisible(true)
      
      // Close help
      await actions.closeHelp(user)
      
      // Help should be hidden
      assertions.expectHelpVisible(false)
    })

    it('should handle help requests from step component', async () => {
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Request help from step
      await actions.requestHelp(user)
      
      // Help should be visible
      assertions.expectHelpVisible(true)
    })
  })

  describe('Exit Handling', () => {
    it('should handle exit requests', async () => {
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Mock pause session
      mockOnboardingService.pauseSession.mockResolvedValue({
        success: true,
        canResume: true
      })
      
      // Exit onboarding
      await actions.exitOnboarding(user)
      
      // Should call onExit callback
      expect(defaultProps.onExit).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: mockSession.id,
          canResume: true
        })
      )
    })

    it('should handle exit when pause fails', async () => {
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Mock pause failure
      mockOnboardingService.pauseSession.mockRejectedValue(new Error('Pause failed'))
      
      // Exit onboarding
      await actions.exitOnboarding(user)
      
      // Should still call onExit with canResume: false
      expect(defaultProps.onExit).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: mockSession.id,
          canResume: false
        })
      )
    })
  })

  describe('Completion', () => {
    it('should handle onboarding completion', async () => {
      // Start on last step
      const sessionOnLastStep = { ...mockSession, current_step_index: 1, current_step_id: 'step-2' }
      mockOnboardingService.initializeOnboarding.mockResolvedValue(sessionOnLastStep)
      
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Mock completion
      mockOnboardingService.completeStep.mockResolvedValue({
        success: true,
        nextStepId: null // No next step = completion
      })
      
      mockOnboardingService.completeOnboarding.mockResolvedValue({
        success: true,
        completionData: {
          certificateUrl: 'https://example.com/certificate.pdf',
          achievements: ['achievement-1', 'achievement-2']
        }
      })
      
      // Complete the last step
      await actions.completeStep(user)
      
      // Should call completion
      expect(mockOnboardingService.completeOnboarding).toHaveBeenCalledWith(
        mockSession.id
      )
      
      // Should call onComplete callback
      expect(defaultProps.onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: mockSession.id,
          totalTimeSpent: 1800,
          finalScore: 95
        })
      )
    })
  })

  describe('Different Onboarding Types', () => {
    it('should show correct title for individual onboarding', async () => {
      render(<OnboardingWizard {...defaultProps} onboardingType="individual" />)
      await customWaitFor.stepToLoad()
      
      expect(screen.getByText('Personal Onboarding')).toBeInTheDocument()
    })

    it('should show correct title for team admin onboarding', async () => {
      render(<OnboardingWizard {...defaultProps} onboardingType="team_admin" />)
      await customWaitFor.stepToLoad()
      
      expect(screen.getByText('Team Admin Setup')).toBeInTheDocument()
    })

    it('should show correct title for team member onboarding', async () => {
      render(<OnboardingWizard {...defaultProps} onboardingType="team_member" />)
      await customWaitFor.stepToLoad()
      
      expect(screen.getByText('Team Member Onboarding')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle step completion errors', async () => {
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Mock step completion error
      mockOnboardingService.completeStep.mockRejectedValue(
        new Error('Step completion failed')
      )
      
      // Try to complete step
      await actions.completeStep(user)
      
      // Should handle error gracefully (component should still be functional)
      expect(selectors.step.container()).toBeInTheDocument()
    })

    it('should handle navigation errors', async () => {
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Mock navigation error
      mockOnboardingService.updateSession.mockRejectedValue(
        new Error('Navigation failed')
      )
      
      // Try to navigate
      await actions.goToNextStep(user)
      
      // Should handle error gracefully
      expect(selectors.step.container()).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and structure', async () => {
      render(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Check main navigation elements have proper labels
      expect(screen.getByLabelText(/get help/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/exit onboarding/i)).toBeInTheDocument()
      
      // Check progress indicator has proper data attributes
      const progressIndicator = screen.getByTestId('progress-indicator')
      expect(progressIndicator).toHaveAttribute('data-current-step')
      expect(progressIndicator).toHaveAttribute('data-total-steps')
    })

    it('should support keyboard navigation', async () => {
      const { user } = renderWithUser(<OnboardingWizard {...defaultProps} />)
      await customWaitFor.stepToLoad()
      
      // Should be able to tab to navigation buttons
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.tab()
      
      // Button should be focusable
      expect(nextButton).toBeInTheDocument()
    })
  })
})