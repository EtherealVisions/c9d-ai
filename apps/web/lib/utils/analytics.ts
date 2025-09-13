import { TrackingConfig } from '@/lib/types/hero'

// Event tracking interface
export interface EventTrackingData {
  event: string
  category: string
  label: string
  value: number
}

// Analytics tracking utility
export const trackEvent = (config: TrackingConfig) => {
  // This function is for configuring analytics providers
  console.log('Analytics configuration:', config)
}

// Event tracking utility
export const trackAnalyticsEvent = (data: EventTrackingData) => {
  // Vercel Analytics tracking
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', data.event, {
      category: data.category,
      label: data.label,
      value: data.value,
    })
  }

  // Google Analytics 4 tracking (if available)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', data.event, {
      event_category: data.category,
      event_label: data.label,
      value: data.value,
    })
  }

  // Console logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Analytics Event:', data)
  }
}

// A/B testing utility
export const getABTestVariant = (variants: any[], userId?: string): any => {
  if (!variants || variants.length === 0) return null
  
  // Simple hash-based variant selection for consistent user experience
  const hash = userId ? simpleHash(userId) : Math.random()
  const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0)
  
  let cumulativeWeight = 0
  const randomValue = hash * totalWeight
  
  for (const variant of variants) {
    cumulativeWeight += variant.weight
    if (randomValue <= cumulativeWeight) {
      return variant
    }
  }
  
  return variants[0] // Fallback to first variant
}

// Simple hash function for consistent A/B testing
const simpleHash = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash) / 2147483647 // Normalize to 0-1
}

// Performance monitoring for Core Web Vitals
export const trackPerformance = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Track Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      trackEvent({
        event: 'lcp',
        category: 'performance',
        label: 'hero_section',
        value: Math.round(lastEntry.startTime)
      })
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // Track First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        trackEvent({
          event: 'fid',
          category: 'performance',
          label: 'hero_section',
          value: Math.round(entry.processingStart - entry.startTime)
        })
      })
    }).observe({ entryTypes: ['first-input'] })
  }
}

// Declare global types for analytics
declare global {
  interface Window {
    va?: (event: string, name: string, data?: any) => void
    gtag?: (command: string, event: string, data?: any) => void
  }
}