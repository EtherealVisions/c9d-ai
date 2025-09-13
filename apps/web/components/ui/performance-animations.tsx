"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useMobileOptimized } from '@/hooks/use-mobile-optimized'
import { cn } from '@/lib/utils'

interface AnimationConfig {
  duration?: number
  delay?: number
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear'
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both'
  iterationCount?: number | 'infinite'
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
}

interface PerformanceAnimationProps {
  children: React.ReactNode
  className?: string
  animation: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scaleIn' | 'rotateIn' | 'bounce' | 'pulse' | 'float'
  config?: AnimationConfig
  trigger?: 'immediate' | 'scroll' | 'hover' | 'focus'
  threshold?: number
  once?: boolean
  disabled?: boolean
  fallback?: React.ReactNode
}

// CSS-in-JS animations for better performance control
const animations = {
  fadeIn: {
    keyframes: [
      { opacity: 0 },
      { opacity: 1 }
    ],
    options: { duration: 600, easing: 'ease-out', fill: 'forwards' as FillMode }
  },
  slideUp: {
    keyframes: [
      { opacity: 0, transform: 'translateY(30px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    options: { duration: 600, easing: 'ease-out', fill: 'forwards' as FillMode }
  },
  slideDown: {
    keyframes: [
      { opacity: 0, transform: 'translateY(-30px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    options: { duration: 600, easing: 'ease-out', fill: 'forwards' as FillMode }
  },
  slideLeft: {
    keyframes: [
      { opacity: 0, transform: 'translateX(30px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    options: { duration: 600, easing: 'ease-out', fill: 'forwards' as FillMode }
  },
  slideRight: {
    keyframes: [
      { opacity: 0, transform: 'translateX(-30px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    options: { duration: 600, easing: 'ease-out', fill: 'forwards' as FillMode }
  },
  scaleIn: {
    keyframes: [
      { opacity: 0, transform: 'scale(0.9)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    options: { duration: 500, easing: 'ease-out', fill: 'forwards' as FillMode }
  },
  rotateIn: {
    keyframes: [
      { opacity: 0, transform: 'rotate(-10deg) scale(0.9)' },
      { opacity: 1, transform: 'rotate(0deg) scale(1)' }
    ],
    options: { duration: 700, easing: 'ease-out', fill: 'forwards' as FillMode }
  },
  bounce: {
    keyframes: [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-10px)' },
      { transform: 'translateY(0)' }
    ],
    options: { duration: 1000, easing: 'ease-in-out', iterationCount: Infinity }
  },
  pulse: {
    keyframes: [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0.8, transform: 'scale(1.05)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    options: { duration: 2000, easing: 'ease-in-out', iterationCount: Infinity }
  },
  float: {
    keyframes: [
      { transform: 'translateY(0px)' },
      { transform: 'translateY(-10px)' },
      { transform: 'translateY(0px)' }
    ],
    options: { duration: 3000, easing: 'ease-in-out', iterationCount: Infinity }
  }
}

export function PerformanceAnimation({
  children,
  className = '',
  animation,
  config = {},
  trigger = 'scroll',
  threshold = 0.1,
  once = true,
  disabled = false,
  fallback
}: PerformanceAnimationProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(trigger === 'immediate')
  const [hasAnimated, setHasAnimated] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const animationRef = useRef<Animation | null>(null)
  
  const { 
    reducedMotion, 
    performanceMode, 
    isMobile, 
    connectionSpeed 
  } = useMobileOptimized()

  // Determine if animation should be disabled
  const shouldDisableAnimation = disabled || 
    reducedMotion || 
    (performanceMode === 'low' && connectionSpeed === 'slow')

  // Intersection Observer for scroll trigger
  useEffect(() => {
    if (trigger !== 'scroll' || shouldDisableAnimation) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!once || !hasAnimated)) {
          setIsVisible(true)
          if (once) {
            setHasAnimated(true)
            observer.disconnect()
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin: '50px' }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [trigger, threshold, once, hasAnimated, shouldDisableAnimation])

  // Animation execution
  const executeAnimation = useCallback(() => {
    if (!elementRef.current || shouldDisableAnimation) return

    // Cancel previous animation
    if (animationRef.current) {
      animationRef.current.cancel()
    }

    const animationData = animations[animation]
    if (!animationData) return

    // Merge config with default options
    const options = {
      ...animationData.options,
      ...config,
      duration: config.duration || (isMobile ? animationData.options.duration * 0.8 : animationData.options.duration)
    }

    // Use Web Animations API for better performance
    try {
      animationRef.current = elementRef.current.animate(
        animationData.keyframes,
        options
      )

      // Handle animation completion
      animationRef.current.addEventListener('finish', () => {
        if (once) {
          setHasAnimated(true)
        }
      })
    } catch (error) {
      console.warn('Animation failed:', error)
      // Fallback to CSS classes for older browsers
      elementRef.current.classList.add(`animate-${animation}`)
    }
  }, [animation, config, shouldDisableAnimation, isMobile, once])

  // Trigger animation based on conditions
  useEffect(() => {
    if (shouldDisableAnimation) return

    const shouldAnimate = 
      (trigger === 'immediate') ||
      (trigger === 'scroll' && isVisible) ||
      (trigger === 'hover' && isHovered) ||
      (trigger === 'focus' && isFocused)

    if (shouldAnimate && (!once || !hasAnimated)) {
      executeAnimation()
    }
  }, [trigger, isVisible, isHovered, isFocused, executeAnimation, once, hasAnimated, shouldDisableAnimation])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.cancel()
      }
    }
  }, [])

  // Event handlers for hover and focus triggers
  const handleMouseEnter = useCallback(() => {
    if (trigger === 'hover') {
      setIsHovered(true)
    }
  }, [trigger])

  const handleMouseLeave = useCallback(() => {
    if (trigger === 'hover') {
      setIsHovered(false)
    }
  }, [trigger])

  const handleFocus = useCallback(() => {
    if (trigger === 'focus') {
      setIsFocused(true)
    }
  }, [trigger])

  const handleBlur = useCallback(() => {
    if (trigger === 'focus') {
      setIsFocused(false)
    }
  }, [trigger])

  // Render fallback if animations are disabled
  if (shouldDisableAnimation && fallback) {
    return <>{fallback}</>
  }

  return (
    <div
      ref={elementRef}
      className={cn(
        'will-change-transform', // Optimize for animations
        trigger === 'scroll' && !isVisible && !shouldDisableAnimation && 'opacity-0',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{
        // Ensure hardware acceleration
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        perspective: '1000px'
      }}
    >
      {children}
    </div>
  )
}

// Staggered animation component for lists
interface StaggeredAnimationProps {
  children: React.ReactNode[]
  className?: string
  animation?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scaleIn'
  staggerDelay?: number
  trigger?: 'scroll' | 'immediate'
  threshold?: number
}

export function StaggeredAnimation({
  children,
  className = '',
  animation = 'slideUp',
  staggerDelay = 100,
  trigger = 'scroll',
  threshold = 0.1
}: StaggeredAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(trigger === 'immediate')
  const { reducedMotion, performanceMode } = useMobileOptimized()

  const shouldDisableAnimation = reducedMotion || performanceMode === 'low'
  const actualStaggerDelay = shouldDisableAnimation ? 0 : staggerDelay

  useEffect(() => {
    if (trigger !== 'scroll' || shouldDisableAnimation) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [trigger, threshold, shouldDisableAnimation])

  return (
    <div ref={containerRef} className={className}>
      {children.map((child, index) => (
        <PerformanceAnimation
          key={index}
          animation={animation}
          trigger={isVisible ? 'immediate' : 'scroll'}
          config={{ delay: index * actualStaggerDelay }}
          disabled={shouldDisableAnimation}
        >
          {child}
        </PerformanceAnimation>
      ))}
    </div>
  )
}

// Parallax scroll component with performance optimization
interface ParallaxScrollProps {
  children: React.ReactNode
  className?: string
  speed?: number
  disabled?: boolean
}

export function ParallaxScroll({
  children,
  className = '',
  speed = 0.5,
  disabled = false
}: ParallaxScrollProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const { reducedMotion, performanceMode, isMobile } = useMobileOptimized()

  const shouldDisableParallax = disabled || 
    reducedMotion || 
    performanceMode === 'low' || 
    isMobile // Disable on mobile for better performance

  useEffect(() => {
    if (shouldDisableParallax) return

    let ticking = false

    const updateOffset = () => {
      if (!elementRef.current) return

      const rect = elementRef.current.getBoundingClientRect()
      const scrolled = window.pageYOffset
      const rate = scrolled * -speed
      
      setOffset(rate)
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateOffset)
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed, shouldDisableParallax])

  return (
    <div
      ref={elementRef}
      className={cn('will-change-transform', className)}
      style={{
        transform: shouldDisableParallax ? 'none' : `translateY(${offset}px)`,
        backfaceVisibility: 'hidden'
      }}
    >
      {children}
    </div>
  )
}

// Hook for managing animation performance
export function useAnimationPerformance() {
  const { reducedMotion, performanceMode, connectionSpeed } = useMobileOptimized()
  
  const shouldReduceAnimations = reducedMotion || 
    (performanceMode === 'low' && connectionSpeed === 'slow')
  
  const getAnimationDuration = useCallback((baseDuration: number) => {
    if (shouldReduceAnimations) return 0
    if (performanceMode === 'low') return baseDuration * 0.7
    return baseDuration
  }, [shouldReduceAnimations, performanceMode])
  
  const getAnimationDelay = useCallback((baseDelay: number) => {
    if (shouldReduceAnimations) return 0
    if (performanceMode === 'low') return baseDelay * 0.5
    return baseDelay
  }, [shouldReduceAnimations, performanceMode])
  
  return {
    shouldReduceAnimations,
    getAnimationDuration,
    getAnimationDelay,
    performanceMode,
    reducedMotion
  }
}