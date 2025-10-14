"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, GitHubLogoIcon } from "@radix-ui/react-icons"
import Link from "next/link"
import { trackHeroInteraction, trackCTA } from "@/lib/analytics/events"

export default function HeroSection() {
  return (
    <section data-testid="hero-section" className="relative bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 md:py-28 lg:py-32">
          {/* Top announcement/release bar */}
          <div className="flex justify-center mb-8">
            <Link
              href="/blog/release-v1.5"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dify-blue-light text-dify-blue text-sm font-medium hover:bg-blue-100 transition-colors"
              onClick={() => trackHeroInteraction('release_banner_click')}
            >
              <span className="text-xs bg-dify-blue text-white px-2 py-0.5 rounded">Release v1.5.1</span>
              Visual Knowledge Pipeline - Make Your Enterprise Data LLM-Ready
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          {/* Main hero content */}
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-dify-gray-900 tracking-tight">
              Build Production-Ready
              <br />
              <span className="text-dify-gray-900">Agentic Workflow</span>
            </h1>

            {/* GitHub stars badge */}
            <div className="flex items-center justify-center gap-2 mt-6 mb-8">
              <GitHubLogoIcon className="w-5 h-5 text-dify-gray-600" />
              <span className="text-dify-gray-600">
                <span className="font-semibold text-dify-gray-900">116.4k</span> stars on{" "}
                <Link href="https://github.com/c9d-ai" className="text-dify-blue hover:underline">
                  GitHub
                </Link>
              </span>
            </div>

            <p className="text-xl text-dify-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              C9D.AI offers everything you need — agentic workflows, RAG pipelines, integrations, and observability — 
              all in one place, putting AI power into your hands.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-dify-blue text-white hover:bg-dify-blue-dark font-medium px-8 py-6 text-lg h-auto min-w-[180px]"
                onClick={() => {
                  trackHeroInteraction('cta_click')
                  trackCTA('hero', 'click', 'Get Started', '/sign-up')
                }}
                asChild
              >
                <Link href="/sign-up">
                  Get Started
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-dify-gray-200 text-dify-gray-700 hover:bg-dify-gray-50 font-medium px-8 py-6 text-lg h-auto min-w-[180px]"
                onClick={() => {
                  trackHeroInteraction('demo_click')
                  trackCTA('hero', 'click', 'View Demo', '/demo')
                }}
                asChild
              >
                <Link href="/demo">
                  View Demo
                </Link>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-16 pt-16 border-t border-dify-gray-200">
              <p className="text-sm text-dify-gray-500 mb-8">Trusted by innovative teams at</p>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                {['NTT', 'ETS', 'MAERSK', 'Lilly'].map((company) => (
                  <div key={company} className="text-dify-gray-400 font-semibold text-lg">
                    {company}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}