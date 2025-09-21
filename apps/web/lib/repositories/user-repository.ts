/**
 * User Repository Implementation
 * 
 * This file implements the UserRepository with all user-related database operations
 * using Drizzle ORM and the base repository pattern.
 */

import { eq, and, or, like, ilike, gte, desc, sql } from 'drizzle-orm'
import { BaseRepository, FilterCondition, QueryOptions, RepositoryResult, FilterHelpers } from './base-repository'
import { UserRepositoryInterface } from './interfaces'
import { DrizzleDatabase } from '@/lib/db/connection'
import { 
  users, 
  organizationMemberships, 
  organizations, 
  roles,
  User, 
  NewUser, 
  UserUpdate, 
  UserWithMemberships 
} from '@/lib/db/schema'
import { 
  createUserSchema, 
  updateUserSchema,
  validateCreateUser,
  validateUpdateUser
} from '@/lib/validation/schemas/users'
import { NotFoundError, ValidationError } from '@/lib/errors/custom-errors'

/**
 * User Repository Implementation
 * Handles all user-related database operations with type safety and validation
 */
export class UserRepository extends BaseRepository<User, NewUser, UserUpdate> implements UserRepositoryInterface {
  protected table = users
  protected insertSchema = createUserSchema
  protected updateSchema = updateUserSchema

  constructor(db: DrizzleDatabase) {
    super(db)
  }

  /**
   * Find user by Clerk user ID
   */
  async findByClerkId(clerkUserId: string): Promise<User | null> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId))
        .limit(1)

      return result[0] || null
    } catch (error) {
      this.handleDatabaseError(error, 'findByClerkId')
    }
  }

  /**
   * Find user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      return result[0] || null
    } catch (error) {
      this.handleDatabaseError(error, 'findByEmail')
    }
  }

  /**
   * Find user with all memberships and related data
   */
  async findWithMemberships(id: string): Promise<UserWithMemberships | null> {
    try {
      const result = await this.db
        .select({
          // User fields
          id: users.id,
          clerkUserId: users.clerkUserId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          preferences: users.preferences,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          // Membership fields
          membershipId: organizationMemberships.id,
          membershipStatus: organizationMemberships.status,
          membershipJoinedAt: organizationMemberships.joinedAt,
          // Organization fields
          organizationId: organizations.id,
          organizationName: organizations.name,
          organizationSlug: organizations.slug,
          // Role fields
          roleId: roles.id,
          roleName: roles.name,
          rolePermissions: roles.permissions
        })
        .from(users)
        .leftJoin(organizationMemberships, eq(users.id, organizationMemberships.userId))
        .leftJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
        .leftJoin(roles, eq(organizationMemberships.roleId, roles.id))
        .where(eq(users.id, id))

      if (!result.length || !result[0].id) {
        return null
      }

      // Transform the flat result into the expected structure
      const user = result[0]
      const memberships = result
        .filter(row => row.membershipId) // Only include rows with actual memberships
        .map(row => ({
          id: row.membershipId!,
          roleId: row.roleId!,
          status: row.membershipStatus!,
          joinedAt: row.membershipJoinedAt!,
          organization: {
            id: row.organizationId!,
            name: row.organizationName!,
            slug: row.organizationSlug!
          },
          role: {
            id: row.roleId!,
            name: row.roleName!,
            permissions: (row.rolePermissions as string[]) || []
          }
        }))

      return {
        id: user.id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        memberships
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findWithMemberships')
    }
  }

  /**
   * Find users by organization
   */
  async findByOrganization(organizationId: string, options: QueryOptions = {}): Promise<RepositoryResult<User>> {
    try {
      const { pagination, sort = [{ field: 'createdAt', direction: 'desc' }] } = options

      let query = this.db
        .select({
          id: users.id,
          clerkUserId: users.clerkUserId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          preferences: users.preferences,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .innerJoin(organizationMemberships, eq(users.id, organizationMemberships.userId))
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
          .from(users)
          .innerJoin(organizationMemberships, eq(users.id, organizationMemberships.userId))
          .where(eq(organizationMemberships.organizationId, organizationId))

        total = countResult[0]?.count || 0
      }

      return {
        data: data as User[],
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
   * Search users by query string
   */
  async searchUsers(query: string, options: QueryOptions = {}): Promise<RepositoryResult<User>> {
    try {
      const { pagination, sort = [{ field: 'createdAt', direction: 'desc' }] } = options
      const searchPattern = `%${query}%`

      let dbQuery = this.db
        .select()
        .from(users)
        .where(
          or(
            ilike(users.email, searchPattern),
            ilike(users.firstName, searchPattern),
            ilike(users.lastName, searchPattern)
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
          .from(users)
          .where(
            or(
              ilike(users.email, searchPattern),
              ilike(users.firstName, searchPattern),
              ilike(users.lastName, searchPattern)
            )
          )

        total = countResult[0]?.count || 0
      }

      return {
        data: data as User[],
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'searchUsers')
    }
  }

  /**
   * Find active users (users with at least one active membership)
   */
  async findActiveUsers(options: QueryOptions = {}): Promise<RepositoryResult<User>> {
    try {
      const { pagination, sort = [{ field: 'createdAt', direction: 'desc' }] } = options

      let query = this.db
        .selectDistinct({
          id: users.id,
          clerkUserId: users.clerkUserId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          preferences: users.preferences,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .innerJoin(organizationMemberships, eq(users.id, organizationMemberships.userId))
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
          .selectDistinct({ count: sql<number>`count(DISTINCT ${users.id})` })
          .from(users)
          .innerJoin(organizationMemberships, eq(users.id, organizationMemberships.userId))
          .where(eq(organizationMemberships.status, 'active'))

        total = countResult[0]?.count || 0
      }

      return {
        data: data as User[],
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findActiveUsers')
    }
  }

  /**
   * Find users created within the last N days
   */
  async findRecentUsers(days: number, options: QueryOptions = {}): Promise<RepositoryResult<User>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const filters: FilterCondition[] = [
        FilterHelpers.gte('createdAt', cutoffDate)
      ]

      return await this.findMany({
        ...options,
        filters: [...(options.filters || []), ...filters],
        sort: options.sort || [{ field: 'createdAt', direction: 'desc' }]
      })
    } catch (error) {
      this.handleDatabaseError(error, 'findRecentUsers')
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: Record<string, unknown>): Promise<User> {
    try {
      // Validate preferences structure
      const validKeys = ['theme', 'language', 'notifications', 'accessibility', 'privacy']
      const invalidKeys = Object.keys(preferences).filter(key => !validKeys.includes(key))
      
      if (invalidKeys.length > 0) {
        throw new ValidationError('VALIDATION_ERROR', `Invalid preference keys: ${invalidKeys.join(', ')}`)
      }

      const result = await this.db
        .update(users)
        .set({
          preferences,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning()

      if (!result[0]) {
        throw new NotFoundError('NOT_FOUND', 'User not found for preferences update')
      }

      return result[0]
    } catch (error) {
      this.handleDatabaseError(error, 'updatePreferences')
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(id: string): Promise<Record<string, unknown>> {
    try {
      const result = await this.db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (!result[0]) {
        throw new NotFoundError('NOT_FOUND', 'User not found')
      }

      return result[0].preferences as Record<string, unknown>
    } catch (error) {
      this.handleDatabaseError(error, 'getPreferences')
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(id: string): Promise<{
    membershipCount: number
    organizationsOwned: number
    lastLoginAt: Date | null
    createdAt: Date
  }> {
    try {
      // Get user basic info
      const userResult = await this.db
        .select({
          createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (!userResult[0]) {
        throw new NotFoundError('NOT_FOUND', 'User not found')
      }

      // Get membership count
      const membershipCountResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(organizationMemberships)
        .where(eq(organizationMemberships.userId, id))

      // Get organizations owned count (assuming admin role means ownership)
      const ownedOrgsResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(organizationMemberships)
        .innerJoin(roles, eq(organizationMemberships.roleId, roles.id))
        .where(
          and(
            eq(organizationMemberships.userId, id),
            like(roles.name, '%admin%')
          )
        )

      return {
        membershipCount: membershipCountResult[0]?.count || 0,
        organizationsOwned: ownedOrgsResult[0]?.count || 0,
        lastLoginAt: null, // This would need to be tracked separately
        createdAt: userResult[0].createdAt
      }
    } catch (error) {
      this.handleDatabaseError(error, 'getUserStats')
    }
  }

  /**
   * Override create method to add additional validation
   */
  async create(data: NewUser): Promise<User> {
    try {
      // Check if user with email already exists
      const existingUser = await this.findByEmail(data.email)
      if (existingUser) {
        throw new ValidationError('VALIDATION_ERROR', 'User with this email already exists')
      }

      // Check if user with Clerk ID already exists
      const existingClerkUser = await this.findByClerkId(data.clerkUserId)
      if (existingClerkUser) {
        throw new ValidationError('VALIDATION_ERROR', 'User with this Clerk ID already exists')
      }

      return await super.create(data)
    } catch (error) {
      this.handleDatabaseError(error, 'create')
    }
  }

  /**
   * Override update method to prevent updating immutable fields
   */
  async update(id: string, data: UserUpdate): Promise<User> {
    try {
      // Remove immutable fields if they exist in the update data
      const { ...updateData } = data as any
      delete updateData.clerkUserId
      delete updateData.id
      delete updateData.createdAt

      return await super.update(id, updateData)
    } catch (error) {
      this.handleDatabaseError(error, 'update')
    }
  }

  /**
   * Soft delete user (deactivate instead of hard delete)
   */
  async deactivate(id: string): Promise<User> {
    try {
      // Update all memberships to inactive
      await this.db
        .update(organizationMemberships)
        .set({ 
          status: 'inactive',
          updatedAt: new Date()
        })
        .where(eq(organizationMemberships.userId, id))

      // Update user preferences to mark as deactivated
      const user = await this.findById(id)
      if (!user) {
        throw new NotFoundError('NOT_FOUND', 'User not found for deactivation')
      }

      const updatedPreferences = {
        ...user.preferences as Record<string, unknown>,
        deactivated: true,
        deactivatedAt: new Date().toISOString()
      }

      return await this.updatePreferences(id, updatedPreferences)
    } catch (error) {
      this.handleDatabaseError(error, 'deactivate')
    }
  }

  /**
   * Reactivate user
   */
  async reactivate(id: string): Promise<User> {
    try {
      const user = await this.findById(id)
      if (!user) {
        throw new NotFoundError('NOT_FOUND', 'User not found for reactivation')
      }

      const updatedPreferences = {
        ...user.preferences as Record<string, unknown>
      }
      delete updatedPreferences.deactivated
      delete updatedPreferences.deactivatedAt

      return await this.updatePreferences(id, updatedPreferences)
    } catch (error) {
      this.handleDatabaseError(error, 'reactivate')
    }
  }
}