'use client'

import React, { useEffect, useState } from 'react'
import { FloatingCTA, useFloatingCTA } from './floating-cta'
import { FloatingCTAConfig } from '@/lib/types/cta'
import { useScrollEngagement } from '@/hooks/use-scroll-behavior'
import { CalendarCheckIcon, Zap, Users, ArrowRight } from 'lucide-react'

interface CTAManagerProps {
  userId?: string
  enableFloatingCTA?: boolean
  enableEngagementTracking?: boolean
}

export function CTAManager({ 
  userId, 
  enableFloatingCTA = true, 
  enableEngagementTracking = true 
}: CTAManagerProps) {
  const [floatingCTAConfigs, setFloatingCTAConfigs] = useState<FloatingCTAConfig[]>([])
  const engagement = useScrollEngagement()
  
  // Configure floating CTAs based on user engagement
  useEffect(() => {
    if (!enableFloatingCTA) return

    const configs: FloatingCTAConfig[] = []

    // Primary floating CTA - shows after user scrolls 50% of page
    configs.push({
      enabled: true,
      showAfterScroll: 800,
      hideOnSections: ['final-cta', 'hero'],
      position: 'bottom-right',
      dismissible: true,
      cta: {
        id: 'floating-primary',
        text: 'Get Started',
        href: '/request-consultation',
        variant: 'primary',
        icon: CalendarCheckIcon,
        tracking: {
          event: 'floating_cta_click',
          category: 'conversion',
          label: 'floating_primary',
          value: 75
        },
        weight: 100
      }
    })

    // Engagement-based CTA - shows for highly engaged users
    if (engagement.isEngaged && engagement.maxScrollDepth > 70) {
      configs.push({
        enabled: true,
        showAfterScroll: 1200,
        hideOnSections: ['final-cta'],
        position: 'bottom-center',
        dismissible: true,
        cta: {
          id: 'floating-engaged',
          text: 'Book a Demo',
          href: '/book-demo',
          variant: 'secondary',
          icon: Zap,
          tracking: {
            event: 'engaged_user_cta',
            category: 'conversion',
            label: 'floating_engaged',
            value: 90
          },
          weight: 100
        }
      })
    }

    // Exit-intent CTA (simulated with high scroll depth)
    if (engagement.maxScrollDepth > 90) {
      configs.push({
        enabled: true,
        showAfterScroll: 0,
        hideOnSections: [],
        position: 'bottom-center',
        dismissible: true,
        cta: {
          id: 'floating-exit-intent',
          text: 'Wait! Get Free Trial',
          href: '/start-trial',
          variant: 'primary',
          icon: Users,
          tracking: {
            event: 'exit_intent_cta',
            category: 'conversion',
            label: 'floating_exit_intent',
            value: 100
          },
          weight: 100
        }
      })
    }

    setFloatingCTAConfigs(configs)
  }, [enableFloatingCTA, engagement.isEngaged, engagement.maxScrollDepth])

  const activeFloatingCTA = useFloatingCTA(floatingCTAConfigs, userId)

  // Track engagement metrics
  useEffect(() => {
    if (!enableEngagementTracking) return

    // Track engagement milestones
    if (engagement.maxScrollDepth > 25 && engagement.maxScrollDepth <= 26) {
      // Track 25% scroll depth
      if (typeof window !== 'undefined' && window.va) {
        window.va('track', 'scroll_depth_25', {
          user_id: userId,
          time_on_page: engagement.timeOnPage,
          scroll_events: engagement.scrollEvents
        })
      }
    }

    if (engagement.maxScrollDepth > 50 && engagement.maxScrollDepth <= 51) {
      // Track 50% scroll depth
      if (typeof window !== 'undefined' && window.va) {
        window.va('track', 'scroll_depth_50', {
          user_id: userId,
          time_on_page: engagement.timeOnPage,
          scroll_events: engagement.scrollEvents
        })
      }
    }

    if (engagement.maxScrollDepth > 75 && engagement.maxScrollDepth <= 76) {
      // Track 75% scroll depth
      if (typeof window !== 'undefined' && window.va) {
        window.va('track', 'scroll_depth_75', {
          user_id: userId,
          time_on_page: engagement.timeOnPage,
          scroll_events: engagement.scrollEvents
        })
      }
    }

    if (engagement.isEngaged) {
      // Track when user becomes engaged
      if (typeof window !== 'undefined' && window.va) {
        window.va('track', 'user_engaged', {
          user_id: userId,
          time_on_page: engagement.timeOnPage,
          max_scroll_depth: engagement.maxScrollDepth,
          scroll_events: engagement.scrollEvents
        })
      }
    }
  }, [
    engagement.maxScrollDepth, 
    engagement.isEngaged, 
    engagement.timeOnPage, 
    engagement.scrollEvents,
    enableEngagementTracking,
    userId
  ])

  return (
    <>
      {/* Floating CTA */}
      {activeFloatingCTA && (
        <FloatingCTA
          config={activeFloatingCTA}
          userId={userId}
        />
      )}

      {/* Engagement tracking is handled in useEffect */}
    </>
  )
}

// Hook for managing CTA performance
export function useCTAPerformance() {
  const [performance, setPerformance] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    conversionRate: 0,
    topPerformingVariant: null as string | null
  })

  useEffect(() => {
    // This would typically fetch from your analytics service
    // For now, we'll use localStorage data
    const funnelData = JSON.parse(
      localStorage.getItem('conversion_funnel') || '[]'
    )

    const impressions = funnelData.filter((step: any) => 
      step.event === 'cta_impression'
    ).length

    const clicks = funnelData.filter((step: any) => 
      step.event === 'cta_click'
    ).length

    const conversionRate = impressions > 0 ? (clicks / impressions) * 100 : 0

    setPerformance({
      totalImpressions: impressions,
      totalClicks: clicks,
      conversionRate,
      topPerformingVariant: null // Would be calculated from actual data
    })
  }, [])

  return performance
}