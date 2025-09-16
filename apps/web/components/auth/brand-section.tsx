import React from 'react'
import { C9nLogo } from '@/components/icons'

/**
 * BrandSection component displays the C9d.ai brand identity
 * on the authentication pages with visual elements and messaging.
 * 
 * Features:
 * - Animated gradient background
 * - Brand logo and messaging
 * - Responsive design
 * - Accessibility compliant
 */
export function BrandSection() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 animated-gradient-bg" />
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0">
        {/* Floating Circle 1 */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-windsurf-teal/20 animate-gentle-float-1" />
        
        {/* Floating Circle 2 */}
        <div className="absolute top-3/4 right-1/4 w-24 h-24 rounded-full bg-windsurf-pink-hot/20 animate-gentle-float-2" />
        
        {/* Floating Circle 3 */}
        <div className="absolute top-1/2 left-1/2 w-20 h-20 rounded-full bg-windsurf-yellow-bright/20 animate-gentle-float-3" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full p-8 lg:p-12">
        <div className="max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <C9nLogo className="text-white text-4xl" />
          </div>

          {/* Main Heading */}
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
            Welcome to the Future of AI-Powered Development
          </h2>

          {/* Description */}
          <p className="text-lg text-white/90 mb-8 leading-relaxed">
            Join thousands of developers who are building the next generation 
            of applications with our intelligent development platform.
          </p>

          {/* Feature List */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-c9n-teal" />
              <span className="text-white/90">AI-powered code generation</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-windsurf-pink-hot" />
              <span className="text-white/90">Intelligent project management</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-windsurf-yellow-bright" />
              <span className="text-white/90">Seamless team collaboration</span>
            </div>
          </div>

          {/* Quote */}
          <blockquote className="mt-8 border-l-4 border-c9n-teal pl-4">
            <p className="text-white/80 italic">
              "C9d.ai has transformed how we approach software development. 
              It's like having an AI pair programmer that never sleeps."
            </p>
            <footer className="mt-2 text-sm text-white/60">
              — Sarah Chen, Lead Developer
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  )
}