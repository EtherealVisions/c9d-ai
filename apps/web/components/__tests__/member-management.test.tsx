import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemberManagement } from '../member-management'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useToast } from '@/hooks/use-toast'

// Mock the contexts and hooks
vi.mock('@/lib/contexts/organization-context')
vi.mock('@/hooks/use-toast')

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'A test organization',
  avatarUrl: null,
  metadata: {},
  settings: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02')
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
    updatedAt: new Date('2024-01-01'),
    user: {
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/john.jpg'
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
      email: 'jane@example.com',
      firstName: undefined,
      lastName: undefined,
      avatarUrl: undefined
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

const mockUseOrganization = {
  organization: mockOrganization,
  membership: null,
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
const mockOnMembersChange = vi.fn()

describe('MemberManagement', () => {
  beforeEach(() => {
    vi.mocked(useOrganization).mockReturnValue(mockUseOrganization)
    vi.mocked(useToast).mockReturnValue({ toast: mockToast })
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
    
    // Check second member (email only)
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Member')).toBeInTheDocument()
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

  it('updates member role successfully', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'membership-1',
        roleId: 'role-2'
      })
    })

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
    
    // Select new role (Member)
    const roleSelect = screen.getByRole('combobox')
    await user.click(roleSelect)
    await user.click(screen.getByText('Member'))
    
    // Submit
    const updateButton = screen.getByText('Update Role')
    await user.click(updateButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/memberships/user-1/org-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roleId: '2'
        })
      })
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Role updated',
      description: "Successfully updated john@example.com's role."
    })
    
    expect(mockOnMembersChange).toHaveBeenCalled()
  })

  it('handles role update errors', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'Insufficient permissions'
      })
    })

    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    // Open role change dialog and submit
    const changeRoleButtons = screen.getAllByText('Change Role')
    await user.click(changeRoleButtons[0])
    
    const updateButton = screen.getByText('Update Role')
    await user.click(updateButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Update failed',
        description: 'Insufficient permissions',
        variant: 'destructive'
      })
    })
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
    
    expect(screen.getByText('Remove Member')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to remove john@example.com from this organization?')).toBeInTheDocument()
  })

  it('removes member successfully', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        message: 'Member removed successfully'
      })
    })

    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    // Open remove dialog
    const removeButtons = screen.getAllByText('Remove')
    await user.click(removeButtons[0])
    
    // Confirm removal
    const confirmButton = screen.getByText('Remove Member')
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/memberships/user-1/org-1', {
        method: 'DELETE'
      })
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Member removed',
      description: 'Successfully removed john@example.com from the organization.'
    })
    
    expect(mockOnMembersChange).toHaveBeenCalled()
  })

  it('handles member removal errors', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'Cannot remove organization owner'
      })
    })

    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    // Open remove dialog and confirm
    const removeButtons = screen.getAllByText('Remove')
    await user.click(removeButtons[0])
    
    const confirmButton = screen.getByText('Remove Member')
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Remove failed',
        description: 'Cannot remove organization owner',
        variant: 'destructive'
      })
    })
  })

  it('shows loading states during operations', async () => {
    const user = userEvent.setup()
    
    // Mock slow response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({})
      }), 100))
    )

    render(
      <MemberManagement
        members={mockMembers}
        loading={false}
        onMembersChange={mockOnMembersChange}
        canManage={true}
      />
    )
    
    // Open role change dialog and submit
    const changeRoleButtons = screen.getAllByText('Change Role')
    await user.click(changeRoleButtons[0])
    
    const updateButton = screen.getByText('Update Role')
    await user.click(updateButton)
    
    expect(screen.getByText('Updating...')).toBeInTheDocument()
    expect(updateButton).toBeDisabled()
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
    // We'll just check that the email is displayed since the default avatar is just an icon
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
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
    
    expect(screen.getByText('1/1/2024')).toBeInTheDocument()
    expect(screen.getByText('1/2/2024')).toBeInTheDocument()
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