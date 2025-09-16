import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthLayout } from '../auth-layout'

describe('AuthLayout Component', () => {
  describe('Rendering', () => {
    it('should render children correctly', () => {
      render(
        <AuthLayout>
          <div data-testid="test-content">Test Content</div>
        </AuthLayout>
      )
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('should render title when provided', () => {
      const title = 'Sign In to Your Account'
      
      render(
        <AuthLayout title={title}>
          <div>Content</div>
        </AuthLayout>
      )
      
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByText(title)).toBeInTheDocument()
    })

    it('should render subtitle when provided', () => {
      const subtitle = 'Welcome back! Please sign in to continue.'
      
      render(
        <AuthLayout subtitle={subtitle}>
          <div>Content</div>
        </AuthLayout>
      )
      
      expect(screen.getByText(subtitle)).toBeInTheDocument()
    })

    it('should render both title and subtitle when provided', () => {
      const title = 'Sign In'
      const subtitle = 'Welcome back'
      
      render(
        <AuthLayout title={title} subtitle={subtitle}>
          <div>Content</div>
        </AuthLayout>
      )
      
      expect(screen.getByText(title)).toBeInTheDocument()
      expect(screen.getByText(subtitle)).toBeInTheDocument()
    })

    it('should not render title/subtitle section when neither is provided', () => {
      render(
        <AuthLayout>
          <div data-testid="content">Content</div>
        </AuthLayout>
      )
      
      // Should not have any heading elements from AuthLayout (BrandSection has its own heading)
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should have mobile-first responsive classes', () => {
      const { container } = render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      )
      
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('min-h-screen')
      expect(mainContainer).toHaveClass('flex')
      expect(mainContainer).toHaveClass('flex-col')
      expect(mainContainer).toHaveClass('lg:flex-row')
    })

    it('should hide brand section on mobile and show on desktop', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      )
      
      // Brand section should be hidden on mobile (lg:flex)
      const { container } = render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      )
      
      const brandSection = container.querySelector('.hidden.lg\\:flex')
      expect(brandSection).toBeInTheDocument()
      expect(brandSection).toHaveClass('hidden')
      expect(brandSection).toHaveClass('lg:flex')
    })

    it('should show mobile logo on small screens', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      )
      
      // Mobile logo should be hidden on large screens
      const mobileLogo = screen.getByText('C9')
      const mobileLogoContainer = mobileLogo.closest('.lg\\:hidden')
      expect(mobileLogoContainer).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      )
      
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByLabelText('Authentication form')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(
        <AuthLayout title="Sign In">
          <div>Content</div>
        </AuthLayout>
      )
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Sign In')
    })

    it('should have semantic HTML structure', () => {
      render(
        <AuthLayout title="Test Title">
          <div>Content</div>
        </AuthLayout>
      )
      
      // Should have main landmark
      expect(screen.getByRole('main')).toBeInTheDocument()
      
      // Should have proper heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const customClass = 'custom-auth-layout'
      
      const { container } = render(
        <AuthLayout className={customClass}>
          <div>Content</div>
        </AuthLayout>
      )
      
      expect(container.firstChild).toHaveClass(customClass)
    })

    it('should merge custom className with default classes', () => {
      const customClass = 'custom-class'
      
      const { container } = render(
        <AuthLayout className={customClass}>
          <div>Content</div>
        </AuthLayout>
      )
      
      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass(customClass)
      expect(element).toHaveClass('min-h-screen')
      expect(element).toHaveClass('flex')
    })
  })

  describe('Layout Structure', () => {
    it('should have correct layout structure', () => {
      const { container } = render(
        <AuthLayout title="Test">
          <div data-testid="form-content">Form</div>
        </AuthLayout>
      )
      
      const mainContainer = container.firstChild as HTMLElement
      
      // Should have two main sections
      expect(mainContainer.children).toHaveLength(2)
      
      // First section should be brand section (hidden on mobile)
      const brandSection = mainContainer.children[0]
      expect(brandSection).toHaveClass('hidden', 'lg:flex')
      
      // Second section should be form section
      const formSection = mainContainer.children[1]
      expect(formSection).toHaveClass('flex-1')
      expect(formSection.querySelector('[data-testid="form-content"]')).toBeInTheDocument()
    })

    it('should center content properly', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      )
      
      const formSection = screen.getByRole('main').closest('.flex-1')
      expect(formSection).toHaveClass('flex')
      expect(formSection).toHaveClass('items-center')
      expect(formSection).toHaveClass('justify-center')
    })
  })

  describe('Content Spacing', () => {
    it('should have proper spacing for content', () => {
      render(
        <AuthLayout title="Test" subtitle="Subtitle">
          <div>Content</div>
        </AuthLayout>
      )
      
      const contentWrapper = screen.getByRole('main')
      expect(contentWrapper).toHaveClass('space-y-6')
      
      const maxWidthWrapper = contentWrapper.parentElement
      expect(maxWidthWrapper).toHaveClass('max-w-md')
      expect(maxWidthWrapper).toHaveClass('space-y-6')
    })

    it('should have proper padding on different screen sizes', () => {
      const { container } = render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      )
      
      const formSection = container.querySelector('.flex-1')
      expect(formSection).toHaveClass('p-4')
      expect(formSection).toHaveClass('sm:p-6')
      expect(formSection).toHaveClass('lg:p-8')
    })
  })
})