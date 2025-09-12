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
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02')
}

const mockMembership = {
  id: 'membership-1',
  userId: 'user-1',
  organizationId: 'org-1',
  roleId: 'role-1',
  status: 'active' as const,
  joinedAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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

const mockMembers = [
  {
    id: 'membership-1',
    userId: 'user-1',
    organizationId: 'org-1',
    roleId: 'role-1',
    status: 'active' as const,
    joinedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

const mockInvitations = [
  {
    id: 'invitation-1',
    organizationId: 'org-1',
    email: 'test@example.com',
    roleId: 'role-1',
    invitedBy: 'user-1',
    token: 'token-123',
    status: 'pending' as const,
    expiresAt: new Date('2024-12-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

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

describe('OrganizationDashboard', () => {
  beforeEach(() => {
    vi.mocked(useOrganization).mockReturnValue(mockUseOrganization)
    vi.mocked(useToast).mockReturnValue({ toast: mockToast })
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
    
    expect(screen.getByText('Test Organization')).toBeInTheDocument()
    expect(screen.getByText('A test organization')).toBeInTheDocument()
    expect(screen.getByText('test-org')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('loads members and invitations on mount', async () => {
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
      expect(mockFetch).toHaveBeenCalledWith('/api/memberships?organizationId=org-1')
      expect(mockFetch).toHaveBeenCalledWith('/api/invitations?organizationId=org-1')
    })
  })

  it('displays correct member and invitation counts', async () => {
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

  it('switches between tabs correctly', async () => {
    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(true)
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    })

    render(<OrganizationDashboard />)
    
    // Click on Members tab
    fireEvent.click(screen.getByText('Members'))
    await waitFor(() => {
      expect(screen.getByTestId('member-management')).toBeInTheDocument()
    })

    // Click on Invitations tab
    fireEvent.click(screen.getByText('Invitations'))
    await waitFor(() => {
      expect(screen.getByTestId('invitation-management')).toBeInTheDocument()
    })

    // Click on Settings tab
    fireEvent.click(screen.getByText('Settings'))
    await waitFor(() => {
      expect(screen.getByTestId('organization-settings')).toBeInTheDocument()
    })
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
    
    // Check that organization name appears (there might be multiple instances)
    const orgNames = screen.getAllByText('Test Organization')
    expect(orgNames.length).toBeGreaterThan(0)
    expect(screen.getByText('test-org')).toBeInTheDocument()
    expect(screen.getByText('January 1, 2024')).toBeInTheDocument() // Created date
    expect(screen.getByText('January 2, 2024')).toBeInTheDocument() // Updated date
  })

  it('displays user membership information', () => {
    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(true)
    })

    render(<OrganizationDashboard />)
    
    // Check for role name in the badge (there might be multiple "Admin" texts)
    const adminBadges = screen.getAllByText('Admin')
    expect(adminBadges.length).toBeGreaterThan(0)
    // Check for the formatted joined date - it should be formatted as "Jan 2024"
    expect(screen.getByText('Jan 2024')).toBeInTheDocument() // Joined date
  })

  it('loads data on mount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    })

    vi.mocked(useOrganization).mockReturnValue({
      ...mockUseOrganization,
      hasPermission: vi.fn().mockReturnValue(true)
    })

    render(<OrganizationDashboard />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/memberships?organizationId=org-1')
      expect(mockFetch).toHaveBeenCalledWith('/api/invitations?organizationId=org-1')
    })
  })
})