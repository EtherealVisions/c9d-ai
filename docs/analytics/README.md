# Analytics System

The C9D AI platform includes a comprehensive analytics system for tracking user behavior, measuring conversions, conducting A/B tests, and analyzing performance metrics.

## Overview

The analytics system provides:

- **Multi-Provider Support**: Vercel Analytics, Google Analytics 4, and custom providers
- **Conversion Tracking**: Complete funnel analysis and conversion optimization
- **A/B Testing**: Sophisticated testing framework with statistical significance
- **User Segmentation**: Advanced user categorization and behavior analysis
- **Performance Monitoring**: Real-time performance metrics and optimization insights
- **Privacy Compliance**: GDPR/CCPA compliant with consent management

## Architecture

```
Analytics System
├── Core Services
│   ├── AnalyticsService      # Main analytics orchestration
│   ├── ConversionFunnelService # Funnel tracking and analysis
│   └── ABTestingService      # A/B test management
├── Components
│   ├── AnalyticsProvider     # React context provider
│   └── AnalyticsDashboard    # Analytics visualization
├── Types
│   └── analytics.ts          # TypeScript definitions
└── Configuration
    └── analytics-config.ts   # Provider configuration
```

## Quick Start

### 1. Basic Setup

```typescript
import { AnalyticsProvider } from '@/components/analytics-provider'
import { analyticsConfig } from '@/lib/config/analytics-config'

export default function App({ children }) {
  return (
    <AnalyticsProvider config={analyticsConfig} userId="user-123">
      {children}
    </AnalyticsProvider>
  )
}
```

### 2. Track Events

```typescript
import { AnalyticsService } from '@/lib/services/analytics-service'

// Track a conversion event
AnalyticsService.trackEvent({
  event: 'signup_completed',
  category: 'conversion',
  label: 'hero_cta',
  value: 1,
  properties: {
    plan: 'premium',
    source: 'landing_page'
  }
})

// Track page view
AnalyticsService.trackPageView({
  page: '/dashboard',
  title: 'User Dashboard',
  properties: {
    user_type: 'premium',
    feature_flags: ['new_ui', 'advanced_analytics']
  }
})
```

### 3. Analyze Conversion Funnel

```typescript
import { ConversionFunnelService } from '@/lib/services/conversion-funnel-service'

// Get funnel metrics
const metrics = await ConversionFunnelService.getFunnelMetrics({
  funnelId: 'signup_funnel',
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  }
})

console.log(`Conversion rate: ${metrics.conversionRate}%`)
```

### 4. Run A/B Tests

```typescript
import { ABTestingService } from '@/lib/services/ab-testing-service'

// Get test variant for user
const variant = await ABTestingService.getVariant('hero_test', 'user-123')

// Track test conversion
ABTestingService.trackConversion('hero_test', variant.id, {
  event: 'signup_completed',
  value: 1
})
```

## Core Concepts

### Analytics Events

All analytics events follow a consistent structure:

```typescript
interface AnalyticsEvent {
  name: string                    // Event name (e.g., 'signup_completed')
  properties?: Record<string, any> // Custom properties
  timestamp?: Date                // Event timestamp
  userId?: string                 // User identifier
  sessionId?: string              // Session identifier
}
```

### Event Categories

Events are categorized for better organization:

- **`awareness`**: Page views, content consumption
- **`interest`**: Feature exploration, content engagement
- **`consideration`**: Pricing views, feature comparisons
- **`evaluation`**: Trial signups, demo requests
- **`intent`**: Purchase attempts, upgrade clicks
- **`purchase`**: Completed conversions, subscriptions

### Conversion Funnels

Funnels track user progression through defined steps:

```typescript
interface FunnelStep {
  id: string          // Unique step identifier
  name: string        // Human-readable name
  description?: string // Step description
  order: number       // Step order in funnel
  required: boolean   // Whether step is required
}
```

### A/B Testing

A/B tests compare different variants to optimize conversions:

```typescript
interface ABTest {
  id: string                    // Test identifier
  name: string                  // Test name
  status: 'draft' | 'running' | 'paused' | 'completed'
  variants: ABTestVariant[]     // Test variants
  trafficSplit: number[]        // Traffic allocation
  startDate?: Date              // Test start date
  endDate?: Date                // Test end date
  metrics: string[]             // Success metrics
}
```

## Configuration

### Analytics Providers

Configure multiple analytics providers:

```typescript
// lib/config/analytics-config.ts
export const analyticsConfig: AnalyticsConfig = {
  providers: [
    {
      name: 'vercel',
      enabled: true,
      config: {}
    },
    {
      name: 'google',
      enabled: true,
      config: {
        measurementId: 'G-XXXXXXXXXX'
      }
    }
  ],
  enabledInDevelopment: false,
  enabledInProduction: true,
  trackingId: 'c9d-analytics'
}
```

### Environment Variables

Required environment variables:

```bash
# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Custom Analytics
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_ANALYTICS_DEBUG=false

# A/B Testing
NEXT_PUBLIC_AB_TESTING_ENABLED=true
```

## Services

### AnalyticsService

Main service for event tracking and analytics management.

**Key Methods:**
- `initialize(config)` - Initialize analytics providers
- `trackEvent(event)` - Track custom events
- `trackPageView(page)` - Track page views
- `trackConversion(event)` - Track conversion events
- `setUserId(userId)` - Set user identifier
- `getUserSegment(userId)` - Get user segment

### ConversionFunnelService

Service for tracking and analyzing conversion funnels.

**Key Methods:**
- `trackFunnelStep(step, userId)` - Track funnel progression
- `getFunnelMetrics(options)` - Get funnel analysis
- `createFunnel(definition)` - Create new funnel
- `optimizeFunnel(funnelId)` - Get optimization suggestions

### ABTestingService

Service for managing A/B tests and variants.

**Key Methods:**
- `createTest(definition)` - Create new A/B test
- `getVariant(testId, userId)` - Get user's test variant
- `trackConversion(testId, variantId, event)` - Track test conversion
- `getTestResults(testId)` - Get test performance results
- `pauseTest(testId)` - Pause running test

## Components

### AnalyticsProvider

React context provider for analytics initialization:

```typescript
interface AnalyticsProviderProps {
  config: AnalyticsConfig
  userId?: string
  children: React.ReactNode
}

<AnalyticsProvider config={analyticsConfig} userId="user-123">
  <App />
</AnalyticsProvider>
```

### AnalyticsDashboard

Dashboard component for visualizing analytics data:

```typescript
interface AnalyticsDashboardProps {
  dateRange?: DateRange
  metrics?: string[]
  segments?: UserSegment[]
}

<AnalyticsDashboard 
  dateRange={{ start: startDate, end: endDate }}
  metrics={['conversions', 'revenue', 'users']}
/>
```

## Advanced Features

### User Segmentation

Segment users based on behavior and properties:

```typescript
const segment = await AnalyticsService.createSegment({
  name: 'High-Value Users',
  criteria: {
    totalRevenue: { $gte: 1000 },
    lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    plan: { $in: ['premium', 'enterprise'] }
  }
})
```

### Custom Metrics

Define and track custom business metrics:

```typescript
const customMetric: AnalyticsMetric = {
  name: 'Feature Adoption Rate',
  value: 0.75,
  unit: 'percentage',
  change: 0.05,
  changeType: 'increase',
  period: '30d'
}

AnalyticsService.trackMetric(customMetric)
```

### Performance Monitoring

Monitor application performance:

```typescript
// Track Core Web Vitals
AnalyticsService.trackPerformance({
  metric: 'LCP',
  value: 2.1,
  rating: 'good'
})

// Track custom performance metrics
AnalyticsService.trackPerformance({
  metric: 'api_response_time',
  value: 150,
  endpoint: '/api/users'
})
```

## Privacy and Compliance

### Consent Management

Handle user consent for analytics:

```typescript
// Check consent status
const hasConsent = AnalyticsService.hasConsent('analytics')

// Request consent
AnalyticsService.requestConsent(['analytics', 'marketing'])

// Update consent
AnalyticsService.updateConsent({
  analytics: true,
  marketing: false,
  functional: true
})
```

### Data Anonymization

Automatically anonymize sensitive data:

```typescript
// PII is automatically filtered
AnalyticsService.trackEvent({
  event: 'profile_updated',
  properties: {
    email: 'user@example.com',  // Automatically hashed
    name: 'John Doe',           // Automatically anonymized
    plan: 'premium'             // Preserved
  }
})
```

## Testing

The analytics system includes comprehensive testing:

- **Unit Tests**: Service logic and event tracking
- **Integration Tests**: Provider integration and data flow
- **Performance Tests**: Event processing efficiency
- **E2E Tests**: Complete user journey tracking

See [Analytics Testing Guide](../testing/analytics-testing-guide.md) for detailed testing strategies.

## Monitoring and Debugging

### Debug Mode

Enable debug mode for development:

```typescript
const config: AnalyticsConfig = {
  // ... other config
  enableDebugMode: true
}
```

### Analytics Dashboard

Monitor analytics health in real-time:

- Event processing rates
- Provider status and errors
- Conversion funnel performance
- A/B test statistical significance

### Error Handling

The system gracefully handles errors:

- Provider failures don't break the application
- Events are queued and retried on failure
- Fallback tracking ensures data collection continuity

## Best Practices

### Event Naming

Use consistent event naming conventions:

```typescript
// Good: Clear, descriptive names
'signup_completed'
'trial_started'
'feature_enabled'

// Avoid: Vague or inconsistent names
'click'
'action'
'event1'
```

### Property Structure

Structure event properties consistently:

```typescript
// Good: Structured, typed properties
{
  user_type: 'premium',
  feature_name: 'advanced_analytics',
  plan_tier: 'enterprise',
  value: 99.99
}

// Avoid: Unstructured or inconsistent properties
{
  data: 'premium user clicked advanced analytics',
  misc: { plan: 'enterprise', cost: '$99.99' }
}
```

### Performance Optimization

- Batch events when possible
- Use async tracking to avoid blocking UI
- Implement proper error boundaries
- Monitor analytics performance impact

### Privacy by Design

- Minimize data collection to necessary metrics
- Implement proper consent management
- Anonymize PII automatically
- Provide clear opt-out mechanisms

## Migration Guide

### From Basic Analytics

If migrating from a basic analytics setup:

1. **Install Dependencies**: Update analytics packages
2. **Update Configuration**: Migrate to new config format
3. **Replace Event Calls**: Update tracking calls to new API
4. **Add Provider**: Wrap app with AnalyticsProvider
5. **Test Integration**: Verify events are tracked correctly

### Breaking Changes

Version 2.0 introduces breaking changes:

- Event structure updated for consistency
- Provider configuration format changed
- Some service methods renamed for clarity

See [Migration Guide](./migration-guide.md) for detailed upgrade instructions.

## Troubleshooting

### Common Issues

**Events not tracking:**
- Verify provider configuration
- Check console for errors
- Ensure AnalyticsProvider is properly configured

**A/B tests not working:**
- Verify test is in 'running' status
- Check traffic split configuration
- Ensure user ID is consistent

**Performance issues:**
- Enable event batching
- Reduce event frequency
- Check for memory leaks in long sessions

### Debug Tools

Use browser developer tools:

```javascript
// Check analytics state
window.__ANALYTICS_DEBUG__ = true

// View queued events
console.log(window.__ANALYTICS_QUEUE__)

// Test event tracking
window.__ANALYTICS__.track('test_event', { debug: true })
```

## API Reference

For complete API documentation, see:

- [AnalyticsService API](./api/analytics-service.md)
- [ConversionFunnelService API](./api/conversion-funnel-service.md)
- [ABTestingService API](./api/ab-testing-service.md)
- [Type Definitions](./api/types.md)

## Examples

See the [examples directory](./examples/) for:

- Basic analytics setup
- Advanced A/B testing scenarios
- Custom funnel implementations
- Performance monitoring examples
- Privacy-compliant configurations

---

The analytics system provides powerful insights while maintaining user privacy and application performance. For questions or support, see the [troubleshooting guide](./troubleshooting.md) or create an issue.