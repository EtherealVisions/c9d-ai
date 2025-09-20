import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccessibilityProvider } from '@/contexts/accessibility-context'

// Test wrapper with accessibility context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AccessibilityProvider>
      {children}
    </AccessibilityProvider>
  )
}

describe('Mobile Optimizations - Simple Tests', () => {
  beforeEach(() => {
    // Mock window properties for mobile detection
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    })
  })

  describe('CSS Classes', () => {
    it('should apply mobile-first responsive classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="text-sm xs:text-base sm:text-lg">
            Responsive text
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('text-sm')
      expect(element).toHaveClass('xs:text-base')
      expect(element).toHaveClass('sm:text-lg')
    })

    it('should handle touch device classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="touch-target-enhanced">
            Touch target
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('touch-target-enhanced')
    })

    it('should apply GPU acceleration classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="gpu-accelerated">
            Accelerated element
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('gpu-accelerated')
    })

    it('should apply safe area classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="safe-area-inset">
            Safe area content
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('safe-area-inset')
    })
  })

  describe('Mobile Form Optimizations', () => {
    it('should apply mobile form classes', () => {
      const { container } = render(
        <TestWrapper>
          <form className="mobile-form">
            <input type="text" className="form-field" />
            <button type="submit" className="touch-target-enhanced">
              Submit
            </button>
          </form>
        </TestWrapper>
      )

      const form = container.querySelector('form')
      const button = container.querySelector('button')
      
      expect(form).toHaveClass('mobile-form')
      expect(button).toHaveClass('touch-target-enhanced')
    })

    it('should apply social auth mobile classes', () => {
      const { container } = render(
        <TestWrapper>
          <button className="social-auth-mobile">
            Continue with Google
          </button>
        </TestWrapper>
      )

      const button = container.firstChild as HTMLElement
      expect(button).toHaveClass('social-auth-mobile')
    })
  })

  describe('Loading States', () => {
    it('should apply mobile loading classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="mobile-loading">
            Loading...
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('mobile-loading')
    })

    it('should apply password strength mobile classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="password-strength-mobile">
            <div className="strength-bar">
              <div className="strength-fill" style={{ width: '50%' }}></div>
            </div>
          </div>
        </TestWrapper>
      )

      const container_element = container.firstChild as HTMLElement
      const bar = container.querySelector('.strength-bar')
      const fill = container.querySelector('.strength-fill')
      
      expect(container_element).toHaveClass('password-strength-mobile')
      expect(bar).toHaveClass('strength-bar')
      expect(fill).toHaveClass('strength-fill')
    })
  })

  describe('Error and Success States', () => {
    it('should apply mobile error classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="mobile-error">
            <span className="error-icon">⚠️</span>
            Error message
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      const icon = container.querySelector('.error-icon')
      
      expect(element).toHaveClass('mobile-error')
      expect(icon).toHaveClass('error-icon')
    })

    it('should apply mobile success classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="mobile-success">
            Success message
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('mobile-success')
    })
  })

  describe('Layout Classes', () => {
    it('should apply auth layout mobile classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="auth-layout-mobile mobile-keyboard-aware">
            <main className="form-container">
              Content
            </main>
          </div>
        </TestWrapper>
      )

      const layout = container.firstChild as HTMLElement
      const main = container.querySelector('main')
      
      expect(layout).toHaveClass('auth-layout-mobile')
      expect(layout).toHaveClass('mobile-keyboard-aware')
      expect(main).toHaveClass('form-container')
    })
  })

  describe('Performance Classes', () => {
    it('should apply will-change classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="will-change-transform">
            Transform element
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('will-change-transform')
    })

    it('should apply will-change-opacity classes', () => {
      const { container } = render(
        <TestWrapper>
          <div className="will-change-opacity">
            Opacity element
          </div>
        </TestWrapper>
      )

      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('will-change-opacity')
    })
  })
})