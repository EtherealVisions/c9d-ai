/**
 * Roles Validation Schemas
 * 
 * This file contains Zod validation schemas for role and permission-related operations.
 * Schemas are manually defined to ensure type safety and compatibility.
 */

import { z } from 'zod'

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

// Base role schema
export const baseRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string()
    .min(1, 'Role name is required')
    .max(100, 'Role name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Role name contains invalid characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable(),
  
  organizationId: z.string()
    .uuid('Invalid organization ID'),
  
  isSystemRole: z.boolean()
    .default(false),
  
  permissions: z.array(permissionStringSchema)
    .default([])
    .refine(arr => arr.length <= 100, 'Cannot have more than 100 permissions')
    .refine(arr => new Set(arr).size === arr.length, 'Permissions must be unique'),
  
  createdAt: z.date(),
  updatedAt: z.date()
})

// Role validation schemas
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

export const updateRoleSchema = z.object({
  name: z.string()
    .min(1, 'Role name is required')
    .max(100, 'Role name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Role name contains invalid characters')
    .optional(),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  
  permissions: z.array(permissionStringSchema)
    .refine(arr => arr.length <= 100, 'Cannot have more than 100 permissions')
    .refine(arr => new Set(arr).size === arr.length, 'Permissions must be unique')
    .optional()
})

// Permission schemas
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

// API Response schemas
export const roleApiResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  organizationId: z.string().uuid(),
  isSystemRole: z.boolean(),
  permissions: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
  memberCount: z.number().int().min(0).default(0),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false)
})

export const permissionApiResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  resource: z.string(),
  action: z.string(),
  createdAt: z.date(),
  roleCount: z.number().int().min(0).default(0),
  isSystemPermission: z.boolean().default(false)
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