/**
 * OrganizationService - Comprehensive organization management service
 * Migrated to use Drizzle repositories and Zod validation
 * Provides CRUD operations for organizations, metadata, and settings management
 */

import { OrganizationRepository } from '@/lib/repositories/organization-repository'
import { OrganizationMembershipRepository } from '@/lib/repositories/organization-membership-repository'
import { RoleRepository } from '@/lib/repositories/role-repository'
import { getRepositoryFactory } from '@/lib/repositories/factory'
import { auditService } from './audit-service'
import { 
  validateCreateOrganization, 
  validateUpdateOrganization,
  type CreateOrganization,
  type UpdateOrganization,
  type OrganizationApiResponse
} from '@/lib/validation/schemas/organizations'
import { 
  ValidationError, 
  NotFoundError, 
  DatabaseError, 
  ErrorCode 
} from '@/lib/errors/custom-errors'
import type { Organization } from '@/lib/db/schema'

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
  private organizationRepository: OrganizationRepository
  private membershipRepository: OrganizationMembershipRepository
  private roleRepository: RoleRepository

  constructor() {
    const factory = getRepositoryFactory()
    this.organizationRepository = factory.createOrganizationRepository()
    this.membershipRepository = factory.createOrganizationMembershipRepository()
    this.roleRepository = factory.createRoleRepository()
  }

  /**
   * Create a new organization with unique slug generation and validation
   */
  async createOrganization(
    creatorUserId: string,
    organizationData: CreateOrganizationData
  ): Promise<OrganizationServiceResult<OrganizationApiResponse>> {
    try {
      // Validate input parameters
      if (!creatorUserId || typeof creatorUserId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid creator user ID is required')
      }

      // Validate the organization data using Zod schema
      const validatedData = validateCreateOrganization({
        ...organizationData,
        slug: await this.generateUniqueSlug(organizationData.name)
      })

      // Create the organization using repository
      const organization = await this.organizationRepository.create(validatedData)

      // Log the organization creation with audit service
      await auditService.logEvent({
        userId: creatorUserId,
        organizationId: organization.id,
        action: 'organization.created',
        resourceType: 'organization',
        resourceId: organization.id,
        severity: 'low',
        metadata: {
          organizationName: organization.name,
          slug: organization.slug,
          createdBy: creatorUserId
        }
      })

      // Transform to API response format
      const organizationResponse: OrganizationApiResponse = {
        ...organization,
        memberCount: 0, // Will be populated by separate query if needed
        isOwner: true, // Creator is owner
        canEdit: true,
        canDelete: true,
        userPermissions: ['organization.read', 'organization.update', 'organization.delete']
      }

      return { data: organizationResponse }
    } catch (error) {
      console.error('Error creating organization:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
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
   * Get organization by ID with validation and access control
   */
  async getOrganization(id: string, userId?: string): Promise<OrganizationServiceResult<OrganizationApiResponse>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid organization ID is required')
      }

      const organization = await this.organizationRepository.findById(id)
      
      if (!organization) {
        throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found')
      }

      // Check if organization is active (not deleted)
      if (organization.metadata?.deleted) {
        throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found')
      }

      // Get user permissions if userId is provided
      let userPermissions: string[] = []
      let isOwner = false
      let canEdit = false
      let canDelete = false

      if (userId) {
        // Check user membership and permissions
        const membership = await this.membershipRepository.findByUserAndOrganization(userId, id)
        if (membership) {
          const role = await this.roleRepository.findById(membership.roleId)
          if (role) {
            userPermissions = role.permissions as string[]
            isOwner = role.name.toLowerCase().includes('owner') || role.name.toLowerCase().includes('admin')
            canEdit = userPermissions.includes('organization.update') || isOwner
            canDelete = userPermissions.includes('organization.delete') || isOwner
          }
        }

        // Log data access with audit service
        await auditService.logEvent({
          userId,
          organizationId: id,
          action: 'organization.read',
          resourceType: 'organization',
          resourceId: id,
          severity: 'low',
          metadata: {
            organizationName: organization.name,
            hasAccess: membership !== null
          }
        })
      }

      // Get member count
      const memberCount = await this.membershipRepository.countByOrganization(id)

      // Transform to API response format
      const organizationResponse: OrganizationApiResponse = {
        ...organization,
        memberCount,
        isOwner,
        canEdit,
        canDelete,
        userPermissions
      }

      return { data: organizationResponse }
    } catch (error) {
      console.error('Error getting organization:', error)
      
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
        error: error instanceof Error ? error.message : 'Failed to get organization',
        code: 'GET_ORGANIZATION_ERROR'
      }
    }
  }

  /**
   * Get organization by slug with validation
   */
  async getOrganizationBySlug(slug: string): Promise<OrganizationServiceResult<OrganizationApiResponse>> {
    try {
      // Validate input
      if (!slug || typeof slug !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid organization slug is required')
      }

      const organization = await this.organizationRepository.findBySlug(slug)
      
      if (!organization) {
        throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found')
      }

      // Check if organization is active (not deleted)
      if (organization.metadata?.deleted) {
        throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found')
      }

      // Get member count
      const memberCount = await this.membershipRepository.countByOrganization(organization.id)

      // Transform to API response format (no user-specific permissions for public access)
      const organizationResponse: OrganizationApiResponse = {
        ...organization,
        memberCount,
        isOwner: false,
        canEdit: false,
        canDelete: false,
        userPermissions: []
      }

      return { data: organizationResponse }
    } catch (error) {
      console.error('Error getting organization by slug:', error)
      
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
        error: error instanceof Error ? error.message : 'Failed to get organization',
        code: 'GET_ORGANIZATION_ERROR'
      }
    }
  }

  /**
   * Update organization information with validation and access control
   */
  async updateOrganization(
    id: string,
    userId: string,
    updateData: UpdateOrganizationData
  ): Promise<OrganizationServiceResult<OrganizationApiResponse>> {
    try {
      // Validate input parameters
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid organization ID is required')
      }
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      // Validate the update data using Zod schema
      const validatedData = validateUpdateOrganization(updateData)

      // Check if organization exists
      const existingOrganization = await this.organizationRepository.findById(id)
      if (!existingOrganization) {
        throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found')
      }

      // Check if organization is active (not deleted)
      if (existingOrganization.metadata?.deleted) {
        throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found')
      }

      // Check user permissions
      const membership = await this.membershipRepository.findByUserAndOrganization(userId, id)
      if (!membership) {
        throw new ValidationError(ErrorCode.PERMISSION_DENIED, 'Access denied to organization')
      }

      const role = await this.roleRepository.findById(membership.roleId)
      if (!role) {
        throw new ValidationError(ErrorCode.PERMISSION_DENIED, 'Invalid user role')
      }

      const userPermissions = role.permissions as string[]
      const canUpdate = userPermissions.includes('organization.update') || 
                       role.name.toLowerCase().includes('owner') || 
                       role.name.toLowerCase().includes('admin')

      if (!canUpdate) {
        throw new ValidationError(ErrorCode.PERMISSION_DENIED, 'Insufficient permissions to update organization')
      }

      // Store previous values for audit logging
      const previousValues = {
        name: existingOrganization.name,
        description: existingOrganization.description,
        avatarUrl: existingOrganization.avatarUrl
      }

      // Update the organization using repository
      const updatedOrganization = await this.organizationRepository.update(id, validatedData)

      // Log the organization update with audit service
      await auditService.logEvent({
        userId,
        organizationId: id,
        action: 'organization.updated',
        resourceType: 'organization',
        resourceId: id,
        severity: 'low',
        metadata: {
          updatedFields: Object.keys(updateData),
          previousValues,
          newValues: validatedData,
          organizationName: updatedOrganization.name
        }
      })

      // Get member count for response
      const memberCount = await this.membershipRepository.countByOrganization(id)

      // Transform to API response format
      const organizationResponse: OrganizationApiResponse = {
        ...updatedOrganization,
        memberCount,
        isOwner: role.name.toLowerCase().includes('owner') || role.name.toLowerCase().includes('admin'),
        canEdit: true, // User just updated, so they can edit
        canDelete: userPermissions.includes('organization.delete') || role.name.toLowerCase().includes('owner'),
        userPermissions
      }

      return { data: organizationResponse }
    } catch (error) {
      console.error('Error updating organization:', error)
      
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
        error: error instanceof Error ? error.message : 'Failed to update organization',
        code: 'UPDATE_ORGANIZATION_ERROR'
      }
    }
  }

  /**
   * Update organization metadata with validation
   */
  async updateOrganizationMetadata(
    id: string,
    userId: string,
    metadata: Record<string, any>
  ): Promise<OrganizationServiceResult<OrganizationApiResponse>> {
    try {
      // Validate input parameters
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid organization ID is required')
      }
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      // Get current organization to merge metadata
      const existingOrganization = await this.organizationRepository.findById(id)
      if (!existingOrganization) {
        throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found')
      }

      // Merge new metadata with existing metadata
      const mergedMetadata = {
        ...existingOrganization.metadata as Record<string, unknown>,
        ...metadata
      }

      // Update organization with merged metadata using repository
      const updatedOrganization = await this.organizationRepository.update(id, {
        metadata: mergedMetadata
      })

      // Log the metadata update with audit service
      await auditService.logEvent({
        userId,
        organizationId: id,
        action: 'organization.metadata.updated',
        resourceType: 'organization',
        resourceId: id,
        severity: 'low',
        metadata: {
          updatedMetadata: Object.keys(metadata),
          newValues: metadata,
          organizationName: updatedOrganization.name
        }
      })

      // Get member count for response
      const memberCount = await this.membershipRepository.countByOrganization(id)

      // Transform to API response format
      const organizationResponse: OrganizationApiResponse = {
        ...updatedOrganization,
        memberCount,
        isOwner: false, // Will be determined by caller if needed
        canEdit: true,
        canDelete: false,
        userPermissions: []
      }

      return { data: organizationResponse }
    } catch (error) {
      console.error('Error updating organization metadata:', error)
      
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
        error: error instanceof Error ? error.message : 'Failed to update organization metadata',
        code: 'UPDATE_METADATA_ERROR'
      }
    }
  }



  /**
   * Delete organization (soft delete by updating metadata) with validation
   */
  async deleteOrganization(
    id: string,
    userId: string
  ): Promise<OrganizationServiceResult<boolean>> {
    try {
      // Validate input parameters
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid organization ID is required')
      }
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      // Get current organization
      const existingOrganization = await this.organizationRepository.findById(id)
      if (!existingOrganization) {
        throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found')
      }

      // Check if already deleted
      if (existingOrganization.metadata?.deleted) {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Organization is already deleted')
      }

      // Check user permissions
      const membership = await this.membershipRepository.findByUserAndOrganization(userId, id)
      if (!membership) {
        throw new ValidationError(ErrorCode.PERMISSION_DENIED, 'Access denied to organization')
      }

      const role = await this.roleRepository.findById(membership.roleId)
      if (!role) {
        throw new ValidationError(ErrorCode.PERMISSION_DENIED, 'Invalid user role')
      }

      const userPermissions = role.permissions as string[]
      const canDelete = userPermissions.includes('organization.delete') || 
                       role.name.toLowerCase().includes('owner')

      if (!canDelete) {
        throw new ValidationError(ErrorCode.PERMISSION_DENIED, 'Insufficient permissions to delete organization')
      }

      // Update metadata to mark as deleted (soft delete)
      await this.organizationRepository.update(id, {
        metadata: {
          ...existingOrganization.metadata as Record<string, unknown>,
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: userId
        }
      })

      // Log the organization deletion with audit service
      await auditService.logEvent({
        userId,
        organizationId: id,
        action: 'organization.deleted',
        resourceType: 'organization',
        resourceId: id,
        severity: 'high',
        metadata: {
          deletedAt: new Date().toISOString(),
          organizationName: existingOrganization.name,
          softDelete: true
        }
      })

      return { data: true }
    } catch (error) {
      console.error('Error deleting organization:', error)
      
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
      const organizations = await (await this.getDb()).getUserOrganizations(userId)
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
   * Check if organization is active (not deleted)
   */
  async isOrganizationActive(id: string): Promise<OrganizationServiceResult<boolean>> {
    try {
      const organization = await (await this.getDb()).getOrganization(id)
      
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
        throw new DatabaseError(ErrorCode.DATABASE_ERROR, 'Unable to generate unique slug')
      }
    }

    return slug
  }

  /**
   * Check if slug is already taken using repository
   */
  private async isSlugTaken(slug: string): Promise<boolean> {
    try {
      const organization = await this.organizationRepository.findBySlug(slug)
      return organization !== null
    } catch (error) {
      console.error('Error checking slug availability:', error)
      return true // Assume taken on error to be safe
    }
  }

  /**
   * Get organizations for a user with validation
   */
  async getUserOrganizations(userId: string): Promise<OrganizationServiceResult<OrganizationApiResponse[]>> {
    try {
      // Validate input
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      const organizations = await this.organizationRepository.findByUser(userId)
      
      // Transform to API response format
      const organizationResponses: OrganizationApiResponse[] = await Promise.all(
        organizations.data.map(async (org) => {
          const memberCount = await this.membershipRepository.countByOrganization(org.id)
          const membership = await this.membershipRepository.findByUserAndOrganization(userId, org.id)
          
          let isOwner = false
          let canEdit = false
          let canDelete = false
          let userPermissions: string[] = []

          if (membership) {
            const role = await this.roleRepository.findById(membership.roleId)
            if (role) {
              userPermissions = role.permissions as string[]
              isOwner = role.name.toLowerCase().includes('owner') || role.name.toLowerCase().includes('admin')
              canEdit = userPermissions.includes('organization.update') || isOwner
              canDelete = userPermissions.includes('organization.delete') || isOwner
            }
          }

          return {
            ...org,
            memberCount,
            isOwner,
            canEdit,
            canDelete,
            userPermissions
          }
        })
      )

      return { data: organizationResponses }
    } catch (error) {
      console.error('Error getting user organizations:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to get user organizations',
        code: 'GET_USER_ORGANIZATIONS_ERROR'
      }
    }
  }

  /**
   * Check if organization is active (not deleted) with validation
   */
  async isOrganizationActive(id: string): Promise<OrganizationServiceResult<boolean>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid organization ID is required')
      }

      const organization = await this.organizationRepository.findById(id)
      
      if (!organization) {
        throw new NotFoundError(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found')
      }

      const isActive = !organization.metadata?.deleted
      return { data: isActive }
    } catch (error) {
      console.error('Error checking organization status:', error)
      
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
        error: error instanceof Error ? error.message : 'Failed to check organization status',
        code: 'CHECK_ORGANIZATION_STATUS_ERROR'
      }
    }
  }
}

// Export singleton instance
export const organizationService = new OrganizationService()