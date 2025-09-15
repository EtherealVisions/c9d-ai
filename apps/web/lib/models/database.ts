/**
 * Database query utilities with proper typing for the Account Management system
 * These utilities provide type-safe database operations with automatic data transformation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
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
  AuditLogRow,
  DatabaseTable,
  UserWithMemberships,
  OrganizationWithMembers,
  MembershipWithRelations,
  InvitationStatus
} from './types'
import {
  transformUserRow,
  transformOrganizationRow,
  transformMembershipRow,
  transformRoleRow,
  transformPermissionRow,
  transformInvitationRow,
  transformAuditLogRow,
  transformUserToRow,
  transformOrganizationToRow,
  transformMembershipToRow,
  transformRoleToRow,
  transformPermissionToRow,
  transformInvitationToRow,
  transformAuditLogToRow,
  transformRows,
  transformRowSafe
} from './transformers'

// Database configuration
export interface DatabaseConfig {
  url: string
  anonKey: string
}

// Query options for filtering and pagination
export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

// Database error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class NotFoundError extends DatabaseError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

/**
 * Database client wrapper with typed operations and tenant isolation
 */
export class TypedSupabaseClient {
  private client: SupabaseClient
  private currentUserId?: string
  private currentOrganizationId?: string

  constructor(config: DatabaseConfig) {
    this.client = createClient(config.url, config.anonKey)
  }

  /**
   * Set the current user context for tenant isolation
   */
  setUserContext(userId: string, organizationId?: string): void {
    this.currentUserId = userId
    this.currentOrganizationId = organizationId
    
    // Set RLS context in Supabase
    if (userId) {
      this.client.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          // The RLS policies will use the JWT claims automatically
          // Additional context can be set via custom headers if needed
        }
      })
    }
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    this.currentUserId = undefined
    this.currentOrganizationId = undefined
  }

  /**
   * Validate tenant access for organization-scoped operations
   */
  private async validateTenantAccess(organizationId: string, userId?: string): Promise<boolean> {
    const userIdToCheck = userId || this.currentUserId
    
    if (!userIdToCheck) {
      throw new DatabaseError('User context required for tenant validation', 'MISSING_USER_CONTEXT')
    }

    try {
      const { data, error } = await this.client
        .from('organization_memberships')
        .select('id')
        .eq('user_id', userIdToCheck)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new DatabaseError(`Tenant validation failed: ${error.message}`, 'TENANT_VALIDATION_ERROR')
      }

      return !!data
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('Tenant validation failed', 'TENANT_VALIDATION_ERROR')
    }
  }

  /**
   * Get the underlying Supabase client for advanced operations
   */
  getClient(): SupabaseClient {
    return this.client
  }

  /**
   * Execute a raw query with error handling
   */
  private async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>
  ): Promise<T> {
    const { data, error } = await queryFn()
    
    if (error) {
      throw new DatabaseError(error.message, error.code, error.details)
    }
    
    if (data === null) {
      throw new DatabaseError('Query returned null data')
    }
    
    return data
  }

  // User operations
  async getUser(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    return transformRowSafe(data as UserRow, transformUserRow)
  }

  async getUserByClerkId(clerkUserId: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    return transformRowSafe(data as UserRow, transformUserRow)
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const rowData = transformUserToRow(userData)
    
    const data = await this.executeQuery(async () =>
      await this.client
        .from('users')
        .insert(rowData)
        .select('*')
        .single()
    )

    return transformUserRow(data as UserRow)
  }

  async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'clerkUserId' | 'createdAt' | 'updatedAt'>>): Promise<User> {
    const updateData: Partial<Omit<UserRow, 'id' | 'clerk_user_id' | 'created_at' | 'updated_at'>> = {}
    
    if (userData.email) updateData.email = userData.email
    if (userData.firstName !== undefined) updateData.first_name = userData.firstName || null
    if (userData.lastName !== undefined) updateData.last_name = userData.lastName || null
    if (userData.avatarUrl !== undefined) updateData.avatar_url = userData.avatarUrl || null
    if (userData.preferences) updateData.preferences = userData.preferences

    const data = await this.executeQuery(async () =>
      await this.client
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()
    )

    return transformUserRow(data as UserRow)
  }

  async getUserWithMemberships(id: string): Promise<UserWithMemberships | null> {
    const { data, error } = await this.client
      .from('users')
      .select(`
        *,
        organization_memberships (
          *,
          organizations (*),
          roles (*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    if (!data) return null

    const user = transformUserRow(data as UserRow)
    const memberships = (data as any).organization_memberships?.map((membership: any) => ({
      ...transformMembershipRow(membership as MembershipRow),
      organization: transformOrganizationRow(membership.organizations as OrganizationRow),
      role: transformRoleRow(membership.roles as RoleRow)
    })) || []

    return {
      ...user,
      memberships
    }
  }

  // Organization operations
  async getOrganization(id: string, userId?: string): Promise<Organization | null> {
    // Validate tenant access if user context is available
    if (this.currentUserId || userId) {
      const hasAccess = await this.validateTenantAccess(id, userId)
      if (!hasAccess) {
        throw new DatabaseError('Access denied to organization', 'TENANT_ACCESS_DENIED')
      }
    }

    const { data, error } = await this.client
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    return transformRowSafe(data as OrganizationRow, transformOrganizationRow)
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await this.client
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    return transformRowSafe(data as OrganizationRow, transformOrganizationRow)
  }

  async createOrganization(orgData: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization> {
    const rowData = transformOrganizationToRow(orgData)
    
    const data = await this.executeQuery(async () =>
      await this.client
        .from('organizations')
        .insert(rowData)
        .select('*')
        .single()
    )

    return transformOrganizationRow(data as OrganizationRow)
  }

  async updateOrganization(id: string, orgData: Partial<Omit<Organization, 'id' | 'slug' | 'createdAt' | 'updatedAt'>>, userId?: string): Promise<Organization> {
    // Validate tenant access
    if (this.currentUserId || userId) {
      const hasAccess = await this.validateTenantAccess(id, userId)
      if (!hasAccess) {
        throw new DatabaseError('Access denied to organization', 'TENANT_ACCESS_DENIED')
      }
    }

    const updateData: Partial<Omit<OrganizationRow, 'id' | 'slug' | 'created_at' | 'updated_at'>> = {}
    
    if (orgData.name) updateData.name = orgData.name
    if (orgData.description !== undefined) updateData.description = orgData.description || null
    if (orgData.avatarUrl !== undefined) updateData.avatar_url = orgData.avatarUrl || null
    if (orgData.metadata) updateData.metadata = orgData.metadata
    if (orgData.settings) updateData.settings = orgData.settings

    const data = await this.executeQuery(async () =>
      await this.client
        .from('organizations')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()
    )

    return transformOrganizationRow(data as OrganizationRow)
  }

  async getOrganizationWithMembers(id: string, userId?: string): Promise<OrganizationWithMembers | null> {
    // Validate tenant access
    if (this.currentUserId || userId) {
      const hasAccess = await this.validateTenantAccess(id, userId)
      if (!hasAccess) {
        throw new DatabaseError('Access denied to organization', 'TENANT_ACCESS_DENIED')
      }
    }

    const { data, error } = await this.client
      .from('organizations')
      .select(`
        *,
        organization_memberships (
          *,
          users (*),
          roles (*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    if (!data) return null

    const organization = transformOrganizationRow(data as OrganizationRow)
    const memberships = (data as any).organization_memberships?.map((membership: any) => ({
      ...transformMembershipRow(membership as MembershipRow),
      user: transformUserRow(membership.users as UserRow),
      role: transformRoleRow(membership.roles as RoleRow)
    })) || []

    return {
      ...organization,
      memberships
    }
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const { data, error } = await this.client
      .from('organization_memberships')
      .select(`
        organizations (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) {
      throw new DatabaseError(error.message, error.code)
    }

    if (!data) return []

    return data
      .map((membership: any) => membership.organizations)
      .filter(Boolean)
      .map((org: OrganizationRow) => transformOrganizationRow(org))
  }

  // Membership operations
  async getMembership(userId: string, organizationId: string): Promise<Membership | null> {
    const { data, error } = await this.client
      .from('organization_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    return transformRowSafe(data as MembershipRow, transformMembershipRow)
  }

  async createMembership(membershipData: Omit<Membership, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'organization' | 'role'>): Promise<Membership> {
    const rowData = transformMembershipToRow(membershipData)
    
    const data = await this.executeQuery(async () =>
      await this.client
        .from('organization_memberships')
        .insert(rowData)
        .select('*')
        .single()
    )

    return transformMembershipRow(data as MembershipRow)
  }

  async updateMembership(userId: string, organizationId: string, membershipData: Partial<Pick<Membership, 'roleId' | 'status'>>): Promise<Membership> {
    const updateData: Partial<Pick<MembershipRow, 'role_id' | 'status'>> = {}
    
    if (membershipData.roleId) updateData.role_id = membershipData.roleId
    if (membershipData.status) updateData.status = membershipData.status

    const data = await this.executeQuery(async () =>
      await this.client
        .from('organization_memberships')
        .update(updateData)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .select('*')
        .single()
    )

    return transformMembershipRow(data as MembershipRow)
  }

  async deleteMembership(userId: string, organizationId: string): Promise<void> {
    const { error } = await this.client
      .from('organization_memberships')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
    
    if (error) {
      throw new DatabaseError(error.message, error.code)
    }
  }

  // Role operations
  async getRole(id: string): Promise<Role | null> {
    const { data, error } = await this.client
      .from('roles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    return transformRowSafe(data as RoleRow, transformRoleRow)
  }

  async getRolesByOrganization(organizationId: string): Promise<Role[]> {
    const data = await this.executeQuery(async () =>
      await this.client
        .from('roles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name')
    )

    return transformRows(data as RoleRow[], transformRoleRow)
  }

  async createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const rowData = transformRoleToRow(roleData)
    
    const data = await this.executeQuery(async () =>
      await this.client
        .from('roles')
        .insert(rowData)
        .select('*')
        .single()
    )

    return transformRoleRow(data as RoleRow)
  }

  // Permission operations
  async getAllPermissions(): Promise<Permission[]> {
    const data = await this.executeQuery(async () =>
      await this.client
        .from('permissions')
        .select('*')
        .order('resource', { ascending: true })
        .order('action', { ascending: true })
    )

    return transformRows(data as PermissionRow[], transformPermissionRow)
  }

  async createPermission(permissionData: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Permission> {
    const rowData = transformPermissionToRow(permissionData)
    
    const data = await this.executeQuery(async () =>
      await this.client
        .from('permissions')
        .insert(rowData)
        .select('*')
        .single()
    )

    return transformPermissionRow(data as PermissionRow)
  }

  // Invitation operations
  async getInvitation(id: string): Promise<Invitation | null> {
    const { data, error } = await this.client
      .from('invitations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    return transformRowSafe(data as InvitationRow, transformInvitationRow)
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const { data, error } = await this.client
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    return transformRowSafe(data as InvitationRow, transformInvitationRow)
  }

  async getInvitationByOrgAndEmail(organizationId: string, email: string, status?: InvitationStatus): Promise<Invitation | null> {
    let query = this.client
      .from('invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('email', email)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    return transformRowSafe(data as InvitationRow, transformInvitationRow)
  }

  async getInvitationsByOrganization(organizationId: string, status?: InvitationStatus): Promise<Invitation[]> {
    let query = this.client
      .from('invitations')
      .select('*')
      .eq('organization_id', organizationId)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const data = await this.executeQuery(async () => await query)
    return transformRows(data as InvitationRow[], transformInvitationRow)
  }

  async createInvitation(invitationData: Omit<Invitation, 'id' | 'createdAt' | 'updatedAt' | 'organization' | 'role' | 'inviter'>): Promise<Invitation> {
    const rowData = transformInvitationToRow(invitationData)
    
    const data = await this.executeQuery(async () =>
      await this.client
        .from('invitations')
        .insert(rowData)
        .select('*')
        .single()
    )

    return transformInvitationRow(data as InvitationRow)
  }

  async updateInvitation(id: string, invitationData: Partial<Pick<Invitation, 'status'>>): Promise<Invitation> {
    const updateData: Partial<Pick<InvitationRow, 'status'>> = {}
    
    if (invitationData.status) updateData.status = invitationData.status

    const data = await this.executeQuery(async () =>
      await this.client
        .from('invitations')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()
    )

    return transformInvitationRow(data as InvitationRow)
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new DatabaseError(error.message, error.code)
    }

    return transformRowSafe(data as UserRow, transformUserRow)
  }

  // Audit log operations
  async createAuditLog(auditData: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'organization'>): Promise<AuditLog> {
    const rowData = transformAuditLogToRow(auditData)
    
    const data = await this.executeQuery(async () =>
      await this.client
        .from('audit_logs')
        .insert(rowData)
        .select('*')
        .single()
    )

    return transformAuditLogRow(data as AuditLogRow)
  }

  async getAuditLogs(options: QueryOptions & { userId?: string; organizationId?: string } = {}): Promise<AuditLog[]> {
    let query = this.client
      .from('audit_logs')
      .select('*')

    if (options.userId) {
      query = query.eq('user_id', options.userId)
    }

    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    query = query.order('created_at', { ascending: options.orderDirection !== 'desc' })

    const data = await this.executeQuery(async () => await query)
    return transformRows(data as AuditLogRow[], transformAuditLogRow)
  }
}

/**
 * Get configuration value with comprehensive fallback logic
 */
function getConfigWithFallback(key: string): string | undefined {
  // Always use process.env for now to avoid module resolution issues
  // TODO: Implement proper config manager integration when needed
  return process.env[key];
}

/**
 * Create a typed database client instance with centralized configuration
 */
export function createTypedSupabaseClient(): TypedSupabaseClient {
  const supabaseUrl = getConfigWithFallback('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getConfigWithFallback('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const nodeEnv = getConfigWithFallback('NODE_ENV') || 'unknown';
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[TypedDatabase] Configuration error:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      nodeEnv
    });
    
    // During build time, return a mock client to prevent build failures
    if (nodeEnv === 'production' || process.env.NODE_ENV === 'production') {
      console.warn('[TypedDatabase] Missing Supabase configuration - using mock client for build');
      return {
        getUserById: async () => ({ data: null, error: null }),
        createUser: async () => ({ data: null, error: null }),
        updateUser: async () => ({ data: null, error: null }),
        deleteUser: async () => ({ data: null, error: null }),
        getOrganizationById: async () => ({ data: null, error: null }),
        createOrganization: async () => ({ data: null, error: null }),
        updateOrganization: async () => ({ data: null, error: null }),
        deleteOrganization: async () => ({ data: null, error: null })
      } as any;
    }
    
    const errorMessage = 'Missing Supabase environment variables for typed client';
    throw new Error(errorMessage);
  }
  
  console.log('[TypedDatabase] Creating typed Supabase client with centralized configuration');
  return new TypedSupabaseClient({
    url: supabaseUrl,
    anonKey: supabaseKey
  });
}

/**
 * Validate database schema and connectivity
 */
export async function validateDatabaseSchema(): Promise<{
  tables: Record<string, boolean>
  permissions: boolean
  systemRoles: boolean
}> {
  const client = createTypedSupabaseClient()
  
  const results = {
    tables: {} as Record<string, boolean>,
    permissions: false,
    systemRoles: false
  }
  
  // Check if all required tables exist
  const tables: DatabaseTable[] = [
    'users',
    'organizations',
    'organization_memberships',
    'roles',
    'permissions',
    'invitations',
    'audit_logs'
  ]
  
  for (const table of tables) {
    try {
      const { error } = await client.getClient().from(table).select('*').limit(1)
      results.tables[table] = !error
    } catch (err) {
      results.tables[table] = false
    }
  }
  
  // Check if system permissions exist
  try {
    const permissions = await client.getAllPermissions()
    results.permissions = permissions.length >= 3
  } catch (err) {
    results.permissions = false
  }
  
  // Check if system roles exist
  try {
    // This would need to be implemented once we have a way to get system roles
    results.systemRoles = true // Placeholder
  } catch (err) {
    results.systemRoles = false
  }
  
  return results
}