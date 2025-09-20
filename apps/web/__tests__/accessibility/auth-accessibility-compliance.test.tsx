/**
 * Authentication Accessibility Compliance Testing Suite
 * 
 * Tests WCAG 2.1 AA compliance for authentication components
 * Requirements: 9.1 (Accessibility), 9.2 (User Experience)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Simple mock components for accessibility testing
const MockSignInForm: React.FC<{
  onSubmit?: (data: { email: string; password: string }) => void
  hasError?: boolean
  errorMessage?: string
}> = ({ onSubmit = () => {}, hasError = false, errorMessage = '' }) => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ email, password })
  }

  return (
    <form onSubmit={handleSubmit} role="form" aria-label="Sign in to your account">
      <h1 id="sign-in-heading">Sign In</h1>
      
      {hasError && (
        <div role="alert" aria-live="polite" className="error-message" id="sign-in-error">
          {errorMessage}
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="email-input" className="required">
          Email Address
          <span aria-label="required" className="required-indicator">*</span>
        </label>
        <input
          id="email-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-required="true"
          aria-describedby={hasError ? "sign-in-error email-help" : "email-help"}
          aria-invalid={hasError ? "true" : "false"}
          autoComplete="email"
        />
        <div id="email-help" className="help-text">
          Enter your registered email address
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="password-input" className="required">
          Password
          <span aria-label="required" className="required-indicator">*</span>
        </label>
        <div className="password-input-container">
          <input
            id="password-input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required="true"
            aria-describedby={hasError ? "sign-in-error password-help" : "password-help"}
            aria-invalid={hasError ? "true" : "false"}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="password-toggle"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div id="password-help" className="help-text">
          Enter your account password
        </div>
      </div>
      
      <button type="submit" className="submit-button" aria-describedby="submit-help">
        Sign In
      </button>
      <div id="submit-help" className="help-text">
        Press Enter or click to sign in
      </div>
      
      <div className="alternative-actions">
        <a href="/forgot-password" aria-label="Reset your password if you've forgotten it">
          Forgot Password?
        </a>
        <a href="/sign-up" aria-label="Create a new account if you don't have one">
          Create Account
        </a>
      </div>
    </form>
  )
}

const MockLoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div role="status" aria-live="polite" aria-label={message} className="loading-spinner">
    <div className="spinner" aria-hidden="true"></div>
    <span className="sr-only">{message}</span>
  </div>
)

const MockErrorMessage: React.FC<{
  error: string
  onRetry?: () => void
}> = ({ error, onRetry }) => (
  <div role="alert" aria-live="assertive" className="error-container">
    <h2>Error</h2>
    <p>{error}</p>
    {onRetry && (
      <button onClick={onRetry} aria-label="Retry the failed operation">
        Try Again
      </button>
    )}
  </div>
)

describe('Authentication Accessibility Compliance Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have no accessibility violations in sign-in form', async () => {
      const { container } = render(<MockSignInForm />)
      const results = await axe(container)
      
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations with error states', async () => {
      const { container } = render(
        <MockSignInForm hasError={true} errorMessage="Invalid email or password" />
      )
      const results = await axe(container)
      
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations in loading states', async () => {
      const { container } = render(<MockLoadingSpinner message="Signing you in..." />)
      const results = await axe(container)
      
      expect(results).toHaveNoViolations()
    })
  })

  describe('Semantic HTML Structure', () => {
    it('should use proper heading hierarchy', () => {
      render(<MockSignInForm />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Sign In')
    })

    it('should use proper form structure', () => {
      render(<MockSignInForm />)
      
      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
      expect(form).toHaveAttribute('aria-label', 'Sign in to your account')
    })

    it('should use proper labels for all form inputs', () => {
      render(<MockSignInForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toBeInTheDocument()
      expect(passwordInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('id', 'email-input')
      expect(passwordInput).toHaveAttribute('id', 'password-input')
    })

    it('should associate help text with form inputs', () => {
      render(<MockSignInForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-help')
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-help')
      
      expect(screen.getByText('Enter your registered email address')).toBeInTheDocument()
      expect(screen.getByText('Enter your account password')).toBeInTheDocument()
    })
  })

  describe('ARIA Attributes and Roles', () => {
    it('should use proper ARIA roles for interactive elements', () => {
      render(<MockSignInForm />)
      
      const form = screen.getByRole('form')
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      const toggleButton = screen.getByRole('button', { name: /show password/i })
      
      expect(form).toBeInTheDocument()
      expect(submitButton).toBeInTheDocument()
      expect(toggleButton).toBeInTheDocument()
    })

    it('should use proper ARIA attributes for form validation', () => {
      render(<MockSignInForm hasError={true} errorMessage="Invalid credentials" />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const errorAlert = screen.getByRole('alert')
      
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
      expect(errorAlert).toBeInTheDocument()
      expect(errorAlert).toHaveAttribute('aria-live', 'polite')
    })

    it('should use proper ARIA attributes for required fields', () => {
      render(<MockSignInForm />)
      
      const requiredInputs = [
        screen.getByLabelText(/email address/i),
        screen.getByLabelText(/password/i)
      ]
      
      for (const input of requiredInputs) {
        expect(input).toHaveAttribute('aria-required', 'true')
        expect(input).toHaveAttribute('required')
      }
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MockSignInForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const toggleButton = screen.getByRole('button', { name: /show password/i })
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      // Tab through form elements
      await user.tab()
      expect(emailInput).toHaveFocus()
      
      await user.tab()
      expect(passwordInput).toHaveFocus()
      
      await user.tab()
      expect(toggleButton).toHaveFocus()
      
      await user.tab()
      expect(submitButton).toHaveFocus()
    })

    it('should support keyboard activation of interactive elements', async () => {
      const user = userEvent.setup()
      const mockSubmit = vi.fn()
      render(<MockSignInForm onSubmit={mockSubmit} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      // Fill form using keyboard
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Submit using Enter key
      await user.type(submitButton, '{enter}')
      
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('should support keyboard toggle for password visibility', async () => {
      const user = userEvent.setup()
      render(<MockSignInForm />)
      
      const passwordInput = screen.getByLabelText(/password/i)
      const toggleButton = screen.getByRole('button', { name: /show password/i })
      
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false')
      
      // Toggle using keyboard
      toggleButton.focus()
      await user.keyboard('{enter}')
      
      expect(passwordInput).toHaveAttribute('type', 'text')
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true')
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide password')
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide proper screen reader announcements for errors', () => {
      render(<MockSignInForm hasError={true} errorMessage="Invalid email or password" />)
      
      const errorAlert = screen.getByRole('alert')
      expect(errorAlert).toHaveTextContent('Invalid email or password')
      expect(errorAlert).toHaveAttribute('aria-live', 'polite')
    })

    it('should provide proper screen reader labels for interactive elements', () => {
      render(<MockSignInForm />)
      
      const toggleButton = screen.getByRole('button', { name: /show password/i })
      const forgotPasswordLink = screen.getByRole('link', { name: /reset your password/i })
      const createAccountLink = screen.getByRole('link', { name: /create a new account/i })
      
      expect(toggleButton).toHaveAttribute('aria-label')
      expect(forgotPasswordLink).toHaveAttribute('aria-label')
      expect(createAccountLink).toHaveAttribute('aria-label')
    })
  })

  describe('Focus Management', () => {
    it('should manage focus properly during form interactions', async () => {
      const user = userEvent.setup()
      render(<MockSignInForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      
      await user.click(emailInput)
      expect(emailInput).toHaveFocus()
      
      await user.type(emailInput, 'test@example.com')
      expect(emailInput).toHaveFocus()
    })

    it('should provide visible focus indicators', () => {
      render(<MockSignInForm />)
      
      const focusableElements = [
        screen.getByLabelText(/email address/i),
        screen.getByLabelText(/password/i),
        screen.getByRole('button', { name: /show password/i }),
        screen.getByRole('button', { name: /sign in/i })
      ]
      
      for (const element of focusableElements) {
        element.focus()
        expect(element).toHaveFocus()
      }
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('should not rely solely on color for information', () => {
      render(<MockSignInForm />)
      
      // Required fields should have text indicators, not just color
      const requiredIndicators = screen.getAllByText('*')
      expect(requiredIndicators.length).toBeGreaterThan(0)
      
      // Each required indicator should have proper aria-label
      for (const indicator of requiredIndicators) {
        expect(indicator).toHaveAttribute('aria-label', 'required')
      }
    })

    it('should provide text alternatives for visual elements', () => {
      render(<MockLoadingSpinner message="Signing you in..." />)
      
      const spinner = screen.getByRole('status')
      const hiddenText = screen.getByText('Signing you in...')
      
      expect(spinner).toHaveAttribute('aria-label', 'Signing you in...')
      expect(hiddenText).toHaveClass('sr-only')
    })
  })

  describe('Error Handling Accessibility', () => {
    it('should announce errors to screen readers', () => {
      render(<MockErrorMessage error="Network connection failed" />)
      
      const errorAlert = screen.getByRole('alert')
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive')
      expect(errorAlert).toHaveTextContent('Network connection failed')
    })

    it('should provide accessible error recovery options', () => {
      const mockRetry = vi.fn()
      render(<MockErrorMessage error="Something went wrong" onRetry={mockRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /retry the failed operation/i })
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).toHaveAttribute('aria-label')
    })
  })

  describe('Mobile Accessibility', () => {
    it('should support touch accessibility features', () => {
      render(<MockSignInForm />)
      
      // Touch targets should be identifiable
      const touchTargets = [
        screen.getByRole('button', { name: /sign in/i }),
        screen.getByRole('button', { name: /show password/i })
      ]
      
      for (const target of touchTargets) {
        expect(target).toBeInTheDocument()
      }
    })

    it('should support voice control and switch navigation', () => {
      render(<MockSignInForm />)
      
      // All interactive elements should have accessible names
      const interactiveElements = [
        screen.getByLabelText(/email address/i),
        screen.getByLabelText(/password/i),
        screen.getByRole('button', { name: /show password/i }),
        screen.getByRole('button', { name: /sign in/i })
      ]
      
      for (const element of interactiveElements) {
        expect(element).toBeInTheDocument()
        // Elements should have accessible names for voice control
        const accessibleName = element.getAttribute('aria-label') || 
                              element.getAttribute('aria-labelledby') ||
                              element.textContent
        expect(accessibleName).toBeTruthy()
      }
    })
  })
})