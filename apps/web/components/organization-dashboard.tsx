'use client'

import React, { useState, useEffect } from 'react'
import { useOrganization } from '@/lib/contexts/organization-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Settings, Mail, Shield, Activity } from 'lucide-react'
import { OrganizationSettings } from './organization-settings'
import { MemberManagement } from './member-management'
import { InvitationManagement } from './invitation-management'
import type { Organization, Membership, Invitation } from '@/lib/models/types'

interface OrganizationDashboardProps {
  className?: string
}

export function OrganizationDashboard({ className }: OrganizationDashboardProps) {
  const { organization, membership, isLoading, hasPermission } = useOrganization()
  const [members, setMembers] = useState<Membership[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingInvitations, setLoadingInvitations] = useState(false)

  // Load organization data
  useEffect(() => {
    if (organization && hasPermission('organization:read')) {
      loadMembers()
      loadInvitations()
    }
  }, [organization, hasPermission])

  const loadMembers = async () => {
    if (!organization) return
    
    try {
      setLoadingMembers(true)
      const response = await fetch(`/api/memberships?organizationId=${organization.id}`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data || [])
      }
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const loadInvitations = async () => {
    if (!organization) return
    
    try {
      setLoadingInvitations(true)
      const response = await fetch(`/api/invitations?organizationId=${organization.id}`)
      if (response.ok) {
        const data = await response.json()
        setInvitations(data || [])
      }
    } catch (error) {
      console.error('Failed to load invitations:', error)
    } finally {
      setLoadingInvitations(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Organization Selected</h3>
          <p className="text-muted-foreground">Please select an organization to view the dashboard.</p>
        </div>
      </div>
    )
  }

  const canManageMembers = hasPermission('membership:manage')
  const canManageSettings = hasPermission('organization:update')
  const canViewMembers = hasPermission('membership:read')

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Organization Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {organization.avatarUrl && (
              <img
                src={organization.avatarUrl}
                alt={organization.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{organization.name}</h1>
              {organization.description && (
                <p className="text-muted-foreground">{organization.description}</p>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary">{organization.slug}</Badge>
                {membership && (
                  <Badge variant="outline">{membership.role?.name || 'Member'}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className={`grid w-full ${
            [true, canViewMembers, canManageMembers, canManageSettings].filter(Boolean).length === 1 
              ? 'grid-cols-1' 
              : [true, canViewMembers, canManageMembers, canManageSettings].filter(Boolean).length === 2
              ? 'grid-cols-2'
              : [true, canViewMembers, canManageMembers, canManageSettings].filter(Boolean).length === 3
              ? 'grid-cols-3'
              : 'grid-cols-4'
          }`}>
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            {canViewMembers && (
              <TabsTrigger value="members" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Members</span>
              </TabsTrigger>
            )}
            {canManageMembers && (
              <TabsTrigger value="invitations" className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Invitations</span>
              </TabsTrigger>
            )}
            {canManageSettings && (
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingMembers ? '...' : members.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active organization members
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingInvitations ? '...' : invitations.filter(inv => inv.status === 'pending').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting acceptance
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Role</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {membership?.role?.name || 'Member'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current permissions level
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Member Since</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {membership?.joinedAt ? 
                      new Date(membership.joinedAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      }) : 'N/A'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Joined organization
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Organization Details */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                  Basic information about this organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm">{organization.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Slug</label>
                    <p className="text-sm font-mono">{organization.slug}</p>
                  </div>
                  {organization.description && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-sm">{organization.description}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-sm">
                      {new Date(organization.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm">
                      {new Date(organization.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          {canViewMembers && (
            <TabsContent value="members" data-testid="members-tab-content">
              <MemberManagement
                members={members}
                loading={loadingMembers}
                onMembersChange={loadMembers}
                canManage={canManageMembers}
              />
            </TabsContent>
          )}

          {/* Invitations Tab */}
          {canManageMembers && (
            <TabsContent value="invitations" data-testid="invitations-tab-content">
              <InvitationManagement
                invitations={invitations}
                loading={loadingInvitations}
                onInvitationsChange={loadInvitations}
              />
            </TabsContent>
          )}

          {/* Settings Tab */}
          {canManageSettings && (
            <TabsContent value="settings" data-testid="settings-tab-content">
              <OrganizationSettings organization={organization} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}