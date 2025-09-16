import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SignInPage from '../sign-in/[[...sign-in]]/page'

// Mock auth components
vi.mock('@/components/auth', () => ({
  AuthLayout: ({ children, title, subtitle }: any) => (
    <div data-testid="auth-layout">
      <div data-testid="auth-title">{title}</div>
      <div data-testid="auth-subtitle">{subtitle}</div>
      <div data-testid="auth-children">{children}</div>
    </div>
  ),
  SignInForm: ({ redirectUrl, error }: any) => (
    <div data-testid="sign-in-form" data-redirect-url={redirectUrl || ''} data-error={error || ''}>
      <div data-testid="sign-in-form-content">Sign In Form Mock</div>
      {redirectUrl && <div data-testid="sign-in-redirect-url">{redirectUrl}</div>}
      {error && <div data-testid="sign-in-error">{error}</div>}
    </div>
  )
}))

describe('SignInPage', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<SignInPage searchParams={{}} />)
      
      expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
      expect(screen.getByTestId('sign-in-form')).toBeInTheDocument()
    })

    it('should render correct title and subtitle', () => {
      render(<SignInPage searchParams={{}} />)
      
      expect(screen.getByTestId('auth-title')).toHaveTextContent('Welcome back')
      expect(screen.getByTestId('auth-subtitle')).toHaveTextContent('Sign in to your account to continue building with AI')
    })

    it('should pass redirect URL to SignInForm component', () => {
      const redirectUrl = '/dashboard'
      render(<SignInPage searchParams={{ redirect_url: redirectUrl }} />)
      
      expect(screen.getByTestId('sign-in-redirect-url')).toHaveTextContent(redirectUrl)
    })
  })

  describe('Error Handling', () => {
    it('should pass verification error to SignInForm', () => {
      render(<SignInPage searchParams={{ error: 'verification' }} />)
      
      expect(screen.getByTestId('sign-in-error')).toHaveTextContent('verification')
    })

    it('should pass credentials error to SignInForm', () => {
      render(<SignInPage searchParams={{ error: 'credentials' }} />)
      
      expect(screen.getByTestId('sign-in-error')).toHaveTextContent('credentials')
    })

    it('should pass blocked account error to SignInForm', () => {
      render(<SignInPage searchParams={{ error: 'blocked' }} />)
      
      expect(screen.getByTestId('sign-in-error')).toHaveTextContent('blocked')
    })

    it('should pass generic error to SignInForm for unknown errors', () => {
      render(<SignInPage searchParams={{ error: 'unknown_error' }} />)
      
      expect(screen.getByTestId('sign-in-error')).toHaveTextContent('unknown_error')
    })

    it('should not pass error when no error', () => {
      render(<SignInPage searchParams={{}} />)
      
      expect(screen.queryByTestId('sign-in-error')).not.toBeInTheDocument()
    })
  })

  describe('Props Passing', () => {
    it('should pass redirect URL prop correctly', () => {
      const redirectUrl = '/custom-redirect'
      render(<SignInPage searchParams={{ redirect_url: redirectUrl }} />)
      
      const signInForm = screen.getByTestId('sign-in-form')
      expect(signInForm).toHaveAttribute('data-redirect-url', redirectUrl)
    })

    it('should pass error prop correctly', () => {
      const error = 'test-error'
      render(<SignInPage searchParams={{ error }} />)
      
      const signInForm = screen.getByTestId('sign-in-form')
      expect(signInForm).toHaveAttribute('data-error', error)
    })

    it('should handle missing search params gracefully', () => {
      render(<SignInPage searchParams={{}} />)
      
      const signInForm = screen.getByTestId('sign-in-form')
      expect(signInForm).toHaveAttribute('data-redirect-url', '')
      expect(signInForm).toHaveAttribute('data-error', '')
    })
  })

  describe('Component Integration', () => {
    it('should render SignInForm within AuthLayout', () => {
      render(<SignInPage searchParams={{}} />)
      
      const authChildren = screen.getByTestId('auth-children')
      expect(authChildren).toContainElement(screen.getByTestId('sign-in-form'))
    })

    it('should pass correct props to AuthLayout', () => {
      render(<SignInPage searchParams={{}} />)
      
      expect(screen.getByTestId('auth-title')).toHaveTextContent('Welcome back')
      expect(screen.getByTestId('auth-subtitle')).toHaveTextContent('Sign in to your account to continue building with AI')
    })

    it('should render SignInForm content', () => {
      render(<SignInPage searchParams={{}} />)
      
      expect(screen.getByTestId('sign-in-form-content')).toHaveTextContent('Sign In Form Mock')
    })
  })

  describe('Search Params Handling', () => {
    it('should handle multiple search params', () => {
      const redirectUrl = '/dashboard'
      const error = 'verification'
      render(<SignInPage searchParams={{ redirect_url: redirectUrl, error }} />)
      
      expect(screen.getByTestId('sign-in-redirect-url')).toHaveTextContent(redirectUrl)
      expect(screen.getByTestId('sign-in-error')).toHaveTextContent(error)
    })

    it('should handle empty search params object', () => {
      render(<SignInPage searchParams={{}} />)
      
      expect(screen.getByTestId('sign-in-form')).toBeInTheDocument()
      expect(screen.queryByTestId('sign-in-redirect-url')).not.toBeInTheDocument()
      expect(screen.queryByTestId('sign-in-error')).not.toBeInTheDocument()
    })

    it('should handle undefined search params', () => {
      render(<SignInPage searchParams={{ redirect_url: undefined, error: undefined }} />)
      
      expect(screen.getByTestId('sign-in-form')).toBeInTheDocument()
      expect(screen.queryByTestId('sign-in-redirect-url')).not.toBeInTheDocument()
      expect(screen.queryByTestId('sign-in-error')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility and SEO', () => {
    it('should have proper page structure', () => {
      render(<SignInPage searchParams={{}} />)
      
      // Verify the page has proper layout structure
      expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
      expect(screen.getByTestId('auth-title')).toBeInTheDocument()
      expect(screen.getByTestId('auth-subtitle')).toBeInTheDocument()
    })

    it('should render form within layout', () => {
      render(<SignInPage searchParams={{}} />)
      
      const layout = screen.getByTestId('auth-layout')
      const form = screen.getByTestId('sign-in-form')
      expect(layout).toContainElement(form)
    })
  })
})