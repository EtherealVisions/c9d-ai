"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { CalendarCheckIcon, CheckCircleIcon } from "lucide-react"
import Link from "next/link"
import { trackHeroInteraction, trackCTA } from "@/lib/analytics/events"

export default function HeroSection() {
  return (
    <section data-testid="hero-section" className="relative bg-gradient-to-b from-dify-bg-primary via-dify-bg-secondary to-dify-bg-primary py-24 md:py-32 lg:py-40 overflow-hidden">
      {/* Subtle gradient orbs for depth */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-dify-gradient-radial opacity-20 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-gradient-radial from-dify-accent-secondary to-transparent opacity-10 blur-3xl" />
      </div>

      {/* Content container, should be above the blobs */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Unlock Deeper Insights.{" "}
            <span className="block sm:inline bg-clip-text text-transparent bg-gradient-to-r from-dify-accent-primary to-dify-accent-secondary">Effortlessly.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-dify-text-secondary max-w-2xl mx-auto">
            C9D.AI leverages advanced AI to analyze and coordinate disparate, opaque relationships, bringing you
            relevant information and insights.
          </p>
          <div className="mt-10 flex items-center justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-dify-accent-primary to-dify-accent-secondary text-white hover:opacity-90 font-medium w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 py-3 px-8 text-base"
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
          <div className="mt-8 flex items-center justify-center text-sm text-dify-text-muted">
            <CheckCircleIcon className="mr-2 h-5 w-5 text-dify-accent-success" />
            Better analysis, better coordination, clearer insights.
          </div>
        </div>
      </div>
    </section>
  )
}
