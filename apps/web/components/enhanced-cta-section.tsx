'use client'

import React, { useState, useEffect } from 'react'
import { CTASectionConfig, ABTestConfig } from '@/lib/types/cta'
import { selectCTAVariant, trackCTAClick, trackCTAImpression } from '@/lib/utils/cta-analytics'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { EnhancedCTAButton } from '@/components/ui/enhanced-cta-button'
import { UrgencyIndicator, ScarcityIndicator } from '@/components/ui/urgency-indicator'
import { cn } from '@/lib/utils'

interface EnhancedCTASectionProps {
  config: CTASectionConfig
  abTestConfig?: ABTestConfig
  userId?: string
  className?: string
}

export function EnhancedCTASection({ 
  config, 
  abTestConfig, 
  userId, 
  className 
}: EnhancedCTASectionProps) {
  const [selectedVariant, setSelectedVariant] = useState(config.variants[0])
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false)
  
  const { elementRef, shouldAnimate } = useIntersectionObserver({
    threshold: 0.3,
    triggerOnce: true
  })

  // A/B test variant selection
  useEffect(() => {
    if (abTestConfig?.isActive) {
      const variant = selectCTAVariant(abTestConfig, userId)
      setSelectedVariant(variant)
    }
  }, [abTestConfig, userId])

  // Track impression when section becomes visible
  useEffect(() => {
    if (shouldAnimate && !hasTrackedImpression) {
      trackCTAImpression(config.id, selectedVariant, config.context || 'default', userId)
      setHasTrackedImpression(true)
    }
  }, [shouldAnimate, hasTrackedImpression, config.id, config.context, selectedVariant, userId])

  const handleCTAClick = () => {
    trackCTAClick(config.id, selectedVariant, config.context || 'default', userId)
  }

  const getContextStyles = () => {
    switch (config.context) {
      case 'hero':
        return 'bg-gradient-to-br from-windsurf-purple-deep to-c9n-blue-dark'
      case 'features':
        return 'bg-gradient-to-br from-c9n-blue-dark to-windsurf-purple-deep'
      case 'social-proof':
        return 'bg-gradient-to-br from-windsurf-purple-deep/50 to-c9n-blue-dark/50 backdrop-blur-sm'
      case 'technical':
        return 'bg-gradient-to-br from-c9n-blue-dark to-windsurf-blue-electric/20'
      case 'final':
        return 'bg-gradient-to-br from-windsurf-purple-deep to-c9n-blue-dark'
      default:
        return 'bg-gradient-to-br from-windsurf-purple-deep to-c9n-blue-dark'
    }
  }

  const getAnimationDelay = () => {
    switch (config.context) {
      case 'hero':
        return 'delay-100'
      case 'features':
        return 'delay-200'
      case 'social-proof':
        return 'delay-300'
      case 'technical':
        return 'delay-400'
      case 'final':
        return 'delay-500'
      default:
        return 'delay-200'
    }
  }

  return (
    <section
      ref={elementRef}
      data-section={config.id}
      className={cn(
        'py-16 md:py-24 relative overflow-hidden',
        getContextStyles(),
        className
      )}
    >
      {/* Background Animation */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-windsurf-pink-hot/20 to-transparent rounded-full blur-3xl animate-gentle-float-1" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-windsurf-blue-electric/20 to-transparent rounded-full blur-3xl animate-gentle-float-2" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-c9n-teal/10 to-windsurf-yellow-bright/10 rounded-full blur-2xl animate-gentle-float-3" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={cn(
          'text-center max-w-4xl mx-auto',
          shouldAnimate ? 'animate-in fade-in slide-in-from-bottom-4' : 'opacity-0',
          getAnimationDelay()
        )}>
          {/* Title */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            {config.title}
          </h2>

          {/* Subtitle */}
          {config.subtitle && (
            <h3 className="text-xl sm:text-2xl font-semibold text-windsurf-gray-light mb-4">
              {config.subtitle}
            </h3>
          )}

          {/* Description */}
          {config.description && (
            <p className="text-lg text-windsurf-gray-light max-w-2xl mx-auto mb-8">
              {config.description}
            </p>
          )}

          {/* Urgency Indicator */}
          {config.urgency?.enabled && (
            <div className={cn(
              'mb-6',
              shouldAnimate ? 'animate-in fade-in slide-in-from-bottom-2' : 'opacity-0',
              'delay-300'
            )}>
              <UrgencyIndicator config={config.urgency} userId={userId} />
            </div>
          )}

          {/* Scarcity Indicator */}
          {config.scarcity?.enabled && (
            <div className={cn(
              'mb-6',
              shouldAnimate ? 'animate-in fade-in slide-in-from-bottom-2' : 'opacity-0',
              'delay-400'
            )}>
              <ScarcityIndicator config={config.scarcity} userId={userId} />
            </div>
          )}

          {/* CTA Button */}
          <div className={cn(
            'flex justify-center items-center',
            shouldAnimate ? 'animate-in fade-in slide-in-from-bottom-2' : 'opacity-0',
            'delay-500'
          )}>
            <div onClick={handleCTAClick}>
              <EnhancedCTAButton
                config={{
                  text: selectedVariant.text,
                  href: selectedVariant.href,
                  variant: selectedVariant.variant,
                  icon: selectedVariant.icon,
                  tracking: selectedVariant.tracking
                }}
                size="xl"
                className="shadow-2xl hover:shadow-3xl"
              />
            </div>
          </div>

          {/* Progressive Disclosure - Secondary Actions */}
          {config.context === 'final' && (
            <div className={cn(
              'mt-8 space-y-4',
              shouldAnimate ? 'animate-in fade-in slide-in-from-bottom-2' : 'opacity-0',
              'delay-700'
            )}>
              <p className="text-sm text-windsurf-gray-medium">
                Want to learn more first?
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="/features"
                  className="text-c9n-teal hover:text-windsurf-yellow-bright font-semibold transition-colors"
                >
                  Explore all features
                </a>
                <span className="hidden sm:inline text-windsurf-gray-medium">•</span>
                <a
                  href="/case-studies"
                  className="text-c9n-teal hover:text-windsurf-yellow-bright font-semibold transition-colors"
                >
                  View case studies
                </a>
                <span className="hidden sm:inline text-windsurf-gray-medium">•</span>
                <a
                  href="/pricing"
                  className="text-c9n-teal hover:text-windsurf-yellow-bright font-semibold transition-colors"
                >
                  See pricing
                </a>
              </div>
            </div>
          )}

          {/* Trust Indicators for Hero Context */}
          {config.context === 'hero' && (
            <div className={cn(
              'mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-windsurf-gray-medium',
              shouldAnimate ? 'animate-in fade-in slide-in-from-bottom-2' : 'opacity-0',
              'delay-800'
            )}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Free consultation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span>No commitment required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span>Setup in 24 hours</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}