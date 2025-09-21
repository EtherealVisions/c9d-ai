/**
 * Role Repository Implementation
 * 
 * This file implements the RoleRepository with all role and permission management
 * database operations using Drizzle ORM and the base repository pattern.
 */

import { eq, and, or, like, ilike, desc, sql, inArray } from 'drizzle-orm'
import { BaseRepository, FilterCondition, QueryOptions, RepositoryResult, FilterHelpers } from './base-repository'
import { RoleRepositoryInterface } from './interfaces'
import { DrizzleDatabase } from '@/lib/db/connection'
import { 
  roles, 
  organizations, 
  organizationMemberships,
  Role, 
  NewRole, 
  RoleUpdate, 
  RoleWithOrganization,
  SYSTEM_ROLES,
  DEFAULT_ROLE_PERMISSIONS
} from '@/lib/db/schema'
import { 
  createRoleSchema, 
  updateRoleSchema 
} from '@/lib/validation/schemas/roles'
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors/custom-errors'

/**
 * Role Repository Implementation
 * Handles all role and permission management database operations with type safety and validation
 */
export class RoleRepository extends BaseRepository<Role, NewRole, RoleUpdate> implements RoleRepositoryInterface {
  protected table = roles
  protected insertSchema = createRoleSchema
  protected updateSchema = updateRoleSchema

  constructor(db: DrizzleDatabase) {
    super(db)
  }

  /**
   * Find role by name within an organization
   */
  async findByName(organizationId: string, name: string): Promise<Role | null> {
    try {
      const result = await this.db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.organizationId, organizationId),
            eq(roles.name, name)
          )
        )
        .limit(1)

      return result[0] || null
    } catch (error) {
      this.handleDatabaseError(error, 'findByName')
    }
  }

  /**
   * Find role with organization details
   */
  async findWithOrganization(id: string): Promise<RoleWithOrganization | null> {
    try {
      const result = await this.db
        .select({
          // Role fields
          id: roles.id,
          name: roles.name,
          description: roles.description,
          organizationId: roles.organizationId,
          isSystemRole: roles.isSystemRole,
          permissions: roles.permissions,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
          // Organization fields
          organizationName: organizations.name,
          organizationSlug: organizations.slug
        })
        .from(roles)
        .innerJoin(organizations, eq(roles.organizationId, organizations.id))
        .where(eq(roles.id, id))
        .limit(1)

      if (!result[0]) {
        return null
      }

      const row = result[0]
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        organizationId: row.organizationId,
        isSystemRole: row.isSystemRole,
        permissions: row.permissions,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        organization: {
          id: row.organizationId,
          name: row.organizationName,
          slug: row.organizationSlug
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findWithOrganization')
    }
  }

  /**
   * Find roles by organization
   */
  async findByOrganization(organizationId: string, options: QueryOptions = {}): Promise<RepositoryResult<Role>> {
    try {
      const { pagination, sort = [{ field: 'createdAt', direction: 'desc' }] } = options

      let query = this.db
        .select()
        .from(roles)
        .where(eq(roles.organizationId, organizationId))

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
          .from(roles)
          .where(eq(roles.organizationId, organizationId))

        total = countResult[0]?.count || 0
      }

      return {
        data: data as Role[],
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
   * Find system roles across all organizations
   */
  async findSystemRoles(options: QueryOptions = {}): Promise<RepositoryResult<Role>> {
    try {
      const filters: FilterCondition[] = [
        FilterHelpers.eq('isSystemRole', true)
      ]

      return await this.findMany({
        ...options,
        filters: [...(options.filters || []), ...filters],
        sort: options.sort || [{ field: 'name', direction: 'asc' }]
      })
    } catch (error) {
      this.handleDatabaseError(error, 'findSystemRoles')
    }
  }

  /**
   * Find custom (non-system) roles for an organization
   */
  async findCustomRoles(organizationId: string, options: QueryOptions = {}): Promise<RepositoryResult<Role>> {
    try {
      const { pagination, sort = [{ field: 'createdAt', direction: 'desc' }] } = options

      let query = this.db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.organizationId, organizationId),
            eq(roles.isSystemRole, false)
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
          .from(roles)
          .where(
            and(
              eq(roles.organizationId, organizationId),
              eq(roles.isSystemRole, false)
            )
          )

        total = countResult[0]?.count || 0
      }

      return {
        data: data as Role[],
        pagination: {
          total,
          limit: pagination?.limit || data.length,
          offset: pagination?.offset || 0,
          hasMore: pagination ? (pagination.offset + pagination.limit) < total : false
        }
      }
    } catch (error) {
      this.handleDatabaseError(error, 'findCustomRoles')
    }
  }

  /**
   * Update role permissions
   */
  async updatePermissions(id: string, permissions: string[]): Promise<Role> {
    try {
      // Validate permissions format
      const invalidPermissions = permissions.filter(permission => 
        !this.validatePermissionFormat(permission)
      )

      if (invalidPermissions.length > 0) {
        throw new ValidationError('VALIDATION_ERROR', `Invalid permission format: ${invalidPermissions.join(', ')}`)
      }

      const result = await this.db
        .update(roles)
        .set({
          permissions,
          updatedAt: new Date()
        })
        .where(eq(roles.id, id))
        .returning()

      if (!result[0]) {
        throw new NotFoundError('NOT_FOUND', 'Role not found for permissions update')
      }

      return result[0]
    } catch (error) {
      this.handleDatabaseError(error, 'updatePermissions')
    }
  }

  /**
   * Add permission to role
   */
  async addPermission(id: string, permission: string): Promise<Role> {
    try {
      if (!this.validatePermissionFormat(permission)) {
        throw new ValidationError('VALIDATION_ERROR', `Invalid permission format: ${permission}`)
      }

      const role = await this.findById(id)
      if (!role) {
        throw new NotFoundError('NOT_FOUND', 'Role not found')
      }

      const currentPermissions = role.permissions as string[]
      if (currentPermissions.includes(permission)) {
        return role // Permission already exists
      }

      const updatedPermissions = [...currentPermissions, permission]
      return await this.updatePermissions(id, updatedPermissions)
    } catch (error) {
      this.handleDatabaseError(error, 'addPermission')
    }
  }

  /**
   * Remove permission from role
   */
  async removePermission(id: string, permission: string): Promise<Role> {
    try {
      const role = await this.findById(id)
      if (!role) {
        throw new NotFoundError('NOT_FOUND', 'Role not found')
      }

      const currentPermissions = role.permissions as string[]
      const updatedPermissions = currentPermissions.filter(p => p !== permission)
      
      return await this.updatePermissions(id, updatedPermissions)
    } catch (error) {
      this.handleDatabaseError(error, 'removePermission')
    }
  }

  /**
   * Check if role has specific permission
   */
  async hasPermission(id: string, permission: string): Promise<boolean> {
    try {
      const role = await this.findById(id)
      if (!role) {
        return false
      }

      const permissions = role.permissions as string[]
      return permissions.includes(permission)
    } catch (error) {
      this.handleDatabaseError(error, 'hasPermission')
    }
  }

  /**
   * Check if role name is available within organization
   */
  async isRoleNameAvailable(organizationId: string, name: string, excludeId?: string): Promise<boolean> {
    try {
      let query = this.db
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(
            eq(roles.organizationId, organizationId),
            eq(roles.name, name)
          )
        )

      if (excludeId) {
        query = query.where(
          and(
            eq(roles.organizationId, organizationId),
            eq(roles.name, name),
            eq(roles.id, excludeId)
          )
        ) as any
      }

      const result = await query.limit(1)
      return result.length === 0
    } catch (error) {
      this.handleDatabaseError(error, 'isRoleNameAvailable')
    }
  }

  /**
   * Check if role can be deleted (not in use by any memberships)
   */
  async canDeleteRole(id: string): Promise<boolean> {
    try {
      const membershipCount = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(organizationMemberships)
        .where(eq(organizationMemberships.roleId, id))

      return (membershipCount[0]?.count || 0) === 0
    } catch (error) {
      this.handleDatabaseError(error, 'canDeleteRole')
    }
  }

  /**
   * Create default roles for an organization
   */
  async createDefaultRoles(organizationId: string): Promise<Role[]> {
    try {
      const defaultRoles = [
        {
          name: SYSTEM_ROLES.ORGANIZATION_ADMIN,
          description: 'Full administrative access to the organization',
          organizationId,
          isSystemRole: true,
          permissions: DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.ORGANIZATION_ADMIN]
        },
        {
          name: SYSTEM_ROLES.ORGANIZATION_MEMBER,
          description: 'Standard member access to the organization',
          organizationId,
          isSystemRole: true,
          permissions: DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.ORGANIZATION_MEMBER]
        },
        {
          name: SYSTEM_ROLES.ORGANIZATION_VIEWER,
          description: 'Read-only access to the organization',
          organizationId,
          isSystemRole: true,
          permissions: DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.ORGANIZATION_VIEWER]
        }
      ]

      const createdRoles: Role[] = []
      
      for (const roleData of defaultRoles) {
        // Check if role already exists
        const existingRole = await this.findByName(organizationId, roleData.name)
        if (!existingRole) {
          const role = await this.create(roleData as NewRole)
          createdRoles.push(role)
        } else {
          createdRoles.push(existingRole)
        }
      }

      return createdRoles
    } catch (error) {
      this.handleDatabaseError(error, 'createDefaultRoles')
    }
  }

  /**
   * Get default role by name for an organization
   */
  async getDefaultRole(organizationId: string, roleName: string): Promise<Role | null> {
    try {
      return await this.findByName(organizationId, roleName)
    } catch (error) {
      this.handleDatabaseError(error, 'getDefaultRole')
    }
  }

  /**
   * Get role statistics
   */
  async getRoleStats(id: string): Promise<{
    memberCount: number
    permissionCount: number
    isSystemRole: boolean
    createdAt: Date
  }> {
    try {
      // Get role basic info
      const roleResult = await this.db
        .select({
          permissions: roles.permissions,
          isSystemRole: roles.isSystemRole,
          createdAt: roles.createdAt
        })
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1)

      if (!roleResult[0]) {
        throw new NotFoundError('NOT_FOUND', 'Role not found')
      }

      // Get member count
      const memberCountResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(organizationMemberships)
        .where(eq(organizationMemberships.roleId, id))

      const role = roleResult[0]
      const permissions = role.permissions as string[]

      return {
        memberCount: memberCountResult[0]?.count || 0,
        permissionCount: permissions.length,
        isSystemRole: role.isSystemRole,
        createdAt: role.createdAt
      }
    } catch (error) {
      this.handleDatabaseError(error, 'getRoleStats')
    }
  }

  /**
   * Validate permission format (resource:action)
   */
  private validatePermissionFormat(permission: string): boolean {
    const permissionRegex = /^[a-z_]+:[a-z_]+$/
    return permissionRegex.test(permission)
  }

  /**
   * Override create method to add role name validation
   */
  async create(data: NewRole): Promise<Role> {
    try {
      // Check if role name is available
      const isAvailable = await this.isRoleNameAvailable(data.organizationId, data.name)
      if (!isAvailable) {
        throw new ConflictError('CONFLICT', 'Role with this name already exists in the organization')
      }

      // Validate permissions format
      const permissions = data.permissions as string[]
      if (permissions && permissions.length > 0) {
        const invalidPermissions = permissions.filter(permission => 
          !this.validatePermissionFormat(permission)
        )

        if (invalidPermissions.length > 0) {
          throw new ValidationError('VALIDATION_ERROR', `Invalid permission format: ${invalidPermissions.join(', ')}`)
        }
      }

      return await super.create(data)
    } catch (error) {
      this.handleDatabaseError(error, 'create')
    }
  }

  /**
   * Override update method to validate role name changes
   */
  async update(id: string, data: RoleUpdate): Promise<Role> {
    try {
      // If name is being updated, check availability
      if (data.name) {
        const role = await this.findById(id)
        if (!role) {
          throw new NotFoundError('NOT_FOUND', 'Role not found')
        }

        const isAvailable = await this.isRoleNameAvailable(role.organizationId, data.name, id)
        if (!isAvailable) {
          throw new ConflictError('CONFLICT', 'Role with this name already exists in the organization')
        }
      }

      // Validate permissions format if being updated
      if (data.permissions) {
        const permissions = data.permissions as string[]
        const invalidPermissions = permissions.filter(permission => 
          !this.validatePermissionFormat(permission)
        )

        if (invalidPermissions.length > 0) {
          throw new ValidationError('VALIDATION_ERROR', `Invalid permission format: ${invalidPermissions.join(', ')}`)
        }
      }

      return await super.update(id, data)
    } catch (error) {
      this.handleDatabaseError(error, 'update')
    }
  }

  /**
   * Override delete method to check if role can be deleted
   */
  async delete(id: string): Promise<void> {
    try {
      const canDelete = await this.canDeleteRole(id)
      if (!canDelete) {
        throw new ValidationError('VALIDATION_ERROR', 'Cannot delete role that is assigned to members')
      }

      await super.delete(id)
    } catch (error) {
      this.handleDatabaseError(error, 'delete')
    }
  }

  /**
   * Clone role with new name
   */
  async cloneRole(sourceRoleId: string, newName: string, organizationId?: string): Promise<Role> {
    try {
      const sourceRole = await this.findById(sourceRoleId)
      if (!sourceRole) {
        throw new NotFoundError('NOT_FOUND', 'Source role not found')
      }

      const targetOrgId = organizationId || sourceRole.organizationId

      // Check if new name is available
      const isAvailable = await this.isRoleNameAvailable(targetOrgId, newName)
      if (!isAvailable) {
        throw new ConflictError('CONFLICT', 'Role with this name already exists in the target organization')
      }

      const newRoleData: NewRole = {
        name: newName,
        description: `Cloned from ${sourceRole.name}`,
        organizationId: targetOrgId,
        isSystemRole: false, // Cloned roles are never system roles
        permissions: sourceRole.permissions
      }

      return await this.create(newRoleData)
    } catch (error) {
      this.handleDatabaseError(error, 'cloneRole')
    }
  }
}