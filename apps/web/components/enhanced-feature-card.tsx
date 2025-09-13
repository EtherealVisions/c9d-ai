"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, InfoIcon } from "lucide-react"
import InteractiveCard from "./interactive-card"

export interface FeatureCardData {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  benefits: string[]
  technicalSpecs?: string[]
  useCases?: string[]
  bgColor: string
  textColor: string
  borderColor: string
  glowColor: string
  gradientFrom: string
  gradientTo: string
}

interface EnhancedFeatureCardProps {
  feature: FeatureCardData
  index: number
  onOpenModal: (feature: FeatureCardData) => void
  shouldAnimate: boolean
}

export default function EnhancedFeatureCard({
  feature,
  index,
  onOpenModal,
  shouldAnimate,
}: EnhancedFeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <InteractiveCard
      className={cn(
        "group relative p-8 rounded-xl shadow-2xl border-2 flex flex-col items-start transition-all duration-700 ease-out transform",
        feature.borderColor,
        feature.bgColor,
        feature.textColor,
        // Animation classes
        shouldAnimate
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8",
        // Hover effects
        "hover:scale-105 hover:-translate-y-2 hover:shadow-3xl",
        // Staggered animation delay
        shouldAnimate && `delay-${Math.min(index * 100, 500)}`
      )}
      glowColor={feature.glowColor}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 150}ms`,
      }}
    >
      {/* Gradient overlay for enhanced visual appeal */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
          isHovered && "opacity-20"
        )}
        style={{
          background: `linear-gradient(135deg, ${feature.gradientFrom}, ${feature.gradientTo})`,
        }}
      />

      {/* Icon container with enhanced styling */}
      <div
        className={cn(
          "relative z-10 mb-5 p-3 rounded-lg transition-all duration-300",
          "bg-black/20 group-hover:bg-black/30",
          isHovered && "scale-110 rotate-3"
        )}
      >
        {feature.icon}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1">
        <h3 className="text-2xl font-semibold mb-3 group-hover:text-white transition-colors duration-300">
          {feature.title}
        </h3>
        <p className="text-sm opacity-90 leading-relaxed mb-4">
          {feature.description}
        </p>

        {/* Benefits preview */}
        {feature.benefits && feature.benefits.length > 0 && (
          <ul className="text-xs opacity-75 mb-6 space-y-1">
            {feature.benefits.slice(0, 2).map((benefit, idx) => (
              <li key={idx} className="flex items-center">
                <span className="w-1 h-1 bg-current rounded-full mr-2" />
                {benefit}
              </li>
            ))}
            {feature.benefits.length > 2 && (
              <li className="text-xs opacity-60">
                +{feature.benefits.length - 2} more benefits
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Action buttons */}
      <div className="relative z-10 flex gap-2 mt-auto w-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenModal(feature)}
          className={cn(
            "flex-1 text-xs transition-all duration-300",
            "hover:bg-white/20 hover:text-white",
            isHovered && "bg-white/10"
          )}
        >
          <InfoIcon className="w-3 h-3 mr-1" />
          Learn More
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "px-3 transition-all duration-300",
            "hover:bg-white/20 hover:text-white",
            isHovered && "bg-white/10 translate-x-1"
          )}
        >
          <ArrowRightIcon className="w-3 h-3" />
        </Button>
      </div>

      {/* Animated border effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl border-2 border-transparent transition-all duration-300",
          isHovered && "border-white/30"
        )}
        style={{
          background: isHovered
            ? `linear-gradient(${feature.bgColor}, ${feature.bgColor}) padding-box, linear-gradient(135deg, ${feature.gradientFrom}, ${feature.gradientTo}) border-box`
            : undefined,
        }}
      />
    </InteractiveCard>
  )
}