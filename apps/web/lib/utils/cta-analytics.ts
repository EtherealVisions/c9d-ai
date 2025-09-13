import { ConversionFunnelStep, ABTestConfig, CTAVariant } from '@/lib/types/cta'
import { TrackingConfig } from '@/lib/types/hero'

// Enhanced analytics for CTA tracking
export const trackCTAClick = (
  ctaId: string,
  variant: CTAVariant,
  context: string,
  userId?: string
) => {
  const trackingData: TrackingConfig = {
    event: 'cta_click',
    category: 'conversion',
    label: `${context}_${ctaId}_${variant.id}`,
    value: 1
  }

  // Track with Vercel Analytics
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', trackingData.event, {
      cta_id: ctaId,
      variant_id: variant.id,
      context,
      category: trackingData.category,
      label: trackingData.label,
      user_id: userId,
      timestamp: new Date().toISOString()
    })
  }

  // Track with Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', trackingData.event, {
      event_category: trackingData.category,
      event_label: trackingData.label,
      cta_id: ctaId,
      variant_id: variant.id,
      context,
      value: trackingData.value
    })
  }

  // Store in localStorage for funnel analysis
  storeFunnelStep({
    step: `cta_${context}`,
    event: trackingData.event,
    category: getCategoryFromContext(context),
    value: trackingData.value
  })

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('CTA Click Tracked:', {
      ctaId,
      variant: variant.id,
      context,
      trackingData
    })
  }
}

// Track conversion funnel steps
export const storeFunnelStep = (step: ConversionFunnelStep) => {
  if (typeof window === 'undefined') return

  const funnelData = JSON.parse(
    localStorage.getItem('conversion_funnel') || '[]'
  ) as ConversionFunnelStep[]

  funnelData.push({
    ...step,
    timestamp: new Date().toISOString()
  } as ConversionFunnelStep & { timestamp: string })

  // Keep only last 50 steps to prevent storage bloat
  if (funnelData.length > 50) {
    funnelData.splice(0, funnelData.length - 50)
  }

  localStorage.setItem('conversion_funnel', JSON.stringify(funnelData))
}

// Get conversion funnel data
export const getFunnelData = (): (ConversionFunnelStep & { timestamp: string })[] => {
  if (typeof window === 'undefined') return []
  
  return JSON.parse(
    localStorage.getItem('conversion_funnel') || '[]'
  )
}

// A/B testing for CTAs
export const selectCTAVariant = (
  config: ABTestConfig,
  userId?: string
): CTAVariant => {
  if (!config.enabled || config.variants.length === 0) {
    return config.variants[0]
  }

  // Use consistent hash-based selection for logged-in users
  const hash = userId ? simpleHash(userId + config.testId) : Math.random()
  
  let cumulativePercentage = 0
  const randomValue = hash * 100

  for (let i = 0; i < config.variants.length; i++) {
    cumulativePercentage += config.trafficSplit[i] || (100 / config.variants.length)
    if (randomValue <= cumulativePercentage) {
      // Track A/B test assignment
      trackABTestAssignment(config.testId, config.variants[i].id, userId)
      return config.variants[i]
    }
  }

  return config.variants[0] // Fallback
}

// Track A/B test assignment
const trackABTestAssignment = (testId: string, variantId: string, userId?: string) => {
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', 'ab_test_assignment', {
      test_id: testId,
      variant_id: variantId,
      user_id: userId,
      timestamp: new Date().toISOString()
    })
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ab_test_assignment', {
      test_id: testId,
      variant_id: variantId,
      custom_parameter_user_id: userId
    })
  }
}

// Track CTA impression (when CTA becomes visible)
export const trackCTAImpression = (
  ctaId: string,
  variant: CTAVariant,
  context: string,
  userId?: string
) => {
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', 'cta_impression', {
      cta_id: ctaId,
      variant_id: variant.id,
      context,
      user_id: userId,
      timestamp: new Date().toISOString()
    })
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'cta_impression', {
      event_category: 'engagement',
      cta_id: ctaId,
      variant_id: variant.id,
      context
    })
  }
}

// Track urgency/scarcity element views
export const trackUrgencyView = (
  type: 'countdown' | 'limited-time' | 'beta-access' | 'limited-spots' | 'beta-slots' | 'early-access',
  context: string,
  userId?: string
) => {
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', 'urgency_view', {
      urgency_type: type,
      context,
      user_id: userId,
      timestamp: new Date().toISOString()
    })
  }
}

// Helper functions
const getCategoryFromContext = (context: string): ConversionFunnelStep['category'] => {
  switch (context) {
    case 'hero':
      return 'awareness'
    case 'features':
      return 'interest'
    case 'social-proof':
      return 'consideration'
    case 'technical':
      return 'evaluation'
    case 'final':
      return 'intent'
    default:
      return 'interest'
  }
}

const simpleHash = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash) / 2147483647
}

// Conversion rate calculation
export const calculateConversionRate = (
  impressions: number,
  clicks: number
): number => {
  if (impressions === 0) return 0
  return (clicks / impressions) * 100
}

// Get performance metrics for CTAs
export const getCTAPerformanceMetrics = (ctaId: string) => {
  const funnelData = getFunnelData()
  const impressions = funnelData.filter(
    step => step.event === 'cta_impression' && step.step.includes(ctaId)
  ).length
  const clicks = funnelData.filter(
    step => step.event === 'cta_click' && step.step.includes(ctaId)
  ).length

  return {
    impressions,
    clicks,
    conversionRate: calculateConversionRate(impressions, clicks)
  }
}