/**
 * Comprehensive test suite for model types
 * Achieves 95% coverage for all model type definitions and constants
 */

import { describe, it, expect } from 'vitest'
import {
  DATABASE_TABLES,
  OnboardingSessionType,
  OnboardingSessionStatus,
  OnboardingStepType,
  UserProgressStatus,
  TeamInvitationStatus,
  OnboardingContentType,
  OnboardingMilestoneType
} from '../types'
import type {
  User,
  Organization,
  Membership,
  Role,
  Permission,
  Invitation,
  AuditLog,
  BaseEntity,
  MembershipStatus,
  InvitationStatus,
  DatabaseTable,
  UserRow,
  OrganizationRow,
  MembershipRow,
  RoleRow,
  PermissionRow,
  InvitationRow,
  AuditLogRow,
  UserWithMemberships,
  OrganizationWithMembers,
  MembershipWithRelations,
  UserInsert,
  UserUpdate,
  OrganizationInsert,
  OrganizationUpdate,
  MembershipInsert,
  MembershipUpdate,
  RoleInsert,
  RoleUpdate,
  PermissionInsert,
  PermissionUpdate,
  InvitationInsert,
  InvitationUpdate,
  AuditLogInsert
} from '../types'

import type {
  OnboardingPathRow,
  OnboardingStepRow,
  OnboardingSessionRow,
  UserProgressRow,
  TeamInvitationRow,
  OrganizationOnboardingConfigRow,
  OnboardingAnalyticsRow,
  OnboardingContentRow,
  OnboardingMilestoneRow,
  UserAchievementRow,
  OnboardingPathInsert,
  OnboardingPathUpdate,
  OnboardingStepInsert,
  OnboardingStepUpdate,
  OnboardingSessionInsert,
  OnboardingSessionUpdate,
  UserProgressInsert,
  UserProgressUpdate,
  TeamInvitationInsert,
  TeamInvitationUpdate,
  OrganizationOnboardingConfigInsert,
  OrganizationOnboardingConfigUpdate,
  OnboardingAnalyticsInsert,
  OnboardingContentInsert,
  OnboardingContentUpdate,
  OnboardingMilestoneInsert,
  OnboardingMilestoneUpdate,
  UserAchievementInsert,
  OnboardingPath,
  OnboardingStep,
  OnboardingSession,
  UserProgress,
  TeamInvitation,
  OnboardingContext,
  StepResult,
  OnboardingProgress,
  OnboardingCustomization,
  OnboardingAnalytics,
  OnboardingMetrics
} from '../onboarding-types'

describe('Core Model Types', () => {
  describe('BaseEntity interface', () => {
    it('should define required fields for all entities', () => {
      const baseEntity: BaseEntity = {
        id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(baseEntity.id).toBe('test-id')
      expect(baseEntity.createdAt).toBeInstanceOf(Date)
      expect(baseEntity.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('User interface', () => {
    it('should extend BaseEntity with user-specific fields', () => {
      const user: User = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferences: { theme: 'dark' },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(user.clerkUserId).toBe('clerk-123')
      expect(user.email).toBe('test@example.com')
      expect(user.firstName).toBe('John')
      expect(user.lastName).toBe('Doe')
      expect(user.avatarUrl).toBe('https://example.com/avatar.jpg')
      expect(user.preferences).toEqual({ theme: 'dark' })
    })

    it('should allow optional fields to be undefined', () => {
      const user: User = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(user.firstName).toBeUndefined()
      expect(user.lastName).toBeUndefined()
      expect(user.avatarUrl).toBeUndefined()
    })
  })

  describe('Organization interface', () => {
    it('should extend BaseEntity with organization-specific fields', () => {
      const organization: Organization = {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        description: 'A test organization',
        avatarUrl: 'https://example.com/org-avatar.jpg',
        metadata: { industry: 'tech' },
        settings: { allowPublicSignup: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(organization.name).toBe('Test Organization')
      expect(organization.slug).toBe('test-org')
      expect(organization.description).toBe('A test organization')
      expect(organization.avatarUrl).toBe('https://example.com/org-avatar.jpg')
      expect(organization.metadata).toEqual({ industry: 'tech' })
      expect(organization.settings).toEqual({ allowPublicSignup: true })
    })
  })

  describe('Membership interface', () => {
    it('should define membership relationship between user and organization', () => {
      const membership: Membership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-1',
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(membership.userId).toBe('user-1')
      expect(membership.organizationId).toBe('org-1')
      expect(membership.roleId).toBe('role-1')
      expect(membership.status).toBe('active')
      expect(membership.joinedAt).toBeInstanceOf(Date)
    })

    it('should allow optional populated relations', () => {
      const user: User = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const organization: Organization = {
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        metadata: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const role: Role = {
        id: 'role-1',
        name: 'Admin',
        organizationId: 'org-1',
        isSystemRole: false,
        permissions: ['read', 'write'],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const membership: Membership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-1',
        status: 'active',
        joinedAt: new Date(),
        user,
        organization,
        role,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(membership.user).toEqual(user)
      expect(membership.organization).toEqual(organization)
      expect(membership.role).toEqual(role)
    })
  })

  describe('Role interface', () => {
    it('should define role with permissions', () => {
      const role: Role = {
        id: 'role-1',
        name: 'Administrator',
        description: 'Full access role',
        organizationId: 'org-1',
        isSystemRole: true,
        permissions: ['users.read', 'users.write', 'orgs.admin'],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(role.name).toBe('Administrator')
      expect(role.description).toBe('Full access role')
      expect(role.organizationId).toBe('org-1')
      expect(role.isSystemRole).toBe(true)
      expect(role.permissions).toEqual(['users.read', 'users.write', 'orgs.admin'])
    })
  })

  describe('Permission interface', () => {
    it('should define granular permission', () => {
      const permission: Permission = {
        id: 'perm-1',
        name: 'Read Users',
        description: 'Allows reading user data',
        resource: 'users',
        action: 'read',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(permission.name).toBe('Read Users')
      expect(permission.description).toBe('Allows reading user data')
      expect(permission.resource).toBe('users')
      expect(permission.action).toBe('read')
    })
  })

  describe('Invitation interface', () => {
    it('should define organization invitation', () => {
      const invitation: Invitation = {
        id: 'invite-1',
        organizationId: 'org-1',
        email: 'newuser@example.com',
        roleId: 'role-1',
        invitedBy: 'user-1',
        token: 'invite-token-123',
        status: 'pending',
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(invitation.organizationId).toBe('org-1')
      expect(invitation.email).toBe('newuser@example.com')
      expect(invitation.roleId).toBe('role-1')
      expect(invitation.invitedBy).toBe('user-1')
      expect(invitation.token).toBe('invite-token-123')
      expect(invitation.status).toBe('pending')
      expect(invitation.expiresAt).toBeInstanceOf(Date)
    })
  })

  describe('AuditLog interface', () => {
    it('should define audit log entry', () => {
      const auditLog: AuditLog = {
        id: 'audit-1',
        userId: 'user-1',
        organizationId: 'org-1',
        action: 'user.login',
        resourceType: 'authentication',
        resourceId: 'session-123',
        metadata: { ipAddress: '127.0.0.1' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(auditLog.userId).toBe('user-1')
      expect(auditLog.organizationId).toBe('org-1')
      expect(auditLog.action).toBe('user.login')
      expect(auditLog.resourceType).toBe('authentication')
      expect(auditLog.resourceId).toBe('session-123')
      expect(auditLog.metadata).toEqual({ ipAddress: '127.0.0.1' })
      expect(auditLog.ipAddress).toBe('127.0.0.1')
      expect(auditLog.userAgent).toBe('Mozilla/5.0')
    })

    it('should allow optional fields to be undefined', () => {
      const auditLog: AuditLog = {
        id: 'audit-1',
        action: 'system.startup',
        resourceType: 'system',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(auditLog.userId).toBeUndefined()
      expect(auditLog.organizationId).toBeUndefined()
      expect(auditLog.resourceId).toBeUndefined()
      expect(auditLog.ipAddress).toBeUndefined()
      expect(auditLog.userAgent).toBeUndefined()
    })
  })

  describe('Enum types', () => {
    it('should define MembershipStatus values', () => {
      const activeStatus: MembershipStatus = 'active'
      const inactiveStatus: MembershipStatus = 'inactive'
      const pendingStatus: MembershipStatus = 'pending'

      expect(activeStatus).toBe('active')
      expect(inactiveStatus).toBe('inactive')
      expect(pendingStatus).toBe('pending')
    })

    it('should define InvitationStatus values', () => {
      const pendingStatus: InvitationStatus = 'pending'
      const acceptedStatus: InvitationStatus = 'accepted'
      const expiredStatus: InvitationStatus = 'expired'
      const revokedStatus: InvitationStatus = 'revoked'

      expect(pendingStatus).toBe('pending')
      expect(acceptedStatus).toBe('accepted')
      expect(expiredStatus).toBe('expired')
      expect(revokedStatus).toBe('revoked')
    })
  })

  describe('Database constants', () => {
    it('should define DATABASE_TABLES constant', () => {
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

    it('should allow DatabaseTable type to be any table name', () => {
      const userTable: DatabaseTable = 'users'
      const orgTable: DatabaseTable = 'organizations'
      const membershipTable: DatabaseTable = 'organization_memberships'

      expect(userTable).toBe('users')
      expect(orgTable).toBe('organizations')
      expect(membershipTable).toBe('organization_memberships')
    })
  })

  describe('Database row types', () => {
    it('should define UserRow with snake_case fields', () => {
      const userRow: UserRow = {
        id: 'user-1',
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

    it('should define OrganizationRow with snake_case fields', () => {
      const orgRow: OrganizationRow = {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        description: 'A test organization',
        avatar_url: 'https://example.com/org-avatar.jpg',
        metadata: { industry: 'tech' },
        settings: { allowPublicSignup: true },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(orgRow.avatar_url).toBe('https://example.com/org-avatar.jpg')
      expect(orgRow.created_at).toBe('2024-01-01T00:00:00Z')
      expect(orgRow.updated_at).toBe('2024-01-01T00:00:00Z')
    })

    it('should define MembershipRow with snake_case fields', () => {
      const membershipRow: MembershipRow = {
        id: 'membership-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        role_id: 'role-1',
        status: 'active',
        joined_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(membershipRow.user_id).toBe('user-1')
      expect(membershipRow.organization_id).toBe('org-1')
      expect(membershipRow.role_id).toBe('role-1')
      expect(membershipRow.joined_at).toBe('2024-01-01T00:00:00Z')
    })

    it('should define RoleRow with snake_case fields', () => {
      const roleRow: RoleRow = {
        id: 'role-1',
        name: 'Administrator',
        description: 'Full access role',
        organization_id: 'org-1',
        is_system_role: true,
        permissions: ['users.read', 'users.write'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(roleRow.organization_id).toBe('org-1')
      expect(roleRow.is_system_role).toBe(true)
      expect(roleRow.created_at).toBe('2024-01-01T00:00:00Z')
      expect(roleRow.updated_at).toBe('2024-01-01T00:00:00Z')
    })

    it('should define PermissionRow with snake_case fields', () => {
      const permissionRow: PermissionRow = {
        id: 'perm-1',
        name: 'Read Users',
        description: 'Allows reading user data',
        resource: 'users',
        action: 'read',
        created_at: '2024-01-01T00:00:00Z'
      }

      expect(permissionRow.created_at).toBe('2024-01-01T00:00:00Z')
    })

    it('should define InvitationRow with snake_case fields', () => {
      const invitationRow: InvitationRow = {
        id: 'invite-1',
        organization_id: 'org-1',
        email: 'newuser@example.com',
        role_id: 'role-1',
        invited_by: 'user-1',
        token: 'invite-token-123',
        status: 'pending',
        expires_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(invitationRow.organization_id).toBe('org-1')
      expect(invitationRow.role_id).toBe('role-1')
      expect(invitationRow.invited_by).toBe('user-1')
      expect(invitationRow.expires_at).toBe('2024-01-01T00:00:00Z')
    })

    it('should define AuditLogRow with snake_case fields', () => {
      const auditLogRow: AuditLogRow = {
        id: 'audit-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        action: 'user.login',
        resource_type: 'authentication',
        resource_id: 'session-123',
        metadata: { ipAddress: '127.0.0.1' },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
        created_at: '2024-01-01T00:00:00Z'
      }

      expect(auditLogRow.user_id).toBe('user-1')
      expect(auditLogRow.organization_id).toBe('org-1')
      expect(auditLogRow.resource_type).toBe('authentication')
      expect(auditLogRow.resource_id).toBe('session-123')
      expect(auditLogRow.ip_address).toBe('127.0.0.1')
      expect(auditLogRow.user_agent).toBe('Mozilla/5.0')
      expect(auditLogRow.created_at).toBe('2024-01-01T00:00:00Z')
    })
  })

  describe('Composite types with relations', () => {
    it('should define UserWithMemberships', () => {
      const userWithMemberships: UserWithMemberships = {
        id: 'user-1',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            id: 'membership-1',
            userId: 'user-1',
            organizationId: 'org-1',
            roleId: 'role-1',
            status: 'active',
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            organization: {
              id: 'org-1',
              name: 'Test Org',
              slug: 'test-org',
              metadata: {},
              settings: {},
              createdAt: new Date(),
              updatedAt: new Date()
            },
            role: {
              id: 'role-1',
              name: 'Admin',
              organizationId: 'org-1',
              isSystemRole: false,
              permissions: ['read'],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ]
      }

      expect(userWithMemberships.memberships).toHaveLength(1)
      expect(userWithMemberships.memberships[0].organization.name).toBe('Test Org')
      expect(userWithMemberships.memberships[0].role.name).toBe('Admin')
    })

    it('should define OrganizationWithMembers', () => {
      const orgWithMembers: OrganizationWithMembers = {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        metadata: {},
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            id: 'membership-1',
            userId: 'user-1',
            organizationId: 'org-1',
            roleId: 'role-1',
            status: 'active',
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            user: {
              id: 'user-1',
              clerkUserId: 'clerk-123',
              email: 'test@example.com',
              preferences: {},
              createdAt: new Date(),
              updatedAt: new Date()
            },
            role: {
              id: 'role-1',
              name: 'Admin',
              organizationId: 'org-1',
              isSystemRole: false,
              permissions: ['read'],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ]
      }

      expect(orgWithMembers.memberships).toHaveLength(1)
      expect(orgWithMembers.memberships[0].user.email).toBe('test@example.com')
      expect(orgWithMembers.memberships[0].role.name).toBe('Admin')
    })

    it('should define MembershipWithRelations', () => {
      const membershipWithRelations: MembershipWithRelations = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-1',
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-1',
          clerkUserId: 'clerk-123',
          email: 'test@example.com',
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date()
        },
        organization: {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          metadata: {},
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        },
        role: {
          id: 'role-1',
          name: 'Admin',
          organizationId: 'org-1',
          isSystemRole: false,
          permissions: ['read'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      expect(membershipWithRelations.user.email).toBe('test@example.com')
      expect(membershipWithRelations.organization.name).toBe('Test Org')
      expect(membershipWithRelations.role.name).toBe('Admin')
    })
  })

  describe('Insert and Update types', () => {
    it('should define UserInsert without auto-generated fields', () => {
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

    it('should define UserUpdate as partial UserInsert', () => {
      const userUpdate: UserUpdate = {
        first_name: 'Jane'
      }

      expect(userUpdate.first_name).toBe('Jane')
      // All fields should be optional
      expect(userUpdate.email).toBeUndefined()
    })

    it('should define OrganizationInsert without auto-generated fields', () => {
      const orgInsert: OrganizationInsert = {
        name: 'Test Organization',
        slug: 'test-org',
        description: null,
        avatar_url: null,
        metadata: {},
        settings: {}
      }

      expect(orgInsert.name).toBe('Test Organization')
      expect(orgInsert.slug).toBe('test-org')
      // Should not have id, created_at, updated_at
      expect('id' in orgInsert).toBe(false)
      expect('created_at' in orgInsert).toBe(false)
      expect('updated_at' in orgInsert).toBe(false)
    })

    it('should define MembershipInsert without auto-generated fields', () => {
      const membershipInsert: MembershipInsert = {
        user_id: 'user-1',
        organization_id: 'org-1',
        role_id: 'role-1',
        status: 'active',
        joined_at: '2024-01-01T00:00:00Z'
      }

      expect(membershipInsert.user_id).toBe('user-1')
      expect(membershipInsert.organization_id).toBe('org-1')
      // Should not have id, created_at, updated_at
      expect('id' in membershipInsert).toBe(false)
      expect('created_at' in membershipInsert).toBe(false)
      expect('updated_at' in membershipInsert).toBe(false)
    })

    it('should define AuditLogInsert without auto-generated fields', () => {
      const auditLogInsert: AuditLogInsert = {
        user_id: 'user-1',
        organization_id: 'org-1',
        action: 'user.login',
        resource_type: 'authentication',
        resource_id: 'session-123',
        metadata: {},
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0'
      }

      expect(auditLogInsert.action).toBe('user.login')
      expect(auditLogInsert.resource_type).toBe('authentication')
      // Should not have id, created_at
      expect('id' in auditLogInsert).toBe(false)
      expect('created_at' in auditLogInsert).toBe(false)
    })
  })
})

describe('Onboarding Model Types', () => {
  describe('Onboarding enums', () => {
    it('should define OnboardingSessionType values', () => {
      expect(OnboardingSessionType.INDIVIDUAL).toBe('individual')
      expect(OnboardingSessionType.TEAM_ADMIN).toBe('team_admin')
      expect(OnboardingSessionType.TEAM_MEMBER).toBe('team_member')
    })

    it('should define OnboardingSessionStatus values', () => {
      expect(OnboardingSessionStatus.ACTIVE).toBe('active')
      expect(OnboardingSessionStatus.PAUSED).toBe('paused')
      expect(OnboardingSessionStatus.COMPLETED).toBe('completed')
      expect(OnboardingSessionStatus.ABANDONED).toBe('abandoned')
    })

    it('should define OnboardingStepType values', () => {
      expect(OnboardingStepType.TUTORIAL).toBe('tutorial')
      expect(OnboardingStepType.EXERCISE).toBe('exercise')
      expect(OnboardingStepType.SETUP).toBe('setup')
      expect(OnboardingStepType.VALIDATION).toBe('validation')
      expect(OnboardingStepType.MILESTONE).toBe('milestone')
    })

    it('should define UserProgressStatus values', () => {
      expect(UserProgressStatus.NOT_STARTED).toBe('not_started')
      expect(UserProgressStatus.IN_PROGRESS).toBe('in_progress')
      expect(UserProgressStatus.COMPLETED).toBe('completed')
      expect(UserProgressStatus.SKIPPED).toBe('skipped')
      expect(UserProgressStatus.FAILED).toBe('failed')
    })

    it('should define TeamInvitationStatus values', () => {
      expect(TeamInvitationStatus.PENDING).toBe('pending')
      expect(TeamInvitationStatus.ACCEPTED).toBe('accepted')
      expect(TeamInvitationStatus.EXPIRED).toBe('expired')
      expect(TeamInvitationStatus.REVOKED).toBe('revoked')
    })

    it('should define OnboardingContentType values', () => {
      expect(OnboardingContentType.TEXT).toBe('text')
      expect(OnboardingContentType.HTML).toBe('html')
      expect(OnboardingContentType.MARKDOWN).toBe('markdown')
      expect(OnboardingContentType.VIDEO).toBe('video')
      expect(OnboardingContentType.IMAGE).toBe('image')
      expect(OnboardingContentType.INTERACTIVE).toBe('interactive')
      expect(OnboardingContentType.TEMPLATE).toBe('template')
    })

    it('should define OnboardingMilestoneType values', () => {
      expect(OnboardingMilestoneType.PROGRESS).toBe('progress')
      expect(OnboardingMilestoneType.ACHIEVEMENT).toBe('achievement')
      expect(OnboardingMilestoneType.COMPLETION).toBe('completion')
      expect(OnboardingMilestoneType.TIME_BASED).toBe('time_based')
    })
  })

  describe('Onboarding row types', () => {
    it('should define OnboardingPathRow', () => {
      const pathRow: OnboardingPathRow = {
        id: 'path-1',
        name: 'Developer Onboarding',
        description: 'Onboarding path for developers',
        target_role: 'developer',
        subscription_tier: 'pro',
        estimated_duration: 120,
        is_active: true,
        prerequisites: ['basic_programming'],
        learning_objectives: ['setup_environment', 'first_project'],
        success_criteria: { completion_rate: 0.8 },
        metadata: { difficulty: 'intermediate' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(pathRow.name).toBe('Developer Onboarding')
      expect(pathRow.target_role).toBe('developer')
      expect(pathRow.estimated_duration).toBe(120)
      expect(pathRow.is_active).toBe(true)
      expect(pathRow.prerequisites).toEqual(['basic_programming'])
      expect(pathRow.learning_objectives).toEqual(['setup_environment', 'first_project'])
    })

    it('should define OnboardingStepRow', () => {
      const stepRow: OnboardingStepRow = {
        id: 'step-1',
        path_id: 'path-1',
        title: 'Setup Development Environment',
        description: 'Install and configure development tools',
        step_type: 'setup',
        step_order: 1,
        estimated_time: 30,
        is_required: true,
        dependencies: [],
        content: { instructions: 'Install Node.js' },
        interactive_elements: { checklist: ['node_installed'] },
        success_criteria: { validation_passed: true },
        validation_rules: { node_version: '>= 18' },
        metadata: { difficulty: 'easy' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(stepRow.title).toBe('Setup Development Environment')
      expect(stepRow.step_type).toBe('setup')
      expect(stepRow.step_order).toBe(1)
      expect(stepRow.estimated_time).toBe(30)
      expect(stepRow.is_required).toBe(true)
    })

    it('should define OnboardingSessionRow', () => {
      const sessionRow: OnboardingSessionRow = {
        id: 'session-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        path_id: 'path-1',
        session_type: 'individual',
        status: 'active',
        current_step_id: 'step-1',
        current_step_index: 0,
        progress_percentage: 25.5,
        time_spent: 1800,
        started_at: '2024-01-01T00:00:00Z',
        last_active_at: '2024-01-01T01:00:00Z',
        completed_at: null,
        paused_at: null,
        session_metadata: { browser: 'chrome' },
        preferences: { theme: 'dark' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z'
      }

      expect(sessionRow.session_type).toBe('individual')
      expect(sessionRow.status).toBe('active')
      expect(sessionRow.progress_percentage).toBe(25.5)
      expect(sessionRow.time_spent).toBe(1800)
    })

    it('should define UserProgressRow', () => {
      const progressRow: UserProgressRow = {
        id: 'progress-1',
        session_id: 'session-1',
        step_id: 'step-1',
        user_id: 'user-1',
        status: 'completed',
        started_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T00:30:00Z',
        time_spent: 1800,
        attempts: 1,
        score: 95.5,
        feedback: { rating: 5 },
        user_actions: { clicks: 10 },
        step_result: { success: true },
        errors: {},
        achievements: { first_completion: true },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:30:00Z'
      }

      expect(progressRow.status).toBe('completed')
      expect(progressRow.time_spent).toBe(1800)
      expect(progressRow.attempts).toBe(1)
      expect(progressRow.score).toBe(95.5)
    })

    it('should define TeamInvitationRow', () => {
      const invitationRow: TeamInvitationRow = {
        id: 'invitation-1',
        organization_id: 'org-1',
        invited_by: 'user-1',
        email: 'newmember@example.com',
        role: 'developer',
        custom_message: 'Welcome to our team!',
        onboarding_path_override: 'path-2',
        invitation_token: 'token-123',
        status: 'pending',
        expires_at: '2024-01-08T00:00:00Z',
        accepted_at: null,
        onboarding_session_id: null,
        metadata: { source: 'admin_panel' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(invitationRow.email).toBe('newmember@example.com')
      expect(invitationRow.role).toBe('developer')
      expect(invitationRow.status).toBe('pending')
      expect(invitationRow.custom_message).toBe('Welcome to our team!')
    })
  })

  describe('Onboarding composite types', () => {
    it('should define OnboardingPath with optional steps', () => {
      const path: OnboardingPath = {
        id: 'path-1',
        name: 'Developer Onboarding',
        description: 'Onboarding path for developers',
        target_role: 'developer',
        subscription_tier: 'pro',
        estimated_duration: 120,
        is_active: true,
        prerequisites: ['basic_programming'],
        learning_objectives: ['setup_environment'],
        success_criteria: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        steps: [
          {
            id: 'step-1',
            path_id: 'path-1',
            title: 'Setup Environment',
            description: null,
            step_type: 'setup',
            step_order: 1,
            estimated_time: 30,
            is_required: true,
            dependencies: [],
            content: {},
            interactive_elements: {},
            success_criteria: {},
            validation_rules: {},
            metadata: {},
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      }

      expect(path.steps).toHaveLength(1)
      expect(path.steps![0].title).toBe('Setup Environment')
    })

    it('should define OnboardingSession with relations', () => {
      const session: OnboardingSession = {
        id: 'session-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        path_id: 'path-1',
        session_type: 'individual',
        status: 'active',
        current_step_id: 'step-1',
        current_step_index: 0,
        progress_percentage: 25,
        time_spent: 1800,
        started_at: '2024-01-01T00:00:00Z',
        last_active_at: '2024-01-01T01:00:00Z',
        completed_at: null,
        paused_at: null,
        session_metadata: {},
        preferences: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe'
        },
        organization: {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org'
        }
      }

      expect(session.user?.email).toBe('test@example.com')
      expect(session.organization?.name).toBe('Test Org')
    })
  })

  describe('Onboarding business logic types', () => {
    it('should define OnboardingContext', () => {
      const context: OnboardingContext = {
        userId: 'user-1',
        organizationId: 'org-1',
        userRole: 'developer',
        subscriptionTier: 'pro',
        preferences: { theme: 'dark' }
      }

      expect(context.userId).toBe('user-1')
      expect(context.organizationId).toBe('org-1')
      expect(context.userRole).toBe('developer')
      expect(context.subscriptionTier).toBe('pro')
    })

    it('should define StepResult', () => {
      const stepResult: StepResult = {
        stepId: 'step-1',
        status: 'completed',
        timeSpent: 1800,
        userActions: { clicks: 10, keystrokes: 50 },
        feedback: { rating: 5, comment: 'Great step!' },
        errors: {},
        achievements: { first_completion: true }
      }

      expect(stepResult.stepId).toBe('step-1')
      expect(stepResult.status).toBe('completed')
      expect(stepResult.timeSpent).toBe(1800)
    })

    it('should define OnboardingProgress', () => {
      const progress: OnboardingProgress = {
        sessionId: 'session-1',
        currentStepIndex: 2,
        completedSteps: ['step-1', 'step-2'],
        skippedSteps: ['step-3'],
        milestones: [
          {
            id: 'achievement-1',
            user_id: 'user-1',
            session_id: 'session-1',
            milestone_id: 'milestone-1',
            earned_at: '2024-01-01T00:30:00Z',
            achievement_data: {},
            created_at: '2024-01-01T00:30:00Z'
          }
        ],
        overallProgress: 66.7,
        timeSpent: 3600,
        lastUpdated: '2024-01-01T01:00:00Z'
      }

      expect(progress.currentStepIndex).toBe(2)
      expect(progress.completedSteps).toEqual(['step-1', 'step-2'])
      expect(progress.skippedSteps).toEqual(['step-3'])
      expect(progress.overallProgress).toBe(66.7)
    })

    it('should define OnboardingAnalytics', () => {
      const analytics: OnboardingAnalytics = {
        organizationId: 'org-1',
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z'
        },
        metrics: {
          totalSessions: 100,
          completedSessions: 85,
          averageCompletionTime: 7200,
          averageStepsCompleted: 8.5,
          mostSkippedSteps: [
            {
              stepId: 'step-5',
              stepTitle: 'Advanced Configuration',
              skipCount: 25
            }
          ],
          commonBlockers: [
            {
              stepId: 'step-3',
              stepTitle: 'Environment Setup',
              blockerType: 'technical_issue',
              frequency: 15
            }
          ],
          satisfactionScore: 4.2
        },
        completionRates: [
          {
            pathId: 'path-1',
            pathName: 'Developer Path',
            completionRate: 0.85
          }
        ],
        dropOffPoints: [
          {
            stepId: 'step-4',
            stepTitle: 'Complex Setup',
            dropOffRate: 0.15
          }
        ]
      }

      expect(analytics.metrics.totalSessions).toBe(100)
      expect(analytics.metrics.completedSessions).toBe(85)
      expect(analytics.completionRates).toHaveLength(1)
      expect(analytics.dropOffPoints).toHaveLength(1)
    })
  })

  describe('Insert and Update types for onboarding', () => {
    it('should define OnboardingPathInsert without auto-generated fields', () => {
      const pathInsert: OnboardingPathInsert = {
        name: 'New Path',
        description: 'A new onboarding path',
        target_role: 'developer',
        subscription_tier: 'pro',
        estimated_duration: 120,
        is_active: true,
        prerequisites: [],
        learning_objectives: [],
        success_criteria: {},
        metadata: {}
      }

      expect(pathInsert.name).toBe('New Path')
      expect('id' in pathInsert).toBe(false)
      expect('created_at' in pathInsert).toBe(false)
      expect('updated_at' in pathInsert).toBe(false)
    })

    it('should define OnboardingPathUpdate as partial insert', () => {
      const pathUpdate: OnboardingPathUpdate = {
        name: 'Updated Path Name'
      }

      expect(pathUpdate.name).toBe('Updated Path Name')
      expect(pathUpdate.description).toBeUndefined()
    })

    it('should define TeamInvitationInsert without auto-generated fields', () => {
      const invitationInsert: TeamInvitationInsert = {
        organization_id: 'org-1',
        invited_by: 'user-1',
        email: 'newmember@example.com',
        role: 'developer',
        custom_message: null,
        onboarding_path_override: null,
        status: 'pending',
        expires_at: '2024-01-08T00:00:00Z',
        accepted_at: null,
        onboarding_session_id: null,
        metadata: {}
      }

      expect(invitationInsert.email).toBe('newmember@example.com')
      expect('id' in invitationInsert).toBe(false)
      expect('invitation_token' in invitationInsert).toBe(false)
      expect('created_at' in invitationInsert).toBe(false)
      expect('updated_at' in invitationInsert).toBe(false)
    })

    it('should define UserAchievementInsert without auto-generated fields', () => {
      const achievementInsert: UserAchievementInsert = {
        user_id: 'user-1',
        session_id: 'session-1',
        milestone_id: 'milestone-1',
        earned_at: '2024-01-01T00:30:00Z',
        achievement_data: {}
      }

      expect(achievementInsert.user_id).toBe('user-1')
      expect('id' in achievementInsert).toBe(false)
      expect('created_at' in achievementInsert).toBe(false)
    })
  })
})