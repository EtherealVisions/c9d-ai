import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useAuth } from '../auth-context'
import { rbacService } from '../../services/rbac-service'
import { organizationService } from '../../services/organization-service'
import { OrganizationProvider, useOrganization } from '../organization-context'
import type { Organization, Role, Membership, User } from '../../models/types'

// Mock dependencies
vi.mock('../auth-context')
vi.mock('../../services/rbac-service')
vi.mock('../../services/organization-service')

const mockUseAuth = vi.mocked(useAuth)
const mockRbacService = vi.mocked(rbacService)
const mockOrganizationService = vi.mocked(organizationService)

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

// Test component
function TestComponent() {
  const { 
    organization, 
    membership, 
    roles, 
    permissions, 
    isLoading,
    canAccess,
    hasPermission,
    hasRole
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

  it('should provide organization context to children', async () => {
    render(
      <OrganizationProvider>
        <TestComponent />
      </OrganizationProvider>
    )

    // Wait for initial load
    await vi.waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    expect(screen.getByTestId('organization')).toHaveTextContent('Test Organization')
    expect(screen.getByTestId('membership-status')).toHaveTextContent('active')
    expect(screen.getByTestId('roles-count')).toHaveTextContent('1')
    expect(screen.getByTestId('permissions-count')).toHaveTextContent('4')
  })

  it('should correctly check permissions', async () => {
    render(
      <OrganizationProvider>
        <TestComponent />
      </OrganizationProvider>
    )

    await vi.waitFor(() => {
      expect(screen.getByTestId('can-manage-org')).toHaveTextContent('yes')
      expect(screen.getByTestId('has-admin-role')).toHaveTextContent('yes')
      expect(screen.getByTestId('has-manage-permission')).toHaveTextContent('yes')
    })
  })

  it('should handle no organization context', async () => {
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

    await vi.waitFor(() => {
      expect(screen.getByTestId('organization')).toHaveTextContent('no-organization')
      expect(screen.getByTestId('membership-status')).toHaveTextContent('no-membership')
      expect(screen.getByTestId('roles-count')).toHaveTextContent('0')
      expect(screen.getByTestId('permissions-count')).toHaveTextContent('0')
    })
  })

  it('should throw error when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useOrganization must be used within an OrganizationProvider')

    consoleSpy.mockRestore()
  })
})