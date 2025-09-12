import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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

// Mock UserProfile component with more realistic behavior
vi.mock('@/components/user-profile', () => ({
  UserProfile: ({ className }: { className?: string }) => {
    const [activeTab, setActiveTab] = React.useState('profile')
    
    return (
      <div data-testid="user-profile" className={className}>
        <div role="tablist">
          <button 
            role="tab" 
            onClick={() => setActiveTab('profile')}
            aria-selected={activeTab === 'profile'}
          >
            Profile
          </button>
          <button 
            role="tab" 
            onClick={() => setActiveTab('preferences')}
            aria-selected={activeTab === 'preferences'}
          >
            Preferences
          </button>
        </div>
        <div role="tabpanel">
          {activeTab === 'profile' && <div>Profile Content</div>}
          {activeTab === 'preferences' && <div>Preferences Content</div>}
        </div>
      </div>
    )
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

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

describe('Account Settings Integration', () => {
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
    mockFetch.mockClear()
    mockPush.mockClear()
    mockBack.mockClear()
  })

  it('renders complete account settings page with user profile', () => {
    render(<AccountSettingsClient />)
    
    // Check page structure
    expect(screen.getByText('Account Settings')).toBeInTheDocument()
    expect(screen.getByText('Manage your account information, preferences, and security settings.')).toBeInTheDocument()
    
    // Check back button
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    
    // Check user profile component is rendered
    expect(screen.getByTestId('user-profile')).toBeInTheDocument()
    expect(screen.getByText('Profile Content')).toBeInTheDocument()
  })

  it('allows navigation between profile tabs', async () => {
    const user = userEvent.setup()
    render(<AccountSettingsClient />)
    
    // Initially shows profile content
    expect(screen.getByText('Profile Content')).toBeInTheDocument()
    expect(screen.queryByText('Preferences Content')).not.toBeInTheDocument()
    
    // Click preferences tab
    await user.click(screen.getByRole('tab', { name: /preferences/i }))
    
    // Should show preferences content
    await waitFor(() => {
      expect(screen.getByText('Preferences Content')).toBeInTheDocument()
    })
    expect(screen.queryByText('Profile Content')).not.toBeInTheDocument()
  })

  it('handles back navigation', async () => {
    const user = userEvent.setup()
    render(<AccountSettingsClient />)
    
    const backButton = screen.getByRole('button', { name: /back/i })
    await user.click(backButton)
    
    expect(mockBack).toHaveBeenCalled()
  })

  it('applies correct styling to user profile component', () => {
    render(<AccountSettingsClient />)
    
    const userProfile = screen.getByTestId('user-profile')
    expect(userProfile).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'border', 'p-6')
  })

  it('shows loading state during authentication', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthContext,
      isLoading: true,
    })

    render(<AccountSettingsClient />)
    
    expect(screen.getByText('Loading account settings...')).toBeInTheDocument()
    expect(screen.queryByText('Account Settings')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users to sign-in', async () => {
    const user = userEvent.setup()
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthContext,
      user: null,
      isSignedIn: false,
    })

    render(<AccountSettingsClient />)
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    
    const signInButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(signInButton)
    
    expect(mockPush).toHaveBeenCalledWith('/sign-in')
  })
})