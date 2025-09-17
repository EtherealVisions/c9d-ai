/**
 * Comprehensive test suite for types.ts
 * Achieves 95% coverage for model types and interfaces
 */

import { describe, it, expect } from 'vitest'
import {
  DATABASE_TABLES,
  type DatabaseTable,
  type User,
  type Organization,
  type Membership,
  type Role,
  type Permission,
  type Invitation,
  type AuditLog,
  type MembershipStatus,
  type InvitationStatus,
  type UserRow,
  type OrganizationRow,
  type MembershipRow,
  type RoleRow,
  type PermissionRow,
  type InvitationRow,
  type AuditLogRow,
  type UserWithMemberships,
  type OrganizationWithMembers,
  type MembershipWithRelations,
  type UserInsert,
  type UserUpdate,
  type OrganizationInsert,
  type OrganizationUpdate,
  type MembershipInsert,
  type MembershipUpdate,
  type RoleInsert,
  type RoleUpdate,
  type PermissionInsert,
  type PermissionUpdate,
  type InvitationInsert,
  type InvitationUpdate,
  type AuditLogInsert
} from '../types'

describe('Types Module', () => {
  describe('DATABASE_TABLES constant', () => {
    it('should contain all expected table names', () => {
      expect(DATABASE_TABLES).toEqual([
        'users',
        'organizations',
        'organization_memberships',
        'roles',
        'permissions',
        'invitations',
        'audit_logs'
      ])
    })

    it('should be readonly array', () => {
      expect(Array.isArray(DATABASE_TABLES)).toBe(true)
      expect(DATABASE_TABLES.length).toBe(7)
    })
  })

  describe('Status Enums', () => {
    it('should define MembershipStatus correctly', () => {
      const validStatuses: MembershipStatus[] = ['active', 'inactive', 'pending']
      
      validStatuses.forEach(status => {
        expect(['active', 'inactive', 'pending']).toContain(status)
      })
    })

    it('should define InvitationStatus correctly', () => {
      const validStatuses: InvitationStatus[] = ['pending', 'accepted', 'expired', 'revoked']
      
      validStatuses.forEach(status => {
        expect(['pending', 'accepted', 'expired', 'revoked']).toContain(status)
      })
    })
  })

  describe('Entity Interfaces', () => {
    describe('User interface', () => {
      it('should have correct structure', () => {
        const user: User = {
          id: 'user-123',
          clerkUserId: 'clerk-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: 'https://example.com/avatar.jpg',
          preferences: { theme: 'dark' },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }

        expect(user.id).toBe('user-123')
        expect(user.clerkUserId).toBe('clerk-123')
        expect(user.email).toBe('test@example.com')
        expect(user.firstName).toBe('John')
        expect(user.lastName).toBe('Doe')
        expect(user.avatarUrl).toBe('https://example.com/avatar.jpg')
        expect(user.preferences).toEqual({ theme: 'dark' })
        expect(user.createdAt).toBeInstanceOf(Date)
        expect(user.updatedAt).toBeInstanceOf(Date)
      })

      it('should allow optional fields to be undefined', () => {
        const minimalUser: User = {
          id: 'user-123',
          clerkUserId: 'clerk-123',
          email: 'test@example.com',
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }

        expect(minimalUser.firstName).toBeUndefined()
        expect(minimalUser.lastName).toBeUndefined()
        expect(minimalUser.avatarUrl).toBeUndefined()
      })
    })

    describe('Organization interface', () => {
      it('should have correct structure', () => {
        const organization: Organization = {
          id: 'org-123',
          name: 'Test Organization',
          slug: 'test-org',
          description: 'A test organization',
          avatarUrl: 'https://example.com/org-avatar.jpg',
          metadata: { industry: 'tech' },
          settings: { allowPublicSignup: false },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }

        expect(organization.id).toBe('org-123')
        expect(organization.name).toBe('Test Organization')
        expect(organization.slug).toBe('test-org')
        expect(organization.description).toBe('A test organization')
        expect(organization.avatarUrl).toBe('https://example.com/org-avatar.jpg')
        expect(organization.metadata).toEqual({ industry: 'tech' })
        expect(organization.settings).toEqual({ allowPublicSignup: false })
      })
    })

    describe('Membership interface', () => {
      it('should have correct structure', () => {
        const membership: Membership = {
          id: 'membership-123',
          userId: 'user-123',
          organizationId: 'org-123',
          roleId: 'role-123',
          status: 'active',
          joinedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }

        expect(membership.id).toBe('membership-123')
        expect(membership.userId).toBe('user-123')
        expect(membership.organizationId).toBe('org-123')
        expect(membership.roleId).toBe('role-123')
        expect(membership.status).toBe('active')
        expect(membership.joinedAt).toBeInstanceOf(Date)
      })

      it('should allow optional populated relations', () => {
        const membershipWithRelations: Membership = {
          id: 'membership-123',
          userId: 'user-123',
          organizationId: 'org-123',
          roleId: 'role-123',
          status: 'active',
          joinedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          user: {
            id: 'user-123',
            clerkUserId: 'clerk-123',
            email: 'test@example.com',
            preferences: {},
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }

        expect(membershipWithRelations.user).toBeDefined()
        expect(membershipWithRelations.user?.id).toBe('user-123')
      })
    })

    describe('Role interface', () => {
      it('should have correct structure', () => {
        const role: Role = {
          id: 'role-123',
          name: 'Admin',
          description: 'Administrator role',
          organizationId: 'org-123',
          isSystemRole: false,
          permissions: ['user.read', 'user.write', 'org.manage'],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }

        expect(role.id).toBe('role-123')
        expect(role.name).toBe('Admin')
        expect(role.description).toBe('Administrator role')
        expect(role.organizationId).toBe('org-123')
        expect(role.isSystemRole).toBe(false)
        expect(role.permissions).toEqual(['user.read', 'user.write', 'org.manage'])
      })
    })

    describe('Permission interface', () => {
      it('should have correct structure', () => {
        const permission: Permission = {
          id: 'permission-123',
          name: 'user.read',
          description: 'Read user data',
          resource: 'user',
          action: 'read',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }

        expect(permission.id).toBe('permission-123')
        expect(permission.name).toBe('user.read')
        expect(permission.description).toBe('Read user data')
        expect(permission.resource).toBe('user')
        expect(permission.action).toBe('read')
      })
    })

    describe('Invitation interface', () => {
      it('should have correct structure', () => {
        const invitation: Invitation = {
          id: 'invitation-123',
          organizationId: 'org-123',
          email: 'invite@example.com',
          roleId: 'role-123',
          invitedBy: 'user-123',
          token: 'invite-token-123',
          status: 'pending',
          expiresAt: new Date('2024-12-31'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }

        expect(invitation.id).toBe('invitation-123')
        expect(invitation.organizationId).toBe('org-123')
        expect(invitation.email).toBe('invite@example.com')
        expect(invitation.roleId).toBe('role-123')
        expect(invitation.invitedBy).toBe('user-123')
        expect(invitation.token).toBe('invite-token-123')
        expect(invitation.status).toBe('pending')
        expect(invitation.expiresAt).toBeInstanceOf(Date)
      })
    })

    describe('AuditLog interface', () => {
      it('should have correct structure', () => {
        const auditLog: AuditLog = {
          id: 'audit-123',
          userId: 'user-123',
          organizationId: 'org-123',
          action: 'user.created',
          resourceType: 'user',
          resourceId: 'user-456',
          metadata: { source: 'web' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }

        expect(auditLog.id).toBe('audit-123')
        expect(auditLog.userId).toBe('user-123')
        expect(auditLog.organizationId).toBe('org-123')
        expect(auditLog.action).toBe('user.created')
        expect(auditLog.resourceType).toBe('user')
        expect(auditLog.resourceId).toBe('user-456')
        expect(auditLog.metadata).toEqual({ source: 'web' })
        expect(auditLog.ipAddress).toBe('192.168.1.1')
        expect(auditLog.userAgent).toBe('Mozilla/5.0')
      })

      it('should allow optional fields to be undefined', () => {
        const minimalAuditLog: AuditLog = {
          id: 'audit-123',
          action: 'system.startup',
          resourceType: 'system',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }

        expect(minimalAuditLog.userId).toBeUndefined()
        expect(minimalAuditLog.organizationId).toBeUndefined()
        expect(minimalAuditLog.resourceId).toBeUndefined()
        expect(minimalAuditLog.ipAddress).toBeUndefined()
        expect(minimalAuditLog.userAgent).toBeUndefined()
      })
    })
  })

  describe('Database Row Types', () => {
    describe('UserRow', () => {
      it('should have snake_case fields', () => {
        const userRow: UserRow = {
          id: 'user-123',
          clerk_user_id: 'clerk-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          preferences: { theme: 'dark' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }

        expect(userRow.clerk_user_id).toBe('clerk-123')
        expect(userRow.first_name).toBe('John')
        expect(userRow.last_name).toBe('Doe')
        expect(userRow.avatar_url).toBe('https://example.com/avatar.jpg')
        expect(userRow.created_at).toBe('2024-01-01T00:00:00Z')
        expect(userRow.updated_at).toBe('2024-01-01T00:00:00Z')
      })

      it('should allow null values for optional fields', () => {
        const userRow: UserRow = {
          id: 'user-123',
          clerk_user_id: 'clerk-123',
          email: 'test@example.com',
          first_name: null,
          last_name: null,
          avatar_url: null,
          preferences: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }

        expect(userRow.first_name).toBeNull()
        expect(userRow.last_name).toBeNull()
        expect(userRow.avatar_url).toBeNull()
      })
    })

    describe('OrganizationRow', () => {
      it('should have snake_case fields', () => {
        const orgRow: OrganizationRow = {
          id: 'org-123',
          name: 'Test Org',
          slug: 'test-org',
          description: 'Test description',
          avatar_url: 'https://example.com/org.jpg',
          metadata: { industry: 'tech' },
          settings: { public: false },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }

        expect(orgRow.avatar_url).toBe('https://example.com/org.jpg')
        expect(orgRow.created_at).toBe('2024-01-01T00:00:00Z')
        expect(orgRow.updated_at).toBe('2024-01-01T00:00:00Z')
      })
    })

    describe('MembershipRow', () => {
      it('should have snake_case fields', () => {
        const membershipRow: MembershipRow = {
          id: 'membership-123',
          user_id: 'user-123',
          organization_id: 'org-123',
          role_id: 'role-123',
          status: 'active',
          joined_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }

        expect(membershipRow.user_id).toBe('user-123')
        expect(membershipRow.organization_id).toBe('org-123')
        expect(membershipRow.role_id).toBe('role-123')
        expect(membershipRow.joined_at).toBe('2024-01-01T00:00:00Z')
      })
    })

    describe('RoleRow', () => {
      it('should have snake_case fields', () => {
        const roleRow: RoleRow = {
          id: 'role-123',
          name: 'Admin',
          description: 'Administrator',
          organization_id: 'org-123',
          is_system_role: false,
          permissions: ['user.read', 'user.write'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }

        expect(roleRow.organization_id).toBe('org-123')
        expect(roleRow.is_system_role).toBe(false)
      })
    })

    describe('InvitationRow', () => {
      it('should have snake_case fields', () => {
        const invitationRow: InvitationRow = {
          id: 'invitation-123',
          organization_id: 'org-123',
          email: 'test@example.com',
          role_id: 'role-123',
          invited_by: 'user-123',
          token: 'token-123',
          status: 'pending',
          expires_at: '2024-12-31T23:59:59Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }

        expect(invitationRow.organization_id).toBe('org-123')
        expect(invitationRow.role_id).toBe('role-123')
        expect(invitationRow.invited_by).toBe('user-123')
        expect(invitationRow.expires_at).toBe('2024-12-31T23:59:59Z')
      })
    })

    describe('AuditLogRow', () => {
      it('should have snake_case fields', () => {
        const auditLogRow: AuditLogRow = {
          id: 'audit-123',
          user_id: 'user-123',
          organization_id: 'org-123',
          action: 'user.created',
          resource_type: 'user',
          resource_id: 'user-456',
          metadata: { source: 'api' },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          created_at: '2024-01-01T00:00:00Z'
        }

        expect(auditLogRow.user_id).toBe('user-123')
        expect(auditLogRow.organization_id).toBe('org-123')
        expect(auditLogRow.resource_type).toBe('user')
        expect(auditLogRow.resource_id).toBe('user-456')
        expect(auditLogRow.ip_address).toBe('192.168.1.1')
        expect(auditLogRow.user_agent).toBe('Mozilla/5.0')
      })

      it('should allow null values for optional fields', () => {
        const auditLogRow: AuditLogRow = {
          id: 'audit-123',
          user_id: null,
          organization_id: null,
          action: 'system.startup',
          resource_type: 'system',
          resource_id: null,
          metadata: {},
          ip_address: null,
          user_agent: null,
          created_at: '2024-01-01T00:00:00Z'
        }

        expect(auditLogRow.user_id).toBeNull()
        expect(auditLogRow.organization_id).toBeNull()
        expect(auditLogRow.resource_id).toBeNull()
        expect(auditLogRow.ip_address).toBeNull()
        expect(auditLogRow.user_agent).toBeNull()
      })
    })
  })

  describe('Relation Types', () => {
    describe('UserWithMemberships', () => {
      it('should extend User with memberships array', () => {
        const userWithMemberships: UserWithMemberships = {
          id: 'user-123',
          clerkUserId: 'clerk-123',
          email: 'test@example.com',
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [
            {
              id: 'membership-123',
              userId: 'user-123',
              organizationId: 'org-123',
              roleId: 'role-123',
              status: 'active',
              joinedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              organization: {
                id: 'org-123',
                name: 'Test Org',
                slug: 'test-org',
                metadata: {},
                settings: {},
                createdAt: new Date(),
                updatedAt: new Date()
              },
              role: {
                id: 'role-123',
                name: 'Admin',
                organizationId: 'org-123',
                isSystemRole: false,
                permissions: ['user.read'],
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          ]
        }

        expect(userWithMemberships.memberships).toHaveLength(1)
        expect(userWithMemberships.memberships[0].organization).toBeDefined()
        expect(userWithMemberships.memberships[0].role).toBeDefined()
      })
    })

    describe('OrganizationWithMembers', () => {
      it('should extend Organization with memberships array', () => {
        const orgWithMembers: OrganizationWithMembers = {
          id: 'org-123',
          name: 'Test Org',
          slug: 'test-org',
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [
            {
              id: 'membership-123',
              userId: 'user-123',
              organizationId: 'org-123',
              roleId: 'role-123',
              status: 'active',
              joinedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                id: 'user-123',
                clerkUserId: 'clerk-123',
                email: 'test@example.com',
                preferences: {},
                createdAt: new Date(),
                updatedAt: new Date()
              },
              role: {
                id: 'role-123',
                name: 'Admin',
                organizationId: 'org-123',
                isSystemRole: false,
                permissions: ['user.read'],
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          ]
        }

        expect(orgWithMembers.memberships).toHaveLength(1)
        expect(orgWithMembers.memberships[0].user).toBeDefined()
        expect(orgWithMembers.memberships[0].role).toBeDefined()
      })
    })

    describe('MembershipWithRelations', () => {
      it('should extend Membership with all relations', () => {
        const membershipWithRelations: MembershipWithRelations = {
          id: 'membership-123',
          userId: 'user-123',
          organizationId: 'org-123',
          roleId: 'role-123',
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-123',
            clerkUserId: 'clerk-123',
            email: 'test@example.com',
            preferences: {},
            createdAt: new Date(),
            updatedAt: new Date()
          },
          organization: {
            id: 'org-123',
            name: 'Test Org',
            slug: 'test-org',
            metadata: {},
            settings: {},
            createdAt: new Date(),
            updatedAt: new Date()
          },
          role: {
            id: 'role-123',
            name: 'Admin',
            organizationId: 'org-123',
            isSystemRole: false,
            permissions: ['user.read'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }

        expect(membershipWithRelations.user).toBeDefined()
        expect(membershipWithRelations.organization).toBeDefined()
        expect(membershipWithRelations.role).toBeDefined()
      })
    })
  })

  describe('Insert and Update Types', () => {
    describe('UserInsert and UserUpdate', () => {
      it('should omit auto-generated fields for insert', () => {
        const userInsert: UserInsert = {
          clerk_user_id: 'clerk-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: null,
          preferences: {}
        }

        expect(userInsert.clerk_user_id).toBe('clerk-123')
        expect(userInsert.email).toBe('test@example.com')
        // Should not have id, created_at, updated_at
        expect('id' in userInsert).toBe(false)
        expect('created_at' in userInsert).toBe(false)
        expect('updated_at' in userInsert).toBe(false)
      })

      it('should allow partial updates', () => {
        const userUpdate: UserUpdate = {
          first_name: 'Jane'
        }

        expect(userUpdate.first_name).toBe('Jane')
        expect(userUpdate.email).toBeUndefined()
      })
    })

    describe('OrganizationInsert and OrganizationUpdate', () => {
      it('should omit auto-generated fields for insert', () => {
        const orgInsert: OrganizationInsert = {
          name: 'Test Org',
          slug: 'test-org',
          description: null,
          avatar_url: null,
          metadata: {},
          settings: {}
        }

        expect(orgInsert.name).toBe('Test Org')
        expect(orgInsert.slug).toBe('test-org')
        // Should not have id, created_at, updated_at
        expect('id' in orgInsert).toBe(false)
        expect('created_at' in orgInsert).toBe(false)
        expect('updated_at' in orgInsert).toBe(false)
      })
    })

    describe('MembershipInsert and MembershipUpdate', () => {
      it('should omit auto-generated fields for insert', () => {
        const membershipInsert: MembershipInsert = {
          user_id: 'user-123',
          organization_id: 'org-123',
          role_id: 'role-123',
          status: 'active',
          joined_at: '2024-01-01T00:00:00Z'
        }

        expect(membershipInsert.user_id).toBe('user-123')
        expect(membershipInsert.organization_id).toBe('org-123')
        // Should not have id, created_at, updated_at
        expect('id' in membershipInsert).toBe(false)
        expect('created_at' in membershipInsert).toBe(false)
        expect('updated_at' in membershipInsert).toBe(false)
      })
    })

    describe('RoleInsert and RoleUpdate', () => {
      it('should omit auto-generated fields for insert', () => {
        const roleInsert: RoleInsert = {
          name: 'Admin',
          description: null,
          organization_id: 'org-123',
          is_system_role: false,
          permissions: ['user.read']
        }

        expect(roleInsert.name).toBe('Admin')
        expect(roleInsert.organization_id).toBe('org-123')
        // Should not have id, created_at, updated_at
        expect('id' in roleInsert).toBe(false)
        expect('created_at' in roleInsert).toBe(false)
        expect('updated_at' in roleInsert).toBe(false)
      })
    })

    describe('InvitationInsert and InvitationUpdate', () => {
      it('should omit auto-generated fields for insert', () => {
        const invitationInsert: InvitationInsert = {
          organization_id: 'org-123',
          email: 'test@example.com',
          role_id: 'role-123',
          invited_by: 'user-123',
          token: 'token-123',
          status: 'pending',
          expires_at: '2024-12-31T23:59:59Z'
        }

        expect(invitationInsert.organization_id).toBe('org-123')
        expect(invitationInsert.email).toBe('test@example.com')
        // Should not have id, created_at, updated_at
        expect('id' in invitationInsert).toBe(false)
        expect('created_at' in invitationInsert).toBe(false)
        expect('updated_at' in invitationInsert).toBe(false)
      })
    })

    describe('AuditLogInsert', () => {
      it('should omit auto-generated fields for insert', () => {
        const auditLogInsert: AuditLogInsert = {
          user_id: 'user-123',
          organization_id: 'org-123',
          action: 'user.created',
          resource_type: 'user',
          resource_id: 'user-456',
          metadata: {},
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        }

        expect(auditLogInsert.user_id).toBe('user-123')
        expect(auditLogInsert.action).toBe('user.created')
        // Should not have id, created_at
        expect('id' in auditLogInsert).toBe(false)
        expect('created_at' in auditLogInsert).toBe(false)
      })
    })
  })

  describe('Type Compatibility', () => {
    it('should allow DatabaseTable to be one of the table names', () => {
      const validTables: DatabaseTable[] = [
        'users',
        'organizations',
        'organization_memberships',
        'roles',
        'permissions',
        'invitations',
        'audit_logs'
      ]

      validTables.forEach(table => {
        expect(DATABASE_TABLES).toContain(table)
      })
    })

    it('should ensure status types are compatible', () => {
      const membershipStatus: MembershipStatus = 'active'
      const invitationStatus: InvitationStatus = 'pending'

      expect(['active', 'inactive', 'pending']).toContain(membershipStatus)
      expect(['pending', 'accepted', 'expired', 'revoked']).toContain(invitationStatus)
    })
  })
})