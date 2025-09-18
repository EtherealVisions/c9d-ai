/**
 * Comprehensive tests for model transformers
 * Tests the conversion between database rows and application models
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
  transformAuditLogToRow
} from '../transformers'
import type { UserRow, OrganizationRow, MembershipRow, RoleRow, PermissionRow, InvitationRow, AuditLogRow } from '../types'

describe('Model Transformers', () => {
  describe('User Transformers', () => {
    describe('transformUserRow', () => {
      it('should transform complete user row to User model', () => {
        const userRow: UserRow = {
          id: 'user-1',
          clerk_user_id: 'clerk-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          preferences: { theme: 'dark', notifications: true },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }

        const user = transformUserRow(userRow)

        expect(user).toEqual({
          id: 'user-1',
          clerkUserId: 'clerk-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: 'https://example.com/avatar.jpg',
          preferences: { theme: 'dark', notifications: true },
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        })
      })

      it('should handle null optional fields', () => {
        const userRow: UserRow = {
          id: 'user-1',
          clerk_user_id: 'clerk-123',
          email: 'test@example.com',
          first_name: null,
          last_name: null,
          avatar_url: null,
          preferences: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }

        const user = transformUserRow(userRow)

        expect(user.firstName).toBeUndefined()
        expect(user.lastName).toBeUndefined()
        expect(user.avatarUrl).toBeUndefined()
        expect(user.preferences).toEqual({})
      })
    })

    describe('transformUserToRow', () => {
      it('should transform User model to database row format', () => {
        const user = {
          clerkUserId: 'clerk-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: 'https://example.com/avatar.jpg',
          preferences: { theme: 'dark' }
        }

        const userRow = transformUserToRow(user)

        expect(userRow).toEqual({
          clerk_user_id: 'clerk-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          preferences: { theme: 'dark' }
        })
      })

      it('should handle undefined optional fields', () => {
        const user = {
          clerkUserId: 'clerk-123',
          email: 'test@example.com',
          preferences: {}
        }

        const userRow = transformUserToRow(user)

        expect(userRow.first_name).toBeNull()
        expect(userRow.last_name).toBeNull()
        expect(userRow.avatar_url).toBeNull()
      })
    })
  })

  describe('Organization Transformers', () => {
    describe('transformOrganizationRow', () => {
      it('should transform complete organization row to Organization model', () => {
        const orgRow: OrganizationRow = {
          id: 'org-1',
          name: 'Test Organization',
          slug: 'test-org',
          description: 'A test organization',
          avatar_url: 'https://example.com/org-avatar.jpg',
          metadata: { industry: 'tech' },
          settings: { theme: 'light' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }

        const org = transformOrganizationRow(orgRow)

        expect(org).toEqual({
          id: 'org-1',
          name: 'Test Organization',
          slug: 'test-org',
          description: 'A test organization',
          avatarUrl: 'https://example.com/org-avatar.jpg',
          metadata: { industry: 'tech' },
          settings: { theme: 'light' },
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        })
      })

      it('should handle null optional fields', () => {
        const orgRow: OrganizationRow = {
          id: 'org-1',
          name: 'Test Organization',
          slug: 'test-org',
          description: null,
          avatar_url: null,
          metadata: {},
          settings: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }

        const org = transformOrganizationRow(orgRow)

        expect(org.description).toBeUndefined()
        expect(org.avatarUrl).toBeUndefined()
      })
    })

    describe('transformOrganizationToRow', () => {
      it('should transform Organization model to database row format', () => {
        const org = {
          name: 'Test Organization',
          slug: 'test-org',
          description: 'A test organization',
          avatarUrl: 'https://example.com/org-avatar.jpg',
          metadata: { industry: 'tech' },
          settings: { theme: 'light' }
        }

        const orgRow = transformOrganizationToRow(org)

        expect(orgRow).toEqual({
          name: 'Test Organization',
          slug: 'test-org',
          description: 'A test organization',
          avatar_url: 'https://example.com/org-avatar.jpg',
          metadata: { industry: 'tech' },
          settings: { theme: 'light' }
        })
      })

      it('should handle undefined optional fields', () => {
        const org = {
          name: 'Test Organization',
          slug: 'test-org',
          metadata: {},
          settings: {}
        }

        const orgRow = transformOrganizationToRow(org)

        expect(orgRow.description).toBeNull()
        expect(orgRow.avatar_url).toBeNull()
      })
    })
  })

  describe('Membership Transformers', () => {
    describe('transformMembershipRow', () => {
      it('should transform complete membership row to Membership model', () => {
        const membershipRow: MembershipRow = {
          id: 'membership-1',
          user_id: 'user-1',
          organization_id: 'org-1',
          role_id: 'role-1',
          status: 'active',
          joined_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }

        const membership = transformMembershipRow(membershipRow)

        expect(membership).toEqual({
          id: 'membership-1',
          userId: 'user-1',
          organizationId: 'org-1',
          roleId: 'role-1',
          status: 'active',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        })
      })
    })

    describe('transformMembershipToRow', () => {
      it('should transform Membership model to database row format', () => {
        const membership = {
          userId: 'user-1',
          organizationId: 'org-1',
          roleId: 'role-1',
          status: 'active' as const,
          joinedAt: new Date('2024-01-01T00:00:00Z')
        }

        const membershipRow = transformMembershipToRow(membership)

        expect(membershipRow).toEqual({
          user_id: 'user-1',
          organization_id: 'org-1',
          role_id: 'role-1',
          status: 'active',
          joined_at: '2024-01-01T00:00:00.000Z'
        })
      })
    })
  })

  describe('Role Transformers', () => {
    describe('transformRoleRow', () => {
      it('should transform complete role row to Role model', () => {
        const roleRow: RoleRow = {
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator role',
          organization_id: 'org-1',
          permissions: ['user.read', 'user.write'],
          is_system_role: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }

        const role = transformRoleRow(roleRow)

        expect(role).toEqual({
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator role',
          organizationId: 'org-1',
          permissions: ['user.read', 'user.write'],
          isSystemRole: false,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        })
      })

      it('should handle null description', () => {
        const roleRow: RoleRow = {
          id: 'role-1',
          name: 'Admin',
          description: null,
          organization_id: 'org-1',
          permissions: [],
          is_system_role: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }

        const role = transformRoleRow(roleRow)

        expect(role.description).toBeUndefined()
        expect(role.isSystemRole).toBe(true)
      })
    })

    describe('transformRoleToRow', () => {
      it('should transform Role model to database row format', () => {
        const role = {
          name: 'Admin',
          description: 'Administrator role',
          organizationId: 'org-1',
          permissions: ['user.read', 'user.write'],
          isSystemRole: false
        }

        const roleRow = transformRoleToRow(role)

        expect(roleRow).toEqual({
          name: 'Admin',
          description: 'Administrator role',
          organization_id: 'org-1',
          permissions: ['user.read', 'user.write'],
          is_system_role: false
        })
      })

      it('should handle undefined description', () => {
        const role = {
          name: 'Admin',
          organizationId: 'org-1',
          permissions: ['admin'],
          isSystemRole: true
        }

        const roleRow = transformRoleToRow(role)

        expect(roleRow.description).toBeNull()
      })
    })
  })

  describe('Permission Transformers', () => {
    describe('transformPermissionRow', () => {
      it('should transform permission row to Permission model', () => {
        const permissionRow: PermissionRow = {
          id: 'perm-1',
          name: 'user.read',
          description: 'Read user data',
          resource: 'user',
          action: 'read',
          created_at: '2024-01-01T00:00:00Z'
        }

        const permission = transformPermissionRow(permissionRow)

        expect(permission).toEqual({
          id: 'perm-1',
          name: 'user.read',
          description: 'Read user data',
          resource: 'user',
          action: 'read',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z') // Permissions use created_at for updated_at
        })
      })

      it('should handle null description', () => {
        const permissionRow: PermissionRow = {
          id: 'perm-1',
          name: 'user.read',
          description: null,
          resource: 'user',
          action: 'read',
          created_at: '2024-01-01T00:00:00Z'
        }

        const permission = transformPermissionRow(permissionRow)

        expect(permission.description).toBeUndefined()
      })
    })

    describe('transformPermissionToRow', () => {
      it('should transform Permission model to database row format', () => {
        const permission = {
          name: 'user.read',
          description: 'Read user data',
          resource: 'user',
          action: 'read'
        }

        const permissionRow = transformPermissionToRow(permission)

        expect(permissionRow).toEqual({
          name: 'user.read',
          description: 'Read user data',
          resource: 'user',
          action: 'read'
        })
      })

      it('should handle undefined description', () => {
        const permission = {
          name: 'user.read',
          resource: 'user',
          action: 'read'
        }

        const permissionRow = transformPermissionToRow(permission)

        expect(permissionRow.description).toBeNull()
      })
    })
  })

  describe('Invitation Transformers', () => {
    describe('transformInvitationRow', () => {
      it('should transform invitation row to Invitation model', () => {
        const invitationRow: InvitationRow = {
          id: 'inv-1',
          organization_id: 'org-1',
          email: 'invite@example.com',
          role_id: 'role-1',
          invited_by: 'user-1',
          token: 'invitation-token-123',
          status: 'pending',
          expires_at: '2024-02-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }

        const invitation = transformInvitationRow(invitationRow)

        expect(invitation).toEqual({
          id: 'inv-1',
          organizationId: 'org-1',
          email: 'invite@example.com',
          roleId: 'role-1',
          invitedBy: 'user-1',
          token: 'invitation-token-123',
          status: 'pending',
          expiresAt: new Date('2024-02-01T00:00:00Z'),
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z')
        })
      })
    })

    describe('transformInvitationToRow', () => {
      it('should transform Invitation model to database row format', () => {
        const invitation = {
          organizationId: 'org-1',
          email: 'invite@example.com',
          roleId: 'role-1',
          invitedBy: 'user-1',
          token: 'invitation-token-123',
          status: 'pending' as const,
          expiresAt: new Date('2024-02-01T00:00:00Z')
        }

        const invitationRow = transformInvitationToRow(invitation)

        expect(invitationRow).toEqual({
          organization_id: 'org-1',
          email: 'invite@example.com',
          role_id: 'role-1',
          invited_by: 'user-1',
          token: 'invitation-token-123',
          status: 'pending',
          expires_at: '2024-02-01T00:00:00.000Z'
        })
      })
    })
  })

  describe('AuditLog Transformers', () => {
    describe('transformAuditLogRow', () => {
      it('should transform audit log row to AuditLog model', () => {
        const auditLogRow: AuditLogRow = {
          id: 'audit-1',
          user_id: 'user-1',
          organization_id: 'org-1',
          action: 'user.created',
          resource_type: 'user',
          resource_id: 'user-2',
          metadata: { ip: '127.0.0.1' },
          ip_address: null,
          user_agent: null,
          created_at: '2024-01-01T00:00:00Z'
        }

        const auditLog = transformAuditLogRow(auditLogRow)

        expect(auditLog).toEqual({
          id: 'audit-1',
          userId: 'user-1',
          organizationId: 'org-1',
          action: 'user.created',
          resourceType: 'user',
          resourceId: 'user-2',
          metadata: { ip: '127.0.0.1' },
          ipAddress: undefined,
          userAgent: undefined,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z') // Audit logs use created_at for updated_at
        })
      })

      it('should handle null optional fields', () => {
        const auditLogRow: AuditLogRow = {
          id: 'audit-1',
          user_id: 'user-1',
          organization_id: null,
          action: 'user.login',
          resource_type: 'user',
          resource_id: null,
          metadata: {},
          ip_address: null,
          user_agent: null,
          created_at: '2024-01-01T00:00:00Z'
        }

        const auditLog = transformAuditLogRow(auditLogRow)

        expect(auditLog.organizationId).toBeUndefined()
        expect(auditLog.resourceType).toBe('user')
        expect(auditLog.resourceId).toBeUndefined()
      })
    })

    describe('transformAuditLogToRow', () => {
      it('should transform AuditLog model to database row format', () => {
        const auditLog = {
          userId: 'user-1',
          organizationId: 'org-1',
          action: 'user.created',
          resourceType: 'user',
          resourceId: 'user-2',
          metadata: { ip: '127.0.0.1' }
        }

        const auditLogRow = transformAuditLogToRow(auditLog)

        expect(auditLogRow).toEqual({
          user_id: 'user-1',
          organization_id: 'org-1',
          action: 'user.created',
          resource_type: 'user',
          resource_id: 'user-2',
          metadata: { ip: '127.0.0.1' },
          ip_address: null,
          user_agent: null
        })
      })

      it('should handle undefined optional fields', () => {
        const auditLog = {
          userId: 'user-1',
          action: 'user.login',
          resourceType: 'user',
          metadata: {}
        }

        const auditLogRow = transformAuditLogToRow(auditLog)

        expect(auditLogRow.organization_id).toBeNull()
        expect(auditLogRow.resource_type).toBe('user')
        expect(auditLogRow.resource_id).toBeNull()
      })
    })
  })
})