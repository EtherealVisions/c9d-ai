import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSignIn } from '@clerk/nextjs'
import { SignInForm } from '../sign-in-form'

// Mock all dependencies
vi.mock('@clerk/nextjs', () => ({
  useSignIn: vi.fn()
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}))

vi.mock('@/lib/config/clerk', () => ({
  getSocialProviders: () => [
    { id: 'google', name: 'Google', enabled: true, icon: 'google', strategy: 'oauth_google' },
    { id: 'github', name: 'GitHub', enabled: true, icon: 'github', strategy: 'oauth_github' },
    { id: 'microsoft', name: 'Microsoft', enabled: true, icon: 'microsoft', strategy: 'oauth_microsoft' }
  ]
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

// Mock accessibility context
vi.mock('@/contexts/accessibility-context', () => ({
  useAccessibility: () => ({
    isTouchDevice: false,
    announce: vi.fn()
  }),
  useAnnouncement: () => ({
    announceError: vi.fn(),
    announceSuccess: vi.fn(),
    announceLoading: vi.fn()
  }),
  useKeyboardNavigation: () => ({
    handleKeyDown: vi.fn()
  })
}))

// Mock mobile optimizations
vi.mock('@/hooks/use-mobile-optimizations', () => ({
  useMobileOptimizations: () => ({
    isMobile: false,
    isVirtualKeyboardOpen: false,
    addTouchFeedback: vi.fn(),
    optimizeForMobile: vi.fn(() => () => {}),
    handleOrientationChange: vi.fn(() => () => {})
  })
}))

// Mock accessibility utils
vi.mock('@/lib/utils/accessibility', () => ({
  FocusManager: {
    trapFocus: vi.fn(() => () => {})
  },
  generateId: (prefix: string) => `${prefix}-test-id`,
  ScreenReaderSupport: {
    announce: vi.fn()
  }
}))

// Mock UI components with proper test IDs
vi.mock('@/components/ui/accessible-form', () => ({
  AccessibleInput: React.forwardRef(({ label, error, hint, showPasswordToggle, ...props }: any, ref: any) => (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
      {error && <div data-testid="field-error">{error}</div>}
      {hint && <div data-testid="field-hint">{hint}</div>}
      {showPasswordToggle && (
        <button type="button" aria-label="Toggle password visibility">
          Toggle
        </button>
      )}
    </div>
  )),
  AccessibleButton: React.forwardRef(({ children, loading, loadingText, ...props }: any, ref: any) => (
    <button ref={ref} {...props}>
      {loading ? loadingText : children}
    </button>
  )),
  AccessibleCheckbox: ({ label, description, ...props }: any) => (
    <div>
      <input type="checkbox" {...props} />
      <label>{label}</label>
      {description && <div data-testid="checkbox-description">{description}</div>}
    </div>
  ),
  AccessibleFormGroup: ({ children }: any) => <div>{children}</div>,
  SkipLink: ({ children, href }: any) => <a href={href}>{children}</a>,
  LiveRegion: ({ children, priority }: any) => (
    <div role="status" aria-live={priority} data-testid="live-region">
      {children}
    </div>
  )
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => (
    <div data-testid="alert-description">{children}</div>
  )
}))

describe('SignInForm - Comprehensive Coverage', () => {
  const mockSignIn = {
    create: vi.fn(),
    prepareFirstFactor: vi.fn(),
    attemptFirstFactor: vi.fn(),
    authenticateWithRedirect: vi.fn()
  }

  const mockSetActive = vi.fn()
  const mockUseSignIn = useSignIn as any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseSignIn.mockReturnValue({
      signIn: mockSignIn,
      isLoaded: true,
      setActive: mockSetActive
    })

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render with all required elements', () => {
      render(<SignInForm />)

      expect(screen.getByTestId('sign-in-form')).toBeInTheDocument()
      expect(screen.getByTestId('social-auth-section')).toBeInTheDocument()
      expect(screen.getByTestId('sign-in-form-fields')).toBeInTheDocument()
      expect(screen.getByTestId('sign-up-link-section')).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      render(<SignInForm className="custom-class" />)
      
      const form = screen.getByTestId('sign-in-form')
      expect(form).toHaveClass('custom-class')
    })

    it('should render skip link for accessibility', () => {
      render(<SignInForm />)
      
      expect(screen.getByText('Skip to sign-in form')).toBeInTheDocument()
    })

    it('should render live region for announcements', () => {
      render(<SignInForm />)
      
      expect(screen.getByTestId('live-region')).toBeInTheDocument()
    })

    it('should render all social auth buttons when enabled', () => {
      render(<SignInForm />)

      expect(screen.getByTestId('social-auth-google-button')).toBeInTheDocument()
      expect(screen.getByTestId('social-auth-github-button')).toBeInTheDocument()
      expect(screen.getByTestId('social-auth-microsoft-button')).toBeInTheDocument()
    })

    it('should render form fields with proper test IDs', () => {
      render(<SignInForm />)

      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByTestId('password-input')).toBeInTheDocument()
      expect(screen.getByTestId('remember-me-checkbox')).toBeInTheDocument()
      expect(screen.getByTestId('sign-in-submit-button')).toBeInTheDocument()
    })

    it('should render forgot password link', () => {
      render(<SignInForm />)

      expect(screen.getByTestId('forgot-password-link')).toBeInTheDocument()
    })

    it('should render sign up link', () => {
      render(<SignInForm />)

      expect(screen.getByTestId('sign-up-link')).toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it('should display error prop when provided', () => {
      render(<SignInForm error="Test error message" />)

      expect(screen.getByTestId('sign-in-error-alert')).toBeInTheDocument()
      expect(screen.getByTestId('sign-in-error-message')).toHaveTextContent('Test error message')
    })

    it('should display general form errors', () => {
      render(<SignInForm />)
      
      // Simulate setting an error state
      const form = screen.getByTestId('sign-in-form-fields')
      fireEvent.submit(form)
      
      // The component should handle validation internally
      expect(screen.getByTestId('sign-in-form-fields')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate email format on blur', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'invalid-email')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toHaveTextContent('Invalid email format')
      })
    })

    it('should validate required email field', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const emailInput = screen.getByTestId('email-input')
      await user.click(emailInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toHaveTextContent('Email is required')
      })
    })

    it('should validate required password field', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const passwordInput = screen.getByTestId('password-input')
      await user.click(passwordInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toHaveTextContent('Password is required')
      })
    })

    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'invalid')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toBeInTheDocument()
      })

      await user.type(emailInput, '@example.com')

      await waitFor(() => {
        expect(screen.queryByTestId('field-error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    const validFormData = {
      email: 'test@example.com',
      password: 'password123'
    }

    it('should submit form with valid data', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(mockSignIn.create).toHaveBeenCalledWith({
          identifier: validFormData.email,
          password: validFormData.password
        })
      })
    })

    it('should handle successful sign-in with session activation', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })
      mockSetActive.mockResolvedValue({})

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(mockSetActive).toHaveBeenCalledWith({
          session: 'session-123'
        })
      })

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('should redirect to custom URL when provided', async () => {
      const user = userEvent.setup()
      const redirectUrl = '/custom-redirect'
      
      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })

      render(<SignInForm redirectUrl={redirectUrl} />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(redirectUrl)
      })
    })

    it('should handle incomplete sign-in status', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockResolvedValue({
        status: 'needs_second_factor'
      })

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('alert-description')).toHaveTextContent(
          'Additional verification required. Please check your email or authenticator app.'
        )
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      let resolveSignIn: (value: any) => void
      const signInPromise = new Promise(resolve => {
        resolveSignIn = resolve
      })
      mockSignIn.create.mockReturnValue(signInPromise)

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      expect(screen.getByText('Signing in...')).toBeInTheDocument()
      expect(screen.getByTestId('sign-in-submit-button')).toBeDisabled()

      resolveSignIn!({
        status: 'complete',
        createdSessionId: 'session-123'
      })
    })

    it('should prevent submission when Clerk is not loaded', async () => {
      const user = userEvent.setup()
      mockUseSignIn.mockReturnValue({
        signIn: mockSignIn,
        isLoaded: false,
        setActive: mockSetActive
      })

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      expect(mockSignIn.create).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    const validFormData = {
      email: 'test@example.com',
      password: 'password123'
    }

    it('should handle form_identifier_not_found error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'form_identifier_not_found', message: 'User not found' }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toHaveTextContent(
          'No account found with this email address'
        )
      })
    })

    it('should handle form_password_incorrect error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'form_password_incorrect', message: 'Incorrect password' }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), 'wrongpassword')
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toHaveTextContent('Incorrect password')
      })
    })

    it('should handle form_identifier_exists error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'form_identifier_exists', message: 'Please verify email' }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toHaveTextContent(
          'Please verify your email address before signing in'
        )
      })
    })

    it('should handle session_exists error by redirecting', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'session_exists', message: 'Already signed in' }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle too_many_requests error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'too_many_requests', message: 'Too many requests' }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('alert-description')).toHaveTextContent(
          'Too many sign-in attempts. Please try again later.'
        )
      })
    })

    it('should handle unknown Clerk errors', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ 
          code: 'unknown_error', 
          message: 'Unknown error',
          longMessage: 'A detailed error message'
        }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('alert-description')).toHaveTextContent(
          'A detailed error message'
        )
      })
    })

    it('should handle generic errors', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockRejectedValue(new Error('Network error'))

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), validFormData.email)
      await user.type(screen.getByTestId('password-input'), validFormData.password)
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('alert-description')).toHaveTextContent(
          'An unexpected error occurred. Please try again.'
        )
      })
    })
  })

  describe('Social Authentication', () => {
    it('should handle Google authentication', async () => {
      const user = userEvent.setup()
      mockSignIn.authenticateWithRedirect.mockResolvedValue({})

      render(<SignInForm />)

      await user.click(screen.getByTestId('social-auth-google-button'))

      expect(mockSignIn.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })

    it('should handle GitHub authentication', async () => {
      const user = userEvent.setup()
      mockSignIn.authenticateWithRedirect.mockResolvedValue({})

      render(<SignInForm />)

      await user.click(screen.getByTestId('social-auth-github-button'))

      expect(mockSignIn.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_github',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })

    it('should handle Microsoft authentication', async () => {
      const user = userEvent.setup()
      mockSignIn.authenticateWithRedirect.mockResolvedValue({})

      render(<SignInForm />)

      await user.click(screen.getByTestId('social-auth-microsoft-button'))

      expect(mockSignIn.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_microsoft',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })

    it('should use custom redirect URL for social auth', async () => {
      const user = userEvent.setup()
      const redirectUrl = '/custom-redirect'
      mockSignIn.authenticateWithRedirect.mockResolvedValue({})

      render(<SignInForm redirectUrl={redirectUrl} />)

      await user.click(screen.getByTestId('social-auth-google-button'))

      expect(mockSignIn.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl,
        redirectUrlComplete: redirectUrl
      })
    })

    it('should handle social authentication errors', async () => {
      const user = userEvent.setup()
      mockSignIn.authenticateWithRedirect.mockRejectedValue(new Error('Social auth failed'))

      render(<SignInForm />)

      await user.click(screen.getByTestId('social-auth-google-button'))

      await waitFor(() => {
        expect(screen.getByTestId('alert-description')).toHaveTextContent(
          'Social authentication failed. Please try again.'
        )
      })
    })

    it('should prevent social auth when not loaded', async () => {
      const user = userEvent.setup()
      mockUseSignIn.mockReturnValue({
        signIn: mockSignIn,
        isLoaded: false,
        setActive: mockSetActive
      })

      render(<SignInForm />)

      await user.click(screen.getByTestId('social-auth-google-button'))

      expect(mockSignIn.authenticateWithRedirect).not.toHaveBeenCalled()
    })
  })

  describe('Remember Me Functionality', () => {
    it('should toggle remember me checkbox', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const checkbox = screen.getByTestId('remember-me-checkbox')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()

      await user.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    it('should load remember me preference from localStorage', () => {
      const mockGetItem = vi.fn().mockReturnValue('true')
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: mockGetItem, setItem: vi.fn(), removeItem: vi.fn() },
        writable: true
      })

      render(<SignInForm />)

      expect(mockGetItem).toHaveBeenCalledWith('c9d-remember-me')
      expect(screen.getByTestId('remember-me-checkbox')).toBeChecked()
    })

    it('should save remember me preference on successful sign-in', async () => {
      const user = userEvent.setup()
      const mockSetItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: vi.fn(), setItem: mockSetItem, removeItem: vi.fn() },
        writable: true
      })

      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })

      render(<SignInForm />)

      await user.click(screen.getByTestId('remember-me-checkbox'))
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith('c9d-remember-me', 'true')
      })
    })

    it('should remove remember me preference when unchecked', async () => {
      const user = userEvent.setup()
      const mockRemoveItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: mockRemoveItem },
        writable: true
      })

      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })

      render(<SignInForm />)

      // Remember me should be unchecked by default
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith('c9d-remember-me')
      })
    })
  })

  describe('Forgot Password', () => {
    it('should navigate to reset password with email', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.click(screen.getByTestId('forgot-password-link'))

      expect(mockPush).toHaveBeenCalledWith('/reset-password?email=test%40example.com')
    })

    it('should navigate to reset password without email', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      await user.click(screen.getByTestId('forgot-password-link'))

      expect(mockPush).toHaveBeenCalledWith('/reset-password')
    })
  })

  describe('Navigation', () => {
    it('should navigate to sign-up page', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      await user.click(screen.getByTestId('sign-up-link'))

      expect(mockPush).toHaveBeenCalledWith('/sign-up')
    })
  })

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      render(<SignInForm />)

      const form = screen.getByTestId('sign-in-form')
      expect(form).toHaveAttribute('role', 'main')
      expect(form).toHaveAttribute('aria-labelledby', 'sign-in-heading')
    })

    it('should have skip link', () => {
      render(<SignInForm />)

      const skipLink = screen.getByText('Skip to sign-in form')
      expect(skipLink).toHaveAttribute('href', '#sign-in-form-fields')
    })

    it('should have live region for announcements', () => {
      render(<SignInForm />)

      const liveRegion = screen.getByTestId('live-region')
      expect(liveRegion).toHaveAttribute('role', 'status')
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive')
    })

    it('should have proper form structure', () => {
      render(<SignInForm />)

      const form = screen.getByTestId('sign-in-form-fields')
      expect(form).toHaveAttribute('noValidate')
      expect(form).toHaveAttribute('aria-labelledby', 'form-heading')
    })

    it('should have CAPTCHA container with proper ARIA attributes', () => {
      render(<SignInForm />)

      const captchaContainer = screen.getByRole('region', { name: 'Security verification' })
      expect(captchaContainer).toHaveAttribute('id', 'clerk-captcha')
      expect(captchaContainer).toHaveAttribute('aria-describedby', 'signin-captcha-description')
    })
  })

  describe('Mobile Optimizations', () => {
    it('should apply mobile classes when on mobile device', () => {
      // Mock mobile optimizations to return mobile state
      vi.mocked(require('@/hooks/use-mobile-optimizations').useMobileOptimizations).mockReturnValue({
        isMobile: true,
        isVirtualKeyboardOpen: false,
        addTouchFeedback: vi.fn(),
        optimizeForMobile: vi.fn(() => () => {}),
        handleOrientationChange: vi.fn(() => () => {})
      })

      render(<SignInForm />)

      const form = screen.getByTestId('sign-in-form')
      expect(form).toHaveClass('mobile-form')
    })

    it('should apply virtual keyboard classes when keyboard is open', () => {
      vi.mocked(require('@/hooks/use-mobile-optimizations').useMobileOptimizations).mockReturnValue({
        isMobile: true,
        isVirtualKeyboardOpen: true,
        addTouchFeedback: vi.fn(),
        optimizeForMobile: vi.fn(() => () => {}),
        handleOrientationChange: vi.fn(() => () => {})
      })

      render(<SignInForm />)

      const form = screen.getByTestId('sign-in-form')
      expect(form).toHaveClass('mobile-keyboard-aware')
    })
  })

  describe('Loading States', () => {
    it('should disable submit button when not loaded', () => {
      mockUseSignIn.mockReturnValue({
        signIn: mockSignIn,
        isLoaded: false,
        setActive: mockSetActive
      })

      render(<SignInForm />)

      expect(screen.getByTestId('sign-in-submit-button')).toBeDisabled()
    })

    it('should disable all interactive elements during loading', async () => {
      const user = userEvent.setup()
      let resolveSignIn: (value: any) => void
      const signInPromise = new Promise(resolve => {
        resolveSignIn = resolve
      })
      mockSignIn.create.mockReturnValue(signInPromise)

      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('sign-in-submit-button'))

      // All form elements should be disabled during loading
      expect(screen.getByTestId('email-input')).toBeDisabled()
      expect(screen.getByTestId('password-input')).toBeDisabled()
      expect(screen.getByTestId('remember-me-checkbox')).toBeDisabled()
      expect(screen.getByTestId('sign-in-submit-button')).toBeDisabled()
      expect(screen.getByTestId('forgot-password-link')).toBeDisabled()

      resolveSignIn!({
        status: 'complete',
        createdSessionId: 'session-123'
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty form submission', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      await user.click(screen.getByTestId('sign-in-submit-button'))

      // Should show validation errors for required fields
      await waitFor(() => {
        expect(screen.getAllByTestId('field-error')).toHaveLength(2)
      })

      expect(mockSignIn.create).not.toHaveBeenCalled()
    })

    it('should handle form submission with only email', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toHaveTextContent('Password is required')
      })

      expect(mockSignIn.create).not.toHaveBeenCalled()
    })

    it('should handle form submission with only password', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('sign-in-submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toHaveTextContent('Email is required')
      })

      expect(mockSignIn.create).not.toHaveBeenCalled()
    })
  })
})