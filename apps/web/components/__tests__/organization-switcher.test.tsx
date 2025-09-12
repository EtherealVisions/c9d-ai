import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { OrganizationSwitcher } from '../organization-switcher'
import { useAuth } from '@/lib/contexts/auth-context'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useRoleBasedUI } from '@/hooks/use-organization'

// Mock the contexts and hooks
vi.mock('@/lib/contexts/auth-context')
vi.mock('@/lib/contexts/organization-context')
vi.mock('@/hooks/use-organization')

// Mock UI components
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dropdown-menu" data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children, asChild }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, disabled }: any) => (
    <div 
      data-testid="dropdown-item" 
      onClick={disabled ? undefined : onClick}
      data-disabled={disabled}
    >
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }: any) => (
    <div data-testid="dropdown-label">{children}</div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  )
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarImage: ({ src }: any) => <img data-testid="avatar-image" src={src} alt="" />,
  AvatarFallback: ({ children }: any) => <div data-testid="avatar-fallback">{children}</div>
}))

const mockUseAuth = useAuth as any
const mockUseOrganization = useOrganization as any
const mockUseRoleBasedUI = useRoleBasedUI as any

describe('OrganizationSwitcher', () => {
  const mockOrganizations = [
    {
      id: 'org-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      description: 'Main organization',
      avatarUrl: 'https://example.com/avatar1.jpg',
      metadata: {},
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'org-2',
      name: 'Beta Inc',
      slug: 'beta-inc',
      description: 'Secondary organization',
      avatarUrl: 'https://example.com/avatar2.jpg',
      metadata: {},
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  const mockCurrentOrganization = mockOrganizations[0]

  const mockMembership = {
    id: 'membership-1',
    userId: 'user-1',
    organizationId: 'org-1',
    roleId: 'role-1',
    status: 'active' as const,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: 'role-1',
      name: 'Admin',
      description: 'Administrator role',
      organizationId: 'org-1',
      isSystemRole: true,
      permissions: ['organization:manage_settings'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuth.mockReturnValue({
      organizations: mockOrganizations,
      currentOrganization: mockCurrentOrganization,
      switchOrganization: vi.fn(),
      isLoading: false
    })

    mockUseOrganization.mockReturnValue({
      membership: mockMembership,
      permissions: ['organization:manage_settings', 'organization:manage_members']
    })

    mockUseRoleBasedUI.mockReturnValue({
      isAdmin: true,
      isOwner: false,
      canManageSettings: true
    })
  })

  it('renders organization switcher with current organization', () => {
    render(<OrganizationSwitcher />)

    expect(screen.getByTestId('button')).toBeInTheDocument()
    expect(screen.getAllByText('Acme Corp')).toHaveLength(2) // Appears in trigger and dropdown
    expect(screen.getAllByTestId('avatar')).toHaveLength(3) // Trigger + current org + other org
  })

  it('shows loading state when loading', () => {
    mockUseAuth.mockReturnValue({
      organizations: [],
      currentOrganization: null,
      switchOrganization: vi.fn(),
      isLoading: true
    })

    render(<OrganizationSwitcher />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByTestId('button')).toBeDisabled()
  })

  it('shows no organization state when no current organization', () => {
    mockUseAuth.mockReturnValue({
      organizations: [],
      currentOrganization: null,
      switchOrganization: vi.fn(),
      isLoading: false
    })

    render(<OrganizationSwitcher />)

    expect(screen.getByText('No Organization')).toBeInTheDocument()
  })

  it('opens dropdown menu when clicked', () => {
    render(<OrganizationSwitcher />)

    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    expect(screen.getByTestId('dropdown-menu')).toHaveAttribute('data-open', 'true')
  })

  it('displays current organization with check mark in dropdown', () => {
    render(<OrganizationSwitcher />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    expect(screen.getByText('Organizations')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Current organization')).toBeInTheDocument()
  })

  it('displays other organizations in dropdown', () => {
    render(<OrganizationSwitcher />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    expect(screen.getByText('Beta Inc')).toBeInTheDocument()
    expect(screen.getByText('Secondary organization')).toBeInTheDocument()
  })

  it('calls switchOrganization when selecting different organization', async () => {
    const mockSwitchOrganization = vi.fn().mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({
      organizations: mockOrganizations,
      currentOrganization: mockCurrentOrganization,
      switchOrganization: mockSwitchOrganization,
      isLoading: false
    })

    render(<OrganizationSwitcher />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    // Click on Beta Inc
    const betaIncItem = screen.getByText('Beta Inc').closest('[data-testid="dropdown-item"]')
    fireEvent.click(betaIncItem!)

    await waitFor(() => {
      expect(mockSwitchOrganization).toHaveBeenCalledWith('org-2')
    })
  })

  it('handles organization switch error gracefully', async () => {
    const mockSwitchOrganization = vi.fn().mockRejectedValue(new Error('Switch failed'))
    mockUseAuth.mockReturnValue({
      organizations: mockOrganizations,
      currentOrganization: mockCurrentOrganization,
      switchOrganization: mockSwitchOrganization,
      isLoading: false
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<OrganizationSwitcher />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    // Click on Beta Inc
    const betaIncItem = screen.getByText('Beta Inc').closest('[data-testid="dropdown-item"]')
    fireEvent.click(betaIncItem!)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to switch organization:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('shows role badge with correct variant for owner', () => {
    mockUseRoleBasedUI.mockReturnValue({
      isAdmin: false,
      isOwner: true,
      canManageSettings: true
    })

    render(<OrganizationSwitcher />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    const badge = screen.getByTestId('badge')
    expect(badge).toHaveAttribute('data-variant', 'default')
    expect(badge).toHaveTextContent('Owner')
  })

  it('shows role badge with correct variant for admin', () => {
    mockUseRoleBasedUI.mockReturnValue({
      isAdmin: true,
      isOwner: false,
      canManageSettings: true
    })

    render(<OrganizationSwitcher />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    const badge = screen.getByTestId('badge')
    expect(badge).toHaveAttribute('data-variant', 'secondary')
    expect(badge).toHaveTextContent('Admin')
  })

  it('truncates long organization names', () => {
    const longNameOrg = {
      ...mockCurrentOrganization,
      name: 'Very Long Organization Name That Should Be Truncated'
    }

    mockUseAuth.mockReturnValue({
      organizations: [longNameOrg],
      currentOrganization: longNameOrg,
      switchOrganization: vi.fn(),
      isLoading: false
    })

    render(<OrganizationSwitcher maxDisplayLength={15} />)

    expect(screen.getByText('Very Long Or...')).toBeInTheDocument()
  })

  it('shows create organization option when enabled', () => {
    render(<OrganizationSwitcher showCreateButton={true} />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    expect(screen.getByText('Create Organization')).toBeInTheDocument()
  })

  it('hides create organization option when disabled', () => {
    render(<OrganizationSwitcher showCreateButton={false} />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    expect(screen.queryByText('Create Organization')).not.toBeInTheDocument()
  })

  it('shows settings option when user can manage settings', () => {
    render(<OrganizationSwitcher showSettingsButton={true} />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    expect(screen.getByText('Organization Settings')).toBeInTheDocument()
  })

  it('hides settings option when user cannot manage settings', () => {
    mockUseRoleBasedUI.mockReturnValue({
      isAdmin: false,
      isOwner: false,
      canManageSettings: false
    })

    render(<OrganizationSwitcher showSettingsButton={true} />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    expect(screen.queryByText('Organization Settings')).not.toBeInTheDocument()
  })

  it('shows manage members option', () => {
    render(<OrganizationSwitcher />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    expect(screen.getByText('Manage Members')).toBeInTheDocument()
  })

  it('shows no other organizations message when only one organization', () => {
    mockUseAuth.mockReturnValue({
      organizations: [mockCurrentOrganization],
      currentOrganization: mockCurrentOrganization,
      switchOrganization: vi.fn(),
      isLoading: false
    })

    render(<OrganizationSwitcher />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    expect(screen.getByText('No other organizations')).toBeInTheDocument()
  })

  it('generates correct initials for organization avatar fallback', () => {
    const orgWithMultipleWords = {
      ...mockCurrentOrganization,
      name: 'Acme Corporation International'
    }

    mockUseAuth.mockReturnValue({
      organizations: [orgWithMultipleWords],
      currentOrganization: orgWithMultipleWords,
      switchOrganization: vi.fn(),
      isLoading: false
    })

    render(<OrganizationSwitcher />)

    expect(screen.getAllByText('AC')).toHaveLength(2) // Appears in trigger and dropdown
  })

  it('disables switching when already switching', async () => {
    const mockSwitchOrganization = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )
    
    mockUseAuth.mockReturnValue({
      organizations: mockOrganizations,
      currentOrganization: mockCurrentOrganization,
      switchOrganization: mockSwitchOrganization,
      isLoading: false
    })

    render(<OrganizationSwitcher />)

    // Open dropdown
    const trigger = screen.getByTestId('dropdown-trigger')
    fireEvent.click(trigger)

    // Click on Beta Inc
    const betaIncItem = screen.getByText('Beta Inc').closest('[data-testid="dropdown-item"]')
    fireEvent.click(betaIncItem!)

    // Try to click again while switching
    fireEvent.click(betaIncItem!)

    // Should only be called once
    expect(mockSwitchOrganization).toHaveBeenCalledTimes(1)
  })
})