'use client'

import React from 'react'
import { useOrganization } from '@/lib/contexts/organization-context'
import { 
  useOrganizationSwitcher, 
  useRoleBasedUI, 
  useResourceAccess,
  useOrganizationValidation,
  useOrganizationMetadata
} from '@/hooks/use-organization'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function OrganizationContextDemo() {
  const { organization, membership, roles, permissions, isLoading } = useOrganization()
  const { isAdmin, isOwner, canManageMembers, canManageSettings } = useRoleBasedUI()
  const { canCreateAgent, canCreateDataset, canManageAgents } = useResourceAccess()
  const { isValidContext, hasActiveContext, contextSummary } = useOrganizationValidation()
  const { getMetadataValue, getSettingValue } = useOrganizationMetadata()
  const { switchToOrganization } = useOrganizationSwitcher()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading organization context...</div>
        </CardContent>
      </Card>
    )
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No organization selected
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Context</CardTitle>
          <CardDescription>Current organizational context and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">Organization</h4>
              <p className="text-sm text-muted-foreground">{organization.name}</p>
              <p className="text-xs text-muted-foreground">ID: {organization.id}</p>
            </div>
            <div>
              <h4 className="font-semibold">Membership Status</h4>
              <Badge variant={membership?.status === 'active' ? 'default' : 'secondary'}>
                {membership?.status || 'Unknown'}
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Roles ({roles.length})</h4>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <Badge key={role.id} variant="outline">
                  {role.name}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Permissions ({permissions.length})</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {permissions.slice(0, 8).map(permission => (
                <div key={permission} className="text-muted-foreground">
                  • {permission}
                </div>
              ))}
              {permissions.length > 8 && (
                <div className="text-muted-foreground">
                  ... and {permissions.length - 8} more
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role-Based UI Controls</CardTitle>
          <CardDescription>UI elements based on user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Administrative Roles</h4>
              <div className="space-y-1 text-sm">
                <div>Admin: <Badge variant={isAdmin ? 'default' : 'secondary'}>{isAdmin ? 'Yes' : 'No'}</Badge></div>
                <div>Owner: <Badge variant={isOwner ? 'default' : 'secondary'}>{isOwner ? 'Yes' : 'No'}</Badge></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Management Permissions</h4>
              <div className="space-y-1 text-sm">
                <div>Manage Members: <Badge variant={canManageMembers ? 'default' : 'secondary'}>{canManageMembers ? 'Yes' : 'No'}</Badge></div>
                <div>Manage Settings: <Badge variant={canManageSettings ? 'default' : 'secondary'}>{canManageSettings ? 'Yes' : 'No'}</Badge></div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Resource Permissions</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>Create Agent: <Badge variant={canCreateAgent ? 'default' : 'secondary'}>{canCreateAgent ? 'Yes' : 'No'}</Badge></div>
              <div>Create Dataset: <Badge variant={canCreateDataset ? 'default' : 'secondary'}>{canCreateDataset ? 'Yes' : 'No'}</Badge></div>
              <div>Manage Agents: <Badge variant={canManageAgents ? 'default' : 'secondary'}>{canManageAgents ? 'Yes' : 'No'}</Badge></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Context Validation</CardTitle>
          <CardDescription>Organization context validation and metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Context Status</h4>
              <div className="space-y-1 text-sm">
                <div>Valid Context: <Badge variant={isValidContext ? 'default' : 'destructive'}>{isValidContext ? 'Yes' : 'No'}</Badge></div>
                <div>Active Context: <Badge variant={hasActiveContext ? 'default' : 'destructive'}>{hasActiveContext ? 'Yes' : 'No'}</Badge></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Context Summary</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Roles: {contextSummary.roleCount}</div>
                <div>Permissions: {contextSummary.permissionCount}</div>
                <div>Status: {contextSummary.membershipStatus}</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Organization Metadata</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Sample Metadata:</span>
                <div className="text-muted-foreground">
                  Key: {getMetadataValue('key', 'Not set')}
                </div>
              </div>
              <div>
                <span className="font-medium">Sample Setting:</span>
                <div className="text-muted-foreground">
                  Setting: {getSettingValue('setting', 'Not set')}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization Actions</CardTitle>
          <CardDescription>Actions available for organization management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => switchToOrganization('demo-org-2')}
              disabled={isLoading}
            >
              Switch Organization (Demo)
            </Button>
            <Button 
              variant="outline"
              disabled={!canManageSettings}
            >
              Organization Settings
            </Button>
            <Button 
              variant="outline"
              disabled={!canManageMembers}
            >
              Manage Members
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}