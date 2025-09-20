import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSignUp } from '@clerk/nextjs'
import { SignUpForm } from '../sign-up-form'

// Mock all dependencies
vi.mock('@clerk/nextjs', () => ({
  useSignUp: vi.fn()
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}))

vi.mock('@/lib/config/clerk', () => ({
  getPasswordRequirements: () => ({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPasswords: ['password', '12345678', 'qwerty']
  }),
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
  AccessibleFormGroup: ({ children }: any) => <div>{children}</div>,
  SkipLink: ({ children, href }: any) => <a href={href}>{children}</a>,
  LiveRegion: ({ children, priority }: any) => (
    <div role="status" aria-live={priority} data-testid="live-region">
      {children}
    </div>
  )
}))

// Mock regular UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, variant, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={className}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, onBlur, value, ...props }: any) => (
    <input
      onChange={onChange}
      onBlur={onBlur}
      value={value}
      {...props}
    />
  )
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>
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

describe('SignUpForm - Comprehensive Coverage', () => {
  const mockSignUp = {
    create: vi.fn(),
    prepareEmailAddressVerification: vi.fn(),
    authenticateWithRedirect: vi.fn()
  }

  const mockSetActive = vi.fn()
  const mockUseSignUp = useSignUp as any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseSignUp.mockReturnValue({
      signUp: mockSignUp,
      isLoaded: true,
      setActive: mockSetActive
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render all form fields', () => {
      render(<SignUpForm />)

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      render(<SignUpForm className="custom-class" />)
      
      const container = screen.getByRole('main') || screen.getByText('Continue with Google').closest('div')
      expect(container).toHaveClass('custom-class')
    })

    it('should render social authentication buttons', () => {
      render(<SignUpForm />)

      expect(screen.getByText(/continue with google/i)).toBeInTheDocument()
      expect(screen.getByText(/continue with github/i)).toBeInTheDocument()
      expect(screen.getByText(/continue with microsoft/i)).toBeInTheDocument()
    })

    it('should render create account button', () => {
      render(<SignUpForm />)

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('should show invitation notice when invitation token provided', () => {
      render(<SignUpForm invitationToken="test-token" />)

      expect(screen.getByText(/you've been invited to join an organization/i)).toBeInTheDocument()
    })

    it('should render sign in link', () => {
      render(<SignUpForm />)

      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate required first name', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.click(firstNameInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
      })
    })

    it('should validate minimum first name length', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'A')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument()
      })
    })

    it('should validate required last name', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const lastNameInput = screen.getByLabelText(/last name/i)
      await user.click(lastNameInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument()
      })
    })

    it('should validate minimum last name length', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const lastNameInput = screen.getByLabelText(/last name/i)
      await user.type(lastNameInput, 'B')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/last name must be at least 2 characters/i)).toBeInTheDocument()
      })
    })

    it('should validate required email', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.click(emailInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })

    it('should validate required password', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.click(passwordInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should validate required confirm password', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      await user.click(confirmPasswordInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument()
      })
    })

    it('should validate password confirmation match', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      await user.type(passwordInput, 'Password123!')
      await user.type(confirmPasswordInput, 'DifferentPassword123!')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })

      await user.type(emailInput, '@example.com')

      await waitFor(() => {
        expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument()
      })
    })

    it('should validate confirm password when password changes', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      await user.type(confirmPasswordInput, 'OriginalPassword123!')
      await user.type(passwordInput, 'DifferentPassword123!')

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Strength Validation', () => {
    it('should show password strength indicator for weak password', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, 'weak')

      await waitFor(() => {
        expect(screen.getByText(/password must include/i)).toBeInTheDocument()
        expect(screen.getByText(/weak/i)).toBeInTheDocument()
      })
    })

    it('should show all password requirements for weak password', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, 'weak')

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument()
        expect(screen.getByText(/one number/i)).toBeInTheDocument()
        expect(screen.getByText(/one special character/i)).toBeInTheDocument()
      })
    })

    it('should show fair password strength', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, 'Password1')

      await waitFor(() => {
        expect(screen.getByText(/fair/i)).toBeInTheDocument()
      })
    })

    it('should show good password strength', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, 'Password123')

      await waitFor(() => {
        expect(screen.getByText(/good/i)).toBeInTheDocument()
      })
    })

    it('should show strong password and success message', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, 'StrongPassword123!')

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument()
        expect(screen.getByText(/password meets all requirements/i)).toBeInTheDocument()
      })
    })

    it('should reject forbidden passwords', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, 'password123')

      await waitFor(() => {
        expect(screen.getByText(/avoid common passwords/i)).toBeInTheDocument()
      })
    })

    it('should handle multiple forbidden password patterns', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      
      // Test different forbidden passwords
      await user.type(passwordInput, 'qwerty123')
      await waitFor(() => {
        expect(screen.getByText(/avoid common passwords/i)).toBeInTheDocument()
      })

      await user.clear(passwordInput)
      await user.type(passwordInput, '12345678')
      await waitFor(() => {
        expect(screen.getByText(/avoid common passwords/i)).toBeInTheDocument()
      })
    })

    it('should validate password does not meet requirements', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, 'weak')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/password does not meet requirements/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const toggleButton = screen.getAllByLabelText(/show password/i)[0]

      expect(passwordInput).toHaveAttribute('type', 'password')

      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should toggle confirm password visibility', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const toggleButtons = screen.getAllByLabelText(/show password/i)
      const confirmToggleButton = toggleButtons[1]

      expect(confirmPasswordInput).toHaveAttribute('type', 'password')

      await user.click(confirmToggleButton)
      expect(confirmPasswordInput).toHaveAttribute('type', 'text')

      await user.click(confirmToggleButton)
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form Submission', () => {
    const validFormData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!'
    }

    it('should submit form with valid data', async () => {
      const user = userEvent.setup()
      const mockResult = {
        prepareEmailAddressVerification: mockSignUp.prepareEmailAddressVerification
      }
      mockSignUp.create.mockResolvedValue(mockResult)
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})

      render(<SignUpForm />)

      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp.create).toHaveBeenCalledWith({
          emailAddress: validFormData.email,
          password: validFormData.password,
          firstName: validFormData.firstName,
          lastName: validFormData.lastName
        })
      })

      expect(mockSignUp.prepareEmailAddressVerification).toHaveBeenCalledWith({
        strategy: 'email_code'
      })
    })

    it('should include invitation token in sign-up', async () => {
      const user = userEvent.setup()
      const invitationToken = 'test-invitation-token'
      const mockResult = {
        prepareEmailAddressVerification: mockSignUp.prepareEmailAddressVerification
      }
      mockSignUp.create.mockResolvedValue(mockResult)
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})

      render(<SignUpForm invitationToken={invitationToken} />)

      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp.create).toHaveBeenCalledWith({
          emailAddress: validFormData.email,
          password: validFormData.password,
          firstName: validFormData.firstName,
          lastName: validFormData.lastName,
          invitationToken
        })
      })
    })

    it('should redirect to verification page after successful sign-up', async () => {
      const user = userEvent.setup()
      const mockResult = {
        prepareEmailAddressVerification: mockSignUp.prepareEmailAddressVerification
      }
      mockSignUp.create.mockResolvedValue(mockResult)
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})

      render(<SignUpForm redirectUrl="/custom-redirect" />)

      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('/verify-email')
        )
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      let resolveSignUp: (value: any) => void
      const signUpPromise = new Promise(resolve => {
        resolveSignUp = resolve
      })
      mockSignUp.create.mockReturnValue(signUpPromise)

      render(<SignUpForm />)

      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      expect(screen.getByText(/creating account/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      resolveSignUp!({
        prepareEmailAddressVerification: vi.fn().mockResolvedValue({})
      })
    })

    it('should prevent submission when Clerk is not loaded', async () => {
      const user = userEvent.setup()
      mockUseSignUp.mockReturnValue({
        signUp: mockSignUp,
        isLoaded: false,
        setActive: mockSetActive
      })

      render(<SignUpForm />)

      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      expect(mockSignUp.create).not.toHaveBeenCalled()
    })

    it('should prevent submission with validation errors', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      // Submit form with invalid data
      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      expect(mockSignUp.create).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    const validFormData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!'
    }

    it('should handle form_identifier_exists error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'form_identifier_exists', message: 'Email already exists' }]
      }
      mockSignUp.create.mockRejectedValue(clerkError)

      render(<SignUpForm />)

      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument()
      })
    })

    it('should handle form_password_pwned error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'form_password_pwned', message: 'Password compromised' }]
      }
      mockSignUp.create.mockRejectedValue(clerkError)

      render(<SignUpForm />)

      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), 'compromised123')
      await user.type(screen.getByLabelText(/confirm password/i), 'compromised123')

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/this password has been compromised/i)).toBeInTheDocument()
      })
    })

    it('should handle form_password_validation_failed error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'form_password_validation_failed', message: 'Password validation failed' }]
      }
      mockSignUp.create.mockRejectedValue(clerkError)

      render(<SignUpForm />)

      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), 'weak')
      await user.type(screen.getByLabelText(/confirm password/i), 'weak')

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password does not meet security requirements/i)).toBeInTheDocument()
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
      mockSignUp.create.mockRejectedValue(clerkError)

      render(<SignUpForm />)

      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/a detailed error message/i)).toBeInTheDocument()
      })
    })

    it('should handle generic errors', async () => {
      const user = userEvent.setup()
      mockSignUp.create.mockRejectedValue(new Error('Network error'))

      render(<SignUpForm />)

      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
      })
    })
  })

  describe('Social Authentication', () => {
    it('should handle Google authentication', async () => {
      const user = userEvent.setup()
      mockSignUp.authenticateWithRedirect.mockResolvedValue({})

      render(<SignUpForm />)

      const googleButton = screen.getByText(/continue with google/i)
      await user.click(googleButton)

      expect(mockSignUp.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })

    it('should handle GitHub authentication', async () => {
      const user = userEvent.setup()
      mockSignUp.authenticateWithRedirect.mockResolvedValue({})

      render(<SignUpForm />)

      const githubButton = screen.getByText(/continue with github/i)
      await user.click(githubButton)

      expect(mockSignUp.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_github',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })

    it('should handle Microsoft authentication', async () => {
      const user = userEvent.setup()
      mockSignUp.authenticateWithRedirect.mockResolvedValue({})

      render(<SignUpForm />)

      const microsoftButton = screen.getByText(/continue with microsoft/i)
      await user.click(microsoftButton)

      expect(mockSignUp.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_microsoft',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })

    it('should use custom redirect URL for social auth', async () => {
      const user = userEvent.setup()
      const customRedirectUrl = '/custom-redirect'
      mockSignUp.authenticateWithRedirect.mockResolvedValue({})

      render(<SignUpForm redirectUrl={customRedirectUrl} />)

      const googleButton = screen.getByText(/continue with google/i)
      await user.click(googleButton)

      expect(mockSignUp.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl: customRedirectUrl,
        redirectUrlComplete: customRedirectUrl
      })
    })

    it('should handle social authentication errors', async () => {
      const user = userEvent.setup()
      mockSignUp.authenticateWithRedirect.mockRejectedValue(new Error('Social auth failed'))

      render(<SignUpForm />)

      const googleButton = screen.getByText(/continue with google/i)
      await user.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText(/social authentication failed/i)).toBeInTheDocument()
      })
    })

    it('should prevent social auth when not loaded', async () => {
      const user = userEvent.setup()
      mockUseSignUp.mockReturnValue({
        signUp: mockSignUp,
        isLoaded: false,
        setActive: mockSetActive
      })

      render(<SignUpForm />)

      const googleButton = screen.getByText(/continue with google/i)
      await user.click(googleButton)

      expect(mockSignUp.authenticateWithRedirect).not.toHaveBeenCalled()
    })
  })

  describe('Navigation', () => {
    it('should navigate to sign-in page', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const signInLink = screen.getByText(/sign in/i)
      await user.click(signInLink)

      expect(mockPush).toHaveBeenCalledWith('/sign-in')
    })
  })

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      render(<SignUpForm />)

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      await user.tab()

      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid email format/i)
        expect(errorMessage).toHaveAttribute('id', 'email-error')
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error')
      })
    })

    it('should have proper button labels for password visibility', () => {
      render(<SignUpForm />)

      const passwordToggleButtons = screen.getAllByLabelText(/show password/i)
      expect(passwordToggleButtons).toHaveLength(2)
    })

    it('should have CAPTCHA container with proper ARIA attributes', () => {
      render(<SignUpForm />)

      const captchaContainer = screen.getByRole('region', { name: 'Security verification' })
      expect(captchaContainer).toHaveAttribute('id', 'clerk-captcha')
      expect(captchaContainer).toHaveAttribute('aria-describedby', 'captcha-description')
    })
  })

  describe('Mobile Optimizations', () => {
    it('should apply mobile classes when on mobile device', () => {
      vi.mocked(require('@/hooks/use-mobile-optimizations').useMobileOptimizations).mockReturnValue({
        isMobile: true,
        isVirtualKeyboardOpen: false,
        addTouchFeedback: vi.fn(),
        optimizeForMobile: vi.fn(() => () => {}),
        handleOrientationChange: vi.fn(() => () => {})
      })

      render(<SignUpForm />)

      const container = screen.getByText('Continue with Google').closest('div')
      expect(container).toHaveClass('mobile-form')
    })

    it('should apply virtual keyboard classes when keyboard is open', () => {
      vi.mocked(require('@/hooks/use-mobile-optimizations').useMobileOptimizations).mockReturnValue({
        isMobile: true,
        isVirtualKeyboardOpen: true,
        addTouchFeedback: vi.fn(),
        optimizeForMobile: vi.fn(() => () => {}),
        handleOrientationChange: vi.fn(() => () => {})
      })

      render(<SignUpForm />)

      const container = screen.getByText('Continue with Google').closest('div')
      expect(container).toHaveClass('mobile-keyboard-aware')
    })
  })

  describe('Loading States', () => {
    it('should disable submit button when not loaded', () => {
      mockUseSignUp.mockReturnValue({
        signUp: mockSignUp,
        isLoaded: false,
        setActive: mockSetActive
      })

      render(<SignUpForm />)

      expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
    })

    it('should disable all form fields during submission', async () => {
      const user = userEvent.setup()
      let resolveSignUp: (value: any) => void
      const signUpPromise = new Promise(resolve => {
        resolveSignUp = resolve
      })
      mockSignUp.create.mockReturnValue(signUpPromise)

      render(<SignUpForm />)

      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPassword123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPassword123!')

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      expect(screen.getByLabelText(/first name/i)).toBeDisabled()
      expect(screen.getByLabelText(/last name/i)).toBeDisabled()
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText(/^password$/i)).toBeDisabled()
      expect(screen.getByLabelText(/confirm password/i)).toBeDisabled()

      resolveSignUp!({
        prepareEmailAddressVerification: vi.fn().mockResolvedValue({})
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty form submission', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      expect(mockSignUp.create).not.toHaveBeenCalled()
    })

    it('should handle password strength calculation edge cases', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      
      // Test empty password
      await user.type(passwordInput, '')
      expect(screen.queryByText(/password must include/i)).not.toBeInTheDocument()

      // Test password with only lowercase
      await user.type(passwordInput, 'lowercase')
      await waitFor(() => {
        expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument()
      })

      // Test password with only uppercase
      await user.clear(passwordInput)
      await user.type(passwordInput, 'UPPERCASE')
      await waitFor(() => {
        expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument()
      })
    })

    it('should handle password strength color coding', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      
      // Test different strength levels
      await user.type(passwordInput, 'w') // Very weak
      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument()
      })

      await user.clear(passwordInput)
      await user.type(passwordInput, 'Password1') // Fair
      await waitFor(() => {
        expect(screen.getByText(/fair/i)).toBeInTheDocument()
      })

      await user.clear(passwordInput)
      await user.type(passwordInput, 'Password123') // Good
      await waitFor(() => {
        expect(screen.getByText(/good/i)).toBeInTheDocument()
      })

      await user.clear(passwordInput)
      await user.type(passwordInput, 'Password123!') // Strong
      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument()
      })
    })
  })
})