"use client"

import React from "react"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Star, Award, Shield, CheckCircle } from "lucide-react"
import { MobileCarousel } from "@/components/ui/mobile-carousel"
import { ProgressiveImage } from "@/components/ui/progressive-image"
import { PerformanceAnimation, StaggeredAnimation } from "@/components/ui/performance-animations"
import { useMobileOptimized } from "@/hooks/use-mobile-optimized"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { cn } from "@/lib/utils"

interface Testimonial {
  id: string
  quote: string
  author: string
  title: string
  company: string
  avatar: string
  rating: number
  industry: string
  useCase: string
  featured?: boolean
}

interface CustomerLogo {
  id: string
  name: string
  logo: string
  industry: string
}

interface TrustIndicator {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  type: 'security' | 'compliance' | 'award'
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    quote: "Every single one of our analysts has to spend literally just one day making projects with C9N.AI and it will be like they strapped on rocket boosters.",
    author: "G. Analytex",
    title: "President & CEO",
    company: "Insight Corp",
    avatar: "/ceo-profile.png",
    rating: 5,
    industry: "Analytics",
    useCase: "Data Analysis Acceleration",
    featured: true
  },
  {
    id: "2",
    quote: "C9N.AI transformed our development workflow. What used to take weeks now takes days, and the quality has never been better.",
    author: "Dr. Sarah Chen",
    title: "CTO",
    company: "TechFlow Solutions",
    avatar: "/female-data-scientist-avatar.png",
    rating: 5,
    industry: "Technology",
    useCase: "Development Acceleration"
  },
  {
    id: "3",
    quote: "The AI orchestration capabilities are game-changing. We've automated 80% of our routine tasks and can focus on innovation.",
    author: "Marcus Rodriguez",
    title: "Head of Operations",
    company: "InnovateLab",
    avatar: "/male-tech-professional-avatar.png",
    rating: 5,
    industry: "Research",
    useCase: "Process Automation"
  },
  {
    id: "4",
    quote: "Implementation was seamless, and the ROI was immediate. Our team productivity increased by 300% in the first month.",
    author: "Dr. Kenji Tanaka",
    title: "Research Director",
    company: "Future Systems Inc",
    avatar: "/asian-male-researcher-avatar.png",
    rating: 5,
    industry: "Enterprise",
    useCase: "Team Productivity"
  }
]

const customerLogos: CustomerLogo[] = [
  { id: "1", name: "Insight Corp", logo: "/modern-company-logo-abstract.png", industry: "Analytics" },
  { id: "2", name: "TechFlow Solutions", logo: "/modern-abstract-logo.png", industry: "Technology" },
  { id: "3", name: "InnovateLab", logo: "/placeholder-logo.png", industry: "Research" },
  { id: "4", name: "Future Systems", logo: "/modern-company-logo-abstract.png", industry: "Enterprise" }
]

const trustIndicators: TrustIndicator[] = [
  {
    id: "1",
    name: "SOC 2 Compliant",
    icon: Shield,
    description: "Enterprise-grade security standards",
    type: "security"
  },
  {
    id: "2",
    name: "ISO 27001 Certified",
    icon: CheckCircle,
    description: "International security management",
    type: "compliance"
  },
  {
    id: "3",
    name: "AI Excellence Award",
    icon: Award,
    description: "Industry recognition for innovation",
    type: "award"
  }
]

export default function TestimonialSection() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const { elementRef, shouldAnimate } = useIntersectionObserver({ threshold: 0.2 })
  const { 
    isMobile, 
    isTablet, 
    reducedMotion, 
    performanceMode,
    isTouch 
  } = useMobileOptimized()

  // Auto-rotate testimonials
  useEffect(() => {
    if (!autoRotate) return

    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRotate])

  const handleTestimonialChange = (index: number) => {
    setCurrentTestimonial(index)
    setAutoRotate(false)
    // Resume auto-rotate after 10 seconds of manual interaction
    setTimeout(() => setAutoRotate(true), 10000)
  }

  return (
    <section 
      ref={elementRef}
      className="py-16 md:py-24 bg-windsurf-pink-light relative overflow-hidden"
    >
      {/* Enhanced geometric pattern with animation */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pinkGrid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(231, 29, 115, 0.2)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pinkGrid)" />
        </svg>
      </div>

      {/* Floating gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-windsurf-pink-hot/20 to-windsurf-purple-deep/10 rounded-full blur-3xl animate-gentle-float-1" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/3 h-1/3 bg-gradient-to-tl from-windsurf-yellow-bright/20 to-windsurf-pink-hot/10 rounded-full blur-3xl animate-gentle-float-2" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="flex items-center justify-center mb-4">
            <span className="w-3 h-3 bg-windsurf-pink-hot rounded-sm mr-2"></span>
            <p className="text-sm font-semibold uppercase tracking-wider text-windsurf-pink-hot">Customer Success</p>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-windsurf-purple-deep mb-4">
            Trusted by <span className="text-windsurf-pink-hot">Industry Leaders</span>
          </h2>
          <p className="text-lg text-windsurf-purple-deep/70 max-w-2xl mx-auto">
            See how organizations across industries are transforming their workflows with C9N.AI
          </p>
        </div>

        {/* Featured Testimonial Carousel with Mobile Optimization */}
        <div className="max-w-4xl mx-auto mb-16">
          <PerformanceAnimation
            animation="slideUp"
            trigger="scroll"
            threshold={0.2}
            config={{ duration: 700 }}
          >
            <MobileCarousel
              autoPlay={!reducedMotion}
              autoPlayDelay={6000}
              showArrows={!isMobile}
              showDots={true}
              enableTouch={isTouch}
              itemsPerView={{ mobile: 1, tablet: 1, desktop: 1 }}
              className="testimonial-carousel"
              onSlideChange={setCurrentTestimonial}
            >
              {testimonials.map((testimonial, index) => (
                <div key={testimonial.id} className="w-full">
                  <div className={cn(
                    "bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-windsurf-pink-hot/20",
                    // Mobile-first responsive padding
                    "p-6 sm:p-8 md:p-12"
                  )}>
                    <div className={cn(
                      "flex items-center gap-6 sm:gap-8",
                      // Mobile-first responsive layout
                      "flex-col md:flex-row"
                    )}>
                      <div className="flex-shrink-0">
                        <ProgressiveImage
                          src={testimonial.avatar}
                          alt={testimonial.author}
                          width={isMobile ? 80 : 120}
                          height={isMobile ? 80 : 120}
                          className={cn(
                            "rounded-full border-4 border-windsurf-pink-hot/20 shadow-lg",
                            // Mobile-optimized sizing
                            isMobile ? "w-20 h-20" : "w-30 h-30"
                          )}
                          priority={index === 0}
                          enableProgressiveLoading={performanceMode === 'high'}
                        />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        {/* Rating Stars */}
                        <div className="flex justify-center md:justify-start mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={cn(
                                "text-windsurf-yellow-bright fill-current",
                                isMobile ? "h-4 w-4" : "h-5 w-5"
                              )} 
                            />
                          ))}
                        </div>
                        
                        <blockquote className={cn(
                          "font-medium text-windsurf-purple-deep leading-relaxed mb-6",
                          // Mobile-first responsive text sizing
                          "text-lg sm:text-xl md:text-2xl",
                          // Optimize line height for mobile
                          isMobile && "leading-[1.4]"
                        )}>
                          "{testimonial.quote}"
                        </blockquote>
                        
                        <div className="space-y-2">
                          <p className={cn(
                            "font-semibold text-windsurf-pink-hot",
                            isMobile ? "text-base" : "text-lg"
                          )}>
                            {testimonial.author}
                          </p>
                          <p className={cn(
                            "text-windsurf-purple-deep/70",
                            isMobile ? "text-sm" : "text-sm"
                          )}>
                            {testimonial.title}, {testimonial.company}
                          </p>
                          <div className={cn(
                            "flex flex-wrap gap-2 mt-3",
                            "justify-center md:justify-start"
                          )}>
                            <span className="px-3 py-1 bg-windsurf-pink-hot/10 text-windsurf-pink-hot text-xs font-medium rounded-full">
                              {testimonial.industry}
                            </span>
                            <span className="px-3 py-1 bg-windsurf-blue-electric/10 text-windsurf-blue-electric text-xs font-medium rounded-full">
                              {testimonial.useCase}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </MobileCarousel>
          </PerformanceAnimation>
        </div>

        {/* Customer Logos with Mobile Optimization */}
        <div className="mb-16">
          <PerformanceAnimation
            animation="fadeIn"
            trigger="scroll"
            threshold={0.3}
          >
            <p className={cn(
              "text-center font-medium text-windsurf-purple-deep/60 mb-8",
              isMobile ? "text-sm" : "text-sm"
            )}>
              Trusted by leading organizations worldwide
            </p>
          </PerformanceAnimation>
          
          <StaggeredAnimation
            animation="slideUp"
            staggerDelay={100}
            trigger="scroll"
            threshold={0.2}
            className={cn(
              "flex flex-wrap justify-center items-center opacity-60 hover:opacity-80 transition-opacity duration-300",
              // Mobile-first responsive gaps
              "gap-6 sm:gap-8 md:gap-12"
            )}
          >
            {customerLogos.map((logo, index) => (
              <div key={logo.id} className="flex-shrink-0">
                <ProgressiveImage
                  src={logo.logo}
                  alt={`${logo.name} logo`}
                  width={isMobile ? 100 : 120}
                  height={isMobile ? 50 : 60}
                  className={cn(
                    "object-contain filter grayscale hover:grayscale-0 transition-all duration-300",
                    // Mobile-optimized sizing
                    isMobile ? "h-10 w-auto" : "h-12 w-auto"
                  )}
                  loading="lazy"
                  enableProgressiveLoading={performanceMode === 'high'}
                />
              </div>
            ))}
          </StaggeredAnimation>
        </div>

        {/* Trust Indicators with Mobile Optimization */}
        <div className="max-w-4xl mx-auto">
          <StaggeredAnimation
            animation="slideUp"
            staggerDelay={150}
            trigger="scroll"
            threshold={0.2}
            className={cn(
              "grid gap-6",
              // Mobile-first responsive grid
              "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            )}
          >
            {trustIndicators.map((indicator, index) => {
              const IconComponent = indicator.icon
              return (
                <div 
                  key={indicator.id}
                  className={cn(
                    "bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-windsurf-gray-light/20 text-center hover:shadow-xl transition-all duration-300",
                    // Mobile-first responsive padding
                    "p-4 sm:p-6",
                    reducedMotion && "transition-none"
                  )}
                >
                  <div className={cn(
                    "inline-flex rounded-full mb-4",
                    // Mobile-optimized icon sizing
                    isMobile ? "p-2" : "p-3",
                    indicator.type === 'security' ? 'bg-windsurf-blue-electric/10 text-windsurf-blue-electric' :
                    indicator.type === 'compliance' ? 'bg-windsurf-green-lime/10 text-windsurf-green-lime' :
                    'bg-windsurf-yellow-bright/10 text-windsurf-yellow-bright'
                  )}>
                    <IconComponent className={cn(
                      isMobile ? "h-5 w-5" : "h-6 w-6"
                    )} />
                  </div>
                  <h3 className={cn(
                    "font-semibold text-windsurf-purple-deep mb-2",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    {indicator.name}
                  </h3>
                  <p className={cn(
                    "text-windsurf-purple-deep/70",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {indicator.description}
                  </p>
                </div>
              )
            })}
          </StaggeredAnimation>
        </div>
      </div>
    </section>
  )
}