import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
import { trackEvent } from '@/lib/analytics/events'

export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  entries: any[]
}

// Thresholds based on Google's Web Vitals recommendations
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 }
}

function getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric as keyof typeof THRESHOLDS]
  if (!threshold) return 'needs-improvement'
  
  if (value <= threshold.good) return 'good'
  if (value > threshold.poor) return 'poor'
  return 'needs-improvement'
}

export function reportWebVitals(onReport?: (metric: WebVitalsMetric) => void) {
  const handleMetric = (metric: any) => {
    const webVitalMetric: WebVitalsMetric = {
      name: metric.name,
      value: metric.value,
      rating: getRating(metric.name, metric.value),
      delta: metric.delta,
      entries: metric.entries
    }

    // Report to callback if provided
    if (onReport) {
      onReport(webVitalMetric)
    }

    // Track in analytics
    trackEvent({
      type: 'web_vitals' as any,
      action: metric.name.toLowerCase(),
      metadata: {
        value: metric.value,
        rating: webVitalMetric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType
      }
    })

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${metric.name}:`, {
        value: `${metric.value.toFixed(2)}${metric.name === 'CLS' ? '' : 'ms'}`,
        rating: webVitalMetric.rating,
        delta: metric.delta
      })
    }
  }

  getCLS(handleMetric)
  getFID(handleMetric)
  getFCP(handleMetric)
  getLCP(handleMetric)
  getTTFB(handleMetric)
}

// Resource loading performance utilities
export function measureResourceTiming() {
  if (typeof window === 'undefined' || !window.performance) return

  const resources = performance.getEntriesByType('resource')
  const metrics = {
    images: [] as any[],
    scripts: [] as any[],
    stylesheets: [] as any[],
    fonts: [] as any[]
  }

  resources.forEach((resource: any) => {
    const data = {
      name: resource.name,
      duration: resource.duration,
      size: resource.transferSize || 0,
      protocol: resource.nextHopProtocol
    }

    if (resource.name.match(/\.(jpg|jpeg|png|webp|avif|svg)/i)) {
      metrics.images.push(data)
    } else if (resource.name.match(/\.js$/i)) {
      metrics.scripts.push(data)
    } else if (resource.name.match(/\.css$/i)) {
      metrics.stylesheets.push(data)
    } else if (resource.name.match(/\.(woff|woff2|ttf|otf)/i)) {
      metrics.fonts.push(data)
    }
  })

  return metrics
}

// Image loading optimization
export function optimizeImageLoading() {
  if (typeof window === 'undefined') return

  // Native lazy loading for images
  const images = document.querySelectorAll('img[data-lazy]')
  images.forEach(img => {
    img.setAttribute('loading', 'lazy')
  })

  // Preload critical images
  const criticalImages = document.querySelectorAll('img[data-critical]')
  criticalImages.forEach(img => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = img.getAttribute('src') || ''
    document.head.appendChild(link)
  })
}

// Animation performance optimization
export function optimizeAnimations() {
  if (typeof window === 'undefined') return

  // Reduce motion for users who prefer it
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduce-motion')
  }

  // Pause animations when page is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.querySelectorAll('.animate-gentle-float-1, .animate-gentle-float-2, .animate-gentle-float-3')
        .forEach(el => el.classList.add('animation-paused'))
    } else {
      document.querySelectorAll('.animation-paused')
        .forEach(el => el.classList.remove('animation-paused'))
    }
  })
}

// Bundle size monitoring
export function monitorBundleSize() {
  if (typeof window === 'undefined' || !window.performance) return

  const navigation = performance.getEntriesByType('navigation')[0] as any
  if (!navigation) return

  return {
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
    domInteractive: navigation.domInteractive - navigation.fetchStart,
    firstByte: navigation.responseStart - navigation.requestStart
  }
}