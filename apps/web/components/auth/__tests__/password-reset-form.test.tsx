import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { PasswordResetForm } from '../password-reset-form'

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useSignIn: vi.fn()
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

// Mock Clerk config
vi.mock('@/lib/config/clerk', () => ({
  getPasswordRequirements: () => ({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPasswords: ['password', '12345678']
  })
}))

describe('PasswordResetForm', () => {
  const mockSignIn = {
    create: vi.fn(),
    prepareFirstFactor: vi.fn(),
    attemptFirstFactor: vi.fn(),
    resetPassword: vi.fn(),
    supportedFirstFactors: [
      {
        strategy: 'reset_password_email_code',
        emailAddressId: 'email_123'
      }
    ]
  }
  
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSignIn as any).mockReturnValue({
      signIn: mockSignIn,
      isLoaded: true
    })
    ;(useRouter as any).mockReturnValue(mockRouter)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Password Reset Request Step', () => {
    it('should render email input form by default', () => {
      render(<PasswordResetForm />)
      
      expect(screen.getByTestId('request-reset-form')).toBeInTheDocument()
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByTestId('send-reset-email-button')).toBeInTheDocument()
    })

    it('should validate email format', async () => {
      render(<PasswordResetForm />)
      
      const emailInput = screen.getByTestId('email-input')
      const submitButton = screen.getByTestId('send-reset-email-button')
      
      // Test invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Invalid email format')
      })
    })

    it('should validate required email field', async () => {
      render(<PasswordResetForm />)
      
      const submitButton = screen.getByTestId('send-reset-email-button')
      
      // Submit without entering email
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required')
      })
    })

    it('should handle successful reset request', async () => {
      mockSignIn.create.mockResolvedValue({})
      mockSignIn.prepareFirstFactor.mockResolvedValue({})
      
      render(<PasswordResetForm />)
      
      const emailInput = screen.getByTestId('email-input')
      const submitButton = screen.getByTestId('send-reset-email-button')
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignIn.create).toHaveBeenCalledWith({
          identifier: 'test@example.com'
        })
      })
      
      await waitFor(() => {
        expect(mockSignIn.prepareFirstFactor).toHaveBeenCalledWith({
          strategy: 'reset_password_email_code',
          emailAddressId: 'email_123'
        })
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('email-sent-alert')).toBeInTheDocument()
        expect(screen.getByTestId('verification-code-input')).toBeInTheDocument()
      })
    })

    it('should handle email not found error', async () => {
      mockSignIn.create.mockRejectedValue({
        errors: [{ code: 'form_identifier_not_found', message: 'Email not found' }]
      })
      
      render(<PasswordResetForm />)
      
      const emailInput = screen.getByTestId('email-input')
      const submitButton = screen.getByTestId('send-reset-email-button')
      
      fireEvent.change(emailInput, { target: { value: 'notfound@example.com' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent(/no account found with this email address/i)
      })
    })
  })

  describe('Code Verification Step', () => {
    it('should render verification form when email is provided', () => {
      render(<PasswordResetForm email="test@example.com" />)
      
      expect(screen.getByTestId('verify-code-form')).toBeInTheDocument()
      expect(screen.getByTestId('verification-code-input')).toBeInTheDocument()
      expect(screen.getByTestId('verify-code-button')).toBeInTheDocument()
    })

    it('should validate verification code', async () => {
      render(<PasswordResetForm email="test@example.com" />)
      
      const submitButton = screen.getByTestId('verify-code-button')
      
      // Test empty code
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('verification-code-error')).toHaveTextContent('Verification code is required')
      })
    })

    it('should handle successful code verification', async () => {
      mockSignIn.attemptFirstFactor.mockResolvedValue({
        status: 'needs_new_password'
      })
      
      render(<PasswordResetForm email="test@example.com" />)
      
      const codeInput = screen.getByTestId('verification-code-input')
      const submitButton = screen.getByTestId('verify-code-button')
      
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignIn.attemptFirstFactor).toHaveBeenCalledWith({
          strategy: 'reset_password_email_code',
          code: '123456'
        })
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument()
      })
    })

    it('should handle invalid code error', async () => {
      mockSignIn.attemptFirstFactor.mockRejectedValue({
        errors: [{ code: 'form_code_incorrect', message: 'Invalid code' }]
      })
      
      render(<PasswordResetForm email="test@example.com" />)
      
      const codeInput = screen.getByTestId('verification-code-input')
      const submitButton = screen.getByTestId('verify-code-button')
      
      fireEvent.change(codeInput, { target: { value: '000000' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('verification-code-error')).toHaveTextContent(/invalid verification code/i)
      })
    })

    it('should allow resending verification code', async () => {
      mockSignIn.prepareFirstFactor.mockResolvedValue({})
      
      render(<PasswordResetForm email="test@example.com" />)
      
      const resendButton = screen.getByTestId('resend-code-button')
      fireEvent.click(resendButton)
      
      await waitFor(() => {
        expect(mockSignIn.prepareFirstFactor).toHaveBeenCalledWith({
          strategy: 'reset_password_email_code',
          emailAddressId: 'email_123'
        })
      })
    })
  })

  describe('Password Reset Step', () => {
    it('should render password reset form when token is provided', () => {
      render(<PasswordResetForm token="reset_token" />)
      
      expect(screen.getByTestId('reset-password-form')).toBeInTheDocument()
      expect(screen.getByTestId('new-password-input')).toBeInTheDocument()
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument()
      expect(screen.getByTestId('reset-password-button')).toBeInTheDocument()
    })

    it('should validate password requirements', async () => {
      render(<PasswordResetForm token="reset_token" />)
      
      const passwordInput = screen.getByTestId('new-password-input')
      const submitButton = screen.getByTestId('reset-password-button')
      
      // Test weak password
      fireEvent.change(passwordInput, { target: { value: 'weak' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('new-password-error')).toHaveTextContent(/Password must contain/)
      })
    })

    it('should validate required password field', async () => {
      render(<PasswordResetForm token="reset_token" />)
      
      const submitButton = screen.getByTestId('reset-password-button')
      
      // Submit without entering password
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('new-password-error')).toHaveTextContent('Password is required')
      })
    })

    it('should validate password confirmation', async () => {
      render(<PasswordResetForm token="reset_token" />)
      
      const passwordInput = screen.getByTestId('new-password-input')
      const confirmInput = screen.getByTestId('confirm-password-input')
      const submitButton = screen.getByTestId('reset-password-button')
      
      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmInput, { target: { value: 'DifferentPass123!' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-password-error')).toHaveTextContent(/passwords do not match/i)
      })
    })

    it('should handle successful password reset', async () => {
      mockSignIn.resetPassword.mockResolvedValue({
        status: 'complete'
      })
      
      render(<PasswordResetForm token="reset_token" />)
      
      const passwordInput = screen.getByTestId('new-password-input')
      const confirmInput = screen.getByTestId('confirm-password-input')
      const submitButton = screen.getByTestId('reset-password-button')
      
      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmInput, { target: { value: 'StrongPass123!' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignIn.resetPassword).toHaveBeenCalledWith({
          password: 'StrongPass123!'
        })
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('success-title')).toHaveTextContent(/password reset successful/i)
      })
    })

    it('should handle compromised password error', async () => {
      mockSignIn.resetPassword.mockRejectedValue({
        errors: [{ code: 'form_password_pwned', message: 'Password compromised' }]
      })
      
      render(<PasswordResetForm token="reset_token" />)
      
      const passwordInput = screen.getByLabelText('New Password')
      const confirmInput = screen.getByLabelText('Confirm New Password')
      const submitButton = screen.getByRole('button', { name: /reset password/i })
      
      fireEvent.change(passwordInput, { target: { value: 'CompromisedPass123!' } })
      fireEvent.change(confirmInput, { target: { value: 'CompromisedPass123!' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/password has been compromised/i)).toBeInTheDocument()
      })
    })
  })

  describe('Success Step', () => {
    it('should show success message and continue button', async () => {
      mockSignIn.resetPassword.mockResolvedValue({
        status: 'complete'
      })
      
      render(<PasswordResetForm token="reset_token" />)
      
      const passwordInput = screen.getByLabelText('New Password')
      const confirmInput = screen.getByLabelText('Confirm New Password')
      const submitButton = screen.getByRole('button', { name: /reset password/i })
      
      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmInput, { target: { value: 'StrongPass123!' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
      })
      
      const continueButton = screen.getByRole('button', { name: /continue to sign in/i })
      fireEvent.click(continueButton)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/sign-in')
    })
  })

  describe('Navigation', () => {
    it('should handle back navigation', () => {
      render(<PasswordResetForm email="test@example.com" />)
      
      const backButton = screen.getByRole('button', { name: /back/i })
      fireEvent.click(backButton)
      
      // Should show email input form
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    })

    it('should navigate to sign in', () => {
      render(<PasswordResetForm />)
      
      const signInLink = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(signInLink)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/sign-in')
    })
  })

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      render(<PasswordResetForm token="reset_token" />)
      
      const passwordInput = screen.getByLabelText('New Password')
      const toggleButton = screen.getAllByRole('button', { name: /show password/i })[0]
      
      expect(passwordInput).toHaveAttribute('type', 'password')
      
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')
      
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Loading States', () => {
    it('should show loading state during reset request', async () => {
      mockSignIn.create.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<PasswordResetForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset email/i })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      expect(screen.getByRole('button', { name: /sending.../i })).toBeInTheDocument()
    })

    it('should disable form during loading', async () => {
      mockSignIn.create.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<PasswordResetForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset email/i })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      expect(emailInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<PasswordResetForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })

    it('should associate error messages with form fields', async () => {
      render(<PasswordResetForm />)
      
      const submitButton = screen.getByRole('button', { name: /send reset email/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i)
        const errorMessage = screen.getByText('Email is required')
        
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error')
        expect(errorMessage).toHaveAttribute('id', 'email-error')
      })
    })
  })
})