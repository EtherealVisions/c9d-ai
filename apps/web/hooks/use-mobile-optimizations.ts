'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccessibility } from '@/contexts/accessibility-context'

interface MobileOptimizations {
  // Device detection
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  
  // Orientation
  isPortrait: boolean
  isLandscape: boolean
  
  // Viewport
  viewportHeight: number
  viewportWidth: number
  safeAreaInsets: {
    top: number
    right: number
    bottom: number
    left: number
  }
  
  // Touch capabilities
  supportsTouchEvents: boolean
  supportsPointerEvents: boolean
  maxTouchPoints: number
  
  // Performance
  isLowEndDevice: boolean
  prefersReducedData: boolean
  
  // Keyboard
  isVirtualKeyboardOpen: boolean
  
  // Methods
  addTouchFeedback: (element: HTMLElement) => () => void
  optimizeForMobile: (element: HTMLElement) => () => void
  handleOrientationChange: (callback: (orientation: 'portrait' | 'landscape') => void) => () => void
}

/**
 * Hook for comprehensive mobile optimizations
 * Provides device detection, touch handling, and performance optimizations
 */
export function useMobileOptimizations(): MobileOptimizations {
  const { isTouchDevice, prefersReducedMotion } = useAccessibility()
  
  // State for device characteristics
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isPortrait: true,
    isLandscape: false,
    viewportHeight: 0,
    viewportWidth: 0,
    supportsTouchEvents: false,
    supportsPointerEvents: false,
    maxTouchPoints: 0,
    isLowEndDevice: false,
    prefersReducedData: false,
    isVirtualKeyboardOpen: false
  })

  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  })

  // Detect device capabilities
  const detectDeviceCapabilities = useCallback(() => {
    if (typeof window === 'undefined') return

    const userAgent = navigator.userAgent.toLowerCase()
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent) || 
                     (window.innerWidth >= 768 && window.innerWidth <= 1024)
    const isDesktop = !isMobile && !isTablet

    const supportsTouchEvents = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const supportsPointerEvents = 'onpointerdown' in window
    const maxTouchPoints = navigator.maxTouchPoints || 0

    // Detect low-end devices
    const isLowEndDevice = 
      (navigator as any).hardwareConcurrency <= 2 ||
      (navigator as any).deviceMemory <= 2 ||
      /android 4|android 5/i.test(userAgent)

    // Detect reduced data preference
    const prefersReducedData = 
      (navigator as any).connection?.saveData ||
      (navigator as any).connection?.effectiveType === 'slow-2g' ||
      (navigator as any).connection?.effectiveType === '2g'

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const isPortrait = viewportHeight > viewportWidth
    const isLandscape = !isPortrait

    setDeviceInfo({
      isMobile,
      isTablet,
      isDesktop,
      isPortrait,
      isLandscape,
      viewportHeight,
      viewportWidth,
      supportsTouchEvents,
      supportsPointerEvents,
      maxTouchPoints,
      isLowEndDevice,
      prefersReducedData,
      isVirtualKeyboardOpen: false // Will be updated by keyboard detection
    })
  }, [])

  // Detect safe area insets
  const detectSafeAreaInsets = useCallback(() => {
    if (typeof window === 'undefined') return

    const computedStyle = getComputedStyle(document.documentElement)
    
    setSafeAreaInsets({
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0,
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 0,
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 0
    })
  }, [])

  // Detect virtual keyboard
  const detectVirtualKeyboard = useCallback(() => {
    if (typeof window === 'undefined') return

    const initialViewportHeight = window.innerHeight
    let currentViewportHeight = initialViewportHeight

    const handleResize = () => {
      currentViewportHeight = window.innerHeight
      const heightDifference = initialViewportHeight - currentViewportHeight
      const isKeyboardOpen = heightDifference > 150 // Threshold for keyboard detection

      setDeviceInfo(prev => ({
        ...prev,
        isVirtualKeyboardOpen: isKeyboardOpen,
        viewportHeight: currentViewportHeight
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Add touch feedback to elements
  const addTouchFeedback = useCallback((element: HTMLElement) => {
    if (!isTouchDevice || prefersReducedMotion) return () => {}

    const handleTouchStart = (e: TouchEvent) => {
      element.classList.add('touch-feedback')
      
      // Create ripple effect
      const rect = element.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      
      const ripple = document.createElement('div')
      ripple.className = 'touch-ripple'
      ripple.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        animation: ripple-expand 0.6s ease-out;
        pointer-events: none;
        z-index: 1000;
      `
      
      element.style.position = 'relative'
      element.appendChild(ripple)
      
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple)
        }
      }, 600)
    }

    const handleTouchEnd = () => {
      element.classList.remove('touch-feedback')
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isTouchDevice, prefersReducedMotion])

  // Optimize element for mobile
  const optimizeForMobile = useCallback((element: HTMLElement) => {
    if (typeof window === 'undefined') return () => {}

    const cleanupFunctions: (() => void)[] = []

    // Add touch feedback
    cleanupFunctions.push(addTouchFeedback(element))

    // Optimize touch targets
    if (deviceInfo.isMobile) {
      const originalMinHeight = element.style.minHeight
      const originalMinWidth = element.style.minWidth
      
      element.style.minHeight = '44px'
      element.style.minWidth = '44px'
      
      cleanupFunctions.push(() => {
        element.style.minHeight = originalMinHeight
        element.style.minWidth = originalMinWidth
      })
    }

    // Add hardware acceleration for animations
    if (!deviceInfo.isLowEndDevice) {
      element.style.transform = 'translateZ(0)'
      element.style.backfaceVisibility = 'hidden'
      
      cleanupFunctions.push(() => {
        element.style.transform = ''
        element.style.backfaceVisibility = ''
      })
    }

    // Optimize for reduced data
    if (deviceInfo.prefersReducedData) {
      element.classList.add('reduced-data')
    }

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
      element.classList.remove('reduced-data')
    }
  }, [deviceInfo, addTouchFeedback])

  // Handle orientation changes
  const handleOrientationChange = useCallback((
    callback: (orientation: 'portrait' | 'landscape') => void
  ) => {
    if (typeof window === 'undefined') return () => {}

    const handleChange = () => {
      const isPortrait = window.innerHeight > window.innerWidth
      callback(isPortrait ? 'portrait' : 'landscape')
      
      setDeviceInfo(prev => ({
        ...prev,
        isPortrait,
        isLandscape: !isPortrait,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth
      }))
    }

    window.addEventListener('orientationchange', handleChange)
    window.addEventListener('resize', handleChange)

    return () => {
      window.removeEventListener('orientationchange', handleChange)
      window.removeEventListener('resize', handleChange)
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    detectDeviceCapabilities()
    detectSafeAreaInsets()
    const cleanupKeyboard = detectVirtualKeyboard()

    // Add CSS custom properties for viewport height
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    
    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)

    // Add ripple animation styles
    if (!document.getElementById('mobile-ripple-styles')) {
      const style = document.createElement('style')
      style.id = 'mobile-ripple-styles'
      style.textContent = `
        @keyframes ripple-expand {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }
        
        .touch-feedback:active {
          transform: scale(0.98);
        }
        
        @media (prefers-reduced-motion: reduce) {
          .touch-feedback:active {
            transform: none;
          }
          
          @keyframes ripple-expand {
            0%, 100% {
              width: 0;
              height: 0;
              opacity: 0;
            }
          }
        }
        
        .reduced-data * {
          animation: none !important;
          transition: none !important;
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      cleanupKeyboard?.()
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [detectDeviceCapabilities, detectSafeAreaInsets, detectVirtualKeyboard])

  // Update device info on window resize
  useEffect(() => {
    const handleResize = () => {
      detectDeviceCapabilities()
      detectSafeAreaInsets()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [detectDeviceCapabilities, detectSafeAreaInsets])

  return {
    ...deviceInfo,
    safeAreaInsets,
    addTouchFeedback,
    optimizeForMobile,
    handleOrientationChange
  }
}