'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Users, UserCheck, UserX, Shield, Activity, AlertTriangle, Eye } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface UserAnalytics {
  signInCount: number
  lastSignInAt: string | null
  accountAge: number
  sessionCount: number
  securityEvents: number
  organizationMemberships: number
}

interface AdminUser {
  id: string
  clerkUserId: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  preferences: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface UserWithAnalytics {
  user: AdminUser
  analytics: UserAnalytics
  memberships?: any[]
}

interface UserManagementDashboardProps {
  className?: string
}

export function UserManagementDashboard({ className }: UserManagementDashboardProps) {
  const { userId, orgId } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserWithAnalytics | null>(null)
  const [users, setUsers] = useState<UserWithAnalytics[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)

  // Search users
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Search Required',
        description: 'Please enter an email or user ID to search',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to search users')
      }

      const data = await response.json()
      setUsers(data.users || [])
      
      if (data.users.length === 0) {
        toast({
          title: 'No Results',
          description: 'No users found matching your search criteria',
        })
      }
    } catch (error) {
      console.error('Search error:', error)
      setError(error instanceof Error ? error.message : 'Failed to search users')
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'Failed to search users',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Get user details with analytics
  const getUserDetails = async (clerkUserId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/${clerkUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get user details')
      }

      const data = await response.json()
      setSelectedUser(data)
    } catch (error) {
      console.error('Get user details error:', error)
      setError(error instanceof Error ? error.message : 'Failed to get user details')
      toast({
        title: 'Failed to Load User',
        description: error instanceof Error ? error.message : 'Failed to get user details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Update user status
  const updateUserStatus = async (clerkUserId: string, status: 'active' | 'suspended' | 'deactivated', reason?: string) => {
    setStatusUpdateLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${clerkUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, reason })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user status')
      }

      const data = await response.json()
      
      // Update the selected user if it's the same one
      if (selectedUser && selectedUser.user.clerkUserId === clerkUserId) {
        setSelectedUser({
          ...selectedUser,
          user: data.user
        })
      }

      // Update the users list
      setUsers(prevUsers => 
        prevUsers.map(userWithAnalytics => 
          userWithAnalytics.user.clerkUserId === clerkUserId 
            ? { ...userWithAnalytics, user: data.user }
            : userWithAnalytics
        )
      )

      toast({
        title: 'Status Updated',
        description: `User status updated to ${status}`,
      })
    } catch (error) {
      console.error('Update status error:', error)
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update user status',
        variant: 'destructive'
      })
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'suspended': return 'destructive'
      case 'deactivated': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Search, view, and manage user accounts and permissions
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            User Search
          </CardTitle>
          <CardDescription>
            Search for users by email address or Clerk user ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter email or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results */}
      {users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Search Results ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Organizations</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userWithAnalytics) => {
                  const { user, analytics } = userWithAnalytics
                  const status = user.preferences?.accountStatus || 'active'
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.avatarUrl && (
                            <img
                              src={user.avatarUrl}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="h-8 w-8 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {user.clerkUserId.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(status)}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(analytics.lastSignInAt)}</TableCell>
                      <TableCell>{analytics.organizationMemberships}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => getUserDetails(user.clerkUserId)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onStatusUpdate={updateUserStatus}
          statusUpdateLoading={statusUpdateLoading}
        />
      )}
    </div>
  )
}

// User Details Modal Component
interface UserDetailsModalProps {
  user: UserWithAnalytics
  onClose: () => void
  onStatusUpdate: (clerkUserId: string, status: 'active' | 'suspended' | 'deactivated', reason?: string) => void
  statusUpdateLoading: boolean
}

function UserDetailsModal({ user, onClose, onStatusUpdate, statusUpdateLoading }: UserDetailsModalProps) {
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'deactivated'>('active')
  const [statusReason, setStatusReason] = useState('')

  const { user: userData, analytics, memberships } = user
  const currentStatus = userData.preferences?.accountStatus || 'active'

  const handleStatusUpdate = () => {
    onStatusUpdate(userData.clerkUserId, newStatus, statusReason)
    setStatusUpdateOpen(false)
    setStatusReason('')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Details: {userData.firstName} {userData.lastName}
          </DialogTitle>
          <DialogDescription>
            Comprehensive user information and management options
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="memberships">Organizations</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Name:</strong> {userData.firstName} {userData.lastName}
                  </div>
                  <div>
                    <strong>Email:</strong> {userData.email}
                  </div>
                  <div>
                    <strong>Clerk ID:</strong> {userData.clerkUserId}
                  </div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <Badge variant={getStatusBadgeVariant(currentStatus)}>
                      {currentStatus}
                    </Badge>
                  </div>
                  <div>
                    <strong>Created:</strong> {formatDate(userData.createdAt)}
                  </div>
                  <div>
                    <strong>Updated:</strong> {formatDate(userData.updatedAt)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Current Status:</strong>{' '}
                    <Badge variant={getStatusBadgeVariant(currentStatus)}>
                      {currentStatus}
                    </Badge>
                  </div>
                  {userData.preferences?.statusUpdatedAt && (
                    <div>
                      <strong>Status Updated:</strong> {formatDate(userData.preferences.statusUpdatedAt)}
                    </div>
                  )}
                  {userData.preferences?.statusReason && (
                    <div>
                      <strong>Reason:</strong> {userData.preferences.statusReason}
                    </div>
                  )}
                  {userData.preferences?.statusUpdatedBy && (
                    <div>
                      <strong>Updated By:</strong> {userData.preferences.statusUpdatedBy}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sign-ins</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.signInCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Last: {formatDate(analytics.lastSignInAt)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Account Age</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.accountAge}</div>
                  <p className="text-xs text-muted-foreground">days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.sessionCount}</div>
                  <p className="text-xs text-muted-foreground">total sessions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Security Events</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.securityEvents}</div>
                  <p className="text-xs text-muted-foreground">incidents</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.organizationMemberships}</div>
                  <p className="text-xs text-muted-foreground">memberships</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="memberships" className="space-y-4">
            {memberships && memberships.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((membership: any) => (
                    <TableRow key={membership.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{membership.organization?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {membership.organization?.slug}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{membership.role?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={membership.status === 'active' ? 'default' : 'secondary'}>
                          {membership.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(membership.joinedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No organization memberships found
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Management</CardTitle>
                <CardDescription>
                  Manage user account status and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Update Account Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Account Status</DialogTitle>
                      <DialogDescription>
                        Change the user's account status and provide a reason
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">New Status</label>
                        <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="deactivated">Deactivated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Reason (Optional)</label>
                        <Textarea
                          placeholder="Provide a reason for this status change..."
                          value={statusReason}
                          onChange={(e) => setStatusReason(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleStatusUpdate}
                          disabled={statusUpdateLoading}
                          className="flex-1"
                        >
                          {statusUpdateLoading ? 'Updating...' : 'Update Status'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setStatusUpdateOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active': return 'default'
    case 'suspended': return 'destructive'
    case 'deactivated': return 'secondary'
    default: return 'outline'
  }
}