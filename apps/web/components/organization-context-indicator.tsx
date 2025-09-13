'use client'

import React from 'react'
import { Building2, Shield, Users, AlertCircle } from 'lucide-react'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useAuth } from '@/lib/contexts/auth-context'
import { useRoleBasedUI } from '@/hooks/use-organization'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface OrganizationContextIndicatorProps {
  className?: string
  variant?: 'compact' | 'full' | 'minimal'
  showPermissionCount?: boolean
  showMemberCount?: boolean
}

export function OrganizationContextIndicator({
  className,
  variant = 'compact',
  showPermissionCount = true,
  showMemberCount = false
}: OrganizationContextIndicatorProps) {
  const { currentOrganization, currentMembership } = useAuth()
  const { permissions, roles, isLoading } = useOrganization()
  const { isAdmin, isOwner, isManager } = useRoleBasedUI()

  if (!currentOrganization || !currentMembership) {
    return (
      <div className={cn('flex items-center space-x-2 text-muted-foreground', className)}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">No organization context</span>
      </div>
    )
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

  // Get role badge variant and icon
  const getRoleInfo = () => {
    if (isOwner) {
      return {
        variant: 'default' as const,
        icon: Shield,
        text: 'Owner',
        description: 'Full organization access'
      }
    }
    if (isAdmin) {
      return {
        variant: 'secondary' as const,
        icon: Shield,
        text: 'Admin',
        description: 'Administrative access'
      }
    }
    if (isManager) {
      return {
        variant: 'outline' as const,
        icon: Users,
        text: 'Manager',
        description: 'Team management access'
      }
    }
    return {
      variant: 'outline' as const,
      icon: Users,
      text: 'Member',
      description: 'Standard member access'
    }
  }

  const roleInfo = getRoleInfo()
  const RoleIcon = roleInfo.icon

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center space-x-1', className)}>
              <Avatar className="h-4 w-4">
                <AvatarImage src={currentOrganization.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(currentOrganization.name)}
                </AvatarFallback>
              </Avatar>
              <Badge variant={roleInfo.variant} className="text-xs px-1 py-0">
                {roleInfo.text}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">{currentOrganization.name}</div>
              <div className="text-muted-foreground">{roleInfo.description}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="flex items-center space-x-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={currentOrganization.avatarUrl || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(currentOrganization.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate max-w-[120px]">
            {currentOrganization.name}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Badge variant={roleInfo.variant} className="text-xs">
            <RoleIcon className="h-3 w-3 mr-1" />
            {roleInfo.text}
          </Badge>
          
          {showPermissionCount && permissions.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    {permissions.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    )
  }

  // Full variant
  return (
    <div className={cn('flex items-center space-x-3 p-3 bg-muted/50 rounded-lg', className)}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={currentOrganization.avatarUrl || undefined} />
        <AvatarFallback>
          {getInitials(currentOrganization.name)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium truncate">{currentOrganization.name}</h3>
          <Badge variant={roleInfo.variant} className="text-xs">
            <RoleIcon className="h-3 w-3 mr-1" />
            {roleInfo.text}
          </Badge>
        </div>
        
        {currentOrganization.description && (
          <p className="text-sm text-muted-foreground truncate">
            {currentOrganization.description}
          </p>
        )}
        
        <div className="flex items-center space-x-3 mt-1">
          {showPermissionCount && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>{permissions.length} permissions</span>
            </div>
          )}
          
          {showMemberCount && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>Member since {new Date(currentMembership.joinedAt).toLocaleDateString()}</span>
            </div>
          )}
          
          {currentMembership.status !== 'active' && (
            <Badge variant="destructive" className="text-xs">
              {currentMembership.status}
            </Badge>
          )}
        </div>
      </div>
      
      {isLoading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      )}
    </div>
  )
}

export default OrganizationContextIndicator