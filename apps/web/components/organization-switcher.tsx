'use client'

import React, { useState, useMemo } from 'react'
import { Check, ChevronDown, Building2, Plus, Settings, Users } from 'lucide-react'
import { useAuth } from '@/lib/contexts/auth-context'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useRoleBasedUI } from '@/hooks/use-organization'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export interface OrganizationSwitcherProps {
  className?: string
  showCreateButton?: boolean
  showSettingsButton?: boolean
  maxDisplayLength?: number
}

export function OrganizationSwitcher({
  className,
  showCreateButton = true,
  showSettingsButton = true,
  maxDisplayLength = 20
}: OrganizationSwitcherProps) {
  const { organizations, currentOrganization, switchOrganization, isLoading } = useAuth()
  const { membership, permissions } = useOrganization()
  const { isAdmin, isOwner, canManageSettings } = useRoleBasedUI()
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  // Filter organizations based on permissions
  const availableOrganizations = useMemo(() => {
    return organizations.filter(org => {
      // Users can always see organizations they're members of
      return true
    })
  }, [organizations])

  // Get display name for organization
  const getDisplayName = (name: string) => {
    if (name.length <= maxDisplayLength) return name
    return `${name.substring(0, maxDisplayLength - 3)}...`
  }

  // Get organization initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Handle organization switch
  const handleSwitchOrganization = async (organizationId: string) => {
    if (organizationId === currentOrganization?.id || isSwitching) return

    try {
      setIsSwitching(true)
      await switchOrganization(organizationId)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to switch organization:', error)
      // TODO: Show error toast
    } finally {
      setIsSwitching(false)
    }
  }

  // Get role badge variant
  const getRoleBadgeVariant = () => {
    if (isOwner) return 'default'
    if (isAdmin) return 'secondary'
    return 'outline'
  }

  // Get role display text
  const getRoleText = () => {
    if (isOwner) return 'Owner'
    if (isAdmin) return 'Admin'
    return membership?.role?.name || 'Member'
  }

  if (!currentOrganization) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <Building2 className="h-4 w-4 mr-2" />
          {isLoading ? 'Loading...' : 'No Organization'}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center space-x-2 max-w-[200px] justify-between"
            disabled={isLoading || isSwitching}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Avatar className="h-5 w-5">
                <AvatarImage src={currentOrganization.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(currentOrganization.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {getDisplayName(currentOrganization.name)}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Organizations</span>
            <Badge variant={getRoleBadgeVariant()} className="text-xs">
              {getRoleText()}
            </Badge>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          {/* Current Organization */}
          <DropdownMenuItem
            className="flex items-center space-x-2 p-3 bg-accent/50"
            disabled
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentOrganization.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(currentOrganization.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {currentOrganization.name}
              </div>
              <div className="text-xs text-muted-foreground">
                Current organization
              </div>
            </div>
            <Check className="h-4 w-4 text-primary" />
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Other Organizations */}
          {availableOrganizations
            .filter(org => org.id !== currentOrganization.id)
            .map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="flex items-center space-x-2 p-3 cursor-pointer"
                onClick={() => handleSwitchOrganization(org.id)}
                disabled={isSwitching}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={org.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(org.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{org.name}</div>
                  {org.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {org.description}
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          
          {availableOrganizations.length <= 1 && (
            <DropdownMenuItem disabled className="text-center text-muted-foreground">
              No other organizations
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Action Items */}
          {showCreateButton && (
            <DropdownMenuItem className="flex items-center space-x-2 cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Create Organization</span>
            </DropdownMenuItem>
          )}
          
          {showSettingsButton && canManageSettings && (
            <DropdownMenuItem className="flex items-center space-x-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              <span>Organization Settings</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem className="flex items-center space-x-2 cursor-pointer">
            <Users className="h-4 w-4" />
            <span>Manage Members</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default OrganizationSwitcher