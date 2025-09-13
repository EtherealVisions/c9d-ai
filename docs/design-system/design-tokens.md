# Design Token System

The C9d.ai design token system provides a comprehensive, type-safe foundation for maintaining brand consistency across all components and pages. This system ensures scalable design implementation while enforcing brand guidelines.

## Overview

Design tokens are the visual design atoms of the design system — specifically, they are named entities that store visual design attributes. Our token system includes:

- **Colors**: Brand palette with semantic naming
- **Typography**: Font scales, weights, and hierarchies  
- **Spacing**: Consistent spacing scale
- **Shadows**: Elevation and glow effects
- **Animations**: Durations, easings, and keyframes
- **Gradients**: Brand-compliant gradient definitions
- **Component Tokens**: Pre-configured component styles

## File Structure

```
apps/web/lib/design-system/
├── tokens.ts              # Core design tokens
├── brand-guidelines.ts    # Brand enforcement utilities
└── index.ts              # Exports and utilities
```

## Core Token Categories

### Colors

The color system is organized into semantic categories:

```typescript
import { brandColors } from '@/lib/design-system/tokens'

// Primary brand colors
brandColors.primary.purple.vibrant  // #7B2CBF
brandColors.primary.pink.hot        // #E71D73

// Secondary colors
brandColors.secondary.blue.electric // #00B2FF
brandColors.secondary.teal.accent   // #2CE4B8

// Accent colors
brandColors.accent.yellow.bright    // #FFD700
brandColors.accent.lime.bright      // #AFFF3C

// Neutral colors
brandColors.neutral.white           // #FFFFFF
brandColors.neutral.gray.light      // #E0E6ED
```

Each color includes a full scale (50-900) for flexibility:

```typescript
brandColors.primary.purple[50]   // Lightest
brandColors.primary.purple[500]  // Base color
brandColors.primary.purple[900]  // Darkest
```

### Gradients

Pre-defined brand-compliant gradients:

```typescript
import { brandGradients } from '@/lib/design-system/tokens'

// Primary gradients
brandGradients.primary.purplePink        // Purple to pink
brandGradients.primary.purplePinkVertical // Vertical variant
brandGradients.primary.purplePinkRadial   // Radial variant

// Secondary gradients
brandGradients.secondary.blueTeal        // Blue to teal

// Complex gradients
brandGradients.complex.hero             // Multi-stop hero gradient
brandGradients.complex.feature          // Feature section gradient
```

### Typography

Comprehensive typography scale with semantic sizing:

```typescript
import { typography } from '@/lib/design-system/tokens'

// Font families
typography.fontFamily.sans     // ['Inter', 'system-ui', 'sans-serif']
typography.fontFamily.mono     // ['JetBrains Mono', 'Consolas', 'monospace']

// Font sizes (with line heights)
typography.fontSize.xs         // ['0.75rem', { lineHeight: '1rem' }]
typography.fontSize.base       // ['1rem', { lineHeight: '1.5rem' }]
typography.fontSize['4xl']     // ['2.25rem', { lineHeight: '2.5rem' }]

// Font weights
typography.fontWeight.normal   // '400'
typography.fontWeight.semibold // '600'
typography.fontWeight.bold     // '700'
```

### Spacing

Consistent spacing scale based on rem units:

```typescript
import { spacing } from '@/lib/design-system/tokens'

spacing[1]    // '0.25rem' (4px)
spacing[4]    // '1rem' (16px)
spacing[8]    // '2rem' (32px)
spacing[16]   // '4rem' (64px)
```

### Shadows

Elevation system with brand-specific glows:

```typescript
import { shadows } from '@/lib/design-system/tokens'

// Standard shadows
shadows.sm    // Subtle shadow
shadows.lg    // Prominent shadow
shadows['2xl'] // Maximum elevation

// Brand glows
shadows.glow.purple  // Purple glow effect
shadows.glow.pink    // Pink glow effect
shadows.glow.blue    // Blue glow effect
```

### Animations

Performance-optimized animation system:

```typescript
import { animations } from '@/lib/design-system/tokens'

// Durations
animations.duration[200]  // '200ms'
animations.duration[500]  // '500ms'

// Easings
animations.easing.gentle  // 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
animations.easing.smooth  // 'cubic-bezier(0.4, 0, 0.2, 1)'

// Keyframes
animations.keyframes.gentleFloat    // Floating animation
animations.keyframes.gradientWave   // Gradient animation
animations.keyframes.fadeInUp       // Entrance animation
```

## Component Tokens

Pre-configured tokens for common components:

```typescript
import { componentTokens } from '@/lib/design-system/tokens'

// Button variants
componentTokens.button.primary.background    // Primary button gradient
componentTokens.button.primary.shadow        // Primary button glow
componentTokens.button.secondary.background  // Secondary button gradient

// Card styling
componentTokens.card.background     // Card background color
componentTokens.card.border         // Card border color
componentTokens.card.shadow         // Card shadow
componentTokens.card.borderRadius   // Card border radius

// Hero section
componentTokens.hero.background     // Hero background gradient
componentTokens.hero.titleColor     // Hero title color
componentTokens.hero.subtitleColor  // Hero subtitle color
```

## Usage Examples

### Basic Usage

The design system now uses an optimized import/export pattern for better tree-shaking:

```typescript
// Import from the main design system module (recommended)
import { brandColors, brandGradients, spacing } from '@/lib/design-system'

// Or use convenience aliases
import { colors, gradients, space } from '@/lib/design-system'

// Import utility functions
import { getColorValue, getSpacingValue } from '@/lib/design-system'

// Using colors
const buttonStyle = {
  backgroundColor: brandColors.primary.purple.vibrant,
  color: brandColors.neutral.white,
  padding: `${spacing[3]} ${spacing[6]}`,
}

// Using convenience aliases
const buttonStyleAlt = {
  backgroundColor: colors.primary.purple.vibrant,
  color: colors.neutral.white,
  padding: `${space[3]} ${space[6]}`,
}

// Using gradients
const heroStyle = {
  background: brandGradients.complex.hero,
  minHeight: '100vh',
}

// Using utility functions for dynamic access
const dynamicStyle = {
  backgroundColor: getColorValue('primary.purple.vibrant'),
  padding: getSpacingValue('6'),
}
```

### With Tailwind CSS

The tokens integrate seamlessly with Tailwind CSS through the configuration:

```typescript
// tailwind.config.ts
import { designTokens } from '@/lib/design-system/tokens'

export default {
  theme: {
    extend: {
      colors: {
        'windsurf-purple-vibrant': designTokens.colors.primary.purple.vibrant,
        'windsurf-pink-hot': designTokens.colors.primary.pink.hot,
        // ... other colors
      },
      spacing: designTokens.spacing,
      borderRadius: designTokens.borderRadius,
      boxShadow: designTokens.shadows,
    }
  }
}
```

### Component Implementation

```typescript
// Import from the main design system module
import { componentTokens, brandColors, BrandValidator } from '@/lib/design-system'

export function BrandButton({ variant = 'primary', children, ...props }) {
  const styles = componentTokens.button[variant]
  
  // Validate color contrast using built-in validator
  const isAccessible = BrandValidator.validateColorContrast(
    styles.background,
    styles.color,
    'AA'
  )
  
  return (
    <button
      style={{
        background: styles.background,
        color: styles.color,
        boxShadow: styles.shadow,
        borderRadius: styles.borderRadius,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
```

## Brand Guidelines Integration

The design token system includes brand validation utilities:

```typescript
import { BrandValidator } from '@/lib/design-system/brand-guidelines'

// Validate color contrast
const contrastCheck = BrandValidator.validateColorContrast(
  brandColors.secondary.blue.dark,
  brandColors.neutral.white,
  'AA'
)

// Validate gradient usage
const isValidGradient = BrandValidator.validateGradient(
  brandGradients.primary.purplePink
)

// Validate spacing
const isValidSpacing = BrandValidator.validateSpacing(spacing[4])
```

## TypeScript Support

Full TypeScript support with strict typing:

```typescript
import type { 
  BrandColors, 
  BrandGradients, 
  Typography,
  ComponentTokens 
} from '@/lib/design-system/tokens'

// Type-safe color usage
function useThemeColor(color: keyof BrandColors['primary']['purple']) {
  return brandColors.primary.purple[color]
}

// Type-safe gradient usage
function useGradient(gradient: keyof BrandGradients['primary']) {
  return brandGradients.primary[gradient]
}
```

## Performance Considerations

### CSS Custom Properties

For runtime theming, tokens can be converted to CSS custom properties:

```typescript
// Generate CSS custom properties
const cssVariables = Object.entries(brandColors.primary.purple)
  .map(([key, value]) => `--color-purple-${key}: ${value}`)
  .join('; ')
```

### Tree Shaking

The new import pattern is optimized for tree-shaking:

```typescript
// ✅ Good: Import specific tokens (tree-shakable)
import { brandColors } from '@/lib/design-system'
const primaryColor = brandColors.primary.purple.vibrant

// ✅ Good: Import convenience aliases (tree-shakable)
import { colors } from '@/lib/design-system'
const primaryColor = colors.primary.purple.vibrant

// ✅ Good: Import utility functions (tree-shakable)
import { getColorValue } from '@/lib/design-system'
const primaryColor = getColorValue('primary.purple.vibrant')

// ⚠️ Acceptable: Default import (includes all utilities)
import designSystem from '@/lib/design-system'
const primaryColor = designSystem.colors.primary.purple.vibrant
```

### Build-Time Optimization

Tokens are statically analyzable for build-time optimizations:

```typescript
// Tokens can be processed at build time
const optimizedColors = Object.fromEntries(
  Object.entries(brandColors.primary.purple)
    .filter(([_, value]) => value !== undefined)
)
```

## Accessibility

### Color Contrast

All color combinations are validated for WCAG compliance:

```typescript
// Automatic contrast validation
const textOnBackground = BrandValidator.validateColorContrast(
  brandColors.secondary.blue.dark,  // Background
  brandColors.neutral.white,        // Text
  'AA'                             // WCAG level
)

console.log(textOnBackground.valid) // true/false
console.log(textOnBackground.ratio) // Contrast ratio
```

### Reduced Motion

Animation tokens respect user preferences:

```typescript
// Check for reduced motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Conditionally apply animations
const animationStyle = prefersReducedMotion 
  ? {} 
  : { animation: `${animations.keyframes.gentleFloat} 25s ease-in-out infinite` }
```

## Migration Guide

### From Existing Styles

Replace hardcoded values with tokens:

```typescript
// Before
const oldStyle = {
  color: '#7B2CBF',
  fontSize: '1.5rem',
  padding: '1rem 2rem',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
}

// After
const newStyle = {
  color: brandColors.primary.purple.vibrant,
  fontSize: typography.fontSize['2xl'][0],
  padding: `${spacing[4]} ${spacing[8]}`,
  boxShadow: shadows.md,
}
```

### Component Updates

Update existing components to use tokens:

```typescript
// Before
function OldButton({ children }) {
  return (
    <button className="bg-purple-600 text-white px-6 py-3 rounded-lg">
      {children}
    </button>
  )
}

// After
function NewButton({ children }) {
  return (
    <button 
      style={{
        background: componentTokens.button.primary.background,
        color: componentTokens.button.primary.color,
        padding: `${spacing[3]} ${spacing[6]}`,
        borderRadius: componentTokens.button.primary.borderRadius,
      }}
    >
      {children}
    </button>
  )
}
```

## Best Practices

### Token Naming

- Use semantic names over descriptive names
- Follow the category.subcategory.variant pattern
- Maintain consistency across similar tokens

### Usage Guidelines

1. **Always use tokens** instead of hardcoded values
2. **Validate combinations** using brand guidelines
3. **Consider accessibility** when choosing color combinations
4. **Respect user preferences** for motion and contrast
5. **Test across devices** and screen sizes

### Performance Tips

1. **Import selectively** to reduce bundle size
2. **Use CSS custom properties** for runtime theming
3. **Leverage build-time optimization** for static values
4. **Cache computed styles** when possible

## Testing

Test token usage in components:

```typescript
import { render } from '@testing-library/react'
import { brandColors } from '@/lib/design-system/tokens'

test('uses correct brand colors', () => {
  const { container } = render(<BrandButton>Test</BrandButton>)
  const button = container.firstChild
  
  expect(button).toHaveStyle({
    backgroundColor: brandColors.primary.purple.vibrant
  })
})
```

## Contributing

When adding new tokens:

1. **Follow naming conventions**
2. **Add TypeScript types**
3. **Update documentation**
4. **Add validation rules**
5. **Test accessibility**
6. **Update component tokens** if needed

## Resources

- [Design Token Specification](https://design-tokens.github.io/community-group/)
- [WCAG Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Tailwind CSS Configuration](https://tailwindcss.com/docs/configuration)