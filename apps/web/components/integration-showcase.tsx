"use client"

import React, { useState } from "react"
import { 
  DatabaseIcon, 
  CloudIcon, 
  BarChart3Icon,
  ShoppingCartIcon,
  UsersIcon,
  MessageSquareIcon,
  GitBranchIcon,
  ServerIcon,
  MonitorIcon,
  ZapIcon,
  ShieldIcon,
  BrainCircuitIcon
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Integration {
  id: string
  name: string
  category: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
  setupTime: string
  popularity: "high" | "medium" | "low"
  gradient: string
  logoUrl?: string
}

interface IntegrationCategory {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  integrations: Integration[]
}

const integrationCategories: IntegrationCategory[] = [
  {
    id: "databases",
    name: "Databases & Data Warehouses",
    description: "Connect to your existing data infrastructure",
    icon: DatabaseIcon,
    integrations: [
      {
        id: "postgresql",
        name: "PostgreSQL",
        category: "databases",
        description: "Direct connection to PostgreSQL databases with real-time sync capabilities",
        icon: DatabaseIcon,
        features: ["Real-time sync", "Schema introspection", "Query optimization", "Connection pooling"],
        setupTime: "5 minutes",
        popularity: "high",
        gradient: "from-blue-500 to-blue-600"
      },
      {
        id: "snowflake",
        name: "Snowflake",
        category: "databases",
        description: "Enterprise data warehouse integration with advanced analytics",
        icon: CloudIcon,
        features: ["Warehouse scaling", "Zero-copy cloning", "Time travel queries", "Data sharing"],
        setupTime: "10 minutes",
        popularity: "high",
        gradient: "from-cyan-400 to-blue-500"
      },
      {
        id: "mongodb",
        name: "MongoDB",
        category: "databases",
        description: "NoSQL document database integration with flexible schema support",
        icon: DatabaseIcon,
        features: ["Document queries", "Aggregation pipelines", "Change streams", "Atlas integration"],
        setupTime: "7 minutes",
        popularity: "high",
        gradient: "from-green-500 to-green-600"
      },
      {
        id: "bigquery",
        name: "Google BigQuery",
        category: "databases",
        description: "Serverless data warehouse for analytics at scale",
        icon: BarChart3Icon,
        features: ["Petabyte scale", "ML integration", "Streaming inserts", "Federated queries"],
        setupTime: "8 minutes",
        popularity: "high",
        gradient: "from-yellow-400 to-orange-500"
      }
    ]
  },
  {
    id: "business-tools",
    name: "Business Applications",
    description: "Integrate with your existing business workflow",
    icon: UsersIcon,
    integrations: [
      {
        id: "salesforce",
        name: "Salesforce",
        category: "business-tools",
        description: "CRM integration for customer relationship analysis and sales insights",
        icon: UsersIcon,
        features: ["Lead scoring", "Opportunity analysis", "Customer journey mapping", "Sales forecasting"],
        setupTime: "15 minutes",
        popularity: "high",
        gradient: "from-blue-400 to-indigo-600"
      },
      {
        id: "hubspot",
        name: "HubSpot",
        category: "business-tools",
        description: "Marketing automation and CRM platform integration",
        icon: MessageSquareIcon,
        features: ["Contact analysis", "Campaign optimization", "Lead nurturing", "Attribution modeling"],
        setupTime: "12 minutes",
        popularity: "high",
        gradient: "from-orange-400 to-red-500"
      },
      {
        id: "shopify",
        name: "Shopify",
        category: "business-tools",
        description: "E-commerce platform integration for sales and customer analytics",
        icon: ShoppingCartIcon,
        features: ["Product analysis", "Customer segmentation", "Inventory optimization", "Revenue forecasting"],
        setupTime: "10 minutes",
        popularity: "medium",
        gradient: "from-green-400 to-emerald-600"
      },
      {
        id: "slack",
        name: "Slack",
        category: "business-tools",
        description: "Team communication platform for insights delivery and notifications",
        icon: MessageSquareIcon,
        features: ["Automated reports", "Alert notifications", "Interactive dashboards", "Team collaboration"],
        setupTime: "5 minutes",
        popularity: "high",
        gradient: "from-purple-400 to-pink-500"
      }
    ]
  },
  {
    id: "cloud-platforms",
    name: "Cloud Platforms",
    description: "Deploy and scale across major cloud providers",
    icon: CloudIcon,
    integrations: [
      {
        id: "aws",
        name: "Amazon Web Services",
        category: "cloud-platforms",
        description: "Complete AWS ecosystem integration with managed services",
        icon: CloudIcon,
        features: ["S3 integration", "Lambda functions", "RDS connectivity", "CloudWatch monitoring"],
        setupTime: "20 minutes",
        popularity: "high",
        gradient: "from-orange-400 to-yellow-500"
      },
      {
        id: "azure",
        name: "Microsoft Azure",
        category: "cloud-platforms",
        description: "Azure cloud services integration with enterprise features",
        icon: CloudIcon,
        features: ["Blob storage", "Azure Functions", "SQL Database", "Application Insights"],
        setupTime: "18 minutes",
        popularity: "high",
        gradient: "from-blue-500 to-cyan-400"
      },
      {
        id: "gcp",
        name: "Google Cloud Platform",
        category: "cloud-platforms",
        description: "GCP services integration with AI/ML capabilities",
        icon: CloudIcon,
        features: ["Cloud Storage", "Cloud Functions", "AI Platform", "Stackdriver"],
        setupTime: "16 minutes",
        popularity: "medium",
        gradient: "from-red-400 to-pink-500"
      },
      {
        id: "vercel",
        name: "Vercel",
        category: "cloud-platforms",
        description: "Edge deployment platform for global performance",
        icon: ZapIcon,
        features: ["Edge functions", "Global CDN", "Serverless deployment", "Analytics integration"],
        setupTime: "8 minutes",
        popularity: "medium",
        gradient: "from-gray-800 to-gray-900"
      }
    ]
  },
  {
    id: "developer-tools",
    name: "Developer Tools",
    description: "Integrate with your development workflow",
    icon: GitBranchIcon,
    integrations: [
      {
        id: "github",
        name: "GitHub",
        category: "developer-tools",
        description: "Code repository integration for development analytics",
        icon: GitBranchIcon,
        features: ["Code analysis", "Commit patterns", "Team productivity", "Issue tracking"],
        setupTime: "10 minutes",
        popularity: "high",
        gradient: "from-gray-700 to-gray-900"
      },
      {
        id: "jira",
        name: "Jira",
        category: "developer-tools",
        description: "Project management and issue tracking integration",
        icon: BrainCircuitIcon,
        features: ["Sprint analysis", "Velocity tracking", "Burndown charts", "Team performance"],
        setupTime: "12 minutes",
        popularity: "high",
        gradient: "from-blue-600 to-indigo-700"
      },
      {
        id: "docker",
        name: "Docker",
        category: "developer-tools",
        description: "Container platform integration for deployment analytics",
        icon: ServerIcon,
        features: ["Container monitoring", "Resource usage", "Deployment tracking", "Performance metrics"],
        setupTime: "15 minutes",
        popularity: "medium",
        gradient: "from-blue-400 to-blue-600"
      },
      {
        id: "kubernetes",
        name: "Kubernetes",
        category: "developer-tools",
        description: "Container orchestration platform for scalable deployments",
        icon: MonitorIcon,
        features: ["Cluster monitoring", "Pod analytics", "Resource optimization", "Auto-scaling insights"],
        setupTime: "25 minutes",
        popularity: "medium",
        gradient: "from-purple-500 to-indigo-600"
      }
    ]
  }
]

export function IntegrationShowcase() {
  const [selectedCategory, setSelectedCategory] = useState(integrationCategories[0])
  const [hoveredIntegration, setHoveredIntegration] = useState<string | null>(null)

  const getPopularityColor = (popularity: string) => {
    switch (popularity) {
      case "high": return "bg-windsurf-green-lime text-c9n-blue-dark"
      case "medium": return "bg-windsurf-yellow-bright text-c9n-blue-dark"
      case "low": return "bg-windsurf-gray-light text-c9n-blue-dark"
      default: return "bg-windsurf-gray-light text-c9n-blue-dark"
    }
  }

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {integrationCategories.map((category) => {
          const Icon = category.icon
          return (
            <Card
              key={category.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedCategory.id === category.id
                  ? "bg-windsurf-pink-hot/20 border-windsurf-pink-hot text-white"
                  : "bg-windsurf-purple-deep/30 border-windsurf-gray-light/20 text-windsurf-gray-light hover:text-white"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              <CardHeader className="pb-3">
                <Icon className="h-8 w-8 mb-2" />
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <CardDescription className="text-sm opacity-80">
                  {category.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-windsurf-gray-light">
                  {category.integrations.length} integrations available
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Selected Category Details */}
      <Card className="bg-windsurf-purple-deep/30 border-windsurf-gray-light/20 text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <selectedCategory.icon className="h-8 w-8 text-c9n-teal" />
            <div>
              <CardTitle className="text-2xl">{selectedCategory.name}</CardTitle>
              <CardDescription className="text-windsurf-gray-light">
                {selectedCategory.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedCategory.integrations.map((integration) => {
              const Icon = integration.icon
              return (
                <Card
                  key={integration.id}
                  className={`bg-gradient-to-br ${integration.gradient} border-0 text-white transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer`}
                  onMouseEnter={() => setHoveredIntegration(integration.id)}
                  onMouseLeave={() => setHoveredIntegration(null)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Icon className="h-8 w-8" />
                      <Badge className={`${getPopularityColor(integration.popularity)} text-xs`}>
                        {integration.popularity} demand
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{integration.name}</CardTitle>
                    <CardDescription className="text-white/80">
                      {integration.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Setup time:</span>
                      <span className="font-semibold">{integration.setupTime}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-white/90">Key Features:</div>
                      <ul className="space-y-1">
                        {integration.features.slice(0, hoveredIntegration === integration.id ? integration.features.length : 2).map((feature, idx) => (
                          <li key={idx} className="text-sm text-white/80 flex items-center">
                            <div className="w-1.5 h-1.5 bg-white/60 rounded-full mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                        {hoveredIntegration !== integration.id && integration.features.length > 2 && (
                          <li className="text-sm text-white/60 italic">
                            +{integration.features.length - 2} more features
                          </li>
                        )}
                      </ul>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-white/30 text-white hover:bg-white hover:text-gray-900 transition-colors"
                    >
                      View Integration Guide
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Integration Stats */}
      <Card className="bg-windsurf-purple-deep/30 border-windsurf-gray-light/20 text-white">
        <CardHeader>
          <CardTitle className="text-xl">Integration Statistics</CardTitle>
          <CardDescription className="text-windsurf-gray-light">
            Real-time metrics from our integration ecosystem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-c9n-teal mb-2">200+</div>
              <div className="text-sm text-windsurf-gray-light">Total Integrations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-windsurf-yellow-bright mb-2">99.9%</div>
              <div className="text-sm text-windsurf-gray-light">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-windsurf-pink-hot mb-2">&lt;5min</div>
              <div className="text-sm text-windsurf-gray-light">Avg Setup Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-windsurf-green-lime mb-2">24/7</div>
              <div className="text-sm text-windsurf-gray-light">Support Available</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}