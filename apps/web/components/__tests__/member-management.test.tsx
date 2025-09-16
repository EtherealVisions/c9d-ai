import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemberManagement } from '../member-management'

// Mock the contexts and hooks
const mockUseOrganization = {
  organization: {
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-org',
    description: 'A test organization',
    avatarUrl: null,
    metadata: {},
    settings: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02')
  },
  membership: null,
  isLoading: false,
  roles: [],
  permissions: [],
  switchOrganization: vi.fn(),
  refreshOrganizationData: vi.fn(),
  canAccess: vi.fn(),
  hasPermission: vi.fn().mockReturnValue(true),
  hasRole: vi.fn(),
  hasAnyRole: vi.fn(),
  filterResourcesByPermission: vi.fn()
}

const mockToast = vi.fn()

vi.mock('@/lib/contexts/organization-context', () => ({
  useOrganization: () => mockUseOrganization
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ 
    toast: mockToast,
    dismiss: vi.fn(),
    toasts: []
  })
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockMembers = [
  {
    id: 'membership-1',
    userId: 'user-1',
    organizationId: 'org-1',
    roleId: 'role-1',
    status: 'active' as const,
    joinedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    user: {
      id: 'user-1',
      clerkUserId: 'clerk-user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/john.jpg',
      preferences: {},
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
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
  },
  {
    id: 'membership-2',
    userId: 'user-2',
    organizationId: 'org-1',
    roleId: 'role-2',
    status: 'active' as const,
    joinedAt: new Date('2024-01-02'),
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    user: {
      id: 'user-2',
      clerkUserId: 'clerk-user-2',
      email: 'jane@example.com',
      firstName: undefined,
      lastName: undefined,
      avatarUrl: undefined,
      preferences: {},
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    },
    role: {
      id: 'role-2',
      name: 'Member',
      description: 'Standard member',
      organizationId: 'org-1',
      isSystemRole: true,
      permissions: ['organization:read'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
]

const mockOnMembersChange = vi.fn()

describe('MemberManagement', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockToast.mockClear()
    mockOnMembersChange.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    render(
      <MemberManagement
        members={[]}
        loading={true}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    expect(screen.getByText('Loading members...')).toBeInTheDocument()
  })

  it('renders empty state when no members', () => {
    render(
      <MemberManagement
        members={[]}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    expect(screen.getByText('No members found')).toBeInTheDocument()
    expect(screen.getByText("This organization doesn't have any members yet.")).toBeInTheDocument()
  })

  it('renders member list with user information', () => {
    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    // Check first member (with full name)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    
    // Check second member (email only) - use getAllByText since email appears twice
    const janeEmails = screen.getAllByText('jane@example.com')
    expect(janeEmails.length).toBeGreaterThan(0)
    
    // Use getAllByText for "Member" since it appears in both table header and role badge
    const memberTexts = screen.getAllByText('Member')
    expect(memberTexts.length).toBeGreaterThan(0)
  })

  it('shows member status badges correctly', () => {
    const membersWithDifferentStatuses = [
      { ...mockMembers[0], status: 'active' as const },
      { ...mockMembers[1], status: 'inactive' as const, id: 'membership-3' },
      { ...mockMembers[1], status: 'pending' as const, id: 'membership-4' }
    ]

    render(
      <MemberManagement
        members={membersWithDifferentStatuses}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('shows action buttons when user can manage', () => {
    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    expect(screen.getAllByText('Change Role')).toHaveLength(2)
    expect(screen.getAllByText('Remove')).toHaveLength(2)
  })

  it('hides action buttons when user cannot manage', () => {
    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={false}
      />
    )
    
    expect(screen.queryByText('Change Role')).not.toBeInTheDocument()
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
  })

  it('opens role change dialog', async () => {
    const user = userEvent.setup()
    
    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    const changeRoleButtons = screen.getAllByText('Change Role')
    await user.click(changeRoleButtons[0])
    
    expect(screen.getByText('Change Member Role')).toBeInTheDocument()
    expect(screen.getByText('Update the role for john@example.com')).toBeInTheDocument()
  })

  it('opens remove member dialog', async () => {
    const user = userEvent.setup()
    
    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    const removeButtons = screen.getAllByText('Remove')
    await user.click(removeButtons[0])
    
    // Use role to find the dialog title specifically
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Remove Member' })).toBeInTheDocument()
    })
    
    // Use a more flexible text matcher for the dialog description
    expect(screen.getByText((content, element) => {
      return content.includes('Are you sure you want to remove john@example.com from this organization')
    })).toBeInTheDocument()
  })

  it('displays member avatars correctly', () => {
    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    // First member has avatar
    const johnAvatar = screen.getByAltText('john@example.com')
    expect(johnAvatar).toHaveAttribute('src', 'https://example.com/john.jpg')
    
    // Second member has no avatar (should show default icon)
    const defaultAvatar = screen.getByTestId('default-avatar')
    expect(defaultAvatar).toBeInTheDocument()
    
    // Check that jane's email is displayed (appears multiple times - as name and as secondary text)
    const janeEmails = screen.getAllByText('jane@example.com')
    expect(janeEmails.length).toBeGreaterThan(0)
  })

  it('formats join dates correctly', () => {
    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    // Use more flexible date matching since toLocaleDateString() can vary by locale
    const expectedDate1 = new Date('2024-01-01').toLocaleDateString()
    const expectedDate2 = new Date('2024-01-02').toLocaleDateString()
    
    expect(screen.getByText(expectedDate1)).toBeInTheDocument()
    expect(screen.getByText(expectedDate2)).toBeInTheDocument()
  })

  it('cancels dialogs when clicking cancel', async () => {
    const user = userEvent.setup()
    
    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    // Open role change dialog
    const changeRoleButtons = screen.getAllByText('Change Role')
    await user.click(changeRoleButtons[0])
    
    // Cancel
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)
    
    expect(screen.queryByText('Change Member Role')).not.toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})