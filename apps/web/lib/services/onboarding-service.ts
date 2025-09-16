/**
 * Onboarding Service - Core onboarding functionality with session management and path orchestration
 * Requirements: 1.1, 1.2, 3.1, 10.1, 10.2
 */

import { createSupabaseClient } from '@/lib/database'
import { DatabaseError, NotFoundError, ValidationError, ErrorCode } from '@/lib/errors'
import { PathEngine, type UserBehavior } from './path-engine'
import { ProgressTrackerService } from './progress-tracker-service'
import type {
  OnboardingSession,
  OnboardingSessionInsert,
  OnboardingSessionUpdate,
  OnboardingSessionRow,
  OnboardingPath,
  OnboardingPathRow,
  OnboardingStep,
  OnboardingStepRow,
  OnboardingContext,
  OnboardingProgress,
  UserProgressRow,
  OnboardingAnalytics,
  OnboardingAnalyticsInsert,
  StepResult
} from '@/lib/models'

export class OnboardingService {
  private static getSupabase() {
    return createSupabaseClient()
  }

  /**
   * Initialize a new onboarding session for a user with personalized path generation
   */
  static async initializeOnboarding(
    userId: string,
    context: OnboardingContext
  ): Promise<OnboardingSession> {
    try {
      // Generate personalized onboarding path using PathEngine
      const path = await PathEngine.generatePersonalizedPath(userId, context)
      
      if (!path) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'No suitable onboarding path found for user context')
      }

      // Determine the first step
      const firstStep = path.steps?.find(step => step.step_order === 0) || path.steps?.[0]

      // Create the onboarding session
      const sessionData: OnboardingSessionInsert = {
        user_id: userId,
        organization_id: context.organizationId || null,
        path_id: path.id,
        session_type: await this.determineSessionType(userId, context),
        status: 'active',
        current_step_id: firstStep?.id || null,
        current_step_index: 0,
        progress_percentage: 0,
        time_spent: 0,
        started_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        completed_at: null,
        paused_at: null,
        session_metadata: {
          pathGenerated: true,
          generationTimestamp: new Date().toISOString(),
          userContext: context
        },
        preferences: context.preferences || {}
      }

      const { data: session, error } = await this.getSupabase()
        .from('onboarding_sessions')
        .insert(sessionData)
        .select(`
          *,
          users!inner(id, email, first_name, last_name),
          organizations(id, name, slug),
          onboarding_paths(*)
        `)
        .single()

      if (error) {
        throw new DatabaseError('Failed to create onboarding session', error)
      }

      // Initialize progress tracking for the first step
      if (firstStep) {
        await ProgressTrackerService.trackStepProgress(session.id, firstStep.id, userId, {
          status: 'not_started',
          started_at: null
        })
      }

      // Log analytics event
      await this.logAnalyticsEvent({
        organization_id: context.organizationId || null,
        session_id: session.id,
        user_id: userId,
        event_type: 'session_start',
        event_data: { 
          path_id: path.id, 
          session_type: sessionData.session_type,
          personalized: true,
          first_step_id: firstStep?.id
        },
        path_id: path.id,
        step_id: firstStep?.id || null,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      })

      return this.transformSessionRow(session)
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to initialize onboarding')
    }
  }

  /**
   * Get onboarding session by ID
   */
  static async getOnboardingSession(sessionId: string): Promise<OnboardingSession | null> {
    try {
      const { data: session, error } = await this.getSupabase()
        .from('onboarding_sessions')
        .select(`
          *,
          users!inner(id, email, first_name, last_name),
          organizations(id, name, slug),
          onboarding_paths(*),
          onboarding_steps!onboarding_sessions_current_step_id_fkey(*)
        `)
        .eq('id', sessionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new DatabaseError('Failed to fetch onboarding session', error)
      }

      return this.transformSessionRow(session)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get onboarding session', 'getOnboardingSession', { originalError: error })
    }
  }

  /**
   * Update onboarding session progress
   */
  static async updateOnboardingProgress(
    sessionId: string,
    progress: Partial<OnboardingSessionUpdate>
  ): Promise<OnboardingSession> {
    try {
      const updateData: Partial<OnboardingSessionUpdate> = {
        ...progress,
        last_active_at: new Date().toISOString()
      }

      const { data: session, error } = await this.getSupabase()
        .from('onboarding_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`
          *,
          users!inner(id, email, first_name, last_name),
          organizations(id, name, slug),
          onboarding_paths(*)
        `)
        .single()

      if (error) {
        throw new DatabaseError('Failed to update onboarding progress', error)
      }

      // Log analytics event
      await this.logAnalyticsEvent({
        organization_id: session.organization_id,
        session_id: sessionId,
        user_id: session.user_id,
        event_type: 'progress_update',
        event_data: progress,
        path_id: session.path_id,
        step_id: session.current_step_id,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      })

      return this.transformSessionRow(session)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to update onboarding progress', 'updateOnboardingProgress', { originalError: error })
    }
  }

  /**
   * Get user's current onboarding sessions
   */
  static async getUserOnboardingSessions(userId: string): Promise<OnboardingSession[]> {
    try {
      const { data: sessions, error } = await this.getSupabase()
        .from('onboarding_sessions')
        .select(`
          *,
          users!inner(id, email, first_name, last_name),
          organizations(id, name, slug),
          onboarding_paths(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new DatabaseError('Failed to fetch user onboarding sessions', error)
      }

      return sessions.map((session: any) => this.transformSessionRow(session))
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get user onboarding sessions', 'getUserOnboardingSessions', { originalError: error })
    }
  }

  /**
   * Get onboarding path by ID with steps
   */
  static async getOnboardingPath(pathId: string): Promise<OnboardingPath | null> {
    try {
      const { data: path, error } = await this.getSupabase()
        .from('onboarding_paths')
        .select(`
          *,
          onboarding_steps(*)
        `)
        .eq('id', pathId)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new DatabaseError('Failed to fetch onboarding path', error)
      }

      return this.transformPathRow(path)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get onboarding path', 'getOnboardingPath', { originalError: error })
    }
  }

  /**
   * Get available onboarding paths for user context
   */
  static async getAvailableOnboardingPaths(context: OnboardingContext): Promise<OnboardingPath[]> {
    try {
      let query = this.getSupabase()
        .from('onboarding_paths')
        .select('*')
        .eq('is_active', true)

      // Filter by target role if specified
      if (context.userRole) {
        query = query.eq('target_role', context.userRole)
      }

      // Filter by subscription tier if specified
      if (context.subscriptionTier) {
        query = query.or(`subscription_tier.is.null,subscription_tier.eq.${context.subscriptionTier}`)
      }

      const { data: paths, error } = await query.order('name')

      if (error) {
        throw new DatabaseError('Failed to fetch onboarding paths', error)
      }

      return paths.map((path: any) => this.transformPathRow(path))
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get available onboarding paths', 'getAvailableOnboardingPaths', { originalError: error })
    }
  }

  /**
   * Complete onboarding session
   */
  static async completeOnboardingSession(sessionId: string): Promise<OnboardingSession> {
    try {
      const updateData: Partial<OnboardingSessionUpdate> = {
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      }

      const { data: session, error } = await this.getSupabase()
        .from('onboarding_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`
          *,
          users!inner(id, email, first_name, last_name),
          organizations(id, name, slug),
          onboarding_paths(*)
        `)
        .single()

      if (error) {
        throw new DatabaseError('Failed to complete onboarding session', error)
      }

      // Log completion analytics event
      await this.logAnalyticsEvent({
        organization_id: session.organization_id,
        session_id: sessionId,
        user_id: session.user_id,
        event_type: 'session_complete',
        event_data: { 
          total_time_spent: session.time_spent,
          completion_date: session.completed_at
        },
        path_id: session.path_id,
        step_id: null,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      })

      return this.transformSessionRow(session)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to complete onboarding session', 'completeOnboardingSession', { originalError: error })
    }
  }

  /**
   * Pause onboarding session
   */
  static async pauseOnboardingSession(sessionId: string): Promise<OnboardingSession> {
    try {
      const updateData: Partial<OnboardingSessionUpdate> = {
        status: 'paused',
        paused_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      }

      const { data: session, error } = await this.getSupabase()
        .from('onboarding_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`
          *,
          users!inner(id, email, first_name, last_name),
          organizations(id, name, slug),
          onboarding_paths(*)
        `)
        .single()

      if (error) {
        throw new DatabaseError('Failed to pause onboarding session', error)
      }

      return this.transformSessionRow(session)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to pause onboarding session', 'pauseOnboardingSession', { originalError: error })
    }
  }

  /**
   * Resume onboarding session with context preservation
   */
  static async resumeOnboardingSession(sessionId: string): Promise<OnboardingSession> {
    try {
      // Get current session state
      const currentSession = await this.getOnboardingSession(sessionId)
      if (!currentSession) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Onboarding session not found')
      }

      if (currentSession.status !== 'paused') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Session is not in paused state')
      }

      const updateData: Partial<OnboardingSessionUpdate> = {
        status: 'active',
        paused_at: null,
        last_active_at: new Date().toISOString(),
        session_metadata: {
          ...currentSession.session_metadata,
          resumedAt: new Date().toISOString(),
          pauseDuration: currentSession.paused_at ? 
            Date.now() - new Date(currentSession.paused_at).getTime() : 0
        }
      }

      const { data: session, error } = await this.getSupabase()
        .from('onboarding_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`
          *,
          users!inner(id, email, first_name, last_name),
          organizations(id, name, slug),
          onboarding_paths(*)
        `)
        .single()

      if (error) {
        throw new DatabaseError('Failed to resume onboarding session', error)
      }

      // Log analytics event
      await this.logAnalyticsEvent({
        organization_id: session.organization_id,
        session_id: sessionId,
        user_id: session.user_id,
        event_type: 'session_resumed',
        event_data: { 
          pause_duration: updateData.session_metadata?.pauseDuration,
          current_step: session.current_step_id
        },
        path_id: session.path_id,
        step_id: session.current_step_id,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      })

      return this.transformSessionRow(session)
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ValidationError) {
        throw error
      }
      throw new DatabaseError('Failed to resume onboarding session', 'resumeOnboardingSession', { originalError: error })
    }
  }

  /**
   * Record step completion and advance to next step
   */
  static async recordStepCompletion(
    sessionId: string,
    stepId: string,
    result: StepResult
  ): Promise<{
    session: OnboardingSession
    nextStep: OnboardingStep | null
    isPathComplete: boolean
  }> {
    try {
      const session = await this.getOnboardingSession(sessionId)
      if (!session) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Onboarding session not found')
      }

      // Record the step completion using ProgressTrackerService
      await ProgressTrackerService.recordStepCompletion(sessionId, stepId, session.user_id, result)

      // Get updated progress
      const progress = await ProgressTrackerService.getOverallProgress(sessionId)

      // Determine next step using PathEngine
      const currentProgress = await this.getUserProgress(sessionId)
      const nextStep = await PathEngine.getNextStep(sessionId, currentProgress)

      // Update session with new current step and progress
      const updateData: Partial<OnboardingSessionUpdate> = {
        current_step_id: nextStep?.id || null,
        current_step_index: nextStep ? nextStep.step_order : session.current_step_index,
        progress_percentage: progress.overallProgress,
        time_spent: progress.timeSpent,
        last_active_at: new Date().toISOString()
      }

      // Check if path is complete
      const isPathComplete = !nextStep && progress.overallProgress >= 100

      if (isPathComplete) {
        updateData.status = 'completed'
        updateData.completed_at = new Date().toISOString()
      }

      const { data: updatedSession, error } = await this.getSupabase()
        .from('onboarding_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`
          *,
          users!inner(id, email, first_name, last_name),
          organizations(id, name, slug),
          onboarding_paths(*)
        `)
        .single()

      if (error) {
        throw new DatabaseError('Failed to update session after step completion', error)
      }

      // Log analytics event
      await this.logAnalyticsEvent({
        organization_id: session.organization_id,
        session_id: sessionId,
        user_id: session.user_id,
        event_type: isPathComplete ? 'path_completed' : 'step_completed',
        event_data: {
          completed_step_id: stepId,
          next_step_id: nextStep?.id,
          result,
          progress_percentage: progress.overallProgress
        },
        path_id: session.path_id,
        step_id: stepId,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      })

      return {
        session: this.transformSessionRow(updatedSession),
        nextStep,
        isPathComplete
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to record step completion', 'recordStepCompletion', { originalError: error })
    }
  }

  /**
   * Adapt onboarding path based on user behavior
   */
  static async adaptOnboardingPath(
    sessionId: string,
    userBehavior: UserBehavior
  ): Promise<{
    session: OnboardingSession
    pathAdjustment: any
    recommendedActions: string[]
  }> {
    try {
      const session = await this.getOnboardingSession(sessionId)
      if (!session) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Onboarding session not found')
      }

      // Use PathEngine to adapt the path
      const pathAdjustment = await PathEngine.adaptPath(sessionId, userBehavior)

      // Get recommended actions based on the adjustment
      const recommendedActions = this.getRecommendedActions(pathAdjustment)

      // Update session metadata with adaptation info
      const updateData: Partial<OnboardingSessionUpdate> = {
        session_metadata: {
          ...session.session_metadata,
          pathAdapted: true,
          adaptationTimestamp: new Date().toISOString(),
          adaptationReason: pathAdjustment.adjustmentReason,
          adaptationType: pathAdjustment.adjustmentType
        },
        last_active_at: new Date().toISOString()
      }

      const { data: updatedSession, error } = await this.getSupabase()
        .from('onboarding_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`
          *,
          users!inner(id, email, first_name, last_name),
          organizations(id, name, slug),
          onboarding_paths(*)
        `)
        .single()

      if (error) {
        throw new DatabaseError('Failed to update session after path adaptation', error)
      }

      // Log analytics event
      await this.logAnalyticsEvent({
        organization_id: session.organization_id,
        session_id: sessionId,
        user_id: session.user_id,
        event_type: 'path_adapted',
        event_data: {
          adjustment_type: pathAdjustment.adjustmentType,
          adjustment_reason: pathAdjustment.adjustmentReason,
          user_behavior: userBehavior,
          recommended_actions: recommendedActions
        },
        path_id: session.path_id,
        step_id: session.current_step_id,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      })

      return {
        session: this.transformSessionRow(updatedSession),
        pathAdjustment,
        recommendedActions
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to adapt onboarding path', 'adaptOnboardingPath', { originalError: error })
    }
  }

  /**
   * Get current user progress for a session
   */
  static async getUserProgress(sessionId: string): Promise<UserProgressRow[]> {
    try {
      const { data: progress, error } = await this.getSupabase()
        .from('user_progress')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at')

      if (error) {
        throw new DatabaseError('Failed to fetch user progress', error)
      }

      return progress || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get user progress', 'getUserProgress', { originalError: error })
    }
  }

  /**
   * Get onboarding path with personalization for user
   */
  static async getPersonalizedOnboardingPath(
    userId: string,
    context: OnboardingContext
  ): Promise<OnboardingPath> {
    try {
      return await PathEngine.generatePersonalizedPath(userId, context)
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to get personalized onboarding path', 'getPersonalizedOnboardingPath', { originalError: error })
    }
  }

  /**
   * Suggest alternative paths when user is struggling
   */
  static async suggestAlternativePaths(
    sessionId: string,
    issues: Array<{
      type: 'difficulty' | 'content_type' | 'pacing' | 'engagement'
      description: string
      severity: 'low' | 'medium' | 'high'
    }>
  ): Promise<Array<{
    pathId: string
    pathName: string
    reason: string
    estimatedDuration: number
    difficultyLevel: string
    focusAreas: string[]
  }>> {
    try {
      return await PathEngine.suggestAlternativePaths(sessionId, issues)
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to suggest alternative paths', 'suggestAlternativePaths', { originalError: error })
    }
  }

  /**
   * Switch to an alternative onboarding path
   */
  static async switchToAlternativePath(
    sessionId: string,
    newPathId: string,
    reason: string
  ): Promise<OnboardingSession> {
    try {
      const session = await this.getOnboardingSession(sessionId)
      if (!session) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Onboarding session not found')
      }

      // Get the new path
      const newPath = await this.getOnboardingPath(newPathId)
      if (!newPath) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Alternative path not found')
      }

      // Update session with new path
      const updateData: Partial<OnboardingSessionUpdate> = {
        path_id: newPathId,
        current_step_id: newPath.steps?.[0]?.id || null,
        current_step_index: 0,
        session_metadata: {
          ...session.session_metadata,
          pathSwitched: true,
          switchTimestamp: new Date().toISOString(),
          switchReason: reason,
          previousPathId: session.path_id
        },
        last_active_at: new Date().toISOString()
      }

      const { data: updatedSession, error } = await this.getSupabase()
        .from('onboarding_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`
          *,
          users!inner(id, email, first_name, last_name),
          organizations(id, name, slug),
          onboarding_paths(*)
        `)
        .single()

      if (error) {
        throw new DatabaseError('Failed to switch to alternative path', error)
      }

      // Log analytics event
      await this.logAnalyticsEvent({
        organization_id: session.organization_id,
        session_id: sessionId,
        user_id: session.user_id,
        event_type: 'path_switched',
        event_data: {
          previous_path_id: session.path_id,
          new_path_id: newPathId,
          switch_reason: reason
        },
        path_id: newPathId,
        step_id: newPath.steps?.[0]?.id || null,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      })

      return this.transformSessionRow(updatedSession)
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to switch to alternative path', 'switchToAlternativePath', { originalError: error })
    }
  }

  /**
   * Alias for pauseOnboardingSession - for test compatibility
   */
  static async pauseSession(sessionId: string): Promise<{ success: boolean; canResume: boolean }> {
    try {
      const session = await this.pauseOnboardingSession(sessionId)
      return {
        success: true,
        canResume: session.status === 'paused'
      }
    } catch (error) {
      return {
        success: false,
        canResume: false
      }
    }
  }

  /**
   * Complete a specific step in the onboarding process
   */
  static async completeStep(
    sessionId: string,
    stepId: string,
    result: StepResult
  ): Promise<{ success: boolean; nextStepId: string | null }> {
    try {
      await this.recordStepCompletion(sessionId, stepId, result)
      
      // Get the session to determine next step
      const session = await this.getOnboardingSession(sessionId)
      if (!session) {
        return { success: false, nextStepId: null }
      }

      // Find current step index and get next step
      const currentStepIndex = session.current_step_index || 0
      const nextStepIndex = currentStepIndex + 1
      const nextStep = session.path?.steps?.[nextStepIndex]

      return {
        success: true,
        nextStepId: nextStep?.id || null
      }
    } catch (error) {
      return { success: false, nextStepId: null }
    }
  }

  /**
   * Complete the entire onboarding process
   */
  static async completeOnboarding(sessionId: string): Promise<{ 
    success: boolean; 
    completionData: { certificateUrl?: string; achievements: string[] } 
  }> {
    try {
      const session = await this.completeOnboardingSession(sessionId)
      return {
        success: true,
        completionData: {
          certificateUrl: session.session_metadata?.completion_certificate_url as string,
          achievements: (session.session_metadata?.achievements as string[]) || []
        }
      }
    } catch (error) {
      return {
        success: false,
        completionData: { achievements: [] }
      }
    }
  }

  /**
   * Update session with new data
   */
  static async updateSession(
    sessionId: string,
    updates: Partial<OnboardingSessionUpdate>
  ): Promise<{ success: boolean }> {
    try {
      await this.updateOnboardingProgress(sessionId, updates)
      return { success: true }
    } catch (error) {
      return { success: false }
    }
  }

  /**
   * Skip a step in the onboarding process
   */
  static async skipStep(
    sessionId: string,
    stepId: string,
    reason?: string
  ): Promise<{ success: boolean; nextStepId: string | null }> {
    try {
      // Record the step as skipped
      const skipResult: StepResult = {
        stepId,
        status: 'skipped',
        timeSpent: 0,
        userActions: {},
        feedback: reason ? { rating: 0, comment: reason } : undefined
      }

      await this.recordStepCompletion(sessionId, stepId, skipResult)
      
      // Get the session to determine next step
      const session = await this.getOnboardingSession(sessionId)
      if (!session) {
        return { success: false, nextStepId: null }
      }

      // Find current step index and get next step
      const currentStepIndex = session.current_step_index || 0
      const nextStepIndex = currentStepIndex + 1
      const nextStep = session.path?.steps?.[nextStepIndex]

      return {
        success: true,
        nextStepId: nextStep?.id || null
      }
    } catch (error) {
      return { success: false, nextStepId: null }
    }
  }

  /**
   * Log analytics event
   */
  private static async logAnalyticsEvent(event: OnboardingAnalyticsInsert): Promise<void> {
    try {
      const { error } = await this.getSupabase()
        .from('onboarding_analytics')
        .insert(event)

      if (error) {
        // Log error but don't throw - analytics shouldn't break the main flow
        console.error('Failed to log onboarding analytics event:', error)
      }
    } catch (error) {
      console.error('Failed to log onboarding analytics event:', error)
    }
  }

  /**
   * Determine session type based on user context and organization role
   */
  private static async determineSessionType(
    userId: string,
    context: OnboardingContext
  ): Promise<'individual' | 'team_admin' | 'team_member'> {
    if (!context.organizationId) {
      return 'individual'
    }

    try {
      // Check user's role in the organization
      const { data: membership } = await this.getSupabase()
        .from('organization_memberships')
        .select(`
          role_id,
          roles(name, permissions)
        `)
        .eq('user_id', userId)
        .eq('organization_id', context.organizationId)
        .eq('status', 'active')
        .single()

      if (membership?.roles) {
        const roleName = membership.roles.name.toLowerCase()
        const permissions = membership.roles.permissions || []
        
        // Check if user has admin permissions
        if (roleName.includes('admin') || roleName.includes('owner') || 
            permissions.includes('organization.manage') || 
            permissions.includes('members.invite')) {
          return 'team_admin'
        }
      }

      return 'team_member'
    } catch (error) {
      // If we can't determine the role, default to team_member
      console.warn('Could not determine user role in organization:', error)
      return 'team_member'
    }
  }

  /**
   * Get recommended actions based on path adjustment
   */
  private static getRecommendedActions(pathAdjustment: any): string[] {
    const actions: string[] = []

    switch (pathAdjustment.adjustmentType) {
      case 'difficulty':
        actions.push('Consider providing additional support resources')
        actions.push('Offer one-on-one guidance sessions')
        actions.push('Break down complex steps into smaller tasks')
        break
      
      case 'pacing':
        if (pathAdjustment.adjustmentReason.includes('fast')) {
          actions.push('Provide advanced or accelerated content')
          actions.push('Offer optional deep-dive materials')
        } else if (pathAdjustment.adjustmentReason.includes('slow')) {
          actions.push('Allow more time for each step')
          actions.push('Provide additional practice exercises')
        }
        break
      
      case 'content_type':
        actions.push('Increase interactive elements')
        actions.push('Add multimedia content (videos, animations)')
        actions.push('Include hands-on exercises')
        break
      
      case 'engagement':
        actions.push('Add gamification elements')
        actions.push('Provide more frequent feedback')
        actions.push('Include social learning opportunities')
        break
      
      default:
        actions.push('Monitor user progress closely')
        actions.push('Be ready to provide additional support')
    }

    return actions
  }

  /**
   * Transform database row to OnboardingSession
   */
  private static transformSessionRow(row: any): OnboardingSession {
    return {
      id: row.id,
      user_id: row.user_id,
      organization_id: row.organization_id,
      path_id: row.path_id,
      session_type: row.session_type,
      status: row.status,
      current_step_id: row.current_step_id,
      current_step_index: row.current_step_index,
      progress_percentage: row.progress_percentage,
      time_spent: row.time_spent,
      started_at: row.started_at,
      last_active_at: row.last_active_at,
      completed_at: row.completed_at,
      paused_at: row.paused_at,
      session_metadata: row.session_metadata,
      preferences: row.preferences,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: row.users ? {
        id: row.users.id,
        email: row.users.email,
        first_name: row.users.first_name,
        last_name: row.users.last_name
      } : undefined,
      organization: row.organizations ? {
        id: row.organizations.id,
        name: row.organizations.name,
        slug: row.organizations.slug
      } : undefined,
      path: row.onboarding_paths ? this.transformPathRow(row.onboarding_paths) : undefined,
      current_step: row.onboarding_steps ? this.transformStepRow(row.onboarding_steps) : undefined
    }
  }

  /**
   * Transform database row to OnboardingPath
   */
  private static transformPathRow(row: any): OnboardingPath {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      target_role: row.target_role,
      subscription_tier: row.subscription_tier,
      estimated_duration: row.estimated_duration,
      is_active: row.is_active,
      prerequisites: row.prerequisites,
      learning_objectives: row.learning_objectives,
      success_criteria: row.success_criteria,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
      steps: row.onboarding_steps ? row.onboarding_steps.map((step: any) => this.transformStepRow(step)) : undefined
    }
  }

  /**
   * Transform database row to OnboardingStep
   */
  private static transformStepRow(row: any): OnboardingStep {
    return {
      id: row.id,
      path_id: row.path_id,
      title: row.title,
      description: row.description,
      step_type: row.step_type,
      step_order: row.step_order,
      estimated_time: row.estimated_time,
      is_required: row.is_required,
      dependencies: row.dependencies,
      content: row.content,
      interactive_elements: row.interactive_elements,
      success_criteria: row.success_criteria,
      validation_rules: row.validation_rules,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}