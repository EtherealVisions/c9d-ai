"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon } from "lucide-react"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { cn } from "@/lib/utils"

type FeatureHighlightSectionProps = {
  title: string
  description: string
  subFeatureTitle: string
  subFeatureDescription: string
  ctaText: string
  ctaLink: string
  imageUrl: string
  imageAlt: string
  reverseLayout?: boolean
}

export default function FeatureHighlightSection({
  title,
  description,
  subFeatureTitle,
  subFeatureDescription,
  ctaText,
  ctaLink,
  imageUrl,
  imageAlt,
  reverseLayout = false,
}: FeatureHighlightSectionProps) {
  const { elementRef, shouldAnimate } = useIntersectionObserver({
    threshold: 0.2,
    triggerOnce: true
  })

  return (
    <section ref={elementRef} className="py-16 md:py-24 bg-c9n-blue-mid relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-windsurf-purple-deep/20 via-transparent to-c9n-teal/10 animate-gradient-wave" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div
          className={cn(
            "flex flex-col lg:flex-row items-center gap-12 lg:gap-16",
            reverseLayout ? "lg:flex-row-reverse" : ""
          )}
        >
          <div className="lg:w-1/2">
            <h2 className={cn(
              "text-3xl sm:text-4xl font-bold tracking-tight text-white mb-6 transition-all duration-700",
              shouldAnimate ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            )}>
              {title}
            </h2>
            <p className={cn(
              "text-lg text-windsurf-gray-light mb-8 transition-all duration-700 delay-200",
              shouldAnimate ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            )}>
              {description}
            </p>
            <div className={cn(
              "bg-c9n-blue-dark/80 backdrop-blur-sm p-6 rounded-lg shadow-xl mb-8 border border-c9n-teal/20 transition-all duration-700 delay-400 hover:border-c9n-teal/40 hover:shadow-2xl hover:shadow-c9n-teal/10",
              shouldAnimate ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            )}>
              <h3 className="text-xl font-semibold text-c9n-teal mb-3 flex items-center">
                <span className="w-2 h-2 bg-c9n-teal rounded-full mr-3 animate-pulse" />
                {subFeatureTitle}
              </h3>
              <p className="text-windsurf-gray-light">{subFeatureDescription}</p>
            </div>
            <Button
              asChild
              size="lg"
              className={cn(
                "bg-purple-pink-gradient hover:opacity-90 text-white font-semibold transition-all duration-700 delay-600 hover:scale-105 hover:shadow-lg hover:shadow-windsurf-pink-hot/25",
                shouldAnimate ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
              )}
            >
              <Link href={ctaLink}>
                {ctaText}
                <ArrowRightIcon className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
          <div className="lg:w-1/2">
            <div className={cn(
              "relative transition-all duration-700 delay-300 hover:scale-105",
              shouldAnimate ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            )}>
              {/* Glowing border effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-windsurf-purple-vibrant via-windsurf-pink-hot to-c9n-teal rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-1000" />
              <div className="relative">
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt={imageAlt}
                  width={600}
                  height={400}
                  className="rounded-lg shadow-2xl object-cover border border-windsurf-gray-medium/20"
                />
                {/* Overlay gradient for better integration */}
                <div className="absolute inset-0 bg-gradient-to-t from-c9n-blue-dark/20 via-transparent to-transparent rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
