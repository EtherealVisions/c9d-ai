import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OrganizationDashboard } from '../organization-dashboard'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useToast } from '@/hooks/use-toast'

// Mock the contexts and hooks
vi.mock('@/lib/contexts/organization-context')
vi.mock('@/hooks/use-toast')

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock child components
vi.mock('../organization-settings', () => ({
  OrganizationSettings: ({ organization }: { organization: any }) => (
    <div data-testid="organization-settings">Settings for {organization.name}</div>
  )
}))

vi.mock('../member-management', () => ({
  MemberManagement: ({ members, loading, onMembersChange, canManage }: any) => (
    <div data-testid="member-management">
      <div>Members: {members.length}</div>
      <div>Loading: {loading.toString()}</div>
      <div>Can Manage: {canManage.toString()}</div>
      <button onClick={onMembersChange}>Refresh Members</button>
    </div>
  )
}))

vi.mock('../invitation-management', () => ({
  InvitationManagement: ({ invitations, loading, onInvitationsChange }: any) => (
    <div data-testid="invitation-management">
      <div>Invitations: {invitations.length}</div>
      <div>Loading: {loading.toString()}</div>
      <button onClick={onInvitationsChange}>Refresh Invitations</button>
    </div>
  )
}))

const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'A test organization',
  avatarUrl: 'https://example.com/avatar.jpg',
  metadata: {},
  settings: {},
  createdAt: new Date('2024-01-01T12:00:00Z'),
  updatedAt: new Date('2024-01-02T12:00:00Z')
}

const mockMembership = {
  id: 'membership-1',
  userId: 'user-1',
  organizationId: 'org-1',
  roleId: 'role-1',
  status: 'active' as const,
  joinedAt: new Date('2024-01-01T12:00:00Z'),
  createdAt: new Date('2024-01-01T12:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
  role: {
    id: 'role-1',
    name: 'Admin',
    description: 'Administrator role',
    organizationId: 'org-1',
    isSystemRole: true,
    permissions: ['*'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

const mockUseOrganization = {
  organization: mockOrganization,
  membership: mockMembership,
  isLoading: false,
  roles: [],
  permissions: [],
  switchOrganization: vi.fn(),
  refreshOrganizationData: vi.fn(),
  canAccess: vi.fn(),
  hasPermission: vi.fn(),
  hasRole: vi.fn(),
  hasAnyRole: vi.fn(),
  filterResourcesByPermission: vi.fn()
}

const mockToast = vi.fn()

describe('OrganizationDashboard - Fixed Tests', () => {
  beforeEach(() => {
    vi.mocked(useOrganization).mockReturnValue(mockUseOrganization)
    vi.mocked(useToast).mockReturnValue({ 
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: []
    })
    mockFetch.mockClear()
    mockToast.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      isLoading: true
    })

    render(<OrganizationDashboard />)
    
    expect(screen.getByText('Loading organization...')).toBeInTheDocument()
  })

  it('renders no organization selected state', () => {
    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      organization: null,
      membership: null
    })

    render(<OrganizationDashboard />)
    
    expect(screen.getByText('No Organization Selected')).toBeInTheDocument()
    expect(screen.getByText('Please select an organization to view the dashboard.')).toBeInTheDocument()
  })

  it('renders organization dashboard with basic information', () => {
    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(true)
    })

    render(<OrganizationDashboard />)
    
    expect(screen.getByRole('heading', { name: 'Test Organization' })).toBeInTheDocument()
    expect(screen.getAllByText('A test organization').length).toBeGreaterThan(0)
    expect(screen.getAllByText('test-org').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1)
  })

  it('loads members and invitations on mount', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })

    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(true)
    })

    render(<OrganizationDashboard />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/memberships?organizationId=org-1')
      expect(mockFetch).toHaveBeenCalledWith('/api/invitations?organizationId=org-1')
    })
  })

  it('shows only overview tab when user has no permissions', () => {
    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(false)
    })

    render(<OrganizationDashboard />)
    
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.queryByText('Members')).not.toBeInTheDocument()
    expect(screen.queryByText('Invitations')).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('shows all tabs when user has all permissions', () => {
    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn((permission: string) => {
        return ['organization:read', 'membership:read', 'membership:manage', 'organization:update'].includes(permission)
      })
    })

    render(<OrganizationDashboard />)
    
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('Invitations')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders tabs correctly', () => {
    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(true)
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    })

    render(<OrganizationDashboard />)
    
    // Check that all tabs are rendered
    expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Members/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Invitations/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Settings/ })).toBeInTheDocument()
    
    // Check that overview content is visible by default
    expect(screen.getByText('Total Members')).toBeInTheDocument()
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument()
    expect(screen.getByText('Your Role')).toBeInTheDocument()
    expect(screen.getByText('Member Since')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'))

    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(true)
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<OrganizationDashboard />)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load members:', expect.any(Error))
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load invitations:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('displays organization metadata correctly', () => {
    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(true)
    })

    render(<OrganizationDashboard />)
    
    // Check that organization name appears
    const orgNames = screen.getAllByText('Test Organization')
    expect(orgNames.length).toBeGreaterThan(0)
    expect(screen.getAllByText('test-org').length).toBeGreaterThanOrEqual(1)
    // Check for date elements - they should be formatted as "January 1, 2024" and "January 2, 2024"
    expect(screen.getAllByText(/January.*2024/).length).toBeGreaterThanOrEqual(2)
  })

  it('displays user membership information', () => {
    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(true)
    })

    render(<OrganizationDashboard />)
    
    // Check for role name in the badge
    const adminBadges = screen.getAllByText('Admin')
    expect(adminBadges.length).toBeGreaterThan(0)
    // Check for the formatted joined date - should be "Jan 2024"
    expect(screen.getAllByText(/Jan.*2024/).length).toBeGreaterThanOrEqual(1)
  })

  it('displays correct member and invitation counts', async () => {
    const mockMembers = [
      { id: 'membership-1', userId: 'user-1', organizationId: 'org-1' }
    ]
    const mockInvitations = [
      { id: 'invitation-1', organizationId: 'org-1', status: 'pending' }
    ]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMembers)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInvitations)
      })

    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(true)
    })

    render(<OrganizationDashboard />)
    
    await waitFor(() => {
      // Check for member count in the stats card
      const memberCards = screen.getAllByText('1')
      expect(memberCards.length).toBeGreaterThan(0)
    })
  })
})