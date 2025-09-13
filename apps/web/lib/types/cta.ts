/**
 * CTA (Call to Action) types
 */

export interface CTAVariant {
  id: string
  text: string
  href?: string
  variant?: 'primary' | 'secondary' | 'outline'
  style?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  icon?: any
  tracking?: {
    event: string
    category: string
    label: string
    value: number
  }
  weight?: number
  metrics?: {
    impressions: number
    clicks: number
    conversions: number
  }
}

export interface ConversionFunnelStep {
  id: string
  name: string
  description?: string
  order: number
  conversionRate?: number
}

export interface ABTestConfig {
  id: string
  name: string
  variants: CTAVariant[]
  trafficSplit: number[]
  isActive: boolean
}

export interface FloatingCTAConfig {
  enabled: boolean
  showAfterScroll: number
  hideOnSections: string[]
  position: string
  dismissible: boolean
  cta: {
    id: string
    text: string
    href: string
    variant: 'primary' | 'secondary' | 'outline'
    icon: any
    tracking: {
      event: string
      category: string
      label: string
      value: number
    }
    weight: number
  }
}

export interface CTASectionConfig {
  id: string
  title: string
  subtitle?: string
  description?: string
  variants: CTAVariant[]
  context?: string
  urgency?: {
    enabled: boolean
    type?: string
    text?: string
    message?: string
    endDate?: Date
    countdownText?: string
    countdown?: {
      enabled: boolean
      endTime: Date
    }
  }
  scarcity?: {
    enabled: boolean
    type?: string
    text?: string
    message?: string
    remaining?: number
    total?: number
  }
  primaryCTA?: {
    text: string
    href?: string
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'outline'
  }
  secondaryCTA?: {
    text: string
    href?: string
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'outline'
  }
  layout?: 'centered' | 'split' | 'banner'
  background?: {
    type: 'solid' | 'gradient' | 'image'
    value: string
  }
  animation?: {
    type: 'fade' | 'slide' | 'bounce'
    duration: number
  }
  abTest?: ABTestConfig
}

export interface UrgencyConfig {
  enabled: boolean
  type?: string
  text?: string
  message?: string
  endDate?: Date
  countdownText?: string
  countdown?: {
    enabled: boolean
    endTime: Date
  }
}

export interface ScarcityConfig {
  enabled: boolean
  type?: string
  text?: string
  message?: string
  remaining?: number
  total?: number
}