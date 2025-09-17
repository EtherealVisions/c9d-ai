import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthError from '../error'

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

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button 
      data-testid={variant === 'outline' ? 'outline-button' : 'primary-button'}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  )
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  AlertCircle: ({ className }: any) => <div data-testid="alert-circle-icon" className={className} />,
  RefreshCw: ({ className }: any) => <div data-testid="refresh-icon" className={className} />
}))

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: ''
  },
  writable: true
})

describe('AuthError', () => {
  const mockError = new Error('Test error message')
  const mockReset = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render error component', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
    })

    it('should display correct title and subtitle', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      expect(screen.getByTestId('auth-title')).toHaveTextContent('Something went wrong')
      expect(screen.getByTestId('auth-subtitle')).toHaveTextContent('We encountered an error while loading the authentication page')
    })

    it('should display error icon', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
    })

    it('should display error message', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('should display default error message when no message provided', () => {
      const errorWithoutMessage = new Error()
      render(<AuthError error={errorWithoutMessage} reset={mockReset} />)
      
      expect(screen.getByText('An unexpected error occurred while loading the authentication page.')).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should render Try Again button', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      expect(screen.getByTestId('primary-button')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('should render Go Home button', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      expect(screen.getByTestId('outline-button')).toBeInTheDocument()
      expect(screen.getByText('Go Home')).toBeInTheDocument()
    })

    it('should call reset function when Try Again is clicked', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      fireEvent.click(screen.getByText('Try Again'))
      expect(mockReset).toHaveBeenCalledTimes(1)
    })

    it('should redirect to home when Go Home is clicked', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      fireEvent.click(screen.getByText('Go Home'))
      expect(window.location.href).toBe('/')
    })
  })

  describe('Icons', () => {
    it('should display refresh icon in Try Again button', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument()
    })

    it('should have proper icon styling', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      const alertIcon = screen.getByTestId('alert-circle-icon')
      expect(alertIcon).toHaveClass('w-8')
      expect(alertIcon).toHaveClass('h-8')
      expect(alertIcon).toHaveClass('text-destructive')
    })
  })

  describe('Layout and Styling', () => {
    it('should have proper error icon container styling', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      const iconContainer = screen.getByTestId('alert-circle-icon').parentElement
      expect(iconContainer).toHaveClass('flex')
      expect(iconContainer).toHaveClass('items-center')
      expect(iconContainer).toHaveClass('justify-center')
      expect(iconContainer).toHaveClass('w-16')
      expect(iconContainer).toHaveClass('h-16')
      expect(iconContainer).toHaveClass('rounded-full')
      expect(iconContainer).toHaveClass('bg-destructive/10')
    })

    it('should have proper content spacing', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      const mainContainer = screen.getByTestId('auth-children').firstChild as HTMLElement
      expect(mainContainer).toHaveClass('flex')
      expect(mainContainer).toHaveClass('flex-col')
      expect(mainContainer).toHaveClass('items-center')
      expect(mainContainer).toHaveClass('space-y-6')
      expect(mainContainer).toHaveClass('py-8')
    })
  })

  describe('Development Mode', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      })
    })

    it('should show debug information in development mode', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      })
      const errorWithStack = new Error('Test error')
      errorWithStack.stack = 'Error: Test error\n    at test.js:1:1'
      
      render(<AuthError error={errorWithStack} reset={mockReset} />)
      
      expect(screen.getByText('Debug Information')).toBeInTheDocument()
    })

    it('should not show debug information in production mode', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      })
      
      render(<AuthError error={mockError} reset={mockReset} />)
      
      expect(screen.queryByText('Debug Information')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should use semantic HTML structure', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      const heading = screen.getByText('Authentication Error')
      expect(heading.tagName).toBe('H3')
      
      const description = screen.getByText('Test error message')
      expect(description.tagName).toBe('P')
    })

    it('should have proper heading hierarchy', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      const heading = screen.getByText('Authentication Error')
      expect(heading).toHaveClass('text-lg')
      expect(heading).toHaveClass('font-semibold')
    })

    it('should have proper button structure', () => {
      render(<AuthError error={mockError} reset={mockReset} />)
      
      const tryAgainButton = screen.getByText('Try Again').closest('button')
      const goHomeButton = screen.getByText('Go Home').closest('button')
      
      expect(tryAgainButton).toBeInTheDocument()
      expect(goHomeButton).toBeInTheDocument()
    })
  })

  describe('Error Object Handling', () => {
    it('should handle error with digest property', () => {
      const errorWithDigest = new Error('Test error') as Error & { digest?: string }
      errorWithDigest.digest = 'abc123'
      
      render(<AuthError error={errorWithDigest} reset={mockReset} />)
      
      expect(screen.getByText('Test error')).toBeInTheDocument()
    })

    it('should handle empty error message', () => {
      const emptyError = new Error('')
      
      render(<AuthError error={emptyError} reset={mockReset} />)
      
      expect(screen.getByText('An unexpected error occurred while loading the authentication page.')).toBeInTheDocument()
    })
  })
})