'use client'

import React from 'react'
import FinalCtaSection from '../final-cta-section'
import { FeaturesCTA, SocialProofCTA, TechnicalCTA } from '../section-cta'
import { CTAManager } from '../cta-manager'

interface CTAShowcaseProps {
  userId?: string
  enableFloatingCTA?: boolean
  enableUrgencyScarcity?: boolean
}

/**
 * CTAShowcase - Example component demonstrating the enhanced CTA system
 * 
 * This component shows how to integrate multiple CTA sections with:
 * - Context-specific CTAs for different page sections
 * - A/B testing capabilities
 * - Urgency and scarcity indicators
 * - Floating CTAs based on user engagement
 * - Comprehensive analytics tracking
 */
export function CTAShowcase({ 
  userId, 
  enableFloatingCTA = true, 
  enableUrgencyScarcity = false 
}: CTAShowcaseProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-windsurf-purple-deep to-c9n-blue-dark">
      {/* Hero Section with CTA */}
      <section data-section="hero" className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-6xl font-bold text-white mb-6">
            Enhanced CTA System
          </h1>
          <p className="text-xl text-windsurf-gray-light mb-8">
            Demonstrating multiple strategic CTAs with conversion optimization
          </p>
        </div>
      </section>

      {/* Features Section with Context-Specific CTA */}
      <section data-section="features" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Features Section
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-windsurf-purple-deep/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">A/B Testing</h3>
              <p className="text-windsurf-gray-light">
                Built-in A/B testing for CTA variants with statistical significance tracking
              </p>
            </div>
            <div className="bg-windsurf-purple-deep/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">Analytics</h3>
              <p className="text-windsurf-gray-light">
                Comprehensive tracking with Vercel Analytics and Google Analytics 4
              </p>
            </div>
            <div className="bg-windsurf-purple-deep/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">Engagement</h3>
              <p className="text-windsurf-gray-light">
                Smart floating CTAs based on scroll behavior and user engagement
              </p>
            </div>
          </div>
        </div>
        <FeaturesCTA userId={userId} />
      </section>

      {/* Social Proof Section with Context-Specific CTA */}
      <section data-section="social-proof" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Social Proof Section
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-c9n-blue-dark/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">Urgency Indicators</h3>
              <p className="text-windsurf-gray-light">
                Countdown timers and limited-time offers to drive immediate action
              </p>
            </div>
            <div className="bg-c9n-blue-dark/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">Scarcity Elements</h3>
              <p className="text-windsurf-gray-light">
                Limited spots and beta access indicators with progress bars
              </p>
            </div>
          </div>
        </div>
        <SocialProofCTA userId={userId} />
      </section>

      {/* Technical Section with Context-Specific CTA */}
      <section data-section="technical" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Technical Section
          </h2>
          <div className="bg-windsurf-blue-electric/10 p-8 rounded-lg mb-16">
            <h3 className="text-2xl font-semibold text-white mb-4">Developer Features</h3>
            <ul className="text-windsurf-gray-light space-y-2">
              <li>• TypeScript interfaces for type safety</li>
              <li>• Modular component architecture</li>
              <li>• Comprehensive test coverage</li>
              <li>• Performance optimized animations</li>
              <li>• Accessibility compliant (WCAG 2.1 AA)</li>
            </ul>
          </div>
        </div>
        <TechnicalCTA userId={userId} />
      </section>

      {/* Final CTA Section with Urgency/Scarcity */}
      <FinalCtaSection 
        userId={userId}
        enableUrgency={enableUrgencyScarcity}
        enableScarcity={enableUrgencyScarcity}
      />

      {/* CTA Manager for Floating CTAs */}
      <CTAManager 
        userId={userId}
        enableFloatingCTA={enableFloatingCTA}
        enableEngagementTracking={true}
      />
    </div>
  )
}

export default CTAShowcase