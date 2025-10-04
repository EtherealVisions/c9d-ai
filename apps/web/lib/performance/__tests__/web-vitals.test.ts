import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
import { 
  reportWebVitals, 
  measureResourceTiming,
  optimizeImageLoading,
  optimizeAnimations,
  monitorBundleSize
} from '../web-vitals'
import { trackEvent } from '@/lib/analytics/events'

// Mock web-vitals
vi.mock('web-vitals', () => ({
  getCLS: vi.fn(),
  getFID: vi.fn(),
  getFCP: vi.fn(),
  getLCP: vi.fn(),
  getTTFB: vi.fn()
}))

// Mock analytics
vi.mock('@/lib/analytics/events', () => ({
  trackEvent: vi.fn()
}))

describe('Web Vitals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('reportWebVitals', () => {
    it('registers all web vitals metrics', () => {
      reportWebVitals()

      expect(getCLS).toHaveBeenCalledWith(expect.any(Function))
      expect(getFID).toHaveBeenCalledWith(expect.any(Function))
      expect(getFCP).toHaveBeenCalledWith(expect.any(Function))
      expect(getLCP).toHaveBeenCalledWith(expect.any(Function))
      expect(getTTFB).toHaveBeenCalledWith(expect.any(Function))
    })

    it('handles CLS metric correctly', () => {
      const mockCallback = vi.fn()
      reportWebVitals(mockCallback)

      // Get the handler passed to getCLS
      const clsHandler = (getCLS as any).mock.calls[0][0]
      
      // Simulate CLS metric
      const clsMetric = {
        name: 'CLS',
        value: 0.05,
        delta: 0.05,
        id: 'v3-123',
        entries: [],
        navigationType: 'navigate'
      }

      clsHandler(clsMetric)

      expect(mockCallback).toHaveBeenCalledWith({
        name: 'CLS',
        value: 0.05,
        rating: 'good',
        delta: 0.05,
        entries: []
      })

      expect(trackEvent).toHaveBeenCalledWith({
        type: 'web_vitals',
        action: 'cls',
        metadata: {
          value: 0.05,
          rating: 'good',
          delta: 0.05,
          id: 'v3-123',
          navigationType: 'navigate'
        }
      })
    })

    it('rates metrics correctly', () => {
      const mockCallback = vi.fn()
      reportWebVitals(mockCallback)

      const handlers = {
        cls: (getCLS as any).mock.calls[0][0],
        lcp: (getLCP as any).mock.calls[0][0],
        fid: (getFID as any).mock.calls[0][0]
      }

      // Test good ratings
      handlers.cls({ name: 'CLS', value: 0.05, delta: 0, entries: [] })
      expect(mockCallback).toHaveBeenLastCalledWith(
        expect.objectContaining({ rating: 'good' })
      )

      // Test needs improvement ratings
      handlers.cls({ name: 'CLS', value: 0.15, delta: 0, entries: [] })
      expect(mockCallback).toHaveBeenLastCalledWith(
        expect.objectContaining({ rating: 'needs-improvement' })
      )

      // Test poor ratings
      handlers.cls({ name: 'CLS', value: 0.3, delta: 0, entries: [] })
      expect(mockCallback).toHaveBeenLastCalledWith(
        expect.objectContaining({ rating: 'poor' })
      )
    })

    it('logs metrics in development', () => {
      vi.stubEnv('NODE_ENV', 'development')
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      reportWebVitals()

      const lcpHandler = (getLCP as any).mock.calls[0][0]
      lcpHandler({ name: 'LCP', value: 2000, delta: 0, entries: [] })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Web Vitals] LCP:',
        expect.objectContaining({
          value: '2000.00ms',
          rating: 'good'
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('measureResourceTiming', () => {
    it('categorizes resources correctly', () => {
      const mockResources = [
        { name: 'image.jpg', duration: 100, transferSize: 50000, nextHopProtocol: 'h2' },
        { name: 'script.js', duration: 200, transferSize: 100000, nextHopProtocol: 'h2' },
        { name: 'styles.css', duration: 150, transferSize: 30000, nextHopProtocol: 'h2' },
        { name: 'font.woff2', duration: 80, transferSize: 20000, nextHopProtocol: 'h2' }
      ]

      const originalPerformance = window.performance.getEntriesByType
      window.performance.getEntriesByType = vi.fn(() => mockResources)

      const metrics = measureResourceTiming()

      expect(metrics?.images).toHaveLength(1)
      expect(metrics?.scripts).toHaveLength(1)
      expect(metrics?.stylesheets).toHaveLength(1)
      expect(metrics?.fonts).toHaveLength(1)

      window.performance.getEntriesByType = originalPerformance
    })

    it('returns undefined when performance API is not available', () => {
      vi.stubGlobal('window', undefined)

      const metrics = measureResourceTiming()
      expect(metrics).toBeUndefined()

      vi.unstubAllGlobals()
    })
  })

  describe('optimizeImageLoading', () => {
    it('adds lazy loading to images', () => {
      const mockImages = [
        { setAttribute: vi.fn() },
        { setAttribute: vi.fn() }
      ]

      vi.stubGlobal('document', {
        querySelectorAll: vi.fn((selector) => {
          if (selector === 'img[data-lazy]') return mockImages
          return []
        }),
        head: { appendChild: vi.fn() }
      })

      optimizeImageLoading()

      mockImages.forEach(img => {
        expect(img.setAttribute).toHaveBeenCalledWith('loading', 'lazy')
      })

      vi.unstubAllGlobals()
    })

    it('preloads critical images', () => {
      const mockCriticalImages = [
        { getAttribute: vi.fn(() => '/hero.jpg') }
      ]

      const mockLink = { rel: '', as: '', href: '' }
      
      vi.stubGlobal('document', {
        querySelectorAll: vi.fn((selector) => {
          if (selector === 'img[data-critical]') return mockCriticalImages
          return []
        }),
        createElement: vi.fn(() => mockLink),
        head: { appendChild: vi.fn() }
      })

      optimizeImageLoading()

      expect(mockLink.rel).toBe('preload')
      expect(mockLink.as).toBe('image')
      expect(mockLink.href).toBe('/hero.jpg')

      vi.unstubAllGlobals()
    })
  })

  describe('optimizeAnimations', () => {
    it('adds reduce-motion class when preferred', () => {
      const mockClassList = {
        add: vi.fn()
      }

      vi.stubGlobal('window', {
        matchMedia: vi.fn(() => ({ matches: true }))
      })

      vi.stubGlobal('document', {
        documentElement: { classList: mockClassList },
        addEventListener: vi.fn(),
        querySelectorAll: vi.fn(() => [])
      })

      optimizeAnimations()

      expect(mockClassList.add).toHaveBeenCalledWith('reduce-motion')

      vi.unstubAllGlobals()
    })

    it('pauses animations when page is hidden', () => {
      const mockElements = [
        { classList: { add: vi.fn(), remove: vi.fn() } },
        { classList: { add: vi.fn(), remove: vi.fn() } }
      ]

      let visibilityHandler: Function

      vi.stubGlobal('window', {
        matchMedia: vi.fn(() => ({ matches: false }))
      })

      vi.stubGlobal('document', {
        documentElement: { classList: { add: vi.fn() } },
        addEventListener: vi.fn((event, handler) => {
          if (event === 'visibilitychange') {
            visibilityHandler = handler
          }
        }),
        querySelectorAll: vi.fn(() => mockElements),
        hidden: true
      })

      optimizeAnimations()

      // Trigger visibility change
      visibilityHandler!()

      mockElements.forEach(el => {
        expect(el.classList.add).toHaveBeenCalledWith('animation-paused')
      })

      vi.unstubAllGlobals()
    })
  })

  describe('monitorBundleSize', () => {
    it('returns performance metrics', () => {
      const mockNavigation = {
        domContentLoadedEventEnd: 1500,
        domContentLoadedEventStart: 1400,
        loadEventEnd: 2000,
        loadEventStart: 1900,
        domInteractive: 1000,
        fetchStart: 0,
        responseStart: 300,
        requestStart: 100
      }

      vi.stubGlobal('window', {
        performance: {
          getEntriesByType: vi.fn(() => [mockNavigation])
        }
      })

      const metrics = monitorBundleSize()

      expect(metrics).toEqual({
        domContentLoaded: 100,
        loadComplete: 100,
        domInteractive: 1000,
        firstByte: 200
      })

      vi.unstubAllGlobals()
    })

    it('returns undefined when performance API is not available', () => {
      vi.stubGlobal('window', undefined)

      const metrics = monitorBundleSize()
      expect(metrics).toBeUndefined()

      vi.unstubAllGlobals()
    })
  })
})