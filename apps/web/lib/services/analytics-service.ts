import { 
  AnalyticsEvent, 
  ConversionFunnelStep, 
  ABTestConfig, 
  ABTestResult, 
  ConversionMetrics,
  EcommerceEvent,
  AnalyticsConfig,
  HeatmapConfig,
  PerformanceMetrics
} from '@/lib/types/analytics'

export class AnalyticsService {
  private static config: AnalyticsConfig | null = null
  private static sessionId: string | null = null
  private static userId: string | null = null

  static initialize(config: AnalyticsConfig, userId?: string) {
    this.config = config
    this.userId = userId || null
    this.sessionId = this.generateSessionId()

    // Initialize providers
    this.initializeProviders()

    // Set up performance monitoring
    this.initializePerformanceMonitoring()

    // Set up error tracking
    this.initializeErrorTracking()
  }

  private static initializeProviders() {
    if (!this.config) return

    this.config.providers.forEach(provider => {
      if (!provider.enabled) return

      switch (provider.name) {
        case 'vercel':
          this.initializeVercelAnalytics()
          break
        case 'google':
          this.initializeGoogleAnalytics(provider.config.measurementId)
          break
        case 'hotjar':
          this.initializeHotjar(provider.config.siteId)
          break
        default:
          console.warn(`Unknown analytics provider: ${provider.name}`)
      }
    })
  }

  private static initializeVercelAnalytics() {
    if (typeof window === 'undefined') return

    const script = document.createElement('script')
    script.src = 'https://va.vercel-scripts.com/v1/script.js'
    script.defer = true
    script.onload = () => {
      if (window.va) {
        window.va('track', 'pageview')
      }
    }
    document.head.appendChild(script)
  }

  private static initializeGoogleAnalytics(measurementId: string) {
    if (typeof window === 'undefined' || !measurementId) return

    // Load gtag script
    const script1 = document.createElement('script')
    script1.async = true
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    document.head.appendChild(script1)

    // Initialize gtag
    const script2 = document.createElement('script')
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        send_page_view: true,
        custom_map: ${JSON.stringify(this.config?.customDimensions || {})},
        enhanced_measurement: true,
        allow_google_signals: true,
        allow_ad_personalization_signals: false,
        ${this.config?.enableConsentMode && this.config.defaultConsentState ? `
        consent: 'default',
        analytics_storage: '${this.config?.defaultConsentState?.analytics_storage}',
        ad_storage: '${this.config?.defaultConsentState?.ad_storage}',
        functionality_storage: '${this.config?.defaultConsentState?.functionality_storage}',
        personalization_storage: '${this.config.defaultConsentState?.personalization_storage}'
        ` : ''}
      });

      // Enhanced ecommerce tracking setup
      gtag('config', '${measurementId}', {
        currency: 'USD',
        country: 'US'
      });
    `
    document.head.appendChild(script2)

    // Make gtag available globally
    window.gtag = window.gtag || function() {
      (window.dataLayer = window.dataLayer || []).push(arguments)
    }

    // Set up enhanced measurement events
    this.setupEnhancedMeasurement()
  }

  private static setupEnhancedMeasurement() {
    if (typeof window === 'undefined' || !window.gtag) return

    // Track scroll depth
    let maxScrollDepth = 0
    const trackScrollDepth = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = Math.round((scrollTop / docHeight) * 100)
      
      if (scrollPercent > maxScrollDepth && scrollPercent % 25 === 0) {
        maxScrollDepth = scrollPercent
        window.gtag!('event', 'scroll', {
          event_category: 'engagement',
          event_label: `${scrollPercent}%`,
          value: scrollPercent
        })
      }
    }

    window.addEventListener('scroll', trackScrollDepth, { passive: true })

    // Track file downloads
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.href) {
        const url = new URL(link.href)
        const fileExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|exe|dmg)$/i
        
        if (fileExtensions.test(url.pathname)) {
          window.gtag!('event', 'file_download', {
            event_category: 'engagement',
            event_label: url.pathname,
            file_extension: url.pathname.split('.').pop(),
            file_name: url.pathname.split('/').pop()
          })
        }
      }
    })

    // Track outbound links
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.href && link.hostname !== window.location.hostname) {
        window.gtag!('event', 'click', {
          event_category: 'outbound',
          event_label: link.href,
          transport_type: 'beacon'
        })
      }
    })
  }

  private static initializeHotjar(siteId: string) {
    if (typeof window === 'undefined' || !siteId) return

    const script = document.createElement('script')
    script.innerHTML = `
      (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:${siteId},hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
    `
    document.head.appendChild(script)

    // Set up Hotjar event tracking
    this.setupHotjarTracking()
  }

  private static setupHotjarTracking() {
    if (typeof window === 'undefined') return

    // Wait for Hotjar to load
    const checkHotjar = () => {
      if ((window as any).hj) {
        this.configureHotjarSettings()
      } else {
        setTimeout(checkHotjar, 100)
      }
    }
    checkHotjar()
  }

  private static configureHotjarSettings() {
    const hj = (window as any).hj

    // Set user attributes for better segmentation
    if (this.userId) {
      hj('identify', this.userId, {
        user_type: 'authenticated',
        session_id: this.sessionId
      })
    }

    // Track form abandonment
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const form = target.closest('form')
        if (form && !form.dataset.hjTracked) {
          form.dataset.hjTracked = 'true'
          hj('event', 'form_start')
        }
      }
    })

    // Track rage clicks (multiple rapid clicks)
    let clickCount = 0
    let clickTimer: NodeJS.Timeout
    document.addEventListener('click', (event) => {
      clickCount++
      clearTimeout(clickTimer)
      
      clickTimer = setTimeout(() => {
        if (clickCount >= 3) {
          hj('event', 'rage_click')
        }
        clickCount = 0
      }, 1000)
    })

    // Track dead clicks (clicks that don't result in navigation)
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const isInteractive = target.tagName === 'A' || 
                           target.tagName === 'BUTTON' || 
                           target.onclick !== null ||
                           target.closest('a, button, [onclick]')

      if (!isInteractive) {
        setTimeout(() => {
          if (window.location.href === (event as any).originalUrl) {
            hj('event', 'dead_click')
          }
        }, 100)
      }
      
      ;(event as any).originalUrl = window.location.href
    })
  }

  private static initializePerformanceMonitoring() {
    if (typeof window === 'undefined') return

    // Core Web Vitals monitoring
    this.observePerformanceMetrics()

    // Page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          // Track individual performance metrics
          this.trackEvent({
            event: 'page_load_performance',
            category: 'performance',
            properties: {
              fcp: navigation.responseStart - navigation.fetchStart,
              ttfb: navigation.responseStart - navigation.requestStart,
              pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
              resourceLoadTime: navigation.loadEventEnd - navigation.responseEnd
            }
          })
        }
      }, 0)
    })
  }

  private static observePerformanceMetrics() {
    if (typeof window === 'undefined') return

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.trackEvent({
        event: 'lcp',
        category: 'performance',
        value: Math.round(lastEntry.startTime),
        properties: { metric: 'largest_contentful_paint' }
      })
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        this.trackEvent({
          event: 'fid',
          category: 'performance',
          value: Math.round(entry.processingStart - entry.startTime),
          properties: { metric: 'first_input_delay' }
        })
      })
    }).observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift
    let clsValue = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      }
      this.trackEvent({
        event: 'cls',
        category: 'performance',
        value: Math.round(clsValue * 1000) / 1000,
        properties: { metric: 'cumulative_layout_shift' }
      })
    }).observe({ entryTypes: ['layout-shift'] })
  }

  private static initializeErrorTracking() {
    if (typeof window === 'undefined') return

    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackEvent({
        event: 'javascript_error',
        category: 'error',
        label: event.error?.message || 'Unknown error',
        properties: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent({
        event: 'unhandled_promise_rejection',
        category: 'error',
        label: event.reason?.message || 'Unknown promise rejection',
        properties: {
          reason: event.reason?.toString(),
          stack: event.reason?.stack
        }
      })
    })
  }

  static trackEvent(event: AnalyticsEvent) {
    if (!this.config) return

    const enrichedEvent: AnalyticsEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
      userId: event.userId || this.userId || undefined,
      sessionId: event.sessionId || this.sessionId || undefined
    }

    // Track with enabled providers
    this.config.providers.forEach(provider => {
      if (!provider.enabled) return

      switch (provider.name) {
        case 'vercel':
          this.trackWithVercel(enrichedEvent)
          break
        case 'google':
          this.trackWithGoogle(enrichedEvent)
          break
        case 'hotjar':
          this.trackWithHotjar(enrichedEvent)
          break
      }
    })

    // Store for funnel analysis
    this.storeFunnelStep(enrichedEvent)

    // Debug logging
    if (this.config.enableDebugMode && process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', enrichedEvent)
    }
  }

  private static trackWithVercel(event: AnalyticsEvent) {
    if (typeof window !== 'undefined' && window.va) {
      window.va('track', event.event || event.name || 'unknown', {
        category: event.category,
        label: event.label,
        value: event.value,
        ...event.properties
      })
    }
  }

  private static trackWithGoogle(event: AnalyticsEvent) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        custom_parameter_user_id: event.userId,
        custom_parameter_session_id: event.sessionId,
        ...event.properties
      })
    }
  }

  private static trackWithHotjar(event: AnalyticsEvent) {
    if (typeof window !== 'undefined' && (window as any).hj) {
      (window as any).hj('event', event.event)
    }
  }

  static trackEcommerce(event: EcommerceEvent) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: event.transactionId,
        value: event.value,
        currency: event.currency,
        items: event.items,
        coupon: event.coupon
      })
    }

    // Track as regular event for other providers
    this.trackEvent({
      event: 'purchase',
      category: 'conversion',
      value: event.value,
      properties: {
        transaction_id: event.transactionId,
        currency: event.currency,
        items_count: event.items.length,
        coupon: event.coupon
      }
    })
  }



  private static storeFunnelStep(event: AnalyticsEvent) {
    if (typeof window === 'undefined') return

    try {
      const funnelStep: ConversionFunnelStep = {
        id: event.event || 'unknown',
        name: event.event || 'Unknown Event',
        description: `${event.category || 'general'} event`,
        order: Date.now() // Use timestamp as order for now
      }

      const existingData = window.localStorage.getItem('conversion_funnel')
      const funnelData = existingData ? JSON.parse(existingData) : []

      funnelData.push(funnelStep)

      // Keep only last 100 steps
      if (funnelData.length > 100) {
        funnelData.splice(0, funnelData.length - 100)
      }

      window.localStorage.setItem('conversion_funnel', JSON.stringify(funnelData))
    } catch (error) {
      // Handle localStorage errors gracefully
      console.warn('Failed to store funnel step:', error)
    }
  }

  static getFunnelData(): ConversionFunnelStep[] {
    if (typeof window === 'undefined') return []
    
    try {
      const data = window.localStorage.getItem('conversion_funnel')
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.warn('Failed to parse funnel data:', error)
      return []
    }
  }

  static analyzeConversionFunnel(): ConversionMetrics {
    const funnelData = this.getFunnelData()
    const sessions = this.groupBySession(funnelData)
    
    // If no data, return empty metrics
    if (sessions.length === 0) {
      return {
        totalVisitors: 0,
        totalConversions: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        averageTimeToConvert: 0,
        revenue: 0,
        period: 'last_30_days',
        dropOffPoints: [],
        funnelSteps: []
      }
    }
    
    const funnelSteps = [
      'pageview',
      'cta_impression',
      'cta_click',
      'form_start',
      'form_submit',
      'conversion'
    ]

    const stepMetrics = funnelSteps.map((step, index) => {
      const stepSessions = sessions.filter(session => 
        session.some(event => event.id === step)
      )
      const nextStep = funnelSteps[index + 1]
      const nextStepSessions = nextStep ? sessions.filter(session =>
        session.some(event => event.id === nextStep)
      ) : []

      const visitors = stepSessions.length
      const conversions = nextStepSessions.length
      const conversionRate = visitors > 0 ? (conversions / visitors) * 100 : 0
      const dropOffRate = 100 - conversionRate

      const averageTime = this.calculateAverageTime(stepSessions, step, nextStep)

      return {
        step,
        visitors,
        conversions,
        conversionRate,
        averageTime,
        dropOffRate
      }
    })

    const totalVisitors = sessions.length
    const totalConversions = sessions.filter(session =>
      session.some(event => event.id === 'conversion')
    ).length

    return {
      totalVisitors,
      totalConversions,
      conversionRate: totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0,
      averageTimeToConvert: this.calculateAverageTimeToConvert(sessions),
      dropOffPoints: this.identifyDropOffPoints(stepMetrics),
      funnelSteps: stepMetrics
    }
  }

  private static groupBySession(funnelData: ConversionFunnelStep[]): ConversionFunnelStep[][] {
    const sessionMap = new Map<string, ConversionFunnelStep[]>()
    
    funnelData.forEach(step => {
      const sessionId = step.sessionId || 'anonymous'
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, [])
      }
      sessionMap.get(sessionId)!.push(step)
    })

    return Array.from(sessionMap.values())
  }

  private static calculateAverageTime(sessions: ConversionFunnelStep[][], fromStep: string, toStep?: string): number {
    if (!toStep) return 0

    const times: number[] = []
    
    sessions.forEach(session => {
      const fromEvent = session.find(event => event.id === fromStep)
      const toEvent = session.find(event => event.id === toStep)
      
      if (fromEvent && toEvent && fromEvent.timestamp && toEvent.timestamp) {
        const timeDiff = new Date(toEvent.timestamp).getTime() - new Date(fromEvent.timestamp).getTime()
        times.push(timeDiff)
      }
    })

    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0
  }

  private static calculateAverageTimeToConvert(sessions: ConversionFunnelStep[][]): number {
    const conversionTimes: number[] = []

    sessions.forEach(session => {
      const firstEvent = session[0]
      const conversionEvent = session.find(event => event.step === 'conversion')
      
      if (firstEvent && conversionEvent && firstEvent.timestamp && conversionEvent.timestamp) {
        const timeDiff = new Date(conversionEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime()
        conversionTimes.push(timeDiff)
      }
    })

    return conversionTimes.length > 0 ? 
      conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length : 0
  }

  private static identifyDropOffPoints(stepMetrics: any[]) {
    return stepMetrics
      .filter(step => step.dropOffRate > 50) // High drop-off threshold
      .map(step => ({
        step: step.step,
        visitors: step.visitors,
        dropOffRate: step.dropOffRate,
        commonExitPages: [] // Would need additional tracking to populate
      }))
  }

  private static getCategoryFromEvent(event: string): ConversionFunnelStep['category'] {
    if (event.includes('pageview') || event.includes('impression')) return 'awareness'
    if (event.includes('click') || event.includes('hover')) return 'interest'
    if (event.includes('form') || event.includes('demo')) return 'consideration'
    if (event.includes('signup') || event.includes('trial')) return 'evaluation'
    if (event.includes('purchase') || event.includes('subscribe')) return 'intent'
    if (event.includes('conversion') || event.includes('complete')) return 'conversion'
    return 'interest'
  }

  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static setUserId(userId: string) {
    this.userId = userId
    
    // Update Google Analytics user ID
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        user_id: userId
      })
    }
  }

  static updateConsentState(consentState: Record<string, 'granted' | 'denied'>) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', consentState)
    }
  }
}

// Global type declarations
declare global {
  interface Window {
    va?: (event: string, name: string, data?: any) => void
    gtag?: (command: string, ...args: any[]) => void
    dataLayer?: any[]
    hj?: (event: string, name: string) => void
  }
}