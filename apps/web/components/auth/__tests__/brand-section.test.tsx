import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandSection } from '../brand-section'

describe('BrandSection Component', () => {
  describe('Rendering', () => {
    it('should render the C9d.ai logo', () => {
      render(<BrandSection />)
      
      // Check for the logo text content - should have at least one element with C9N.AI text
      const logoElements = screen.getAllByText((content, element) => {
        return element?.textContent === 'C9N.AI'
      })
      expect(logoElements.length).toBeGreaterThan(0)
    })

    it('should render the main heading', () => {
      render(<BrandSection />)
      
      expect(screen.getByText('Welcome to the Future of AI-Powered Development')).toBeInTheDocument()
    })

    it('should render the description text', () => {
      render(<BrandSection />)
      
      const description = screen.getByText(/Join thousands of developers who are building/)
      expect(description).toBeInTheDocument()
    })

    it('should render all feature list items', () => {
      render(<BrandSection />)
      
      expect(screen.getByText('AI-powered code generation')).toBeInTheDocument()
      expect(screen.getByText('Intelligent project management')).toBeInTheDocument()
      expect(screen.getByText('Seamless team collaboration')).toBeInTheDocument()
    })

    it('should render the testimonial quote', () => {
      render(<BrandSection />)
      
      const quote = screen.getByText(/C9d\.ai has transformed how we approach/)
      expect(quote).toBeInTheDocument()
      
      const author = screen.getByText('— Sarah Chen, Lead Developer')
      expect(author).toBeInTheDocument()
    })
  })

  describe('Visual Elements', () => {
    it('should have animated background', () => {
      const { container } = render(<BrandSection />)
      
      const animatedBg = container.querySelector('.animated-gradient-bg')
      expect(animatedBg).toBeInTheDocument()
    })

    it('should have floating elements with animations', () => {
      const { container } = render(<BrandSection />)
      
      // Check for floating circles with different animations
      const floatingElements = container.querySelectorAll('[class*="animate-gentle-float"]')
      expect(floatingElements).toHaveLength(3)
      
      // Check for different animation classes
      expect(container.querySelector('.animate-gentle-float-1')).toBeInTheDocument()
      expect(container.querySelector('.animate-gentle-float-2')).toBeInTheDocument()
      expect(container.querySelector('.animate-gentle-float-3')).toBeInTheDocument()
    })

    it('should have proper overlay for text readability', () => {
      const { container } = render(<BrandSection />)
      
      const overlay = container.querySelector('.bg-black\\/20')
      expect(overlay).toBeInTheDocument()
    })

    it('should have bottom gradient fade', () => {
      const { container } = render(<BrandSection />)
      
      const bottomGradient = container.querySelector('.bg-gradient-to-t')
      expect(bottomGradient).toBeInTheDocument()
      expect(bottomGradient).toHaveClass('from-black/30', 'to-transparent')
    })
  })

  describe('Layout and Structure', () => {
    it('should have proper container structure', () => {
      const { container } = render(<BrandSection />)
      
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('relative')
      expect(mainContainer).toHaveClass('w-full')
      expect(mainContainer).toHaveClass('h-full')
      expect(mainContainer).toHaveClass('overflow-hidden')
    })

    it('should have proper content positioning', () => {
      const { container } = render(<BrandSection />)
      
      const contentContainer = container.querySelector('.relative.z-10')
      expect(contentContainer).toBeInTheDocument()
      expect(contentContainer).toHaveClass('flex')
      expect(contentContainer).toHaveClass('flex-col')
      expect(contentContainer).toHaveClass('justify-center')
      expect(contentContainer).toHaveClass('h-full')
    })

    it('should have responsive padding', () => {
      const { container } = render(<BrandSection />)
      
      const contentContainer = container.querySelector('.relative.z-10')
      expect(contentContainer).toHaveClass('p-8')
      expect(contentContainer).toHaveClass('lg:p-12')
    })
  })

  describe('Typography and Styling', () => {
    it('should have proper heading styles', () => {
      render(<BrandSection />)
      
      const heading = screen.getByText('Welcome to the Future of AI-Powered Development')
      expect(heading.tagName).toBe('H2')
      expect(heading).toHaveClass('text-3xl')
      expect(heading).toHaveClass('lg:text-4xl')
      expect(heading).toHaveClass('font-bold')
      expect(heading).toHaveClass('text-white')
    })

    it('should have proper description styling', () => {
      render(<BrandSection />)
      
      const description = screen.getByText(/Join thousands of developers/)
      expect(description.tagName).toBe('P')
      expect(description).toHaveClass('text-lg')
      expect(description).toHaveClass('text-white/90')
    })

    it('should have proper feature list styling', () => {
      const { container } = render(<BrandSection />)
      
      const featureList = container.querySelector('.space-y-4')
      expect(featureList).toBeInTheDocument()
      
      // Check for feature items with proper structure
      const featureItems = container.querySelectorAll('.flex.items-center.space-x-3')
      expect(featureItems).toHaveLength(3)
      
      // Check for colored dots
      const coloredDots = container.querySelectorAll('.w-2.h-2.rounded-full')
      expect(coloredDots).toHaveLength(3)
    })

    it('should have proper quote styling', () => {
      render(<BrandSection />)
      
      const quote = screen.getByText(/C9d\.ai has transformed/)
      const blockquote = quote.closest('blockquote')
      
      expect(blockquote).toBeInTheDocument()
      expect(blockquote).toHaveClass('border-l-4')
      expect(blockquote).toHaveClass('border-c9n-teal')
      expect(blockquote).toHaveClass('pl-4')
    })
  })

  describe('Color Scheme', () => {
    it('should use brand colors for visual elements', () => {
      const { container } = render(<BrandSection />)
      
      // Check for teal color usage
      expect(container.querySelector('.bg-c9n-teal')).toBeInTheDocument()
      expect(container.querySelector('.border-c9n-teal')).toBeInTheDocument()
      
      // Check for windsurf color usage
      expect(container.querySelector('.bg-windsurf-pink-hot')).toBeInTheDocument()
      expect(container.querySelector('.bg-windsurf-yellow-bright')).toBeInTheDocument()
    })

    it('should have consistent text colors', () => {
      const { container } = render(<BrandSection />)
      
      // Main text should be white
      const heading = container.querySelector('h2')
      expect(heading).toHaveClass('text-white')
      
      // Description should be white with opacity
      const description = container.querySelector('p')
      expect(description).toHaveClass('text-white/90')
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic HTML structure', () => {
      render(<BrandSection />)
      
      // Should have proper heading hierarchy
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
    })

    it('should have proper quote structure', () => {
      render(<BrandSection />)
      
      const quote = screen.getByText(/C9d\.ai has transformed/)
      const blockquote = quote.closest('blockquote')
      
      expect(blockquote).toBeInTheDocument()
      
      // Should have proper footer for attribution
      const footer = blockquote?.querySelector('footer')
      expect(footer).toBeInTheDocument()
    })

    it('should have readable text contrast', () => {
      const { container } = render(<BrandSection />)
      
      // Main text should be white on dark background
      const heading = container.querySelector('h2')
      expect(heading).toHaveClass('text-white')
      
      // Should have overlay for better readability
      const overlay = container.querySelector('.bg-black\\/20')
      expect(overlay).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive text sizes', () => {
      render(<BrandSection />)
      
      const heading = screen.getByText('Welcome to the Future of AI-Powered Development')
      expect(heading).toHaveClass('text-3xl')
      expect(heading).toHaveClass('lg:text-4xl')
    })

    it('should have responsive padding', () => {
      const { container } = render(<BrandSection />)
      
      const contentContainer = container.querySelector('.relative.z-10')
      expect(contentContainer).toHaveClass('p-8')
      expect(contentContainer).toHaveClass('lg:p-12')
    })

    it('should have proper content width constraints', () => {
      const { container } = render(<BrandSection />)
      
      const contentWrapper = container.querySelector('.max-w-md')
      expect(contentWrapper).toBeInTheDocument()
    })
  })
})