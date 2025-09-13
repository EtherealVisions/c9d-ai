# Analytics Quick Reference

Essential commands, patterns, and examples for the C9D AI analytics system.

## Quick Setup

### 1. Basic Configuration

```typescript
// lib/config/analytics-config.ts
export const analyticsConfig = {
  providers: [
    { name: 'vercel', enabled: true, config: {} },
    { name: 'google', enabled: true, config: { measurementId: 'G-XXX' } }
  ],
  enabledInDevelopment: false,
  enabledInProduction: true
}
```

### 2. Provider Setup

```typescript
// app/layout.tsx
import { AnalyticsProvider } from '@/components/analytics-provider'

export default function Layout({ children }) {
  return (
    <AnalyticsProvider config={analyticsConfig}>
      {children}
    </AnalyticsProvider>
  )
}
```

## Common Patterns

### Event Tracking

```typescript
import { AnalyticsService } from '@/lib/services/analytics-service'

// Basic event
AnalyticsService.trackEvent({
  name: 'button_click',
  properties: { button_id: 'hero_cta', page: 'landing' }
})

// Conversion event
AnalyticsService.trackConversion({
  eventName: 'signup_completed',
  value: 99.99,
  currency: 'USD',
  properties: { plan: 'premium' }
})

// Page view
AnalyticsService.trackPageView({
  page: '/dashboard',
  title: 'Dashboard',
  properties: { user_type: 'premium' }
})
```

### User Identification

```typescript
// Set user ID
AnalyticsService.setUserId('user-123')

// Track user properties
AnalyticsService.trackEvent({
  name: 'user_identified',
  properties: {
    plan: 'premium',
    signup_date: '2024-01-01',
    feature_flags: ['new_ui', 'beta_features']
  }
})
```

### A/B Testing

```typescript
import { ABTestingService } from '@/lib/services/ab-testing-service'

// Get variant for user
const variant = await ABTestingService.getVariant('hero_test', 'user-123')

// Track conversion
ABTestingService.trackConversion('hero_test', variant.id, {
  event: 'signup_completed',
  value: 1
})
```

### Conversion Funnels

```typescript
import { ConversionFunnelService } from '@/lib/services/conversion-funnel-service'

// Track funnel step
ConversionFunnelService.trackStep('signup_funnel', 'email_entered', 'user-123')

// Get funnel metrics
const metrics = await ConversionFunnelService.getFunnelMetrics({
  funnelId: 'signup_funnel',
  dateRange: { start: startDate, end: endDate }
})
```

## React Hooks

### Analytics Hook

```typescript
// hooks/use-analytics.ts
import { useEffect } from 'react'
import { AnalyticsService } from '@/lib/services/analytics-service'

export function useAnalytics(userId?: string) {
  useEffect(() => {
    if (userId) {
      AnalyticsService.setUserId(userId)
    }
  }, [userId])

  const track = (event: string, properties?: Record<string, any>) => {
    AnalyticsService.trackEvent({ name: event, properties })
  }

  const trackConversion = (event: string, value?: number) => {
    AnalyticsService.trackConversion({ eventName: event, value })
  }

  return { track, trackConversion }
}
```

### Page Tracking Hook

```typescript
// hooks/use-page-tracking.ts
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AnalyticsService } from '@/lib/services/analytics-service'

export function usePageTracking() {
  const pathname = usePathname()

  useEffect(() => {
    AnalyticsService.trackPageView({
      page: pathname,
      title: document.title
    })
  }, [pathname])
}
```

## Component Examples

### Tracked Button

```typescript
interface TrackedButtonProps {
  eventName: string
  category: string
  children: React.ReactNode
  onClick?: () => void
}

export function TrackedButton({ eventName, category, children, onClick }: TrackedButtonProps) {
  const handleClick = () => {
    AnalyticsService.trackEvent({
      name: eventName,
      properties: { category, action: 'click' }
    })
    onClick?.()
  }

  return <button onClick={handleClick}>{children}</button>
}
```

### Form Tracking

```typescript
export function TrackedForm({ onSubmit, children }) {
  const handleSubmit = async (data) => {
    AnalyticsService.trackEvent({
      name: 'form_submission_started',
      properties: { form_type: 'contact' }
    })

    try {
      await onSubmit(data)
      AnalyticsService.trackConversion({
        eventName: 'form_submitted',
        value: 1
      })
    } catch (error) {
      AnalyticsService.trackEvent({
        name: 'form_submission_failed',
        properties: { error: error.message }
      })
    }
  }

  return <form onSubmit={handleSubmit}>{children}</form>
}
```

## Type Definitions

### Core Types

```typescript
interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  timestamp?: Date
  userId?: string
  sessionId?: string
}

interface ConversionEvent {
  eventName: string
  value?: number
  currency?: string
  properties?: Record<string, any>
}

interface FunnelStep {
  id: string
  name: string
  order: number
  required: boolean
}

interface ABTestVariant {
  id: string
  name: string
  weight: number
  config: Record<string, any>
}
```

### Event Categories

```typescript
type EventCategory = 
  | 'awareness'      // Page views, content consumption
  | 'interest'       // Feature exploration, engagement
  | 'consideration'  // Pricing views, comparisons
  | 'evaluation'     // Trial signups, demos
  | 'intent'         // Purchase attempts, upgrades
  | 'purchase'       // Completed conversions
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_ANALYTICS_DEBUG=false
NEXT_PUBLIC_AB_TESTING_ENABLED=true
```

## Common Commands

```bash
# Run analytics tests
pnpm test analytics

# Run with coverage
pnpm test:coverage analytics

# Debug analytics in browser
window.__ANALYTICS_DEBUG__ = true
```

## Debugging

### Browser Console

```javascript
// Check analytics state
console.log(window.__ANALYTICS__)

// View queued events
console.log(window.__ANALYTICS_QUEUE__)

// Test event tracking
window.__ANALYTICS__.track('test_event', { debug: true })
```

### Debug Mode

```typescript
const config = {
  // ... other config
  enableDebugMode: true // Enables console logging
}
```

## Performance Tips

1. **Batch Events**: Use event batching for high-frequency tracking
2. **Async Tracking**: Always track events asynchronously
3. **Error Boundaries**: Wrap analytics in error boundaries
4. **Lazy Loading**: Load analytics providers lazily

## Privacy Compliance

```typescript
// Check consent
const hasConsent = AnalyticsService.hasConsent('analytics')

// Request consent
AnalyticsService.requestConsent(['analytics', 'marketing'])

// Update consent
AnalyticsService.updateConsent({
  analytics: true,
  marketing: false
})
```

## Error Handling

```typescript
try {
  AnalyticsService.trackEvent(event)
} catch (error) {
  console.error('Analytics error:', error)
  // Analytics errors should not break the app
}
```

## Best Practices

1. **Consistent Naming**: Use snake_case for event names and properties
2. **Structured Properties**: Keep event properties flat and typed
3. **User Privacy**: Anonymize PII automatically
4. **Performance**: Don't block UI with analytics calls
5. **Testing**: Mock analytics in tests
6. **Documentation**: Document custom events and properties

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not tracking | Check provider configuration and console errors |
| A/B tests not working | Verify test status and traffic split |
| Performance issues | Enable event batching and check for memory leaks |
| Privacy compliance | Implement proper consent management |

## Resources

- [Full Documentation](./README.md)
- [API Reference](./api/types.md)
- [Examples](./examples/basic-setup.md)
- [Testing Guide](../testing/analytics-testing-guide.md)