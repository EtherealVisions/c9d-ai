"use client"

import React from "react"
import { UsersIcon, BriefcaseIcon, ZapIcon, TrendingUpIcon, ClockIcon, StarIcon } from "lucide-react"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"

interface Stat {
  value: number
  suffix: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

const stats: Stat[] = [
  {
    value: 1000000,
    suffix: "+",
    label: "Active Users",
    description: "Trusted by over a million innovators, creators, and teams worldwide.",
    icon: UsersIcon,
    color: "text-windsurf-yellow-bright",
    bgColor: "bg-windsurf-yellow-bright/10"
  },
  {
    value: 4000,
    suffix: "+",
    label: "Enterprise Customers",
    description: "Trusted by startups, agencies, and enterprises worldwide.",
    icon: BriefcaseIcon,
    color: "text-windsurf-pink-hot",
    bgColor: "bg-windsurf-pink-hot/10"
  },
  {
    value: 94,
    suffix: "%",
    label: "Code Written by AI",
    description: "Our AI removes the vast amounts of time spent on boilerplate and menial tasks.",
    icon: ZapIcon,
    color: "text-windsurf-green-lime",
    bgColor: "bg-windsurf-green-lime/10"
  },
  {
    value: 300,
    suffix: "%",
    label: "Productivity Increase",
    description: "Average productivity boost reported by our enterprise customers.",
    icon: TrendingUpIcon,
    color: "text-windsurf-blue-electric",
    bgColor: "bg-windsurf-blue-electric/10"
  },
  {
    value: 75,
    suffix: "%",
    label: "Time Saved",
    description: "Reduction in development time for routine tasks and workflows.",
    icon: ClockIcon,
    color: "text-c9n-teal",
    bgColor: "bg-c9n-teal/10"
  },
  {
    value: 4.9,
    suffix: "/5",
    label: "Customer Rating",
    description: "Average satisfaction score from thousands of user reviews.",
    icon: StarIcon,
    color: "text-windsurf-yellow-bright",
    bgColor: "bg-windsurf-yellow-bright/10"
  }
]

export default function StatsSection() {
  const { elementRef, shouldAnimate } = useIntersectionObserver({ threshold: 0.3 })

  return (
    <section 
      ref={elementRef}
      className="py-16 md:py-24 bg-windsurf-purple-deep relative overflow-hidden"
    >
      {/* Enhanced diagonal gradient elements */}
      <div className="absolute -top-1/4 -left-1/4 w-1/2 h-[150%] transform -skew-x-12 bg-gradient-to-br from-windsurf-yellow-bright/30 via-windsurf-pink-hot/20 to-transparent opacity-50 blur-3xl animate-gentle-float-1"></div>
      <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-[150%] transform skew-x-12 bg-gradient-to-tl from-windsurf-green-lime/30 via-c9n-teal/20 to-transparent opacity-50 blur-3xl animate-gentle-float-2"></div>
      
      {/* Additional floating elements */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-windsurf-blue-electric/20 to-transparent rounded-full blur-2xl animate-gentle-float-3"></div>
      <div className="absolute bottom-1/3 right-1/3 w-24 h-24 bg-gradient-to-tl from-c9n-teal/20 to-transparent rounded-full blur-2xl animate-gentle-float-1"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="flex items-center justify-center mb-4">
            <span className="w-3 h-3 bg-windsurf-yellow-bright rounded-sm mr-2"></span>
            <p className="text-sm font-semibold uppercase tracking-wider text-windsurf-yellow-bright">Performance Metrics</p>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Trusted by Developers.{" "}
            <span className="block sm:inline bg-clip-text text-transparent bg-gradient-to-r from-windsurf-yellow-bright to-windsurf-green-lime">
              Proven in Enterprises.
            </span>
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Real metrics from real customers showing the transformative impact of C9N.AI
          </p>
        </div>

        {/* Stats Grid */}
        <div className="bg-windsurf-pink-light/90 backdrop-blur-sm p-8 md:p-12 rounded-2xl shadow-2xl max-w-6xl mx-auto border border-windsurf-pink-hot/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon
              return (
                <div 
                  key={stat.label} 
                  className={`text-center group hover:scale-105 transition-all duration-300 ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-center mb-4">
                    <div className={`p-4 rounded-full ${stat.bgColor} mr-4 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className={`h-8 w-8 ${stat.color}`} />
                    </div>
                    <div className="text-left">
                      <div className="text-4xl lg:text-5xl font-bold text-windsurf-purple-deep">
                        {shouldAnimate ? (
                          <AnimatedCounter 
                            value={stat.value} 
                            suffix={stat.suffix}
                            duration={2000}
                          />
                        ) : (
                          `${stat.value}${stat.suffix}`
                        )}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-windsurf-pink-hot mb-2 group-hover:text-windsurf-purple-deep transition-colors duration-300">
                    {stat.label}
                  </h3>
                  <p className="text-sm text-windsurf-purple-deep/70 leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Additional Social Proof */}
        <div className="mt-16 text-center">
          <div className={`transition-all duration-700 ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '600ms' }}>
            <p className="text-white/60 text-sm mb-4">Join thousands of satisfied customers</p>
            <div className="flex justify-center items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="h-5 w-5 text-windsurf-yellow-bright fill-current" />
              ))}
            </div>
            <p className="text-white/80 text-lg font-medium">
              4.9/5 average rating from 10,000+ reviews
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
