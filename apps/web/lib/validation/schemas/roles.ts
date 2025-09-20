/**
 * Roles and Permissions Validation Schemas
 * 
 * This file contains Zod validation schemas for role and permission-related operations.
 * Schemas are generated from Drizzle definitions and extended with business rules.
 */

import { z } from 'zod'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { roles, permissions, PERMISSION_RESOURCES, PERMISSION_ACTIONS, SYSTEM_ROLES } from '@/lib/db/schema/roles'

// Base schemas generated from Drizzle definitions
export const selectRoleSchema = createSelectSchema(roles)
export const insertRoleSchema = createInsertSchema(roles)
export const selectPermissionSchema = createSelectSchema(permissions)
export const insertPermissionSchema = createInsertSchema(permissions)

// Permission string validation
export const permissionStringSchema = z.string()
  .regex(/^[a-z_]+:[a-z_]+$/, 'Permission must be in format "resource:action"')
  .refine(
    (permission) => {
      const [resource, action] = permission.split(':')
      return Object.values(PERMISSION_RESOURCES).includes(resource as any) &&
             Object.values(PERMISSION_ACTIONS).includes(action as any)
    },
    'Invalid permission resource or action'
  )

// Role validation schemas
export const createRoleSchema = insertRoleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  name: z.string()
    .min(1, 'Role name is required')
    .max(100, 'Role name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable(),
  
  organizationId: z.string()
    .uuid('Invalid organization ID format'),
  
  isSystemRole: z.boolean()
    .default(false),
  
  permissions: z.array(permissionStringSchema)
    .min(1, 'Role must have at least one permission')
    .max(50, 'Role cannot have more than 50 permissions')
    .refine(
      (permissions) => {
        // Check for duplicate permissions
        const uniquePermissions = new Set(permissions)
        return uniquePermissions.size === permissions.length
      },
      'Duplicate permissions are not allowed'
    )
})

export const updateRoleSchema = createRoleSchema.partial().omit({
  organizationId: true, // Organization cannot be changed
  isSystemRole: true    // System role status cannot be changed
}).extend({
  name: z.string()
    .min(1, 'Role name cannot be empty')
    .max(100, 'Role name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores')
    .optional(),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  
  permissions: z.array(permissionStringSchema)
    .min(1, 'Role must have at least one permission')
    .max(50, 'Role cannot have more than 50 permissions')
    .refine(
      (permissions) => {
        if (!permissions) return true
        const uniquePermissions = new Set(permissions)
        return uniquePermissions.size === permissions.length
      },
      'Duplicate permissions are not allowed'
    )
    .optional()
})

// Permission validation schemas
export const createPermissionSchema = insertPermissionSchema.omit({
  id: true,
  createdAt: true
}).extend({
  name: z.string()
    .min(1, 'Permission name is required')
    .max(100, 'Permission name must be less than 100 characters')
    .regex(/^[a-z_]+:[a-z_]+$/, 'Permission name must be in format "resource:action"'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable(),
  
  resource: z.enum(Object.values(PERMISSION_RESOURCES) as [string, ...string[]])
    .refine(
      (resource) => Object.values(PERMISSION_RESOURCES).includes(resource as any),
      'Invalid permission resource'
    ),
  
  action: z.enum(Object.values(PERMISSION_ACTIONS) as [string, ...string[]])
    .refine(
      (action) => Object.values(PERMISSION_ACTIONS).includes(action as any),
      'Invalid permission action'
    )
})

export const updatePermissionSchema = createPermissionSchema.partial().omit({
  name: true,     // Permission name cannot be changed
  resource: true, // Resource cannot be changed
  action: true    // Action cannot be changed
}).extend({
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional()
})

// API request/response schemas
export const roleApiResponseSchema = selectRoleSchema.extend({
  memberCount: z.number().int().min(0),
  permissionCount: z.number().int().min(0),
  organization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string()
  }).optional(),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false)
})

export const permissionApiResponseSchema = selectPermissionSchema.extend({
  roleCount: z.number().int().min(0),
  isSystemPermission: z.boolean().default(false)
})

export const roleListResponseSchema = z.object({
  roles: z.array(roleApiResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
})

export const permissionListResponseSchema = z.object({
  permissions: z.array(permissionApiResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
})

// Role and permission search schemas
export const roleSearchSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  query: z.string().min(1).max(255).optional(),
  name: z.string().max(100).optional(),
  isSystemRole: z.boolean().optional(),
  hasPermission: z.string().regex(/^[a-z_]+:[a-z_]+$/).optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'memberCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const permissionSearchSchema = z.object({
  query: z.string().min(1).max(255).optional(),
  resource: z.enum(Object.values(PERMISSION_RESOURCES) as [string, ...string[]]).optional(),
  action: z.enum(Object.values(PERMISSION_ACTIONS) as [string, ...string[]]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'name', 'resource', 'action']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// Role assignment and permission check schemas
export const roleAssignmentSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  roleId: z.string().uuid('Invalid role ID')
})

export const permissionCheckSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  permission: permissionStringSchema,
  resourceId: z.string().uuid().optional() // For resource-specific permissions
})

export const bulkPermissionCheckSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  permissions: z.array(permissionStringSchema).min(1).max(20),
  resourceId: z.string().uuid().optional()
})

// System role validation
export const systemRoleSchema = z.enum(Object.values(SYSTEM_ROLES) as [string, ...string[]])

// Role hierarchy validation
export const roleHierarchySchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
  parentRoleId: z.string().uuid('Invalid parent role ID').nullable(),
  level: z.number().int().min(0).max(10),
  organizationId: z.string().uuid('Invalid organization ID')
})

// Type exports for TypeScript integration
export type CreateRole = z.infer<typeof createRoleSchema>
export type UpdateRole = z.infer<typeof updateRoleSchema>
export type CreatePermission = z.infer<typeof createPermissionSchema>
export type UpdatePermission = z.infer<typeof updatePermissionSchema>
export type RoleApiResponse = z.infer<typeof roleApiResponseSchema>
export type PermissionApiResponse = z.infer<typeof permissionApiResponseSchema>
export type RoleListResponse = z.infer<typeof roleListResponseSchema>
export type PermissionListResponse = z.infer<typeof permissionListResponseSchema>
export type RoleSearch = z.infer<typeof roleSearchSchema>
export type PermissionSearch = z.infer<typeof permissionSearchSchema>
export type RoleAssignment = z.infer<typeof roleAssignmentSchema>
export type PermissionCheck = z.infer<typeof permissionCheckSchema>
export type BulkPermissionCheck = z.infer<typeof bulkPermissionCheckSchema>
export type SystemRole = z.infer<typeof systemRoleSchema>
export type RoleHierarchy = z.infer<typeof roleHierarchySchema>
export type PermissionString = z.infer<typeof permissionStringSchema>
export type SelectRole = z.infer<typeof selectRoleSchema>
export type InsertRole = z.infer<typeof insertRoleSchema>
export type SelectPermission = z.infer<typeof selectPermissionSchema>
export type InsertPermission = z.infer<typeof insertPermissionSchema>

// Validation helper functions
export function validateCreateRole(data: unknown): CreateRole {
  return createRoleSchema.parse(data)
}

export function validateUpdateRole(data: unknown): UpdateRole {
  return updateRoleSchema.parse(data)
}

export function validateCreatePermission(data: unknown): CreatePermission {
  return createPermissionSchema.parse(data)
}

export function validateUpdatePermission(data: unknown): UpdatePermission {
  return updatePermissionSchema.parse(data)
}

export function validateRoleSearch(data: unknown): RoleSearch {
  return roleSearchSchema.parse(data)
}

export function validatePermissionSearch(data: unknown): PermissionSearch {
  return permissionSearchSchema.parse(data)
}

export function validateRoleAssignment(data: unknown): RoleAssignment {
  return roleAssignmentSchema.parse(data)
}

export function validatePermissionCheck(data: unknown): PermissionCheck {
  return permissionCheckSchema.parse(data)
}

export function validateBulkPermissionCheck(data: unknown): BulkPermissionCheck {
  return bulkPermissionCheckSchema.parse(data)
}

export function validatePermissionString(permission: string): PermissionString {
  return permissionStringSchema.parse(permission)
}

// Safe parsing functions that return results instead of throwing
export function safeValidateCreateRole(data: unknown) {
  return createRoleSchema.safeParse(data)
}

export function safeValidateUpdateRole(data: unknown) {
  return updateRoleSchema.safeParse(data)
}

export function safeValidateCreatePermission(data: unknown) {
  return createPermissionSchema.safeParse(data)
}

export function safeValidateUpdatePermission(data: unknown) {
  return updatePermissionSchema.safeParse(data)
}

export function safeValidateRoleSearch(data: unknown) {
  return roleSearchSchema.safeParse(data)
}

export function safeValidatePermissionSearch(data: unknown) {
  return permissionSearchSchema.safeParse(data)
}

export function safeValidateRoleAssignment(data: unknown) {
  return roleAssignmentSchema.safeParse(data)
}

export function safeValidatePermissionCheck(data: unknown) {
  return permissionCheckSchema.safeParse(data)
}

export function safeValidateBulkPermissionCheck(data: unknown) {
  return bulkPermissionCheckSchema.safeParse(data)
}

export function safeValidatePermissionString(permission: string) {
  return permissionStringSchema.safeParse(permission)
}

// Permission utility functions
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission)
}

export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(permission => userPermissions.includes(permission))
}

export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission))
}

export function getPermissionsByResource(permissions: string[], resource: string): string[] {
  return permissions.filter(permission => permission.startsWith(`${resource}:`))
}

export function getPermissionsByAction(permissions: string[], action: string): string[] {
  return permissions.filter(permission => permission.endsWith(`:${action}`))
}