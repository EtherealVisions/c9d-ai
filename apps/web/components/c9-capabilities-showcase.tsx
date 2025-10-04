"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  BrainCircuitIcon, 
  UserCheckIcon, 
  BuildingIcon, 
  WorkflowIcon, 
  BookOpenIcon,
  ArrowRightIcon,
  CodeIcon,
  ChevronRightIcon 
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { trackC9Capability, trackCTA } from "@/lib/analytics/events"
import { useElementVisibility } from "@/hooks/use-scroll-tracking"

interface C9Capability {
  id: 'insight' | 'persona' | 'domain' | 'orchestrator' | 'narrative'
  name: string
  tagline: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  gradient: {
    from: string
    to: string
    direction: 'to-r' | 'to-br' | 'to-b' | 'to-bl'
  }
  keyFeatures: string[]
  useCases: IndustryUseCase[]
  apis: APIEndpoint[]
  ctaText: string
  ctaHref: string
}

interface IndustryUseCase {
  industry: 'education' | 'telecom' | 'retail' | 'enterprise' | 'healthcare' | 'marketing'
  scenario: string
  benefit: string
  example: string
}

interface APIEndpoint {
  name: string
  description: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  endpoint: string
}

const C9_CAPABILITIES: C9Capability[] = [
  {
    id: 'insight',
    name: 'C9 Insight',
    tagline: 'Coordinating patterns across time, space, and data',
    description: 'Turn raw data into foresight with APIs for correlation, forecasting, and anomaly detection',
    icon: BrainCircuitIcon,
    gradient: { from: '#7B2CBF', to: '#E71D73', direction: 'to-br' },
    keyFeatures: [
      'Entity & temporal correlation APIs',
      'Contextual forecasting & predictive models',
      'Time-series anomaly detection',
      'Cross-location & multi-factor trend analysis'
    ],
    useCases: [
      {
        industry: 'education',
        scenario: 'Forecast class attendance and resource needs',
        benefit: 'Optimize resource allocation and improve student engagement',
        example: 'Predict which students need additional support before they fall behind'
      },
      {
        industry: 'telecom',
        scenario: 'Predict network demand and delivery bottlenecks',
        benefit: 'Proactive infrastructure scaling and maintenance',
        example: 'Anticipate network congestion during major events'
      }
    ],
    apis: [
      { name: 'Correlation API', description: 'Find patterns across datasets', method: 'POST', endpoint: '/api/insight/correlate' },
      { name: 'Forecast API', description: 'Generate predictive models', method: 'POST', endpoint: '/api/insight/forecast' }
    ],
    ctaText: 'Explore Insight API',
    ctaHref: '/api/insight'
  },
  {
    id: 'persona',
    name: 'C9 Persona',
    tagline: 'AI that represents your brand, your way',
    description: 'Create branded AI entities that embody your organization with configurable tone and knowledge',
    icon: UserCheckIcon,
    gradient: { from: '#00B2FF', to: '#2CE4B8', direction: 'to-br' },
    keyFeatures: [
      'Personified AI models for individuals or organizations',
      'Brand-configurable tone, style, and knowledge base',
      'Context-aware avatars that adapt to role and audience',
      'APIs for integration with chat, voice, and workflow systems'
    ],
    useCases: [
      {
        industry: 'enterprise',
        scenario: 'Executive surrogates for stakeholder communication',
        benefit: 'Consistent messaging and 24/7 availability',
        example: 'CEO avatar that handles routine investor questions'
      },
      {
        industry: 'education',
        scenario: 'Personalized teaching assistants for every student',
        benefit: 'Scalable one-on-one learning support',
        example: 'AI tutors that adapt to individual learning styles'
      }
    ],
    apis: [
      { name: 'Persona API', description: 'Create and manage AI personas', method: 'POST', endpoint: '/api/persona/create' },
      { name: 'Chat API', description: 'Interact with personas in real-time', method: 'POST', endpoint: '/api/persona/chat' }
    ],
    ctaText: 'Build Your Persona',
    ctaHref: '/api/persona'
  },
  {
    id: 'domain',
    name: 'C9 Domain',
    tagline: 'Smarter AI, built for your industry',
    description: 'Industry-specific AI models with deep vertical knowledge and compliance awareness',
    icon: BuildingIcon,
    gradient: { from: '#FFD700', to: '#AFFF3C', direction: 'to-br' },
    keyFeatures: [
      'Pre-trained models for specific industries',
      'Compliance-aware reasoning and outputs',
      'Industry terminology and context understanding',
      'Custom model fine-tuning capabilities'
    ],
    useCases: [
      {
        industry: 'healthcare',
        scenario: 'HIPAA-compliant medical data analysis',
        benefit: 'Secure, accurate healthcare insights',
        example: 'Patient outcome predictions with privacy protection'
      },
      {
        industry: 'retail',
        scenario: 'Inventory optimization and demand forecasting',
        benefit: 'Reduced waste and improved margins',
        example: 'Seasonal trend analysis with supply chain integration'
      }
    ],
    apis: [
      { name: 'Domain API', description: 'Access industry-specific models', method: 'POST', endpoint: '/api/domain/query' },
      { name: 'Fine-tune API', description: 'Customize models for your needs', method: 'POST', endpoint: '/api/domain/finetune' }
    ],
    ctaText: 'Explore Domains',
    ctaHref: '/api/domain'
  },
  {
    id: 'orchestrator',
    name: 'C9 Orchestrator',
    tagline: 'Coordinate people, processes, and AI',
    description: 'Multi-agent collaboration APIs that bring together human and AI intelligence',
    icon: WorkflowIcon,
    gradient: { from: '#7B2CBF', to: '#00B2FF', direction: 'to-br' },
    keyFeatures: [
      'Multi-agent task coordination and delegation',
      'Human-in-the-loop workflow automation',
      'Real-time collaboration between AI agents',
      'Process optimization and bottleneck detection'
    ],
    useCases: [
      {
        industry: 'enterprise',
        scenario: 'Complex project management with AI assistants',
        benefit: 'Faster delivery with reduced coordination overhead',
        example: 'AI agents managing sprint planning and resource allocation'
      },
      {
        industry: 'marketing',
        scenario: 'Coordinated campaign execution across channels',
        benefit: 'Consistent messaging with optimized timing',
        example: 'AI orchestrating content creation, scheduling, and analytics'
      }
    ],
    apis: [
      { name: 'Orchestration API', description: 'Create and manage workflows', method: 'POST', endpoint: '/api/orchestrator/workflow' },
      { name: 'Agent API', description: 'Deploy and coordinate AI agents', method: 'POST', endpoint: '/api/orchestrator/agents' }
    ],
    ctaText: 'Start Orchestrating',
    ctaHref: '/api/orchestrator'
  },
  {
    id: 'narrative',
    name: 'C9 Narrative',
    tagline: 'Turn your data into stories and strategy',
    description: 'Transform complex data into compelling narratives and strategic insights',
    icon: BookOpenIcon,
    gradient: { from: '#E71D73', to: '#FFD700', direction: 'to-br' },
    keyFeatures: [
      'Automated report generation from data',
      'Scenario simulation and what-if analysis',
      'Strategic planning and recommendation engine',
      'Multi-format output (text, visuals, presentations)'
    ],
    useCases: [
      {
        industry: 'enterprise',
        scenario: 'Board-ready reports from operational data',
        benefit: 'Professional insights without analyst overhead',
        example: 'Quarterly performance narratives with strategic recommendations'
      },
      {
        industry: 'education',
        scenario: 'Student progress stories for parents',
        benefit: 'Engaging updates that drive involvement',
        example: 'Personalized learning journey narratives with next steps'
      }
    ],
    apis: [
      { name: 'Narrative API', description: 'Generate stories from data', method: 'POST', endpoint: '/api/narrative/generate' },
      { name: 'Scenario API', description: 'Run what-if simulations', method: 'POST', endpoint: '/api/narrative/simulate' }
    ],
    ctaText: 'Create Narratives',
    ctaHref: '/api/narrative'
  }
]

const INDUSTRY_COLORS = {
  education: { primary: 'text-windsurf-purple', bg: 'bg-windsurf-purple/10' },
  telecom: { primary: 'text-windsurf-blue-electric', bg: 'bg-windsurf-blue-electric/10' },
  retail: { primary: 'text-windsurf-yellow-bright', bg: 'bg-windsurf-yellow-bright/10' },
  enterprise: { primary: 'text-windsurf-purple', bg: 'bg-windsurf-purple/10' },
  healthcare: { primary: 'text-c9n-teal', bg: 'bg-c9n-teal/10' },
  marketing: { primary: 'text-windsurf-pink-hot', bg: 'bg-windsurf-pink-hot/10' }
}

export default function C9CapabilitiesShowcase() {
  const [selectedCapability, setSelectedCapability] = useState<C9Capability>(C9_CAPABILITIES[0])
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  // Track section visibility
  useElementVisibility(sectionRef, () => {
    trackC9Capability(selectedCapability.id, 'view')
  })

  const filteredUseCases = selectedIndustry
    ? selectedCapability.useCases.filter(uc => uc.industry === selectedIndustry)
    : selectedCapability.useCases

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-c9n-blue-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            The C9 Suite: Coordinated AI Capabilities
          </h2>
          <p className="text-lg text-windsurf-gray-light max-w-3xl mx-auto">
            Five modular capabilities that work independently or together, delivering coordinated intelligence
            through services, APIs, or seamless integrations.
          </p>
        </div>

        {/* Capability Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {C9_CAPABILITIES.map((capability) => {
            const Icon = capability.icon
            const isSelected = selectedCapability.id === capability.id
            
            return (
              <button
                key={capability.id}
                onClick={() => {
                  setSelectedCapability(capability)
                  trackC9Capability(capability.id, 'view')
                }}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all duration-300 transform hover:scale-105",
                  isSelected
                    ? "border-windsurf-pink-hot bg-windsurf-purple/20"
                    : "border-windsurf-gray-dark bg-windsurf-purple-deep/50 hover:border-windsurf-gray"
                )}
              >
                <Icon className={cn(
                  "w-8 h-8 mx-auto mb-2",
                  isSelected ? "text-windsurf-pink-hot" : "text-windsurf-gray-light"
                )} />
                <p className={cn(
                  "text-sm font-semibold",
                  isSelected ? "text-white" : "text-windsurf-gray-light"
                )}>
                  {capability.name}
                </p>
              </button>
            )
          })}
        </div>

        {/* Selected Capability Details */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Left Column - Overview */}
          <div className="space-y-6">
            <div 
              className="p-8 rounded-xl"
              style={{
                background: `linear-gradient(${selectedCapability.gradient.direction}, ${selectedCapability.gradient.from}20, ${selectedCapability.gradient.to}20)`
              }}
            >
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {selectedCapability.name}
              </h3>
              <p className="text-lg text-windsurf-yellow-bright mb-4">
                {selectedCapability.tagline}
              </p>
              <p className="text-windsurf-gray-light mb-6">
                {selectedCapability.description}
              </p>
              
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-windsurf-gray uppercase tracking-wider">
                  Key Features
                </h4>
                {selectedCapability.keyFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-start">
                    <ChevronRightIcon className="w-5 h-5 text-c9n-teal mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-windsurf-gray-light">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* API Endpoints */}
            <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CodeIcon className="w-5 h-5 mr-2" />
                  API Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedCapability.apis.map((api, idx) => (
                  <div key={idx} className="p-3 bg-c9n-blue-dark/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm text-white">{api.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {api.method}
                      </Badge>
                    </div>
                    <code className="text-xs text-c9n-teal font-mono block mb-1">
                      {api.endpoint}
                    </code>
                    <p className="text-xs text-windsurf-gray-light">
                      {api.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Use Cases */}
          <div className="space-y-6">
            {/* Industry Filter */}
            <div>
              <h4 className="text-sm font-semibold text-windsurf-gray uppercase tracking-wider mb-3">
                Filter by Industry
              </h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedIndustry === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedIndustry(null)
                    trackC9Capability(selectedCapability.id, 'filter_industry', { industry: 'all' })
                  }}
                  className={cn(
                    "transition-all duration-300",
                    selectedIndustry === null 
                      ? "bg-windsurf-pink-hot hover:bg-windsurf-pink-hot/90"
                      : "border-windsurf-gray-dark text-windsurf-gray-light hover:border-windsurf-gray hover:text-white"
                  )}
                >
                  All Industries
                </Button>
                {Object.keys(INDUSTRY_COLORS).map((industry) => (
                  <Button
                    key={industry}
                    variant={selectedIndustry === industry ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedIndustry(industry)
                      trackC9Capability(selectedCapability.id, 'filter_industry', { industry })
                    }}
                    className={cn(
                      "capitalize transition-all duration-300",
                      selectedIndustry === industry 
                        ? "bg-windsurf-pink-hot hover:bg-windsurf-pink-hot/90"
                        : "border-windsurf-gray-dark text-windsurf-gray-light hover:border-windsurf-gray hover:text-white"
                    )}
                  >
                    {industry}
                  </Button>
                ))}
              </div>
            </div>

            {/* Use Cases */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-windsurf-gray uppercase tracking-wider">
                Industry Use Cases
              </h4>
              {filteredUseCases.length > 0 ? (
                filteredUseCases.map((useCase, idx) => {
                  const industryColor = INDUSTRY_COLORS[useCase.industry]
                  return (
                    <Card key={idx} className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark hover:border-windsurf-gray transition-all duration-300">
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={cn(industryColor.bg, industryColor.primary, "capitalize")}>
                            {useCase.industry}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg text-white">
                          {useCase.scenario}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-windsurf-gray mb-1">Benefit</p>
                          <p className="text-sm text-windsurf-gray-light">{useCase.benefit}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-windsurf-gray mb-1">Example</p>
                          <p className="text-sm text-windsurf-gray-light">{useCase.example}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <p className="text-windsurf-gray-light text-center py-8">
                  No use cases available for the selected industry.
                </p>
              )}
            </div>

            {/* CTA */}
            <div className="pt-4">
              <Button
                size="lg"
                className="w-full bg-windsurf-pink-hot hover:bg-windsurf-pink-hot/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                onClick={() => {
                  trackCTA('capability', 'click', selectedCapability.ctaText, selectedCapability.ctaHref, {
                    capability: selectedCapability.id
                  })
                }}
                asChild
              >
                <Link href={selectedCapability.ctaHref}>
                  {selectedCapability.ctaText}
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Capability Comparison Matrix */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            Coordinated Intelligence Across All Capabilities
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-windsurf-gray-dark">
                  <th className="text-left py-3 px-4 text-windsurf-gray">Capability</th>
                  <th className="text-left py-3 px-4 text-windsurf-gray">Core Function</th>
                  <th className="text-left py-3 px-4 text-windsurf-gray">Integration</th>
                  <th className="text-left py-3 px-4 text-windsurf-gray">Deployment</th>
                </tr>
              </thead>
              <tbody>
                {C9_CAPABILITIES.map((cap) => (
                  <tr key={cap.id} className="border-b border-windsurf-gray-dark/50 hover:bg-windsurf-purple-deep/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <cap.icon className="w-5 h-5 mr-2 text-windsurf-pink-hot" />
                        <span className="text-white font-medium">{cap.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-windsurf-gray-light text-sm">
                      {cap.tagline}
                    </td>
                    <td className="py-3 px-4 text-windsurf-gray-light text-sm">
                      API, SDK, Webhooks
                    </td>
                    <td className="py-3 px-4 text-windsurf-gray-light text-sm">
                      Cloud, On-premise, Hybrid
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}