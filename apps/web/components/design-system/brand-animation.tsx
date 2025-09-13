/**
 * Brand Animation Components
 * 
 * Provides consistent animations following brand guidelines
 * with support for reduced motion preferences.
 */

'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { animations } from '@/lib/design-system/tokens'

export interface BrandAnimationProps {
  /** Animation type */
  type: 'fade' | 'slide' | 'scale' | 'float' | 'glow' | 'bounce' | 'spin'
  /** Animation direction for slide animations */
  direction?: 'up' | 'down' | 'left' | 'right'
  /** Animation duration */
  duration?: 'fast' | 'normal' | 'slow'
  /** Animation delay */
  delay?: number
  /** Whether animation should repeat */
  repeat?: boolean | number
  /** Animation trigger */
  trigger?: 'auto' | 'hover' | 'scroll' | 'click'
  /** Whether to respect reduced motion preferences */
  respectReducedMotion?: boolean
  /** Additional CSS classes */
  className?: string
  /** Child elements */
  children: React.ReactNode
  /** Callback when animation completes */
  onAnimationComplete?: () => void
}

const durationMap = {
  fast: '300ms',
  normal: '500ms',
  slow: '700ms',
}

const easingMap = {
  gentle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
}

export function BrandAnimation({
  type,
  direction = 'up',
  duration = 'normal',
  delay = 0,
  repeat = false,
  trigger = 'auto',
  respectReducedMotion = true,
  className,
  children,
  onAnimationComplete,
  ...props
}: BrandAnimationProps & React.HTMLAttributes<HTMLDivElement>) {
  const [isVisible, setIsVisible] = useState(trigger === 'auto')
  const [isHovered, setIsHovered] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (respectReducedMotion) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mediaQuery.matches)
      
      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches)
      }
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [respectReducedMotion])

  const getAnimationClasses = () => {
    if (prefersReducedMotion) {
      return 'transition-opacity duration-300'
    }

    const baseClasses = []
    
    switch (type) {
      case 'fade':
        baseClasses.push(
          isVisible || trigger === 'hover' 
            ? 'animate-fade-in-up' 
            : 'opacity-0'
        )
        break
      case 'slide':
        baseClasses.push(
          isVisible || trigger === 'hover'
            ? `animate-fade-in-${direction}`
            : `opacity-0 ${getSlideTransform(direction)}`
        )
        break
      case 'scale':
        baseClasses.push(
          isVisible || trigger === 'hover'
            ? 'animate-scale-in'
            : 'opacity-0 scale-90'
        )
        break
      case 'float':
        baseClasses.push('animate-gentle-float-1')
        break
      case 'glow':
        baseClasses.push('animate-pulse-glow')
        break
      case 'bounce':
        baseClasses.push('animate-bounce')
        break
      case 'spin':
        baseClasses.push('animate-spin')
        break
    }

    return baseClasses.join(' ')
  }

  const getSlideTransform = (dir: string) => {
    switch (dir) {
      case 'up': return 'translate-y-8'
      case 'down': return '-translate-y-8'
      case 'left': return 'translate-x-8'
      case 'right': return '-translate-x-8'
      default: return 'translate-y-8'
    }
  }

  const animationStyle: React.CSSProperties = {
    animationDuration: durationMap[duration],
    animationDelay: `${delay}ms`,
    animationIterationCount: repeat === true ? 'infinite' : typeof repeat === 'number' ? repeat : 1,
    animationFillMode: 'forwards',
  }

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsHovered(true)
      setIsVisible(true)
    }
  }

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsHovered(false)
      setIsVisible(false)
    }
  }

  const handleClick = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible)
    }
  }

  const handleAnimationEnd = () => {
    onAnimationComplete?.()
  }

  return (
    <div
      className={cn(getAnimationClasses(), className)}
      style={animationStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onAnimationEnd={handleAnimationEnd}
      {...props}
    >
      {children}
    </div>
  )
}

// Floating blob animation component
export interface FloatingBlobProps {
  /** Blob size */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Blob color variant */
  variant: 'primary' | 'secondary' | 'accent'
  /** Animation speed */
  speed?: 'slow' | 'normal' | 'fast'
  /** Blob opacity */
  opacity?: number
  /** Additional CSS classes */
  className?: string
  /** Custom position */
  position?: {
    top?: string
    left?: string
    right?: string
    bottom?: string
  }
}

export function FloatingBlob({
  size = 'md',
  variant,
  speed = 'normal',
  opacity = 0.6,
  className,
  position,
  ...props
}: FloatingBlobProps & React.HTMLAttributes<HTMLDivElement>) {
  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64',
    xl: 'w-80 h-80',
  }

  const variantClasses = {
    primary: 'bg-purple-pink-gradient',
    secondary: 'bg-blue-teal-gradient',
    accent: 'bg-yellow-lime-gradient',
  }

  const speedClasses = {
    slow: 'animate-gentle-float-1',
    normal: 'animate-gentle-float-2',
    fast: 'animate-gentle-float-3',
  }

  const blobClasses = cn(
    'absolute rounded-full blur-xl pointer-events-none',
    sizeClasses[size],
    variantClasses[variant],
    speedClasses[speed],
    className
  )

  const blobStyle: React.CSSProperties = {
    opacity,
    ...position,
  }

  return <div className={blobClasses} style={blobStyle} {...props} />
}

// Scroll-triggered animation component
export interface ScrollAnimationProps {
  /** Animation to trigger on scroll */
  animation: 'fade' | 'slide' | 'scale' | 'stagger'
  /** Scroll threshold (0-1) */
  threshold?: number
  /** Animation delay */
  delay?: number
  /** Whether to animate only once */
  once?: boolean
  /** Additional CSS classes */
  className?: string
  /** Child elements */
  children: React.ReactNode
}

export function ScrollAnimation({
  animation,
  threshold = 0.1,
  delay = 0,
  once = true,
  className,
  children,
}: ScrollAnimationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!once || !hasAnimated)) {
          setTimeout(() => {
            setIsVisible(true)
            setHasAnimated(true)
          }, delay)
        } else if (!once && !entry.isIntersecting) {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    const element = document.getElementById(`scroll-animation-${Math.random()}`)
    if (element) {
      observer.observe(element)
    }

    return () => observer.disconnect()
  }, [threshold, delay, once, hasAnimated])

  const getAnimationClass = () => {
    switch (animation) {
      case 'fade':
        return isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'
      case 'slide':
        return isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'
      case 'scale':
        return isVisible ? 'animate-scale-in' : 'opacity-0 scale-90'
      case 'stagger':
        return isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'
      default:
        return ''
    }
  }

  return (
    <div
      id={`scroll-animation-${Math.random()}`}
      className={cn(
        'transition-all duration-700 ease-out',
        getAnimationClass(),
        className
      )}
    >
      {children}
    </div>
  )
}

// Staggered animation container
export interface StaggeredAnimationProps {
  /** Stagger delay between children */
  staggerDelay?: number
  /** Base animation for children */
  animation?: 'fade' | 'slide' | 'scale'
  /** Animation trigger */
  trigger?: 'auto' | 'scroll'
  /** Additional CSS classes */
  className?: string
  /** Child elements */
  children: React.ReactNode
}

export function StaggeredAnimation({
  staggerDelay = 100,
  animation = 'fade',
  trigger = 'auto',
  className,
  children,
}: StaggeredAnimationProps) {
  const [isVisible, setIsVisible] = useState(trigger === 'auto')

  useEffect(() => {
    if (trigger === 'scroll') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        },
        { threshold: 0.1 }
      )

      const element = document.getElementById(`staggered-animation-${Math.random()}`)
      if (element) {
        observer.observe(element)
      }

      return () => observer.disconnect()
    }
  }, [trigger])

  return (
    <div
      id={`staggered-animation-${Math.random()}`}
      className={cn('space-y-4', className)}
    >
      {React.Children.map(children, (child, index) => (
        <BrandAnimation
          type={animation}
          delay={index * staggerDelay}
          trigger={isVisible ? 'auto' : 'scroll'}
        >
          {child}
        </BrandAnimation>
      ))}
    </div>
  )
}

// Pulse glow animation component
export interface PulseGlowProps {
  /** Glow color variant */
  variant: 'primary' | 'secondary' | 'accent'
  /** Glow intensity */
  intensity?: 'subtle' | 'normal' | 'strong'
  /** Animation speed */
  speed?: 'slow' | 'normal' | 'fast'
  /** Additional CSS classes */
  className?: string
  /** Child elements */
  children: React.ReactNode
}

export function PulseGlow({
  variant,
  intensity = 'normal',
  speed = 'normal',
  className,
  children,
  ...props
}: PulseGlowProps & React.HTMLAttributes<HTMLDivElement>) {
  const glowColors = {
    primary: 'rgba(231, 29, 115, 0.3)',
    secondary: 'rgba(0, 178, 255, 0.3)',
    accent: 'rgba(255, 215, 0, 0.3)',
  }

  const intensityMap = {
    subtle: 0.2,
    normal: 0.4,
    strong: 0.6,
  }

  const speedMap = {
    slow: '4s',
    normal: '3s',
    fast: '2s',
  }

  const glowStyle: React.CSSProperties = {
    boxShadow: `0 0 20px ${glowColors[variant]}`,
    animation: `pulse-glow ${speedMap[speed]} ease-in-out infinite`,
  }

  return (
    <div
      className={cn('animate-pulse-glow', className)}
      style={glowStyle}
      {...props}
    >
      {children}
    </div>
  )
}