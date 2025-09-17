import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { TwoFactorForm } from '../two-factor-form'

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useSignIn: vi.fn()
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

describe('TwoFactorForm', () => {
  const mockSignIn = {
    attemptSecondFactor: vi.fn(),
    prepareSecondFactor: vi.fn(),
    supportedSecondFactors: [
      { strategy: 'totp' },
      { strategy: 'phone_code', phoneNumberId: 'phone_123' },
      { strategy: 'backup_code' }
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

  describe('Strategy Selection', () => {
    it('should render TOTP form by default', () => {
      render(<TwoFactorForm />)
      
      expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument()
    })

    it('should show strategy selection when multiple methods available', () => {
      render(<TwoFactorForm />)
      
      expect(screen.getByText(/choose verification method/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /authenticator app/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sms code/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /backup code/i })).toBeInTheDocument()
    })

    it('should switch between strategies', () => {
      render(<TwoFactorForm />)
      
      // Switch to SMS
      fireEvent.click(screen.getByRole('button', { name: /sms code/i }))
      expect(screen.getByLabelText(/sms code/i)).toBeInTheDocument()
      
      // Switch to backup code
      fireEvent.click(screen.getByRole('button', { name: /backup code/i }))
      expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument()
    })

    it('should use provided strategy from props', () => {
      render(<TwoFactorForm strategy="phone_code" />)
      
      expect(screen.getByLabelText(/sms code/i)).toBeInTheDocument()
    })
  })

  describe('TOTP Verification', () => {
    it('should validate TOTP code format', async () => {
      render(<TwoFactorForm strategy="totp" />)
      
      const codeInput = screen.getByLabelText(/authenticator code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      // Test invalid code
      fireEvent.change(codeInput, { target: { value: '123' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/totp code must be 6 digits/i)).toBeInTheDocument()
      })
    })

    it('should handle successful TOTP verification', async () => {
      mockSignIn.attemptSecondFactor.mockResolvedValue({
        status: 'complete'
      })
      
      render(<TwoFactorForm strategy="totp" />)
      
      const codeInput = screen.getByLabelText(/authenticator code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignIn.attemptSecondFactor).toHaveBeenCalledWith({
          strategy: 'totp',
          code: '123456'
        })
      })
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle incorrect TOTP code error', async () => {
      mockSignIn.attemptSecondFactor.mockRejectedValue({
        errors: [{ code: 'form_code_incorrect', message: 'Invalid code' }]
      })
      
      render(<TwoFactorForm strategy="totp" />)
      
      const codeInput = screen.getByLabelText(/authenticator code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      fireEvent.change(codeInput, { target: { value: '000000' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument()
      })
    })
  })

  describe('SMS Verification', () => {
    it('should validate SMS code format', async () => {
      render(<TwoFactorForm strategy="phone_code" />)
      
      const codeInput = screen.getByLabelText(/sms code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      // Test invalid code
      fireEvent.change(codeInput, { target: { value: 'abc' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/sms code must be 6 digits/i)).toBeInTheDocument()
      })
    })

    it('should handle successful SMS verification', async () => {
      mockSignIn.attemptSecondFactor.mockResolvedValue({
        status: 'complete'
      })
      
      render(<TwoFactorForm strategy="phone_code" />)
      
      const codeInput = screen.getByLabelText(/sms code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      fireEvent.change(codeInput, { target: { value: '654321' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignIn.attemptSecondFactor).toHaveBeenCalledWith({
          strategy: 'phone_code',
          code: '654321'
        })
      })
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should allow resending SMS code', async () => {
      mockSignIn.prepareSecondFactor.mockResolvedValue({})
      
      render(<TwoFactorForm strategy="phone_code" />)
      
      const resendButton = screen.getByRole('button', { name: /resend sms/i })
      fireEvent.click(resendButton)
      
      await waitFor(() => {
        expect(mockSignIn.prepareSecondFactor).toHaveBeenCalledWith({
          strategy: 'phone_code',
          phoneNumberId: 'phone_123'
        })
      })
    })
  })

  describe('Backup Code Verification', () => {
    it('should validate backup code format', async () => {
      render(<TwoFactorForm strategy="backup_code" />)
      
      const codeInput = screen.getByLabelText(/backup code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      // Test invalid code
      fireEvent.change(codeInput, { target: { value: '123' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid backup code format/i)).toBeInTheDocument()
      })
    })

    it('should handle successful backup code verification', async () => {
      mockSignIn.attemptSecondFactor.mockResolvedValue({
        status: 'complete'
      })
      
      render(<TwoFactorForm strategy="backup_code" />)
      
      const codeInput = screen.getByLabelText(/backup code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      fireEvent.change(codeInput, { target: { value: 'abcd1234' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignIn.attemptSecondFactor).toHaveBeenCalledWith({
          strategy: 'backup_code',
          code: 'abcd1234'
        })
      })
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle expired code error', async () => {
      mockSignIn.attemptSecondFactor.mockRejectedValue({
        errors: [{ code: 'form_code_expired', message: 'Code expired' }]
      })
      
      render(<TwoFactorForm strategy="totp" />)
      
      const codeInput = screen.getByLabelText(/authenticator code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/verification code has expired/i)).toBeInTheDocument()
      })
    })

    it('should handle rate limiting error', async () => {
      mockSignIn.attemptSecondFactor.mockRejectedValue({
        errors: [{ code: 'too_many_requests', message: 'Rate limited' }]
      })
      
      render(<TwoFactorForm strategy="totp" />)
      
      const codeInput = screen.getByLabelText(/authenticator code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/too many verification attempts/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      mockSignIn.attemptSecondFactor.mockRejectedValue(new Error('Network error'))
      
      render(<TwoFactorForm strategy="totp" />)
      
      const codeInput = screen.getByLabelText(/authenticator code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate back to sign-in', () => {
      render(<TwoFactorForm />)
      
      const backButton = screen.getByRole('button', { name: /back to sign in/i })
      fireEvent.click(backButton)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/sign-in')
    })
  })

  describe('Loading States', () => {
    it('should show loading state during verification', async () => {
      mockSignIn.attemptSecondFactor.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<TwoFactorForm strategy="totp" />)
      
      const codeInput = screen.getByLabelText(/authenticator code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
      
      expect(screen.getByRole('button', { name: /verifying.../i })).toBeInTheDocument()
    })

    it('should disable form during loading', async () => {
      mockSignIn.attemptSecondFactor.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<TwoFactorForm strategy="totp" />)
      
      const codeInput = screen.getByLabelText(/authenticator code/i)
      const submitButton = screen.getByRole('button', { name: /verify/i })
      
      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(submitButton)
      
      expect(codeInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<TwoFactorForm strategy="totp" />)
      
      const codeInput = screen.getByLabelText(/authenticator code/i)
      expect(codeInput).toHaveAttribute('type', 'text')
      expect(codeInput).toHaveAttribute('required')
      expect(codeInput).toHaveAttribute('maxLength', '6')
    })

    it('should have proper ARIA attributes for form fields', () => {
      render(<TwoFactorForm strategy="totp" />)
      
      const codeInput = screen.getByLabelText(/authenticator code/i)
      
      expect(codeInput).toHaveAttribute('id', 'code')
      expect(codeInput).toHaveAttribute('required')
      expect(codeInput).toHaveAttribute('maxLength', '6')
      expect(codeInput).toHaveAttribute('type', 'text')
    })
  })

  describe('Strategy Availability', () => {
    it('should handle single strategy availability', () => {
      const singleStrategySignIn = {
        ...mockSignIn,
        supportedSecondFactors: [{ strategy: 'totp' }]
      }
      
      ;(useSignIn as any).mockReturnValue({
        signIn: singleStrategySignIn,
        isLoaded: true
      })
      
      render(<TwoFactorForm />)
      
      // Should not show strategy selection
      expect(screen.queryByText(/choose verification method/i)).not.toBeInTheDocument()
      expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument()
    })

    it('should handle no available strategies', () => {
      const noStrategySignIn = {
        ...mockSignIn,
        supportedSecondFactors: []
      }
      
      ;(useSignIn as any).mockReturnValue({
        signIn: noStrategySignIn,
        isLoaded: true
      })
      
      render(<TwoFactorForm />)
      
      // Should still render form but with default strategy
      expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument()
    })
  })
})