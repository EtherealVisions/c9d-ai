'use client'

import React from 'react'
import { ArrowRight, BookOpen, Users, Zap, Code, BarChart3 } from 'lucide-react'
import { EnhancedCTASection } from './enhanced-cta-section'
import { CTASectionConfig } from '@/lib/types/cta'

interface SectionCTAProps {
  context: 'features' | 'social-proof' | 'technical'
  userId?: string
  className?: string
}

export function SectionCTA({ context, userId, className }: SectionCTAProps) {
  const getContextConfig = (): CTASectionConfig => {
    switch (context) {
      case 'features':
        return {
          id: 'features-cta',
          title: 'See C9d.ai in Action',
          subtitle: 'Experience the Power of AI Orchestration',
          description: 'Discover how our platform can transform your workflow with intelligent automation and seamless integration.',
          context: 'features',
          variants: [
            {
              id: 'interactive-demo',
              text: 'Try Interactive Demo',
              href: '/demo',
              variant: 'primary',
              icon: Zap,
              tracking: {
                event: 'interactive_demo',
                category: 'engagement',
                label: 'features_cta_demo',
                value: 50
              },
              weight: 60
            },
            {
              id: 'feature-tour',
              text: 'Take Feature Tour',
              href: '/features/tour',
              variant: 'secondary',
              icon: ArrowRight,
              tracking: {
                event: 'feature_tour',
                category: 'engagement',
                label: 'features_cta_tour',
                value: 30
              },
              weight: 40
            }
          ]
        }

      case 'social-proof':
        return {
          id: 'social-proof-cta',
          title: 'Join Thousands of Satisfied Users',
          subtitle: 'Be Part of the AI Revolution',
          description: 'See why leading organizations choose C9d.ai for their AI orchestration needs.',
          context: 'social-proof',
          variants: [
            {
              id: 'case-studies',
              text: 'Read Success Stories',
              href: '/case-studies',
              variant: 'outline',
              icon: BookOpen,
              tracking: {
                event: 'case_studies_view',
                category: 'engagement',
                label: 'social_proof_cta_cases',
                value: 25
              },
              weight: 50
            },
            {
              id: 'community',
              text: 'Join Community',
              href: '/community',
              variant: 'secondary',
              icon: Users,
              tracking: {
                event: 'community_join',
                category: 'engagement',
                label: 'social_proof_cta_community',
                value: 20
              },
              weight: 50
            }
          ]
        }

      case 'technical':
        return {
          id: 'technical-cta',
          title: 'Built for Developers, by Developers',
          subtitle: 'Powerful APIs and SDKs',
          description: 'Integrate C9d.ai into your existing workflow with our comprehensive developer tools and documentation.',
          context: 'technical',
          variants: [
            {
              id: 'api-docs',
              text: 'Explore API Docs',
              href: '/docs/api',
              variant: 'outline',
              icon: Code,
              tracking: {
                event: 'api_docs_view',
                category: 'engagement',
                label: 'technical_cta_docs',
                value: 40
              },
              weight: 40
            },
            {
              id: 'sdk-download',
              text: 'Download SDK',
              href: '/sdk',
              variant: 'secondary',
              icon: BarChart3,
              tracking: {
                event: 'sdk_download',
                category: 'conversion',
                label: 'technical_cta_sdk',
                value: 60
              },
              weight: 35
            },
            {
              id: 'developer-console',
              text: 'Access Developer Console',
              href: '/console',
              variant: 'primary',
              icon: Zap,
              tracking: {
                event: 'console_access',
                category: 'conversion',
                label: 'technical_cta_console',
                value: 80
              },
              weight: 25
            }
          ]
        }

      default:
        throw new Error(`Unknown context: ${context}`)
    }
  }

  const config = getContextConfig()

  const abTestConfig = {
    id: `${context}-cta-variants`,
    name: `${context} CTA Variants Test`,
    variants: config.variants,
    trafficSplit: config.variants.map(v => v.weight || 1),
    isActive: true
  }

  return (
    <EnhancedCTASection
      config={config}
      abTestConfig={abTestConfig}
      userId={userId}
      className={className}
    />
  )
}

// Specific context components for easier usage
export function FeaturesCTA({ userId, className }: { userId?: string; className?: string }) {
  return <SectionCTA context="features" userId={userId} className={className} />
}

export function SocialProofCTA({ userId, className }: { userId?: string; className?: string }) {
  return <SectionCTA context="social-proof" userId={userId} className={className} />
}

export function TechnicalCTA({ userId, className }: { userId?: string; className?: string }) {
  return <SectionCTA context="technical" userId={userId} className={className} />
}