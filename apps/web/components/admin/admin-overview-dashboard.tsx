'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  UserCheck, 
  Shield, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'

interface SystemMetrics {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  totalSignIns: number
  securityEvents: number
  systemHealth: 'healthy' | 'warning' | 'critical'
  userGrowthTrend: 'up' | 'down' | 'stable'
  signInTrend: 'up' | 'down' | 'stable'
}

interface RecentActivity {
  id: string
  type: 'user_created' | 'user_updated' | 'security_event' | 'system_event'
  description: string
  timestamp: string
  severity: 'info' | 'warning' | 'error'
}

export function AdminOverviewDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [metricsResponse, activityResponse] = await Promise.all([
        fetch('/api/admin/analytics/system-metrics', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/admin/analytics/recent-activity', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ])

      // Handle metrics response
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData.metrics)
      } else {
        // Set default metrics if API fails
        setMetrics({
          totalUsers: 0,
          activeUsers: 0,
          newUsersToday: 0,
          totalSignIns: 0,
          securityEvents: 0,
          systemHealth: 'healthy',
          userGrowthTrend: 'stable',
          signInTrend: 'stable'
        })
      }

      // Handle activity response
      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setRecentActivity(activityData.activities || [])
      } else {
        setRecentActivity([])
      }
    } catch (error) {
      console.error('Dashboard load error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
      
      // Set default values on error
      setMetrics({
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        totalSignIns: 0,
        securityEvents: 0,
        systemHealth: 'warning',
        userGrowthTrend: 'stable',
        signInTrend: 'stable'
      })
      setRecentActivity([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  // Get system health badge
  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy': return <Badge variant="default">Healthy</Badge>
      case 'warning': return <Badge variant="destructive">Warning</Badge>
      case 'critical': return <Badge variant="destructive">Critical</Badge>
      default: return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Get activity severity icon
  const getActivityIcon = (type: string, severity: string) => {
    switch (type) {
      case 'security_event': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'user_created': return <UserCheck className="h-4 w-4 text-green-500" />
      case 'user_updated': return <Users className="h-4 w-4 text-blue-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading admin dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error} - Some data may be unavailable.
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>Overall system health and performance</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {metrics && getHealthBadge(metrics.systemHealth)}
              <Button onClick={loadDashboardData} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <div className="flex items-center gap-1">
                {getTrendIcon(metrics.userGrowthTrend)}
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{metrics.newUsersToday} today
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
              <p className="text-xs text-muted-foreground">
                {metrics.totalUsers > 0 
                  ? Math.round((metrics.activeUsers / metrics.totalUsers) * 100)
                  : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sign-ins Today</CardTitle>
              <div className="flex items-center gap-1">
                {getTrendIcon(metrics.signInTrend)}
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSignIns.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Authentication events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.securityEvents.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.securityEvents === 0 ? 'All clear' : 'Requires attention'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>Search, view, and manage user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/users">
              <Button className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Authentication Monitoring
            </CardTitle>
            <CardDescription>View authentication events and analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/monitoring">
              <Button className="w-full">
                <Activity className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Center
            </CardTitle>
            <CardDescription>Monitor security events and incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/security">
              <Button className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Security Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest system events and administrative actions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getActivityIcon(activity.type, activity.severity)}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{activity.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                  <Badge variant={
                    activity.severity === 'error' ? 'destructive' :
                    activity.severity === 'warning' ? 'destructive' : 'secondary'
                  }>
                    {activity.severity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity to display
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}