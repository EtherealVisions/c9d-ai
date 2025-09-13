'use client'

import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

interface VercelAnalyticsProps {
  beforeSend?: (event: any) => any | null
  debug?: boolean
}

export function VercelAnalytics({ beforeSend, debug = false }: VercelAnalyticsProps) {
  useEffect(() => {
    // Custom Vercel Analytics configuration
    if (typeof window !== 'undefined' && window.va) {
      // Track custom conversion events
      const trackConversion = (event: string, properties?: Record<string, any>) => {
        window.va!('track', event, {
          ...properties,
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          page_title: document.title
        })
      }

      // Make trackConversion available globally
      ;(window as any).trackConversion = trackConversion

      // Track page performance
      if ('performance' in window) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
            if (navigation) {
              trackConversion('page_performance', {
                load_time: Math.round(navigation.loadEventEnd - navigation.fetchStart),
                dom_content_loaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
                first_byte: Math.round(navigation.responseStart - navigation.requestStart)
              })
            }
          }, 0)
        })
      }

      // Track user engagement
      let engagementStartTime = Date.now()
      let isEngaged = true

      const trackEngagement = () => {
        if (isEngaged) {
          const engagementTime = Date.now() - engagementStartTime
          if (engagementTime > 10000) { // 10 seconds minimum
            trackConversion('user_engagement', {
              engagement_time: Math.round(engagementTime / 1000),
              page_url: window.location.href
            })
          }
        }
      }

      // Track when user becomes inactive
      const handleVisibilityChange = () => {
        if (document.hidden) {
          trackEngagement()
          isEngaged = false
        } else {
          engagementStartTime = Date.now()
          isEngaged = true
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', trackEngagement)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('beforeunload', trackEngagement)
      }
    }
  }, [])

  return (
    <>
      <Analytics beforeSend={beforeSend} debug={debug} />
      <SpeedInsights />
    </>
  )
}

// Utility function to track custom events
export function trackVercelEvent(event: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', event, {
      ...properties,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_title: document.title
    })
  }
}

// Utility function to track conversion events
export function trackVercelConversion(event: string, value?: number, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).trackConversion) {
    ;(window as any).trackConversion(event, {
      value,
      ...properties,
      conversion: true
    })
  }
}

declare global {
  interface Window {
    va?: (event: string, name: string, data?: any) => void
    trackConversion?: (event: string, properties?: Record<string, any>) => void
  }
}

// Export AnalyticsProvider as an alias for VercelAnalytics
export const AnalyticsProvider = VercelAnalytics