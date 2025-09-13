'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { FloatingCTAConfig } from '@/lib/types/cta'
import { useScrollBehavior } from '@/hooks/use-scroll-behavior'
import { trackCTAClick, trackCTAImpression } from '@/lib/utils/cta-analytics'
import { EnhancedCTAButton } from '@/components/ui/enhanced-cta-button'
import { cn } from '@/lib/utils'

interface FloatingCTAProps {
  config: FloatingCTAConfig
  userId?: string
  className?: string
}

export function FloatingCTA({ config, userId, className }: FloatingCTAProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false)
  
  const { isVisible, currentSection } = useScrollBehavior({
    showAfterScroll: config.showAfterScroll,
    hideOnSections: config.hideOnSections
  })

  // Check if dismissed in localStorage
  useEffect(() => {
    if (config.dismissible) {
      const dismissed = localStorage.getItem(`floating-cta-dismissed-${config.cta.id}`)
      if (dismissed) {
        setIsDismissed(true)
      }
    }
  }, [config.cta.id, config.dismissible])

  // Track impression when CTA becomes visible
  useEffect(() => {
    if (isVisible && !isDismissed && !hasTrackedImpression) {
      trackCTAImpression('floating-cta', config.cta, 'floating', userId)
      setHasTrackedImpression(true)
    }
  }, [isVisible, isDismissed, hasTrackedImpression, config.cta, userId])

  const handleDismiss = () => {
    setIsDismissed(true)
    if (config.dismissible) {
      localStorage.setItem(`floating-cta-dismissed-${config.cta.id}`, 'true')
    }
  }

  const handleClick = () => {
    trackCTAClick('floating-cta', config.cta, 'floating', userId)
  }

  if (!config.enabled || isDismissed || !isVisible) {
    return null
  }

  const getPositionClasses = () => {
    switch (config.position) {
      case 'bottom-right':
        return 'bottom-6 right-6'
      case 'bottom-left':
        return 'bottom-6 left-6'
      case 'bottom-center':
        return 'bottom-6 left-1/2 transform -translate-x-1/2'
      default:
        return 'bottom-6 right-6'
    }
  }

  return (
    <div
      className={cn(
        'fixed z-50 transition-all duration-300 ease-in-out',
        'animate-in slide-in-from-bottom-2 fade-in',
        getPositionClasses(),
        className
      )}
    >
      <div className="relative">
        {/* Floating CTA Container */}
        <div className={cn(
          'bg-gradient-to-r from-windsurf-purple-deep/95 to-c9n-blue-dark/95',
          'backdrop-blur-lg border border-windsurf-pink-hot/20',
          'rounded-2xl shadow-2xl shadow-windsurf-pink-hot/10',
          'p-4 max-w-sm',
          'hover:shadow-3xl hover:shadow-windsurf-pink-hot/20',
          'transition-all duration-300'
        )}>
          {/* Dismiss Button */}
          {config.dismissible && (
            <button
              onClick={handleDismiss}
              className={cn(
                'absolute -top-2 -right-2 w-6 h-6',
                'bg-windsurf-gray-dark border border-windsurf-gray-medium',
                'rounded-full flex items-center justify-center',
                'hover:bg-windsurf-gray-medium transition-colors',
                'text-windsurf-gray-light hover:text-white'
              )}
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {/* CTA Content */}
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm text-windsurf-gray-light mb-3">
                Ready to get started?
              </p>
              <div onClick={handleClick}>
                <EnhancedCTAButton
                  config={{
                    text: config.cta.text,
                    href: config.cta.href,
                    variant: config.cta.variant,
                    icon: config.cta.icon,
                    tracking: config.cta.tracking
                  }}
                  size="md"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Floating Animation Indicator */}
          <div className="absolute -inset-1 bg-gradient-to-r from-windsurf-pink-hot/20 to-windsurf-blue-electric/20 rounded-2xl blur opacity-75 animate-pulse" />
        </div>

        {/* Floating Blob Animation */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-windsurf-pink-hot/10 to-windsurf-blue-electric/10 rounded-2xl animate-gentle-float-1" />
          <div className="absolute top-1 left-1 w-full h-full bg-gradient-to-tl from-windsurf-yellow-bright/5 to-c9n-teal/5 rounded-2xl animate-gentle-float-2" />
        </div>
      </div>
    </div>
  )
}

// Hook to manage multiple floating CTAs
export function useFloatingCTA(configs: FloatingCTAConfig[], userId?: string) {
  const [activeConfig, setActiveConfig] = useState<FloatingCTAConfig | null>(null)

  useEffect(() => {
    // Find the first enabled config that should be shown
    const enabledConfig = configs.find(config => config.enabled)
    setActiveConfig(enabledConfig || null)
  }, [configs])

  return activeConfig
}