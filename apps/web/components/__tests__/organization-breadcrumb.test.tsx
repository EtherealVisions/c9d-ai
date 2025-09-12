import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { OrganizationBreadcrumb } from '../organization-breadcrumb'
import { useAuth } from '@/lib/contexts/auth-context'
import { useRoleBasedUI } from '@/hooks/use-organization'

// Mock Next.js router
const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname()
}))

// Mock the contexts and hooks
vi.mock('@/lib/contexts/auth-context')
vi.mock('@/hooks/use-organization')

// Mock UI components
vi.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ children, className }: any) => <nav data-testid="breadcrumb" className={className}>{children}</nav>,
  BreadcrumbList: ({ children }: any) => <ol data-testid="breadcrumb-list">{children}</ol>,
  BreadcrumbItem: ({ children }: any) => <li data-testid="breadcrumb-item">{children}</li>,
  BreadcrumbLink: ({ children, asChild }: any) => (
    <div data-testid="breadcrumb-link">{children}</div>
  ),
  BreadcrumbPage: ({ children }: any) => (
    <span data-testid="breadcrumb-page">{children}</span>
  ),
  BreadcrumbSeparator: () => <div data-testid="breadcrumb-separator" />
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarImage: ({ src }: any) => <img data-testid="avatar-image" src={src} alt="" />,
  AvatarFallback: ({ children }: any) => <div data-testid="avatar-fallback">{children}</div>
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => (
    <a data-testid="link" href={href}>{children}</a>
  )
}))

const mockUseAuth = useAuth as any
const mockUseRoleBasedUI = useRoleBasedUI as any

describe('OrganizationBreadcrumb', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuth.mockReturnValue({
      currentOrganization: mockOrganization
    })

    mockUseRoleBasedUI.mockReturnValue({
      canManageSettings: true,
      canManageMembers: true,
      canViewAuditLogs: true
    })

    mockUsePathname.mockReturnValue('/dashboard')
  })

  it('renders nothing when only one breadcrumb item', () => {
    mockUsePathname.mockReturnValue('/dashboard')

    const { container } = render(<OrganizationBreadcrumb />)

    // Dashboard alone should still render since it's the base path
    expect(container.firstChild).not.toBeNull()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders dashboard and organization breadcrumbs', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders account settings breadcrumb', () => {
    mockUsePathname.mockReturnValue('/dashboard/account')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Account Settings')).toBeInTheDocument()
  })

  it('renders organization settings breadcrumb when user can manage settings', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1/settings')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does not render organization settings when user cannot manage settings', () => {
    mockUseRoleBasedUI.mockReturnValue({
      canManageSettings: false,
      canManageMembers: true,
      canViewAuditLogs: true
    })

    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1/settings')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders members breadcrumb when user can manage members', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1/members')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
  })

  it('renders roles breadcrumb when user can manage members', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1/roles')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Roles & Permissions')).toBeInTheDocument()
  })

  it('renders audit logs breadcrumb when user can view audit logs', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1/audit')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Audit Logs')).toBeInTheDocument()
  })

  it('renders agents breadcrumb', () => {
    mockUsePathname.mockReturnValue('/dashboard/agents')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
  })

  it('renders create agent breadcrumb', () => {
    mockUsePathname.mockReturnValue('/dashboard/agents/create')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
    expect(screen.getByText('Create Agent')).toBeInTheDocument()
  })

  it('renders agent details breadcrumb', () => {
    mockUsePathname.mockReturnValue('/dashboard/agents/123e4567-e89b-12d3-a456-426614174000')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
    expect(screen.getByText('Agent Details')).toBeInTheDocument()
  })

  it('renders datasets breadcrumb', () => {
    mockUsePathname.mockReturnValue('/dashboard/datasets')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Datasets')).toBeInTheDocument()
  })

  it('renders create dataset breadcrumb', () => {
    mockUsePathname.mockReturnValue('/dashboard/datasets/create')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Datasets')).toBeInTheDocument()
    expect(screen.getByText('Create Dataset')).toBeInTheDocument()
  })

  it('renders dataset details breadcrumb', () => {
    mockUsePathname.mockReturnValue('/dashboard/datasets/123e4567-e89b-12d3-a456-426614174000')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Datasets')).toBeInTheDocument()
    expect(screen.getByText('Dataset Details')).toBeInTheDocument()
  })

  it('shows organization avatar when showOrganizationIcon is true', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1')

    render(<OrganizationBreadcrumb showOrganizationIcon={true} />)

    expect(screen.getByTestId('avatar')).toBeInTheDocument()
    expect(screen.getByText('AC')).toBeInTheDocument() // Initials
  })

  it('hides organization avatar when showOrganizationIcon is false', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1')

    render(<OrganizationBreadcrumb showOrganizationIcon={false} />)

    expect(screen.queryByTestId('avatar')).not.toBeInTheDocument()
  })

  it('limits breadcrumb items when maxItems is specified', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1/settings')

    render(<OrganizationBreadcrumb maxItems={3} />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    // With 3 items, no ellipsis should be shown
  })

  it('generates correct initials for organization avatar', () => {
    const multiWordOrg = {
      ...mockOrganization,
      name: 'Acme Corporation International'
    }

    mockUseAuth.mockReturnValue({
      currentOrganization: multiWordOrg
    })

    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('AC')).toBeInTheDocument()
  })

  it('handles organization overview correctly', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    
    // Organization should be marked as current page
    const breadcrumbPages = screen.getAllByTestId('breadcrumb-page')
    const orgPage = breadcrumbPages.find(page => page.textContent?.includes('Acme Corp'))
    expect(orgPage).toBeInTheDocument()
  })

  it('renders separators between breadcrumb items', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1/settings')

    render(<OrganizationBreadcrumb />)

    const separators = screen.getAllByTestId('breadcrumb-separator')
    expect(separators.length).toBeGreaterThan(0)
  })

  it('handles no current organization gracefully', () => {
    mockUseAuth.mockReturnValue({
      currentOrganization: null
    })

    mockUsePathname.mockReturnValue('/dashboard/account')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Account Settings')).toBeInTheDocument()
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    mockUsePathname.mockReturnValue('/dashboard/account')

    const { container } = render(
      <OrganizationBreadcrumb className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles complex nested paths correctly', () => {
    mockUsePathname.mockReturnValue('/dashboard/organizations/org-1/settings/billing')

    render(<OrganizationBreadcrumb />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })
})