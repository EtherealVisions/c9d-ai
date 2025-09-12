import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { UserProfile } from '../user-profile'
import { useAuth } from '@/lib/contexts/auth-context'

// Mock the auth context
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock user data
const mockUser = {
  id: 'user-1',
  clerkUserId: 'clerk-user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  avatarUrl: 'https://example.com/avatar.jpg',
  preferences: {
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      marketing: false,
    },
    dashboard: {
      defaultView: 'overview',
      itemsPerPage: 10,
    },
  },
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

describe('UserProfile - Basic Functionality', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockAuthContext)
    mockFetch.mockClear()
    mockAuthContext.refreshUser.mockClear()
  })

  it('renders user profile component', () => {
    render(<UserProfile />)
    
    expect(screen.getByText('Profile Information')).toBeInTheDocument()
    expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
  })

  it('shows loading state when user is null', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthContext,
      user: null,
    })

    render(<UserProfile />)
    
    expect(screen.getByText('Loading user profile...')).toBeInTheDocument()
  })

  it('switches between tabs', async () => {
    const user = userEvent.setup()
    render(<UserProfile />)
    
    // Initially on profile tab
    expect(screen.getByText('Profile Information')).toBeInTheDocument()
    
    // Click preferences tab
    await user.click(screen.getByRole('tab', { name: /preferences/i }))
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    
    // Click security tab
    await user.click(screen.getByRole('tab', { name: /security/i }))
    expect(screen.getByText('Security Settings')).toBeInTheDocument()
  })

  it('submits profile form successfully', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { ...mockUser, firstName: 'Jane' } }),
    })

    render(<UserProfile />)
    
    const firstNameInput = screen.getByDisplayValue('John')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Jane')
    
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      })
    })
    
    expect(mockAuthContext.refreshUser).toHaveBeenCalled()
  })

  it('has proper accessibility attributes', () => {
    render(<UserProfile />)
    
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    expect(screen.getByRole('tabpanel')).toBeInTheDocument()
  })
})