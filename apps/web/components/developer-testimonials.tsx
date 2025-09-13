"use client"

import React, { useState, useEffect } from "react"
import { 
  StarIcon, 
  GithubIcon, 
  LinkedinIcon,
  TwitterIcon,
  BuildingIcon,
  CodeIcon,
  ZapIcon,
  ShieldIcon,
  DatabaseIcon,
  CloudIcon
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DeveloperTestimonial {
  id: string
  name: string
  title: string
  company: string
  avatar: string
  rating: number
  quote: string
  caseStudy: {
    challenge: string
    solution: string
    results: string[]
    metrics: {
      label: string
      value: string
      improvement: string
    }[]
  }
  techStack: string[]
  socialLinks: {
    github?: string
    linkedin?: string
    twitter?: string
  }
  featured: boolean
  category: "integration" | "performance" | "scalability" | "developer-experience"
}

const developerTestimonials: DeveloperTestimonial[] = [
  {
    id: "sarah-chen",
    name: "Sarah Chen",
    title: "Senior ML Engineer",
    company: "TechFlow Analytics",
    avatar: "/placeholder-user.jpg",
    rating: 5,
    quote: "C9d.ai's API design is exceptional. We integrated our entire ML pipeline in just 2 days, and the performance improvements were immediate. The relationship mapping capabilities uncovered insights we never knew existed in our data.",
    caseStudy: {
      challenge: "TechFlow needed to analyze complex customer behavior patterns across multiple touchpoints but struggled with data silos and slow processing times.",
      solution: "Implemented C9d.ai's relationship mapping API to connect disparate data sources and used the real-time processing capabilities for instant insights.",
      results: [
        "Reduced data processing time from hours to minutes",
        "Discovered 15+ new customer behavior patterns",
        "Increased prediction accuracy by 34%",
        "Streamlined ML pipeline deployment"
      ],
      metrics: [
        { label: "Processing Time", value: "2.3 minutes", improvement: "95% faster" },
        { label: "Prediction Accuracy", value: "94.2%", improvement: "+34%" },
        { label: "Data Integration", value: "12 sources", improvement: "3x more" }
      ]
    },
    techStack: ["Python", "TensorFlow", "Kubernetes", "PostgreSQL"],
    socialLinks: {
      github: "https://github.com/sarahchen",
      linkedin: "https://linkedin.com/in/sarahchen"
    },
    featured: true,
    category: "performance"
  },
  {
    id: "marcus-rodriguez",
    name: "Marcus Rodriguez",
    title: "Lead DevOps Engineer",
    company: "CloudScale Solutions",
    avatar: "/placeholder-user.jpg",
    rating: 5,
    quote: "The scalability of C9d.ai is incredible. We went from prototype to production serving millions of requests without any architectural changes. The monitoring and observability features saved us countless hours of debugging.",
    caseStudy: {
      challenge: "CloudScale needed to scale their analytics platform to handle 10x traffic growth while maintaining sub-100ms response times.",
      solution: "Leveraged C9d.ai's auto-scaling infrastructure and distributed processing capabilities with comprehensive monitoring.",
      results: [
        "Seamlessly scaled to 10M+ daily requests",
        "Maintained 99.9% uptime during traffic spikes",
        "Reduced infrastructure costs by 40%",
        "Automated scaling eliminated manual intervention"
      ],
      metrics: [
        { label: "Daily Requests", value: "12M", improvement: "10x growth" },
        { label: "Response Time", value: "87ms", improvement: "Maintained" },
        { label: "Cost Reduction", value: "40%", improvement: "vs previous" }
      ]
    },
    techStack: ["Docker", "Kubernetes", "AWS", "Terraform"],
    socialLinks: {
      github: "https://github.com/marcusrodriguez",
      linkedin: "https://linkedin.com/in/marcusrodriguez",
      twitter: "https://twitter.com/marcusrodriguez"
    },
    featured: true,
    category: "scalability"
  },
  {
    id: "alex-kim",
    name: "Alex Kim",
    title: "Full Stack Developer",
    company: "DataViz Pro",
    avatar: "/placeholder-user.jpg",
    rating: 5,
    quote: "The developer experience is outstanding. Clear documentation, intuitive APIs, and excellent TypeScript support. We built our entire analytics dashboard in a weekend hackathon and won first place!",
    caseStudy: {
      challenge: "DataViz Pro needed to rapidly prototype and deploy a real-time analytics dashboard for a client presentation.",
      solution: "Used C9d.ai's comprehensive API suite with TypeScript SDK to build a full-featured dashboard in 48 hours.",
      results: [
        "Built complete dashboard in 48 hours",
        "Won hackathon first place",
        "Secured $500K client contract",
        "Dashboard now serves 50K+ users daily"
      ],
      metrics: [
        { label: "Development Time", value: "48 hours", improvement: "10x faster" },
        { label: "API Integration", value: "15 endpoints", improvement: "Seamless" },
        { label: "User Adoption", value: "50K+", improvement: "Daily active" }
      ]
    },
    techStack: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    socialLinks: {
      github: "https://github.com/alexkim",
      linkedin: "https://linkedin.com/in/alexkim"
    },
    featured: false,
    category: "developer-experience"
  },
  {
    id: "priya-patel",
    name: "Priya Patel",
    title: "Data Integration Specialist",
    company: "Enterprise Solutions Inc",
    avatar: "/placeholder-user.jpg",
    rating: 5,
    quote: "Integrating 20+ data sources used to be a nightmare. C9d.ai's integration capabilities and pre-built connectors made it effortless. The data quality and transformation features are game-changing.",
    caseStudy: {
      challenge: "Enterprise Solutions needed to integrate data from 20+ disparate sources for a unified customer view while ensuring data quality and compliance.",
      solution: "Implemented C9d.ai's integration platform with automated data quality checks and transformation pipelines.",
      results: [
        "Integrated 23 data sources in 2 weeks",
        "Achieved 99.8% data quality score",
        "Reduced integration costs by 60%",
        "Enabled real-time customer 360 views"
      ],
      metrics: [
        { label: "Data Sources", value: "23", improvement: "All integrated" },
        { label: "Data Quality", value: "99.8%", improvement: "Industry leading" },
        { label: "Integration Time", value: "2 weeks", improvement: "80% faster" }
      ]
    },
    techStack: ["Apache Kafka", "Snowflake", "dbt", "Python"],
    socialLinks: {
      linkedin: "https://linkedin.com/in/priyapatel"
    },
    featured: false,
    category: "integration"
  }
]

const categoryIcons = {
  integration: DatabaseIcon,
  performance: ZapIcon,
  scalability: CloudIcon,
  "developer-experience": CodeIcon
}

const categoryColors = {
  integration: "from-windsurf-blue-electric to-c9n-teal",
  performance: "from-windsurf-pink-hot to-windsurf-purple-vibrant",
  scalability: "from-windsurf-yellow-bright to-windsurf-green-lime",
  "developer-experience": "from-windsurf-purple-vibrant to-windsurf-pink-hot"
}

export function DeveloperTestimonials() {
  const [selectedTestimonial, setSelectedTestimonial] = useState<DeveloperTestimonial | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const featuredTestimonials = developerTestimonials.filter(t => t.featured)

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredTestimonials.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, featuredTestimonials.length])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-windsurf-yellow-bright fill-current" : "text-windsurf-gray-light"
        }`}
      />
    ))
  }

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "github": return GithubIcon
      case "linkedin": return LinkedinIcon
      case "twitter": return TwitterIcon
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Featured Testimonials Carousel */}
      <Card className="bg-gradient-to-br from-windsurf-purple-deep to-c9n-blue-dark border-windsurf-pink-hot/30 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Developer Success Stories</CardTitle>
          <CardDescription className="text-windsurf-gray-light">
            Real experiences from developers building with C9d.ai
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {featuredTestimonials.map((testimonial, index) => {
              const CategoryIcon = categoryIcons[testimonial.category]
              return (
                <div
                  key={testimonial.id}
                  className={`transition-all duration-500 ${
                    index === currentIndex ? "opacity-100" : "opacity-0 absolute inset-0"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Testimonial Content */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          className="w-16 h-16 rounded-full border-2 border-windsurf-pink-hot/50"
                        />
                        <div>
                          <h3 className="text-xl font-semibold">{testimonial.name}</h3>
                          <p className="text-windsurf-gray-light">{testimonial.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <BuildingIcon className="h-4 w-4 text-c9n-teal" />
                            <span className="text-sm text-c9n-teal">{testimonial.company}</span>
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div className="flex items-center gap-1 mb-2">
                            {renderStars(testimonial.rating)}
                          </div>
                          <Badge className={`bg-gradient-to-r ${categoryColors[testimonial.category]} text-white`}>
                            <CategoryIcon className="h-3 w-3 mr-1" />
                            {testimonial.category.replace("-", " ")}
                          </Badge>
                        </div>
                      </div>

                      <blockquote className="text-lg italic text-windsurf-gray-light border-l-4 border-windsurf-pink-hot pl-4">
                        "{testimonial.quote}"
                      </blockquote>

                      <div className="flex flex-wrap gap-2">
                        {testimonial.techStack.map((tech) => (
                          <Badge key={tech} variant="outline" className="border-c9n-teal text-c9n-teal">
                            {tech}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-4">
                        {Object.entries(testimonial.socialLinks).map(([platform, url]) => {
                          const Icon = getSocialIcon(platform)
                          return Icon ? (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-windsurf-gray-light hover:text-windsurf-pink-hot transition-colors"
                            >
                              <Icon className="h-5 w-5" />
                            </a>
                          ) : null
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTestimonial(testimonial)}
                          className="border-windsurf-pink-hot text-windsurf-pink-hot hover:bg-windsurf-pink-hot hover:text-white"
                        >
                          View Case Study
                        </Button>
                      </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="lg:w-80">
                      <div className="bg-windsurf-purple-deep/50 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-windsurf-yellow-bright">Key Results</h4>
                        {testimonial.caseStudy.metrics.slice(0, 3).map((metric) => (
                          <div key={metric.label} className="flex justify-between items-center">
                            <span className="text-sm text-windsurf-gray-light">{metric.label}</span>
                            <div className="text-right">
                              <div className="font-semibold text-white">{metric.value}</div>
                              <div className="text-xs text-c9n-teal">{metric.improvement}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Carousel Controls */}
            <div className="flex items-center justify-between mt-6">
              <div className="flex gap-2">
                {featuredTestimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentIndex(index)
                      setIsAutoPlaying(false)
                    }}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentIndex ? "bg-windsurf-pink-hot" : "bg-windsurf-gray-light/30"
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="text-windsurf-gray-light hover:text-white"
              >
                {isAutoPlaying ? "Pause" : "Play"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {developerTestimonials.filter(t => !t.featured).map((testimonial) => {
          const CategoryIcon = categoryIcons[testimonial.category]
          return (
            <Card
              key={testimonial.id}
              className="bg-windsurf-purple-deep/30 border-windsurf-gray-light/20 text-white hover:border-windsurf-pink-hot/50 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedTestimonial(testimonial)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full border-2 border-windsurf-pink-hot/30"
                    />
                    <div>
                      <h3 className="font-semibold">{testimonial.name}</h3>
                      <p className="text-sm text-windsurf-gray-light">{testimonial.title}</p>
                      <p className="text-xs text-c9n-teal">{testimonial.company}</p>
                    </div>
                  </div>
                  <Badge className={`bg-gradient-to-r ${categoryColors[testimonial.category]} text-white`}>
                    <CategoryIcon className="h-3 w-3 mr-1" />
                    {testimonial.category.replace("-", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(testimonial.rating)}
                </div>
              </CardHeader>
              <CardContent>
                <blockquote className="text-sm italic text-windsurf-gray-light mb-3">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex flex-wrap gap-1">
                  {testimonial.techStack.slice(0, 3).map((tech) => (
                    <Badge key={tech} variant="outline" className="border-c9n-teal/50 text-c9n-teal text-xs">
                      {tech}
                    </Badge>
                  ))}
                  {testimonial.techStack.length > 3 && (
                    <Badge variant="outline" className="border-windsurf-gray-light/30 text-windsurf-gray-light text-xs">
                      +{testimonial.techStack.length - 3} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Case Study Modal */}
      {selectedTestimonial && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <Card className="bg-gradient-to-br from-windsurf-purple-deep to-c9n-blue-dark border-windsurf-pink-hot text-white max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedTestimonial.avatar}
                    alt={selectedTestimonial.name}
                    className="w-16 h-16 rounded-full border-2 border-windsurf-pink-hot/50"
                  />
                  <div>
                    <CardTitle className="text-2xl">{selectedTestimonial.name}</CardTitle>
                    <CardDescription className="text-windsurf-gray-light">
                      {selectedTestimonial.title} at {selectedTestimonial.company}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedTestimonial(null)}
                  className="text-windsurf-gray-light hover:text-white"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <blockquote className="text-lg italic text-windsurf-gray-light border-l-4 border-windsurf-pink-hot pl-4">
                "{selectedTestimonial.quote}"
              </blockquote>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-windsurf-yellow-bright mb-3">Challenge</h4>
                  <p className="text-sm text-windsurf-gray-light">{selectedTestimonial.caseStudy.challenge}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-windsurf-yellow-bright mb-3">Solution</h4>
                  <p className="text-sm text-windsurf-gray-light">{selectedTestimonial.caseStudy.solution}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-windsurf-yellow-bright mb-3">Results</h4>
                  <ul className="space-y-1">
                    {selectedTestimonial.caseStudy.results.map((result, index) => (
                      <li key={index} className="text-sm text-windsurf-gray-light flex items-start">
                        <div className="w-1.5 h-1.5 bg-c9n-teal rounded-full mr-2 mt-2 flex-shrink-0" />
                        {result}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-windsurf-yellow-bright mb-4">Key Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedTestimonial.caseStudy.metrics.map((metric) => (
                    <div key={metric.label} className="bg-windsurf-purple-deep/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
                      <div className="text-sm text-windsurf-gray-light mb-1">{metric.label}</div>
                      <div className="text-xs text-c9n-teal">{metric.improvement}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-windsurf-yellow-bright mb-3">Technology Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTestimonial.techStack.map((tech) => (
                    <Badge key={tech} variant="outline" className="border-c9n-teal text-c9n-teal">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}