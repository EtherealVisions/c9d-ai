/**
 * Organization Repository Implementation
 * 
 * This file implements the OrganizationRepository with all organization-related
 * database operations using Drizzle ORM and the base repository pattern.
 */

import { eq, and, or, like, ilike, desc, sql, count } from 'drizzle-orm'
import { BaseRepository, FilterCondition, QueryOptions, RepositoryResult, FilterHelpers } from './base-repository'
import { OrganizationRepositoryInterface } from './interfaces'
import { DrizzleDatabase } from '@/lib/db/connection'
import { 
  organizations, 
  organizationMemberships, 
  users, 
  roles,
  invitations,
  Organization, 
  NewOrganization, 
  OrganizationUpdate, 
  OrganizationWithMembers 
} from '@/lib/db/schema'
import { 
  createOrganizationSchema, 
  updateOrganizationSchema 
} from '@/lib/validation/schemas/organizations'
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors/custom-errors'

/**
 * Organization Repository Implementation
 * Handles all organization-related database operations with type safety and validation
 */
export class OrganizationRepository extends BaseRepository<Organization, NewOrganization, OrganizationUpdate> implements OrganizationRepositoryInterface {
  protected table = organizations
  protected insertSchema = createOrganizationSchema
  protected updateSchema = updateOrganizationSchema

  constructor(db: DrizzleDatabase) {
    super(db)
  }

  /**
   * Find organization by slug
   */
  async findBySlug(slug: string): Promise<Organization | null> {
    try {
      const result = await this.db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1)

      return result[0] || null
    } catch (error) {
      this.handleDatabaseError(error, 'findBySlug')
    }
  }

  /**
   * Find organization with all members and related data
   */
  async findWithMembers(id: string): Promise<OrganizationWithMembers | null> {
    try {
      const result = await this.db
        .select({
          // Organization fields
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          description: organizations.description,
          avatarUrl: organizations.avatarUrl,
          metadata: organizations.metadata,
          settings: organizations.settings,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          // Membership fields
          membershipId: organizationMemberships.id,
          membershipStatus: organizationMemberships.status,
          membershipJoinedAt: organizationMemberships.joinedAt,
          // User fields
          userId: users.id,
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userAvatarUrl: users.avatarUrl,
          // Role fields
          roleId: roles.id,
          roleName: roles.name,
          rolePermissions: roles.permissions
        })
        .from(organizations)
        .leftJoin(organizationMemberships, eq(organizations.id, organizationMemberships.organizationId))
        .leftJoin(users, eq(organizationMemberships.userId, users.id))
        .leftJoin(roles, eq(organizationMemberships.roleId, roles.id))
        .where(eq(organizations.id, id))

      if (!result.length || !result[0].id) {
        return null
      }

      // Transform the flat result into the expected structure
      const org = result[0]
      const memberships = result
        .filter(row => row.membershipId) // Only include rows with actual memberships
        .map(row => ({
          id: row.membershipId!,
          status: row.membershipStatus!,
          joinedAt: row.membershipJoinedAt!,
          user: {
            id: row.userId!,
            email: row.userEmail!,
            firstName: row.userFirstName,
            lastName: row.userLastName,
            avatarUrl: row.userAvatarUrl
          },
          role: {
            id: row.roleId!,
            name: row.roleName!,
            permissions: (row.rolePermissions as string[]) || []
          }
        }))

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        avatarUrl: org.avatarUrl,
        metadata: org.metadata,
        settings: org.settings,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        memberships
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findWithMembers')
    }
  }

  /**
   * Find organizations owned by a user (admin role)
   */
  async findByOwner(userId: string, options: QueryOptions = {}): Promise<RepositoryResult<Organization>> {
    try {
      const { pagination, sort = [{ field: 'createdAt', direction: 'desc' }] } = options

      let query = this.db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          description: organizations.description,
          avatarUrl: organizations.avatarUrl,
          metadata: organizations.metadata,
          settings: organizations.settings,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt
        })
        .from(organizations)
        .innerJoin(organizationMemberships, eq(organizations.id, organizationMemberships.organizationId))
        .innerJoin(roles, eq(organizationMemberships.roleId, roles.id))
        .where(
          and(
            eq(organizationMemberships.userId, userId),
            like(roles.name, '%admin%')
          )
        )

      // Apply sorting
      if (sort.length > 0) {
        const orderBy = this.buildOrderByClause(sort)
        query = query.orderBy(...orderBy) as any
      }

      // Apply pagination
      if (pagination) {
        query = query.limit(pagination.limit).offset(pagination.offset) as any
      }

      const data = await query

      // Get total count
      let total = data.length
      if (pagination) {
        const countResult = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(organizations)
          .innerJoin(organizationMemberships, eq(organizations.id, organizationMemberships.organizationId))
          .innerJoin(roles, eq(organizationMemberships.roleId, roles.id))
          .where(
            and(
              eq(organizationMemberships.userId, userId),
              like(roles.name, '%admin%')
            )
          )

        total = countResult[0]?.count || 0
      }

      return {
        data: data as Organization[],
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findByOwner')
    }
  }

  /**
   * Find organizations where user is a member
   */
  async findByMember(userId: string, options: QueryOptions = {}): Promise<RepositoryResult<Organization>> {
    try {
      const { pagination, sort = [{ field: 'createdAt', direction: 'desc' }] } = options

      let query = this.db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          description: organizations.description,
          avatarUrl: organizations.avatarUrl,
          metadata: organizations.metadata,
          settings: organizations.settings,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt
        })
        .from(organizations)
        .innerJoin(organizationMemberships, eq(organizations.id, organizationMemberships.organizationId))
        .where(eq(organizationMemberships.userId, userId))

      // Apply sorting
      if (sort.length > 0) {
        const orderBy = this.buildOrderByClause(sort)
        query = query.orderBy(...orderBy) as any
      }

      // Apply pagination
      if (pagination) {
        query = query.limit(pagination.limit).offset(pagination.offset) as any
      }

      const data = await query

      // Get total count
      let total = data.length
      if (pagination) {
        const countResult = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(organizations)
          .innerJoin(organizationMemberships, eq(organizations.id, organizationMemberships.organizationId))
          .where(eq(organizationMemberships.userId, userId))

        total = countResult[0]?.count || 0
      }

      return {
        data: data as Organization[],
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findByMember')
    }
  }

  /**
   * Search organizations by query string
   */
  async searchOrganizations(query: string, options: QueryOptions = {}): Promise<RepositoryResult<Organization>> {
    try {
      const { pagination, sort = [{ field: 'createdAt', direction: 'desc' }] } = options
      const searchPattern = `%${query}%`

      let dbQuery = this.db
        .select()
        .from(organizations)
        .where(
          or(
            ilike(organizations.name, searchPattern),
            ilike(organizations.slug, searchPattern),
            ilike(organizations.description, searchPattern)
          )
        )

      // Apply sorting
      if (sort.length > 0) {
        const orderBy = this.buildOrderByClause(sort)
        dbQuery = dbQuery.orderBy(...orderBy) as any
      }

      // Apply pagination
      if (pagination) {
        dbQuery = dbQuery.limit(pagination.limit).offset(pagination.offset) as any
      }

      const data = await dbQuery

      // Get total count
      let total = data.length
      if (pagination) {
        const countResult = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(organizations)
          .where(
            or(
              ilike(organizations.name, searchPattern),
              ilike(organizations.slug, searchPattern),
              ilike(organizations.description, searchPattern)
            )
          )

        total = countResult[0]?.count || 0
      }

      return {
        data: data as Organization[],
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'searchOrganizations')
    }
  }

  /**
   * Find active organizations (organizations with at least one active member)
   */
  async findActiveOrganizations(options: QueryOptions = {}): Promise<RepositoryResult<Organization>> {
    try {
      const { pagination, sort = [{ field: 'createdAt', direction: 'desc' }] } = options

      let query = this.db
        .selectDistinct({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          description: organizations.description,
          avatarUrl: organizations.avatarUrl,
          metadata: organizations.metadata,
          settings: organizations.settings,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt
        })
        .from(organizations)
        .innerJoin(organizationMemberships, eq(organizations.id, organizationMemberships.organizationId))
        .where(eq(organizationMemberships.status, 'active'))

      // Apply sorting
      if (sort.length > 0) {
        const orderBy = this.buildOrderByClause(sort)
        query = query.orderBy(...orderBy) as any
      }

      // Apply pagination
      if (pagination) {
        query = query.limit(pagination.limit).offset(pagination.offset) as any
      }

      const data = await query

      // Get total count
      let total = data.length
      if (pagination) {
        const countResult = await this.db
          .selectDistinct({ count: sql<number>`count(DISTINCT ${organizations.id})` })
          .from(organizations)
          .innerJoin(organizationMemberships, eq(organizations.id, organizationMemberships.organizationId))
          .where(eq(organizationMemberships.status, 'active'))

        total = countResult[0]?.count || 0
      }

      return {
        data: data as Organization[],
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findActiveOrganizations')
    }
  }

  /**
   * Update organization settings
   */
  async updateSettings(id: string, settings: Record<string, unknown>): Promise<Organization> {
    try {
      const result = await this.db
        .update(organizations)
        .set({
          settings,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, id))
        .returning()

      if (!result[0]) {
        throw new NotFoundError('NOT_FOUND', 'Organization not found for settings update')
      }

      return result[0]
    } catch (error) {
      this.handleDatabaseError(error, 'updateSettings')
    }
  }

  /**
   * Get organization settings
   */
  async getSettings(id: string): Promise<Record<string, unknown>> {
    try {
      const result = await this.db
        .select({ settings: organizations.settings })
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1)

      if (!result[0]) {
        throw new NotFoundError('NOT_FOUND', 'Organization not found')
      }

      return result[0].settings as Record<string, unknown>
    } catch (error) {
      this.handleDatabaseError(error, 'getSettings')
    }
  }

  /**
   * Update organization metadata
   */
  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<Organization> {
    try {
      const result = await this.db
        .update(organizations)
        .set({
          metadata,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, id))
        .returning()

      if (!result[0]) {
        throw new NotFoundError('NOT_FOUND', 'Organization not found for metadata update')
      }

      return result[0]
    } catch (error) {
      this.handleDatabaseError(error, 'updateMetadata')
    }
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(id: string): Promise<{
    memberCount: number
    activeMembers: number
    pendingInvitations: number
    rolesCount: number
    createdAt: Date
  }> {
    try {
      // Get organization basic info
      const orgResult = await this.db
        .select({
          createdAt: organizations.createdAt
        })
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1)

      if (!orgResult[0]) {
        throw new NotFoundError('NOT_FOUND', 'Organization not found')
      }

      // Get member count
      const memberCountResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(organizationMemberships)
        .where(eq(organizationMemberships.organizationId, id))

      // Get active members count
      const activeMembersResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, id),
            eq(organizationMemberships.status, 'active')
          )
        )

      // Get pending invitations count (if invitations table exists)
      let pendingInvitations = 0
      try {
        const pendingInvitationsResult = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(invitations)
          .where(eq(invitations.organizationId, id))
        
        pendingInvitations = pendingInvitationsResult[0]?.count || 0
      } catch {
        // Invitations table might not exist yet
      }

      // Get roles count
      const rolesCountResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(roles)
        .where(eq(roles.organizationId, id))

      return {
        memberCount: memberCountResult[0]?.count || 0,
        activeMembers: activeMembersResult[0]?.count || 0,
        pendingInvitations,
        rolesCount: rolesCountResult[0]?.count || 0,
        createdAt: orgResult[0].createdAt
      }
    } catch (error) {
      this.handleDatabaseError(error, 'getOrganizationStats')
    }
  }

  /**
   * Check if slug is available
   */
  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    try {
      let query = this.db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, slug))

      if (excludeId) {
        query = query.where(and(eq(organizations.slug, slug), eq(organizations.id, excludeId))) as any
      }

      const result = await query.limit(1)
      return result.length === 0
    } catch (error) {
      this.handleDatabaseError(error, 'isSlugAvailable')
    }
  }

  /**
   * Generate unique slug from base name
   */
  async generateUniqueSlug(baseName: string): Promise<string> {
    try {
      // Convert to slug format
      let baseSlug = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      // Ensure minimum length
      if (baseSlug.length < 3) {
        baseSlug = `org-${baseSlug}`
      }

      let slug = baseSlug
      let counter = 1

      // Keep trying until we find an available slug
      while (!(await this.isSlugAvailable(slug))) {
        slug = `${baseSlug}-${counter}`
        counter++
        
        // Prevent infinite loop
        if (counter > 1000) {
          slug = `${baseSlug}-${Date.now()}`
          break
        }
      }

      return slug
    } catch (error) {
      this.handleDatabaseError(error, 'generateUniqueSlug')
    }
  }

  /**
   * Override create method to add slug validation
   */
  async create(data: NewOrganization): Promise<Organization> {
    try {
      // Check if organization with slug already exists
      const existingOrg = await this.findBySlug(data.slug)
      if (existingOrg) {
        throw new ConflictError('CONFLICT', 'Organization with this slug already exists')
      }

      return await super.create(data)
    } catch (error) {
      this.handleDatabaseError(error, 'create')
    }
  }

  /**
   * Override update method to validate slug changes
   */
  async update(id: string, data: OrganizationUpdate): Promise<Organization> {
    try {
      // If slug is being updated, check availability
      if (data.slug) {
        const isAvailable = await this.isSlugAvailable(data.slug, id)
        if (!isAvailable) {
          throw new ConflictError('CONFLICT', 'Organization with this slug already exists')
        }
      }

      return await super.update(id, data)
    } catch (error) {
      this.handleDatabaseError(error, 'update')
    }
  }

  /**
   * Soft delete organization (deactivate instead of hard delete)
   */
  async deactivate(id: string): Promise<Organization> {
    try {
      // Update all memberships to inactive
      await this.db
        .update(organizationMemberships)
        .set({ 
          status: 'inactive',
          updatedAt: new Date()
        })
        .where(eq(organizationMemberships.organizationId, id))

      // Update organization metadata to mark as deactivated
      const org = await this.findById(id)
      if (!org) {
        throw new NotFoundError('NOT_FOUND', 'Organization not found for deactivation')
      }

      const updatedMetadata = {
        ...org.metadata as Record<string, unknown>,
        deactivated: true,
        deactivatedAt: new Date().toISOString()
      }

      return await this.updateMetadata(id, updatedMetadata)
    } catch (error) {
      this.handleDatabaseError(error, 'deactivate')
    }
  }

  /**
   * Reactivate organization
   */
  async reactivate(id: string): Promise<Organization> {
    try {
      const org = await this.findById(id)
      if (!org) {
        throw new NotFoundError('NOT_FOUND', 'Organization not found for reactivation')
      }

      const updatedMetadata = {
        ...org.metadata as Record<string, unknown>
      }
      delete updatedMetadata.deactivated
      delete updatedMetadata.deactivatedAt

      return await this.updateMetadata(id, updatedMetadata)
    } catch (error) {
      this.handleDatabaseError(error, 'reactivate')
    }
  }
}