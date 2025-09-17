'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity, 
  Shield, 
  AlertTriangle, 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AuthEvent {
  id: string
  userId: string
  type: string
  metadata: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: string
  user?: {
    email: string
    firstName?: string
    lastName?: string
  }
}

interface AuthMetrics {
  totalSignIns: number
  totalSignUps: number
  activeUsers: number
  suspiciousActivities: number
  failedAttempts: number
  socialSignIns: number
  emailSignIns: number
  twoFactorEnabled: number
  signInTrend: 'up' | 'down' | 'stable'
  signUpTrend: 'up' | 'down' | 'stable'
}

interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet'
  os: string
  browser: string
  count: number
}

interface LocationInfo {
  country: string
  city?: string
  count: number
}

interface AuthenticationMonitoringDashboardProps {
  className?: string
}

export function AuthenticationMonitoringDashboard({ className }: AuthenticationMonitoringDashboardProps) {
  const { userId, orgId } = useAuth()
  const [metrics, setMetrics] = useState<AuthMetrics | null>(null)
  const [recentEvents, setRecentEvents] = useState<AuthEvent[]>([])
  const [deviceStats, setDeviceStats] = useState<DeviceInfo[]>([])
  const [locationStats, setLocationStats] = useState<LocationInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('7d')
  const [eventFilter, setEventFilter] = useState('all')

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [metricsResponse, eventsResponse] = await Promise.all([
        fetch(`/api/admin/analytics/auth-metrics?timeRange=${timeRange}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`/api/admin/analytics/auth-events?limit=50&filter=${eventFilter}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ])

      if (!metricsResponse.ok) {
        const errorData = await metricsResponse.json()
        throw new Error(errorData.error || 'Failed to load metrics')
      }

      if (!eventsResponse.ok) {
        const errorData = await eventsResponse.json()
        throw new Error(errorData.error || 'Failed to load events')
      }

      const metricsData = await metricsResponse.json()
      const eventsData = await eventsResponse.json()

      setMetrics(metricsData.metrics)
      setRecentEvents(eventsData.events || [])
      setDeviceStats(metricsData.deviceStats || [])
      setLocationStats(metricsData.locationStats || [])
    } catch (error) {
      console.error('Dashboard load error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
      toast({
        title: 'Load Failed',
        description: error instanceof Error ? error.message : 'Failed to load dashboard data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [timeRange, eventFilter])

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get event type badge variant
  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'sign_in': return 'default'
      case 'sign_up': return 'secondary'
      case 'sign_out': return 'outline'
      case 'password_reset': return 'destructive'
      case 'suspicious_activity': return 'destructive'
      case 'account_locked': return 'destructive'
      case 'two_factor_enabled': return 'default'
      case 'email_verification': return 'secondary'
      default: return 'outline'
    }
  }

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  // Get device icon
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />
      case 'tablet': return <Smartphone className="h-4 w-4" />
      default: return <Monitor className="h-4 w-4" />
    }
  }

  if (loading && !metrics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading authentication monitoring data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Authentication Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor authentication events, security incidents, and user engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadDashboardData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sign-ins</CardTitle>
              <div className="flex items-center gap-1">
                {getTrendIcon(metrics.signInTrend)}
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSignIns.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.signInTrend === 'up' ? 'Increasing' : 
                 metrics.signInTrend === 'down' ? 'Decreasing' : 'Stable'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Sign-ups</CardTitle>
              <div className="flex items-center gap-1">
                {getTrendIcon(metrics.signUpTrend)}
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSignUps.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.signUpTrend === 'up' ? 'Increasing' : 
                 metrics.signUpTrend === 'down' ? 'Decreasing' : 'Stable'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.suspiciousActivities.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Suspicious activities</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="methods">Auth Methods</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Authentication Events</CardTitle>
                  <CardDescription>Latest authentication activities across the platform</CardDescription>
                </div>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="sign_in">Sign-ins</SelectItem>
                    <SelectItem value="sign_up">Sign-ups</SelectItem>
                    <SelectItem value="security">Security Events</SelectItem>
                    <SelectItem value="failures">Failed Attempts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {recentEvents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge variant={getEventBadgeVariant(event.type)}>
                            {event.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {event.user?.firstName} {event.user?.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {event.user?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {event.ipAddress || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getDeviceIcon(event.metadata?.deviceType || 'desktop')}
                            <span className="text-sm">
                              {event.metadata?.browser || 'Unknown'} / {event.metadata?.os || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(event.timestamp)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No authentication events found for the selected filter
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Authentication Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Email/Password</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(metrics.emailSignIns / (metrics.emailSignIns + metrics.socialSignIns)) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{metrics.emailSignIns}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Social Login</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(metrics.socialSignIns / (metrics.emailSignIns + metrics.socialSignIns)) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{metrics.socialSignIns}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Security Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>2FA Enabled</span>
                    <Badge variant="default">{metrics.twoFactorEnabled}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Failed Attempts</span>
                    <Badge variant="destructive">{metrics.failedAttempts}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">User Engagement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Active Users</span>
                    <Badge variant="default">{metrics.activeUsers}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>New Registrations</span>
                    <Badge variant="secondary">{metrics.totalSignUps}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
                <CardDescription>Authentication by device type</CardDescription>
              </CardHeader>
              <CardContent>
                {deviceStats.length > 0 ? (
                  <div className="space-y-3">
                    {deviceStats.map((device, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device.type)}
                          <span className="capitalize">{device.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${(device.count / Math.max(...deviceStats.map(d => d.count))) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{device.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No device data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Locations</CardTitle>
                <CardDescription>Authentication by location</CardDescription>
              </CardHeader>
              <CardContent>
                {locationStats.length > 0 ? (
                  <div className="space-y-3">
                    {locationStats.slice(0, 5).map((location, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>{location.country}</span>
                          {location.city && (
                            <span className="text-sm text-muted-foreground">({location.city})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ 
                                width: `${(location.count / Math.max(...locationStats.map(l => l.count))) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{location.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No location data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Security Alerts
                </CardTitle>
                <CardDescription>Recent security incidents and suspicious activities</CardDescription>
              </CardHeader>
              <CardContent>
                {recentEvents.filter(event => 
                  ['suspicious_activity', 'account_locked', 'password_reset'].includes(event.type)
                ).length > 0 ? (
                  <div className="space-y-3">
                    {recentEvents
                      .filter(event => ['suspicious_activity', 'account_locked', 'password_reset'].includes(event.type))
                      .slice(0, 5)
                      .map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <Badge variant="destructive" className="mb-1">
                              {event.type.replace('_', ' ')}
                            </Badge>
                            <div className="text-sm">
                              {event.user?.email} - {event.ipAddress}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(event.timestamp)}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No security incidents in the selected time range
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Security Summary
                </CardTitle>
                <CardDescription>Overall security metrics and status</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Failed Login Attempts</span>
                      <Badge variant={metrics.failedAttempts > 10 ? 'destructive' : 'secondary'}>
                        {metrics.failedAttempts}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Suspicious Activities</span>
                      <Badge variant={metrics.suspiciousActivities > 0 ? 'destructive' : 'default'}>
                        {metrics.suspiciousActivities}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>2FA Adoption Rate</span>
                      <Badge variant="default">
                        {metrics.activeUsers > 0 
                          ? Math.round((metrics.twoFactorEnabled / metrics.activeUsers) * 100)
                          : 0}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Overall Security Status</span>
                      <Badge variant={
                        metrics.suspiciousActivities === 0 && metrics.failedAttempts < 10 
                          ? 'default' 
                          : 'destructive'
                      }>
                        {metrics.suspiciousActivities === 0 && metrics.failedAttempts < 10 
                          ? 'Good' 
                          : 'Attention Required'}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}