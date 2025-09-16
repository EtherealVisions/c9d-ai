import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSignIn } from '@clerk/nextjs'
import { SignInForm } from '../sign-in-form'

// Mock Clerk hooks
vi.mock('@clerk/nextjs', () => ({
  useSignIn: vi.fn()
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

describe('SignInForm', () => {
  const mockSignIn = {
    create: vi.fn(),
    prepareFirstFactor: vi.fn(),
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<SignInForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument()
    })

    it('should render social authentication buttons', () => {
      render(<SignInForm />)

      expect(screen.getByText(/continue with google/i)).toBeInTheDocument()
      expect(screen.getByText(/continue with github/i)).toBeInTheDocument()
      expect(screen.getByText(/continue with microsoft/i)).toBeInTheDocument()
    })

    it('should render sign in button', () => {
      render(<SignInForm />)

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should render forgot password link', () => {
      render(<SignInForm />)

      expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    })

    it('should show error message when provided', () => {
      render(<SignInForm error="Test error message" />)

      expect(screen.getByText(/test error message/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      render(<SignInForm />)

      // Check that form fields are present and required
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /email/i })).toHaveAttribute('required')
      const passwordInput = document.getElementById('password')
      expect(passwordInput).toHaveAttribute('required')
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const passwordInput = document.querySelector('input#password') as HTMLInputElement
      const toggleButton = screen.getByLabelText(/show password/i)

      expect(passwordInput).toHaveAttribute('type', 'password')

      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form Submission', () => {
    const validFormData = {
      email: 'john.doe@example.com',
      password: 'password123'
    }

    it('should submit form with valid data', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })
      mockSetActive.mockResolvedValue({})

      render(<SignInForm />)

      // Fill form
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      const passwordInput = document.querySelector('input#password') as HTMLInputElement
      await user.type(passwordInput, validFormData.password)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn.create).toHaveBeenCalledWith({
          identifier: validFormData.email,
          password: validFormData.password
        })
      })

      expect(mockSetActive).toHaveBeenCalledWith({
        session: 'session-123'
      })
    })

    it('should redirect to custom URL after successful sign-in', async () => {
      const user = userEvent.setup()
      const customRedirectUrl = '/custom-redirect'
      
      mockSignIn.create.mockResolvedValue({
        status: 'complete',
        createdSessionId: 'session-123'
      })
      mockSetActive.mockResolvedValue({})

      render(<SignInForm redirectUrl={customRedirectUrl} />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      const passwordInput = document.querySelector('input#password') as HTMLInputElement
      await user.type(passwordInput, validFormData.password)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(customRedirectUrl)
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

      // Fill form
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      const passwordInput = document.querySelector('input#password') as HTMLInputElement
      await user.type(passwordInput, validFormData.password)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Check loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Resolve the promise
      resolveSignIn!({
        status: 'complete',
        createdSessionId: 'session-123'
      })
    })

    it('should handle incomplete sign-in (2FA required)', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockResolvedValue({
        status: 'needs_second_factor'
      })

      render(<SignInForm />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      const passwordInput = document.querySelector('input#password') as HTMLInputElement
      await user.type(passwordInput, validFormData.password)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/additional verification required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle Clerk identifier not found error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'form_identifier_not_found', message: 'User not found' }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      render(<SignInForm />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), 'nonexistent@example.com')
      const passwordInput = document.querySelector('input#password') as HTMLInputElement
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/no account found with this email address/i)).toBeInTheDocument()
      })
    })

    it('should handle Clerk incorrect password error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'form_password_incorrect', message: 'Incorrect password' }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      render(<SignInForm />)

      // Fill and submit form with wrong password
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      const passwordInput = document.querySelector('input#password') as HTMLInputElement
      await user.type(passwordInput, 'wrongpassword')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/incorrect password/i)).toBeInTheDocument()
      })
    })

    it('should handle too many requests error', async () => {
      const user = userEvent.setup()
      const clerkError = {
        errors: [{ code: 'too_many_requests', message: 'Too many requests' }]
      }
      mockSignIn.create.mockRejectedValue(clerkError)

      render(<SignInForm />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      const passwordInput = document.querySelector('input#password') as HTMLInputElement
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/too many sign-in attempts/i)).toBeInTheDocument()
      })
    })

    it('should handle generic errors', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockRejectedValue(new Error('Network error'))

      render(<SignInForm />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      const passwordInput = document.querySelector('input#password') as HTMLInputElement
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
      })
    })
  })

  describe('Social Authentication', () => {
    it('should handle Google authentication', async () => {
      const user = userEvent.setup()
      mockSignIn.authenticateWithRedirect.mockResolvedValue({})

      render(<SignInForm />)

      const googleButton = screen.getByText(/continue with google/i)
      await user.click(googleButton)

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

      const githubButton = screen.getByText(/continue with github/i)
      await user.click(githubButton)

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

      const microsoftButton = screen.getByText(/continue with microsoft/i)
      await user.click(microsoftButton)

      expect(mockSignIn.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_microsoft',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard'
      })
    })

    it('should use custom redirect URL for social auth', async () => {
      const user = userEvent.setup()
      const customRedirectUrl = '/custom-redirect'
      mockSignIn.authenticateWithRedirect.mockResolvedValue({})

      render(<SignInForm redirectUrl={customRedirectUrl} />)

      const googleButton = screen.getByText(/continue with google/i)
      await user.click(googleButton)

      expect(mockSignIn.authenticateWithRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl: customRedirectUrl,
        redirectUrlComplete: customRedirectUrl
      })
    })

    it('should handle social authentication errors', async () => {
      const user = userEvent.setup()
      mockSignIn.authenticateWithRedirect.mockRejectedValue(new Error('Social auth failed'))

      render(<SignInForm />)

      const googleButton = screen.getByText(/continue with google/i)
      await user.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText(/social authentication failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Forgot Password', () => {
    it('should handle forgot password flow', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      // Check that forgot password link is present
      const forgotPasswordLink = screen.getByText(/forgot password/i)
      expect(forgotPasswordLink).toBeInTheDocument()

      // Enter email
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com')

      // Click forgot password - should not throw error
      await user.click(forgotPasswordLink)

      // Verify the link is still there (basic functionality test)
      expect(forgotPasswordLink).toBeInTheDocument()
    })

    it('should require email for forgot password', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      // Click forgot password without entering email
      const forgotPasswordLink = screen.getByText(/forgot password/i)
      await user.click(forgotPasswordLink)

      await waitFor(() => {
        expect(screen.getByText(/please enter your email address first/i)).toBeInTheDocument()
      })
    })

    it('should handle forgot password errors', async () => {
      const user = userEvent.setup()
      mockSignIn.create.mockRejectedValue(new Error('Reset failed'))

      render(<SignInForm />)

      // Enter email and click forgot password
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      const forgotPasswordLink = screen.getByText(/forgot password/i)
      await user.click(forgotPasswordLink)

      await waitFor(() => {
        expect(screen.getByText(/failed to send password reset email/i)).toBeInTheDocument()
      })
    })
  })

  describe('Remember Me', () => {
    it('should toggle remember me checkbox', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const rememberMeCheckbox = screen.getByLabelText(/remember me/i)
      expect(rememberMeCheckbox).not.toBeChecked()

      await user.click(rememberMeCheckbox)
      expect(rememberMeCheckbox).toBeChecked()

      await user.click(rememberMeCheckbox)
      expect(rememberMeCheckbox).not.toBeChecked()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SignInForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(document.querySelector('input#password')).toBeInTheDocument()
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument()
    })

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

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
      render(<SignInForm />)

      const passwordToggleButton = screen.getByLabelText(/show password/i)
      expect(passwordToggleButton).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate to sign-up page', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      const signUpLink = screen.getByText(/sign up/i)
      await user.click(signUpLink)

      expect(mockPush).toHaveBeenCalledWith('/sign-up')
    })
  })

  describe('Loading States', () => {
    it('should disable form when Clerk is not loaded', () => {
      mockUseSignIn.mockReturnValue({
        signIn: mockSignIn,
        isLoaded: false,
        setActive: mockSetActive
      })

      render(<SignInForm />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toBeDisabled()
    })

    it('should disable form fields during submission', async () => {
      const user = userEvent.setup()
      let resolveSignIn: (value: any) => void
      const signInPromise = new Promise(resolve => {
        resolveSignIn = resolve
      })
      mockSignIn.create.mockReturnValue(signInPromise)

      render(<SignInForm />)

      // Fill form
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      const passwordInput = document.querySelector('input#password') as HTMLInputElement
      await user.type(passwordInput, 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Check that form fields are disabled
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(screen.getByLabelText(/remember me/i)).toBeDisabled()

      // Resolve the promise
      resolveSignIn!({
        status: 'complete',
        createdSessionId: 'session-123'
      })
    })
  })
})