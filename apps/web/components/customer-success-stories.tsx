"use client"

import React from "react"
import Image from "next/image"
import { useState } from "react"
import { Building2, Code, Zap, TrendingUp, Users, Clock, ChevronRight } from "lucide-react"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"

interface SuccessStory {
  id: string
  company: string
  industry: string
  logo: string
  challenge: string
  solution: string
  results: {
    metric: string
    value: string
    description: string
  }[]
  quote: string
  author: string
  title: string
  avatar: string
  caseStudyUrl?: string
}

interface IndustryFilter {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const industries: IndustryFilter[] = [
  { id: "all", name: "All Industries", icon: Building2, color: "text-windsurf-purple-deep" },
  { id: "technology", name: "Technology", icon: Code, color: "text-windsurf-blue-electric" },
  { id: "analytics", name: "Analytics", icon: TrendingUp, color: "text-windsurf-pink-hot" },
  { id: "research", name: "Research", icon: Zap, color: "text-windsurf-green-lime" },
  { id: "enterprise", name: "Enterprise", icon: Users, color: "text-c9n-teal" }
]

const successStories: SuccessStory[] = [
  {
    id: "1",
    company: "Insight Corp",
    industry: "analytics",
    logo: "/modern-company-logo-abstract.png",
    challenge: "Data analysts were spending 70% of their time on repetitive data preparation tasks instead of generating insights.",
    solution: "Implemented C9N.AI to automate data cleaning, transformation, and initial analysis workflows.",
    results: [
      { metric: "Time Saved", value: "75%", description: "Reduction in data prep time" },
      { metric: "Productivity", value: "300%", description: "Increase in analysis output" },
      { metric: "Accuracy", value: "99.2%", description: "Data processing accuracy" }
    ],
    quote: "C9N.AI transformed our entire analytics workflow. Our team now focuses on strategic insights instead of data wrangling.",
    author: "G. Analytex",
    title: "President & CEO",
    avatar: "/ceo-profile.png",
    caseStudyUrl: "#"
  },
  {
    id: "2",
    company: "TechFlow Solutions",
    industry: "technology",
    logo: "/modern-abstract-logo.png",
    challenge: "Development team was overwhelmed with boilerplate code and routine programming tasks, slowing feature delivery.",
    solution: "Integrated C9N.AI for automated code generation, testing, and documentation across their development pipeline.",
    results: [
      { metric: "Development Speed", value: "250%", description: "Faster feature delivery" },
      { metric: "Code Quality", value: "40%", description: "Reduction in bugs" },
      { metric: "Team Satisfaction", value: "95%", description: "Developer happiness score" }
    ],
    quote: "Our developers can now focus on architecture and innovation while C9N.AI handles the routine coding tasks.",
    author: "Dr. Sarah Chen",
    title: "Chief Technology Officer",
    avatar: "/female-data-scientist-avatar.png",
    caseStudyUrl: "#"
  },
  {
    id: "3",
    company: "InnovateLab",
    industry: "research",
    logo: "/placeholder-logo.png",
    challenge: "Research team needed to process vast amounts of scientific literature and experimental data efficiently.",
    solution: "Deployed C9N.AI for automated literature review, data analysis, and hypothesis generation.",
    results: [
      { metric: "Research Speed", value: "400%", description: "Faster literature processing" },
      { metric: "Insights Generated", value: "180%", description: "More research hypotheses" },
      { metric: "Publication Rate", value: "60%", description: "Increase in papers published" }
    ],
    quote: "C9N.AI accelerated our research process beyond what we thought possible. We're discovering patterns we never would have found manually.",
    author: "Marcus Rodriguez",
    title: "Head of Research Operations",
    avatar: "/male-tech-professional-avatar.png",
    caseStudyUrl: "#"
  },
  {
    id: "4",
    company: "Future Systems Inc",
    industry: "enterprise",
    logo: "/modern-company-logo-abstract.png",
    challenge: "Large enterprise needed to streamline operations across multiple departments and reduce manual processes.",
    solution: "Implemented C9N.AI across HR, Finance, and Operations for intelligent automation and decision support.",
    results: [
      { metric: "Operational Efficiency", value: "200%", description: "Improvement in process speed" },
      { metric: "Cost Reduction", value: "45%", description: "Savings in operational costs" },
      { metric: "Employee Productivity", value: "150%", description: "Increase in output per employee" }
    ],
    quote: "C9N.AI didn't just automate our processes—it made them smarter. We're making better decisions faster than ever.",
    author: "Dr. Kenji Tanaka",
    title: "Research Director",
    avatar: "/asian-male-researcher-avatar.png",
    caseStudyUrl: "#"
  }
]

export default function CustomerSuccessStories() {
  const [selectedIndustry, setSelectedIndustry] = useState("all")
  const { elementRef, shouldAnimate } = useIntersectionObserver({ threshold: 0.2 })

  const filteredStories = selectedIndustry === "all" 
    ? successStories 
    : successStories.filter(story => story.industry === selectedIndustry)

  return (
    <section 
      ref={elementRef}
      className="py-16 md:py-24 bg-windsurf-off-white relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-windsurf-blue-electric/10 to-transparent rounded-full blur-3xl animate-gentle-float-1" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/3 h-1/3 bg-gradient-to-tl from-windsurf-pink-hot/10 to-transparent rounded-full blur-3xl animate-gentle-float-2" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="flex items-center justify-center mb-4">
            <span className="w-3 h-3 bg-windsurf-blue-electric rounded-sm mr-2"></span>
            <p className="text-sm font-semibold uppercase tracking-wider text-windsurf-blue-electric">Success Stories</p>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-windsurf-purple-deep mb-4">
            Real Results from <span className="text-windsurf-pink-hot">Real Customers</span>
          </h2>
          <p className="text-lg text-windsurf-purple-deep/70 max-w-2xl mx-auto">
            Discover how organizations across industries are achieving breakthrough results with C9N.AI
          </p>
        </div>

        {/* Industry Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {industries.map((industry, index) => {
            const IconComponent = industry.icon
            const isActive = selectedIndustry === industry.id
            return (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-windsurf-purple-deep text-white shadow-lg scale-105'
                    : 'bg-white text-windsurf-purple-deep hover:bg-windsurf-purple-deep/10 shadow-md hover:shadow-lg'
                } ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <IconComponent className={`h-4 w-4 ${isActive ? 'text-white' : industry.color}`} />
                {industry.name}
              </button>
            )
          })}
        </div>

        {/* Success Stories Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {filteredStories.map((story, index) => (
            <div
              key={story.id}
              className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden group ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Story Header */}
              <div className="p-8 pb-6">
                <div className="flex items-center gap-4 mb-6">
                  <Image
                    src={story.logo}
                    alt={`${story.company} logo`}
                    width={60}
                    height={60}
                    className="rounded-lg shadow-md"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-windsurf-purple-deep">{story.company}</h3>
                    <p className="text-sm text-windsurf-purple-deep/60 capitalize">{story.industry}</p>
                  </div>
                </div>

                {/* Challenge & Solution */}
                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="text-sm font-semibold text-windsurf-pink-hot mb-2">Challenge</h4>
                    <p className="text-sm text-windsurf-purple-deep/80 leading-relaxed">{story.challenge}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-windsurf-blue-electric mb-2">Solution</h4>
                    <p className="text-sm text-windsurf-purple-deep/80 leading-relaxed">{story.solution}</p>
                  </div>
                </div>

                {/* Results Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {story.results.map((result, idx) => (
                    <div key={idx} className="text-center p-3 bg-windsurf-off-white rounded-lg">
                      <div className="text-2xl font-bold text-windsurf-pink-hot mb-1">{result.value}</div>
                      <div className="text-xs font-medium text-windsurf-purple-deep mb-1">{result.metric}</div>
                      <div className="text-xs text-windsurf-purple-deep/60">{result.description}</div>
                    </div>
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-windsurf-purple-deep/90 italic mb-4 leading-relaxed">
                  "{story.quote}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image
                      src={story.avatar}
                      alt={story.author}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div>
                      <p className="text-sm font-semibold text-windsurf-purple-deep">{story.author}</p>
                      <p className="text-xs text-windsurf-purple-deep/60">{story.title}</p>
                    </div>
                  </div>
                  
                  {story.caseStudyUrl && (
                    <button className="flex items-center gap-1 text-sm font-medium text-windsurf-pink-hot hover:text-windsurf-purple-deep transition-colors duration-300 group-hover:translate-x-1">
                      Read Case Study
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className={`text-center mt-16 ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '800ms' }}>
          <div className="bg-gradient-to-r from-windsurf-purple-deep to-windsurf-pink-hot p-8 rounded-2xl shadow-2xl max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Write Your Success Story?</h3>
            <p className="text-white/90 mb-6">Join thousands of organizations transforming their workflows with C9N.AI</p>
            <button className="bg-white text-windsurf-purple-deep px-8 py-3 rounded-full font-semibold hover:bg-windsurf-off-white transition-all duration-300 hover:scale-105 shadow-lg">
              Start Your Journey
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}