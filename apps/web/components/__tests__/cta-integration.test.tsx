import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FinalCtaSection from '../final-cta-section'
import { CTAManager } from '../cta-manager'

// Mock all the dependencies
vi.mock('@/lib/utils/cta-analytics', () => ({
  trackCTAClick: vi.fn(),
  trackCTAImpression: vi.fn(),
  trackUrgencyView: vi.fn(),
  selectCTAVariant: vi.fn((config) => config.variants[0])
}))

vi.mock('@/hooks/use-intersection-observer', () => ({
  useIntersectionObserver: vi.fn(() => ({
    elementRef: { current: null },
    shouldAnimate: true
  }))
}))

vi.mock('@/hooks/use-scroll-behavior', () => ({
  useScrollBehavior: vi.fn(() => ({
    isVisible: false,
    currentSection: null
  })),
  useScrollEngagement: vi.fn(() => ({
    timeOnPage: 0,
    scrollDepth: 0,
    maxScrollDepth: 0,
    scrollEvents: 0,
    isEngaged: false
  }))
}))

vi.mock('lucide-react', () => ({
  CalendarCheckIcon: () => <div data-testid="calendar-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Users: () => <div data-testid="users-icon" />,
  X: () => <div data-testid="x-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  BookOpen: () => <div data-testid="book-open-icon" />,
  Code: () => <div data-testid="code-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />
}))

describe('CTA Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('FinalCtaSection', () => {
    it('should render with default configuration', () => {
      render(<FinalCtaSection />)

      expect(screen.getByText("Ready to Unlock Your Data's Potential?")).toBeInTheDocument()
      expect(screen.getByText('Transform Complex Information into Actionable Intelligence')).toBeInTheDocument()
    })

    it('should render with urgency enabled', () => {
      render(<FinalCtaSection enableUrgency={true} />)

      expect(screen.getByText("Ready to Unlock Your Data's Potential?")).toBeInTheDocument()
      // Urgency indicator should be present (mocked)
    })

    it('should render with scarcity enabled', () => {
      render(<FinalCtaSection enableScarcity={true} />)

      expect(screen.getByText("Ready to Unlock Your Data's Potential?")).toBeInTheDocument()
      // Scarcity indicator should be present (mocked)
    })

    it('should render with both urgency and scarcity enabled', () => {
      render(<FinalCtaSection enableUrgency={true} enableScarcity={true} />)

      expect(screen.getByText("Ready to Unlock Your Data's Potential?")).toBeInTheDocument()
    })
  })

  describe('CTAManager', () => {
    it('should render without errors when enabled', () => {
      render(<CTAManager enableFloatingCTA={true} enableEngagementTracking={true} />)
      
      // CTAManager doesn't render visible content by default, just manages floating CTAs
      // This test ensures it doesn't crash
    })

    it('should render without errors when disabled', () => {
      render(<CTAManager enableFloatingCTA={false} enableEngagementTracking={false} />)
      
      // Should render without errors
    })
  })

  describe('Component Integration', () => {
    it('should render FinalCtaSection and CTAManager together', () => {
      render(
        <div>
          <FinalCtaSection userId="test-user" />
          <CTAManager userId="test-user" />
        </div>
      )

      expect(screen.getByText("Ready to Unlock Your Data's Potential?")).toBeInTheDocument()
    })
  })
})