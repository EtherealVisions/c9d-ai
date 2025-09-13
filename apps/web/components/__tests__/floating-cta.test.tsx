import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FloatingCTA } from '../floating-cta'
import { FloatingCTAConfig } from '@/lib/types/cta'

// Mock the analytics utilities
const mockTrackCTAClick = vi.fn()
const mockTrackCTAImpression = vi.fn()

vi.mock('@/lib/utils/cta-analytics', () => ({
  trackCTAClick: mockTrackCTAClick,
  trackCTAImpression: mockTrackCTAImpression
}))

// Mock the scroll behavior hook
vi.mock('@/hooks/use-scroll-behavior', () => ({
  useScrollBehavior: vi.fn(() => ({
    isVisible: true,
    currentSection: null
  }))
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon" />,
  CalendarCheckIcon: () => <div data-testid="calendar-icon" />
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('FloatingCTA', () => {
  const mockConfig: FloatingCTAConfig = {
    enabled: true,
    showAfterScroll: 300,
    hideOnSections: ['hero'],
    position: 'bottom-right',
    dismissible: true,
    cta: {
      id: 'floating-test',
      text: 'Get Started',
      href: '/get-started',
      variant: 'primary',
      tracking: {
        event: 'floating_cta_click',
        category: 'conversion',
        label: 'floating_test',
        value: 50
      },
      weight: 100
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render floating CTA when enabled and visible', () => {
      render(<FloatingCTA config={mockConfig} />)

      expect(screen.getByText('Ready to get started?')).toBeInTheDocument()
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })

    it('should not render when disabled', () => {
      const disabledConfig = { ...mockConfig, enabled: false }
      render(<FloatingCTA config={disabledConfig} />)

      expect(screen.queryByText('Ready to get started?')).not.toBeInTheDocument()
    })

    it('should not render when dismissed', () => {
      localStorageMock.getItem.mockReturnValue('true')
      render(<FloatingCTA config={mockConfig} />)

      expect(screen.queryByText('Ready to get started?')).not.toBeInTheDocument()
    })

    it('should render dismiss button when dismissible', () => {
      render(<FloatingCTA config={mockConfig} />)

      expect(screen.getByLabelText('Dismiss')).toBeInTheDocument()
    })

    it('should not render dismiss button when not dismissible', () => {
      const nonDismissibleConfig = { ...mockConfig, dismissible: false }
      render(<FloatingCTA config={nonDismissibleConfig} />)

      expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument()
    })
  })

  describe('Positioning', () => {
    it('should apply bottom-right positioning classes', () => {
      render(<FloatingCTA config={mockConfig} />)

      const container = screen.getByText('Ready to get started?').closest('.fixed')
      expect(container).toHaveClass('bottom-6', 'right-6')
    })

    it('should apply bottom-left positioning classes', () => {
      const leftConfig = { ...mockConfig, position: 'bottom-left' as const }
      render(<FloatingCTA config={leftConfig} />)

      const container = screen.getByText('Ready to get started?').closest('.fixed')
      expect(container).toHaveClass('bottom-6', 'left-6')
    })

    it('should apply bottom-center positioning classes', () => {
      const centerConfig = { ...mockConfig, position: 'bottom-center' as const }
      render(<FloatingCTA config={centerConfig} />)

      const container = screen.getByText('Ready to get started?').closest('.fixed')
      expect(container).toHaveClass('bottom-6', 'left-1/2', 'transform', '-translate-x-1/2')
    })
  })

  describe('Dismiss Functionality', () => {
    it('should hide CTA when dismiss button is clicked', () => {
      render(<FloatingCTA config={mockConfig} />)

      const dismissButton = screen.getByLabelText('Dismiss')
      fireEvent.click(dismissButton)

      expect(screen.queryByText('Ready to get started?')).not.toBeInTheDocument()
    })

    it('should save dismiss state to localStorage when dismissible', () => {
      render(<FloatingCTA config={mockConfig} />)

      const dismissButton = screen.getByLabelText('Dismiss')
      fireEvent.click(dismissButton)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'floating-cta-dismissed-floating-test',
        'true'
      )
    })

    it('should not save to localStorage when not dismissible', () => {
      const nonDismissibleConfig = { ...mockConfig, dismissible: false }
      render(<FloatingCTA config={nonDismissibleConfig} />)

      // Since there's no dismiss button, we can't test the click
      // But we can verify localStorage is not called during render
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  describe('Analytics Tracking', () => {
    it('should track impression when CTA becomes visible', async () => {
      render(<FloatingCTA config={mockConfig} userId="test-user" />)

      await waitFor(() => {
        expect(mockTrackCTAImpression).toHaveBeenCalledWith(
          'floating-cta',
          mockConfig.cta,
          'floating',
          'test-user'
        )
      })
    })

    it('should track click when CTA is clicked', () => {
      render(<FloatingCTA config={mockConfig} userId="test-user" />)

      const ctaButton = screen.getByText('Get Started')
      fireEvent.click(ctaButton)

      expect(mockTrackCTAClick).toHaveBeenCalledWith(
        'floating-cta',
        mockConfig.cta,
        'floating',
        'test-user'
      )
    })

    it('should track impression only once', async () => {
      const { rerender } = render(<FloatingCTA config={mockConfig} userId="test-user" />)

      await waitFor(() => {
        expect(mockTrackCTAImpression).toHaveBeenCalledTimes(1)
      })

      // Re-render component
      rerender(<FloatingCTA config={mockConfig} userId="test-user" />)

      // Should still only be called once
      expect(mockTrackCTAImpression).toHaveBeenCalledTimes(1)
    })
  })

  describe('Scroll Behavior Integration', () => {
    it('should not render when scroll behavior indicates not visible', () => {
      const mockUseScrollBehavior = vi.mocked(require('@/hooks/use-scroll-behavior').useScrollBehavior)
      mockUseScrollBehavior.mockReturnValue({
        isVisible: false,
        currentSection: null
      })

      render(<FloatingCTA config={mockConfig} />)

      expect(screen.queryByText('Ready to get started?')).not.toBeInTheDocument()
    })

    it('should not render when current section is in hideOnSections', () => {
      const mockUseScrollBehavior = vi.mocked(require('@/hooks/use-scroll-behavior').useScrollBehavior)
      mockUseScrollBehavior.mockReturnValue({
        isVisible: true,
        currentSection: 'hero'
      })

      render(<FloatingCTA config={mockConfig} />)

      expect(screen.queryByText('Ready to get started?')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<FloatingCTA config={mockConfig} />)

      expect(screen.getByLabelText('Dismiss')).toBeInTheDocument()
    })

    it('should have accessible CTA button', () => {
      render(<FloatingCTA config={mockConfig} />)

      const ctaButton = screen.getByRole('link', { name: /get started/i })
      expect(ctaButton).toHaveAttribute('href', '/get-started')
    })
  })

  describe('Animation Classes', () => {
    it('should apply entrance animation classes', () => {
      render(<FloatingCTA config={mockConfig} />)

      const container = screen.getByText('Ready to get started?').closest('.fixed')
      expect(container).toHaveClass('animate-in', 'slide-in-from-bottom-2', 'fade-in')
    })

    it('should apply floating animation classes to background elements', () => {
      render(<FloatingCTA config={mockConfig} />)

      const floatingElements = document.querySelectorAll('.animate-gentle-float-1, .animate-gentle-float-2')
      expect(floatingElements.length).toBeGreaterThan(0)
    })
  })
})