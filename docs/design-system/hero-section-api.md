# Hero Section API Reference

The Hero Section is a comprehensive, performance-optimized component system for creating engaging landing page headers with A/B testing, analytics tracking, and mobile optimization.

## Overview

The hero section system consists of several interconnected components and types that work together to provide:

- **A/B Testing**: Built-in variant testing with statistical tracking
- **Analytics Integration**: Comprehensive event tracking with Vercel Analytics and GA4
- **Performance Optimization**: Mobile-first responsive design with hardware acceleration
- **Accessibility**: WCAG 2.1 AA compliant with full keyboard navigation
- **Type Safety**: Complete TypeScript support with strict typing

## Core Types

### EnhancedHeroSectionProps

Main configuration interface for the hero section component.

```typescript
interface EnhancedHeroSectionProps {
  title?: string
  subtitle?: string
  primaryCTA?: CTAConfig
  secondaryCTA?: CTAConfig
  backgroundAnimation?: AnimationConfig
  metrics?: HeroMetric[]
  abTestVariants?: ABTestVariant[]
  enableABTesting?: boolean
  className?: string
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | `undefined` | Custom hero title (overrides A/B test variants) |
| `subtitle` | `string` | `undefined` | Custom hero subtitle |
| `primaryCTA` | `CTAConfig` | Default consultation CTA | Primary call-to-action configuration |
| `secondaryCTA` | `CTAConfig` | Default demo CTA | Secondary call-to-action configuration |
| `backgroundAnimation` | `AnimationConfig` | Default animation config | Background animation settings |
| `metrics` | `HeroMetric[]` | Default metrics | Performance metrics to display |
| `abTestVariants` | `ABTestVariant[]` | Built-in variants | Custom A/B test variants |
| `enableABTesting` | `boolean` | `true` | Enable A/B testing functionality |
| `className` | `string` | `undefined` | Additional CSS classes |

### CTAConfig

Configuration for call-to-action buttons.

```typescript
interface CTAConfig {
  text: string
  href: string
  variant: 'primary' | 'secondary' | 'outline' | 'ghost'
  icon?: React.ComponentType<{ className?: string }>
  tracking: TrackingConfig
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `text` | `string` | ✅ | Button text content |
| `href` | `string` | ✅ | Target URL or route |
| `variant` | `ButtonVariant` | ✅ | Visual button variant |
| `icon` | `React.ComponentType` | ❌ | Optional icon component |
| `tracking` | `TrackingConfig` | ✅ | Analytics tracking configuration |

### TrackingConfig

Analytics tracking configuration for events.

```typescript
interface TrackingConfig {
  event: string
  category: 'engagement' | 'conversion' | 'micro_conversion'
  label?: string
  value?: number
  properties?: Record<string, unknown>
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `event` | `string` | ✅ | Event name for analytics |
| `category` | `EventCategory` | ✅ | Event category classification |
| `label` | `string` | ❌ | Additional event context |
| `value` | `number` | ❌ | Numeric value for the event |
| `properties` | `Record<string, unknown>` | ❌ | Custom event properties |

### HeroMetric

Configuration for displaying performance metrics.

```typescript
interface HeroMetric {
  id: string
  value: number
  label: string
  description?: string
  animateCounter?: boolean
  suffix?: string
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | - | Unique metric identifier |
| `value` | `number` | - | Numeric value to display |
| `label` | `string` | - | Display label for the metric |
| `description` | `string` | `undefined` | Optional description text |
| `animateCounter` | `boolean` | `false` | Enable counter animation |
| `suffix` | `string` | `undefined` | Value suffix (e.g., "+", "%") |

### AnimationConfig

Background animation configuration.

```typescript
interface AnimationConfig {
  enableFloatingBlobs: boolean
  blobCount: number
  animationSpeed: 'slow' | 'medium' | 'fast'
  colorScheme: 'primary' | 'secondary' | 'accent' | 'mixed'
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enableFloatingBlobs` | `boolean` | `true` | Enable floating blob animations |
| `blobCount` | `number` | `3` | Number of floating elements |
| `animationSpeed` | `AnimationSpeed` | `'medium'` | Animation speed setting |
| `colorScheme` | `ColorScheme` | `'mixed'` | Color scheme for animations |

### ABTestVariant

A/B test variant configuration.

```typescript
interface ABTestVariant {
  id: string
  title: string
  subtitle?: string
  primaryCTA: CTAConfig
  secondaryCTA?: CTAConfig
  weight: number
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✅ | Unique variant identifier |
| `title` | `string` | ✅ | Hero title text |
| `subtitle` | `string` | ❌ | Optional subtitle text |
| `primaryCTA` | `CTAConfig` | ✅ | Primary CTA configuration |
| `secondaryCTA` | `CTAConfig` | ❌ | Optional secondary CTA |
| `weight` | `number` | ✅ | Traffic allocation (0-100) |

## Component API

### HeroSection

Main hero section component with full feature support.

```typescript
import HeroSection from '@/components/hero-section'

<HeroSection {...props} />
```

**Features:**
- Server-side rendering with client hydration
- A/B testing with consistent user experiences
- Performance tracking and Core Web Vitals optimization
- Mobile-first responsive design
- Accessibility compliance (WCAG 2.1 AA)
- Hardware-accelerated animations

### HeroMetrics

Standalone metrics display component.

```typescript
import { HeroMetrics } from '@/components/hero-metrics'

<HeroMetrics 
  metrics={metrics}
  className="mt-16"
/>
```

**Props:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `metrics` | `HeroMetric[]` | - | Array of metrics to display |
| `className` | `string` | `undefined` | Additional CSS classes |

### EnhancedCTAButton

Advanced CTA button with tracking and effects.

```typescript
import { EnhancedCTAButton } from '@/components/ui/enhanced-cta-button'

<EnhancedCTAButton
  config={ctaConfig}
  size="xl"
/>
```

**Props:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `config` | `CTAConfig` | - | Complete CTA configuration |
| `size` | `ComponentSize` | `'md'` | Button size variant |
| `className` | `string` | `undefined` | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disable button interaction |
| `loading` | `boolean` | `false` | Show loading state |

## Usage Examples

### Basic Implementation

```typescript
import HeroSection from '@/components/hero-section'

export default function LandingPage() {
  return (
    <main>
      <HeroSection />
      {/* Rest of page content */}
    </main>
  )
}
```

### Custom Configuration

```typescript
import HeroSection from '@/components/hero-section'
import type { CTAConfig, HeroMetric } from '@/lib/types/hero'
import { CalendarCheckIcon, PlayIcon } from 'lucide-react'

const primaryCTA: CTAConfig = {
  text: "Start Free Trial",
  href: "/signup",
  variant: "primary",
  icon: CalendarCheckIcon,
  tracking: {
    event: "hero_trial_start",
    category: "conversion",
    label: "landing_page",
    value: 100
  }
}

const secondaryCTA: CTAConfig = {
  text: "Watch Demo",
  href: "/demo",
  variant: "outline",
  icon: PlayIcon,
  tracking: {
    event: "hero_demo_click",
    category: "engagement",
    label: "landing_page"
  }
}

const customMetrics: HeroMetric[] = [
  {
    id: 'customers',
    value: 5000,
    suffix: '+',
    label: 'Happy Customers',
    description: 'Growing every day',
    animateCounter: true
  },
  {
    id: 'uptime',
    value: 99.9,
    suffix: '%',
    label: 'Uptime SLA',
    description: 'Reliable service',
    animateCounter: true
  }
]

export default function CustomHero() {
  return (
    <HeroSection
      title="Transform Your Business"
      subtitle="AI-powered insights for modern enterprises"
      primaryCTA={primaryCTA}
      secondaryCTA={secondaryCTA}
      metrics={customMetrics}
      enableABTesting={true}
    />
  )
}
```

### A/B Testing Setup

```typescript
import HeroSection from '@/components/hero-section'
import type { ABTestVariant } from '@/lib/types/hero'

const testVariants: ABTestVariant[] = [
  {
    id: 'control',
    title: "Unlock Deeper Insights",
    subtitle: "AI-powered analysis for complex data relationships",
    primaryCTA: {
      text: "Request Consultation",
      href: "/consultation",
      variant: "primary",
      tracking: {
        event: "hero_consultation_click",
        category: "conversion",
        label: "control_variant"
      }
    },
    weight: 50
  },
  {
    id: 'treatment',
    title: "Transform Your Data Intelligence",
    subtitle: "Discover hidden patterns with advanced AI orchestration",
    primaryCTA: {
      text: "Start Free Trial",
      href: "/trial",
      variant: "primary",
      tracking: {
        event: "hero_trial_click",
        category: "conversion",
        label: "treatment_variant"
      }
    },
    weight: 50
  }
]

export default function ABTestHero() {
  return (
    <HeroSection
      abTestVariants={testVariants}
      enableABTesting={true}
    />
  )
}
```

### Mobile Optimization

```typescript
import HeroSection from '@/components/hero-section'
import { useMobileOptimized } from '@/hooks/use-mobile-optimized'

export default function MobileOptimizedHero() {
  const { isMobile, performanceMode } = useMobileOptimized()
  
  return (
    <HeroSection
      backgroundAnimation={{
        enableFloatingBlobs: !isMobile || performanceMode === 'high',
        blobCount: isMobile ? 2 : 3,
        animationSpeed: isMobile ? 'slow' : 'medium',
        colorScheme: 'mixed'
      }}
      metrics={isMobile ? [] : DEFAULT_HERO_METRICS}
    />
  )
}
```

## Analytics Integration

### Event Tracking

The hero section automatically tracks these events:

| Event | Category | Description |
|-------|----------|-------------|
| `hero_impression` | `engagement` | Hero section becomes visible |
| `cta_click` | `conversion` | CTA button clicked |
| `ab_test_assignment` | `engagement` | A/B test variant assigned |
| `metric_animation_complete` | `engagement` | Metric counter animation finished |

### Custom Event Tracking

```typescript
import { trackEvent } from '@/lib/utils/analytics'

// Track custom hero interaction
trackEvent({
  event: 'hero_scroll_depth',
  category: 'engagement',
  label: 'hero_section',
  value: 75 // percentage scrolled
})
```

### Performance Monitoring

```typescript
import { trackPerformance } from '@/lib/utils/analytics'

// Track Core Web Vitals
trackPerformance() // Automatically tracks LCP, FID, CLS
```

## Accessibility Features

### Keyboard Navigation

- **Tab Order**: Logical tab sequence through CTAs
- **Focus Management**: Visible focus indicators
- **Skip Links**: Screen reader navigation support

### Screen Reader Support

- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Descriptive labels for interactive elements
- **Alt Text**: Meaningful descriptions for visual content

### Motion Preferences

```typescript
// Respects user motion preferences
const { reducedMotion } = useMobileOptimized()

<HeroSection
  backgroundAnimation={{
    enableFloatingBlobs: !reducedMotion,
    animationSpeed: reducedMotion ? 'slow' : 'medium'
  }}
/>
```

## Performance Optimization

### Core Web Vitals

- **LCP**: Optimized image loading and text rendering
- **FID**: Hardware-accelerated animations
- **CLS**: Stable layout with proper sizing

### Mobile Performance

- **Reduced Animations**: Fewer animations on mobile devices
- **Optimized Images**: Responsive image loading
- **Touch Optimization**: Touch-friendly button sizing

### Bundle Optimization

- **Tree Shaking**: Selective imports for smaller bundles
- **Code Splitting**: Lazy loading for non-critical components
- **Compression**: Optimized asset delivery

## Testing

### Unit Testing

```typescript
import { render, screen } from '@testing-library/react'
import HeroSection from '@/components/hero-section'

describe('HeroSection', () => {
  it('renders with default content', () => {
    render(<HeroSection />)
    
    expect(screen.getByText(/unlock/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /consultation/i })).toBeInTheDocument()
  })
  
  it('tracks analytics events', () => {
    const trackEvent = vi.fn()
    render(<HeroSection />)
    
    fireEvent.click(screen.getByRole('link', { name: /consultation/i }))
    expect(trackEvent).toHaveBeenCalledWith({
      event: 'hero_primary_cta_click',
      category: 'conversion'
    })
  })
})
```

### A/B Testing

```typescript
import { getABTestVariant } from '@/lib/utils/analytics'

describe('Hero A/B Testing', () => {
  it('selects consistent variants for users', () => {
    const userId = 'test-user-123'
    const variant1 = getABTestVariant(testVariants, userId)
    const variant2 = getABTestVariant(testVariants, userId)
    
    expect(variant1.id).toBe(variant2.id)
  })
})
```

### Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('HeroSection has no accessibility violations', async () => {
  const { container } = render(<HeroSection />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Migration Guide

### From Basic Hero

```typescript
// Before: Basic hero component
const OldHero = () => (
  <section className="hero">
    <h1>Welcome</h1>
    <button>Get Started</button>
  </section>
)

// After: Enhanced hero section
const NewHero = () => (
  <HeroSection
    title="Welcome"
    primaryCTA={{
      text: "Get Started",
      href: "/signup",
      variant: "primary",
      tracking: {
        event: "hero_cta_click",
        category: "conversion"
      }
    }}
  />
)
```

### Adding A/B Testing

```typescript
// Step 1: Define variants
const variants: ABTestVariant[] = [
  // ... variant definitions
]

// Step 2: Enable testing
<HeroSection
  abTestVariants={variants}
  enableABTesting={true}
/>

// Step 3: Monitor results in analytics dashboard
```

## Best Practices

1. **Keep Titles Concise**: Aim for 3-7 words for maximum impact
2. **Clear Value Proposition**: Communicate benefits within 5 seconds
3. **Strong CTAs**: Use action-oriented language
4. **Test Variants**: A/B test different messaging approaches
5. **Monitor Performance**: Track Core Web Vitals and conversion rates
6. **Mobile First**: Design for mobile, enhance for desktop
7. **Accessibility**: Ensure keyboard navigation and screen reader support

## Troubleshooting

### Common Issues

**A/B Testing Not Working**
- Verify `enableABTesting` is `true`
- Check variant weights sum to 100
- Ensure analytics tracking is configured

**Performance Issues**
- Reduce `blobCount` on mobile devices
- Disable animations for `prefers-reduced-motion`
- Optimize image sizes and formats

**Analytics Not Tracking**
- Verify Vercel Analytics is configured
- Check tracking configuration objects
- Ensure event names follow naming conventions

### Debug Mode

```typescript
// Enable debug logging
<HeroSection
  enableABTesting={true}
  // Add debug prop in development
  {...(process.env.NODE_ENV === 'development' && { debug: true })}
/>
```

## Resources

- [Component Library](./component-library.md) - Complete component documentation
- [Design Tokens](./design-tokens.md) - Design system tokens
- [Accessibility Guidelines](./accessibility.md) - WCAG compliance details
- [Testing Guide](../testing/component-testing.md) - Testing best practices