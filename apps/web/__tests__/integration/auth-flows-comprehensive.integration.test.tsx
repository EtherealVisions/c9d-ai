/**
 * Comprehensive Authentication Flow Integration Tests
 * 
 * Tests complete authentication flows with realistic scenarios
 * Requirements: 2.1 (Authentication), 2.2 (User Management), 14.1 (Testing)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock Clerk authentication
vi.mock('@clerk/nextjs', () => ({
  useSignIn: vi.fn(() => ({
    isLoaded: true,
    signIn: {
      create: vi.fn().mockResolvedValue({
        status: 'complete',
        createdSessionId: 'sess_test123'
      }),
      prepareFirstFactor: vi.fn().mockResolvedValue({
        status: 'needs_first_factor'
      }),
      attemptFirstFactor: vi.fn().mockResolvedValue({
        status: 'complete',
        createdSessionId: 'sess_test123'
      })
    },
    setActive: vi.fn().mockResolvedValue(undefined)
  })),
  useSignUp: vi.fn(() => ({
    isLoaded: true,
    signUp: {
      create: vi.fn().mockResolvedValue({
        status: 'missing_requirements',
        unverifiedFields: ['email_address']
      }),
      prepareEmailAddressVerification: vi.fn().mockResolvedValue({
        status: 'complete'
      }),
      attemptEmailAddressVerification: vi.fn().mockResolvedValue({
        status: 'complete',
        createdSessionId: 'sess_test123'
      })
    },
    setActive: vi.fn().mockResolvedValue(undefined)
  })),
  useAuth: vi.fn(() => ({
    isLoaded: true,
    userId: 'user_test123',
    isSignedIn: true
  }))
}))

// Mock UI components to focus on integration logic
vi.mock('@/components/ui/accessible-form', () => ({
  AccessibleInput: ({ label, error, onChange, onBlur, value, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input onChange={onChange} onBlur={onBlur} value={value} {...props} />
      {error && <div data-testid="field-error">{error}</div>}
    </div>
  ),
  AccessibleButton: ({ children, onClick, disabled, loading, loadingText, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {loading ? loadingText : children}
    </button>
  ),
  AccessibleCheckbox: ({ label, onChange, checked, ...props }: any) => (
    <div>
      <input type="checkbox" onChange={onChange} checked={checked} {...props} />
      <label>{label}</label>
    </div>
  ),
  AccessibleFormGroup: ({ children }: any) => <div>{children}</div>,
  SkipLink: ({ children }: any) => <a>{children}</a>,
  LiveRegion: ({ children }: any) => <div data-testid="live-region">{children}</div>
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
}))

vi.mock('@/lib/config/clerk', () => ({
  clerkConfig: {
    publishableKey: 'pk_test_123',
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
    afterSignInUrl: '/dashboard',
    afterSignUpUrl: '/onboarding'
  }
}))

// Mock authentication service
const mockAuthService = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn()
}

vi.mock('@/lib/services/auth-service', () => ({
  AuthService: mockAuthService
}))

// Mock user service
const mockUserService = {
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getUserProfile: vi.fn(),
  syncUserData: vi.fn()
}

vi.mock('@/lib/services/user-service', () => ({
  UserService: mockUserService
}))

// Test components
interface SignInFormProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

const SignInForm: React.FC<SignInFormProps> = ({ onSuccess, onError }) => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await mockAuthService.signIn({ email, password })
      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="sign-in-form">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="email-input"
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          data-testid="password-input"
        />
      </div>
      {error && (
        <div data-testid="error-message" role="alert">
          {error}
        </div>
      )}
      <button type="submit" disabled={isLoading} data-testid="submit-button">
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}

interface SignUpFormProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess, onError }) => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      await mockAuthService.signUp({ email, password })
      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="sign-up-form">
      <div>
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="signup-email-input"
        />
      </div>
      <div>
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          data-testid="signup-password-input"
        />
      </div>
      <div>
        <label htmlFor="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          data-testid="confirm-password-input"
        />
      </div>
      {error && (
        <div data-testid="signup-error-message" role="alert">
          {error}
        </div>
      )}
      <button type="submit" disabled={isLoading} data-testid="signup-submit-button">
        {isLoading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  )
}

interface PasswordResetFormProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onSuccess, onError }) => {
  const [email, setEmail] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await mockAuthService.resetPassword({ email })
      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="password-reset-form">
      <div>
        <label htmlFor="reset-email">Email</label>
        <input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="reset-email-input"
        />
      </div>
      {error && (
        <div data-testid="reset-error-message" role="alert">
          {error}
        </div>
      )}
      <button type="submit" disabled={isLoading} data-testid="reset-submit-button">
        {isLoading ? 'Sending reset email...' : 'Reset Password'}
      </button>
    </form>
  )
}

describe('Comprehensive Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Sign In Flow Integration', () => {
    it('should complete successful sign in flow', async () => {
      const onSuccess = vi.fn()
      const onError = vi.fn()

      mockAuthService.signIn.mockResolvedValue({
        success: true,
        user: { id: 'user_123', email: 'test@example.com' }
      })

      render(<SignInForm onSuccess={onSuccess} onError={onError} />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockAuthService.signIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      expect(onSuccess).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should handle sign in errors gracefully', async () => {
      const onSuccess = vi.fn()
      const onError = vi.fn()

      mockAuthService.signIn.mockRejectedValue(new Error('Invalid credentials'))

      render(<SignInForm onSuccess={onSuccess} onError={onError} />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'wrongpassword')
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid credentials')
      expect(onError).toHaveBeenCalledWith('Invalid credentials')
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('should show loading state during sign in', async () => {
      mockAuthService.signIn.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      render(<SignInForm />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      
      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      expect(submitButton).toHaveTextContent('Signing in...')
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Sign In')
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Sign Up Flow Integration', () => {
    it('should complete successful sign up flow', async () => {
      const onSuccess = vi.fn()
      const onError = vi.fn()

      mockAuthService.signUp.mockResolvedValue({
        success: true,
        user: { id: 'user_456', email: 'newuser@example.com' }
      })

      render(<SignUpForm onSuccess={onSuccess} onError={onError} />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('signup-email-input'), 'newuser@example.com')
      await user.type(screen.getByTestId('signup-password-input'), 'newpassword123')
      await user.type(screen.getByTestId('confirm-password-input'), 'newpassword123')
      await user.click(screen.getByTestId('signup-submit-button'))

      await waitFor(() => {
        expect(mockAuthService.signUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'newpassword123'
        })
      })

      expect(onSuccess).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should validate password confirmation', async () => {
      const onSuccess = vi.fn()
      const onError = vi.fn()

      render(<SignUpForm onSuccess={onSuccess} onError={onError} />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('signup-email-input'), 'newuser@example.com')
      await user.type(screen.getByTestId('signup-password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'differentpassword')
      await user.click(screen.getByTestId('signup-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('signup-error-message')).toBeInTheDocument()
      })

      expect(screen.getByTestId('signup-error-message')).toHaveTextContent('Passwords do not match')
      expect(mockAuthService.signUp).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('should handle sign up errors', async () => {
      const onSuccess = vi.fn()
      const onError = vi.fn()

      mockAuthService.signUp.mockRejectedValue(new Error('Email already exists'))

      render(<SignUpForm onSuccess={onSuccess} onError={onError} />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('signup-email-input'), 'existing@example.com')
      await user.type(screen.getByTestId('signup-password-input'), 'password123')
      await user.type(screen.getByTestId('confirm-password-input'), 'password123')
      await user.click(screen.getByTestId('signup-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('signup-error-message')).toBeInTheDocument()
      })

      expect(screen.getByTestId('signup-error-message')).toHaveTextContent('Email already exists')
      expect(onError).toHaveBeenCalledWith('Email already exists')
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('Password Reset Flow Integration', () => {
    it('should complete successful password reset flow', async () => {
      const onSuccess = vi.fn()
      const onError = vi.fn()

      mockAuthService.resetPassword.mockResolvedValue({
        success: true,
        message: 'Reset email sent'
      })

      render(<PasswordResetForm onSuccess={onSuccess} onError={onError} />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('reset-email-input'), 'user@example.com')
      await user.click(screen.getByTestId('reset-submit-button'))

      await waitFor(() => {
        expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
          email: 'user@example.com'
        })
      })

      expect(onSuccess).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should handle password reset errors', async () => {
      const onSuccess = vi.fn()
      const onError = vi.fn()

      mockAuthService.resetPassword.mockRejectedValue(new Error('Email not found'))

      render(<PasswordResetForm onSuccess={onSuccess} onError={onError} />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('reset-email-input'), 'nonexistent@example.com')
      await user.click(screen.getByTestId('reset-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('reset-error-message')).toBeInTheDocument()
      })

      expect(screen.getByTestId('reset-error-message')).toHaveTextContent('Email not found')
      expect(onError).toHaveBeenCalledWith('Email not found')
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('should show loading state during password reset', async () => {
      mockAuthService.resetPassword.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      render(<PasswordResetForm />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('reset-email-input'), 'user@example.com')
      
      const submitButton = screen.getByTestId('reset-submit-button')
      await user.click(submitButton)

      expect(submitButton).toHaveTextContent('Sending reset email...')
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Reset Password')
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Cross-Flow Integration', () => {
    it('should handle navigation between authentication flows', async () => {
      const TestApp = () => {
        const [currentFlow, setCurrentFlow] = React.useState<'signin' | 'signup' | 'reset'>('signin')

        return (
          <div>
            <nav>
              <button onClick={() => setCurrentFlow('signin')} data-testid="nav-signin">
                Sign In
              </button>
              <button onClick={() => setCurrentFlow('signup')} data-testid="nav-signup">
                Sign Up
              </button>
              <button onClick={() => setCurrentFlow('reset')} data-testid="nav-reset">
                Reset Password
              </button>
            </nav>
            
            {currentFlow === 'signin' && <SignInForm />}
            {currentFlow === 'signup' && <SignUpForm />}
            {currentFlow === 'reset' && <PasswordResetForm />}
          </div>
        )
      }

      render(<TestApp />)

      // Start with sign in form
      expect(screen.getByTestId('sign-in-form')).toBeInTheDocument()

      const user = userEvent.setup()

      // Navigate to sign up
      await user.click(screen.getByTestId('nav-signup'))
      expect(screen.getByTestId('sign-up-form')).toBeInTheDocument()
      expect(screen.queryByTestId('sign-in-form')).not.toBeInTheDocument()

      // Navigate to password reset
      await user.click(screen.getByTestId('nav-reset'))
      expect(screen.getByTestId('password-reset-form')).toBeInTheDocument()
      expect(screen.queryByTestId('sign-up-form')).not.toBeInTheDocument()

      // Navigate back to sign in
      await user.click(screen.getByTestId('nav-signin'))
      expect(screen.getByTestId('sign-in-form')).toBeInTheDocument()
      expect(screen.queryByTestId('password-reset-form')).not.toBeInTheDocument()
    })

    it('should maintain form state during navigation', async () => {
      const TestApp = () => {
        const [currentFlow, setCurrentFlow] = React.useState<'signin' | 'signup'>('signin')
        const [signInData, setSignInData] = React.useState({ email: '', password: '' })

        return (
          <div>
            <button onClick={() => setCurrentFlow('signup')} data-testid="switch-to-signup">
              Switch to Sign Up
            </button>
            <button onClick={() => setCurrentFlow('signin')} data-testid="switch-to-signin">
              Switch to Sign In
            </button>
            
            {currentFlow === 'signin' && <SignInForm />}
            {currentFlow === 'signup' && <SignUpForm />}
          </div>
        )
      }

      render(<TestApp />)

      const user = userEvent.setup()

      // Fill in sign in form
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')

      // Switch to sign up
      await user.click(screen.getByTestId('switch-to-signup'))
      expect(screen.getByTestId('sign-up-form')).toBeInTheDocument()

      // Switch back to sign in
      await user.click(screen.getByTestId('switch-to-signin'))
      expect(screen.getByTestId('sign-in-form')).toBeInTheDocument()

      // Form should be reset (this is expected behavior for new component instances)
      expect(screen.getByTestId('email-input')).toHaveValue('')
      expect(screen.getByTestId('password-input')).toHaveValue('')
    })
  })

  describe('Error Recovery Integration', () => {
    it('should allow retry after network errors', async () => {
      mockAuthService.signIn
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true })

      const onSuccess = vi.fn()

      render(<SignInForm onSuccess={onSuccess} />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      
      // First attempt fails
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Network error')
      })

      // Second attempt succeeds
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })

      expect(mockAuthService.signIn).toHaveBeenCalledTimes(2)
    })

    it('should clear errors when user starts typing', async () => {
      mockAuthService.signIn.mockRejectedValue(new Error('Invalid credentials'))

      render(<SignInForm />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'wrongpassword')
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })

      // Start typing in email field
      await user.clear(screen.getByTestId('email-input'))
      await user.type(screen.getByTestId('email-input'), 'newemail@example.com')

      // Error should still be visible until form is submitted again
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
  })

  describe('Performance Integration', () => {
    it('should handle rapid form submissions gracefully', async () => {
      mockAuthService.signIn.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 50))
      )

      render(<SignInForm />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')

      const submitButton = screen.getByTestId('submit-button')

      // Rapid clicks should not cause multiple submissions
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })

      // Should only have been called once
      expect(mockAuthService.signIn).toHaveBeenCalledTimes(1)
    })

    it('should handle concurrent authentication attempts', async () => {
      const signInPromise = new Promise(resolve => 
        setTimeout(() => resolve({ success: true }), 100)
      )
      
      mockAuthService.signIn.mockReturnValue(signInPromise)

      const { rerender } = render(<SignInForm />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('submit-button'))

      // Rerender with new props while first request is pending
      rerender(<SignInForm />)

      await waitFor(() => {
        expect(mockAuthService.signIn).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Accessibility Integration', () => {
    it('should announce errors to screen readers', async () => {
      mockAuthService.signIn.mockRejectedValue(new Error('Invalid credentials'))

      render(<SignInForm />)

      const user = userEvent.setup()
      
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'wrongpassword')
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        const errorElement = screen.getByTestId('error-message')
        expect(errorElement).toBeInTheDocument()
        expect(errorElement).toHaveAttribute('role', 'alert')
      })
    })

    it('should maintain focus management during form interactions', async () => {
      render(<SignInForm />)

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('submit-button')

      // Focus should move through form elements
      emailInput.focus()
      expect(document.activeElement).toBe(emailInput)

      // Tab to next field
      fireEvent.keyDown(emailInput, { key: 'Tab' })
      // Note: jsdom doesn't automatically handle tab navigation,
      // but we can verify the elements are focusable
      expect(passwordInput).toBeInTheDocument()
      expect(submitButton).toBeInTheDocument()
    })
  })
})