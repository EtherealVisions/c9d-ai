'use client'

import React from 'react'
import { CalendarCheckIcon, CheckCircleIcon, PlayIcon, ArrowRightIcon } from "lucide-react"
import { EnhancedHeroSectionProps, CTAConfig, ButtonCTAConfig, AnimationConfig, HeroMetric } from "@/lib/types/hero"
import { FloatingBlobs } from "@/components/ui/floating-blobs"
import { EnhancedCTAButton } from "@/components/ui/enhanced-cta-button"
import { HeroMetrics } from "@/components/hero-metrics"
import { ProgressiveImage } from "@/components/ui/progressive-image"
import { PerformanceAnimation } from "@/components/ui/performance-animations"
import { useMobileOptimized } from "@/hooks/use-mobile-optimized"
import { getABTestVariant, trackPerformance } from "@/lib/utils/analytics"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

// Default configuration
const defaultAnimationConfig: AnimationConfig = {
  enableFloatingBlobs: true,
  blobCount: 3,
  animationSpeed: 'medium',
  colorScheme: 'mixed'
}

const defaultPrimaryCTA: ButtonCTAConfig = {
  text: "Request a Consultation",
  href: "/request-consultation",
  variant: "primary",
  icon: CalendarCheckIcon,
  tracking: {
    event: "hero_primary_cta_click",
    category: "conversion",
    label: "consultation_request",
    value: 100
  }
}

const defaultSecondaryCTA: ButtonCTAConfig = {
  text: "Watch Demo",
  href: "/demo",
  variant: "outline",
  icon: PlayIcon,
  tracking: {
    event: "hero_secondary_cta_click",
    category: "engagement",
    label: "demo_request",
    value: 50
  }
}

const defaultMetrics: HeroMetric[] = [
  {
    id: 'users',
    value: 10000,
    label: 'Active Users',
    description: 'Trusted by professionals worldwide',
    animateCounter: true
  },
  {
    id: 'accuracy',
    value: 99,
    label: 'Accuracy Rate',
    description: 'AI-powered precision',
    animateCounter: true
  }
]

// A/B test variants
const abTestVariants = [
  {
    id: 'original',
    title: "Unlock Deeper Insights.",
    subtitle: "C9N.AI leverages advanced AI to analyze and coordinate disparate, opaque relationships, bringing you relevant information and insights.",
    primaryCTA: defaultPrimaryCTA,
    secondaryCTA: defaultSecondaryCTA,
    weight: 50
  },
  {
    id: 'variant_a',
    title: "Transform Your Data Into Intelligence.",
    subtitle: "Discover hidden patterns and connections with C9N.AI's advanced orchestration platform. Get actionable insights from complex data relationships.",
    primaryCTA: {
      ...defaultPrimaryCTA,
      text: "Start Free Trial",
      href: "/signup",
      tracking: {
        event: "hero_primary_cta_click_variant_a",
        category: "conversion",
        label: "free_trial"
      }
    },
    secondaryCTA: defaultSecondaryCTA,
    weight: 50
  }
]

export default function HeroSection({
  title,
  subtitle,
  primaryCTA,
  secondaryCTA,
  backgroundAnimation = defaultAnimationConfig,
  metrics = defaultMetrics,
  abTestVariants: customABVariants,
  enableABTesting = true
}: EnhancedHeroSectionProps = {}) {
  const [activeVariant, setActiveVariant] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  
  const { 
    isMobile, 
    isTablet, 
    reducedMotion, 
    performanceMode,
    orientation 
  } = useMobileOptimized()

  useEffect(() => {
    setIsClient(true)
    
    // Initialize performance tracking
    trackPerformance()

    // A/B testing logic
    if (enableABTesting && (customABVariants || abTestVariants)) {
      const variants = customABVariants || abTestVariants
      const selectedVariant = getABTestVariant(variants)
      setActiveVariant(selectedVariant)
    }
  }, [enableABTesting, customABVariants])

  // Use A/B test variant or props/defaults
  const currentTitle = activeVariant?.title || title || "Unlock Deeper Insights."
  const currentSubtitle = activeVariant?.subtitle || subtitle || "C9N.AI leverages advanced AI to analyze and coordinate disparate, opaque relationships, bringing you relevant information and insights."
  const currentPrimaryCTA = activeVariant?.primaryCTA || primaryCTA || defaultPrimaryCTA
  const currentSecondaryCTA = activeVariant?.secondaryCTA || secondaryCTA || defaultSecondaryCTA

  if (!isClient) {
    // Server-side render with default content
    return (
      <section className="relative bg-c9n-blue-dark py-20 md:py-32 lg:py-40">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute bottom-[-20%] left-[-15%] w-[28rem] h-[28rem] sm:w-[32rem] sm:h-[32rem] bg-windsurf-pink-hot/25 rounded-full filter blur-2xl opacity-50 animate-gentle-float-1" />
          <div className="absolute top-[-25%] right-[-20%] w-[32rem] h-[32rem] sm:w-[36rem] sm:h-[36rem] bg-windsurf-blue-electric/20 rounded-full filter blur-3xl opacity-40 animate-gentle-float-2" />
          <div className="absolute bottom-[5%] right-[10%] w-[24rem] h-[24rem] sm:w-[28rem] sm:h-[28rem] bg-windsurf-yellow-bright/20 rounded-full filter blur-2xl opacity-35 animate-gentle-float-3" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Unlock Deeper Insights.{" "}
              <span className="block sm:inline bg-clip-text text-transparent bg-yellow-lime-gradient">Effortlessly.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-windsurf-gray-light max-w-2xl mx-auto">
              C9N.AI leverages advanced AI to analyze and coordinate disparate, opaque relationships, bringing you
              relevant information and insights.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={cn(
      "relative bg-c9n-blue-dark overflow-hidden",
      // Mobile-first responsive padding
      "py-16 sm:py-20 md:py-32 lg:py-40",
      // Optimize for mobile viewport
      isMobile && orientation === 'landscape' && "py-12",
      // Reduce padding on small screens
      isMobile && "px-4"
    )}>
      {/* Enhanced floating blob animations with performance optimization */}
      {!reducedMotion && performanceMode === 'high' && (
        <FloatingBlobs 
          config={{
            ...backgroundAnimation,
            // Reduce blob count on mobile for better performance
            blobCount: isMobile ? Math.min(backgroundAnimation.blobCount || 3, 2) : backgroundAnimation.blobCount || 3,
            animationSpeed: isMobile ? 'slow' : backgroundAnimation.animationSpeed
          }} 
        />
      )}

      {/* Content container with mobile-optimized spacing */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={cn(
          "mx-auto text-center",
          // Responsive max-width
          "max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
        )}>
          {/* Enhanced title with gradient effects and mobile optimization */}
          <PerformanceAnimation
            animation="slideUp"
            trigger="immediate"
            config={{ duration: 800 }}
          >
            <h1 className={cn(
              "font-bold tracking-tight text-white",
              // Mobile-first responsive text sizing
              "text-3xl leading-tight",
              "sm:text-4xl sm:leading-tight",
              "md:text-5xl md:leading-tight", 
              "lg:text-6xl lg:leading-tight",
              "xl:text-7xl xl:leading-tight",
              // Optimize line height for mobile
              isMobile && "leading-[1.1]"
            )}>
              {currentTitle.split(' ').map((word: string, index: number) => {
                const isLastWord = index === currentTitle.split(' ').length - 1
                return (
                  <span key={index}>
                    {isLastWord ? (
                      <span className={cn(
                        "block sm:inline bg-clip-text text-transparent bg-yellow-lime-gradient",
                        !reducedMotion && "animate-gradient-wave bg-200%"
                      )}>
                        {word}
                      </span>
                    ) : (
                      word
                    )}{' '}
                  </span>
                )
              })}
            </h1>
          </PerformanceAnimation>

          {/* Enhanced subtitle with mobile optimization */}
          <PerformanceAnimation
            animation="slideUp"
            trigger="immediate"
            config={{ duration: 800, delay: 200 }}
          >
            <p className={cn(
              "mt-6 leading-relaxed text-windsurf-gray-light mx-auto",
              // Mobile-first responsive text sizing
              "text-base sm:text-lg md:text-xl",
              // Responsive max-width
              "max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-3xl",
              // Optimize line height for mobile readability
              isMobile && "leading-[1.5]"
            )}>
              {currentSubtitle}
            </p>
          </PerformanceAnimation>

          {/* Enhanced CTA buttons with mobile-first design */}
          <PerformanceAnimation
            animation="slideUp"
            trigger="immediate"
            config={{ duration: 800, delay: 400 }}
          >
            <div className={cn(
              "mt-8 sm:mt-10 flex items-center justify-center",
              // Mobile-first button layout
              "flex-col gap-3 sm:flex-row sm:gap-4",
              // Optimize spacing for mobile
              isMobile && "gap-4"
            )}>
              <EnhancedCTAButton
                config={currentPrimaryCTA}
                size={isMobile ? "lg" : "xl"}
                className={cn(
                  // Mobile-first button sizing
                  "w-full sm:w-auto",
                  isMobile ? "min-w-[280px] py-4" : "min-w-[200px]",
                  // Touch-friendly sizing
                  "min-h-[48px]"
                )}
              />
              
              {currentSecondaryCTA && (
                <EnhancedCTAButton
                  config={currentSecondaryCTA}
                  size={isMobile ? "md" : "lg"}
                  className={cn(
                    "w-full sm:w-auto",
                    isMobile ? "min-w-[280px] py-3" : "min-w-[160px]",
                    "min-h-[48px]"
                  )}
                />
              )}
            </div>
          </PerformanceAnimation>

          {/* Social proof indicator with mobile optimization */}
          <PerformanceAnimation
            animation="fadeIn"
            trigger="immediate"
            config={{ duration: 600, delay: 600 }}
          >
            <div className={cn(
              "mt-6 sm:mt-8 flex items-center justify-center text-windsurf-gray-light",
              // Mobile-first responsive text and layout
              "text-xs sm:text-sm",
              "flex-col gap-2 sm:flex-row sm:gap-0"
            )}>
              <div className="flex items-center">
                <CheckCircleIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-c9n-teal flex-shrink-0" />
                <span className={cn(
                  isMobile ? "text-center" : "mr-4"
                )}>
                  Better analysis, better coordination, clearer insights.
                </span>
              </div>
              {!isMobile && (
                <ArrowRightIcon className={cn(
                  "h-4 w-4 text-windsurf-yellow-bright",
                  !reducedMotion && "animate-pulse"
                )} />
              )}
            </div>
          </PerformanceAnimation>

          {/* Hero metrics display with mobile optimization */}
          {metrics && metrics.length > 0 && (
            <PerformanceAnimation
              animation="slideUp"
              trigger="scroll"
              config={{ duration: 800, delay: 200 }}
              threshold={0.3}
            >
              <HeroMetrics 
                metrics={metrics} 
                className={cn(
                  "mt-12 sm:mt-16",
                  // Mobile-specific adjustments
                  isMobile && "mt-10"
                )}
              />
            </PerformanceAnimation>
          )}
        </div>
      </div>

      {/* Performance optimization: Preload critical resources */}
      <link rel="preload" as="style" href="/fonts/inter.css" />
      
      {/* Mobile-specific optimizations */}
      {isMobile && (
        <>
          <link rel="preload" as="image" href="/placeholder-logo.svg" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        </>
      )}
    </section>
  )
}
