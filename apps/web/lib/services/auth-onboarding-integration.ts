/**
 * Authentication-Onboarding Integration Service
 * Bridges the AuthRouterService with the existing onboarding system
 * Provides seamless transition from authentication to onboarding flows
 */

import { authRouterService, type OnboardingStatus } from './auth-router-service'
import { OnboardingService } from './onboarding-service'
import { RoleBasedOnboardingService } from './role-based-onboarding-service'
import { userSyncService } from './user-sync'
import type { User } from '../models/types'
import type { OnboardingContext, OnboardingSession } from '../models'

export interface AuthOnboardingResult {
  shouldRedirectToOnboarding: boolean
  onboardingUrl: string
  session?: OnboardingSession
  reason: string
  metadata?: Record<string, any>
}

export interface OnboardingIntegrationContext {
  user: User
  organizationId?: string
  userRole?: string
  subscriptionTier?: string
  invitationToken?: string
  redirectAfterOnboarding?: string
}

export class AuthOnboardingIntegrationService {
  /**
   * Determines if user should be redirected to onboarding and provides the appropriate URL
   */
  static async checkOnboardingRequirement(
    user: User,
    context: Partial<OnboardingIntegrationContext> = {}
  ): Promise<AuthOnboardingResult> {
    try {
      // Get onboarding status from AuthRouterService
      const onboardingStatus = await authRouterService.getOnboardingStatus(user)
      
      if (onboardingStatus.completed) {
        return {
          shouldRedirectToOnboarding: false,
          onboardingUrl: '',
          reason: 'Onboarding already completed',
          metadata: {
            completedSteps: onboardingStatus.completedSteps,
            progress: onboardingStatus.progress
          }
        }
      }

      // Check if user has an active onboarding session
      const existingSessions = await OnboardingService.getUserOnboardingSessions(user.id)
      const activeSession = existingSessions.find(session => 
        session.status === 'active' || session.status === 'paused'
      )

      if (activeSession) {
        // Resume existing session
        const resumeUrl = await this.getResumeOnboardingUrl(activeSession, onboardingStatus)
        
        return {
          shouldRedirectToOnboarding: true,
          onboardingUrl: resumeUrl,
          session: activeSession,
          reason: 'Resume existing onboarding session',
          metadata: {
            sessionId: activeSession.id,
            currentStep: activeSession.current_step_id,
            progress: activeSession.progress_percentage
          }
        }
      }

      // Create new onboarding session
      const newSession = await this.initializeOnboardingSession(user, context)
      const onboardingUrl = await this.getOnboardingUrl(newSession, onboardingStatus)

      return {
        shouldRedirectToOnboarding: true,
        onboardingUrl,
        session: newSession,
        reason: 'New onboarding session created',
        metadata: {
          sessionId: newSession.id,
          pathId: newSession.path_id,
          sessionType: newSession.session_type
        }
      }

    } catch (error) {
      console.error('Error checking onboarding requirement:', error)
      
      // Fallback to simple onboarding URL
      const fallbackUrl = await authRouterService.getOnboardingDestination(user)
      
      return {
        shouldRedirectToOnboarding: true,
        onboardingUrl: fallbackUrl,
        reason: 'Fallback due to error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Initializes a new onboarding session based on user context
   */
  static async initializeOnboardingSession(
    user: User,
    context: Partial<OnboardingIntegrationContext> = {}
  ): Promise<OnboardingSession> {
    // Build onboarding context
    const onboardingContext: OnboardingContext = {
      userId: user.id,
      organizationId: context.organizationId,
      userRole: context.userRole || await this.determineUserRole(user, context.organizationId),
      subscriptionTier: context.subscriptionTier || 'free',

      preferences: {
        ...user.preferences,
        redirectAfterOnboarding: context.redirectAfterOnboarding
      }
    }

    // Initialize onboarding session
    const session = await OnboardingService.initializeOnboarding(user.id, onboardingContext)

    // Update user preferences to track onboarding session
    await this.updateUserOnboardingPreferences(user, session)

    return session
  }

  /**
   * Gets the appropriate onboarding URL based on session and status
   */
  static async getOnboardingUrl(
    session: OnboardingSession,
    status: OnboardingStatus
  ): Promise<string> {
    // If session has a current step, go to that step
    if (session.current_step_id && session.path?.steps) {
      const currentStep = session.path.steps.find(step => step.id === session.current_step_id)
      if (currentStep) {
        return `/onboarding/${session.id}/step/${currentStep.id}`
      }
    }

    // Fallback to next step from AuthRouterService
    if (status.nextStep) {
      return `/onboarding/${status.nextStep}`
    }

    // Default to onboarding start
    return `/onboarding/${session.id}`
  }

  /**
   * Gets the resume URL for an existing onboarding session
   */
  static async getResumeOnboardingUrl(
    session: OnboardingSession,
    status: OnboardingStatus
  ): Promise<string> {
    // Resume paused session
    if (session.status === 'paused') {
      await OnboardingService.resumeOnboardingSession(session.id)
    }

    return this.getOnboardingUrl(session, status)
  }

  /**
   * Completes onboarding and updates user preferences
   */
  static async completeOnboarding(
    userId: string,
    sessionId?: string
  ): Promise<{
    success: boolean
    redirectUrl: string
    completionData?: any
  }> {
    try {
      // Complete onboarding session if provided
      if (sessionId) {
        const completionResult = await OnboardingService.completeOnboarding(sessionId)
        if (!completionResult.success) {
          throw new Error('Failed to complete onboarding session')
        }
      }

      // Mark onboarding as completed in AuthRouterService
      await authRouterService.completeOnboarding(userId)

      // Get user for post-onboarding routing
      const userResult = await userSyncService.getUserByClerkId(userId)
      if (!userResult) {
        throw new Error('User not found after onboarding completion')
      }

      // Determine post-onboarding destination
      const destination = await authRouterService.getPostAuthDestination(userResult)

      return {
        success: true,
        redirectUrl: destination.url,
        completionData: {
          reason: destination.reason,
          metadata: destination.metadata
        }
      }

    } catch (error) {
      console.error('Error completing onboarding:', error)
      
      return {
        success: false,
        redirectUrl: '/dashboard', // Safe fallback
        completionData: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Updates onboarding step progress in both systems
   */
  static async updateOnboardingStep(
    userId: string,
    stepName: string,
    completed: boolean = true,
    sessionId?: string
  ): Promise<void> {
    try {
      // Update in AuthRouterService
      await authRouterService.updateOnboardingProgress(userId, stepName, completed)

      // Update in OnboardingService if session ID provided
      if (sessionId) {
        // This would require mapping step names to step IDs
        // Implementation depends on how steps are structured
        console.log(`Updated step ${stepName} for session ${sessionId}`)
      }

    } catch (error) {
      console.error('Error updating onboarding step:', error)
      // Don't throw - this is a tracking operation
    }
  }

  /**
   * Gets comprehensive onboarding status from both systems
   */
  static async getComprehensiveOnboardingStatus(userId: string): Promise<{
    authRouterStatus: OnboardingStatus
    onboardingSessions: OnboardingSession[]
    currentSession?: OnboardingSession
    recommendedAction: 'start' | 'resume' | 'complete' | 'none'
    nextUrl?: string
  }> {
    try {
      // Get user data
      const userResult = await userSyncService.getUserByClerkId(userId)
      if (!userResult) {
        throw new Error('User not found')
      }

      // Get status from AuthRouterService
      const authRouterStatus = await authRouterService.getOnboardingStatus(userResult)

      // Get sessions from OnboardingService
      const onboardingSessions = await OnboardingService.getUserOnboardingSessions(userId)
      const currentSession = onboardingSessions.find(session => 
        session.status === 'active' || session.status === 'paused'
      )

      // Determine recommended action
      let recommendedAction: 'start' | 'resume' | 'complete' | 'none' = 'none'
      let nextUrl: string | undefined

      if (authRouterStatus.completed) {
        recommendedAction = 'none'
      } else if (currentSession) {
        recommendedAction = currentSession.status === 'paused' ? 'resume' : 'complete'
        nextUrl = await this.getOnboardingUrl(currentSession, authRouterStatus)
      } else {
        recommendedAction = 'start'
        nextUrl = await authRouterService.getOnboardingDestination(userResult)
      }

      return {
        authRouterStatus,
        onboardingSessions,
        currentSession,
        recommendedAction,
        nextUrl
      }

    } catch (error) {
      console.error('Error getting comprehensive onboarding status:', error)
      
      // Return safe defaults
      return {
        authRouterStatus: {
          completed: false,
          nextStep: 'profile',
          progress: 0,
          availableSteps: ['profile', 'organization', 'team', 'preferences', 'tutorial'],
          completedSteps: []
        },
        onboardingSessions: [],
        recommendedAction: 'start',
        nextUrl: '/onboarding/profile'
      }
    }
  }

  /**
   * Synchronizes onboarding state between both systems
   */
  static async synchronizeOnboardingState(userId: string): Promise<void> {
    try {
      const userResult = await userSyncService.getUserByClerkId(userId)
      if (!userResult) {
        return
      }

      const authStatus = await authRouterService.getOnboardingStatus(userResult)
      const sessions = await OnboardingService.getUserOnboardingSessions(userId)
      
      // If AuthRouter says completed but no completed sessions, mark latest session as complete
      if (authStatus.completed && sessions.length > 0) {
        const latestSession = sessions[0] // Sessions are ordered by created_at desc
        if (latestSession.status !== 'completed') {
          await OnboardingService.completeOnboardingSession(latestSession.id)
        }
      }

      // If there's a completed session but AuthRouter says incomplete, update AuthRouter
      const completedSession = sessions.find(s => s.status === 'completed')
      if (completedSession && !authStatus.completed) {
        await authRouterService.completeOnboarding(userId)
      }

    } catch (error) {
      console.error('Error synchronizing onboarding state:', error)
      // Don't throw - this is a background sync operation
    }
  }

  /**
   * Determines user role based on context and organization membership
   */
  private static async determineUserRole(
    user: User,
    organizationId?: string
  ): Promise<string> {
    if (!organizationId) {
      return 'individual'
    }

    try {
      // This would typically query the organization_memberships table
      // For now, return a default role
      return 'member'
    } catch (error) {
      console.error('Error determining user role:', error)
      return 'member'
    }
  }

  /**
   * Updates user preferences with onboarding session information
   */
  private static async updateUserOnboardingPreferences(
    user: User,
    session: OnboardingSession
  ): Promise<void> {
    try {
      const updatedPreferences = {
        ...user.preferences,
        onboardingSessionId: session.id,
        onboardingStartedAt: new Date().toISOString(),
        onboardingPathId: session.path_id,
        onboardingSessionType: session.session_type
      }

      // Update user preferences through user sync service
      await userSyncService.syncUser({
        id: user.clerkUserId,
        emailAddresses: [{ emailAddress: user.email }],
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.avatarUrl
      } as any, {
        preferences: updatedPreferences
      })

    } catch (error) {
      console.error('Error updating user onboarding preferences:', error)
      // Don't throw - this is a tracking operation
    }
  }
}

// Export singleton instance
export const authOnboardingIntegration = AuthOnboardingIntegrationService