/**
 * Roles and Permissions Schema Definition for Drizzle ORM
 * 
 * This file defines the roles and permissions table schemas for the RBAC system
 * with proper relationships and constraints for access control management.
 */

import { pgTable, uuid, varchar, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organizations, organizationMemberships } from './organizations'
import { invitations } from './invitations'

/**
 * Roles table schema
 * Defines roles within organizations with associated permissions
 */
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  isSystemRole: boolean('is_system_role').notNull().default(false),
  permissions: jsonb('permissions').notNull().default([]), // Array of permission strings
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  organizationIdIdx: index('roles_organization_id_idx').on(table.organizationId),
  nameIdx: index('roles_name_idx').on(table.name),
  isSystemRoleIdx: index('roles_is_system_role_idx').on(table.isSystemRole),
  // Composite index for organization + name uniqueness
  orgNameIdx: index('roles_org_name_idx').on(table.organizationId, table.name)
}))

/**
 * Permissions table schema
 * Defines granular permissions that can be assigned to roles
 */
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  resource: varchar('resource', { length: 100 }).notNull(), // e.g., 'user', 'organization', 'content'
  action: varchar('action', { length: 50 }).notNull(), // e.g., 'read', 'write', 'delete', 'manage'
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  nameIdx: index('permissions_name_idx').on(table.name),
  resourceIdx: index('permissions_resource_idx').on(table.resource),
  actionIdx: index('permissions_action_idx').on(table.action),
  // Composite index for resource + action uniqueness
  resourceActionIdx: index('permissions_resource_action_idx').on(table.resource, table.action)
}))

/**
 * Role relations definition
 */
export const rolesRelations = relations(roles, ({ one, many }) => ({
  // Role belongs to one organization
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id]
  }),
  
  // Role can have multiple memberships
  memberships: many(organizationMemberships),
  
  // Role can be used in multiple invitations
  invitations: many(invitations)
}))

/**
 * Permission relations definition
 * Permissions are standalone entities that can be referenced by roles
 */
export const permissionsRelations = relations(permissions, ({ }) => ({
  // Permissions don't have direct relations since they're referenced by JSON arrays in roles
  // This could be extended to a many-to-many relationship if needed
}))

/**
 * Type definitions derived from schema
 */
export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert
export type RoleUpdate = Partial<Omit<NewRole, 'id' | 'createdAt' | 'updatedAt'>>

export type Permission = typeof permissions.$inferSelect
export type NewPermission = typeof permissions.$inferInsert
export type PermissionUpdate = Partial<Omit<NewPermission, 'id' | 'createdAt'>>

/**
 * Extended role type with populated relations
 */
export type RoleWithOrganization = Role & {
  organization: {
    id: string
    name: string
    slug: string
  }
}

/**
 * Permission constants for type safety
 */
export const PERMISSION_RESOURCES = {
  USER: 'user',
  ORGANIZATION: 'organization',
  ROLE: 'role',
  INVITATION: 'invitation',
  CONTENT: 'content',
  ONBOARDING: 'onboarding',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings'
} as const

export const PERMISSION_ACTIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  MANAGE: 'manage',
  INVITE: 'invite',
  APPROVE: 'approve'
} as const

/**
 * System role constants
 */
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORGANIZATION_ADMIN: 'organization_admin',
  ORGANIZATION_MEMBER: 'organization_member',
  ORGANIZATION_VIEWER: 'organization_viewer'
} as const

/**
 * Helper type for permission strings
 */
export type PermissionString = `${keyof typeof PERMISSION_RESOURCES}:${keyof typeof PERMISSION_ACTIONS}`

/**
 * Default permissions for system roles
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  [SYSTEM_ROLES.SUPER_ADMIN]: [
    'user:manage',
    'organization:manage',
    'role:manage',
    'invitation:manage',
    'content:manage',
    'onboarding:manage',
    'analytics:read',
    'settings:manage'
  ],
  [SYSTEM_ROLES.ORGANIZATION_ADMIN]: [
    'user:read',
    'user:write',
    'organization:read',
    'organization:write',
    'role:manage',
    'invitation:manage',
    'content:manage',
    'onboarding:manage',
    'analytics:read',
    'settings:write'
  ],
  [SYSTEM_ROLES.ORGANIZATION_MEMBER]: [
    'user:read',
    'organization:read',
    'content:read',
    'content:write',
    'onboarding:read',
    'settings:read'
  ],
  [SYSTEM_ROLES.ORGANIZATION_VIEWER]: [
    'user:read',
    'organization:read',
    'content:read',
    'onboarding:read'
  ]
} as const