import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { track } from '@vercel/analytics'
import {
  trackEvent,
  trackHeroInteraction,
  trackC9Capability,
  trackCTA,
  trackConversion,
  trackScrollDepth,
  trackPageView,
  trackError
} from '../events'

// Mock Vercel Analytics
vi.mock('@vercel/analytics', () => ({
  track: vi.fn()
}))

describe('Analytics Events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window and document
    vi.stubGlobal('window', {
      location: { href: 'https://c9d.ai/test' }
    })
    vi.stubGlobal('document', {
      referrer: 'https://google.com'
    })
    // Set NODE_ENV to test
    vi.stubEnv('NODE_ENV', 'test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  describe('trackEvent', () => {
    it('tracks event with correct format', () => {
      const event = {
        type: 'test_event' as any,
        action: 'click',
        metadata: { test: true }
      }

      trackEvent(event)

      expect(track).toHaveBeenCalledWith('test_event_click', {
        ...event,
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })

    it('logs to console in development', () => {
      vi.stubEnv('NODE_ENV', 'development')
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      trackEvent({ type: 'test_event' as any, action: 'view' })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Analytics]',
        'test_event_view',
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('trackHeroInteraction', () => {
    it('tracks hero CTA click', () => {
      trackHeroInteraction('cta_click', { buttonText: 'Request Demo' })

      expect(track).toHaveBeenCalledWith('hero_interaction_cta_click', {
        type: 'hero_interaction',
        action: 'cta_click',
        metadata: { buttonText: 'Request Demo' },
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })

    it('tracks hero scroll past', () => {
      trackHeroInteraction('scroll_past')

      expect(track).toHaveBeenCalledWith('hero_interaction_scroll_past', {
        type: 'hero_interaction',
        action: 'scroll_past',
        metadata: undefined,
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })
  })

  describe('trackC9Capability', () => {
    it('tracks capability view', () => {
      trackC9Capability('insight', 'view')

      expect(track).toHaveBeenCalledWith('c9_capability_interaction_view', {
        type: 'c9_capability_interaction',
        capability: 'insight',
        action: 'view',
        industry: undefined,
        metadata: undefined,
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })

    it('tracks capability with industry filter', () => {
      trackC9Capability('persona', 'filter_industry', {
        industry: 'education',
        metadata: { filterCount: 3 }
      })

      expect(track).toHaveBeenCalledWith('c9_capability_interaction_filter_industry', {
        type: 'c9_capability_interaction',
        capability: 'persona',
        action: 'filter_industry',
        industry: 'education',
        metadata: { filterCount: 3 },
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })

    it('tracks API view', () => {
      trackC9Capability('domain', 'view_api')

      expect(track).toHaveBeenCalledWith('c9_capability_interaction_view_api', {
        type: 'c9_capability_interaction',
        capability: 'domain',
        action: 'view_api',
        industry: undefined,
        metadata: undefined,
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })
  })

  describe('trackCTA', () => {
    it('tracks CTA click with all parameters', () => {
      trackCTA('hero', 'click', 'Get Started', '/signup', { variant: 'primary' })

      expect(track).toHaveBeenCalledWith('cta_interaction_click', {
        type: 'cta_interaction',
        location: 'hero',
        action: 'click',
        text: 'Get Started',
        href: '/signup',
        metadata: { variant: 'primary' },
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })

    it('tracks CTA hover', () => {
      trackCTA('capability', 'hover', 'Learn More', '/api/docs')

      expect(track).toHaveBeenCalledWith('cta_interaction_hover', {
        type: 'cta_interaction',
        location: 'capability',
        action: 'hover',
        text: 'Learn More',
        href: '/api/docs',
        metadata: undefined,
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })
  })

  describe('trackConversion', () => {
    it('tracks conversion with value', () => {
      trackConversion('consultation_request', {
        value: 1000,
        capability: 'insight',
        metadata: { source: 'landing_page' }
      })

      expect(track).toHaveBeenCalledWith('conversion_view', {
        type: 'conversion',
        goal: 'consultation_request',
        value: 1000,
        capability: 'insight',
        metadata: { source: 'landing_page' },
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })

    it('tracks conversion without optional parameters', () => {
      trackConversion('newsletter_signup')

      expect(track).toHaveBeenCalledWith('conversion_view', {
        type: 'conversion',
        goal: 'newsletter_signup',
        value: undefined,
        capability: undefined,
        metadata: undefined,
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })
  })

  describe('trackScrollDepth', () => {
    it('tracks scroll depth with section', () => {
      trackScrollDepth(50, 'capabilities', { timeOnPage: 30000 })

      expect(track).toHaveBeenCalledWith('scroll_depth_view', {
        type: 'scroll_depth',
        depth: 50,
        section: 'capabilities',
        metadata: { timeOnPage: 30000 },
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })

    it('tracks scroll depth without section', () => {
      trackScrollDepth(100)

      expect(track).toHaveBeenCalledWith('scroll_depth_view', {
        type: 'scroll_depth',
        depth: 100,
        section: undefined,
        metadata: undefined,
        timestamp: expect.any(String),
        url: 'https://c9d.ai/test',
        referrer: 'https://google.com'
      })
    })
  })

  describe('trackPageView', () => {
    it('tracks page view with metadata', () => {
      trackPageView('landing_page', { isFirstVisit: true })

      expect(track).toHaveBeenCalledWith('page_view', {
        page: 'landing_page',
        isFirstVisit: true
      })
    })

    it('tracks page view without metadata', () => {
      trackPageView('about')

      expect(track).toHaveBeenCalledWith('page_view', {
        page: 'about'
      })
    })
  })

  describe('trackError', () => {
    it('tracks error with context', () => {
      const error = new Error('Test error')
      trackError(error, 'form_submission')

      expect(track).toHaveBeenCalledWith('error', {
        error_message: 'Test error',
        error_stack: error.stack,
        context: 'form_submission',
        timestamp: expect.any(String)
      })
    })

    it('tracks error without context', () => {
      const error = new Error('Another error')
      trackError(error)

      expect(track).toHaveBeenCalledWith('error', {
        error_message: 'Another error',
        error_stack: error.stack,
        context: undefined,
        timestamp: expect.any(String)
      })
    })
  })
})