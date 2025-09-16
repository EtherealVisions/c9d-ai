import React from 'react'
import { cn } from '@/lib/utils'
import { BrandSection } from './brand-section'

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}

/**
 * AuthLayout component provides a responsive layout for authentication pages
 * with brand integration and proper accessibility features.
 * 
 * Features:
 * - Responsive design with mobile-first approach
 * - Brand section with C9d.ai visual identity
 * - Proper ARIA labels and semantic HTML
 * - Smooth animations and transitions
 */
export function AuthLayout({ 
  children, 
  title, 
  subtitle, 
  className 
}: AuthLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen flex flex-col lg:flex-row",
      "bg-background",
      className
    )}>
      {/* Brand Section - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:flex lg:flex-1 lg:relative">
        <BrandSection />
      </div>

      {/* Authentication Form Section */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <span className="text-2xl font-bold text-primary">C9</span>
            </div>
          </div>

          {/* Title and Subtitle */}
          {(title || subtitle) && (
            <div className="text-center space-y-2">
              {title && (
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm sm:text-base text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Authentication Form Content */}
          <div 
            className="space-y-6"
            role="main"
            aria-label="Authentication form"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}