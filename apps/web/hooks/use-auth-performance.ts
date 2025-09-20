/**
 * Authentication Performance Monitoring Hook
 * 
 * This hook provides performance monitoring capabilities for authentication flows
 * including load times, render performance, and user interaction metrics.
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { 
  AuthPerformanceMonitor, 
  PerformanceMetrics,
  userDataCache_instance,
  sessionCache_instance,
  formStateCache_instance
} from '@/lib/performance/auth-performance'

export interface AuthPerformanceData {
  componentLoadTime: number
  renderTime: number
  interactionTime: number
  cacheHitRate: number
  memoryUsage: number
  networkLatency: number
}

export interface PerformanceThresholds {
  componentLoad: number // ms
  render: number // ms
  interaction: number // ms
  cacheHitRate: number // percentage
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  componentLoad: 1000, // 1 second
  render: 100, // 100ms
  interaction: 50, // 50ms
  cacheHitRate: 0.8 // 80%
}

/**
 * Hook for monitoring authentication performance
 */
export function useAuthPerformance(
  componentName: string,
  thresholds: Partial<PerformanceThresholds> = {}
) {
  const [performanceData, setPerformanceData] = useState<AuthPerformanceData | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  
  const performanceMonitor = useRef(AuthPerformanceMonitor.getInstance())
  const startTimeRef = useRef<number>(0)
  const renderStartRef = useRef<number>(0)
  const interactionStartRef = useRef<number>(0)
  
  const finalThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(() => {
    if (typeof window === 'undefined') return

    setIsMonitoring(true)
    startTimeRef.current = performance.now()
    performanceMonitor.current.startMeasurement(componentName)
    
    // Mark render start
    renderStartRef.current = performance.now()
  }, [componentName])

  /**
   * End performance monitoring
   */
  const endMonitoring = useCallback(() => {
    if (typeof window === 'undefined' || !isMonitoring) return

    const endTime = performance.now()
    const metrics = performanceMonitor.current.endMeasurement(componentName)
    
    if (metrics) {
      const renderTime = endTime - renderStartRef.current
      const componentLoadTime = endTime - startTimeRef.current
      
      // Get cache statistics
      const userCacheStats = userDataCache_instance.getStats()
      const sessionCacheStats = sessionCache_instance.getStats()
      const formCacheStats = formStateCache_instance.getStats()
      
      const avgCacheHitRate = (
        userCacheStats.hitRate + 
        sessionCacheStats.hitRate + 
        formCacheStats.hitRate
      ) / 3

      // Get memory usage if available
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0

      const performanceData: AuthPerformanceData = {
        componentLoadTime,
        renderTime,
        interactionTime: 0, // Will be updated by interaction tracking
        cacheHitRate: avgCacheHitRate,
        memoryUsage,
        networkLatency: 0 // Will be updated by network monitoring
      }

      setPerformanceData(performanceData)
      checkPerformanceThresholds(performanceData)
    }

    setIsMonitoring(false)
  }, [componentName, isMonitoring, finalThresholds])

  /**
   * Track user interaction performance
   */
  const trackInteraction = useCallback((interactionType: string) => {
    if (typeof window === 'undefined') return

    interactionStartRef.current = performance.now()
    
    return () => {
      const interactionTime = performance.now() - interactionStartRef.current
      
      setPerformanceData(prev => prev ? {
        ...prev,
        interactionTime
      } : null)

      // Check interaction threshold
      if (interactionTime > finalThresholds.interaction) {
        setWarnings(prev => [...prev, `Slow ${interactionType} interaction: ${interactionTime.toFixed(2)}ms`])
      }
    }
  }, [finalThresholds.interaction])

  /**
   * Track network request performance
   */
  const trackNetworkRequest = useCallback(async <T>(
    requestFn: () => Promise<T>,
    requestName: string
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await requestFn()
      const networkLatency = performance.now() - startTime
      
      setPerformanceData(prev => prev ? {
        ...prev,
        networkLatency: Math.max(prev.networkLatency, networkLatency)
      } : null)

      return result
    } catch (error) {
      const networkLatency = performance.now() - startTime
      setWarnings(prev => [...prev, `Network request failed for ${requestName}: ${networkLatency.toFixed(2)}ms`])
      throw error
    }
  }, [])

  /**
   * Check performance against thresholds
   */
  const checkPerformanceThresholds = useCallback((data: AuthPerformanceData) => {
    const newWarnings: string[] = []

    if (data.componentLoadTime > finalThresholds.componentLoad) {
      newWarnings.push(`Slow component load: ${data.componentLoadTime.toFixed(2)}ms`)
    }

    if (data.renderTime > finalThresholds.render) {
      newWarnings.push(`Slow render: ${data.renderTime.toFixed(2)}ms`)
    }

    if (data.cacheHitRate < finalThresholds.cacheHitRate) {
      newWarnings.push(`Low cache hit rate: ${(data.cacheHitRate * 100).toFixed(1)}%`)
    }

    setWarnings(prev => [...prev, ...newWarnings])
  }, [finalThresholds])

  /**
   * Get performance recommendations
   */
  const getRecommendations = useCallback((): string[] => {
    if (!performanceData) return []

    const recommendations: string[] = []

    if (performanceData.componentLoadTime > finalThresholds.componentLoad) {
      recommendations.push('Consider lazy loading this component')
      recommendations.push('Optimize bundle size by code splitting')
    }

    if (performanceData.renderTime > finalThresholds.render) {
      recommendations.push('Use React.memo() to prevent unnecessary re-renders')
      recommendations.push('Optimize component structure and reduce DOM complexity')
    }

    if (performanceData.cacheHitRate < finalThresholds.cacheHitRate) {
      recommendations.push('Improve caching strategy for frequently accessed data')
      recommendations.push('Increase cache TTL for stable data')
    }

    if (performanceData.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Monitor memory usage and implement cleanup')
      recommendations.push('Consider reducing component state complexity')
    }

    return recommendations
  }, [performanceData, finalThresholds])

  /**
   * Export performance data for analytics
   */
  const exportPerformanceData = useCallback(() => {
    if (!performanceData) return null

    return {
      component: componentName,
      timestamp: Date.now(),
      metrics: performanceData,
      warnings,
      recommendations: getRecommendations(),
      thresholds: finalThresholds,
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    }
  }, [componentName, performanceData, warnings, getRecommendations, finalThresholds])

  // Auto-start monitoring on mount
  useEffect(() => {
    startMonitoring()
    
    return () => {
      if (isMonitoring) {
        endMonitoring()
      }
    }
  }, [startMonitoring, endMonitoring, isMonitoring])

  // Monitor component updates
  useEffect(() => {
    if (isMonitoring && renderStartRef.current > 0) {
      const renderTime = performance.now() - renderStartRef.current
      
      setPerformanceData(prev => prev ? {
        ...prev,
        renderTime
      } : null)
    }
  })

  // Clean up warnings after 30 seconds
  useEffect(() => {
    if (warnings.length > 0) {
      const timer = setTimeout(() => {
        setWarnings([])
      }, 30000)
      
      return () => clearTimeout(timer)
    }
  }, [warnings])

  return {
    performanceData,
    isMonitoring,
    warnings,
    recommendations: getRecommendations(),
    startMonitoring,
    endMonitoring,
    trackInteraction,
    trackNetworkRequest,
    exportPerformanceData
  }
}

/**
 * Hook for monitoring form performance specifically
 */
export function useFormPerformance(formName: string) {
  const {
    performanceData,
    trackInteraction,
    trackNetworkRequest,
    exportPerformanceData
  } = useAuthPerformance(`form-${formName}`, {
    interaction: 100, // Forms can be slightly slower
    render: 150
  })

  const [formMetrics, setFormMetrics] = useState({
    fieldInteractions: 0,
    validationTime: 0,
    submissionTime: 0,
    errorCount: 0
  })

  /**
   * Track field interaction
   */
  const trackFieldInteraction = useCallback((fieldName: string) => {
    setFormMetrics(prev => ({
      ...prev,
      fieldInteractions: prev.fieldInteractions + 1
    }))
    
    return trackInteraction(`field-${fieldName}`)
  }, [trackInteraction])

  /**
   * Track form validation
   */
  const trackValidation = useCallback(async (validationFn: () => Promise<any>) => {
    const startTime = performance.now()
    
    try {
      const result = await validationFn()
      const validationTime = performance.now() - startTime
      
      setFormMetrics(prev => ({
        ...prev,
        validationTime: Math.max(prev.validationTime, validationTime)
      }))
      
      return result
    } catch (error) {
      setFormMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }))
      throw error
    }
  }, [])

  /**
   * Track form submission
   */
  const trackSubmission = useCallback(async (submissionFn: () => Promise<any>) => {
    const endInteraction = trackInteraction('form-submission')
    
    try {
      const result = await trackNetworkRequest(submissionFn, 'form-submission')
      const submissionTime = performance.now()
      
      setFormMetrics(prev => ({
        ...prev,
        submissionTime
      }))
      
      return result
    } finally {
      endInteraction()
    }
  }, [trackInteraction, trackNetworkRequest])

  return {
    performanceData,
    formMetrics,
    trackFieldInteraction,
    trackValidation,
    trackSubmission,
    exportPerformanceData
  }
}

/**
 * Hook for monitoring page-level authentication performance
 */
export function usePagePerformance(pageName: string) {
  const performance = useAuthPerformance(`page-${pageName}`)
  const [pageMetrics, setPageMetrics] = useState({
    timeToInteractive: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach(entry => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setPageMetrics(prev => ({
                ...prev,
                firstContentfulPaint: entry.startTime
              }))
            }
            break
          
          case 'largest-contentful-paint':
            setPageMetrics(prev => ({
              ...prev,
              largestContentfulPaint: entry.startTime
            }))
            break
          
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setPageMetrics(prev => ({
                ...prev,
                cumulativeLayoutShift: prev.cumulativeLayoutShift + (entry as any).value
              }))
            }
            break
        }
      })
    })

    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] })
    } catch (error) {
      console.warn('Performance observer not supported:', error)
    }

    return () => observer.disconnect()
  }, [])

  return {
    ...performance,
    pageMetrics
  }
}