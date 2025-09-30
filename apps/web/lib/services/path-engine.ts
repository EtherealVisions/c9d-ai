/**
 * Path Engine - Generates personalized onboarding paths based on user context and preferences
 * Requirements: 1.1, 1.2, 3.1, 10.1, 10.2
 */

// Database client imported lazily to avoid build-time execution
import { DatabaseError, NotFoundError, ValidationError, ErrorCode } from '@/lib/errors'
import type {
  OnboardingPath,
  OnboardingStep,
  OnboardingContext,
  UserProgress,
  OnboardingSession,
  OnboardingAnalyticsInsert
} from '@/lib/models'

export interface UserBehavior {
  sessionId: string
  stepInteractions: Array<{
    stepId: string
    timeSpent: number
    attempts: number
    completionRate: number
    skipRate: number
    errorRate: number
  }>
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed'
  pacePreference: 'fast' | 'medium' | 'slow'
  engagementLevel: 'high' | 'medium' | 'low'
  strugglingAreas: string[]
  preferredContentTypes: string[]
}

export interface PathAdjustment {
  sessionId: string
  adjustmentType: 'content_type' | 'pacing' | 'difficulty' | 'sequence' | 'support'
  adjustmentReason: string
  originalPath: string[]
  adjustedPath: string[]
  metadata: Record<string, unknown>
}

export interface AlternativePath {
  pathId: string
  pathName: string
  reason: string
  estimatedDuration: number
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  focusAreas: string[]
}

export class PathEngine {
  private static getDatabase() {
    const { getDatabase } = require('@/lib/db/connection')
    return getDatabase()
  }

  /**
   * Generate a personalized onboarding path based on user context and preferences
   */
  static async generatePersonalizedPath(
    userId: string,
    context: OnboardingContext
  ): Promise<OnboardingPath> {
    try {
      // Get available paths that match the context
      const availablePaths = await this.getMatchingPaths(context)
      
      if (availablePaths.length === 0) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'No suitable onboarding paths found for user context')
      }

      // Get user's learning preferences and history
      const userProfile = await this.getUserLearningProfile(userId)
      
      // Score and rank paths based on user profile and context
      const scoredPaths = await this.scorePathsForUser(availablePaths, userProfile, context)
      
      // Select the best path
      const selectedPath = scoredPaths[0]
      
      // Customize the path based on user preferences
      const personalizedPath = await this.customizePathForUser(selectedPath, userProfile, context)
      
      // Log path generation analytics
      await this.logPathGenerationAnalytics(userId, context, selectedPath.id, personalizedPath)
      
      return personalizedPath
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to generate personalized path')
    }
  }

  /**
   * Adapt an existing path based on user behavior and progress patterns
   */
  static async adaptPath(
    sessionId: string,
    userBehavior: UserBehavior
  ): Promise<PathAdjustment> {
    try {
      // Get current session and path
      const session = await this.getSessionWithPath(sessionId)
      if (!session || !session.path) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Session or path not found')
      }

      // Analyze user behavior patterns
      const behaviorAnalysis = await this.analyzeBehaviorPatterns(userBehavior)
      
      // Determine necessary adjustments
      const adjustments = await this.determinePathAdjustments(session, behaviorAnalysis)
      
      if (adjustments.length === 0) {
        // No adjustments needed
        return {
          sessionId,
          adjustmentType: 'content_type',
          adjustmentReason: 'No adjustments needed - user is progressing well',
          originalPath: session.path.steps?.map(s => s.id) || [],
          adjustedPath: session.path.steps?.map(s => s.id) || [],
          metadata: { analysis: behaviorAnalysis }
        }
      }

      // Apply the most critical adjustment
      const primaryAdjustment = adjustments[0]
      const adjustedPath = await this.applyPathAdjustment(session, primaryAdjustment)
      
      // Update session with adjusted path if needed
      if (primaryAdjustment.requiresPathChange) {
        await this.updateSessionPath(sessionId, adjustedPath)
      }
      
      // Log adaptation analytics
      await this.logPathAdaptationAnalytics(sessionId, userBehavior, primaryAdjustment)
      
      return {
        sessionId,
        adjustmentType: primaryAdjustment.type,
        adjustmentReason: primaryAdjustment.reason,
        originalPath: session.path.steps?.map(s => s.id) || [],
        adjustedPath: adjustedPath.steps?.map(s => s.id) || [],
        metadata: {
          analysis: behaviorAnalysis,
          allAdjustments: adjustments
        }
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to adapt path')
    }
  }

  /**
   * Get the next step in the onboarding path based on current progress
   */
  static async getNextStep(
    sessionId: string,
    currentProgress: UserProgress[]
  ): Promise<OnboardingStep | null> {
    try {
      const session = await this.getSessionWithPath(sessionId)
      if (!session || !session.path?.steps) {
        return null
      }

      const steps = session.path.steps.sort((a, b) => a.step_order - b.step_order)
      const completedStepIds = currentProgress
        .filter(p => p.status === 'completed')
        .map(p => p.step_id)

      // Find the next incomplete step
      for (const step of steps) {
        if (!completedStepIds.includes(step.id)) {
          // Check if dependencies are met
          const dependenciesMet = step.dependencies.every(depId => 
            completedStepIds.includes(depId)
          )
          
          if (dependenciesMet) {
            return step
          }
        }
      }

      return null // All steps completed or no available steps
    } catch (error) {
      throw new DatabaseError('Failed to get next step')
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
  ): Promise<AlternativePath[]> {
    try {
      const session = await this.getSessionWithPath(sessionId)
      if (!session) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Session not found')
      }

      // Get user context from session
      const context: OnboardingContext = {
        userId: session.user_id,
        organizationId: session.organization_id || undefined,
        userRole: session.session_metadata?.userRole as string,
        subscriptionTier: session.session_metadata?.subscriptionTier as string,
        preferences: session.preferences
      }

      // Get alternative paths based on issues
      const alternatives: AlternativePath[] = []
      
      for (const issue of issues) {
        const pathSuggestions = await this.getPathsForIssue(context, issue)
        alternatives.push(...pathSuggestions)
      }

      // Remove duplicates and current path
      const uniqueAlternatives = alternatives.filter((alt, index, self) => 
        index === self.findIndex(a => a.pathId === alt.pathId) &&
        alt.pathId !== session.path_id
      )

      // Sort by relevance (high severity issues first, then by estimated duration)
      return uniqueAlternatives.sort((a, b) => {
        const aIssue = issues.find(i => a.reason.includes(i.type))
        const bIssue = issues.find(i => b.reason.includes(i.type))
        
        if (aIssue && bIssue) {
          const severityOrder = { high: 3, medium: 2, low: 1 }
          const severityDiff = severityOrder[bIssue.severity] - severityOrder[aIssue.severity]
          if (severityDiff !== 0) return severityDiff
        }
        
        return a.estimatedDuration - b.estimatedDuration
      })
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to suggest alternative paths')
    }
  }

  /**
   * Validate that a path is complete and properly configured
   */
  static async validatePathCompletion(sessionId: string): Promise<{
    isValid: boolean
    issues: string[]
    completionPercentage: number
    missingSteps: string[]
  }> {
    try {
      const session = await this.getSessionWithPath(sessionId)
      if (!session || !session.path) {
        return {
          isValid: false,
          issues: ['Session or path not found'],
          completionPercentage: 0,
          missingSteps: []
        }
      }

      const issues: string[] = []
      const steps = session.path.steps || []
      
      // Check if path has steps
      if (steps.length === 0) {
        issues.push('Path has no steps defined')
      }

      // Get user progress
      const { data: progressRecords } = await this.supabase
        .from('user_progress')
        .select('*')
        .eq('session_id', sessionId)

      const completedSteps = progressRecords?.filter((p: any) => p.status === 'completed') || []
      const completionPercentage = steps.length > 0 ? (completedSteps.length / steps.length) * 100 : 0

      // Check for missing required steps
      const requiredSteps = steps.filter(s => s.is_required)
      const completedStepIds = completedSteps.map((p: any) => p.step_id)
      const missingRequiredSteps = requiredSteps.filter(s => !completedStepIds.includes(s.id))

      if (missingRequiredSteps.length > 0) {
        issues.push(`Missing ${missingRequiredSteps.length} required steps`)
      }

      // Check for dependency issues
      for (const step of steps) {
        const unmetDependencies = step.dependencies.filter(depId => 
          !completedStepIds.includes(depId)
        )
        if (unmetDependencies.length > 0 && completedStepIds.includes(step.id)) {
          issues.push(`Step "${step.title}" completed without meeting dependencies`)
        }
      }

      return {
        isValid: issues.length === 0 && completionPercentage === 100,
        issues,
        completionPercentage,
        missingSteps: missingRequiredSteps.map(s => s.id)
      }
    } catch (error) {
      throw new DatabaseError('Failed to validate path completion')
    }
  }

  /**
   * Get paths that match the given context
   */
  private static async getMatchingPaths(context: OnboardingContext): Promise<OnboardingPath[]> {
    let query = this.supabase
      .from('onboarding_paths')
      .select(`
        *,
        onboarding_steps(*)
      `)
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
      throw new DatabaseError('Failed to fetch matching paths', error)
    }

    return paths?.map((path: any) => this.transformPathRow(path)) || []
  }

  /**
   * Get user's learning profile and preferences
   */
  private static async getUserLearningProfile(userId: string): Promise<{
    learningStyle: string
    pacePreference: string
    preferredContentTypes: string[]
    completedPaths: string[]
    strugglingAreas: string[]
    strengths: string[]
  }> {
    // Get user preferences
    const { data: user } = await this.supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single()

    // Get user's onboarding history
    const { data: sessions } = await this.supabase
      .from('onboarding_sessions')
      .select(`
        *,
        user_progress(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')

    // Analyze historical performance
    const completedPaths = sessions?.map((s: any) => s.path_id).filter(Boolean) || []
    const allProgress = sessions?.flatMap((s: any) => s.user_progress || []) || []
    
    // Determine struggling areas (steps with high failure/skip rates)
    const stepPerformance = new Map<string, { attempts: number, failures: number, skips: number }>()
    allProgress.forEach((progress: any) => {
      const current = stepPerformance.get(progress.step_id) || { attempts: 0, failures: 0, skips: 0 }
      current.attempts++
      if (progress.status === 'failed') current.failures++
      if (progress.status === 'skipped') current.skips++
      stepPerformance.set(progress.step_id, current)
    })

    const strugglingAreas = Array.from(stepPerformance.entries())
      .filter(([_, perf]) => (perf.failures + perf.skips) / perf.attempts > 0.3)
      .map(([stepId]) => stepId)

    const strengths = Array.from(stepPerformance.entries())
      .filter(([_, perf]) => perf.failures / perf.attempts < 0.1)
      .map(([stepId]) => stepId)

    return {
      learningStyle: user?.preferences?.learningStyle || 'mixed',
      pacePreference: user?.preferences?.pacePreference || 'medium',
      preferredContentTypes: user?.preferences?.preferredContentTypes || ['text', 'interactive'],
      completedPaths,
      strugglingAreas,
      strengths
    }
  }

  /**
   * Score paths based on user profile and context
   */
  private static async scorePathsForUser(
    paths: OnboardingPath[],
    userProfile: any,
    context: OnboardingContext
  ): Promise<OnboardingPath[]> {
    const scoredPaths = paths.map(path => {
      let score = 0

      // Base score for active paths
      score += 10

      // Bonus for matching user role exactly
      if (path.target_role === context.userRole) {
        score += 20
      }

      // Bonus for appropriate subscription tier
      if (!path.subscription_tier || path.subscription_tier === context.subscriptionTier) {
        score += 15
      }

      // Bonus for paths that avoid user's struggling areas
      const pathStepIds = path.steps?.map(s => s.id) || []
      const strugglingStepsInPath = pathStepIds.filter(id => userProfile.strugglingAreas.includes(id))
      score -= strugglingStepsInPath.length * 5

      // Bonus for paths that leverage user's strengths
      const strengthStepsInPath = pathStepIds.filter(id => userProfile.strengths.includes(id))
      score += strengthStepsInPath.length * 3

      // Adjust for estimated duration based on pace preference
      const durationScore = this.scoreDurationForPace(path.estimated_duration, userProfile.pacePreference)
      score += durationScore

      return { ...path, score }
    })

    return scoredPaths.sort((a, b) => (b as any).score - (a as any).score)
  }

  /**
   * Score duration based on user's pace preference
   */
  private static scoreDurationForPace(duration: number, pacePreference: string): number {
    switch (pacePreference) {
      case 'fast':
        return duration < 30 ? 10 : duration < 60 ? 5 : -5
      case 'slow':
        return duration > 90 ? 10 : duration > 60 ? 5 : -5
      case 'medium':
      default:
        return duration >= 30 && duration <= 90 ? 10 : 0
    }
  }

  /**
   * Customize path for specific user
   */
  private static async customizePathForUser(
    path: OnboardingPath,
    userProfile: any,
    context: OnboardingContext
  ): Promise<OnboardingPath> {
    // Clone the path to avoid modifying the original
    const customizedPath = { ...path }

    if (customizedPath.steps) {
      // Customize steps based on user preferences
      customizedPath.steps = customizedPath.steps.map(step => {
        const customizedStep = { ...step }

        // Adjust content based on learning style
        if (userProfile.learningStyle === 'visual' && step.content) {
          customizedStep.content = {
            ...step.content,
            emphasizeVisuals: true,
            includeImages: true,
            includeDiagrams: true
          }
        }

        // Adjust interactive elements based on preferences
        if (userProfile.preferredContentTypes.includes('interactive') && step.interactive_elements) {
          customizedStep.interactive_elements = {
            ...step.interactive_elements,
            enableInteractivity: true,
            includeHands0n: true
          }
        }

        return customizedStep
      })
    }

    return customizedPath
  }

  /**
   * Get session with path details
   */
  private static async getSessionWithPath(sessionId: string): Promise<OnboardingSession | null> {
    const { data: session, error } = await this.supabase
      .from('onboarding_sessions')
      .select(`
        *,
        onboarding_paths(
          *,
          onboarding_steps(*)
        )
      `)
      .eq('id', sessionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new DatabaseError('Failed to fetch session with path', error)
    }

    return this.transformSessionRow(session)
  }

  /**
   * Analyze user behavior patterns
   */
  private static async analyzeBehaviorPatterns(userBehavior: UserBehavior): Promise<{
    strugglingSteps: string[]
    preferredPace: string
    engagementTrend: string
    contentTypePreferences: string[]
    recommendedAdjustments: string[]
  }> {
    const strugglingSteps = userBehavior.stepInteractions
      .filter(interaction => interaction.errorRate > 0.3 || interaction.skipRate > 0.2)
      .map(interaction => interaction.stepId)

    const avgTimePerStep = userBehavior.stepInteractions.reduce((sum, interaction) => 
      sum + interaction.timeSpent, 0) / userBehavior.stepInteractions.length

    let preferredPace = 'medium'
    if (avgTimePerStep < 300) preferredPace = 'fast' // Less than 5 minutes per step
    else if (avgTimePerStep > 900) preferredPace = 'slow' // More than 15 minutes per step

    const engagementTrend = userBehavior.engagementLevel
    
    // Analyze content type preferences based on completion rates
    const contentTypePreferences = userBehavior.preferredContentTypes || ['text']

    const recommendedAdjustments = []
    if (strugglingSteps.length > 2) {
      recommendedAdjustments.push('reduce_difficulty')
    }
    if (userBehavior.engagementLevel === 'low') {
      recommendedAdjustments.push('increase_interactivity')
    }
    if (preferredPace !== 'medium') {
      recommendedAdjustments.push(`adjust_pacing_${preferredPace}`)
    }

    return {
      strugglingSteps,
      preferredPace,
      engagementTrend,
      contentTypePreferences,
      recommendedAdjustments
    }
  }

  /**
   * Determine necessary path adjustments
   */
  private static async determinePathAdjustments(
    session: OnboardingSession,
    behaviorAnalysis: any
  ): Promise<Array<{
    type: 'content_type' | 'pacing' | 'difficulty' | 'sequence' | 'support'
    reason: string
    priority: number
    requiresPathChange: boolean
  }>> {
    const adjustments = []

    // Check if user is struggling with difficulty
    if (behaviorAnalysis.strugglingSteps.length > 2) {
      adjustments.push({
        type: 'difficulty' as const,
        reason: `User struggling with ${behaviorAnalysis.strugglingSteps.length} steps`,
        priority: 1,
        requiresPathChange: true
      })
    }

    // Check if pacing needs adjustment
    if (behaviorAnalysis.preferredPace !== 'medium') {
      adjustments.push({
        type: 'pacing' as const,
        reason: `User prefers ${behaviorAnalysis.preferredPace} pace`,
        priority: 2,
        requiresPathChange: false
      })
    }

    // Check if engagement is low
    if (behaviorAnalysis.engagementTrend === 'low') {
      adjustments.push({
        type: 'content_type' as const,
        reason: 'Low engagement detected, need more interactive content',
        priority: 1,
        requiresPathChange: false
      })
    }

    return adjustments.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Apply path adjustment
   */
  private static async applyPathAdjustment(
    session: OnboardingSession,
    adjustment: any
  ): Promise<OnboardingPath> {
    if (!session.path) {
      throw new Error('Session path not found')
    }

    // For now, return the original path with metadata about the adjustment
    // In a full implementation, this would modify the path structure
    return {
      ...session.path,
      metadata: {
        ...session.path.metadata,
        adjustments: [adjustment]
      }
    }
  }

  /**
   * Update session with new path
   */
  private static async updateSessionPath(sessionId: string, newPath: OnboardingPath): Promise<void> {
    const { error } = await this.supabase
      .from('onboarding_sessions')
      .update({
        path_id: newPath.id,
        session_metadata: {
          pathAdjusted: true,
          adjustmentTimestamp: new Date().toISOString()
        }
      })
      .eq('id', sessionId)

    if (error) {
      throw new DatabaseError('Failed to update session path', error)
    }
  }

  /**
   * Get paths suitable for addressing specific issues
   */
  private static async getPathsForIssue(
    context: OnboardingContext,
    issue: { type: string; severity: string }
  ): Promise<AlternativePath[]> {
    // This would query for paths that address specific issues
    // For now, return a basic implementation
    const { data: paths } = await this.supabase
      .from('onboarding_paths')
      .select('*')
      .eq('is_active', true)
      .limit(3)

    return paths?.map((path: any) => ({
      pathId: path.id,
      pathName: path.name,
      reason: `Alternative path to address ${issue.type} issues`,
      estimatedDuration: path.estimated_duration,
      difficultyLevel: 'beginner' as const,
      focusAreas: [issue.type]
    })) || []
  }

  /**
   * Log path generation analytics
   */
  private static async logPathGenerationAnalytics(
    userId: string,
    context: OnboardingContext,
    selectedPathId: string,
    personalizedPath: OnboardingPath
  ): Promise<void> {
    try {
      const event: OnboardingAnalyticsInsert = {
        organization_id: context.organizationId || null,
        session_id: null,
        user_id: userId,
        event_type: 'path_generated',
        event_data: {
          selected_path_id: selectedPathId,
          context,
          customizations: personalizedPath.metadata
        },
        path_id: selectedPathId,
        step_id: null,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      }

      await this.supabase.from('onboarding_analytics').insert(event)
    } catch (error) {
      console.error('Failed to log path generation analytics:', error)
    }
  }

  /**
   * Log path adaptation analytics
   */
  private static async logPathAdaptationAnalytics(
    sessionId: string,
    userBehavior: UserBehavior,
    adjustment: any
  ): Promise<void> {
    try {
      const event: OnboardingAnalyticsInsert = {
        organization_id: null,
        session_id: sessionId,
        user_id: null,
        event_type: 'path_adapted',
        event_data: {
          adjustment_type: adjustment.type,
          adjustment_reason: adjustment.reason,
          user_behavior: userBehavior
        },
        path_id: null,
        step_id: null,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      }

      await this.supabase.from('onboarding_analytics').insert(event)
    } catch (error) {
      console.error('Failed to log path adaptation analytics:', error)
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
      steps: row.onboarding_steps ? row.onboarding_steps.map((step: any) => ({
        id: step.id,
        path_id: step.path_id,
        title: step.title,
        description: step.description,
        step_type: step.step_type,
        step_order: step.step_order,
        estimated_time: step.estimated_time,
        is_required: step.is_required,
        dependencies: step.dependencies,
        content: step.content,
        interactive_elements: step.interactive_elements,
        success_criteria: step.success_criteria,
        validation_rules: step.validation_rules,
        metadata: step.metadata,
        created_at: step.created_at,
        updated_at: step.updated_at
      })) : undefined
    }
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
      path: row.onboarding_paths ? this.transformPathRow(row.onboarding_paths) : undefined
    }
  }
}