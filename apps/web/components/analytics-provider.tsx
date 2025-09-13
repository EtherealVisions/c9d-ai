'use client'

import React, { useEffect, createContext, useContext } from 'react'
import { useUser } from '@clerk/nextjs'
import { AnalyticsService } from '@/lib/services/analytics-service'
import { ConversionFunnelService } from '@/lib/services/conversion-funnel-service'
import { ABTestingService } from '@/lib/services/ab-testing-service'
import { AnalyticsConfig, ABTestConfig } from '@/lib/types/analytics'

interface AnalyticsContextType {
  trackEvent: typeof AnalyticsService.trackEvent
  trackFunnelStep: typeof ConversionFunnelService.trackFunnelStep
  trackConversion: typeof ABTestingService.trackConversion
  getABTestVariant: typeof ABTestingService.getVariant
  isInitialized: boolean
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null)

interface AnalyticsProviderProps {
  children: React.ReactNode
  config?: Partial<AnalyticsConfig>
  abTests?: ABTestConfig[]
}

export function AnalyticsProvider({ 
  children, 
  config = {},
  abTests = []
}: AnalyticsProviderProps) {
  const { user, isLoaded } = useUser()
  const [isInitialized, setIsInitialized] = React.useState(false)

  useEffect(() => {
    if (!isLoaded) return

    const defaultConfig: AnalyticsConfig = {
      providers: [
        {
          name: 'vercel',
          enabled: true,
          config: {}
        },
        {
          name: 'google',
          enabled: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
          config: {
            measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
          }
        },
        {
          name: 'hotjar',
          enabled: !!process.env.NEXT_PUBLIC_HOTJAR_SITE_ID,
          config: {
            siteId: process.env.NEXT_PUBLIC_HOTJAR_SITE_ID
          }
        }
      ],
      enableDebugMode: process.env.NODE_ENV === 'development',
      enableConsentMode: true,
      defaultConsentState: {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        functionality_storage: 'granted',
        personalization_storage: 'granted'
      },
      customDimensions: {
        user_type: 'custom_dimension_1',
        subscription_tier: 'custom_dimension_2',
        organization_size: 'custom_dimension_3'
      },
      customMetrics: {
        engagement_score: 'custom_metric_1',
        feature_usage: 'custom_metric_2'
      },
      ...config
    }

    // Initialize analytics service
    AnalyticsService.initialize(defaultConfig, user?.id)

    // Initialize A/B tests
    abTests.forEach(test => {
      ABTestingService.initializeTest(test)
    })

    // Track page view
    AnalyticsService.trackEvent({
      event: 'pageview',
      category: 'engagement',
      properties: {
        page_title: document.title,
        page_location: window.location.href,
        user_type: user ? 'authenticated' : 'anonymous'
      }
    })

    // Track funnel step for landing
    ConversionFunnelService.trackFunnelStep('landing', {
      page_path: window.location.pathname,
      referrer: document.referrer,
      user_agent: navigator.userAgent
    }, user?.id)

    setIsInitialized(true)
  }, [isLoaded, user?.id, config, abTests])

  // Update user ID when user changes
  useEffect(() => {
    if (isInitialized && user?.id) {
      AnalyticsService.setUserId(user.id)
    }
  }, [user?.id, isInitialized])

  // Set up intersection observer for tracking element visibility
  useEffect(() => {
    if (!isInitialized) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement
            const trackingData = element.dataset.analytics

            if (trackingData) {
              try {
                const data = JSON.parse(trackingData)
                AnalyticsService.trackEvent({
                  event: 'element_view',
                  category: 'engagement',
                  label: data.label || element.id || element.className,
                  properties: {
                    element_type: element.tagName.toLowerCase(),
                    element_id: element.id,
                    element_classes: element.className,
                    viewport_percentage: Math.round(entry.intersectionRatio * 100),
                    ...data.properties
                  }
                })

                // Track funnel step if specified
                if (data.funnelStep) {
                  ConversionFunnelService.trackFunnelStep(
                    data.funnelStep,
                    data.properties,
                    user?.id
                  )
                }
              } catch (error) {
                console.warn('Invalid analytics data:', trackingData)
              }
            }
          }
        })
      },
      {
        threshold: [0.1, 0.5, 0.9], // Track at different visibility levels
        rootMargin: '0px 0px -10% 0px' // Trigger slightly before element is fully visible
      }
    )

    // Observe all elements with data-analytics attribute
    const elementsToTrack = document.querySelectorAll('[data-analytics]')
    elementsToTrack.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [isInitialized, user?.id])

  // Set up click tracking for CTA elements
  useEffect(() => {
    if (!isInitialized) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const ctaElement = target.closest('[data-cta-analytics]')
      
      if (ctaElement) {
        const trackingData = ctaElement.getAttribute('data-cta-analytics')
        if (trackingData) {
          try {
            const data = JSON.parse(trackingData)
            AnalyticsService.trackEvent({
              event: 'cta_click',
              category: 'conversion',
              label: data.label || ctaElement.textContent?.trim(),
              properties: {
                cta_text: ctaElement.textContent?.trim(),
                cta_href: (ctaElement as HTMLAnchorElement).href,
                cta_position: data.position,
                cta_variant: data.variant,
                ...data.properties
              }
            })

            // Track funnel step
            ConversionFunnelService.trackFunnelStep(
              data.funnelStep || 'cta_click',
              {
                cta_text: ctaElement.textContent?.trim(),
                cta_position: data.position,
                ...data.properties
              },
              user?.id
            )

            // Track A/B test conversion if specified
            if (data.testId) {
              ABTestingService.trackConversion(
                data.testId,
                'cta_click',
                data.value,
                user?.id
              )
            }
          } catch (error) {
            console.warn('Invalid CTA analytics data:', trackingData)
          }
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isInitialized, user?.id])

  // Set up form tracking
  useEffect(() => {
    if (!isInitialized) return

    const handleFormStart = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      const form = target.closest('form[data-form-analytics]')
      
      if (form && !(form as HTMLElement).dataset.formStarted) {
        (form as HTMLElement).dataset.formStarted = 'true'
        const trackingData = form.getAttribute('data-form-analytics')
        
        if (trackingData) {
          try {
            const data = JSON.parse(trackingData)
            AnalyticsService.trackEvent({
              event: 'form_start',
              category: 'engagement',
              label: data.label || form.id,
              properties: data.properties
            })

            ConversionFunnelService.trackFunnelStep(
              'form_start',
              { form_name: data.label || form.id, ...data.properties },
              user?.id
            )
          } catch (error) {
            console.warn('Invalid form analytics data:', trackingData)
          }
        }
      }
    }

    const handleFormSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement
      const trackingData = form.getAttribute('data-form-analytics')
      
      if (trackingData) {
        try {
          const data = JSON.parse(trackingData)
          AnalyticsService.trackEvent({
            event: 'form_submit',
            category: 'conversion',
            label: data.label || form.id,
            properties: data.properties
          })

          ConversionFunnelService.trackFunnelStep(
            'form_submit',
            { form_name: data.label || form.id, ...data.properties },
            user?.id
          )

          // Track A/B test conversion if specified
          if (data.testId) {
            ABTestingService.trackConversion(
              data.testId,
              'form_submit',
              data.value,
              user?.id
            )
          }
        } catch (error) {
          console.warn('Invalid form analytics data:', trackingData)
        }
      }
    }

    document.addEventListener('focusin', handleFormStart)
    document.addEventListener('submit', handleFormSubmit)

    return () => {
      document.removeEventListener('focusin', handleFormStart)
      document.removeEventListener('submit', handleFormSubmit)
    }
  }, [isInitialized, user?.id])

  const contextValue: AnalyticsContextType = {
    trackEvent: AnalyticsService.trackEvent.bind(AnalyticsService),
    trackFunnelStep: ConversionFunnelService.trackFunnelStep.bind(ConversionFunnelService),
    trackConversion: ABTestingService.trackConversion.bind(ABTestingService),
    getABTestVariant: ABTestingService.getVariant.bind(ABTestingService),
    isInitialized
  }

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}

// Utility hook for A/B testing
export function useABTest(testId: string) {
  const { getABTestVariant, isInitialized } = useAnalytics()
  const { user } = useUser()
  const [variant, setVariant] = React.useState<any>(null)

  useEffect(() => {
    if (isInitialized) {
      const selectedVariant = getABTestVariant(testId, user?.id)
      setVariant(selectedVariant)
    }
  }, [testId, isInitialized, user?.id, getABTestVariant])

  return variant
}

// Utility hook for tracking page views
export function usePageView(pageName?: string) {
  const { trackEvent, trackFunnelStep, isInitialized } = useAnalytics()
  const { user } = useUser()

  useEffect(() => {
    if (isInitialized) {
      trackEvent({
        event: 'pageview',
        category: 'engagement',
        label: pageName || document.title,
        properties: {
          page_title: document.title,
          page_location: window.location.href,
          page_path: window.location.pathname
        }
      })

      trackFunnelStep(
        'pageview',
        {
          page_name: pageName || document.title,
          page_path: window.location.pathname
        },
        user?.id
      )
    }
  }, [isInitialized, pageName, trackEvent, trackFunnelStep, user?.id])
}

// Utility component for tracking element visibility
interface TrackingElementProps {
  children: React.ReactNode
  event: string
  category?: string
  label?: string
  funnelStep?: string
  properties?: Record<string, any>
  className?: string
}

export function TrackingElement({
  children,
  event,
  category = 'engagement',
  label,
  funnelStep,
  properties = {},
  className
}: TrackingElementProps) {
  const trackingData = JSON.stringify({
    event,
    category,
    label,
    funnelStep,
    properties
  })

  return (
    <div data-analytics={trackingData} className={className}>
      {children}
    </div>
  )
}

// Utility component for tracking CTA clicks
interface TrackingCTAProps {
  children: React.ReactNode
  label?: string
  position?: string
  variant?: string
  funnelStep?: string
  testId?: string
  value?: number
  properties?: Record<string, any>
  className?: string
}

export function TrackingCTA({
  children,
  label,
  position,
  variant,
  funnelStep,
  testId,
  value,
  properties = {},
  className
}: TrackingCTAProps) {
  const trackingData = JSON.stringify({
    label,
    position,
    variant,
    funnelStep,
    testId,
    value,
    properties
  })

  return (
    <div data-cta-analytics={trackingData} className={className}>
      {children}
    </div>
  )
}