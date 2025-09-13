/**
 * Analytics types for tracking and metrics
 */

export interface AnalyticsEvent {
  name?: string
  event?: string
  category?: string
  label?: string
  value?: number
  properties?: Record<string, any>
  timestamp?: Date
  userId?: string
  sessionId?: string
}

export interface AnalyticsProvider {
  name: string
  track: (event: AnalyticsEvent) => Promise<void>
  identify: (userId: string, traits?: Record<string, any>) => Promise<void>
}

export interface AnalyticsProviderConfig {
  name: string
  enabled: boolean
  config: Record<string, any>
}

export interface AnalyticsConfig {
  providers: AnalyticsProviderConfig[]
  enabledInDevelopment?: boolean
  batchSize?: number
  flushInterval?: number
  enableDebugMode?: boolean
  enableConsentMode?: boolean
  defaultConsentState?: {
    analytics_storage: 'granted' | 'denied'
    ad_storage: 'granted' | 'denied'
    functionality_storage: 'granted' | 'denied'
    personalization_storage: 'granted' | 'denied'
  }
  customEvents?: Record<string, any>
  customMetrics?: Record<string, any>
  customDimensions?: Record<string, any>
}

export interface ConversionFunnelStep {
  id: string
  name: string
  description?: string
  order: number
}

export interface ABTestVariant {
  id: string
  name: string
  description?: string
  weight?: number
  config?: Record<string, any>
  participants?: number
  conversions?: number
  conversionRate?: number
  confidence?: number
}

export interface ABTestConfig {
  id: string
  name: string
  description?: string
  variants: ABTestVariant[]
  trafficSplit: number[]
  isActive?: boolean
  enabled?: boolean
  startDate?: Date
  endDate?: Date
  minimumSampleSize?: number
  confidenceLevel?: number
}

export interface MetricValue {
  value: number
  timestamp: Date
  dimensions?: Record<string, string>
}

export interface AnalyticsMetrics {
  pageViews: MetricValue[]
  uniqueVisitors: MetricValue[]
  conversions: MetricValue[]
  bounceRate: MetricValue[]
}

export interface ConversionMetrics {
  totalConversions: number
  totalVisitors: number
  conversionRate: number
  averageOrderValue: number
  averageTimeToConvert: number
  revenue: number
  period: string
  funnelSteps: Array<{
    step: string
    visitors: number
    conversions: number
    conversionRate: number
    averageTime: number
    dropOffRate: number
  }>
  dropOffPoints: Array<{
    step: string
    visitors: number
    dropOffRate: number
    impact: 'high' | 'medium' | 'low'
    suggestions: string[]
    commonExitPages: string[]
  }>
  previousPeriodComparison?: {
    totalConversions: number
    conversionRate: number
    averageOrderValue: number
    revenue: number
    changePercent: number
  }
}

export interface ABTestResult {
  testId: string
  testName: string
  status: 'running' | 'completed' | 'paused'
  variants: Array<{
    id: string
    name: string
    participants: number
    conversions: number
    conversionRate: number
    confidence: number
  }>
  winner?: string
  startDate: Date
  endDate?: Date
  statisticalSignificance: number
}

export interface ABTestVariantResult {
  variantId: string
  testName: string
  sampleSize: number
  conversions: number
  conversionRate: number
  isWinner: boolean
  statisticalSignificance: number
  confidenceInterval: [number, number]
}

export interface PerformanceMetrics {
  pageLoadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  timeToInteractive: number
}



export interface EcommerceEvent {
  event: string
  transactionId: string
  items: Array<{
    itemId: string
    itemName: string
    category: string
    quantity: number
    price: number
  }>
  value: number
  currency: string
  coupon?: string
  shippingTier?: string
  paymentType?: string
}

export interface HeatmapConfig {
  enabled: boolean
  sampleRate: number
  excludeElements: string[]
  trackClicks: boolean
  trackScrolling: boolean
  trackMouseMovement: boolean
}

export type AnalyticsEventType = 
  | TrackingEvent 
  | PageViewEvent 
  | CustomEvent 
  | ConversionEventexpo
rt interface SessionRecordingConfig {
  enabled: boolean
  sampleRate: number
  maskTextInputs: boolean
  maskSensitiveElements: string[]
  recordConsoleErrors: boolean
  recordNetworkRequests: boolean
  maxSessionDuration: number
}