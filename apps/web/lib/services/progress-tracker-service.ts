/**
 * Progress Tracker Service - Tracks user progress through onboarding steps
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

// Database client imported lazily to avoid build-time execution
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors'
import type {
  UserProgress,
  UserProgressInsert,
  UserProgressUpdate,
  UserProgressRow,
  StepResult,
  OnboardingProgress,
  UserAchievementRow,
  UserAchievementInsert,
  OnboardingMilestoneRow,
  OnboardingAnalyticsInsert
} from '@/lib/models'

export class ProgressTrackerService {
  private static getSupabase() {
    return createSupabaseClient()
  }

  /**
   * Track progress for a specific step
   */
  static async trackStepProgress(
    sessionId: string,
    stepId: string,
    userId: string,
    progress: Partial<UserProgressUpdate>
  ): Promise<UserProgress> {
    try {
      // Check if progress record exists
      const { data: existing } = await this.getSupabase()
        .from('user_progress')
        .select('*')
        .eq('session_id', sessionId)
        .eq('step_id', stepId)
        .single()

      let result
      if (existing) {
        // Update existing progress
        const updateData: Partial<UserProgressUpdate> = {
          ...progress
        }

        const { data, error } = await this.getSupabase()
          .from('user_progress')
          .update(updateData)
          .eq('session_id', sessionId)
          .eq('step_id', stepId)
          .select(`
            *,
            onboarding_steps(*),
            onboarding_sessions(*)
          `)
          .single()

        if (error) {
          throw new DatabaseError('Failed to update step progress', error)
        }
        result = data
      } else {
        // Create new progress record
        const insertData: UserProgressInsert = {
          session_id: sessionId,
          step_id: stepId,
          user_id: userId,
          status: 'not_started',
          started_at: null,
          completed_at: null,
          time_spent: 0,
          attempts: 0,
          score: null,
          feedback: {},
          user_actions: {},
          step_result: {},
          errors: {},
          achievements: {},
          ...progress
        }

        const { data, error } = await this.getSupabase()
          .from('user_progress')
          .insert(insertData)
          .select(`
            *,
            onboarding_steps(*),
            onboarding_sessions(*)
          `)
          .single()

        if (error) {
          throw new DatabaseError('Failed to create step progress', error)
        }
        result = data
      }

      // Log analytics event
      await this.logProgressAnalytics(sessionId, stepId, userId, progress)

      return this.transformProgressRow(result)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to track step progress', 'trackStepProgress', { originalError: error })
    }
  }

  /**
   * Start tracking a step (when user begins a step)
   */
  static async startStep(
    sessionId: string,
    stepId: string,
    userId: string
  ): Promise<UserProgress> {
    return this.trackStepProgress(sessionId, stepId, userId, {
      status: 'in_progress',
      started_at: new Date().toISOString(),
      attempts: 1
    })
  }

  /**
   * Update step progress with time tracking
   */
  static async updateStepProgress(
    sessionId: string,
    stepId: string,
    userId: string,
    timeSpent: number,
    userActions: Record<string, unknown> = {}
  ): Promise<UserProgress> {
    return this.trackStepProgress(sessionId, stepId, userId, {
      time_spent: timeSpent,
      user_actions: userActions,
      status: 'in_progress'
    })
  }

  /**
   * Skip a step with reason tracking
   */
  static async skipStep(
    sessionId: string,
    stepId: string,
    userId: string,
    reason: string = 'user_choice'
  ): Promise<UserProgress> {
    return this.trackStepProgress(sessionId, stepId, userId, {
      status: 'skipped',
      completed_at: new Date().toISOString(),
      step_result: { skip_reason: reason }
    })
  }

  /**
   * Mark step as failed with error details
   */
  static async failStep(
    sessionId: string,
    stepId: string,
    userId: string,
    errors: Record<string, unknown>,
    attempts: number = 1
  ): Promise<UserProgress> {
    return this.trackStepProgress(sessionId, stepId, userId, {
      status: 'failed',
      errors,
      attempts,
      completed_at: new Date().toISOString()
    })
  }

  /**
   * Record step completion
   */
  static async recordStepCompletion(
    sessionId: string,
    stepId: string,
    userId: string,
    result: StepResult
  ): Promise<UserProgress> {
    try {
      const completionData: Partial<UserProgressUpdate> = {
        status: result.status,
        completed_at: result.status === 'completed' ? new Date().toISOString() : null,
        time_spent: result.timeSpent,
        user_actions: result.userActions,
        feedback: result.feedback || {},
        step_result: result.achievements || {},
        errors: result.errors || {},
        achievements: result.achievements || {}
      }

      const progress = await this.trackStepProgress(sessionId, stepId, userId, completionData)

      // Check for milestone achievements
      if (result.status === 'completed') {
        await this.checkAndAwardMilestones(sessionId, stepId, userId)
      }

      // Update overall session progress
      await this.updateSessionProgress(sessionId)

      return progress
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to record step completion', 'recordStepCompletion', { originalError: error })
    }
  }

  /**
   * Get overall progress for a session
   */
  static async getOverallProgress(sessionId: string): Promise<OnboardingProgress> {
    try {
      // Get session details
      const { data: session, error: sessionError } = await this.getSupabase()
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

      if (sessionError) {
        throw new DatabaseError('Failed to fetch session details', sessionError)
      }

      // Get all progress records for the session
      const { data: progressRecords, error: progressError } = await this.getSupabase()
        .from('user_progress')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at')

      if (progressError) {
        throw new DatabaseError('Failed to fetch progress records', progressError)
      }

      // Get user achievements for the session
      const { data: achievements, error: achievementsError } = await this.getSupabase()
        .from('user_achievements')
        .select('*')
        .eq('session_id', sessionId)
        .order('earned_at')

      if (achievementsError) {
        throw new DatabaseError('Failed to fetch achievements', achievementsError)
      }

      // Calculate progress metrics
      const totalSteps = session.onboarding_paths?.onboarding_steps?.length || 0
      const completedSteps = progressRecords.filter((p: any) => p.status === 'completed')
      const skippedSteps = progressRecords.filter((p: any) => p.status === 'skipped')
      const totalTimeSpent = progressRecords.reduce((sum: number, p: any) => sum + (p.time_spent || 0), 0)
      const overallProgress = totalSteps > 0 ? (completedSteps.length / totalSteps) * 100 : 0

      return {
        sessionId,
        currentStepIndex: session.current_step_index,
        completedSteps: completedSteps.map((p: any) => p.step_id),
        skippedSteps: skippedSteps.map((p: any) => p.step_id),
        milestones: achievements || [],
        overallProgress: Math.round(overallProgress * 100) / 100,
        timeSpent: totalTimeSpent,
        lastUpdated: session.updated_at
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get overall progress', 'getOverallProgress', { originalError: error })
    }
  }

  /**
   * Identify blockers in user progress with advanced analytics
   */
  static async identifyBlockers(sessionId: string): Promise<Array<{
    stepId: string
    stepTitle: string
    blockerType: 'technical' | 'content' | 'user_understanding' | 'system' | 'engagement' | 'time_pressure'
    description: string
    frequency: number
    suggestedResolution: string
    severity: 'low' | 'medium' | 'high'
    impact: 'low' | 'medium' | 'high'
    timeStuck: number
    patterns: string[]
  }>> {
    try {
      // Get progress records with detailed analysis
      const { data: progressRecords, error } = await this.getSupabase()
        .from('user_progress')
        .select(`
          *,
          onboarding_steps(id, title, step_type, estimated_time)
        `)
        .eq('session_id', sessionId)
        .order('created_at')

      if (error) {
        throw new DatabaseError('Failed to fetch progress records for blocker analysis', error)
      }

      const blockers = []
      const now = new Date().getTime()

      for (const record of progressRecords) {
        const blocker = this.analyzeStepBlocker(record, now)
        if (blocker) {
          blockers.push(blocker)
        }
      }

      // Analyze patterns across all steps
      const patterns = this.identifyProgressPatterns(progressRecords)
      
      // Add pattern-based blockers
      for (const pattern of patterns) {
        if (pattern.isBlocker) {
          blockers.push({
            stepId: 'pattern_based',
            stepTitle: 'Overall Progress Pattern',
            blockerType: pattern.type,
            description: pattern.description,
            frequency: pattern.frequency,
            suggestedResolution: pattern.resolution,
            severity: pattern.severity,
            impact: pattern.impact,
            timeStuck: pattern.timeStuck || 0,
            patterns: [pattern.name]
          })
        }
      }

      return blockers
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to identify blockers', 'identifyBlockers', { originalError: error })
    }
  }

  /**
   * Analyze individual step for blockers
   */
  private static analyzeStepBlocker(
    record: any,
    currentTime: number
  ): {
    stepId: string
    stepTitle: string
    blockerType: 'technical' | 'content' | 'user_understanding' | 'system' | 'engagement' | 'time_pressure'
    description: string
    frequency: number
    suggestedResolution: string
    severity: 'low' | 'medium' | 'high'
    impact: 'low' | 'medium' | 'high'
    timeStuck: number
    patterns: string[]
  } | null {
    const patterns: string[] = []
    let blockerType: any = 'unknown'
    let description = 'User encountered difficulties with this step'
    let suggestedResolution = 'Review step content and provide additional guidance'
    let severity: 'low' | 'medium' | 'high' = 'low'
    let impact: 'low' | 'medium' | 'high' = 'low'

    // Calculate time stuck
    const startTime = record.started_at ? new Date(record.started_at).getTime() : currentTime
    const timeStuck = record.status === 'in_progress' ? 
      (currentTime - startTime) / (1000 * 60) : // minutes
      record.time_spent || 0

    // Check for various blocker conditions
    const isBlocked = (
      record.status === 'failed' ||
      record.attempts > 3 ||
      timeStuck > (record.onboarding_steps?.estimated_time || 10) * 2 ||
      Object.keys(record.errors || {}).length > 0
    )

    if (!isBlocked) return null

    // Analyze blocker type based on errors and patterns
    if (record.errors && typeof record.errors === 'object') {
      const errorKeys = Object.keys(record.errors)
      
      if (errorKeys.includes('validation') || errorKeys.includes('input')) {
        blockerType = 'user_understanding'
        description = 'User input validation failures suggest understanding issues'
        suggestedResolution = 'Provide clearer instructions and input examples'
        patterns.push('validation_failures')
        severity = 'medium'
        impact = 'medium'
      } else if (errorKeys.includes('technical') || errorKeys.includes('system')) {
        blockerType = 'technical'
        description = 'Technical errors are preventing step completion'
        suggestedResolution = 'Check system functionality and provide technical support'
        patterns.push('technical_errors')
        severity = 'high'
        impact = 'high'
      } else if (errorKeys.includes('timeout') || errorKeys.includes('network')) {
        blockerType = 'system'
        description = 'System performance issues are affecting user experience'
        suggestedResolution = 'Optimize system performance and check network connectivity'
        patterns.push('system_performance')
        severity = 'high'
        impact = 'medium'
      }
    }

    // Analyze time-based patterns
    if (timeStuck > (record.onboarding_steps?.estimated_time || 10) * 3) {
      patterns.push('excessive_time')
      if (blockerType === 'unknown') {
        blockerType = 'content'
        description = 'User is spending excessive time on this step'
        suggestedResolution = 'Simplify content or provide additional guidance'
        severity = 'medium'
        impact = 'medium'
      }
    }

    // Analyze attempt patterns
    if (record.attempts > 5) {
      patterns.push('multiple_attempts')
      severity = 'high'
      impact = 'high'
      if (blockerType === 'unknown') {
        blockerType = 'user_understanding'
        description = 'Multiple failed attempts indicate comprehension issues'
        suggestedResolution = 'Provide alternative learning materials or one-on-one support'
      }
    }

    // Analyze engagement patterns
    const userActions = record.user_actions || {}
    const actionCount = Object.keys(userActions).length
    if (actionCount < 3 && record.status === 'in_progress') {
      patterns.push('low_engagement')
      if (blockerType === 'unknown') {
        blockerType = 'engagement'
        description = 'Low user engagement detected'
        suggestedResolution = 'Add interactive elements or gamification'
        severity = 'medium'
        impact = 'medium'
      }
    }

    return {
      stepId: record.step_id,
      stepTitle: record.onboarding_steps?.title || 'Unknown Step',
      blockerType,
      description,
      frequency: record.attempts || 1,
      suggestedResolution,
      severity,
      impact,
      timeStuck,
      patterns
    }
  }

  /**
   * Identify patterns across all progress records
   */
  private static identifyProgressPatterns(progressRecords: any[]): Array<{
    name: string
    type: 'technical' | 'content' | 'user_understanding' | 'system' | 'engagement' | 'time_pressure'
    description: string
    frequency: number
    resolution: string
    severity: 'low' | 'medium' | 'high'
    impact: 'low' | 'medium' | 'high'
    isBlocker: boolean
    timeStuck?: number
  }> {
    const patterns = []

    // Pattern: Consistent failures across multiple steps
    const failedSteps = progressRecords.filter(r => r.status === 'failed')
    if (failedSteps.length >= 3) {
      patterns.push({
        name: 'consistent_failures',
        type: 'user_understanding' as const,
        description: 'User is consistently failing multiple steps',
        frequency: failedSteps.length,
        resolution: 'Consider switching to an easier onboarding path or providing additional support',
        severity: 'high' as const,
        impact: 'high' as const,
        isBlocker: true
      })
    }

    // Pattern: Excessive skipping
    const skippedSteps = progressRecords.filter(r => r.status === 'skipped')
    if (skippedSteps.length >= 4) {
      patterns.push({
        name: 'excessive_skipping',
        type: 'engagement' as const,
        description: 'User is skipping many steps, indicating low engagement',
        frequency: skippedSteps.length,
        resolution: 'Review content relevance and add more engaging elements',
        severity: 'medium' as const,
        impact: 'high' as const,
        isBlocker: true
      })
    }

    // Pattern: Slow overall progress
    const totalTime = progressRecords.reduce((sum, r) => sum + (r.time_spent || 0), 0)
    const completedSteps = progressRecords.filter(r => r.status === 'completed')
    const avgTimePerStep = completedSteps.length > 0 ? totalTime / completedSteps.length : 0
    
    if (avgTimePerStep > 15) { // 15 minutes average per step
      patterns.push({
        name: 'slow_progress',
        type: 'time_pressure' as const,
        description: 'User is taking significantly longer than expected',
        frequency: completedSteps.length,
        resolution: 'Provide time management tips or consider a self-paced approach',
        severity: 'medium' as const,
        impact: 'medium' as const,
        isBlocker: true,
        timeStuck: avgTimePerStep
      })
    }

    // Pattern: No progress for extended period
    const lastActivity = progressRecords
      .map(r => new Date(r.updated_at).getTime())
      .sort((a, b) => b - a)[0]
    
    const timeSinceLastActivity = (Date.now() - lastActivity) / (1000 * 60 * 60) // hours
    
    if (timeSinceLastActivity > 24) {
      patterns.push({
        name: 'abandoned_session',
        type: 'engagement' as const,
        description: 'No activity for over 24 hours, session may be abandoned',
        frequency: 1,
        resolution: 'Send re-engagement communication and offer assistance',
        severity: 'high' as const,
        impact: 'high' as const,
        isBlocker: true
      })
    }

    return patterns
  }

  /**
   * Generate detailed progress analytics report
   */
  static async generateProgressReport(
    sessionId: string
  ): Promise<{
    sessionId: string
    overallProgress: OnboardingProgress
    blockers: Array<any>
    achievements: UserAchievementRow[]
    analytics: {
      totalTimeSpent: number
      averageTimePerStep: number
      completionRate: number
      skipRate: number
      failureRate: number
      engagementScore: number
      difficultyScore: number
      recommendations: string[]
    }
    trends: {
      progressVelocity: number
      engagementTrend: 'increasing' | 'decreasing' | 'stable'
      difficultyTrend: 'increasing' | 'decreasing' | 'stable'
      timeEfficiency: number
    }
  }> {
    try {
      const overallProgress = await this.getOverallProgress(sessionId)
      const blockers = await this.identifyBlockers(sessionId)
      const achievements = await this.getUserAchievements(sessionId)

      // Get detailed progress records for analytics
      const { data: progressRecords, error } = await this.getSupabase()
        .from('user_progress')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at')

      if (error) {
        throw new DatabaseError('Failed to fetch progress records for report', error)
      }

      // Calculate analytics
      const totalSteps = progressRecords.length
      const completedSteps = progressRecords.filter((r: any) => r.status === 'completed').length
      const skippedSteps = progressRecords.filter((r: any) => r.status === 'skipped').length
      const failedSteps = progressRecords.filter((r: any) => r.status === 'failed').length

      const completionRate = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
      const skipRate = totalSteps > 0 ? (skippedSteps / totalSteps) * 100 : 0
      const failureRate = totalSteps > 0 ? (failedSteps / totalSteps) * 100 : 0

      const averageTimePerStep = completedSteps > 0 ? 
        overallProgress.timeSpent / completedSteps : 0

      // Calculate engagement score (0-100)
      const engagementScore = Math.max(0, 100 - (skipRate * 2) - (failureRate * 3))

      // Calculate difficulty score (0-100, higher = more difficult)
      const difficultyScore = (failureRate * 2) + (averageTimePerStep / 10) + (blockers.length * 10)

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        completionRate,
        skipRate,
        failureRate,
        engagementScore,
        difficultyScore,
        blockers,
        averageTimePerStep
      })

      // Calculate trends (simplified for now)
      const progressVelocity = completedSteps > 0 ? 
        overallProgress.timeSpent / completedSteps : 0

      const engagementTrend = engagementScore > 70 ? 'increasing' : 
        engagementScore > 40 ? 'stable' : 'decreasing'

      const difficultyTrend = difficultyScore > 60 ? 'increasing' :
        difficultyScore > 30 ? 'stable' : 'decreasing'

      const timeEfficiency = averageTimePerStep > 0 ? 
        Math.max(0, 100 - (averageTimePerStep / 15) * 100) : 100

      return {
        sessionId,
        overallProgress,
        blockers,
        achievements,
        analytics: {
          totalTimeSpent: overallProgress.timeSpent,
          averageTimePerStep,
          completionRate,
          skipRate,
          failureRate,
          engagementScore,
          difficultyScore,
          recommendations
        },
        trends: {
          progressVelocity,
          engagementTrend,
          difficultyTrend,
          timeEfficiency
        }
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to generate progress report', 'generateProgressReport', { originalError: error })
    }
  }

  /**
   * Generate recommendations based on analytics
   */
  private static generateRecommendations(analytics: {
    completionRate: number
    skipRate: number
    failureRate: number
    engagementScore: number
    difficultyScore: number
    blockers: Array<any>
    averageTimePerStep: number
  }): string[] {
    const recommendations: string[] = []

    if (analytics.completionRate < 50) {
      recommendations.push('Consider providing additional support or switching to an easier path')
    }

    if (analytics.skipRate > 30) {
      recommendations.push('Review content relevance and add more engaging elements')
    }

    if (analytics.failureRate > 20) {
      recommendations.push('Simplify step instructions and provide better examples')
    }

    if (analytics.engagementScore < 40) {
      recommendations.push('Add interactive elements and gamification to increase engagement')
    }

    if (analytics.difficultyScore > 60) {
      recommendations.push('Consider breaking down complex steps into smaller, manageable tasks')
    }

    if (analytics.averageTimePerStep > 20) {
      recommendations.push('Optimize step content for better time efficiency')
    }

    if (analytics.blockers.length > 3) {
      recommendations.push('Address identified blockers with targeted interventions')
    }

    if (recommendations.length === 0) {
      recommendations.push('Progress is on track, continue with current approach')
    }

    return recommendations
  }

  /**
   * Award milestone achievement
   */
  static async awardMilestone(
    userId: string,
    sessionId: string,
    milestoneId: string,
    achievementData: Record<string, unknown> = {}
  ): Promise<UserAchievementRow> {
    try {
      // Check if milestone already awarded
      const { data: existing } = await this.getSupabase()
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .eq('milestone_id', milestoneId)
        .single()

      if (existing) {
        return existing
      }

      // Award the milestone
      const achievementInsert: UserAchievementInsert = {
        user_id: userId,
        session_id: sessionId,
        milestone_id: milestoneId,
        earned_at: new Date().toISOString(),
        achievement_data: achievementData
      }

      const { data: achievement, error } = await this.getSupabase()
        .from('user_achievements')
        .insert(achievementInsert)
        .select('*')
        .single()

      if (error) {
        throw new DatabaseError('Failed to award milestone', error)
      }

      // Log analytics event
      await this.logMilestoneAnalytics(userId, sessionId, milestoneId, achievementData)

      return achievement
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to award milestone', 'awardMilestone', { originalError: error })
    }
  }

  /**
   * Generate completion certificate for user
   */
  static async generateCompletionCertificate(
    userId: string,
    sessionId: string,
    pathId: string
  ): Promise<{
    certificateId: string
    certificateUrl: string
    issuedAt: string
    pathName: string
    completionTime: number
    achievements: UserAchievementRow[]
  }> {
    try {
      // Get session and path details
      const { data: session, error: sessionError } = await this.getSupabase()
        .from('onboarding_sessions')
        .select(`
          *,
          onboarding_paths(name, estimated_duration)
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) {
        throw new DatabaseError('Failed to fetch session for certificate', sessionError)
      }

      // Get user achievements for this session
      const achievements = await this.getUserAchievements(sessionId)

      // Generate certificate data
      const certificateId = `cert_${userId}_${sessionId}_${Date.now()}`
      const certificateData = {
        certificateId,
        userId,
        sessionId,
        pathId,
        pathName: session.onboarding_paths?.name || 'Unknown Path',
        completionTime: session.time_spent,
        completedAt: session.completed_at,
        achievements: achievements.map(a => ({
          milestoneId: a.milestone_id,
          earnedAt: a.earned_at,
          data: a.achievement_data
        })),
        issuedAt: new Date().toISOString()
      }

      // Store certificate in achievements table as a special milestone
      await this.awardMilestone(userId, sessionId, 'completion_certificate', {
        certificate: certificateData,
        type: 'completion_certificate'
      })

      return {
        certificateId,
        certificateUrl: `/certificates/${certificateId}`,
        issuedAt: certificateData.issuedAt,
        pathName: certificateData.pathName,
        completionTime: certificateData.completionTime,
        achievements
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to generate completion certificate', 'generateCompletionCertificate', { originalError: error })
    }
  }

  /**
   * Get available badges for user based on progress
   */
  static async getAvailableBadges(
    userId: string,
    sessionId: string
  ): Promise<Array<{
    badgeId: string
    name: string
    description: string
    criteria: Record<string, unknown>
    isEarned: boolean
    progress: number
  }>> {
    try {
      // Get all available milestones/badges
      const { data: milestones, error } = await this.getSupabase()
        .from('onboarding_milestones')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: false })

      if (error) {
        throw new DatabaseError('Failed to fetch available badges', error)
      }

      // Get user's current achievements
      const userAchievements = await this.getUserAchievements(sessionId)
      const earnedMilestoneIds = new Set(userAchievements.map(a => a.milestone_id))

      // Get current progress
      const progress = await this.getOverallProgress(sessionId)

      // Calculate badge progress and availability
      const badges = milestones.map((milestone: any) => {
        const isEarned = earnedMilestoneIds.has(milestone.id)
        let badgeProgress = 0

        if (!isEarned) {
          badgeProgress = this.calculateBadgeProgress(milestone, progress)
        } else {
          badgeProgress = 100
        }

        return {
          badgeId: milestone.id,
          name: milestone.name,
          description: milestone.description || '',
          criteria: milestone.criteria,
          isEarned,
          progress: badgeProgress
        }
      })

      return badges
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get available badges', 'getAvailableBadges', { originalError: error })
    }
  }

  /**
   * Calculate progress towards earning a specific badge
   */
  private static calculateBadgeProgress(
    milestone: OnboardingMilestoneRow,
    progress: OnboardingProgress
  ): number {
    const criteria = milestone.criteria

    switch (milestone.milestone_type) {
      case 'progress':
        const requiredProgress = (criteria as any).progress_percentage || 100
        return Math.min((progress.overallProgress / requiredProgress) * 100, 100)

      case 'completion':
        const requiredSteps = (criteria as any).required_steps || []
        if (!Array.isArray(requiredSteps) || requiredSteps.length === 0) return 0
        const completedCount = requiredSteps.filter((stepId: string) => 
          progress.completedSteps.includes(stepId)
        ).length
        return (completedCount / requiredSteps.length) * 100

      case 'time_based':
        const maxTime = (criteria as any).max_time_minutes || 0
        if (maxTime === 0) return 0
        const timeProgress = Math.max(0, (maxTime - progress.timeSpent) / maxTime) * 100
        return Math.min(timeProgress, 100)

      default:
        return 0
    }
  }

  /**
   * Get user achievements for a session
   */
  static async getUserAchievements(sessionId: string): Promise<UserAchievementRow[]> {
    try {
      const { data: achievements, error } = await this.getSupabase()
        .from('user_achievements')
        .select(`
          *,
          onboarding_milestones(*)
        `)
        .eq('session_id', sessionId)
        .order('earned_at', { ascending: false })

      if (error) {
        throw new DatabaseError('Failed to fetch user achievements', error)
      }

      return achievements || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get user achievements', 'getUserAchievements', { originalError: error })
    }
  }

  /**
   * Backup progress to local storage for offline persistence
   */
  static async backupProgressToLocalStorage(
    sessionId: string,
    userId: string
  ): Promise<void> {
    try {
      // Only run in browser environment
      if (typeof window === 'undefined') return

      const progress = await this.getOverallProgress(sessionId)
      const achievements = await this.getUserAchievements(sessionId)
      
      const backupData = {
        sessionId,
        userId,
        progress,
        achievements,
        lastBackup: new Date().toISOString(),
        version: '1.0'
      }

      const storageKey = `onboarding_backup_${sessionId}`
      localStorage.setItem(storageKey, JSON.stringify(backupData))
    } catch (error) {
      // Log error but don't throw - backup shouldn't break main flow
      console.warn('Failed to backup progress to local storage:', error)
    }
  }

  /**
   * Restore progress from local storage backup
   */
  static async restoreProgressFromLocalStorage(
    sessionId: string
  ): Promise<{
    progress: OnboardingProgress | null
    achievements: UserAchievementRow[]
    lastBackup: string | null
  }> {
    try {
      // Only run in browser environment
      if (typeof window === 'undefined') {
        return { progress: null, achievements: [], lastBackup: null }
      }

      const storageKey = `onboarding_backup_${sessionId}`
      const backupDataStr = localStorage.getItem(storageKey)
      
      if (!backupDataStr) {
        return { progress: null, achievements: [], lastBackup: null }
      }

      const backupData = JSON.parse(backupDataStr)
      
      return {
        progress: backupData.progress || null,
        achievements: backupData.achievements || [],
        lastBackup: backupData.lastBackup || null
      }
    } catch (error) {
      console.warn('Failed to restore progress from local storage:', error)
      return { progress: null, achievements: [], lastBackup: null }
    }
  }

  /**
   * Synchronize local storage backup with server data
   */
  static async synchronizeProgress(
    sessionId: string,
    userId: string
  ): Promise<{
    synchronized: boolean
    conflicts: Array<{
      type: 'progress' | 'achievement'
      local: any
      server: any
      resolution: 'server_wins' | 'local_wins' | 'merged'
    }>
  }> {
    try {
      const backup = await this.restoreProgressFromLocalStorage(sessionId)
      const serverProgress = await this.getOverallProgress(sessionId)
      const serverAchievements = await this.getUserAchievements(sessionId)

      const conflicts: Array<{
        type: 'progress' | 'achievement'
        local: any
        server: any
        resolution: 'server_wins' | 'local_wins' | 'merged'
      }> = []

      // Compare progress data
      if (backup.progress && backup.lastBackup) {
        const backupTime = new Date(backup.lastBackup).getTime()
        const serverTime = new Date(serverProgress.lastUpdated).getTime()

        if (Math.abs(backupTime - serverTime) > 30000) { // 30 second threshold
          // Potential conflict - use most recent data
          if (backupTime > serverTime) {
            conflicts.push({
              type: 'progress',
              local: backup.progress,
              server: serverProgress,
              resolution: 'local_wins'
            })
          } else {
            conflicts.push({
              type: 'progress',
              local: backup.progress,
              server: serverProgress,
              resolution: 'server_wins'
            })
          }
        }
      }

      // Update backup with latest server data
      await this.backupProgressToLocalStorage(sessionId, userId)

      return {
        synchronized: true,
        conflicts
      }
    } catch (error) {
      console.warn('Failed to synchronize progress:', error)
      return {
        synchronized: false,
        conflicts: []
      }
    }
  }

  /**
   * Clear local storage backup for a session
   */
  static clearLocalStorageBackup(sessionId: string): void {
    try {
      if (typeof window === 'undefined') return
      
      const storageKey = `onboarding_backup_${sessionId}`
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to clear local storage backup:', error)
    }
  }

  /**
   * Update overall session progress based on step completions
   */
  private static async updateSessionProgress(sessionId: string): Promise<void> {
    try {
      const progress = await this.getOverallProgress(sessionId)

      // Update session with calculated progress
      const { error } = await this.getSupabase()
        .from('onboarding_sessions')
        .update({
          progress_percentage: progress.overallProgress,
          time_spent: progress.timeSpent,
          current_step_index: progress.currentStepIndex,
          last_active_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw new DatabaseError('Failed to update session progress', error)
      }
    } catch (error) {
      // Log error but don't throw - this is a background update
      console.error('Failed to update session progress:', error)
    }
  }

  /**
   * Check and award milestones based on progress
   */
  private static async checkAndAwardMilestones(
    sessionId: string,
    stepId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get available milestones
      const { data: milestones, error } = await this.getSupabase()
        .from('onboarding_milestones')
        .select('*')
        .eq('is_active', true)

      if (error || !milestones) {
        return
      }

      const progress = await this.getOverallProgress(sessionId)

      for (const milestone of milestones) {
        // Check if milestone criteria are met
        if (this.checkMilestoneCriteria(milestone, progress, stepId)) {
          await this.awardMilestone(userId, sessionId, milestone.id, {
            trigger_step: stepId,
            progress_at_award: progress.overallProgress
          })
        }
      }
    } catch (error) {
      // Log error but don't throw - milestone checking shouldn't break the main flow
      console.error('Failed to check and award milestones:', error)
    }
  }

  /**
   * Check if milestone criteria are met
   */
  private static checkMilestoneCriteria(
    milestone: OnboardingMilestoneRow,
    progress: OnboardingProgress,
    currentStepId: string
  ): boolean {
    const criteria = milestone.criteria

    switch (milestone.milestone_type) {
      case 'progress':
        const requiredProgress = (criteria as any).progress_percentage || 0
        return progress.overallProgress >= requiredProgress

      case 'completion':
        const requiredSteps = (criteria as any).required_steps || []
        return Array.isArray(requiredSteps) && requiredSteps.every((stepId: string) => progress.completedSteps.includes(stepId))

      case 'time_based':
        const maxTime = (criteria as any).max_time_minutes || Infinity
        return progress.timeSpent <= maxTime

      case 'achievement':
        // Custom achievement logic can be implemented here
        return false

      default:
        return false
    }
  }

  /**
   * Log progress analytics event
   */
  private static async logProgressAnalytics(
    sessionId: string,
    stepId: string,
    userId: string,
    progress: Partial<UserProgressUpdate>
  ): Promise<void> {
    try {
      const event: OnboardingAnalyticsInsert = {
        organization_id: null, // Will be populated by trigger or service
        session_id: sessionId,
        user_id: userId,
        event_type: 'step_progress',
        event_data: progress,
        path_id: null,
        step_id: stepId,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      }

      const { error } = await this.getSupabase()
        .from('onboarding_analytics')
        .insert(event)

      if (error) {
        console.error('Failed to log progress analytics:', error)
      }
    } catch (error) {
      console.error('Failed to log progress analytics:', error)
    }
  }

  /**
   * Log milestone analytics event
   */
  private static async logMilestoneAnalytics(
    userId: string,
    sessionId: string,
    milestoneId: string,
    achievementData: Record<string, unknown>
  ): Promise<void> {
    try {
      const event: OnboardingAnalyticsInsert = {
        organization_id: null,
        session_id: sessionId,
        user_id: userId,
        event_type: 'milestone_reached',
        event_data: { milestone_id: milestoneId, ...achievementData },
        path_id: null,
        step_id: null,
        timestamp: new Date().toISOString(),
        user_agent: null,
        ip_address: null,
        metadata: {}
      }

      const { error } = await this.getSupabase()
        .from('onboarding_analytics')
        .insert(event)

      if (error) {
        console.error('Failed to log milestone analytics:', error)
      }
    } catch (error) {
      console.error('Failed to log milestone analytics:', error)
    }
  }

  /**
   * Transform database row to UserProgress
   */
  private static transformProgressRow(row: any): UserProgress {
    return {
      id: row.id,
      session_id: row.session_id,
      step_id: row.step_id,
      user_id: row.user_id,
      status: row.status,
      started_at: row.started_at,
      completed_at: row.completed_at,
      time_spent: row.time_spent,
      attempts: row.attempts,
      score: row.score,
      feedback: row.feedback,
      user_actions: row.user_actions,
      step_result: row.step_result,
      errors: row.errors,
      achievements: row.achievements,
      created_at: row.created_at,
      updated_at: row.updated_at,
      step: row.onboarding_steps ? {
        id: row.onboarding_steps.id,
        path_id: row.onboarding_steps.path_id,
        title: row.onboarding_steps.title,
        description: row.onboarding_steps.description,
        step_type: row.onboarding_steps.step_type,
        step_order: row.onboarding_steps.step_order,
        estimated_time: row.onboarding_steps.estimated_time,
        is_required: row.onboarding_steps.is_required,
        dependencies: row.onboarding_steps.dependencies,
        content: row.onboarding_steps.content,
        interactive_elements: row.onboarding_steps.interactive_elements,
        success_criteria: row.onboarding_steps.success_criteria,
        validation_rules: row.onboarding_steps.validation_rules,
        metadata: row.onboarding_steps.metadata,
        created_at: row.onboarding_steps.created_at,
        updated_at: row.onboarding_steps.updated_at
      } : undefined,
      session: row.onboarding_sessions ? {
        id: row.onboarding_sessions.id,
        user_id: row.onboarding_sessions.user_id,
        organization_id: row.onboarding_sessions.organization_id,
        path_id: row.onboarding_sessions.path_id,
        session_type: row.onboarding_sessions.session_type,
        status: row.onboarding_sessions.status,
        current_step_id: row.onboarding_sessions.current_step_id,
        current_step_index: row.onboarding_sessions.current_step_index,
        progress_percentage: row.onboarding_sessions.progress_percentage,
        time_spent: row.onboarding_sessions.time_spent,
        started_at: row.onboarding_sessions.started_at,
        last_active_at: row.onboarding_sessions.last_active_at,
        completed_at: row.onboarding_sessions.completed_at,
        paused_at: row.onboarding_sessions.paused_at,
        session_metadata: row.onboarding_sessions.session_metadata,
        preferences: row.onboarding_sessions.preferences,
        created_at: row.onboarding_sessions.created_at,
        updated_at: row.onboarding_sessions.updated_at
      } : undefined
    }
  }
}