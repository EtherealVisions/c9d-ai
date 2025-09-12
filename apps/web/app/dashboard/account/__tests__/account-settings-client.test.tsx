import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useRouter } from 'next/navigation'
import AccountSettingsClient from '../account-settings-client'
import { useAuth } from '@/lib/contexts/auth-context'

// Mock the auth context
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock UserProfile component
vi.mock('@/components/user-profile', () => ({
  UserProfile: ({ className }: { className?: string }) => (
    <div data-testid="user-profile" className={className}>
      Mocked UserProfile Component
    </div>
  ),
}))

const mockPush = vi.fn()
const mockBack = vi.fn()

const mockUser = {
  id: 'user-1',
  clerkUserId: 'clerk-user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  avatarUrl: 'https://example.com/avatar.jpg',
  preferences: {},
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockAuthContext = {
  user: mockUser,
  refreshUser: vi.fn(),
  isLoading: false,
  isSignedIn: true,
  organizations: [],
  currentOrganization: null,
  currentMembership: null,
  switchOrganization: vi.fn(),
  refreshOrganizations: vi.fn(),
  permissions: [],
  hasPermission: vi.fn(),
}

describe('AccountSettingsClient', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockAuthContext)
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: mockBack,
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    })
    mockPush.mockClear()
    mockBack.mockClear()
  })

  describe('Loading States', () => {
    it('shows loading state when auth is loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        isLoading: true,
      })

      render(<AccountSettingsClient />)
      
      expect(screen.getByText('Loading account settings...')).toBeInTheDocument()
    })

    it('shows access denied when user is not authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        user: null,
        isSignedIn: false,
      })

      render(<AccountSettingsClient />)
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('Please sign in to access your account settings.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('redirects to sign-in when sign in button is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        user: null,
        isSignedIn: false,
      })

      render(<AccountSettingsClient />)
      
      const signInButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(signInButton)
      
      expect(mockPush).toHaveBeenCalledWith('/sign-in')
    })
  })

  describe('Authenticated State', () => {
    it('renders account settings page when user is authenticated', () => {
      render(<AccountSettingsClient />)
      
      expect(screen.getByText('Account Settings')).toBeInTheDocument()
      expect(screen.getByText('Manage your account information, preferences, and security settings.')).toBeInTheDocument()
      expect(screen.getByTestId('user-profile')).toBeInTheDocument()
    })

    it('shows back button and handles navigation', async () => {
      const user = userEvent.setup()
      render(<AccountSettingsClient />)
      
      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton).toBeInTheDocument()
      
      await user.click(backButton)
      expect(mockBack).toHaveBeenCalled()
    })

    it('applies correct styling classes', () => {
      render(<AccountSettingsClient />)
      
      const userProfile = screen.getByTestId('user-profile')
      expect(userProfile).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'border', 'p-6')
    })
  })

  describe('Page Structure', () => {
    it('has proper page layout structure', () => {
      render(<AccountSettingsClient />)
      
      // Check for main container
      const mainContainer = screen.getByText('Account Settings').closest('.mx-auto')
      expect(mainContainer).toHaveClass('max-w-4xl', 'px-4', 'py-8', 'sm:px-6', 'lg:px-8')
      
      // Check for background
      const backgroundDiv = screen.getByText('Account Settings').closest('.min-h-screen')
      expect(backgroundDiv).toHaveClass('bg-gray-50')
    })

    it('has proper header structure', () => {
      render(<AccountSettingsClient />)
      
      expect(screen.getByRole('heading', { level: 1, name: 'Account Settings' })).toBeInTheDocument()
      expect(screen.getByText('Manage your account information, preferences, and security settings.')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<AccountSettingsClient />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Account Settings')
    })

    it('has accessible back button', () => {
      render(<AccountSettingsClient />)
      
      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton).toBeInTheDocument()
    })

    it('provides descriptive text for the page purpose', () => {
      render(<AccountSettingsClient />)
      
      expect(screen.getByText('Manage your account information, preferences, and security settings.')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive padding classes', () => {
      render(<AccountSettingsClient />)
      
      const container = screen.getByText('Account Settings').closest('.mx-auto')
      expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8')
    })

    it('applies responsive max-width', () => {
      render(<AccountSettingsClient />)
      
      const container = screen.getByText('Account Settings').closest('.mx-auto')
      expect(container).toHaveClass('max-w-4xl')
    })
  })

  describe('Error Handling', () => {
    it('handles missing user gracefully', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        user: null,
        isLoading: false,
      })

      render(<AccountSettingsClient />)
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.queryByTestId('user-profile')).not.toBeInTheDocument()
    })

    it('handles auth loading state', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        isLoading: true,
      })

      render(<AccountSettingsClient />)
      
      expect(screen.getByText('Loading account settings...')).toBeInTheDocument()
      expect(screen.queryByText('Account Settings')).not.toBeInTheDocument()
    })
  })

  describe('Integration', () => {
    it('passes correct props to UserProfile component', () => {
      render(<AccountSettingsClient />)
      
      const userProfile = screen.getByTestId('user-profile')
      expect(userProfile).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'border', 'p-6')
    })

    it('renders UserProfile component when user is authenticated', () => {
      render(<AccountSettingsClient />)
      
      expect(screen.getByTestId('user-profile')).toBeInTheDocument()
      expect(screen.getByText('Mocked UserProfile Component')).toBeInTheDocument()
    })
  })
})