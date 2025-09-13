# Analytics Type Definitions

This document provides comprehensive documentation for all TypeScript types used in the analytics system.

## Core Analytics Types

### AnalyticsEvent

Base interface for all analytics events.

```typescript
interface AnalyticsEvent {
  name: string                    // Event name (required)
  properties?: Record<string, any> // Custom event properties
  timestamp?: Date                // Event timestamp (auto-generated if not provided)
  userId?: string                 // User identifier
  sessionId?: string              // Session identifier
}
```

**Usage Example:**
```typescript
const event: AnalyticsEvent = {
  name: 'signup_completed',
  properties: {
    plan: 'premium',
    source: 'landing_page'
  },
  userId: 'user-123'
}
```

### AnalyticsProvider

Configuration for analytics providers (Vercel, Google Analytics, etc.).

```typescript
interface AnalyticsProvider {
  name: string                    // Provider name ('vercel', 'google', etc.)
  enabled: boolean                // Whether provider is active
  config: Record<string, any>     // Provider-specific configuration
}
```

**Usage Example:**
```typescript
const providers: AnalyticsProvider[] = [
  {
    name: 'vercel',
    enabled: true,
    config: {}
  },
  {
    name: 'google',
    enabled: true,
    config: {
      measurementId: 'G-XXXXXXXXXX',
      enableEnhancedEcommerce: true
    }
  }
]
```

### AnalyticsConfig

Main configuration object for the analytics system.

```typescript
interface AnalyticsConfig {
  providers: AnalyticsProvider[]  // List of analytics providers
  enabledInDevelopment: boolean   // Enable analytics in development
  enabledInProduction: boolean    // Enable analytics in production
  trackingId?: string             // Optional tracking identifier
}
```

**Usage Example:**
```typescript
const config: AnalyticsConfig = {
  providers: [
    { name: 'vercel', enabled: true, config: {} },
    { name: 'google', enabled: true, config: { measurementId: 'G-123' } }
  ],
  enabledInDevelopment: false,
  enabledInProduction: true,
  trackingId: 'c9d-analytics'
}
```

## Event Types

### TrackingEvent

Standard tracking event for user interactions.

```typescript
interface TrackingEvent {
  category: string                // Event category ('conversion', 'engagement', etc.)
  action: string                  // Action performed ('click', 'view', 'submit')
  label?: string                  // Optional event label
  value?: number                  // Optional numeric value
  properties?: Record<string, any> // Additional properties
}
```

**Usage Example:**
```typescript
const trackingEvent: TrackingEvent = {
  category: 'conversion',
  action: 'signup',
  label: 'hero_cta',
  value: 1,
  properties: {
    plan: 'premium',
    trial_length: 14
  }
}
```

### PageViewEvent

Event for tracking page views and navigation.

```typescript
interface PageViewEvent {
  page: string                    // Page path or identifier
  title?: string                  // Page title
  referrer?: string               // Referrer URL
  properties?: Record<string, any> // Additional page properties
}
```

**Usage Example:**
```typescript
const pageView: PageViewEvent = {
  page: '/dashboard',
  title: 'User Dashboard',
  referrer: 'https://google.com',
  properties: {
    user_type: 'premium',
    feature_flags: ['new_ui', 'advanced_analytics']
  }
}
```

### ConversionEvent

Event for tracking conversions and revenue.

```typescript
interface ConversionEvent {
  eventName: string               // Conversion event name
  value?: number                  // Conversion value (revenue, etc.)
  currency?: string               // Currency code (USD, EUR, etc.)
  properties?: Record<string, any> // Additional conversion properties
}
```

**Usage Example:**
```typescript
const conversion: ConversionEvent = {
  eventName: 'purchase_completed',
  value: 99.99,
  currency: 'USD',
  properties: {
    plan: 'premium',
    billing_cycle: 'annual',
    discount_applied: true
  }
}
```

### CustomEvent

Generic event for custom tracking needs.

```typescript
interface CustomEvent {
  name: string                    // Custom event name
  properties?: Record<string, any> // Custom properties
}
```

**Usage Example:**
```typescript
const customEvent: CustomEvent = {
  name: 'feature_discovery',
  properties: {
    feature_name: 'advanced_analytics',
    discovery_method: 'tooltip',
    time_to_discover: 45000
  }
}
```

### AnalyticsEventType

Union type for all possible analytics events.

```typescript
type AnalyticsEventType = 
  | TrackingEvent 
  | PageViewEvent 
  | CustomEvent 
  | ConversionEvent
```

## Funnel Analysis Types

### FunnelStep

Defines a step in a conversion funnel.

```typescript
interface FunnelStep {
  id: string                      // Unique step identifier
  name: string                    // Human-readable step name
  description?: string            // Optional step description
  order: number                   // Step order in funnel (0-based)
  required: boolean               // Whether step is required for conversion
}
```

**Usage Example:**
```typescript
const funnelSteps: FunnelStep[] = [
  {
    id: 'landing_page',
    name: 'Landing Page Visit',
    description: 'User visits the landing page',
    order: 0,
    required: true
  },
  {
    id: 'signup_form',
    name: 'Signup Form View',
    description: 'User views the signup form',
    order: 1,
    required: true
  },
  {
    id: 'signup_complete',
    name: 'Signup Complete',
    description: 'User completes signup process',
    order: 2,
    required: true
  }
]
```

### FunnelMetrics

Metrics and analysis for a conversion funnel.

```typescript
interface FunnelMetrics {
  totalUsers: number              // Total users who entered funnel
  completedUsers: number          // Users who completed entire funnel
  conversionRate: number          // Overall conversion rate (0-1)
  dropoffRate: number             // Overall dropoff rate (0-1)
  funnelSteps: Array<{
    step: FunnelStep              // Step definition
    users: number                 // Users who reached this step
    conversionRate: number        // Conversion rate to this step
    dropoffRate: number           // Dropoff rate from this step
  }>
}
```

**Usage Example:**
```typescript
const metrics: FunnelMetrics = {
  totalUsers: 1000,
  completedUsers: 150,
  conversionRate: 0.15,
  dropoffRate: 0.85,
  funnelSteps: [
    {
      step: { id: 'landing', name: 'Landing Page', order: 0, required: true },
      users: 1000,
      conversionRate: 1.0,
      dropoffRate: 0.0
    },
    {
      step: { id: 'signup', name: 'Signup Form', order: 1, required: true },
      users: 300,
      conversionRate: 0.3,
      dropoffRate: 0.7
    }
  ]
}
```

### FunnelStepMetrics

Detailed metrics for individual funnel steps.

```typescript
interface FunnelStepMetrics {
  stepId: string                  // Step identifier
  stepName: string                // Step name
  users: number                   // Users who reached this step
  conversionRate: number          // Conversion rate to this step
  dropoffRate: number             // Dropoff rate from this step
  averageTime: number             // Average time spent on step (ms)
}
```

## A/B Testing Types

### ABTestVariant

Defines a variant in an A/B test.

```typescript
interface ABTestVariant {
  id: string                      // Unique variant identifier
  name: string                    // Human-readable variant name
  description?: string            // Optional variant description
  weight: number                  // Traffic allocation weight (0-100)
  config: Record<string, any>     // Variant-specific configuration
}
```

**Usage Example:**
```typescript
const variants: ABTestVariant[] = [
  {
    id: 'control',
    name: 'Control (Original)',
    description: 'Original hero section design',
    weight: 50,
    config: {
      title: 'Original Title',
      buttonText: 'Get Started',
      buttonColor: 'blue'
    }
  },
  {
    id: 'variant_a',
    name: 'Variant A (New Design)',
    description: 'Updated hero section with new copy',
    weight: 50,
    config: {
      title: 'New Improved Title',
      buttonText: 'Start Free Trial',
      buttonColor: 'green'
    }
  }
]
```

### ABTest

Complete A/B test definition.

```typescript
interface ABTest {
  id: string                      // Unique test identifier
  name: string                    // Human-readable test name
  description?: string            // Optional test description
  status: 'draft' | 'running' | 'paused' | 'completed' // Test status
  variants: ABTestVariant[]       // Test variants
  trafficSplit: number[]          // Traffic allocation percentages
  startDate?: Date                // Test start date
  endDate?: Date                  // Test end date
  metrics: string[]               // Success metrics to track
}
```

**Usage Example:**
```typescript
const abTest: ABTest = {
  id: 'hero_cta_test',
  name: 'Hero CTA Button Test',
  description: 'Testing different CTA button designs',
  status: 'running',
  variants: [
    { id: 'control', name: 'Control', weight: 50, config: {} },
    { id: 'variant_a', name: 'Variant A', weight: 50, config: {} }
  ],
  trafficSplit: [50, 50],
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  metrics: ['signup_conversion', 'click_through_rate']
}
```

### ABTestResult

Results and performance metrics for A/B test variants.

```typescript
interface ABTestResult {
  variantId: string               // Variant identifier
  metrics: Record<string, {
    value: number                 // Metric value
    confidence: number            // Statistical confidence (0-1)
    improvement: number           // Improvement over control (%)
  }>
}
```

**Usage Example:**
```typescript
const results: ABTestResult[] = [
  {
    variantId: 'control',
    metrics: {
      signup_conversion: {
        value: 0.12,
        confidence: 0.95,
        improvement: 0
      },
      click_through_rate: {
        value: 0.25,
        confidence: 0.95,
        improvement: 0
      }
    }
  },
  {
    variantId: 'variant_a',
    metrics: {
      signup_conversion: {
        value: 0.15,
        confidence: 0.92,
        improvement: 25
      },
      click_through_rate: {
        value: 0.32,
        confidence: 0.98,
        improvement: 28
      }
    }
  }
]
```

## User Segmentation Types

### UserSegment

Defines a user segment for targeted analysis.

```typescript
interface UserSegment {
  id: string                      // Unique segment identifier
  name: string                    // Human-readable segment name
  description?: string            // Optional segment description
  criteria: Record<string, any>   // Segmentation criteria
  userCount: number               // Number of users in segment
}
```

**Usage Example:**
```typescript
const segment: UserSegment = {
  id: 'high_value_users',
  name: 'High-Value Users',
  description: 'Users with high lifetime value and engagement',
  criteria: {
    totalRevenue: { $gte: 1000 },
    lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    plan: { $in: ['premium', 'enterprise'] }
  },
  userCount: 1250
}
```

## Metrics and Dashboard Types

### AnalyticsMetric

Individual metric with value and metadata.

```typescript
interface AnalyticsMetric {
  name: string                    // Metric name
  value: number                   // Metric value
  unit?: string                   // Unit of measurement
  change?: number                 // Change from previous period
  changeType?: 'increase' | 'decrease' // Direction of change
  period?: string                 // Time period for metric
}
```

**Usage Example:**
```typescript
const metrics: AnalyticsMetric[] = [
  {
    name: 'Monthly Active Users',
    value: 15420,
    unit: 'users',
    change: 12.5,
    changeType: 'increase',
    period: '30d'
  },
  {
    name: 'Conversion Rate',
    value: 3.2,
    unit: 'percentage',
    change: -0.3,
    changeType: 'decrease',
    period: '7d'
  }
]
```

### DashboardMetrics

Comprehensive metrics for analytics dashboard.

```typescript
interface DashboardMetrics {
  totalUsers: number              // Total registered users
  activeUsers: number             // Currently active users
  conversionRate: number          // Overall conversion rate
  revenue: number                 // Total revenue
  metrics: AnalyticsMetric[]      // Additional metrics
}
```

**Usage Example:**
```typescript
const dashboardMetrics: DashboardMetrics = {
  totalUsers: 50000,
  activeUsers: 15420,
  conversionRate: 3.2,
  revenue: 125000,
  metrics: [
    {
      name: 'Trial Conversion Rate',
      value: 18.5,
      unit: 'percentage',
      change: 2.1,
      changeType: 'increase',
      period: '30d'
    }
  ]
}
```

### ConversionMetrics

Detailed conversion analysis metrics.

```typescript
interface ConversionMetrics {
  totalUsers: number              // Total users in analysis
  convertedUsers: number          // Users who converted
  conversionRate: number          // Conversion rate (0-1)
  averageTimeToConvert: number    // Average time to conversion (ms)
  funnelSteps: FunnelStepMetrics[] // Step-by-step metrics
}
```

## Type Guards and Utilities

### Type Guards

Helper functions to check event types at runtime:

```typescript
// Check if event is a tracking event
function isTrackingEvent(event: AnalyticsEventType): event is TrackingEvent {
  return 'category' in event && 'action' in event
}

// Check if event is a page view
function isPageViewEvent(event: AnalyticsEventType): event is PageViewEvent {
  return 'page' in event
}

// Check if event is a conversion
function isConversionEvent(event: AnalyticsEventType): event is ConversionEvent {
  return 'eventName' in event && 'value' in event
}
```

### Utility Types

Common utility types for analytics:

```typescript
// Date range for analytics queries
type DateRange = {
  start: Date
  end: Date
}

// Analytics query options
type AnalyticsQuery = {
  dateRange?: DateRange
  userSegment?: string
  eventTypes?: string[]
  limit?: number
  offset?: number
}

// Event properties with common fields
type EventProperties = Record<string, string | number | boolean | Date>
```

## Migration Notes

### Version 2.0 Changes

The following types were updated in version 2.0:

- `AnalyticsEvent.properties` now accepts `any` type for flexibility
- `ABTestVariant.config` structure simplified
- `FunnelMetrics` includes new `dropoffRate` field
- `ConversionEvent` added optional `currency` field

### Backward Compatibility

Most changes are backward compatible. However, check these areas:

1. **Event Properties**: Ensure custom properties match new structure
2. **A/B Test Config**: Update variant configurations if using complex objects
3. **Funnel Analysis**: New metrics may require updated dashboard components

## Best Practices

### Type Safety

Always use proper TypeScript types:

```typescript
// Good: Properly typed
const event: TrackingEvent = {
  category: 'conversion',
  action: 'signup',
  label: 'hero_cta'
}

// Avoid: Untyped objects
const event = {
  category: 'conversion',
  action: 'signup',
  label: 'hero_cta'
} // TypeScript can't validate this
```

### Property Naming

Use consistent property naming:

```typescript
// Good: snake_case for properties
properties: {
  user_type: 'premium',
  feature_name: 'analytics',
  plan_tier: 'enterprise'
}

// Avoid: Mixed naming conventions
properties: {
  userType: 'premium',
  feature_name: 'analytics',
  'plan-tier': 'enterprise'
}
```

### Null Safety

Handle optional fields safely:

```typescript
// Good: Safe property access
const userId = event.userId ?? 'anonymous'
const timestamp = event.timestamp ?? new Date()

// Avoid: Unsafe access
const userId = event.userId // Could be undefined
```

This comprehensive type system ensures type safety and consistency across the analytics platform while providing flexibility for custom implementations.