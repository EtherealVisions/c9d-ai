/**
 * Core TypeScript interfaces for the Account Management & Organizational Modeling system
 * These interfaces define the shape of data entities used throughout the application
 */

// Base interface for all entities with timestamps
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// User entity representing individual platform users
export interface User extends BaseEntity {
  clerkUserId: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  preferences: Record<string, any>
}

// Organization entity representing tenant organizations
export interface Organization extends BaseEntity {
  name: string
  slug: string
  description?: string
  avatarUrl?: string
  metadata: Record<string, any>
  settings: Record<string, any>
}

// Membership entity linking users to organizations with roles
export interface Membership extends BaseEntity {
  userId: string
  organizationId: string
  roleId: string
  status: MembershipStatus
  joinedAt: Date
  // Optional populated relations
  user?: User
  organization?: Organization
  role?: Role
}

// Role entity defining permissions within organizations
export interface Role extends BaseEntity {
  name: string
  description?: string
  organizationId: string
  isSystemRole: boolean
  permissions: string[]
}

// Permission entity defining granular access controls
export interface Permission extends BaseEntity {
  name: string
  description?: string
  resource: string
  action: string
}

// Invitation entity for managing organization invites
export interface Invitation extends BaseEntity {
  organizationId: string
  email: string
  roleId: string
  invitedBy: string
  token: string
  status: InvitationStatus
  expiresAt: Date
  // Optional populated relations
  organization?: Organization
  role?: Role
  inviter?: User
}

// Audit log entity for tracking system activities
export interface AuditLog extends BaseEntity {
  userId?: string
  organizationId?: string
  action: string
  resourceType: string
  resourceId?: string
  metadata: Record<string, any>
  ipAddress?: string
  userAgent?: string
  // Optional populated relations
  user?: User
  organization?: Organization
}

// Enum types for status fields
export type MembershipStatus = 'active' | 'inactive' | 'pending'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

// Database table names as const for type safety
export const DATABASE_TABLES = [
  'users',
  'organizations',
  'organization_memberships',
  'roles',
  'permissions',
  'invitations',
  'audit_logs'
] as const

export type DatabaseTable = typeof DATABASE_TABLES[number]

// Raw database types (snake_case as stored in database)
export interface UserRow {
  id: string
  clerk_user_id: string
  email: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export interface OrganizationRow {
  id: string
  name: string
  slug: string
  description?: string
  avatar_url?: string
  metadata: Record<string, any>
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MembershipRow {
  id: string
  user_id: string
  organization_id: string
  role_id: string
  status: MembershipStatus
  joined_at: string
  created_at: string
  updated_at: string
}

export interface RoleRow {
  id: string
  name: string
  description?: string
  organization_id: string
  is_system_role: boolean
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface PermissionRow {
  id: string
  name: string
  description?: string
  resource: string
  action: string
  created_at: string
}

export interface InvitationRow {
  id: string
  organization_id: string
  email: string
  role_id: string
  invited_by: string
  token: string
  status: InvitationStatus
  expires_at: string
  created_at: string
  updated_at: string
}

export interface AuditLogRow {
  id: string
  user_id?: string
  organization_id?: string
  action: string
  resource_type: string
  resource_id?: string
  metadata: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Type for database query results with relations
export interface UserWithMemberships extends User {
  memberships: (Membership & {
    organization: Organization
    role: Role
  })[]
}

export interface OrganizationWithMembers extends Organization {
  memberships: (Membership & {
    user: User
    role: Role
  })[]
}

export interface MembershipWithRelations extends Membership {
  user: User
  organization: Organization
  role: Role
}