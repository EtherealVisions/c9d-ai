/**
 * Roles Validation Schemas
 * 
 * This file contains Zod validation schemas for role and permission-related operations.
 * Schemas are generated from Drizzle definitions and extended with business rules.
 */

import { z } from 'zod'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { roles, permissions } from '@/lib/db/schema/roles'

// Constants for permissions
export const PERMISSION_RESOURCES = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  ROLES: 'roles',
  INVITATIONS: 'invitations',
  CONTENT: 'content',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings'
} as const

export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage'
} as const

// Permission validation
export const permissionStringSchema = z.string()
  .regex(/^[a-z_]+\.[a-z_]+$/, 'Permission must be in format "resource.action"')
  .refine(val => {
    const [resource, action] = val.split('.')
    return Object.values(PERMISSION_RESOURCES).includes(resource as any) &&
           Object.values(PERMISSION_ACTIONS).includes(action as any)
  }, 'Invalid permission resource or action')

// Auto-generated base schemas from Drizzle
export const selectRoleSchema = createSelectSchema(roles)
export const insertRoleSchema = createInsertSchema(roles)
export const selectPermissionSchema = createSelectSchema(permissions)
export const insertPermissionSchema = createInsertSchema(permissions)

// Legacy alias for backward compatibility
export const baseRoleSchema = selectRoleSchema

// Role validation schemas with business rules using drizzle-zod
export const createRoleSchema = z.object({
  name: z.string()
    .min(1, 'Role name is required')
    .max(100, 'Role name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Role name contains invalid characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  
  organizationId: z.string()
    .uuid('Invalid organization ID'),
  
  isSystemRole: z.boolean()
    .default(false)
    .optional(),
  
  permissions: z.array(permissionStringSchema)
    .default([])
    .refine(arr => arr.length <= 100, 'Cannot have more than 100 permissions')
    .refine(arr => new Set(arr).size === arr.length, 'Permissions must be unique')
    .optional()
})

export const updateRoleSchema = createRoleSchema.omit({
  organizationId: true, // Organization ID should not be updatable
  isSystemRole: true    // System role flag should not be updatable
}).partial()

// Permission schemas with business rules using drizzle-zod
export const createPermissionSchema = z.object({
  name: z.string()
    .min(1, 'Permission name is required')
    .max(100, 'Permission name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Permission name contains invalid characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  
  resource: z.enum(Object.values(PERMISSION_RESOURCES) as [string, ...string[]])
    .refine(val => Object.values(PERMISSION_RESOURCES).includes(val as any), 'Invalid resource'),
  
  action: z.enum(Object.values(PERMISSION_ACTIONS) as [string, ...string[]])
    .refine(val => Object.values(PERMISSION_ACTIONS).includes(val as any), 'Invalid action')
})

export const updatePermissionSchema = z.object({
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional()
})

// API Response schemas with transformations
export const roleApiResponseSchema = selectRoleSchema.extend({
  memberCount: z.number().int().min(0).default(0),
  canEdit: z.boolean().default(false).transform((val, ctx) => {
    // System roles cannot be edited
    const role = ctx.path[0] as any
    return role?.isSystemRole ? false : val
  }),
  canDelete: z.boolean().default(false).transform((val, ctx) => {
    // System roles cannot be deleted
    const role = ctx.path[0] as any
    return role?.isSystemRole ? false : val
  })
})

export const permissionApiResponseSchema = selectPermissionSchema.extend({
  roleCount: z.number().int().min(0).default(0),
  isSystemPermission: z.boolean().default(false),
  permissionString: z.string().transform((val, ctx) => {
    // Auto-generate permission string from resource and action
    const permission = ctx.path[0] as any
    return `${permission?.resource}:${permission?.action}`
  })
})

// List response schemas
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

// Bulk operations schemas
export const bulkAssignPermissionsSchema = z.object({
  roleId: z.string().uuid(),
  permissions: z.array(permissionStringSchema)
    .min(1, 'At least one permission is required')
    .max(100, 'Cannot assign more than 100 permissions at once')
    .refine(arr => new Set(arr).size === arr.length, 'Permissions must be unique')
})

export const bulkRevokePermissionsSchema = z.object({
  roleId: z.string().uuid(),
  permissions: z.array(permissionStringSchema)
    .min(1, 'At least one permission is required')
    .refine(arr => new Set(arr).size === arr.length, 'Permissions must be unique')
})

// Search and filter schemas
export const roleSearchSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  organizationId: z.string().uuid().optional(),
  isSystemRole: z.boolean().optional(),
  hasPermission: z.string().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'memberCount']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
})

export const permissionSearchSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  resource: z.enum(Object.values(PERMISSION_RESOURCES) as [string, ...string[]]).optional(),
  action: z.enum(Object.values(PERMISSION_ACTIONS) as [string, ...string[]]).optional(),
  isSystemPermission: z.boolean().optional(),
  sortBy: z.enum(['name', 'resource', 'action', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
})

// Type exports
export type CreateRole = z.infer<typeof createRoleSchema>
export type UpdateRole = z.infer<typeof updateRoleSchema>
export type CreatePermission = z.infer<typeof createPermissionSchema>
export type UpdatePermission = z.infer<typeof updatePermissionSchema>
export type RoleApiResponse = z.infer<typeof roleApiResponseSchema>
export type PermissionApiResponse = z.infer<typeof permissionApiResponseSchema>
export type RoleListResponse = z.infer<typeof roleListResponseSchema>
export type PermissionListResponse = z.infer<typeof permissionListResponseSchema>

// Database schema types (simplified)
export type SelectRole = z.infer<typeof baseRoleSchema>
export type InsertRole = Omit<SelectRole, 'id' | 'createdAt' | 'updatedAt'>
export type SelectPermission = {
  id: string
  name: string
  description: string | null
  resource: string
  action: string
  createdAt: Date
}
export type InsertPermission = Omit<SelectPermission, 'id' | 'createdAt'>

// Search and bulk operation types
export type RoleSearch = z.infer<typeof roleSearchSchema>
export type PermissionSearch = z.infer<typeof permissionSearchSchema>
export type BulkAssignPermissions = z.infer<typeof bulkAssignPermissionsSchema>
export type BulkRevokePermissions = z.infer<typeof bulkRevokePermissionsSchema>