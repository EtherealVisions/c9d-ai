/**
 * Content Manager Service - Manages onboarding content and interactive elements
 * Requirements: 1.1, 2.1, 6.1
 */

import { createSupabaseClient } from '@/lib/database'
import { DatabaseError, NotFoundError, ValidationError, ErrorCode } from '@/lib/errors'
import type {
  OnboardingContentRow,
  OnboardingContentInsert,
  OnboardingContentUpdate,
  OnboardingPathRow,
  OnboardingStepRow,
  OnboardingStepInsert,
  OnboardingStepUpdate,
  OnboardingPathInsert,
  OnboardingPathUpdate
} from '@/lib/models'

export interface ContentContext {
  organizationId?: string
  userRole?: string
  subscriptionTier?: string
  language?: string
}

export interface ContentTemplate {
  id: string
  name: string
  description: string
  template_data: Record<string, unknown>
  variables: string[]
}

export interface ContentEffectiveness {
  contentId: string
  viewCount: number
  completionRate: number
  averageTimeSpent: number
  userSatisfactionScore: number
  commonIssues: string[]
}

export class ContentManagerService {
  private static supabase = createSupabaseClient()

  /**
   * Get onboarding content by ID with context filtering
   */
  static async getOnboardingContent(
    contentId: string,
    context: ContentContext = {}
  ): Promise<OnboardingContentRow | null> {
    try {
      let query = this.supabase
        .from('onboarding_content')
        .select('*')
        .eq('id', contentId)
        .eq('is_active', true)

      // Filter by organization if specified
      if (context.organizationId) {
        query = query.or(`organization_id.is.null,organization_id.eq.${context.organizationId}`)
      } else {
        query = query.is('organization_id', null)
      }

      const { data: content, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new DatabaseError('Failed to fetch onboarding content', error)
      }

      return content
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get onboarding content', 'getOnboardingContent', { originalError: error })
    }
  }

  /**
   * Create custom content for an organization
   */
  static async createCustomContent(
    organizationId: string,
    contentData: Omit<OnboardingContentInsert, 'organization_id'>
  ): Promise<OnboardingContentRow> {
    try {
      const insertData: OnboardingContentInsert = {
        ...contentData,
        organization_id: organizationId,
        version: 1,
        is_active: true
      }

      const { data: content, error } = await this.supabase
        .from('onboarding_content')
        .insert(insertData)
        .select('*')
        .single()

      if (error) {
        throw new DatabaseError('Failed to create custom content', error)
      }

      return content
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to create custom content', 'createCustomContent', { originalError: error })
    }
  }

  /**
   * Update content template
   */
  static async updateContentTemplate(
    contentId: string,
    updates: Partial<OnboardingContentUpdate>
  ): Promise<OnboardingContentRow> {
    try {
      // Increment version if content_data is being updated
      const updateData: Partial<OnboardingContentUpdate> = {
        ...updates
      }

      if (updates.content_data) {
        // Get current version
        const { data: current } = await this.supabase
          .from('onboarding_content')
          .select('version')
          .eq('id', contentId)
          .single()

        if (current) {
          updateData.version = (current.version || 1) + 1
        }
      }

      const { data: content, error } = await this.supabase
        .from('onboarding_content')
        .update(updateData)
        .eq('id', contentId)
        .select('*')
        .single()

      if (error) {
        throw new DatabaseError('Failed to update content template', error)
      }

      return content
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to update content template', 'updateContentTemplate', { originalError: error })
    }
  }

  /**
   * Get content for a specific role and organization
   */
  static async getContentForRole(
    role: string,
    organizationId?: string
  ): Promise<OnboardingContentRow[]> {
    try {
      let query = this.supabase
        .from('onboarding_content')
        .select('*')
        .eq('is_active', true)
        .contains('tags', [role])

      // Filter by organization
      if (organizationId) {
        query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      } else {
        query = query.is('organization_id', null)
      }

      const { data: content, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw new DatabaseError('Failed to fetch role-specific content', error)
      }

      return content || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get content for role', 'getContentForRole', { originalError: error })
    }
  }

  /**
   * Validate content effectiveness
   */
  static async validateContentEffectiveness(contentId: string): Promise<ContentEffectiveness> {
    try {
      // Get analytics data for the content
      const { data: analytics, error } = await this.supabase
        .from('onboarding_analytics')
        .select('*')
        .eq('event_type', 'content_interaction')
        .contains('event_data', { content_id: contentId })

      if (error) {
        throw new DatabaseError('Failed to fetch content analytics', error)
      }

      // Calculate effectiveness metrics
      const viewCount = analytics?.length || 0
      let completionCount = 0
      let totalTimeSpent = 0
      let satisfactionScores: number[] = []

      for (const event of analytics || []) {
        const eventData = event.event_data as any
        if (eventData.action === 'completed') {
          completionCount++
        }
        if (eventData.time_spent) {
          totalTimeSpent += eventData.time_spent
        }
        if (eventData.satisfaction_score) {
          satisfactionScores.push(eventData.satisfaction_score)
        }
      }

      const completionRate = viewCount > 0 ? (completionCount / viewCount) * 100 : 0
      const averageTimeSpent = viewCount > 0 ? totalTimeSpent / viewCount : 0
      const userSatisfactionScore = satisfactionScores.length > 0 
        ? satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length 
        : 0

      // Identify common issues (simplified)
      const commonIssues: string[] = []
      if (completionRate < 50) {
        commonIssues.push('Low completion rate')
      }
      if (userSatisfactionScore < 3) {
        commonIssues.push('Low user satisfaction')
      }
      if (averageTimeSpent > 600) { // 10 minutes
        commonIssues.push('Content may be too long or complex')
      }

      return {
        contentId,
        viewCount,
        completionRate: Math.round(completionRate * 100) / 100,
        averageTimeSpent: Math.round(averageTimeSpent),
        userSatisfactionScore: Math.round(userSatisfactionScore * 100) / 100,
        commonIssues
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to validate content effectiveness', 'validateContentEffectiveness', { originalError: error })
    }
  }

  /**
   * Create onboarding path
   */
  static async createOnboardingPath(pathData: OnboardingPathInsert): Promise<OnboardingPathRow> {
    try {
      const { data: path, error } = await this.supabase
        .from('onboarding_paths')
        .insert(pathData)
        .select('*')
        .single()

      if (error) {
        throw new DatabaseError('Failed to create onboarding path', error)
      }

      return path
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to create onboarding path', 'createOnboardingPath', { originalError: error })
    }
  }

  /**
   * Create onboarding step
   */
  static async createOnboardingStep(stepData: OnboardingStepInsert): Promise<OnboardingStepRow> {
    try {
      const { data: step, error } = await this.supabase
        .from('onboarding_steps')
        .insert(stepData)
        .select('*')
        .single()

      if (error) {
        throw new DatabaseError('Failed to create onboarding step', error)
      }

      return step
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to create onboarding step', 'createOnboardingStep', { originalError: error })
    }
  }

  /**
   * Update onboarding path
   */
  static async updateOnboardingPath(
    pathId: string,
    updates: Partial<OnboardingPathUpdate>
  ): Promise<OnboardingPathRow> {
    try {
      const updateData: Partial<OnboardingPathUpdate> = {
        ...updates
      }

      const { data: path, error } = await this.supabase
        .from('onboarding_paths')
        .update(updateData)
        .eq('id', pathId)
        .select('*')
        .single()

      if (error) {
        throw new DatabaseError('Failed to update onboarding path', error)
      }

      return path
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to update onboarding path', 'updateOnboardingPath', { originalError: error })
    }
  }

  /**
   * Update onboarding step
   */
  static async updateOnboardingStep(
    stepId: string,
    updates: Partial<OnboardingStepUpdate>
  ): Promise<OnboardingStepRow> {
    try {
      const updateData: Partial<OnboardingStepUpdate> = {
        ...updates
      }

      const { data: step, error } = await this.supabase
        .from('onboarding_steps')
        .update(updateData)
        .eq('id', stepId)
        .select('*')
        .single()

      if (error) {
        throw new DatabaseError('Failed to update onboarding step', error)
      }

      return step
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to update onboarding step', 'updateOnboardingStep', { originalError: error })
    }
  }

  /**
   * Get content by tags
   */
  static async getContentByTags(
    tags: string[],
    context: ContentContext = {}
  ): Promise<OnboardingContentRow[]> {
    try {
      let query = this.supabase
        .from('onboarding_content')
        .select('*')
        .eq('is_active', true)
        .overlaps('tags', tags)

      // Filter by organization
      if (context.organizationId) {
        query = query.or(`organization_id.is.null,organization_id.eq.${context.organizationId}`)
      } else {
        query = query.is('organization_id', null)
      }

      const { data: content, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw new DatabaseError('Failed to fetch content by tags', error)
      }

      return content || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get content by tags', 'getContentByTags', { originalError: error })
    }
  }

  /**
   * Search content
   */
  static async searchContent(
    searchTerm: string,
    context: ContentContext = {}
  ): Promise<OnboardingContentRow[]> {
    try {
      let query = this.supabase
        .from('onboarding_content')
        .select('*')
        .eq('is_active', true)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)

      // Filter by organization
      if (context.organizationId) {
        query = query.or(`organization_id.is.null,organization_id.eq.${context.organizationId}`)
      } else {
        query = query.is('organization_id', null)
      }

      const { data: content, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw new DatabaseError('Failed to search content', error)
      }

      return content || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to search content', 'searchContent', { originalError: error })
    }
  }

  /**
   * Get content templates
   */
  static async getContentTemplates(
    contentType?: string,
    organizationId?: string
  ): Promise<OnboardingContentRow[]> {
    try {
      let query = this.supabase
        .from('onboarding_content')
        .select('*')
        .eq('is_active', true)
        .contains('tags', ['template'])

      if (contentType) {
        query = query.eq('content_type', contentType)
      }

      // Filter by organization
      if (organizationId) {
        query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      } else {
        query = query.is('organization_id', null)
      }

      const { data: templates, error } = await query.order('title')

      if (error) {
        throw new DatabaseError('Failed to fetch content templates', error)
      }

      return templates || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get content templates', 'getContentTemplates', { originalError: error })
    }
  }

  /**
   * Clone content for customization
   */
  static async cloneContent(
    sourceContentId: string,
    organizationId: string,
    customizations: Partial<OnboardingContentInsert> = {}
  ): Promise<OnboardingContentRow> {
    try {
      // Get source content
      const sourceContent = await this.getOnboardingContent(sourceContentId)
      if (!sourceContent) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Source content not found')
      }

      // Create cloned content
      const clonedData: OnboardingContentInsert = {
        content_type: sourceContent.content_type,
        title: `${sourceContent.title} (Custom)`,
        description: sourceContent.description,
        content_data: sourceContent.content_data,
        media_urls: sourceContent.media_urls,
        interactive_config: sourceContent.interactive_config,
        tags: [...sourceContent.tags, 'custom'],
        version: 1,
        is_active: true,
        organization_id: organizationId,
        created_by: null, // Will be set by RLS
        ...customizations
      }

      return await this.createCustomContent(organizationId, clonedData)
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to clone content', 'cloneContent', { originalError: error })
    }
  }

  /**
   * Deactivate content
   */
  static async deactivateContent(contentId: string): Promise<OnboardingContentRow> {
    try {
      const { data: content, error } = await this.supabase
        .from('onboarding_content')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId)
        .select('*')
        .single()

      if (error) {
        throw new DatabaseError('Failed to deactivate content', error)
      }

      return content
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to deactivate content', 'deactivateContent', { originalError: error })
    }
  }

  /**
   * Get organization's custom content
   */
  static async getOrganizationContent(organizationId: string): Promise<OnboardingContentRow[]> {
    try {
      const { data: content, error } = await this.supabase
        .from('onboarding_content')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw new DatabaseError('Failed to fetch organization content', error)
      }

      return content || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get organization content', 'getOrganizationContent', { originalError: error })
    }
  }
}