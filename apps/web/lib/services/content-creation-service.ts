/**
 * Content Creation Service - Tools for organization administrators to create custom onboarding content
 * Migrated to use Drizzle repositories and Zod validation
 * Requirements: 7.3, 7.4
 */

import { getRepositoryFactory } from '@/lib/repositories/factory'
import { auditService } from './audit-service'
import { 
  validateCreateContent,
  validateUpdateContent,
  type CreateContent,
  type UpdateContent,
  type ContentApiResponse
} from '@/lib/validation/schemas/content'
import { 
  ValidationError, 
  NotFoundError, 
  DatabaseError, 
  ErrorCode 
} from '@/lib/errors/custom-errors'

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

export interface ContentServiceResult<T> {
  data?: T
  error?: string
  code?: string
}

export class ContentCreationService {
  private contentRepository: any // Would be a proper content repository
  private organizationRepository: any

  constructor() {
    const factory = getRepositoryFactory()
    this.organizationRepository = factory.createOrganizationRepository()
    // Note: Content repository would need to be implemented
    // this.contentRepository = factory.createContentRepository()
  }

  /**
   * Create onboarding content with validation
   */
  async createContent(
    organizationId: string,
    contentData: CreateContent,
    createdBy: string
  ): Promise<ContentServiceResult<ContentApiResponse>> {
    try {
      // Validate input parameters
      if (!organizationId || typeof organizationId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid organization ID is required')
      }
      if (!createdBy || typeof createdBy !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid creator user ID is required')
      }

      // Validate content data using Zod schema
      const validatedData = validateCreateContent({
        ...contentData,
        organizationId,
        createdBy
      })

      // Check if organization exists
      const organization = await this.organizationRepository.findById(organizationId)
      if (!organization) {
        throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found')
      }

      // Note: In a real implementation, this would use a content repository
      // const content = await this.contentRepository.create(validatedData)

      // Mock content creation for now
      const mockContent = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Log the content creation with audit service
      await auditService.logEvent({
        userId: createdBy,
        organizationId,
        action: 'content.created',
        resourceType: 'content',
        resourceId: mockContent.id,
        severity: 'low',
        metadata: {
          contentTitle: validatedData.title,
          contentType: validatedData.contentType,
          organizationId
        }
      })

      // Transform to API response format
      const contentResponse: ContentApiResponse = {
        id: mockContent.id,
        name: validatedData.title,
        description: validatedData.description,
        targetRole: 'general',
        subscriptionTier: null,
        estimatedDuration: null,
        difficulty: 'beginner',
        prerequisites: [],
        successCriteria: {},
        metadata: {},
        createdAt: mockContent.createdAt,
        updatedAt: mockContent.updatedAt,
        stepCount: 1,
        completionRate: 0,
        averageCompletionTime: null
      }

      return { data: contentResponse }
    } catch (error) {
      console.error('Error creating content:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to create content',
        code: 'CREATE_CONTENT_ERROR'
      }
    }
  }

  /**
   * Update content with validation
   */
  async updateContent(
    contentId: string,
    organizationId: string,
    updateData: UpdateContent,
    updatedBy: string
  ): Promise<ContentServiceResult<ContentApiResponse>> {
    try {
      // Validate input parameters
      if (!contentId || typeof contentId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid content ID is required')
      }
      if (!organizationId || typeof organizationId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid organization ID is required')
      }
      if (!updatedBy || typeof updatedBy !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid updater user ID is required')
      }

      // Validate update data using Zod schema
      const validatedData = validateUpdateContent(updateData)

      // Note: In a real implementation, this would check if content exists
      // const existingContent = await this.contentRepository.findById(contentId)

      // Mock content update for now
      const mockUpdatedContent = {
        id: contentId,
        ...validatedData,
        organizationId,
        updatedAt: new Date()
      }

      // Log the content update with audit service
      await auditService.logEvent({
        userId: updatedBy,
        organizationId,
        action: 'content.updated',
        resourceType: 'content',
        resourceId: contentId,
        severity: 'low',
        metadata: {
          updatedFields: Object.keys(updateData),
          organizationId
        }
      })

      // Transform to API response format
      const contentResponse: ContentApiResponse = {
        id: contentId,
        name: validatedData.title || 'Updated Content',
        description: validatedData.description,
        targetRole: 'general',
        subscriptionTier: null,
        estimatedDuration: null,
        difficulty: 'beginner',
        prerequisites: [],
        successCriteria: {},
        metadata: {},
        createdAt: new Date(), // Would come from existing content
        updatedAt: mockUpdatedContent.updatedAt,
        stepCount: 1,
        completionRate: 0,
        averageCompletionTime: null
      }

      return { data: contentResponse }
    } catch (error) {
      console.error('Error updating content:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to update content',
        code: 'UPDATE_CONTENT_ERROR'
      }
    }
  }

  /**
   * Validate content template variables
   */
  validateTemplateVariables(
    template: ContentTemplate,
    variables: Record<string, unknown>
  ): ContentServiceResult<boolean> {
    try {
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

      return { data: true }
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to validate template variables',
        code: 'TEMPLATE_VALIDATION_ERROR'
      }
    }
  }

  /**
   * Delete content with validation
   */
  async deleteContent(
    contentId: string,
    organizationId: string,
    deletedBy: string
  ): Promise<ContentServiceResult<boolean>> {
    try {
      // Validate input parameters
      if (!contentId || typeof contentId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid content ID is required')
      }
      if (!organizationId || typeof organizationId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid organization ID is required')
      }
      if (!deletedBy || typeof deletedBy !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid deleter user ID is required')
      }

      // Note: In a real implementation, this would check if content exists and delete it
      // const existingContent = await this.contentRepository.findById(contentId)
      // await this.contentRepository.delete(contentId)

      // Log the content deletion with audit service
      await auditService.logEvent({
        userId: deletedBy,
        organizationId,
        action: 'content.deleted',
        resourceType: 'content',
        resourceId: contentId,
        severity: 'medium',
        metadata: {
          deletedBy,
          organizationId
        }
      })

      return { data: true }
    } catch (error) {
      console.error('Error deleting content:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to delete content',
        code: 'DELETE_CONTENT_ERROR'
      }
    }
  }

  /**
   * Helper method to validate variable values
   */
  private validateVariableValue(value: unknown, rule: ValidationRule): boolean {
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
}

// Export singleton instance
export const contentCreationService = new ContentCreationService()