/**
 * Repository Interface Definitions
 * 
 * This file defines specific repository interfaces for all entities,
 * extending the base repository interface with entity-specific operations.
 */

import { BaseRepositoryInterface, FilterCondition, QueryOptions, RepositoryResult } from './base-repository'
import { 
  User, NewUser, UserUpdate, UserWithMemberships,
  Organization, NewOrganization, OrganizationUpdate, OrganizationWithMembers,
  OrganizationMembership, NewOrganizationMembership, OrganizationMembershipUpdate, MembershipWithRelations,
  Role, NewRole, RoleUpdate, RoleWithOrganization,
  Permission, NewPermission, PermissionUpdate
} from '@/lib/db/schema'

/**
 * User Repository Interface
 * Extends base repository with user-specific operations
 */
export interface UserRepositoryInterface extends BaseRepositoryInterface<User, NewUser, UserUpdate> {
  // User-specific queries
  findByClerkId(clerkUserId: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findWithMemberships(id: string): Promise<UserWithMemberships | null>
  findByOrganization(organizationId: string, options?: QueryOptions): Promise<RepositoryResult<User>>
  
  // User search and filtering
  searchUsers(query: string, options?: QueryOptions): Promise<RepositoryResult<User>>
  findActiveUsers(options?: QueryOptions): Promise<RepositoryResult<User>>
  findRecentUsers(days: number, options?: QueryOptions): Promise<RepositoryResult<User>>
  
  // User preferences and settings
  updatePreferences(id: string, preferences: Record<string, unknown>): Promise<User>
  getPreferences(id: string): Promise<Record<string, unknown>>
  
  // User statistics
  getUserStats(id: string): Promise<{
    membershipCount: number
    organizationsOwned: number
    lastLoginAt: Date | null
    createdAt: Date
  }>
}

/**
 * Organization Repository Interface
 * Extends base repository with organization-specific operations
 */
export interface OrganizationRepositoryInterface extends BaseRepositoryInterface<Organization, NewOrganization, OrganizationUpdate> {
  // Organization-specific queries
  findBySlug(slug: string): Promise<Organization | null>
  findWithMembers(id: string): Promise<OrganizationWithMembers | null>
  findByOwner(userId: string, options?: QueryOptions): Promise<RepositoryResult<Organization>>
  findByMember(userId: string, options?: QueryOptions): Promise<RepositoryResult<Organization>>
  
  // Organization search and filtering
  searchOrganizations(query: string, options?: QueryOptions): Promise<RepositoryResult<Organization>>
  findActiveOrganizations(options?: QueryOptions): Promise<RepositoryResult<Organization>>
  
  // Organization settings
  updateSettings(id: string, settings: Record<string, unknown>): Promise<Organization>
  getSettings(id: string): Promise<Record<string, unknown>>
  updateMetadata(id: string, metadata: Record<string, unknown>): Promise<Organization>
  
  // Organization statistics
  getOrganizationStats(id: string): Promise<{
    memberCount: number
    activeMembers: number
    pendingInvitations: number
    rolesCount: number
    createdAt: Date
  }>
  
  // Slug management
  isSlugAvailable(slug: string, excludeId?: string): Promise<boolean>
  generateUniqueSlug(baseName: string): Promise<string>
}

/**
 * Organization Membership Repository Interface
 * Extends base repository with membership-specific operations
 */
export interface OrganizationMembershipRepositoryInterface extends BaseRepositoryInterface<OrganizationMembership, NewOrganizationMembership, OrganizationMembershipUpdate> {
  // Membership-specific queries
  findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMembership | null>
  findWithRelations(id: string): Promise<MembershipWithRelations | null>
  findByUser(userId: string, options?: QueryOptions): Promise<RepositoryResult<OrganizationMembership>>
  findByOrganization(organizationId: string, options?: QueryOptions): Promise<RepositoryResult<OrganizationMembership>>
  findByRole(roleId: string, options?: QueryOptions): Promise<RepositoryResult<OrganizationMembership>>
  
  // Membership status management
  findActiveMemberships(organizationId: string): Promise<OrganizationMembership[]>
  findPendingMemberships(organizationId: string): Promise<OrganizationMembership[]>
  updateStatus(id: string, status: 'active' | 'inactive' | 'pending'): Promise<OrganizationMembership>
  
  // Role management
  updateRole(id: string, roleId: string): Promise<OrganizationMembership>
  findByRoleInOrganization(organizationId: string, roleId: string): Promise<OrganizationMembership[]>
  
  // Membership validation
  canUserJoinOrganization(userId: string, organizationId: string): Promise<boolean>
  getMembershipCount(organizationId: string): Promise<number>
  getUserMembershipCount(userId: string): Promise<number>
  
  // Bulk operations
  createMemberships(memberships: NewOrganizationMembership[]): Promise<OrganizationMembership[]>
  removeMembersByRole(organizationId: string, roleId: string): Promise<number>
}

/**
 * Role Repository Interface
 * Extends base repository with role-specific operations
 */
export interface RoleRepositoryInterface extends BaseRepositoryInterface<Role, NewRole, RoleUpdate> {
  // Role-specific queries
  findByName(organizationId: string, name: string): Promise<Role | null>
  findWithOrganization(id: string): Promise<RoleWithOrganization | null>
  findByOrganization(organizationId: string, options?: QueryOptions): Promise<RepositoryResult<Role>>
  findSystemRoles(options?: QueryOptions): Promise<RepositoryResult<Role>>
  findCustomRoles(organizationId: string, options?: QueryOptions): Promise<RepositoryResult<Role>>
  
  // Permission management
  updatePermissions(id: string, permissions: string[]): Promise<Role>
  addPermission(id: string, permission: string): Promise<Role>
  removePermission(id: string, permission: string): Promise<Role>
  hasPermission(id: string, permission: string): Promise<boolean>
  
  // Role validation
  isRoleNameAvailable(organizationId: string, name: string, excludeId?: string): Promise<boolean>
  canDeleteRole(id: string): Promise<boolean>
  
  // Default roles
  createDefaultRoles(organizationId: string): Promise<Role[]>
  getDefaultRole(organizationId: string, roleName: string): Promise<Role | null>
  
  // Role statistics
  getRoleStats(id: string): Promise<{
    memberCount: number
    permissionCount: number
    isSystemRole: boolean
    createdAt: Date
  }>
}

/**
 * Permission Repository Interface
 * Extends base repository with permission-specific operations
 */
export interface PermissionRepositoryInterface extends BaseRepositoryInterface<Permission, NewPermission, PermissionUpdate> {
  // Permission-specific queries
  findByName(name: string): Promise<Permission | null>
  findByResource(resource: string, options?: QueryOptions): Promise<RepositoryResult<Permission>>
  findByAction(action: string, options?: QueryOptions): Promise<RepositoryResult<Permission>>
  findByResourceAndAction(resource: string, action: string): Promise<Permission | null>
  
  // Permission validation
  isPermissionNameAvailable(name: string, excludeId?: string): Promise<boolean>
  validatePermissionFormat(name: string): boolean
  
  // Permission utilities
  createStandardPermissions(): Promise<Permission[]>
  getPermissionsByPattern(pattern: string): Promise<Permission[]>
  
  // Permission statistics
  getPermissionUsage(id: string): Promise<{
    rolesCount: number
    usersCount: number
    organizationsCount: number
  }>
}

/**
 * Composite repository interfaces for complex operations
 */

/**
 * User Management Repository Interface
 * Combines user, membership, and role operations
 */
export interface UserManagementRepositoryInterface {
  // User operations
  createUserWithMembership(
    userData: NewUser,
    organizationId: string,
    roleId: string
  ): Promise<{
    user: User
    membership: OrganizationMembership
  }>
  
  // Membership operations
  addUserToOrganization(
    userId: string,
    organizationId: string,
    roleId: string
  ): Promise<OrganizationMembership>
  
  removeUserFromOrganization(
    userId: string,
    organizationId: string
  ): Promise<void>
  
  changeUserRole(
    userId: string,
    organizationId: string,
    newRoleId: string
  ): Promise<OrganizationMembership>
  
  // Bulk operations
  transferUsersToRole(
    userIds: string[],
    organizationId: string,
    newRoleId: string
  ): Promise<OrganizationMembership[]>
}

/**
 * Organization Management Repository Interface
 * Combines organization, membership, and role operations
 */
export interface OrganizationManagementRepositoryInterface {
  // Organization setup
  createOrganizationWithOwner(
    organizationData: NewOrganization,
    ownerId: string
  ): Promise<{
    organization: Organization
    membership: OrganizationMembership
    roles: Role[]
  }>
  
  // Organization cleanup
  deleteOrganizationWithCleanup(organizationId: string): Promise<void>
  
  // Member management
  inviteUserToOrganization(
    organizationId: string,
    email: string,
    roleId: string,
    inviterId: string
  ): Promise<{
    invitation: any // Will be defined when invitation repository is implemented
    role: Role
  }>
  
  // Role management
  createRoleWithPermissions(
    organizationId: string,
    roleData: Omit<NewRole, 'organizationId'>,
    permissions: string[]
  ): Promise<Role>
  
  cloneRole(
    sourceRoleId: string,
    newName: string,
    organizationId?: string
  ): Promise<Role>
}

/**
 * Repository factory interface for dependency injection
 */
export interface RepositoryFactory {
  createUserRepository(): UserRepositoryInterface
  createOrganizationRepository(): OrganizationRepositoryInterface
  createOrganizationMembershipRepository(): OrganizationMembershipRepositoryInterface
  createRoleRepository(): RoleRepositoryInterface
  createPermissionRepository(): PermissionRepositoryInterface
  createUserManagementRepository(): UserManagementRepositoryInterface
  createOrganizationManagementRepository(): OrganizationManagementRepositoryInterface
}