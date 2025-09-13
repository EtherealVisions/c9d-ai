import { 
  ConversionFunnelStep, 
  ConversionMetrics, 
  FunnelStepMetrics, 
  DropOffPoint 
} from '@/lib/types/analytics'
import { AnalyticsService } from './analytics-service'

export class ConversionFunnelService {
  private static funnelSteps = [
    { id: 'landing', name: 'Landing Page View', category: 'awareness' as const },
    { id: 'hero_cta_impression', name: 'Hero CTA Impression', category: 'awareness' as const },
    { id: 'hero_cta_click', name: 'Hero CTA Click', category: 'interest' as const },
    { id: 'features_view', name: 'Features Section View', category: 'interest' as const },
    { id: 'demo_request', name: 'Demo Request', category: 'consideration' as const },
    { id: 'form_start', name: 'Contact Form Started', category: 'consideration' as const },
    { id: 'form_submit', name: 'Contact Form Submitted', category: 'evaluation' as const },
    { id: 'trial_signup', name: 'Trial Signup', category: 'intent' as const },
    { id: 'conversion', name: 'Conversion', category: 'conversion' as const }
  ]

  static trackFunnelStep(stepId: string, properties?: Record<string, any>, userId?: string) {
    const step = this.funnelSteps.find(s => s.id === stepId)
    if (!step) {
      console.warn(`Unknown funnel step: ${stepId}`)
      return
    }

    const funnelStep: ConversionFunnelStep = {
      step: stepId,
      event: stepId,
      category: step.category,
      value: 1,
      timestamp: new Date().toISOString(),
      userId,
      sessionId: this.getSessionId()
    }

    // Track with analytics service
    AnalyticsService.trackEvent({
      event: stepId,
      category: 'conversion',
      label: step.name,
      value: 1,
      properties: {
        funnel_step: stepId,
        funnel_category: step.category,
        ...properties
      },
      userId
    })

    // Store in local funnel data
    this.storeFunnelStep(funnelStep)
  }

  private static storeFunnelStep(step: ConversionFunnelStep) {
    if (typeof window === 'undefined') return

    const funnelData = this.getFunnelData()
    funnelData.push(step)

    // Keep only last 200 steps per session
    const sessionSteps = funnelData.filter(s => s.sessionId === step.sessionId)
    if (sessionSteps.length > 200) {
      const excessSteps = sessionSteps.slice(0, sessionSteps.length - 200)
      excessSteps.forEach(excessStep => {
        const index = funnelData.indexOf(excessStep)
        if (index > -1) funnelData.splice(index, 1)
      })
    }

    localStorage.setItem('conversion_funnel', JSON.stringify(funnelData))
  }

  static getFunnelData(): ConversionFunnelStep[] {
    if (typeof window === 'undefined') return []
    return JSON.parse(localStorage.getItem('conversion_funnel') || '[]')
  }

  static analyzeConversionFunnel(timeframe?: { start: Date; end: Date }): ConversionMetrics {
    let funnelData = this.getFunnelData()

    // Filter by timeframe if provided
    if (timeframe) {
      funnelData = funnelData.filter(step => {
        if (!step.timestamp) return false
        const stepDate = new Date(step.timestamp)
        return stepDate >= timeframe.start && stepDate <= timeframe.end
      })
    }

    const sessions = this.groupBySession(funnelData)
    const stepMetrics = this.calculateStepMetrics(sessions)
    const dropOffPoints = this.identifyDropOffPoints(stepMetrics)

    const totalVisitors = sessions.length
    const totalConversions = sessions.filter(session =>
      session.some(step => step.step === 'conversion')
    ).length

    const conversionRate = totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0
    const averageTimeToConvert = this.calculateAverageTimeToConvert(sessions)

    return {
      totalVisitors,
      totalConversions,
      conversionRate,
      averageTimeToConvert,
      dropOffPoints,
      funnelSteps: stepMetrics
    }
  }

  private static calculateStepMetrics(sessions: ConversionFunnelStep[][]): FunnelStepMetrics[] {
    return this.funnelSteps.map((stepDef, index) => {
      const stepSessions = sessions.filter(session =>
        session.some(step => step.step === stepDef.id)
      )

      const nextStepDef = this.funnelSteps[index + 1]
      const nextStepSessions = nextStepDef ? sessions.filter(session =>
        session.some(step => step.step === nextStepDef.id)
      ) : []

      const visitors = stepSessions.length
      const conversions = nextStepSessions.length
      const conversionRate = visitors > 0 ? (conversions / visitors) * 100 : 0
      const dropOffRate = 100 - conversionRate

      const averageTime = nextStepDef ? 
        this.calculateAverageTimeBetweenSteps(stepSessions, stepDef.id, nextStepDef.id) : 0

      return {
        step: stepDef.id,
        visitors,
        conversions,
        conversionRate,
        averageTime,
        dropOffRate
      }
    })
  }

  private static identifyDropOffPoints(stepMetrics: FunnelStepMetrics[]): DropOffPoint[] {
    return stepMetrics
      .filter(step => step.dropOffRate > 60) // High drop-off threshold
      .map(step => ({
        step: step.step,
        visitors: step.visitors,
        dropOffRate: step.dropOffRate,
        commonExitPages: this.getCommonExitPages(step.step)
      }))
  }

  private static getCommonExitPages(stepId: string): string[] {
    // In a real implementation, this would analyze exit page data
    // For now, return common exit patterns based on step
    const exitPatterns: Record<string, string[]> = {
      'hero_cta_impression': ['/pricing', '/about', '/contact'],
      'features_view': ['/pricing', '/docs', '/blog'],
      'demo_request': ['/pricing', '/contact'],
      'form_start': ['/privacy', '/terms', '/pricing']
    }

    return exitPatterns[stepId] || []
  }

  private static groupBySession(funnelData: ConversionFunnelStep[]): ConversionFunnelStep[][] {
    const sessionMap = new Map<string, ConversionFunnelStep[]>()

    funnelData.forEach(step => {
      const sessionId = step.sessionId || 'anonymous'
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, [])
      }
      sessionMap.get(sessionId)!.push(step)
    })

    // Sort steps within each session by timestamp
    sessionMap.forEach(steps => {
      steps.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      })
    })

    return Array.from(sessionMap.values())
  }

  private static calculateAverageTimeBetweenSteps(
    sessions: ConversionFunnelStep[][],
    fromStep: string,
    toStep: string
  ): number {
    const times: number[] = []

    sessions.forEach(session => {
      const fromEvent = session.find(step => step.step === fromStep)
      const toEvent = session.find(step => step.step === toStep)

      if (fromEvent && toEvent && fromEvent.timestamp && toEvent.timestamp) {
        const timeDiff = new Date(toEvent.timestamp).getTime() - new Date(fromEvent.timestamp).getTime()
        if (timeDiff > 0) times.push(timeDiff)
      }
    })

    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0
  }

  private static calculateAverageTimeToConvert(sessions: ConversionFunnelStep[][]): number {
    const conversionTimes: number[] = []

    sessions.forEach(session => {
      const firstStep = session[0]
      const conversionStep = session.find(step => step.step === 'conversion')

      if (firstStep && conversionStep && firstStep.timestamp && conversionStep.timestamp) {
        const timeDiff = new Date(conversionStep.timestamp).getTime() - new Date(firstStep.timestamp).getTime()
        if (timeDiff > 0) conversionTimes.push(timeDiff)
      }
    })

    return conversionTimes.length > 0 ?
      conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length : 0
  }

  static getConversionPath(sessionId: string): ConversionFunnelStep[] {
    const funnelData = this.getFunnelData()
    return funnelData
      .filter(step => step.sessionId === sessionId)
      .sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      })
  }

  static getTopConversionPaths(limit: number = 10): { path: string[]; count: number; conversionRate: number }[] {
    const sessions = this.groupBySession(this.getFunnelData())
    const pathMap = new Map<string, { count: number; conversions: number }>()

    sessions.forEach(session => {
      const path = session.map(step => step.step)
      const pathKey = path.join(' -> ')
      const hasConversion = session.some(step => step.step === 'conversion')

      if (!pathMap.has(pathKey)) {
        pathMap.set(pathKey, { count: 0, conversions: 0 })
      }

      const pathData = pathMap.get(pathKey)!
      pathData.count++
      if (hasConversion) pathData.conversions++
    })

    return Array.from(pathMap.entries())
      .map(([pathKey, data]) => ({
        path: pathKey.split(' -> '),
        count: data.count,
        conversionRate: data.count > 0 ? (data.conversions / data.count) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  static getAbandonmentReasons(stepId: string): { reason: string; count: number }[] {
    // In a real implementation, this would analyze user behavior data
    // For now, return common abandonment reasons based on step
    const reasonMap: Record<string, { reason: string; count: number }[]> = {
      'form_start': [
        { reason: 'Too many required fields', count: 45 },
        { reason: 'Privacy concerns', count: 32 },
        { reason: 'Technical issues', count: 18 },
        { reason: 'Changed mind', count: 25 }
      ],
      'demo_request': [
        { reason: 'Pricing not visible', count: 38 },
        { reason: 'Feature uncertainty', count: 29 },
        { reason: 'Competitor comparison', count: 22 },
        { reason: 'Budget constraints', count: 31 }
      ]
    }

    return reasonMap[stepId] || []
  }

  static optimizeFunnel(): { step: string; recommendation: string; impact: string }[] {
    const metrics = this.analyzeConversionFunnel()
    const recommendations: { step: string; recommendation: string; impact: string }[] = []

    metrics.funnelSteps.forEach(step => {
      if (step.dropOffRate > 70) {
        recommendations.push({
          step: step.step,
          recommendation: `High drop-off rate (${step.dropOffRate.toFixed(1)}%). Consider simplifying this step or adding more compelling content.`,
          impact: 'High'
        })
      } else if (step.dropOffRate > 50) {
        recommendations.push({
          step: step.step,
          recommendation: `Moderate drop-off rate (${step.dropOffRate.toFixed(1)}%). A/B test different approaches to improve conversion.`,
          impact: 'Medium'
        })
      }

      if (step.averageTime > 300000) { // 5 minutes
        recommendations.push({
          step: step.step,
          recommendation: `Users spend too long on this step (${(step.averageTime / 60000).toFixed(1)} minutes). Consider streamlining the process.`,
          impact: 'Medium'
        })
      }
    })

    return recommendations
  }

  private static getSessionId(): string {
    if (typeof window === 'undefined') return 'server'
    
    let sessionId = sessionStorage.getItem('analytics_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('analytics_session_id', sessionId)
    }
    return sessionId
  }

  static clearFunnelData() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('conversion_funnel')
    }
  }

  static exportFunnelData(): string {
    const data = {
      funnelData: this.getFunnelData(),
      analysis: this.analyzeConversionFunnel(),
      topPaths: this.getTopConversionPaths(),
      exportedAt: new Date().toISOString()
    }
    return JSON.stringify(data, null, 2)
  }
}