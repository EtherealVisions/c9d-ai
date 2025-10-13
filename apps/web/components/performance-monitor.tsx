"use client"

import { useEffect } from 'react'
import { reportWebVitals, optimizeImageLoading, optimizeAnimations } from '@/lib/performance/web-vitals'

export default function PerformanceMonitor() {
  useEffect(() => {
    // Report Web Vitals
    reportWebVitals((metric) => {
      // You can send metrics to your analytics service here
      if (process.env.NODE_ENV === 'development') {
        console.log('[Performance]', metric)
      }
    })

    // Optimize images and animations
    optimizeImageLoading()
    optimizeAnimations()
  }, [])

  return null
}