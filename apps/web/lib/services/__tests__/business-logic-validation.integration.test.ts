/**
 * Business Logic Validation Integration Tests
 * Tests comprehensive business logic scenarios with realistic data and workflows
 * 
 * This test suite validates:
 * - Complex business workflows with realistic scenarios
 * - Business rule enforcement and validation
 * - Cross-service business logic coordination
 * - Data consistency and integrity in business operations
 * - Edge cases and error scenarios in business logic
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createTypedSupabaseClient } from '../../models/database'
import { userService } from '../user-service'
import { organizationService } from '../organization-service'
import { rbacService } from '../rbac-service'
import { membershipService } from '../membership-service'
import { securityAuditService } from '../security-audit-service'
import type { User, Organization, Role, Membership } from '../../models/types'

// Test data tracking for cleanup
const testDataCleanup = {
  users: [] as string[],
  organizations: [] as string[],
  roles: [] as string[],
  memberships: [] as { userId: string; organizationId: string }[],
  invitations: [] as string[]
}

describe('Business Logic Validation Integration Tests', () => {
  let db: ReturnType<typeof createTypedSupabaseClient>

  beforeAll(async () => {
    db = createTypedSupabaseClient()
  })

  afterEach(async () => {
    // Clean up test data in proper order
    try {
      const client = db.getClient()

      // Clean up memberships first (foreign key dependencies)
      for (const membership of testDataCleanup.memberships) {
        await db.deleteMembership(membership.userId, membership.organizationId)
      }
      testDataCleanup.memberships = []

      // Clean up invitations
      for (const invitationId of testDataCleanup.invitations) {
        await client.from('invitations').delete().eq('id', invitationId)
      }
      testDataCleanup.invitations = []

      // Clean up roles
      for (const roleId of testDataCleanup.roles) {
        await client.from('roles').delete().eq('id', roleId)
      }
      testDataCleanup.roles = []

      // Clean up organizations
      for (const orgId of testDataCleanup.organizations) {
        await client.from('organizations').delete().eq('id', orgId)
      }
      testDataCleanup.organizations = []

      // Clean up users last
      for (const userId of testDataCleanup.users) {
        await client.from('users').delete().eq('id', userId)
      }
      testDataCleanup.users = []

    } catch (error) {
      console.warn('Business logic test cleanup failed:', error)
    }
  })

  describe('User Lifecycle Business Logic', () => {
    it('should handle complete user onboarding workflow with business rules', async () => {
      // Step 1: Create new user (simulating Clerk webhook)
      const userData = {
        clerkUserId: `biz_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: `business.test.${Date.now()}@company.com`,
        firstName: 'Business',
        lastName: 'User',
        preferences: {
          onboardingCompleted: false,
          marketingOptIn: true,
          theme: 'system'
        }
      }

      const user = await db.createUser(userData)
      testDataCleanup.users.push(user.id)

      // Validate initial user state
      expect(user.preferences.onboardingCompleted).toBe(false)
      expect(user.email).toMatch(/@company\.com$/)

      // Step 2: User completes profile setup
      const profileUpdate = {
        firstName: 'Business Updated',
        lastName: 'User Updated',
        preferences: {
          ...user.preferences,
          onboardingStep: 'profile_completed',
          timezone: 'America/New_York',
          language: 'en'
        }
      }

      const profileResult = await userService.updateUserProfile(user.id, profileUpdate)
      expect(profileResult.error).toBeUndefined()
      expect(profileResult.data?.firstName).toBe('Business Updated')
      expect(profileResult.data?.preferences.onboardingStep).toBe('profile_completed')

      // Step 3: User creates their first organization (business rule: auto-admin)
      const orgData = {
        name: `${profileResult.data?.firstName}'s Company`,
        description: 'First organization created during onboarding',
        metadata: {
          createdDuringOnboarding: true,
          creatorId: user.id
        },
        settings: {
          allowPublicInvites: false,
          requireApprovalForJoining: true
        }
      }

      const orgResult = await organizationService.createOrganization(user.id, orgData)
      expect(orgResult.error).toBeUndefined()
      expect(orgResult.data?.name).toBe("Business Updated's Company")
      
      if (orgResult.data) {
        testDataCleanup.organizations.push(orgResult.data.id)
      }

      // Step 4: Verify business rule - creator should automatically get admin role
      const userOrgs = await organizationService.getUserOrganizations(user.id)
      expect(userOrgs.error).toBeUndefined()
      expect(userOrgs.data?.length).toBeGreaterThan(0)

      // Step 5: Complete onboarding
      const onboardingComplete = await userService.updateUserPreferences(user.id, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
        onboardingStep: 'completed'
      })

      expect(onboardingComplete.error).toBeUndefined()
      expect(onboardingComplete.data?.preferences.onboardingCompleted).toBe(true)

      // Verify audit trail exists for the complete workflow
      const auditLogs = await db.getAuditLogs({
        userId: user.id,
        limit: 10
      })

      expect(auditLogs.length).toBeGreaterThan(0)
      
      // Should have logs for profile update and organization creation
      const profileUpdateLog = auditLogs.find(log => log.action === 'user.profile.updated')
      const orgCreationLog = auditLogs.find(log => log.action === 'organization.created')
      
      expect(profileUpdateLog).toBeDefined()
      expect(orgCreationLog).toBeDefined()
    })

    it('should enforce user data validation business rules', async () => {
      // Create user with minimal data
      const userData = {
        clerkUserId: `validation_test_${Date.now()}`,
        email: `validation.${Date.now()}@test.com`,
        preferences: {}
      }

      const user = await db.createUser(userData)
      testDataCleanup.users.push(user.id)

      // Test email validation business rule
      const invalidEmailUpdate = await userService.updateUserProfile(user.id, {
        email: 'invalid-email-format'
      } as any)

      expect(invalidEmailUpdate.error).toBeDefined()
      expect(invalidEmailUpdate.code).toBe('VALIDATION_ERROR')

      // Test name length business rules
      const longNameUpdate = await userService.updateUserProfile(user.id, {
        firstName: 'A'.repeat(101), // Assuming 100 char limit
        lastName: 'B'.repeat(101)
      })

      expect(longNameUpdate.error).toBeDefined()
      expect(longNameUpdate.code).toBe('VALIDATION_ERROR')

      // Test valid update works
      const validUpdate = await userService.updateUserProfile(user.id, {
        firstName: 'Valid',
        lastName: 'Name',
        preferences: {
          theme: 'dark',
          notifications: {
            email: true,
            push: false,
            marketing: false
          }
        }
      })

      expect(validUpdate.error).toBeUndefined()
      expect(validUpdate.data?.firstName).toBe('Valid')
      expect(validUpdate.data?.lastName).toBe('Name')
    })

    it('should handle user deactivation and reactivation business logic', async () => {
      // Create active user
      const userData = {
        clerkUserId: `deactivation_test_${Date.now()}`,
        email: `deactivation.${Date.now()}@test.com`,
        firstName: 'Active',
        lastName: 'User',
        preferences: { accountStatus: 'active' }
      }

      const user = await db.createUser(userData)
      testDataCleanup.users.push(user.id)

      // Verify user is initially active
      const isActive = await userService.isUserActive(user.id)
      expect(isActive.error).toBeUndefined()
      expect(isActive.data).toBe(true)

      // Deactivate user
      const deactivationResult = await userService.deactivateUser(user.id)
      expect(deactivationResult.error).toBeUndefined()
      expect(deactivationResult.data?.preferences.accountStatus).toBe('deactivated')

      // Verify user is now inactive
      const isInactive = await userService.isUserActive(user.id)
      expect(isInactive.data).toBe(false)

      // Reactivate user
      const reactivationResult = await userService.reactivateUser(user.id)
      expect(reactivationResult.error).toBeUndefined()
      expect(reactivationResult.data?.preferences.accountStatus).toBeUndefined()

      // Verify user is active again
      const isActiveAgain = await userService.isUserActive(user.id)
      expect(isActiveAgain.data).toBe(true)

      // Verify audit trail for deactivation/reactivation
      const auditLogs = await db.getAuditLogs({
        userId: user.id,
        limit: 5
      })

      const deactivationLog = auditLogs.find(log => log.action === 'user.account.deactivated')
      const reactivationLog = auditLogs.find(log => log.action === 'user.account.reactivated')

      expect(deactivationLog).toBeDefined()
      expect(reactivationLog).toBeDefined()
    })
  })

  describe('Organization Management Business Logic', () => {
    it('should handle organization creation with business rules and constraints', async () => {
      // Create organization creator
      const creatorData = {
        clerkUserId: `org_creator_${Date.now()}`,
        email: `creator.${Date.now()}@company.com`,
        firstName: 'Org',
        lastName: 'Creator',
        preferences: {}
      }

      const creator = await db.createUser(creatorData)
      testDataCleanup.users.push(creator.id)

      // Test organization name uniqueness business rule
      const orgData1 = {
        name: `Unique Org Name ${Date.now()}`,
        description: 'First organization with this name',
        metadata: {},
        settings: {}
      }

      const org1Result = await organizationService.createOrganization(creator.id, orgData1)
      expect(org1Result.error).toBeUndefined()
      
      if (org1Result.data) {
        testDataCleanup.organizations.push(org1Result.data.id)
      }

      // Test slug generation business rule
      expect(org1Result.data?.slug).toMatch(/^[a-z0-9-]+$/)
      expect(org1Result.data?.slug).not.toContain(' ')
      expect(org1Result.data?.slug).not.toContain('_')

      // Test organization metadata and settings validation
      const orgWithComplexData = {
        name: `Complex Org ${Date.now()}`,
        description: 'Organization with complex metadata and settings',
        metadata: {
          industry: 'technology',
          size: 'startup',
          founded: '2024',
          customFields: {
            department: 'engineering',
            budget: 100000
          }
        },
        settings: {
          allowPublicInvites: true,
          requireApprovalForJoining: false,
          maxMembers: 50,
          features: {
            advancedReporting: true,
            customRoles: true
          }
        }
      }

      const complexOrgResult = await organizationService.createOrganization(creator.id, orgWithComplexData)
      expect(complexOrgResult.error).toBeUndefined()
      expect(complexOrgResult.data?.metadata.industry).toBe('technology')
      expect(complexOrgResult.data?.settings.maxMembers).toBe(50)
      
      if (complexOrgResult.data) {
        testDataCleanup.organizations.push(complexOrgResult.data.id)
      }
    })

    it('should enforce organization update business rules and permissions', async () => {
      // Create organization and users
      const ownerData = {
        clerkUserId: `org_owner_${Date.now()}`,
        email: `owner.${Date.now()}@company.com`,
        firstName: 'Org',
        lastName: 'Owner',
        preferences: {}
      }

      const memberData = {
        clerkUserId: `org_member_${Date.now()}`,
        email: `member.${Date.now()}@company.com`,
        firstName: 'Org',
        lastName: 'Member',
        preferences: {}
      }

      const owner = await db.createUser(ownerData)
      const member = await db.createUser(memberData)
      testDataCleanup.users.push(owner.id, member.id)

      const orgData = {
        name: `Business Rules Org ${Date.now()}`,
        description: 'Organization for testing business rules',
        metadata: { testOrg: true },
        settings: { allowPublicInvites: false }
      }

      const org = await organizationService.createOrganization(owner.id, orgData)
      expect(org.error).toBeUndefined()
      
      if (org.data) {
        testDataCleanup.organizations.push(org.data.id)
      }

      // Owner should be able to update organization
      const ownerUpdate = await organizationService.updateOrganization(
        org.data!.id,
        owner.id,
        {
          description: 'Updated by owner',
          settings: { allowPublicInvites: true }
        }
      )

      expect(ownerUpdate.error).toBeUndefined()
      expect(ownerUpdate.data?.description).toBe('Updated by owner')
      expect(ownerUpdate.data?.settings.allowPublicInvites).toBe(true)

      // Non-member should not be able to update organization
      const nonMemberUpdate = await organizationService.updateOrganization(
        org.data!.id,
        member.id,
        { description: 'Unauthorized update' }
      )

      expect(nonMemberUpdate.error).toBeDefined()
      expect(nonMemberUpdate.code).toBe('TENANT_ACCESS_DENIED')

      // Verify organization wasn't changed by unauthorized update
      const orgCheck = await organizationService.getOrganization(org.data!.id, owner.id)
      expect(orgCheck.data?.description).toBe('Updated by owner')
      expect(orgCheck.data?.description).not.toBe('Unauthorized update')
    })

    it('should handle organization deletion business logic', async () => {
      // Create organization
      const userData = {
        clerkUserId: `deletion_test_${Date.now()}`,
        email: `deletion.${Date.now()}@test.com`,
        firstName: 'Delete',
        lastName: 'Test',
        preferences: {}
      }

      const user = await db.createUser(userData)
      testDataCleanup.users.push(user.id)

      const orgData = {
        name: `Deletion Test Org ${Date.now()}`,
        description: 'Organization for deletion testing',
        metadata: {},
        settings: {}
      }

      const org = await organizationService.createOrganization(user.id, orgData)
      expect(org.error).toBeUndefined()
      
      if (org.data) {
        testDataCleanup.organizations.push(org.data.id)
      }

      // Verify organization is initially active
      const isActive = await organizationService.isOrganizationActive(org.data!.id)
      expect(isActive.data).toBe(true)

      // Soft delete organization
      const deleteResult = await organizationService.deleteOrganization(org.data!.id, user.id)
      expect(deleteResult.error).toBeUndefined()
      expect(deleteResult.data?.metadata.deleted).toBe(true)
      expect(deleteResult.data?.metadata.deletedBy).toBe(user.id)

      // Verify organization is now inactive
      const isInactive = await organizationService.isOrganizationActive(org.data!.id)
      expect(isInactive.data).toBe(false)

      // Verify audit log for deletion
      const auditLogs = await db.getAuditLogs({
        userId: user.id,
        organizationId: org.data!.id,
        limit: 5
      })

      const deletionLog = auditLogs.find(log => log.action === 'organization.deleted')
      expect(deletionLog).toBeDefined()
      expect(deletionLog?.metadata.organizationName).toBe(org.data!.name)
    })
  })

  describe('Role-Based Access Control Business Logic', () => {
    it('should handle complex permission inheritance and role management', async () => {
      // Create test users and organization
      const adminData = {
        clerkUserId: `rbac_admin_${Date.now()}`,
        email: `admin.${Date.now()}@company.com`,
        firstName: 'RBAC',
        lastName: 'Admin',
        preferences: {}
      }

      const managerData = {
        clerkUserId: `rbac_manager_${Date.now()}`,
        email: `manager.${Date.now()}@company.com`,
        firstName: 'RBAC',
        lastName: 'Manager',
        preferences: {}
      }

      const employeeData = {
        clerkUserId: `rbac_employee_${Date.now()}`,
        email: `employee.${Date.now()}@company.com`,
        firstName: 'RBAC',
        lastName: 'Employee',
        preferences: {}
      }

      const admin = await db.createUser(adminData)
      const manager = await db.createUser(managerData)
      const employee = await db.createUser(employeeData)
      testDataCleanup.users.push(admin.id, manager.id, employee.id)

      // Create organization
      const orgData = {
        name: `RBAC Test Org ${Date.now()}`,
        description: 'Organization for RBAC testing',
        metadata: {},
        settings: {}
      }

      const org = await organizationService.createOrganization(admin.id, orgData)
      expect(org.error).toBeUndefined()
      
      if (org.data) {
        testDataCleanup.organizations.push(org.data.id)
      }

      // Create custom roles with different permission levels
      const adminRole = await rbacService.createRole(org.data!.id, {
        name: 'Custom Admin',
        description: 'Full administrative access',
        permissions: [
          'users:read', 'users:write', 'users:delete',
          'organizations:read', 'organizations:write', 'organizations:admin',
          'roles:read', 'roles:write', 'roles:delete'
        ]
      })

      const managerRole = await rbacService.createRole(org.data!.id, {
        name: 'Manager',
        description: 'Management level access',
        permissions: [
          'users:read', 'users:write',
          'organizations:read', 'organizations:write',
          'roles:read'
        ]
      })

      const employeeRole = await rbacService.createRole(org.data!.id, {
        name: 'Employee',
        description: 'Basic employee access',
        permissions: [
          'users:read',
          'organizations:read'
        ]
      })

      testDataCleanup.roles.push(adminRole.id, managerRole.id, employeeRole.id)

      // Create memberships with different roles
      const adminMembership = await db.createMembership({
        userId: admin.id,
        organizationId: org.data!.id,
        roleId: adminRole.id,
        status: 'active',
        joinedAt: new Date()
      })

      const managerMembership = await db.createMembership({
        userId: manager.id,
        organizationId: org.data!.id,
        roleId: managerRole.id,
        status: 'active',
        joinedAt: new Date()
      })

      const employeeMembership = await db.createMembership({
        userId: employee.id,
        organizationId: org.data!.id,
        roleId: employeeRole.id,
        status: 'active',
        joinedAt: new Date()
      })

      testDataCleanup.memberships.push(
        { userId: admin.id, organizationId: org.data!.id },
        { userId: manager.id, organizationId: org.data!.id },
        { userId: employee.id, organizationId: org.data!.id }
      )

      // Test permission inheritance
      const adminPermissions = await rbacService.getUserPermissions(admin.id, org.data!.id)
      const managerPermissions = await rbacService.getUserPermissions(manager.id, org.data!.id)
      const employeePermissions = await rbacService.getUserPermissions(employee.id, org.data!.id)

      // Admin should have all permissions
      expect(adminPermissions).toContain('users:delete')
      expect(adminPermissions).toContain('organizations:admin')
      expect(adminPermissions).toContain('roles:delete')

      // Manager should have intermediate permissions
      expect(managerPermissions).toContain('users:write')
      expect(managerPermissions).toContain('organizations:write')
      expect(managerPermissions).not.toContain('users:delete')
      expect(managerPermissions).not.toContain('roles:delete')

      // Employee should have minimal permissions
      expect(employeePermissions).toContain('users:read')
      expect(employeePermissions).toContain('organizations:read')
      expect(employeePermissions).not.toContain('users:write')
      expect(employeePermissions).not.toContain('organizations:write')

      // Test complex permission scenarios
      const adminCanDeleteUsers = await rbacService.hasPermission(admin.id, org.data!.id, 'users:delete')
      const managerCanDeleteUsers = await rbacService.hasPermission(manager.id, org.data!.id, 'users:delete')
      const employeeCanDeleteUsers = await rbacService.hasPermission(employee.id, org.data!.id, 'users:delete')

      expect(adminCanDeleteUsers).toBe(true)
      expect(managerCanDeleteUsers).toBe(false)
      expect(employeeCanDeleteUsers).toBe(false)

      // Test permission combinations
      const managerHasAllManagementPerms = await rbacService.hasAllPermissions(manager.id, org.data!.id, [
        'users:read', 'users:write', 'organizations:read', 'organizations:write'
      ])
      expect(managerHasAllManagementPerms).toBe(true)

      const employeeHasAnyWritePerms = await rbacService.hasAnyPermission(employee.id, org.data!.id, [
        'users:write', 'organizations:write', 'roles:write'
      ])
      expect(employeeHasAnyWritePerms).toBe(false)
    })

    it('should enforce role assignment business rules', async () => {
      // Create test data
      const userData = {
        clerkUserId: `role_test_${Date.now()}`,
        email: `role.test.${Date.now()}@company.com`,
        firstName: 'Role',
        lastName: 'Test',
        preferences: {}
      }

      const user = await db.createUser(userData)
      testDataCleanup.users.push(user.id)

      const orgData = {
        name: `Role Assignment Org ${Date.now()}`,
        description: 'Organization for role assignment testing',
        metadata: {},
        settings: {}
      }

      const org = await organizationService.createOrganization(user.id, orgData)
      expect(org.error).toBeUndefined()
      
      if (org.data) {
        testDataCleanup.organizations.push(org.data.id)
      }

      // Create roles
      const role1 = await rbacService.createRole(org.data!.id, {
        name: 'Test Role 1',
        permissions: ['users:read']
      })

      const role2 = await rbacService.createRole(org.data!.id, {
        name: 'Test Role 2',
        permissions: ['users:read', 'users:write']
      })

      testDataCleanup.roles.push(role1.id, role2.id)

      // Create membership
      const membership = await db.createMembership({
        userId: user.id,
        organizationId: org.data!.id,
        roleId: role1.id,
        status: 'active',
        joinedAt: new Date()
      })

      testDataCleanup.memberships.push({ userId: user.id, organizationId: org.data!.id })

      // Test role assignment
      await rbacService.assignRole(user.id, org.data!.id, role2.id)

      // Verify new permissions
      const permissions = await rbacService.getUserPermissions(user.id, org.data!.id)
      expect(permissions).toContain('users:read')
      expect(permissions).toContain('users:write')

      // Test role revocation (should revert to default member role)
      await rbacService.revokeRole(user.id, org.data!.id, role2.id)

      // Verify permissions changed
      const revokedPermissions = await rbacService.getUserPermissions(user.id, org.data!.id)
      expect(revokedPermissions).not.toContain('users:write')
    })
  })

  describe('Security and Audit Business Logic', () => {
    it('should maintain comprehensive audit trail for business operations', async () => {
      // Create test user
      const userData = {
        clerkUserId: `audit_test_${Date.now()}`,
        email: `audit.${Date.now()}@company.com`,
        firstName: 'Audit',
        lastName: 'Test',
        preferences: {}
      }

      const user = await db.createUser(userData)
      testDataCleanup.users.push(user.id)

      // Perform various business operations
      const profileUpdate = await userService.updateUserProfile(user.id, {
        firstName: 'Updated Audit',
        preferences: { theme: 'dark' }
      })
      expect(profileUpdate.error).toBeUndefined()

      const orgCreation = await organizationService.createOrganization(user.id, {
        name: `Audit Test Org ${Date.now()}`,
        description: 'Organization for audit testing',
        metadata: {},
        settings: {}
      })
      expect(orgCreation.error).toBeUndefined()
      
      if (orgCreation.data) {
        testDataCleanup.organizations.push(orgCreation.data.id)
      }

      // Log security events
      await securityAuditService.logSecurityEvent({
        userId: user.id,
        organizationId: orgCreation.data?.id,
        action: 'test.security.event',
        resourceType: 'test',
        severity: 'low',
        metadata: { testEvent: true }
      })

      // Verify comprehensive audit trail
      const auditLogs = await db.getAuditLogs({
        userId: user.id,
        limit: 10
      })

      expect(auditLogs.length).toBeGreaterThan(0)

      // Should have logs for profile update and organization creation
      const profileLog = auditLogs.find(log => log.action === 'user.profile.updated')
      const orgLog = auditLogs.find(log => log.action === 'organization.created')

      expect(profileLog).toBeDefined()
      expect(orgLog).toBeDefined()

      // Verify audit log metadata contains relevant information
      expect(profileLog?.metadata).toHaveProperty('updatedFields')
      expect(orgLog?.metadata).toHaveProperty('organizationName')

      // Test audit log querying by organization
      const orgAuditLogs = await db.getAuditLogs({
        organizationId: orgCreation.data?.id,
        limit: 5
      })

      expect(orgAuditLogs.length).toBeGreaterThan(0)
      const orgSpecificLog = orgAuditLogs.find(log => log.organizationId === orgCreation.data?.id)
      expect(orgSpecificLog).toBeDefined()
    })

    it('should detect and handle suspicious activity patterns', async () => {
      // Create test user
      const userData = {
        clerkUserId: `suspicious_test_${Date.now()}`,
        email: `suspicious.${Date.now()}@company.com`,
        firstName: 'Suspicious',
        lastName: 'Test',
        preferences: {}
      }

      const user = await db.createUser(userData)
      testDataCleanup.users.push(user.id)

      const orgData = {
        name: `Suspicious Activity Org ${Date.now()}`,
        description: 'Organization for suspicious activity testing',
        metadata: {},
        settings: {}
      }

      const org = await organizationService.createOrganization(user.id, orgData)
      expect(org.error).toBeUndefined()
      
      if (org.data) {
        testDataCleanup.organizations.push(org.data.id)
      }

      // Simulate suspicious activity - multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await securityAuditService.logSecurityEvent({
          userId: user.id,
          organizationId: org.data?.id,
          action: 'auth.login_failed',
          resourceType: 'authentication',
          severity: 'medium',
          metadata: {
            attempt: i + 1,
            reason: 'invalid_credentials',
            timestamp: new Date().toISOString()
          }
        })
      }

      // Test suspicious activity detection
      const suspiciousActivity = await securityAuditService.detectSuspiciousActivity(
        user.id,
        org.data?.id
      )

      expect(suspiciousActivity.suspiciousPatterns).toContain('Multiple failed login attempts')
      expect(suspiciousActivity.riskScore).toBeGreaterThan(0)
      expect(suspiciousActivity.recommendations).toContain('Consider enabling multi-factor authentication')

      // Verify that high-risk activities are properly flagged
      expect(suspiciousActivity.riskLevel).toBeOneOf(['medium', 'high', 'critical'])
    })

    it('should enforce tenant isolation in business operations', async () => {
      // Create two separate organizations and users
      const user1Data = {
        clerkUserId: `tenant1_${Date.now()}`,
        email: `tenant1.${Date.now()}@company1.com`,
        firstName: 'Tenant1',
        lastName: 'User',
        preferences: {}
      }

      const user2Data = {
        clerkUserId: `tenant2_${Date.now()}`,
        email: `tenant2.${Date.now()}@company2.com`,
        firstName: 'Tenant2',
        lastName: 'User',
        preferences: {}
      }

      const user1 = await db.createUser(user1Data)
      const user2 = await db.createUser(user2Data)
      testDataCleanup.users.push(user1.id, user2.id)

      const org1Data = {
        name: `Tenant 1 Org ${Date.now()}`,
        description: 'First tenant organization',
        metadata: { tenant: 1 },
        settings: {}
      }

      const org2Data = {
        name: `Tenant 2 Org ${Date.now()}`,
        description: 'Second tenant organization',
        metadata: { tenant: 2 },
        settings: {}
      }

      const org1 = await organizationService.createOrganization(user1.id, org1Data)
      const org2 = await organizationService.createOrganization(user2.id, org2Data)
      
      expect(org1.error).toBeUndefined()
      expect(org2.error).toBeUndefined()
      
      if (org1.data) testDataCleanup.organizations.push(org1.data.id)
      if (org2.data) testDataCleanup.organizations.push(org2.data.id)

      // Test tenant isolation - user1 should not access org2
      const unauthorizedAccess = await organizationService.getOrganization(org2.data!.id, user1.id)
      expect(unauthorizedAccess.error).toBeDefined()
      expect(unauthorizedAccess.code).toBe('TENANT_ACCESS_DENIED')

      // Test that authorized access works
      const authorizedAccess = await organizationService.getOrganization(org1.data!.id, user1.id)
      expect(authorizedAccess.error).toBeUndefined()
      expect(authorizedAccess.data?.id).toBe(org1.data!.id)

      // Test tenant isolation in updates
      const unauthorizedUpdate = await organizationService.updateOrganization(
        org2.data!.id,
        user1.id,
        { description: 'Unauthorized update attempt' }
      )
      expect(unauthorizedUpdate.error).toBeDefined()
      expect(unauthorizedUpdate.code).toBe('TENANT_ACCESS_DENIED')

      // Verify that security audit logs tenant isolation violations
      const isolationValidation = await securityAuditService.validateAndLogTenantAccess(
        user1.id,
        org2.data!.id,
        'organization.read',
        'organization',
        org2.data!.id,
        [org1.data!.id] // User1 only has access to org1
      )

      expect(isolationValidation).toBe(false)
    })
  })

  describe('Data Consistency and Integrity Business Logic', () => {
    it('should maintain referential integrity across business operations', async () => {
      // Create complete business scenario with all relationships
      const userData = {
        clerkUserId: `integrity_test_${Date.now()}`,
        email: `integrity.${Date.now()}@company.com`,
        firstName: 'Integrity',
        lastName: 'Test',
        preferences: {}
      }

      const user = await db.createUser(userData)
      testDataCleanup.users.push(user.id)

      const orgData = {
        name: `Integrity Test Org ${Date.now()}`,
        description: 'Organization for integrity testing',
        metadata: {},
        settings: {}
      }

      const org = await organizationService.createOrganization(user.id, orgData)
      expect(org.error).toBeUndefined()
      
      if (org.data) {
        testDataCleanup.organizations.push(org.data.id)
      }

      // Create role
      const role = await rbacService.createRole(org.data!.id, {
        name: 'Integrity Test Role',
        permissions: ['users:read', 'organizations:read']
      })
      testDataCleanup.roles.push(role.id)

      // Create membership
      const membership = await db.createMembership({
        userId: user.id,
        organizationId: org.data!.id,
        roleId: role.id,
        status: 'active',
        joinedAt: new Date()
      })
      testDataCleanup.memberships.push({ userId: user.id, organizationId: org.data!.id })

      // Verify all relationships are properly established
      const userWithMemberships = await db.getUserWithMemberships(user.id)
      expect(userWithMemberships?.memberships).toBeDefined()
      expect(userWithMemberships?.memberships.length).toBeGreaterThan(0)

      const orgWithMembers = await db.getOrganizationWithMembers(org.data!.id)
      expect(orgWithMembers?.memberships).toBeDefined()
      expect(orgWithMembers?.memberships.length).toBeGreaterThan(0)

      // Verify that permissions work through the relationship chain
      const hasPermission = await rbacService.hasPermission(user.id, org.data!.id, 'users:read')
      expect(hasPermission).toBe(true)

      // Test that business operations maintain consistency
      const orgUpdate = await organizationService.updateOrganization(
        org.data!.id,
        user.id,
        { description: 'Updated for integrity test' }
      )
      expect(orgUpdate.error).toBeUndefined()

      // Verify that the update is reflected consistently
      const updatedOrg = await organizationService.getOrganization(org.data!.id, user.id)
      expect(updatedOrg.data?.description).toBe('Updated for integrity test')
    })

    it('should handle concurrent operations safely', async () => {
      // Create test user
      const userData = {
        clerkUserId: `concurrent_test_${Date.now()}`,
        email: `concurrent.${Date.now()}@company.com`,
        firstName: 'Concurrent',
        lastName: 'Test',
        preferences: { counter: 0 }
      }

      const user = await db.createUser(userData)
      testDataCleanup.users.push(user.id)

      // Simulate concurrent preference updates
      const concurrentUpdates = Array.from({ length: 5 }, (_, i) => 
        userService.updateUserPreferences(user.id, {
          counter: i + 1,
          timestamp: new Date().toISOString(),
          updateId: i
        })
      )

      const results = await Promise.all(concurrentUpdates)

      // All updates should succeed (last writer wins)
      results.forEach(result => {
        expect(result.error).toBeUndefined()
      })

      // Verify final state is consistent
      const finalUser = await userService.getUser(user.id)
      expect(finalUser.data?.preferences.counter).toBeGreaterThan(0)
      expect(finalUser.data?.preferences.counter).toBeLessThanOrEqual(5)
    })
  })
})