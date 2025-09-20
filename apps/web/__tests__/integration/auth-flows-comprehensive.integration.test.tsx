import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignInForm } from '@/components/auth/sign-in-form'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { userSyncService } from '@/lib/services/user-sync'
import { authRouterService } from '@/lib/services/auth-router-service'
import { authErrorService } from '@/lib/services/auth-error-service'

// Mock all external dependencies
vi.mock('@clerk/nextjs', () => ({
  useSignIn: vi.fn(),
  useSignUp: vi.fn(),
  useAuth: vi.fn(),
  useUser: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  })
}))

vi.mock('@/lib/services/user-sync')
vi.mock('@/lib/services/auth-router-service')
vi.mock('@/lib/services/auth-error-service')

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
  getSocialProviders: () => [
    { id: 'google', name: 'Google', enabled: true, strategy: 'oauth_google' },
    { id: 'github', name: 'GitHub', enabled: true, strategy: 'oauth_github' }
  ],
  getPasswordRequirements: () => ({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPasswords: ['password', '12345678']
  })
}))

describe('Authentication Flows - Comprehensive Integration Tests', () => {
  let mockSignIn: any
  let mockSignUp: any
  let mockSetActive: any
  let mockRouter: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Clerk hooks
    mockSignIn = {
      create: vi.fn(),
      authenticateWithRedirect: vi.fn()
    }

    mockSignUp = {
      create: vi.fn(),
      prepareEmailAddressVerification: vi.fn(),
      authenticateWithRedirect: vi.fn()
    }

    mockSetActive = vi.fn()
    mockRouter = { push: vi.fn() }

    const { useSignIn, useSignUp } = require('@clerk/nextjs')
    useSignIn.mockReturnValue({
      signIn: mockSignIn,
      isLoaded: true,
      setActive: mockSetActive
    })

    useSignUp.mockReturnValue({
      signUp: mockSignUp,
      isLoaded: true,
      setActive: mockSetActive
    })

    // Mock services
    vi.mocked(userSyncService.syncUser).mockResolvedValue({
      user: {
        id: 'user-123',
        clerkUserId: 'clerk-user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      } as any,
      isNew: false
    })

    vi.mocked(authRouterService.getPostAuthDestination).mockResolvedValue({
      url: '/dashboard',
      reason: 'Default destination'
    })

    vi.mocked(authErrorService.handleSignInError).mockReturnValue({
      authCode: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials'
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Sign-In Flow Integration', () => {
    it('should complete successful email/password sign-in flow', async () => {
      const user = userEvent.setup()

      // Mock successful sign-in
      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })
      mockSetActive.mockResolvedValue({})

      render(<SignInForm />)

      // Fill in credentials
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Verify Clerk integration
      await waitFor(() => {
        expect(mockSignIn.create).toHaveBeenCalledWith({
          identifier: 'test@example.com',
          password: 'password123'
        })
      })

      expect(mockSetActive).toHaveBeenCalledWith({
        session: 'session-123'
      })

      // Verify user sync service integration
      expect(userSyncService.syncUser).toHaveBeenCalled()

      // Verify routing service integration
      expect(authRouterService.getPostAuthDestination).toHaveBeenCalled()

      // Verify navigation
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })

    it('should handle sign-in with 2FA requirement', async () => {
      const user = userEvent.setup()

      // Mock 2FA required response
      mockSignIn.create.mockResolvedValue({
        status: 'needs_second_factor',
        supportedSecondFactors: [{ strategy: 'totp' }]
      })

      render(<SignInForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/additional verification required/i)).toBeInTheDocument()
      })

      // Should not call setActive for incomplete sign-in
      expect(mockSetActive).not.toHaveBeenCalled()
    })

    it('should handle sign-in errors with error service integration', async () => {
      const user = userEvent.setup()

      // Mock Clerk error
      const clerkError = {
        errors: [{ code: 'form_password_incorrect', message: 'Incorrect password' }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      // Mock error service response
      vi.mocked(authErrorService.handleSignInError).mockReturnValue({
        authCode: 'INVALID_CREDENTIALS',
        message: 'Incorrect password',
        context: { email: 'test@example.com' }
      } as any)

      render(<SignInForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(authErrorService.handleSignInError).toHaveBeenCalledWith(
          clerkError,
          'test@example.com',
          expect.any(Object)
        )
      })

      expect(screen.getByText(/incorrect password/i)).toBeInTheDocument()
    })

    it('should integrate with routing service for custom redirects', async () => {
      const user = userEvent.setup()
      const customRedirect = '/projects/my-project'

      // Mock routing service to return custom destination
      vi.mocked(authRouterService.getPostAuthDestination).mockResolvedValue({
        url: customRedirect,
        reason: 'User-requested redirect'
      })

      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })

      render(<SignInForm redirectUrl={customRedirect} />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(authRouterService.getPostAuthDestination).toHaveBeenCalledWith(
          expect.any(Object),
          customRedirect,
          undefined,
          expect.any(Object)
        )
      })

      expect(mockRouter.push).toHaveBeenCalledWith(customRedirect)
    })

    it('should handle social authentication flow integration', async () => {
      const user = userEvent.setup()

      mockSignIn.authenticateWithRedirect.mockResolvedValue({})

      render(<SignInForm />)

      await user.click(screen.getByText(/continue with google/i))

      expect(mockSignIn.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })

    it('should handle remember me functionality with session persistence', async () => {
      const user = userEvent.setup()

      // Mock localStorage
      const mockSetItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: { setItem: mockSetItem, getItem: vi.fn(), removeItem: vi.fn() },
        writable: true
      })

      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })

      render(<SignInForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByLabelText(/remember me/i))
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith('c9d-remember-me', 'true')
      })
    })
  })

  describe('Complete Sign-Up Flow Integration', () => {
    it('should complete successful email/password sign-up flow', async () => {
      const user = userEvent.setup()

      // Mock successful sign-up
      const mockResult = {
        prepareEmailAddressVerification: mockSignUp.prepareEmailAddressVerification
      }
      mockSignUp.create.mockResolvedValue(mockResult)
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})

      render(<SignUpForm />)

      // Fill in all required fields
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPassword123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPassword123!')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create account/i }))

      // Verify Clerk integration
      await waitFor(() => {
        expect(mockSignUp.create).toHaveBeenCalledWith({
          emailAddress: 'john@example.com',
          password: 'StrongPassword123!',
          firstName: 'John',
          lastName: 'Doe'
        })
      })

      expect(mockSignUp.prepareEmailAddressVerification).toHaveBeenCalledWith({
        strategy: 'email_code'
      })

      // Verify navigation to verification page
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('/verify-email')
      )
    })

    it('should handle sign-up with invitation token', async () => {
      const user = userEvent.setup()
      const invitationToken = 'invitation-token-123'

      const mockResult = {
        prepareEmailAddressVerification: mockSignUp.prepareEmailAddressVerification
      }
      mockSignUp.create.mockResolvedValue(mockResult)
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})

      render(<SignUpForm invitationToken={invitationToken} />)

      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPassword123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPassword123!')

      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(mockSignUp.create).toHaveBeenCalledWith({
          emailAddress: 'john@example.com',
          password: 'StrongPassword123!',
          firstName: 'John',
          lastName: 'Doe',
          invitationToken
        })
      })
    })

    it('should handle sign-up errors with error service integration', async () => {
      const user = userEvent.setup()

      // Mock Clerk error
      const clerkError = {
        errors: [{ code: 'form_identifier_exists', message: 'Email already exists' }]
      }
      mockSignUp.create.mockRejectedValue(clerkError)

      // Mock error service response
      vi.mocked(authErrorService.handleSignUpError).mockReturnValue({
        authCode: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists',
        context: { email: 'existing@example.com' }
      } as any)

      render(<SignUpForm />)

      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPassword123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPassword123!')

      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(authErrorService.handleSignUpError).toHaveBeenCalledWith(
          clerkError,
          'existing@example.com',
          expect.any(Object)
        )
      })

      expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument()
    })

    it('should handle social sign-up flow integration', async () => {
      const user = userEvent.setup()

      mockSignUp.authenticateWithRedirect.mockResolvedValue({})

      render(<SignUpForm />)

      await user.click(screen.getByText(/continue with github/i))

      expect(mockSignUp.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_github',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })

    it('should validate password strength in real-time', async () => {
      const user = userEvent.setup()

      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)

      // Test weak password
      await user.type(passwordInput, 'weak')
      expect(screen.getByText(/password must include/i)).toBeInTheDocument()
      expect(screen.getByText(/weak/i)).toBeInTheDocument()

      // Test strong password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'StrongPassword123!')
      
      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument()
        expect(screen.getByText(/password meets all requirements/i)).toBeInTheDocument()
      })
    })

    it('should validate password confirmation matching', async () => {
      const user = userEvent.setup()

      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      await user.type(passwordInput, 'StrongPassword123!')
      await user.type(confirmPasswordInput, 'DifferentPassword123!')
      await user.tab() // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })
  })

  describe('Cross-Flow Integration Tests', () => {
    it('should handle navigation between sign-in and sign-up', async () => {
      const user = userEvent.setup()

      // Test sign-in to sign-up navigation
      const { rerender } = render(<SignInForm />)
      
      await user.click(screen.getByText(/sign up/i))
      expect(mockRouter.push).toHaveBeenCalledWith('/sign-up')

      // Test sign-up to sign-in navigation
      rerender(<SignUpForm />)
      
      await user.click(screen.getByText(/sign in/i))
      expect(mockRouter.push).toHaveBeenCalledWith('/sign-in')
    })

    it('should handle forgot password flow integration', async () => {
      const user = userEvent.setup()

      render(<SignInForm />)

      // Enter email and click forgot password
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByText(/forgot password/i))

      expect(mockRouter.push).toHaveBeenCalledWith('/reset-password?email=test%40example.com')
    })

    it('should handle loading states across components', async () => {
      const user = userEvent.setup()

      // Mock delayed response
      let resolveSignIn: (value: any) => void
      const signInPromise = new Promise(resolve => {
        resolveSignIn = resolve
      })
      mockSignIn.create.mockReturnValue(signInPromise)

      render(<SignInForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Check loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()

      // Resolve the promise
      resolveSignIn!({
        status: 'complete',
        createdSessionId: 'session-123'
      })
    })

    it('should handle accessibility features across flows', async () => {
      const user = userEvent.setup()

      render(<SignInForm />)

      // Test skip link
      expect(screen.getByText('Skip to sign-in form')).toBeInTheDocument()

      // Test live region
      expect(screen.getByTestId('live-region')).toBeInTheDocument()

      // Test ARIA attributes
      const form = screen.getByRole('main')
      expect(form).toHaveAttribute('aria-labelledby', 'sign-in-heading')
    })
  })

  describe('Error Recovery Integration', () => {
    it('should integrate with error service for recovery suggestions', async () => {
      const user = userEvent.setup()

      // Mock error with recovery suggestions
      const mockError = {
        authCode: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials'
      } as any

      vi.mocked(authErrorService.handleSignInError).mockReturnValue(mockError)
      vi.mocked(authErrorService.getRecoverySuggestions).mockReturnValue([
        'Double-check your email and password',
        'Try using the "Forgot Password" option'
      ])

      const clerkError = {
        errors: [{ code: 'form_password_incorrect', message: 'Incorrect password' }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      render(<SignInForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(authErrorService.getRecoverySuggestions).toHaveBeenCalledWith(mockError)
      })
    })

    it('should handle network errors with retry mechanism', async () => {
      const user = userEvent.setup()

      // Mock network error
      const networkError = new Error('Network request failed')
      mockSignIn.create.mockRejectedValue(networkError)

      vi.mocked(authErrorService.handleSignInError).mockReturnValue({
        authCode: 'NETWORK_ERROR',
        message: 'Network request failed'
      } as any)

      render(<SignInForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(authErrorService.handleSignInError).toHaveBeenCalledWith(
          networkError,
          'test@example.com',
          expect.any(Object)
        )
      })
    })
  })

  describe('Service Integration Edge Cases', () => {
    it('should handle user sync service failures gracefully', async () => {
      const user = userEvent.setup()

      // Mock user sync failure
      vi.mocked(userSyncService.syncUser).mockResolvedValue({
        user: {} as any,
        isNew: false,
        error: 'Database connection failed'
      })

      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })

      render(<SignInForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Should still proceed with authentication even if sync fails
      await waitFor(() => {
        expect(mockSetActive).toHaveBeenCalled()
      })
    })

    it('should handle routing service failures with fallback', async () => {
      const user = userEvent.setup()

      // Mock routing service failure
      vi.mocked(authRouterService.getPostAuthDestination).mockRejectedValue(
        new Error('Routing service unavailable')
      )

      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })

      render(<SignInForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Should fallback to default dashboard
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle concurrent authentication attempts', async () => {
      const user = userEvent.setup()

      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })

      render(<SignInForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      // Simulate rapid clicking
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only call create once due to loading state
      await waitFor(() => {
        expect(mockSignIn.create).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle session management across multiple tabs', async () => {
      const user = userEvent.setup()

      // Mock session already exists error
      const sessionError = {
        errors: [{ code: 'session_exists', message: 'Already signed in' }]
      }
      mockSignIn.create.mockRejectedValue(sessionError)

      render(<SignInForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Should redirect to dashboard when session already exists
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Performance and Memory Integration', () => {
    it('should handle large form data efficiently', async () => {
      const user = userEvent.setup()

      const longString = 'a'.repeat(1000)

      render(<SignUpForm />)

      // Test with very long input values
      await user.type(screen.getByLabelText(/first name/i), longString)
      await user.type(screen.getByLabelText(/last name/i), longString)
      await user.type(screen.getByLabelText(/email/i), `${longString}@example.com`)

      // Should handle validation without performance issues
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument()
      })
    })

    it('should clean up resources on component unmount', () => {
      const { unmount } = render(<SignInForm />)

      // Mock cleanup functions
      const cleanupSpy = vi.fn()
      vi.spyOn(React, 'useEffect').mockImplementation((effect, deps) => {
        const cleanup = effect()
        if (typeof cleanup === 'function') {
          cleanupSpy.mockImplementation(cleanup)
        }
      })

      unmount()

      // Verify cleanup was called
      expect(cleanupSpy).toHaveBeenCalled()
    })
  })
})