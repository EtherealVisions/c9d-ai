/**
 * Organization Membership Repository Implementation
 * 
 * This file implements the OrganizationMembershipRepository with all membership-related
 * database operations using Drizzle ORM and the base repository pattern.
 */

import { eq, and, or, desc, sql, inArray } from 'drizzle-orm'
import { BaseRepository, FilterCondition, QueryOptions, RepositoryResult, FilterHelpers } from './base-repository'
import { OrganizationMembershipRepositoryInterface } from './interfaces'
import { DrizzleDatabase } from '@/lib/db/connection'
import { 
  organizationMemberships, 
  users, 
  organizations, 
  roles,
  OrganizationMembership, 
  NewOrganizationMembership, 
  OrganizationMembershipUpdate, 
  MembershipWithRelations 
} from '@/lib/db/schema'
import { 
  createOrganizationMembershipSchema, 
  updateOrganizationMembershipSchema 
} from '@/lib/validation/schemas/organizations'
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors/custom-errors'

/**
 * Organization Membership Repository Implementation
 * Handles all membership-related database operations with type safety and validation
 */
export class OrganizationMembershipRepository extends BaseRepository<OrganizationMembership, NewOrganizationMembership, OrganizationMembershipUpdate> implements OrganizationMembershipRepositoryInterface {
  protected table = organizationMemberships
  protected insertSchema = createOrganizationMembershipSchema
  protected updateSchema = updateOrganizationMembershipSchema

  constructor(db: DrizzleDatabase) {
    super(db)
  }

  /**
   * Find membership by user and organization
   */
  async findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMembership | null> {
    try {
      const result = await this.db
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.userId, userId),
            eq(organizationMemberships.organizationId, organizationId)
          )
        )
        .limit(1)

      return result[0] || null
    } catch (error) {
      this.handleDatabaseError(error, 'findByUserAndOrganization')
    }
  }

  /**
   * Find membership with all related data
   */
  async findWithRelations(id: string): Promise<MembershipWithRelations | null> {
    try {
      const result = await this.db
        .select({
          // Membership fields
          id: organizationMemberships.id,
          userId: organizationMemberships.userId,
          organizationId: organizationMemberships.organizationId,
          roleId: organizationMemberships.roleId,
          status: organizationMemberships.status,
          joinedAt: organizationMemberships.joinedAt,
          createdAt: organizationMemberships.createdAt,
          updatedAt: organizationMemberships.updatedAt,
          // User fields
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userAvatarUrl: users.avatarUrl,
          // Organization fields
          organizationName: organizations.name,
          organizationSlug: organizations.slug,
          // Role fields
          roleName: roles.name,
          rolePermissions: roles.permissions
        })
        .from(organizationMemberships)
        .innerJoin(users, eq(organizationMemberships.userId, users.id))
        .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
        .innerJoin(roles, eq(organizationMemberships.roleId, roles.id))
        .where(eq(organizationMemberships.id, id))
        .limit(1)

      if (!result[0]) {
        return null
      }

      const row = result[0]
      return {
        id: row.id,
        userId: row.userId,
        organizationId: row.organizationId,
        roleId: row.roleId,
        status: row.status,
        joinedAt: row.joinedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: {
          id: row.userId,
          email: row.userEmail,
          firstName: row.userFirstName,
          lastName: row.userLastName,
          avatarUrl: row.userAvatarUrl
        },
        organization: {
          id: row.organizationId,
          name: row.organizationName,
          slug: row.organizationSlug
        },
        role: {
          id: row.roleId,
          name: row.roleName,
          permissions: (row.rolePermissions as string[]) || []
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findWithRelations')
    }
  }

  /**
   * Find memberships by user
   */
  async findByUser(userId: string, options: QueryOptions = {}): Promise<RepositoryResult<OrganizationMembership>> {
    try {
      const { pagination, sort = [{ field: 'joinedAt', direction: 'desc' }] } = options

      let query = this.db
        .select()
        .from(organizationMemberships)
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
          .from(organizationMemberships)
          .where(eq(organizationMemberships.userId, userId))

        total = countResult[0]?.count || 0
      }

      return {
        data: data as OrganizationMembership[],
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findByUser')
    }
  }

  /**
   * Find memberships by organization
   */
  async findByOrganization(organizationId: string, options: QueryOptions = {}): Promise<RepositoryResult<OrganizationMembership>> {
    try {
      const { pagination, sort = [{ field: 'joinedAt', direction: 'desc' }] } = options

      let query = this.db
        .select()
        .from(organizationMemberships)
        .where(eq(organizationMemberships.organizationId, organizationId))

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
          .from(organizationMemberships)
          .where(eq(organizationMemberships.organizationId, organizationId))

        total = countResult[0]?.count || 0
      }

      return {
        data: data as OrganizationMembership[],
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findByOrganization')
    }
  }

  /**
   * Find memberships by role
   */
  async findByRole(roleId: string, options: QueryOptions = {}): Promise<RepositoryResult<OrganizationMembership>> {
    try {
      const { pagination, sort = [{ field: 'joinedAt', direction: 'desc' }] } = options

      let query = this.db
        .select()
        .from(organizationMemberships)
        .where(eq(organizationMemberships.roleId, roleId))

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
          .from(organizationMemberships)
          .where(eq(organizationMemberships.roleId, roleId))

        total = countResult[0]?.count || 0
      }

      return {
        data: data as OrganizationMembership[],
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findByRole')
    }
  }

  /**
   * Find active memberships for an organization
   */
  async findActiveMemberships(organizationId: string): Promise<OrganizationMembership[]> {
    try {
      const result = await this.db
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.status, 'active')
          )
        )
        .orderBy(desc(organizationMemberships.joinedAt))

      return result as OrganizationMembership[]
    } catch (error) {
      this.handleDatabaseError(error, 'findActiveMemberships')
    }
  }

  /**
   * Find pending memberships for an organization
   */
  async findPendingMemberships(organizationId: string): Promise<OrganizationMembership[]> {
    try {
      const result = await this.db
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.status, 'pending')
          )
        )
        .orderBy(desc(organizationMemberships.createdAt))

      return result as OrganizationMembership[]
    } catch (error) {
      this.handleDatabaseError(error, 'findPendingMemberships')
    }
  }

  /**
   * Update membership status
   */
  async updateStatus(id: string, status: 'active' | 'inactive' | 'pending'): Promise<OrganizationMembership> {
    try {
      const result = await this.db
        .update(organizationMemberships)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(organizationMemberships.id, id))
        .returning()

      if (!result[0]) {
        throw new NotFoundError('NOT_FOUND', 'Membership not found for status update')
      }

      return result[0]
    } catch (error) {
      this.handleDatabaseError(error, 'updateStatus')
    }
  }

  /**
   * Update membership role
   */
  async updateRole(id: string, roleId: string): Promise<OrganizationMembership> {
    try {
      // Verify role exists
      const roleExists = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1)

      if (!roleExists[0]) {
        throw new NotFoundError('NOT_FOUND', 'Role not found')
      }

      const result = await this.db
        .update(organizationMemberships)
        .set({
          roleId,
          updatedAt: new Date()
        })
        .where(eq(organizationMemberships.id, id))
        .returning()

      if (!result[0]) {
        throw new NotFoundError('NOT_FOUND', 'Membership not found for role update')
      }

      return result[0]
    } catch (error) {
      this.handleDatabaseError(error, 'updateRole')
    }
  }

  /**
   * Find memberships by role in organization
   */
  async findByRoleInOrganization(organizationId: string, roleId: string): Promise<OrganizationMembership[]> {
    try {
      const result = await this.db
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.roleId, roleId)
          )
        )
        .orderBy(desc(organizationMemberships.joinedAt))

      return result as OrganizationMembership[]
    } catch (error) {
      this.handleDatabaseError(error, 'findByRoleInOrganization')
    }
  }

  /**
   * Check if user can join organization
   */
  async canUserJoinOrganization(userId: string, organizationId: string): Promise<boolean> {
    try {
      // Check if user already has membership
      const existingMembership = await this.findByUserAndOrganization(userId, organizationId)
      if (existingMembership) {
        return false // User already has membership
      }

      // Additional business rules can be added here
      // For example: check organization membership limits, user limits, etc.

      return true
    } catch (error) {
      this.handleDatabaseError(error, 'canUserJoinOrganization')
    }
  }

  /**
   * Get membership count for organization
   */
  async getMembershipCount(organizationId: string): Promise<number> {
    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(organizationMemberships)
        .where(eq(organizationMemberships.organizationId, organizationId))

      return result[0]?.count || 0
    } catch (error) {
      this.handleDatabaseError(error, 'getMembershipCount')
    }
  }

  /**
   * Get membership count for user
   */
  async getUserMembershipCount(userId: string): Promise<number> {
    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(organizationMemberships)
        .where(eq(organizationMemberships.userId, userId))

      return result[0]?.count || 0
    } catch (error) {
      this.handleDatabaseError(error, 'getUserMembershipCount')
    }
  }

  /**
   * Create multiple memberships
   */
  async createMemberships(memberships: NewOrganizationMembership[]): Promise<OrganizationMembership[]> {
    try {
      // Validate each membership
      const validatedMemberships = memberships.map(membership => 
        this.validateInsertData(membership)
      )

      // Check for duplicate memberships
      for (const membership of validatedMemberships) {
        const existing = await this.findByUserAndOrganization(
          membership.userId, 
          membership.organizationId
        )
        if (existing) {
          throw new ConflictError('CONFLICT', `User already has membership in organization`)
        }
      }

      const result = await this.db
        .insert(organizationMemberships)
        .values(validatedMemberships as any[])
        .returning()

      return result as OrganizationMembership[]
    } catch (error) {
      this.handleDatabaseError(error, 'createMemberships')
    }
  }

  /**
   * Remove members by role
   */
  async removeMembersByRole(organizationId: string, roleId: string): Promise<number> {
    try {
      const result = await this.db
        .delete(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.roleId, roleId)
          )
        )
        .returning()

      return result.length
    } catch (error) {
      this.handleDatabaseError(error, 'removeMembersByRole')
    }
  }

  /**
   * Override create method to add membership validation
   */
  async create(data: NewOrganizationMembership): Promise<OrganizationMembership> {
    try {
      // Check if user can join organization
      const canJoin = await this.canUserJoinOrganization(data.userId, data.organizationId)
      if (!canJoin) {
        throw new ConflictError('CONFLICT', 'User cannot join this organization')
      }

      // Verify user exists
      const userExists = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, data.userId))
        .limit(1)

      if (!userExists[0]) {
        throw new NotFoundError('NOT_FOUND', 'User not found')
      }

      // Verify organization exists
      const orgExists = await this.db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, data.organizationId))
        .limit(1)

      if (!orgExists[0]) {
        throw new NotFoundError('NOT_FOUND', 'Organization not found')
      }

      // Verify role exists and belongs to organization
      const roleExists = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(
            eq(roles.id, data.roleId),
            eq(roles.organizationId, data.organizationId)
          )
        )
        .limit(1)

      if (!roleExists[0]) {
        throw new NotFoundError('NOT_FOUND', 'Role not found in organization')
      }

      return await super.create(data)
    } catch (error) {
      this.handleDatabaseError(error, 'create')
    }
  }

  /**
   * Activate membership
   */
  async activate(id: string): Promise<OrganizationMembership> {
    try {
      return await this.updateStatus(id, 'active')
    } catch (error) {
      this.handleDatabaseError(error, 'activate')
    }
  }

  /**
   * Deactivate membership
   */
  async deactivate(id: string): Promise<OrganizationMembership> {
    try {
      return await this.updateStatus(id, 'inactive')
    } catch (error) {
      this.handleDatabaseError(error, 'deactivate')
    }
  }

  /**
   * Transfer members from one role to another
   */
  async transferMembersToRole(organizationId: string, fromRoleId: string, toRoleId: string): Promise<OrganizationMembership[]> {
    try {
      // Verify target role exists
      const roleExists = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(
            eq(roles.id, toRoleId),
            eq(roles.organizationId, organizationId)
          )
        )
        .limit(1)

      if (!roleExists[0]) {
        throw new NotFoundError('NOT_FOUND', 'Target role not found in organization')
      }

      const result = await this.db
        .update(organizationMemberships)
        .set({
          roleId: toRoleId,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.roleId, fromRoleId)
          )
        )
        .returning()

      return result as OrganizationMembership[]
    } catch (error) {
      this.handleDatabaseError(error, 'transferMembersToRole')
    }
  }

  /**
   * Get membership statistics for organization
   */
  async getOrganizationMembershipStats(organizationId: string): Promise<{
    total: number
    active: number
    inactive: number
    pending: number
    byRole: Record<string, number>
  }> {
    try {
      // Get total counts by status
      const statusCounts = await this.db
        .select({
          status: organizationMemberships.status,
          count: sql<number>`count(*)`
        })
        .from(organizationMemberships)
        .where(eq(organizationMemberships.organizationId, organizationId))
        .groupBy(organizationMemberships.status)

      // Get counts by role
      const roleCounts = await this.db
        .select({
          roleId: organizationMemberships.roleId,
          roleName: roles.name,
          count: sql<number>`count(*)`
        })
        .from(organizationMemberships)
        .innerJoin(roles, eq(organizationMemberships.roleId, roles.id))
        .where(eq(organizationMemberships.organizationId, organizationId))
        .groupBy(organizationMemberships.roleId, roles.name)

      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0,
        byRole: {} as Record<string, number>
      }

      // Process status counts
      for (const statusCount of statusCounts) {
        const count = statusCount.count
        stats.total += count
        
        switch (statusCount.status) {
          case 'active':
            stats.active = count
            break
          case 'inactive':
            stats.inactive = count
            break
          case 'pending':
            stats.pending = count
            break
        }
      }

      // Process role counts
      for (const roleCount of roleCounts) {
        stats.byRole[roleCount.roleName] = roleCount.count
      }

      return stats
    } catch (error) {
      this.handleDatabaseError(error, 'getOrganizationMembershipStats')
    }
  }
}