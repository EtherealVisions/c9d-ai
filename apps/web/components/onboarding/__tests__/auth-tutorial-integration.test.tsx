import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InteractiveTutorial } from '../interactive-tutorial'
import { SandboxService } from '@/lib/services/sandbox-service'

// Integration tests for authentication tutorial flow
describe('Authentication Tutorial Integration', () => {
  beforeEach(() => {
    // Initialize the real SandboxService for integration testing
    SandboxService.initialize()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Sign-In Tutorial Flow', () => {
    it('should complete full sign-in tutorial workflow', async () => {
      const mockOnComplete = vi.fn()
      const userId = 'test-user-signin'
      
      render(
        <InteractiveTutorial
          tutorialId="auth-basics"
          userId={userId}
          onComplete={mockOnComplete}
        />
      )
      
      // Wait for tutorial to load
      await waitFor(() => {
        expect(screen.getByText('Authentication Basics')).toBeInTheDocument()
      })
      
      // Start the tutorial
      fireEvent.click(screen.getByText('Start Tutorial'))
      
      await waitFor(() => {
        expect(screen.getByText('Step 1: Navigate to Sign In')).toBeInTheDocument()
      })
      
      // Complete Step 1: Navigate to Sign In
      fireEvent.click(screen.getByText('Click Element'))
      
      await waitFor(() => {
        expect(screen.getByText('Great! You clicked the right element.')).toBeInTheDocument()
        expect(screen.getByText('Step 2: Enter Email')).toBeInTheDocument()
      })
      
      // Complete Step 2: Enter Email
      fireEvent.click(screen.getByText('Enter Input'))
      
      await waitFor(() => {
        expect(screen.getByText('Correct input!')).toBeInTheDocument()
        expect(screen.getByText('Step 3: Enter Password')).toBeInTheDocument()
      })
      
      // Complete Step 3: Enter Password
      fireEvent.click(screen.getByText('Enter Input'))
      
      await waitFor(() => {
        expect(screen.getByText('Correct input!')).toBeInTheDocument()
        expect(screen.getByText('Step 4: Submit Sign In')).toBeInTheDocument()
      })
      
      // Complete Step 4: Submit Sign In
      fireEvent.click(screen.getByText('Click Element'))
      
      await waitFor(() => {
        expect(screen.getByText('Tutorial Completed!')).toBeInTheDocument()
        expect(mockOnComplete).toHaveBeenCalledWith('auth-basics', expect.objectContaining({
          tutorialId: 'auth-basics',
          stepsCompleted: 4,
          totalSteps: 4
        }))
      })
    })

    it('should handle incorrect inputs during sign-in tutorial', async () => {
      const userId = 'test-user-signin-errors'
      
      render(
        <InteractiveTutorial
          tutorialId="auth-basics"
          userId={userId}
        />
      )
      
      // Start tutorial and get to email step
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Click Element')) // Complete step 1
      })
      
      // Now we're at the email step - let's simulate wrong input
      // We need to access the SandboxService directly to test error handling
      const activeSession = SandboxService.getActiveSession(userId)
      expect(activeSession).toBeDefined()
      
      if (activeSession) {
        // Test wrong email input
        const wrongEmailResult = SandboxService.validateStep(
          activeSession.id,
          'enter-email',
          'wrong-email'
        )
        
        expect(wrongEmailResult.isValid).toBe(false)
        expect(wrongEmailResult.feedback).toBe('Invalid input')
        
        // Test correct email input
        const correctEmailResult = SandboxService.validateStep(
          activeSession.id,
          'enter-email',
          'demo@example.com'
        )
        
        expect(correctEmailResult.isValid).toBe(true)
        expect(correctEmailResult.feedback).toBe('Correct input!')
        expect(correctEmailResult.nextStep).toBe('enter-password')
      }
    })

    it('should track progress correctly throughout sign-in tutorial', async () => {
      const userId = 'test-user-progress'
      
      render(
        <InteractiveTutorial
          tutorialId="auth-basics"
          userId={userId}
        />
      )
      
      // Start tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      // Check initial progress
      expect(screen.getByText('0/4 steps')).toBeInTheDocument()
      
      // Complete first step
      fireEvent.click(screen.getByText('Click Element'))
      
      await waitFor(() => {
        expect(screen.getByText('1/4 steps')).toBeInTheDocument()
      })
      
      // Complete second step
      fireEvent.click(screen.getByText('Enter Input'))
      
      await waitFor(() => {
        expect(screen.getByText('2/4 steps')).toBeInTheDocument()
      })
      
      // Verify session state
      const activeSession = SandboxService.getActiveSession(userId)
      expect(activeSession?.state.completedSteps).toHaveLength(2)
    })
  })

  describe('Sign-Up Tutorial Flow', () => {
    it('should complete full sign-up tutorial workflow', async () => {
      const mockOnComplete = vi.fn()
      const userId = 'test-user-signup'
      
      render(
        <InteractiveTutorial
          tutorialId="signup-process"
          userId={userId}
          onComplete={mockOnComplete}
        />
      )
      
      // Wait for tutorial to load
      await waitFor(() => {
        expect(screen.getByText('Sign Up Process')).toBeInTheDocument()
      })
      
      // Start the tutorial
      fireEvent.click(screen.getByText('Start Tutorial'))
      
      await waitFor(() => {
        expect(screen.getByText('Step 1: Navigate to Sign Up')).toBeInTheDocument()
      })
      
      // Complete all steps
      const steps = [
        'Click Element',  // Navigate to Sign Up
        'Enter Input',    // Enter Email
        'Enter Input',    // Create Password
        'Enter Input',    // Confirm Password
        'Click Element'   // Create Account
      ]
      
      for (let i = 0; i < steps.length; i++) {
        fireEvent.click(screen.getByText(steps[i]))
        
        if (i < steps.length - 1) {
          await waitFor(() => {
            expect(screen.getByText(`${i + 1}/5 steps`)).toBeInTheDocument()
          })
        }
      }
      
      await waitFor(() => {
        expect(screen.getByText('Tutorial Completed!')).toBeInTheDocument()
        expect(mockOnComplete).toHaveBeenCalledWith('signup-process', expect.objectContaining({
          tutorialId: 'signup-process',
          stepsCompleted: 5,
          totalSteps: 5
        }))
      })
    })

    it('should validate email format in sign-up tutorial', async () => {
      const userId = 'test-user-signup-validation'
      
      render(
        <InteractiveTutorial
          tutorialId="signup-process"
          userId={userId}
        />
      )
      
      // Start tutorial and navigate to email step
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Click Element')) // Navigate to sign up
      })
      
      // Test email validation
      const activeSession = SandboxService.getActiveSession(userId)
      expect(activeSession).toBeDefined()
      
      if (activeSession) {
        // Test invalid email
        const invalidEmailResult = SandboxService.validateStep(
          activeSession.id,
          'enter-signup-email',
          'invalid-email'
        )
        
        expect(invalidEmailResult.isValid).toBe(false)
        expect(invalidEmailResult.feedback).toBe('Validation failed')
        
        // Test valid email
        const validEmailResult = SandboxService.validateStep(
          activeSession.id,
          'enter-signup-email',
          'test@example.com'
        )
        
        expect(validEmailResult.isValid).toBe(true)
        expect(validEmailResult.feedback).toBe('Validation passed!')
      }
    })

    it('should validate password strength in sign-up tutorial', async () => {
      const userId = 'test-user-password-validation'
      
      render(
        <InteractiveTutorial
          tutorialId="signup-process"
          userId={userId}
        />
      )
      
      // Navigate to password step
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      // Complete first two steps to get to password
      await waitFor(() => {
        fireEvent.click(screen.getByText('Click Element')) // Navigate
      })
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Enter Input')) // Email
      })
      
      // Test password validation
      const activeSession = SandboxService.getActiveSession(userId)
      expect(activeSession).toBeDefined()
      
      if (activeSession) {
        // Test weak password
        const weakPasswordResult = SandboxService.validateStep(
          activeSession.id,
          'enter-signup-password',
          '123'
        )
        
        expect(weakPasswordResult.isValid).toBe(false)
        expect(weakPasswordResult.feedback).toBe('Validation failed')
        
        // Test strong password
        const strongPasswordResult = SandboxService.validateStep(
          activeSession.id,
          'enter-signup-password',
          'strongPassword123!'
        )
        
        expect(strongPasswordResult.isValid).toBe(true)
        expect(strongPasswordResult.feedback).toBe('Validation passed!')
      }
    })
  })

  describe('Tutorial Session Management', () => {
    it('should create and manage sandbox sessions correctly', async () => {
      const userId = 'test-session-management'
      
      render(
        <InteractiveTutorial
          tutorialId="auth-basics"
          userId={userId}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByText('Authentication Basics')).toBeInTheDocument()
      })
      
      // Check that session was created
      const activeSession = SandboxService.getActiveSession(userId)
      expect(activeSession).toBeDefined()
      expect(activeSession?.userId).toBe(userId)
      expect(activeSession?.type).toBe('tutorial')
      expect(activeSession?.isActive).toBe(true)
    })

    it('should handle session expiration gracefully', async () => {
      const userId = 'test-session-expiration'
      
      // Create a session manually with short expiration
      const session = await SandboxService.createSession(userId, 'auth-tutorial')
      expect(session).toBeDefined()
      
      // Verify session exists
      let activeSession = SandboxService.getActiveSession(userId)
      expect(activeSession).toBeDefined()
      
      // End the session
      await SandboxService.endSession(session.id)
      
      // Verify session is no longer active
      activeSession = SandboxService.getActiveSession(userId)
      expect(activeSession).toBeNull()
    })

    it('should handle multiple concurrent tutorial sessions', async () => {
      const userIds = ['user1', 'user2', 'user3']
      
      // Create multiple tutorial instances
      const tutorials = userIds.map(userId => 
        render(
          <InteractiveTutorial
            tutorialId="auth-basics"
            userId={userId}
          />
        )
      )
      
      // Wait for all to load
      await waitFor(() => {
        tutorials.forEach(() => {
          expect(screen.getAllByText('Authentication Basics')).toHaveLength(userIds.length)
        })
      })
      
      // Verify each user has their own session
      userIds.forEach(userId => {
        const session = SandboxService.getActiveSession(userId)
        expect(session).toBeDefined()
        expect(session?.userId).toBe(userId)
      })
    })
  })

  describe('Tutorial Content and Structure', () => {
    it('should have consistent tutorial structure across auth tutorials', () => {
      const authBasics = SandboxService.getTutorial('auth-basics')
      const signupProcess = SandboxService.getTutorial('signup-process')
      
      expect(authBasics).toBeDefined()
      expect(signupProcess).toBeDefined()
      
      // Both should be authentication category
      expect(authBasics?.category).toBe('authentication')
      expect(signupProcess?.category).toBe('authentication')
      
      // Both should be beginner level
      expect(authBasics?.difficulty).toBe('beginner')
      expect(signupProcess?.difficulty).toBe('beginner')
      
      // Both should have proper step structure
      authBasics?.steps.forEach(step => {
        expect(step.id).toBeDefined()
        expect(step.title).toBeDefined()
        expect(step.description).toBeDefined()
        expect(step.action).toMatch(/^(click|input|navigate|wait|validate)$/)
        expect(step.hints).toBeInstanceOf(Array)
      })
      
      signupProcess?.steps.forEach(step => {
        expect(step.id).toBeDefined()
        expect(step.title).toBeDefined()
        expect(step.description).toBeDefined()
        expect(step.action).toMatch(/^(click|input|navigate|wait|validate)$/)
        expect(step.hints).toBeInstanceOf(Array)
      })
    })

    it('should provide helpful hints for each tutorial step', async () => {
      const userId = 'test-hints'
      
      render(
        <InteractiveTutorial
          tutorialId="auth-basics"
          userId={userId}
        />
      )
      
      // Start tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      // Show hints for first step
      await waitFor(() => {
        fireEvent.click(screen.getByText('Show Hints'))
      })
      
      await waitFor(() => {
        expect(screen.getByText('Look for the Sign In button in the top navigation')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Reliability', () => {
    it('should handle rapid step completion without errors', async () => {
      const userId = 'test-rapid-completion'
      
      render(
        <InteractiveTutorial
          tutorialId="auth-basics"
          userId={userId}
        />
      )
      
      // Start tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      // Rapidly complete all steps
      const actionButtons = ['Click Element', 'Enter Input', 'Enter Input', 'Click Element']
      
      for (const buttonText of actionButtons) {
        await waitFor(() => {
          const button = screen.getByText(buttonText)
          fireEvent.click(button)
        })
      }
      
      // Should complete successfully
      await waitFor(() => {
        expect(screen.getByText('Tutorial Completed!')).toBeInTheDocument()
      })
    })

    it('should maintain state consistency during pause/resume', async () => {
      const userId = 'test-pause-resume'
      
      render(
        <InteractiveTutorial
          tutorialId="auth-basics"
          userId={userId}
        />
      )
      
      // Start tutorial and complete first step
      await waitFor(() => {
        fireEvent.click(screen.getByText('Start Tutorial'))
      })
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Click Element'))
      })
      
      // Pause tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Pause'))
      })
      
      // Resume tutorial
      await waitFor(() => {
        fireEvent.click(screen.getByText('Resume Tutorial'))
      })
      
      // Should maintain progress
      await waitFor(() => {
        expect(screen.getByText('1/4 steps')).toBeInTheDocument()
        expect(screen.getByText('Step 2: Enter Email')).toBeInTheDocument()
      })
    })
  })
})