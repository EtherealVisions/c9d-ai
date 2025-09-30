/**
 * Authentication Router Service
 * Handles post-authentication routing logic based on user context and onboarding status
 * Implements intelligent destination logic with redirect URL validation and onboarding integration
 */

import { getRepositoryFactory } from '@/lib/repositories/factory'
import { userService } from './user-service'
import type { User } from '../models/types'

// URL validation patterns for security
const ALLOWED_REDIRECT_PATTERNS = [
  /^\/dashboard/,
  /^\/organizations\/[a-zA-Z0-9-]+/,
  /^\/onboarding/,
  /^\/profile/,
  /^\/settings/,
  /^\/projects/,
  /^\/teams/
]

const BLOCKED_REDIRECT_PATTERNS = [
  /^\/api\//,
  /^\/admin\//,
  /^\/_next\//,
  /^\/sign-in/,
  /^\/sign-up/,
  /^\/verify-email/,
  /^\/reset-password/,
  /^\/webhooks\//
]

export interface AuthDestination {
  url: string
  reason: string
  requiresOnboarding?: boolean
  organizationContext?: string
  metadata?: Record<string, any>
}

export interface OnboardingStatus {
  completed: boolean
  currentStep?: string
  nextStep?: string
  progress: number
  availableSteps?: string[]
  completedSteps?: string[]
}

export interface RedirectValidationResult {
  isValid: boolean
  sanitizedUrl?: string
  reason?: string
  securityIssues?: string[]
}

export interface UserContext {
  user: User
  organizationId?: string
  lastVisitedPath?: string
  sessionMetadata?: Record<string, any>
}

export class AuthRouterService {
  private getRepositoryFactory() {
    return getRepositoryFactory()
  }

  /**
   * Determines the appropriate destination after successful authentication
   * Enhanced with comprehensive context analysis and security validation
   */
  async getPostAuthDestination(
    user: User, 
    redirectUrl?: string,
    organizationId?: string,
    sessionMetadata?: Record<string, any>
  ): Promise<AuthDestination> {
    try {
      const userContext: UserContext = {
        user,
        organizationId,
        lastVisitedPath: user.preferences?.lastVisitedPath,
        sessionMetadata
      }

      // 1. Validate and process redirect URL if provided
      if (redirectUrl) {
        const validationResult = await this.validateRedirectUrl(redirectUrl, userContext)
        if (validationResult.isValid && validationResult.sanitizedUrl) {
          // Log successful redirect for security monitoring
          await this.logRoutingDecision(user.id, 'redirect_url_used', {
            originalUrl: redirectUrl,
            sanitizedUrl: validationResult.sanitizedUrl,
            userAgent: sessionMetadata?.userAgent,
            ipAddress: sessionMetadata?.ipAddress
          })

          return {
            url: validationResult.sanitizedUrl,
            reason: 'User-requested redirect (validated)',
            metadata: {
              originalUrl: redirectUrl,
              validationPassed: true
            }
          }
        } else {
          // Log blocked redirect attempt for security
          await this.logRoutingDecision(user.id, 'redirect_url_blocked', {
            originalUrl: redirectUrl,
            reason: validationResult.reason,
            securityIssues: validationResult.securityIssues
          })
        }
      }

      // 2. Check onboarding status with enhanced logic
      const onboardingStatus = await this.getOnboardingStatus(user)
      
      if (!onboardingStatus.completed) {
        const onboardingUrl = await this.getOnboardingDestination(user, onboardingStatus)
        
        await this.logRoutingDecision(user.id, 'onboarding_redirect', {
          currentStep: onboardingStatus.currentStep,
          nextStep: onboardingStatus.nextStep,
          progress: onboardingStatus.progress,
          destination: onboardingUrl
        })

        return {
          url: onboardingUrl,
          reason: 'Onboarding incomplete',
          requiresOnboarding: true,
          metadata: {
            onboardingProgress: onboardingStatus.progress,
            nextStep: onboardingStatus.nextStep
          }
        }
      }

      // 3. Handle organization context with enhanced validation
      if (organizationId) {
        const orgAccess = await this.verifyOrganizationAccess(user.id, organizationId)
        if (orgAccess.hasAccess) {
          const orgDestination = await this.getOrganizationDestination(organizationId, user, orgAccess.role)
          
          await this.logRoutingDecision(user.id, 'organization_context_used', {
            organizationId,
            role: orgAccess.role,
            destination: orgDestination
          })

          return {
            url: orgDestination,
            reason: 'Organization context provided',
            organizationContext: organizationId,
            metadata: {
              userRole: orgAccess.role,
              organizationName: orgAccess.organizationName
            }
          }
        }
      }

      // 4. Determine best organization destination
      const orgDestination = await this.getBestOrganizationDestination(user)
      if (orgDestination) {
        await this.logRoutingDecision(user.id, 'organization_auto_selected', {
          organizationId: orgDestination.organizationContext,
          reason: orgDestination.reason
        })
        return orgDestination
      }

      // 5. Check for last visited path (if valid and recent)
      const lastVisitedDestination = await this.getLastVisitedDestination(user)
      if (lastVisitedDestination) {
        await this.logRoutingDecision(user.id, 'last_visited_used', {
          destination: lastVisitedDestination.url,
          reason: lastVisitedDestination.reason
        })
        return lastVisitedDestination
      }

      // 6. Default to personalized dashboard
      const defaultDestination = await this.getPersonalizedDashboard(user)
      
      await this.logRoutingDecision(user.id, 'default_destination', {
        destination: defaultDestination.url,
        reason: defaultDestination.reason
      })

      return defaultDestination

    } catch (error) {
      console.error('Error determining post-auth destination:', error)
      
      // Log error for monitoring
      await this.logRoutingDecision(user.id, 'routing_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: true
      })
      
      // Fallback to safe default
      return {
        url: '/dashboard',
        reason: 'Fallback due to error',
        metadata: {
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Handles protected route access for unauthenticated users
   */
  handleProtectedRoute(pathname: string, searchParams?: URLSearchParams): string {
    const signInUrl = new URL('/sign-in', 'http://localhost:3007')
    
    // Add the original path as redirect parameter
    if (pathname !== '/') {
      signInUrl.searchParams.set('redirect_url', pathname)
      
      // Preserve search parameters
      if (searchParams) {
        searchParams.forEach((value, key) => {
          signInUrl.searchParams.set(key, value)
        })
      }
    }

    return signInUrl.pathname + signInUrl.search
  }

  /**
   * Gets the appropriate onboarding destination based on current progress
   * Enhanced with integration to the comprehensive onboarding system
   */
  async getOnboardingDestination(user: User, status?: OnboardingStatus): Promise<string> {
    const onboardingStatus = status || await this.getOnboardingStatus(user)
    
    if (onboardingStatus.completed) {
      return '/dashboard'
    }

    try {
      // Try to use the integrated onboarding system
      const { authOnboardingIntegration } = await import('./auth-onboarding-integration')
      const onboardingResult = await authOnboardingIntegration.checkOnboardingRequirement(user)
      
      if (onboardingResult.shouldRedirectToOnboarding) {
        return onboardingResult.onboardingUrl
      }
    } catch (error) {
      console.error('Error using integrated onboarding system, falling back to simple routing:', error)
    }

    // Fallback to simple onboarding routing
    const nextStep = onboardingStatus.nextStep || 'profile'
    
    switch (nextStep) {
      case 'profile':
        return '/onboarding/profile'
      case 'organization':
        return '/onboarding/organization'
      case 'team':
        return '/onboarding/team'
      case 'preferences':
        return '/onboarding/preferences'
      case 'tutorial':
        return '/onboarding/tutorial'
      default:
        return '/onboarding/profile'
    }
  }

  /**
   * Gets the user's onboarding status and progress with enhanced details
   */
  async getOnboardingStatus(user: User): Promise<OnboardingStatus> {
    try {
      // Check user preferences for onboarding completion
      const preferences = user.preferences || {}
      const onboardingCompleted = preferences.onboardingCompleted === true
      
      // Define all available onboarding steps
      const availableSteps = ['profile', 'organization', 'team', 'preferences', 'tutorial']
      
      if (onboardingCompleted) {
        return {
          completed: true,
          progress: 100,
          availableSteps,
          completedSteps: availableSteps
        }
      }

      // Determine current progress based on completed steps
      const completedSteps = preferences.onboardingSteps || {}
      const completedStepNames = availableSteps.filter(step => completedSteps[step] === true)
      
      let completedCount = 0
      let nextStep = 'profile'
      let currentStep: string | undefined
      
      for (const step of availableSteps) {
        if (completedSteps[step]) {
          completedCount++
          currentStep = step
        } else {
          nextStep = step
          break
        }
      }

      const progress = Math.round((completedCount / availableSteps.length) * 100)

      // Check if user should skip certain steps based on context
      const shouldSkipOrganization = await this.shouldSkipOrganizationStep(user)
      const shouldSkipTeam = await this.shouldSkipTeamStep(user)

      // Adjust next step if certain steps should be skipped
      if (nextStep === 'organization' && shouldSkipOrganization) {
        nextStep = 'team'
      }
      if (nextStep === 'team' && shouldSkipTeam) {
        nextStep = 'preferences'
      }

      return {
        completed: false,
        currentStep,
        nextStep,
        progress,
        availableSteps,
        completedSteps: completedStepNames
      }

    } catch (error) {
      console.error('Error getting onboarding status:', error)
      
      return {
        completed: false,
        nextStep: 'profile',
        progress: 0,
        availableSteps: ['profile', 'organization', 'team', 'preferences', 'tutorial'],
        completedSteps: []
      }
    }
  }

  /**
   * Determines if user should skip organization setup step
   */
  async shouldSkipOrganizationStep(user: User): Promise<boolean> {
    try {
      // Check if user is already a member of any organization
      const userOrgs = await this.getUserOrganizations(user.id)
      return userOrgs.length > 0
    } catch (error) {
      console.error('Error checking organization skip condition:', error)
      return false
    }
  }

  /**
   * Determines if user should skip team invitation step
   */
  async shouldSkipTeamStep(user: User): Promise<boolean> {
    try {
      // Check if user is in a single-person organization or has specific preferences
      const skipTeamSetup = user.preferences?.skipTeamSetup === true
      return skipTeamSetup
    } catch (error) {
      console.error('Error checking team skip condition:', error)
      return false
    }
  }

  /**
   * Gets the user's primary organization
   */
  async getUserPrimaryOrganization(userId: string) {
    try {
      const factory = this.getRepositoryFactory()
      const membershipRepo = factory.createOrganizationMembershipRepository()
      
      const memberships = await membershipRepo.findByUser(userId, { limit: 1 })
      if (memberships.data.length === 0) {
        return null
      }

      const organizationRepo = factory.createOrganizationRepository()
      return await organizationRepo.findById(memberships.data[0].organizationId)
    } catch (error) {
      console.error('Error getting primary organization:', error)
      return null
    }
  }

  /**
   * Gets all organizations the user belongs to
   */
  async getUserOrganizations(userId: string) {
    try {
      const { data: memberships } = await this.supabase
        .from('organization_memberships')
        .select(`
          organization:organizations (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })

      return memberships?.map((m: any) => m.organization).filter(Boolean) || []
    } catch (error) {
      console.error('Error getting user organizations:', error)
      return []
    }
  }

  /**
   * Verifies if user has access to a specific organization with detailed info
   */
  async verifyOrganizationAccess(userId: string, organizationId: string): Promise<{
    hasAccess: boolean
    role?: string
    organizationName?: string
    membershipId?: string
  }> {
    try {
      const { data: membership } = await this.supabase
        .from('organization_memberships')
        .select(`
          id,
          organization:organizations (name),
          role:roles (name)
        `)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (membership) {
        return {
          hasAccess: true,
          role: (membership as any).role?.name,
          organizationName: (membership as any).organization?.name,
          membershipId: membership.id
        }
      }

      return { hasAccess: false }
    } catch (error) {
      console.error('Error verifying organization access:', error)
      return { hasAccess: false }
    }
  }

  /**
   * Enhanced redirect URL validation with comprehensive security checks
   */
  async validateRedirectUrl(url: string, userContext: UserContext): Promise<RedirectValidationResult> {
    try {
      // Basic URL parsing validation
      let parsedUrl: URL
      try {
        parsedUrl = new URL(url, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007')
      } catch (error) {
        return {
          isValid: false,
          reason: 'Invalid URL format',
          securityIssues: ['malformed_url']
        }
      }

      const securityIssues: string[] = []

      // Check origin validation
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL,
        'http://localhost:3007',
        'https://localhost:3007'
      ].filter(Boolean)

      if (!allowedOrigins.some(origin => parsedUrl.origin === origin)) {
        securityIssues.push('external_origin')
      }

      // Check against blocked patterns
      const isBlocked = BLOCKED_REDIRECT_PATTERNS.some(pattern => 
        pattern.test(parsedUrl.pathname)
      )

      if (isBlocked) {
        securityIssues.push('blocked_path')
      }

      // Check against allowed patterns (if not blocked)
      const isAllowed = !isBlocked && (
        ALLOWED_REDIRECT_PATTERNS.some(pattern => 
          pattern.test(parsedUrl.pathname)
        ) || parsedUrl.pathname === '/'
      )

      if (!isAllowed) {
        securityIssues.push('path_not_allowed')
      }

      // Check for suspicious query parameters
      const suspiciousParams = ['javascript:', 'data:', 'vbscript:', 'file:']
      for (const [key, value] of parsedUrl.searchParams) {
        if (suspiciousParams.some(suspicious => 
          key.toLowerCase().includes(suspicious) || 
          value.toLowerCase().includes(suspicious)
        )) {
          securityIssues.push('suspicious_parameters')
          break
        }
      }

      // Validate organization access if URL contains organization ID
      const orgMatch = parsedUrl.pathname.match(/^\/organizations\/([a-zA-Z0-9-]+)/)
      if (orgMatch) {
        const orgId = orgMatch[1]
        const hasAccess = await this.verifyOrganizationAccess(userContext.user.id, orgId)
        if (!hasAccess.hasAccess) {
          securityIssues.push('organization_access_denied')
        }
      }

      // Return validation result
      if (securityIssues.length === 0) {
        return {
          isValid: true,
          sanitizedUrl: parsedUrl.pathname + parsedUrl.search,
          reason: 'URL validation passed'
        }
      } else {
        return {
          isValid: false,
          reason: 'Security validation failed',
          securityIssues
        }
      }

    } catch (error) {
      return {
        isValid: false,
        reason: 'Validation error occurred',
        securityIssues: ['validation_error']
      }
    }
  }

  /**
   * Gets the best organization destination for a user
   */
  async getBestOrganizationDestination(user: User): Promise<AuthDestination | null> {
    try {
      // Get user's primary organization
      const primaryOrg = await this.getUserPrimaryOrganization(user.id)
      if (primaryOrg) {
        return {
          url: `/organizations/${primaryOrg.id}/dashboard`,
          reason: 'Primary organization dashboard',
          organizationContext: primaryOrg.id,
          metadata: {
            organizationName: primaryOrg.name,
            isPrimary: true
          }
        }
      }

      // Get user's most recently accessed organization
      const recentOrg = await this.getMostRecentOrganization(user.id)
      if (recentOrg) {
        return {
          url: `/organizations/${recentOrg.id}/dashboard`,
          reason: 'Most recently accessed organization',
          organizationContext: recentOrg.id,
          metadata: {
            organizationName: recentOrg.name,
            lastAccessed: recentOrg.lastAccessed
          }
        }
      }

      // Get any available organization
      const userOrgs = await this.getUserOrganizations(user.id)
      if (userOrgs.length > 0) {
        const firstOrg = userOrgs[0]
        return {
          url: `/organizations/${firstOrg.id}/dashboard`,
          reason: 'First available organization',
          organizationContext: firstOrg.id,
          metadata: {
            organizationName: firstOrg.name,
            totalOrganizations: userOrgs.length
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error getting best organization destination:', error)
      return null
    }
  }

  /**
   * Gets organization-specific destination based on user role
   */
  async getOrganizationDestination(organizationId: string, user: User, userRole?: string): Promise<string> {
    try {
      // Customize destination based on user role
      switch (userRole) {
        case 'admin':
        case 'owner':
          return `/organizations/${organizationId}/admin`
        case 'manager':
          return `/organizations/${organizationId}/manage`
        case 'member':
        default:
          return `/organizations/${organizationId}/dashboard`
      }
    } catch (error) {
      console.error('Error getting organization destination:', error)
      return `/organizations/${organizationId}/dashboard`
    }
  }

  /**
   * Gets the last visited destination if valid and recent
   */
  async getLastVisitedDestination(user: User): Promise<AuthDestination | null> {
    try {
      const lastVisited = user.preferences?.lastVisitedPath
      const lastVisitedTime = user.preferences?.lastVisitedAt

      if (!lastVisited || !lastVisitedTime) {
        return null
      }

      // Check if last visit was recent (within 7 days)
      const lastVisitDate = new Date(lastVisitedTime)
      const daysSinceLastVisit = (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceLastVisit > 7) {
        return null
      }

      // Validate the last visited path
      const validation = await this.validateRedirectUrl(lastVisited, { user })
      if (validation.isValid && validation.sanitizedUrl) {
        return {
          url: validation.sanitizedUrl,
          reason: 'Last visited path (recent)',
          metadata: {
            lastVisitedAt: lastVisitedTime,
            daysSince: Math.round(daysSinceLastVisit)
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error getting last visited destination:', error)
      return null
    }
  }

  /**
   * Gets personalized dashboard based on user preferences and activity
   */
  async getPersonalizedDashboard(user: User): Promise<AuthDestination> {
    try {
      // Check user preferences for default dashboard
      const preferredDashboard = user.preferences?.defaultDashboard

      if (preferredDashboard && typeof preferredDashboard === 'string') {
        // Validate preferred dashboard path
        const validation = await this.validateRedirectUrl(preferredDashboard, { user })
        if (validation.isValid && validation.sanitizedUrl) {
          return {
            url: validation.sanitizedUrl,
            reason: 'User preferred dashboard',
            metadata: {
              isPersonalized: true,
              preferenceSet: true
            }
          }
        }
      }

      // Default to standard dashboard
      return {
        url: '/dashboard',
        reason: 'Default dashboard',
        metadata: {
          isPersonalized: false,
          isDefault: true
        }
      }
    } catch (error) {
      console.error('Error getting personalized dashboard:', error)
      return {
        url: '/dashboard',
        reason: 'Fallback dashboard',
        metadata: {
          error: true
        }
      }
    }
  }

  /**
   * Gets the most recently accessed organization for a user
   */
  async getMostRecentOrganization(userId: string): Promise<any> {
    try {
      const { data: membership } = await this.supabase
        .from('organization_memberships')
        .select(`
          organization:organizations (*),
          updated_at
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (membership?.organization) {
        return {
          ...membership.organization,
          lastAccessed: membership.updated_at
        }
      }

      return null
    } catch (error) {
      console.error('Error getting most recent organization:', error)
      return null
    }
  }

  /**
   * Logs routing decisions for analytics and security monitoring
   */
  async logRoutingDecision(
    userId: string,
    decision: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: `auth.routing.${decision}`,
          resource_type: 'authentication',
          resource_id: userId,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            service: 'AuthRouterService'
          }
        })
    } catch (error) {
      console.error('Failed to log routing decision:', error)
      // Don't throw error for logging failures
    }
  }

  /**
   * Updates user's onboarding progress
   */
  async updateOnboardingProgress(
    userId: string, 
    step: string, 
    completed: boolean = true
  ): Promise<void> {
    try {
      const userResult = await userService.getUser(userId)
      if (userResult.error || !userResult.data) {
        throw new Error('User not found')
      }

      const user = userResult.data
      const preferences = user.preferences || {}
      const onboardingSteps = preferences.onboardingSteps || {}

      // Update the specific step
      onboardingSteps[step] = completed

      // Check if all steps are completed
      const allSteps = ['profile', 'organization', 'team', 'preferences', 'tutorial']
      const allCompleted = allSteps.every(s => onboardingSteps[s] === true)

      const updatedPreferences = {
        ...preferences,
        onboardingSteps,
        onboardingCompleted: allCompleted,
        lastOnboardingUpdate: new Date().toISOString()
      }

      await userService.updateUserPreferences(userId, updatedPreferences)
    } catch (error) {
      console.error('Error updating onboarding progress:', error)
      throw error
    }
  }

  /**
   * Completes the onboarding process for a user
   * Enhanced with integration to the comprehensive onboarding system
   */
  async completeOnboarding(userId: string): Promise<void> {
    try {
      const userResult = await userService.getUser(userId)
      if (userResult.error || !userResult.data) {
        throw new Error('User not found')
      }

      const user = userResult.data
      const preferences = user.preferences || {}

      // Update local preferences
      const updatedPreferences = {
        ...preferences,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
        onboardingSteps: {
          profile: true,
          organization: true,
          team: true,
          preferences: true,
          tutorial: true
        }
      }

      await userService.updateUserPreferences(userId, updatedPreferences)

      // Synchronize with integrated onboarding system
      try {
        const { authOnboardingIntegration } = await import('./auth-onboarding-integration')
        await authOnboardingIntegration.synchronizeOnboardingState(userId)
      } catch (error) {
        console.error('Error synchronizing with integrated onboarding system:', error)
        // Don't throw - the main onboarding completion should still succeed
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
      throw error
    }
  }

  /**
   * Resets onboarding progress for a user (admin function)
   */
  async resetOnboarding(userId: string): Promise<void> {
    try {
      const userResult = await userService.getUser(userId)
      if (userResult.error || !userResult.data) {
        throw new Error('User not found')
      }

      const user = userResult.data
      const preferences = user.preferences || {}

      const updatedPreferences = {
        ...preferences,
        onboardingCompleted: false,
        onboardingSteps: {},
        onboardingResetAt: new Date().toISOString()
      }

      await userService.updateUserPreferences(userId, updatedPreferences)
    } catch (error) {
      console.error('Error resetting onboarding:', error)
      throw error
    }
  }
}

// Export singleton instance
export const authRouterService = new AuthRouterService()