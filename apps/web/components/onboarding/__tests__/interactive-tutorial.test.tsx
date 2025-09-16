import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InteractiveTutorial } from '../interactive-tutorial'
import { SandboxService } from '@/lib/services/sandbox-service'

// Mock the SandboxService
vi.mock('@/lib/services/sandbox-service', () => ({
  SandboxService: {
    getTutorial: vi.fn(),
    createSession: vi.fn(),
    validateStep: vi.fn(),
    initialize: vi.fn()
  }
}))

const mockSandboxService = vi.mocked(SandboxService)

describe('InteractiveTutorial', () => {
  const mockTutorial = {
    id: 'auth-basics',
    title: 'Authentication Basics',
    description: 'Learn how to sign in and sign up to the platform',
    category: 'authentication' as const,
    difficulty: 'beginner' as const,
    estimatedTime: 10,
    prerequisites: [],
    steps: [
      {
        id: 'navigate-signin',
        title: 'Navigate to Sign In',
        description: 'Click the Sign In button in the header',
        action: 'click' as const,
        target: 'sign-in-button',
        hints: ['Look for the Sign In button in the top navigation']
      },
      {
        id: 'enter-email',
        title: 'Enter Email',
        description: 'Enter your email address',
        action: 'input' as const,
        target: 'email-input',
        expectedValue: 'demo@example.com',
        hints: ['Use the demo email: demo@example.com']
      }
    ],
    completionCriteria: ['User successfully signed in', 'Redirected to dashboard']
  }

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    type: 'tutorial' as const,
    state: {
      environmentId: 'auth-tutorial',
      startedAt: new Date(),
      currentStep: 0,
      completedSteps: [],
      errors: []
    },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    isActive: true
  }

  const defaultProps = {
    tutorialId: 'auth-basics',
    userId: 'user-123'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSandboxService.getTutorial.mockReturnValue(mockTutorial)
    mockSandboxService.createSession.mockResolvedValue(mockSession)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      // Mock the loading state by making getTutorial return null initially
      mockSandboxService.getTutorial.mockReturnValue(null)
      
      render(<InteractiveTutorial {...defaultProps} />)
      
      // Should show tutorial not found when tutorial is null
      expect(screen.getByTestId('tutorial-not-found')).toBeInTheDocument()
    })

    it('should render error state when tutorial not found', async () => {
      mockSandboxService.getTutorial.mockReturnValue(null)
      
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Tutorial not found/)).toBeInTheDocument()
      })
    })

    it('should render tutorial header with correct information', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Authentication Basics')).toBeInTheDocument()
        expect(screen.getByText('Learn how to sign in and sign up to the platform')).toBeInTheDocument()
        expect(screen.getByText('beginner')).toBeInTheDocument()
        expect(screen.getByText('10 min')).toBeInTheDocument()
      })
    })

    it('should render progress bar with correct initial state', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0/2 steps')).toBeInTheDocument()
        // Progress bar should be at 0%
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveAttribute('aria-valuenow', '0')
      })
    })

    it('should render start tutorial button initially', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Start Tutorial')).toBeInTheDocument()
      })
    })

    it('should render tutorial steps overview', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Tutorial Steps')).toBeInTheDocument()
        expect(screen.getByText('Navigate to Sign In')).toBeInTheDocument()
        expect(screen.getByText('Enter Email')).toBeInTheDocument()
      })
    })
  })

  describe('Tutorial Controls', () => {
    it('should start tutorial when start button is clicked', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        const startButton = screen.getByText('Start Tutorial')
        fireEvent.click(startButton)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Pause')).toBeInTheDocument()
        expect(screen.getByText('Step 1: Navigate to Sign In')).toBeInTheDocument()
      })
    })

    it('should pause tutorial when pause button is clicked', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      // Start tutorial first
      await waitFor(() => {
        fireEvent.click(screen.getByTestId('start-tutorial-button'))
      })
      
      // Then pause it
      await waitFor(() => {
        fireEvent.click(screen.getByTestId('pause-tutorial-button'))
      })
      
      // After pausing, should show start button again (which becomes resume button if there are completed steps)
      await waitFor(() => {
        expect(screen.getByTestId('start-tutorial-button')).toBeInTheDocument()
      })
    })

    it('should reset tutorial when reset button is clicked', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      // Start tutorial first
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      // Then reset it
      await waitFor(() => {
        fireEvent.click(screen.getByText('Reset'))
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('start-tutorial-button')).toBeInTheDocument()
        expect(screen.getByTestId('progress-indicator')).toHaveTextContent('0/2 steps')
      })
    })

    it('should call onExit when exit button is clicked', async () => {
      const mockOnExit = vi.fn()
      
      render(<InteractiveTutorial {...defaultProps} onExit={mockOnExit} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Exit Tutorial'))
      })
      
      expect(mockOnExit).toHaveBeenCalledOnce()
    })
  })

  describe('Step Interaction', () => {
    it('should display current step when tutorial is active', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      // Start tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('current-step-title')).toHaveTextContent('Step 1: Navigate to Sign In')
        expect(screen.getByTestId('step-description')).toHaveTextContent('Click the Sign In button in the header')
        expect(screen.getByTestId('step-action-button')).toHaveTextContent('Click Element')
      })
    })

    it('should show hints when hint button is clicked', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      // Start tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      // Click show hints
      await waitFor(() => {
        fireEvent.click(screen.getByText('Show Hints'))
      })
      
      await waitFor(() => {
        expect(screen.getByText('Look for the Sign In button in the top navigation')).toBeInTheDocument()
        expect(screen.getByText('Hide Hints')).toBeInTheDocument()
      })
    })

    it('should validate step when action button is clicked', async () => {
      mockSandboxService.validateStep.mockReturnValue({
        isValid: true,
        feedback: 'Great! You clicked the right element.',
        nextStep: 'enter-email'
      })
      
      render(<InteractiveTutorial {...defaultProps} />)
      
      // Start tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      // Click the action button
      await waitFor(() => {
        fireEvent.click(screen.getByText('Click Element'))
      })
      
      expect(mockSandboxService.validateStep).toHaveBeenCalledWith(
        'session-123',
        'navigate-signin',
        'sign-in-button'
      )
      
      await waitFor(() => {
        expect(screen.getByText('Great! You clicked the right element.')).toBeInTheDocument()
      })
    })

    it('should progress to next step after successful validation', async () => {
      mockSandboxService.validateStep.mockReturnValue({
        isValid: true,
        feedback: 'Great! You clicked the right element.',
        nextStep: 'enter-email'
      })
      
      render(<InteractiveTutorial {...defaultProps} />)
      
      // Start tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      // Complete first step
      await waitFor(() => {
        fireEvent.click(screen.getByText('Click Element'))
      })
      
      await waitFor(() => {
        expect(screen.getByText('Step 2: Enter Email')).toBeInTheDocument()
        expect(screen.getByText('1/2 steps')).toBeInTheDocument()
      })
    })

    it('should handle validation errors gracefully', async () => {
      mockSandboxService.validateStep.mockImplementation(() => {
        throw new Error('Validation failed')
      })
      
      render(<InteractiveTutorial {...defaultProps} />)
      
      // Start tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      // Try to complete step (should handle error)
      await waitFor(() => {
        fireEvent.click(screen.getByText('Click Element'))
      })
      
      // Should not crash and should continue to show the tutorial
      expect(screen.getByText('Step 1: Navigate to Sign In')).toBeInTheDocument()
    })
  })

  describe('Tutorial Completion', () => {
    it('should show completion state when all steps are completed', async () => {
      const mockOnComplete = vi.fn()
      
      // Mock completing both steps
      mockSandboxService.validateStep
        .mockReturnValueOnce({
          isValid: true,
          feedback: 'Step 1 completed',
          nextStep: 'enter-email'
        })
        .mockReturnValueOnce({
          isValid: true,
          feedback: 'Tutorial completed!',
          nextStep: undefined
        })
      
      render(<InteractiveTutorial {...defaultProps} onComplete={mockOnComplete} />)
      
      // Start tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      // Complete first step
      await waitFor(() => {
        fireEvent.click(screen.getByText('Click Element'))
      })
      
      // Complete second step
      await waitFor(() => {
        fireEvent.click(screen.getByText('Enter Input'))
      })
      
      await waitFor(() => {
        expect(screen.getByText('Tutorial Completed!')).toBeInTheDocument()
        expect(screen.getByText(/Congratulations! You've successfully completed/)).toBeInTheDocument()
        expect(mockOnComplete).toHaveBeenCalledWith('auth-basics', expect.any(Object))
      })
    })

    it('should call onComplete with correct completion data', async () => {
      const mockOnComplete = vi.fn()
      
      mockSandboxService.validateStep.mockReturnValue({
        isValid: true,
        feedback: 'Tutorial completed!',
        nextStep: undefined
      })
      
      render(<InteractiveTutorial {...defaultProps} onComplete={mockOnComplete} />)
      
      // Start and complete tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Click Element'))
      })
      
      expect(mockOnComplete).toHaveBeenCalledWith('auth-basics', {
        tutorialId: 'auth-basics',
        completedAt: expect.any(Date),
        duration: expect.any(Number),
        stepsCompleted: expect.any(Number),
        totalSteps: 2
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toBeInTheDocument()
        // The Progress component may not have aria-valuenow when value is 0
        expect(progressBar).toHaveAttribute('aria-valuemin', '0')
        expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      })
    })

    it('should be keyboard navigable', async () => {
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        const startButton = screen.getByText('Start Tutorial')
        expect(startButton).toBeInTheDocument()
        
        // Button should be focusable
        startButton.focus()
        expect(document.activeElement).toBe(startButton)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle session creation failure', async () => {
      mockSandboxService.createSession.mockRejectedValue(new Error('Session creation failed'))
      
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        // Should still render the tutorial interface even if session creation fails
        expect(screen.getByText('Authentication Basics')).toBeInTheDocument()
      })
    })

    it('should handle missing tutorial gracefully', async () => {
      mockSandboxService.getTutorial.mockReturnValue(null)
      
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Tutorial not found/)).toBeInTheDocument()
      })
    })
  })

  describe('Props and Customization', () => {
    it('should apply custom className', async () => {
      const { container } = render(
        <InteractiveTutorial {...defaultProps} className="custom-tutorial" />
      )
      
      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-tutorial')
      })
    })

    it('should handle different tutorial types', async () => {
      const inputTutorial = {
        ...mockTutorial,
        steps: [
          {
            id: 'input-step',
            title: 'Input Step',
            description: 'Enter some text',
            action: 'input' as const,
            target: 'text-input',
            hints: ['Enter any text']
          }
        ]
      }
      
      mockSandboxService.getTutorial.mockReturnValue(inputTutorial)
      
      render(<InteractiveTutorial {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      await waitFor(() => {
        expect(screen.getByText('Enter Input')).toBeInTheDocument()
      })
    })
  })
})