'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

// Simplified types to avoid import issues during development
export interface User {
  id: string
  clerkUserId: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string | null
  preferences: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  avatarUrl?: string | null
  metadata: Record<string, any>
  settings: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Membership {
  id: string
  userId: string
  organizationId: string
  roleId: string
  status: 'active' | 'inactive' | 'pending'
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface AuthContextValue {
  // User state
  user: User | null
  isLoading: boolean
  isSignedIn: boolean
  
  // Organization state
  organizations: Organization[]
  currentOrganization: Organization | null
  currentMembership: Membership | null
  
  // Actions
  switchOrganization: (organizationId: string) => Promise<void>
  refreshUser: () => Promise<void>
  refreshOrganizations: () => Promise<void>
  
  // Permissions
  permissions: string[]
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser()
  
  // State
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Sync user data when Clerk user changes
  useEffect(() => {
    if (clerkLoaded && isSignedIn && clerkUser) {
      syncUserData()
    } else if (clerkLoaded && !isSignedIn) {
      // Clear user data when signed out
      setUser(null)
      setOrganizations([])
      setCurrentOrganization(null)
      setCurrentMembership(null)
      setPermissions([])
      setIsLoading(false)
    }
  }, [clerkUser, clerkLoaded, isSignedIn])

  // Load current organization from localStorage on mount
  useEffect(() => {
    if (organizations.length > 0) {
      const savedOrgId = localStorage.getItem('currentOrganizationId')
      if (savedOrgId) {
        const savedOrg = organizations.find(org => org.id === savedOrgId)
        if (savedOrg) {
          setCurrentOrganization(savedOrg)
          loadMembershipAndPermissions(savedOrgId)
        }
      } else if (organizations.length > 0) {
        // Default to first organization if none saved
        switchOrganization(organizations[0].id)
      }
    }
  }, [organizations])

  /**
   * Syncs user data from the API
   */
  const syncUserData = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/auth/me')
      
      // Handle unauthenticated users gracefully
      if (response.status === 401 || response.status === 403) {
        // User is not authenticated, this is expected on sign-in page
        setUser(null)
        setOrganizations([])
        return
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      setUser(data.user)
      setOrganizations(data.organizations || [])
    } catch (error) {
      // Only log errors that aren't related to authentication
      if (error instanceof Error && !error.message.includes('401') && !error.message.includes('403')) {
        console.error('Failed to sync user data:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Loads membership and permissions for a specific organization
   */
  const loadMembershipAndPermissions = async (organizationId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/membership`)
      if (!response.ok) {
        throw new Error('Failed to fetch membership data')
      }
      
      const data = await response.json()
      setCurrentMembership(data.membership)
      setPermissions(data.permissions || [])
    } catch (error) {
      console.error('Failed to load membership and permissions:', error)
      setCurrentMembership(null)
      setPermissions([])
    }
  }

  /**
   * Switches to a different organization
   */
  const switchOrganization = async (organizationId: string) => {
    const organization = organizations.find(org => org.id === organizationId)
    if (!organization) {
      console.error('Organization not found:', organizationId)
      return
    }

    setCurrentOrganization(organization)
    localStorage.setItem('currentOrganizationId', organizationId)
    
    await loadMembershipAndPermissions(organizationId)
  }

  /**
   * Refreshes user data from the API
   */
  const refreshUser = async () => {
    await syncUserData()
  }

  /**
   * Refreshes organization data
   */
  const refreshOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations')
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }
      
      const data = await response.json()
      setOrganizations(data.organizations || [])
    } catch (error) {
      console.error('Failed to refresh organizations:', error)
    }
  }

  /**
   * Checks if user has a specific permission
   */
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission)
  }

  const value: AuthContextValue = {
    // User state
    user,
    isLoading: isLoading || !clerkLoaded,
    isSignedIn: isSignedIn || false,
    
    // Organization state
    organizations,
    currentOrganization,
    currentMembership,
    
    // Actions
    switchOrganization,
    refreshUser,
    refreshOrganizations,
    
    // Permissions
    permissions,
    hasPermission
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to use the auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Hook to get current user
 */
export function useCurrentUser() {
  const { user, isLoading } = useAuth()
  return { user, isLoading }
}

/**
 * Hook to get current organization
 */
export function useCurrentOrganization() {
  const { currentOrganization, currentMembership, isLoading } = useAuth()
  return { organization: currentOrganization, membership: currentMembership, isLoading }
}

/**
 * Hook to check permissions
 */
export function usePermissions() {
  const { permissions, hasPermission } = useAuth()
  return { permissions, hasPermission }
}