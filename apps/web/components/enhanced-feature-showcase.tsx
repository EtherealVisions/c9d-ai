"use client"

import React from "react"
import FeatureGridSection from "./feature-grid-section"
import FeatureHighlightSection from "./feature-highlight-section"
import FeatureComparisonMatrix from "./feature-comparison-matrix"

const featureHighlights = [
  {
    title: "AI Agent Orchestration",
    description: "Coordinate multiple AI agents to work together seamlessly, creating powerful workflows that adapt to your business needs. Our orchestration engine manages complex interactions between different AI models and services.",
    subFeatureTitle: "Smart Workflow Management",
    subFeatureDescription: "Automatically route tasks between agents based on their capabilities, monitor performance, and optimize resource allocation in real-time.",
    ctaText: "Explore Orchestration",
    ctaLink: "/features/orchestration",
    imageUrl: "/data-analysis-collaboration.png",
    imageAlt: "AI agents working together in a collaborative workflow",
    reverseLayout: false
  },
  {
    title: "Real-Time Analytics Dashboard",
    description: "Get instant insights from your data with our advanced analytics platform. Monitor key metrics, track performance, and make data-driven decisions with confidence.",
    subFeatureTitle: "Live Data Visualization",
    subFeatureDescription: "Interactive charts and graphs that update in real-time, with customizable dashboards tailored to your specific business requirements.",
    ctaText: "View Analytics Demo",
    ctaLink: "/features/analytics",
    imageUrl: "/data-visualization-insights-teal-yellow.png",
    imageAlt: "Real-time analytics dashboard with interactive visualizations",
    reverseLayout: true
  },
  {
    title: "Enterprise Security & Compliance",
    description: "Built with enterprise-grade security from the ground up. Our platform ensures your data remains protected while meeting the strictest compliance requirements.",
    subFeatureTitle: "Zero-Trust Architecture",
    subFeatureDescription: "Multi-layered security with end-to-end encryption, role-based access controls, and comprehensive audit trails for complete peace of mind.",
    ctaText: "Learn About Security",
    ctaLink: "/features/security",
    imageUrl: "/tech-engine-gears-green-blue.png",
    imageAlt: "Secure enterprise infrastructure with advanced protection",
    reverseLayout: false
  }
]

export default function EnhancedFeatureShowcase() {
  return (
    <div className="relative">
      {/* Main feature grid with enhanced cards and modals */}
      <FeatureGridSection />
      
      {/* Feature highlights with scroll animations */}
      {featureHighlights.map((highlight, index) => (
        <FeatureHighlightSection
          key={`highlight-${index}`}
          title={highlight.title}
          description={highlight.description}
          subFeatureTitle={highlight.subFeatureTitle}
          subFeatureDescription={highlight.subFeatureDescription}
          ctaText={highlight.ctaText}
          ctaLink={highlight.ctaLink}
          imageUrl={highlight.imageUrl}
          imageAlt={highlight.imageAlt}
          reverseLayout={highlight.reverseLayout}
        />
      ))}
      
      {/* Feature comparison matrix */}
      <FeatureComparisonMatrix />
    </div>
  )
}