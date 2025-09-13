# Analytics Testing Guide

This guide covers testing strategies and best practices for the analytics system in the C9D AI platform, including service testing, component testing, and integration testing.

## Overview

The analytics system includes several key components that require comprehensive testing:

- **AnalyticsService**: Core service for tracking events and managing analytics providers
- **ConversionFunnelService**: Service for tracking and analyzing user conversion funnels
- **ABTestingService**: Service for managing A/B tests and variant selection
- **AnalyticsProvider**: React component for initializing analytics
- **AnalyticsDashboard**: Component for displaying analytics data

## Coverage Requirements

Analytics code follows the project's tiered coverage requirements based on criticality:

### Critical Business Logic (100% Coverage Required)
- **Analytics Services** (`lib/services/analytics-*`): Complete coverage required
  - All service methods must be tested
  - All error paths must be covered
  - All business logic branches tested
  - Examples: `AnalyticsService`, `ConversionFunnelService`, `ABTestingService`

### Data Layer (95% Coverage Required)
- **Analytics Models** (`lib/models/analytics-*`): Near-complete coverage
  - All model transformations tested
  - Type validation and conversion logic
  - Data serialization/deserialization

### External Interfaces (90% Coverage Required)
- **Analytics API Routes** (`app/api/analytics/**`): High coverage for reliability
  - All HTTP methods and status codes
  - Authentication and authorization flows
  - Input validation and error handling

### Components (85% Coverage Minimum)
- **Analytics Components**: Global minimum coverage requirement
  - Component rendering and state management
  - User interactions and event handling
  - Error boundaries and fallback states

### Integration Requirements
- **E2E Tests**: Cover critical user journeys and conversion funnels
- **Performance Tests**: Validate analytics overhead and response times
- **Cross-browser Tests**: Ensure analytics work across different environments

See [Coverage Configuration](./coverage-configuration.md) for detailed requirements and enforcement mechanisms.

## Test Isolation and Cleanup

### Key Principles

All analytics tests follow strict isolation principles to ensure reliable, repeatable test execution:

1. **Complete State Reset**: Each test starts with a clean slate
2. **Mock Cleanup**: All mocks are cleared between tests
3. **Storage Cleanup**: localStorage and sessionStorage are reset
4. **Service State Reset**: Internal service state is cleared

### Implementation Example

```typescript
describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset localStorage mock to return null (no stored data)
    mockWindow.localStorage.getItem.mockReturnValue(null)
    mockWindow.localStorage.setItem.mockClear()
    
    // Reset any static state in AnalyticsService
    ;(AnalyticsService as any).config = null
    ;(AnalyticsService as any).sessionId = null
    ;(AnalyticsService as any).userId = null
    
    // Clear any stored funnel data in real localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('conversion_funnel')
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
```

## Analytics Service Testing

### Core Service Testing

The `AnalyticsService` is tested comprehensively to ensure:

- Proper initialization with different providers
- Event tracking with multiple analytics platforms
- Performance metrics collection
- Error handling and graceful degradation
- Conversion funnel analysis

#### Test Structure

```typescript
describe('AnalyticsService', () => {
  const mockConfig: AnalyticsConfig = {
    providers: [
      {
        name: 'vercel',
        enabled: true,
        config: {}
      },
      {
        name: 'google',
        enabled: true,
        config: { measurementId: 'GA_TEST_ID' }
      }
    ],
    enableDebugMode: true,
    enableConsentMode: false,
    defaultConsentState: {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      functionality_storage: 'granted',
      personalization_storage: 'granted'
    },
    customDimensions: {},
    customMetrics: {}
  }

  // Test cases for initialization, tracking, performance, etc.
})
```

### Event Tracking Tests

Event tracking tests verify that analytics events are properly formatted and sent to the correct providers:

```typescript
it('should track event with Vercel Analytics', () => {
  const event = {
    event: 'test_event',
    category: 'conversion' as const,
    label: 'test_label',
    value: 1
  }

  AnalyticsService.trackEvent(event)

  expect(mockWindow.va).toHaveBeenCalledWith('track', 'test_event', {
    category: 'conversion',
    label: 'test_label',
    value: 1
  })
})
```

### Funnel Analysis Tests

Conversion funnel tests ensure proper tracking and analysis of user journeys:

```typescript
it('should analyze conversion funnel with sample data', () => {
  const mockFunnelData = [
    {
      step: 'pageview',
      event: 'pageview',
      category: 'awareness' as const,
      sessionId: 'session_1',
      timestamp: '2024-01-01T00:00:00.000Z'
    },
    {
      step: 'cta_click',
      event: 'cta_click',
      category: 'interest' as const,
      sessionId: 'session_1',
      timestamp: '2024-01-01T00:02:00.000Z'
    }
  ]

  mockWindow.localStorage.getItem.mockReturnValue(JSON.stringify(mockFunnelData))

  const metrics = AnalyticsService.analyzeConversionFunnel()

  expect(metrics).toHaveProperty('totalVisitors')
  expect(metrics).toHaveProperty('conversionRate')
  expect(metrics).toHaveProperty('funnelSteps')
  expect(metrics.totalVisitors).toBeGreaterThan(0)
})
```

## Mock Strategy

### Browser API Mocking

The analytics system requires comprehensive mocking of browser APIs:

```typescript
const mockWindow = {
  va: vi.fn(),                    // Vercel Analytics
  gtag: vi.fn(),                  // Google Analytics
  dataLayer: [],                  // Google Tag Manager
  addEventListener: vi.fn(),       // Event listeners
  removeEventListener: vi.fn(),
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  },
  sessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  },
  performance: {
    getEntriesByType: vi.fn(() => []),
    now: vi.fn(() => Date.now())
  },
  PerformanceObserver: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn()
  }))
}
```

### Document API Mocking

Document APIs are mocked for script injection and DOM manipulation:

```typescript
const mockDocument = {
  createElement: vi.fn(() => ({
    src: '',
    defer: false,
    async: false,
    onload: null,
    innerHTML: ''
  })),
  head: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  },
  title: 'Test Page',
  querySelectorAll: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}
```

## Error Handling Tests

Analytics tests include comprehensive error handling scenarios:

### Missing Browser APIs

```typescript
it('should handle missing window object gracefully', () => {
  const originalWindow = global.window
  delete (global as any).window

  expect(() => {
    AnalyticsService.initialize(mockConfig)
  }).not.toThrow()

  global.window = originalWindow
})
```

### Storage Errors

```typescript
it('should handle localStorage errors gracefully', () => {
  mockWindow.localStorage.getItem.mockImplementation(() => {
    throw new Error('localStorage not available')
  })

  expect(() => {
    AnalyticsService.getFunnelData()
  }).not.toThrow()
})
```

### Invalid Data

```typescript
it('should handle invalid JSON in localStorage', () => {
  mockWindow.localStorage.getItem.mockReturnValue('invalid json')

  expect(() => {
    AnalyticsService.getFunnelData()
  }).not.toThrow()

  const result = AnalyticsService.getFunnelData()
  expect(result).toEqual([])
})
```

## Performance Testing

Analytics performance tests ensure the system doesn't impact application performance:

```typescript
describe('Performance Tests', () => {
  it('should track events efficiently', async () => {
    const startTime = performance.now()
    
    // Track multiple events
    for (let i = 0; i < 1000; i++) {
      AnalyticsService.trackEvent({
        event: `test_event_${i}`,
        category: 'performance'
      })
    }
    
    const endTime = performance.now()
    const totalTime = endTime - startTime
    
    // Should complete within reasonable time
    expect(totalTime).toBeLessThan(100) // 100ms for 1000 events
  })
})
```

## Integration Testing

Integration tests verify analytics work correctly with real components:

```typescript
describe('Analytics Integration', () => {
  it('should initialize analytics when provider mounts', () => {
    render(
      <AnalyticsProvider config={mockConfig} userId="test-user">
        <div>Test content</div>
      </AnalyticsProvider>
    )

    expect(mockWindow.va).toHaveBeenCalled()
    expect(mockWindow.gtag).toHaveBeenCalled()
  })

  it('should track CTA clicks through the system', () => {
    render(
      <AnalyticsProvider config={mockConfig}>
        <EnhancedCTASection config={mockCTAConfig} />
      </AnalyticsProvider>
    )

    const ctaButton = screen.getByRole('button', { name: /get started/i })
    fireEvent.click(ctaButton)

    expect(mockWindow.va).toHaveBeenCalledWith('track', 'cta_click', 
      expect.objectContaining({
        category: 'conversion'
      })
    )
  })
})
```

## Best Practices

### 1. Test Isolation

- Always reset service state between tests
- Clear all mocks in `beforeEach`
- Remove stored data from localStorage/sessionStorage

### 2. Comprehensive Mocking

- Mock all browser APIs used by analytics
- Provide realistic mock implementations
- Test both success and error scenarios

### 3. Performance Awareness

- Test analytics performance impact
- Verify efficient event batching
- Monitor memory usage in long-running tests

### 4. Error Resilience

- Test graceful degradation when APIs are unavailable
- Verify error handling for invalid data
- Ensure analytics failures don't break the application

### 5. Real-World Scenarios

- Test with realistic event volumes
- Verify funnel analysis with complex user journeys
- Test A/B testing scenarios with multiple variants

## Running Analytics Tests

```bash
# Run all analytics tests
pnpm test --filter=@c9d/web -- analytics

# Run specific analytics service tests
pnpm test --filter=@c9d/web -- analytics-service

# Run with coverage
pnpm test:coverage --filter=@c9d/web -- analytics

# Run in watch mode during development
pnpm test:watch --filter=@c9d/web -- analytics
```

## Debugging Analytics Tests

### Common Issues

1. **State Pollution**: Tests failing due to shared state
   - Solution: Ensure proper cleanup in `beforeEach`

2. **Mock Inconsistencies**: Mocks not matching real API behavior
   - Solution: Verify mock implementations against real APIs

3. **Timing Issues**: Tests failing due to async operations
   - Solution: Use proper `await` and `waitFor` patterns

4. **Storage Conflicts**: Tests interfering with each other via localStorage
   - Solution: Clear storage in test setup and teardown

### Debug Techniques

```typescript
// Enable debug logging in tests
beforeEach(() => {
  // Enable console logging for debugging
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// Log mock calls for debugging
afterEach(() => {
  console.log('VA calls:', mockWindow.va.mock.calls)
  console.log('GTM calls:', mockWindow.gtag.mock.calls)
})
```

This comprehensive testing approach ensures the analytics system is reliable, performant, and maintainable while providing accurate tracking and analysis capabilities.