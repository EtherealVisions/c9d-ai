# Enhanced CTA System

A comprehensive Call-to-Action system with conversion optimization, A/B testing, and advanced analytics tracking.

## Features

- **Multiple CTA Variants**: Support for A/B testing with statistical significance tracking
- **Context-Specific CTAs**: Different CTA configurations for different page sections
- **Floating CTAs**: Smart floating CTAs based on scroll behavior and user engagement
- **Urgency & Scarcity**: Countdown timers, limited-time offers, and scarcity indicators
- **Analytics Integration**: Comprehensive tracking with Vercel Analytics and Google Analytics 4
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels and keyboard navigation
- **Performance Optimized**: Hardware-accelerated animations and efficient rendering

## Components

### EnhancedCTASection

The main CTA section component with support for A/B testing, urgency indicators, and context-specific styling.

```tsx
import { EnhancedCTASection } from '@/components/enhanced-cta-section'

const ctaConfig = {
  id: 'hero-cta',
  title: 'Get Started Today',
  subtitle: 'Transform your workflow',
  description: 'Join thousands of satisfied users',
  context: 'hero',
  variants: [
    {
      id: 'primary',
      text: 'Start Free Trial',
      href: '/signup',
      variant: 'primary',
      tracking: {
        event: 'trial_start',
        category: 'conversion',
        label: 'hero_cta',
        value: 100
      },
      weight: 60
    }
  ]
}

<EnhancedCTASection config={ctaConfig} userId="user-123" />
```

### FloatingCTA

A floating CTA that appears based on scroll behavior and user engagement.

```tsx
import { FloatingCTA } from '@/components/floating-cta'

const floatingConfig = {
  enabled: true,
  showAfterScroll: 500,
  hideOnSections: ['hero', 'final-cta'],
  position: 'bottom-right',
  dismissible: true,
  cta: {
    id: 'floating-signup',
    text: 'Get Started',
    href: '/signup',
    variant: 'primary',
    tracking: {
      event: 'floating_cta_click',
      category: 'conversion'
    }
  }
}

<FloatingCTA config={floatingConfig} userId="user-123" />
```

### UrgencyIndicator & ScarcityIndicator

Components for creating urgency and scarcity to drive conversions.

```tsx
import { UrgencyIndicator, ScarcityIndicator } from '@/components/ui/urgency-indicator'

// Countdown timer
const urgencyConfig = {
  enabled: true,
  type: 'countdown',
  message: 'Limited time offer!',
  endDate: new Date('2024-12-31'),
  countdownText: 'Offer expires in:'
}

// Limited spots indicator
const scarcityConfig = {
  enabled: true,
  type: 'limited-spots',
  message: 'Only 25 spots remaining!',
  remaining: 25,
  total: 100
}

<UrgencyIndicator config={urgencyConfig} />
<ScarcityIndicator config={scarcityConfig} />
```

### CTAManager

Manages floating CTAs and engagement tracking across the entire page.

```tsx
import { CTAManager } from '@/components/cta-manager'

<CTAManager 
  userId="user-123"
  enableFloatingCTA={true}
  enableEngagementTracking={true}
/>
```

### Section-Specific CTAs

Pre-configured CTA components for different page sections.

```tsx
import { FeaturesCTA, SocialProofCTA, TechnicalCTA } from '@/components/section-cta'

<FeaturesCTA userId="user-123" />
<SocialProofCTA userId="user-123" />
<TechnicalCTA userId="user-123" />
```

## A/B Testing

The system supports A/B testing with automatic variant selection based on user ID for consistent experiences.

```tsx
const abTestConfig = {
  enabled: true,
  testId: 'hero-cta-test',
  variants: [
    { id: 'variant-a', text: 'Start Free Trial', weight: 50 },
    { id: 'variant-b', text: 'Get Started Now', weight: 50 }
  ],
  trafficSplit: [50, 50],
  conversionGoal: 'trial_signup'
}

<EnhancedCTASection config={ctaConfig} abTestConfig={abTestConfig} />
```

## Analytics Tracking

All CTA interactions are automatically tracked with detailed analytics:

- **Impressions**: When CTAs become visible
- **Clicks**: When users interact with CTAs
- **Conversions**: When users complete desired actions
- **Engagement**: Scroll depth, time on page, user behavior
- **A/B Test Performance**: Variant performance and statistical significance

### Events Tracked

- `cta_impression`: When a CTA becomes visible
- `cta_click`: When a CTA is clicked
- `floating_cta_click`: Floating CTA interactions
- `urgency_view`: Urgency/scarcity indicator views
- `ab_test_assignment`: A/B test variant assignments
- `user_engaged`: When user becomes highly engaged
- `scroll_depth_X`: Scroll milestone tracking

## Conversion Funnel

The system tracks users through the conversion funnel:

1. **Awareness**: Hero CTA impressions
2. **Interest**: Feature section engagement
3. **Consideration**: Social proof interactions
4. **Evaluation**: Technical documentation access
5. **Intent**: Final CTA clicks
6. **Purchase**: Conversion completion

## Performance Optimization

- **Hardware Acceleration**: CSS transforms for smooth animations
- **Lazy Loading**: Components load only when needed
- **Efficient Rendering**: React.memo and proper dependency arrays
- **Bundle Optimization**: Tree shaking and code splitting
- **Core Web Vitals**: Optimized for LCP, FID, and CLS

## Accessibility

- **WCAG 2.1 AA Compliant**: Proper contrast ratios and semantic markup
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Reduced Motion**: Respects user motion preferences
- **Focus Management**: Visible focus indicators

## Usage Examples

### Basic Implementation

```tsx
import FinalCtaSection from '@/components/final-cta-section'
import { CTAManager } from '@/components/cta-manager'

export default function LandingPage() {
  return (
    <div>
      {/* Your page content */}
      
      <FinalCtaSection 
        userId="user-123"
        enableUrgency={true}
        enableScarcity={true}
      />
      
      <CTAManager 
        userId="user-123"
        enableFloatingCTA={true}
      />
    </div>
  )
}
```

### Advanced Configuration

```tsx
import { EnhancedCTASection } from '@/components/enhanced-cta-section'
import { FloatingCTA } from '@/components/floating-cta'

const advancedCTAConfig = {
  id: 'advanced-cta',
  title: 'Ready to Transform Your Business?',
  context: 'final',
  variants: [
    {
      id: 'consultation',
      text: 'Book Consultation',
      href: '/consultation',
      variant: 'primary',
      tracking: { event: 'consultation_book', category: 'conversion' },
      weight: 40
    },
    {
      id: 'demo',
      text: 'Watch Demo',
      href: '/demo',
      variant: 'secondary',
      tracking: { event: 'demo_watch', category: 'engagement' },
      weight: 35
    },
    {
      id: 'trial',
      text: 'Start Trial',
      href: '/trial',
      variant: 'primary',
      tracking: { event: 'trial_start', category: 'conversion' },
      weight: 25
    }
  ],
  urgency: {
    enabled: true,
    type: 'countdown',
    message: '🔥 Limited Time: 50% Off Annual Plans',
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  scarcity: {
    enabled: true,
    type: 'beta-slots',
    message: '⚡ Only 15 beta slots remaining',
    remaining: 15,
    total: 100
  }
}

<EnhancedCTASection 
  config={advancedCTAConfig}
  userId="user-123"
/>
```

## Testing

The system includes comprehensive tests:

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interactions
- **A/B Testing**: Variant selection and tracking
- **Analytics**: Event tracking verification
- **Accessibility**: WCAG compliance testing

Run tests with:

```bash
pnpm test:run components/__tests__/enhanced-cta-section.test.tsx
pnpm test:run components/__tests__/floating-cta.test.tsx
pnpm test:run components/__tests__/urgency-indicator.test.tsx
pnpm test:run components/__tests__/cta-integration.test.tsx
```

## Best Practices

1. **Context-Appropriate CTAs**: Use different CTA styles for different page sections
2. **Progressive Disclosure**: Start with low-commitment CTAs and escalate
3. **A/B Testing**: Always test different variants to optimize conversion rates
4. **Analytics Tracking**: Monitor performance and iterate based on data
5. **Accessibility**: Ensure all users can interact with CTAs effectively
6. **Performance**: Keep animations smooth and loading times fast
7. **User Experience**: Don't overwhelm users with too many CTAs

## Configuration Reference

### CTASectionConfig

```typescript
interface CTASectionConfig {
  id: string
  title: string
  subtitle?: string
  description?: string
  context: 'hero' | 'features' | 'social-proof' | 'technical' | 'final'
  variants: CTAVariant[]
  urgency?: UrgencyConfig
  scarcity?: ScarcityConfig
}
```

### CTAVariant

```typescript
interface CTAVariant {
  id: string
  text: string
  href: string
  variant: 'primary' | 'secondary' | 'outline' | 'ghost'
  icon?: React.ComponentType
  tracking: TrackingConfig
  weight: number
}
```

### TrackingConfig

```typescript
interface TrackingConfig {
  event: string
  category: 'engagement' | 'conversion' | 'micro_conversion'
  label?: string
  value?: number
}
```

This enhanced CTA system provides a comprehensive solution for optimizing conversions while maintaining excellent user experience and accessibility standards.