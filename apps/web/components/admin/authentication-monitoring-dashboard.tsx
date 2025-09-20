/**
 * Authentication Monitoring Dashboard Component
 * 
 * This component provides a comprehensive dashboard for monitoring authentication
 * metrics, performance, and user engagement analytics.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  UserPlus, 
  LogIn, 
  AlertTriangle,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  Download,
  Calendar,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types for dashboard data
interface DashboardMetrics {
  summary: {
    totalUsers: number
    newSignUps: number
    successfulSignIns: number
    overallConversionRate: number
    averageSessionDuration: number
    bounceRate: number
  }
  authentication: {
    signUpRate: MetricData
    signInRate: MetricData
    conversionRate: MetricData
  }
  performance: {
    averageLoadTime: PerformanceMetric
    averageRenderTime: PerformanceMetric
    cacheHitRate: MetricData
    apiResponseTime: PerformanceMetric
  }
  userBehavior: {
    deviceBreakdown: DeviceMetrics
    socialAuthUsage: SocialAuthMetrics
    funnelAnalysis: FunnelData
  }
  insights: Insight[]
  recommendations: Recommendation[]
}

interface MetricData {
  current: number
  previous: number
  change: number
  trend: 'up' | 'down'
  timeSeries?: TimeSeriesPoint[]
}

interface PerformanceMetric extends MetricData {
  p95: number
  p99: number
}

interface TimeSeriesPoint {
  timestamp: string
  value: number
}

interface DeviceMetrics {
  desktop: DeviceData
  mobile: DeviceData
  tablet: DeviceData
}

interface DeviceData {
  percentage: number
  count: number
  conversionRate: number
}

interface SocialAuthMetrics {
  google: SocialAuthData
  github: SocialAuthData
  microsoft: SocialAuthData
}

interface SocialAuthData {
  percentage: number
  count: number
  conversionRate: number
}

interface FunnelData {
  steps: FunnelStep[]
  overallConversionRate: number
  biggestDropOff: {
    step: string
    dropOffRate: number
  }
}

interface FunnelStep {
  step: string
  users: number
  conversionRate: number
  dropOffRate: number
}

interface Insight {
  type: 'positive' | 'warning' | 'info'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  expectedImpact: string
}

/**
 * Main Authentication Monitoring Dashboard Component
 */
export function AuthenticationMonitoringDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('7d')
  const [refreshing, setRefreshing] = useState(false)

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [timeRange])

  /**
   * Load dashboard metrics data
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const endDate = new Date()
      const startDate = new Date()
      
      // Calculate start date based on time range
      switch (timeRange) {
        case '24h':
          startDate.setDate(startDate.getDate() - 1)
          break
        case '7d':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(startDate.getDate() - 90)
          break
      }

      const response = await fetch('/api/analytics/metrics?' + new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        metrics: 'signUpRate,signInRate,conversionRate,performanceMetrics,deviceBreakdown,socialAuthUsage,funnelAnalysis'
      }))

      if (!response.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const data = await response.json()
      
      // Generate comprehensive report
      const reportResponse = await fetch('/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          granularity: 'day',
          metrics: ['signUpRate', 'signInRate', 'conversionRate', 'performanceMetrics', 'deviceBreakdown', 'socialAuthUsage', 'funnelAnalysis']
        })
      })

      if (reportResponse.ok) {
        const reportData = await reportResponse.json()
        setMetrics(reportData.report)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Refresh dashboard data
   */
  const refreshData = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  /**
   * Export dashboard data
   */
  const exportData = () => {
    if (!metrics) return

    const dataStr = JSON.stringify(metrics, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `auth-metrics-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Authentication Monitoring</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={loadDashboardData} className="ml-2">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No metrics data available</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Authentication Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor authentication performance and user engagement metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={metrics.summary.totalUsers.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
          description="Active users in period"
        />
        <MetricCard
          title="New Sign-ups"
          value={metrics.summary.newSignUps.toLocaleString()}
          icon={<UserPlus className="h-4 w-4" />}
          description="Completed registrations"
          change={metrics.authentication.signUpRate.change}
          trend={metrics.authentication.signUpRate.trend}
        />
        <MetricCard
          title="Successful Sign-ins"
          value={metrics.summary.successfulSignIns.toLocaleString()}
          icon={<LogIn className="h-4 w-4" />}
          description="Successful authentications"
          change={metrics.authentication.signInRate.change}
          trend={metrics.authentication.signInRate.trend}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${(metrics.summary.overallConversionRate * 100).toFixed(1)}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Overall auth conversion"
          change={metrics.authentication.conversionRate.change}
          trend={metrics.authentication.conversionRate.trend}
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="devices">Devices & Social</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Authentication Rates Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Authentication Rates</CardTitle>
                <CardDescription>Sign-up and sign-in success rates over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.authentication.signUpRate.timeSeries || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      name="Sign-up Rate"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversion Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Breakdown</CardTitle>
                <CardDescription>Detailed conversion metrics by flow type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sign-up Conversion</span>
                    <span className="font-medium">
                      {(metrics.authentication.conversionRate.breakdown?.signUp * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics.authentication.conversionRate.breakdown?.signUp * 100 || 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sign-in Conversion</span>
                    <span className="font-medium">
                      {(metrics.authentication.conversionRate.breakdown?.signIn * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics.authentication.conversionRate.breakdown?.signIn * 100 || 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Email Verification</span>
                    <span className="font-medium">
                      {(metrics.authentication.conversionRate.breakdown?.emailVerification * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics.authentication.conversionRate.breakdown?.emailVerification * 100 || 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Social Auth</span>
                    <span className="font-medium">
                      {(metrics.authentication.conversionRate.breakdown?.socialAuth * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics.authentication.conversionRate.breakdown?.socialAuth * 100 || 0} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Load Performance</CardTitle>
                <CardDescription>Page load and render times</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Average Load Time</span>
                  <div className="text-right">
                    <div className="font-medium">{metrics.performance.averageLoadTime.current}ms</div>
                    <div className={cn(
                      "text-sm flex items-center",
                      metrics.performance.averageLoadTime.trend === 'down' ? "text-green-600" : "text-red-600"
                    )}>
                      {metrics.performance.averageLoadTime.trend === 'down' ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(metrics.performance.averageLoadTime.change)}ms
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average Render Time</span>
                  <div className="text-right">
                    <div className="font-medium">{metrics.performance.averageRenderTime.current}ms</div>
                    <div className={cn(
                      "text-sm flex items-center",
                      metrics.performance.averageRenderTime.trend === 'down' ? "text-green-600" : "text-red-600"
                    )}>
                      {metrics.performance.averageRenderTime.trend === 'down' ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(metrics.performance.averageRenderTime.change)}ms
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cache Hit Rate</span>
                  <div className="text-right">
                    <div className="font-medium">{(metrics.performance.cacheHitRate.current * 100).toFixed(1)}%</div>
                    <div className={cn(
                      "text-sm flex items-center",
                      metrics.performance.cacheHitRate.trend === 'up' ? "text-green-600" : "text-red-600"
                    )}>
                      {metrics.performance.cacheHitRate.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {(Math.abs(metrics.performance.cacheHitRate.change) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
                <CardDescription>Authentication API response times</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Average Response</span>
                  <span className="font-medium">{metrics.performance.apiResponseTime.current}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>95th Percentile</span>
                  <span className="font-medium">{metrics.performance.apiResponseTime.p95}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>99th Percentile</span>
                  <span className="font-medium">{metrics.performance.apiResponseTime.p99}ms</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversion Funnel Tab */}
        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Conversion Funnel</CardTitle>
              <CardDescription>
                User journey from page view to successful authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.userBehavior.funnelAnalysis.steps.map((step, index) => (
                  <div key={step.step} className="flex items-center space-x-4">
                    <div className="w-32 text-sm font-medium">{step.step}</div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{step.users.toLocaleString()} users</span>
                        <span className="text-sm">
                          {(step.conversionRate * 100).toFixed(1)}% conversion
                        </span>
                      </div>
                      <Progress value={step.conversionRate * 100} />
                    </div>
                    {step.dropOffRate > 0 && (
                      <div className="text-sm text-red-600">
                        -{(step.dropOffRate * 100).toFixed(1)}% drop-off
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium">Overall Conversion Rate</div>
                <div className="text-2xl font-bold">
                  {(metrics.userBehavior.funnelAnalysis.overallConversionRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Biggest drop-off: {metrics.userBehavior.funnelAnalysis.biggestDropOff.step} 
                  ({(metrics.userBehavior.funnelAnalysis.biggestDropOff.dropOffRate * 100).toFixed(1)}%)
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices & Social Tab */}
        <TabsContent value="devices" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
                <CardDescription>Authentication by device type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Monitor className="h-4 w-4" />
                    <span>Desktop</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {(metrics.userBehavior.deviceBreakdown.desktop.percentage * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metrics.userBehavior.deviceBreakdown.desktop.count.toLocaleString()} users
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4" />
                    <span>Mobile</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {(metrics.userBehavior.deviceBreakdown.mobile.percentage * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metrics.userBehavior.deviceBreakdown.mobile.count.toLocaleString()} users
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Tablet className="h-4 w-4" />
                    <span>Tablet</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {(metrics.userBehavior.deviceBreakdown.tablet.percentage * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metrics.userBehavior.deviceBreakdown.tablet.count.toLocaleString()} users
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Authentication</CardTitle>
                <CardDescription>Usage by social provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Google</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {(metrics.userBehavior.socialAuthUsage.google.percentage * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metrics.userBehavior.socialAuthUsage.google.count.toLocaleString()} users
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-900 rounded"></div>
                    <span>GitHub</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {(metrics.userBehavior.socialAuthUsage.github.percentage * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metrics.userBehavior.socialAuthUsage.github.count.toLocaleString()} users
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    <span>Microsoft</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {(metrics.userBehavior.socialAuthUsage.microsoft.percentage * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metrics.userBehavior.socialAuthUsage.microsoft.count.toLocaleString()} users
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>Automated insights from your authentication data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.insights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Badge variant={
                      insight.type === 'positive' ? 'default' :
                      insight.type === 'warning' ? 'destructive' : 'secondary'
                    }>
                      {insight.impact}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium">{insight.title}</div>
                      <div className="text-sm text-muted-foreground">{insight.description}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Actionable recommendations to improve performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.recommendations.map((rec, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{rec.title}</div>
                      <Badge variant={
                        rec.priority === 'high' ? 'destructive' :
                        rec.priority === 'medium' ? 'default' : 'secondary'
                      }>
                        {rec.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{rec.description}</div>
                    <div className="text-sm font-medium text-green-600">{rec.expectedImpact}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  description: string
  change?: number
  trend?: 'up' | 'down'
}

function MetricCard({ title, value, icon, description, change, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{description}</p>
          {change !== undefined && trend && (
            <div className={cn(
              "flex items-center text-xs",
              trend === 'up' ? "text-green-600" : "text-red-600"
            )}>
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(change * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}