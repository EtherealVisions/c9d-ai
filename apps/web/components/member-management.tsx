'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useOrganization } from '@/lib/contexts/organization-context'
import { Users, UserMinus, Shield, MoreHorizontal } from 'lucide-react'
import type { Membership, Role } from '@/lib/models/types'

interface MemberManagementProps {
  members: Membership[]
  loading: boolean
  onMembersChange: () => void
  canManage: boolean
}

interface MemberWithDetails extends Membership {
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    avatarUrl?: string
  }
  role?: Role
}

export function MemberManagement({ members, loading, onMembersChange, canManage }: MemberManagementProps) {
  const { organization, hasPermission } = useOrganization()
  const { toast } = useToast()
  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newRoleId, setNewRoleId] = useState('')
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])

  // Mock roles - in a real app, these would be fetched from the API
  const mockRoles: Role[] = [
    {
      id: '1',
      name: 'Admin',
      description: 'Full access to organization',
      organizationId: organization?.id || '',
      isSystemRole: true,
      permissions: ['*'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Member',
      description: 'Standard member access',
      organizationId: organization?.id || '',
      isSystemRole: true,
      permissions: ['organization:read', 'membership:read'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'Viewer',
      description: 'Read-only access',
      organizationId: organization?.id || '',
      isSystemRole: true,
      permissions: ['organization:read'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  const handleUpdateRole = async () => {
    if (!selectedMember || !newRoleId || !organization) return

    try {
      setIsUpdating(true)

      const response = await fetch(`/api/memberships/${selectedMember.userId}/${organization.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roleId: newRoleId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update member role')
      }

      toast({
        title: 'Role updated',
        description: `Successfully updated ${selectedMember.user?.email}'s role.`
      })

      onMembersChange()
      setIsRoleDialogOpen(false)
      setSelectedMember(null)
      setNewRoleId('')
    } catch (error) {
      console.error('Failed to update role:', error)
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update member role',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember || !organization) return

    try {
      setIsUpdating(true)

      const response = await fetch(`/api/memberships/${selectedMember.userId}/${organization.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove member')
      }

      toast({
        title: 'Member removed',
        description: `Successfully removed ${selectedMember.user?.email} from the organization.`
      })

      onMembersChange()
      setIsRemoveDialogOpen(false)
      setSelectedMember(null)
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast({
        title: 'Remove failed',
        description: error instanceof Error ? error.message : 'Failed to remove member',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const openRoleDialog = (member: MemberWithDetails) => {
    setSelectedMember(member)
    setNewRoleId(member.roleId)
    setAvailableRoles(mockRoles)
    setIsRoleDialogOpen(true)
  }

  const openRemoveDialog = (member: MemberWithDetails) => {
    setSelectedMember(member)
    setIsRemoveDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role?: Role) => {
    if (!role) return <Badge variant="outline">No Role</Badge>
    
    switch (role.name.toLowerCase()) {
      case 'admin':
        return <Badge variant="destructive">{role.name}</Badge>
      case 'member':
        return <Badge variant="default">{role.name}</Badge>
      case 'viewer':
        return <Badge variant="secondary">{role.name}</Badge>
      default:
        return <Badge variant="outline">{role.name}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Organization Members</span>
          </CardTitle>
          <CardDescription>Loading members...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Organization Members</span>
          </CardTitle>
          <CardDescription>
            Manage members and their roles within the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No members found</h3>
              <p className="text-muted-foreground">
                This organization doesn't have any members yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const memberWithDetails = member as MemberWithDetails
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {memberWithDetails.user?.avatarUrl ? (
                            <img
                              src={memberWithDetails.user.avatarUrl}
                              alt={memberWithDetails.user.email}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" data-testid="default-avatar">
                              <Users className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {memberWithDetails.user?.firstName && memberWithDetails.user?.lastName
                                ? `${memberWithDetails.user.firstName} ${memberWithDetails.user.lastName}`
                                : memberWithDetails.user?.email || 'Unknown User'
                              }
                            </p>
                            {memberWithDetails.user?.email && (
                              <p className="text-sm text-muted-foreground">
                                {memberWithDetails.user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(memberWithDetails.role)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(member.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRoleDialog(memberWithDetails)}
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              Change Role
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRemoveDialog(memberWithDetails)}
                            >
                              <UserMinus className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedMember?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Role</label>
              <Select value={newRoleId} onValueChange={setNewRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center space-x-2">
                        <span>{role.name}</span>
                        {role.description && (
                          <span className="text-sm text-muted-foreground">
                            - {role.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={isUpdating || !newRoleId}
            >
              {isUpdating ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.user?.email} from this organization?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isUpdating}
            >
              {isUpdating ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}