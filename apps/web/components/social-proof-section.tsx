"use client"

import React from "react"
import Image from "next/image"
import { TwitterIcon, LinkedinIcon, MessageSquareIcon, ExternalLinkIcon, CheckCircle } from "lucide-react"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"

interface SocialTestimonial {
  id: string
  name: string
  handle: string
  quote: string
  avatarUrl: string
  platform: 'twitter' | 'linkedin' | 'review'
  highlight: boolean
  verified?: boolean
  followerCount?: string
  postUrl?: string
}

const testimonials: SocialTestimonial[] = [
  {
    id: "1",
    name: "Dr. Eva Rostova",
    handle: "@eva_analytics",
    quote: "C9N.AI is one of the best AI analysis tools I've ever used. Game changer for my research workflow.",
    avatarUrl: "/female-data-scientist-avatar.png",
    platform: "twitter",
    highlight: false,
    verified: true,
    followerCount: "12.5K",
    postUrl: "#"
  },
  {
    id: "2",
    name: "Marcus Chen",
    handle: "@datamarcus",
    quote: "C9N.AI is simply better from my experience over the last month. The speed and accuracy are unmatched.",
    avatarUrl: "/placeholder-vhfca.png",
    platform: "twitter",
    highlight: false,
    verified: false,
    followerCount: "8.2K",
    postUrl: "#"
  },
  {
    id: "3",
    name: "Innovate Solutions Ltd.",
    handle: "Leading Tech Firm",
    quote: "C9N.AI UX beats competitors. Just click 'analyze' - it keeps our team active and focused on what matters.",
    avatarUrl: "/modern-abstract-logo.png",
    platform: "linkedin",
    highlight: true,
    verified: true,
    followerCount: "25K",
    postUrl: "#"
  },
  {
    id: "4",
    name: "Dr. Kenji Tanaka",
    handle: "@kenji_insights",
    quote: "I've been building a new model with C9N.AI and I spent the last hour in almost hysterical laughter because the insights are just so good.",
    avatarUrl: "/asian-male-researcher-avatar.png",
    platform: "twitter",
    highlight: false,
    verified: true,
    followerCount: "15.8K",
    postUrl: "#"
  },
  {
    id: "5",
    name: "Sarah Kim",
    handle: "Product Manager",
    quote: "Our entire team adopted C9N.AI within a week. The productivity gains are immediately visible.",
    avatarUrl: "/female-data-scientist-avatar.png",
    platform: "review",
    highlight: false,
    verified: false,
    postUrl: "#"
  },
  {
    id: "6",
    name: "Alex Rodriguez",
    handle: "@alexdev",
    quote: "Finally, an AI tool that actually understands context. C9N.AI has transformed how we approach complex problems.",
    avatarUrl: "/male-tech-professional-avatar.png",
    platform: "twitter",
    highlight: false,
    verified: true,
    followerCount: "9.7K",
    postUrl: "#"
  }
]

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'twitter':
      return TwitterIcon
    case 'linkedin':
      return LinkedinIcon
    case 'review':
      return MessageSquareIcon
    default:
      return MessageSquareIcon
  }
}

const getPlatformColor = (platform: string) => {
  switch (platform) {
    case 'twitter':
      return 'text-blue-400 hover:text-blue-500'
    case 'linkedin':
      return 'text-blue-600 hover:text-blue-700'
    case 'review':
      return 'text-windsurf-pink-hot hover:text-windsurf-purple-deep'
    default:
      return 'text-windsurf-gray-medium'
  }
}

export default function SocialProofSection() {
  const { elementRef, shouldAnimate } = useIntersectionObserver({ threshold: 0.2 })

  return (
    <section 
      ref={elementRef}
      className="py-16 md:py-24 bg-windsurf-off-white text-windsurf-purple-deep relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-1/4 w-1/3 h-1/3 bg-gradient-to-br from-windsurf-blue-electric/10 to-transparent rounded-full blur-3xl animate-gentle-float-1" />
        <div className="absolute bottom-1/3 -right-1/4 w-1/4 h-1/4 bg-gradient-to-tl from-windsurf-pink-hot/10 to-transparent rounded-full blur-3xl animate-gentle-float-2" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="mb-12 md:mb-16">
          <div className="flex items-center justify-center mb-4">
            <span className="w-3 h-3 bg-windsurf-blue-electric rounded-sm mr-2"></span>
            <p className="text-sm font-semibold uppercase tracking-wider text-windsurf-blue-electric">Social Proof</p>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-windsurf-purple-deep text-center mb-4">
            Loved by <span className="text-windsurf-pink-hot">Developers</span> Worldwide
          </h2>
          <p className="text-lg text-windsurf-purple-deep/70 max-w-2xl mx-auto text-center">
            See what the community is saying about C9N.AI across social media and review platforms
          </p>
        </div>

        {/* Testimonials Grid with Masonry Layout */}
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {testimonials.map((testimonial, index) => {
            const PlatformIcon = getPlatformIcon(testimonial.platform)
            const platformColor = getPlatformColor(testimonial.platform)
            
            return (
              <div
                key={testimonial.id}
                className={`break-inside-avoid bg-white p-6 rounded-xl shadow-lg border transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] group ${
                  testimonial.highlight
                    ? "border-windsurf-blue-electric shadow-windsurf-blue-electric/20 ring-2 ring-windsurf-blue-electric/20"
                    : "border-windsurf-gray-light hover:border-windsurf-pink-hot/50"
                } ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Platform indicator for highlighted posts */}
                {testimonial.highlight && (
                  <div className="absolute -top-2 -right-2 bg-windsurf-blue-electric text-white text-xs px-2 py-1 rounded-full font-medium">
                    Featured
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Image
                        src={testimonial.avatarUrl || "/placeholder.svg"}
                        alt={testimonial.name}
                        width={48}
                        height={48}
                        className="rounded-full border-2 border-windsurf-gray-light group-hover:border-windsurf-pink-hot transition-colors duration-300"
                      />
                      {testimonial.verified && (
                        <CheckCircle className="absolute -bottom-1 -right-1 h-4 w-4 text-blue-500 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-windsurf-purple-deep truncate">{testimonial.name}</h4>
                      <p className="text-xs text-windsurf-gray-medium group-hover:text-windsurf-pink-hot transition-colors duration-300 truncate">
                        {testimonial.handle}
                      </p>
                      {testimonial.followerCount && (
                        <p className="text-xs text-windsurf-gray-medium/70">
                          {testimonial.followerCount} followers
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <PlatformIcon className={`h-5 w-5 ${platformColor} transition-colors duration-300`} />
                    {testimonial.postUrl && (
                      <a 
                        href={testimonial.postUrl}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLinkIcon className="h-4 w-4 text-windsurf-gray-medium hover:text-windsurf-pink-hot" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Quote */}
                <blockquote className="text-sm text-windsurf-purple-deep/90 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>

                {/* Engagement indicators */}
                <div className="mt-4 flex items-center gap-4 text-xs text-windsurf-gray-medium">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    {Math.floor(Math.random() * 50) + 10} likes
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {Math.floor(Math.random() * 20) + 5} shares
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-16 ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '800ms' }}>
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-windsurf-gray-light/20 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-windsurf-purple-deep mb-4">
              Join the Conversation
            </h3>
            <p className="text-windsurf-purple-deep/70 mb-6">
              Share your C9N.AI experience and connect with our growing community
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a 
                href="#" 
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 transition-colors duration-300"
              >
                <TwitterIcon className="h-4 w-4" />
                Follow on Twitter
              </a>
              <a 
                href="#" 
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-full text-sm font-medium hover:bg-blue-800 transition-colors duration-300"
              >
                <LinkedinIcon className="h-4 w-4" />
                Connect on LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}