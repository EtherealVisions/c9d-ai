"use client"

import React from "react"
import { CheckIcon, XIcon, StarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"

interface ComparisonFeature {
  name: string
  c9d: boolean | "premium" | "enterprise"
  competitor1: boolean | "limited"
  competitor2: boolean | "limited"
  description?: string
}

const comparisonData: ComparisonFeature[] = [
  {
    name: "AI Agent Orchestration",
    c9d: true,
    competitor1: "limited",
    competitor2: false,
    description: "Coordinate multiple AI agents for complex workflows"
  },
  {
    name: "Real-time Analytics",
    c9d: true,
    competitor1: true,
    competitor2: "limited",
    description: "Live data processing and insights"
  },
  {
    name: "Custom Model Integration",
    c9d: "premium",
    competitor1: "limited",
    competitor2: false,
    description: "Integrate your own trained models"
  },
  {
    name: "Enterprise Security",
    c9d: true,
    competitor1: true,
    competitor2: "limited",
    description: "SOC 2 Type II compliance and encryption"
  },
  {
    name: "API Rate Limits",
    c9d: "enterprise",
    competitor1: "limited",
    competitor2: "limited",
    description: "Unlimited API calls for enterprise plans"
  },
  {
    name: "Multi-tenant Architecture",
    c9d: true,
    competitor1: false,
    competitor2: "limited",
    description: "Isolated environments for different teams"
  },
  {
    name: "Advanced Workflow Builder",
    c9d: true,
    competitor1: "limited",
    competitor2: false,
    description: "Visual workflow designer with conditional logic"
  },
  {
    name: "24/7 Support",
    c9d: "premium",
    competitor1: "limited",
    competitor2: false,
    description: "Round-the-clock technical support"
  }
]

const FeatureCell = ({ 
  value, 
  isC9d = false 
}: { 
  value: boolean | "premium" | "enterprise" | "limited"
  isC9d?: boolean 
}) => {
  if (value === true) {
    return (
      <div className={cn(
        "flex items-center justify-center p-2",
        isC9d && "bg-c9n-teal/10 rounded-lg"
      )}>
        <CheckIcon className={cn(
          "w-5 h-5",
          isC9d ? "text-c9n-teal" : "text-windsurf-green-lime"
        )} />
      </div>
    )
  }
  
  if (value === "premium" || value === "enterprise") {
    return (
      <div className={cn(
        "flex items-center justify-center p-2",
        isC9d && "bg-windsurf-purple-vibrant/10 rounded-lg"
      )}>
        <div className="flex items-center gap-1">
          <StarIcon className={cn(
            "w-4 h-4",
            isC9d ? "text-windsurf-purple-vibrant" : "text-windsurf-yellow-bright"
          )} />
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              isC9d 
                ? "border-windsurf-purple-vibrant/50 text-windsurf-purple-vibrant" 
                : "border-windsurf-yellow-bright/50 text-windsurf-yellow-bright"
            )}
          >
            {value}
          </Badge>
        </div>
      </div>
    )
  }
  
  if (value === "limited") {
    return (
      <div className="flex items-center justify-center p-2">
        <Badge variant="outline" className="text-xs border-windsurf-gray-medium/50 text-windsurf-gray-medium">
          Limited
        </Badge>
      </div>
    )
  }
  
  return (
    <div className="flex items-center justify-center p-2">
      <XIcon className="w-5 h-5 text-windsurf-gray-medium" />
    </div>
  )
}

export default function FeatureComparisonMatrix() {
  const { elementRef, shouldAnimate } = useIntersectionObserver({
    threshold: 0.2,
    triggerOnce: true
  })

  return (
    <section 
      ref={elementRef}
      className="py-16 md:py-24 bg-c9n-blue-mid"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className={cn(
            "text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4 transition-all duration-700",
            shouldAnimate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            Why Choose{" "}
            <span className="bg-clip-text text-transparent bg-purple-pink-gradient">
              C9d.ai
            </span>
            ?
          </h2>
          <p className={cn(
            "text-lg text-windsurf-gray-light max-w-2xl mx-auto transition-all duration-700 delay-200",
            shouldAnimate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            See how C9d.ai compares to other AI platforms in the market
          </p>
        </div>

        <div className={cn(
          "bg-c9n-blue-dark rounded-xl border border-windsurf-gray-medium/20 overflow-hidden transition-all duration-700 delay-400",
          shouldAnimate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          {/* Header */}
          <div className="grid grid-cols-4 bg-windsurf-purple-deep/50 border-b border-windsurf-gray-medium/20">
            <div className="p-4 font-semibold text-white">Features</div>
            <div className="p-4 text-center">
              <div className="font-semibold text-c9n-teal mb-1">C9d.ai</div>
              <Badge className="bg-c9n-teal text-c9n-blue-dark text-xs">
                Our Platform
              </Badge>
            </div>
            <div className="p-4 text-center font-semibold text-windsurf-gray-light">
              Competitor A
            </div>
            <div className="p-4 text-center font-semibold text-windsurf-gray-light">
              Competitor B
            </div>
          </div>

          {/* Feature rows */}
          {comparisonData.map((feature, index) => (
            <div
              key={feature.name}
              className={cn(
                "grid grid-cols-4 border-b border-windsurf-gray-medium/10 hover:bg-windsurf-purple-deep/20 transition-colors duration-200",
                index % 2 === 0 && "bg-windsurf-purple-deep/10"
              )}
            >
              <div className="p-4">
                <div className="font-medium text-white mb-1">{feature.name}</div>
                {feature.description && (
                  <div className="text-xs text-windsurf-gray-light opacity-75">
                    {feature.description}
                  </div>
                )}
              </div>
              <FeatureCell value={feature.c9d} isC9d={true} />
              <FeatureCell value={feature.competitor1} />
              <FeatureCell value={feature.competitor2} />
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className={cn(
          "text-center mt-8 transition-all duration-700 delay-600",
          shouldAnimate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <p className="text-windsurf-gray-light mb-4">
            Ready to experience the C9d.ai advantage?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-6 py-3 bg-purple-pink-gradient text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
              Start Free Trial
            </button>
            <button className="px-6 py-3 border border-windsurf-gray-medium/50 text-windsurf-gray-light hover:bg-windsurf-gray-medium/10 rounded-lg transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}