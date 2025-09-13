/**
 * Data transformers for converting between database rows and application models
 */

import type {
  UserRow,
  OrganizationRow,
  MembershipRow,
  RoleRow,
  PermissionRow,
  InvitationRow,
  AuditLogRow,
  User,
  Organization,
  Membership,
  Role,
  Permission,
  Invitation,
  AuditLog
} from './index'

// User transformers
export function transformUserRow(row: UserRow): User {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    email: row.email,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    preferences: row.preferences,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

export function transformUserToRow(user: Omit<User, 'createdAt' | 'updatedAt'>): Omit<UserRow, 'created_at' | 'updated_at'> {
  return {
    id: user.id,
    clerk_user_id: user.clerkUserId,
    email: user.email,
    first_name: user.firstName ?? null,
    last_name: user.lastName ?? null,
    avatar_url: user.avatarUrl ?? null,
    preferences: user.preferences
  }
}

// Organization transformers
export function transformOrganizationRow(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    avatarUrl: row.avatar_url ?? null,
    metadata: row.metadata,
    settings: row.settings,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

export function transformOrganizationToRow(org: Omit<Organization, 'createdAt' | 'updatedAt'>): Omit<OrganizationRow, 'created_at' | 'updated_at'> {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description ?? null,
    avatar_url: org.avatarUrl ?? null,
    metadata: org.metadata,
    settings: org.settings
  }
}

// Membership transformers
export function transformMembershipRow(row: MembershipRow): Membership {
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

export function transformMembershipToRow(membership: Omit<Membership, 'createdAt' | 'updatedAt'>): Omit<MembershipRow, 'created_at' | 'updated_at'> {
  return {
    id: membership.id,
    user_id: membership.userId,
    organization_id: membership.organizationId,
    role_id: membership.roleId,
    status: membership.status,
    joined_at: membership.joinedAt.toISOString()
  }
}

// Role transformers
export function transformRoleRow(row: RoleRow): Role {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    organizationId: row.organization_id,
    isSystemRole: row.is_system_role,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

export function transformRoleToRow(role: Omit<Role, 'createdAt' | 'updatedAt'>): Omit<RoleRow, 'created_at' | 'updated_at'> {
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? null,
    organization_id: role.organizationId,
    is_system_role: role.isSystemRole
  }
}

// Permission transformers
export function transformPermissionRow(row: PermissionRow): Permission {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    resource: row.resource,
    action: row.action,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

export function transformPermissionToRow(permission: Omit<Permission, 'createdAt' | 'updatedAt'>): Omit<PermissionRow, 'created_at' | 'updated_at'> {
  return {
    id: permission.id,
    name: permission.name,
    description: permission.description ?? null,
    resource: permission.resource,
    action: permission.action
  }
}

// Invitation transformers
export function transformInvitationRow(row: InvitationRow): Invitation {
  return {
    id: row.id,
    email: row.email,
    organizationId: row.organization_id,
    roleId: row.role_id,
    invitedBy: row.invited_by,
    token: row.token,
    status: row.status,
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

export function transformInvitationToRow(invitation: Omit<Invitation, 'createdAt' | 'updatedAt'>): Omit<InvitationRow, 'created_at' | 'updated_at'> {
  return {
    id: invitation.id,
    email: invitation.email,
    organization_id: invitation.organizationId,
    role_id: invitation.roleId,
    invited_by: invitation.invitedBy,
    token: invitation.token,
    status: invitation.status,
    expires_at: invitation.expiresAt.toISOString()
  }
}

// Audit Log transformers
export function transformAuditLogRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    organizationId: row.organization_id ?? null,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id ?? null,
    details: row.details,
    ipAddress: row.ip_address ?? null,
    userAgent: row.user_agent ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

export function transformAuditLogToRow(auditLog: Omit<AuditLog, 'createdAt' | 'updatedAt'>): Omit<AuditLogRow, 'created_at' | 'updated_at'> {
  return {
    id: auditLog.id,
    user_id: auditLog.userId ?? null,
    organization_id: auditLog.organizationId ?? null,
    action: auditLog.action,
    resource: auditLog.resource,
    resource_id: auditLog.resourceId ?? null,
    details: auditLog.details,
    ip_address: auditLog.ipAddress ?? null,
    user_agent: auditLog.userAgent ?? null
  }
}

// Utility functions for array transformations
export function transformRows<TRow, TModel>(
  rows: TRow[],
  transformer: (row: TRow) => TModel
): TModel[] {
  return rows.map(transformer)
}

export function transformRowSafe<TRow, TModel>(
  row: TRow | null,
  transformer: (row: TRow) => TModel
): TModel | null {
  return row ? transformer(row) : null
}