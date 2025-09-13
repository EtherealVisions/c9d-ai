"use client"

import React, { useState } from "react"
import { 
  DatabaseIcon, 
  CloudIcon, 
  ServerIcon,
  ShieldIcon,
  ZapIcon,
  BrainCircuitIcon,
  MonitorIcon,
  GitBranchIcon,
  UsersIcon,
  BarChart3Icon,
  ArrowRightIcon,
  InfoIcon
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ArchitectureComponent {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  position: { x: number; y: number }
  connections: string[]
  details: {
    technology: string
    scalability: string
    performance: string
    security: string
  }
  gradient: string
}

const architectureComponents: ArchitectureComponent[] = [
  {
    id: "client-apps",
    name: "Client Applications",
    description: "Web, mobile, and desktop applications",
    icon: MonitorIcon,
    position: { x: 10, y: 20 },
    connections: ["api-gateway"],
    details: {
      technology: "React, React Native, Electron",
      scalability: "Horizontal scaling via CDN",
      performance: "Sub-100ms response times",
      security: "OAuth 2.0, JWT tokens"
    },
    gradient: "from-windsurf-blue-electric to-c9n-teal"
  },
  {
    id: "api-gateway",
    name: "API Gateway",
    description: "Unified entry point for all API requests",
    icon: GitBranchIcon,
    position: { x: 10, y: 40 },
    connections: ["auth-service", "orchestration-engine"],
    details: {
      technology: "Kong, AWS API Gateway",
      scalability: "Auto-scaling based on traffic",
      performance: "Rate limiting, caching",
      security: "API key management, throttling"
    },
    gradient: "from-windsurf-purple-vibrant to-windsurf-pink-hot"
  },
  {
    id: "auth-service",
    name: "Authentication Service",
    description: "User authentication and authorization",
    icon: ShieldIcon,
    position: { x: 30, y: 20 },
    connections: ["user-management"],
    details: {
      technology: "Clerk, Auth0, custom JWT",
      scalability: "Multi-region deployment",
      performance: "Token caching, session management",
      security: "Multi-factor auth, zero-trust"
    },
    gradient: "from-windsurf-yellow-bright to-windsurf-green-lime"
  },
  {
    id: "orchestration-engine",
    name: "AI Orchestration Engine",
    description: "Core AI processing and coordination",
    icon: BrainCircuitIcon,
    position: { x: 30, y: 60 },
    connections: ["ml-services", "data-processing", "agent-runtime"],
    details: {
      technology: "Kubernetes, Apache Airflow",
      scalability: "Auto-scaling ML workloads",
      performance: "GPU acceleration, model caching",
      security: "Encrypted model storage"
    },
    gradient: "from-windsurf-pink-hot to-windsurf-purple-vibrant"
  },
  {
    id: "ml-services",
    name: "ML Services",
    description: "Machine learning models and inference",
    icon: ZapIcon,
    position: { x: 50, y: 40 },
    connections: ["model-registry", "data-lake"],
    details: {
      technology: "TensorFlow, PyTorch, MLflow",
      scalability: "Model serving at scale",
      performance: "GPU clusters, model optimization",
      security: "Model encryption, access control"
    },
    gradient: "from-c9n-teal to-windsurf-blue-electric"
  },
  {
    id: "agent-runtime",
    name: "Agent Runtime",
    description: "Autonomous agent execution environment",
    icon: UsersIcon,
    position: { x: 50, y: 80 },
    connections: ["data-processing", "notification-service"],
    details: {
      technology: "Docker, Kubernetes, custom runtime",
      scalability: "Container orchestration",
      performance: "Resource optimization",
      security: "Sandboxed execution"
    },
    gradient: "from-windsurf-green-lime to-windsurf-yellow-bright"
  },
  {
    id: "data-processing",
    name: "Data Processing",
    description: "Real-time and batch data processing",
    icon: BarChart3Icon,
    position: { x: 70, y: 60 },
    connections: ["data-lake", "cache-layer"],
    details: {
      technology: "Apache Kafka, Spark, Flink",
      scalability: "Distributed processing",
      performance: "Stream processing, parallel execution",
      security: "Data encryption, access logs"
    },
    gradient: "from-windsurf-purple-vibrant to-windsurf-pink-hot"
  },
  {
    id: "data-lake",
    name: "Data Lake",
    description: "Centralized data storage and management",
    icon: DatabaseIcon,
    position: { x: 90, y: 40 },
    connections: ["backup-storage"],
    details: {
      technology: "S3, Delta Lake, Iceberg",
      scalability: "Petabyte-scale storage",
      performance: "Columnar storage, indexing",
      security: "Encryption at rest, access control"
    },
    gradient: "from-windsurf-blue-electric to-c9n-teal"
  },
  {
    id: "cache-layer",
    name: "Cache Layer",
    description: "High-performance caching for fast access",
    icon: ZapIcon,
    position: { x: 70, y: 80 },
    connections: ["monitoring"],
    details: {
      technology: "Redis, Memcached",
      scalability: "Distributed caching",
      performance: "Sub-millisecond access",
      security: "Encrypted connections"
    },
    gradient: "from-windsurf-yellow-bright to-windsurf-green-lime"
  },
  {
    id: "user-management",
    name: "User Management",
    description: "User profiles and organization management",
    icon: UsersIcon,
    position: { x: 50, y: 20 },
    connections: ["database"],
    details: {
      technology: "PostgreSQL, Supabase",
      scalability: "Read replicas, sharding",
      performance: "Connection pooling, indexing",
      security: "Row-level security, audit logs"
    },
    gradient: "from-c9n-teal to-windsurf-blue-electric"
  },
  {
    id: "database",
    name: "Primary Database",
    description: "Transactional data storage",
    icon: DatabaseIcon,
    position: { x: 70, y: 20 },
    connections: ["backup-storage"],
    details: {
      technology: "PostgreSQL with extensions",
      scalability: "Master-slave replication",
      performance: "Query optimization, indexing",
      security: "Encryption, access control"
    },
    gradient: "from-windsurf-purple-vibrant to-windsurf-pink-hot"
  },
  {
    id: "model-registry",
    name: "Model Registry",
    description: "ML model versioning and management",
    icon: GitBranchIcon,
    position: { x: 70, y: 40 },
    connections: ["backup-storage"],
    details: {
      technology: "MLflow, DVC, custom registry",
      scalability: "Distributed model storage",
      performance: "Model caching, lazy loading",
      security: "Model signing, access control"
    },
    gradient: "from-windsurf-green-lime to-windsurf-yellow-bright"
  },
  {
    id: "notification-service",
    name: "Notification Service",
    description: "Real-time notifications and alerts",
    icon: MonitorIcon,
    position: { x: 30, y: 80 },
    connections: ["monitoring"],
    details: {
      technology: "WebSockets, Push notifications",
      scalability: "Message queuing, load balancing",
      performance: "Real-time delivery",
      security: "Encrypted channels"
    },
    gradient: "from-windsurf-pink-hot to-windsurf-purple-vibrant"
  },
  {
    id: "monitoring",
    name: "Monitoring & Observability",
    description: "System health and performance monitoring",
    icon: BarChart3Icon,
    position: { x: 50, y: 100 },
    connections: ["backup-storage"],
    details: {
      technology: "Prometheus, Grafana, Jaeger",
      scalability: "Distributed tracing",
      performance: "Real-time metrics",
      security: "Secure metric collection"
    },
    gradient: "from-windsurf-blue-electric to-c9n-teal"
  },
  {
    id: "backup-storage",
    name: "Backup & Recovery",
    description: "Data backup and disaster recovery",
    icon: CloudIcon,
    position: { x: 90, y: 80 },
    connections: [],
    details: {
      technology: "S3 Glacier, automated backups",
      scalability: "Multi-region replication",
      performance: "Incremental backups",
      security: "Encrypted backups, access logs"
    },
    gradient: "from-windsurf-yellow-bright to-windsurf-green-lime"
  }
]

export function ArchitectureDiagram() {
  const [selectedComponent, setSelectedComponent] = useState<ArchitectureComponent | null>(null)
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)

  const getConnectionPath = (from: ArchitectureComponent, to: ArchitectureComponent) => {
    const startX = from.position.x + 5
    const startY = from.position.y + 2.5
    const endX = to.position.x + 5
    const endY = to.position.y + 2.5
    
    return `M ${startX} ${startY} L ${endX} ${endY}`
  }

  const getConnectedComponents = (componentId: string) => {
    const component = architectureComponents.find(c => c.id === componentId)
    if (!component) return []
    
    return component.connections.map(connId => 
      architectureComponents.find(c => c.id === connId)
    ).filter(Boolean) as ArchitectureComponent[]
  }

  return (
    <div className="space-y-6">
      {/* Architecture Overview */}
      <Card className="bg-windsurf-purple-deep/30 border-windsurf-gray-light/20 text-white">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <ServerIcon className="h-8 w-8 text-c9n-teal" />
            C9d.ai System Architecture
          </CardTitle>
          <CardDescription className="text-windsurf-gray-light">
            Scalable, secure, and high-performance architecture designed for enterprise AI workloads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Interactive Architecture Diagram */}
          <div className="relative bg-c9n-blue-dark rounded-lg p-8 overflow-hidden">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {architectureComponents.map(component => 
                getConnectedComponents(component.id).map(connectedComponent => (
                  <path
                    key={`${component.id}-${connectedComponent.id}`}
                    d={getConnectionPath(component, connectedComponent)}
                    stroke={hoveredComponent === component.id || hoveredComponent === connectedComponent.id 
                      ? "#E71D73" : "#2CE4B8"}
                    strokeWidth={hoveredComponent === component.id || hoveredComponent === connectedComponent.id ? "3" : "2"}
                    strokeOpacity={hoveredComponent === component.id || hoveredComponent === connectedComponent.id ? "1" : "0.4"}
                    fill="none"
                    className="transition-all duration-300"
                  />
                ))
              )}
              
              {/* Arrow markers */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#2CE4B8" />
                </marker>
              </defs>
            </svg>

            {/* Architecture Components */}
            <div className="relative grid grid-cols-10 gap-4 h-96">
              {architectureComponents.map((component) => {
                const Icon = component.icon
                const isHovered = hoveredComponent === component.id
                const isSelected = selectedComponent?.id === component.id
                const isConnected = selectedComponent && 
                  (selectedComponent.connections.includes(component.id) || 
                   component.connections.includes(selectedComponent.id))

                return (
                  <div
                    key={component.id}
                    className={`absolute cursor-pointer transition-all duration-300 ${
                      isHovered || isSelected ? 'z-20 scale-110' : 'z-10'
                    } ${isConnected ? 'z-15 scale-105' : ''}`}
                    style={{
                      left: `${component.position.x}%`,
                      top: `${component.position.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onMouseEnter={() => setHoveredComponent(component.id)}
                    onMouseLeave={() => setHoveredComponent(null)}
                    onClick={() => setSelectedComponent(component)}
                  >
                    <div className={`
                      w-20 h-20 rounded-xl bg-gradient-to-br ${component.gradient} 
                      border-2 border-white/20 flex items-center justify-center
                      shadow-lg hover:shadow-xl transition-all duration-300
                      ${isHovered || isSelected ? 'shadow-windsurf-pink-hot/50' : ''}
                      ${isConnected ? 'ring-2 ring-windsurf-yellow-bright/60' : ''}
                    `}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-semibold text-white whitespace-nowrap">
                        {component.name}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Component Details */}
          {selectedComponent && (
            <Card className="mt-6 bg-gradient-to-br from-windsurf-purple-deep to-c9n-blue-dark border-windsurf-pink-hot/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${selectedComponent.gradient} flex items-center justify-center`}>
                      <selectedComponent.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white">{selectedComponent.name}</CardTitle>
                      <CardDescription className="text-windsurf-gray-light">
                        {selectedComponent.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedComponent(null)}
                    className="text-windsurf-gray-light hover:text-white"
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-windsurf-yellow-bright mb-2">Technology Stack</h4>
                    <p className="text-sm text-windsurf-gray-light">{selectedComponent.details.technology}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-windsurf-yellow-bright mb-2">Scalability</h4>
                    <p className="text-sm text-windsurf-gray-light">{selectedComponent.details.scalability}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-windsurf-yellow-bright mb-2">Performance</h4>
                    <p className="text-sm text-windsurf-gray-light">{selectedComponent.details.performance}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-windsurf-yellow-bright mb-2">Security</h4>
                    <p className="text-sm text-windsurf-gray-light">{selectedComponent.details.security}</p>
                  </div>
                </div>

                {selectedComponent.connections.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-windsurf-yellow-bright mb-2">Connected Components</h4>
                    <div className="flex flex-wrap gap-2">
                      {getConnectedComponents(selectedComponent.id).map(connectedComponent => (
                        <Badge
                          key={connectedComponent.id}
                          variant="outline"
                          className="border-c9n-teal text-c9n-teal hover:bg-c9n-teal hover:text-c9n-blue-dark cursor-pointer"
                          onClick={() => setSelectedComponent(connectedComponent)}
                        >
                          {connectedComponent.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Architecture Principles */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-light/20 text-white">
              <CardHeader className="pb-3">
                <ShieldIcon className="h-8 w-8 text-windsurf-yellow-bright mb-2" />
                <CardTitle className="text-lg">Security First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-windsurf-gray-light">
                  Zero-trust architecture with end-to-end encryption, comprehensive audit logging, 
                  and role-based access control at every layer.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-light/20 text-white">
              <CardHeader className="pb-3">
                <ZapIcon className="h-8 w-8 text-c9n-teal mb-2" />
                <CardTitle className="text-lg">High Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-windsurf-gray-light">
                  Optimized for sub-100ms response times with intelligent caching, 
                  GPU acceleration, and distributed processing capabilities.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-light/20 text-white">
              <CardHeader className="pb-3">
                <CloudIcon className="h-8 w-8 text-windsurf-pink-hot mb-2" />
                <CardTitle className="text-lg">Cloud Native</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-windsurf-gray-light">
                  Built for the cloud with auto-scaling, multi-region deployment, 
                  and seamless integration with major cloud providers.
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}