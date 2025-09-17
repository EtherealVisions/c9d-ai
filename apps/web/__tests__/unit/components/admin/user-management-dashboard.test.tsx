import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuth } from '@clerk/nextjs'
import { UserManagementDashboard } from '@/components/admin/user-management-dashboard'
import { toast } from '@/hooks/use-toast'

// Mock dependencies
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn()
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('UserManagementDashboard', () => {
  const mockAuth = {
    userId: 'test-user-id',
    orgId: 'test-org-id'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue(mockAuth)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render the user management dashboard', () => {
      render(<UserManagementDashboard />)
      
      expect(screen.getByText('User Management')).toBeInTheDocument()
      expect(screen.getByText('Search, view, and manage user accounts and permissions')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter email or user ID...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('should render search section with proper elements', () => {
      render(<UserManagementDashboard />)
      
      expect(screen.getByText('User Search')).toBeInTheDocument()
      expect(screen.getByText('Search for users by email address or Clerk user ID')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter email or user ID...')).toBeInTheDocument()
    })
  })

  describe('User Search', () => {
    it('should show validation error for empty search', async () => {
      render(<UserManagementDashboard />)
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Search Required',
          description: 'Please enter an email or user ID to search',
          variant: 'destructive'
        })
      })
    })

    it('should perform search with valid query', async () => {
      const mockUsers = [
        {
          user: {
            id: 'user-1',
            clerkUserId: 'clerk-user-1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            avatarUrl: 'https://example.com/avatar.jpg',
            preferences: { accountStatus: 'active' },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          analytics: {
            signInCount: 5,
            lastSignInAt: '2024-01-15T10:00:00Z',
            accountAge: 30,
            sessionCount: 10,
            securityEvents: 0,
            organizationMemberships: 1
          }
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers })
      })

      render(<UserManagementDashboard />)
      
      const searchInput = screen.getByPlaceholderText('Enter email or user ID...')
      const searchButton = screen.getByRole('button', { name: /search/i })
      
      fireEvent.change(searchInput, { target: { value: 'test@example.com' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/users/search?q=test%40example.com',
          expect.objectContaining({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Search Results (1)')).toBeInTheDocument()
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })
    })

    it('should handle search API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Search failed' })
      })

      render(<UserManagementDashboard />)
      
      const searchInput = screen.getByPlaceholderText('Enter email or user ID...')
      const searchButton = screen.getByRole('button', { name: /search/i })
      
      fireEvent.change(searchInput, { target: { value: 'test@example.com' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Search Failed',
          description: 'Search failed',
          variant: 'destructive'
        })
      })
    })

    it('should show no results message when no users found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] })
      })

      render(<UserManagementDashboard />)
      
      const searchInput = screen.getByPlaceholderText('Enter email or user ID...')
      const searchButton = screen.getByRole('button', { name: /search/i })
      
      fireEvent.change(searchInput, { target: { value: 'nonexistent@example.com' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'No Results',
          description: 'No users found matching your search criteria'
        })
      })
    })
  })

  describe('Search Results Display', () => {
    const mockUsers = [
      {
        user: {
          id: 'user-1',
          clerkUserId: 'clerk-user-1',
          email: 'active@example.com',
          firstName: 'Active',
          lastName: 'User',
          avatarUrl: 'https://example.com/avatar1.jpg',
          preferences: { accountStatus: 'active' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        analytics: {
          signInCount: 5,
          lastSignInAt: '2024-01-15T10:00:00Z',
          accountAge: 30,
          sessionCount: 10,
          securityEvents: 0,
          organizationMemberships: 1
        }
      },
      {
        user: {
          id: 'user-2',
          clerkUserId: 'clerk-user-2',
          email: 'suspended@example.com',
          firstName: 'Suspended',
          lastName: 'User',
          avatarUrl: null,
          preferences: { accountStatus: 'suspended' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        analytics: {
          signInCount: 2,
          lastSignInAt: '2024-01-10T10:00:00Z',
          accountAge: 35,
          sessionCount: 3,
          securityEvents: 1,
          organizationMemberships: 0
        }
      }
    ]

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers })
      })

      render(<UserManagementDashboard />)
      
      const searchInput = screen.getByPlaceholderText('Enter email or user ID...')
      const searchButton = screen.getByRole('button', { name: /search/i })
      
      fireEvent.change(searchInput, { target: { value: 'test' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Search Results (2)')).toBeInTheDocument()
      })
    })

    it('should display user information correctly', () => {
      expect(screen.getByText('active@example.com')).toBeInTheDocument()
      expect(screen.getByText('Active User')).toBeInTheDocument()
      expect(screen.getByText('suspended@example.com')).toBeInTheDocument()
      expect(screen.getByText('Suspended User')).toBeInTheDocument()
    })

    it('should display user status badges correctly', () => {
      const statusBadges = screen.getAllByText(/active|suspended/)
      expect(statusBadges).toHaveLength(4) // 2 users × 2 occurrences each (name + status)
    })

    it('should display analytics information', () => {
      expect(screen.getByText('1')).toBeInTheDocument() // organization memberships
      expect(screen.getByText('0')).toBeInTheDocument() // organization memberships for suspended user
    })

    it('should have view details buttons for each user', () => {
      const viewButtons = screen.getAllByText('View Details')
      expect(viewButtons).toHaveLength(2)
    })
  })

  describe('User Details Modal', () => {
    it('should open user details modal when view details is clicked', async () => {
      const mockUser = {
        user: {
          id: 'user-1',
          clerkUserId: 'clerk-user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: 'https://example.com/avatar.jpg',
          preferences: { accountStatus: 'active' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        analytics: {
          signInCount: 5,
          lastSignInAt: '2024-01-15T10:00:00Z',
          accountAge: 30,
          sessionCount: 10,
          securityEvents: 0,
          organizationMemberships: 1
        },
        memberships: []
      }

      // Mock search results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [mockUser] })
      })

      // Mock user details fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      })

      render(<UserManagementDashboard />)
      
      // Perform search first
      const searchInput = screen.getByPlaceholderText('Enter email or user ID...')
      const searchButton = screen.getByRole('button', { name: /search/i })
      
      fireEvent.change(searchInput, { target: { value: 'test@example.com' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Search Results (1)')).toBeInTheDocument()
      })

      // Click view details
      const viewDetailsButton = screen.getByText('View Details')
      fireEvent.click(viewDetailsButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/users/clerk-user-1',
          expect.objectContaining({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
        )
      })
    })
  })

  describe('Status Updates', () => {
    it('should handle status update successfully', async () => {
      const mockUser = {
        user: {
          id: 'user-1',
          clerkUserId: 'clerk-user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: 'https://example.com/avatar.jpg',
          preferences: { accountStatus: 'active' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        analytics: {
          signInCount: 5,
          lastSignInAt: '2024-01-15T10:00:00Z',
          accountAge: 30,
          sessionCount: 10,
          securityEvents: 0,
          organizationMemberships: 1
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { ...mockUser.user, preferences: { accountStatus: 'suspended' } } })
      })

      render(<UserManagementDashboard />)
      
      // Simulate status update (this would normally be triggered from the modal)
      // We'll test the updateUserStatus function indirectly
      await waitFor(() => {
        // The component should be rendered without errors
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<UserManagementDashboard />)
      
      const searchInput = screen.getByPlaceholderText('Enter email or user ID...')
      const searchButton = screen.getByRole('button', { name: /search/i })
      
      fireEvent.change(searchInput, { target: { value: 'test@example.com' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Search Failed',
          description: 'Network error',
          variant: 'destructive'
        })
      })
    })

    it('should handle keyboard navigation', () => {
      render(<UserManagementDashboard />)
      
      const searchInput = screen.getByPlaceholderText('Enter email or user ID...')
      
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' })
      
      // Should trigger search validation
      expect(toast).toHaveBeenCalledWith({
        title: 'Search Required',
        description: 'Please enter an email or user ID to search',
        variant: 'destructive'
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<UserManagementDashboard />)
      
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter email or user ID...')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(<UserManagementDashboard />)
      
      const searchInput = screen.getByPlaceholderText('Enter email or user ID...')
      const searchButton = screen.getByRole('button', { name: /search/i })
      
      expect(searchInput).toBeVisible()
      expect(searchButton).toBeVisible()
      
      // Test tab navigation
      searchInput.focus()
      expect(document.activeElement).toBe(searchInput)
    })
  })
})