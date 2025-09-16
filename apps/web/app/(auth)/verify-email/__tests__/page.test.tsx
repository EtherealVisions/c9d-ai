import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import VerifyEmailPage from '../page'

// Mock the components
vi.mock('@/components/auth', () => ({
  AuthLayout: ({ children, title, subtitle }: any) => (
    <div data-testid="auth-layout">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  )
}))

vi.mock('@/components/auth/email-verification-form', () => ({
  EmailVerificationForm: ({ redirectUrl, email, error }: any) => (
    <div data-testid="email-verification-form">
      <div data-testid="redirect-url">{redirectUrl}</div>
      <div data-testid="email">{email}</div>
      <div data-testid="error">{error}</div>
    </div>
  )
}))

describe('VerifyEmailPage', () => {
  it('should render with default props', () => {
    render(<VerifyEmailPage searchParams={{}} />)
    
    expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
    expect(screen.getByText('Check your email')).toBeInTheDocument()
    expect(screen.getByText('We\'ve sent a verification code to your email address')).toBeInTheDocument()
    expect(screen.getByTestId('email-verification-form')).toBeInTheDocument()
  })

  it('should pass search params to EmailVerificationForm', () => {
    const searchParams = {
      redirect_url: '/dashboard',
      email: 'test@example.com',
      error: 'Verification failed'
    }

    render(<VerifyEmailPage searchParams={searchParams} />)
    
    expect(screen.getByTestId('redirect-url')).toHaveTextContent('/dashboard')
    expect(screen.getByTestId('email')).toHaveTextContent('test@example.com')
    expect(screen.getByTestId('error')).toHaveTextContent('Verification failed')
  })

  it('should handle empty search params', () => {
    render(<VerifyEmailPage searchParams={{}} />)
    
    expect(screen.getByTestId('redirect-url')).toBeEmptyDOMElement()
    expect(screen.getByTestId('email')).toBeEmptyDOMElement()
    expect(screen.getByTestId('error')).toBeEmptyDOMElement()
  })

  it('should handle partial search params', () => {
    const searchParams = {
      redirect_url: '/onboarding'
    }

    render(<VerifyEmailPage searchParams={searchParams} />)
    
    expect(screen.getByTestId('redirect-url')).toHaveTextContent('/onboarding')
    expect(screen.getByTestId('email')).toBeEmptyDOMElement()
    expect(screen.getByTestId('error')).toBeEmptyDOMElement()
  })

  it('should have correct metadata', async () => {
    // Test that the page exports the correct metadata
    const VerifyEmailPageModule = await import('../page')
    
    expect(VerifyEmailPageModule.metadata).toEqual({
      title: 'Verify Email',
      description: 'Verify your email address to complete your C9d.ai account setup.'
    })
  })

  it('should have dynamic export set to force-dynamic', async () => {
    // Test that the page exports the correct dynamic setting
    const VerifyEmailPageModule = await import('../page')
    
    expect(VerifyEmailPageModule.dynamic).toBe('force-dynamic')
  })
})