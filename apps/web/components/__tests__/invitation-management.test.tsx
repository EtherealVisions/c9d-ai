import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { InvitationManagement } from '../invitation-management'
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

const mockInvitations = [
  {
    id: 'invitation-1',
    organizationId: 'org-1',
    email: 'pending@example.com',
    roleId: 'role-1',
    invitedBy: 'user-1',
    token: 'token-123',
    status: 'pending' as const,
    expiresAt: new Date('2024-12-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'invitation-2',
    organizationId: 'org-1',
    email: 'accepted@example.com',
    roleId: 'role-2',
    invitedBy: 'user-1',
    token: 'token-456',
    status: 'accepted' as const,
    expiresAt: new Date('2024-12-31'),
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-03')
  },
  {
    id: 'invitation-3',
    organizationId: 'org-1',
    email: 'expired@example.com',
    roleId: 'role-1',
    invitedBy: 'user-1',
    token: 'token-789',
    status: 'expired' as const,
    expiresAt: new Date('2023-12-31'),
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-31')
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
const mockOnInvitationsChange = vi.fn()

describe('InvitationManagement', () => {
  beforeEach(() => {
    vi.mocked(useOrganization).mockReturnValue(mockUseOrganization)
    vi.mocked(useToast).mockReturnValue({ toast: mockToast })
    mockFetch.mockClear()
    mockToast.mockClear()
    mockOnInvitationsChange.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    render(
      <InvitationManagement
        invitations={[]}
        loading={true}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    expect(screen.getByText('Loading invitations...')).toBeInTheDocument()
  })

  it('renders empty state when no invitations', () => {
    render(
      <InvitationManagement
        invitations={[]}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    expect(screen.getByText('No invitations sent')).toBeInTheDocument()
    expect(screen.getByText("You haven't sent any invitations yet. Use the button above to invite new members.")).toBeInTheDocument()
  })

  it('renders invitation list with correct information', () => {
    render(
      <InvitationManagement
        invitations={mockInvitations}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    expect(screen.getByText('accepted@example.com')).toBeInTheDocument()
    expect(screen.getByText('expired@example.com')).toBeInTheDocument()
  })

  it('shows correct status badges', () => {
    render(
      <InvitationManagement
        invitations={mockInvitations}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText('Expired')).toBeInTheDocument()
  })

  it('shows pending invitations section when there are pending invitations', () => {
    render(
      <InvitationManagement
        invitations={mockInvitations}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument()
    expect(screen.getByText('Invitations that are waiting to be accepted.')).toBeInTheDocument()
  })

  it('opens invite dialog when clicking send invitation', async () => {
    const user = userEvent.setup()
    
    render(
      <InvitationManagement
        invitations={[]}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    const sendButton = screen.getByText('Send Invitation')
    await user.click(sendButton)
    
    expect(screen.getByText('Invite New Member')).toBeInTheDocument()
    expect(screen.getByText('Send an invitation to join this organization.')).toBeInTheDocument()
  })

  it('sends invitation successfully', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'new-invitation',
        email: 'newuser@example.com'
      })
    })

    render(
      <InvitationManagement
        invitations={[]}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    // Open invite dialog
    const sendButton = screen.getByText('Send Invitation')
    await user.click(sendButton)
    
    // Fill form
    const emailInput = screen.getByPlaceholderText('user@example.com')
    await user.type(emailInput, 'newuser@example.com')
    
    const roleSelect = screen.getByRole('combobox')
    await user.click(roleSelect)
    await user.click(screen.getByText('Admin'))
    
    // Submit
    const submitButton = screen.getByText('Send Invitation')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: 'org-1',
          email: 'newuser@example.com',
          roleId: '1'
        })
      })
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Invitation sent',
      description: 'Successfully sent invitation to newuser@example.com.'
    })
    
    expect(mockOnInvitationsChange).toHaveBeenCalled()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    
    render(
      <InvitationManagement
        invitations={[]}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    // Open invite dialog
    const sendButton = screen.getByText('Send Invitation')
    await user.click(sendButton)
    
    // Enter invalid email
    const emailInput = screen.getByPlaceholderText('user@example.com')
    await user.type(emailInput, 'invalid-email')
    
    // Try to submit
    const submitButton = screen.getByText('Send Invitation')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
    
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('requires role selection', async () => {
    const user = userEvent.setup()
    
    render(
      <InvitationManagement
        invitations={[]}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    // Open invite dialog
    const sendButton = screen.getByText('Send Invitation')
    await user.click(sendButton)
    
    // Enter email but no role
    const emailInput = screen.getByPlaceholderText('user@example.com')
    await user.type(emailInput, 'test@example.com')
    
    // Try to submit
    const submitButton = screen.getByText('Send Invitation')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please select a role')).toBeInTheDocument()
    })
    
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('handles invitation errors', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'User already has a pending invitation'
      })
    })

    render(
      <InvitationManagement
        invitations={[]}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    // Open invite dialog and fill form
    const sendButton = screen.getByText('Send Invitation')
    await user.click(sendButton)
    
    const emailInput = screen.getByPlaceholderText('user@example.com')
    await user.type(emailInput, 'test@example.com')
    
    const roleSelect = screen.getByRole('combobox')
    await user.click(roleSelect)
    await user.click(screen.getByText('Member'))
    
    // Submit
    const submitButton = screen.getByText('Send Invitation')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Invitation failed',
        description: 'User already has a pending invitation',
        variant: 'destructive'
      })
    })
  })

  it('revokes invitation successfully', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        message: 'Invitation revoked successfully'
      })
    })

    render(
      <InvitationManagement
        invitations={mockInvitations}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    // Find and click revoke button for pending invitation
    const revokeButtons = screen.getAllByText('Revoke')
    await user.click(revokeButtons[0])
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/invitations/invitation-1', {
        method: 'DELETE'
      })
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Invitation revoked',
      description: 'Successfully revoked invitation for pending@example.com.'
    })
    
    expect(mockOnInvitationsChange).toHaveBeenCalled()
  })

  it('handles revoke errors', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'Invitation not found'
      })
    })

    render(
      <InvitationManagement
        invitations={mockInvitations}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    const revokeButtons = screen.getAllByText('Revoke')
    await user.click(revokeButtons[0])
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Revoke failed',
        description: 'Invitation not found',
        variant: 'destructive'
      })
    })
  })

  it('shows loading states during operations', async () => {
    const user = userEvent.setup()
    
    // Mock slow response for invitation
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({})
      }), 100))
    )

    render(
      <InvitationManagement
        invitations={[]}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    // Open invite dialog and submit
    const sendButton = screen.getByText('Send Invitation')
    await user.click(sendButton)
    
    const emailInput = screen.getByPlaceholderText('user@example.com')
    await user.type(emailInput, 'test@example.com')
    
    const roleSelect = screen.getByRole('combobox')
    await user.click(roleSelect)
    await user.click(screen.getByText('Member'))
    
    const submitButton = screen.getByText('Send Invitation')
    await user.click(submitButton)
    
    expect(screen.getByText('Sending...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('shows revoke loading state', async () => {
    const user = userEvent.setup()
    
    // Mock slow response for revoke
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({})
      }), 100))
    )

    render(
      <InvitationManagement
        invitations={mockInvitations}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    const revokeButtons = screen.getAllByText('Revoke')
    await user.click(revokeButtons[0])
    
    expect(screen.getByText('Revoking...')).toBeInTheDocument()
  })

  it('only shows revoke button for pending invitations', () => {
    render(
      <InvitationManagement
        invitations={mockInvitations}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    // Should have revoke buttons for pending invitations only
    // In the pending section (1) + in the history section (1) = 2 total
    const revokeButtons = screen.getAllByText('Revoke')
    expect(revokeButtons).toHaveLength(2)
  })

  it('formats dates correctly', () => {
    render(
      <InvitationManagement
        invitations={mockInvitations}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    expect(screen.getByText('1/1/2024')).toBeInTheDocument() // Created date
    expect(screen.getByText('12/31/2024')).toBeInTheDocument() // Expires date
  })

  it('cancels invite dialog', async () => {
    const user = userEvent.setup()
    
    render(
      <InvitationManagement
        invitations={[]}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    // Open invite dialog
    const sendButton = screen.getByText('Send Invitation')
    await user.click(sendButton)
    
    // Cancel
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)
    
    expect(screen.queryByText('Invite New Member')).not.toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({})
    })

    render(
      <InvitationManagement
        invitations={[]}
        loading={false}
        onInvitationsChange={mockOnInvitationsChange}
      />
    )
    
    // Open invite dialog and fill form
    const sendButton = screen.getByText('Send Invitation')
    await user.click(sendButton)
    
    const emailInput = screen.getByPlaceholderText('user@example.com')
    await user.type(emailInput, 'test@example.com')
    
    const roleSelect = screen.getByRole('combobox')
    await user.click(roleSelect)
    await user.click(screen.getByText('Member'))
    
    // Submit
    const submitButton = screen.getByText('Send Invitation')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnInvitationsChange).toHaveBeenCalled()
    })
    
    // Dialog should be closed and form reset
    expect(screen.queryByText('Invite New Member')).not.toBeInTheDocument()
  })
})