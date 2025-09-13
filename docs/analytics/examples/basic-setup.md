# Basic Analytics Setup Examples

This guide provides practical examples for setting up and using the analytics system in common scenarios.

## Quick Start Example

### 1. Basic App Setup

```typescript
// app/layout.tsx
import { AnalyticsProvider } from '@/components/analytics-provider'
import { analyticsConfig } from '@/lib/config/analytics-config'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider config={analyticsConfig}>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  )
}
```

### 2. Configuration Setup

```typescript
// lib/config/analytics-config.ts
import { AnalyticsConfig } from '@/lib/types/analytics'

export const analyticsConfig: AnalyticsConfig = {
  providers: [
    {
      name: 'vercel',
      enabled: true,
      config: {}
    },
    {
      name: 'google',
      enabled: process.env.NODE_ENV === 'production',
      config: {
        measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
      }
    }
  ],
  enabledInDevelopment: false,
  enabledInProduction: true,
  trackingId: 'c9d-analytics'
}
```

### 3. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_ANALYTICS_DEBUG=false
```

## Event Tracking Examples

### Page View Tracking

```typescript
// components/page-tracker.tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AnalyticsService } from '@/lib/services/analytics-service'

export function PageTracker() {
  const pathname = usePathname()

  useEffect(() => {
    AnalyticsService.trackPageView({
      page: pathname,
      title: document.title,
      properties: {
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer
      }
    })
  }, [pathname])

  return null
}

// Usage in layout
export default function Layout({ children }) {
  return (
    <>
      <PageTracker />
      {children}
    </>
  )
}
```

### Button Click Tracking

```typescript
// components/tracked-button.tsx
'use client'

import { Button } from '@/components/ui/button'
import { AnalyticsService } from '@/lib/services/analytics-service'

interface TrackedButtonProps {
  children: React.ReactNode
  eventName: string
  category: string
  label?: string
  onClick?: () => void
}

export function TrackedButton({
  children,
  eventName,
  category,
  label,
  onClick,
  ...props
}: TrackedButtonProps) {
  const handleClick = () => {
    // Track the event
    AnalyticsService.trackEvent({
      name: eventName,
      properties: {
        category,
        action: 'click',
        label,
        timestamp: new Date().toISOString()
      }
    })

    // Execute custom onClick
    onClick?.()
  }

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  )
}

// Usage
<TrackedButton
  eventName="cta_click"
  category="conversion"
  label="hero_signup"
  onClick={() => router.push('/signup')}
>
  Get Started
</TrackedButton>
```

### Form Submission Tracking

```typescript
// components/tracked-form.tsx
'use client'

import { useState } from 'react'
import { AnalyticsService } from '@/lib/services/analytics-service'

export function SignupForm() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    plan: 'free'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Track form submission attempt
    AnalyticsService.trackEvent({
      name: 'form_submission_started',
      properties: {
        form_type: 'signup',
        plan_selected: formData.plan,
        has_email: !!formData.email,
        has_name: !!formData.name
      }
    })

    try {
      // Submit form
      const response = await fetch('/api/signup', {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // Track successful conversion
        AnalyticsService.trackEvent({
          name: 'signup_completed',
          properties: {
            category: 'conversion',
            plan: formData.plan,
            conversion_value: formData.plan === 'premium' ? 99 : 0
          }
        })

        // Track conversion event
        AnalyticsService.trackConversion({
          eventName: 'signup_conversion',
          value: formData.plan === 'premium' ? 99 : 0,
          currency: 'USD',
          properties: {
            plan: formData.plan,
            source: 'signup_form'
          }
        })
      } else {
        // Track form error
        AnalyticsService.trackEvent({
          name: 'form_submission_failed',
          properties: {
            form_type: 'signup',
            error_type: 'server_error',
            status_code: response.status
          }
        })
      }
    } catch (error) {
      // Track network error
      AnalyticsService.trackEvent({
        name: 'form_submission_failed',
        properties: {
          form_type: 'signup',
          error_type: 'network_error',
          error_message: error.message
        }
      })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name"
        required
      />
      <select
        value={formData.plan}
        onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
      >
        <option value="free">Free Plan</option>
        <option value="premium">Premium Plan</option>
      </select>
      <button type="submit">Sign Up</button>
    </form>
  )
}
```

## User Identification

### Setting User ID

```typescript
// hooks/use-analytics-user.ts
'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { AnalyticsService } from '@/lib/services/analytics-service'

export function useAnalyticsUser() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (isLoaded && user) {
      // Set user ID for analytics
      AnalyticsService.setUserId(user.id)

      // Track user properties
      AnalyticsService.trackEvent({
        name: 'user_identified',
        properties: {
          user_id: user.id,
          email_verified: user.emailAddresses[0]?.verification?.status === 'verified',
          signup_date: user.createdAt?.toISOString(),
          last_sign_in: user.lastSignInAt?.toISOString()
        }
      })
    }
  }, [user, isLoaded])
}

// Usage in app
export default function App({ children }) {
  useAnalyticsUser()
  
  return <>{children}</>
}
```

### User Segmentation

```typescript
// lib/analytics/user-segments.ts
import { AnalyticsService } from '@/lib/services/analytics-service'
import { UserSegment } from '@/lib/types/analytics'

export const userSegments: UserSegment[] = [
  {
    id: 'new_users',
    name: 'New Users',
    description: 'Users who signed up in the last 7 days',
    criteria: {
      signup_date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    userCount: 0 // Will be calculated
  },
  {
    id: 'premium_users',
    name: 'Premium Users',
    description: 'Users with premium subscriptions',
    criteria: {
      plan: 'premium',
      subscription_status: 'active'
    },
    userCount: 0
  },
  {
    id: 'high_engagement',
    name: 'High Engagement Users',
    description: 'Users with high activity levels',
    criteria: {
      sessions_last_30d: { $gte: 10 },
      last_active: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    userCount: 0
  }
]

// Function to identify user segment
export async function identifyUserSegment(userId: string): Promise<string[]> {
  const user = await getUserData(userId)
  const segments: string[] = []

  for (const segment of userSegments) {
    if (matchesCriteria(user, segment.criteria)) {
      segments.push(segment.id)
    }
  }

  return segments
}

// Track user segment
export function trackUserSegment(userId: string, segments: string[]) {
  AnalyticsService.trackEvent({
    name: 'user_segmented',
    properties: {
      user_id: userId,
      segments: segments,
      segment_count: segments.length
    }
  })
}
```

## E-commerce Tracking

### Purchase Tracking

```typescript
// components/checkout-tracker.tsx
'use client'

import { useEffect } from 'react'
import { AnalyticsService } from '@/lib/services/analytics-service'

interface PurchaseData {
  orderId: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    category: string
  }>
  total: number
  currency: string
  coupon?: string
}

export function trackPurchase(purchaseData: PurchaseData) {
  // Track conversion event
  AnalyticsService.trackConversion({
    eventName: 'purchase_completed',
    value: purchaseData.total,
    currency: purchaseData.currency,
    properties: {
      order_id: purchaseData.orderId,
      item_count: purchaseData.items.length,
      coupon_used: !!purchaseData.coupon,
      coupon_code: purchaseData.coupon,
      items: purchaseData.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity
      }))
    }
  })

  // Track individual items
  purchaseData.items.forEach(item => {
    AnalyticsService.trackEvent({
      name: 'item_purchased',
      properties: {
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity,
        order_id: purchaseData.orderId
      }
    })
  })
}

// Usage in checkout success page
export default function CheckoutSuccess({ orderData }: { orderData: PurchaseData }) {
  useEffect(() => {
    trackPurchase(orderData)
  }, [orderData])

  return (
    <div>
      <h1>Thank you for your purchase!</h1>
      <p>Order ID: {orderData.orderId}</p>
    </div>
  )
}
```

### Cart Tracking

```typescript
// hooks/use-cart-analytics.ts
'use client'

import { useEffect } from 'react'
import { AnalyticsService } from '@/lib/services/analytics-service'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export function useCartAnalytics(cart: CartItem[]) {
  // Track cart changes
  useEffect(() => {
    if (cart.length > 0) {
      AnalyticsService.trackEvent({
        name: 'cart_updated',
        properties: {
          cart_size: cart.length,
          cart_value: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        }
      })
    }
  }, [cart])

  // Track add to cart
  const trackAddToCart = (item: CartItem) => {
    AnalyticsService.trackEvent({
      name: 'add_to_cart',
      properties: {
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        cart_size_after: cart.length + 1
      }
    })
  }

  // Track remove from cart
  const trackRemoveFromCart = (item: CartItem) => {
    AnalyticsService.trackEvent({
      name: 'remove_from_cart',
      properties: {
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        cart_size_after: cart.length - 1
      }
    })
  }

  return {
    trackAddToCart,
    trackRemoveFromCart
  }
}
```

## Performance Tracking

### Core Web Vitals

```typescript
// lib/analytics/performance.ts
import { AnalyticsService } from '@/lib/services/analytics-service'

export function trackWebVitals() {
  // Track Largest Contentful Paint (LCP)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        AnalyticsService.trackEvent({
          name: 'web_vital_lcp',
          properties: {
            value: entry.startTime,
            rating: entry.startTime < 2500 ? 'good' : entry.startTime < 4000 ? 'needs-improvement' : 'poor'
          }
        })
      }
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] })

  // Track First Input Delay (FID)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'first-input') {
        AnalyticsService.trackEvent({
          name: 'web_vital_fid',
          properties: {
            value: entry.processingStart - entry.startTime,
            rating: (entry.processingStart - entry.startTime) < 100 ? 'good' : 
                   (entry.processingStart - entry.startTime) < 300 ? 'needs-improvement' : 'poor'
          }
        })
      }
    }
  }).observe({ entryTypes: ['first-input'] })

  // Track Cumulative Layout Shift (CLS)
  let clsValue = 0
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value
      }
    }
    
    AnalyticsService.trackEvent({
      name: 'web_vital_cls',
      properties: {
        value: clsValue,
        rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor'
      }
    })
  }).observe({ entryTypes: ['layout-shift'] })
}

// Usage in app
export default function App() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      trackWebVitals()
    }
  }, [])

  return <>{/* App content */}</>
}
```

### API Performance

```typescript
// lib/analytics/api-performance.ts
import { AnalyticsService } from '@/lib/services/analytics-service'

export function trackAPICall(endpoint: string, method: string, startTime: number, success: boolean, statusCode?: number) {
  const duration = performance.now() - startTime

  AnalyticsService.trackEvent({
    name: 'api_call',
    properties: {
      endpoint,
      method,
      duration,
      success,
      status_code: statusCode,
      performance_rating: duration < 200 ? 'fast' : duration < 1000 ? 'moderate' : 'slow'
    }
  })
}

// Usage with fetch wrapper
export async function trackedFetch(url: string, options?: RequestInit) {
  const startTime = performance.now()
  
  try {
    const response = await fetch(url, options)
    
    trackAPICall(
      url,
      options?.method || 'GET',
      startTime,
      response.ok,
      response.status
    )
    
    return response
  } catch (error) {
    trackAPICall(
      url,
      options?.method || 'GET',
      startTime,
      false
    )
    
    throw error
  }
}
```

## Error Tracking

### Error Boundary with Analytics

```typescript
// components/analytics-error-boundary.tsx
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AnalyticsService } from '@/lib/services/analytics-service'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track error with analytics
    AnalyticsService.trackEvent({
      name: 'javascript_error',
      properties: {
        error_message: error.message,
        error_stack: error.stack,
        component_stack: errorInfo.componentStack,
        error_boundary: true,
        timestamp: new Date().toISOString()
      }
    })

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>We've been notified of this error and are working to fix it.</p>
        </div>
      )
    }

    return this.props.children
  }
}

// Usage
export default function App({ children }) {
  return (
    <AnalyticsErrorBoundary>
      {children}
    </AnalyticsErrorBoundary>
  )
}
```

### Global Error Tracking

```typescript
// lib/analytics/error-tracking.ts
import { AnalyticsService } from '@/lib/services/analytics-service'

export function setupGlobalErrorTracking() {
  // Track unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    AnalyticsService.trackEvent({
      name: 'javascript_error',
      properties: {
        error_message: event.message,
        error_filename: event.filename,
        error_line: event.lineno,
        error_column: event.colno,
        error_stack: event.error?.stack,
        timestamp: new Date().toISOString()
      }
    })
  })

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    AnalyticsService.trackEvent({
      name: 'unhandled_promise_rejection',
      properties: {
        error_message: event.reason?.message || String(event.reason),
        error_stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      }
    })
  })
}

// Usage in app initialization
export default function App() {
  useEffect(() => {
    setupGlobalErrorTracking()
  }, [])

  return <>{/* App content */}</>
}
```

This comprehensive set of examples covers the most common analytics implementation scenarios. Each example includes proper TypeScript typing, error handling, and follows best practices for performance and user privacy.