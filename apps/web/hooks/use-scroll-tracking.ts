import { useEffect, useRef, useCallback } from 'react'
import { trackScrollDepth } from '@/lib/analytics/events'

interface ScrollTrackingOptions {
  thresholds?: number[]
  sectionName?: string
  debounceMs?: number
}

export function useScrollTracking(options: ScrollTrackingOptions = {}) {
  const {
    thresholds = [25, 50, 75, 90, 100],
    sectionName,
    debounceMs = 500
  } = options

  const trackedDepths = useRef(new Set<number>())
  const lastScrollTime = useRef(0)

  const handleScroll = useCallback(() => {
    const now = Date.now()
    if (now - lastScrollTime.current < debounceMs) return
    lastScrollTime.current = now

    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrolled = window.scrollY
    const scrollPercentage = Math.round((scrolled / scrollHeight) * 100)

    thresholds.forEach(threshold => {
      if (scrollPercentage >= threshold && !trackedDepths.current.has(threshold)) {
        trackedDepths.current.add(threshold)
        trackScrollDepth(threshold, sectionName, {
          actualPercentage: scrollPercentage,
          scrolledPixels: scrolled,
          totalHeight: scrollHeight
        })
      }
    })
  }, [thresholds, sectionName, debounceMs])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Check initial scroll position
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Reset tracking when section changes
  useEffect(() => {
    trackedDepths.current.clear()
  }, [sectionName])
}

// Hook for tracking element visibility
export function useElementVisibility(
  elementRef: React.RefObject<HTMLElement>,
  onVisible: () => void,
  options: IntersectionObserverInit = {}
) {
  const hasBeenVisible = useRef(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !hasBeenVisible.current) {
            hasBeenVisible.current = true
            onVisible()
          }
        })
      },
      {
        threshold: 0.5,
        ...options
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [elementRef, onVisible, options])
}