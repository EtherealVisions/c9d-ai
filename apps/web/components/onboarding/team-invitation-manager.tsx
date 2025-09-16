'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { 
  Send, 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// Types
export interface TeamInvitation {
  id: string
  organizationId: string
  invitedBy: string | null
  email: string
  role: string
  customMessage: string | null
  onboardingPathOverride: string | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expiresAt: string
  acceptedAt: string | null
  onboardingSessionId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface TeamInvitationData {
  email: string
  role: string
  customMessage?: string
  onboardingPathOverride?: string
}

export interface TeamInvitationManagerProps {
  organizationId: string
  availableRoles: Array<{
    id: string
    name: string
    description?: string
  }>
  onboardingPaths?: Array<{
    id: string
    name: string
    description?: string
  }>
  onInvitationSent?: (invitations: TeamInvitation[]) => void
  onInvitationRevoked?: (invitation: TeamInvitation) => void
  className?: string
}

const INVITATION_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    variant: 'secondary' as const,
    icon: Clock,
    description: 'Invitation sent, waiting for response'
  },
  accepted: {
    label: 'Accepted',
    variant: 'default' as const,
    icon: CheckCircle,
    description: 'Invitation accepted, user joined'
  },
  expired: {
    label: 'Expired',
    variant: 'destructive' as const,
    icon: XCircle,
    description: 'Invitation expired without response'
  },
  revoked: {
    label: 'Revoked',
    variant: 'outline' as const,
    icon: XCircle,
    description: 'Invitation was cancelled'
  }
}

export function TeamInvitationManager({
  organizationId,
  availableRoles,
  onboardingPaths = [],
  onInvitationSent,
  onInvitationRevoked,
  className
}: TeamInvitationManagerProps) {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [newInvitations, setNewInvitations] = useState<TeamInvitationData[]>([
    { email: '', role: '', customMessage: '' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInvitation, setSelectedInvitation] = useState<TeamInvitation | null>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  // Load existing invitations
  const loadInvitations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In a real implementation, this would call the API
      // For now, we'll simulate with empty data
      setInvitations([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    loadInvitations()
  }, [loadInvitations])

  const handleAddInvitation = useCallback(() => {
    setNewInvitations(prev => [...prev, { email: '', role: '', customMessage: '' }])
  }, [])

  const handleRemoveInvitation = useCallback((index: number) => {
    setNewInvitations(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleInvitationChange = useCallback((
    index: number,
    field: keyof TeamInvitationData,
    value: string
  ) => {
    setNewInvitations(prev => prev.map((invitation, i) => 
      i === index ? { ...invitation, [field]: value } : invitation
    ))
  }, [])

  const handleSendInvitations = useCallback(async () => {
    // Validate invitations
    const validInvitations = newInvitations.filter(inv => 
      inv.email.trim() && inv.role.trim()
    )

    if (validInvitations.length === 0) {
      setError('Please add at least one valid invitation with email and role')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      // In a real implementation, this would call the API
      // For now, we'll simulate success
      const mockInvitations: TeamInvitation[] = validInvitations.map((inv, index) => ({
        id: `inv-${Date.now()}-${index}`,
        organizationId,
        invitedBy: 'current-user-id',
        email: inv.email,
        role: inv.role,
        customMessage: inv.customMessage || null,
        onboardingPathOverride: inv.onboardingPathOverride || null,
        status: 'pending' as const,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        acceptedAt: null,
        onboardingSessionId: null,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      setInvitations(prev => [...mockInvitations, ...prev])
      setNewInvitations([{ email: '', role: '', customMessage: '' }])
      setShowInviteDialog(false)
      
      onInvitationSent?.(mockInvitations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitations')
    } finally {
      setIsSending(false)
    }
  }, [newInvitations, organizationId, onInvitationSent])

  const handleRevokeInvitation = useCallback(async (invitation: TeamInvitation) => {
    if (invitation.status !== 'pending') {
      setError('Only pending invitations can be revoked')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // In a real implementation, this would call the API
      const updatedInvitation = { ...invitation, status: 'revoked' as const }
      
      setInvitations(prev => prev.map(inv => 
        inv.id === invitation.id ? updatedInvitation : inv
      ))
      
      onInvitationRevoked?.(updatedInvitation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation')
    } finally {
      setIsLoading(false)
    }
  }, [onInvitationRevoked])

  const handleResendInvitation = useCallback(async (invitation: TeamInvitation) => {
    if (invitation.status !== 'expired') {
      setError('Only expired invitations can be resent')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // In a real implementation, this would call the API
      const updatedInvitation = { 
        ...invitation, 
        status: 'pending' as const,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
      
      setInvitations(prev => prev.map(inv => 
        inv.id === invitation.id ? updatedInvitation : inv
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getStatusBadge = (status: TeamInvitation['status']) => {
    const config = INVITATION_STATUS_CONFIG[status]
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const canRevoke = (invitation: TeamInvitation) => invitation.status === 'pending'
  const canResend = (invitation: TeamInvitation) => invitation.status === 'expired'

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Invitations</h3>
          <p className="text-muted-foreground">
            Manage team member invitations and onboarding assignments
          </p>
        </div>
        
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Members
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite Team Members</DialogTitle>
              <DialogDescription>
                Send invitations to new team members with role-specific onboarding paths
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {newInvitations.map((invitation, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor={`email-${index}`}>Email Address</Label>
                        <Input
                          id={`email-${index}`}
                          type="email"
                          placeholder="colleague@example.com"
                          value={invitation.email}
                          onChange={(e) => handleInvitationChange(index, 'email', e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`role-${index}`}>Role</Label>
                        <Select
                          value={invitation.role}
                          onValueChange={(value) => handleInvitationChange(index, 'role', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {onboardingPaths.length > 0 && (
                      <div className="mt-4">
                        <Label htmlFor={`path-${index}`}>Onboarding Path (Optional)</Label>
                        <Select
                          value={invitation.onboardingPathOverride || ''}
                          onValueChange={(value) => handleInvitationChange(index, 'onboardingPathOverride', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Use default path for role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Use default path for role</SelectItem>
                            {onboardingPaths.map((path) => (
                              <SelectItem key={path.id} value={path.id}>
                                {path.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="mt-4">
                      <Label htmlFor={`message-${index}`}>Custom Welcome Message (Optional)</Label>
                      <Textarea
                        id={`message-${index}`}
                        placeholder="Welcome to our team! We're excited to work with you."
                        value={invitation.customMessage || ''}
                        onChange={(e) => handleInvitationChange(index, 'customMessage', e.target.value)}
                        className="mt-1"
                        rows={2}
                      />
                    </div>

                    {newInvitations.length > 1 && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveInvitation(index)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={handleAddInvitation}
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Another Invitation
              </Button>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvitations}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitations
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Invitations</CardTitle>
          <CardDescription>
            Track the status of team member invitations and manage pending requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading invitations...
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No invitations sent yet</p>
              <p className="text-sm">Start by inviting team members to join your organization</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{invitation.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invitation.status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invitation.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invitation.status === 'pending' 
                        ? format(new Date(invitation.expiresAt), 'MMM d, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {canRevoke(invitation) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeInvitation(invitation)}
                            title="Revoke invitation"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {canResend(invitation) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvitation(invitation)}
                            title="Resend invitation"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvitation(invitation)}
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invitation Details Dialog */}
      {selectedInvitation && (
        <Dialog 
          open={!!selectedInvitation} 
          onOpenChange={() => setSelectedInvitation(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitation Details</DialogTitle>
              <DialogDescription>
                View invitation information and status
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedInvitation.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <p className="text-sm text-muted-foreground">{selectedInvitation.role}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedInvitation.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Sent</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedInvitation.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {selectedInvitation.customMessage && (
                <div>
                  <Label className="text-sm font-medium">Custom Message</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedInvitation.customMessage}
                  </p>
                </div>
              )}

              {selectedInvitation.onboardingPathOverride && (
                <div>
                  <Label className="text-sm font-medium">Onboarding Path</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedInvitation.onboardingPathOverride}
                  </p>
                </div>
              )}

              {selectedInvitation.acceptedAt && (
                <div>
                  <Label className="text-sm font-medium">Accepted</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(selectedInvitation.acceptedAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}