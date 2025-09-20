'use client'

import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { BrandSection } from './brand-section'
import { SkipLink } from '@/components/ui/accessible-form'
import { useAccessibility } from '@/contexts/accessibility-context'

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}

/**
 * AuthLayout component provides a responsive, accessible layout for authentication pages
 * with brand integration and comprehensive accessibility features.
 * 
 * Features:
 * - Responsive design with mobile-first approach
 * - Brand section with C9d.ai visual identity
 * - WCAG 2.1 AA compliant structure and navigation
 * - Proper ARIA labels and semantic HTML
 * - Skip links for keyboard navigation
 * - High contrast mode support
 * - Touch device optimizations
 * - Screen reader friendly structure
 */
export function AuthLayout({ 
  children, 
  title, 
  subtitle, 
  className 
}: AuthLayoutProps) {
  const { isTouchDevice, isHighContrast, prefersReducedMotion } = useAccessibility()

  // Set page title for screen readers
  useEffect(() => {
    if (title) {
      document.title = `${title} - C9d.ai`
    }
  }, [title])

  // Handle viewport height for mobile browsers
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    
    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)
    
    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [])

  return (
    <div 
      className={cn(
        // Mobile-first responsive layout
        "min-h-screen flex flex-col lg:flex-row",
        "bg-background safe-area-inset",
        // Mobile optimizations
        "auth-layout-mobile mobile-keyboard-aware",
        // Touch device enhancements
        isTouchDevice && "touch-device",
        // High contrast support
        isHighContrast && "high-contrast",
        // Reduced motion support
        prefersReducedMotion && "reduce-motion",
        className
      )}
      role="document"
      style={{
        minHeight: 'calc(var(--vh, 1vh) * 100)'
      }}
    >
      {/* Skip Links */}
      <SkipLink href="#main-content">
        Skip to main content
      </SkipLink>
      <SkipLink href="#auth-form">
        Skip to authentication form
      </SkipLink>

      {/* Brand Section - Hidden on mobile, shown on desktop */}
      <aside 
        className="hidden lg:flex lg:flex-1 lg:relative"
        role="complementary"
        aria-label="Brand information and features"
      >
        <BrandSection />
      </aside>

      {/* Authentication Form Section */}
      <main 
        id="main-content"
        className={cn(
          "flex-1 flex items-center justify-center",
          // Mobile-first responsive padding
          "p-4 xs:p-6 sm:p-6 lg:p-8",
          // Mobile form container
          "form-container"
        )}
        role="main"
      >
        <div className={cn(
          "w-full max-w-md space-y-6",
          // Mobile optimizations
          "mobile-form gpu-accelerated"
        )}>
          {/* Mobile Brand Logo */}
          <header className="lg:hidden text-center mb-6 sm:mb-8">
            <div 
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-primary/10 mb-4",
                // Responsive logo sizing
                "w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16",
                // Touch feedback
                "touch-feedback"
              )}
              role="img"
              aria-label="C9d.ai logo"
            >
              <span className={cn(
                "font-bold text-primary",
                // Responsive text sizing
                "text-lg xs:text-xl sm:text-2xl"
              )} aria-hidden="true">
                C9
              </span>
            </div>
            <h1 className="sr-only">C9d.ai Authentication</h1>
          </header>

          {/* Page Title and Subtitle */}
          {(title || subtitle) && (
            <header className="text-center space-y-2 sm:space-y-3">
              {title && (
                <h1 
                  className={cn(
                    "font-bold tracking-tight text-foreground",
                    // Mobile-first responsive text sizing
                    "text-xl xs:text-2xl sm:text-3xl"
                  )}
                  id="page-title"
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p 
                  className={cn(
                    "text-muted-foreground leading-relaxed",
                    // Mobile-first responsive text sizing
                    "text-sm xs:text-base sm:text-base"
                  )}
                  id="page-subtitle"
                  aria-describedby={title ? "page-title" : undefined}
                >
                  {subtitle}
                </p>
              )}
            </header>
          )}

          {/* Authentication Form Content */}
          <section 
            id="auth-form"
            className={cn(
              // Mobile-first responsive spacing
              "space-y-4 xs:space-y-5 sm:space-y-6",
              // Touch spacing for mobile devices
              isTouchDevice && "touch-spacing",
              // Performance optimization
              "will-change-transform"
            )}
            role="region"
            aria-labelledby={title ? "page-title" : "auth-form-heading"}
          >
            {!title && (
              <h2 id="auth-form-heading" className="sr-only">
                Authentication Form
              </h2>
            )}
            {children}
          </section>

          {/* Footer with accessibility info */}
          <footer className="text-center safe-area-bottom">
            <div className={cn(
              "text-muted-foreground space-y-1",
              // Mobile-first responsive text sizing
              "text-xs xs:text-xs sm:text-sm"
            )}>
              <p>
                Need help? {isTouchDevice ? 'Tap' : 'Press Alt+H'} for accessibility options
              </p>
              <p className="sr-only">
                This form supports {isTouchDevice ? 'touch and ' : ''}keyboard navigation. 
                {isTouchDevice ? 'Tap to interact with elements, or use ' : 'Use '}
                Tab to move between fields, Enter to submit, and Escape to clear the form.
              </p>
            </div>
          </footer>
        </div>
      </main>

      {/* Live region for global announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="global-announcements"
      />
    </div>
  )
}