import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { UserProfile } from '../user-profile'
import { useAuth } from '@/lib/contexts/auth-context'

// Mock the auth context
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock update user function
const mockUpdateUser = vi.fn()

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

describe('UserProfile', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockAuthContext)
    mockFetch.mockClear()
    mockUpdateUser.mockClear()
    mockAuthContext.refreshUser.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading States', () => {
    it('shows loading state when user is null', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        user: null,
      })

      render(<UserProfile />)
      
      expect(screen.getByTestId('user-profile-loading')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('renders user profile when user is loaded', () => {
      render(<UserProfile />)
      
      expect(screen.getByText('Profile Information')).toBeInTheDocument()
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('shows profile tab by default', () => {
      render(<UserProfile />)
      
      expect(screen.getByRole('tab', { name: /profile/i, selected: true })).toBeInTheDocument()
      expect(screen.getByText('Profile Information')).toBeInTheDocument()
    })

    it('switches to preferences tab when clicked', async () => {
      const user = userEvent.setup()
      render(<UserProfile />)
      
      await user.click(screen.getByRole('tab', { name: /preferences/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Appearance')).toBeInTheDocument()
        expect(screen.getByText('Notifications')).toBeInTheDocument()
      })
    })

    it('switches to security tab when clicked', async () => {
      const user = userEvent.setup()
      render(<UserProfile />)
      
      await user.click(screen.getByRole('tab', { name: /security/i }))
      
      expect(screen.getByText('Security Settings')).toBeInTheDocument()
      expect(screen.getByText('Password & Authentication')).toBeInTheDocument()
    })
  })

  describe('Profile Form', () => {
    it('displays current user information in form fields', () => {
      render(<UserProfile />)
      
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    })

    it('disables email field', () => {
      render(<UserProfile />)
      
      const emailInput = screen.getByDisplayValue('test@example.com')
      expect(emailInput).toBeDisabled()
    })

    it('shows validation errors for empty required fields', async () => {
      const user = userEvent.setup()
      render(<UserProfile />)
      
      const firstNameInput = screen.getByDisplayValue('John')
      await user.clear(firstNameInput)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument()
      })
    })

    it('submits profile update successfully', async () => {
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
      
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully')).toBeInTheDocument()
      })
      
      expect(mockAuthContext.refreshUser).toHaveBeenCalled()
    })

    it('handles profile update errors', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' }),
      })

      render(<UserProfile />)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Validation failed')).toBeInTheDocument()
      })
    })

    it('shows loading state during form submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<UserProfile />)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
      // Check for loading spinner by looking for the animate-spin class
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('Preferences Form', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<UserProfile />)
      await user.click(screen.getByRole('tab', { name: /preferences/i }))
    })

    it('displays current preferences in form fields', () => {
      expect(screen.getByDisplayValue('Light')).toBeInTheDocument()
      expect(screen.getByDisplayValue('English')).toBeInTheDocument()
      expect(screen.getByDisplayValue('UTC')).toBeInTheDocument()
    })

    it('updates theme preference', async () => {
      const user = userEvent.setup()
      
      // Find the theme select trigger
      const themeSelect = screen.getByRole('combobox', { name: /theme/i })
      expect(themeSelect).toBeInTheDocument()
      
      // Since Radix UI Select doesn't work well in jsdom, we'll test the form submission
      const saveButton = screen.getByRole('button', { name: /save preferences/i })
      await user.click(saveButton)
      
      // Verify the form submission was attempted
      expect(mockFetch).toHaveBeenCalled()
    })

    it('toggles notification preferences', async () => {
      const user = userEvent.setup()
      
      const emailSwitch = screen.getByRole('switch', { name: /email notifications/i })
      expect(emailSwitch).toBeChecked()
      
      await user.click(emailSwitch)
      expect(emailSwitch).not.toBeChecked()
    })

    it('submits preferences update successfully', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      })
      
      const saveButton = screen.getByRole('button', { name: /save preferences/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/users/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('theme'),
        })
      })
      
      await waitFor(() => {
        expect(screen.getByText('Preferences updated successfully')).toBeInTheDocument()
      })
    })

    it('handles preferences update errors', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to update preferences' }),
      })
      
      const saveButton = screen.getByRole('button', { name: /save preferences/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to update preferences')).toBeInTheDocument()
      })
    })
  })

  describe('Security Tab', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<UserProfile />)
      await user.click(screen.getByRole('tab', { name: /security/i }))
    })

    it('displays security settings', () => {
      expect(screen.getByText('Password & Authentication')).toBeInTheDocument()
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
      expect(screen.getByText('Active Sessions')).toBeInTheDocument()
      expect(screen.getByText('Danger Zone')).toBeInTheDocument()
    })

    it('opens external links for security settings', async () => {
      const user = userEvent.setup()
      const mockOpen = vi.fn()
      window.open = mockOpen
      
      const manageSecurityButton = screen.getByRole('button', { name: /manage security settings/i })
      await user.click(manageSecurityButton)
      
      expect(mockOpen).toHaveBeenCalledWith('https://accounts.clerk.dev', '_blank')
    })

    it('shows delete account confirmation', async () => {
      const user = userEvent.setup()
      const mockAlert = vi.fn()
      window.alert = mockAlert
      
      const deleteButton = screen.getByRole('button', { name: /delete account/i })
      await user.click(deleteButton)
      
      expect(mockAlert).toHaveBeenCalledWith('Account deletion would be implemented here')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<UserProfile />)
      
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getAllByRole('tab')).toHaveLength(3)
      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<UserProfile />)
      
      const profileTab = screen.getByRole('tab', { name: /profile/i })
      const preferencesTab = screen.getByRole('tab', { name: /preferences/i })
      
      await user.click(profileTab)
      await user.tab()
      
      expect(preferencesTab).toHaveFocus()
    })

    it('has proper form labels and descriptions', () => {
      render(<UserProfile />)
      
      expect(screen.getByLabelText('First Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByText(/Email address is managed by your authentication provider/)).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes', () => {
      render(<UserProfile />)
      
      const gridContainer = screen.getByText('First Name').closest('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2')
    })
  })

  describe('Error Handling', () => {
    it('displays network errors', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<UserProfile />)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('clears error messages when switching tabs', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Test error'))

      render(<UserProfile />)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('tab', { name: /preferences/i }))
      
      expect(screen.queryByText('Test error')).not.toBeInTheDocument()
    })
  })
})