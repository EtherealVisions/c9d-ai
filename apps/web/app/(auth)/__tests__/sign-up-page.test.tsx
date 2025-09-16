import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SignUpPage from '../sign-up/[[...sign-up]]/page'

// Mock Clerk components
vi.mock('@clerk/nextjs', () => ({
  SignUp: ({ appearance, redirectUrl }: any) => (
    <div data-testid="clerk-sign-up">
      <div data-testid="sign-up-appearance">{JSON.stringify(appearance)}</div>
      <div data-testid="sign-up-redirect-url">{redirectUrl}</div>
    </div>
  )
}))

// Mock AuthLayout
vi.mock('@/components/auth', () => ({
  AuthLayout: ({ children, title, subtitle }: any) => (
    <div data-testid="auth-layout">
      <div data-testid="auth-title">{title}</div>
      <div data-testid="auth-subtitle">{subtitle}</div>
      <div data-testid="auth-children">{children}</div>
    </div>
  )
}))

describe('SignUpPage', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<SignUpPage searchParams={{}} />)
      
      expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
      expect(screen.getByTestId('clerk-sign-up')).toBeInTheDocument()
    })

    it('should render correct title and subtitle', () => {
      render(<SignUpPage searchParams={{}} />)
      
      expect(screen.getByTestId('auth-title')).toHaveTextContent('Join C9d.ai')
      expect(screen.getByTestId('auth-subtitle')).toHaveTextContent('Create your account and start building the future with AI')
    })

    it('should pass redirect URL to Clerk component', () => {
      const redirectUrl = '/onboarding'
      render(<SignUpPage searchParams={{ redirect_url: redirectUrl }} />)
      
      expect(screen.getByTestId('sign-up-redirect-url')).toHaveTextContent(redirectUrl)
    })
  })

  describe('Error Handling', () => {
    it('should display email exists error message', () => {
      render(<SignUpPage searchParams={{ error: 'email_exists' }} />)
      
      expect(screen.getByText('An account with this email already exists. Please sign in instead.')).toBeInTheDocument()
    })

    it('should display weak password error message', () => {
      render(<SignUpPage searchParams={{ error: 'weak_password' }} />)
      
      expect(screen.getByText('Password is too weak. Please choose a stronger password.')).toBeInTheDocument()
    })

    it('should display invalid email error message', () => {
      render(<SignUpPage searchParams={{ error: 'invalid_email' }} />)
      
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument()
    })

    it('should display generic error message for unknown errors', () => {
      render(<SignUpPage searchParams={{ error: 'unknown_error' }} />)
      
      expect(screen.getByText('An error occurred. Please try again.')).toBeInTheDocument()
    })

    it('should not display error message when no error', () => {
      render(<SignUpPage searchParams={{}} />)
      
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })
  })

  describe('Invitation Handling', () => {
    it('should display invitation message when invitation token is present', () => {
      render(<SignUpPage searchParams={{ invitation_token: 'test-token' }} />)
      
      expect(screen.getByText("You've been invited to join an organization. Complete your registration to accept the invitation.")).toBeInTheDocument()
    })

    it('should not display invitation message when no token', () => {
      render(<SignUpPage searchParams={{}} />)
      
      expect(screen.queryByText(/invited/i)).not.toBeInTheDocument()
    })

    it('should style invitation message correctly', () => {
      render(<SignUpPage searchParams={{ invitation_token: 'test-token' }} />)
      
      const invitationContainer = screen.getByText(/invited/).closest('div')
      expect(invitationContainer).toHaveClass('bg-primary/10')
      expect(invitationContainer).toHaveClass('border-primary/20')
    })
  })

  describe('Clerk Integration', () => {
    it('should configure Clerk appearance correctly', () => {
      render(<SignUpPage searchParams={{}} />)
      
      const appearanceElement = screen.getByTestId('sign-up-appearance')
      const appearance = JSON.parse(appearanceElement.textContent || '{}')
      
      expect(appearance.elements).toBeDefined()
      expect(appearance.elements.rootBox).toBe('w-full')
      expect(appearance.elements.card).toBe('shadow-none border-0 bg-transparent')
      expect(appearance.elements.headerTitle).toBe('hidden')
      expect(appearance.elements.headerSubtitle).toBe('hidden')
    })

    it('should handle missing search params gracefully', () => {
      render(<SignUpPage searchParams={{}} />)
      
      expect(screen.getByTestId('sign-up-redirect-url')).toBeEmptyDOMElement()
    })
  })

  describe('Accessibility', () => {
    it('should have proper error message structure', () => {
      render(<SignUpPage searchParams={{ error: 'email_exists' }} />)
      
      const errorContainer = screen.getByText('An account with this email already exists. Please sign in instead.').closest('div')
      expect(errorContainer).toHaveClass('bg-destructive/10')
      expect(errorContainer).toHaveClass('border-destructive/20')
    })

    it('should use semantic HTML for error messages', () => {
      render(<SignUpPage searchParams={{ error: 'weak_password' }} />)
      
      const errorMessage = screen.getByText('Password is too weak. Please choose a stronger password.')
      expect(errorMessage.tagName).toBe('P')
      expect(errorMessage).toHaveClass('text-destructive')
    })

    it('should use semantic HTML for invitation messages', () => {
      render(<SignUpPage searchParams={{ invitation_token: 'test-token' }} />)
      
      const invitationMessage = screen.getByText(/invited/)
      expect(invitationMessage.tagName).toBe('P')
      expect(invitationMessage).toHaveClass('text-primary')
    })
  })

  describe('Layout Integration', () => {
    it('should pass correct props to AuthLayout', () => {
      render(<SignUpPage searchParams={{}} />)
      
      expect(screen.getByTestId('auth-title')).toHaveTextContent('Join C9d.ai')
      expect(screen.getByTestId('auth-subtitle')).toHaveTextContent('Create your account and start building the future with AI')
    })

    it('should render children within AuthLayout', () => {
      render(<SignUpPage searchParams={{}} />)
      
      const authChildren = screen.getByTestId('auth-children')
      expect(authChildren).toContainElement(screen.getByTestId('clerk-sign-up'))
    })
  })

  describe('Combined Features', () => {
    it('should display both error and invitation messages when both are present', () => {
      render(<SignUpPage searchParams={{ 
        error: 'weak_password',
        invitation_token: 'test-token'
      }} />)
      
      expect(screen.getByText('Password is too weak. Please choose a stronger password.')).toBeInTheDocument()
      expect(screen.getByText(/invited/)).toBeInTheDocument()
    })

    it('should handle all search params together', () => {
      render(<SignUpPage searchParams={{ 
        redirect_url: '/dashboard',
        invitation_token: 'test-token',
        error: 'invalid_email'
      }} />)
      
      expect(screen.getByTestId('sign-up-redirect-url')).toHaveTextContent('/dashboard')
      expect(screen.getByText(/invited/)).toBeInTheDocument()
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument()
    })
  })
})