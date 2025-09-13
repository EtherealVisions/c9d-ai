# Brand Guidelines

The C9d.ai brand guidelines ensure consistent visual identity and user experience across all touchpoints. These guidelines define how to properly use our design system to maintain brand integrity while creating engaging, accessible interfaces.

## Brand Identity

### Vision Statement
C9d.ai empowers organizations to orchestrate AI capabilities seamlessly, transforming complex workflows into intelligent, automated processes that drive innovation and efficiency.

### Brand Personality
- **Innovative**: Cutting-edge AI technology with forward-thinking solutions
- **Approachable**: Complex technology made accessible and user-friendly
- **Reliable**: Enterprise-grade stability and security
- **Vibrant**: Energetic and dynamic visual presence
- **Professional**: Sophisticated design with attention to detail

### Brand Values
- **Intelligence**: Smart solutions that adapt and learn
- **Simplicity**: Complex problems solved with elegant interfaces
- **Trust**: Secure, reliable, and transparent operations
- **Innovation**: Continuous advancement and improvement
- **Accessibility**: Inclusive design for all users

## Visual Identity

### Logo Usage

#### Primary Logo
The C9d.ai logo should be used in its primary form whenever possible:

```typescript
import { BrandLogo } from '@/components/design-system/brand-assets'

// Primary logo usage
<BrandLogo variant="primary" size="lg" />

// With custom sizing
<BrandLogo 
  variant="primary" 
  width={200} 
  height={60}
  alt="C9d.ai - AI Orchestration Platform"
/>
```

#### Logo Variants
- **Primary**: Full color logo for light backgrounds
- **White**: White version for dark backgrounds
- **Monochrome**: Single color version for special applications
- **Icon**: Symbol-only version for small spaces

#### Logo Guidelines
- **Clear Space**: Maintain minimum clear space equal to the height of the "C" in the logo
- **Minimum Size**: Never display smaller than 24px height for digital, 0.5 inches for print
- **Backgrounds**: Ensure sufficient contrast with background colors
- **Modifications**: Never modify, rotate, or distort the logo

### Color System

#### Primary Brand Colors

```typescript
import { brandColors } from '@/lib/design-system/tokens'

// Purple family - Innovation and technology
brandColors.primary.purple.deep      // #300D4F - Deep, sophisticated
brandColors.primary.purple.vibrant   // #7B2CBF - Primary brand color
brandColors.primary.purple.light     // #9D4EDD - Lighter applications

// Pink family - Energy and approachability  
brandColors.primary.pink.hot         // #E71D73 - Vibrant accent
brandColors.primary.pink.vibrant     // #F91880 - High energy
brandColors.primary.pink.light       // #FDEFF5 - Subtle backgrounds
```

#### Secondary Colors

```typescript
// Blue family - Trust and reliability
brandColors.secondary.blue.dark      // #0A192F - Primary background
brandColors.secondary.blue.mid       // #0F203A - Secondary surfaces
brandColors.secondary.blue.electric  // #00B2FF - Interactive elements

// Teal family - Innovation and growth
brandColors.secondary.teal.accent    // #2CE4B8 - Success states
brandColors.secondary.teal.light     // #7DD3FC - Informational content
```

#### Accent Colors

```typescript
// Yellow family - Optimism and clarity
brandColors.accent.yellow.bright     // #FFD700 - Attention and highlights
brandColors.accent.yellow.warm       // #FCD34D - Warm interactions

// Lime family - Growth and energy
brandColors.accent.lime.bright       // #AFFF3C - Dynamic elements
brandColors.accent.lime.vibrant      // #84CC16 - Active states
```

#### Color Usage Guidelines

**Do:**
- Use primary colors for key brand elements and CTAs
- Use secondary colors for backgrounds and supporting elements
- Use accent colors sparingly for highlights and special emphasis
- Maintain consistent color relationships across all applications

**Don't:**
- Use colors outside the defined palette
- Apply colors that fail accessibility contrast requirements
- Use too many colors in a single interface
- Modify brand colors or create custom variations

### Typography

#### Font Hierarchy

```typescript
import { typography } from '@/lib/design-system/tokens'

// Primary font family
typography.fontFamily.sans  // ['Inter', 'system-ui', 'sans-serif']

// Display typography - Headlines and hero content
typography.fontSize['6xl']  // 3.75rem - Hero headlines
typography.fontSize['5xl']  // 3rem - Page titles
typography.fontSize['4xl']  // 2.25rem - Section headers

// Body typography - Content and interface
typography.fontSize['xl']   // 1.25rem - Large body text
typography.fontSize.base    // 1rem - Standard body text
typography.fontSize.sm      // 0.875rem - Small text and captions
```

#### Typography Guidelines

**Headlines:**
- Use bold weights (700-900) for maximum impact
- Apply gradient treatments to hero headlines
- Maintain consistent line heights for readability
- Use sentence case for most headlines

**Body Text:**
- Use regular to medium weights (400-500) for readability
- Maintain 1.5-1.6 line height for optimal reading
- Use sufficient color contrast for accessibility
- Keep line lengths between 45-75 characters

**Interface Text:**
- Use medium weight (500-600) for buttons and labels
- Apply consistent sizing across similar elements
- Use proper semantic markup for screen readers
- Maintain visual hierarchy through size and weight

### Gradients

#### Primary Gradients

```typescript
import { brandGradients } from '@/lib/design-system/tokens'

// Purple to Pink - Primary brand gradient
brandGradients.primary.purplePink
// Usage: Hero sections, primary CTAs, key brand elements

// Blue to Teal - Secondary gradient  
brandGradients.secondary.blueTeal
// Usage: Secondary CTAs, feature highlights, interactive elements

// Yellow to Lime - Accent gradient
brandGradients.accent.yellowLime
// Usage: Special promotions, success states, energy elements
```

#### Complex Gradients

```typescript
// Hero gradient - Multi-stop for backgrounds
brandGradients.complex.hero
// Usage: Hero sections, landing page backgrounds

// Feature gradient - Balanced color distribution
brandGradients.complex.feature  
// Usage: Feature cards, section backgrounds

// Rainbow gradient - Full brand spectrum
brandGradients.complex.rainbow
// Usage: Special occasions, celebration elements
```

#### Gradient Guidelines

**Do:**
- Use gradients to create depth and visual interest
- Apply gradients to large surfaces and key elements
- Maintain consistent gradient directions (135° diagonal preferred)
- Test gradients across different screen sizes

**Don't:**
- Overuse gradients in a single interface
- Apply gradients to small text or fine details
- Create custom gradients outside the defined set
- Use gradients that reduce text readability

## Component Guidelines

### Buttons

#### Variant Usage

```typescript
// Primary buttons - Main actions
<BrandButton variant="primary" size="lg">
  Get Started
</BrandButton>

// Secondary buttons - Supporting actions  
<BrandButton variant="secondary" size="md">
  Learn More
</BrandButton>

// Accent buttons - Special emphasis
<BrandButton variant="accent" size="md">
  Limited Offer
</BrandButton>
```

#### Button Guidelines

**Primary Buttons:**
- Use for the most important action on a page
- Limit to one primary button per section
- Apply glow effects for extra emphasis
- Use action-oriented text ("Get Started", "Sign Up")

**Secondary Buttons:**
- Use for supporting actions
- Can have multiple per section
- Maintain visual hierarchy with primary buttons
- Use descriptive text ("Learn More", "View Details")

### Cards

#### Card Variants

```typescript
// Default cards - Standard content containers
<BrandCard variant="default">
  <h3>Standard Content</h3>
  <p>Regular card content goes here.</p>
</BrandCard>

// Interactive cards - Clickable content
<BrandCard variant="interactive" onClick={handleClick}>
  <h3>Interactive Content</h3>
  <p>Click to explore more.</p>
</BrandCard>

// Feature cards - Highlighted content
<BrandCard variant="feature" gradient>
  <h3>Featured Content</h3>
  <p>Special highlighted information.</p>
</BrandCard>
```

#### Card Guidelines

**Content Structure:**
- Use consistent padding and spacing
- Maintain clear visual hierarchy
- Include clear calls-to-action when interactive
- Ensure sufficient contrast for all text

**Visual Treatment:**
- Apply subtle shadows for depth
- Use gradients sparingly for special emphasis
- Maintain consistent border radius
- Consider hover states for interactive cards

### Typography Components

#### Heading Usage

```typescript
// Page titles
<BrandHeading level={1} gradient="purplePink">
  Transform Your Workflow
</BrandHeading>

// Section headers
<BrandHeading level={2} color="white">
  Key Features
</BrandHeading>

// Subsection headers
<BrandHeading level={3} color="accent">
  Advanced Analytics
</BrandHeading>
```

#### Text Usage

```typescript
// Large body text - Introductions and important content
<BrandText size="lg" color="gray-light">
  Discover how C9d.ai can revolutionize your organization's approach to AI.
</BrandText>

// Standard body text - Regular content
<BrandText size="base" color="white">
  Our platform provides comprehensive tools for AI orchestration and management.
</BrandText>

// Small text - Captions and supplementary information
<BrandText size="sm" color="gray-medium">
  Last updated: March 2024
</BrandText>
```

## Layout Guidelines

### Spacing System

#### Consistent Spacing

```typescript
import { spacing } from '@/lib/design-system/tokens'

// Component spacing
const componentStyles = {
  padding: spacing[6],        // 1.5rem - Standard component padding
  margin: spacing[4],         // 1rem - Standard component margin
  gap: spacing[3],           // 0.75rem - Element spacing within components
}

// Layout spacing
const layoutStyles = {
  sectionPadding: spacing[16], // 4rem - Section vertical padding
  containerPadding: spacing[8], // 2rem - Container horizontal padding
  elementGap: spacing[6],      // 1.5rem - Gap between major elements
}
```

#### Spacing Guidelines

**Micro Spacing (1-8px):**
- Use for fine adjustments and tight layouts
- Apply to icon spacing and small element gaps
- Maintain consistency in similar contexts

**Component Spacing (12-24px):**
- Use for padding within components
- Apply to gaps between related elements
- Ensure touch-friendly spacing on mobile

**Layout Spacing (32-64px):**
- Use for section padding and major layout gaps
- Apply to separate distinct content areas
- Scale appropriately for different screen sizes

### Grid System

#### Responsive Grid

```typescript
// Container with responsive sizing
<Container size="lg">
  <Grid columns={{ base: 1, md: 2, lg: 3 }} gap="lg">
    <GridItem>Content 1</GridItem>
    <GridItem>Content 2</GridItem>
    <GridItem>Content 3</GridItem>
  </Grid>
</Container>

// Custom grid layouts
<Grid 
  columns="repeat(auto-fit, minmax(300px, 1fr))"
  gap="md"
  className="feature-grid"
>
  {features.map(feature => (
    <FeatureCard key={feature.id} {...feature} />
  ))}
</Grid>
```

#### Grid Guidelines

**Column Structure:**
- Use 12-column grid for complex layouts
- Apply responsive breakpoints consistently
- Maintain visual balance across columns
- Consider content hierarchy in column sizing

**Gutters and Spacing:**
- Use consistent gutter sizes across layouts
- Scale gutters appropriately for screen size
- Maintain adequate white space for readability
- Align elements to grid for visual consistency

## Animation Guidelines

### Motion Principles

#### Purposeful Animation

```typescript
// Entrance animations - Draw attention to new content
<BrandAnimation type="fadeInUp" delay={200}>
  <BrandCard>New content appearing</BrandCard>
</BrandAnimation>

// Interaction feedback - Confirm user actions
<BrandButton 
  variant="primary"
  animation="pulse"
  onClick={handleSubmit}
>
  Submit Form
</BrandButton>

// Ambient animation - Create engaging atmosphere
<FloatingBlobs 
  count={3}
  colors={['purple', 'pink', 'blue']}
  speed="slow"
/>
```

#### Animation Guidelines

**Duration:**
- Use short durations (200-300ms) for micro-interactions
- Apply medium durations (500-700ms) for content transitions
- Use long durations (1000ms+) for ambient animations

**Easing:**
- Use gentle easing for smooth, natural motion
- Apply bounce easing sparingly for playful interactions
- Use linear easing for continuous animations

**Performance:**
- Prefer transform and opacity properties
- Use hardware acceleration with will-change
- Respect reduced motion preferences
- Test on lower-end devices

### Accessibility in Motion

#### Reduced Motion Support

```typescript
import { useReducedMotion } from '@/hooks/use-reduced-motion'

function ResponsiveAnimation({ children }) {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <BrandAnimation
      type={prefersReducedMotion ? 'none' : 'fadeInUp'}
      duration={prefersReducedMotion ? 0 : 500}
    >
      {children}
    </BrandAnimation>
  )
}
```

## Brand Validation

### Automated Validation

```typescript
import { BrandValidator } from '@/lib/design-system/brand-guidelines'

// Validate color combinations
const validateDesign = (backgroundColor: string, textColor: string) => {
  const contrastCheck = BrandValidator.validateColorContrast(
    backgroundColor,
    textColor,
    'AA'
  )
  
  if (!contrastCheck.valid) {
    console.warn(`Insufficient contrast: ${contrastCheck.ratio}:1`)
    return false
  }
  
  return true
}

// Validate gradient usage
const validateGradient = (gradient: string) => {
  const isValid = BrandValidator.validateGradient(gradient)
  
  if (!isValid) {
    console.warn(`Invalid gradient: ${gradient}`)
    return false
  }
  
  return true
}
```

### Manual Review Checklist

#### Visual Consistency
- [ ] Colors match the defined brand palette
- [ ] Typography follows the established hierarchy
- [ ] Spacing uses the design token system
- [ ] Components follow established patterns

#### Accessibility Compliance
- [ ] Color contrast meets WCAG AA standards
- [ ] Text is readable at all sizes
- [ ] Interactive elements are keyboard accessible
- [ ] Animations respect motion preferences

#### Brand Alignment
- [ ] Visual style reflects brand personality
- [ ] Messaging aligns with brand voice
- [ ] User experience supports brand values
- [ ] Design reinforces brand positioning

## Implementation Standards

### Code Quality

```typescript
// ✅ Good: Using design tokens
const buttonStyles = {
  background: brandGradients.primary.purplePink,
  color: brandColors.neutral.white,
  padding: `${spacing[3]} ${spacing[6]}`,
  borderRadius: borderRadius.lg,
}

// ❌ Avoid: Hardcoded values
const buttonStyles = {
  background: 'linear-gradient(135deg, #7B2CBF 0%, #E71D73 100%)',
  color: '#FFFFFF',
  padding: '0.75rem 1.5rem',
  borderRadius: '0.5rem',
}
```

### Documentation Requirements

Every component should include:

1. **Usage Examples**: Clear code examples showing proper implementation
2. **Accessibility Notes**: WCAG compliance details and testing instructions
3. **Brand Guidelines**: Specific brand usage rules and restrictions
4. **Performance Considerations**: Optimization tips and best practices

### Testing Requirements

```typescript
// Brand compliance testing
describe('Brand Compliance', () => {
  it('uses approved brand colors', () => {
    const { container } = render(<BrandButton variant="primary">Test</BrandButton>)
    const button = container.firstChild
    
    // Verify brand color usage
    expect(button).toHaveStyle({
      background: expect.stringContaining('linear-gradient')
    })
  })
  
  it('meets accessibility standards', async () => {
    const { container } = render(<BrandButton>Accessible Button</BrandButton>)
    const results = await axe(container)
    
    expect(results).toHaveNoViolations()
  })
})
```

## Resources

### Brand Assets
- [Logo Files](./assets/logos/) - SVG, PNG, and vector formats
- [Color Swatches](./assets/colors/) - Palette files for design tools
- [Typography Specimens](./assets/fonts/) - Font files and specimens
- [Icon Library](./assets/icons/) - Brand-compliant iconography

### Design Tools
- **Figma**: Brand component library and design tokens
- **Adobe Creative Suite**: Brand guidelines and asset templates
- **Sketch**: Component library and symbol system
- **Framer**: Interactive prototyping with brand components

### Development Resources
- [Design Token Documentation](./design-tokens.md)
- [Component Library](./component-library.md)
- [Accessibility Guidelines](./accessibility.md)
- [Testing Standards](../testing/component-testing.md)

### External References
- [Brand Strategy Document](./brand-strategy.pdf)
- [Voice and Tone Guidelines](./voice-and-tone.md)
- [Photography Guidelines](./photography-guidelines.md)
- [Video and Motion Guidelines](./video-guidelines.md)