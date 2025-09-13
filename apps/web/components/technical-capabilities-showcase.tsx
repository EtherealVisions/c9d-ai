"use client"

import React, { useState } from "react"
import { 
  CodeIcon, 
  DatabaseIcon, 
  CloudIcon, 
  ShieldIcon,
  ZapIcon,
  GitBranchIcon,
  ServerIcon,
  MonitorIcon
} from "lucide-react"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { InteractiveAPIPreview } from "./interactive-api-preview"
import { IntegrationShowcase } from "./integration-showcase"
import { ArchitectureDiagram } from "./architecture-diagram"
import { DeveloperTestimonials } from "./developer-testimonials"
import { SDKDownloadSection } from "./sdk-download-section"

interface TechnicalCapability {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  features: string[]
  gradient: string
}

const technicalCapabilities: TechnicalCapability[] = [
  {
    id: "api-first",
    icon: CodeIcon,
    title: "API-First Architecture",
    description: "RESTful APIs with GraphQL support for flexible data querying and real-time subscriptions.",
    features: [
      "OpenAPI 3.0 specification",
      "GraphQL schema introspection",
      "Real-time WebSocket connections",
      "Rate limiting and authentication"
    ],
    gradient: "from-windsurf-purple-vibrant to-windsurf-pink-hot"
  },
  {
    id: "scalable-infrastructure",
    icon: ServerIcon,
    title: "Scalable Infrastructure",
    description: "Cloud-native architecture designed for enterprise-scale deployments with auto-scaling capabilities.",
    features: [
      "Kubernetes orchestration",
      "Auto-scaling based on demand",
      "Multi-region deployment",
      "99.9% uptime SLA"
    ],
    gradient: "from-windsurf-blue-electric to-c9n-teal"
  },
  {
    id: "security-first",
    icon: ShieldIcon,
    title: "Enterprise Security",
    description: "Zero-trust security model with end-to-end encryption and comprehensive compliance frameworks.",
    features: [
      "SOC 2 Type II certified",
      "GDPR and CCPA compliant",
      "End-to-end encryption",
      "Role-based access control"
    ],
    gradient: "from-windsurf-yellow-bright to-windsurf-green-lime"
  },
  {
    id: "real-time-processing",
    icon: ZapIcon,
    title: "Real-time Processing",
    description: "Stream processing capabilities for real-time analytics and instant insights from your data.",
    features: [
      "Apache Kafka integration",
      "Sub-second latency",
      "Event-driven architecture",
      "Stream analytics"
    ],
    gradient: "from-windsurf-pink-hot to-windsurf-purple-vibrant"
  }
]

export default function TechnicalCapabilitiesShowcase() {
  const [activeTab, setActiveTab] = useState("overview")
  const { elementRef, shouldAnimate } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  })

  return (
    <section ref={elementRef} className="py-16 md:py-24 bg-gradient-to-br from-c9n-blue-dark via-windsurf-purple-deep to-c9n-blue-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight text-white transition-all duration-700 ${
            shouldAnimate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}>
            Built for{" "}
            <span className="bg-clip-text text-transparent bg-blue-teal-gradient">
              Developers
            </span>
            {" "}by Developers
          </h2>
          <p className={`mt-4 text-lg text-windsurf-gray-light max-w-3xl mx-auto transition-all duration-700 delay-200 ${
            shouldAnimate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}>
            Comprehensive APIs, SDKs, and developer tools designed for seamless integration 
            and rapid deployment in any environment.
          </p>
        </div>

        {/* Technical Capabilities Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 transition-all duration-700 delay-300 ${
          shouldAnimate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          {technicalCapabilities.map((capability, index) => {
            const Icon = capability.icon
            return (
              <Card 
                key={capability.id} 
                className={`bg-gradient-to-br ${capability.gradient} border-0 text-white hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-windsurf-pink-hot/25`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <Icon className="h-8 w-8 mb-2" />
                  <CardTitle className="text-lg font-semibold">{capability.title}</CardTitle>
                  <CardDescription className="text-white/80 text-sm">
                    {capability.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1">
                    {capability.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-white/90 flex items-center">
                        <div className="w-1.5 h-1.5 bg-white/60 rounded-full mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Interactive Tabs Section */}
        <div className={`transition-all duration-700 delay-500 ${
          shouldAnimate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-windsurf-purple-deep/50 border border-windsurf-gray-light/20">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-windsurf-pink-hot data-[state=active]:text-white text-windsurf-gray-light"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="api" 
                className="data-[state=active]:bg-windsurf-pink-hot data-[state=active]:text-white text-windsurf-gray-light"
              >
                API Docs
              </TabsTrigger>
              <TabsTrigger 
                value="integrations" 
                className="data-[state=active]:bg-windsurf-pink-hot data-[state=active]:text-white text-windsurf-gray-light"
              >
                Integrations
              </TabsTrigger>
              <TabsTrigger 
                value="architecture" 
                className="data-[state=active]:bg-windsurf-pink-hot data-[state=active]:text-white text-windsurf-gray-light"
              >
                Architecture
              </TabsTrigger>
              <TabsTrigger 
                value="sdk" 
                className="data-[state=active]:bg-windsurf-pink-hot data-[state=active]:text-white text-windsurf-gray-light"
              >
                SDKs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-8">
              <Card className="bg-windsurf-purple-deep/30 border-windsurf-gray-light/20 text-white">
                <CardHeader>
                  <CardTitle className="text-2xl">Technical Overview</CardTitle>
                  <CardDescription className="text-windsurf-gray-light">
                    C9d.ai provides enterprise-grade APIs and developer tools for seamless integration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-c9n-teal mb-2">99.9%</div>
                      <div className="text-sm text-windsurf-gray-light">API Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-windsurf-yellow-bright mb-2">&lt;100ms</div>
                      <div className="text-sm text-windsurf-gray-light">Response Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-windsurf-pink-hot mb-2">200+</div>
                      <div className="text-sm text-windsurf-gray-light">Integrations</div>
                    </div>
                  </div>
                  <DeveloperTestimonials />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="mt-8">
              <InteractiveAPIPreview />
            </TabsContent>

            <TabsContent value="integrations" className="mt-8">
              <IntegrationShowcase />
            </TabsContent>

            <TabsContent value="architecture" className="mt-8">
              <ArchitectureDiagram />
            </TabsContent>

            <TabsContent value="sdk" className="mt-8">
              <SDKDownloadSection />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  )
}