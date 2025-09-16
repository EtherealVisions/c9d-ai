import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RouteGuard, useRouteAccess } from '../route-guard'
import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

// Mock dependencies
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(),
  useUser: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('../../lib/services/auth-router-service', () => ({
  authRouterService: {
    getOnboardingStatus: vi.fn(),
    getOnboardingDestination: vi.fn(),
    verifyOrganizationAccess: vi.fn()
  }
}))

vi.mock('../../../lib/services/user-sync', () => ({
  userSyncService: {
    syncUser: vi.fn()
  }
}))

describe('RouteGuard', () => {
  const mockPush = vi.fn()
  const mockUser = {
    id: 'user-1',
    firstName: 'Test',
    lastName: 'User',
    emailAddresses: [{ emailAddress: 'test@example.com' }]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    ;(useRouter as any).mockReturnValue({
      push: mockPush
    })
    
    ;(useAuth as any).mockReturnValue({
      isLoaded: true,
      userId: 'user-1',
      orgId: 'org-1'
    })
    
    ;(useUser as any).mockReturnValue({
      user: mockUser
    })

    // Mock services
    const { authRouterService } = require('../../../lib/services/auth-router-service')
    const { userSyncService } = require('../../../lib/services/user-sync')
    
    userSyncService.syncUser.mockResolvedValue({
      user: {
        id: 'user-1',
        preferences: { onboardingCompleted: true }
      }
    })
    
    authRouterService.getOnboardingStatus.mockResolvedValue({
      completed: true
    })
    
    authRouterService.verifyOrganizationAccess.mockResolvedValue({
      hasAccess: true
    })
  })

  describe('Basic Authentication', () => {
    it('should render children when user is authenticated', async () => {
      render(
        <RouteGuard requireAuth={true}>
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should redirect to sign-in when user is not authenticated', async () => {
      ;(useAuth as any).mockReturnValue({
        isLoaded: true,
        userId: null,
        orgId: null
      })

      render(
        <RouteGuard requireAuth={true}>
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('/sign-in?redirect_url=')
        )
      })
    })

    it('should allow access when auth is not required', async () => {
      ;(useAuth as any).mockReturnValue({
        isLoaded: true,
        userId: null,
        orgId: null
      })

      render(
        <RouteGuard requireAuth={false}>
          <div data-testid="public-content">Public Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('public-content')).toBeInTheDocument()
      })
    })
  })

  describe('Onboarding Requirements', () => {
    it('should redirect to onboarding when onboarding is incomplete', async () => {
      const { authRouterService } = require('../../../lib/services/auth-router-service')
      
      authRouterService.getOnboardingStatus.mockResolvedValue({
        completed: false
      })
      
      authRouterService.getOnboardingDestination.mockResolvedValue('/onboarding/profile')

      render(
        <RouteGuard requireAuth={true} requireOnboarding={true}>
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding/profile')
      })
    })

    it('should allow access when onboarding is complete', async () => {
      render(
        <RouteGuard requireAuth={true} requireOnboarding={true}>
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })
  })

  describe('Organization Requirements', () => {
    it('should allow access when user has organization access', async () => {
      render(
        <RouteGuard requireAuth={true} requireOrganization={true} organizationId="org-1">
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('should show error when user lacks organization access', async () => {
      const { authRouterService } = require('../../../lib/services/auth-router-service')
      
      authRouterService.verifyOrganizationAccess.mockResolvedValue({
        hasAccess: false
      })

      render(
        <RouteGuard requireAuth={true} requireOrganization={true} organizationId="org-2">
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(screen.getByText('Access denied to this organization')).toBeInTheDocument()
      })
    })

    it('should redirect to organizations when no organization context', async () => {
      ;(useAuth as any).mockReturnValue({
        isLoaded: true,
        userId: 'user-1',
        orgId: null
      })

      render(
        <RouteGuard requireAuth={true} requireOrganization={true}>
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/organizations')
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state while auth is loading', () => {
      ;(useAuth as any).mockReturnValue({
        isLoaded: false,
        userId: null,
        orgId: null
      })

      render(
        <RouteGuard requireAuth={true}>
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      expect(screen.getByText('Checking access...')).toBeInTheDocument()
    })

    it('should show custom fallback when provided', () => {
      ;(useAuth as any).mockReturnValue({
        isLoaded: false,
        userId: null,
        orgId: null
      })

      render(
        <RouteGuard 
          requireAuth={true}
          fallback={<div data-testid="custom-loading">Custom Loading</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show error when user sync fails', async () => {
      const { userSyncService } = require('../../../lib/services/user-sync')
      
      userSyncService.syncUser.mockResolvedValue({
        error: 'Sync failed'
      })

      render(
        <RouteGuard requireAuth={true}>
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to load user data')).toBeInTheDocument()
      })
    })

    it('should show error when access check throws', async () => {
      const { authRouterService } = require('../../../lib/services/auth-router-service')
      
      authRouterService.getOnboardingStatus.mockRejectedValue(new Error('Service error'))

      render(
        <RouteGuard requireAuth={true} requireOnboarding={true}>
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(screen.getByText('Service error')).toBeInTheDocument()
      })
    })
  })

  describe('Custom Redirect', () => {
    it('should use custom redirect when provided', async () => {
      ;(useAuth as any).mockReturnValue({
        isLoaded: true,
        userId: null,
        orgId: null
      })

      render(
        <RouteGuard requireAuth={true} redirectTo="/custom-login">
          <div data-testid="protected-content">Protected Content</div>
        </RouteGuard>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-login')
      })
    })
  })
})

describe('useRouteAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    ;(useAuth as any).mockReturnValue({
      isLoaded: true,
      userId: 'user-1',
      orgId: 'org-1'
    })
    
    ;(useUser as any).mockReturnValue({
      user: {
        id: 'user-1',
        emailAddresses: [{ emailAddress: 'test@example.com' }]
      }
    })

    const { authRouterService } = require('../../../lib/services/auth-router-service')
    const { userSyncService } = require('../../../lib/services/user-sync')
    
    userSyncService.syncUser.mockResolvedValue({
      user: { id: 'user-1', preferences: { onboardingCompleted: true } }
    })
    
    authRouterService.getOnboardingStatus.mockResolvedValue({
      completed: true
    })
    
    authRouterService.verifyOrganizationAccess.mockResolvedValue({
      hasAccess: true
    })
  })

  it('should return access granted for authenticated user', async () => {
    const TestComponent = () => {
      const { isLoading, hasAccess } = useRouteAccess({ requireAuth: true })
      
      if (isLoading) return <div>Loading...</div>
      return <div>{hasAccess ? 'Access granted' : 'Access denied'}</div>
    }

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByText('Access granted')).toBeInTheDocument()
    })
  })

  it('should return access denied for unauthenticated user', async () => {
    ;(useAuth as any).mockReturnValue({
      isLoaded: true,
      userId: null,
      orgId: null
    })

    const TestComponent = () => {
      const { isLoading, hasAccess } = useRouteAccess({ requireAuth: true })
      
      if (isLoading) return <div>Loading...</div>
      return <div>{hasAccess ? 'Access granted' : 'Access denied'}</div>
    }

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument()
    })
  })
})