'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MousePointer, 
  Target, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Download
} from 'lucide-react'
import { ConversionFunnelService } from '@/lib/services/conversion-funnel-service'
import { ABTestingService } from '@/lib/services/ab-testing-service'
import { AnalyticsService } from '@/lib/services/analytics-service'
import { ConversionMetrics, ABTestResult, ABTestVariantResult, ABTestConfig } from '@/lib/types/analytics'

interface AnalyticsDashboardProps {
  className?: string
  timeframe?: { start: Date; end: Date }
}

export function AnalyticsDashboard({ className, timeframe }: AnalyticsDashboardProps) {
  const [conversionMetrics, setConversionMetrics] = useState<ConversionMetrics | null>(null)
  const [abTestResults, setAbTestResults] = useState<ABTestResult[]>([])
  const [abTestVariantResults, setAbTestVariantResults] = useState<ABTestVariantResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')

  useEffect(() => {
    loadAnalyticsData()
  }, [timeframe])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      // Load conversion funnel data
      const metrics = ConversionFunnelService.analyzeConversionFunnel(timeframe)
      setConversionMetrics(metrics)

      // Load A/B test results
      const activeTests = ABTestingService.getAllActiveTests()
      const testResults: ABTestResult[] = []
      for (const test of activeTests) {
        const results: ABTestResult | null = ABTestingService.analyzeTestResults(test.id)
        if (results) {
          testResults.push(results)
        }
      }
      
      // Set original test results for ABTestTab
      setAbTestResults(testResults)
      
      // Transform ABTestResult[] to ABTestVariantResult[] for the variant display
      const variantResults: ABTestVariantResult[] = testResults.flatMap(result => 
        result.variants.map(variant => ({
          variantId: variant.id,
          testName: result.testName,
          sampleSize: variant.participants,
          conversions: variant.conversions,
          conversionRate: variant.conversionRate,
          isWinner: result.winner === variant.id,
          statisticalSignificance: variant.confidence,
          confidenceInterval: [
            Math.max(0, variant.conversionRate - 2), 
            Math.min(100, variant.conversionRate + 2)
          ] as [number, number]
        }))
      )
      
      setAbTestVariantResults(variantResults)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = () => {
    const data = ConversionFunnelService.exportFunnelData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-windsurf-pink-hot"></div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-windsurf-gray-light">
            Comprehensive analytics and conversion tracking
          </p>
        </div>
        <Button onClick={exportData} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Key Metrics Cards */}
      {conversionMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Visitors"
            value={conversionMetrics.totalVisitors.toLocaleString()}
            icon={<Users className="h-5 w-5" />}
            trend={12.5}
          />
          <MetricCard
            title="Conversions"
            value={conversionMetrics.totalConversions.toLocaleString()}
            icon={<Target className="h-5 w-5" />}
            trend={8.3}
          />
          <MetricCard
            title="Conversion Rate"
            value={`${conversionMetrics.conversionRate.toFixed(2)}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={-2.1}
          />
          <MetricCard
            title="Avg. Time to Convert"
            value={formatDuration(conversionMetrics.averageTimeToConvert)}
            icon={<Clock className="h-5 w-5" />}
            trend={-15.2}
          />
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="abtests">A/B Tests</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab conversionMetrics={conversionMetrics} />
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <FunnelTab conversionMetrics={conversionMetrics} />
        </TabsContent>

        <TabsContent value="abtests" className="space-y-6">
          <ABTestTab results={abTestResults} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: number
}

function MetricCard({ title, value, icon, trend }: MetricCardProps) {
  const isPositive = trend && trend > 0
  const isNegative = trend && trend < 0

  return (
    <Card className="bg-windsurf-purple-deep border-windsurf-gray-dark">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="text-windsurf-gray-light">{icon}</div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${
              isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-windsurf-gray-light'
            }`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-sm text-windsurf-gray-light">{title}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function OverviewTab({ conversionMetrics }: { conversionMetrics: ConversionMetrics | null }) {
  if (!conversionMetrics) return null

  const topPaths = ConversionFunnelService.getTopConversionPaths(5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Conversion Funnel Chart */}
      <Card className="bg-windsurf-purple-deep border-windsurf-gray-dark">
        <CardHeader>
          <CardTitle className="text-white">Conversion Funnel</CardTitle>
          <CardDescription>Step-by-step conversion rates</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionMetrics.funnelSteps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="step" 
                stroke="#9CA3AF"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="conversionRate" fill="#E71D73" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Conversion Paths */}
      <Card className="bg-windsurf-purple-deep border-windsurf-gray-dark">
        <CardHeader>
          <CardTitle className="text-white">Top Conversion Paths</CardTitle>
          <CardDescription>Most common user journeys</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topPaths.map((path, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Path {index + 1}</span>
                <Badge variant="secondary">
                  {path.conversionRate.toFixed(1)}% conversion
                </Badge>
              </div>
              <div className="text-xs text-windsurf-gray-light">
                {path.path.join(' → ')}
              </div>
              <Progress value={path.conversionRate} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Drop-off Points */}
      <Card className="bg-windsurf-purple-deep border-windsurf-gray-dark lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            Drop-off Points
          </CardTitle>
          <CardDescription>Areas where users are leaving the funnel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversionMetrics.dropOffPoints.map((dropOff, index) => (
              <div key={index} className="p-4 bg-windsurf-blue-dark rounded-lg border border-windsurf-gray-dark">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{dropOff.step}</span>
                  <Badge variant="destructive">
                    {dropOff.dropOffRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-sm text-windsurf-gray-light mb-2">
                  {dropOff.visitors} visitors
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-windsurf-gray-light">Common exit pages:</div>
                  {dropOff.commonExitPages.slice(0, 3).map((page, pageIndex) => (
                    <div key={pageIndex} className="text-xs text-windsurf-teal">
                      {page}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FunnelTab({ conversionMetrics }: { conversionMetrics: ConversionMetrics | null }) {
  if (!conversionMetrics) return null

  return (
    <div className="space-y-6">
      {/* Detailed Funnel Analysis */}
      <Card className="bg-windsurf-purple-deep border-windsurf-gray-dark">
        <CardHeader>
          <CardTitle className="text-white">Detailed Funnel Analysis</CardTitle>
          <CardDescription>Step-by-step breakdown of user journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversionMetrics.funnelSteps.map((step, index) => (
              <div key={step.step} className="flex items-center space-x-4 p-4 bg-windsurf-blue-dark rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-windsurf-pink-hot rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{step.step}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{step.visitors} visitors</Badge>
                      <Badge variant={step.conversionRate > 50 ? "default" : "destructive"}>
                        {step.conversionRate.toFixed(1)}% conversion
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-windsurf-gray-light">
                    <span>Avg. time: {formatDuration(step.averageTime)}</span>
                    <span>Drop-off: {step.dropOffRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={step.conversionRate} className="mt-2 h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Optimization Recommendations */}
      <Card className="bg-windsurf-purple-deep border-windsurf-gray-dark">
        <CardHeader>
          <CardTitle className="text-white">Optimization Recommendations</CardTitle>
          <CardDescription>AI-powered suggestions to improve conversion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ConversionFunnelService.optimizeFunnel().map((rec, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-windsurf-blue-dark rounded-lg">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  rec.impact === 'High' ? 'bg-red-500' : rec.impact === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`}>
                  {rec.impact === 'High' ? <AlertTriangle className="h-3 w-3" /> : 
                   rec.impact === 'Medium' ? <Clock className="h-3 w-3" /> : 
                   <CheckCircle className="h-3 w-3" />}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{rec.step}</span>
                    <Badge variant={rec.impact === 'High' ? 'destructive' : rec.impact === 'Medium' ? 'default' : 'secondary'}>
                      {rec.impact} Impact
                    </Badge>
                  </div>
                  <p className="text-sm text-windsurf-gray-light">{rec.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ABTestTab({ results }: { results: ABTestResult[] }) {
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.testId]) {
      acc[result.testId] = []
    }
    acc[result.testId].push(result)
    return acc
  }, {} as Record<string, ABTestResult[]>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedResults).map(([testId, testResults]) => (
        <Card key={testId} className="bg-windsurf-purple-deep border-windsurf-gray-dark">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">{testId}</CardTitle>
                <CardDescription>A/B Test Results</CardDescription>
              </div>
              <Badge variant={ABTestingService.getTestStatus(testId) === 'running' ? 'default' : 'secondary'}>
                {ABTestingService.getTestStatus(testId)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testResults.flatMap(result => 
                result.variants.map(variant => ({
                  variantId: variant.id,
                  testName: result.testName,
                  sampleSize: variant.participants,
                  conversions: variant.conversions,
                  conversionRate: variant.conversionRate,
                  isWinner: result.winner === variant.id,
                  statisticalSignificance: variant.confidence,
                  confidenceInterval: [
                    Math.max(0, variant.conversionRate - 2), 
                    Math.min(100, variant.conversionRate + 2)
                  ] as [number, number]
                }))
              ).map((result) => (
                <div key={result.variantId} className="p-4 bg-windsurf-blue-dark rounded-lg border border-windsurf-gray-dark">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium">Variant {result.variantId}</h4>
                    {result.isWinner && (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Winner
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-windsurf-gray-light">Sample Size:</span>
                      <span className="text-white">{result.sampleSize.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-windsurf-gray-light">Conversion Rate:</span>
                      <span className="text-white">{result.conversionRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-windsurf-gray-light">Confidence:</span>
                      <span className="text-white">{result.statisticalSignificance}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-windsurf-gray-light">CI Range:</span>
                      <span className="text-white">
                        {result.confidenceInterval[0].toFixed(1)}% - {result.confidenceInterval[1].toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <Progress 
                    value={result.conversionRate} 
                    className="mt-3 h-2" 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(groupedResults).length === 0 && (
        <Card className="bg-windsurf-purple-deep border-windsurf-gray-dark">
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-windsurf-gray-light mx-auto mb-2" />
              <p className="text-windsurf-gray-light">No active A/B tests found</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PerformanceTab() {
  const [performanceData, setPerformanceData] = useState([
    { metric: 'LCP', value: 2.1, threshold: 2.5, status: 'good' as const, trend: -5.2 },
    { metric: 'FID', value: 85, threshold: 100, status: 'good' as const, trend: -12.1 },
    { metric: 'CLS', value: 0.08, threshold: 0.1, status: 'good' as const, trend: 8.3 },
    { metric: 'FCP', value: 1.8, threshold: 1.8, status: 'needs-improvement' as const, trend: -2.7 },
    { metric: 'TTFB', value: 0.6, threshold: 0.8, status: 'good' as const, trend: -15.4 }
  ])

  const [realUserMetrics, setRealUserMetrics] = useState({
    totalPageViews: 12543,
    averageSessionDuration: 245000, // milliseconds
    bounceRate: 32.5,
    pagesPerSession: 2.8,
    conversionRate: 4.2
  })

  useEffect(() => {
    // Simulate real-time performance data updates
    const interval = setInterval(() => {
      setPerformanceData(prev => prev.map(metric => ({
        ...metric,
        value: metric.value + (Math.random() - 0.5) * 0.1,
        trend: metric.trend + (Math.random() - 0.5) * 2
      })))
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Core Web Vitals */}
      <Card className="bg-windsurf-purple-deep border-windsurf-gray-dark">
        <CardHeader>
          <CardTitle className="text-white">Core Web Vitals</CardTitle>
          <CardDescription>Real-time performance metrics for user experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performanceData.map((metric) => (
              <div key={metric.metric} className="p-4 bg-windsurf-blue-dark rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{metric.metric}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      metric.status === 'good' ? 'default' : 
                      metric.status === 'needs-improvement' ? 'secondary' : 'destructive'
                    }>
                      {metric.status === 'good' ? 'Good' : 
                       metric.status === 'needs-improvement' ? 'Needs Improvement' : 'Poor'}
                    </Badge>
                    <div className={`flex items-center gap-1 text-xs ${
                      metric.trend > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {metric.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(metric.trend).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {metric.value.toFixed(metric.metric === 'CLS' ? 3 : 1)}
                  {metric.metric === 'CLS' ? '' : metric.metric.includes('FID') ? 'ms' : 's'}
                </div>
                <div className="text-sm text-windsurf-gray-light">
                  Threshold: {metric.threshold}{metric.metric === 'CLS' ? '' : metric.metric.includes('FID') ? 'ms' : 's'}
                </div>
                <Progress 
                  value={Math.min(100, (metric.value / metric.threshold) * 100)} 
                  className="mt-2 h-2" 
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real User Metrics */}
      <Card className="bg-windsurf-purple-deep border-windsurf-gray-dark">
        <CardHeader>
          <CardTitle className="text-white">Real User Metrics</CardTitle>
          <CardDescription>Actual user behavior and engagement data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 bg-windsurf-blue-dark rounded-lg">
              <div className="text-sm text-windsurf-gray-light mb-1">Page Views</div>
              <div className="text-2xl font-bold text-white">{realUserMetrics.totalPageViews.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-windsurf-blue-dark rounded-lg">
              <div className="text-sm text-windsurf-gray-light mb-1">Avg. Session</div>
              <div className="text-2xl font-bold text-white">{formatDuration(realUserMetrics.averageSessionDuration)}</div>
            </div>
            <div className="p-4 bg-windsurf-blue-dark rounded-lg">
              <div className="text-sm text-windsurf-gray-light mb-1">Bounce Rate</div>
              <div className="text-2xl font-bold text-white">{realUserMetrics.bounceRate.toFixed(1)}%</div>
            </div>
            <div className="p-4 bg-windsurf-blue-dark rounded-lg">
              <div className="text-sm text-windsurf-gray-light mb-1">Pages/Session</div>
              <div className="text-2xl font-bold text-white">{realUserMetrics.pagesPerSession.toFixed(1)}</div>
            </div>
            <div className="p-4 bg-windsurf-blue-dark rounded-lg">
              <div className="text-sm text-windsurf-gray-light mb-1">Conversion Rate</div>
              <div className="text-2xl font-bold text-white">{realUserMetrics.conversionRate.toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      <Card className="bg-windsurf-purple-deep border-windsurf-gray-dark">
        <CardHeader>
          <CardTitle className="text-white">Performance Recommendations</CardTitle>
          <CardDescription>AI-powered suggestions to improve site performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                priority: 'High',
                issue: 'Largest Contentful Paint',
                recommendation: 'Optimize hero image loading with next/image and priority loading',
                impact: 'Could improve LCP by 0.3s'
              },
              {
                priority: 'Medium',
                issue: 'Cumulative Layout Shift',
                recommendation: 'Add explicit dimensions to dynamic content areas',
                impact: 'Could reduce CLS by 0.02'
              },
              {
                priority: 'Low',
                issue: 'First Input Delay',
                recommendation: 'Consider code splitting for non-critical JavaScript',
                impact: 'Could improve FID by 10ms'
              }
            ].map((rec, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-windsurf-blue-dark rounded-lg">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  rec.priority === 'High' ? 'bg-red-500' : rec.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`}>
                  {rec.priority === 'High' ? <AlertTriangle className="h-3 w-3" /> : 
                   rec.priority === 'Medium' ? <Clock className="h-3 w-3" /> : 
                   <CheckCircle className="h-3 w-3" />}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{rec.issue}</span>
                    <Badge variant={rec.priority === 'High' ? 'destructive' : rec.priority === 'Medium' ? 'default' : 'secondary'}>
                      {rec.priority} Priority
                    </Badge>
                  </div>
                  <p className="text-sm text-windsurf-gray-light mb-1">{rec.recommendation}</p>
                  <p className="text-xs text-windsurf-teal">{rec.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}