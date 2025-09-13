import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnalyticsService } from '@/lib/services/analytics-service'
import { AnalyticsConfig } from '@/lib/types/analytics'

// Mock window and document
const mockWindow = {
  va: vi.fn(),
  gtag: vi.fn(),
  dataLayer: [],
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  },
  sessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  },
  performance: {
    getEntriesByType: vi.fn(() => []),
    now: vi.fn(() => Date.now())
  },
  PerformanceObserver: vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    disconnect: vi.fn()
  }))
}

const mockDocument = {
  createElement: vi.fn(() => ({
    src: '',
    defer: false,
    async: false,
    onload: null,
    innerHTML: ''
  })),
  head: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  },
  title: 'Test Page',
  querySelectorAll: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  documentElement: {
    scrollHeight: 1000,
    scrollTop: 0
  },
  hidden: false
}

// Setup global mocks
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
})

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
})

describe('AnalyticsService', () => {
  const mockConfig: AnalyticsConfig = {
    providers: [
      {
        name: 'vercel',
        enabled: true,
        config: {}
      },
      {
        name: 'google',
        enabled: true,
        config: { measurementId: 'GA_TEST_ID' }
      }
    ],
    enableDebugMode: true,
    enableConsentMode: false,
    defaultConsentState: {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      functionality_storage: 'granted',
      personalization_storage: 'granted'
    },
    customDimensions: {},
    customMetrics: {}
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage mock
    mockWindow.localStorage.getItem.mockReturnValue(null)
    mockWindow.localStorage.setItem.mockClear()
    
    // Reset any static state in AnalyticsService
    ;(AnalyticsService as any).config = null
    ;(AnalyticsService as any).sessionId = null
    ;(AnalyticsService as any).userId = null
    
    // Clear any stored funnel data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('conversion_funnel')
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialize', () => {
    it('should initialize analytics service with config', () => {
      AnalyticsService.initialize(mockConfig, 'test-user-id')

      expect(mockDocument.createElement).toHaveBeenCalledWith('script')
      expect(mockDocument.head.appendChild).toHaveBeenCalled()
    })

    it('should set up performance monitoring', () => {
      // Mock PerformanceObserver constructor to track calls
      const mockObserverInstance = {
        observe: vi.fn(),
        disconnect: vi.fn()
      }
      mockWindow.PerformanceObserver.mockReturnValue(mockObserverInstance)

      AnalyticsService.initialize(mockConfig)

      // Performance monitoring is set up during initialization
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('load', expect.any(Function))
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
    })

    it('should set up error tracking', () => {
      AnalyticsService.initialize(mockConfig)

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
    })
  })

  describe('trackEvent', () => {
    beforeEach(() => {
      // Clear all mocks and reset localStorage
      vi.clearAllMocks()
      mockWindow.localStorage.getItem.mockReturnValue(null)
      mockWindow.localStorage.setItem.mockClear()
      
      // Reset service state
      ;(AnalyticsService as any).config = null
      ;(AnalyticsService as any).sessionId = null
      ;(AnalyticsService as any).userId = null
      
      AnalyticsService.initialize(mockConfig, 'test-user-id')
    })

    it('should track event with Vercel Analytics', () => {
      const event = {
        event: 'test_event',
        category: 'conversion' as const,
        label: 'test_label',
        value: 1
      }

      AnalyticsService.trackEvent(event)

      expect(mockWindow.va).toHaveBeenCalledWith('track', 'test_event', {
        category: 'conversion',
        label: 'test_label',
        value: 1
      })
    })

    it('should track event with Google Analytics', () => {
      const event = {
        event: 'test_event',
        category: 'conversion' as const,
        label: 'test_label',
        value: 1
      }

      AnalyticsService.trackEvent(event)

      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'test_event', {
        event_category: 'conversion',
        event_label: 'test_label',
        value: 1,
        custom_parameter_user_id: 'test-user-id',
        custom_parameter_session_id: expect.any(String)
      })
    })

    it('should store funnel step in localStorage', () => {
      const event = {
        event: 'cta_click',
        category: 'conversion' as const,
        label: 'hero_cta'
      }

      AnalyticsService.trackEvent(event)

      expect(mockWindow.localStorage.setItem).toHaveBeenCalledWith(
        'conversion_funnel',
        expect.stringContaining('cta_click')
      )
    })

    it('should enrich event with timestamp and user info', () => {
      const event = {
        event: 'test_event',
        category: 'engagement' as const
      }

      AnalyticsService.trackEvent(event)

      expect(mockWindow.va).toHaveBeenCalledWith('track', 'test_event', 
        expect.objectContaining({
          category: 'engagement'
        })
      )
    })
  })

  describe('trackEcommerce', () => {
    beforeEach(() => {
      AnalyticsService.initialize(mockConfig)
    })

    it('should track ecommerce event with Google Analytics', () => {
      const ecommerceEvent = {
        event: 'purchase' as const,
        transactionId: 'txn_123',
        value: 99.99,
        currency: 'USD',
        items: [
          {
            itemId: 'item_1',
            itemName: 'Test Product',
            itemCategory: 'Software',
            price: 99.99,
            quantity: 1
          }
        ]
      }

      AnalyticsService.trackEcommerce(ecommerceEvent)

      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'purchase', {
        transaction_id: 'txn_123',
        value: 99.99,
        currency: 'USD',
        items: ecommerceEvent.items,
        coupon: undefined,
        shipping_tier: undefined,
        payment_type: undefined
      })
    })

    it('should track ecommerce event as regular event for other providers', () => {
      const ecommerceEvent = {
        event: 'purchase' as const,
        value: 99.99,
        currency: 'USD',
        items: []
      }

      AnalyticsService.trackEcommerce(ecommerceEvent)

      expect(mockWindow.va).toHaveBeenCalledWith('track', 'purchase', 
        expect.objectContaining({
          category: 'conversion',
          value: 99.99
        })
      )
    })
  })

  describe('trackPerformanceMetrics', () => {
    beforeEach(() => {
      AnalyticsService.initialize(mockConfig)
    })

    it('should track performance metrics', () => {
      const metrics = {
        lcp: 2100,
        fid: 85,
        cls: 0.08,
        fcp: 1800,
        ttfb: 600,
        pageLoadTime: 3200,
        domContentLoaded: 2800,
        resourceLoadTime: 1200
      }

      AnalyticsService.trackPerformanceMetrics(metrics)

      expect(mockWindow.va).toHaveBeenCalledWith('track', 'lcp', 
        expect.objectContaining({
          category: 'performance',
          value: 2100
        })
      )

      expect(mockWindow.va).toHaveBeenCalledWith('track', 'fid', 
        expect.objectContaining({
          category: 'performance',
          value: 85
        })
      )
    })

    it('should skip metrics with zero values', () => {
      const metrics = {
        lcp: 0,
        fid: 85,
        cls: 0,
        fcp: 1800,
        ttfb: 0,
        pageLoadTime: 3200,
        domContentLoaded: 2800,
        resourceLoadTime: 1200
      }

      AnalyticsService.trackPerformanceMetrics(metrics)

      expect(mockWindow.va).not.toHaveBeenCalledWith('track', 'lcp', expect.any(Object))
      expect(mockWindow.va).not.toHaveBeenCalledWith('track', 'cls', expect.any(Object))
      expect(mockWindow.va).not.toHaveBeenCalledWith('track', 'ttfb', expect.any(Object))
    })
  })

  describe('getFunnelData', () => {
    beforeEach(() => {
      // Reset service state completely
      ;(AnalyticsService as any).config = null
      ;(AnalyticsService as any).sessionId = null
      ;(AnalyticsService as any).userId = null
      vi.clearAllMocks()
      mockWindow.localStorage.getItem.mockReturnValue(null)
    })

    it('should return empty array when no data exists', () => {
      mockWindow.localStorage.getItem.mockReturnValue(null)

      const funnelData = AnalyticsService.getFunnelData()

      expect(funnelData).toEqual([])
    })

    it('should return parsed funnel data', () => {
      const mockData = [
        {
          step: 'pageview',
          event: 'pageview',
          category: 'awareness',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      ]
      mockWindow.localStorage.getItem.mockReturnValue(JSON.stringify(mockData))

      const funnelData = AnalyticsService.getFunnelData()

      expect(funnelData).toEqual(mockData)
    })
  })

  describe('analyzeConversionFunnel', () => {
    beforeEach(() => {
      // Reset service state completely
      ;(AnalyticsService as any).config = null
      ;(AnalyticsService as any).sessionId = null
      ;(AnalyticsService as any).userId = null
      vi.clearAllMocks()
      mockWindow.localStorage.getItem.mockReturnValue(null)
      AnalyticsService.initialize(mockConfig)
    })

    it('should analyze conversion funnel with sample data', () => {
      const mockFunnelData = [
        {
          step: 'pageview',
          event: 'pageview',
          category: 'awareness' as const,
          sessionId: 'session_1',
          timestamp: '2024-01-01T00:00:00.000Z'
        },
        {
          step: 'cta_impression',
          event: 'cta_impression',
          category: 'awareness' as const,
          sessionId: 'session_1',
          timestamp: '2024-01-01T00:01:00.000Z'
        },
        {
          step: 'cta_click',
          event: 'cta_click',
          category: 'interest' as const,
          sessionId: 'session_1',
          timestamp: '2024-01-01T00:02:00.000Z'
        }
      ]

      mockWindow.localStorage.getItem.mockReturnValue(JSON.stringify(mockFunnelData))

      const metrics = AnalyticsService.analyzeConversionFunnel()

      expect(metrics).toHaveProperty('totalVisitors')
      expect(metrics).toHaveProperty('totalConversions')
      expect(metrics).toHaveProperty('conversionRate')
      expect(metrics).toHaveProperty('funnelSteps')
      expect(metrics).toHaveProperty('dropOffPoints')
      expect(metrics.totalVisitors).toBeGreaterThan(0)
    })

    it('should handle empty funnel data', () => {
      mockWindow.localStorage.getItem.mockReturnValue('[]')

      const metrics = AnalyticsService.analyzeConversionFunnel()

      expect(metrics.totalVisitors).toBe(0)
      expect(metrics.totalConversions).toBe(0)
      expect(metrics.conversionRate).toBe(0)
      expect(metrics.funnelSteps).toHaveLength(0)
    })
  })

  describe('setUserId', () => {
    beforeEach(() => {
      AnalyticsService.initialize(mockConfig)
    })

    it('should update user ID and configure Google Analytics', () => {
      AnalyticsService.setUserId('new-user-id')

      expect(mockWindow.gtag).toHaveBeenCalledWith('config', 'GA_MEASUREMENT_ID', {
        user_id: 'new-user-id'
      })
    })
  })

  describe('updateConsentState', () => {
    beforeEach(() => {
      AnalyticsService.initialize(mockConfig)
    })

    it('should update consent state with Google Analytics', () => {
      const consentState = {
        analytics_storage: 'granted' as const,
        ad_storage: 'denied' as const
      }

      AnalyticsService.updateConsentState(consentState)

      expect(mockWindow.gtag).toHaveBeenCalledWith('consent', 'update', consentState)
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      // Reset service state completely
      ;(AnalyticsService as any).config = null
      ;(AnalyticsService as any).sessionId = null
      ;(AnalyticsService as any).userId = null
      vi.clearAllMocks()
      mockWindow.localStorage.getItem.mockReturnValue(null)
    })

    it('should handle missing window object gracefully', () => {
      // Temporarily remove window
      const originalWindow = global.window
      delete (global as any).window

      expect(() => {
        AnalyticsService.initialize(mockConfig)
      }).not.toThrow()

      // Restore window
      global.window = originalWindow
    })

    it('should handle localStorage errors gracefully', () => {
      mockWindow.localStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available')
      })

      expect(() => {
        AnalyticsService.getFunnelData()
      }).not.toThrow()
    })

    it('should handle invalid JSON in localStorage', () => {
      mockWindow.localStorage.getItem.mockReturnValue('invalid json')

      expect(() => {
        AnalyticsService.getFunnelData()
      }).not.toThrow()

      const result = AnalyticsService.getFunnelData()
      expect(result).toEqual([])
    })
  })
})