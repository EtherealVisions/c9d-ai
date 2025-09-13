import { 
  ABTestConfig, 
  ABTestVariant, 
  ABTestResult,
  ABTestVariantResult 
} from '@/lib/types/analytics'
import { AnalyticsService } from './analytics-service'

export class ABTestingService {
  private static activeTests = new Map<string, ABTestConfig>()
  private static userAssignments = new Map<string, Map<string, string>>()

  static initializeTest(config: ABTestConfig) {
    if (!config.enabled) return

    // Validate test configuration
    if (!this.validateTestConfig(config)) {
      console.error('Invalid A/B test configuration:', config)
      return
    }

    this.activeTests.set(config.id, config)
    
    // Track test initialization
    AnalyticsService.trackEvent({
      event: 'ab_test_initialized',
      category: 'ab_test',
      label: config.id,
      properties: {
        test_name: config.name,
        variants_count: config.variants.length,
        traffic_split: config.trafficSplit,
        start_date: config.startDate?.toISOString(),
        end_date: config.endDate?.toISOString()
      }
    })
  }

  static getVariant(testId: string, userId?: string): ABTestVariant | null {
    const test = this.activeTests.get(testId)
    if (!test || !test.enabled) return null

    // Check if test is active
    const now = new Date()
    if ((test.startDate && now < test.startDate) || (test.endDate && now > test.endDate)) {
      return null
    }

    // Get or assign variant for user
    const userKey = userId || this.getAnonymousUserId()
    let userAssignments = this.userAssignments.get(userKey)
    
    if (!userAssignments) {
      userAssignments = new Map()
      this.userAssignments.set(userKey, userAssignments)
    }

    let assignedVariantId = userAssignments.get(testId)
    
    if (!assignedVariantId) {
      // Assign new variant
      assignedVariantId = this.assignVariant(test, userKey)
      userAssignments.set(testId, assignedVariantId)
      
      // Track assignment
      this.trackAssignment(testId, assignedVariantId, userKey)
    }

    return test.variants.find(v => v.id === assignedVariantId) || null
  }

  private static assignVariant(test: ABTestConfig, userKey: string): string {
    // Use consistent hash-based assignment
    const hash = this.hashString(userKey + test.id)
    const randomValue = hash * 100

    let cumulativePercentage = 0
    for (let i = 0; i < test.variants.length; i++) {
      cumulativePercentage += test.trafficSplit[i] || (100 / test.variants.length)
      if (randomValue <= cumulativePercentage) {
        return test.variants[i].id
      }
    }

    return test.variants[0].id // Fallback
  }

  private static trackAssignment(testId: string, variantId: string, userKey: string) {
    AnalyticsService.trackEvent({
      event: 'ab_test_assignment',
      category: 'ab_test',
      label: `${testId}_${variantId}`,
      properties: {
        test_id: testId,
        variant_id: variantId,
        user_key: userKey
      }
    })

    // Store assignment in localStorage for persistence
    if (typeof window !== 'undefined') {
      const assignments = JSON.parse(
        localStorage.getItem('ab_test_assignments') || '{}'
      )
      assignments[testId] = {
        variantId,
        assignedAt: new Date().toISOString()
      }
      localStorage.setItem('ab_test_assignments', JSON.stringify(assignments))
    }
  }

  static trackConversion(testId: string, conversionEvent: string, value?: number, userId?: string) {
    const userKey = userId || this.getAnonymousUserId()
    const userAssignments = this.userAssignments.get(userKey)
    const variantId = userAssignments?.get(testId)

    if (!variantId) return

    AnalyticsService.trackEvent({
      event: 'ab_test_conversion',
      category: 'ab_test',
      label: `${testId}_${variantId}_${conversionEvent}`,
      properties: {
        test_id: testId,
        variant_id: variantId,
        conversion_event: conversionEvent,
        user_key: userKey,
        value
      }
    })
  }

  static analyzeTestResults(testId: string): ABTestVariantResult[] {
    const test = this.activeTests.get(testId)
    if (!test) return []

    // In a real implementation, this would query your analytics backend
    // For now, we'll simulate the analysis
    const variantResults = test.variants.map(variant => {
      const sampleSize = this.getVariantSampleSize(testId, variant.id)
      const conversions = this.getVariantConversions(testId, variant.id)
      const conversionRate = sampleSize > 0 ? (conversions / sampleSize) * 100 : 0
      
      const { statisticalSignificance, confidenceInterval } = this.calculateStatistics(
        conversions,
        sampleSize,
        test.confidenceLevel || 95
      )

      return {
        variantId: variant.id,
        testName: test.name,
        sampleSize,
        conversions,
        conversionRate,
        statisticalSignificance,
        confidenceInterval,
        isWinner: false // Will be set below
      }
    })

    // Determine winner (variant with highest conversion rate)
    if (variantResults.length > 0) {
      const winnerResult = variantResults.reduce((prev, current) => 
        (current.conversionRate > prev.conversionRate) ? current : prev
      )
      winnerResult.isWinner = true
    }

    return variantResults
  }

  private static calculateStatistics(conversions: number, sampleSize: number, confidenceLevel: number) {
    if (sampleSize === 0) {
      return { confidenceInterval: [0, 0] as [number, number], statisticalSignificance: 0 }
    }

    const conversionRate = conversions / sampleSize
    const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / sampleSize)
    
    // Z-score for confidence level (90% = 1.645, 95% = 1.96, 99% = 2.58)
    const zScore = confidenceLevel === 99 ? 2.58 : confidenceLevel === 90 ? 1.645 : 1.96
    const marginOfError = zScore * standardError
    
    const confidenceInterval: [number, number] = [
      Math.max(0, (conversionRate - marginOfError) * 100),
      Math.min(100, (conversionRate + marginOfError) * 100)
    ]

    // Enhanced statistical significance calculation
    const statisticalSignificance = this.calculateStatisticalSignificance(
      conversions, 
      sampleSize, 
      confidenceLevel
    )

    return { confidenceInterval, statisticalSignificance }
  }

  private static calculateStatisticalSignificance(
    conversions: number, 
    sampleSize: number, 
    confidenceLevel: number
  ): number {
    if (sampleSize < 30) return 0 // Insufficient sample size

    const conversionRate = conversions / sampleSize
    const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / sampleSize)
    
    // Calculate minimum detectable effect (MDE)
    const baselineRate = 0.05 // Assume 5% baseline conversion rate
    const minimumDetectableEffect = 0.2 // 20% relative improvement
    const expectedRate = baselineRate * (1 + minimumDetectableEffect)
    
    // Calculate z-score for the difference
    const pooledStandardError = Math.sqrt(
      (baselineRate * (1 - baselineRate) + conversionRate * (1 - conversionRate)) / sampleSize
    )
    
    const zScore = Math.abs(conversionRate - baselineRate) / pooledStandardError
    
    // Convert z-score to confidence level
    if (zScore >= 2.58) return 99
    if (zScore >= 1.96) return 95
    if (zScore >= 1.645) return 90
    if (zScore >= 1.28) return 80
    
    return Math.round(this.normalCDF(zScore) * 100)
  }

  private static normalCDF(x: number): number {
    // Approximation of the cumulative distribution function for standard normal distribution
    const t = 1 / (1 + 0.2316419 * Math.abs(x))
    const d = 0.3989423 * Math.exp(-x * x / 2)
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    
    return x > 0 ? 1 - prob : prob
  }

  private static getVariantSampleSize(testId: string, variantId: string): number {
    // In a real implementation, this would query your analytics data
    // For now, return a simulated value
    return Math.floor(Math.random() * 1000) + 100
  }

  private static getVariantConversions(testId: string, variantId: string): number {
    // In a real implementation, this would query your analytics data
    // For now, return a simulated value
    const sampleSize = this.getVariantSampleSize(testId, variantId)
    return Math.floor(sampleSize * (Math.random() * 0.1 + 0.02)) // 2-12% conversion rate
  }

  private static isWinningVariant(testId: string, variantId: string): boolean {
    const results = this.analyzeTestResults(testId)
    if (!results || results.length === 0) return false
    const variantResult = results.find(r => r.variantId === variantId)
    return variantResult?.isWinner || false
  }

  static getTestStatus(testId: string): 'not_started' | 'running' | 'completed' | 'paused' {
    const test = this.activeTests.get(testId)
    if (!test) return 'not_started'

    const now = new Date()
    if (test.startDate && now < test.startDate) return 'not_started'
    if (test.endDate && now > test.endDate) return 'completed'
    if (!test.enabled) return 'paused'
    return 'running'
  }

  static pauseTest(testId: string) {
    const test = this.activeTests.get(testId)
    if (test) {
      test.enabled = false
      AnalyticsService.trackEvent({
        event: 'ab_test_paused',
        category: 'ab_test',
        label: testId
      })
    }
  }

  static resumeTest(testId: string) {
    const test = this.activeTests.get(testId)
    if (test) {
      test.enabled = true
      AnalyticsService.trackEvent({
        event: 'ab_test_resumed',
        category: 'ab_test',
        label: testId
      })
    }
  }

  static endTest(testId: string) {
    const test = this.activeTests.get(testId)
    if (test) {
      test.endDate = new Date()
      test.enabled = false
      
      const results = this.analyzeTestResults(testId)
      
      AnalyticsService.trackEvent({
        event: 'ab_test_ended',
        category: 'ab_test',
        label: testId,
        properties: {
          winner_variant: results?.winner,
          total_participants: results?.variants.reduce((sum, v) => sum + v.participants, 0) || 0,
          test_duration: test.startDate ? test.endDate.getTime() - test.startDate.getTime() : 0
        }
      })
    }
  }

  private static validateTestConfig(config: ABTestConfig): boolean {
    // Check required fields
    if (!config.id || !config.name || !config.variants || config.variants.length === 0) {
      return false
    }

    // Check traffic split
    if (config.trafficSplit.length !== config.variants.length) {
      return false
    }

    const totalTraffic = config.trafficSplit.reduce((sum, split) => sum + split, 0)
    if (Math.abs(totalTraffic - 100) > 0.01) {
      return false
    }

    // Check dates - endDate should be after startDate if both are provided
    if (config.startDate && config.endDate && config.endDate <= config.startDate) {
      return false
    }

    return true
  }

  private static hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647 // Normalize to 0-1
  }

  private static getAnonymousUserId(): string {
    if (typeof window === 'undefined') return 'server'
    
    let anonymousId = localStorage.getItem('anonymous_user_id')
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('anonymous_user_id', anonymousId)
    }
    return anonymousId
  }

  static getAllActiveTests(): ABTestConfig[] {
    return Array.from(this.activeTests.values()).filter(test => test.enabled)
  }

  static getTestConfig(testId: string): ABTestConfig | null {
    return this.activeTests.get(testId) || null
  }

  static clearUserAssignments(userId?: string) {
    const userKey = userId || this.getAnonymousUserId()
    this.userAssignments.delete(userKey)
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ab_test_assignments')
    }
  }

  // Test utility method to clear all state
  static clearAllTests() {
    this.activeTests.clear()
    this.userAssignments.clear()
  }
}