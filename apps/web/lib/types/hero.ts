/**
 * Hero section and tracking types
 */

export interface TrackingConfig {
  gtag?: {
    measurementId: string
    enabled: boolean
  }
  mixpanel?: {
    token: string
    enabled: boolean
  }
  amplitude?: {
    apiKey: string
    enabled: boolean
  }
}

export interface HeroMetrics {
  impressions: number
  clicks: number
  conversions: number
  conversionRate: number
}

export interface HeroVariant {
  id: string
  title: string
  subtitle: string
  ctaText: string
  backgroundImage?: string
  metrics?: HeroMetrics
}

export interface HeroMetric {
  id: string
  label: string
  value: number | string
  suffix?: string
  prefix?: string
  icon?: any
  description?: string
  animateCounter?: boolean
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    percentage: number
    period: string
  }
}

export interface CTAConfig {
  primary: {
    text: string
    href?: string
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'outline'
    icon?: any
  }
  secondary?: {
    text: string
    href?: string
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'outline'
    icon?: any
  }
}

export interface AnimationConfig {
  enabled?: boolean
  type?: 'fade' | 'slide' | 'bounce' | 'zoom'
  duration?: number
  delay?: number
  stagger?: number
  enableFloatingBlobs?: boolean
  blobCount?: number
  animationSpeed?: 'slow' | 'medium' | 'fast' | string
  colorScheme?: string
}

export interface EnhancedHeroSectionProps {
  title?: string
  subtitle?: string
  description?: string
  primaryCTA?: {
    text: string
    href?: string
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'outline'
    icon?: any
  }
  secondaryCTA?: {
    text: string
    href?: string
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'outline'
    icon?: any
  }
  backgroundImage?: string
  backgroundVideo?: string
  backgroundAnimation?: AnimationConfig
  metrics?: HeroMetric[]
  abTestVariants?: any
  enableABTesting?: boolean
  animation?: AnimationConfig
  className?: string
}export
 interface ButtonCTAConfig {
  text: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  icon?: any
  tracking?: {
    event: string
    category: string
    label: string
    value: number
  }
}