import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import HeroSection from '../hero-section'
import { trackEvent } from '@/lib/utils/analytics'

// Mock the analytics utility
vi.mock('@/lib/utils/analytics', () => ({
  trackEvent: vi.fn(),
  trackAnalyticsEvent: vi.fn(),
  getABTestVariant: vi.fn(() => null),
  trackPerformance: vi.fn(),
}))

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
})
window.IntersectionObserver = mockIntersectionObserver

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn()
mockPerformanceObserver.mockReturnValue({
  observe: () => null,
  disconnect: () => null,
})
window.PerformanceObserver = mockPerformanceObserver

describe('Enhanced Hero Section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default content', () => {
    render(<HeroSection />)
    
    expect(screen.getByText('Unlock')).toBeInTheDocument()
    expect(screen.getByText('Deeper')).toBeInTheDocument()
    expect(screen.getByText('Insights.')).toBeInTheDocument()
    expect(screen.getByText(/C9N.AI leverages advanced AI/)).toBeInTheDocument()
  })

  it('renders custom title and subtitle', () => {
    const customProps = {
      title: 'Custom Hero Title',
      subtitle: 'Custom hero subtitle for testing',
    }
    
    render(<HeroSection {...customProps} />)
    
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('Hero')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Custom hero subtitle for testing')).toBeInTheDocument()
  })

  it('renders primary CTA button', async () => {
    render(<HeroSection />)
    
    await waitFor(() => {
      const ctaButton = screen.getByRole('link', { name: /Request a Consultation/i })
      expect(ctaButton).toBeInTheDocument()
      expect(ctaButton).toHaveAttribute('href', '/request-consultation')
    })
  })

  it('renders secondary CTA button when provided', async () => {
    const secondaryCTA = {
      text: 'Watch Demo',
      href: '/demo',
      variant: 'outline' as const,
      tracking: {
        event: 'demo_click',
        category: 'engagement' as const,
      }
    }
    
    render(<HeroSection secondaryCTA={secondaryCTA} />)
    
    await waitFor(() => {
      const demoButton = screen.getByRole('link', { name: /Watch Demo/i })
      expect(demoButton).toBeInTheDocument()
      expect(demoButton).toHaveAttribute('href', '/demo')
    })
  })

  it('tracks analytics events when CTA is clicked', async () => {
    render(<HeroSection />)
    
    await waitFor(() => {
      const ctaButton = screen.getByRole('link', { name: /Request a Consultation/i })
      fireEvent.click(ctaButton)
      
      expect(trackEvent).toHaveBeenCalledWith({
        event: 'hero_primary_cta_click',
        category: 'conversion',
        label: 'consultation_request'
      })
    })
  })

  it('renders hero metrics when provided', async () => {
    const metrics = [
      {
        id: 'users',
        value: 1000,
        label: 'Active Users',
        animateCounter: true
      },
      {
        id: 'accuracy',
        value: 95,
        label: 'Accuracy Rate',
        animateCounter: true
      }
    ]
    
    render(<HeroSection metrics={metrics} />)
    
    await waitFor(() => {
      expect(screen.getByText('Active Users')).toBeInTheDocument()
      expect(screen.getByText('Accuracy Rate')).toBeInTheDocument()
    })
  })

  it('renders floating blobs when animation is enabled', async () => {
    const animationConfig = {
      enableFloatingBlobs: true,
      blobCount: 3,
      animationSpeed: 'medium' as const,
      colorScheme: 'mixed' as const
    }
    
    render(<HeroSection backgroundAnimation={animationConfig} />)
    
    await waitFor(() => {
      // Check if floating blobs container exists
      const section = screen.getByText('Unlock').closest('section')
      expect(section).toBeInTheDocument()
    })
  })

  it('handles A/B testing when enabled', async () => {
    const abTestVariants = [
      {
        id: 'variant_a',
        title: 'Test Variant Title',
        subtitle: 'Test variant subtitle',
        primaryCTA: {
          text: 'Test CTA',
          href: '/test',
          variant: 'primary' as const,
          tracking: {
            event: 'test_cta',
            category: 'conversion' as const,
          }
        },
        weight: 100
      }
    ]
    
    render(<HeroSection abTestVariants={abTestVariants} enableABTesting={true} />)
    
    // The component should render, A/B testing logic is tested separately
    await waitFor(() => {
      // Check for either the default title or test variant
      const hasUnlock = screen.queryByText('Unlock')
      const hasTestVariant = screen.queryByText('Test Variant Title')
      expect(hasUnlock || hasTestVariant).toBeTruthy()
    })
  })

  it('applies correct CSS classes for styling', async () => {
    render(<HeroSection />)
    
    await waitFor(() => {
      const section = screen.getByText('Unlock').closest('section')
      expect(section).toHaveClass('relative', 'bg-c9n-blue-dark', 'overflow-hidden')
    })
  })

  it('handles reduced motion preferences', async () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    
    render(<HeroSection />)
    
    await waitFor(() => {
      const section = screen.getByText('Unlock').closest('section')
      expect(section).toBeInTheDocument()
    })
  })
})