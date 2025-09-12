/**
 * Data transformation utilities for converting between database rows and application models
 * These functions handle the conversion between snake_case database fields and camelCase TypeScript interfaces
 */

import type {
  User,
  Organization,
  Membership,
  Role,
  Permission,
  Invitation,
  AuditLog,
  UserRow,
  OrganizationRow,
  MembershipRow,
  RoleRow,
  PermissionRow,
  InvitationRow,
  AuditLogRow
} from './types'

/**
 * Transform database user row to User model
 */
export function transformUserRow(row: UserRow): User {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    email: row.email,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    avatarUrl: row.avatar_url || undefined,
    preferences: row.preferences,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

/**
 * Transform User model to database row format
 */
export function transformUserToRow(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Omit<UserRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    clerk_user_id: user.clerkUserId,
    email: user.email,
    first_name: user.firstName || null,
    last_name: user.lastName || null,
    avatar_url: user.avatarUrl || null,
    preferences: user.preferences
  }
}

/**
 * Transform database organization row to Organization model
 */
export function transformOrganizationRow(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    avatarUrl: row.avatar_url || undefined,
    metadata: row.metadata,
    settings: row.settings,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

/**
 * Transform Organization model to database row format
 */
export function transformOrganizationToRow(org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: org.name,
    slug: org.slug,
    description: org.description || null,
    avatar_url: org.avatarUrl || null,
    metadata: org.metadata,
    settings: org.settings
  }
}

/**
 * Transform database membership row to Membership model
 */
export function transformMembershipRow(row: MembershipRow): Omit<Membership, 'user' | 'organization' | 'role'> {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    roleId: row.role_id,
    status: row.status,
    joinedAt: new Date(row.joined_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

/**
 * Transform Membership model to database row format
 */
export function transformMembershipToRow(membership: Omit<Membership, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'organization' | 'role'>): Omit<MembershipRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: membership.userId,
    organization_id: membership.organizationId,
    role_id: membership.roleId,
    status: membership.status,
    joined_at: membership.joinedAt.toISOString()
  }
}

/**
 * Transform database role row to Role model
 */
export function transformRoleRow(row: RoleRow): Role {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    organizationId: row.organization_id,
    isSystemRole: row.is_system_role,
    permissions: row.permissions,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

/**
 * Transform Role model to database row format
 */
export function transformRoleToRow(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Omit<RoleRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: role.name,
    description: role.description || null,
    organization_id: role.organizationId,
    is_system_role: role.isSystemRole,
    permissions: role.permissions
  }
}

/**
 * Transform database permission row to Permission model
 */
export function transformPermissionRow(row: PermissionRow): Permission {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    resource: row.resource,
    action: row.action,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.created_at) // Permissions don't have updated_at
  }
}

/**
 * Transform Permission model to database row format
 */
export function transformPermissionToRow(permission: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Omit<PermissionRow, 'id' | 'created_at'> {
  return {
    name: permission.name,
    description: permission.description || null,
    resource: permission.resource,
    action: permission.action
  }
}

/**
 * Transform database invitation row to Invitation model
 */
export function transformInvitationRow(row: InvitationRow): Omit<Invitation, 'organization' | 'role' | 'inviter'> {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    roleId: row.role_id,
    invitedBy: row.invited_by,
    token: row.token,
    status: row.status,
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

/**
 * Transform Invitation model to database row format
 */
export function transformInvitationToRow(invitation: Omit<Invitation, 'id' | 'createdAt' | 'updatedAt' | 'organization' | 'role' | 'inviter'>): Omit<InvitationRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    organization_id: invitation.organizationId,
    email: invitation.email,
    role_id: invitation.roleId,
    invited_by: invitation.invitedBy,
    token: invitation.token,
    status: invitation.status,
    expires_at: invitation.expiresAt.toISOString()
  }
}

/**
 * Transform database audit log row to AuditLog model
 */
export function transformAuditLogRow(row: AuditLogRow): Omit<AuditLog, 'user' | 'organization'> {
  return {
    id: row.id,
    userId: row.user_id || undefined,
    organizationId: row.organization_id || undefined,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id || undefined,
    metadata: row.metadata,
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.created_at) // Audit logs don't have updated_at
  }
}

/**
 * Transform AuditLog model to database row format
 */
export function transformAuditLogToRow(auditLog: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'organization'>): Omit<AuditLogRow, 'id' | 'created_at'> {
  return {
    user_id: auditLog.userId || null,
    organization_id: auditLog.organizationId || null,
    action: auditLog.action,
    resource_type: auditLog.resourceType,
    resource_id: auditLog.resourceId || null,
    metadata: auditLog.metadata,
    ip_address: auditLog.ipAddress || null,
    user_agent: auditLog.userAgent || null
  }
}

/**
 * Utility function to transform arrays of database rows
 */
export function transformRows<TRow, TModel>(
  rows: TRow[],
  transformer: (row: TRow) => TModel
): TModel[] {
  return rows.map(transformer)
}

/**
 * Utility function to safely transform a single row that might be null
 */
export function transformRowSafe<TRow, TModel>(
  row: TRow | null,
  transformer: (row: TRow) => TModel
): TModel | null {
  return row ? transformer(row) : null
}