"use client"

import { useState, useEffect, useCallback } from 'react'

interface MobileOptimizedConfig {
  touchThreshold?: number
  swipeThreshold?: number
  reducedMotion?: boolean
  performanceMode?: 'auto' | 'high' | 'low'
}

interface TouchGesture {
  startX: number
  startY: number
  endX: number
  endY: number
  deltaX: number
  deltaY: number
  direction: 'left' | 'right' | 'up' | 'down' | null
  distance: number
  duration: number
}

interface MobileOptimizedReturn {
  isMobile: boolean
  isTablet: boolean
  isTouch: boolean
  orientation: 'portrait' | 'landscape'
  reducedMotion: boolean
  performanceMode: 'high' | 'low'
  devicePixelRatio: number
  connectionSpeed: 'slow' | 'fast'
  handleTouchStart: (e: TouchEvent) => void
  handleTouchEnd: (e: TouchEvent) => void
  onSwipe: (callback: (gesture: TouchGesture) => void) => void
  prefersReducedMotion: boolean
}

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const TOUCH_THRESHOLD = 10
const SWIPE_THRESHOLD = 50

export function useMobileOptimized(config: MobileOptimizedConfig = {}): MobileOptimizedReturn {
  const {
    touchThreshold = TOUCH_THRESHOLD,
    swipeThreshold = SWIPE_THRESHOLD,
    reducedMotion: forceReducedMotion,
    performanceMode = 'auto'
  } = config

  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [devicePixelRatio, setDevicePixelRatio] = useState(1)
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast'>('fast')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null)
  const [swipeCallbacks, setSwipeCallbacks] = useState<((gesture: TouchGesture) => void)[]>([])

  // Detect device capabilities and preferences
  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth
      setIsMobile(width < MOBILE_BREAKPOINT)
      setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT)
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
      setDevicePixelRatio(window.devicePixelRatio || 1)
    }

    const updateMotionPreference = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mediaQuery.matches)
    }

    const updateConnectionSpeed = () => {
      // @ts-ignore - navigator.connection is experimental
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (connection) {
        const effectiveType = connection.effectiveType
        setConnectionSpeed(effectiveType === 'slow-2g' || effectiveType === '2g' ? 'slow' : 'fast')
      }
    }

    updateDeviceInfo()
    updateMotionPreference()
    updateConnectionSpeed()

    const resizeHandler = () => updateDeviceInfo()
    const orientationHandler = () => {
      setTimeout(updateDeviceInfo, 100) // Delay to get accurate dimensions after orientation change
    }
    const motionHandler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)

    window.addEventListener('resize', resizeHandler)
    window.addEventListener('orientationchange', orientationHandler)
    
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', motionHandler)

    return () => {
      window.removeEventListener('resize', resizeHandler)
      window.removeEventListener('orientationchange', orientationHandler)
      motionQuery.removeEventListener('change', motionHandler)
    }
  }, [])

  // Determine performance mode
  const actualPerformanceMode = performanceMode === 'auto' 
    ? (isMobile && connectionSpeed === 'slow') || devicePixelRatio > 2 ? 'low' : 'high'
    : performanceMode === 'high' ? 'high' : 'low'

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      })
    }
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart || e.changedTouches.length !== 1) return

    const touch = e.changedTouches[0]
    const endTime = Date.now()
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = endTime - touchStart.time

    if (distance > swipeThreshold) {
      const gesture: TouchGesture = {
        startX: touchStart.x,
        startY: touchStart.y,
        endX: touch.clientX,
        endY: touch.clientY,
        deltaX,
        deltaY,
        direction: Math.abs(deltaX) > Math.abs(deltaY) 
          ? (deltaX > 0 ? 'right' : 'left')
          : (deltaY > 0 ? 'down' : 'up'),
        distance,
        duration
      }

      swipeCallbacks.forEach(callback => callback(gesture))
    }

    setTouchStart(null)
  }, [touchStart, swipeThreshold, swipeCallbacks])

  const onSwipe = useCallback((callback: (gesture: TouchGesture) => void) => {
    setSwipeCallbacks(prev => [...prev, callback])
    
    // Return cleanup function
    return () => {
      setSwipeCallbacks(prev => prev.filter(cb => cb !== callback))
    }
  }, [])

  const reducedMotion = forceReducedMotion ?? prefersReducedMotion

  return {
    isMobile,
    isTablet,
    isTouch,
    orientation,
    reducedMotion,
    performanceMode: actualPerformanceMode,
    devicePixelRatio,
    connectionSpeed,
    handleTouchStart,
    handleTouchEnd,
    onSwipe,
    prefersReducedMotion
  }
}

// Hook for touch-friendly carousel navigation
export function useTouchCarousel(itemCount: number, autoPlay = false, autoPlayDelay = 5000) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay)
  const { onSwipe } = useMobileOptimized()

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % itemCount)
    }, autoPlayDelay)

    return () => clearInterval(interval)
  }, [isAutoPlaying, itemCount, autoPlayDelay])

  useEffect(() => {
    const cleanup = onSwipe((gesture) => {
      setIsAutoPlaying(false) // Stop auto-play on manual interaction
      
      if (gesture.direction === 'left') {
        setCurrentIndex(prev => (prev + 1) % itemCount)
      } else if (gesture.direction === 'right') {
        setCurrentIndex(prev => (prev - 1 + itemCount) % itemCount)
      }
      
      // Resume auto-play after 10 seconds
      setTimeout(() => setIsAutoPlaying(autoPlay), 10000)
    })

    return cleanup
  }, [onSwipe, itemCount, autoPlay])

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(autoPlay), 10000)
  }, [autoPlay])

  const next = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % itemCount)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(autoPlay), 10000)
  }, [itemCount, autoPlay])

  const previous = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + itemCount) % itemCount)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(autoPlay), 10000)
  }, [itemCount, autoPlay])

  return {
    currentIndex,
    isAutoPlaying,
    goToIndex,
    next,
    previous,
    setIsAutoPlaying
  }
}