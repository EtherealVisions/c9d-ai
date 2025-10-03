/**
 * Integration tests for authentication forms
 * These tests validate the behavior of sign-in and sign-up forms
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { SignInForm, SignUpForm } from '@/components/auth'
import { useSignIn, useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

// Mock Clerk hooks
vi.mock('@clerk/nextjs', () => ({
  useSignIn: vi.fn(),
  useSignUp: vi.fn(),
  useAuth: vi.fn(() => ({ isLoaded: true })),
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(() => ({
    get: vi.fn()
  }))
}))

// Mock auth context
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isLoading: false,
    syncUserData: vi.fn()
  }))
}))

// Mock accessibility context
vi.mock('@/contexts/accessibility-context', () => ({
  useAccessibility: vi.fn(() => ({
    highContrast: false,
    fontSize: 'medium',
    reduceMotion: false,
    keyboardNavigation: false,
    setHighContrast: vi.fn(),
    setFontSize: vi.fn(),
    setReduceMotion: vi.fn(),
    setKeyboardNavigation: vi.fn(),
    announceToScreenReader: vi.fn()
  }))
}))

describe('SignInForm Integration Tests', () => {
  const mockSignIn = {
    create: vi.fn(),
    isLoaded: true,
    setActive: vi.fn()
  }
  
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSignIn as any).mockReturnValue(mockSignIn)
    ;(useRouter as any).mockReturnValue(mockRouter)
  })

  describe('Form Validation', () => {
    it('should show validation errors for empty fields', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })
    })

    it('should validate password length', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, '123')
      await user.tab() // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
    })
  })

  describe('Successful Sign In', () => {
    it('should sign in with valid credentials', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockResolvedValueOnce({
        status: 'complete',
        createdSessionId: 'session123'
      })

      render(<SignInForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'TestPassword123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn.create).toHaveBeenCalledWith({
          identifier: 'test@example.com',
          password: 'TestPassword123!'
        })
        expect(mockSignIn.setActive).toHaveBeenCalledWith({ session: 'session123' })
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should redirect to custom URL after sign in', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockResolvedValueOnce({
        status: 'complete',
        createdSessionId: 'session123'
      })

      render(<SignInForm redirectUrl="/custom-page" />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'TestPassword123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/custom-page')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle incorrect password error', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockRejectedValueOnce({
        errors: [{
          code: 'form_password_incorrect',
          message: 'Password is incorrect'
        }]
      })

      render(<SignInForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'WrongPassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password is incorrect/i)).toBeInTheDocument()
      })
    })

    it('should handle account not found error', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockRejectedValueOnce({
        errors: [{
          code: 'form_identifier_not_found',
          message: 'Account not found'
        }]
      })

      render(<SignInForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'nonexistent@example.com')
      await user.type(passwordInput, 'TestPassword123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/account not found/i)).toBeInTheDocument()
      })
    })

    it('should handle rate limiting', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockRejectedValueOnce({
        errors: [{
          code: 'too_many_requests',
          message: 'Too many attempts. Please try again later.'
        }]
      })

      render(<SignInForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'TestPassword123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/too many attempts/i)).toBeInTheDocument()
      })
    })
  })

  describe('Social Sign In', () => {
    it('should trigger Google sign in', async () => {
      const user = userEvent.setup()
      const mockSignInWithOAuth = vi.fn()
      mockSignIn.authenticateWithRedirect = mockSignInWithOAuth

      render(<SignInForm />)

      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await user.click(googleButton)

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })

    it('should trigger GitHub sign in', async () => {
      const user = userEvent.setup()
      const mockSignInWithOAuth = vi.fn()
      mockSignIn.authenticateWithRedirect = mockSignInWithOAuth

      render(<SignInForm />)

      const githubButton = screen.getByRole('button', { name: /continue with github/i })
      await user.click(githubButton)

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        strategy: 'oauth_github',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })
  })
})

describe('SignUpForm Integration Tests', () => {
  const mockSignUp = {
    create: vi.fn(),
    isLoaded: true,
    prepareEmailAddressVerification: vi.fn(),
    attemptEmailAddressVerification: vi.fn(),
    setActive: vi.fn()
  }
  
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSignUp as any).mockReturnValue(mockSignUp)
    ;(useRouter as any).mockReturnValue(mockRouter)
  })

  describe('Form Validation', () => {
    it('should validate all required fields', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should validate password strength', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      
      // Weak password
      await user.type(passwordInput, 'weak')
      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument()
      })

      // Medium password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'Medium123')
      await waitFor(() => {
        expect(screen.getByText(/medium/i)).toBeInTheDocument()
      })

      // Strong password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'Strong123!@#')
      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument()
      })
    })

    it('should validate password confirmation', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      await user.type(passwordInput, 'TestPassword123!')
      await user.type(confirmPasswordInput, 'DifferentPassword')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('should validate email uniqueness', async () => {
      const user = userEvent.setup()
      mockSignUp.create.mockRejectedValueOnce({
        errors: [{
          code: 'form_email_exists',
          message: 'Email already exists'
        }]
      })

      render(<SignUpForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(firstNameInput, 'Test')
      await user.type(lastNameInput, 'User')
      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'TestPassword123!')
      await user.type(confirmPasswordInput, 'TestPassword123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
      })
    })
  })

  describe('Successful Sign Up', () => {
    it('should create account and trigger verification', async () => {
      const user = userEvent.setup()
      mockSignUp.create.mockResolvedValueOnce({
        status: 'missing_requirements',
        unverifiedFields: ['email_address']
      })

      render(<SignUpForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(firstNameInput, 'Test')
      await user.type(lastNameInput, 'User')
      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'TestPassword123!')
      await user.type(confirmPasswordInput, 'TestPassword123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp.create).toHaveBeenCalledWith({
          firstName: 'Test',
          lastName: 'User',
          emailAddress: 'newuser@example.com',
          password: 'TestPassword123!'
        })
        expect(mockSignUp.prepareEmailAddressVerification).toHaveBeenCalledWith({
          strategy: 'email_code'
        })
      })

      // Should show verification UI
      expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
    })

    it('should handle email verification', async () => {
      const user = userEvent.setup()
      mockSignUp.create.mockResolvedValueOnce({
        status: 'missing_requirements',
        unverifiedFields: ['email_address']
      })
      mockSignUp.attemptEmailAddressVerification.mockResolvedValueOnce({
        status: 'complete',
        createdSessionId: 'session123'
      })

      render(<SignUpForm />)

      // First create the account
      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(firstNameInput, 'Test')
      await user.type(lastNameInput, 'User')
      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'TestPassword123!')
      await user.type(confirmPasswordInput, 'TestPassword123!')
      await user.click(submitButton)

      // Wait for verification UI
      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
      })

      // Enter verification code
      const codeInputs = screen.getAllByRole('textbox')
      const verificationCode = '123456'
      
      for (let i = 0; i < verificationCode.length; i++) {
        await user.type(codeInputs[i], verificationCode[i])
      }

      const verifyButton = screen.getByRole('button', { name: /verify/i })
      await user.click(verifyButton)

      await waitFor(() => {
        expect(mockSignUp.attemptEmailAddressVerification).toHaveBeenCalledWith({
          code: verificationCode
        })
        expect(mockSignUp.setActive).toHaveBeenCalledWith({ session: 'session123' })
        expect(mockRouter.push).toHaveBeenCalledWith('/onboarding')
      })
    })
  })

  describe('Terms and Privacy', () => {
    it('should require terms acceptance', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(firstNameInput, 'Test')
      await user.type(lastNameInput, 'User')
      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'TestPassword123!')
      await user.type(confirmPasswordInput, 'TestPassword123!')
      
      // Don't check terms checkbox
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/you must accept the terms/i)).toBeInTheDocument()
      })
    })

    it('should show terms and privacy links', () => {
      render(<SignUpForm />)

      expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/terms')
      expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
    })
  })

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)

      // Tab through form fields
      await user.tab()
      expect(firstNameInput).toHaveFocus()

      await user.tab()
      expect(lastNameInput).toHaveFocus()

      await user.tab()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()
    })

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup()
      const mockAnnounce = vi.fn()
      
      vi.mocked(useAccessibility).mockReturnValue({
        highContrast: false,
        fontSize: 'medium',
        reduceMotion: false,
        keyboardNavigation: false,
        setHighContrast: vi.fn(),
        setFontSize: vi.fn(),
        setReduceMotion: vi.fn(),
        setKeyboardNavigation: vi.fn(),
        announceToScreenReader: mockAnnounce
      } as any)

      render(<SignUpForm />)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAnnounce).toHaveBeenCalledWith(
          expect.stringContaining('validation errors')
        )
      })
    })
  })
})
