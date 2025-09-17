import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PasswordResetForm } from './components/auth/password-reset-form'

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useSignIn: vi.fn(() => ({
    signIn: {
      create: vi.fn(),
      prepareFirstFactor: vi.fn(),
      attemptFirstFactor: vi.fn(),
      resetPassword: vi.fn(),
      supportedFirstFactors: []
    },
    isLoaded: true
  }))
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn()
  }))
}))

// Mock Clerk config
vi.mock('@/lib/config/clerk', () => ({
  getPasswordRequirements: () => ({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPasswords: ['password', '12345678']
  })
}))

describe('Debug Password Reset Form', () => {
  it('should show validation error for empty email', async () => {
    render(<PasswordResetForm />)
    
    const submitButton = screen.getByRole('button', { name: /send reset email/i })
    
    // Submit without entering email
    fireEvent.click(submitButton)
    
    // Debug: log the DOM to see what's rendered
    screen.debug()
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})