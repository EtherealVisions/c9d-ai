/**
 * Optimized User Repository Implementation
 * 
 * This file extends the UserRepository with caching capabilities and performance
 * optimizations including batch operations and intelligent cache invalidation.
 */

import { eq, and, or, like, ilike, inArray, desc, sql } from 'drizzle-orm'
import { CachedRepository, RepositoryCacheConfig } from './cached-repository'
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
  selectUserSchema
} from '@/lib/validation/schemas/users'
import { NotFoundError, ValidationError } from '@/lib/errors/custom-errors'
import { QueryOptions, RepositoryResult, FilterCondition, FilterHelpers } from './base-repository'

/**
 * User-specific cache configuration
 */
const USER_CACHE_CONFIG: Partial<RepositoryCacheConfig> = {
  enabled: true,
  ttl: {
    findById: 3600, // 1 hour - users don't change frequently
    findMany: 1800, // 30 minutes - user lists change more often
    findOne: 3600, // 1 hour
    count: 900, // 15 minutes
    exists: 3600, // 1 hour
  },
  invalidation: {
    onCreate: 'immediate',
    onUpdate: 'immediate',
    onDelete: 'immediate'
  },
  warmCache: true
}

/**
 * Optimized User Repository Implementation
 * Extends CachedRepository with user-specific optimizations
 */
export class OptimizedUserRepository extends CachedRepository<User, NewUser, UserUpdate> implements UserRepositoryInterface {
  protected table = users
  protected insertSchema = createUserSchema
  protected updateSchema = updateUserSchema
  protected entityName = 'user'
  protected entitySchema = selectUserSchema

  constructor(db: DrizzleDatabase) {
    super(db, USER_CACHE_CONFIG)
  }

  /**
   * Optimized findByClerkId with caching
   */
  async findByClerkId(clerkUserId: string): Promise<User | null> {
    if (!this.cacheConfig.enabled) {
      return await this.findByClerkIdFromDb(clerkUserId)
    }

    try {
      const cachePattern = this.createCachePattern('findByClerkId', { clerkUserId })
      
      // Try cache first
      const cached = await this.cacheService.get(cachePattern, this.entitySchema)
      if (cached !== null) {
        return cached
      }

      // Fetch from database
      const result = await this.findByClerkIdFromDb(clerkUserId)
      
      // Cache the result
      if (result) {
        await this.cacheService.set(cachePattern, result, this.cacheConfig.ttl.findOne)
      }

      return result
    } catch (error) {
      console.warn('[OptimizedUserRepository] Cache error in findByClerkId:', error)
      return await this.findByClerkIdFromDb(clerkUserId)
    }
  }

  /**
   * Database implementation of findByClerkId
   */
  private async findByClerkIdFromDb(clerkUserId: string): Promise<User | null> {
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
   * Optimized findByEmail with caching
   */
  async findByEmail(email: string): Promise<User | null> {
    if (!this.cacheConfig.enabled) {
      return await this.findByEmailFromDb(email)
    }

    try {
      const cachePattern = this.createCachePattern('findByEmail', { email })
      
      // Try cache first
      const cached = await this.cacheService.get(cachePattern, this.entitySchema)
      if (cached !== null) {
        return cached
      }

      // Fetch from database
      const result = await this.findByEmailFromDb(email)
      
      // Cache the result
      if (result) {
        await this.cacheService.set(cachePattern, result, this.cacheConfig.ttl.findOne)
      }

      return result
    } catch (error) {
      console.warn('[OptimizedUserRepository] Cache error in findByEmail:', error)
      return await this.findByEmailFromDb(email)
    }
  }

  /**
   * Database implementation of findByEmail
   */
  private async findByEmailFromDb(email: string): Promise<User | null> {
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
   * Optimized findWithMemberships with caching
   */
  async findWithMemberships(id: string): Promise<UserWithMemberships | null> {
    if (!this.cacheConfig.enabled) {
      return await this.findWithMembershipsFromDb(id)
    }

    try {
      const cachePattern = this.createCachePattern('findWithMemberships', { id })
      
      // Try cache first
      const cached = await this.cacheService.get(cachePattern)
      if (cached !== null) {
        return cached as UserWithMemberships
      }

      // Fetch from database
      const result = await this.findWithMembershipsFromDb(id)
      
      // Cache the result
      if (result) {
        await this.cacheService.set(cachePattern, result, this.cacheConfig.ttl.findById)
      }

      return result
    } catch (error) {
      console.warn('[OptimizedUserRepository] Cache error in findWithMemberships:', error)
      return await this.findWithMembershipsFromDb(id)
    }
  }

  /**
   * Database implementation of findWithMemberships
   */
  private async findWithMembershipsFromDb(id: string): Promise<UserWithMemberships | null> {
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
        .filter(row => row.membershipId)
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
   * Batch find users by IDs with optimized caching
   */
  async batchFindByIds(ids: string[]): Promise<(User | null)[]> {
    return await super.batchFindByIds(ids)
  }

  /**
   * Batch find users by Clerk IDs
   */
  async batchFindByClerkIds(clerkUserIds: string[]): Promise<(User | null)[]> {
    if (clerkUserIds.length === 0) {
      return []
    }

    try {
      // For small batches, use individual cached lookups
      if (clerkUserIds.length <= 10) {
        return await Promise.all(
          clerkUserIds.map(clerkUserId => this.findByClerkId(clerkUserId))
        )
      }

      // For larger batches, use database query
      const result = await this.db
        .select()
        .from(users)
        .where(inArray(users.clerkUserId, clerkUserIds))

      // Create a map for O(1) lookup
      const userMap = new Map<string, User>()
      result.forEach(user => userMap.set(user.clerkUserId, user))

      // Return results in the same order as input
      return clerkUserIds.map(clerkUserId => userMap.get(clerkUserId) || null)
    } catch (error) {
      this.handleDatabaseError(error, 'batchFindByClerkIds')
    }
  }

  /**
   * Optimized findByOrganization with caching
   */
  async findByOrganization(organizationId: string, options: QueryOptions = {}): Promise<RepositoryResult<User>> {
    if (!this.cacheConfig.enabled) {
      return await this.findByOrganizationFromDb(organizationId, options)
    }

    try {
      const cachePattern = this.createCachePattern('findByOrganization', { organizationId, options })
      
      // Try cache first
      const cached = await this.cacheService.get(cachePattern)
      if (cached !== null) {
        return cached as RepositoryResult<User>
      }

      // Fetch from database
      const result = await this.findByOrganizationFromDb(organizationId, options)
      
      // Cache the result
      await this.cacheService.set(cachePattern, result, this.cacheConfig.ttl.findMany)

      return result
    } catch (error) {
      console.warn('[OptimizedUserRepository] Cache error in findByOrganization:', error)
      return await this.findByOrganizationFromDb(organizationId, options)
    }
  }

  /**
   * Database implementation of findByOrganization
   */
  private async findByOrganizationFromDb(organizationId: string, options: QueryOptions = {}): Promise<RepositoryResult<User>> {
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
   * Optimized search with caching for common queries
   */
  async searchUsers(query: string, options: QueryOptions = {}): Promise<RepositoryResult<User>> {
    // Cache only simple searches without complex options
    const shouldCache = this.cacheConfig.enabled && 
      !options.filters?.length && 
      (!options.pagination || (options.pagination.limit <= 50 && options.pagination.offset === 0))

    if (!shouldCache) {
      return await this.searchUsersFromDb(query, options)
    }

    try {
      const cachePattern = this.createCachePattern('searchUsers', { query, options })
      
      // Try cache first
      const cached = await this.cacheService.get(cachePattern)
      if (cached !== null) {
        return cached as RepositoryResult<User>
      }

      // Fetch from database
      const result = await this.searchUsersFromDb(query, options)
      
      // Cache the result with shorter TTL for search results
      await this.cacheService.set(cachePattern, result, 600) // 10 minutes

      return result
    } catch (error) {
      console.warn('[OptimizedUserRepository] Cache error in searchUsers:', error)
      return await this.searchUsersFromDb(query, options)
    }
  }

  /**
   * Database implementation of searchUsers
   */
  private async searchUsersFromDb(query: string, options: QueryOptions = {}): Promise<RepositoryResult<User>> {
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

  // Implement remaining UserRepositoryInterface methods with optimizations
  async findActiveUsers(options: QueryOptions = {}): Promise<RepositoryResult<User>> {
    const filters: FilterCondition[] = [
      FilterHelpers.eq('status', 'active')
    ]
    return await this.findMany({
      ...options,
      filters: [...(options.filters || []), ...filters]
    })
  }

  async findRecentUsers(days: number, options: QueryOptions = {}): Promise<RepositoryResult<User>> {
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
  }

  async updatePreferences(id: string, preferences: Record<string, unknown>): Promise<User> {
    const result = await this.update(id, { preferences } as UserUpdate)
    return result
  }

  async getPreferences(id: string): Promise<Record<string, unknown>> {
    const user = await this.findById(id)
    if (!user) {
      throw new NotFoundError('NOT_FOUND', 'User not found')
    }
    return user.preferences as Record<string, unknown>
  }

  async getUserStats(id: string): Promise<{
    membershipCount: number
    organizationsOwned: number
    lastLoginAt: Date | null
    createdAt: Date
  }> {
    // This could be cached with a shorter TTL since stats change frequently
    const cachePattern = this.createCachePattern('getUserStats', { id })
    
    if (this.cacheConfig.enabled) {
      const cached = await this.cacheService.get(cachePattern)
      if (cached !== null) {
        return cached as any
      }
    }

    const stats = await this.getUserStatsFromDb(id)
    
    if (this.cacheConfig.enabled) {
      // Cache stats for 5 minutes
      await this.cacheService.set(cachePattern, stats, 300)
    }

    return stats
  }

  private async getUserStatsFromDb(id: string) {
    // Implementation similar to base UserRepository
    const userResult = await this.db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!userResult[0]) {
      throw new NotFoundError('NOT_FOUND', 'User not found')
    }

    const membershipCountResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, id))

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
      lastLoginAt: null,
      createdAt: userResult[0].createdAt
    }
  }

  /**
   * Cache invalidation for related entities
   */
  protected async invalidateRelatedCaches(
    entity: User, 
    operation: 'create' | 'update' | 'delete'
  ): Promise<void> {
    try {
      // Invalidate organization member lists
      await this.cacheService.invalidateByPattern('organization:findByMember')
      await this.cacheService.invalidateByPattern('organization:findWithMembers')
      
      // Invalidate membership caches
      await this.cacheService.invalidateRelated('membership', 'userId', entity.id)
      
      // Invalidate user search results
      await this.cacheService.invalidateByPattern('user:searchUsers')
    } catch (error) {
      console.warn('[OptimizedUserRepository] Error invalidating related caches:', error)
    }
  }

  /**
   * Warm cache with frequently accessed users
   */
  async warmCache(): Promise<void> {
    if (!this.cacheConfig.enabled || !this.cacheConfig.warmCache) {
      return
    }

    try {
      console.log('[OptimizedUserRepository] Warming user cache...')
      
      // Warm cache with recently active users
      const recentUsers = await this.findRecentUsers(7, { 
        pagination: { limit: 100, offset: 0 } 
      })
      
      // Pre-cache individual user lookups
      const cacheEntries = recentUsers.data.map(user => ({
        pattern: this.createCachePattern('findById', { id: user.id }),
        data: user,
        ttl: this.cacheConfig.ttl.findById
      }))
      
      if (cacheEntries.length > 0) {
        await this.cacheService.batchSet(cacheEntries)
      }
      
      console.log(`[OptimizedUserRepository] Warmed cache with ${cacheEntries.length} users`)
    } catch (error) {
      console.warn('[OptimizedUserRepository] Error warming cache:', error)
    }
  }
}