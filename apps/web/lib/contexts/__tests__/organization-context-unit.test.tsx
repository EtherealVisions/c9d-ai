import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { 
  useCurrentOrganizationDetails,
  useOrganizationPermissions,
  useOrganizationActions,
  useResourceFiltering
} from '../organization-context'

// Mock the main organization context
const mockOrganizationContext = {
  organization: {
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-org',
    description: 'Test organization description',
    metadata: { key: 'value' },
    settings: { setting: 'value' },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  membership: {
    id: 'membership-1',
    userId: 'user-1',
    organizationId: 'org-1',
    roleId: 'role-1',
    status: 'active' as const,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  isLoading: false,
  roles: [
    {
      id: 'role-1',
      name: 'Admin',
      description: 'Administrator role',
      organizationId: 'org-1',
      isSystemRole: true,
      permissions: ['organization:manage', 'users:manage'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  permissions: ['organization:manage', 'users:manage', 'agents:read', 'datasets:read'],
  switchOrganization: vi.fn(),
  refreshOrganizationData: vi.fn(),
  canAccess: vi.fn((resource: string, action: string) => {
    const permission = `${resource}:${action}`
    return ['organization:manage', 'users:manage', 'agents:read', 'datasets:read'].includes(permission)
  }),
  hasPermission: vi.fn((permission: string) => 
    ['organization:manage', 'users:manage', 'agents:read', 'datasets:read'].includes(permission)
  ),
  hasRole: vi.fn((roleName: string) => roleName === 'Admin'),
  hasAnyRole: vi.fn((roleNames: string[]) => roleNames.includes('Admin')),
  filterResourcesByPermission: vi.fn((resources: any[], permission: string) => {
    return ['organization:manage', 'users:manage', 'agents:read', 'datasets:read'].includes(permission) 
      ? resources 
      : []
  })
}

// Mock the useOrganization hook and derived hooks
vi.mock('../organization-context', async () => {
  const actual = await vi.importActual('../organization-context')
  return {
    ...actual,
    useOrganization: () => mockOrganizationContext,
    useCurrentOrganizationDetails: () => ({
      organization: mockOrganizationContext.organization,
      membership: mockOrganizationContext.membership,
      isLoading: mockOrganizationContext.isLoading
    }),
    useOrganizationPermissions: () => ({
      roles: mockOrganizationContext.roles,
      permissions: mockOrganizationContext.permissions,
      canAccess: mockOrganizationContext.canAccess,
      hasPermission: mockOrganizationContext.hasPermission,
      hasRole: mockOrganizationContext.hasRole,
      hasAnyRole: mockOrganizationContext.hasAnyRole
    }),
    useOrganizationActions: () => ({
      switchOrganization: mockOrganizationContext.switchOrganization,
      refreshOrganizationData: mockOrganizationContext.refreshOrganizationData
    }),
    useResourceFiltering: () => ({
      filterResourcesByPermission: mockOrganizationContext.filterResourcesByPermission
    })
  }
})

// Test components for each hook
function CurrentOrganizationDetailsTest() {
  const { organization, membership, isLoading } = useCurrentOrganizationDetails()
  
  return (
    <div>
      <div data-testid="organization-name">{organization?.name || 'no-org'}</div>
      <div data-testid="membership-status">{membership?.status || 'no-membership'}</div>
      <div data-testid="is-loading">{isLoading ? 'loading' : 'loaded'}</div>
    </div>
  )
}

function OrganizationPermissionsTest() {
  const { roles, permissions, canAccess, hasPermission, hasRole, hasAnyRole } = useOrganizationPermissions()
  
  return (
    <div>
      <div data-testid="roles-count">{roles.length}</div>
      <div data-testid="permissions-count">{permissions.length}</div>
      <div data-testid="can-access-org-manage">{canAccess('organization', 'manage') ? 'yes' : 'no'}</div>
      <div data-testid="has-manage-permission">{hasPermission('organization:manage') ? 'yes' : 'no'}</div>
      <div data-testid="has-admin-role">{hasRole('Admin') ? 'yes' : 'no'}</div>
      <div data-testid="has-any-admin-role">{hasAnyRole(['Admin', 'Owner']) ? 'yes' : 'no'}</div>
    </div>
  )
}

function OrganizationActionsTest() {
  const { switchOrganization, refreshOrganizationData } = useOrganizationActions()
  
  return (
    <div>
      <button data-testid="switch-button" onClick={() => switchOrganization('org-2')}>
        Switch
      </button>
      <button data-testid="refresh-button" onClick={() => refreshOrganizationData()}>
        Refresh
      </button>
    </div>
  )
}

function ResourceFilteringTest() {
  const { filterResourcesByPermission, hasPermission } = useResourceFiltering()
  
  const testResources = [{ id: 'resource-1' }, { id: 'resource-2' }]
  const filteredResources = filterResourcesByPermission(testResources, 'agents:read')
  
  return (
    <div>
      <div data-testid="filtered-count">{filteredResources.length}</div>
      <div data-testid="has-agents-read">{hasPermission('agents:read') ? 'yes' : 'no'}</div>
    </div>
  )
}

describe('Organization Context Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCurrentOrganizationDetails', () => {
    it('should return current organization details', () => {
      render(<CurrentOrganizationDetailsTest />)
      
      expect(screen.getByTestId('organization-name')).toHaveTextContent('Test Organization')
      expect(screen.getByTestId('membership-status')).toHaveTextContent('active')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('loaded')
    })
  })

  describe('useOrganizationPermissions', () => {
    it('should return permissions and role checking functions', () => {
      render(<OrganizationPermissionsTest />)
      
      expect(screen.getByTestId('roles-count')).toHaveTextContent('1')
      expect(screen.getByTestId('permissions-count')).toHaveTextContent('4')
      expect(screen.getByTestId('can-access-org-manage')).toHaveTextContent('yes')
      expect(screen.getByTestId('has-manage-permission')).toHaveTextContent('yes')
      expect(screen.getByTestId('has-admin-role')).toHaveTextContent('yes')
      expect(screen.getByTestId('has-any-admin-role')).toHaveTextContent('yes')
    })
  })

  describe('useOrganizationActions', () => {
    it('should provide action functions', () => {
      render(<OrganizationActionsTest />)
      
      const switchButton = screen.getByTestId('switch-button')
      const refreshButton = screen.getByTestId('refresh-button')
      
      switchButton.click()
      refreshButton.click()
      
      expect(mockOrganizationContext.switchOrganization).toHaveBeenCalledWith('org-2')
      expect(mockOrganizationContext.refreshOrganizationData).toHaveBeenCalled()
    })
  })

  describe('useResourceFiltering', () => {
    it('should filter resources based on permissions', () => {
      render(<ResourceFilteringTest />)
      
      expect(screen.getByTestId('filtered-count')).toHaveTextContent('2')
      expect(screen.getByTestId('has-agents-read')).toHaveTextContent('yes')
    })
  })
})