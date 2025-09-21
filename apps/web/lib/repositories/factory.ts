/**
 * Repository Factory Implementation
 * 
 * This file implements the repository factory for dependency injection and
 * centralized repository management.
 */

import { DrizzleDatabase, getDatabase } from '@/lib/db/connection'
import { 
  RepositoryFactory,
  UserRepositoryInterface,
  OrganizationRepositoryInterface,
  OrganizationMembershipRepositoryInterface,
  RoleRepositoryInterface,
  PermissionRepositoryInterface,
  UserManagementRepositoryInterface,
  OrganizationManagementRepositoryInterface
} from './interfaces'
import { UserRepository } from './user-repository'
import { OrganizationRepository } from './organization-repository'
import { OrganizationMembershipRepository } from './organization-membership-repository'
import { RoleRepository } from './role-repository'
import { OptimizedUserRepository } from './optimized-user-repository'

/**
 * Default Repository Factory Implementation
 * Creates repository instances with shared database connection
 */
export class DefaultRepositoryFactory implements RepositoryFactory {
  private db: DrizzleDatabase
  
  // Repository instance cache
  private userRepository?: UserRepositoryInterface
  private organizationRepository?: OrganizationRepositoryInterface
  private organizationMembershipRepository?: OrganizationMembershipRepositoryInterface
  private roleRepository?: RoleRepositoryInterface
  private permissionRepository?: PermissionRepositoryInterface
  private userManagementRepository?: UserManagementRepositoryInterface
  private organizationManagementRepository?: OrganizationManagementRepositoryInterface

  constructor(db?: DrizzleDatabase) {
    this.db = db || getDatabase()
  }

  /**
   * Create or get cached UserRepository instance
   */
  createUserRepository(): UserRepositoryInterface {
    if (!this.userRepository) {
      // Use optimized repository with caching
      this.userRepository = new OptimizedUserRepository(this.db)
    }
    return this.userRepository
  }

  /**
   * Create or get cached OrganizationRepository instance
   */
  createOrganizationRepository(): OrganizationRepositoryInterface {
    if (!this.organizationRepository) {
      this.organizationRepository = new OrganizationRepository(this.db)
    }
    return this.organizationRepository
  }

  /**
   * Create or get cached OrganizationMembershipRepository instance
   */
  createOrganizationMembershipRepository(): OrganizationMembershipRepositoryInterface {
    if (!this.organizationMembershipRepository) {
      this.organizationMembershipRepository = new OrganizationMembershipRepository(this.db)
    }
    return this.organizationMembershipRepository
  }

  /**
   * Create or get cached RoleRepository instance
   */
  createRoleRepository(): RoleRepositoryInterface {
    if (!this.roleRepository) {
      this.roleRepository = new RoleRepository(this.db)
    }
    return this.roleRepository
  }

  /**
   * Create or get cached PermissionRepository instance
   * Note: PermissionRepository will be implemented when needed
   */
  createPermissionRepository(): PermissionRepositoryInterface {
    if (!this.permissionRepository) {
      // TODO: Implement PermissionRepository
      throw new Error('PermissionRepository not yet implemented')
    }
    return this.permissionRepository
  }

  /**
   * Create or get cached UserManagementRepository instance
   */
  createUserManagementRepository(): UserManagementRepositoryInterface {
    if (!this.userManagementRepository) {
      this.userManagementRepository = new UserManagementRepository(
        this.createUserRepository(),
        this.createOrganizationRepository(),
        this.createOrganizationMembershipRepository(),
        this.createRoleRepository()
      )
    }
    return this.userManagementRepository
  }

  /**
   * Create or get cached OrganizationManagementRepository instance
   */
  createOrganizationManagementRepository(): OrganizationManagementRepositoryInterface {
    if (!this.organizationManagementRepository) {
      this.organizationManagementRepository = new OrganizationManagementRepository(
        this.createOrganizationRepository(),
        this.createOrganizationMembershipRepository(),
        this.createRoleRepository(),
        this.createUserRepository()
      )
    }
    return this.organizationManagementRepository
  }

  /**
   * Clear repository cache (useful for testing)
   */
  clearCache(): void {
    this.userRepository = undefined
    this.organizationRepository = undefined
    this.organizationMembershipRepository = undefined
    this.roleRepository = undefined
    this.permissionRepository = undefined
    this.userManagementRepository = undefined
    this.organizationManagementRepository = undefined
  }
}

/**
 * User Management Repository Implementation
 * Combines user, membership, and role operations
 */
export class UserManagementRepository implements UserManagementRepositoryInterface {
  constructor(
    private userRepository: UserRepositoryInterface,
    private organizationRepository: OrganizationRepositoryInterface,
    private membershipRepository: OrganizationMembershipRepositoryInterface,
    private roleRepository: RoleRepositoryInterface
  ) {}

  /**
   * Create user with membership in organization
   */
  async createUserWithMembership(
    userData: Parameters<UserRepositoryInterface['create']>[0],
    organizationId: string,
    roleId: string
  ): Promise<{
    user: Awaited<ReturnType<UserRepositoryInterface['create']>>
    membership: Awaited<ReturnType<OrganizationMembershipRepositoryInterface['create']>>
  }> {
    return await this.userRepository.withTransaction(async (ctx) => {
      // Create user
      const user = await this.userRepository.create(userData)
      
      // Create membership
      const membership = await this.membershipRepository.create({
        userId: user.id,
        organizationId,
        roleId,
        status: 'active'
      })

      return { user, membership }
    })
  }

  /**
   * Add user to organization
   */
  async addUserToOrganization(
    userId: string,
    organizationId: string,
    roleId: string
  ): Promise<Awaited<ReturnType<OrganizationMembershipRepositoryInterface['create']>>> {
    return await this.membershipRepository.create({
      userId,
      organizationId,
      roleId,
      status: 'active'
    })
  }

  /**
   * Remove user from organization
   */
  async removeUserFromOrganization(userId: string, organizationId: string): Promise<void> {
    const membership = await this.membershipRepository.findByUserAndOrganization(userId, organizationId)
    if (membership) {
      await this.membershipRepository.delete(membership.id)
    }
  }

  /**
   * Change user role in organization
   */
  async changeUserRole(
    userId: string,
    organizationId: string,
    newRoleId: string
  ): Promise<Awaited<ReturnType<OrganizationMembershipRepositoryInterface['updateRole']>>> {
    const membership = await this.membershipRepository.findByUserAndOrganization(userId, organizationId)
    if (!membership) {
      throw new Error('User membership not found in organization')
    }

    return await this.membershipRepository.updateRole(membership.id, newRoleId)
  }

  /**
   * Transfer multiple users to new role
   */
  async transferUsersToRole(
    userIds: string[],
    organizationId: string,
    newRoleId: string
  ): Promise<Awaited<ReturnType<OrganizationMembershipRepositoryInterface['create']>>[]> {
    const results = []
    
    for (const userId of userIds) {
      const membership = await this.membershipRepository.findByUserAndOrganization(userId, organizationId)
      if (membership) {
        const updated = await this.membershipRepository.updateRole(membership.id, newRoleId)
        results.push(updated)
      }
    }

    return results
  }
}

/**
 * Organization Management Repository Implementation
 * Combines organization, membership, and role operations
 */
export class OrganizationManagementRepository implements OrganizationManagementRepositoryInterface {
  constructor(
    private organizationRepository: OrganizationRepositoryInterface,
    private membershipRepository: OrganizationMembershipRepositoryInterface,
    private roleRepository: RoleRepositoryInterface,
    private userRepository: UserRepositoryInterface
  ) {}

  /**
   * Create organization with owner
   */
  async createOrganizationWithOwner(
    organizationData: Parameters<OrganizationRepositoryInterface['create']>[0],
    ownerId: string
  ): Promise<{
    organization: Awaited<ReturnType<OrganizationRepositoryInterface['create']>>
    membership: Awaited<ReturnType<OrganizationMembershipRepositoryInterface['create']>>
    roles: Awaited<ReturnType<RoleRepositoryInterface['createDefaultRoles']>>
  }> {
    return await this.organizationRepository.withTransaction(async (ctx) => {
      // Create organization
      const organization = await this.organizationRepository.create(organizationData)
      
      // Create default roles
      const roles = await this.roleRepository.createDefaultRoles(organization.id)
      
      // Find admin role
      const adminRole = roles.find(role => role.name.includes('admin'))
      if (!adminRole) {
        throw new Error('Admin role not created')
      }
      
      // Create owner membership
      const membership = await this.membershipRepository.create({
        userId: ownerId,
        organizationId: organization.id,
        roleId: adminRole.id,
        status: 'active'
      })

      return { organization, membership, roles }
    })
  }

  /**
   * Delete organization with cleanup
   */
  async deleteOrganizationWithCleanup(organizationId: string): Promise<void> {
    return await this.organizationRepository.withTransaction(async (ctx) => {
      // Delete all memberships
      await this.membershipRepository.deleteMany([
        { field: 'organizationId', operator: 'eq', value: organizationId }
      ])
      
      // Delete all roles
      const roles = await this.roleRepository.findByOrganization(organizationId)
      for (const role of roles.data) {
        await this.roleRepository.delete(role.id)
      }
      
      // Delete organization
      await this.organizationRepository.delete(organizationId)
    })
  }

  /**
   * Invite user to organization
   * Note: This is a placeholder - actual invitation logic would involve invitation repository
   */
  async inviteUserToOrganization(
    organizationId: string,
    email: string,
    roleId: string,
    inviterId: string
  ): Promise<{
    invitation: any // Will be properly typed when invitation repository is implemented
    role: Awaited<ReturnType<RoleRepositoryInterface['findById']>>
  }> {
    const role = await this.roleRepository.findById(roleId)
    if (!role) {
      throw new Error('Role not found')
    }

    // TODO: Create invitation record
    const invitation = {
      id: 'placeholder',
      email,
      organizationId,
      roleId,
      inviterId,
      status: 'pending'
    }

    return { invitation, role }
  }

  /**
   * Create role with permissions
   */
  async createRoleWithPermissions(
    organizationId: string,
    roleData: Omit<Parameters<RoleRepositoryInterface['create']>[0], 'organizationId'>,
    permissions: string[]
  ): Promise<Awaited<ReturnType<RoleRepositoryInterface['create']>>> {
    const fullRoleData = {
      ...roleData,
      organizationId,
      permissions
    } as Parameters<RoleRepositoryInterface['create']>[0]

    return await this.roleRepository.create(fullRoleData)
  }

  /**
   * Clone role
   */
  async cloneRole(
    sourceRoleId: string,
    newName: string,
    organizationId?: string
  ): Promise<Awaited<ReturnType<RoleRepositoryInterface['cloneRole']>>> {
    return await this.roleRepository.cloneRole(sourceRoleId, newName, organizationId)
  }
}

/**
 * Global repository factory instance
 */
let globalRepositoryFactory: RepositoryFactory | undefined

/**
 * Get or create global repository factory
 */
export function getRepositoryFactory(): RepositoryFactory {
  if (!globalRepositoryFactory) {
    globalRepositoryFactory = new DefaultRepositoryFactory()
  }
  return globalRepositoryFactory
}

/**
 * Set global repository factory (useful for testing)
 */
export function setRepositoryFactory(factory: RepositoryFactory): void {
  globalRepositoryFactory = factory
}

/**
 * Clear global repository factory (useful for testing)
 */
export function clearRepositoryFactory(): void {
  globalRepositoryFactory = undefined
}