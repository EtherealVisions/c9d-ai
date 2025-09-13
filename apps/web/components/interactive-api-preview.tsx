"use client"

import React, { useState } from "react"
import { 
  PlayIcon, 
  CopyIcon, 
  CheckIcon,
  CodeIcon,
  DatabaseIcon,
  ZapIcon,
  ShieldIcon
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface APIEndpoint {
  id: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  requestExample: string
  responseExample: string
  curlExample: string
  parameters?: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
}

const apiEndpoints: APIEndpoint[] = [
  {
    id: "analyze-data",
    method: "POST",
    path: "/api/v1/analyze",
    title: "Analyze Data",
    description: "Submit data for AI-powered analysis and relationship mapping",
    icon: ZapIcon,
    requestExample: `{
  "data": {
    "source": "customer_transactions",
    "format": "json",
    "filters": {
      "date_range": {
        "start": "2024-01-01",
        "end": "2024-12-31"
      },
      "categories": ["retail", "online"]
    }
  },
  "analysis_type": "relationship_mapping",
  "options": {
    "include_predictions": true,
    "confidence_threshold": 0.85
  }
}`,
    responseExample: `{
  "analysis_id": "ana_1234567890",
  "status": "completed",
  "results": {
    "relationships": [
      {
        "source": "customer_123",
        "target": "product_456",
        "relationship_type": "purchase_pattern",
        "strength": 0.92,
        "confidence": 0.89
      }
    ],
    "predictions": [
      {
        "type": "next_purchase",
        "customer_id": "customer_123",
        "predicted_product": "product_789",
        "probability": 0.87,
        "timeframe": "7_days"
      }
    ],
    "insights": [
      "Strong correlation between weekend purchases and premium products",
      "Customer segment shows 23% higher lifetime value"
    ]
  },
  "metadata": {
    "processing_time_ms": 245,
    "data_points_analyzed": 15420,
    "created_at": "2024-01-15T10:30:00Z"
  }
}`,
    curlExample: `curl -X POST "https://api.c9d.ai/v1/analyze" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": {
      "source": "customer_transactions",
      "format": "json"
    },
    "analysis_type": "relationship_mapping"
  }'`,
    parameters: [
      { name: "data", type: "object", required: true, description: "Data source and configuration" },
      { name: "analysis_type", type: "string", required: true, description: "Type of analysis to perform" },
      { name: "options", type: "object", required: false, description: "Additional analysis options" }
    ]
  },
  {
    id: "get-insights",
    method: "GET",
    path: "/api/v1/insights/{analysis_id}",
    title: "Get Insights",
    description: "Retrieve detailed insights from a completed analysis",
    icon: DatabaseIcon,
    requestExample: `// No request body required for GET requests
// Analysis ID is passed as a URL parameter`,
    responseExample: `{
  "analysis_id": "ana_1234567890",
  "insights": {
    "summary": "Analysis revealed 3 key relationship clusters with high predictive value",
    "key_findings": [
      {
        "type": "pattern",
        "description": "Seasonal purchasing behavior identified",
        "impact_score": 0.94,
        "actionable_recommendations": [
          "Increase inventory for Q4 seasonal products",
          "Target marketing campaigns 2 weeks before peak seasons"
        ]
      }
    ],
    "visualizations": [
      {
        "type": "network_graph",
        "url": "https://api.c9d.ai/v1/visualizations/net_abc123",
        "description": "Customer-product relationship network"
      }
    ]
  },
  "performance_metrics": {
    "accuracy": 0.92,
    "confidence": 0.88,
    "coverage": 0.95
  }
}`,
    curlExample: `curl -X GET "https://api.c9d.ai/v1/insights/ana_1234567890" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Accept: application/json"`,
    parameters: [
      { name: "analysis_id", type: "string", required: true, description: "Unique identifier for the analysis" }
    ]
  },
  {
    id: "create-agent",
    method: "POST",
    path: "/api/v1/agents",
    title: "Create AI Agent",
    description: "Create and configure a new AI agent for automated analysis",
    icon: CodeIcon,
    requestExample: `{
  "name": "Customer Behavior Analyzer",
  "description": "Automated agent for analyzing customer purchase patterns",
  "configuration": {
    "data_sources": ["crm", "transactions", "web_analytics"],
    "analysis_frequency": "daily",
    "triggers": [
      {
        "type": "data_threshold",
        "condition": "new_customers > 100"
      },
      {
        "type": "schedule",
        "cron": "0 9 * * MON"
      }
    ],
    "outputs": {
      "format": "json",
      "destinations": ["webhook", "email"],
      "webhook_url": "https://your-app.com/webhooks/insights"
    }
  },
  "permissions": {
    "data_access": ["read"],
    "analysis_types": ["relationship_mapping", "predictive_analysis"]
  }
}`,
    responseExample: `{
  "agent_id": "agent_abc123def456",
  "name": "Customer Behavior Analyzer",
  "status": "active",
  "configuration": {
    "data_sources": ["crm", "transactions", "web_analytics"],
    "analysis_frequency": "daily",
    "next_execution": "2024-01-16T09:00:00Z"
  },
  "api_endpoints": {
    "status": "/api/v1/agents/agent_abc123def456/status",
    "logs": "/api/v1/agents/agent_abc123def456/logs",
    "results": "/api/v1/agents/agent_abc123def456/results"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}`,
    curlExample: `curl -X POST "https://api.c9d.ai/v1/agents" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Customer Behavior Analyzer",
    "configuration": {
      "data_sources": ["crm", "transactions"],
      "analysis_frequency": "daily"
    }
  }'`,
    parameters: [
      { name: "name", type: "string", required: true, description: "Human-readable name for the agent" },
      { name: "description", type: "string", required: false, description: "Optional description of the agent's purpose" },
      { name: "configuration", type: "object", required: true, description: "Agent configuration and behavior settings" },
      { name: "permissions", type: "object", required: false, description: "Access permissions and restrictions" }
    ]
  }
]

export function InteractiveAPIPreview() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(apiEndpoints[0])
  const [activeTab, setActiveTab] = useState("request")
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "text-windsurf-blue-electric bg-windsurf-blue-electric/20"
      case "POST": return "text-windsurf-green-lime bg-windsurf-green-lime/20"
      case "PUT": return "text-windsurf-yellow-bright bg-windsurf-yellow-bright/20"
      case "DELETE": return "text-windsurf-pink-hot bg-windsurf-pink-hot/20"
      default: return "text-windsurf-gray-light bg-windsurf-gray-light/20"
    }
  }

  return (
    <div className="space-y-6">
      {/* API Endpoint Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {apiEndpoints.map((endpoint) => {
          const Icon = endpoint.icon
          return (
            <Card
              key={endpoint.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedEndpoint.id === endpoint.id
                  ? "bg-windsurf-pink-hot/20 border-windsurf-pink-hot text-white"
                  : "bg-windsurf-purple-deep/30 border-windsurf-gray-light/20 text-windsurf-gray-light hover:text-white"
              }`}
              onClick={() => setSelectedEndpoint(endpoint)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6" />
                  <span className={`px-2 py-1 rounded text-xs font-mono ${getMethodColor(endpoint.method)}`}>
                    {endpoint.method}
                  </span>
                </div>
                <CardTitle className="text-lg">{endpoint.title}</CardTitle>
                <CardDescription className="text-sm opacity-80">
                  {endpoint.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <code className="text-xs font-mono opacity-70">{endpoint.path}</code>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* API Documentation */}
      <Card className="bg-windsurf-purple-deep/30 border-windsurf-gray-light/20 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-3">
                <span className={`px-3 py-1 rounded ${getMethodColor(selectedEndpoint.method)}`}>
                  {selectedEndpoint.method}
                </span>
                {selectedEndpoint.title}
              </CardTitle>
              <CardDescription className="text-windsurf-gray-light mt-2">
                {selectedEndpoint.description}
              </CardDescription>
              <code className="text-sm font-mono text-c9n-teal mt-2 block">
                {selectedEndpoint.path}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-windsurf-pink-hot text-windsurf-pink-hot hover:bg-windsurf-pink-hot hover:text-white"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Try It
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-windsurf-purple-deep/50">
              <TabsTrigger value="request" className="data-[state=active]:bg-windsurf-pink-hot">
                Request
              </TabsTrigger>
              <TabsTrigger value="response" className="data-[state=active]:bg-windsurf-pink-hot">
                Response
              </TabsTrigger>
              <TabsTrigger value="curl" className="data-[state=active]:bg-windsurf-pink-hot">
                cURL
              </TabsTrigger>
              <TabsTrigger value="parameters" className="data-[state=active]:bg-windsurf-pink-hot">
                Parameters
              </TabsTrigger>
            </TabsList>

            <TabsContent value="request" className="mt-6">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10 text-windsurf-gray-light hover:text-white"
                  onClick={() => copyToClipboard(selectedEndpoint.requestExample, 'request')}
                >
                  {copiedStates.request ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
                <pre className="bg-c9n-blue-dark p-4 rounded-lg overflow-x-auto text-sm">
                  <code className="text-windsurf-gray-light">
                    {selectedEndpoint.requestExample}
                  </code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="response" className="mt-6">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10 text-windsurf-gray-light hover:text-white"
                  onClick={() => copyToClipboard(selectedEndpoint.responseExample, 'response')}
                >
                  {copiedStates.response ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
                <pre className="bg-c9n-blue-dark p-4 rounded-lg overflow-x-auto text-sm">
                  <code className="text-windsurf-gray-light">
                    {selectedEndpoint.responseExample}
                  </code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="curl" className="mt-6">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10 text-windsurf-gray-light hover:text-white"
                  onClick={() => copyToClipboard(selectedEndpoint.curlExample, 'curl')}
                >
                  {copiedStates.curl ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
                <pre className="bg-c9n-blue-dark p-4 rounded-lg overflow-x-auto text-sm">
                  <code className="text-windsurf-gray-light">
                    {selectedEndpoint.curlExample}
                  </code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="parameters" className="mt-6">
              {selectedEndpoint.parameters ? (
                <div className="space-y-4">
                  {selectedEndpoint.parameters.map((param) => (
                    <div key={param.name} className="border border-windsurf-gray-light/20 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-c9n-teal font-mono">{param.name}</code>
                        <span className="text-xs px-2 py-1 bg-windsurf-blue-electric/20 text-windsurf-blue-electric rounded">
                          {param.type}
                        </span>
                        {param.required && (
                          <span className="text-xs px-2 py-1 bg-windsurf-pink-hot/20 text-windsurf-pink-hot rounded">
                            required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-windsurf-gray-light">{param.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-windsurf-gray-light">No parameters required for this endpoint.</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}