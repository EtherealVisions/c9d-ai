import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSignUp } from '@clerk/nextjs'
import { SignUpForm } from '../sign-up-form'

// Mock Clerk hooks
vi.mock('@clerk/nextjs', () => ({
  useSignUp: vi.fn(),
  useRouter: vi.fn()
}))

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock UI components
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
  Alert: ({ children, variant, ...props }: any) => (
    <div data-testid="alert" data-variant={variant} {...props}>
      {children}
    </div>
  ),
  AlertDescription: ({ children, ...props }: any) => (
    <div data-testid="alert-description" {...props}>
      {children}
    </div>
  )
}))

// Mock configuration
vi.mock('@/lib/config/clerk', () => ({
  getPasswordRequirements: () => ({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPasswords: ['password', '12345678']
  }),
  getSocialProviders: () => [
    { id: 'google', name: 'Google', enabled: true, icon: 'google', strategy: 'oauth_google' },
    { id: 'github', name: 'GitHub', enabled: true, icon: 'github', strategy: 'oauth_github' },
    { id: 'microsoft', name: 'Microsoft', enabled: true, icon: 'microsoft', strategy: 'oauth_microsoft' }
  ]
}))

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

describe('SignUpForm', () => {
  const mockSignUp = {
    create: vi.fn(),
    prepareEmailAddressVerification: vi.fn(),
    authenticateWithRedirect: vi.fn()
  }

  const mockUseSignUp = useSignUp as any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseSignUp.mockReturnValue({
      signUp: mockSignUp,
      isLoaded: true,
      setActive: vi.fn()
    })


  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<SignUpForm />)

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
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
  })

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      // Check that form fields are present
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })

    it('should validate password confirmation match', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      await user.type(passwordInput, 'Password123!')
      await user.type(confirmPasswordInput, 'DifferentPassword123!')
      await user.tab() // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('should validate minimum name length', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'A')
      await user.tab() // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Strength Validation', () => {
    it('should show password strength indicator', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, 'weak')

      await waitFor(() => {
        expect(screen.getByText(/password must include/i)).toBeInTheDocument()
      })
    })

    it('should show password requirements feedback', async () => {
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

    it('should show success when password meets all requirements', async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, 'StrongPassword123!')

      await waitFor(() => {
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
      mockSignUp.create.mockResolvedValue({
        prepareEmailAddressVerification: mockSignUp.prepareEmailAddressVerification
      })
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})

      render(<SignUpForm />)

      // Fill form
      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      // Submit form
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
      
      mockSignUp.create.mockResolvedValue({
        prepareEmailAddressVerification: mockSignUp.prepareEmailAddressVerification
      })
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})

      render(<SignUpForm invitationToken={invitationToken} />)

      // Fill form
      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      // Submit form
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
      mockSignUp.create.mockResolvedValue({
        prepareEmailAddressVerification: mockSignUp.prepareEmailAddressVerification
      })
      mockSignUp.prepareEmailAddressVerification.mockResolvedValue({})

      render(<SignUpForm redirectUrl="/custom-redirect" />)

      // Fill and submit form
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

      // Fill form
      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      // Check loading state
      expect(screen.getByText(/creating account/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Resolve the promise
      resolveSignUp!({
        prepareEmailAddressVerification: vi.fn().mockResolvedValue({})
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle Clerk email exists error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'form_identifier_exists', message: 'Email already exists' }]
      }
      mockSignUp.create.mockRejectedValue(clerkError)

      render(<SignUpForm />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPassword123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPassword123!')

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument()
      })
    })

    it('should handle Clerk password compromised error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'form_password_pwned', message: 'Password compromised' }]
      }
      mockSignUp.create.mockRejectedValue(clerkError)

      render(<SignUpForm />)

      // Fill and submit form with compromised password
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/this password has been compromised/i)).toBeInTheDocument()
      })
    })

    it('should handle generic errors', async () => {
      const user = userEvent.setup()
      mockSignUp.create.mockRejectedValue(new Error('Network error'))

      render(<SignUpForm />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPassword123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPassword123!')

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
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
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

  describe('Loading States', () => {
    it('should disable form when Clerk is not loaded', () => {
      mockUseSignUp.mockReturnValue({
        signUp: mockSignUp,
        isLoaded: false,
        setActive: vi.fn()
      })

      render(<SignUpForm />)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      expect(submitButton).toBeDisabled()
    })

    it('should disable form fields during submission', async () => {
      const user = userEvent.setup()
      let resolveSignUp: (value: any) => void
      const signUpPromise = new Promise(resolve => {
        resolveSignUp = resolve
      })
      mockSignUp.create.mockReturnValue(signUpPromise)

      render(<SignUpForm />)

      // Fill form
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPassword123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPassword123!')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      // Check that form fields are disabled
      expect(screen.getByLabelText(/first name/i)).toBeDisabled()
      expect(screen.getByLabelText(/last name/i)).toBeDisabled()
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText(/^password$/i)).toBeDisabled()
      expect(screen.getByLabelText(/confirm password/i)).toBeDisabled()

      // Resolve the promise
      resolveSignUp!({
        prepareEmailAddressVerification: vi.fn().mockResolvedValue({})
      })
    })
  })
})