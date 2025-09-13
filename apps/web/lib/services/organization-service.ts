/**
 * OrganizationService - Comprehensive organization management service
 * Provides CRUD operations for organizations, metadata, and settings management
 */

import { createTypedSupabaseClient, DatabaseError, NotFoundError, ValidationError } from '../models/database'
import { validateCreateOrganization, validateUpdateOrganization } from '../models/schemas'
import { securityAuditService } from './security-audit-service'
import { validateServiceTenantAccess } from '../middleware/tenant-isolation'
import type { Organization } from '../models/types'

export interface CreateOrganizationData {
  name: string
  description?: string
  avatarUrl?: string
  metadata?: Record<string, any>
  settings?: Record<string, any>
}

export interface UpdateOrganizationData {
  name?: string
  description?: string
  avatarUrl?: string
  metadata?: Record<string, any>
  settings?: Record<string, any>
}

export interface OrganizationServiceResult<T> {
  data?: T
  error?: string
  code?: string
}

export class OrganizationService {
  private db = createTypedSupabaseClient()

  /**
   * Create a new organization with unique slug generation
   */
  async createOrganization(
    creatorUserId: string,
    organizationData: CreateOrganizationData
  ): Promise<OrganizationServiceResult<Organization>> {
    try {
      // Validate the organization data
      const validatedData = validateCreateOrganization(organizationData)

      // Generate unique slug from organization name
      const slug = await this.generateUniqueSlug(validatedData.name)

      // Create the organization
      const organization = await this.db.createOrganization({
        ...validatedData,
        slug,
        metadata: validatedData.metadata || {},
        settings: validatedData.settings || {}
      })

      // Log the organization creation
      await this.logOrganizationActivity(
        creatorUserId,
        organization.id,
        'organization.created',
        'organization',
        organization.id,
        {
          organizationName: organization.name,
          slug: organization.slug
        }
      )

      return { data: organization }
    } catch (error) {
      console.error('Error creating organization:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: 'VALIDATION_ERROR'
        }
      }

      if (error instanceof DatabaseError && error.message.includes('duplicate')) {
        return {
          error: 'Organization name or slug already exists',
          code: 'DUPLICATE_ORGANIZATION'
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to create organization',
        code: 'CREATE_ORGANIZATION_ERROR'
      }
    }
  }

  /**
   * Get organization by ID with tenant isolation
   */
  async getOrganization(id: string, userId?: string): Promise<OrganizationServiceResult<Organization>> {
    try {
      // Validate tenant access if userId is provided
      if (userId) {
        const hasAccess = await validateServiceTenantAccess(
          userId,
          id,
          'organization.read',
          'organization',
          id
        )
        
        if (!hasAccess) {
          return {
            error: 'Access denied to organization',
            code: 'TENANT_ACCESS_DENIED'
          }
        }
      }

      const organization = await this.db.getOrganization(id, userId)
      
      if (!organization) {
        return {
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        }
      }

      // Log data access
      if (userId) {
        await securityAuditService.logDataAccessEvent(
          userId,
          id,
          'read',
          'organization',
          id,
          { organizationName: organization.name }
        )
      }

      return { data: organization }
    } catch (error) {
      console.error('Error getting organization:', error)
      
      if (error instanceof DatabaseError && error.code === 'TENANT_ACCESS_DENIED') {
        return {
          error: 'Access denied to organization',
          code: 'TENANT_ACCESS_DENIED'
        }
      }
      
      return {
        error: error instanceof Error ? error.message : 'Failed to get organization',
        code: 'GET_ORGANIZATION_ERROR'
      }
    }
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<OrganizationServiceResult<Organization>> {
    try {
      const organization = await this.db.getOrganizationBySlug(slug)
      
      if (!organization) {
        return {
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        }
      }

      return { data: organization }
    } catch (error) {
      console.error('Error getting organization by slug:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get organization',
        code: 'GET_ORGANIZATION_ERROR'
      }
    }
  }

  /**
   * Update organization information with tenant isolation
   */
  async updateOrganization(
    id: string,
    userId: string,
    updateData: UpdateOrganizationData
  ): Promise<OrganizationServiceResult<Organization>> {
    try {
      // Validate tenant access
      const hasAccess = await validateServiceTenantAccess(
        userId,
        id,
        'organization.update',
        'organization',
        id
      )
      
      if (!hasAccess) {
        return {
          error: 'Access denied to organization',
          code: 'TENANT_ACCESS_DENIED'
        }
      }

      // Validate the update data
      const validatedData = validateUpdateOrganization(updateData)

      // Check if organization exists
      const existingOrganization = await this.db.getOrganization(id, userId)
      if (!existingOrganization) {
        return {
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        }
      }

      // Update the organization
      const updatedOrganization = await this.db.updateOrganization(id, validatedData, userId)

      // Log the organization update with security audit
      await securityAuditService.logOrganizationEvent(
        userId,
        id,
        'updated',
        {
          updatedFields: Object.keys(updateData),
          previousValues: {
            name: existingOrganization.name,
            description: existingOrganization.description,
            avatarUrl: existingOrganization.avatarUrl
          },
          newValues: validatedData
        }
      )

      // Also log as data access event
      await securityAuditService.logDataAccessEvent(
        userId,
        id,
        'update',
        'organization',
        id,
        {
          updatedFields: Object.keys(updateData),
          organizationName: updatedOrganization.name
        }
      )

      return { data: updatedOrganization }
    } catch (error) {
      console.error('Error updating organization:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: 'VALIDATION_ERROR'
        }
      }

      if (error instanceof DatabaseError && error.code === 'TENANT_ACCESS_DENIED') {
        return {
          error: 'Access denied to organization',
          code: 'TENANT_ACCESS_DENIED'
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to update organization',
        code: 'UPDATE_ORGANIZATION_ERROR'
      }
    }
  }

  /**
   * Update organization metadata
   */
  async updateOrganizationMetadata(
    id: string,
    userId: string,
    metadata: Record<string, any>
  ): Promise<OrganizationServiceResult<Organization>> {
    try {
      // Get current organization to merge metadata
      const existingOrganization = await this.db.getOrganization(id)
      if (!existingOrganization) {
        return {
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        }
      }

      // Merge new metadata with existing metadata
      const mergedMetadata = {
        ...existingOrganization.metadata,
        ...metadata
      }

      // Update organization with merged metadata
      const updatedOrganization = await this.db.updateOrganization(id, {
        metadata: mergedMetadata
      })

      // Log the metadata update
      await this.logOrganizationActivity(
        userId,
        id,
        'organization.metadata.updated',
        'organization',
        id,
        {
          updatedMetadata: Object.keys(metadata),
          newValues: metadata
        }
      )

      return { data: updatedOrganization }
    } catch (error) {
      console.error('Error updating organization metadata:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to update organization metadata',
        code: 'UPDATE_METADATA_ERROR'
      }
    }
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(
    id: string,
    userId: string,
    settings: Record<string, any>
  ): Promise<OrganizationServiceResult<Organization>> {
    try {
      // Get current organization to merge settings
      const existingOrganization = await this.db.getOrganization(id)
      if (!existingOrganization) {
        return {
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        }
      }

      // Merge new settings with existing settings
      const mergedSettings = {
        ...existingOrganization.settings,
        ...settings
      }

      // Update organization with merged settings
      const updatedOrganization = await this.db.updateOrganization(id, {
        settings: mergedSettings
      })

      // Log the settings update
      await this.logOrganizationActivity(
        userId,
        id,
        'organization.settings.updated',
        'organization',
        id,
        {
          updatedSettings: Object.keys(settings),
          newValues: settings
        }
      )

      return { data: updatedOrganization }
    } catch (error) {
      console.error('Error updating organization settings:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to update organization settings',
        code: 'UPDATE_SETTINGS_ERROR'
      }
    }
  }

  /**
   * Delete organization (soft delete by updating metadata)
   */
  async deleteOrganization(
    id: string,
    userId: string
  ): Promise<OrganizationServiceResult<Organization>> {
    try {
      // Get current organization
      const existingOrganization = await this.db.getOrganization(id)
      if (!existingOrganization) {
        return {
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        }
      }

      // Update metadata to mark as deleted
      const updatedOrganization = await this.db.updateOrganization(id, {
        metadata: {
          ...existingOrganization.metadata,
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: userId
        }
      })

      // Log the organization deletion
      await this.logOrganizationActivity(
        userId,
        id,
        'organization.deleted',
        'organization',
        id,
        {
          deletedAt: new Date().toISOString(),
          organizationName: existingOrganization.name
        }
      )

      return { data: updatedOrganization }
    } catch (error) {
      console.error('Error deleting organization:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to delete organization',
        code: 'DELETE_ORGANIZATION_ERROR'
      }
    }
  }

  /**
   * Get organizations for a user
   */
  async getUserOrganizations(userId: string): Promise<OrganizationServiceResult<Organization[]>> {
    try {
      const organizations = await this.db.getUserOrganizations(userId)
      return { data: organizations }
    } catch (error) {
      console.error('Error getting user organizations:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get user organizations',
        code: 'GET_USER_ORGANIZATIONS_ERROR'
      }
    }
  }

  /**
   * Get organization with members
   */
  async getOrganizationWithMembers(id: string): Promise<OrganizationServiceResult<any>> {
    try {
      const organizationWithMembers = await this.db.getOrganizationWithMembers(id)
      
      if (!organizationWithMembers) {
        return {
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        }
      }

      return { data: organizationWithMembers }
    } catch (error) {
      console.error('Error getting organization with members:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get organization with members',
        code: 'GET_ORGANIZATION_MEMBERS_ERROR'
      }
    }
  }

  /**
   * Check if organization is active (not deleted)
   */
  async isOrganizationActive(id: string): Promise<OrganizationServiceResult<boolean>> {
    try {
      const organization = await this.db.getOrganization(id)
      
      if (!organization) {
        return {
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        }
      }

      const isActive = !organization.metadata?.deleted
      return { data: isActive }
    } catch (error) {
      console.error('Error checking organization status:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to check organization status',
        code: 'CHECK_ORGANIZATION_STATUS_ERROR'
      }
    }
  }

  /**
   * Generate unique slug from organization name
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    // Convert name to slug format
    let baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) // Limit length

    // Ensure slug is not empty
    if (!baseSlug) {
      baseSlug = 'organization'
    }

    let slug = baseSlug
    let counter = 1

    // Check for uniqueness and append counter if needed
    while (await this.isSlugTaken(slug)) {
      slug = `${baseSlug}-${counter}`
      counter++
      
      // Prevent infinite loop
      if (counter > 1000) {
        throw new Error('Unable to generate unique slug')
      }
    }

    return slug
  }

  /**
   * Check if slug is already taken
   */
  private async isSlugTaken(slug: string): Promise<boolean> {
    try {
      const organization = await this.db.getOrganizationBySlug(slug)
      return organization !== null
    } catch (error) {
      console.error('Error checking slug availability:', error)
      return true // Assume taken on error to be safe
    }
  }

  /**
   * Log organization activity to audit log
   */
  private async logOrganizationActivity(
    userId: string,
    organizationId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.db.createAuditLog({
        userId,
        organizationId,
        action,
        resource: resourceType,
        resourceId,
        details: metadata
      })
    } catch (error) {
      console.error('Failed to log organization activity:', error)
      // Don't throw error for logging failures
    }
  }
}

// Export singleton instance
export const organizationService = new OrganizationService()