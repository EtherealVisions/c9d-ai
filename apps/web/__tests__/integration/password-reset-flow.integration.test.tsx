import React from 'react'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClerkProvider } from '@clerk/nextjs'
import { PasswordResetForm } from '@/components/auth/password-reset-form'
import { createTestDatabase, cleanupTestDatabase } from '../setup/test-database'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn()
  })
}))

// Mock Clerk configuration
vi.mock('@/lib/config/clerk', () => ({
  getPasswordRequirements: () => ({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPasswords: ['password', '12345678', 'qwerty']
  })
}))

describe('Password Reset Flow Integration', () => {
  beforeAll(async () => {
    await createTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithClerk = (component: React.ReactElement) => {
    return render(
      <ClerkProvider publishableKey="pk_test_123">
        {component}
      </ClerkProvider>
    )
  }

  describe('Complete Password Reset Flow', () => {
    it('should handle complete password reset workflow', async () => {
      // Mock Clerk sign-in object with all required methods
      const mockSignIn = {
        create: vi.fn(),
        prepareFirstFactor: vi.fn(),
        attemptFirstFactor: vi.fn(),
        resetPassword: vi.fn(),
        supportedFirstFactors: [
          {
            strategy: 'reset_password_email_code',
            emailAddressId: 'email_test_123'
          }
        ]
      }

      // Mock useSignIn hook
      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      // Step 1: Request password reset
      mockSignIn.create.mockResolvedValue({})
      mockSignIn.prepareFirstFactor.mockResolvedValue({})

      const { rerender } = renderWithClerk(<PasswordResetForm />)

      // Enter email and submit
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset email/i })

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
          emailAddressId: 'email_test_123'
        })
      })

      // Should show verification step
      await waitFor(() => {
        expect(screen.getByText(/we've sent a verification code/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
      })

      // Step 2: Verify code
      mockSignIn.attemptFirstFactor.mockResolvedValue({
        status: 'needs_new_password'
      })

      const codeInput = screen.getByLabelText(/verification code/i)
      const verifyButton = screen.getByRole('button', { name: /verify code/i })

      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockSignIn.attemptFirstFactor).toHaveBeenCalledWith({
          strategy: 'reset_password_email_code',
          code: '123456'
        })
      })

      // Should show password reset step
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
      })

      // Step 3: Reset password
      mockSignIn.resetPassword.mockResolvedValue({
        status: 'complete'
      })

      const passwordInput = screen.getByLabelText(/new password/i)
      const confirmInput = screen.getByLabelText(/confirm new password/i)
      const resetButton = screen.getByRole('button', { name: /reset password/i })

      fireEvent.change(passwordInput, { target: { value: 'NewSecurePass123!' } })
      fireEvent.change(confirmInput, { target: { value: 'NewSecurePass123!' } })
      fireEvent.click(resetButton)

      await waitFor(() => {
        expect(mockSignIn.resetPassword).toHaveBeenCalledWith({
          password: 'NewSecurePass123!'
        })
      })

      // Should show success step
      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /continue to sign in/i })).toBeInTheDocument()
      })

      // Step 4: Navigate to sign in
      const continueButton = screen.getByRole('button', { name: /continue to sign in/i })
      fireEvent.click(continueButton)

      expect(mockPush).toHaveBeenCalledWith('/sign-in')
    })

    it('should handle password reset with pre-filled email', async () => {
      const mockSignIn = {
        create: vi.fn(),
        prepareFirstFactor: vi.fn(),
        attemptFirstFactor: vi.fn(),
        resetPassword: vi.fn(),
        supportedFirstFactors: [
          {
            strategy: 'reset_password_email_code',
            emailAddressId: 'email_test_123'
          }
        ]
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockSignIn.create.mockResolvedValue({})
      mockSignIn.prepareFirstFactor.mockResolvedValue({})

      renderWithClerk(<PasswordResetForm email="prefilled@example.com" />)

      // Should start at verification step with pre-filled email
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
      
      // Email should be pre-filled when going back
      const backButton = screen.getByRole('button', { name: /back/i })
      fireEvent.click(backButton)

      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveValue('prefilled@example.com')
    })

    it('should handle password reset with token (direct reset)', async () => {
      const mockSignIn = {
        resetPassword: vi.fn(),
        supportedFirstFactors: []
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockSignIn.resetPassword.mockResolvedValue({
        status: 'complete'
      })

      renderWithClerk(<PasswordResetForm token="reset_token_123" />)

      // Should start directly at password reset step
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()

      const passwordInput = screen.getByLabelText(/new password/i)
      const confirmInput = screen.getByLabelText(/confirm new password/i)
      const resetButton = screen.getByRole('button', { name: /reset password/i })

      fireEvent.change(passwordInput, { target: { value: 'DirectReset123!' } })
      fireEvent.change(confirmInput, { target: { value: 'DirectReset123!' } })
      fireEvent.click(resetButton)

      await waitFor(() => {
        expect(mockSignIn.resetPassword).toHaveBeenCalledWith({
          password: 'DirectReset123!'
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      const mockSignIn = {
        create: vi.fn(),
        prepareFirstFactor: vi.fn(),
        supportedFirstFactors: [
          {
            strategy: 'reset_password_email_code',
            emailAddressId: 'email_test_123'
          }
        ]
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      // Simulate network error
      mockSignIn.create.mockRejectedValue(new Error('Network error'))

      renderWithClerk(<PasswordResetForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
      })
    })

    it('should handle rate limiting errors', async () => {
      const mockSignIn = {
        create: vi.fn(),
        supportedFirstFactors: []
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockSignIn.create.mockRejectedValue({
        errors: [{ code: 'too_many_requests', message: 'Rate limited' }]
      })

      renderWithClerk(<PasswordResetForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/too many reset requests/i)).toBeInTheDocument()
      })
    })

    it('should handle expired verification codes', async () => {
      const mockSignIn = {
        create: vi.fn(),
        prepareFirstFactor: vi.fn(),
        attemptFirstFactor: vi.fn(),
        supportedFirstFactors: [
          {
            strategy: 'reset_password_email_code',
            emailAddressId: 'email_test_123'
          }
        ]
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockSignIn.create.mockResolvedValue({})
      mockSignIn.prepareFirstFactor.mockResolvedValue({})
      mockSignIn.attemptFirstFactor.mockRejectedValue({
        errors: [{ code: 'form_code_expired', message: 'Code expired' }]
      })

      renderWithClerk(<PasswordResetForm email="test@example.com" />)

      const codeInput = screen.getByLabelText(/verification code/i)
      const verifyButton = screen.getByRole('button', { name: /verify code/i })

      fireEvent.change(codeInput, { target: { value: '123456' } })
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(screen.getByText(/verification code has expired/i)).toBeInTheDocument()
      })
    })

    it('should handle compromised passwords', async () => {
      const mockSignIn = {
        resetPassword: vi.fn(),
        supportedFirstFactors: []
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockSignIn.resetPassword.mockRejectedValue({
        errors: [{ code: 'form_password_pwned', message: 'Password compromised' }]
      })

      renderWithClerk(<PasswordResetForm token="reset_token_123" />)

      const passwordInput = screen.getByLabelText(/new password/i)
      const confirmInput = screen.getByLabelText(/confirm new password/i)
      const resetButton = screen.getByRole('button', { name: /reset password/i })

      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmInput, { target: { value: 'password123' } })
      fireEvent.click(resetButton)

      await waitFor(() => {
        expect(screen.getByText(/password has been compromised/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Validation Integration', () => {
    it('should validate password requirements in real-time', async () => {
      const mockSignIn = {
        resetPassword: vi.fn(),
        supportedFirstFactors: []
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      renderWithClerk(<PasswordResetForm token="reset_token_123" />)

      const passwordInput = screen.getByLabelText(/new password/i)
      const resetButton = screen.getByRole('button', { name: /reset password/i })

      // Test various invalid passwords
      const invalidPasswords = [
        { password: 'short', expectedError: /at least 8 characters/i },
        { password: 'nouppercase123!', expectedError: /one uppercase letter/i },
        { password: 'NOLOWERCASE123!', expectedError: /one lowercase letter/i },
        { password: 'NoNumbers!', expectedError: /one number/i },
        { password: 'NoSpecialChars123', expectedError: /one special character/i },
        { password: 'password', expectedError: /password is too common/i }
      ]

      for (const { password, expectedError } of invalidPasswords) {
        fireEvent.change(passwordInput, { target: { value: password } })
        fireEvent.click(resetButton)

        await waitFor(() => {
          expect(screen.getByText(expectedError)).toBeInTheDocument()
        })
      }
    })

    it('should accept valid passwords', async () => {
      const mockSignIn = {
        resetPassword: vi.fn(),
        supportedFirstFactors: []
      }

      vi.doMock('@clerk/nextjs', () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          isLoaded: true
        }),
        ClerkProvider: ({ children }: any) => children
      }))

      mockSignIn.resetPassword.mockResolvedValue({
        status: 'complete'
      })

      renderWithClerk(<PasswordResetForm token="reset_token_123" />)

      const passwordInput = screen.getByLabelText(/new password/i)
      const confirmInput = screen.getByLabelText(/confirm new password/i)
      const resetButton = screen.getByRole('button', { name: /reset password/i })

      const validPassword = 'ValidPassword123!'

      fireEvent.change(passwordInput, { target: { value: validPassword } })
      fireEvent.change(confirmInput, { target: { value: validPassword } })
      fireEvent.click(resetButton)

      await waitFor(() => {
        expect(mockSignIn.resetPassword).toHaveBeenCalledWith({
          password: validPassword
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
      })
    })
  })
})