'use client'

import React from 'react'
import { CalendarCheckIcon, Zap, Users } from "lucide-react"
import { EnhancedCTASection } from "./enhanced-cta-section"
import { CTASectionConfig } from "@/lib/types/cta"

interface FinalCtaSectionProps {
  userId?: string
  enableUrgency?: boolean
  enableScarcity?: boolean
}

export default function FinalCtaSection({ 
  userId, 
  enableUrgency = false, 
  enableScarcity = false 
}: FinalCtaSectionProps) {
  const ctaConfig: CTASectionConfig = {
    id: 'final-cta',
    title: 'Ready to Unlock Your Data\'s Potential?',
    subtitle: 'Transform Complex Information into Actionable Intelligence',
    description: 'Connect with our experts to see how C9d.ai can revolutionize your organization\'s approach to data and AI orchestration.',
    context: 'final',
    variants: [
      {
        id: 'consultation',
        text: 'Request a Consultation',
        href: '/request-consultation',
        variant: 'primary',
        icon: CalendarCheckIcon,
        tracking: {
          event: 'consultation_request',
          category: 'conversion',
          label: 'final_cta_consultation',
          value: 100
        },
        weight: 50
      },
      {
        id: 'demo',
        text: 'Book a Demo',
        href: '/book-demo',
        variant: 'primary',
        icon: Zap,
        tracking: {
          event: 'demo_request',
          category: 'conversion',
          label: 'final_cta_demo',
          value: 90
        },
        weight: 30
      },
      {
        id: 'trial',
        text: 'Start Free Trial',
        href: '/start-trial',
        variant: 'primary',
        icon: Users,
        tracking: {
          event: 'trial_start',
          category: 'conversion',
          label: 'final_cta_trial',
          value: 80
        },
        weight: 20
      }
    ],
    urgency: enableUrgency ? {
      enabled: true,
      type: 'limited-time',
      message: '🔥 Limited Time: Get 3 months free with annual plans',
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      countdownText: 'Offer expires in:'
    } : undefined,
    scarcity: enableScarcity ? {
      enabled: true,
      type: 'beta-slots',
      message: '⚡ Only 50 beta access slots remaining',
      remaining: 12,
      total: 50
    } : undefined
  }

  const abTestConfig = {
    id: 'final-cta-variants',
    name: 'Final CTA Variants Test',
    variants: ctaConfig.variants,
    trafficSplit: [50, 30, 20], // Consultation: 50%, Demo: 30%, Trial: 20%
    isActive: true
  }

  return (
    <EnhancedCTASection
      config={ctaConfig}
      abTestConfig={abTestConfig}
      userId={userId}
    />
  )
}
