'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Home, Settings, Users, Shield, BarChart3 } from 'lucide-react'
import { useAuth } from '@/lib/contexts/auth-context'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useRoleBasedUI } from '@/hooks/use-organization'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export interface OrganizationBreadcrumbProps {
  className?: string
  showOrganizationIcon?: boolean
  maxItems?: number
}

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  isCurrentPage?: boolean
}

export function OrganizationBreadcrumb({
  className,
  showOrganizationIcon = true,
  maxItems = 5
}: OrganizationBreadcrumbProps) {
  const pathname = usePathname()
  const { currentOrganization } = useAuth()
  const { canManageSettings, canManageMembers, canViewAuditLogs } = useRoleBasedUI()

  // Get organization initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Build breadcrumb items based on current path
  const buildBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = []
    
    // Always start with home
    items.push({
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home
    })

    // Add organization context if available
    if (currentOrganization) {
      items.push({
        label: currentOrganization.name,
        href: `/dashboard/organizations/${currentOrganization.id}`,
        icon: Building2
      })
    }

    // Parse pathname to determine current section
    const pathSegments = pathname.split('/').filter(Boolean)
    
    // Handle different dashboard sections
    if (pathSegments.includes('account')) {
      items.push({
        label: 'Account Settings',
        href: '/dashboard/account',
        icon: Settings,
        isCurrentPage: pathname === '/dashboard/account'
      })
    }
    
    if (pathSegments.includes('organizations')) {
      const orgIndex = pathSegments.indexOf('organizations')
      const orgId = pathSegments[orgIndex + 1]
      
      if (orgId && currentOrganization?.id === orgId) {
        // Handle organization sub-pages
        const subPage = pathSegments[orgIndex + 2]
        
        switch (subPage) {
          case 'settings':
            if (canManageSettings) {
              items.push({
                label: 'Settings',
                href: `/dashboard/organizations/${orgId}/settings`,
                icon: Settings,
                isCurrentPage: true
              })
            }
            break
            
          case 'members':
            if (canManageMembers) {
              items.push({
                label: 'Members',
                href: `/dashboard/organizations/${orgId}/members`,
                icon: Users,
                isCurrentPage: true
              })
            }
            break
            
          case 'roles':
            if (canManageMembers) {
              items.push({
                label: 'Roles & Permissions',
                href: `/dashboard/organizations/${orgId}/roles`,
                icon: Shield,
                isCurrentPage: true
              })
            }
            break
            
          case 'audit':
            if (canViewAuditLogs) {
              items.push({
                label: 'Audit Logs',
                href: `/dashboard/organizations/${orgId}/audit`,
                icon: BarChart3,
                isCurrentPage: true
              })
            }
            break
            
          default:
            // Organization overview
            items[items.length - 1].isCurrentPage = true
        }
      }
    }
    
    // Handle agents section
    if (pathSegments.includes('agents')) {
      items.push({
        label: 'Agents',
        href: '/dashboard/agents',
        isCurrentPage: !pathSegments.includes('create') && !pathSegments[pathSegments.length - 1].match(/^[a-f0-9-]+$/)
      })
      
      if (pathSegments.includes('create')) {
        items.push({
          label: 'Create Agent',
          isCurrentPage: true
        })
      } else {
        // Check if we're viewing a specific agent
        const lastSegment = pathSegments[pathSegments.length - 1]
        if (lastSegment && lastSegment.match(/^[a-f0-9-]+$/)) {
          items.push({
            label: 'Agent Details',
            isCurrentPage: true
          })
        }
      }
    }
    
    // Handle datasets section
    if (pathSegments.includes('datasets')) {
      items.push({
        label: 'Datasets',
        href: '/dashboard/datasets',
        isCurrentPage: !pathSegments.includes('create') && !pathSegments[pathSegments.length - 1].match(/^[a-f0-9-]+$/)
      })
      
      if (pathSegments.includes('create')) {
        items.push({
          label: 'Create Dataset',
          isCurrentPage: true
        })
      } else {
        // Check if we're viewing a specific dataset
        const lastSegment = pathSegments[pathSegments.length - 1]
        if (lastSegment && lastSegment.match(/^[a-f0-9-]+$/)) {
          items.push({
            label: 'Dataset Details',
            isCurrentPage: true
          })
        }
      }
    }

    // Limit items if maxItems is specified
    if (maxItems && items.length > maxItems) {
      return [
        items[0], // Always keep home
        { label: '...', href: undefined }, // Ellipsis
        ...items.slice(-2) // Keep last 2 items
      ]
    }

    return items
  }

  const breadcrumbItems = buildBreadcrumbItems()

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          const Icon = item.icon

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem>
                {item.href && !item.isCurrentPage ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href} className="flex items-center space-x-1">
                      {Icon && <Icon className="h-4 w-4" />}
                      {/* Show organization avatar for organization breadcrumb */}
                      {item.label === currentOrganization?.name && showOrganizationIcon && (
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={currentOrganization.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(currentOrganization.name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span>{item.label}</span>
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="flex items-center space-x-1">
                    {Icon && <Icon className="h-4 w-4" />}
                    {/* Show organization avatar for organization breadcrumb */}
                    {item.label === currentOrganization?.name && showOrganizationIcon && (
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={currentOrganization.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(currentOrganization.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span>{item.label}</span>
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default OrganizationBreadcrumb