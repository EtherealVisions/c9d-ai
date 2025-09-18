'use client'

import React from 'react'
import { C9nLogo } from '@/components/icons'
import { useAccessibility } from '@/contexts/accessibility-context'
import { cn } from '@/lib/utils'

/**
 * BrandSection component displays the C9d.ai brand identity
 * on the authentication pages with visual elements and messaging.
 * 
 * Features:
 * - Animated gradient background with reduced motion support
 * - Brand logo and messaging with proper semantic structure
 * - Responsive design with touch accommodations
 * - WCAG 2.1 AA accessibility compliance
 * - High contrast mode support
 * - Screen reader friendly content structure
 */
export function BrandSection() {
  const { prefersReducedMotion, isHighContrast } = useAccessibility()

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      role="banner"
      aria-label="C9d.ai brand showcase"
    >
      {/* Animated Background */}
      <div 
        className={cn(
          "absolute inset-0 animated-gradient-bg",
          prefersReducedMotion && "reduce-motion"
        )}
        aria-hidden="true"
      />
      
      {/* Overlay for better text readability */}
      <div 
        className="absolute inset-0 bg-black/20"
        aria-hidden="true"
      />
      
      {/* Floating Elements - Hidden from screen readers */}
      <div 
        className="absolute inset-0"
        aria-hidden="true"
      >
        {/* Floating Circle 1 */}
        <div className={cn(
          "absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-windsurf-teal/20",
          !prefersReducedMotion && "animate-gentle-float-1"
        )} />
        
        {/* Floating Circle 2 */}
        <div className={cn(
          "absolute top-3/4 right-1/4 w-24 h-24 rounded-full bg-windsurf-pink-hot/20",
          !prefersReducedMotion && "animate-gentle-float-2"
        )} />
        
        {/* Floating Circle 3 */}
        <div className={cn(
          "absolute top-1/2 left-1/2 w-20 h-20 rounded-full bg-windsurf-yellow-bright/20",
          !prefersReducedMotion && "animate-gentle-float-3"
        )} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full p-8 lg:p-12">
        <div className="max-w-md">
          {/* Logo */}
          <header className="mb-8">
            <C9nLogo 
              className="text-white text-4xl" 
              role="img"
              aria-label="C9d.ai logo"
            />
          </header>

          {/* Main Content */}
          <main>
            {/* Main Heading */}
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
              Welcome to the Future of AI-Powered Development
            </h1>

            {/* Description */}
            <p className="text-lg text-white/90 mb-8 leading-relaxed">
              Join thousands of developers who are building the next generation 
              of applications with our intelligent development platform.
            </p>

            {/* Feature List */}
            <section aria-labelledby="features-heading">
              <h2 id="features-heading" className="sr-only">
                Key Features
              </h2>
              <ul className="space-y-4" role="list">
                <li className="flex items-center space-x-3">
                  <div 
                    className="w-2 h-2 rounded-full bg-c9n-teal" 
                    aria-hidden="true"
                  />
                  <span className="text-white/90">AI-powered code generation</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div 
                    className="w-2 h-2 rounded-full bg-windsurf-pink-hot" 
                    aria-hidden="true"
                  />
                  <span className="text-white/90">Intelligent project management</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div 
                    className="w-2 h-2 rounded-full bg-windsurf-yellow-bright" 
                    aria-hidden="true"
                  />
                  <span className="text-white/90">Seamless team collaboration</span>
                </li>
              </ul>
            </section>

            {/* Testimonial */}
            <aside className="mt-8" aria-labelledby="testimonial-heading">
              <h2 id="testimonial-heading" className="sr-only">
                Customer Testimonial
              </h2>
              <blockquote 
                className="border-l-4 border-c9n-teal pl-4"
                cite="Sarah Chen, Lead Developer"
              >
                <p className="text-white/80 italic">
                  "C9d.ai has transformed how we approach software development. 
                  It's like having an AI pair programmer that never sleeps."
                </p>
                <footer className="mt-2 text-sm text-white/60">
                  <cite>— Sarah Chen, Lead Developer</cite>
                </footer>
              </blockquote>
            </aside>
          </main>
        </div>
      </div>

      {/* Bottom Gradient Fade - Decorative */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent"
        aria-hidden="true"
      />
    </div>
  )
}