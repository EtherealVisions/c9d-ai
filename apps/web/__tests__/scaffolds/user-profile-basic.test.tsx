import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAuth } from '@/lib/contexts/auth-context'

// Mock the auth context
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn()
}))

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    control: {},
    handleSubmit: vi.fn((fn) => fn),
    formState: { errors: {} },
    reset: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn()
  }))
}))

// Mock all UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: (props: any) => <input type="checkbox" {...props} />
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => <form>{children}</form>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormDescription: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render }: any) => render({ field: { value: '', onChange: vi.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: ({ children }: any) => <div>{children}</div>
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  Palette: () => <div data-testid="palette-icon" />
}))

// Mock fetch
global.fetch = vi.fn()

describe('UserProfile Component', () => {
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
        marketing: false
      },
      dashboard: {
        defaultView: 'overview',
        itemsPerPage: 10
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockRefreshUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful fetch responses
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response)
  })

  describe('Loading State', () => {
    it('should show loading spinner when user is null', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isLoading: false,
        isSignedIn: false,
        organizations: [],
        currentOrganization: null,
        currentMembership: null,
        switchOrganization: vi.fn(),
        refreshUser: mockRefreshUser,
        refreshOrganizations: vi.fn(),
        permissions: [],
        hasPermission: vi.fn(() => false)
      })

      const { UserProfile } = await import('@/components/user-profile')
      render(<UserProfile />)
      
      expect(screen.getByTestId('user-profile-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading user profile...')).toBeInTheDocument()
    })
  })

  describe('User Profile Display', () => {
    it('should render user profile when user is loaded', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        isLoading: false,
        isSignedIn: true,
        organizations: [],
        currentOrganization: null,
        currentMembership: null,
        switchOrganization: vi.fn(),
        refreshUser: mockRefreshUser,
        refreshOrganizations: vi.fn(),
        permissions: [],
        hasPermission: vi.fn(() => false)
      })

      const { UserProfile } = await import('@/components/user-profile')
      render(<UserProfile />)
      
      expect(screen.getByTestId('user-profile')).toBeInTheDocument()
    })

    it('should display user information in profile tab', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        isLoading: false,
        isSignedIn: true,
        organizations: [],
        currentOrganization: null,
        currentMembership: null,
        switchOrganization: vi.fn(),
        refreshUser: mockRefreshUser,
        refreshOrganizations: vi.fn(),
        permissions: [],
        hasPermission: vi.fn(() => false)
      })

      const { UserProfile } = await import('@/components/user-profile')
      render(<UserProfile />)
      
      expect(screen.getByTestId('profile-panel')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should render all tabs', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        isLoading: false,
        isSignedIn: true,
        organizations: [],
        currentOrganization: null,
        currentMembership: null,
        switchOrganization: vi.fn(),
        refreshUser: mockRefreshUser,
        refreshOrganizations: vi.fn(),
        permissions: [],
        hasPermission: vi.fn(() => false)
      })

      const { UserProfile } = await import('@/components/user-profile')
      render(<UserProfile />)
      
      expect(screen.getByTestId('tab-profile')).toBeInTheDocument()
      expect(screen.getByTestId('tab-preferences')).toBeInTheDocument()
      expect(screen.getByTestId('tab-security')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        isLoading: false,
        isSignedIn: true,
        organizations: [],
        currentOrganization: null,
        currentMembership: null,
        switchOrganization: vi.fn(),
        refreshUser: mockRefreshUser,
        refreshOrganizations: vi.fn(),
        permissions: [],
        hasPermission: vi.fn(() => false)
      })

      const { UserProfile } = await import('@/components/user-profile')
      render(<UserProfile />)
      
      const tabList = screen.getByRole('tablist')
      expect(tabList).toHaveAttribute('aria-label', 'Account settings tabs')
      
      const profileTab = screen.getByTestId('tab-profile')
      expect(profileTab).toHaveAttribute('role', 'tab')
      expect(profileTab).toHaveAttribute('aria-selected', 'true')
    })
  })
})