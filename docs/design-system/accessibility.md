# Accessibility Guidelines

The C9d.ai design system is built with accessibility as a core principle, ensuring that all users can effectively interact with our platform regardless of their abilities or the assistive technologies they use.

## Overview

Our accessibility approach follows the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards and includes:

- **Universal Design**: Components work for all users by default
- **Semantic HTML**: Proper markup for screen readers and assistive technologies
- **Keyboard Navigation**: Full functionality without a mouse
- **Color Contrast**: Sufficient contrast ratios for visual accessibility
- **Motion Sensitivity**: Respect for user motion preferences
- **Focus Management**: Clear focus indicators and logical tab order

## WCAG 2.1 Compliance

### Level AA Requirements

All components meet WCAG 2.1 Level AA standards:

#### Perceivable
- **Color Contrast**: Minimum 4.5:1 ratio for normal text, 3:1 for large text
- **Text Alternatives**: Alt text for images and meaningful content
- **Adaptable Content**: Proper heading hierarchy and semantic structure
- **Distinguishable**: Content doesn't rely solely on color to convey meaning

#### Operable
- **Keyboard Accessible**: All functionality available via keyboard
- **No Seizures**: No content flashes more than 3 times per second
- **Navigable**: Clear navigation and focus management
- **Input Modalities**: Support for various input methods

#### Understandable
- **Readable**: Clear language and consistent terminology
- **Predictable**: Consistent navigation and interaction patterns
- **Input Assistance**: Clear error messages and form validation

#### Robust
- **Compatible**: Works with assistive technologies
- **Valid Code**: Semantic HTML and proper ARIA usage

## Color and Contrast

### Contrast Validation

All color combinations are automatically validated:

```typescript
import { BrandValidator } from '@/lib/design-system/brand-guidelines'

// Validate text on background
const contrastCheck = BrandValidator.validateColorContrast(
  brandColors.secondary.blue.dark,  // Background
  brandColors.neutral.white,        // Text
  'AA'                             // WCAG level
)

console.log(contrastCheck.valid)  // true
console.log(contrastCheck.ratio)  // 12.63 (exceeds 4.5:1 requirement)
```

### Approved Color Combinations

#### High Contrast (AAA Level - 7:1+)
```typescript
// White text on dark backgrounds
brandColors.neutral.white + brandColors.secondary.blue.dark     // 12.63:1
brandColors.neutral.white + brandColors.primary.purple.deep     // 11.24:1
brandColors.neutral.white + brandColors.neutral.gray[900]       // 19.56:1

// Dark text on light backgrounds  
brandColors.secondary.blue.dark + brandColors.neutral.white     // 12.63:1
brandColors.primary.purple.deep + brandColors.neutral.offWhite  // 10.89:1
```

#### Standard Contrast (AA Level - 4.5:1+)
```typescript
// Light text on medium backgrounds
brandColors.neutral.gray.light + brandColors.secondary.blue.mid  // 5.12:1
brandColors.neutral.white + brandColors.primary.purple.vibrant   // 4.87:1

// Medium text on light backgrounds
brandColors.neutral.gray.dark + brandColors.neutral.offWhite     // 6.23:1
brandColors.secondary.blue.dark + brandColors.accent.yellow[50]  // 8.45:1
```

### Color Usage Guidelines

```typescript
// ✅ Good: Sufficient contrast
<BrandText color="white" background={brandColors.secondary.blue.dark}>
  Accessible text with 12.63:1 contrast ratio
</BrandText>

// ✅ Good: Alternative indicators beyond color
<BrandAlert variant="error" title="Error" icon={<ErrorIcon />}>
  Uses icon and text, not just red color
</BrandAlert>

// ❌ Avoid: Insufficient contrast
<BrandText color="gray-medium" background={brandColors.neutral.gray.light}>
  Poor contrast - only 2.1:1 ratio
</BrandText>

// ❌ Avoid: Color-only information
<span style={{ color: 'red' }}>Required field</span>
// Better: Include text or icon indicator
<span style={{ color: 'red' }}>* Required field</span>
```

## Keyboard Navigation

### Focus Management

All interactive elements support keyboard navigation:

```typescript
// Automatic focus management in modals
<BrandModal isOpen={isOpen} onClose={handleClose}>
  {/* Focus automatically moves to modal content */}
  <BrandButton onClick={handleAction}>
    Primary Action
  </BrandButton>
  {/* Focus returns to trigger element on close */}
</BrandModal>

// Custom focus management
const buttonRef = useRef<HTMLButtonElement>(null)

useEffect(() => {
  if (shouldFocus) {
    buttonRef.current?.focus()
  }
}, [shouldFocus])

<BrandButton ref={buttonRef} onKeyDown={handleKeyDown}>
  Focusable Button
</BrandButton>
```

### Keyboard Shortcuts

Standard keyboard interactions are supported:

- **Tab**: Navigate forward through interactive elements
- **Shift + Tab**: Navigate backward through interactive elements
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals, dropdowns, and overlays
- **Arrow Keys**: Navigate within menus and lists
- **Home/End**: Jump to first/last item in lists

### Focus Indicators

Clear focus indicators are provided for all interactive elements:

```css
/* Automatic focus styles */
.brand-button:focus-visible {
  outline: 2px solid var(--color-accent-yellow);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.2);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .brand-button:focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 3px;
  }
}
```

## Screen Reader Support

### Semantic HTML

Components use proper semantic markup:

```typescript
// ✅ Good: Semantic structure
<BrandCard as="article" role="article">
  <BrandHeading level={2}>Article Title</BrandHeading>
  <BrandText>Article content...</BrandText>
  <BrandButton>Read More</BrandButton>
</BrandCard>

// ✅ Good: Proper form structure
<form>
  <BrandInput 
    label="Email Address"
    type="email"
    required
    aria-describedby="email-help"
  />
  <BrandText id="email-help" size="sm">
    We'll never share your email address
  </BrandText>
</form>
```

### ARIA Labels and Descriptions

Comprehensive ARIA support for complex interactions:

```typescript
// Loading states
<BrandButton loading aria-label="Submitting form, please wait">
  Submit
</BrandButton>

// Expandable content
<BrandButton 
  aria-expanded={isExpanded}
  aria-controls="expandable-content"
  onClick={toggleExpanded}
>
  {isExpanded ? 'Hide' : 'Show'} Details
</BrandButton>

// Status announcements
<div role="status" aria-live="polite">
  {statusMessage}
</div>

// Error announcements
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

### Screen Reader Testing

Components are tested with popular screen readers:

- **NVDA** (Windows)
- **JAWS** (Windows)
- **VoiceOver** (macOS/iOS)
- **TalkBack** (Android)

```typescript
// Screen reader optimized content
<BrandButton aria-label="Delete item: Project Alpha">
  <TrashIcon aria-hidden="true" />
  Delete
</BrandButton>

// Hidden content for screen readers
<span className="sr-only">
  Current page: Dashboard
</span>
```

## Motion and Animation

### Reduced Motion Support

All animations respect user motion preferences:

```typescript
import { useReducedMotion } from '@/hooks/use-reduced-motion'

function AnimatedComponent() {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <BrandAnimation 
      type={prefersReducedMotion ? 'none' : 'fadeInUp'}
      duration={prefersReducedMotion ? 0 : 500}
    >
      <BrandCard>Animated content</BrandCard>
    </BrandAnimation>
  )
}

// CSS implementation
@media (prefers-reduced-motion: reduce) {
  .brand-animation {
    animation: none !important;
    transition: none !important;
  }
}
```

### Safe Animation Guidelines

- **Duration**: Keep animations under 5 seconds
- **Frequency**: Avoid rapid flashing (max 3 flashes per second)
- **Parallax**: Provide option to disable parallax scrolling
- **Auto-play**: Provide controls for auto-playing content

```typescript
// Safe animation implementation
<BrandAnimation
  type="gentleFloat"
  duration={25000}  // 25 seconds - slow and gentle
  reduceMotion={true}  // Respects user preference
>
  <FloatingBlob />
</BrandAnimation>
```

## Form Accessibility

### Label Association

All form inputs have proper labels:

```typescript
// Explicit label association
<BrandInput
  id="user-email"
  label="Email Address"
  type="email"
  required
  aria-describedby="email-error email-help"
/>

// Error and help text association
<BrandText id="email-help" size="sm">
  Enter your work email address
</BrandText>

{emailError && (
  <BrandText id="email-error" color="error" size="sm" role="alert">
    {emailError}
  </BrandText>
)}
```

### Validation and Error Handling

Clear, accessible error messages:

```typescript
// Form validation with accessibility
<form onSubmit={handleSubmit} noValidate>
  <BrandInput
    label="Password"
    type="password"
    value={password}
    onChange={setPassword}
    error={passwordError}
    aria-invalid={!!passwordError}
    aria-describedby="password-requirements password-error"
  />
  
  <BrandText id="password-requirements" size="sm">
    Must be at least 8 characters with uppercase, lowercase, and numbers
  </BrandText>
  
  {passwordError && (
    <BrandAlert 
      variant="error" 
      id="password-error"
      role="alert"
      aria-live="polite"
    >
      {passwordError}
    </BrandAlert>
  )}
</form>
```

### Fieldset and Legend

Group related form controls:

```typescript
<fieldset>
  <legend>Contact Preferences</legend>
  
  <BrandCheckbox
    label="Email notifications"
    checked={emailNotifications}
    onChange={setEmailNotifications}
  />
  
  <BrandCheckbox
    label="SMS notifications"
    checked={smsNotifications}
    onChange={setSmsNotifications}
  />
</fieldset>
```

## Testing Accessibility

### Automated Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'
import { render } from '@testing-library/react'

expect.extend(toHaveNoViolations)

describe('BrandButton Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <BrandButton variant="primary">Test Button</BrandButton>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
  
  it('supports keyboard navigation', () => {
    const handleClick = jest.fn()
    render(<BrandButton onClick={handleClick}>Test</BrandButton>)
    
    const button = screen.getByRole('button')
    
    // Test keyboard activation
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(handleClick).toHaveBeenCalled()
    
    fireEvent.keyDown(button, { key: ' ' })
    expect(handleClick).toHaveBeenCalledTimes(2)
  })
})
```

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] All interactive elements are reachable via Tab
- [ ] Tab order is logical and intuitive
- [ ] Focus indicators are clearly visible
- [ ] Escape key closes modals and dropdowns
- [ ] Arrow keys work in menus and lists

#### Screen Reader Testing
- [ ] All content is announced correctly
- [ ] Form labels are associated properly
- [ ] Error messages are announced
- [ ] Status changes are communicated
- [ ] Images have appropriate alt text

#### Color and Contrast
- [ ] Text meets minimum contrast ratios
- [ ] Information isn't conveyed by color alone
- [ ] High contrast mode is supported
- [ ] Color blind users can distinguish elements

#### Motion and Animation
- [ ] Animations respect reduced motion preference
- [ ] No content flashes more than 3 times per second
- [ ] Auto-playing content has controls
- [ ] Parallax effects can be disabled

### Testing Tools

#### Browser Extensions
- **axe DevTools**: Automated accessibility scanning
- **WAVE**: Web accessibility evaluation
- **Lighthouse**: Performance and accessibility auditing
- **Colour Contrast Analyser**: Color contrast checking

#### Screen Readers
- **NVDA**: Free Windows screen reader
- **VoiceOver**: Built-in macOS/iOS screen reader
- **JAWS**: Professional Windows screen reader
- **TalkBack**: Android screen reader

#### Keyboard Testing
- **Tab Navigation**: Test with Tab and Shift+Tab only
- **Keyboard Only**: Disconnect mouse and navigate entirely with keyboard
- **Voice Control**: Test with voice navigation software

## Implementation Guidelines

### Component Development

When creating new components:

1. **Start with semantic HTML**
2. **Add ARIA attributes as needed**
3. **Implement keyboard navigation**
4. **Test with screen readers**
5. **Validate color contrast**
6. **Support reduced motion**

```typescript
// Accessibility-first component development
export const AccessibleComponent = forwardRef<HTMLButtonElement, Props>(
  ({ children, disabled, loading, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-label={loading ? 'Loading, please wait' : undefined}
        {...props}
      >
        {loading && <span aria-hidden="true">⏳</span>}
        {children}
      </button>
    )
  }
)
```

### Design Considerations

- **Touch Targets**: Minimum 44px for touch interfaces
- **Spacing**: Adequate spacing between interactive elements
- **Typography**: Readable font sizes and line heights
- **Layout**: Logical reading order and visual hierarchy

### Content Guidelines

- **Plain Language**: Use clear, simple language
- **Headings**: Proper heading hierarchy (h1 → h2 → h3)
- **Links**: Descriptive link text (avoid "click here")
- **Images**: Meaningful alt text or decorative markup

## Resources

### Standards and Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Section 508 Standards](https://www.section508.gov/)

### Testing Resources
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Keyboard Navigation Testing](https://webaim.org/techniques/keyboard/)

### Tools and Libraries
- [axe-core](https://github.com/dequelabs/axe-core) - Accessibility testing engine
- [jest-axe](https://github.com/nickcolley/jest-axe) - Jest integration for axe
- [react-aria](https://react-spectrum.adobe.com/react-aria/) - Accessibility primitives
- [focus-trap-react](https://github.com/focus-trap/focus-trap-react) - Focus management

### Learning Resources
- [WebAIM](https://webaim.org/) - Web accessibility training and resources
- [A11y Project](https://www.a11yproject.com/) - Community-driven accessibility resources
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/) - Design philosophy
- [Accessibility Developer Guide](https://www.accessibility-developer-guide.com/) - Practical implementation guide