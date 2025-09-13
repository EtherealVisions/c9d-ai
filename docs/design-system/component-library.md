# Component Library

The C9d.ai component library provides a comprehensive set of reusable, accessible, and brand-compliant UI components built on top of our design token system.

## Overview

Our component library follows these principles:

- **Token-Based**: All visual properties use design tokens
- **Accessible**: WCAG 2.1 AA compliant with proper ARIA support
- **Type-Safe**: Full TypeScript support with strict typing
- **Performance**: Optimized for Core Web Vitals
- **Consistent**: Unified API patterns across all components

## Component Categories

### Foundation Components

#### BrandButton

A versatile button component with multiple variants and states.

```typescript
import { BrandButton } from '@/components/design-system/brand-button'

// Basic usage
<BrandButton variant="primary" size="lg">
  Get Started
</BrandButton>

// With effects
<BrandButton 
  variant="primary" 
  size="lg" 
  glow 
  animation="pulse"
  loading={isLoading}
>
  Submit
</BrandButton>

// Custom styling
<BrandButton 
  variant="secondary"
  size="md"
  className="custom-class"
  onClick={handleClick}
>
  Learn More
</BrandButton>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'accent' | 'neutral'
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
- `glow`: boolean - Adds brand glow effect
- `animation`: 'none' | 'pulse' | 'glow' | 'float'
- `loading`: boolean - Shows loading state
- `disabled`: boolean - Disables interaction

#### BrandTypography

Typography components with semantic hierarchy.

```typescript
import { 
  BrandHeading, 
  BrandText, 
  BrandCaption 
} from '@/components/design-system/brand-typography'

// Headings with gradient support
<BrandHeading level={1} gradient="purplePink">
  Main Title
</BrandHeading>

<BrandHeading level={2} color="white">
  Section Title
</BrandHeading>

// Body text
<BrandText size="lg" color="gray-light">
  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
</BrandText>

// Captions and small text
<BrandCaption size="sm" color="gray-medium">
  Additional information
</BrandCaption>
```

**BrandHeading Props:**
- `level`: 1 | 2 | 3 | 4 | 5 | 6
- `size`: ComponentSize (overrides default level sizing)
- `color`: 'white' | 'gray' | 'accent'
- `gradient`: keyof BrandGradients
- `weight`: 'medium' | 'semibold' | 'bold' | 'extrabold'

**BrandText Props:**
- `size`: 'sm' | 'base' | 'lg'
- `color`: 'white' | 'gray-light' | 'gray-medium'
- `weight`: 'normal' | 'medium' | 'semibold'
- `as`: 'p' | 'span' | 'div' (default: 'p')

#### BrandCard

Flexible card component for content containers.

```typescript
import { BrandCard } from '@/components/design-system/brand-card'

// Basic card
<BrandCard>
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</BrandCard>

// Interactive card with effects
<BrandCard 
  variant="interactive"
  glow
  animation="hover"
  onClick={handleCardClick}
>
  <h3>Interactive Card</h3>
  <p>Click me!</p>
</BrandCard>

// Feature card with gradient
<BrandCard variant="feature" gradient>
  <h3>Feature Highlight</h3>
  <p>Special content with gradient background.</p>
</BrandCard>
```

**Props:**
- `variant`: 'default' | 'elevated' | 'interactive' | 'feature'
- `size`: ComponentSize
- `gradient`: boolean - Applies gradient background
- `glow`: boolean - Adds glow effect
- `animation`: 'none' | 'hover' | 'float' | 'scale'

### Layout Components

#### Container

Responsive container with consistent max-widths.

```typescript
import { Container } from '@/components/design-system/container'

<Container size="lg">
  <h1>Page Content</h1>
  <p>Contained within responsive boundaries.</p>
</Container>

<Container size="full" className="bg-hero-gradient">
  <h1>Full-width hero section</h1>
</Container>
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full'
- `padding`: boolean - Adds horizontal padding (default: true)

#### Stack

Vertical spacing utility component.

```typescript
import { Stack } from '@/components/design-system/stack'

<Stack space="lg">
  <h2>Section Title</h2>
  <p>First paragraph</p>
  <p>Second paragraph</p>
  <button>Action Button</button>
</Stack>

<Stack space="sm" align="center">
  <Icon />
  <span>Centered content</span>
</Stack>
```

**Props:**
- `space`: ComponentSize - Vertical spacing between children
- `align`: 'start' | 'center' | 'end' | 'stretch'
- `as`: HTML element type (default: 'div')

#### Cluster

Horizontal spacing utility component.

```typescript
import { Cluster } from '@/components/design-system/cluster'

<Cluster space="md" justify="center">
  <button>Button 1</button>
  <button>Button 2</button>
  <button>Button 3</button>
</Cluster>

<Cluster space="sm" wrap>
  <Tag>React</Tag>
  <Tag>TypeScript</Tag>
  <Tag>Next.js</Tag>
</Cluster>
```

**Props:**
- `space`: ComponentSize - Horizontal spacing between children
- `justify`: 'start' | 'center' | 'end' | 'between' | 'around'
- `align`: 'start' | 'center' | 'end' | 'stretch'
- `wrap`: boolean - Allow wrapping to new lines

### Hero Components

#### HeroSection

The main hero section component with A/B testing, analytics tracking, and performance optimization.

```typescript
import HeroSection from '@/components/hero-section'
import type { EnhancedHeroSectionProps, CTAConfig, HeroMetric } from '@/lib/types/hero'

// Basic usage with defaults
<HeroSection />

// Custom configuration
const customCTA: CTAConfig = {
  text: "Start Free Trial",
  href: "/signup",
  variant: "primary",
  tracking: {
    event: "hero_trial_click",
    category: "conversion",
    label: "free_trial"
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
  }
]

<HeroSection
  title="Transform Your Workflow"
  subtitle="AI-powered insights for modern teams"
  primaryCTA={customCTA}
  metrics={customMetrics}
  enableABTesting={true}
/>
```

**Props:**
- `title`: string - Custom hero title (overrides A/B variants)
- `subtitle`: string - Custom hero subtitle
- `primaryCTA`: CTAConfig - Primary call-to-action button
- `secondaryCTA`: CTAConfig - Optional secondary CTA
- `backgroundAnimation`: AnimationConfig - Animation settings
- `metrics`: HeroMetric[] - Performance metrics to display
- `abTestVariants`: ABTestVariant[] - Custom A/B test variants
- `enableABTesting`: boolean - Enable A/B testing (default: true)

#### HeroMetrics

Displays animated performance metrics with counters.

```typescript
import { HeroMetrics } from '@/components/hero-metrics'
import type { HeroMetric } from '@/lib/types/hero'

const metrics: HeroMetric[] = [
  {
    id: 'users',
    value: 10000,
    suffix: '+',
    label: 'Active Users',
    description: 'Trusted worldwide',
    animateCounter: true
  },
  {
    id: 'accuracy',
    value: 99.9,
    suffix: '%',
    label: 'Uptime',
    description: 'Reliable service',
    animateCounter: true
  }
]

<HeroMetrics 
  metrics={metrics}
  className="mt-16"
/>
```

**Props:**
- `metrics`: HeroMetric[] - Array of metrics to display
- `className`: string - Additional CSS classes
- `animationDelay`: number - Delay before starting animations

#### EnhancedCTAButton

Advanced CTA button with tracking and variants.

```typescript
import { EnhancedCTAButton } from '@/components/ui/enhanced-cta-button'
import type { CTAConfig } from '@/lib/types/hero'

const ctaConfig: CTAConfig = {
  text: "Get Started Today",
  href: "/signup",
  variant: "primary",
  icon: CalendarCheckIcon,
  tracking: {
    event: "cta_click",
    category: "conversion",
    label: "hero_primary",
    value: 100
  }
}

<EnhancedCTAButton
  config={ctaConfig}
  size="xl"
  className="shadow-2xl"
/>
```

**Props:**
- `config`: CTAConfig - Complete CTA configuration
- `size`: ComponentSize - Button size variant
- `className`: string - Additional CSS classes
- `disabled`: boolean - Disable button interaction
- `loading`: boolean - Show loading state

### Interactive Components

#### BrandModal

Accessible modal dialog with focus management.

```typescript
import { BrandModal } from '@/components/design-system/brand-modal'

<BrandModal 
  isOpen={isModalOpen}
  onClose={handleClose}
  title="Confirmation"
  size="md"
>
  <p>Are you sure you want to continue?</p>
  <Cluster space="md" justify="end">
    <BrandButton variant="neutral" onClick={handleClose}>
      Cancel
    </BrandButton>
    <BrandButton variant="primary" onClick={handleConfirm}>
      Confirm
    </BrandButton>
  </Cluster>
</BrandModal>
```

**Props:**
- `isOpen`: boolean - Controls modal visibility
- `onClose`: () => void - Close handler
- `title`: string - Modal title
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `closeOnOverlay`: boolean - Close when clicking overlay (default: true)
- `closeOnEscape`: boolean - Close on Escape key (default: true)

#### BrandTooltip

Contextual information overlay.

```typescript
import { BrandTooltip } from '@/components/design-system/brand-tooltip'

<BrandTooltip content="This is helpful information">
  <button>Hover me</button>
</BrandTooltip>

<BrandTooltip 
  content="Detailed explanation of this feature"
  placement="top"
  delay={500}
>
  <InfoIcon />
</BrandTooltip>
```

**Props:**
- `content`: React.ReactNode - Tooltip content
- `placement`: 'top' | 'bottom' | 'left' | 'right'
- `delay`: number - Show delay in milliseconds
- `disabled`: boolean - Disable tooltip

#### BrandDropdown

Accessible dropdown menu component.

```typescript
import { BrandDropdown } from '@/components/design-system/brand-dropdown'

<BrandDropdown
  trigger={<BrandButton variant="secondary">Options</BrandButton>}
  items={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete, variant: 'danger' },
    { type: 'separator' },
    { label: 'Settings', onClick: handleSettings },
  ]}
/>
```

**Props:**
- `trigger`: React.ReactNode - Element that triggers dropdown
- `items`: DropdownItem[] - Menu items
- `placement`: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

### Animation Components

#### BrandAnimation

Wrapper component for entrance animations.

```typescript
import { BrandAnimation } from '@/components/design-system/brand-animation'

<BrandAnimation type="fadeInUp" delay={200}>
  <div>This content will animate in</div>
</BrandAnimation>

<BrandAnimation 
  type="scaleIn" 
  duration={500}
  trigger="scroll"
  threshold={0.3}
>
  <BrandCard>Scroll-triggered animation</BrandCard>
</BrandAnimation>
```

**Props:**
- `type`: 'fadeIn' | 'fadeInUp' | 'scaleIn' | 'slideInLeft' | 'slideInRight'
- `duration`: number - Animation duration in milliseconds
- `delay`: number - Animation delay in milliseconds
- `trigger`: 'immediate' | 'scroll' - When to trigger animation
- `threshold`: number - Intersection threshold for scroll trigger

#### FloatingBlobs

Animated background elements.

```typescript
import { FloatingBlobs } from '@/components/design-system/floating-blobs'

<FloatingBlobs 
  count={3}
  colors={['purple', 'pink', 'blue']}
  size="large"
  speed="slow"
/>
```

**Props:**
- `count`: number - Number of floating elements
- `colors`: Array of brand color names
- `size`: 'small' | 'medium' | 'large'
- `speed`: 'slow' | 'medium' | 'fast'

### Form Components

#### BrandInput

Styled input component with validation states.

```typescript
import { BrandInput } from '@/components/design-system/brand-input'

<BrandInput
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={setEmail}
  error={emailError}
  required
/>

<BrandInput
  label="Password"
  type="password"
  value={password}
  onChange={setPassword}
  helperText="Must be at least 8 characters"
/>
```

**Props:**
- `label`: string - Input label
- `type`: HTML input type
- `placeholder`: string
- `value`: string
- `onChange`: (value: string) => void
- `error`: string - Error message
- `helperText`: string - Helper text
- `required`: boolean
- `disabled`: boolean

#### BrandSelect

Styled select component.

```typescript
import { BrandSelect } from '@/components/design-system/brand-select'

<BrandSelect
  label="Country"
  value={selectedCountry}
  onChange={setSelectedCountry}
  options={[
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' },
  ]}
  placeholder="Select a country"
/>
```

**Props:**
- `label`: string
- `value`: string
- `onChange`: (value: string) => void
- `options`: Array<{ value: string, label: string }>
- `placeholder`: string
- `error`: string
- `disabled`: boolean

### Feedback Components

#### BrandAlert

Alert component for important messages.

```typescript
import { BrandAlert } from '@/components/design-system/brand-alert'

<BrandAlert variant="success" title="Success!">
  Your changes have been saved successfully.
</BrandAlert>

<BrandAlert variant="error" title="Error" dismissible>
  Something went wrong. Please try again.
</BrandAlert>

<BrandAlert variant="warning" title="Warning">
  This action cannot be undone.
</BrandAlert>
```

**Props:**
- `variant`: 'info' | 'success' | 'warning' | 'error'
- `title`: string
- `dismissible`: boolean
- `onDismiss`: () => void

#### BrandProgress

Progress indicator component.

```typescript
import { BrandProgress } from '@/components/design-system/brand-progress'

<BrandProgress value={75} max={100} />

<BrandProgress 
  value={progress} 
  max={100}
  label="Upload Progress"
  showPercentage
/>
```

**Props:**
- `value`: number - Current progress value
- `max`: number - Maximum value
- `label`: string - Progress label
- `showPercentage`: boolean - Show percentage text

## Usage Guidelines

### Hero Section Patterns

The hero section supports multiple usage patterns for different scenarios:

#### Landing Page Hero

```typescript
import HeroSection from '@/components/hero-section'
import { DEFAULT_HERO_METRICS } from '@/lib/types/hero'

// Full-featured landing page hero
<HeroSection
  enableABTesting={true}
  metrics={DEFAULT_HERO_METRICS}
  backgroundAnimation={{
    enableFloatingBlobs: true,
    blobCount: 3,
    animationSpeed: 'medium',
    colorScheme: 'mixed'
  }}
/>
```

#### Product Page Hero

```typescript
// Product-specific hero with custom content
<HeroSection
  title="AI-Powered Analytics Platform"
  subtitle="Transform your data into actionable insights with advanced AI orchestration"
  primaryCTA={{
    text: "Start Free Trial",
    href: "/trial",
    variant: "primary",
    tracking: {
      event: "product_trial_start",
      category: "conversion",
      label: "analytics_platform"
    }
  }}
  secondaryCTA={{
    text: "Watch Demo",
    href: "/demo",
    variant: "outline",
    tracking: {
      event: "product_demo_view",
      category: "engagement",
      label: "analytics_platform"
    }
  }}
  enableABTesting={false}
/>
```

#### Minimal Hero

```typescript
// Simplified hero for internal pages
<HeroSection
  title="Dashboard"
  subtitle="Welcome back to your analytics workspace"
  backgroundAnimation={{
    enableFloatingBlobs: false,
    blobCount: 0,
    animationSpeed: 'slow',
    colorScheme: 'primary'
  }}
  enableABTesting={false}
/>
```

#### A/B Testing Configuration

```typescript
import type { ABTestVariant } from '@/lib/types/hero'

const customVariants: ABTestVariant[] = [
  {
    id: 'variant_a',
    title: "Unlock Deeper Insights",
    subtitle: "AI-powered analysis for complex data relationships",
    primaryCTA: {
      text: "Request Consultation",
      href: "/consultation",
      variant: "primary",
      tracking: {
        event: "hero_consultation_click",
        category: "conversion",
        label: "variant_a"
      }
    },
    weight: 50
  },
  {
    id: 'variant_b', 
    title: "Transform Your Data Intelligence",
    subtitle: "Discover hidden patterns with advanced AI orchestration",
    primaryCTA: {
      text: "Start Free Trial",
      href: "/trial",
      variant: "primary",
      tracking: {
        event: "hero_trial_click",
        category: "conversion", 
        label: "variant_b"
      }
    },
    weight: 50
  }
]

<HeroSection
  abTestVariants={customVariants}
  enableABTesting={true}
/>
```

### Component Composition

Components are designed to work together seamlessly:

```typescript
<Container size="lg">
  <Stack space="xl">
    <BrandHeading level={1} gradient="purplePink">
      Welcome to C9d.ai
    </BrandHeading>
    
    <BrandText size="lg" color="gray-light">
      Transform your workflow with AI orchestration
    </BrandText>
    
    <Cluster space="md" justify="center">
      <BrandButton variant="primary" size="lg">
        Get Started
      </BrandButton>
      <BrandButton variant="secondary" size="lg">
        Learn More
      </BrandButton>
    </Cluster>
  </Stack>
</Container>
```

### Responsive Design

All components are mobile-first and responsive:

```typescript
// Components automatically adapt to screen size
<BrandButton 
  size="lg"        // Large on desktop
  className="sm:text-base lg:text-lg" // Custom responsive styling
>
  Responsive Button
</BrandButton>

// Use responsive props where available
<Container size={{ base: 'sm', md: 'lg', xl: 'xl' }}>
  Responsive container
</Container>
```

### Accessibility

Components include built-in accessibility features:

```typescript
// Automatic ARIA attributes
<BrandButton 
  loading={isLoading}
  aria-label="Submit form"
  disabled={!isValid}
>
  {isLoading ? 'Submitting...' : 'Submit'}
</BrandButton>

// Keyboard navigation support
<BrandDropdown
  trigger={<BrandButton>Menu</BrandButton>}
  items={menuItems}
  // Automatic keyboard navigation and focus management
/>
```

### Performance

Components are optimized for performance:

```typescript
// Lazy loading for heavy components
const BrandModal = lazy(() => import('@/components/design-system/brand-modal'))

// Memoization for expensive renders
const MemoizedCard = memo(BrandCard)

// Hardware-accelerated animations
<BrandAnimation type="fadeInUp">
  {/* Uses transform and opacity for 60fps animations */}
</BrandAnimation>
```

## Testing

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { BrandButton } from '@/components/design-system/brand-button'

describe('BrandButton', () => {
  it('renders with correct variant styles', () => {
    render(<BrandButton variant="primary">Test</BrandButton>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('brand-button--primary')
  })
  
  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<BrandButton onClick={handleClick}>Test</BrandButton>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  it('shows loading state', () => {
    render(<BrandButton loading>Test</BrandButton>)
    
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

### Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('BrandModal has no accessibility violations', async () => {
  const { container } = render(
    <BrandModal isOpen title="Test Modal">
      Modal content
    </BrandModal>
  )
  
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Customization

### Extending Components

```typescript
// Create custom variants
const CustomButton = styled(BrandButton)`
  &.custom-variant {
    background: ${brandGradients.accent.yellowLime};
    color: ${brandColors.secondary.blue.dark};
  }
`

// Extend with additional props
interface ExtendedButtonProps extends BrandButtonProps {
  icon?: React.ReactNode
}

const IconButton: React.FC<ExtendedButtonProps> = ({ icon, children, ...props }) => (
  <BrandButton {...props}>
    {icon && <span className="mr-2">{icon}</span>}
    {children}
  </BrandButton>
)
```

### Theme Customization

```typescript
// Override design tokens
const customTheme = {
  ...defaultBrandTheme,
  colors: {
    ...defaultBrandTheme.colors,
    primary: '#custom-color',
  },
}

// Apply custom theme
<ThemeProvider theme={customTheme}>
  <App />
</ThemeProvider>
```

## Migration Guide

### From Existing Components

```typescript
// Before: Custom button
const OldButton = ({ children, primary }) => (
  <button className={`btn ${primary ? 'btn-primary' : 'btn-secondary'}`}>
    {children}
  </button>
)

// After: BrandButton
const NewButton = ({ children, variant = 'primary' }) => (
  <BrandButton variant={variant}>
    {children}
  </BrandButton>
)
```

### Gradual Adoption

1. **Start with new components** in new features
2. **Replace existing components** during refactoring
3. **Update styling** to use design tokens
4. **Add accessibility** improvements
5. **Test thoroughly** with existing functionality

## Best Practices

1. **Use semantic variants** instead of custom styling
2. **Compose components** for complex layouts
3. **Test accessibility** with screen readers and keyboard navigation
4. **Follow responsive patterns** for mobile-first design
5. **Leverage design tokens** for consistent styling
6. **Document custom components** following the same patterns

## Resources

- [Storybook Documentation](http://localhost:6006) - Interactive component examples
- [Accessibility Guidelines](./accessibility.md) - WCAG compliance details
- [Design Tokens](./design-tokens.md) - Token system documentation
- [Testing Guide](../testing/component-testing.md) - Component testing patterns