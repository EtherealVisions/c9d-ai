/**
 * Route Guard Component
 * Provides client-side route protection with onboarding and organization checks
 */

'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { authRouterService } from '@/lib/services/auth-router-service'
import { userSyncService } from '@/lib/services/user-sync'

interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireOnboarding?: boolean
  requireOrganization?: boolean
  organizationId?: string
  requiredPermissions?: string[]
  fallback?: React.ReactNode
  redirectTo?: string
}

interface GuardState {
  isLoading: boolean
  isAuthorized: boolean
  redirectUrl?: string
  error?: string
}

export function RouteGuard({
  children,
  requireAuth = true,
  requireOnboarding = false,
  requireOrganization = false,
  organizationId,
  requiredPermissions = [],
  fallback,
  redirectTo
}: RouteGuardProps): React.ReactElement {
  const { isLoaded: authLoaded, userId, orgId } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [guardState, setGuardState] = useState<GuardState>({
    isLoading: true,
    isAuthorized: false
  })

  useEffect(() => {
    async function checkAccess() {
      try {
        setGuardState({ isLoading: true, isAuthorized: false })

        // Wait for auth to load
        if (!authLoaded) {
          return
        }

        // Check authentication requirement
        if (requireAuth && !userId) {
          const currentPath = window.location.pathname + window.location.search
          const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(currentPath)}`
          
          if (redirectTo) {
            router.push(redirectTo)
          } else {
            router.push(signInUrl)
          }
          return
        }

        // If no auth required and user not authenticated, allow access
        if (!requireAuth && !userId) {
          setGuardState({ isLoading: false, isAuthorized: true })
          return
        }

        // If authenticated, sync user and check additional requirements
        if (userId && user) {
          // Sync user data
          const syncResult = await userSyncService.syncUser(user)
          if (syncResult.error) {
            console.error('Failed to sync user:', syncResult.error)
            setGuardState({
              isLoading: false,
              isAuthorized: false,
              error: 'Failed to load user data'
            })
            return
          }

          const userData = syncResult.user

          // Check onboarding requirement
          if (requireOnboarding) {
            const onboardingStatus = await authRouterService.getOnboardingStatus(userData)
            if (!onboardingStatus.completed) {
              const onboardingUrl = await authRouterService.getOnboardingDestination(userData)
              router.push(onboardingUrl)
              return
            }
          }

          // Check organization requirement
          if (requireOrganization) {
            const targetOrgId = organizationId || orgId
            if (!targetOrgId) {
              // No organization context, redirect to organization selection or creation
              router.push('/organizations')
              return
            }

            // Verify organization access
            const orgAccess = await authRouterService.verifyOrganizationAccess(userData.id, targetOrgId)
            if (!orgAccess.hasAccess) {
              setGuardState({
                isLoading: false,
                isAuthorized: false,
                error: 'Access denied to this organization'
              })
              return
            }
          }

          // Check specific permissions (would require additional service)
          if (requiredPermissions.length > 0) {
            // For now, log the requirement - implement permission checking as needed
            console.log('Permission check required:', requiredPermissions)
          }

          // All checks passed
          setGuardState({ isLoading: false, isAuthorized: true })
        }
      } catch (error) {
        console.error('Route guard error:', error)
        setGuardState({
          isLoading: false,
          isAuthorized: false,
          error: error instanceof Error ? error.message : 'Access check failed'
        })
      }
    }

    checkAccess()
  }, [
    authLoaded,
    userId,
    orgId,
    user,
    requireAuth,
    requireOnboarding,
    requireOrganization,
    organizationId,
    requiredPermissions,
    redirectTo,
    router
  ])

  // Show loading state
  if (guardState.isLoading) {
    return (fallback as React.ReactElement) || <RouteGuardLoading />
  }

  // Show error state
  if (guardState.error) {
    return <RouteGuardError error={guardState.error} />
  }

  // Show unauthorized state
  if (!guardState.isAuthorized) {
    return <RouteGuardUnauthorized />
  }

  // Render children if authorized
  return <>{children}</>
}

/**
 * Default loading component
 */
function RouteGuardLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2 text-sm text-gray-600">Checking access...</span>
    </div>
  )
}

/**
 * Default error component
 */
function RouteGuardError({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-red-500 text-lg font-semibold mb-2">Access Error</div>
        <div className="text-gray-600 text-sm">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

/**
 * Default unauthorized component
 */
function RouteGuardUnauthorized() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-gray-700 text-lg font-semibold mb-2">Access Denied</div>
        <div className="text-gray-600 text-sm">You don't have permission to access this page.</div>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}

/**
 * Higher-order component for route protection
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<RouteGuardProps, 'children'>
) {
  return function GuardedComponent(props: P) {
    return (
      <RouteGuard {...guardProps}>
        <Component {...props} />
      </RouteGuard>
    )
  }
}

/**
 * Hook for checking route access programmatically
 */
export function useRouteAccess(requirements: {
  requireAuth?: boolean
  requireOnboarding?: boolean
  requireOrganization?: boolean
  organizationId?: string
  requiredPermissions?: string[]
}) {
  const { isLoaded: authLoaded, userId, orgId } = useAuth()
  const { user } = useUser()
  const [accessState, setAccessState] = useState<{
    isLoading: boolean
    hasAccess: boolean
    error?: string
  }>({
    isLoading: true,
    hasAccess: false
  })

  useEffect(() => {
    async function checkAccess() {
      if (!authLoaded) return

      try {
        setAccessState({ isLoading: true, hasAccess: false })

        // Basic auth check
        if (requirements.requireAuth && !userId) {
          setAccessState({ isLoading: false, hasAccess: false })
          return
        }

        // If no requirements or not authenticated, allow access
        if (!requirements.requireAuth || !userId || !user) {
          setAccessState({ isLoading: false, hasAccess: true })
          return
        }

        // Sync user and check requirements
        const syncResult = await userSyncService.syncUser(user)
        if (syncResult.error) {
          setAccessState({
            isLoading: false,
            hasAccess: false,
            error: 'Failed to load user data'
          })
          return
        }

        const userData = syncResult.user

        // Check onboarding
        if (requirements.requireOnboarding) {
          const onboardingStatus = await authRouterService.getOnboardingStatus(userData)
          if (!onboardingStatus.completed) {
            setAccessState({ isLoading: false, hasAccess: false })
            return
          }
        }

        // Check organization
        if (requirements.requireOrganization) {
          const targetOrgId = requirements.organizationId || orgId
          if (!targetOrgId) {
            setAccessState({ isLoading: false, hasAccess: false })
            return
          }

          const orgAccess = await authRouterService.verifyOrganizationAccess(userData.id, targetOrgId)
          if (!orgAccess.hasAccess) {
            setAccessState({ isLoading: false, hasAccess: false })
            return
          }
        }

        setAccessState({ isLoading: false, hasAccess: true })
      } catch (error) {
        setAccessState({
          isLoading: false,
          hasAccess: false,
          error: error instanceof Error ? error.message : 'Access check failed'
        })
      }
    }

    checkAccess()
  }, [authLoaded, userId, orgId, user, requirements])

  return accessState
}