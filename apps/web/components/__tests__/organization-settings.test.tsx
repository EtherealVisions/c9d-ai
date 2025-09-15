import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OrganizationSettings } from '../organization-settings'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useToast } from '@/hooks/use-toast'

// Mock the contexts and hooks
vi.mock('@/lib/contexts/organization-context')
vi.mock('@/hooks/use-toast')

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock window.location
const mockLocation = {
  href: ''
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Mock window.confirm
const mockConfirm = vi.fn()
global.confirm = mockConfirm

const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'A test organization',
  avatarUrl: 'https://example.com/avatar.jpg',
  metadata: {},
  settings: {},
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-02T15:30:00Z')
}

const mockRefreshOrganizationData = vi.fn()
const mockToast = vi.fn()

describe('OrganizationSettings', () => {
  beforeEach(() => {
    vi.mocked(useOrganization).mockReturnValue({
      refreshOrganizationData: mockRefreshOrganizationData,
      organization: null,
      membership: null,
      isLoading: false,
      roles: [],
      permissions: [],
      switchOrganization: vi.fn(),
      canAccess: vi.fn(),
      hasPermission: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
      filterResourcesByPermission: vi.fn()
    })
    vi.mocked(useToast).mockReturnValue({ toast: mockToast })
    mockFetch.mockClear()
    mockToast.mockClear()
    mockRefreshOrganizationData.mockClear()
    mockConfirm.mockClear()
    mockLocation.href = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders organization settings form with current values', () => {
    render(<OrganizationSettings organization={mockOrganization} />)
    
    expect(screen.getByDisplayValue('Test Organization')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A test organization')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com/avatar.jpg')).toBeInTheDocument()
  })

  it('renders organization metadata correctly', () => {
    render(<OrganizationSettings organization={mockOrganization} />)
    
    expect(screen.getByText('org-1')).toBeInTheDocument()
    expect(screen.getByText('test-org')).toBeInTheDocument()
    expect(screen.getByText('1/1/2024, 4:00:00 AM')).toBeInTheDocument()
    expect(screen.getByText('1/2/2024, 9:30:00 AM')).toBeInTheDocument()
  })

  it('updates organization successfully', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        organization: {
          ...mockOrganization,
          name: 'Updated Organization'
        }
      })
    })

    render(<OrganizationSettings organization={mockOrganization} />)
    
    // Update the name field
    const nameInput = screen.getByDisplayValue('Test Organization')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Organization')
    
    // Submit the form
    const saveButton = screen.getByText('Save Changes')
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/organizations/org-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Updated Organization',
          description: 'A test organization',
          avatarUrl: 'https://example.com/avatar.jpg'
        })
      })
    })

    expect(mockRefreshOrganizationData).toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Organization updated',
      description: 'Your organization settings have been saved successfully.'
    })
  })

  it('handles update errors', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'Organization name already exists'
      })
    })

    render(<OrganizationSettings organization={mockOrganization} />)
    
    // Submit the form
    const saveButton = screen.getByText('Save Changes')
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Update failed',
        description: 'Organization name already exists',
        variant: 'destructive'
      })
    })
  })

  it('validates form fields', async () => {
    const user = userEvent.setup()
    
    render(<OrganizationSettings organization={mockOrganization} />)
    
    // Clear the name field (required)
    const nameInput = screen.getByDisplayValue('Test Organization')
    await user.clear(nameInput)
    
    // Try to submit
    const saveButton = screen.getByText('Save Changes')
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText('Organization name is required')).toBeInTheDocument()
    })
    
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('validates URL format for avatar', async () => {
    const user = userEvent.setup()
    
    render(<OrganizationSettings organization={mockOrganization} />)
    
    // Enter invalid URL
    const avatarInput = screen.getByDisplayValue('https://example.com/avatar.jpg')
    await user.clear(avatarInput)
    await user.type(avatarInput, 'not-a-url')
    
    // Try to submit
    const saveButton = screen.getByText('Save Changes')
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText('Must be a valid URL')).toBeInTheDocument()
    })
    
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('allows empty optional fields', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        organization: mockOrganization
      })
    })

    render(<OrganizationSettings organization={mockOrganization} />)
    
    // Clear optional fields
    const descriptionInput = screen.getByDisplayValue('A test organization')
    const avatarInput = screen.getByDisplayValue('https://example.com/avatar.jpg')
    
    await user.clear(descriptionInput)
    await user.clear(avatarInput)
    
    // Submit the form
    const saveButton = screen.getByText('Save Changes')
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/organizations/org-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Organization',
          description: undefined,
          avatarUrl: undefined
        })
      })
    })
  })

  it('shows loading state during update', async () => {
    const user = userEvent.setup()
    
    // Mock a slow response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ organization: mockOrganization })
      }), 100))
    )

    render(<OrganizationSettings organization={mockOrganization} />)
    
    const saveButton = screen.getByText('Save Changes')
    await user.click(saveButton)
    
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(saveButton).toBeDisabled()
    
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
    })
  })

  it('deletes organization with confirmation', async () => {
    const user = userEvent.setup()
    
    mockConfirm.mockReturnValueOnce(true)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        message: 'Organization deleted successfully'
      })
    })

    render(<OrganizationSettings organization={mockOrganization} />)
    
    const deleteButton = screen.getByRole('button', { name: /delete organization/i })
    await user.click(deleteButton)
    
    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this organization? This action cannot be undone.'
    )
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/organizations/org-1', {
        method: 'DELETE'
      })
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Organization deleted',
      description: 'The organization has been deleted successfully.'
    })
    
    expect(mockLocation.href).toBe('/dashboard')
  })

  it('cancels deletion when user declines confirmation', async () => {
    const user = userEvent.setup()
    
    mockConfirm.mockReturnValueOnce(false)

    render(<OrganizationSettings organization={mockOrganization} />)
    
    const deleteButton = screen.getByRole('button', { name: /delete organization/i })
    await user.click(deleteButton)
    
    expect(mockConfirm).toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('handles deletion errors', async () => {
    const user = userEvent.setup()
    
    mockConfirm.mockReturnValueOnce(true)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'Cannot delete organization with active members'
      })
    })

    render(<OrganizationSettings organization={mockOrganization} />)
    
    const deleteButton = screen.getByRole('button', { name: /delete organization/i })
    await user.click(deleteButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Delete failed',
        description: 'Cannot delete organization with active members',
        variant: 'destructive'
      })
    })
    
    expect(mockLocation.href).toBe('')
  })

  it('shows loading state during deletion', async () => {
    const user = userEvent.setup()
    
    mockConfirm.mockReturnValueOnce(true)
    // Mock a slow response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Deleted' })
      }), 100))
    )

    render(<OrganizationSettings organization={mockOrganization} />)
    
    const deleteButton = screen.getByRole('button', { name: /delete organization/i })
    await user.click(deleteButton)
    
    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })
    
    const deletingButton = screen.getByText('Deleting...')
    expect(deletingButton).toBeDisabled()
  })

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Clear any previous mocks and set up the rejection
    mockFetch.mockClear()
    mockToast.mockClear()
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<OrganizationSettings organization={mockOrganization} />)
    
    const saveButton = screen.getByText('Save Changes')
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Update failed',
        description: 'Network error',
        variant: 'destructive'
      })
    }, { timeout: 3000 })
  })
})