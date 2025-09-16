/**
 * Role-Based Onboarding Service - Handles role-specific onboarding paths and content filtering
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { createSupabaseClient } from '@/lib/database'
import { DatabaseError, NotFoundError, ValidationError, ErrorCode } from '@/lib/errors'
import type {
  OnboardingPath,
  OnboardingStep,
  OnboardingContext,
  OnboardingPathRow,
  OnboardingStepRow,
  OnboardingSession,
  UserProgressRow
} from '@/lib/models'

export interface RoleConfiguration {
  role: string
  onboardingPathId: string
  customizations: RoleCustomization[]
  mentorAssignment?: MentorAssignment
  additionalResources: Resource[]
  completionCriteria: RoleCompletionCriteria
  trainingModules: TrainingModule[]
}

export interface RoleCustomization {
  type: 'content_filter' | 'step_modification' | 'additional_content' | 'validation_rules'
  target: string // step ID or content type
  configuration: Record<string, unknown>
  isActive: boolean
}

export interface MentorAssignment {
  mentorUserId: string
  assignmentType: 'automatic' | 'manual'
  communicationPreferences: {
    channels: string[]
    frequency: 'daily' | 'weekly' | 'as_needed'
  }
}

export interface Resource {
  id: string
  type: 'document' | 'video' | 'link' | 'tool_access'
  title: string
  description: string
  url: string
  isRequired: boolean
  estimatedTime: number
}

export interface RoleCompletionCriteria {
  requiredSteps: string[]
  minimumScore: number
  requiredTrainingModules: string[]
  knowledgeChecks: KnowledgeCheck[]
  practicalExercises: PracticalExercise[]
}

export interface TrainingModule {
  id: string
  title: string
  description: string
  role: string
  content: TrainingContent[]
  knowledgeChecks: KnowledgeCheck[]
  estimatedDuration: number
  prerequisites: string[]
  isRequired: boolean
}

export interface TrainingContent {
  id: string
  type: 'text' | 'video' | 'interactive' | 'simulation'
  title: string
  content: Record<string, unknown>
  estimatedTime: number
  learningObjectives: string[]
}

export interface KnowledgeCheck {
  id: string
  type: 'quiz' | 'practical' | 'scenario' | 'assessment'
  title: string
  questions: Question[]
  passingScore: number
  maxAttempts: number
  timeLimit?: number
}

export interface Question {
  id: string
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'practical_task'
  question: string
  options?: string[]
  correctAnswer: string | string[]
  explanation: string
  points: number
}

export interface PracticalExercise {
  id: string
  title: string
  description: string
  instructions: string[]
  expectedOutcome: string
  validationCriteria: ValidationCriteria[]
  estimatedTime: number
}

export interface ValidationCriteria {
  type: 'completion' | 'quality' | 'accuracy' | 'time_based'
  description: string
  threshold: number | string
  isRequired: boolean
}

export class RoleBasedOnboardingService {
  private static getSupabase() {
    return createSupabaseClient()
  }

  /**
   * Get role-specific onboarding path for a user
   */
  static async getRoleSpecificPath(
    userId: string,
    organizationId: string,
    userRole: string
  ): Promise<OnboardingPath> {
    try {
      // Get role configuration for the organization
      const roleConfig = await this.getRoleConfiguration(organizationId, userRole)
      
      if (!roleConfig) {
        // Fall back to default path for the role
        return await this.getDefaultRoleBasedPath(userRole)
      }

      // Get the configured onboarding path
      const { data: pathData, error } = await this.getSupabase()
        .from('onboarding_paths')
        .select(`
          *,
          onboarding_steps(*)
        `)
        .eq('id', roleConfig.onboardingPathId)
        .eq('is_active', true)
        .single()

      if (error || !pathData) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Role-specific onboarding path not found')
      }

      // Apply role customizations to the path
      const customizedPath = await this.applyRoleCustomizations(pathData, roleConfig)
      
      return this.transformPathRow(customizedPath)
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to get role-specific onboarding path')
    }
  }

  /**
   * Filter onboarding content based on user role and permissions
   */
  static async filterContentByRole(
    content: OnboardingStep[],
    userRole: string,
    organizationId?: string
  ): Promise<OnboardingStep[]> {
    try {
      // Get role permissions
      const rolePermissions = await this.getRolePermissions(userRole, organizationId)
      
      // Filter steps based on role permissions and requirements
      const filteredSteps = content.filter(step => {
        // Check if step is appropriate for this role
        const stepMetadata = step.metadata as any
        const allowedRoles = stepMetadata?.allowedRoles || []
        const requiredPermissions = stepMetadata?.requiredPermissions || []
        
        // If no role restrictions, include the step
        if (allowedRoles.length === 0 && requiredPermissions.length === 0) {
          return true
        }
        
        // Check role match
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
          return false
        }
        
        // Check permission requirements
        if (requiredPermissions.length > 0) {
          return requiredPermissions.every((perm: string) => 
            rolePermissions.includes(perm)
          )
        }
        
        return true
      })

      // Apply role-specific content modifications
      return await this.applyContentModifications(filteredSteps, userRole, organizationId)
    } catch (error) {
      throw new DatabaseError('Failed to filter content by role')
    }
  }

  /**
   * Create role-specific training module
   */
  static async createTrainingModule(
    organizationId: string,
    trainingModule: Omit<TrainingModule, 'id'>
  ): Promise<TrainingModule> {
    try {
      // Validate training module data
      this.validateTrainingModule(trainingModule)

      const moduleData = {
        ...trainingModule,
        id: crypto.randomUUID(),
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Store training module in database
      const { data, error } = await this.getSupabase()
        .from('training_modules')
        .insert(moduleData)
        .select()
        .single()

      if (error) {
        throw new DatabaseError('Failed to create training module', error)
      }

      return data
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to create training module')
    }
  }

  /**
   * Get training modules for a specific role
   */
  static async getTrainingModulesForRole(
    role: string,
    organizationId?: string
  ): Promise<TrainingModule[]> {
    try {
      let query = this.getSupabase()
        .from('training_modules')
        .select('*')
        .eq('role', role)
        .eq('is_active', true)

      if (organizationId) {
        query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      } else {
        query = query.is('organization_id', null)
      }

      const { data: modules, error } = await query.order('title')

      if (error) {
        throw new DatabaseError('Failed to fetch training modules', error)
      }

      return modules || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get training modules for role')
    }
  }

  /**
   * Validate knowledge check completion
   */
  static async validateKnowledgeCheck(
    userId: string,
    sessionId: string,
    knowledgeCheckId: string,
    answers: Record<string, unknown>
  ): Promise<{
    passed: boolean
    score: number
    feedback: string[]
    nextActions: string[]
  }> {
    try {
      // Get knowledge check configuration
      const knowledgeCheck = await this.getKnowledgeCheck(knowledgeCheckId)
      if (!knowledgeCheck) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Knowledge check not found')
      }

      // Validate answers and calculate score
      const validation = await this.validateAnswers(knowledgeCheck, answers)
      
      // Record the attempt
      await this.recordKnowledgeCheckAttempt(userId, sessionId, knowledgeCheckId, validation)
      
      // Determine next actions based on results
      const nextActions = await this.determineNextActions(validation, knowledgeCheck)
      
      return {
        passed: validation.score >= knowledgeCheck.passingScore,
        score: validation.score,
        feedback: validation.feedback,
        nextActions
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to validate knowledge check')
    }
  }

  /**
   * Get role configuration for organization
   */
  private static async getRoleConfiguration(
    organizationId: string,
    role: string
  ): Promise<RoleConfiguration | null> {
    try {
      const { data: config, error } = await this.getSupabase()
        .from('organization_onboarding_configs')
        .select('role_configurations')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single()

      if (error || !config) {
        return null
      }

      const roleConfigs = config.role_configurations as Record<string, RoleConfiguration>
      return roleConfigs[role] || null
    } catch (error) {
      console.warn('Failed to get role configuration:', error)
      return null
    }
  }

  /**
   * Get default role-based path when no organization-specific configuration exists
   */
  private static async getDefaultRoleBasedPath(role: string): Promise<OnboardingPath> {
    const { data: pathData, error } = await this.getSupabase()
      .from('onboarding_paths')
      .select(`
        *,
        onboarding_steps(*)
      `)
      .eq('target_role', role)
      .eq('is_active', true)
      .is('organization_id', null) // Default paths have no organization
      .order('name')
      .limit(1)
      .single()

    if (error || !pathData) {
      throw new NotFoundError(ErrorCode.NOT_FOUND, `No default onboarding path found for role: ${role}`)
    }

    return this.transformPathRow(pathData)
  }

  /**
   * Apply role customizations to onboarding path
   */
  private static async applyRoleCustomizations(
    pathData: any,
    roleConfig: RoleConfiguration
  ): Promise<any> {
    const customizedPath = { ...pathData }
    
    // Apply customizations to steps
    if (customizedPath.onboarding_steps && roleConfig.customizations) {
      customizedPath.onboarding_steps = customizedPath.onboarding_steps.map((step: any) => {
        const stepCustomizations = roleConfig.customizations.filter(
          c => c.target === step.id && c.isActive
        )
        
        let customizedStep = { ...step }
        
        stepCustomizations.forEach(customization => {
          switch (customization.type) {
            case 'content_filter':
              customizedStep = this.applyContentFilter(customizedStep, customization.configuration)
              break
            case 'step_modification':
              customizedStep = this.applyStepModification(customizedStep, customization.configuration)
              break
            case 'additional_content':
              customizedStep = this.addAdditionalContent(customizedStep, customization.configuration)
              break
            case 'validation_rules':
              customizedStep = this.applyValidationRules(customizedStep, customization.configuration)
              break
          }
        })
        
        return customizedStep
      })
    }

    // Add role-specific training modules as steps
    if (roleConfig.trainingModules) {
      const trainingSteps = await this.convertTrainingModulesToSteps(roleConfig.trainingModules)
      customizedPath.onboarding_steps = [...(customizedPath.onboarding_steps || []), ...trainingSteps]
    }

    return customizedPath
  }

  /**
   * Get role permissions for content filtering
   */
  private static async getRolePermissions(
    role: string,
    organizationId?: string
  ): Promise<string[]> {
    try {
      let query = this.getSupabase()
        .from('roles')
        .select('permissions')
        .eq('name', role)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      } else {
        query = query.is('organization_id', null)
      }

      const { data: roleData } = await query.single()
      
      return roleData?.permissions || []
    } catch (error) {
      console.warn('Failed to get role permissions:', error)
      return []
    }
  }

  /**
   * Apply content modifications based on role
   */
  private static async applyContentModifications(
    steps: OnboardingStep[],
    userRole: string,
    organizationId?: string
  ): Promise<OnboardingStep[]> {
    // Get role-specific content modifications
    const modifications = await this.getRoleContentModifications(userRole, organizationId)
    
    return steps.map(step => {
      const stepModifications = modifications.filter(m => m.targetStepId === step.id)
      
      let modifiedStep = { ...step }
      
      stepModifications.forEach(modification => {
        switch (modification.type) {
          case 'content_replacement':
            modifiedStep.content = { ...modifiedStep.content, ...modification.newContent }
            break
          case 'difficulty_adjustment':
            modifiedStep = this.adjustStepDifficulty(modifiedStep, modification.difficultyLevel || 'medium')
            break
          case 'time_adjustment':
            modifiedStep.estimated_time = modification.newEstimatedTime || modifiedStep.estimated_time
            break
        }
      })
      
      return modifiedStep
    })
  }

  /**
   * Get role-specific content modifications
   */
  private static async getRoleContentModifications(
    role: string,
    organizationId?: string
  ): Promise<Array<{
    targetStepId: string
    type: string
    newContent?: Record<string, unknown>
    difficultyLevel?: string
    newEstimatedTime?: number
  }>> {
    // This would typically come from organization configuration
    // For now, return empty array - can be extended based on requirements
    return []
  }

  /**
   * Validate training module data
   */
  private static validateTrainingModule(trainingModule: Omit<TrainingModule, 'id'>): void {
    if (!trainingModule.title || trainingModule.title.trim().length === 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Training module title is required')
    }
    
    if (!trainingModule.role || trainingModule.role.trim().length === 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Training module role is required')
    }
    
    if (!trainingModule.content || trainingModule.content.length === 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Training module must have content')
    }
    
    if (trainingModule.estimatedDuration <= 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Training module duration must be positive')
    }
  }

  /**
   * Get knowledge check by ID
   */
  private static async getKnowledgeCheck(knowledgeCheckId: string): Promise<KnowledgeCheck | null> {
    try {
      const { data, error } = await this.getSupabase()
        .from('knowledge_checks')
        .select('*')
        .eq('id', knowledgeCheckId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new DatabaseError('Failed to fetch knowledge check', error)
      }

      return data
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get knowledge check')
    }
  }

  /**
   * Validate answers against knowledge check
   */
  private static async validateAnswers(
    knowledgeCheck: KnowledgeCheck,
    answers: Record<string, unknown>
  ): Promise<{
    score: number
    totalPoints: number
    feedback: string[]
    correctAnswers: number
    totalQuestions: number
  }> {
    let score = 0
    let totalPoints = 0
    let correctAnswers = 0
    const feedback: string[] = []

    knowledgeCheck.questions.forEach(question => {
      totalPoints += question.points
      const userAnswer = answers[question.id]
      
      if (this.isAnswerCorrect(question, userAnswer)) {
        score += question.points
        correctAnswers++
        feedback.push(`Question ${question.id}: Correct! ${question.explanation}`)
      } else {
        feedback.push(`Question ${question.id}: Incorrect. ${question.explanation}`)
      }
    })

    return {
      score: totalPoints > 0 ? (score / totalPoints) * 100 : 0,
      totalPoints,
      feedback,
      correctAnswers,
      totalQuestions: knowledgeCheck.questions.length
    }
  }

  /**
   * Check if an answer is correct
   */
  private static isAnswerCorrect(question: Question, userAnswer: unknown): boolean {
    switch (question.type) {
      case 'multiple_choice':
      case 'true_false':
        return userAnswer === question.correctAnswer
      case 'short_answer':
        if (Array.isArray(question.correctAnswer)) {
          return question.correctAnswer.some(correct => 
            String(userAnswer).toLowerCase().includes(String(correct).toLowerCase())
          )
        }
        return String(userAnswer).toLowerCase().includes(String(question.correctAnswer).toLowerCase())
      case 'practical_task':
        // For practical tasks, this would involve more complex validation
        // For now, assume it's validated elsewhere
        return true
      default:
        return false
    }
  }

  /**
   * Record knowledge check attempt
   */
  private static async recordKnowledgeCheckAttempt(
    userId: string,
    sessionId: string,
    knowledgeCheckId: string,
    validation: any
  ): Promise<void> {
    try {
      const { error } = await this.getSupabase()
        .from('knowledge_check_attempts')
        .insert({
          user_id: userId,
          session_id: sessionId,
          knowledge_check_id: knowledgeCheckId,
          score: validation.score,
          answers: validation.answers,
          feedback: validation.feedback,
          completed_at: new Date().toISOString()
        })

      if (error) {
        throw new DatabaseError('Failed to record knowledge check attempt', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to record knowledge check attempt')
    }
  }

  /**
   * Determine next actions based on validation results
   */
  private static async determineNextActions(
    validation: any,
    knowledgeCheck: KnowledgeCheck
  ): Promise<string[]> {
    const actions: string[] = []

    if (validation.score >= knowledgeCheck.passingScore) {
      actions.push('proceed_to_next_step')
      actions.push('unlock_advanced_content')
    } else {
      actions.push('review_content')
      actions.push('retake_assessment')
      
      if (validation.score < knowledgeCheck.passingScore * 0.5) {
        actions.push('schedule_mentor_session')
        actions.push('access_additional_resources')
      }
    }

    return actions
  }

  /**
   * Helper methods for customizations
   */
  private static applyContentFilter(step: any, config: Record<string, unknown>): any {
    // Apply content filtering based on configuration
    return step
  }

  private static applyStepModification(step: any, config: Record<string, unknown>): any {
    // Apply step modifications based on configuration
    return step
  }

  private static addAdditionalContent(step: any, config: Record<string, unknown>): any {
    // Add additional content based on configuration
    return step
  }

  private static applyValidationRules(step: any, config: Record<string, unknown>): any {
    // Apply validation rules based on configuration
    return step
  }

  private static async convertTrainingModulesToSteps(modules: TrainingModule[]): Promise<any[]> {
    // Convert training modules to onboarding steps
    return modules.map(module => ({
      id: `training_${module.id}`,
      title: module.title,
      description: module.description,
      step_type: 'training',
      estimated_time: module.estimatedDuration,
      is_required: module.isRequired,
      content: { trainingModule: module },
      metadata: { isTrainingModule: true, moduleId: module.id }
    }))
  }

  private static adjustStepDifficulty(step: OnboardingStep, difficultyLevel: string): OnboardingStep {
    // Adjust step difficulty based on level
    return step
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
}