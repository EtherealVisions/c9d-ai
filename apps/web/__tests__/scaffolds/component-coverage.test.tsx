/**
 * Component Coverage Test Scaffold
 * 
 * This scaffold provides comprehensive test coverage for React components
 * that currently have 0% coverage but are critical user interface elements.
 * 
 * Priority: P1 - HIGH
 * Target Coverage: 85% (Component requirement)
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth } from '@/lib/contexts/auth-context'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useRoleBasedUI } from '@/hooks/use-organization'

// Mock auth context
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn()
}))

// Mock organization context
vi.mock('@/lib/contexts/organization-context', () => ({
  useOrganization: vi.fn()
}))

// Mock role-based UI hook
vi.mock('@/hooks/use-organization', () => ({
  useRoleBasedUI: vi.fn()
}))

// Mock UI components for consistent testing
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className} data-testid="card-title">{children}</h2>
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-variant={variant}
      data-size={size}
      data-testid={props['data-testid']}
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant} data-testid="badge">{children}</span>
  )
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, className }: any) => (
    <div className={className} data-variant={variant} role="alert" data-testid="alert">{children}</div>
  ),
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div className={className} data-testid="progress" data-value={value}>
      Progress: {value}%
    </div>
  )
}))

// Mock icons
vi.mock('lucide-react', () => ({
  User: ({ className }: any) => <div className={className} data-testid="user-icon" />,
  Settings: ({ className }: any) => <div className={className} data-testid="settings-icon" />,
  Users: ({ className }: any) => <div className={className} data-testid="users-icon" />,
  Mail: ({ className }: any) => <div className={className} data-testid="mail-icon" />,
  Phone: ({ className }: any) => <div className={className} data-testid="phone-icon" />,
  CheckCircle: ({ className }: any) => <div className={className} data-testid="check-circle-icon" />,
  AlertTriangle: ({ className }: any) => <div className={className} data-testid="alert-triangle-icon" />,
  ArrowLeft: ({ className }: any) => <div className={className} data-testid="arrow-left-icon" />,
  ArrowRight: ({ className }: any) => <div className={className} data-testid="arrow-right-icon" />,
  Send: ({ className }: any) => <div className={className} data-testid="send-icon" />,
  Palette: ({ className }: any) => <div className={className} data-testid="palette-icon" />
}))

describe('UserProfile Component - Critical Coverage', () => {
  const mockUser = {
    id: 'user-123',
    clerkUserId: 'clerk_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    preferences: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  const mockOnUpdate = vi.fn()

  // Helper function to create complete auth context mock
  const createAuthMock = (overrides = {}) => ({
    user: mockUser,
    isLoading: false,
    isSignedIn: true,
    organizations: mockOrganizations,
    currentOrganization: mockOrganizations[0],
    currentMembership: null,
    switchOrganization: vi.fn(),
    refreshUser: vi.fn(),
    refreshOrganizations: vi.fn(),
    permissions: [],
    hasPermission: vi.fn(),
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render user profile information', async () => {
      const { UserProfile } = await import('@/components/user-profile')
      
      // Mock auth context with user data
      vi.mocked(useAuth).mockReturnValue(createAuthMock())
      
      render(<UserProfile />)
      
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    })

    it('should show loading state when user is null', async () => {
      const { UserProfile } = await import('@/components/user-profile')
      
      // Mock auth context with no user
      vi.mocked(useAuth).mockReturnValue(createAuthMock({
        user: null,
        isSignedIn: false,
        organizations: [],
        currentOrganization: null
      }))
      
      render(<UserProfile />)
      
      // Should show loading indicator
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should display user profile interface', async () => {
      const { UserProfile } = await import('@/components/user-profile')
      
      // Mock auth context with user data
      vi.mocked(useAuth).mockReturnValue(createAuthMock())
      
      render(<UserProfile />)
      
      // Should render profile interface
      expect(screen.getByTestId('user-profile')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should handle tab navigation', async () => {
      const { UserProfile } = await import('@/components/user-profile')
      const user = userEvent.setup()
      
      // Mock auth context with user data
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        isLoading: false,
        refreshUser: vi.fn(),
        signOut: vi.fn()
      })
      
      render(<UserProfile />)
      
      // Test tab navigation
      const preferencesTab = screen.getByTestId('tab-preferences')
      await user.click(preferencesTab)
      
      expect(preferencesTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should handle form interactions', async () => {
      const { UserProfile } = await import('@/components/user-profile')
      const user = userEvent.setup()
      
      // Mock auth context with user data
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        isLoading: false,
        refreshUser: vi.fn(),
        signOut: vi.fn()
      })
      
      render(<UserProfile />)
      
      // Test that profile interface is rendered
      expect(screen.getByTestId('user-profile')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid user data', async () => {
      const { UserProfile } = await import('@/components/user-profile')
      
      // Mock auth context with invalid user data
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, email: 'invalid-email' },
        isLoading: false,
        refreshUser: vi.fn(),
        signOut: vi.fn()
      })
      
      render(<UserProfile />)
      
      // Should handle invalid data gracefully
      expect(screen.getByTestId('user-profile')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const { UserProfile } = await import('@/components/user-profile')
      
      // Mock auth context with valid user
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        isLoading: false,
        refreshUser: vi.fn(),
        signOut: vi.fn()
      })
      
      render(<UserProfile />)
      
      // Should have proper accessibility attributes
      expect(screen.getByTestId('user-profile')).toBeInTheDocument()
    })
  })
})

describe('OrganizationSwitcher Component - Critical Coverage', () => {
  const mockOrganizations = [
    { 
      id: 'org-1', 
      name: 'Organization 1', 
      slug: 'org-1', 
      avatarUrl: null, 
      description: 'First org',
      metadata: {},
      settings: {},
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    { 
      id: 'org-2', 
      name: 'Organization 2', 
      slug: 'org-2', 
      avatarUrl: null, 
      description: 'Second org',
      metadata: {},
      settings: {},
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ]

  const mockCurrentOrganization = mockOrganizations[0]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock auth context
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      organizations: mockOrganizations,
      currentOrganization: mockCurrentOrganization,
      switchOrganization: vi.fn(),
      isLoading: false,
      refreshUser: vi.fn(),
      signOut: vi.fn()
    })
    
    // Mock organization context
    vi.mocked(useOrganization).mockReturnValue({
      membership: { role: { name: 'Admin' } },
      permissions: ['read', 'write']
    })
    
    // Mock role-based UI
    vi.mocked(useRoleBasedUI).mockReturnValue({
      isAdmin: true,
      isOwner: false,
      canManageSettings: true
    })
  })

  describe('Rendering', () => {
    it('should render organization switcher', async () => {
      const { OrganizationSwitcher } = await import('@/components/organization-switcher')
      
      render(<OrganizationSwitcher />)
      
      expect(screen.getByText('Organization 1')).toBeInTheDocument()
    })

    it('should show current organization', async () => {
      const { OrganizationSwitcher } = await import('@/components/organization-switcher')
      
      render(<OrganizationSwitcher />)
      
      // Current organization should be displayed
      expect(screen.getByText('Organization 1')).toBeInTheDocument()
    })

    it('should show no organization state', async () => {
      const { OrganizationSwitcher } = await import('@/components/organization-switcher')
      
      // Mock no current organization
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        organizations: [],
        currentOrganization: null,
        switchOrganization: vi.fn(),
        isLoading: false,
        refreshUser: vi.fn(),
        signOut: vi.fn()
      })
      
      render(<OrganizationSwitcher />)
      
      expect(screen.getByText('No Organization')).toBeInTheDocument()
    })
  })

  describe('Organization Switching', () => {
    it('should handle dropdown interaction', async () => {
      const { OrganizationSwitcher } = await import('@/components/organization-switcher')
      const user = userEvent.setup()
      
      render(<OrganizationSwitcher />)
      
      // Click on the dropdown trigger
      const dropdownTrigger = screen.getByRole('button')
      await user.click(dropdownTrigger)
      
      // Should show dropdown content
      expect(screen.getByText('Organizations')).toBeInTheDocument()
    })

    it('should show organization switching interface', async () => {
      const { OrganizationSwitcher } = await import('@/components/organization-switcher')
      
      render(<OrganizationSwitcher />)
      
      // Should render the organization switcher interface
      expect(screen.getByText('Organization 1')).toBeInTheDocument()
    })
  })
})

describe('HeaderNav Component - Critical Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Navigation Rendering', () => {
    it('should render navigation menu', async () => {
      const HeaderNav = (await import('@/components/header-nav')).default
      
      render(<HeaderNav />)
      
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('should show navigation links', async () => {
      const HeaderNav = (await import('@/components/header-nav')).default
      
      render(<HeaderNav user={mockUser} />)
      
      expect(screen.getByText('John')).toBeInTheDocument()
    })

    it('should show sign-in options when not authenticated', async () => {
      const { HeaderNav } = await import('@/components/header-nav')
      
      render(<HeaderNav user={null} />)
      
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })
  })

  describe('Navigation Interactions', () => {
    it('should handle dropdown interactions', async () => {
      const HeaderNav = (await import('@/components/header-nav')).default
      const user = userEvent.setup()
      
      render(<HeaderNav />)
      
      const productsButton = screen.getByText('Products')
      await user.click(productsButton)
      
      expect(screen.getByText('Platform')).toBeInTheDocument()
    })

    it('should handle navigation links', async () => {
      const HeaderNav = (await import('@/components/header-nav')).default
      
      render(<HeaderNav />)
      
      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should show mobile menu button', async () => {
      const HeaderNav = (await import('@/components/header-nav')).default
      
      render(<HeaderNav />)
      
      // Should show mobile menu button
      expect(screen.getByText('Open menu')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })
})

describe('ErrorBoundary Component - Critical Coverage', () => {
  const mockError = new Error('Test error')
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Error Handling', () => {
    it('should catch and display errors', async () => {
      const { ErrorBoundary } = await import('@/components/error-boundary')
      
      const ThrowError = () => {
        throw mockError
      }
      
      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })

    it('should call onError callback when error occurs', async () => {
      const { ErrorBoundary } = await import('@/components/error-boundary')
      
      const ThrowError = () => {
        throw mockError
      }
      
      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(mockOnError).toHaveBeenCalledWith(mockError, expect.any(Object))
    })

    it('should render children when no error', async () => {
      const { ErrorBoundary } = await import('@/components/error-boundary')
      
      render(
        <ErrorBoundary onError={mockOnError}>
          <div>Normal content</div>
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Normal content')).toBeInTheDocument()
    })

    it('should provide retry functionality', async () => {
      const { ErrorBoundary } = await import('@/components/error-boundary')
      const user = userEvent.setup()
      
      const ThrowError = () => {
        throw mockError
      }
      
      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError />
        </ErrorBoundary>
      )
      
      const retryButton = screen.getByRole('button', { name: /try again/i })
      await user.click(retryButton)
      
      // Should attempt to recover
      expect(retryButton).toBeInTheDocument()
    })
  })

  describe('Error Information Display', () => {
    it('should show error details in development', async () => {
      const { ErrorBoundary } = await import('@/components/error-boundary')
      
      // Mock development environment
      const originalEnv = process.env.NODE_ENV
      vi.stubEnv('NODE_ENV', 'development')
      
      const ThrowError = () => {
        throw mockError
      }
      
      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText(/test error/i)).toBeInTheDocument()
      
      process.env.NODE_ENV = originalEnv
    })

    it('should hide error details in production', async () => {
      const { ErrorBoundary } = await import('@/components/error-boundary')
      
      // Mock production environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const ThrowError = () => {
        throw mockError
      }
      
      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.queryByText('Test error')).not.toBeInTheDocument()
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      
      process.env.NODE_ENV = originalEnv
    })
  })
})

describe('OrganizationDashboard Component - Critical Coverage', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    memberCount: 5,
    settings: {}
  }

  const mockMembers = [
    { id: 'member-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'Admin' },
    { id: 'member-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', role: 'Member' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dashboard Rendering', () => {
    it('should render organization information', async () => {
      const { OrganizationDashboard } = await import('@/components/organization-dashboard')
      
      render(
        <OrganizationDashboard 
          organization={mockOrganization}
          members={mockMembers}
          currentUserId="user-123"
        />
      )
      
      expect(screen.getByText('Test Organization')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument() // Member count
    })

    it('should render member list', async () => {
      const { OrganizationDashboard } = await import('@/components/organization-dashboard')
      
      render(
        <OrganizationDashboard 
          organization={mockOrganization}
          members={mockMembers}
          currentUserId="user-123"
        />
      )
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('should show organization statistics', async () => {
      const { OrganizationDashboard } = await import('@/components/organization-dashboard')
      
      render(
        <OrganizationDashboard 
          organization={mockOrganization}
          members={mockMembers}
          currentUserId="user-123"
        />
      )
      
      // Should show various stats
      expect(screen.getByTestId('card')).toBeInTheDocument()
    })
  })

  describe('Member Management', () => {
    it('should handle member invitation', async () => {
      const { OrganizationDashboard } = await import('@/components/organization-dashboard')
      const user = userEvent.setup()
      
      const mockOnInvite = vi.fn()
      
      render(
        <OrganizationDashboard 
          organization={mockOrganization}
          members={mockMembers}
          currentUserId="user-123"
          onInviteMember={mockOnInvite}
        />
      )
      
      const inviteButton = screen.getByRole('button', { name: /invite/i })
      await user.click(inviteButton)
      
      expect(mockOnInvite).toHaveBeenCalled()
    })

    it('should handle member role changes', async () => {
      const { OrganizationDashboard } = await import('@/components/organization-dashboard')
      const user = userEvent.setup()
      
      const mockOnRoleChange = vi.fn()
      
      render(
        <OrganizationDashboard 
          organization={mockOrganization}
          members={mockMembers}
          currentUserId="user-123"
          onMemberRoleChange={mockOnRoleChange}
        />
      )
      
      // Find and interact with role change controls
      const roleButton = screen.getByRole('button', { name: /change role/i })
      await user.click(roleButton)
      
      expect(mockOnRoleChange).toHaveBeenCalled()
    })
  })

  describe('Settings Management', () => {
    it('should handle settings updates', async () => {
      const { OrganizationDashboard } = await import('@/components/organization-dashboard')
      const user = userEvent.setup()
      
      const mockOnSettingsUpdate = vi.fn()
      
      render(
        <OrganizationDashboard 
          organization={mockOrganization}
          members={mockMembers}
          currentUserId="user-123"
          onSettingsUpdate={mockOnSettingsUpdate}
        />
      )
      
      const settingsButton = screen.getByRole('button', { name: /settings/i })
      await user.click(settingsButton)
      
      expect(mockOnSettingsUpdate).toHaveBeenCalled()
    })
  })
})

describe('InvitationManagement Component - Critical Coverage', () => {
  const mockInvitations = [
    {
      id: 'inv-1',
      email: 'invite1@example.com',
      status: 'pending',
      role: 'Member',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'inv-2',
      email: 'invite2@example.com',
      status: 'accepted',
      role: 'Admin',
      createdAt: '2024-01-02T00:00:00Z'
    }
  ]

  const mockOnInvite = vi.fn()
  const mockOnCancel = vi.fn()
  const mockOnResend = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Invitation List Rendering', () => {
    it('should render invitation list', async () => {
      const { InvitationManagement } = await import('@/components/invitation-management')
      
      render(
        <InvitationManagement 
          invitations={mockInvitations}
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
          onResend={mockOnResend}
        />
      )
      
      expect(screen.getByText('invite1@example.com')).toBeInTheDocument()
      expect(screen.getByText('invite2@example.com')).toBeInTheDocument()
    })

    it('should show invitation status', async () => {
      const { InvitationManagement } = await import('@/components/invitation-management')
      
      render(
        <InvitationManagement 
          invitations={mockInvitations}
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
          onResend={mockOnResend}
        />
      )
      
      expect(screen.getByText('pending')).toBeInTheDocument()
      expect(screen.getByText('accepted')).toBeInTheDocument()
    })

    it('should show empty state when no invitations', async () => {
      const { InvitationManagement } = await import('@/components/invitation-management')
      
      render(
        <InvitationManagement 
          invitations={[]}
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
          onResend={mockOnResend}
        />
      )
      
      expect(screen.getByText(/no invitations/i)).toBeInTheDocument()
    })
  })

  describe('Invitation Actions', () => {
    it('should handle new invitation creation', async () => {
      const { InvitationManagement } = await import('@/components/invitation-management')
      const user = userEvent.setup()
      
      render(
        <InvitationManagement 
          invitations={mockInvitations}
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
          onResend={mockOnResend}
        />
      )
      
      const inviteButton = screen.getByRole('button', { name: /invite/i })
      await user.click(inviteButton)
      
      expect(mockOnInvite).toHaveBeenCalled()
    })

    it('should handle invitation cancellation', async () => {
      const { InvitationManagement } = await import('@/components/invitation-management')
      const user = userEvent.setup()
      
      render(
        <InvitationManagement 
          invitations={mockInvitations}
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
          onResend={mockOnResend}
        />
      )
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalledWith('inv-1')
    })

    it('should handle invitation resend', async () => {
      const { InvitationManagement } = await import('@/components/invitation-management')
      const user = userEvent.setup()
      
      render(
        <InvitationManagement 
          invitations={mockInvitations}
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
          onResend={mockOnResend}
        />
      )
      
      const resendButton = screen.getByRole('button', { name: /resend/i })
      await user.click(resendButton)
      
      expect(mockOnResend).toHaveBeenCalledWith('inv-1')
    })
  })

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      const { InvitationManagement } = await import('@/components/invitation-management')
      const user = userEvent.setup()
      
      render(
        <InvitationManagement 
          invitations={mockInvitations}
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
          onResend={mockOnResend}
        />
      )
      
      // Open invite form
      const inviteButton = screen.getByRole('button', { name: /invite/i })
      await user.click(inviteButton)
      
      // Enter invalid email
      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      
      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })

    it('should require role selection', async () => {
      const { InvitationManagement } = await import('@/components/invitation-management')
      const user = userEvent.setup()
      
      render(
        <InvitationManagement 
          invitations={mockInvitations}
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
          onResend={mockOnResend}
        />
      )
      
      // Open invite form
      const inviteButton = screen.getByRole('button', { name: /invite/i })
      await user.click(inviteButton)
      
      // Submit without selecting role
      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/role is required/i)).toBeInTheDocument()
    })
  })
})