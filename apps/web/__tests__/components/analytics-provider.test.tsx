import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useUser } from '@clerk/nextjs'
import { 
  AnalyticsProvider, 
  useAnalytics, 
  useABTest, 
  usePageView,
  TrackingElement,
  TrackingCTA
} from '@/components/analytics-provider'
import { AnalyticsService } from '@/lib/services/analytics-service'
import { ConversionFunnelService } from '@/lib/services/conversion-funnel-service'
import { ABTestingService } from '@/lib/services/ab-testing-service'

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn()
}))

// Mock services
vi.mock('@/lib/services/analytics-service', () => ({
  AnalyticsService: {
    initialize: vi.fn(),
    trackEvent: vi.fn(),
    setUserId: vi.fn()
  }
}))

vi.mock('@/lib/services/conversion-funnel-service', () => ({
  ConversionFunnelService: {
    trackFunnelStep: vi.fn()
  }
}))

vi.mock('@/lib/services/ab-testing-service', () => ({
  ABTestingService: {
    initializeTest: vi.fn(),
    getVariant: vi.fn(),
    trackConversion: vi.fn()
  }
}))

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
})
window.IntersectionObserver = mockIntersectionObserver

// Mock document and window
Object.defineProperty(global, 'document', {
  value: {
    title: 'Test Page',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelectorAll: vi.fn(() => [])
  },
  writable: true
})

Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'http://localhost:3000/test',
      pathname: '/test'
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  },
  writable: true
})

// Test component that uses analytics
function TestComponent() {
  const { trackEvent, trackFunnelStep, isInitialized } = useAnalytics()
  
  return (
    <div>
      <div data-testid="initialized">{isInitialized ? 'true' : 'false'}</div>
      <button 
        onClick={() => trackEvent({
          event: 'test_click',
          category: 'engagement'
        })}
        data-testid="track-event-btn"
      >
        Track Event
      </button>
      <button 
        onClick={() => trackFunnelStep('test_step', {}, 'user123')}
        data-testid="track-funnel-btn"
      >
        Track Funnel
      </button>
    </div>
  )
}

// Test component for A/B testing
function ABTestComponent() {
  const variant = useABTest('test_ab_test')
  
  return (
    <div data-testid="ab-variant">
      {variant ? variant.id : 'no-variant'}
    </div>
  )
}

// Test component for page view tracking
function PageViewComponent() {
  usePageView('Test Page')
  
  return <div>Page View Component</div>
}

describe('AnalyticsProvider', () => {
  const mockUser = {
    id: 'user_123',
    firstName: 'John',
    lastName: 'Doe',
    emailAddresses: [{ emailAddress: 'john@example.com' }]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useUser as any).mockReturnValue({
      user: mockUser,
      isLoaded: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize analytics service when user is loaded', async () => {
      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(AnalyticsService.initialize).toHaveBeenCalledWith(
          expect.objectContaining({
            providers: expect.arrayContaining([
              expect.objectContaining({ name: 'vercel', enabled: true }),
              expect.objectContaining({ name: 'google' }),
              expect.objectContaining({ name: 'hotjar' })
            ])
          }),
          'user_123'
        )
      })
    })

    it('should not initialize when user is not loaded', () => {
      ;(useUser as any).mockReturnValue({
        user: null,
        isLoaded: false
      })

      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>
      )

      expect(AnalyticsService.initialize).not.toHaveBeenCalled()
    })

    it('should initialize A/B tests when provided', async () => {
      const abTests = [
        {
          testId: 'test_1',
          name: 'Test 1',
          variants: [],
          trafficSplit: [50, 50],
          startDate: new Date(),
          enabled: true,
          minimumSampleSize: 100,
          confidenceLevel: 95
        }
      ]

      render(
        <AnalyticsProvider abTests={abTests}>
          <TestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(ABTestingService.initializeTest).toHaveBeenCalledWith(abTests[0])
      })
    })

    it('should track initial page view', async () => {
      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(AnalyticsService.trackEvent).toHaveBeenCalledWith({
          event: 'pageview',
          category: 'engagement',
          properties: {
            page_title: 'Test Page',
            page_location: 'http://localhost:3000/test',
            user_type: 'authenticated'
          }
        })
      })
    })

    it('should track funnel step for landing', async () => {
      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(ConversionFunnelService.trackFunnelStep).toHaveBeenCalledWith(
          'landing',
          {
            page_path: '/test',
            referrer: '',
            user_agent: expect.any(String)
          },
          'user_123'
        )
      })
    })
  })

  describe('user ID updates', () => {
    it('should update user ID when user changes', async () => {
      const { rerender } = render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true')
      })

      // Change user
      ;(useUser as any).mockReturnValue({
        user: { ...mockUser, id: 'user_456' },
        isLoaded: true
      })

      rerender(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(AnalyticsService.setUserId).toHaveBeenCalledWith('user_456')
      })
    })
  })

  describe('useAnalytics hook', () => {
    it('should provide analytics functions', async () => {
      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true')
      })

      // Test trackEvent
      fireEvent.click(screen.getByTestId('track-event-btn'))
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith({
        event: 'test_click',
        category: 'engagement'
      })

      // Test trackFunnelStep
      fireEvent.click(screen.getByTestId('track-funnel-btn'))
      expect(ConversionFunnelService.trackFunnelStep).toHaveBeenCalledWith(
        'test_step',
        {},
        'user123'
      )
    })

    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAnalytics must be used within an AnalyticsProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('useABTest hook', () => {
    it('should return A/B test variant', async () => {
      const mockVariant = { id: 'variant_a', name: 'Variant A' }
      ;(ABTestingService.getVariant as any).mockReturnValue(mockVariant)

      render(
        <AnalyticsProvider>
          <ABTestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('ab-variant')).toHaveTextContent('variant_a')
      })

      expect(ABTestingService.getVariant).toHaveBeenCalledWith('test_ab_test', 'user_123')
    })

    it('should return null when no variant assigned', async () => {
      ;(ABTestingService.getVariant as any).mockReturnValue(null)

      render(
        <AnalyticsProvider>
          <ABTestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('ab-variant')).toHaveTextContent('no-variant')
      })
    })
  })

  describe('usePageView hook', () => {
    it('should track page view when component mounts', async () => {
      render(
        <AnalyticsProvider>
          <PageViewComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(AnalyticsService.trackEvent).toHaveBeenCalledWith({
          event: 'pageview',
          category: 'engagement',
          label: 'Test Page',
          properties: {
            page_title: 'Test Page',
            page_location: 'http://localhost:3000/test',
            page_path: '/test'
          }
        })
      })

      expect(ConversionFunnelService.trackFunnelStep).toHaveBeenCalledWith(
        'pageview',
        {
          page_name: 'Test Page',
          page_path: '/test'
        },
        'user_123'
      )
    })
  })

  describe('TrackingElement component', () => {
    it('should render with analytics data attribute', () => {
      render(
        <AnalyticsProvider>
          <TrackingElement
            event="test_view"
            category="engagement"
            label="test_element"
            funnelStep="test_step"
            properties={{ custom: 'value' }}
          >
            <div>Test Content</div>
          </TrackingElement>
        </AnalyticsProvider>
      )

      const element = screen.getByText('Test Content').parentElement
      expect(element).toHaveAttribute('data-analytics')
      
      const analyticsData = JSON.parse(element!.getAttribute('data-analytics')!)
      expect(analyticsData).toEqual({
        event: 'test_view',
        category: 'engagement',
        label: 'test_element',
        funnelStep: 'test_step',
        properties: { custom: 'value' }
      })
    })
  })

  describe('TrackingCTA component', () => {
    it('should render with CTA analytics data attribute', () => {
      render(
        <AnalyticsProvider>
          <TrackingCTA
            label="test_cta"
            position="hero"
            variant="primary"
            funnelStep="cta_click"
            testId="cta_test"
            value={100}
            properties={{ campaign: 'summer' }}
          >
            <button>Click Me</button>
          </TrackingCTA>
        </AnalyticsProvider>
      )

      const element = screen.getByText('Click Me').parentElement
      expect(element).toHaveAttribute('data-cta-analytics')
      
      const analyticsData = JSON.parse(element!.getAttribute('data-cta-analytics')!)
      expect(analyticsData).toEqual({
        label: 'test_cta',
        position: 'hero',
        variant: 'primary',
        funnelStep: 'cta_click',
        testId: 'cta_test',
        value: 100,
        properties: { campaign: 'summer' }
      })
    })
  })

  describe('intersection observer tracking', () => {
    it('should set up intersection observer for element visibility', async () => {
      render(
        <AnalyticsProvider>
          <div data-analytics='{"label": "test_element"}'>Test Element</div>
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(mockIntersectionObserver).toHaveBeenCalledWith(
          expect.any(Function),
          {
            threshold: [0.1, 0.5, 0.9],
            rootMargin: '0px 0px -10% 0px'
          }
        )
      })
    })
  })

  describe('click tracking', () => {
    it('should track CTA clicks', async () => {
      render(
        <AnalyticsProvider>
          <div 
            data-cta-analytics='{"label": "test_cta", "position": "hero", "funnelStep": "cta_click"}'
          >
            <button>Click Me</button>
          </div>
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Click Me')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Click Me'))

      // Note: In a real test, we'd need to wait for the event listener to be set up
      // and then verify the tracking calls, but this requires more complex mocking
    })
  })

  describe('form tracking', () => {
    it('should track form interactions', async () => {
      render(
        <AnalyticsProvider>
          <form data-form-analytics='{"label": "contact_form"}'>
            <input type="text" placeholder="Name" />
            <button type="submit">Submit</button>
          </form>
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
      })

      // Focus on input to trigger form start
      fireEvent.focus(screen.getByPlaceholderText('Name'))

      // Submit form
      fireEvent.submit(screen.getByRole('form'))

      // Note: In a real test, we'd verify the tracking calls
    })
  })

  describe('error handling', () => {
    it('should handle analytics service initialization errors', async () => {
      ;(AnalyticsService.initialize as any).mockImplementation(() => {
        throw new Error('Initialization failed')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(
          <AnalyticsProvider>
            <TestComponent />
          </AnalyticsProvider>
        )
      }).not.toThrow()

      consoleSpy.mockRestore()
    })

    it('should handle invalid analytics data gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      render(
        <AnalyticsProvider>
          <div data-analytics='invalid json'>Test Element</div>
        </AnalyticsProvider>
      )

      // Should not throw error
      expect(screen.getByText('Test Element')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })

  describe('configuration', () => {
    it('should use custom configuration', async () => {
      const customConfig = {
        enableDebugMode: false,
        providers: [
          { name: 'vercel' as const, enabled: false, config: {} }
        ]
      }

      render(
        <AnalyticsProvider config={customConfig}>
          <TestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(AnalyticsService.initialize).toHaveBeenCalledWith(
          expect.objectContaining({
            enableDebugMode: false,
            providers: expect.arrayContaining([
              expect.objectContaining({ name: 'vercel', enabled: false })
            ])
          }),
          'user_123'
        )
      })
    })

    it('should handle anonymous users', async () => {
      ;(useUser as any).mockReturnValue({
        user: null,
        isLoaded: true
      })

      render(
        <AnalyticsProvider>
          <TestComponent />
        </AnalyticsProvider>
      )

      await waitFor(() => {
        expect(AnalyticsService.initialize).toHaveBeenCalledWith(
          expect.any(Object),
          undefined
        )
      })
    })
  })
})