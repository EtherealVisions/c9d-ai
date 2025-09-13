import { AnalyticsConfig, ABTestConfig } from '@/lib/types/analytics'

export const defaultAnalyticsConfig: AnalyticsConfig = {
  providers: [
    {
      name: 'vercel',
      enabled: true,
      config: {
        beforeSend: (event: any) => {
          // Filter out sensitive data
          if (event.url?.includes('password') || event.url?.includes('token')) {
            return null
          }
          return event
        },
        debug: process.env.NODE_ENV === 'development'
      }
    },
    {
      name: 'google',
      enabled: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      config: {
        measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
        enableEnhancedEcommerce: true,
        enableEnhancedMeasurement: true,
        cookieFlags: 'SameSite=None;Secure',
        customDimensions: {
          user_type: 'custom_dimension_1',
          subscription_tier: 'custom_dimension_2',
          organization_size: 'custom_dimension_3',
          traffic_source: 'custom_dimension_4',
          user_journey_stage: 'custom_dimension_5'
        },
        customMetrics: {
          engagement_score: 'custom_metric_1',
          feature_usage_count: 'custom_metric_2',
          session_quality: 'custom_metric_3'
        }
      }
    },
    {
      name: 'hotjar',
      enabled: !!process.env.NEXT_PUBLIC_HOTJAR_SITE_ID,
      config: {
        siteId: process.env.NEXT_PUBLIC_HOTJAR_SITE_ID,
        enableHeatmaps: true,
        enableRecordings: true,
        enableFeedback: true,
        enableSurveys: false,
        sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        excludePages: ['/admin', '/dashboard/settings'],
        maskSensitiveData: true
      }
    }
  ],
  enableDebugMode: process.env.NODE_ENV === 'development',
  enableConsentMode: true,
  defaultConsentState: {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'granted'
  },
  customDimensions: {
    user_type: 'custom_dimension_1',
    subscription_tier: 'custom_dimension_2',
    organization_size: 'custom_dimension_3',
    traffic_source: 'custom_dimension_4',
    user_journey_stage: 'custom_dimension_5'
  },
  customMetrics: {
    engagement_score: 'custom_metric_1',
    feature_usage_count: 'custom_metric_2',
    session_quality: 'custom_metric_3'
  }
}

export const landingPageABTests: ABTestConfig[] = [
  {
    id: 'hero_headline_test',
    name: 'Hero Headline Optimization',
    description: 'Testing different hero headlines for conversion optimization',
    variants: [
      {
        id: 'control',
        name: 'Original Headline',

        weight: 50,
        config: {
          headline: 'Transform Your AI Workflow with C9d.ai',
          subheadline: 'Orchestrate intelligent agents and automate complex workflows with our cutting-edge AI platform.'
        }
      },
      {
        id: 'variant_a',
        name: 'Benefit-Focused Headline',

        weight: 50,
        config: {
          headline: 'Build Smarter AI Agents in Minutes, Not Months',
          subheadline: 'Skip the complexity. Create, deploy, and manage AI agents that actually work for your business.'
        }
      }
    ],
    trafficSplit: [50, 50],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    enabled: process.env.NODE_ENV === 'production',
    minimumSampleSize: 1000,
    confidenceLevel: 95
  },
  {
    id: 'cta_button_test',
    name: 'CTA Button Optimization',
    description: 'Testing different CTA button text and colors',
    variants: [
      {
        id: 'control',
        name: 'Get Started Free',

        weight: 33,
        config: {
          text: 'Get Started Free',
          color: 'primary',
          size: 'lg'
        }
      },
      {
        id: 'variant_a',
        name: 'Start Building Now',

        weight: 33,
        config: {
          text: 'Start Building Now',
          color: 'primary',
          size: 'lg'
        }
      },
      {
        id: 'variant_b',
        name: 'Try C9d.ai Free',

        weight: 34,
        config: {
          text: 'Try C9d.ai Free',
          color: 'secondary',
          size: 'lg'
        }
      }
    ],
    trafficSplit: [33, 33, 34],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    enabled: process.env.NODE_ENV === 'production',
    minimumSampleSize: 500,
    confidenceLevel: 95
  },
  {
    id: 'pricing_display_test',
    name: 'Pricing Display Strategy',
    description: 'Testing different approaches to pricing visibility',
    variants: [
      {
        id: 'control',
        name: 'Pricing Hidden',
        description: 'No pricing shown on landing page',
        weight: 50,
        config: {
          showPricing: false,
          ctaText: 'Get Started Free'
        }
      },
      {
        id: 'variant_a',
        name: 'Pricing Visible',
        description: 'Show starting price on landing page',
        weight: 50,
        config: {
          showPricing: true,
          startingPrice: '$29/month',
          ctaText: 'Start Free Trial'
        }
      }
    ],
    trafficSplit: [50, 50],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    enabled: process.env.NODE_ENV === 'production',
    minimumSampleSize: 800,
    confidenceLevel: 95
  }
]

export const conversionEvents = [
  'page_view',
  'hero_cta_impression',
  'hero_cta_click',
  'features_section_view',
  'pricing_section_view',
  'demo_request_click',
  'contact_form_start',
  'contact_form_submit',
  'newsletter_signup',
  'trial_signup_start',
  'trial_signup_complete',
  'conversion'
] as const

export const funnelSteps = [
  { id: 'landing', name: 'Landing Page View', category: 'awareness' as const },
  { id: 'hero_cta_impression', name: 'Hero CTA Impression', category: 'awareness' as const },
  { id: 'hero_cta_click', name: 'Hero CTA Click', category: 'interest' as const },
  { id: 'features_view', name: 'Features Section View', category: 'interest' as const },
  { id: 'pricing_view', name: 'Pricing Section View', category: 'consideration' as const },
  { id: 'demo_request', name: 'Demo Request', category: 'consideration' as const },
  { id: 'contact_form_start', name: 'Contact Form Started', category: 'evaluation' as const },
  { id: 'contact_form_submit', name: 'Contact Form Submitted', category: 'evaluation' as const },
  { id: 'trial_signup', name: 'Trial Signup', category: 'intent' as const },
  { id: 'conversion', name: 'Conversion', category: 'conversion' as const }
]

export function getAnalyticsConfig(overrides?: Partial<AnalyticsConfig>): AnalyticsConfig {
  return {
    ...defaultAnalyticsConfig,
    ...overrides,
    providers: overrides?.providers || defaultAnalyticsConfig.providers
  }
}

export function getABTestConfig(): ABTestConfig[] {
  return landingPageABTests.filter(test => test.enabled)
}

export function isAnalyticsEnabled(): boolean {
  return process.env.NODE_ENV === 'production' || 
         process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
}

export function shouldTrackUser(): boolean {
  // Implement user consent logic here
  if (typeof window !== 'undefined') {
    const consent = localStorage.getItem('analytics_consent')
    return consent === 'granted'
  }
  return true // Default to true for server-side
}