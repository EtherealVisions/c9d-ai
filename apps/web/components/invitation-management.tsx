'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { useOrganization } from '@/lib/contexts/organization-context'
import { Mail, Plus, X, Send, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { Invitation, Role } from '@/lib/models/types'

const inviteUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  roleId: z.string().min(1, 'Please select a role')
})

type InviteUserForm = z.infer<typeof inviteUserSchema>

interface InvitationManagementProps {
  invitations: Invitation[]
  loading: boolean
  onInvitationsChange: () => void
}

export function InvitationManagement({ invitations, loading, onInvitationsChange }: InvitationManagementProps) {
  const { organization } = useOrganization()
  const { toast } = useToast()
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)

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

  const form = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      roleId: ''
    }
  })

  const onSubmit = async (data: InviteUserForm) => {
    if (!organization) return

    try {
      setIsInviting(true)

      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: organization.id,
          email: data.email,
          roleId: data.roleId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invitation')
      }

      toast({
        title: 'Invitation sent',
        description: `Successfully sent invitation to ${data.email}.`
      })

      form.reset()
      onInvitationsChange()
      setIsInviteDialogOpen(false)
    } catch (error) {
      console.error('Failed to send invitation:', error)
      toast({
        title: 'Invitation failed',
        description: error instanceof Error ? error.message : 'Failed to send invitation',
        variant: 'destructive'
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    try {
      setIsRevoking(invitationId)

      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to revoke invitation')
      }

      toast({
        title: 'Invitation revoked',
        description: `Successfully revoked invitation for ${email}.`
      })

      onInvitationsChange()
    } catch (error) {
      console.error('Failed to revoke invitation:', error)
      toast({
        title: 'Revoke failed',
        description: error instanceof Error ? error.message : 'Failed to revoke invitation',
        variant: 'destructive'
      })
    } finally {
      setIsRevoking(null)
    }
  }

  const getStatusBadge = (status: string, expiresAt: Date) => {
    const isExpired = new Date() > new Date(expiresAt)
    
    switch (status) {
      case 'pending':
        if (isExpired) {
          return (
            <Badge variant="destructive" className="flex items-center space-x-1">
              <XCircle className="w-3 h-3" />
              <span>Expired</span>
            </Badge>
          )
        }
        return (
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </Badge>
        )
      case 'accepted':
        return (
          <Badge variant="default" className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Accepted</span>
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Expired</span>
          </Badge>
        )
      case 'revoked':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <X className="w-3 h-3" />
            <span>Revoked</span>
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleName = (roleId: string) => {
    const role = mockRoles.find(r => r.id === roleId)
    return role?.name || 'Unknown Role'
  }

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')
  const otherInvitations = invitations.filter(inv => inv.status !== 'pending')

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <span>Invitations</span>
          </CardTitle>
          <CardDescription>Loading invitations...</CardDescription>
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
    <div className="space-y-6">
      {/* Invite New User */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5" />
              <span>Invite New Member</span>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join this organization.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="user@example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            The email address of the person you want to invite.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mockRoles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  <div className="flex flex-col">
                                    <span>{role.name}</span>
                                    {role.description && (
                                      <span className="text-sm text-muted-foreground">
                                        {role.description}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The role that will be assigned to the invited user.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsInviteDialogOpen(false)}
                        disabled={isInviting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isInviting}>
                        {isInviting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Invite new members to join your organization.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Invitations that are waiting to be accepted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{getRoleName(invitation.roleId)}</TableCell>
                    <TableCell>
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invitation.status, invitation.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                        disabled={isRevoking === invitation.id}
                      >
                        {isRevoking === invitation.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                            Revoking...
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Revoke
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Invitations History */}
      <Card>
        <CardHeader>
          <CardTitle>Invitation History</CardTitle>
          <CardDescription>
            Complete history of all invitations sent for this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invitations sent</h3>
              <p className="text-muted-foreground">
                You haven't sent any invitations yet. Use the button above to invite new members.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{getRoleName(invitation.roleId)}</TableCell>
                    <TableCell>
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invitation.status, invitation.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {invitation.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                          disabled={isRevoking === invitation.id}
                        >
                          {isRevoking === invitation.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                              Revoking...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Revoke
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}