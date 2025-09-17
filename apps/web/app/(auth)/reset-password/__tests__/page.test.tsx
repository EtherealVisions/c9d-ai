import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ResetPasswordPage from '../page'

// Mock the PasswordResetForm component
vi.mock('@/components/auth/password-reset-form', () => ({
  PasswordResetForm: ({ email, token, error }: any) => (
    <div data-testid="password-reset-form">
      <div data-testid="email">{email}</div>
      <div data-testid="token">{token}</div>
      <div data-testid="error">{error}</div>
    </div>
  )
}))

// Mock AuthLayout
vi.mock('@/components/auth/auth-layout', () => ({
  AuthLayout: ({ children, title, subtitle }: any) => (
    <div data-testid="auth-layout">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  )
}))

describe('ResetPasswordPage', () => {
  it('should render with default props', () => {
    render(<ResetPasswordPage searchParams={{}} />)
    
    expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
    expect(screen.getByText('Reset Password')).toBeInTheDocument()
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument()
    expect(screen.getByTestId('password-reset-form')).toBeInTheDocument()
  })

  it('should pass email from search params', () => {
    render(
      <ResetPasswordPage 
        searchParams={{ email: 'test@example.com' }} 
      />
    )
    
    const emailElement = screen.getByTestId('email')
    expect(emailElement).toHaveTextContent('test@example.com')
  })

  it('should pass token from search params', () => {
    render(
      <ResetPasswordPage 
        searchParams={{ token: 'reset_token_123' }} 
      />
    )
    
    const tokenElement = screen.getByTestId('token')
    expect(tokenElement).toHaveTextContent('reset_token_123')
  })

  it('should pass error from search params', () => {
    render(
      <ResetPasswordPage 
        searchParams={{ error: 'Invalid reset link' }} 
      />
    )
    
    const errorElement = screen.getByTestId('error')
    expect(errorElement).toHaveTextContent('Invalid reset link')
  })

  it('should pass all search params to form', () => {
    render(
      <ResetPasswordPage 
        searchParams={{ 
          email: 'user@example.com',
          token: 'abc123',
          error: 'Token expired'
        }} 
      />
    )
    
    expect(screen.getByTestId('email')).toHaveTextContent('user@example.com')
    expect(screen.getByTestId('token')).toHaveTextContent('abc123')
    expect(screen.getByTestId('error')).toHaveTextContent('Token expired')
  })

  it('should handle empty search params', () => {
    render(<ResetPasswordPage searchParams={{}} />)
    
    const emailElement = screen.getByTestId('email')
    const tokenElement = screen.getByTestId('token')
    const errorElement = screen.getByTestId('error')
    
    expect(emailElement).toBeEmptyDOMElement()
    expect(tokenElement).toBeEmptyDOMElement()
    expect(errorElement).toBeEmptyDOMElement()
  })
})