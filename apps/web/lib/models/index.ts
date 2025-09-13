/**
 * Database models and types
 */

// Database table names
export const DATABASE_TABLES = [
  'users',
  'organizations',
  'memberships',
  'roles',
  'permissions',
  'role_permissions',
  'invitations',
  'audit_logs'
] as const

export type DatabaseTable = typeof DATABASE_TABLES[number]

// Base types
export interface BaseRow {
  id: string
  created_at: string
  updated_at: string
}

// User types
export interface UserRow extends BaseRow {
  clerk_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  preferences: Record<string, any>
}

export interface UserInsert extends Omit<UserRow, 'id' | 'created_at' | 'updated_at'> {}
export interface UserUpdate extends Partial<UserInsert> {}

// Organization types
export interface OrganizationRow extends BaseRow {
  name: string
  slug: string
  description: string | null
  avatar_url: string | null
  metadata: Record<string, any>
  settings: Record<string, any>
}

export interface OrganizationInsert extends Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at'> {}
export interface OrganizationUpdate extends Partial<OrganizationInsert> {}

// Membership types
export interface MembershipRow extends BaseRow {
  user_id: string
  organization_id: string
  role_id: string
  status: 'active' | 'inactive' | 'pending'
  joined_at: string
}

export interface MembershipInsert extends Omit<MembershipRow, 'id' | 'created_at' | 'updated_at'> {}
export interface MembershipUpdate extends Partial<MembershipInsert> {}

// Role types
export interface RoleRow extends BaseRow {
  name: string
  description: string | null
  organization_id: string | null
  is_system_role: boolean
}

export interface RoleInsert extends Omit<RoleRow, 'id' | 'created_at' | 'updated_at'> {}
export interface RoleUpdate extends Partial<RoleInsert> {}

// Permission types
export interface PermissionRow extends BaseRow {
  name: string
  description: string | null
  resource: string
  action: string
}

export interface PermissionInsert extends Omit<PermissionRow, 'id' | 'created_at' | 'updated_at'> {}
export interface PermissionUpdate extends Partial<PermissionInsert> {}

// Role Permission types
export interface RolePermissionRow {
  role_id: string
  permission_id: string
  created_at: string
}

// Invitation types
export interface InvitationRow extends BaseRow {
  email: string
  organization_id: string
  role_id: string
  invited_by: string
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: string
}

export interface InvitationInsert extends Omit<InvitationRow, 'id' | 'created_at' | 'updated_at'> {}
export interface InvitationUpdate extends Partial<InvitationInsert> {}

// Audit Log types
export interface AuditLogRow extends BaseRow {
  user_id: string | null
  organization_id: string | null
  action: string
  resource: string
  resource_id: string | null
  details: Record<string, any>
  ip_address: string | null
  user_agent: string | null
}

export interface AuditLogInsert extends Omit<AuditLogRow, 'id' | 'created_at' | 'updated_at'> {}

// Application-level types (transformed from database rows)
export interface User {
  id: string
  clerkUserId: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  preferences: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  avatarUrl: string | null
  metadata: Record<string, any>
  settings: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Membership {
  id: string
  userId: string
  organizationId: string
  roleId: string
  status: 'active' | 'inactive' | 'pending'
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface Role {
  id: string
  name: string
  description: string | null
  organizationId: string | null
  isSystemRole: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Permission {
  id: string
  name: string
  description: string | null
  resource: string
  action: string
  createdAt: Date
  updatedAt: Date
}

export interface Invitation {
  id: string
  email: string
  organizationId: string
  roleId: string
  invitedBy: string
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  userId: string | null
  organizationId: string | null
  action: string
  resource: string
  resourceId: string | null
  details: Record<string, any>
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  updatedAt: Date
}

// Re-export transformers
export {
  transformUserToRow,
  transformOrganizationToRow,
  transformMembershipToRow,
  transformRoleToRow,
  transformPermissionToRow,
  transformInvitationToRow,
  transformAuditLogToRow
} from './transformers'