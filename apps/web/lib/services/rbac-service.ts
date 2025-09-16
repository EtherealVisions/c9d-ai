/**
 * Role-Based Access Control (RBAC) Service
 * Handles permission checking, role management, and access control enforcement
 */

import { createSupabaseClient } from '../database'
import type { Role, Permission, Membership, User } from '../models/types'
import { validateRole, validateCreateRole, validateUpdateRole } from '../models/schemas'

export interface RBACContext {
  userId: string
  organizationId: string
  userRoles?: Role[]
  userPermissions?: string[]
}

export interface PermissionCheck {
  resource: string
  action: string
  context?: Record<string, any>
}

export class RBACService {
  private supabase = createSupabaseClient()

  /**
   * Check if a user has a specific permission within an organization
   */
  async hasPermission(
    userId: string, 
    organizationId: string, 
    permission: string
  ): Promise<boolean> {
    try {
      // Get user's roles and permissions in the organization
      const userPermissions = await this.getUserPermissions(userId, organizationId)
      
      // Check if the user has the specific permission
      return userPermissions.includes(permission)
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(
    userId: string,
    organizationId: string,
    permissions: string[]
  ): Promise<Record<string, boolean>> {
    try {
      const userPermissions = await this.getUserPermissions(userId, organizationId)
      
      return permissions.reduce((result, permission) => {
        result[permission] = userPermissions.includes(permission)
        return result
      }, {} as Record<string, boolean>)
    } catch (error) {
      console.error('Error checking permissions:', error)
      return permissions.reduce((result, permission) => {
        result[permission] = false
        return result
      }, {} as Record<string, boolean>)
    }
  }

  /**
   * Check if user has any of the specified permissions (OR logic)
   */
  async hasAnyPermission(
    userId: string,
    organizationId: string,
    permissions: string[]
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId, organizationId)
      return permissions.some(permission => userPermissions.includes(permission))
    } catch (error) {
      console.error('Error checking any permission:', error)
      return false
    }
  }

  /**
   * Check if user has all specified permissions (AND logic)
   */
  async hasAllPermissions(
    userId: string,
    organizationId: string,
    permissions: string[]
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId, organizationId)
      return permissions.every(permission => userPermissions.includes(permission))
    } catch (error) {
      console.error('Error checking all permissions:', error)
      return false
    }
  }

  /**
   * Get all roles for a user within an organization
   */
  async getUserRoles(userId: string, organizationId: string): Promise<Role[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_memberships')
        .select(`
          role_id,
          roles (
            id,
            name,
            description,
            organization_id,
            is_system_role,
            permissions,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      if (error) {
        throw new Error(`Failed to get user roles: ${error.message}`)
      }

      // Transform and validate the roles
      const roles = data
        ?.map((item: any) => item.roles)
        .filter(Boolean)
        .map((role: any) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          organizationId: role.organization_id,
          isSystemRole: role.is_system_role,
          permissions: role.permissions,
          createdAt: new Date(role.created_at),
          updatedAt: new Date(role.updated_at)
        })) || []

      return roles.map((role: any) => validateRole(role))
    } catch (error) {
      console.error('Error getting user roles:', error)
      throw error
    }
  }

  /**
   * Get all permissions for a user within an organization
   */
  async getUserPermissions(userId: string, organizationId: string): Promise<string[]> {
    try {
      const roles = await this.getUserRoles(userId, organizationId)
      
      // Collect all permissions from all roles
      const permissions = new Set<string>()
      roles.forEach(role => {
        role.permissions.forEach(permission => permissions.add(permission))
      })

      return Array.from(permissions)
    } catch (error) {
      console.error('Error getting user permissions:', error)
      throw error
    }
  }

  /**
   * Assign a role to a user within an organization
   */
  async assignRole(userId: string, organizationId: string, roleId: string): Promise<void> {
    try {
      // Verify the role exists and belongs to the organization
      const { data: roleData, error: roleError } = await this.supabase
        .from('roles')
        .select('id, organization_id')
        .eq('id', roleId)
        .eq('organization_id', organizationId)
        .single()

      if (roleError || !roleData) {
        throw new Error('Role not found or does not belong to organization')
      }

      // Update the membership with the new role
      const { error: updateError } = await this.supabase
        .from('organization_memberships')
        .update({ 
          role_id: roleId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)

      if (updateError) {
        throw new Error(`Failed to assign role: ${updateError.message}`)
      }
    } catch (error) {
      console.error('Error assigning role:', error)
      throw error
    }
  }

  /**
   * Revoke a role from a user (sets to default member role)
   */
  async revokeRole(userId: string, organizationId: string, roleId: string): Promise<void> {
    try {
      // Get the default member role for the organization
      const { data: defaultRole, error: defaultRoleError } = await this.supabase
        .from('roles')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', 'Member')
        .single()

      if (defaultRoleError || !defaultRole) {
        throw new Error('Default member role not found')
      }

      // Update the membership to use the default role
      const { error: updateError } = await this.supabase
        .from('organization_memberships')
        .update({ 
          role_id: defaultRole.id,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('role_id', roleId)

      if (updateError) {
        throw new Error(`Failed to revoke role: ${updateError.message}`)
      }
    } catch (error) {
      console.error('Error revoking role:', error)
      throw error
    }
  }

  /**
   * Create a new role within an organization
   */
  async createRole(organizationId: string, roleData: {
    name: string
    description?: string
    permissions: string[]
  }): Promise<Role> {
    try {
      const validatedData = validateCreateRole({
        ...roleData,
        organizationId,
        isSystemRole: false
      })

      const { data, error } = await this.supabase
        .from('roles')
        .insert({
          name: validatedData.name,
          description: validatedData.description,
          organization_id: validatedData.organizationId,
          is_system_role: validatedData.isSystemRole,
          permissions: validatedData.permissions
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create role: ${error.message}`)
      }

      return validateRole({
        id: data.id,
        name: data.name,
        description: data.description,
        organizationId: data.organization_id,
        isSystemRole: data.is_system_role,
        permissions: data.permissions,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      })
    } catch (error) {
      console.error('Error creating role:', error)
      throw error
    }
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: string, updates: {
    name?: string
    description?: string
    permissions?: string[]
  }): Promise<Role> {
    try {
      const validatedUpdates = validateUpdateRole(updates)

      const { data, error } = await this.supabase
        .from('roles')
        .update({
          ...(validatedUpdates.name && { name: validatedUpdates.name }),
          ...(validatedUpdates.description !== undefined && { description: validatedUpdates.description }),
          ...(validatedUpdates.permissions && { permissions: validatedUpdates.permissions }),
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update role: ${error.message}`)
      }

      return validateRole({
        id: data.id,
        name: data.name,
        description: data.description,
        organizationId: data.organization_id,
        isSystemRole: data.is_system_role,
        permissions: data.permissions,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      })
    } catch (error) {
      console.error('Error updating role:', error)
      throw error
    }
  }

  /**
   * Delete a role (only if it's not a system role and not assigned to any users)
   */
  async deleteRole(roleId: string): Promise<void> {
    try {
      // Check if role is a system role
      const { data: roleData, error: roleError } = await this.supabase
        .from('roles')
        .select('is_system_role')
        .eq('id', roleId)
        .single()

      if (roleError) {
        throw new Error(`Role not found: ${roleError.message}`)
      }

      if (roleData.is_system_role) {
        throw new Error('Cannot delete system roles')
      }

      // Check if role is assigned to any users
      const { data: memberships, error: membershipError } = await this.supabase
        .from('organization_memberships')
        .select('id')
        .eq('role_id', roleId)
        .limit(1)

      if (membershipError) {
        throw new Error(`Failed to check role assignments: ${membershipError.message}`)
      }

      if (memberships && memberships.length > 0) {
        throw new Error('Cannot delete role that is assigned to users')
      }

      // Delete the role
      const { error: deleteError } = await this.supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

      if (deleteError) {
        throw new Error(`Failed to delete role: ${deleteError.message}`)
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      throw error
    }
  }

  /**
   * Get all roles within an organization
   */
  async getOrganizationRoles(organizationId: string): Promise<Role[]> {
    try {
      const { data, error } = await this.supabase
        .from('roles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name')

      if (error) {
        throw new Error(`Failed to get organization roles: ${error.message}`)
      }

      return data.map((role: any) => validateRole({
        id: role.id,
        name: role.name,
        description: role.description,
        organizationId: role.organization_id,
        isSystemRole: role.is_system_role,
        permissions: role.permissions,
        createdAt: new Date(role.created_at),
        updatedAt: new Date(role.updated_at)
      }))
    } catch (error) {
      console.error('Error getting organization roles:', error)
      throw error
    }
  }

  /**
   * Get all available permissions in the system
   */
  async getAvailablePermissions(): Promise<Permission[]> {
    try {
      const { data, error } = await this.supabase
        .from('permissions')
        .select('*')
        .order('resource', { ascending: true })
        .order('action', { ascending: true })

      if (error) {
        throw new Error(`Failed to get permissions: ${error.message}`)
      }

      return data.map((permission: any) => ({
        id: permission.id,
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
        createdAt: new Date(permission.created_at),
        updatedAt: new Date(permission.created_at) // permissions don't have updated_at
      }))
    } catch (error) {
      console.error('Error getting available permissions:', error)
      throw error
    }
  }

  /**
   * Validate if a user can perform an action on a resource
   */
  async validateResourceAccess(
    userId: string,
    organizationId: string,
    resource: string,
    action: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      // Build permission string
      const permission = `${resource}:${action}`
      
      // Check if user has the permission
      const hasPermission = await this.hasPermission(userId, organizationId, permission)
      
      if (!hasPermission) {
        return false
      }

      // Additional resource-specific validation can be added here
      // For example, checking if user owns the specific resource
      if (resourceId) {
        // This would be extended based on specific resource types
        // For now, we just check the basic permission
      }

      return true
    } catch (error) {
      console.error('Error validating resource access:', error)
      return false
    }
  }

  /**
   * Get RBAC context for a user in an organization
   */
  async getRBACContext(userId: string, organizationId: string): Promise<RBACContext> {
    try {
      const [userRoles, userPermissions] = await Promise.all([
        this.getUserRoles(userId, organizationId),
        this.getUserPermissions(userId, organizationId)
      ])

      return {
        userId,
        organizationId,
        userRoles,
        userPermissions
      }
    } catch (error) {
      console.error('Error getting RBAC context:', error)
      throw error
    }
  }
}

// Export singleton instance
export const rbacService = new RBACService()