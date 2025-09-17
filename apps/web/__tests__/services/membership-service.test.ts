/**
 * Membership Service Unit Tests
 * Tests all membership service methods with proper mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/models/database', () => ({
  createTypedSupabaseClient: vi.fn(() => ({
    createInvitation: vi.fn(),
    updateInvitation: vi.fn(),
    getInvitation: vi.fn(),
    getInvitationByToken: vi.fn(),
    getInvitationByOrgAndEmail: vi.fn(),
    getInvitationsByOrganization: vi.fn(),
    createMembership: vi.fn(),
    updateMembership: vi.fn(),
    getMembership: vi.fn(),
    deleteMembership: vi.fn(),
    createAuditLog: vi.fn(),
    getUserByEmail: vi.fn(),
    getOrganization: vi.fn(),
    getRole: vi.fn()
  })),
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string, public code?: string) {
      super(message)
      this.name = 'DatabaseError'
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(resource: string, id: string) {
      super(`${resource} with id ${id} not found`)
      this.name = 'NotFoundError'
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string, public details?: any) {
      super(message)
      this.name = 'ValidationError'
    }
  }
}))

vi.mock('@/lib/services/security-audit-service', () => ({
  securityAuditService: {
    logMembershipEvent: vi.fn(),
    logInvitationEvent: vi.fn()
  }
}))

vi.mock('@/lib/middleware/tenant-isolation', () => ({
  validateServiceTenantAccess: vi.fn(() => Promise.resolve(true))
}))

vi.mock('@/lib/models/schemas', () => ({
  validateCreateMembership: vi.fn((data) => data),
  validateUpdateMembership: vi.fn((data) => data),
  validateCreateInvitation: vi.fn((data) => data),
  validateUpdateInvitation: vi.fn((data) => data)
}))

// Import after mocking
import { membershipService } from '@/lib/services/membership-service'
import { createTypedSupabaseClient } from '@/lib/models/database'

describe('MembershipService', () => {
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Get the mocked database client
    mockDb = createTypedSupabaseClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('inviteUser', () => {
    it('should invite user successfully', async () => {
      const organizationId = 'org-123'
      const email = 'newuser@example.com'
      const roleId = 'role-member'

      const mockInvitation = {
        id: 'invitation-123',
        organizationId,
        email,
        roleId,
        invitedBy: 'user-123',
        token: 'invitation-token',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.createInvitation.mockResolvedValue(mockInvitation)
      mockDb.createAuditLog.mockResolvedValue(undefined)
      mockDb.getInvitationByOrgAndEmail.mockResolvedValue(null) // No existing invitation
      mockDb.getUserByEmail.mockResolvedValue(null) // User doesn't exist yet
      mockDb.getOrganization.mockResolvedValue({ id: organizationId, name: 'Test Org' })
      mockDb.getRole.mockResolvedValue({ id: roleId, name: 'Member' })

      const result = await membershipService.inviteUser({
        organizationId,
        email,
        roleId,
        invitedBy: 'user-123'
      })

      expect(result.data).toEqual(mockInvitation)
      expect(result.error).toBeUndefined()
    })

    it('should handle duplicate invitations', async () => {
      const organizationId = 'org-123'
      const email = 'existing@example.com'
      const roleId = 'role-member'

      const DatabaseError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'DatabaseError'
        }
      }

      vi.spyOn(membershipService['db'], 'createInvitation').mockRejectedValue(
        new DatabaseError('User already invited or is a member')
      )

      const result = await membershipService.inviteUser(organizationId, email, roleId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('User already invited or is a member')
      expect(result.code).toBe('INVITE_USER_ERROR')
    })
  })

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const token = 'invitation-token'
      const userId = 'user-123'

      const mockMembership = {
        id: 'membership-123',
        userId,
        organizationId: 'org-123',
        roleId: 'role-member',
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(membershipService['db'], 'acceptInvitation').mockResolvedValue(mockMembership)
      vi.spyOn(membershipService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await membershipService.acceptInvitation(token)

      expect(result.data).toEqual(mockMembership)
      expect(result.error).toBeUndefined()
    })

    it('should handle invalid invitation tokens', async () => {
      const token = 'invalid-token'

      const NotFoundError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'NotFoundError'
        }
      }

      vi.spyOn(membershipService['db'], 'acceptInvitation').mockRejectedValue(
        new NotFoundError('Invalid or expired invitation token')
      )

      const result = await membershipService.acceptInvitation(token)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Invalid or expired invitation token')
      expect(result.code).toBe('ACCEPT_INVITATION_ERROR')
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role successfully', async () => {
      const organizationId = 'org-123'
      const userId = 'user-456'
      const newRoleId = 'role-admin'

      const updatedMembership = {
        id: 'membership-123',
        userId,
        organizationId,
        roleId: newRoleId,
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(membershipService['db'], 'updateMemberRole').mockResolvedValue(updatedMembership)
      vi.spyOn(membershipService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await membershipService.updateMemberRole(organizationId, userId, newRoleId)

      expect(result.data).toEqual(updatedMembership)
      expect(result.error).toBeUndefined()
    })

    it('should handle member not found', async () => {
      const organizationId = 'org-123'
      const userId = 'nonexistent-user'
      const newRoleId = 'role-admin'

      const NotFoundError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'NotFoundError'
        }
      }

      vi.spyOn(membershipService['db'], 'updateMemberRole').mockRejectedValue(
        new NotFoundError('Member not found in organization')
      )

      const result = await membershipService.updateMemberRole(organizationId, userId, newRoleId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Member not found in organization')
      expect(result.code).toBe('UPDATE_MEMBER_ROLE_ERROR')
    })
  })

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      const organizationId = 'org-123'
      const userId = 'user-456'

      vi.spyOn(membershipService['db'], 'removeMember').mockResolvedValue(undefined)
      vi.spyOn(membershipService['db'], 'createAuditLog').mockResolvedValue(undefined)

      const result = await membershipService.removeMember(organizationId, userId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBeUndefined()
    })

    it('should handle member not found for removal', async () => {
      const organizationId = 'org-123'
      const userId = 'nonexistent-user'

      const NotFoundError = class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'NotFoundError'
        }
      }

      vi.spyOn(membershipService['db'], 'removeMember').mockRejectedValue(
        new NotFoundError('Member not found in organization')
      )

      const result = await membershipService.removeMember(organizationId, userId)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Member not found in organization')
      expect(result.code).toBe('REMOVE_MEMBER_ERROR')
    })
  })

  describe('getOrganizationMembers', () => {
    it('should return organization members', async () => {
      const organizationId = 'org-123'

      const mockMembers = [
        {
          id: 'membership-1',
          userId: 'user-1',
          organizationId,
          roleId: 'role-admin',
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User'
          },
          role: {
            id: 'role-admin',
            name: 'Admin'
          }
        },
        {
          id: 'membership-2',
          userId: 'user-2',
          organizationId,
          roleId: 'role-member',
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-2',
            email: 'member@example.com',
            firstName: 'Member',
            lastName: 'User'
          },
          role: {
            id: 'role-member',
            name: 'Member'
          }
        }
      ]

      vi.spyOn(membershipService['db'], 'getOrganizationMembers').mockResolvedValue(mockMembers)

      const result = await membershipService.getOrganizationMembers(organizationId)

      expect(result.data).toEqual(mockMembers)
      expect(result.data).toHaveLength(2)
      expect(result.error).toBeUndefined()
    })

    it('should return empty array for organization with no members', async () => {
      const organizationId = 'org-empty'

      vi.spyOn(membershipService['db'], 'getOrganizationWithMembers').mockResolvedValue({ members: [] })

      const result = await membershipService.getOrganizationMembers(organizationId)

      expect(result.data).toEqual([])
      expect(result.error).toBeUndefined()
    })
  })
})