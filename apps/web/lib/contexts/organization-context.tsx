'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './auth-context'
// Note: Client components should use API calls instead of direct service imports
import type { Organization, Role, Membership } from '../models/types'

export interface OrganizationContextValue {
  // Current organization state
  organization: Organization | null
  membership: Membership | null
  isLoading: boolean
  
  // Roles and permissions
  roles: Role[]
  permissions: string[]
  
  // Actions
  switchOrganization: (organizationId: string) => Promise<void>
  refreshOrganizationData: () => Promise<void>
  
  // Permission checking
  canAccess: (resource: string, action: string) => boolean
  hasPermission: (permission: string) => boolean
  hasRole: (roleName: string) => boolean
  hasAnyRole: (roleNames: string[]) => boolean
  
  // Resource filtering
  filterResourcesByPermission: <T extends { id: string }>(
    resources: T[],
    requiredPermission: string
  ) => T[]
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)

export interface OrganizationProviderProps {
  children: React.ReactNode
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user, currentOrganization, currentMembership, isSignedIn } = useAuth()
  
  // State
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Sync with auth context when current organization changes
  useEffect(() => {
    if (currentOrganization && currentMembership) {
      setOrganization(currentOrganization as Organization)
      setMembership(currentMembership as Membership)
      loadOrganizationContext(currentOrganization.id)
    } else {
      // Clear organization context when no organization is selected
      setOrganization(null)
      setMembership(null)
      setRoles([])
      setPermissions([])
    }
  }, [currentOrganization, currentMembership])

  /**
   * Load organization context including roles and permissions
   */
  const loadOrganizationContext = useCallback(async (organizationId: string) => {
    if (!user || !isSignedIn) return

    try {
      setIsLoading(true)
      
      // Load user roles and permissions for the organization via API
      const [rolesResponse, permissionsResponse] = await Promise.all([
        fetch(`/api/organizations/${organizationId}/roles`),
        fetch(`/api/organizations/${organizationId}/permissions`)
      ])
      
      const userRoles = rolesResponse.ok ? await rolesResponse.json() : { data: [] }
      const userPermissions = permissionsResponse.ok ? await permissionsResponse.json() : { data: [] }
      
      setRoles(userRoles)
      setPermissions(userPermissions)
    } catch (error) {
      console.error('Failed to load organization context:', error)
      setRoles([])
      setPermissions([])
    } finally {
      setIsLoading(false)
    }
  }, [user, isSignedIn])

  /**
   * Switch to a different organization
   */
  const switchOrganization = useCallback(async (organizationId: string) => {
    if (!user || !isSignedIn) {
      throw new Error('User must be authenticated to switch organizations')
    }

    try {
      setIsLoading(true)
      
      // Get organization details via API
      const orgResponse = await fetch(`/api/organizations/${organizationId}`)
      
      if (!orgResponse.ok) {
        throw new Error('Organization not found')
      }
      
      const orgResult = await orgResponse.json()

      // Update organization state
      setOrganization(orgResult.data)
      
      // Load organization context
      await loadOrganizationContext(organizationId)
      
      // Store selection in localStorage for persistence
      localStorage.setItem('currentOrganizationId', organizationId)
    } catch (error) {
      console.error('Failed to switch organization:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user, isSignedIn, loadOrganizationContext])

  /**
   * Refresh organization data and context
   */
  const refreshOrganizationData = useCallback(async () => {
    if (!organization || !user || !isSignedIn) return

    try {
      setIsLoading(true)
      
      // Refresh organization details via API
      const orgResponse = await fetch(`/api/organizations/${organization.id}`)
      if (orgResponse.ok) {
        const orgResult = await orgResponse.json()
        setOrganization(orgResult.data)
      }
      
      // Refresh roles and permissions
      await loadOrganizationContext(organization.id)
    } catch (error) {
      console.error('Failed to refresh organization data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [organization, user, isSignedIn, loadOrganizationContext])

  /**
   * Check if user can access a resource with a specific action
   */
  const canAccess = useCallback((resource: string, action: string): boolean => {
    const permission = `${resource}:${action}`
    return permissions.includes(permission)
  }, [permissions])

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission)
  }, [permissions])

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((roleName: string): boolean => {
    return roles.some(role => role.name === roleName)
  }, [roles])

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback((roleNames: string[]): boolean => {
    return roles.some(role => roleNames.includes(role.name))
  }, [roles])

  /**
   * Filter resources based on required permission
   */
  const filterResourcesByPermission = useCallback(<T extends { id: string }>(
    resources: T[],
    requiredPermission: string
  ): T[] => {
    if (!hasPermission(requiredPermission)) {
      return []
    }
    return resources
  }, [hasPermission])

  const value: OrganizationContextValue = {
    // Current organization state
    organization,
    membership,
    isLoading,
    
    // Roles and permissions
    roles,
    permissions,
    
    // Actions
    switchOrganization,
    refreshOrganizationData,
    
    // Permission checking
    canAccess,
    hasPermission,
    hasRole,
    hasAnyRole,
    
    // Resource filtering
    filterResourcesByPermission
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

/**
 * Hook to use the organization context
 */
export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}

/**
 * Hook to get current organization details
 */
export function useCurrentOrganizationDetails() {
  const { organization, membership, isLoading } = useOrganization()
  return { organization, membership, isLoading }
}

/**
 * Hook to get organization permissions and roles
 */
export function useOrganizationPermissions() {
  const { roles, permissions, canAccess, hasPermission, hasRole, hasAnyRole } = useOrganization()
  return { roles, permissions, canAccess, hasPermission, hasRole, hasAnyRole }
}

/**
 * Hook to get organization actions
 */
export function useOrganizationActions() {
  const { switchOrganization, refreshOrganizationData } = useOrganization()
  return { switchOrganization, refreshOrganizationData }
}

/**
 * Hook for resource filtering based on permissions
 */
export function useResourceFiltering() {
  const { filterResourcesByPermission, hasPermission } = useOrganization()
  return { filterResourcesByPermission, hasPermission }
}