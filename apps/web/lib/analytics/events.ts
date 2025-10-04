import { track } from '@vercel/analytics'

export type AnalyticsEvent = 
  | HeroEvent
  | C9CapabilityEvent
  | CTAEvent
  | NavigationEvent
  | ConversionEvent
  | ScrollEvent

export interface HeroEvent {
  type: 'hero_interaction'
  action: 'cta_click' | 'video_play' | 'scroll_past'
  metadata?: Record<string, any>
}

export interface C9CapabilityEvent {
  type: 'c9_capability_interaction'
  capability: 'insight' | 'persona' | 'domain' | 'orchestrator' | 'narrative'
  action: 'view' | 'click_cta' | 'view_api' | 'filter_industry' | 'view_use_case'
  industry?: string
  metadata?: Record<string, any>
}

export interface CTAEvent {
  type: 'cta_interaction'
  location: 'hero' | 'capability' | 'feature' | 'footer' | 'floating' | 'final'
  action: 'click' | 'hover' | 'view'
  text: string
  href: string
  metadata?: Record<string, any>
}

export interface NavigationEvent {
  type: 'navigation'
  from: string
  to: string
  method: 'link' | 'button' | 'menu' | 'back'
  metadata?: Record<string, any>
}

export interface ConversionEvent {
  type: 'conversion'
  goal: 'consultation_request' | 'demo_signup' | 'trial_start' | 'contact_form' | 'newsletter_signup'
  value?: number
  capability?: string
  metadata?: Record<string, any>
}

export interface ScrollEvent {
  type: 'scroll_depth'
  depth: number
  section?: string
  metadata?: Record<string, any>
}

export function trackEvent(event: AnalyticsEvent) {
  const eventName = `${event.type}_${event.action || 'view'}`
  const properties = {
    ...event,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    referrer: typeof document !== 'undefined' ? document.referrer : ''
  }
  
  // Track with Vercel Analytics
  track(eventName, properties)
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, properties)
  }
}

export function trackHeroInteraction(action: HeroEvent['action'], metadata?: Record<string, any>) {
  trackEvent({
    type: 'hero_interaction',
    action,
    metadata
  })
}

export function trackC9Capability(
  capability: C9CapabilityEvent['capability'],
  action: C9CapabilityEvent['action'],
  options?: {
    industry?: string
    metadata?: Record<string, any>
  }
) {
  trackEvent({
    type: 'c9_capability_interaction',
    capability,
    action,
    industry: options?.industry,
    metadata: options?.metadata
  })
}

export function trackCTA(
  location: CTAEvent['location'],
  action: CTAEvent['action'],
  text: string,
  href: string,
  metadata?: Record<string, any>
) {
  trackEvent({
    type: 'cta_interaction',
    location,
    action,
    text,
    href,
    metadata
  })
}

export function trackConversion(
  goal: ConversionEvent['goal'],
  options?: {
    value?: number
    capability?: string
    metadata?: Record<string, any>
  }
) {
  trackEvent({
    type: 'conversion',
    goal,
    value: options?.value,
    capability: options?.capability,
    metadata: options?.metadata
  })
}

export function trackScrollDepth(depth: number, section?: string, metadata?: Record<string, any>) {
  trackEvent({
    type: 'scroll_depth',
    depth,
    section,
    metadata
  })
}

// Utility function to track page views
export function trackPageView(pageName: string, metadata?: Record<string, any>) {
  track('page_view', {
    page: pageName,
    ...metadata
  })
}

// Utility function for tracking errors
export function trackError(error: Error, context?: string) {
  track('error', {
    error_message: error.message,
    error_stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  })
}