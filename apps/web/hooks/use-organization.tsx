'use client'

import { useCallback, useMemo } from 'react'
import { useOrganization } from '@/lib/contexts/organization-context'
import type { Organization, Role } from '@/lib/models/types'

/**
 * Hook for organization switching with enhanced functionality
 */
export function useOrganizationSwitcher() {
  const { organization, switchOrganization, isLoading } = useOrganization()
  
  const switchToOrganization = useCallback(async (organizationId: string) => {
    try {
      await switchOrganization(organizationId)
      return { success: true }
    } catch (error) {
      console.error('Failed to switch organization:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to switch organization' 
      }
    }
  }, [switchOrganization])

  return {
    currentOrganization: organization,
    switchToOrganization,
    isLoading
  }
}

/**
 * Hook for role-based UI rendering
 */
export function useRoleBasedUI() {
  const { roles, hasRole, hasAnyRole, hasPermission } = useOrganization()
  
  const isAdmin = useMemo(() => hasRole('Admin'), [hasRole])
  const isOwner = useMemo(() => hasRole('Owner'), [hasRole])
  const isMember = useMemo(() => hasRole('Member'), [hasRole])
  const isManager = useMemo(() => hasRole('Manager'), [hasRole])
  
  const canManageMembers = useMemo(() => 
    hasPermission('organization:manage_members'), [hasPermission])
  const canManageRoles = useMemo(() => 
    hasPermission('organization:manage_roles'), [hasPermission])
  const canManageSettings = useMemo(() => 
    hasPermission('organization:manage_settings'), [hasPermission])
  const canViewAuditLogs = useMemo(() => 
    hasPermission('organization:view_audit_logs'), [hasPermission])
  
  const isPrivilegedUser = useMemo(() => 
    hasAnyRole(['Admin', 'Owner', 'Manager']), [hasAnyRole])
  
  return {
    roles,
    isAdmin,
    isOwner,
    isMember,
    isManager,
    isPrivilegedUser,
    canManageMembers,
    canManageRoles,
    canManageSettings,
    canViewAuditLogs,
    hasRole,
    hasAnyRole,
    hasPermission
  }
}

/**
 * Hook for resource access control
 */
export function useResourceAccess() {
  const { canAccess, hasPermission, filterResourcesByPermission } = useOrganization()
  
  const checkResourceAccess = useCallback((resource: string, action: string) => {
    return canAccess(resource, action)
  }, [canAccess])
  
  const filterAgentsByAccess = useCallback(<T extends { id: string }>(agents: T[]) => {
    return filterResourcesByPermission(agents, 'agents:read')
  }, [filterResourcesByPermission])
  
  const filterDatasetsByAccess = useCallback(<T extends { id: string }>(datasets: T[]) => {
    return filterResourcesByPermission(datasets, 'datasets:read')
  }, [filterResourcesByPermission])
  
  const canCreateAgent = useMemo(() => hasPermission('agents:create'), [hasPermission])
  const canCreateDataset = useMemo(() => hasPermission('datasets:create'), [hasPermission])
  const canManageAgents = useMemo(() => hasPermission('agents:manage'), [hasPermission])
  const canManageDatasets = useMemo(() => hasPermission('datasets:manage'), [hasPermission])
  
  return {
    checkResourceAccess,
    filterAgentsByAccess,
    filterDatasetsByAccess,
    canCreateAgent,
    canCreateDataset,
    canManageAgents,
    canManageDatasets,
    hasPermission
  }
}

/**
 * Hook for organization context validation
 */
export function useOrganizationValidation() {
  const { organization, membership, roles, permissions } = useOrganization()
  
  const isValidContext = useMemo(() => {
    return !!(organization && membership && roles.length > 0)
  }, [organization, membership, roles])
  
  const hasActiveContext = useMemo(() => {
    return !!(organization && membership?.status === 'active')
  }, [organization, membership])
  
  const contextSummary = useMemo(() => ({
    organizationId: organization?.id,
    organizationName: organization?.name,
    membershipStatus: membership?.status,
    roleCount: roles.length,
    permissionCount: permissions.length,
    isValid: isValidContext,
    isActive: hasActiveContext
  }), [organization, membership, roles, permissions, isValidContext, hasActiveContext])
  
  return {
    isValidContext,
    hasActiveContext,
    contextSummary
  }
}

/**
 * Hook for organization metadata and settings
 */
export function useOrganizationMetadata() {
  const { organization, refreshOrganizationData } = useOrganization()
  
  const metadata = useMemo(() => organization?.metadata || {}, [organization])
  const settings = useMemo(() => organization?.settings || {}, [organization])
  
  const getMetadataValue = useCallback((key: string, defaultValue?: any) => {
    return metadata[key] ?? defaultValue
  }, [metadata])
  
  const getSettingValue = useCallback((key: string, defaultValue?: any) => {
    return settings[key] ?? defaultValue
  }, [settings])
  
  return {
    metadata,
    settings,
    getMetadataValue,
    getSettingValue,
    refreshOrganizationData
  }
}

/**
 * Hook for organization context debugging (development only)
 */
export function useOrganizationDebug() {
  const context = useOrganization()
  
  const debugInfo = useMemo(() => ({
    organization: context.organization,
    membership: context.membership,
    roles: context.roles.map(role => ({ id: role.id, name: role.name })),
    permissions: context.permissions,
    isLoading: context.isLoading,
    timestamp: new Date().toISOString()
  }), [context])
  
  const logContext = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('Organization Context Debug')
      console.log('Debug Info:', debugInfo)
      console.groupEnd()
    }
  }, [debugInfo])
  
  return {
    debugInfo,
    logContext
  }
}