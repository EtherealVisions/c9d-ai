import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { UrgencyIndicator, ScarcityIndicator } from '../ui/urgency-indicator'
import { UrgencyConfig, ScarcityConfig } from '@/lib/types/cta'

// Mock the analytics utilities
const mockTrackUrgencyView = vi.fn()

vi.mock('@/lib/utils/cta-analytics', () => ({
  trackUrgencyView: mockTrackUrgencyView
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />
}))

describe('UrgencyIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render urgency message when enabled', () => {
      const config: UrgencyConfig = {
        enabled: true,
        type: 'limited-time',
        message: 'Limited time offer!'
      }

      render(<UrgencyIndicator config={config} />)

      expect(screen.getByText('Limited time offer!')).toBeInTheDocument()
    })

    it('should not render when disabled', () => {
      const config: UrgencyConfig = {
        enabled: false,
        type: 'limited-time',
        message: 'Limited time offer!'
      }

      render(<UrgencyIndicator config={config} />)

      expect(screen.queryByText('Limited time offer!')).not.toBeInTheDocument()
    })

    it('should render appropriate icon for countdown type', () => {
      const config: UrgencyConfig = {
        enabled: true,
        type: 'countdown',
        message: 'Sale ends soon!'
      }

      render(<UrgencyIndicator config={config} />)

      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    })

    it('should render appropriate icon for beta-access type', () => {
      const config: UrgencyConfig = {
        enabled: true,
        type: 'beta-access',
        message: 'Beta access limited!'
      }

      render(<UrgencyIndicator config={config} />)

      expect(screen.getByTestId('zap-icon')).toBeInTheDocument()
    })
  })

  describe('Countdown Functionality', () => {
    it('should display countdown when type is countdown and endDate is provided', async () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      const config: UrgencyConfig = {
        enabled: true,
        type: 'countdown',
        message: 'Sale ends in:',
        endDate: futureDate,
        countdownText: 'Hurry up!'
      }

      render(<UrgencyIndicator config={config} />)

      await waitFor(() => {
        expect(screen.getByText('02d')).toBeInTheDocument()
        expect(screen.getByText('00h')).toBeInTheDocument()
        expect(screen.getByText('00m')).toBeInTheDocument()
      })

      expect(screen.getByText('Hurry up!')).toBeInTheDocument()
    })

    it('should update countdown every second', async () => {
      const futureDate = new Date(Date.now() + 61 * 1000) // 61 seconds from now
      const config: UrgencyConfig = {
        enabled: true,
        type: 'countdown',
        message: 'Sale ends in:',
        endDate: futureDate
      }

      render(<UrgencyIndicator config={config} />)

      // Initial state
      await waitFor(() => {
        expect(screen.getByText('01m')).toBeInTheDocument()
        expect(screen.getByText('01s')).toBeInTheDocument()
      })

      // Advance time by 1 second
      vi.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('01m')).toBeInTheDocument()
        expect(screen.getByText('00s')).toBeInTheDocument()
      })
    })

    it('should not display countdown when endDate has passed', async () => {
      const pastDate = new Date(Date.now() - 1000) // 1 second ago
      const config: UrgencyConfig = {
        enabled: true,
        type: 'countdown',
        message: 'Sale ended',
        endDate: pastDate
      }

      render(<UrgencyIndicator config={config} />)

      expect(screen.queryByText(/\d+d/)).not.toBeInTheDocument()
      expect(screen.queryByText(/\d+h/)).not.toBeInTheDocument()
      expect(screen.queryByText(/\d+m/)).not.toBeInTheDocument()
      expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument()
    })
  })

  describe('Analytics Tracking', () => {
    it('should track urgency view when component mounts', () => {
      const config: UrgencyConfig = {
        enabled: true,
        type: 'limited-time',
        message: 'Limited time offer!'
      }

      render(<UrgencyIndicator config={config} userId="test-user" />)

      expect(mockTrackUrgencyView).toHaveBeenCalledWith(
        'limited-time',
        'urgency_indicator',
        'test-user'
      )
    })

    it('should track countdown type correctly', () => {
      const config: UrgencyConfig = {
        enabled: true,
        type: 'countdown',
        message: 'Sale ends soon!',
        endDate: new Date(Date.now() + 1000)
      }

      render(<UrgencyIndicator config={config} userId="test-user" />)

      expect(mockTrackUrgencyView).toHaveBeenCalledWith(
        'countdown',
        'urgency_indicator',
        'test-user'
      )
    })
  })
})

describe('ScarcityIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render scarcity message when enabled', () => {
      const config: ScarcityConfig = {
        enabled: true,
        type: 'limited-spots',
        message: 'Only 5 spots left!'
      }

      render(<ScarcityIndicator config={config} />)

      expect(screen.getByText('Only 5 spots left!')).toBeInTheDocument()
    })

    it('should not render when disabled', () => {
      const config: ScarcityConfig = {
        enabled: false,
        type: 'limited-spots',
        message: 'Only 5 spots left!'
      }

      render(<ScarcityIndicator config={config} />)

      expect(screen.queryByText('Only 5 spots left!')).not.toBeInTheDocument()
    })

    it('should render appropriate icon for limited-spots type', () => {
      const config: ScarcityConfig = {
        enabled: true,
        type: 'limited-spots',
        message: 'Limited spots!'
      }

      render(<ScarcityIndicator config={config} />)

      expect(screen.getByTestId('users-icon')).toBeInTheDocument()
    })

    it('should render appropriate icon for beta-slots type', () => {
      const config: ScarcityConfig = {
        enabled: true,
        type: 'beta-slots',
        message: 'Beta slots limited!'
      }

      render(<ScarcityIndicator config={config} />)

      expect(screen.getByTestId('zap-icon')).toBeInTheDocument()
    })
  })

  describe('Progress Bar', () => {
    it('should display progress information when remaining and total are provided', () => {
      const config: ScarcityConfig = {
        enabled: true,
        type: 'limited-spots',
        message: 'Limited availability',
        remaining: 25,
        total: 100
      }

      render(<ScarcityIndicator config={config} />)

      expect(screen.getByText('25 remaining')).toBeInTheDocument()
      expect(screen.getByText('75 taken')).toBeInTheDocument()
    })

    it('should calculate correct progress percentage', () => {
      const config: ScarcityConfig = {
        enabled: true,
        type: 'limited-spots',
        message: 'Limited availability',
        remaining: 20,
        total: 100
      }

      render(<ScarcityIndicator config={config} />)

      const progressBar = document.querySelector('.bg-gradient-to-r.from-orange-500.to-yellow-500')
      expect(progressBar).toHaveStyle({ width: '80%' })
    })

    it('should not display progress bar when remaining or total is not provided', () => {
      const config: ScarcityConfig = {
        enabled: true,
        type: 'limited-spots',
        message: 'Limited availability'
      }

      render(<ScarcityIndicator config={config} />)

      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()
      expect(screen.queryByText(/taken/)).not.toBeInTheDocument()
    })
  })

  describe('Analytics Tracking', () => {
    it('should track scarcity view when component mounts', () => {
      const config: ScarcityConfig = {
        enabled: true,
        type: 'limited-spots',
        message: 'Only 5 spots left!'
      }

      render(<ScarcityIndicator config={config} userId="test-user" />)

      expect(mockTrackUrgencyView).toHaveBeenCalledWith(
        'limited-spots',
        'scarcity_indicator',
        'test-user'
      )
    })

    it('should track different scarcity types correctly', () => {
      const config: ScarcityConfig = {
        enabled: true,
        type: 'early-access',
        message: 'Early access limited!'
      }

      render(<ScarcityIndicator config={config} userId="test-user" />)

      expect(mockTrackUrgencyView).toHaveBeenCalledWith(
        'early-access',
        'scarcity_indicator',
        'test-user'
      )
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const config: ScarcityConfig = {
        enabled: true,
        type: 'limited-spots',
        message: 'Limited spots available',
        remaining: 10,
        total: 50
      }

      render(<ScarcityIndicator config={config} />)

      // Check that progress information is accessible
      expect(screen.getByText('10 remaining')).toBeInTheDocument()
      expect(screen.getByText('40 taken')).toBeInTheDocument()
    })
  })
})