/**
 * Unit tests for data transformation utilities
 */

import { describe, it, expect } from 'vitest'
import {
  transformUserRow,
  transformUserToRow,
  transformOrganizationRow,
  transformOrganizationToRow,
  transformMembershipRow,
  transformMembershipToRow,
  transformRoleRow,
  transformRoleToRow,
  transformPermissionRow,
  transformPermissionToRow,
  transformInvitationRow,
  transformInvitationToRow,
  transformAuditLogRow,
  transformAuditLogToRow,
  transformRows,
  transformRowSafe
} from '../transformers'
import type {
  UserRow,
  OrganizationRow,
  MembershipRow,
  RoleRow,
  PermissionRow,
  InvitationRow,
  AuditLogRow
} from '../types'

describe('User Transformations', () => {
  const userRow: UserRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    clerk_user_id: 'user_123',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    avatar_url: 'https://example.com/avatar.jpg',
    preferences: { theme: 'dark' },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }

  it('should transform user row to User model', () => {
    const user = transformUserRow(userRow)
    
    expect(user).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      clerkUserId: 'user_123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      preferences: { theme: 'dark' },
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z')
    })
  })

  it('should handle null optional fields in user row', () => {
    const userRowWithNulls: UserRow = {
      ...userRow,
      first_name: null,
      last_name: null,
      avatar_url: null
    }
    
    const user = transformUserRow(userRowWithNulls)
    
    expect(user.firstName).toBeUndefined()
    expect(user.lastName).toBeUndefined()
    expect(user.avatarUrl).toBeUndefined()
  })

  it('should transform User model to row format', () => {
    const user = {
      clerkUserId: 'user_123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      preferences: { theme: 'dark' }
    }
    
    const row = transformUserToRow(user)
    
    expect(row).toEqual({
      clerk_user_id: 'user_123',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      avatar_url: 'https://example.com/avatar.jpg',
      preferences: { theme: 'dark' }
    })
  })

  it('should handle undefined optional fields when transforming to row', () => {
    const user = {
      clerkUserId: 'user_123',
      email: 'test@example.com',
      preferences: {}
    }
    
    const row = transformUserToRow(user)
    
    expect(row.first_name).toBeNull()
    expect(row.last_name).toBeNull()
    expect(row.avatar_url).toBeNull()
  })
})

describe('Organization Transformations', () => {
  const organizationRow: OrganizationRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Organization',
    slug: 'test-org',
    description: 'A test organization',
    avatar_url: 'https://example.com/logo.jpg',
    metadata: { industry: 'tech' },
    settings: { allowInvites: true },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }

  it('should transform organization row to Organization model', () => {
    const organization = transformOrganizationRow(organizationRow)
    
    expect(organization).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Organization',
      slug: 'test-org',
      description: 'A test organization',
      avatarUrl: 'https://example.com/logo.jpg',
      metadata: { industry: 'tech' },
      settings: { allowInvites: true },
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z')
    })
  })

  it('should handle null optional fields in organization row', () => {
    const orgRowWithNulls: OrganizationRow = {
      ...organizationRow,
      description: null,
      avatar_url: null
    }
    
    const organization = transformOrganizationRow(orgRowWithNulls)
    
    expect(organization.description).toBeUndefined()
    expect(organization.avatarUrl).toBeUndefined()
  })

  it('should transform Organization model to row format', () => {
    const organization = {
      name: 'Test Organization',
      slug: 'test-org',
      description: 'A test organization',
      avatarUrl: 'https://example.com/logo.jpg',
      metadata: { industry: 'tech' },
      settings: { allowInvites: true }
    }
    
    const row = transformOrganizationToRow(organization)
    
    expect(row).toEqual({
      name: 'Test Organization',
      slug: 'test-org',
      description: 'A test organization',
      avatar_url: 'https://example.com/logo.jpg',
      metadata: { industry: 'tech' },
      settings: { allowInvites: true }
    })
  })
})

describe('Membership Transformations', () => {
  const membershipRow: MembershipRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: '123e4567-e89b-12d3-a456-426614174001',
    organization_id: '123e4567-e89b-12d3-a456-426614174002',
    role_id: '123e4567-e89b-12d3-a456-426614174003',
    status: 'active',
    joined_at: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }

  it('should transform membership row to Membership model', () => {
    const membership = transformMembershipRow(membershipRow)
    
    expect(membership).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      roleId: '123e4567-e89b-12d3-a456-426614174003',
      status: 'active',
      joinedAt: new Date('2023-01-01T00:00:00Z'),
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z')
    })
  })

  it('should transform Membership model to row format', () => {
    const membership = {
      userId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      roleId: '123e4567-e89b-12d3-a456-426614174003',
      status: 'active' as const,
      joinedAt: new Date('2023-01-01T00:00:00Z')
    }
    
    const row = transformMembershipToRow(membership)
    
    expect(row).toEqual({
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      organization_id: '123e4567-e89b-12d3-a456-426614174002',
      role_id: '123e4567-e89b-12d3-a456-426614174003',
      status: 'active',
      joined_at: '2023-01-01T00:00:00.000Z'
    })
  })
})

describe('Role Transformations', () => {
  const roleRow: RoleRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Admin',
    description: 'Administrator role',
    organization_id: '123e4567-e89b-12d3-a456-426614174001',
    is_system_role: false,
    permissions: ['user.read', 'user.write'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }

  it('should transform role row to Role model', () => {
    const role = transformRoleRow(roleRow)
    
    expect(role).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Admin',
      description: 'Administrator role',
      organizationId: '123e4567-e89b-12d3-a456-426614174001',
      isSystemRole: false,
      permissions: ['user.read', 'user.write'],
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z')
    })
  })

  it('should handle null description in role row', () => {
    const roleRowWithNull: RoleRow = {
      ...roleRow,
      description: null
    }
    
    const role = transformRoleRow(roleRowWithNull)
    
    expect(role.description).toBeUndefined()
  })

  it('should transform Role model to row format', () => {
    const role = {
      name: 'Editor',
      description: 'Content editor role',
      organizationId: '123e4567-e89b-12d3-a456-426614174001',
      isSystemRole: false,
      permissions: ['content.read', 'content.write']
    }
    
    const row = transformRoleToRow(role)
    
    expect(row).toEqual({
      name: 'Editor',
      description: 'Content editor role',
      organization_id: '123e4567-e89b-12d3-a456-426614174001',
      is_system_role: false,
      permissions: ['content.read', 'content.write']
    })
  })
})

describe('Permission Transformations', () => {
  const permissionRow: PermissionRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'user.read',
    description: 'Read user information',
    resource: 'user',
    action: 'read',
    created_at: '2023-01-01T00:00:00Z'
  }

  it('should transform permission row to Permission model', () => {
    const permission = transformPermissionRow(permissionRow)
    
    expect(permission).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'user.read',
      description: 'Read user information',
      resource: 'user',
      action: 'read',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z')
    })
  })

  it('should handle null description in permission row', () => {
    const permissionRowWithNull: PermissionRow = {
      ...permissionRow,
      description: null
    }
    
    const permission = transformPermissionRow(permissionRowWithNull)
    
    expect(permission.description).toBeUndefined()
  })

  it('should transform Permission model to row format', () => {
    const permission = {
      name: 'organization.delete',
      description: 'Delete organization',
      resource: 'organization',
      action: 'delete'
    }
    
    const row = transformPermissionToRow(permission)
    
    expect(row).toEqual({
      name: 'organization.delete',
      description: 'Delete organization',
      resource: 'organization',
      action: 'delete'
    })
  })
})

describe('Invitation Transformations', () => {
  const invitationRow: InvitationRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    organization_id: '123e4567-e89b-12d3-a456-426614174001',
    email: 'invite@example.com',
    role_id: '123e4567-e89b-12d3-a456-426614174002',
    invited_by: '123e4567-e89b-12d3-a456-426614174003',
    token: 'invitation-token-123',
    status: 'pending',
    expires_at: '2023-01-08T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }

  it('should transform invitation row to Invitation model', () => {
    const invitation = transformInvitationRow(invitationRow)
    
    expect(invitation).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      organizationId: '123e4567-e89b-12d3-a456-426614174001',
      email: 'invite@example.com',
      roleId: '123e4567-e89b-12d3-a456-426614174002',
      invitedBy: '123e4567-e89b-12d3-a456-426614174003',
      token: 'invitation-token-123',
      status: 'pending',
      expiresAt: new Date('2023-01-08T00:00:00Z'),
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z')
    })
  })

  it('should transform Invitation model to row format', () => {
    const invitation = {
      organizationId: '123e4567-e89b-12d3-a456-426614174001',
      email: 'newuser@example.com',
      roleId: '123e4567-e89b-12d3-a456-426614174002',
      invitedBy: '123e4567-e89b-12d3-a456-426614174003',
      token: 'new-invitation-token',
      status: 'pending' as const,
      expiresAt: new Date('2023-01-08T00:00:00Z')
    }
    
    const row = transformInvitationToRow(invitation)
    
    expect(row).toEqual({
      organization_id: '123e4567-e89b-12d3-a456-426614174001',
      email: 'newuser@example.com',
      role_id: '123e4567-e89b-12d3-a456-426614174002',
      invited_by: '123e4567-e89b-12d3-a456-426614174003',
      token: 'new-invitation-token',
      status: 'pending',
      expires_at: '2023-01-08T00:00:00.000Z'
    })
  })
})

describe('Audit Log Transformations', () => {
  const auditLogRow: AuditLogRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: '123e4567-e89b-12d3-a456-426614174001',
    organization_id: '123e4567-e89b-12d3-a456-426614174002',
    action: 'user.created',
    resource_type: 'user',
    resource_id: '123e4567-e89b-12d3-a456-426614174003',
    metadata: { source: 'api' },
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    created_at: '2023-01-01T00:00:00Z'
  }

  it('should transform audit log row to AuditLog model', () => {
    const auditLog = transformAuditLogRow(auditLogRow)
    
    expect(auditLog).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      action: 'user.created',
      resourceType: 'user',
      resourceId: '123e4567-e89b-12d3-a456-426614174003',
      metadata: { source: 'api' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z')
    })
  })

  it('should handle null optional fields in audit log row', () => {
    const auditLogRowWithNulls: AuditLogRow = {
      ...auditLogRow,
      user_id: null,
      organization_id: null,
      resource_id: null,
      ip_address: null,
      user_agent: null
    }
    
    const auditLog = transformAuditLogRow(auditLogRowWithNulls)
    
    expect(auditLog.userId).toBeUndefined()
    expect(auditLog.organizationId).toBeUndefined()
    expect(auditLog.resourceId).toBeUndefined()
    expect(auditLog.ipAddress).toBeUndefined()
    expect(auditLog.userAgent).toBeUndefined()
  })

  it('should transform AuditLog model to row format', () => {
    const auditLog = {
      action: 'role.assigned',
      resourceType: 'membership',
      resourceId: '123e4567-e89b-12d3-a456-426614174003',
      metadata: { roleId: '123e4567-e89b-12d3-a456-426614174004' }
    }
    
    const row = transformAuditLogToRow(auditLog)
    
    expect(row).toEqual({
      user_id: null,
      organization_id: null,
      action: 'role.assigned',
      resource_type: 'membership',
      resource_id: '123e4567-e89b-12d3-a456-426614174003',
      metadata: { roleId: '123e4567-e89b-12d3-a456-426614174004' },
      ip_address: null,
      user_agent: null
    })
  })
})

describe('Utility Functions', () => {
  const userRows: UserRow[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      clerk_user_id: 'user_1',
      email: 'user1@example.com',
      first_name: 'User',
      last_name: 'One',
      avatar_url: null,
      preferences: {},
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      clerk_user_id: 'user_2',
      email: 'user2@example.com',
      first_name: 'User',
      last_name: 'Two',
      avatar_url: null,
      preferences: {},
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  ]

  it('should transform arrays of rows', () => {
    const users = transformRows(userRows, transformUserRow)
    
    expect(users).toHaveLength(2)
    expect(users[0].clerkUserId).toBe('user_1')
    expect(users[1].clerkUserId).toBe('user_2')
  })

  it('should safely transform null row', () => {
    const result = transformRowSafe(null, transformUserRow)
    expect(result).toBeNull()
  })

  it('should safely transform valid row', () => {
    const result = transformRowSafe(userRows[0], transformUserRow)
    expect(result).not.toBeNull()
    expect(result?.clerkUserId).toBe('user_1')
  })
})