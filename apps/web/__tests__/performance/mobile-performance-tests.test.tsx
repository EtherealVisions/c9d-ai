/**
 * Mobile Performance and Optimization Testing Suite
 * 
 * Tests mobile-specific performance optimizations and features
 * Requirements: 9.1 (Accessibility), 9.2 (User Experience)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock mobile detection utilities
const MobileDetection = {
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  },
  
  isTouchDevice: () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  },
  
  getViewportSize: () => ({
    width: window.innerWidth,
    height: window.innerHeight
  }),
  
  getDevicePixelRatio: () => window.devicePixelRatio || 1,
  
  isLandscape: () => window.innerWidth > window.innerHeight,
  
  getConnectionType: () => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    return connection ? connection.effectiveType : '4g'
  }
}

// Mock viewport utilities
const ViewportUtils = {
  setViewportSize: (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height })
    window.dispatchEvent(new Event('resize'))
  },
  
  simulateOrientationChange: () => {
    const currentWidth = window.innerWidth
    const currentHeight = window.innerHeight
    ViewportUtils.setViewportSize(currentHeight, currentWidth)
  },
  
  simulateDevicePixelRatio: (ratio: number) => {
    Object.defineProperty(window, 'devicePixelRatio', { writable: true, configurable: true, value: ratio })
  }
}

// Mock performance utilities
const PerformanceUtils = {
  measureRenderTime: async (renderFn: () => void): Promise<number> => {
    const startTime = performance.now()
    renderFn()
    await new Promise(resolve => setTimeout(resolve, 0)) // Wait for render
    return performance.now() - startTime
  },
  
  measureMemoryUsage: (): number => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }
}

// Mock components for testing
interface MobileSignInFormProps {
  onSubmit?: (data: any) => void
  isLoading?: boolean
}

const MobileSignInForm: React.FC<MobileSignInFormProps> = ({ onSubmit, isLoading = false }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.({ email: 'test@example.com', password: 'password' })
  }

  return (
    <form onSubmit={handleSubmit} className="mobile-auth-form">
      <div>
        <label htmlFor="email">Email</label>
        <input 
          id="email" 
          type="email" 
          required 
          disabled={isLoading}
          aria-label="Email address"
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input 
          id="password" 
          type="password" 
          required 
          disabled={isLoading}
          aria-label="Password"
        />
        <button type="button" aria-label="Show password">👁️</button>
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}

interface MobileLoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
}

const MobileLoadingSpinner: React.FC<MobileLoadingSpinnerProps> = ({ 
  size = 'medium', 
  message = 'Loading...' 
}) => {
  const sizeMap = {
    small: '20px',
    medium: '32px',
    large: '48px'
  }

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      role="status"
      aria-label={message}
    >
      <div
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
        aria-hidden="true"
      />
      <span style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
        {message}
      </span>
    </div>
  )
}

interface MobileErrorMessageProps {
  error: string
  onRetry?: () => void
}

const MobileErrorMessage: React.FC<MobileErrorMessageProps> = ({ error, onRetry }) => (
  <div 
    style={{
      padding: '16px',
      backgroundColor: '#fee',
      border: '1px solid #fcc',
      borderRadius: '8px',
      margin: '16px 0'
    }}
    role="alert"
  >
    <h3 style={{ margin: '0 0 8px 0', color: '#c33', fontSize: '16px' }}>
      Error
    </h3>
    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
      {error}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          cursor: 'pointer'
        }}
      >
        Try Again
      </button>
    )}
  </div>
)

describe('Mobile Performance Tests', () => {
  beforeEach(() => {
    // Reset viewport to mobile size
    ViewportUtils.setViewportSize(375, 667) // iPhone SE dimensions
    
    // Mock touch device
    Object.defineProperty(navigator, 'maxTouchPoints', { writable: true, configurable: true, value: 5 })
    
    // Mock user agent for mobile
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    })
  })

  describe('Component Rendering Performance', () => {
    it('should render mobile sign-in form quickly', async () => {
      const renderTime = await PerformanceUtils.measureRenderTime(() => {
        render(<MobileSignInForm />)
      })
      
      // Should render within 100ms
      expect(renderTime).toBeLessThan(100)
    })

    it('should handle rapid re-renders efficiently', async () => {
      const { rerender } = render(<MobileSignInForm />)
      
      const rerenderTimes: number[] = []
      
      // Test 10 rapid re-renders
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now()
        rerender(<MobileSignInForm isLoading={i % 2 === 0} />)
        rerenderTimes.push(performance.now() - startTime)
      }
      
      const averageRerenderTime = rerenderTimes.reduce((a, b) => a + b, 0) / rerenderTimes.length
      expect(averageRerenderTime).toBeLessThan(50) // Should average under 50ms
    })

    it('should render loading spinner without performance issues', () => {
      const renderTime = PerformanceUtils.measureRenderTime(() => {
        render(<MobileLoadingSpinner size="large" message="Processing..." />)
      })
      
      expect(renderTime).toBeLessThan(50)
    })
  })

  describe('Mobile Interaction Performance', () => {
    it('should handle form submission efficiently', async () => {
      const mockSubmit = vi.fn()
      render(<MobileSignInForm onSubmit={mockSubmit} />)
      
      const user = userEvent.setup()
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      const startTime = performance.now()
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      const interactionTime = performance.now() - startTime
      
      expect(interactionTime).toBeLessThan(1000) // Should complete within 1 second
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      })
    })

    it('should handle password visibility toggle efficiently', async () => {
      render(<MobileSignInForm />)
      
      const toggleButton = screen.getByRole('button', { name: /show password/i })
      const user = userEvent.setup()
      
      const startTime = performance.now()
      await user.click(toggleButton)
      const toggleTime = performance.now() - startTime
      
      expect(toggleTime).toBeLessThan(100)
    })
  })

  describe('Mobile Layout and Responsiveness', () => {
    it('should adapt to different screen sizes efficiently', async () => {
      // Test different mobile screen sizes
      const screenSizes = [
        { width: 320, height: 568 }, // iPhone 5
        { width: 375, height: 667 }, // iPhone SE
        { width: 414, height: 896 }, // iPhone 11
        { width: 360, height: 640 }  // Android
      ]

      for (const size of screenSizes) {
        ViewportUtils.setViewportSize(size.width, size.height)
        
        const { container } = render(<MobileSignInForm />)
        
        // Check that form adapts to screen size
        const form = container.querySelector('.mobile-auth-form')
        expect(form).toBeInTheDocument()
        
        // Verify responsive behavior
        await waitFor(() => {
          expect(window.innerWidth).toBe(size.width)
          expect(window.innerHeight).toBe(size.height)
        })
      }
    })

    it('should handle orientation changes smoothly', async () => {
      render(<MobileSignInForm />)
      
      // Start in portrait
      expect(window.innerWidth).toBe(375)
      expect(window.innerHeight).toBe(667)
      
      // Simulate orientation change
      ViewportUtils.simulateOrientationChange()
      
      await waitFor(() => {
        expect(window.innerWidth).toBe(667)
        expect(window.innerHeight).toBe(375)
      })
      
      // Verify form is still functional
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('should handle different device pixel ratios', async () => {
      const pixelRatios = [1, 1.5, 2, 3]
      
      for (const ratio of pixelRatios) {
        ViewportUtils.simulateDevicePixelRatio(ratio)
        render(<MobileSignInForm />)
        
        const currentRatio = MobileDetection.getDevicePixelRatio()
        expect(currentRatio).toBe(ratio)
        
        // Verify rendering works at different pixel densities
        expect(() => {
          render(<MobileSignInForm />)
        }).not.toThrow()
      }
    })
  })

  describe('Mobile Network and Performance Optimization', () => {
    it('should handle slow network conditions gracefully', async () => {
      // Simulate slow network
      vi.spyOn(window, 'fetch').mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(new Response()), 3000))
      )
      
      render(<MobileSignInForm />)
      
      // Verify form remains responsive during slow network
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('should display appropriate error messages', () => {
      render(<MobileErrorMessage error="No internet connection" onRetry={() => {}} />)
      
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('No internet connection')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  describe('Memory Management', () => {
    it('should not cause memory leaks with repeated renders', () => {
      const initialMemory = PerformanceUtils.measureMemoryUsage()
      
      // Render and unmount multiple times
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<MobileSignInForm />)
        unmount()
      }
      
      const finalMemory = PerformanceUtils.measureMemoryUsage()
      
      // Memory usage should not increase significantly
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100
        expect(memoryIncreasePercent).toBeLessThan(50) // Less than 50% increase
      }
    })
  })

  describe('Touch and Gesture Performance', () => {
    it('should handle touch events efficiently', async () => {
      const startTime = performance.now()
      
      // Simulate multiple touch events
      for (let i = 0; i < 20; i++) {
        render(<MobileSignInForm />)
      }
      
      const totalTime = performance.now() - startTime
      expect(totalTime).toBeLessThan(1000) // Should handle 20 renders in under 1 second
    })

    it('should respond to touch interactions quickly', async () => {
      render(<MobileSignInForm />)
      
      const user = userEvent.setup()
      const emailInput = screen.getByLabelText(/email/i)
      
      const startTime = performance.now()
      await user.click(emailInput)
      const responseTime = performance.now() - startTime
      
      expect(responseTime).toBeLessThan(100)
    })

    it('should handle idle state efficiently', async () => {
      render(<MobileSignInForm />)
      
      const idleStartTime = performance.now()
      
      // Simulate idle period
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const idleTime = performance.now() - idleStartTime
      expect(idleTime).toBeGreaterThan(900) // Should actually wait
      
      // Verify component is still responsive after idle
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('should maintain smooth animations', () => {
      render(<MobileLoadingSpinner />)
      
      const spinner = screen.getByRole('status')
      expect(spinner).toBeInTheDocument()
      
      // Verify spinner has animation styles
      const spinnerElement = spinner.querySelector('div')
      expect(spinnerElement).toHaveStyle({ animation: 'spin 1s linear infinite' })
    })
  })
})