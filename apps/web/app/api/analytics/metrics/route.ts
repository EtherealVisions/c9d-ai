/**
 * Analytics Metrics API Route
 * 
 * This API route provides aggregated metrics and insights for authentication analytics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

// Validation schema for metrics request
const MetricsRequestSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  metrics: z.array(z.enum([
    'signUpRate',
    'signInRate',
    'conversionRate',
    'abandonmentRate',
    'errorRate',
    'performanceMetrics',
    'deviceBreakdown',
    'socialAuthUsage',
    'funnelAnalysis'
  ])).default(['signUpRate', 'signInRate', 'conversionRate'])
})

/**
 * GET /api/analytics/metrics
 * Get aggregated authentication metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await checkAdminPermissions(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      startDate: searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: searchParams.get('endDate') || new Date().toISOString(),
      granularity: searchParams.get('granularity') || 'day',
      metrics: searchParams.get('metrics')?.split(',') || ['signUpRate', 'signInRate', 'conversionRate']
    }

    const validatedParams = MetricsRequestSchema.parse(queryParams)

    // Calculate metrics based on requested types
    const metricsData: any = {}

    for (const metricType of validatedParams.metrics) {
      switch (metricType) {
        case 'signUpRate':
          metricsData.signUpRate = await calculateSignUpRate(validatedParams)
          break
        case 'signInRate':
          metricsData.signInRate = await calculateSignInRate(validatedParams)
          break
        case 'conversionRate':
          metricsData.conversionRate = await calculateConversionRate(validatedParams)
          break
        case 'abandonmentRate':
          metricsData.abandonmentRate = await calculateAbandonmentRate(validatedParams)
          break
        case 'errorRate':
          metricsData.errorRate = await calculateErrorRate(validatedParams)
          break
        case 'performanceMetrics':
          metricsData.performanceMetrics = await calculatePerformanceMetrics(validatedParams)
          break
        case 'deviceBreakdown':
          metricsData.deviceBreakdown = await calculateDeviceBreakdown(validatedParams)
          break
        case 'socialAuthUsage':
          metricsData.socialAuthUsage = await calculateSocialAuthUsage(validatedParams)
          break
        case 'funnelAnalysis':
          metricsData.funnelAnalysis = await calculateFunnelAnalysis(validatedParams)
          break
      }
    }

    return NextResponse.json({
      success: true,
      timeRange: {
        start: validatedParams.startDate,
        end: validatedParams.endDate,
        granularity: validatedParams.granularity
      },
      metrics: metricsData,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics metrics calculation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to calculate analytics metrics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/analytics/metrics
 * Generate custom metrics report
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await checkAdminPermissions(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedParams = MetricsRequestSchema.parse(body)

    // Generate comprehensive report
    const report = await generateComprehensiveReport(validatedParams)

    return NextResponse.json({
      success: true,
      report,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Custom metrics report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate metrics report' },
      { status: 500 }
    )
  }
}

/**
 * Calculate sign-up rate metrics
 */
async function calculateSignUpRate(params: any) {
  // Mock implementation - in real app, this would query the database
  const timeSeriesData = generateMockTimeSeries(params, 'signUpRate')
  
  return {
    current: 0.75, // 75% sign-up completion rate
    previous: 0.68, // Previous period for comparison
    change: 0.07, // +7% change
    trend: 'up',
    timeSeries: timeSeriesData
  }
}

/**
 * Calculate sign-in rate metrics
 */
async function calculateSignInRate(params: any) {
  const timeSeriesData = generateMockTimeSeries(params, 'signInRate')
  
  return {
    current: 0.92, // 92% sign-in success rate
    previous: 0.89,
    change: 0.03,
    trend: 'up',
    timeSeries: timeSeriesData
  }
}

/**
 * Calculate conversion rate metrics
 */
async function calculateConversionRate(params: any) {
  const timeSeriesData = generateMockTimeSeries(params, 'conversionRate')
  
  return {
    current: 0.68, // 68% overall conversion rate
    previous: 0.65,
    change: 0.03,
    trend: 'up',
    timeSeries: timeSeriesData,
    breakdown: {
      signUp: 0.75,
      signIn: 0.92,
      emailVerification: 0.85,
      socialAuth: 0.88
    }
  }
}

/**
 * Calculate abandonment rate metrics
 */
async function calculateAbandonmentRate(params: any) {
  const timeSeriesData = generateMockTimeSeries(params, 'abandonmentRate')
  
  return {
    current: 0.32, // 32% abandonment rate
    previous: 0.35,
    change: -0.03,
    trend: 'down', // Lower abandonment is better
    timeSeries: timeSeriesData,
    breakdown: {
      signUpForm: 0.25,
      emailVerification: 0.15,
      socialAuth: 0.12
    }
  }
}

/**
 * Calculate error rate metrics
 */
async function calculateErrorRate(params: any) {
  const timeSeriesData = generateMockTimeSeries(params, 'errorRate')
  
  return {
    current: 0.05, // 5% error rate
    previous: 0.08,
    change: -0.03,
    trend: 'down',
    timeSeries: timeSeriesData,
    breakdown: {
      validationErrors: 0.02,
      networkErrors: 0.01,
      apiErrors: 0.015,
      systemErrors: 0.005
    }
  }
}

/**
 * Calculate performance metrics
 */
async function calculatePerformanceMetrics(params: any) {
  return {
    averageLoadTime: {
      current: 1250, // 1.25 seconds
      previous: 1400,
      change: -150,
      trend: 'down',
      p95: 2100,
      p99: 3200
    },
    averageRenderTime: {
      current: 85, // 85ms
      previous: 95,
      change: -10,
      trend: 'down',
      p95: 150,
      p99: 220
    },
    cacheHitRate: {
      current: 0.82, // 82% cache hit rate
      previous: 0.78,
      change: 0.04,
      trend: 'up'
    },
    apiResponseTime: {
      current: 180, // 180ms average
      previous: 210,
      change: -30,
      trend: 'down',
      p95: 350,
      p99: 500
    }
  }
}

/**
 * Calculate device breakdown metrics
 */
async function calculateDeviceBreakdown(params: any) {
  return {
    desktop: {
      percentage: 0.45,
      count: 4500,
      conversionRate: 0.72
    },
    mobile: {
      percentage: 0.48,
      count: 4800,
      conversionRate: 0.65
    },
    tablet: {
      percentage: 0.07,
      count: 700,
      conversionRate: 0.68
    }
  }
}

/**
 * Calculate social auth usage metrics
 */
async function calculateSocialAuthUsage(params: any) {
  return {
    google: {
      percentage: 0.52,
      count: 2600,
      conversionRate: 0.88
    },
    github: {
      percentage: 0.28,
      count: 1400,
      conversionRate: 0.91
    },
    microsoft: {
      percentage: 0.20,
      count: 1000,
      conversionRate: 0.85
    }
  }
}

/**
 * Calculate funnel analysis metrics
 */
async function calculateFunnelAnalysis(params: any) {
  return {
    steps: [
      {
        step: 'Page View',
        users: 10000,
        conversionRate: 1.0,
        dropOffRate: 0.0
      },
      {
        step: 'Sign Up Started',
        users: 7500,
        conversionRate: 0.75,
        dropOffRate: 0.25
      },
      {
        step: 'Form Submitted',
        users: 6000,
        conversionRate: 0.80,
        dropOffRate: 0.20
      },
      {
        step: 'Email Verification Sent',
        users: 5800,
        conversionRate: 0.97,
        dropOffRate: 0.03
      },
      {
        step: 'Email Verified',
        users: 4930,
        conversionRate: 0.85,
        dropOffRate: 0.15
      },
      {
        step: 'Sign Up Completed',
        users: 4685,
        conversionRate: 0.95,
        dropOffRate: 0.05
      }
    ],
    overallConversionRate: 0.47, // 47% from page view to completion
    biggestDropOff: {
      step: 'Page View to Sign Up Started',
      dropOffRate: 0.25
    }
  }
}

/**
 * Generate comprehensive analytics report
 */
async function generateComprehensiveReport(params: any) {
  const [
    signUpRate,
    signInRate,
    conversionRate,
    performanceMetrics,
    deviceBreakdown,
    socialAuthUsage,
    funnelAnalysis
  ] = await Promise.all([
    calculateSignUpRate(params),
    calculateSignInRate(params),
    calculateConversionRate(params),
    calculatePerformanceMetrics(params),
    calculateDeviceBreakdown(params),
    calculateSocialAuthUsage(params),
    calculateFunnelAnalysis(params)
  ])

  return {
    summary: {
      totalUsers: 10000,
      newSignUps: 4685,
      successfulSignIns: 8280,
      overallConversionRate: conversionRate.current,
      averageSessionDuration: 420000, // 7 minutes in milliseconds
      bounceRate: 0.15
    },
    authentication: {
      signUpRate,
      signInRate,
      conversionRate
    },
    performance: performanceMetrics,
    userBehavior: {
      deviceBreakdown,
      socialAuthUsage,
      funnelAnalysis
    },
    insights: [
      {
        type: 'positive',
        title: 'Improved Sign-In Success Rate',
        description: 'Sign-in success rate increased by 3% compared to the previous period.',
        impact: 'high'
      },
      {
        type: 'warning',
        title: 'Mobile Conversion Gap',
        description: 'Mobile users have a 7% lower conversion rate compared to desktop users.',
        impact: 'medium'
      },
      {
        type: 'info',
        title: 'Social Auth Preference',
        description: 'Google authentication is the most popular social login method at 52%.',
        impact: 'low'
      }
    ],
    recommendations: [
      {
        priority: 'high',
        title: 'Optimize Mobile Experience',
        description: 'Focus on improving mobile conversion rates through better UX and performance.',
        expectedImpact: '+5% overall conversion rate'
      },
      {
        priority: 'medium',
        title: 'Reduce Email Verification Drop-off',
        description: 'Implement better email verification UX to reduce the 15% drop-off rate.',
        expectedImpact: '+2% sign-up completion rate'
      },
      {
        priority: 'low',
        title: 'Expand Social Auth Options',
        description: 'Consider adding Apple or LinkedIn authentication based on user feedback.',
        expectedImpact: '+3% social auth adoption'
      }
    ]
  }
}

/**
 * Generate mock time series data
 */
function generateMockTimeSeries(params: any, metricType: string) {
  const startDate = new Date(params.startDate)
  const endDate = new Date(params.endDate)
  const granularity = params.granularity
  
  const data = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    // Generate mock data point
    const baseValue = getBaseValueForMetric(metricType)
    const variation = (Math.random() - 0.5) * 0.1 // ±5% variation
    const value = Math.max(0, baseValue + variation)
    
    data.push({
      timestamp: current.toISOString(),
      value: Math.round(value * 1000) / 1000 // Round to 3 decimal places
    })
    
    // Increment based on granularity
    switch (granularity) {
      case 'hour':
        current.setHours(current.getHours() + 1)
        break
      case 'day':
        current.setDate(current.getDate() + 1)
        break
      case 'week':
        current.setDate(current.getDate() + 7)
        break
      case 'month':
        current.setMonth(current.getMonth() + 1)
        break
    }
  }
  
  return data
}

/**
 * Get base value for different metric types
 */
function getBaseValueForMetric(metricType: string): number {
  const baseValues = {
    signUpRate: 0.75,
    signInRate: 0.92,
    conversionRate: 0.68,
    abandonmentRate: 0.32,
    errorRate: 0.05
  }
  
  return baseValues[metricType as keyof typeof baseValues] || 0.5
}

/**
 * Check if user has admin permissions
 */
async function checkAdminPermissions(userId: string): Promise<boolean> {
  // In a real implementation, this would check user roles/permissions
  return true
}