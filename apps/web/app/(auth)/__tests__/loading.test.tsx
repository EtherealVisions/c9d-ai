import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AuthLoading from '../loading'

// Mock AuthLayout
vi.mock('@/components/auth', () => ({
  AuthLayout: ({ children }: any) => (
    <div data-testid="auth-layout">
      <div data-testid="auth-children">{children}</div>
    </div>
  )
}))

describe('AuthLoading', () => {
  describe('Rendering', () => {
    it('should render loading component', () => {
      render(<AuthLoading />)
      
      expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
    })

    it('should display loading spinner', () => {
      render(<AuthLoading />)
      
      const spinner = screen.getByTestId('auth-children').querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('rounded-full')
      expect(spinner).toHaveClass('border-b-2')
      expect(spinner).toHaveClass('border-primary')
    })

    it('should display loading text', () => {
      render(<AuthLoading />)
      
      expect(screen.getByText('Loading authentication...')).toBeInTheDocument()
    })
  })

  describe('Layout', () => {
    it('should center content properly', () => {
      render(<AuthLoading />)
      
      const container = screen.getByTestId('auth-children').firstChild as HTMLElement
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('items-center')
      expect(container).toHaveClass('justify-center')
      expect(container).toHaveClass('py-12')
    })

    it('should have proper spacing between elements', () => {
      render(<AuthLoading />)
      
      const contentContainer = screen.getByTestId('auth-children').querySelector('.flex.flex-col')
      expect(contentContainer).toHaveClass('items-center')
      expect(contentContainer).toHaveClass('space-y-4')
    })
  })

  describe('Styling', () => {
    it('should have correct spinner dimensions', () => {
      render(<AuthLoading />)
      
      const spinner = screen.getByTestId('auth-children').querySelector('.animate-spin')
      expect(spinner).toHaveClass('h-8')
      expect(spinner).toHaveClass('w-8')
    })

    it('should have proper text styling', () => {
      render(<AuthLoading />)
      
      const loadingText = screen.getByText('Loading authentication...')
      expect(loadingText).toHaveClass('text-sm')
      expect(loadingText).toHaveClass('text-muted-foreground')
    })
  })

  describe('Accessibility', () => {
    it('should use semantic HTML', () => {
      render(<AuthLoading />)
      
      const loadingText = screen.getByText('Loading authentication...')
      expect(loadingText.tagName).toBe('P')
    })

    it('should be contained within AuthLayout', () => {
      render(<AuthLoading />)
      
      const authLayout = screen.getByTestId('auth-layout')
      const loadingContent = screen.getByText('Loading authentication...')
      
      expect(authLayout).toContainElement(loadingContent)
    })
  })
})