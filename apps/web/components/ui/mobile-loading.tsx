'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useMobileOptimizations } from '@/hooks/use-mobile-optimizations'
import { useAccessibility } from '@/contexts/accessibility-context'

interface MobileLoadingProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'spinner' | 'dots' | 'pulse'
  className?: string
  children?: React.ReactNode
}

/**
 * Mobile-optimized loading component with reduced motion support
 * and touch-friendly feedback
 */
export function MobileLoading({ 
  size = 'md', 
  variant = 'spinner', 
  className,
  children 
}: MobileLoadingProps) {
  const { isMobile, isLowEndDevice } = useMobileOptimizations()
  const { prefersReducedMotion } = useAccessibility()

  // Use simpler loading for low-end devices or reduced motion
  const shouldUseSimpleLoading = isLowEndDevice || prefersReducedMotion

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const SpinnerLoader = () => (
    <div
      className={cn(
        'border-2 border-transparent border-t-current rounded-full',
        sizeClasses[size],
        !shouldUseSimpleLoading && 'animate-spin'
      )}
      role="status"
      aria-label="Loading"
    />
  )

  const DotsLoader = () => (
    <div className="flex space-x-1" role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-current rounded-full',
            size === 'sm' && 'w-1 h-1',
            size === 'md' && 'w-2 h-2',
            size === 'lg' && 'w-3 h-3',
            !shouldUseSimpleLoading && 'animate-bounce',
            !shouldUseSimpleLoading && i === 1 && 'animation-delay-75',
            !shouldUseSimpleLoading && i === 2 && 'animation-delay-150'
          )}
        />
      ))}
    </div>
  )

  const PulseLoader = () => (
    <div
      className={cn(
        'bg-current rounded-full',
        sizeClasses[size],
        !shouldUseSimpleLoading && 'animate-pulse'
      )}
      role="status"
      aria-label="Loading"
    />
  )

  const SimpleLoader = () => (
    <div
      className={cn(
        'text-current',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        size === 'lg' && 'text-lg'
      )}
      role="status"
      aria-label="Loading"
    >
      ⏳
    </div>
  )

  const renderLoader = () => {
    if (shouldUseSimpleLoading) {
      return <SimpleLoader />
    }

    switch (variant) {
      case 'dots':
        return <DotsLoader />
      case 'pulse':
        return <PulseLoader />
      default:
        return <SpinnerLoader />
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        // Mobile optimizations
        isMobile && 'touch-none select-none',
        className
      )}
    >
      {renderLoader()}
      {children && (
        <span className={cn(
          'ml-2 text-current',
          // Mobile-first responsive text
          'text-sm xs:text-base sm:text-sm'
        )}>
          {children}
        </span>
      )}
      <span className="sr-only">Loading, please wait</span>
    </div>
  )
}

/**
 * Mobile-optimized loading overlay for forms and containers
 */
interface MobileLoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
}

export function MobileLoadingOverlay({
  isLoading,
  children,
  loadingText = 'Loading...',
  className
}: MobileLoadingOverlayProps) {
  const { isMobile } = useMobileOptimizations()

  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-background/80 backdrop-blur-sm',
            'z-50',
            // Mobile optimizations
            isMobile && 'touch-none'
          )}
          role="status"
          aria-live="polite"
          aria-label={loadingText}
        >
          <div className={cn(
            'flex flex-col items-center space-y-3',
            // Mobile-first responsive padding
            'p-4 xs:p-6 sm:p-4'
          )}>
            <MobileLoading size="lg" />
            <p className={cn(
              'text-foreground font-medium',
              // Mobile-first responsive text
              'text-sm xs:text-base sm:text-sm'
            )}>
              {loadingText}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Mobile-optimized button loading state
 */
interface MobileButtonLoadingProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
}

export function MobileButtonLoading({
  isLoading,
  children,
  loadingText,
  className
}: MobileButtonLoadingProps) {
  const { isMobile } = useMobileOptimizations()

  if (!isLoading) {
    return <>{children}</>
  }

  return (
    <div className={cn(
      'flex items-center justify-center space-x-2',
      // Mobile optimizations
      isMobile && 'min-h-[44px]',
      className
    )}>
      <MobileLoading size="sm" />
      <span className={cn(
        // Mobile-first responsive text
        'text-sm xs:text-base sm:text-sm'
      )}>
        {loadingText || 'Loading...'}
      </span>
    </div>
  )
}