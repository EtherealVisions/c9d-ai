"use client"

import React from "react"
import Image from "next/image"
import { CheckIcon } from "lucide-react"

const features = [
  {
    title: "Sophisticated Workflow in Minutes",
    description: "Drag and drop to visually create AI apps and workflows that are capable of diverse tasks and evolving needs."
  },
  {
    title: "Amplify with Any Global Large Language Models",
    description: "Choose from hundreds of proprietary / open-source LLMs from dozens of inference providers and self-hosted solutions."
  },
  {
    title: "Launch Right Away",
    description: "Deploy your AI applications instantly with our one-click deployment to production environments."
  },
  {
    title: "Build Upon Other's Creation",
    description: "Natively embed workflows within workflows. Share with the community and collaborate as a team."
  }
]

export default function BuildSection() {
  return (
    <section className="py-20 md:py-28 lg:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left content */}
          <div>
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-dify-blue rounded-full"></div>
              <span className="text-sm font-semibold text-dify-blue uppercase tracking-wider">BUILD</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-dify-gray-900 mb-6">
              From sketch to live,
              <br />
              <span className="text-dify-blue">bring your AI vision to life and beyond.</span>
            </h2>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="group">
                  <h3 className="text-xl font-semibold text-dify-gray-900 mb-2 flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-dify-blue mt-0.5 flex-shrink-0" />
                    {feature.title}
                  </h3>
                  <p className="text-dify-gray-600 ml-8">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right content - Image placeholder */}
          <div className="relative">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-dify-gray-100 to-dify-gray-50 rounded-lg shadow-xl overflow-hidden">
              <Image
                src="/workflow-builder-screenshot.png"
                alt="C9D.AI Workflow Builder"
                fill
                className="object-cover"
                priority
              />
              {/* Placeholder if image doesn't exist */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-dify-blue/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-16 h-16 text-dify-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-dify-gray-500">Workflow Builder Interface</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}