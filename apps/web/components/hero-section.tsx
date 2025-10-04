import React from "react"
import { Button } from "@/components/ui/button"
import { CalendarCheckIcon, CheckCircleIcon } from "lucide-react"
import Link from "next/link"
import { trackHeroInteraction, trackCTA } from "@/lib/analytics/events"

export default function HeroSection() {
  return (
    <section data-testid="hero-section" className="relative bg-c9n-blue-dark py-20 md:py-32 lg:py-40">
      {/* Vibrant, relaxing dynamic background */}
      {/* Changed z-index from -z-10 to z-0 for the blob container.
          This places blobs above the section's background but below the z-10 content. */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute bottom-[-20%] left-[-15%] w-[28rem] h-[28rem] sm:w-[32rem] sm:h-[32rem] bg-windsurf-pink-hot/25 rounded-full filter blur-2xl opacity-50 animate-gentle-float-1" />
        <div className="absolute top-[-25%] right-[-20%] w-[32rem] h-[32rem] sm:w-[36rem] sm:h-[36rem] bg-windsurf-blue-electric/20 rounded-full filter blur-3xl opacity-40 animate-gentle-float-2" />
        <div className="absolute bottom-[5%] right-[10%] w-[24rem] h-[24rem] sm:w-[28rem] sm:h-[28rem] bg-windsurf-yellow-bright/20 rounded-full filter blur-2xl opacity-35 animate-gentle-float-3" />
      </div>

      {/* Content container, should be above the blobs */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Unlock Deeper Insights.{" "}
            <span className="block sm:inline bg-clip-text text-transparent bg-yellow-lime-gradient">Effortlessly.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-windsurf-gray-light max-w-2xl mx-auto">
            C9D.AI leverages advanced AI to analyze and coordinate disparate, opaque relationships, bringing you
            relevant information and insights.
          </p>
          <div className="mt-10 flex items-center justify-center">
            <Button
              size="lg"
              className="bg-windsurf-pink-hot text-white hover:bg-opacity-90 font-semibold w-full sm:w-auto max-w-xs shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-3 px-8 text-lg"
              onClick={() => {
                trackHeroInteraction('cta_click')
                trackCTA('hero', 'click', 'Request a Consultation', '/request-consultation')
              }}
              asChild
            >
              <Link href="/request-consultation">
                <CalendarCheckIcon className="mr-2 h-5 w-5" />
                Request a Consultation
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center text-sm text-windsurf-gray-light">
            <CheckCircleIcon className="mr-2 h-5 w-5 text-c9n-teal" /> {/* Changed to c9n-teal for defined color */}
            Better analysis, better coordination, clearer insights.
          </div>
        </div>
      </div>
    </section>
  )
}
