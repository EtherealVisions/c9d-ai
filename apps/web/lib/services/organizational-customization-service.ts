/**
 * Organizational Customization Service - Handles branding, custom content, and messaging
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { DatabaseError, NotFoundError, ValidationError, ErrorCode } from '@/lib/errors'
import { getRepositoryFactory } from '@/lib/repositories/factory'
import type {
  OrganizationOnboardingConfigRow,
  OrganizationOnboardingConfigInsert,
  OrganizationOnboardingConfigUpdate,
  OnboardingContentRow,
  OnboardingContentInsert
} from '@/lib/models'

export interface BrandingAssets {
  logo: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  customCSS?: string
  favicon?: string
  backgroundImage?: string
}

export interface CustomContent {
  id: string
  type: 'welcome_message' | 'step_content' | 'completion_message' | 'help_text'
  title: string
  content: string
  targetStepId?: string
  targetRole?: string
  isActive: boolean
  priority: number
}

export interface OrganizationCustomization {
  organizationId: string
  welcomeMessage: string
  brandingAssets: BrandingAssets
  customContent: CustomContent[]
  roleSpecificContent: Record<string, CustomContent[]>
  integrationSettings: IntegrationSetting[]
  notificationSettings: NotificationSettings
  completionRequirements: CompletionRequirements
}

export interface IntegrationSetting {
  type: 'slack' | 'teams' | 'email' | 'webhook' | 'api'
  configuration: Record<string, unknown>
  isActive: boolean
  events: string[]
}

export interface NotificationSettings {
  channels: NotificationChannel[]
  templates: NotificationTemplate[]
  triggers: NotificationTrigger[]
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'teams' | 'in_app' | 'sms'
  configuration: Record<string, unknown>
  isActive: boolean
}

export interface NotificationTemplate {
  id: string
  name: string
  type: 'welcome' | 'progress_update' | 'completion' | 'reminder' | 'milestone'
  subject: string
  content: string
  variables: string[]
}

export interface NotificationTrigger {
  event: string
  conditions: Record<string, unknown>
  templateId: string
  channels: string[]
  delay?: number
}

export interface CompletionRequirements {
  minimumStepsCompleted: number
  requiredSteps: string[]
  minimumScore: number
  requiredTrainingModules: string[]
  timeLimit?: number
  managerApproval?: boolean
}

export interface ContentCreationRequest {
  type: 'step' | 'module' | 'assessment' | 'resource'
  title: string
  description: string
  targetRole?: string
  content: Record<string, unknown>
  metadata: Record<string, unknown>
}

export class OrganizationalCustomizationService {
  private static getDatabase() {
    const { getDatabase } = require('@/lib/db/connection')
    return getDatabase()
  }

  /**
   * Get organization's onboarding customization
   */
  static async getOrganizationCustomization(
    organizationId: string
  ): Promise<OrganizationCustomization | null> {
    try {
      const { eq, and } = await import('drizzle-orm')
      const { organizationOnboardingConfigs } = await import('@/lib/db/schema/content')
      
      const db = this.getDatabase()
      const configs = await db
        .select()
        .from(organizationOnboardingConfigs)
        .where(
          and(
            eq(organizationOnboardingConfigs.organizationId, organizationId),
            eq(organizationOnboardingConfigs.isActive, true)
          )
        )
        .limit(1)

      if (configs.length === 0) {
        return null
      }

      return this.transformConfigRow(configs[0])
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get organization customization')
    }
  }

  /**
   * Create or update organization customization
   */
  static async updateOrganizationCustomization(
    organizationId: string,
    customization: Partial<OrganizationCustomization>
  ): Promise<OrganizationCustomization> {
    try {
      const { eq } = await import('drizzle-orm')
      const { organizationOnboardingConfigs } = await import('@/lib/db/schema/content')
      
      // Check if configuration exists
      const existingConfig = await this.getOrganizationCustomization(organizationId)
      
      const configData = {
        organizationId: organizationId,
        welcomeMessage: customization.welcomeMessage || null,
        brandingAssets: (customization.brandingAssets || {}) as Record<string, unknown>,
        customContent: (customization.customContent || {}) as Record<string, unknown>,
        roleConfigurations: customization.roleSpecificContent || {},
        mandatoryModules: [],
        completionRequirements: (customization.completionRequirements || {}) as Record<string, unknown>,
        notificationSettings: (customization.notificationSettings || {}) as Record<string, unknown>,
        integrationSettings: (customization.integrationSettings || []) as unknown as Record<string, unknown>,
        isActive: true,
        updatedAt: new Date()
      }

      const db = this.getDatabase()
      let result

      if (existingConfig) {
        // Update existing configuration
        const updated = await db
          .update(organizationOnboardingConfigs)
          .set(configData)
          .where(eq(organizationOnboardingConfigs.organizationId, organizationId))
          .returning()

        if (updated.length === 0) {
          throw new DatabaseError('Failed to update organization customization')
        }
        result = updated[0]
      } else {
        // Create new configuration
        const inserted = await db
          .insert(organizationOnboardingConfigs)
          .values(configData)
          .returning()

        if (inserted.length === 0) {
          throw new DatabaseError('Failed to create organization customization')
        }
        result = inserted[0]
      }

      return this.transformConfigRow(result)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to update organization customization')
    }
  }

  /**
   * Update branding assets for organization
   */
  static async updateBrandingAssets(
    organizationId: string,
    brandingAssets: BrandingAssets
  ): Promise<BrandingAssets> {
    try {
      // Validate branding assets
      this.validateBrandingAssets(brandingAssets)

      const { data, error } = await this.getSupabase()
        .from('organization_onboarding_configs')
        .update({ branding_assets: brandingAssets })
        .eq('organization_id', organizationId)
        .select('branding_assets')
        .single()

      if (error) {
        throw new DatabaseError('Failed to update branding assets', error)
      }

      return data.branding_assets as BrandingAssets
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to update branding assets')
    }
  }

  /**
   * Create custom content for organization
   */
  static async createCustomContent(
    organizationId: string,
    contentRequest: ContentCreationRequest
  ): Promise<CustomContent> {
    try {
      // Validate content request
      this.validateContentRequest(contentRequest)

      const { onboardingContent } = await import('@/lib/db/schema/content')
      
      const contentData = {
        contentType: 'template',
        title: contentRequest.title,
        description: contentRequest.description,
        contentData: contentRequest.content,
        mediaUrls: [],
        interactiveConfig: {},
        tags: contentRequest.targetRole ? [contentRequest.targetRole] : [],
        version: 1,
        isActive: true,
        organizationId: organizationId,
        createdBy: null // Would be set from auth context
      }

      const db = this.getDatabase()
      const inserted = await db
        .insert(onboardingContent)
        .values(contentData)
        .returning()

      if (inserted.length === 0) {
        throw new DatabaseError('Failed to create custom content')
      }

      return this.transformContentRow(inserted[0])
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to create custom content')
    }
  }

  /**
   * Get custom content for organization
   */
  static async getCustomContent(
    organizationId: string,
    filters?: {
      type?: string
      targetRole?: string
      isActive?: boolean
    }
  ): Promise<CustomContent[]> {
    try {
      let query = this.getSupabase()
        .from('onboarding_content')
        .select('*')
        .eq('organization_id', organizationId)

      if (filters?.type) {
        query = query.eq('content_type', filters.type)
      }

      if (filters?.targetRole) {
        query = query.contains('tags', [filters.targetRole])
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }

      const { data: content, error } = await query.order('title')

      if (error) {
        throw new DatabaseError('Failed to fetch custom content', error)
      }

      return (content || []).map((item: any) => this.transformContentRow(item))
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get custom content')
    }
  }

  /**
   * Update custom content
   */
  static async updateCustomContent(
    contentId: string,
    updates: Partial<CustomContent>
  ): Promise<CustomContent> {
    try {
      const updateData: Partial<OnboardingContentInsert> = {}

      if (updates.title) updateData.title = updates.title
      if (updates.content) updateData.content_data = { content: updates.content }
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive
      if (updates.targetRole) updateData.tags = [updates.targetRole]

      const { data, error } = await this.getSupabase()
        .from('onboarding_content')
        .update(updateData)
        .eq('id', contentId)
        .select()
        .single()

      if (error) {
        throw new DatabaseError('Failed to update custom content', error)
      }

      return this.transformContentRow(data)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to update custom content')
    }
  }

  /**
   * Delete custom content
   */
  static async deleteCustomContent(contentId: string): Promise<void> {
    try {
      const { error } = await this.getSupabase()
        .from('onboarding_content')
        .delete()
        .eq('id', contentId)

      if (error) {
        throw new DatabaseError('Failed to delete custom content', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to delete custom content')
    }
  }

  /**
   * Configure role-specific content
   */
  static async configureRoleSpecificContent(
    organizationId: string,
    role: string,
    content: CustomContent[]
  ): Promise<void> {
    try {
      // Get existing configuration
      const existingConfig = await this.getOrganizationCustomization(organizationId)
      
      const roleConfigurations = existingConfig?.roleSpecificContent || {}
      roleConfigurations[role] = content

      await this.getSupabase()
        .from('organization_onboarding_configs')
        .update({ role_configurations: roleConfigurations })
        .eq('organization_id', organizationId)

    } catch (error) {
      throw new DatabaseError('Failed to configure role-specific content')
    }
  }

  /**
   * Get role-specific content
   */
  static async getRoleSpecificContent(
    organizationId: string,
    role: string
  ): Promise<CustomContent[]> {
    try {
      const customization = await this.getOrganizationCustomization(organizationId)
      
      if (!customization?.roleSpecificContent) {
        return []
      }

      return customization.roleSpecificContent[role] || []
    } catch (error) {
      throw new DatabaseError('Failed to get role-specific content')
    }
  }

  /**
   * Configure notification settings
   */
  static async configureNotifications(
    organizationId: string,
    notificationSettings: NotificationSettings
  ): Promise<NotificationSettings> {
    try {
      // Validate notification settings
      this.validateNotificationSettings(notificationSettings)

      const { data, error } = await this.getSupabase()
        .from('organization_onboarding_configs')
        .update({ notification_settings: notificationSettings })
        .eq('organization_id', organizationId)
        .select('notification_settings')
        .single()

      if (error) {
        throw new DatabaseError('Failed to configure notifications', error)
      }

      return data.notification_settings as NotificationSettings
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to configure notifications')
    }
  }

  /**
   * Configure integration settings
   */
  static async configureIntegrations(
    organizationId: string,
    integrationSettings: IntegrationSetting[]
  ): Promise<IntegrationSetting[]> {
    try {
      // Validate integration settings
      integrationSettings.forEach(setting => this.validateIntegrationSetting(setting))

      const { data, error } = await this.getSupabase()
        .from('organization_onboarding_configs')
        .update({ integration_settings: integrationSettings })
        .eq('organization_id', organizationId)
        .select('integration_settings')
        .single()

      if (error) {
        throw new DatabaseError('Failed to configure integrations', error)
      }

      return data.integration_settings as IntegrationSetting[]
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to configure integrations')
    }
  }

  /**
   * Set completion requirements
   */
  static async setCompletionRequirements(
    organizationId: string,
    requirements: CompletionRequirements
  ): Promise<CompletionRequirements> {
    try {
      // Validate completion requirements
      this.validateCompletionRequirements(requirements)

      const { data, error } = await this.getSupabase()
        .from('organization_onboarding_configs')
        .update({ completion_requirements: requirements })
        .eq('organization_id', organizationId)
        .select('completion_requirements')
        .single()

      if (error) {
        throw new DatabaseError('Failed to set completion requirements', error)
      }

      return data.completion_requirements as CompletionRequirements
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to set completion requirements')
    }
  }

  /**
   * Apply organization customization to onboarding content
   */
  static async applyCustomization(
    organizationId: string,
    baseContent: any,
    userRole?: string
  ): Promise<any> {
    try {
      const customization = await this.getOrganizationCustomization(organizationId)
      
      if (!customization) {
        return baseContent
      }

      let customizedContent = { ...baseContent }

      // Apply branding
      if (customization.brandingAssets) {
        customizedContent.branding = customization.brandingAssets
      }

      // Apply welcome message
      if (customization.welcomeMessage) {
        customizedContent.welcomeMessage = customization.welcomeMessage
      }

      // Apply role-specific content
      if (userRole && customization.roleSpecificContent[userRole]) {
        const roleContent = customization.roleSpecificContent[userRole]
        customizedContent.roleSpecificContent = roleContent
      }

      // Apply custom content
      if (customization.customContent) {
        customizedContent.customContent = customization.customContent
      }

      return customizedContent
    } catch (error) {
      console.warn('Failed to apply customization, using base content:', error)
      return baseContent
    }
  }

  /**
   * Validation methods
   */
  private static validateBrandingAssets(assets: BrandingAssets): void {
    if (!assets.logo || assets.logo.trim().length === 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Logo URL is required')
    }

    if (!assets.primaryColor || !this.isValidColor(assets.primaryColor)) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid primary color is required')
    }

    if (!assets.secondaryColor || !this.isValidColor(assets.secondaryColor)) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid secondary color is required')
    }
  }

  private static validateContentRequest(request: ContentCreationRequest): void {
    if (!request.title || request.title.trim().length === 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Content title is required')
    }

    if (!request.type || !['step', 'module', 'assessment', 'resource'].includes(request.type)) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid content type is required')
    }

    if (!request.content || Object.keys(request.content).length === 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Content data is required')
    }
  }

  private static validateNotificationSettings(settings: NotificationSettings): void {
    if (!settings.channels || settings.channels.length === 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'At least one notification channel is required')
    }

    settings.channels.forEach(channel => {
      if (!channel.type || !['email', 'slack', 'teams', 'in_app', 'sms'].includes(channel.type)) {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid channel type is required')
      }
    })
  }

  private static validateIntegrationSetting(setting: IntegrationSetting): void {
    if (!setting.type || !['slack', 'teams', 'email', 'webhook', 'api'].includes(setting.type)) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid integration type is required')
    }

    if (!setting.configuration || Object.keys(setting.configuration).length === 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Integration configuration is required')
    }
  }

  private static validateCompletionRequirements(requirements: CompletionRequirements): void {
    if (requirements.minimumStepsCompleted < 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Minimum steps completed must be non-negative')
    }

    if (requirements.minimumScore < 0 || requirements.minimumScore > 100) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Minimum score must be between 0 and 100')
    }

    if (requirements.timeLimit && requirements.timeLimit <= 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Time limit must be positive')
    }
  }

  private static isValidColor(color: string): boolean {
    // Basic color validation - hex colors
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
  }

  /**
   * Transform database row to OrganizationCustomization
   */
  private static transformConfigRow(row: any): OrganizationCustomization {
    return {
      organizationId: row.organizationId,
      welcomeMessage: row.welcomeMessage || '',
      brandingAssets: (row.brandingAssets as unknown) as BrandingAssets,
      customContent: Array.isArray(row.customContent) ? row.customContent as CustomContent[] : [],
      roleSpecificContent: row.roleConfigurations as Record<string, CustomContent[]>,
      integrationSettings: Array.isArray(row.integrationSettings) ? row.integrationSettings as IntegrationSetting[] : [],
      notificationSettings: (row.notificationSettings as unknown) as NotificationSettings,
      completionRequirements: (row.completionRequirements as unknown) as CompletionRequirements
    }
  }

  /**
   * Transform content row to CustomContent
   */
  private static transformContentRow(row: any): CustomContent {
    return {
      id: row.id,
      type: row.contentType as any,
      title: row.title,
      content: JSON.stringify(row.contentData),
      targetStepId: undefined, // Would be extracted from metadata
      targetRole: row.tags?.[0],
      isActive: row.isActive,
      priority: 1 // Default priority
    }
  }
}