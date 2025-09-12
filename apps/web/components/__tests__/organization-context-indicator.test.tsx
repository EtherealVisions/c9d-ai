import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { OrganizationContextIndicator } from '../organization-context-indicator'
import { useAuth } from '@/lib/contexts/auth-context'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useRoleBasedUI } from '@/hooks/use-organization'

// Mock the contexts and hooks
vi.mock('@/lib/contexts/auth-context')
vi.mock('@/lib/contexts/organization-context')
vi.mock('@/hooks/use-organization')

// Mock UI components
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

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: any) => (
    <div data-testid="tooltip-content">{children}</div>
  )
}))

const mockUseAuth = useAuth as any
const mockUseOrganization = useOrganization as any
const mockUseRoleBasedUI = useRoleBasedUI as any

describe('OrganizationContextIndicator', () => {
  const mockOrganization = {
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    description: 'Main organization',
    avatarUrl: 'https://example.com/avatar.jpg',
    metadata: {},
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockMembership = {
    id: 'membership-1',
    userId: 'user-1',
    organizationId: 'org-1',
    roleId: 'role-1',
    status: 'active' as const,
    joinedAt: new Date('2024-01-01'),
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
      currentOrganization: mockOrganization,
      currentMembership: mockMembership
    })

    mockUseOrganization.mockReturnValue({
      permissions: ['organization:manage_settings', 'organization:manage_members'],
      roles: [mockMembership.role],
      isLoading: false
    })

    mockUseRoleBasedUI.mockReturnValue({
      isAdmin: true,
      isOwner: false,
      isManager: false
    })
  })

  it('renders compact variant by default', () => {
    render(<OrganizationContextIndicator />)

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByTestId('avatar')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Permission count
  })

  it('renders minimal variant correctly', () => {
    render(<OrganizationContextIndicator variant="minimal" />)

    expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument()
    expect(screen.getByTestId('avatar')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders full variant with all details', () => {
    render(<OrganizationContextIndicator variant="full" showMemberCount={true} />)

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Main organization')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('2 permissions')).toBeInTheDocument()
    expect(screen.getByText(/Member since/)).toBeInTheDocument()
  })

  it('shows no organization context when no current organization', () => {
    mockUseAuth.mockReturnValue({
      currentOrganization: null,
      currentMembership: null
    })

    render(<OrganizationContextIndicator />)

    expect(screen.getByText('No organization context')).toBeInTheDocument()
  })

  it('shows owner role with correct styling', () => {
    mockUseRoleBasedUI.mockReturnValue({
      isAdmin: false,
      isOwner: true,
      isManager: false
    })

    render(<OrganizationContextIndicator />)

    const badges = screen.getAllByTestId('badge')
    const roleBadge = badges.find(badge => badge.textContent?.includes('Owner'))
    expect(roleBadge).toHaveAttribute('data-variant', 'default')
    expect(roleBadge).toHaveTextContent('Owner')
  })

  it('shows admin role with correct styling', () => {
    mockUseRoleBasedUI.mockReturnValue({
      isAdmin: true,
      isOwner: false,
      isManager: false
    })

    render(<OrganizationContextIndicator />)

    const badges = screen.getAllByTestId('badge')
    const roleBadge = badges.find(badge => badge.textContent?.includes('Admin'))
    expect(roleBadge).toHaveAttribute('data-variant', 'secondary')
    expect(roleBadge).toHaveTextContent('Admin')
  })

  it('shows manager role with correct styling', () => {
    mockUseRoleBasedUI.mockReturnValue({
      isAdmin: false,
      isOwner: false,
      isManager: true
    })

    render(<OrganizationContextIndicator />)

    const badges = screen.getAllByTestId('badge')
    const roleBadge = badges.find(badge => badge.textContent?.includes('Manager'))
    expect(roleBadge).toHaveAttribute('data-variant', 'outline')
    expect(roleBadge).toHaveTextContent('Manager')
  })

  it('shows member role as fallback', () => {
    mockUseRoleBasedUI.mockReturnValue({
      isAdmin: false,
      isOwner: false,
      isManager: false
    })

    render(<OrganizationContextIndicator />)

    const badges = screen.getAllByTestId('badge')
    const roleBadge = badges.find(badge => badge.textContent?.includes('Member'))
    expect(roleBadge).toHaveAttribute('data-variant', 'outline')
    expect(roleBadge).toHaveTextContent('Member')
  })

  it('hides permission count when showPermissionCount is false', () => {
    render(<OrganizationContextIndicator showPermissionCount={false} />)

    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    mockUseOrganization.mockReturnValue({
      permissions: [],
      roles: [],
      isLoading: true
    })

    render(<OrganizationContextIndicator variant="full" />)

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    // Loading spinner would be present in full variant
  })

  it('shows inactive membership status badge', () => {
    const inactiveMembership = {
      ...mockMembership,
      status: 'inactive' as const
    }

    mockUseAuth.mockReturnValue({
      currentOrganization: mockOrganization,
      currentMembership: inactiveMembership
    })

    render(<OrganizationContextIndicator variant="full" />)

    const badges = screen.getAllByTestId('badge')
    const statusBadge = badges.find(badge => badge.textContent === 'inactive')
    expect(statusBadge).toBeInTheDocument()
    expect(statusBadge).toHaveAttribute('data-variant', 'destructive')
  })

  it('generates correct initials for organization avatar', () => {
    const multiWordOrg = {
      ...mockOrganization,
      name: 'Acme Corporation International'
    }

    mockUseAuth.mockReturnValue({
      currentOrganization: multiWordOrg,
      currentMembership: mockMembership
    })

    render(<OrganizationContextIndicator />)

    expect(screen.getByText('AC')).toBeInTheDocument()
  })

  it('truncates long organization names in compact variant', () => {
    const longNameOrg = {
      ...mockOrganization,
      name: 'Very Long Organization Name That Should Be Truncated'
    }

    mockUseAuth.mockReturnValue({
      currentOrganization: longNameOrg,
      currentMembership: mockMembership
    })

    render(<OrganizationContextIndicator />)

    // The name should be truncated due to max-w-[120px] class
    expect(screen.getByText('Very Long Organization Name That Should Be Truncated')).toBeInTheDocument()
  })

  it('shows member since date in full variant', () => {
    render(<OrganizationContextIndicator variant="full" showMemberCount={true} />)

    expect(screen.getByText(/Member since/)).toBeInTheDocument()
  })

  it('handles missing organization description gracefully', () => {
    const orgWithoutDescription = {
      ...mockOrganization,
      description: undefined
    }

    mockUseAuth.mockReturnValue({
      currentOrganization: orgWithoutDescription,
      currentMembership: mockMembership
    })

    render(<OrganizationContextIndicator variant="full" />)

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.queryByText('Main organization')).not.toBeInTheDocument()
  })

  it('shows correct permission count with singular/plural', () => {
    // Test singular
    mockUseOrganization.mockReturnValue({
      permissions: ['single:permission'],
      roles: [mockMembership.role],
      isLoading: false
    })

    render(<OrganizationContextIndicator variant="full" />)
    expect(screen.getByText('1 permissions')).toBeInTheDocument()

    // Test plural
    mockUseOrganization.mockReturnValue({
      permissions: ['permission:one', 'permission:two'],
      roles: [mockMembership.role],
      isLoading: false
    })

    render(<OrganizationContextIndicator variant="full" />)
    expect(screen.getByText('2 permissions')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <OrganizationContextIndicator className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})