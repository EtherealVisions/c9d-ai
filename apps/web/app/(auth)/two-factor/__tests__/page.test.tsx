import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TwoFactorPage from '../page'

// Mock the TwoFactorForm component
vi.mock('@/components/auth/two-factor-form', () => ({
  TwoFactorForm: ({ strategy, error }: any) => (
    <div data-testid="two-factor-form">
      <div data-testid="strategy">{strategy}</div>
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

describe('TwoFactorPage', () => {
  it('should render with default props', () => {
    render(<TwoFactorPage searchParams={{}} />)
    
    expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
    expect(screen.getByText(/enter your verification code/i)).toBeInTheDocument()
    expect(screen.getByTestId('two-factor-form')).toBeInTheDocument()
  })

  it('should pass strategy from search params', () => {
    render(
      <TwoFactorPage 
        searchParams={{ strategy: 'sms' }} 
      />
    )
    
    const strategyElement = screen.getByTestId('strategy')
    expect(strategyElement).toHaveTextContent('sms')
  })

  it('should pass error from search params', () => {
    render(
      <TwoFactorPage 
        searchParams={{ error: 'Invalid verification code' }} 
      />
    )
    
    const errorElement = screen.getByTestId('error')
    expect(errorElement).toHaveTextContent('Invalid verification code')
  })

  it('should pass both strategy and error from search params', () => {
    render(
      <TwoFactorPage 
        searchParams={{ 
          strategy: 'totp',
          error: 'Code expired'
        }} 
      />
    )
    
    expect(screen.getByTestId('strategy')).toHaveTextContent('totp')
    expect(screen.getByTestId('error')).toHaveTextContent('Code expired')
  })

  it('should handle empty search params', () => {
    render(<TwoFactorPage searchParams={{}} />)
    
    const strategyElement = screen.getByTestId('strategy')
    const errorElement = screen.getByTestId('error')
    
    expect(strategyElement).toBeEmptyDOMElement()
    expect(errorElement).toBeEmptyDOMElement()
  })
})