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
  const { isTouchDevice, isHighContrast } = useAccessibility()

  // Set page title for screen readers
  useEffect(() => {
    if (title) {
      document.title = `${title} - C9d.ai`
    }
  }, [title])

  return (
    <div 
      className={cn(
        "min-h-screen flex flex-col lg:flex-row",
        "bg-background",
        // Touch device enhancements
        isTouchDevice && "touch-device",
        // High contrast support
        isHighContrast && "high-contrast",
        className
      )}
      role="document"
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
        className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8"
        role="main"
      >
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Logo */}
          <header className="lg:hidden text-center mb-8">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"
              role="img"
              aria-label="C9d.ai logo"
            >
              <span className="text-2xl font-bold text-primary" aria-hidden="true">
                C9
              </span>
            </div>
            <h1 className="sr-only">C9d.ai Authentication</h1>
          </header>

          {/* Page Title and Subtitle */}
          {(title || subtitle) && (
            <header className="text-center space-y-2">
              {title && (
                <h1 
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                  id="page-title"
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p 
                  className="text-sm sm:text-base text-muted-foreground"
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
              "space-y-6",
              // Touch spacing for mobile devices
              isTouchDevice && "touch-spacing"
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
          <footer className="text-center">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Need help? Press Alt+H for accessibility options
              </p>
              <p className="sr-only">
                This form supports keyboard navigation. Use Tab to move between fields, 
                Enter to submit, and Escape to clear the form.
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