import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { EmailVerificationForm } from '../email-verification-form'

// Mock Clerk hooks
vi.mock('@clerk/nextjs', () => ({
  useSignUp: vi.fn()
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

const mockUseSignUp = vi.mocked(useSignUp)
const mockUseRouter = vi.mocked(useRouter)

describe('EmailVerificationForm', () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn()
  }

  const mockSignUp = {
    attemptEmailAddressVerification: vi.fn(),
    prepareEmailAddressVerification: vi.fn(),
    emailAddress: 'test@example.com'
  }

  const mockSetActive = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter)
    mockUseSignUp.mockReturnValue({
      signUp: mockSignUp,
      isLoaded: true,
      setActive: mockSetActive
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render verification form with email display', () => {
      render(<EmailVerificationForm email="test@example.com" />)
      
      expect(screen.getByText('We\'ve sent a 6-digit verification code to:')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByLabelText('Enter verification code')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /verify email/i })).toBeInTheDocument()
    })

    it('should display Clerk email when no email prop provided', () => {
      render(<EmailVerificationForm />)
      
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should show fallback text when no email available', () => {
      mockUseSignUp.mockReturnValue({
        signUp: { ...mockSignUp, emailAddress: undefined },
        isLoaded: true,
        setActive: mockSetActive
      })

      render(<EmailVerificationForm />)
      
      expect(screen.getByText('your email address')).toBeInTheDocument()
    })

    it('should display initial error message', () => {
      render(<EmailVerificationForm error="Initial error message" />)
      
      expect(screen.getByText('Initial error message')).toBeInTheDocument()
    })
  })

  describe('Code Input Validation', () => {
    it('should only allow numeric input and limit to 6 digits', () => {
      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      
      // Test numeric input
      fireEvent.change(input, { target: { value: '123456' } })
      expect(input).toHaveValue('123456')
      
      // Test non-numeric characters are filtered
      fireEvent.change(input, { target: { value: '12a3b4c5d6e7' } })
      expect(input).toHaveValue('123456')
      
      // Test length limit
      fireEvent.change(input, { target: { value: '1234567890' } })
      expect(input).toHaveValue('123456')
    })

    it('should clear error when user starts typing', () => {
      render(<EmailVerificationForm error="Initial error" />)
      
      expect(screen.getByText('Initial error')).toBeInTheDocument()
      
      const input = screen.getByLabelText('Enter verification code')
      fireEvent.change(input, { target: { value: '1' } })
      
      expect(screen.queryByText('Initial error')).not.toBeInTheDocument()
    })

    it('should disable verify button when code is incomplete', () => {
      render(<EmailVerificationForm />)
      
      const button = screen.getByRole('button', { name: /verify email/i })
      expect(button).toBeDisabled()
      
      const input = screen.getByLabelText('Enter verification code')
      fireEvent.change(input, { target: { value: '12345' } })
      expect(button).toBeDisabled()
      
      fireEvent.change(input, { target: { value: '123456' } })
      expect(button).not.toBeDisabled()
    })
  })

  describe('Email Verification Process', () => {
    it('should handle successful verification', async () => {
      mockSignUp.attemptEmailAddressVerification.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })

      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      const button = screen.getByRole('button', { name: /verify email/i })
      
      fireEvent.change(input, { target: { value: '123456' } })
      fireEvent.click(button)
      
      expect(button).toHaveTextContent('Verifying...')
      expect(button).toBeDisabled()
      
      await waitFor(() => {
        expect(mockSignUp.attemptEmailAddressVerification).toHaveBeenCalledWith({
          code: '123456'
        })
      })
      
      await waitFor(() => {
        expect(mockSetActive).toHaveBeenCalledWith({ session: 'session-123' })
      })
      
      await waitFor(() => {
        expect(screen.getByText('Email verified successfully!')).toBeInTheDocument()
      })
    })

    it('should handle incomplete verification', async () => {
      mockSignUp.attemptEmailAddressVerification.mockResolvedValue({
        status: 'missing_requirements'
      })

      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      const button = screen.getByRole('button', { name: /verify email/i })
      
      fireEvent.change(input, { target: { value: '123456' } })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText('Verification incomplete. Please try again.')).toBeInTheDocument()
      })
      
      expect(button).not.toBeDisabled()
      expect(button).toHaveTextContent('Verify Email')
    })

    it('should validate code length before submission', () => {
      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      const button = screen.getByRole('button', { name: /verify email/i })
      
      fireEvent.change(input, { target: { value: '12345' } })
      fireEvent.click(button)
      
      // Button should be disabled for incomplete code
      expect(button).toBeDisabled()
      expect(mockSignUp.attemptEmailAddressVerification).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid verification code error', async () => {
      const error = {
        errors: [{
          code: 'form_code_incorrect',
          message: 'Invalid code'
        }]
      }
      
      mockSignUp.attemptEmailAddressVerification.mockRejectedValue(error)

      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      const button = screen.getByRole('button', { name: /verify email/i })
      
      fireEvent.change(input, { target: { value: '123456' } })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid verification code. Please check and try again.')).toBeInTheDocument()
      })
    })

    it('should handle expired verification code error', async () => {
      const error = {
        errors: [{
          code: 'verification_expired',
          message: 'Code expired'
        }]
      }
      
      mockSignUp.attemptEmailAddressVerification.mockRejectedValue(error)

      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      const button = screen.getByRole('button', { name: /verify email/i })
      
      fireEvent.change(input, { target: { value: '123456' } })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText('Verification code has expired. Please request a new one.')).toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully (Requirement 10.2)', async () => {
      const networkError = new Error('Network error: ECONNREFUSED')
      
      mockSignUp.attemptEmailAddressVerification.mockRejectedValue(networkError)

      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      const button = screen.getByRole('button', { name: /verify email/i })
      
      fireEvent.change(input, { target: { value: '123456' } })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText('Verification failed. Please try again.')).toBeInTheDocument()
      })
      
      // Should allow retry
      expect(button).not.toBeDisabled()
    })
  })

  describe('Resend Verification Code', () => {
    it('should resend verification code successfully', async () => {
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})

      render(<EmailVerificationForm />)
      
      const resendButton = screen.getByRole('button', { name: /resend verification code/i })
      fireEvent.click(resendButton)
      
      expect(resendButton).toHaveTextContent('Sending...')
      expect(resendButton).toBeDisabled()
      
      await waitFor(() => {
        expect(mockSignUp.prepareEmailAddressVerification).toHaveBeenCalledWith({
          strategy: 'email_code'
        })
      })
      
      await waitFor(() => {
        expect(screen.getByText('Verification code sent! Check your email.')).toBeInTheDocument()
      })
    })

    it('should handle resend errors', async () => {
      const error = {
        errors: [{
          code: 'rate_limit_exceeded',
          message: 'Too many requests'
        }]
      }
      
      mockSignUp.prepareEmailAddressVerification.mockRejectedValue(error)

      render(<EmailVerificationForm />)
      
      const resendButton = screen.getByRole('button', { name: /resend verification code/i })
      fireEvent.click(resendButton)
      
      await waitFor(() => {
        expect(screen.getByText('Too many requests')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      expect(input).toHaveAttribute('aria-describedby', 'code-description')
      expect(screen.getByText('Enter the 6-digit code from your email')).toHaveAttribute('id', 'code-description')
    })

    it('should support keyboard navigation', () => {
      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      const verifyButton = screen.getByRole('button', { name: /verify email/i })
      const resendButton = screen.getByRole('button', { name: /resend verification code/i })
      
      expect(input).toBeInTheDocument()
      expect(verifyButton).toBeInTheDocument()
      expect(resendButton).toBeInTheDocument()
      
      // All interactive elements should be focusable
      input.focus()
      expect(input).toHaveFocus()
    })

    it('should have proper input attributes for mobile', () => {
      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      expect(input).toHaveAttribute('inputMode', 'numeric')
      expect(input).toHaveAttribute('pattern', '[0-9]*')
      expect(input).toHaveAttribute('maxLength', '6')
    })
  })

  describe('Navigation', () => {
    it('should provide link to use different email', () => {
      render(<EmailVerificationForm />)
      
      const changeEmailButton = screen.getByRole('button', { name: /use a different email address/i })
      fireEvent.click(changeEmailButton)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/sign-up')
    })
  })

  describe('Loading States', () => {
    it('should handle Clerk not loaded state', () => {
      mockUseSignUp.mockReturnValue({
        signUp: mockSignUp,
        isLoaded: false,
        setActive: mockSetActive
      })

      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      const button = screen.getByRole('button', { name: /verify email/i })
      
      fireEvent.change(input, { target: { value: '123456' } })
      fireEvent.click(button)
      
      // Should not attempt verification when not loaded
      expect(mockSignUp.attemptEmailAddressVerification).not.toHaveBeenCalled()
    })

    it('should handle missing signUp object', () => {
      mockUseSignUp.mockReturnValue({
        signUp: null,
        isLoaded: true,
        setActive: mockSetActive
      })

      render(<EmailVerificationForm />)
      
      const input = screen.getByLabelText('Enter verification code')
      const button = screen.getByRole('button', { name: /verify email/i })
      
      fireEvent.change(input, { target: { value: '123456' } })
      fireEvent.click(button)
      
      // Should not attempt verification without signUp object
      expect(mockSignUp.attemptEmailAddressVerification).not.toHaveBeenCalled()
    })
  })
})