import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useOrganization } from '@/lib/contexts/organization-context'
import {
  useOrganizationSwitcher,
  useRoleBasedUI,
  useResourceAccess,
  useOrganizationValidation,
  useOrganizationMetadata,
  useOrganizationDebug
} from '../use-organization'
import type { Organization, Role, Membership } from '@/lib/models/types'

// Mock the organization context
vi.mock('@/lib/contexts/organization-context')

const mockUseOrganization = vi.mocked(useOrganization)

// Test data
const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'Test organization description',
  metadata: { 
    key: 'value',
    feature_flags: { advanced_features: true }
  },
  settings: { 
    setting: 'value',
    theme: 'dark',
    notifications: true
  },
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockMembership: Membership = {
  id: 'membership-1',
  userId: 'user-1',
  organizationId: 'org-1',
  roleId: 'role-1',
  status: 'active',
  joinedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockRoles: Role[] = [
  {
    id: 'role-1',
    name: 'Admin',
    description: 'Administrator role',
    organizationId: 'org-1',
    isSystemRole: true,
    permissions: ['organization:manage', 'users:manage'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'role-2',
    name: 'Manager',
    description: 'Manager role',
    organizationId: 'org-1',
    isSystemRole: true,
    permissions: ['organization:manage_members'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockPermissions = [
  'organization:manage',
  'organization:manage_members',
  'organization:manage_roles',
  'organization:manage_settings',
  'organization:view_audit_logs',
  'users:manage',
  'agents:read',
  'agents:create',
  'agents:manage',
  'datasets:read',
  'datasets:create',
  'datasets:manage'
]

// Test components for each hook
function OrganizationSwitcherTestComponent() {
  const { currentOrganization, switchToOrganization, isLoading } = useOrganizationSwitcher()

  return (
    <div>
      <div data-testid="current-org">{currentOrganization?.name || 'no-org'}</div>
      <div data-testid="is-loading">{isLoading ? 'loading' : 'loaded'}</div>
      <button 
        data-testid="switch-button" 
        onClick={() => switchToOrganization('org-2')}
      >
        Switch
      </button>
    </div>
  )
}

function RoleBasedUITestComponent() {
  const {
    isAdmin,
    isOwner,
    isMember,
    isManager,
    isPrivilegedUser,
    canManageMembers,
    canManageRoles,
    canManageSettings,
    canViewAuditLogs,
    roles
  } = useRoleBasedUI()

  return (
    <div>
      <div data-testid="is-admin">{isAdmin ? 'yes' : 'no'}</div>
      <div data-testid="is-owner">{isOwner ? 'yes' : 'no'}</div>
      <div data-testid="is-member">{isMember ? 'yes' : 'no'}</div>
      <div data-testid="is-manager">{isManager ? 'yes' : 'no'}</div>
      <div data-testid="is-privileged">{isPrivilegedUser ? 'yes' : 'no'}</div>
      <div data-testid="can-manage-members">{canManageMembers ? 'yes' : 'no'}</div>
      <div data-testid="can-manage-roles">{canManageRoles ? 'yes' : 'no'}</div>
      <div data-testid="can-manage-settings">{canManageSettings ? 'yes' : 'no'}</div>
      <div data-testid="can-view-audit-logs">{canViewAuditLogs ? 'yes' : 'no'}</div>
      <div data-testid="roles-count">{roles.length}</div>
    </div>
  )
}

function ResourceAccessTestComponent() {
  const {
    filterAgentsByAccess,
    filterDatasetsByAccess,
    canCreateAgent,
    canCreateDataset,
    canManageAgents,
    canManageDatasets,
    checkResourceAccess
  } = useResourceAccess()

  const testAgents = [{ id: 'agent-1' }, { id: 'agent-2' }]
  const testDatasets = [{ id: 'dataset-1' }, { id: 'dataset-2' }]
  
  const filteredAgents = filterAgentsByAccess(testAgents)
  const filteredDatasets = filterDatasetsByAccess(testDatasets)

  return (
    <div>
      <div data-testid="filtered-agents">{filteredAgents.length}</div>
      <div data-testid="filtered-datasets">{filteredDatasets.length}</div>
      <div data-testid="can-create-agent">{canCreateAgent ? 'yes' : 'no'}</div>
      <div data-testid="can-create-dataset">{canCreateDataset ? 'yes' : 'no'}</div>
      <div data-testid="can-manage-agents">{canManageAgents ? 'yes' : 'no'}</div>
      <div data-testid="can-manage-datasets">{canManageDatasets ? 'yes' : 'no'}</div>
      <div data-testid="can-access-agents-read">{checkResourceAccess('agents', 'read') ? 'yes' : 'no'}</div>
    </div>
  )
}

function OrganizationValidationTestComponent() {
  const { isValidContext, hasActiveContext, contextSummary } = useOrganizationValidation()

  return (
    <div>
      <div data-testid="is-valid">{isValidContext ? 'yes' : 'no'}</div>
      <div data-testid="is-active">{hasActiveContext ? 'yes' : 'no'}</div>
      <div data-testid="org-id">{contextSummary.organizationId || 'no-id'}</div>
      <div data-testid="org-name">{contextSummary.organizationName || 'no-name'}</div>
      <div data-testid="membership-status">{contextSummary.membershipStatus || 'no-status'}</div>
      <div data-testid="role-count">{contextSummary.roleCount}</div>
      <div data-testid="permission-count">{contextSummary.permissionCount}</div>
    </div>
  )
}

function OrganizationMetadataTestComponent() {
  const { 
    metadata, 
    settings, 
    getMetadataValue, 
    getSettingValue,
    refreshOrganizationData
  } = useOrganizationMetadata()

  return (
    <div>
      <div data-testid="metadata-key">{getMetadataValue('key', 'default')}</div>
      <div data-testid="metadata-missing">{getMetadataValue('missing', 'default')}</div>
      <div data-testid="setting-theme">{getSettingValue('theme', 'light')}</div>
      <div data-testid="setting-missing">{getSettingValue('missing', 'default')}</div>
      <div data-testid="metadata-count">{Object.keys(metadata).length}</div>
      <div data-testid="settings-count">{Object.keys(settings).length}</div>
      <button 
        data-testid="refresh-button" 
        onClick={() => refreshOrganizationData()}
      >
        Refresh
      </button>
    </div>
  )
}

function OrganizationDebugTestComponent() {
  const { debugInfo, logContext } = useOrganizationDebug()

  return (
    <div>
      <div data-testid="debug-org-id">{debugInfo.organization?.id || 'no-id'}</div>
      <div data-testid="debug-roles-count">{debugInfo.roles.length}</div>
      <div data-testid="debug-permissions-count">{debugInfo.permissions.length}</div>
      <div data-testid="debug-timestamp">{debugInfo.timestamp ? 'has-timestamp' : 'no-timestamp'}</div>
      <button 
        data-testid="log-button" 
        onClick={() => logContext()}
      >
        Log Context
      </button>
    </div>
  )
}

describe('Organization Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default organization context mock
    mockUseOrganization.mockReturnValue({
      organization: mockOrganization,
      membership: mockMembership,
      isLoading: false,
      roles: mockRoles,
      permissions: mockPermissions,
      switchOrganization: vi.fn().mockResolvedValue(undefined),
      refreshOrganizationData: vi.fn().mockResolvedValue(undefined),
      canAccess: vi.fn((resource, action) => {
        const permission = `${resource}:${action}`
        return mockPermissions.includes(permission)
      }),
      hasPermission: vi.fn((permission) => mockPermissions.includes(permission)),
      hasRole: vi.fn((roleName) => mockRoles.some(role => role.name === roleName)),
      hasAnyRole: vi.fn((roleNames) => mockRoles.some(role => roleNames.includes(role.name))),
      filterResourcesByPermission: vi.fn((resources, permission) => {
        return mockPermissions.includes(permission) ? resources : []
      })
    })
  })

  describe('useOrganizationSwitcher', () => {
    it('should provide organization switching functionality', async () => {
      render(<OrganizationSwitcherTestComponent />)

      expect(screen.getByTestId('current-org')).toHaveTextContent('Test Organization')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('loaded')
    })

    it('should handle successful organization switching', async () => {
      const mockSwitchOrganization = vi.fn().mockResolvedValue(undefined)
      mockUseOrganization.mockReturnValue({
        ...mockUseOrganization(),
        switchOrganization: mockSwitchOrganization
      })

      render(<OrganizationSwitcherTestComponent />)

      act(() => {
        screen.getByTestId('switch-button').click()
      })

      await waitFor(() => {
        expect(mockSwitchOrganization).toHaveBeenCalledWith('org-2')
      })
    })

    it('should handle organization switching errors', async () => {
      const mockSwitchOrganization = vi.fn().mockRejectedValue(new Error('Switch failed'))
      mockUseOrganization.mockReturnValue({
        ...mockUseOrganization(),
        switchOrganization: mockSwitchOrganization
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<OrganizationSwitcherTestComponent />)

      act(() => {
        screen.getByTestId('switch-button').click()
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to switch organization:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('useRoleBasedUI', () => {
    it('should correctly identify user roles and permissions', () => {
      render(<RoleBasedUITestComponent />)

      expect(screen.getByTestId('is-admin')).toHaveTextContent('yes')
      expect(screen.getByTestId('is-owner')).toHaveTextContent('no')
      expect(screen.getByTestId('is-member')).toHaveTextContent('no')
      expect(screen.getByTestId('is-manager')).toHaveTextContent('yes')
      expect(screen.getByTestId('is-privileged')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-manage-members')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-manage-roles')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-manage-settings')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-view-audit-logs')).toHaveTextContent('yes')
      expect(screen.getByTestId('roles-count')).toHaveTextContent('2')
    })

    it('should handle member role correctly', () => {
      const memberRoles: Role[] = [{
        id: 'role-3',
        name: 'Member',
        description: 'Member role',
        organizationId: 'org-1',
        isSystemRole: true,
        permissions: ['agents:read'],
        createdAt: new Date(),
        updatedAt: new Date()
      }]

      mockUseOrganization.mockReturnValue({
        ...mockUseOrganization(),
        roles: memberRoles,
        permissions: ['agents:read'],
        hasRole: vi.fn((roleName) => memberRoles.some(role => role.name === roleName)),
        hasAnyRole: vi.fn((roleNames) => memberRoles.some(role => roleNames.includes(role.name))),
        hasPermission: vi.fn((permission) => ['agents:read'].includes(permission))
      })

      render(<RoleBasedUITestComponent />)

      expect(screen.getByTestId('is-admin')).toHaveTextContent('no')
      expect(screen.getByTestId('is-member')).toHaveTextContent('yes')
      expect(screen.getByTestId('is-privileged')).toHaveTextContent('no')
      expect(screen.getByTestId('can-manage-members')).toHaveTextContent('no')
    })
  })

  describe('useResourceAccess', () => {
    it('should provide resource access functionality', () => {
      render(<ResourceAccessTestComponent />)

      expect(screen.getByTestId('filtered-agents')).toHaveTextContent('2')
      expect(screen.getByTestId('filtered-datasets')).toHaveTextContent('2')
      expect(screen.getByTestId('can-create-agent')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-create-dataset')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-manage-agents')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-manage-datasets')).toHaveTextContent('yes')
      expect(screen.getByTestId('can-access-agents-read')).toHaveTextContent('yes')
    })

    it('should filter resources when user lacks permissions', () => {
      mockUseOrganization.mockReturnValue({
        ...mockUseOrganization(),
        permissions: ['users:read'],
        hasPermission: vi.fn((permission) => ['users:read'].includes(permission)),
        filterResourcesByPermission: vi.fn((resources, permission) => {
          return ['users:read'].includes(permission) ? resources : []
        })
      })

      render(<ResourceAccessTestComponent />)

      expect(screen.getByTestId('filtered-agents')).toHaveTextContent('0')
      expect(screen.getByTestId('filtered-datasets')).toHaveTextContent('0')
      expect(screen.getByTestId('can-create-agent')).toHaveTextContent('no')
      expect(screen.getByTestId('can-create-dataset')).toHaveTextContent('no')
    })
  })

  describe('useOrganizationValidation', () => {
    it('should validate organization context correctly', () => {
      render(<OrganizationValidationTestComponent />)

      expect(screen.getByTestId('is-valid')).toHaveTextContent('yes')
      expect(screen.getByTestId('is-active')).toHaveTextContent('yes')
      expect(screen.getByTestId('org-id')).toHaveTextContent('org-1')
      expect(screen.getByTestId('org-name')).toHaveTextContent('Test Organization')
      expect(screen.getByTestId('membership-status')).toHaveTextContent('active')
      expect(screen.getByTestId('role-count')).toHaveTextContent('2')
      expect(screen.getByTestId('permission-count')).toHaveTextContent('12')
    })

    it('should handle invalid context', () => {
      mockUseOrganization.mockReturnValue({
        ...mockUseOrganization(),
        organization: null,
        membership: null,
        roles: []
      })

      render(<OrganizationValidationTestComponent />)

      expect(screen.getByTestId('is-valid')).toHaveTextContent('no')
      expect(screen.getByTestId('is-active')).toHaveTextContent('no')
      expect(screen.getByTestId('org-id')).toHaveTextContent('no-id')
      expect(screen.getByTestId('org-name')).toHaveTextContent('no-name')
    })

    it('should handle inactive membership', () => {
      const inactiveMembership = { ...mockMembership, status: 'inactive' as const }
      mockUseOrganization.mockReturnValue({
        ...mockUseOrganization(),
        membership: inactiveMembership
      })

      render(<OrganizationValidationTestComponent />)

      expect(screen.getByTestId('is-valid')).toHaveTextContent('yes')
      expect(screen.getByTestId('is-active')).toHaveTextContent('no')
      expect(screen.getByTestId('membership-status')).toHaveTextContent('inactive')
    })
  })

  describe('useOrganizationMetadata', () => {
    it('should provide metadata and settings access', () => {
      render(<OrganizationMetadataTestComponent />)

      expect(screen.getByTestId('metadata-key')).toHaveTextContent('value')
      expect(screen.getByTestId('metadata-missing')).toHaveTextContent('default')
      expect(screen.getByTestId('setting-theme')).toHaveTextContent('dark')
      expect(screen.getByTestId('setting-missing')).toHaveTextContent('default')
      expect(screen.getByTestId('metadata-count')).toHaveTextContent('2')
      expect(screen.getByTestId('settings-count')).toHaveTextContent('3')
    })

    it('should handle missing organization', () => {
      mockUseOrganization.mockReturnValue({
        ...mockUseOrganization(),
        organization: null
      })

      render(<OrganizationMetadataTestComponent />)

      expect(screen.getByTestId('metadata-key')).toHaveTextContent('default')
      expect(screen.getByTestId('setting-theme')).toHaveTextContent('default')
      expect(screen.getByTestId('metadata-count')).toHaveTextContent('0')
      expect(screen.getByTestId('settings-count')).toHaveTextContent('0')
    })

    it('should call refresh function', () => {
      const mockRefresh = vi.fn()
      mockUseOrganization.mockReturnValue({
        ...mockUseOrganization(),
        refreshOrganizationData: mockRefresh
      })

      render(<OrganizationMetadataTestComponent />)

      act(() => {
        screen.getByTestId('refresh-button').click()
      })

      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  describe('useOrganizationDebug', () => {
    it('should provide debug information', () => {
      render(<OrganizationDebugTestComponent />)

      expect(screen.getByTestId('debug-org-id')).toHaveTextContent('org-1')
      expect(screen.getByTestId('debug-roles-count')).toHaveTextContent('2')
      expect(screen.getByTestId('debug-permissions-count')).toHaveTextContent('12')
      expect(screen.getByTestId('debug-timestamp')).toHaveTextContent('has-timestamp')
    })

    it('should log context in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

      render(<OrganizationDebugTestComponent />)

      act(() => {
        screen.getByTestId('log-button').click()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Organization Context Debug')
      expect(consoleLogSpy).toHaveBeenCalledWith('Debug Info:', expect.any(Object))
      expect(consoleGroupEndSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
      consoleLogSpy.mockRestore()
      consoleGroupEndSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })

    it('should not log in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {})

      render(<OrganizationDebugTestComponent />)

      act(() => {
        screen.getByTestId('log-button').click()
      })

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })
  })
})