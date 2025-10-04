import { z } from 'zod'

// Content schemas
export const HeroContentSchema = z.object({
  title: z.string(),
  highlightedText: z.string(),
  subtitle: z.string(),
  ctaText: z.string(),
  ctaHref: z.string(),
  bottomText: z.string()
})

export const C9CapabilityContentSchema = z.object({
  id: z.enum(['insight', 'persona', 'domain', 'orchestrator', 'narrative']),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  keyFeatures: z.array(z.string()),
  ctaText: z.string(),
  ctaHref: z.string()
})

export const FeatureContentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  benefits: z.array(z.string()),
  ctaText: z.string().optional(),
  ctaHref: z.string().optional()
})

export const TestimonialContentSchema = z.object({
  id: z.string(),
  quote: z.string(),
  author: z.string(),
  title: z.string(),
  company: z.string(),
  avatar: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  useCase: z.string().optional()
})

export const LandingPageContentSchema = z.object({
  hero: HeroContentSchema,
  capabilities: z.array(C9CapabilityContentSchema),
  features: z.array(FeatureContentSchema),
  testimonials: z.array(TestimonialContentSchema),
  metadata: z.object({
    lastUpdated: z.string(),
    version: z.string(),
    author: z.string().optional()
  })
})

// Type exports
export type HeroContent = z.infer<typeof HeroContentSchema>
export type C9CapabilityContent = z.infer<typeof C9CapabilityContentSchema>
export type FeatureContent = z.infer<typeof FeatureContentSchema>
export type TestimonialContent = z.infer<typeof TestimonialContentSchema>
export type LandingPageContent = z.infer<typeof LandingPageContentSchema>

// Default content
export const DEFAULT_LANDING_PAGE_CONTENT: LandingPageContent = {
  hero: {
    title: "Unlock Deeper Insights.",
    highlightedText: "Effortlessly.",
    subtitle: "C9D.AI leverages advanced AI to analyze and coordinate disparate, opaque relationships, bringing you relevant information and insights.",
    ctaText: "Request a Consultation",
    ctaHref: "/request-consultation",
    bottomText: "Better analysis, better coordination, clearer insights."
  },
  capabilities: [
    {
      id: 'insight',
      name: 'C9 Insight',
      tagline: 'Coordinating patterns across time, space, and data',
      description: 'Turn raw data into foresight with APIs for correlation, forecasting, and anomaly detection',
      keyFeatures: [
        'Entity & temporal correlation APIs',
        'Contextual forecasting & predictive models',
        'Time-series anomaly detection',
        'Cross-location & multi-factor trend analysis'
      ],
      ctaText: 'Explore Insight API',
      ctaHref: '/api/insight'
    },
    {
      id: 'persona',
      name: 'C9 Persona',
      tagline: 'AI that represents your brand, your way',
      description: 'Create branded AI entities that embody your organization with configurable tone and knowledge',
      keyFeatures: [
        'Personified AI models for individuals or organizations',
        'Brand-configurable tone, style, and knowledge base',
        'Context-aware avatars that adapt to role and audience',
        'APIs for integration with chat, voice, and workflow systems'
      ],
      ctaText: 'Build Your Persona',
      ctaHref: '/api/persona'
    },
    {
      id: 'domain',
      name: 'C9 Domain',
      tagline: 'Smarter AI, built for your industry',
      description: 'Industry-specific AI models with deep vertical knowledge and compliance awareness',
      keyFeatures: [
        'Pre-trained models for specific industries',
        'Compliance-aware reasoning and outputs',
        'Industry terminology and context understanding',
        'Custom model fine-tuning capabilities'
      ],
      ctaText: 'Explore Domains',
      ctaHref: '/api/domain'
    },
    {
      id: 'orchestrator',
      name: 'C9 Orchestrator',
      tagline: 'Coordinate people, processes, and AI',
      description: 'Multi-agent collaboration APIs that bring together human and AI intelligence',
      keyFeatures: [
        'Multi-agent task coordination and delegation',
        'Human-in-the-loop workflow automation',
        'Real-time collaboration between AI agents',
        'Process optimization and bottleneck detection'
      ],
      ctaText: 'Start Orchestrating',
      ctaHref: '/api/orchestrator'
    },
    {
      id: 'narrative',
      name: 'C9 Narrative',
      tagline: 'Turn your data into stories and strategy',
      description: 'Transform complex data into compelling narratives and strategic insights',
      keyFeatures: [
        'Automated report generation from data',
        'Scenario simulation and what-if analysis',
        'Strategic planning and recommendation engine',
        'Multi-format output (text, visuals, presentations)'
      ],
      ctaText: 'Create Narratives',
      ctaHref: '/api/narrative'
    }
  ],
  features: [
    {
      id: 'real-time-analysis',
      title: 'Real-Time Analysis',
      description: 'Process and analyze data streams in real-time with our advanced AI engine',
      icon: 'activity',
      benefits: [
        'Instant insights from live data',
        'Continuous monitoring and alerts',
        'Adaptive learning from new patterns'
      ],
      ctaText: 'Learn More',
      ctaHref: '/features/real-time'
    },
    {
      id: 'api-first',
      title: 'API-First Architecture',
      description: 'Integrate C9 capabilities seamlessly into your existing workflows',
      icon: 'code',
      benefits: [
        'RESTful and GraphQL APIs',
        'SDKs for major languages',
        'Webhooks and event streaming'
      ],
      ctaText: 'View API Docs',
      ctaHref: '/api/docs'
    },
    {
      id: 'enterprise-ready',
      title: 'Enterprise Ready',
      description: 'Built for scale, security, and compliance from day one',
      icon: 'shield',
      benefits: [
        'SOC 2 Type II certified',
        'GDPR and CCPA compliant',
        '99.9% uptime SLA'
      ],
      ctaText: 'Security Details',
      ctaHref: '/security'
    }
  ],
  testimonials: [
    {
      id: 'testimonial-1',
      quote: "C9D.AI transformed how we understand our customer data. The insights we've gained have directly impacted our bottom line.",
      author: "Sarah Chen",
      title: "VP of Data Science",
      company: "TechCorp Inc.",
      rating: 5,
      useCase: "Customer Analytics"
    },
    {
      id: 'testimonial-2',
      quote: "The C9 Orchestrator helped us reduce our workflow processing time by 73% while improving accuracy.",
      author: "Michael Roberts",
      title: "Operations Director",
      company: "Global Logistics Co.",
      rating: 5,
      useCase: "Process Automation"
    },
    {
      id: 'testimonial-3',
      quote: "C9 Persona gave our brand a consistent AI voice across all customer touchpoints. Game-changing.",
      author: "Emily Zhang",
      title: "Chief Marketing Officer",
      company: "Retail Dynamics",
      rating: 5,
      useCase: "Brand AI"
    }
  ],
  metadata: {
    lastUpdated: new Date().toISOString(),
    version: '1.0.0',
    author: 'C9D.AI Content Team'
  }
}

// Content management functions
export class ContentManager {
  private content: LandingPageContent

  constructor(initialContent: LandingPageContent = DEFAULT_LANDING_PAGE_CONTENT) {
    // Deep clone to avoid mutations
    this.content = JSON.parse(JSON.stringify(initialContent))
  }

  getContent(): LandingPageContent {
    return this.content
  }

  updateHero(updates: Partial<HeroContent>): LandingPageContent {
    this.content.hero = { ...this.content.hero, ...updates }
    this.updateMetadata()
    return this.content
  }

  updateCapability(id: C9CapabilityContent['id'], updates: Partial<C9CapabilityContent>): LandingPageContent {
    const index = this.content.capabilities.findIndex(cap => cap.id === id)
    if (index !== -1) {
      this.content.capabilities[index] = { ...this.content.capabilities[index], ...updates }
      this.updateMetadata()
    }
    return this.content
  }

  addFeature(feature: FeatureContent): LandingPageContent {
    this.content.features.push(feature)
    this.updateMetadata()
    return this.content
  }

  updateFeature(id: string, updates: Partial<FeatureContent>): LandingPageContent {
    const index = this.content.features.findIndex(feat => feat.id === id)
    if (index !== -1) {
      this.content.features[index] = { ...this.content.features[index], ...updates }
      this.updateMetadata()
    }
    return this.content
  }

  addTestimonial(testimonial: TestimonialContent): LandingPageContent {
    this.content.testimonials.push(testimonial)
    this.updateMetadata()
    return this.content
  }

  updateTestimonial(id: string, updates: Partial<TestimonialContent>): LandingPageContent {
    const index = this.content.testimonials.findIndex(test => test.id === id)
    if (index !== -1) {
      this.content.testimonials[index] = { ...this.content.testimonials[index], ...updates }
      this.updateMetadata()
    }
    return this.content
  }

  removeFeature(id: string): LandingPageContent {
    this.content.features = this.content.features.filter(feat => feat.id !== id)
    this.updateMetadata()
    return this.content
  }

  removeTestimonial(id: string): LandingPageContent {
    this.content.testimonials = this.content.testimonials.filter(test => test.id !== id)
    this.updateMetadata()
    return this.content
  }

  validateContent(): { valid: boolean; errors: string[] } {
    try {
      LandingPageContentSchema.parse(this.content)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          valid: false, 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }
      }
      return { valid: false, errors: ['Unknown validation error'] }
    }
  }

  exportContent(): string {
    return JSON.stringify(this.content, null, 2)
  }

  importContent(jsonString: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonString)
      const validated = LandingPageContentSchema.parse(parsed)
      this.content = validated
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid content format' 
      }
    }
  }

  private updateMetadata() {
    this.content.metadata.lastUpdated = new Date().toISOString()
    // Increment patch version
    const [major, minor, patch] = this.content.metadata.version.split('.').map(Number)
    this.content.metadata.version = `${major}.${minor}.${patch + 1}`
  }
}