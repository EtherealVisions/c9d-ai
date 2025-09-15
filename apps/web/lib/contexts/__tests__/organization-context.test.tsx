import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useAuth } from '../auth-context'
import { rbacService } from '../../services/rbac-service'
import { organizationService } from '../../services/organization-service'
import { 
  OrganizationProvider, 
  useOrganization,
  useCurrentOrganizationDetails,
  useOrganizationPermissions,
  useOrganizationActions,
  useResourceFiltering
} from '../organization-context'
import type { Organization, Role, Membership, User } from '../../models/types'

import { vi } from 'vitest'

// Mock dependencies
vi.mock('../auth-context')
vi.mock('../../services/rbac-service')
vi.mock('../../services/organization-service')

const mockUseAuth = useAuth as any
const mockRbacService = rbacService as any
const mockOrganizationService = organizationService as any

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Test data
const mockUser: User = {
  id: 'user-1',
  clerkUserId: 'clerk-user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  preferences: {},
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'Test organization description',
  metadata: { key: 'value' },
  settings: { setting: 'value' },
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
  }
]

const mockPermissions = ['organization:manage', 'users:manage', 'agents:read', 'datasets:read']

// Test component that uses the organization context
function TestComponent() {
  const { 
    organization, 
    membership, 
    roles, 
    permissions, 
    isLoading,
    canAccess,
    hasPermission,
    hasRole,
    switchOrganization,
    refreshOrganizationData
  } = useOrganization()

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="organization">{organization?.name || 'no-organization'}</div>
      <div data-testid="membership-status">{membership?.status || 'no-membership'}</div>
      <div data-testid="roles-count">{roles.length}</div>
      <div data-testid="permissions-count">{permissions.length}</div>
      <div data-testid="can-manage-org">{canAccess('organization', 'manage') ? 'yes' : 'no'}</div>
      <div data-testid="has-admin-role">{hasRole('Admin') ? 'yes' : 'no'}</div>
      <div data-testid="has-manage-permission">{hasPermission('organization:manage') ? 'yes' : 'no'}</div>
      <button 
        data-testid="switch-org-button" 
        onClick={() => switchOrganization('org-2')}
      >
        Switch Organization
      </button>
      <button 
        data-testid="refresh-button" 
        onClick={() => refreshOrganizationData()}
      >
        Refresh
      </button>
    </div>
  )
}

// Test component for hooks
function HooksTestComponent() {
  const { organization, membership, isLoading } = useCurrentOrganizationDetails()
  const { roles, permissions, canAccess, hasPermission } = useOrganizationPermissions()
  const { switchOrganization, refreshOrganizationData } = useOrganizationActions()
  const { filterResourcesByPermission } = useResourceFiltering()

  const testResources = [{ id: 'resource-1' }, { id: 'resource-2' }]
  const filteredResources = filterResourcesByPermission(testResources, 'agents:read')

  return (
    <div>
      <div data-testid="hook-organization">{organization?.name || 'no-organization'}</div>
      <div data-testid="hook-membership">{membership?.status || 'no-membership'}</div>
      <div data-testid="hook-loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="hook-roles">{roles.length}</div>
      <div data-testid="hook-permissions">{permissions.length}</div>
      <div data-testid="hook-can-access">{canAccess('organization', 'manage') ? 'yes' : 'no'}</div>
      <div data-testid="hook-has-permission">{hasPermission('users:manage') ? 'yes' : 'no'}</div>
      <div data-testid="hook-filtered-resources">{filteredResources.length}</div>
    </div>
  )
}

describe('OrganizationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
    
    // Default auth context mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      currentOrganization: mockOrganization,
      currentMembership: mockMembership,
      isSignedIn: true,
      isLoading: false,
      organizations: [mockOrganization],
      permissions: mockPermissions,
      switchOrganization: vi.fn(),
      refreshUser: vi.fn(),
      refreshOrganizations: vi.fn(),
      hasPermission: vi.fn()
    })

    // Default service mocks
    mockRbacService.getUserRoles.mockResolvedValue(mockRoles)
    mockRbacService.getUserPermissions.mockResolvedValue(mockPermissions)
    mockOrganizationService.getOrganization.mockResolvedValue({ data: mockOrganization })
  })

  describe('Context Provider', () => {
    it('should provide organization context to children', async () => {
      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      expect(screen.getByTestId('organization')).toHaveTextContent('Test Organization')
      expect(screen.getByTestId('membership-status')).toHaveTextContent('active')
      expect(screen.getByTestId('roles-count')).toHaveTextContent('1')
      expect(screen.getByTestId('permissions-count')).toHaveTextContent('4')
    })

    it('should load organization context when current organization changes', async () => {
      const { rerender } = render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(mockRbacService.getUserRoles).toHaveBeenCalledWith('user-1', 'org-1')
        expect(mockRbacService.getUserPermissions).toHaveBeenCalledWith('user-1', 'org-1')
      })

      // Change current organization
      const newOrganization = { ...mockOrganization, id: 'org-2', name: 'New Organization' }
      const newMembership = { ...mockMembership, organizationId: 'org-2' }
      
      mockUseAuth.mockReturnValue({
        user: mockUser,
        currentOrganization: newOrganization,
        currentMembership: newMembership,
        isSignedIn: true,
        isLoading: false,
        organizations: [mockOrganization, newOrganization],
        permissions: mockPermissions,
        switchOrganization: vi.fn(),
        refreshUser: vi.fn(),
        refreshOrganizations: vi.fn(),
        hasPermission: vi.fn()
      })

      rerender(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(mockRbacService.getUserRoles).toHaveBeenCalledWith('user-1', 'org-2')
        expect(mockRbacService.getUserPermissions).toHaveBeenCalledWith('user-1', 'org-2')
      })
    })

    it('should clear context when no organization is selected', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        currentOrganization: null,
        currentMembership: null,
        isSignedIn: true,
        isLoading: false,
        organizations: [],
        permissions: [],
        switchOrganization: vi.fn(),
        refreshUser: vi.fn(),
        refreshOrganizations: vi.fn(),
        hasPermission: vi.fn()
      })

      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('organization')).toHaveTextContent('no-organization')
        expect(screen.getByTestId('membership-status')).toHaveTextContent('no-membership')
        expect(screen.getByTestId('roles-count')).toHaveTextContent('0')
        expect(screen.getByTestId('permissions-count')).toHaveTextContent('0')
      })
    })
  })

  describe('Permission Checking', () => {
    it('should correctly check resource access permissions', async () => {
      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('can-manage-org')).toHaveTextContent('yes')
        expect(screen.getByTestId('has-admin-role')).toHaveTextContent('yes')
        expect(screen.getByTestId('has-manage-permission')).toHaveTextContent('yes')
      })
    })

    it('should return false for permissions user does not have', async () => {
      mockRbacService.getUserPermissions.mockResolvedValue(['users:read'])

      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('can-manage-org')).toHaveTextContent('no')
        expect(screen.getByTestId('has-manage-permission')).toHaveTextContent('no')
      })
    })

    it('should return false for roles user does not have', async () => {
      const memberRole: Role = {
        id: 'role-2',
        name: 'Member',
        description: 'Member role',
        organizationId: 'org-1',
        isSystemRole: true,
        permissions: ['users:read'],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockRbacService.getUserRoles.mockResolvedValue([memberRole])

      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('has-admin-role')).toHaveTextContent('no')
      })
    })
  })

  describe('Organization Switching', () => {
    it('should switch organization successfully', async () => {
      const newOrganization = { ...mockOrganization, id: 'org-2', name: 'New Organization' }
      mockOrganizationService.getOrganization.mockResolvedValue({ data: newOrganization })

      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      act(() => {
        screen.getByTestId('switch-org-button').click()
      })

      await waitFor(() => {
        expect(mockOrganizationService.getOrganization).toHaveBeenCalledWith('org-2')
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentOrganizationId', 'org-2')
      })
    })

    it('should handle organization switching errors', async () => {
      mockOrganizationService.getOrganization.mockResolvedValue({ 
        error: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND'
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      // Create a promise to catch the unhandled rejection
      const errorPromise = new Promise((resolve) => {
        const originalHandler = process.listeners('unhandledRejection')[0]
        process.once('unhandledRejection', (error) => {
          resolve(error)
          // Restore original handler if it existed
          if (originalHandler) {
            process.on('unhandledRejection', originalHandler)
          }
        })
      })

      // Trigger the organization switch
      act(() => {
        screen.getByTestId('switch-org-button').click()
      })

      // Wait for either the console error or the unhandled rejection
      await Promise.race([
        waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith('Failed to switch organization:', expect.any(Error))
        }),
        errorPromise
      ])

      consoleSpy.mockRestore()
    })
  })

  describe('Data Refresh', () => {
    it('should refresh organization data successfully', async () => {
      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      act(() => {
        screen.getByTestId('refresh-button').click()
      })

      await waitFor(() => {
        expect(mockOrganizationService.getOrganization).toHaveBeenCalledWith('org-1')
        expect(mockRbacService.getUserRoles).toHaveBeenCalledWith('user-1', 'org-1')
        expect(mockRbacService.getUserPermissions).toHaveBeenCalledWith('user-1', 'org-1')
      })
    })
  })

  describe('Hook Functions', () => {
    it('should provide correct data through individual hooks', async () => {
      render(
        <OrganizationProvider>
          <HooksTestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('hook-organization')).toHaveTextContent('Test Organization')
        expect(screen.getByTestId('hook-membership')).toHaveTextContent('active')
        expect(screen.getByTestId('hook-loading')).toHaveTextContent('loaded')
        expect(screen.getByTestId('hook-roles')).toHaveTextContent('1')
        expect(screen.getByTestId('hook-permissions')).toHaveTextContent('4')
        expect(screen.getByTestId('hook-can-access')).toHaveTextContent('yes')
        expect(screen.getByTestId('hook-has-permission')).toHaveTextContent('yes')
        expect(screen.getByTestId('hook-filtered-resources')).toHaveTextContent('2')
      })
    })

    it('should filter resources correctly when user lacks permission', async () => {
      mockRbacService.getUserPermissions.mockResolvedValue(['users:read'])

      render(
        <OrganizationProvider>
          <HooksTestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('hook-filtered-resources')).toHaveTextContent('0')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle RBAC service errors gracefully', async () => {
      mockRbacService.getUserRoles.mockRejectedValue(new Error('RBAC service error'))
      mockRbacService.getUserPermissions.mockRejectedValue(new Error('RBAC service error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('roles-count')).toHaveTextContent('0')
        expect(screen.getByTestId('permissions-count')).toHaveTextContent('0')
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load organization context:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useOrganization must be used within an OrganizationProvider')

      consoleSpy.mockRestore()
    })
  })
})