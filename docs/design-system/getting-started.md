# Getting Started with the Design System

This guide will help you quickly get up and running with the C9d.ai design system, whether you're building new components or updating existing ones.

## Quick Start

### Installation

The design system is already included in the C9d.ai platform. No additional installation is required.

### Basic Usage

The design system now uses an optimized import/export pattern for better tree-shaking and performance:

```typescript
// Import design tokens from the main module (recommended)
import { brandColors, spacing, typography } from '@/lib/design-system'

// Or use convenience aliases
import { colors, space, fonts } from '@/lib/design-system'

// Import utility functions
import { getColorValue, getSpacingValue } from '@/lib/design-system'

// Use in your components
const MyComponent = () => (
  <div style={{
    backgroundColor: brandColors.secondary.blue.dark,
    color: brandColors.neutral.white,
    padding: spacing[6],
    fontSize: typography.fontSize.lg[0],
  }}>
    Hello, C9d.ai!
  </div>
)

// Alternative using convenience aliases
const MyComponentAlt = () => (
  <div style={{
    backgroundColor: colors.secondary.blue.dark,
    color: colors.neutral.white,
    padding: space[6],
    fontSize: fonts.fontSize.lg[0],
  }}>
    Hello, C9d.ai!
  </div>
)

// Using utility functions for dynamic access
const MyDynamicComponent = ({ colorPath, spacingSize }) => (
  <div style={{
    backgroundColor: getColorValue(colorPath),
    padding: getSpacingValue(spacingSize),
  }}>
    Dynamic styling!
  </div>
)
```

### With Tailwind CSS

The design tokens integrate with Tailwind CSS through the configuration:

```typescript
// Use Tailwind classes that map to design tokens
<div className="bg-windsurf-purple-deep text-white p-6 text-lg">
  Styled with Tailwind + Design Tokens
</div>
```

## Core Concepts

### Design Tokens

Design tokens are the foundation of the system. They provide consistent values for:

- **Colors**: Brand palette with semantic naming
- **Typography**: Font sizes, weights, and families
- **Spacing**: Consistent spacing scale
- **Shadows**: Elevation and glow effects
- **Animations**: Durations, easings, and keyframes

### Component Variants

Components use a consistent variant system:

```typescript
// Button variants
<BrandButton variant="primary">Primary Action</BrandButton>
<BrandButton variant="secondary">Secondary Action</BrandButton>
<BrandButton variant="accent">Special Action</BrandButton>

// Card variants
<BrandCard variant="default">Standard Card</BrandCard>
<BrandCard variant="interactive">Clickable Card</BrandCard>
<BrandCard variant="feature">Featured Content</BrandCard>
```

### Accessibility First

All components are built with accessibility in mind:

- WCAG 2.1 AA compliant color contrast
- Keyboard navigation support
- Screen reader compatibility
- Reduced motion preferences

## Common Patterns

### Layout Components

```typescript
import { Container, Stack, Cluster } from '@/components/design-system'

<Container size="lg">
  <Stack space="xl">
    <h1>Page Title</h1>
    <p>Page description</p>
    <Cluster space="md">
      <button>Action 1</button>
      <button>Action 2</button>
    </Cluster>
  </Stack>
</Container>
```

### Typography Hierarchy

```typescript
import { BrandHeading, BrandText } from '@/components/design-system'

<Stack space="lg">
  <BrandHeading level={1} gradient="purplePink">
    Main Title
  </BrandHeading>
  <BrandHeading level={2} color="white">
    Section Title
  </BrandHeading>
  <BrandText size="lg" color="gray-light">
    Body text with proper hierarchy
  </BrandText>
</Stack>
```

### Interactive Elements

```typescript
import { BrandButton, BrandCard, BrandModal } from '@/components/design-system'

const [isOpen, setIsOpen] = useState(false)

<BrandCard variant="interactive" onClick={() => setIsOpen(true)}>
  <h3>Click to open modal</h3>
</BrandCard>

<BrandModal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  <h2>Modal Content</h2>
  <BrandButton variant="primary" onClick={() => setIsOpen(false)}>
    Close
  </BrandButton>
</BrandModal>
```

## Migration Guide

### From Hardcoded Values

Replace hardcoded CSS values with design tokens:

```typescript
// ❌ Before: Hardcoded values
const oldStyles = {
  color: '#7B2CBF',
  fontSize: '1.5rem',
  padding: '1rem 2rem',
  borderRadius: '0.5rem',
}

// ✅ After: Design tokens (optimized imports)
import { brandColors, typography, spacing, borderRadius } from '@/lib/design-system'

const newStyles = {
  color: brandColors.primary.purple.vibrant,
  fontSize: typography.fontSize['2xl'][0],
  padding: `${spacing[4]} ${spacing[8]}`,
  borderRadius: borderRadius.lg,
}

// ✅ Alternative: Using convenience aliases
import { colors, fonts, space, radii } from '@/lib/design-system'

const newStylesAlt = {
  color: colors.primary.purple.vibrant,
  fontSize: fonts.fontSize['2xl'][0],
  padding: `${space[4]} ${space[8]}`,
  borderRadius: radii.lg,
}
```

### From Custom Components

Replace custom components with design system components:

```typescript
// ❌ Before: Custom button
const CustomButton = ({ children, primary }) => (
  <button className={`btn ${primary ? 'btn-primary' : 'btn-secondary'}`}>
    {children}
  </button>
)

// ✅ After: Design system button
import { BrandButton } from '@/components/design-system'

const NewButton = ({ children, variant = 'primary' }) => (
  <BrandButton variant={variant}>
    {children}
  </BrandButton>
)
```

### Gradual Adoption Strategy

1. **Start with new features**: Use design system components for all new development
2. **Update during refactoring**: Replace existing components when making changes
3. **Prioritize high-impact areas**: Focus on frequently used components first
4. **Test thoroughly**: Ensure functionality remains intact after migration

## Development Workflow

### Creating New Components

1. **Use design tokens** for all visual properties
2. **Follow accessibility guidelines** from the start
3. **Include comprehensive tests** (unit, accessibility, visual)
4. **Document usage patterns** with examples
5. **Validate brand compliance** using built-in validators

```typescript
// Example: Creating a new component
import { 
  brandColors, 
  spacing, 
  borderRadius, 
  BrandValidator,
  validateDesignTokenUsage 
} from '@/lib/design-system'

export const MyNewComponent = ({ children, ...props }) => {
  // Validate color contrast using the validator
  const isAccessible = BrandValidator.validateColorContrast(
    brandColors.secondary.blue.dark,
    brandColors.neutral.white,
    'AA'
  )

  // Or use the utility validation functions
  const isValidColor = validateDesignTokenUsage.color(brandColors.secondary.blue.dark)

  return (
    <div
      style={{
        backgroundColor: brandColors.secondary.blue.dark,
        color: brandColors.neutral.white,
        padding: spacing[4],
        borderRadius: borderRadius.md,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
```

### Testing Components

```typescript
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { MyNewComponent } from './my-new-component'

expect.extend(toHaveNoViolations)

describe('MyNewComponent', () => {
  it('renders correctly', () => {
    render(<MyNewComponent>Test content</MyNewComponent>)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<MyNewComponent>Test</MyNewComponent>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('uses correct brand colors', () => {
    const { container } = render(<MyNewComponent>Test</MyNewComponent>)
    const element = container.firstChild
    expect(element).toHaveStyle({
      backgroundColor: brandColors.secondary.blue.dark
    })
  })
})
```

## Best Practices

### Do's

- ✅ Use design tokens for all visual properties
- ✅ Follow the established component variant patterns
- ✅ Test accessibility with screen readers and keyboard navigation
- ✅ Validate color contrast ratios
- ✅ Respect user motion preferences
- ✅ Document component usage with examples
- ✅ Use semantic HTML elements
- ✅ Include proper ARIA labels and descriptions

### Don'ts

- ❌ Use hardcoded colors, spacing, or typography values
- ❌ Create custom variants outside the design system
- ❌ Ignore accessibility requirements
- ❌ Use colors that fail contrast requirements
- ❌ Create animations that don't respect reduced motion
- ❌ Skip documentation for new components
- ❌ Use non-semantic HTML elements
- ❌ Forget to test with assistive technologies

## Troubleshooting

### Common Issues

#### TypeScript Errors
```typescript
// ❌ Problem: Type errors with design tokens
const color: string = brandColors.primary.purple.vibrant

// ✅ Solution: Use proper typing
import type { BrandColors } from '@/lib/design-system/tokens'
const color: BrandColors['primary']['purple']['vibrant'] = brandColors.primary.purple.vibrant
```

#### Color Contrast Issues
```typescript
// ❌ Problem: Poor contrast
<div style={{ 
  backgroundColor: brandColors.neutral.gray.light,
  color: brandColors.neutral.gray.medium 
}}>
  Hard to read text
</div>

// ✅ Solution: Use validated combinations
import { BrandValidator } from '@/lib/design-system/brand-guidelines'

const isValid = BrandValidator.validateColorContrast(
  brandColors.secondary.blue.dark,
  brandColors.neutral.white,
  'AA'
)
```

#### Animation Performance
```typescript
// ❌ Problem: Janky animations
<div style={{ 
  animation: 'slide-in 300ms ease-in-out',
  left: '100px' // Causes layout thrashing
}}>
  Content
</div>

// ✅ Solution: Use transform for hardware acceleration
<div style={{ 
  animation: 'slide-in 300ms ease-in-out',
  transform: 'translateX(100px)' // Hardware accelerated
}}>
  Content
</div>
```

### Getting Help

- **Documentation**: Check the [design system docs](./README.md)
- **Examples**: Review the [component library](./component-library.md)
- **Accessibility**: Follow the [accessibility guidelines](./accessibility.md)
- **Brand Guidelines**: Consult the [brand guidelines](./brand-guidelines.md)
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions

## Next Steps

1. **Explore the component library**: Review available components and their APIs
2. **Read the accessibility guidelines**: Understand WCAG compliance requirements
3. **Study the brand guidelines**: Learn about proper brand usage and validation
4. **Practice with examples**: Build sample components using the design system
5. **Contribute improvements**: Help enhance the design system for everyone

## Resources

- [Design System Overview](./README.md)
- [Design Tokens Documentation](./design-tokens.md)
- [Component Library](./component-library.md)
- [Accessibility Guidelines](./accessibility.md)
- [Brand Guidelines](./brand-guidelines.md)
- [Storybook Documentation](http://localhost:6006) (when running locally)

---

Ready to build amazing, accessible, and brand-compliant interfaces with the C9d.ai design system!