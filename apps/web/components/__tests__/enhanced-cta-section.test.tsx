import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EnhancedCTASection } from '../enhanced-cta-section'
import { CTASectionConfig } from '@/lib/types/cta'

// Mock the analytics utilities
const mockTrackCTAClick = vi.fn()
const mockTrackCTAImpression = vi.fn()
const mockSelectCTAVariant = vi.fn()

vi.mock('@/lib/utils/cta-analytics', () => ({
  trackCTAClick: mockTrackCTAClick,
  trackCTAImpression: mockTrackCTAImpression,
  selectCTAVariant: mockSelectCTAVariant
}))

// Mock the intersection observer hook
vi.mock('@/hooks/use-intersection-observer', () => ({
  useIntersectionObserver: vi.fn(() => ({
    elementRef: { current: null },
    shouldAnimate: true
  }))
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  CalendarCheckIcon: () => <div data-testid="calendar-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Users: () => <div data-testid="users-icon" />
}))

describe('EnhancedCTASection', () => {
  const mockConfig: CTASectionConfig = {
    id: 'test-cta',
    title: 'Test CTA Title',
    subtitle: 'Test CTA Subtitle',
    description: 'Test CTA Description',
    context: 'features',
    variants: [
      {
        id: 'primary-variant',
        text: 'Primary CTA',
        href: '/primary',
        variant: 'primary',
        tracking: {
          event: 'primary_click',
          category: 'conversion',
          label: 'test_primary',
          value: 100
        },
        weight: 100
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render CTA section with title, subtitle, and description', () => {
      render(<EnhancedCTASection config={mockConfig} />)

      expect(screen.getByText('Test CTA Title')).toBeInTheDocument()
      expect(screen.getByText('Test CTA Subtitle')).toBeInTheDocument()
      expect(screen.getByText('Test CTA Description')).toBeInTheDocument()
    })

    it('should render CTA button with correct text', () => {
      render(<EnhancedCTASection config={mockConfig} />)

      expect(screen.getByRole('link', { name: /primary cta/i })).toBeInTheDocument()
    })

    it('should apply correct data-section attribute', () => {
      render(<EnhancedCTASection config={mockConfig} />)

      const section = screen.getByRole('region')
      expect(section).toHaveAttribute('data-section', 'test-cta')
    })

    it('should render without subtitle and description when not provided', () => {
      const minimalConfig = {
        ...mockConfig,
        subtitle: undefined,
        description: undefined
      }

      render(<EnhancedCTASection config={minimalConfig} />)

      expect(screen.getByText('Test CTA Title')).toBeInTheDocument()
      expect(screen.queryByText('Test CTA Subtitle')).not.toBeInTheDocument()
      expect(screen.queryByText('Test CTA Description')).not.toBeInTheDocument()
    })
  })

  describe('Urgency and Scarcity Indicators', () => {
    it('should render urgency indicator when enabled', () => {
      const configWithUrgency = {
        ...mockConfig,
        urgency: {
          enabled: true,
          type: 'limited-time' as const,
          message: 'Limited time offer!'
        }
      }

      render(<EnhancedCTASection config={configWithUrgency} />)

      expect(screen.getByText('Limited time offer!')).toBeInTheDocument()
    })

    it('should render scarcity indicator when enabled', () => {
      const configWithScarcity = {
        ...mockConfig,
        scarcity: {
          enabled: true,
          type: 'limited-spots' as const,
          message: 'Only 5 spots left!',
          remaining: 5,
          total: 100
        }
      }

      render(<EnhancedCTASection config={configWithScarcity} />)

      expect(screen.getByText('Only 5 spots left!')).toBeInTheDocument()
      expect(screen.getByText('5 remaining')).toBeInTheDocument()
      expect(screen.getByText('95 taken')).toBeInTheDocument()
    })

    it('should not render urgency indicator when disabled', () => {
      const configWithDisabledUrgency = {
        ...mockConfig,
        urgency: {
          enabled: false,
          type: 'limited-time' as const,
          message: 'Limited time offer!'
        }
      }

      render(<EnhancedCTASection config={configWithDisabledUrgency} />)

      expect(screen.queryByText('Limited time offer!')).not.toBeInTheDocument()
    })
  })

  describe('Context-specific Features', () => {
    it('should render progressive disclosure for final context', () => {
      const finalConfig = {
        ...mockConfig,
        context: 'final' as const
      }

      render(<EnhancedCTASection config={finalConfig} />)

      expect(screen.getByText('Want to learn more first?')).toBeInTheDocument()
      expect(screen.getByText('Explore all features')).toBeInTheDocument()
      expect(screen.getByText('View case studies')).toBeInTheDocument()
      expect(screen.getByText('See pricing')).toBeInTheDocument()
    })

    it('should render trust indicators for hero context', () => {
      const heroConfig = {
        ...mockConfig,
        context: 'hero' as const
      }

      render(<EnhancedCTASection config={heroConfig} />)

      expect(screen.getByText('Free consultation')).toBeInTheDocument()
      expect(screen.getByText('No commitment required')).toBeInTheDocument()
      expect(screen.getByText('Setup in 24 hours')).toBeInTheDocument()
    })

    it('should not render context-specific features for other contexts', () => {
      const featuresConfig = {
        ...mockConfig,
        context: 'features' as const
      }

      render(<EnhancedCTASection config={featuresConfig} />)

      expect(screen.queryByText('Want to learn more first?')).not.toBeInTheDocument()
      expect(screen.queryByText('Free consultation')).not.toBeInTheDocument()
    })
  })

  describe('Analytics Tracking', () => {
    it('should track CTA impression when section becomes visible', async () => {
      render(<EnhancedCTASection config={mockConfig} userId="test-user" />)

      await waitFor(() => {
        expect(mockTrackCTAImpression).toHaveBeenCalledWith(
          'test-cta',
          mockConfig.variants[0],
          'features',
          'test-user'
        )
      })
    })

    it('should track CTA click when button is clicked', async () => {
      render(<EnhancedCTASection config={mockConfig} userId="test-user" />)

      const ctaButton = screen.getByRole('link', { name: /primary cta/i })
      fireEvent.click(ctaButton)

      expect(mockTrackCTAClick).toHaveBeenCalledWith(
        'test-cta',
        mockConfig.variants[0],
        'features',
        'test-user'
      )
    })

    it('should track impression only once', async () => {
      const { rerender } = render(<EnhancedCTASection config={mockConfig} userId="test-user" />)

      await waitFor(() => {
        expect(mockTrackCTAImpression).toHaveBeenCalledTimes(1)
      })

      // Re-render component
      rerender(<EnhancedCTASection config={mockConfig} userId="test-user" />)

      // Should still only be called once
      expect(mockTrackCTAImpression).toHaveBeenCalledTimes(1)
    })
  })

  describe('A/B Testing', () => {
    it('should use selected variant from A/B test config', () => {
      const abTestConfig = {
        enabled: true,
        testId: 'test-ab',
        variants: mockConfig.variants,
        trafficSplit: [100],
        conversionGoal: 'primary_click'
      }

      mockSelectCTAVariant.mockReturnValue(mockConfig.variants[0])

      render(
        <EnhancedCTASection 
          config={mockConfig} 
          abTestConfig={abTestConfig}
          userId="test-user" 
        />
      )

      expect(mockSelectCTAVariant).toHaveBeenCalledWith(abTestConfig, 'test-user')
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<EnhancedCTASection config={mockConfig} />)

      const section = screen.getByRole('region')
      expect(section).toBeInTheDocument()

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Test CTA Title')
    })

    it('should have accessible CTA button', () => {
      render(<EnhancedCTASection config={mockConfig} />)

      const ctaButton = screen.getByRole('link', { name: /primary cta/i })
      expect(ctaButton).toHaveAttribute('href', '/primary')
    })
  })

  describe('Animation Classes', () => {
    it('should apply animation classes when shouldAnimate is true', () => {
      render(<EnhancedCTASection config={mockConfig} />)

      const titleContainer = screen.getByText('Test CTA Title').closest('div')
      expect(titleContainer).toHaveClass('animate-in', 'fade-in', 'slide-in-from-bottom-4')
    })

    it('should apply context-specific delay classes', () => {
      const heroConfig = { ...mockConfig, context: 'hero' as const }
      render(<EnhancedCTASection config={heroConfig} />)

      const titleContainer = screen.getByText('Test CTA Title').closest('div')
      expect(titleContainer).toHaveClass('delay-100')
    })
  })
})