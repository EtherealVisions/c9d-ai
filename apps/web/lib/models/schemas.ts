/**
 * Zod validation schemas for data models
 * These schemas provide runtime validation and type inference for all entities
 */

import { z } from 'zod'
import type {
  User,
  Organization,
  Membership,
  Role,
  Permission,
  Invitation,
  AuditLog,
  MembershipStatus,
  InvitationStatus,
  UserRow,
  OrganizationRow,
  MembershipRow,
  RoleRow,
  PermissionRow,
  InvitationRow,
  AuditLogRow
} from './types'

// Base schema for entities with timestamps
const baseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Enum schemas
export const membershipStatusSchema = z.enum(['active', 'inactive', 'pending'])
export const invitationStatusSchema = z.enum(['pending', 'accepted', 'expired', 'revoked'])

// User validation schemas
export const userSchema = baseEntitySchema.extend({
  clerkUserId: z.string().min(1, 'Clerk user ID is required'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
  preferences: z.record(z.any()).default({})
}) satisfies z.ZodType<User>

export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const updateUserSchema = userSchema.partial().omit({
  id: true,
  clerkUserId: true,
  createdAt: true,
  updatedAt: true
})

// Organization validation schemas
export const organizationSchema = baseEntitySchema.extend({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description too long').optional(),
  avatarUrl: z.string().url().optional(),
  metadata: z.record(z.any()).default({}),
  settings: z.record(z.any()).default({})
}) satisfies z.ZodType<Organization>

export const createOrganizationSchema = organizationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const updateOrganizationSchema = organizationSchema.partial().omit({
  id: true,
  slug: true, // Slug should not be updatable after creation
  createdAt: true,
  updatedAt: true
})

// Membership validation schemas
export const membershipSchema = baseEntitySchema.extend({
  userId: z.string().uuid('Invalid user ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  roleId: z.string().uuid('Invalid role ID'),
  status: membershipStatusSchema,
  joinedAt: z.date()
}) satisfies z.ZodType<Omit<Membership, 'user' | 'organization' | 'role'>>

export const createMembershipSchema = membershipSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  joinedAt: true
}).extend({
  joinedAt: z.date().optional()
})

export const updateMembershipSchema = membershipSchema.partial().omit({
  id: true,
  userId: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true
})

// Role validation schemas
export const roleSchema = baseEntitySchema.extend({
  name: z.string().min(1, 'Role name is required').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long').optional(),
  organizationId: z.string().uuid('Invalid organization ID'),
  isSystemRole: z.boolean().default(false),
  permissions: z.array(z.string()).default([])
}) satisfies z.ZodType<Role>

export const createRoleSchema = roleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const updateRoleSchema = roleSchema.partial().omit({
  id: true,
  organizationId: true,
  isSystemRole: true, // System role flag should not be updatable
  createdAt: true,
  updatedAt: true
})

// Permission validation schemas
export const permissionSchema = baseEntitySchema.extend({
  name: z.string().min(1, 'Permission name is required').max(100, 'Name too long'),
  description: z.string().max(200, 'Description too long').optional(),
  resource: z.string().min(1, 'Resource is required').max(50, 'Resource name too long'),
  action: z.string().min(1, 'Action is required').max(50, 'Action name too long')
}) satisfies z.ZodType<Permission>

export const createPermissionSchema = permissionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

// Invitation validation schemas
export const invitationSchema = baseEntitySchema.extend({
  organizationId: z.string().uuid('Invalid organization ID'),
  email: z.string().email('Invalid email format'),
  roleId: z.string().uuid('Invalid role ID'),
  invitedBy: z.string().uuid('Invalid inviter ID'),
  token: z.string().min(1, 'Token is required'),
  status: invitationStatusSchema,
  expiresAt: z.date()
}) satisfies z.ZodType<Omit<Invitation, 'organization' | 'role' | 'inviter'>>

export const createInvitationSchema = invitationSchema.omit({
  id: true,
  token: true, // Token will be generated
  status: true, // Status defaults to 'pending'
  createdAt: true,
  updatedAt: true
}).extend({
  expiresAt: z.date().optional() // Will default to 7 days from now
})

export const updateInvitationSchema = z.object({
  status: invitationStatusSchema
})

// Audit log validation schemas
export const auditLogSchema = baseEntitySchema.extend({
  userId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  action: z.string().min(1, 'Action is required').max(100, 'Action too long'),
  resourceType: z.string().min(1, 'Resource type is required').max(50, 'Resource type too long'),
  resourceId: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500, 'User agent too long').optional()
}) satisfies z.ZodType<Omit<AuditLog, 'user' | 'organization'>>

export const createAuditLogSchema = auditLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

// Database row schemas (for parsing database results)
export const userRowSchema = z.object({
  id: z.string().uuid(),
  clerk_user_id: z.string(),
  email: z.string().email(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  preferences: z.record(z.any()),
  created_at: z.string(),
  updated_at: z.string()
}) satisfies z.ZodType<UserRow>

export const organizationRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  avatar_url: z.string().nullable(),
  metadata: z.record(z.any()),
  settings: z.record(z.any()),
  created_at: z.string(),
  updated_at: z.string()
}) satisfies z.ZodType<OrganizationRow>

export const membershipRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  role_id: z.string().uuid(),
  status: membershipStatusSchema,
  joined_at: z.string(),
  created_at: z.string(),
  updated_at: z.string()
}) satisfies z.ZodType<MembershipRow>

export const roleRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  organization_id: z.string().uuid(),
  is_system_role: z.boolean(),
  permissions: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string()
}) satisfies z.ZodType<RoleRow>

export const permissionRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  resource: z.string(),
  action: z.string(),
  created_at: z.string()
}) satisfies z.ZodType<PermissionRow>

export const invitationRowSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  email: z.string().email(),
  role_id: z.string().uuid(),
  invited_by: z.string().uuid(),
  token: z.string(),
  status: invitationStatusSchema,
  expires_at: z.string(),
  created_at: z.string(),
  updated_at: z.string()
}) satisfies z.ZodType<InvitationRow>

export const auditLogRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),
  action: z.string(),
  resource_type: z.string(),
  resource_id: z.string().nullable(),
  metadata: z.record(z.any()),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.string()
}) satisfies z.ZodType<AuditLogRow>

// Validation helper functions
export function validateUser(data: unknown): User {
  return userSchema.parse(data)
}

export function validateCreateUser(data: unknown) {
  return createUserSchema.parse(data)
}

export function validateUpdateUser(data: unknown) {
  return updateUserSchema.parse(data)
}

export function validateOrganization(data: unknown): Organization {
  return organizationSchema.parse(data)
}

export function validateCreateOrganization(data: unknown) {
  return createOrganizationSchema.parse(data)
}

export function validateUpdateOrganization(data: unknown) {
  return updateOrganizationSchema.parse(data)
}

export function validateMembership(data: unknown): Omit<Membership, 'user' | 'organization' | 'role'> {
  return membershipSchema.parse(data)
}

export function validateCreateMembership(data: unknown) {
  return createMembershipSchema.parse(data)
}

export function validateUpdateMembership(data: unknown) {
  return updateMembershipSchema.parse(data)
}

export function validateRole(data: unknown): Role {
  return roleSchema.parse(data)
}

export function validateCreateRole(data: unknown) {
  return createRoleSchema.parse(data)
}

export function validateUpdateRole(data: unknown) {
  return updateRoleSchema.parse(data)
}

export function validatePermission(data: unknown): Permission {
  return permissionSchema.parse(data)
}

export function validateCreatePermission(data: unknown) {
  return createPermissionSchema.parse(data)
}

export function validateInvitation(data: unknown): Omit<Invitation, 'organization' | 'role' | 'inviter'> {
  return invitationSchema.parse(data)
}

export function validateCreateInvitation(data: unknown) {
  return createInvitationSchema.parse(data)
}

export function validateUpdateInvitation(data: unknown) {
  return updateInvitationSchema.parse(data)
}

export function validateAuditLog(data: unknown): Omit<AuditLog, 'user' | 'organization'> {
  return auditLogSchema.parse(data)
}

export function validateCreateAuditLog(data: unknown) {
  return createAuditLogSchema.parse(data)
}