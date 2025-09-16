/**
 * Content Creation Service - Tools for organization administrators to create custom onboarding content
 * Requirements: 7.3, 7.4
 */

import { createSupabaseClient } from '@/lib/database'
import { DatabaseError, NotFoundError, ValidationError, ErrorCode } from '@/lib/errors'
import type {
  OnboardingContentRow,
  OnboardingContentInsert,
  OnboardingContentUpdate,
  OnboardingStepRow,
  OnboardingStepInsert
} from '@/lib/models'

export interface ContentTemplate {
  id: string
  name: string
  description: string
  type: 'step' | 'module' | 'assessment' | 'welcome_message' | 'completion_message'
  template: Record<string, unknown>
  variables: TemplateVariable[]
  category: string
  tags: string[]
  isPublic: boolean
  organizationId?: string
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'rich_text'
  label: string
  description: string
  required: boolean
  defaultValue?: unknown
  options?: string[]
  validation?: ValidationRule[]
}

export interface ValidationRule {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'range'
  value: unknown
  message: string
}

export interface ContentBuilder {
  id: string
  name: string
  description: string
  organizationId: string
  createdBy: string
  content: ContentSection[]
  settings: BuilderSettings
  status: 'draft' | 'published' | 'archived'
}

export interface ContentSection {
  id: string
  type: 'text' | 'video' | 'image' | 'interactive' | 'quiz' | 'exercise' | 'checklist'
  title: string
  content: Record<string, unknown>
  order: number
  isRequired: boolean
  estimatedTime: number
  dependencies: string[]
}

export interface BuilderSettings {
  allowRoleCustomization: boolean
  enableVersioning: boolean
  requireApproval: boolean
  autoPublish: boolean
  notifyOnChanges: boolean
}

export interface InteractiveElement {
  id: string
  type: 'button' | 'form' | 'simulation' | 'sandbox' | 'tutorial' | 'walkthrough'
  configuration: Record<string, unknown>
  validation: ValidationCriteria[]
  feedback: FeedbackConfiguration
}

export interface ValidationCriteria {
  type: 'completion' | 'accuracy' | 'time_limit' | 'custom'
  criteria: Record<string, unknown>
  errorMessage: string
  successMessage: string
}

export interface FeedbackConfiguration {
  immediate: boolean
  showCorrectAnswers: boolean
  explanations: Record<string, string>
  encouragementMessages: string[]
}

export interface ContentPreview {
  content: Record<string, unknown>
  metadata: {
    estimatedTime: number
    difficulty: string
    interactiveElements: number
    validationRules: number
  }
  preview: string
}

export class ContentCreationService {
  private static getSupabase() {
    return createSupabaseClient()
  }

  /**
   * Get available content templates
   */
  static async getContentTemplates(
    organizationId?: string,
    category?: string
  ): Promise<ContentTemplate[]> {
    try {
      let query = this.getSupabase()
        .from('content_templates')
        .select('*')
        .eq('is_active', true)

      // Include public templates and organization-specific templates
      if (organizationId) {
        query = query.or(`is_public.eq.true,organization_id.eq.${organizationId}`)
      } else {
        query = query.eq('is_public', true)
      }

      if (category) {
        query = query.eq('category', category)
      }

      const { data: templates, error } = await query.order('name')

      if (error) {
        throw new DatabaseError('Failed to fetch content templates', error)
      }

      return (templates || []).map(template => this.transformTemplateRow(template))
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get content templates')
    }
  }

  /**
   * Create custom content from template
   */
  static async createContentFromTemplate(
    templateId: string,
    organizationId: string,
    variables: Record<string, unknown>,
    createdBy: string
  ): Promise<OnboardingContentRow> {
    try {
      // Get template
      const template = await this.getContentTemplate(templateId)
      if (!template) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Content template not found')
      }

      // Validate variables
      this.validateTemplateVariables(template, variables)

      // Process template with variables
      const processedContent = await this.processTemplate(template, variables)

      // Create content
      const contentData: OnboardingContentInsert = {
        content_type: 'template',
        title: processedContent.title,
        description: processedContent.description,
        content_data: processedContent.content,
        media_urls: processedContent.mediaUrls || [],
        interactive_config: processedContent.interactiveConfig || {},
        tags: processedContent.tags || [],
        version: 1,
        is_active: true,
        organization_id: organizationId,
        created_by: createdBy
      }

      const { data, error } = await this.getSupabase()
        .from('onboarding_content')
        .insert(contentData)
        .select()
        .single()

      if (error) {
        throw new DatabaseError('Failed to create content from template', error)
      }

      return data
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ValidationError) {
        throw error
      }
      throw new DatabaseError('Failed to create content from template')
    }
  }

  /**
   * Create custom onboarding step
   */
  static async createCustomStep(
    organizationId: string,
    stepData: {
      title: string
      description: string
      stepType: 'tutorial' | 'exercise' | 'setup' | 'validation' | 'milestone'
      content: Record<string, unknown>
      interactiveElements: InteractiveElement[]
      estimatedTime: number
      isRequired: boolean
      dependencies: string[]
      validationRules: ValidationCriteria[]
    },
    createdBy: string
  ): Promise<OnboardingStepRow> {
    try {
      // Validate step data
      this.validateStepData(stepData)

      // Create step content
      const contentData: OnboardingContentInsert = {
        content_type: 'interactive',
        title: stepData.title,
        description: stepData.description,
        content_data: stepData.content,
        media_urls: [],
        interactive_config: {
          elements: stepData.interactiveElements,
          validation: stepData.validationRules
        },
        tags: ['custom_step'],
        version: 1,
        is_active: true,
        organization_id: organizationId,
        created_by: createdBy
      }

      const { data: content, error: contentError } = await this.getSupabase()
        .from('onboarding_content')
        .insert(contentData)
        .select()
        .single()

      if (contentError) {
        throw new DatabaseError('Failed to create step content', contentError)
      }

      // Create onboarding step (this would need a path_id in real implementation)
      const stepInsert: Partial<OnboardingStepInsert> = {
        title: stepData.title,
        description: stepData.description,
        step_type: stepData.stepType,
        step_order: 0, // Would be determined by path
        estimated_time: stepData.estimatedTime,
        is_required: stepData.isRequired,
        dependencies: stepData.dependencies,
        content: { contentId: content.id },
        interactive_elements: { elements: stepData.interactiveElements },
        success_criteria: {},
        validation_rules: { rules: stepData.validationRules },
        metadata: {
          isCustom: true,
          organizationId,
          createdBy,
          contentId: content.id
        }
      }

      // Note: In a real implementation, this would need to be associated with a path
      // For now, we'll store it as a template step
      const { data: step, error: stepError } = await this.getSupabase()
        .from('custom_steps')
        .insert(stepInsert)
        .select()
        .single()

      if (stepError) {
        throw new DatabaseError('Failed to create custom step', stepError)
      }

      return step
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to create custom step')
    }
  }

  /**
   * Create content builder instance
   */
  static async createContentBuilder(
    organizationId: string,
    name: string,
    description: string,
    createdBy: string,
    settings?: Partial<BuilderSettings>
  ): Promise<ContentBuilder> {
    try {
      const builderData = {
        id: crypto.randomUUID(),
        name,
        description,
        organizationId,
        createdBy,
        content: [],
        settings: {
          allowRoleCustomization: true,
          enableVersioning: true,
          requireApproval: false,
          autoPublish: false,
          notifyOnChanges: true,
          ...settings
        },
        status: 'draft' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.getSupabase()
        .from('content_builders')
        .insert(builderData)
        .select()
        .single()

      if (error) {
        throw new DatabaseError('Failed to create content builder', error)
      }

      return data
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to create content builder')
    }
  }

  /**
   * Add section to content builder
   */
  static async addContentSection(
    builderId: string,
    section: Omit<ContentSection, 'id' | 'order'>
  ): Promise<ContentSection> {
    try {
      // Get current builder
      const builder = await this.getContentBuilder(builderId)
      if (!builder) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Content builder not found')
      }

      // Create new section
      const newSection: ContentSection = {
        ...section,
        id: crypto.randomUUID(),
        order: builder.content.length
      }

      // Update builder with new section
      const updatedContent = [...builder.content, newSection]
      
      const { error } = await this.getSupabase()
        .from('content_builders')
        .update({ 
          content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', builderId)

      if (error) {
        throw new DatabaseError('Failed to add content section', error)
      }

      return newSection
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to add content section')
    }
  }

  /**
   * Update content section
   */
  static async updateContentSection(
    builderId: string,
    sectionId: string,
    updates: Partial<ContentSection>
  ): Promise<ContentSection> {
    try {
      const builder = await this.getContentBuilder(builderId)
      if (!builder) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Content builder not found')
      }

      const sectionIndex = builder.content.findIndex(s => s.id === sectionId)
      if (sectionIndex === -1) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Content section not found')
      }

      // Update section
      const updatedSection = { ...builder.content[sectionIndex], ...updates }
      const updatedContent = [...builder.content]
      updatedContent[sectionIndex] = updatedSection

      const { error } = await this.getSupabase()
        .from('content_builders')
        .update({ 
          content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', builderId)

      if (error) {
        throw new DatabaseError('Failed to update content section', error)
      }

      return updatedSection
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to update content section')
    }
  }

  /**
   * Preview content before publishing
   */
  static async previewContent(
    builderId: string,
    role?: string
  ): Promise<ContentPreview> {
    try {
      const builder = await this.getContentBuilder(builderId)
      if (!builder) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Content builder not found')
      }

      // Generate preview
      const content = await this.generateContentPreview(builder, role)
      
      // Calculate metadata
      const metadata = {
        estimatedTime: builder.content.reduce((sum, section) => sum + section.estimatedTime, 0),
        difficulty: this.calculateDifficulty(builder.content),
        interactiveElements: builder.content.filter(s => 
          ['interactive', 'quiz', 'exercise'].includes(s.type)
        ).length,
        validationRules: builder.content.reduce((sum, section) => 
          sum + (section.dependencies?.length || 0), 0
        )
      }

      return {
        content,
        metadata,
        preview: this.generatePreviewHTML(content)
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error
      }
      throw new DatabaseError('Failed to preview content')
    }
  }

  /**
   * Publish content builder as onboarding content
   */
  static async publishContent(
    builderId: string,
    publishedBy: string
  ): Promise<OnboardingContentRow> {
    try {
      const builder = await this.getContentBuilder(builderId)
      if (!builder) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'Content builder not found')
      }

      if (builder.status !== 'draft') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Only draft content can be published')
      }

      // Validate content before publishing
      this.validateBuilderContent(builder)

      // Create published content
      const contentData: OnboardingContentInsert = {
        content_type: 'interactive',
        title: builder.name,
        description: builder.description,
        content_data: { sections: builder.content },
        media_urls: this.extractMediaUrls(builder.content),
        interactive_config: this.extractInteractiveConfig(builder.content),
        tags: ['custom_content', 'published'],
        version: 1,
        is_active: true,
        organization_id: builder.organizationId,
        created_by: publishedBy
      }

      const { data: publishedContent, error } = await this.getSupabase()
        .from('onboarding_content')
        .insert(contentData)
        .select()
        .single()

      if (error) {
        throw new DatabaseError('Failed to publish content', error)
      }

      // Update builder status
      await this.getSupabase()
        .from('content_builders')
        .update({ 
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', builderId)

      return publishedContent
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ValidationError) {
        throw error
      }
      throw new DatabaseError('Failed to publish content')
    }
  }

  /**
   * Get content builder by ID
   */
  static async getContentBuilder(builderId: string): Promise<ContentBuilder | null> {
    try {
      const { data, error } = await this.getSupabase()
        .from('content_builders')
        .select('*')
        .eq('id', builderId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new DatabaseError('Failed to fetch content builder', error)
      }

      return data
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get content builder')
    }
  }

  /**
   * Get organization's content builders
   */
  static async getOrganizationContentBuilders(
    organizationId: string,
    status?: 'draft' | 'published' | 'archived'
  ): Promise<ContentBuilder[]> {
    try {
      let query = this.getSupabase()
        .from('content_builders')
        .select('*')
        .eq('organizationId', organizationId)

      if (status) {
        query = query.eq('status', status)
      }

      const { data: builders, error } = await query.order('updated_at', { ascending: false })

      if (error) {
        throw new DatabaseError('Failed to fetch content builders', error)
      }

      return builders || []
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('Failed to get organization content builders')
    }
  }

  /**
   * Private helper methods
   */
  private static async getContentTemplate(templateId: string): Promise<ContentTemplate | null> {
    const { data, error } = await this.getSupabase()
      .from('content_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new DatabaseError('Failed to fetch content template', error)
    }

    return this.transformTemplateRow(data)
  }

  private static validateTemplateVariables(
    template: ContentTemplate,
    variables: Record<string, unknown>
  ): void {
    template.variables.forEach(variable => {
      if (variable.required && !(variable.name in variables)) {
        throw new ValidationError(
          ErrorCode.VALIDATION_ERROR,
          `Required variable '${variable.name}' is missing`
        )
      }

      const value = variables[variable.name]
      if (value !== undefined && variable.validation) {
        variable.validation.forEach(rule => {
          if (!this.validateVariableValue(value, rule)) {
            throw new ValidationError(ErrorCode.VALIDATION_ERROR, rule.message)
          }
        })
      }
    })
  }

  private static validateVariableValue(value: unknown, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== ''
      case 'min_length':
        return typeof value === 'string' && value.length >= (rule.value as number)
      case 'max_length':
        return typeof value === 'string' && value.length <= (rule.value as number)
      case 'pattern':
        return typeof value === 'string' && new RegExp(rule.value as string).test(value)
      case 'range':
        const [min, max] = rule.value as [number, number]
        return typeof value === 'number' && value >= min && value <= max
      default:
        return true
    }
  }

  private static async processTemplate(
    template: ContentTemplate,
    variables: Record<string, unknown>
  ): Promise<{
    title: string
    description: string
    content: Record<string, unknown>
    mediaUrls?: string[]
    interactiveConfig?: Record<string, unknown>
    tags?: string[]
  }> {
    // Process template by replacing variables
    const processedTemplate = JSON.parse(JSON.stringify(template.template))
    
    // Replace variables in template
    this.replaceVariablesInObject(processedTemplate, variables)
    
    return processedTemplate
  }

  private static replaceVariablesInObject(obj: any, variables: Record<string, unknown>): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = this.replaceVariablesInString(obj[key], variables)
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.replaceVariablesInObject(obj[key], variables)
      }
    }
  }

  private static replaceVariablesInString(str: string, variables: Record<string, unknown>): string {
    return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match
    })
  }

  private static validateStepData(stepData: any): void {
    if (!stepData.title || stepData.title.trim().length === 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Step title is required')
    }

    if (!stepData.stepType || !['tutorial', 'exercise', 'setup', 'validation', 'milestone'].includes(stepData.stepType)) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid step type is required')
    }

    if (stepData.estimatedTime <= 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Estimated time must be positive')
    }
  }

  private static generateContentPreview(builder: ContentBuilder, role?: string): Promise<Record<string, unknown>> {
    // Generate preview content based on builder sections
    const preview = {
      title: builder.name,
      description: builder.description,
      sections: builder.content.map(section => ({
        id: section.id,
        type: section.type,
        title: section.title,
        content: section.content,
        estimatedTime: section.estimatedTime
      }))
    }

    return Promise.resolve(preview)
  }

  private static calculateDifficulty(sections: ContentSection[]): string {
    // Simple difficulty calculation based on content types and interactive elements
    const interactiveCount = sections.filter(s => 
      ['interactive', 'quiz', 'exercise'].includes(s.type)
    ).length
    
    const totalSections = sections.length
    const interactiveRatio = totalSections > 0 ? interactiveCount / totalSections : 0

    if (interactiveRatio > 0.6) return 'advanced'
    if (interactiveRatio > 0.3) return 'intermediate'
    return 'beginner'
  }

  private static generatePreviewHTML(content: Record<string, unknown>): string {
    // Generate HTML preview of content
    return `<div class="content-preview">
      <h1>${content.title}</h1>
      <p>${content.description}</p>
      <!-- Additional preview content would be generated here -->
    </div>`
  }

  private static validateBuilderContent(builder: ContentBuilder): void {
    if (builder.content.length === 0) {
      throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Content builder must have at least one section')
    }

    builder.content.forEach(section => {
      if (!section.title || section.title.trim().length === 0) {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, `Section ${section.id} must have a title`)
      }
    })
  }

  private static extractMediaUrls(sections: ContentSection[]): string[] {
    const urls: string[] = []
    sections.forEach(section => {
      if (section.type === 'video' || section.type === 'image') {
        const url = section.content.url as string
        if (url) urls.push(url)
      }
    })
    return urls
  }

  private static extractInteractiveConfig(sections: ContentSection[]): Record<string, unknown> {
    const interactiveSections = sections.filter(s => 
      ['interactive', 'quiz', 'exercise'].includes(s.type)
    )
    
    return {
      hasInteractive: interactiveSections.length > 0,
      interactiveCount: interactiveSections.length,
      types: interactiveSections.map(s => s.type)
    }
  }

  private static transformTemplateRow(row: any): ContentTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      template: row.template,
      variables: row.variables || [],
      category: row.category,
      tags: row.tags || [],
      isPublic: row.is_public,
      organizationId: row.organization_id
    }
  }
}