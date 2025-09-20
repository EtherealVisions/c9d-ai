/**
 * Authentication Analytics and Event Tracking
 * 
 * This module provides comprehensive analytics for authentication flows including:
 * - User authentication events tracking
 * - Performance monitoring for auth flows and API calls
 * - Sign-up rates and user engagement metrics
 * - Conversion funnel analysis
 */

// Types for authentication analytics
export interface AuthEvent {
  eventType: AuthEventType
  userId?: string
  sessionId?: string
  timestamp: number
  metadata: Record<string, any>
  userAgent?: string
  ipAddress?: string
  referrer?: string
  utm?: UTMParameters
}

export interface UTMParameters {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}

export interface AuthMetrics {
  signUpRate: number
  signInRate: number
  conversionRate: number
  abandonmentRate: number
  averageSessionDuration: number
  errorRate: number
  socialAuthUsage: Record<string, number>
  deviceBreakdown: Record<string, number>
}

export interface PerformanceMetrics {
  averageLoadTime: number
  averageRenderTime: number
  averageApiResponseTime: number
  errorRate: number
  cacheHitRate: number
  bounceRate: number
}

export interface FunnelStep {
  step: string
  users: number
  conversionRate: number
  dropOffRate: number
  averageTime: number
}

export enum AuthEventType {
  // Page events
  PAGE_VIEW = 'page_view',
  PAGE_EXIT = 'page_exit',
  
  // Authentication events
  SIGN_UP_STARTED = 'sign_up_started',
  SIGN_UP_COMPLETED = 'sign_up_completed',
  SIGN_UP_FAILED = 'sign_up_failed',
  SIGN_IN_STARTED = 'sign_in_started',
  SIGN_IN_COMPLETED = 'sign_in_completed',
  SIGN_IN_FAILED = 'sign_in_failed',
  
  // Social authentication
  SOCIAL_AUTH_STARTED = 'social_auth_started',
  SOCIAL_AUTH_COMPLETED = 'social_auth_completed',
  SOCIAL_AUTH_FAILED = 'social_auth_failed',
  
  // Password management
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  PASSWORD_CHANGED = 'password_changed',
  
  // Email verification
  EMAIL_VERIFICATION_SENT = 'email_verification_sent',
  EMAIL_VERIFICATION_COMPLETED = 'email_verification_completed',
  EMAIL_VERIFICATION_FAILED = 'email_verification_failed',
  
  // Two-factor authentication
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  TWO_FACTOR_VERIFIED = 'two_factor_verified',
  TWO_FACTOR_FAILED = 'two_factor_failed',
  
  // Form interactions
  FORM_FIELD_FOCUSED = 'form_field_focused',
  FORM_FIELD_BLURRED = 'form_field_blurred',
  FORM_VALIDATION_ERROR = 'form_validation_error',
  FORM_SUBMITTED = 'form_submitted',
  
  // Performance events
  PERFORMANCE_SLOW_LOAD = 'performance_slow_load',
  PERFORMANCE_ERROR = 'performance_error',
  CACHE_HIT = 'cache_hit',
  CACHE_MISS = 'cache_miss',
  
  // User engagement
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  USER_IDLE = 'user_idle',
  USER_ACTIVE = 'user_active',
  
  // Errors
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  SYSTEM_ERROR = 'system_error'
}

/**
 * Authentication Analytics Service
 */
export class AuthAnalytics {
  private static instance: AuthAnalytics
  private events: AuthEvent[] = []
  private sessionId: string
  private userId?: string
  private isEnabled: boolean = true
  private batchSize: number = 10
  private flushInterval: number = 30000 // 30 seconds
  private flushTimer?: NodeJS.Timeout

  constructor() {
    this.sessionId = this.generateSessionId()
    this.startBatchFlush()
    this.setupEventListeners()
  }

  static getInstance(): AuthAnalytics {
    if (!AuthAnalytics.instance) {
      AuthAnalytics.instance = new AuthAnalytics()
    }
    return AuthAnalytics.instance
  }

  /**
   * Track authentication event
   */
  track(eventType: AuthEventType, metadata: Record<string, any> = {}): void {
    if (!this.isEnabled) return

    const event: AuthEvent = {
      eventType,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        viewport: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight
        } : null,
        connection: typeof navigator !== 'undefined' ? (navigator as any).connection?.effectiveType : null
      },
      utm: this.extractUTMParameters()
    }

    this.events.push(event)

    // Flush immediately for critical events
    if (this.isCriticalEvent(eventType)) {
      this.flush()
    } else if (this.events.length >= this.batchSize) {
      this.flush()
    }
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void {
    this.userId = userId
    this.track(AuthEventType.SESSION_STARTED, { userId })
  }

  /**
   * Track page view
   */
  trackPageView(page: string, metadata: Record<string, any> = {}): void {
    this.track(AuthEventType.PAGE_VIEW, {
      page,
      ...metadata
    })
  }

  /**
   * Track authentication flow start
   */
  trackAuthFlowStart(flowType: 'sign_in' | 'sign_up', metadata: Record<string, any> = {}): void {
    const eventType = flowType === 'sign_in' ? AuthEventType.SIGN_IN_STARTED : AuthEventType.SIGN_UP_STARTED
    this.track(eventType, {
      flowType,
      ...metadata
    })
  }

  /**
   * Track authentication flow completion
   */
  trackAuthFlowComplete(
    flowType: 'sign_in' | 'sign_up',
    success: boolean,
    metadata: Record<string, any> = {}
  ): void {
    const eventType = success
      ? (flowType === 'sign_in' ? AuthEventType.SIGN_IN_COMPLETED : AuthEventType.SIGN_UP_COMPLETED)
      : (flowType === 'sign_in' ? AuthEventType.SIGN_IN_FAILED : AuthEventType.SIGN_UP_FAILED)

    this.track(eventType, {
      flowType,
      success,
      ...metadata
    })
  }

  /**
   * Track social authentication
   */
  trackSocialAuth(
    provider: string,
    action: 'started' | 'completed' | 'failed',
    metadata: Record<string, any> = {}
  ): void {
    const eventTypeMap = {
      started: AuthEventType.SOCIAL_AUTH_STARTED,
      completed: AuthEventType.SOCIAL_AUTH_COMPLETED,
      failed: AuthEventType.SOCIAL_AUTH_FAILED
    }

    this.track(eventTypeMap[action], {
      provider,
      ...metadata
    })
  }

  /**
   * Track form interactions
   */
  trackFormInteraction(
    action: 'focus' | 'blur' | 'submit' | 'error',
    fieldName: string,
    metadata: Record<string, any> = {}
  ): void {
    const eventTypeMap = {
      focus: AuthEventType.FORM_FIELD_FOCUSED,
      blur: AuthEventType.FORM_FIELD_BLURRED,
      submit: AuthEventType.FORM_SUBMITTED,
      error: AuthEventType.FORM_VALIDATION_ERROR
    }

    this.track(eventTypeMap[action], {
      fieldName,
      ...metadata
    })
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: {
    loadTime?: number
    renderTime?: number
    apiResponseTime?: number
    cacheHit?: boolean
    errorType?: string
  }): void {
    if (metrics.loadTime && metrics.loadTime > 3000) {
      this.track(AuthEventType.PERFORMANCE_SLOW_LOAD, {
        loadTime: metrics.loadTime
      })
    }

    if (metrics.cacheHit !== undefined) {
      this.track(metrics.cacheHit ? AuthEventType.CACHE_HIT : AuthEventType.CACHE_MISS)
    }

    if (metrics.errorType) {
      this.track(AuthEventType.PERFORMANCE_ERROR, {
        errorType: metrics.errorType
      })
    }
  }

  /**
   * Track API errors
   */
  trackError(
    errorType: 'api' | 'network' | 'validation' | 'system',
    error: Error | string,
    metadata: Record<string, any> = {}
  ): void {
    const eventTypeMap = {
      api: AuthEventType.API_ERROR,
      network: AuthEventType.NETWORK_ERROR,
      validation: AuthEventType.VALIDATION_ERROR,
      system: AuthEventType.SYSTEM_ERROR
    }

    this.track(eventTypeMap[errorType], {
      error: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      ...metadata
    })
  }

  /**
   * Get authentication metrics
   */
  async getAuthMetrics(timeRange: { start: Date; end: Date }): Promise<AuthMetrics> {
    const events = await this.getEvents(timeRange)
    
    const signUpStarted = events.filter(e => e.eventType === AuthEventType.SIGN_UP_STARTED).length
    const signUpCompleted = events.filter(e => e.eventType === AuthEventType.SIGN_UP_COMPLETED).length
    const signInStarted = events.filter(e => e.eventType === AuthEventType.SIGN_IN_STARTED).length
    const signInCompleted = events.filter(e => e.eventType === AuthEventType.SIGN_IN_COMPLETED).length
    
    const totalErrors = events.filter(e => 
      e.eventType.toString().includes('_FAILED') || 
      e.eventType.toString().includes('_ERROR')
    ).length
    
    const socialAuthEvents = events.filter(e => 
      e.eventType === AuthEventType.SOCIAL_AUTH_COMPLETED
    )
    
    const socialAuthUsage: Record<string, number> = {}
    socialAuthEvents.forEach(event => {
      const provider = event.metadata.provider
      if (provider) {
        socialAuthUsage[provider] = (socialAuthUsage[provider] || 0) + 1
      }
    })

    const deviceBreakdown: Record<string, number> = {}
    events.forEach(event => {
      const userAgent = event.metadata.userAgent
      if (userAgent) {
        const device = this.getDeviceType(userAgent)
        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1
      }
    })

    return {
      signUpRate: signUpStarted > 0 ? signUpCompleted / signUpStarted : 0,
      signInRate: signInStarted > 0 ? signInCompleted / signInStarted : 0,
      conversionRate: (signUpCompleted + signInCompleted) / (signUpStarted + signInStarted) || 0,
      abandonmentRate: 1 - ((signUpCompleted + signInCompleted) / (signUpStarted + signInStarted) || 0),
      averageSessionDuration: this.calculateAverageSessionDuration(events),
      errorRate: totalErrors / events.length || 0,
      socialAuthUsage,
      deviceBreakdown
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(timeRange: { start: Date; end: Date }): Promise<PerformanceMetrics> {
    const events = await this.getEvents(timeRange)
    
    const loadTimeEvents = events.filter(e => e.metadata.loadTime)
    const renderTimeEvents = events.filter(e => e.metadata.renderTime)
    const apiResponseEvents = events.filter(e => e.metadata.apiResponseTime)
    const cacheHits = events.filter(e => e.eventType === AuthEventType.CACHE_HIT).length
    const cacheMisses = events.filter(e => e.eventType === AuthEventType.CACHE_MISS).length
    const errors = events.filter(e => e.eventType.toString().includes('ERROR')).length

    return {
      averageLoadTime: this.calculateAverage(loadTimeEvents.map(e => e.metadata.loadTime)),
      averageRenderTime: this.calculateAverage(renderTimeEvents.map(e => e.metadata.renderTime)),
      averageApiResponseTime: this.calculateAverage(apiResponseEvents.map(e => e.metadata.apiResponseTime)),
      errorRate: errors / events.length || 0,
      cacheHitRate: (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0,
      bounceRate: this.calculateBounceRate(events)
    }
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(timeRange: { start: Date; end: Date }): Promise<FunnelStep[]> {
    const events = await this.getEvents(timeRange)
    
    const steps = [
      { step: 'Page View', eventType: AuthEventType.PAGE_VIEW },
      { step: 'Sign Up Started', eventType: AuthEventType.SIGN_UP_STARTED },
      { step: 'Form Submitted', eventType: AuthEventType.FORM_SUBMITTED },
      { step: 'Email Verification Sent', eventType: AuthEventType.EMAIL_VERIFICATION_SENT },
      { step: 'Email Verified', eventType: AuthEventType.EMAIL_VERIFICATION_COMPLETED },
      { step: 'Sign Up Completed', eventType: AuthEventType.SIGN_UP_COMPLETED }
    ]

    const funnel: FunnelStep[] = []
    let previousUsers = 0

    steps.forEach((step, index) => {
      const stepEvents = events.filter(e => e.eventType === step.eventType)
      const users = new Set(stepEvents.map(e => e.sessionId)).size
      
      const conversionRate = index === 0 ? 1 : (previousUsers > 0 ? users / previousUsers : 0)
      const dropOffRate = 1 - conversionRate
      const averageTime = this.calculateAverageStepTime(stepEvents)

      funnel.push({
        step: step.step,
        users,
        conversionRate,
        dropOffRate,
        averageTime
      })

      previousUsers = users
    })

    return funnel
  }

  /**
   * Flush events to analytics service
   */
  private async flush(): Promise<void> {
    if (this.events.length === 0) return

    const eventsToFlush = [...this.events]
    this.events = []

    try {
      // Send to analytics service
      if (typeof window !== 'undefined') {
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ events: eventsToFlush })
        })
      }
    } catch (error) {
      console.warn('Failed to send analytics events:', error)
      // Re-add events to queue for retry
      this.events.unshift(...eventsToFlush)
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Extract UTM parameters from URL
   */
  private extractUTMParameters(): UTMParameters | undefined {
    if (typeof window === 'undefined') return undefined

    const urlParams = new URLSearchParams(window.location.search)
    const utm: UTMParameters = {}

    const utmParams = ['source', 'medium', 'campaign', 'term', 'content']
    utmParams.forEach(param => {
      const value = urlParams.get(`utm_${param}`)
      if (value) {
        utm[param as keyof UTMParameters] = value
      }
    })

    return Object.keys(utm).length > 0 ? utm : undefined
  }

  /**
   * Check if event is critical and should be flushed immediately
   */
  private isCriticalEvent(eventType: AuthEventType): boolean {
    const criticalEvents = [
      AuthEventType.SIGN_UP_COMPLETED,
      AuthEventType.SIGN_IN_COMPLETED,
      AuthEventType.API_ERROR,
      AuthEventType.SYSTEM_ERROR
    ]
    return criticalEvents.includes(eventType)
  }

  /**
   * Start batch flush timer
   */
  private startBatchFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  /**
   * Setup event listeners for automatic tracking
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track(AuthEventType.USER_IDLE)
      } else {
        this.track(AuthEventType.USER_ACTIVE)
      }
    })

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.track(AuthEventType.PAGE_EXIT)
      this.flush() // Immediate flush on page exit
    })

    // Track errors
    window.addEventListener('error', (event) => {
      this.trackError('system', event.error || event.message)
    })

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('system', event.reason)
    })
  }

  /**
   * Get events for time range
   */
  private async getEvents(timeRange: { start: Date; end: Date }): Promise<AuthEvent[]> {
    // In a real implementation, this would fetch from a database
    return this.events.filter(event => 
      event.timestamp >= timeRange.start.getTime() && 
      event.timestamp <= timeRange.end.getTime()
    )
  }

  /**
   * Calculate average from array of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length
  }

  /**
   * Calculate average session duration
   */
  private calculateAverageSessionDuration(events: AuthEvent[]): number {
    const sessions = new Map<string, { start: number; end: number }>()
    
    events.forEach(event => {
      const sessionId = event.sessionId
      if (sessionId) {
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, { start: event.timestamp, end: event.timestamp })
        } else {
          const session = sessions.get(sessionId)!
          session.end = Math.max(session.end, event.timestamp)
        }
      }
    })

    const durations = Array.from(sessions.values()).map(session => session.end - session.start)
    return this.calculateAverage(durations)
  }

  /**
   * Calculate bounce rate
   */
  private calculateBounceRate(events: AuthEvent[]): number {
    const sessions = new Map<string, number>()
    
    events.forEach(event => {
      const sessionId = event.sessionId
      if (sessionId) {
        sessions.set(sessionId, (sessions.get(sessionId) || 0) + 1)
      }
    })

    const singlePageSessions = Array.from(sessions.values()).filter(count => count === 1).length
    return sessions.size > 0 ? singlePageSessions / sessions.size : 0
  }

  /**
   * Calculate average time for funnel step
   */
  private calculateAverageStepTime(events: AuthEvent[]): number {
    // This would calculate time between steps in a real implementation
    return 0
  }

  /**
   * Get device type from user agent
   */
  private getDeviceType(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'mobile'
    } else if (/Tablet/.test(userAgent)) {
      return 'tablet'
    } else {
      return 'desktop'
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush() // Final flush
  }
}

// Export singleton instance
export const authAnalytics = AuthAnalytics.getInstance()