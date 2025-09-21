# Design & UX Agent

## Purpose

This agent specializes in creating consistent, accessible, and beautiful user interfaces using mobile-first design principles and Tailwind CSS best practices for the Coordinated.App application.

## Design System Foundation

### Color Palette

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Primary - Ocean blue
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93bbfd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        // Secondary - Aqua green
        secondary: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        // Semantic colors
        success: {
          light: "#10b981",
          DEFAULT: "#059669",
          dark: "#047857",
        },
        warning: {
          light: "#f59e0b",
          DEFAULT: "#d97706",
          dark: "#b45309",
        },
        danger: {
          light: "#ef4444",
          DEFAULT: "#dc2626",
          dark: "#b91c1c",
        },
      },
    },
  },
};
```

### Typography System

```tsx
// Base typography classes
export const typography = {
  // Headings
  h1: "text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight",
  h2: "text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight",
  h3: "text-xl sm:text-2xl lg:text-3xl font-semibold",
  h4: "text-lg sm:text-xl lg:text-2xl font-medium",
  h5: "text-base sm:text-lg lg:text-xl font-medium",
  h6: "text-sm sm:text-base lg:text-lg font-medium",

  // Body text
  bodyLarge: "text-base sm:text-lg leading-relaxed",
  body: "text-sm sm:text-base leading-relaxed",
  bodySmall: "text-xs sm:text-sm leading-relaxed",

  // Special text
  caption: "text-xs sm:text-sm text-gray-600 dark:text-gray-400",
  overline: "text-xs uppercase tracking-wider font-medium",
};
```

## Component Patterns

### Mobile-First Card Component

```tsx
// components/ui/responsive-card.tsx
interface CardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: "default" | "highlighted" | "interactive";
  className?: string;
}

export function ResponsiveCard({
  title,
  description,
  children,
  variant = "default",
  className,
}: CardProps) {
  const variants = {
    default: "bg-white dark:bg-gray-800",
    highlighted: "bg-primary-50 dark:bg-primary-950 border-primary-200",
    interactive: "bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow cursor-pointer",
  };

  return (
    <div
      className={cn(
        // Base styles - mobile first
        "rounded-lg shadow-md p-4",
        // Tablet and up
        "sm:p-6",
        // Desktop
        "lg:p-8",
        // Variant styles
        variants[variant],
        // Responsive borders
        "border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      <div className="space-y-2 sm:space-y-3">
        <h3 className={typography.h4}>{title}</h3>
        {description && (
          <p className={cn(typography.bodySmall, "text-gray-600 dark:text-gray-400")}>
            {description}
          </p>
        )}
      </div>
      <div className="mt-4 sm:mt-6">{children}</div>
    </div>
  );
}
```

### Responsive Navigation Pattern

```tsx
// components/navigation/responsive-nav.tsx
export function ResponsiveNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 h-16">
          <Logo className="h-8 w-auto" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-0 right-0 bg-white dark:bg-gray-900 shadow-lg"
            >
              <nav className="px-4 py-6 space-y-4">
                {navItems.map((item) => (
                  <MobileNavItem key={item.href} {...item} />
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Logo className="h-8 w-auto" />
              <div className="flex space-x-6">
                {navItems.map((item) => (
                  <DesktopNavItem key={item.href} {...item} />
                ))}
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </nav>
    </>
  );
}
```

### Form Design Pattern

```tsx
// components/forms/responsive-form.tsx
export function ResponsiveForm() {
  return (
    <form className="space-y-4 sm:space-y-6">
      {/* Mobile-optimized input group */}
      <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            className={cn(
              // Base styles
              "w-full rounded-md border-gray-300 shadow-sm",
              // Focus styles
              "focus:border-primary-500 focus:ring-primary-500",
              // Dark mode
              "dark:bg-gray-800 dark:border-gray-600",
              // Touch-friendly sizing
              "px-3 py-2 text-base sm:text-sm",
              // Minimum touch target
              "min-h-[44px]"
            )}
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 px-3 py-2 text-base sm:text-sm min-h-[44px]"
          />
        </div>
      </div>

      {/* Mobile-friendly select */}
      <div>
        <label
          htmlFor="role"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          I am a...
        </label>
        <select
          id="role"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 px-3 py-2 text-base sm:text-sm min-h-[44px]"
        >
          <option>Parent looking for lessons</option>
          <option>Certified swim instructor</option>
        </select>
      </div>

      {/* Submit button - full width on mobile */}
      <button
        type="submit"
        className={cn(
          // Base styles
          "w-full sm:w-auto px-6 py-3 rounded-md font-medium",
          // Colors
          "bg-primary-600 text-white hover:bg-primary-700",
          // Focus styles
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
          // Transitions
          "transition-colors duration-200",
          // Touch target
          "min-h-[44px]"
        )}
      >
        Continue
      </button>
    </form>
  );
}
```

### Loading States

```tsx
// components/ui/loading-states.tsx
export function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 sm:p-6 lg:p-8">
        <div className="space-y-3">
          <div className="h-4 sm:h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
          <div className="h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Mobile: Stack view */}
      <div className="sm:hidden space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden sm:block">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              {[...Array(4)].map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {[...Array(4)].map((_, j) => (
                  <td key={j} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Empty States

```tsx
// components/ui/empty-states.tsx
interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-8 sm:py-12 lg:py-16">
      <Icon className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400" />
      <h3 className={cn(typography.h5, "mt-4 text-gray-900 dark:text-gray-100")}>{title}</h3>
      <p
        className={cn(
          typography.body,
          "mt-2 text-gray-600 dark:text-gray-400 max-w-md mx-auto px-4"
        )}
      >
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

### Error States

```tsx
// components/ui/error-states.tsx
export function ErrorMessage({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 sm:p-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm sm:text-base font-medium text-red-800 dark:text-red-200">
            {title}
          </h3>
          <div className="mt-2 text-xs sm:text-sm text-red-700 dark:text-red-300">
            <p>{message}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-700 dark:hover:text-red-100"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Layout Patterns

### Responsive Grid System

```tsx
// components/layouts/responsive-grid.tsx
export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        // Mobile: Single column
        "grid grid-cols-1 gap-4",
        // Small tablets: 2 columns
        "sm:grid-cols-2 sm:gap-6",
        // Desktop: 3 columns
        "lg:grid-cols-3 lg:gap-8",
        // Large desktop: 4 columns
        "xl:grid-cols-4"
      )}
    >
      {children}
    </div>
  );
}

// Booking cards grid
export function BookingCardsGrid() {
  return (
    <ResponsiveGrid>
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </ResponsiveGrid>
  );
}
```

### Container Pattern

```tsx
// components/layouts/container.tsx
export function Container({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide" | "full";
}) {
  const sizes = {
    narrow: "max-w-4xl",
    default: "max-w-7xl",
    wide: "max-w-screen-2xl",
    full: "max-w-full",
  };

  return (
    <div
      className={cn(
        "mx-auto w-full",
        // Responsive padding
        "px-4 sm:px-6 lg:px-8",
        sizes[size],
        className
      )}
    >
      {children}
    </div>
  );
}
```

## Animation Patterns

### Page Transitions

```tsx
// components/animations/page-transition.tsx
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
```

### Micro-interactions

```tsx
// Hover card lift
export const cardHover =
  "transform transition-all duration-200 hover:-translate-y-1 hover:shadow-lg";

// Button press
export const buttonPress = "transition-all duration-75 active:scale-95";

// Focus ring
export const focusRing =
  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2";

// Smooth color transition
export const colorTransition = "transition-colors duration-200";
```

## Accessibility Patterns

### Skip Navigation

```tsx
// components/a11y/skip-nav.tsx
export function SkipNav() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-md z-50"
    >
      Skip to main content
    </a>
  );
}
```

### Accessible Modal

```tsx
// components/ui/accessible-modal.tsx
export function AccessibleModal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />

          {/* Modal */}
          <div
            className={cn(
              "relative bg-white dark:bg-gray-800 rounded-lg",
              "w-full max-w-md",
              "p-6",
              "shadow-xl"
            )}
          >
            <Dialog.Title className={typography.h4}>{title}</Dialog.Title>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mt-4">{children}</div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
```

## Performance Optimization

### Image Optimization

```tsx
// components/ui/optimized-image.tsx
export function OptimizedImage({ src, alt, priority = false, aspectRatio = "16/9" }: ImageProps) {
  return (
    <div className={`relative w-full aspect-[${aspectRatio}]`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover rounded-lg"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,..."
      />
    </div>
  );
}
```

### Lazy Loading Components

```tsx
// components/ui/lazy-section.tsx
export function LazySection({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <div ref={ref}>
      {inView ? (
        children
      ) : (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
```

## Tailwind Best Practices

### Custom Utilities

```css
/* styles/utilities.css */
@layer utilities {
  /* Text balance for better readability */
  .text-balance {
    text-wrap: balance;
  }

  /* Safe area insets for mobile */
  .safe-top {
    padding-top: env(safe-area-inset-top);
  }

  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Hide scrollbar but keep functionality */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### Component Variants with CVA

```tsx
// lib/utils.ts
import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-600",
        secondary:
          "bg-secondary-600 text-white hover:bg-secondary-700 focus-visible:ring-secondary-600",
        outline:
          "border border-gray-300 bg-transparent hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
        ghost: "hover:bg-gray-100 dark:hover:bg-gray-800",
        danger: "bg-danger text-white hover:bg-danger-dark focus-visible:ring-danger",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);
```

## Testing & Validation

### Visual Regression Testing

```typescript
// tests/visual/components.spec.ts
test.describe("Component Visual Tests", () => {
  test("Button variants", async ({ page }) => {
    await page.goto("/storybook/buttons");
    await expect(page).toHaveScreenshot("buttons-all-variants.png");
  });

  test("Responsive layouts", async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1440, height: 900 }, // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/storybook/layouts");
      await expect(page).toHaveScreenshot(`layout-${viewport.width}.png`);
    }
  });
});
```

### Accessibility Testing

```typescript
// tests/a11y/pages.spec.ts
import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

test.describe("Accessibility Tests", () => {
  test("Homepage accessibility", async ({ page }) => {
    await page.goto("/");
    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });
});
```

## Design Checklist

### Mobile-First Checklist

- [ ] Touch targets are minimum 44x44px
- [ ] Text is readable without zooming (16px minimum)
- [ ] Forms use appropriate input types
- [ ] Navigation is thumb-reachable
- [ ] Content reflows properly on rotation
- [ ] Images are optimized for mobile bandwidth

### Accessibility Checklist

- [ ] Color contrast meets WCAG AA standards
- [ ] All interactive elements have focus states
- [ ] Screen reader announcements are clear
- [ ] Keyboard navigation works throughout
- [ ] ARIA labels are used appropriately
- [ ] Error messages are associated with inputs

### Performance Checklist

- [ ] Images use next/image with proper sizing
- [ ] Fonts are optimized and preloaded
- [ ] CSS is purged of unused styles
- [ ] JavaScript bundles are code-split
- [ ] Animations use CSS transforms
- [ ] Layout shifts are minimized (CLS < 0.1)
