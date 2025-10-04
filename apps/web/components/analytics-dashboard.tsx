"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  BarChartIcon, 
  TrendingUpIcon, 
  UserIcon, 
  MousePointerClickIcon,
  ActivityIcon,
  LayersIcon
} from "lucide-react"

interface AnalyticsMetric {
  name: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

interface CapabilityMetrics {
  capability: string
  views: number
  ctaClicks: number
  conversionRate: string
  topIndustry: string
}

// Mock data for development - in production, this would come from your analytics API
const mockMetrics: AnalyticsMetric[] = [
  { name: 'Page Views', value: '12,543', change: '+12.3%', trend: 'up' },
  { name: 'Unique Visitors', value: '3,842', change: '+8.7%', trend: 'up' },
  { name: 'Avg. Session Duration', value: '2m 34s', change: '+5.2%', trend: 'up' },
  { name: 'Bounce Rate', value: '34.2%', change: '-2.1%', trend: 'down' },
]

const mockCapabilityMetrics: CapabilityMetrics[] = [
  { capability: 'C9 Insight', views: 3421, ctaClicks: 342, conversionRate: '10.0%', topIndustry: 'Education' },
  { capability: 'C9 Persona', views: 2834, ctaClicks: 425, conversionRate: '15.0%', topIndustry: 'Enterprise' },
  { capability: 'C9 Domain', views: 2156, ctaClicks: 238, conversionRate: '11.0%', topIndustry: 'Healthcare' },
  { capability: 'C9 Orchestrator', views: 1892, ctaClicks: 208, conversionRate: '11.0%', topIndustry: 'Marketing' },
  { capability: 'C9 Narrative', views: 1654, ctaClicks: 231, conversionRate: '14.0%', topIndustry: 'Enterprise' },
]

const mockScrollDepth = [
  { depth: '25%', users: 3842 },
  { depth: '50%', users: 2916 },
  { depth: '75%', users: 1847 },
  { depth: '100%', users: 926 },
]

export default function AnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Landing Page Analytics</h2>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="bg-windsurf-purple-deep border border-windsurf-gray-dark rounded-md px-3 py-1 text-sm text-windsurf-gray-light"
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockMetrics.map((metric) => (
          <Card key={metric.name} className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-windsurf-gray">
                {metric.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{metric.value}</span>
                {metric.change && (
                  <span className={cn(
                    "text-sm font-medium",
                    metric.trend === 'up' ? "text-green-400" : 
                    metric.trend === 'down' ? "text-red-400" : 
                    "text-windsurf-gray"
                  )}>
                    {metric.trend === 'up' && '↑'}
                    {metric.trend === 'down' && '↓'}
                    {metric.change}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="capabilities" className="space-y-4">
        <TabsList className="bg-windsurf-purple-deep border-windsurf-gray-dark">
          <TabsTrigger value="capabilities" className="data-[state=active]:bg-windsurf-purple">
            C9 Capabilities
          </TabsTrigger>
          <TabsTrigger value="conversion" className="data-[state=active]:bg-windsurf-purple">
            Conversion Funnel
          </TabsTrigger>
          <TabsTrigger value="engagement" className="data-[state=active]:bg-windsurf-purple">
            User Engagement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="capabilities">
          <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark">
            <CardHeader>
              <CardTitle className="text-white">C9 Capability Performance</CardTitle>
              <CardDescription className="text-windsurf-gray-light">
                Views, clicks, and conversion rates for each C9 capability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-windsurf-gray-dark">
                      <th className="text-left py-3 px-4 text-windsurf-gray">Capability</th>
                      <th className="text-right py-3 px-4 text-windsurf-gray">Views</th>
                      <th className="text-right py-3 px-4 text-windsurf-gray">CTA Clicks</th>
                      <th className="text-right py-3 px-4 text-windsurf-gray">Conversion Rate</th>
                      <th className="text-left py-3 px-4 text-windsurf-gray">Top Industry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockCapabilityMetrics.map((metric) => (
                      <tr key={metric.capability} className="border-b border-windsurf-gray-dark/50 hover:bg-windsurf-purple-deep/30 transition-colors">
                        <td className="py-3 px-4 text-white font-medium">{metric.capability}</td>
                        <td className="py-3 px-4 text-right text-windsurf-gray-light">{metric.views.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-windsurf-gray-light">{metric.ctaClicks}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="outline" className="text-c9n-teal border-c9n-teal">
                            {metric.conversionRate}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-windsurf-gray-light">{metric.topIndustry}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion">
          <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark">
            <CardHeader>
              <CardTitle className="text-white">Conversion Funnel</CardTitle>
              <CardDescription className="text-windsurf-gray-light">
                User journey from landing to conversion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-windsurf-gray-light">Landing Page Visit</span>
                    <span className="text-white font-medium">3,842 (100%)</span>
                  </div>
                  <div className="w-full bg-windsurf-gray-dark rounded-full h-2">
                    <div className="bg-windsurf-pink-hot h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-windsurf-gray-light">C9 Capability View</span>
                    <span className="text-white font-medium">3,068 (79.9%)</span>
                  </div>
                  <div className="w-full bg-windsurf-gray-dark rounded-full h-2">
                    <div className="bg-windsurf-blue-electric h-2 rounded-full" style={{ width: '79.9%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-windsurf-gray-light">CTA Click</span>
                    <span className="text-white font-medium">1,444 (37.6%)</span>
                  </div>
                  <div className="w-full bg-windsurf-gray-dark rounded-full h-2">
                    <div className="bg-c9n-teal h-2 rounded-full" style={{ width: '37.6%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-windsurf-gray-light">Conversion</span>
                    <span className="text-white font-medium">461 (12.0%)</span>
                  </div>
                  <div className="w-full bg-windsurf-gray-dark rounded-full h-2">
                    <div className="bg-windsurf-yellow-bright h-2 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark">
            <CardHeader>
              <CardTitle className="text-white">User Engagement</CardTitle>
              <CardDescription className="text-windsurf-gray-light">
                Scroll depth and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-windsurf-gray mb-4">Scroll Depth</h4>
                  <div className="space-y-3">
                    {mockScrollDepth.map((depth) => (
                      <div key={depth.depth} className="flex items-center justify-between">
                        <span className="text-windsurf-gray-light">{depth.depth}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-48 bg-windsurf-gray-dark rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-windsurf-purple to-windsurf-pink-hot h-2 rounded-full" 
                              style={{ width: `${(depth.users / mockScrollDepth[0].users) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-white font-medium text-sm w-20 text-right">
                            {depth.users.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-windsurf-gray mb-4">Top Interactions</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-windsurf-gray-light">Hero CTA Click</span>
                      <span className="text-white font-medium">842</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-windsurf-gray-light">Capability Tab Switch</span>
                      <span className="text-white font-medium">2,341</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-windsurf-gray-light">Industry Filter</span>
                      <span className="text-white font-medium">1,023</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-windsurf-gray-light">API Documentation View</span>
                      <span className="text-white font-medium">567</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}