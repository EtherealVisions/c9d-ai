/**
 * Unit tests for MembershipService
 * Tests membership management, invitation system, and status management
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { MembershipService } from '../membership-service'
import { createTypedSupabaseClient } from '../../models/database'
import type { Membership, Invitation, User } from '../../models/types'

// Mock the database client
vi.mock('../../models/database', () => ({
  createTypedSupabaseClient: vi.fn(),
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string, public code?: string) {
      super(message)
      this.name = 'DatabaseError'
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ValidationError'
    }
  }
}))

// Mock crypto module
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: vi.fn(() => 'mock-token-123456789abcdef')
    }))
  }
}))

describe('MembershipService', () => {
  let membershipService: MembershipService
  let mockDb: any

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    clerkUserId: 'clerk-user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    preferences: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  const mockMembership: Membership = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    organizationId: '550e8400-e29b-41d4-a716-446655440002',
    roleId: '550e8400-e29b-41d4-a716-446655440003',
    status: 'active',
    joinedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  const mockInvitation: Invitation = {
    id: '550e8400-e29b-41d4-a716-446655440004',
    organizationId: '550e8400-e29b-41d4-a716-446655440002',
    email: 'invite@example.com',
    roleId: '550e8400-e29b-41d4-a716-446655440003',
    invitedBy: '550e8400-e29b-41d4-a716-446655440005',
    token: 'invitation-token-123',
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mock database methods
    mockDb = {
      getMembership: vi.fn(),
      createMembership: vi.fn(),
      updateMembership: vi.fn(),
      deleteMembership: vi.fn(),
      getOrganizationWithMembers: vi.fn(),
      getUserByEmail: vi.fn(),
      getInvitation: vi.fn(),
      getInvitationByToken: vi.fn(),
      getInvitationByOrgAndEmail: vi.fn(),
      getInvitationsByOrganization: vi.fn(),
      createInvitation: vi.fn(),
      updateInvitation: vi.fn(),
      createAuditLog: vi.fn()
    }

    // Mock the database client creation
    ;(createTypedSupabaseClient as Mock).mockReturnValue(mockDb)
    
    membershipService = new MembershipService()
  })

  describe('createMembership', () => {
    it('should create a new membership successfully', async () => {
      // Arrange
      mockDb.getMembership.mockResolvedValue(null) // No existing membership
      mockDb.createMembership.mockResolvedValue(mockMembership)
      mockDb.createAuditLog.mockResolvedValue({})

      const membershipData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        roleId: '550e8400-e29b-41d4-a716-446655440003'
      }

      // Act
      const result = await membershipService.createMembership(membershipData)

      // Assert
      expect(result.data).toEqual(mockMembership)
      expect(result.error).toBeUndefined()
      expect(mockDb.getMembership).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002')
      expect(mockDb.createMembership).toHaveBeenCalledWith({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        roleId: '550e8400-e29b-41d4-a716-446655440003',
        status: 'active',
        joinedAt: expect.any(Date)
      })
      expect(mockDb.createAuditLog).toHaveBeenCalled()
    })

    it('should return error if membership already exists', async () => {
      // Arrange
      mockDb.getMembership.mockResolvedValue(mockMembership)

      const membershipData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        roleId: '550e8400-e29b-41d4-a716-446655440003'
      }

      // Act
      const result = await membershipService.createMembership(membershipData)

      // Assert
      expect(result.error).toBe('User is already a member of this organization')
      expect(result.code).toBe('MEMBERSHIP_EXISTS')
      expect(result.data).toBeUndefined()
      expect(mockDb.createMembership).not.toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      // Arrange
      const membershipData = {
        userId: 'invalid-uuid',
        organizationId: 'org-123',
        roleId: 'role-123'
      }

      // Act
      const result = await membershipService.createMembership(membershipData)

      // Assert
      expect(result.error).toContain('Invalid user ID')
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getMembership', () => {
    it('should get membership successfully', async () => {
      // Arrange
      mockDb.getMembership.mockResolvedValue(mockMembership)

      // Act
      const result = await membershipService.getMembership('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002')

      // Assert
      expect(result.data).toEqual(mockMembership)
      expect(result.error).toBeUndefined()
      expect(mockDb.getMembership).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002')
    })

    it('should return error if membership not found', async () => {
      // Arrange
      mockDb.getMembership.mockResolvedValue(null)

      // Act
      const result = await membershipService.getMembership('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002')

      // Assert
      expect(result.error).toBe('Membership not found')
      expect(result.code).toBe('MEMBERSHIP_NOT_FOUND')
      expect(result.data).toBeUndefined()
    })
  })

  describe('updateMembership', () => {
    it('should update membership successfully', async () => {
      // Arrange
      const updatedMembership = { ...mockMembership, status: 'inactive' as const }
      mockDb.getMembership.mockResolvedValue(mockMembership)
      mockDb.updateMembership.mockResolvedValue(updatedMembership)
      mockDb.createAuditLog.mockResolvedValue({})

      const updateData = { status: 'inactive' as const }

      // Act
      const result = await membershipService.updateMembership(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440002',
        updateData,
        '550e8400-e29b-41d4-a716-446655440006'
      )

      // Assert
      expect(result.data).toEqual(updatedMembership)
      expect(result.error).toBeUndefined()
      expect(mockDb.updateMembership).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', updateData)
      expect(mockDb.createAuditLog).toHaveBeenCalled()
    })

    it('should return error if membership not found', async () => {
      // Arrange
      mockDb.getMembership.mockResolvedValue(null)

      const updateData = { status: 'inactive' as const }

      // Act
      const result = await membershipService.updateMembership(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440002',
        updateData,
        '550e8400-e29b-41d4-a716-446655440006'
      )

      // Assert
      expect(result.error).toBe('Membership not found')
      expect(result.code).toBe('MEMBERSHIP_NOT_FOUND')
      expect(result.data).toBeUndefined()
      expect(mockDb.updateMembership).not.toHaveBeenCalled()
    })
  })

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      // Arrange
      mockDb.getMembership.mockResolvedValue(mockMembership)
      mockDb.deleteMembership.mockResolvedValue(undefined)
      mockDb.createAuditLog.mockResolvedValue({})

      // Act
      const result = await membershipService.removeMember('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440007')

      // Assert
      expect(result.data).toBeUndefined()
      expect(result.error).toBeUndefined()
      expect(mockDb.deleteMembership).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002')
      expect(mockDb.createAuditLog).toHaveBeenCalled()
    })

    it('should return error if membership not found', async () => {
      // Arrange
      mockDb.getMembership.mockResolvedValue(null)

      // Act
      const result = await membershipService.removeMember('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440007')

      // Assert
      expect(result.error).toBe('Membership not found')
      expect(result.code).toBe('MEMBERSHIP_NOT_FOUND')
      expect(mockDb.deleteMembership).not.toHaveBeenCalled()
    })
  })

  describe('getOrganizationMembers', () => {
    it('should get organization members successfully', async () => {
      // Arrange
      const organizationWithMembers = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Test Org',
        slug: 'test-org',
        memberships: [mockMembership]
      }
      mockDb.getOrganizationWithMembers.mockResolvedValue(organizationWithMembers)

      // Act
      const result = await membershipService.getOrganizationMembers('550e8400-e29b-41d4-a716-446655440002')

      // Assert
      expect(result.data).toEqual([mockMembership])
      expect(result.error).toBeUndefined()
      expect(mockDb.getOrganizationWithMembers).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440002')
    })

    it('should return error if organization not found', async () => {
      // Arrange
      mockDb.getOrganizationWithMembers.mockResolvedValue(null)

      // Act
      const result = await membershipService.getOrganizationMembers('550e8400-e29b-41d4-a716-446655440002')

      // Assert
      expect(result.error).toBe('Organization not found')
      expect(result.code).toBe('ORGANIZATION_NOT_FOUND')
      expect(result.data).toBeUndefined()
    })
  })

  describe('inviteUser', () => {
    it('should create invitation successfully', async () => {
      // Arrange
      mockDb.getUserByEmail.mockResolvedValue(null) // User doesn't exist
      mockDb.getInvitationByOrgAndEmail.mockResolvedValue(null) // No existing invitation
      mockDb.createInvitation.mockResolvedValue(mockInvitation)
      mockDb.createAuditLog.mockResolvedValue({})

      const invitationData = {
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        email: 'invite@example.com',
        roleId: '550e8400-e29b-41d4-a716-446655440003',
        invitedBy: '550e8400-e29b-41d4-a716-446655440005'
      }

      // Act
      const result = await membershipService.inviteUser(invitationData)

      // Assert
      expect(result.data).toEqual(mockInvitation)
      expect(result.error).toBeUndefined()
      expect(mockDb.createInvitation).toHaveBeenCalledWith({
        ...invitationData,
        token: 'mock-token-123456789abcdef',
        status: 'pending',
        expiresAt: expect.any(Date)
      })
      expect(mockDb.createAuditLog).toHaveBeenCalled()
    })

    it('should return error if user is already a member', async () => {
      // Arrange
      mockDb.getUserByEmail.mockResolvedValue(mockUser)
      mockDb.getMembership.mockResolvedValue(mockMembership)

      const invitationData = {
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        email: 'test@example.com',
        roleId: '550e8400-e29b-41d4-a716-446655440003',
        invitedBy: '550e8400-e29b-41d4-a716-446655440005'
      }

      // Act
      const result = await membershipService.inviteUser(invitationData)

      // Assert
      expect(result.error).toBe('User is already a member of this organization')
      expect(result.code).toBe('USER_ALREADY_MEMBER')
      expect(result.data).toBeUndefined()
      expect(mockDb.createInvitation).not.toHaveBeenCalled()
    })

    it('should return error if invitation already exists', async () => {
      // Arrange
      mockDb.getUserByEmail.mockResolvedValue(null)
      mockDb.getInvitationByOrgAndEmail.mockResolvedValue(mockInvitation)

      const invitationData = {
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        email: 'invite@example.com',
        roleId: '550e8400-e29b-41d4-a716-446655440003',
        invitedBy: '550e8400-e29b-41d4-a716-446655440005'
      }

      // Act
      const result = await membershipService.inviteUser(invitationData)

      // Assert
      expect(result.error).toBe('User already has a pending invitation to this organization')
      expect(result.code).toBe('INVITATION_EXISTS')
      expect(result.data).toBeUndefined()
      expect(mockDb.createInvitation).not.toHaveBeenCalled()
    })
  })

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      // Arrange
      mockDb.getInvitationByToken.mockResolvedValue(mockInvitation)
      mockDb.getMembership.mockResolvedValue(null) // User not already a member
      mockDb.createMembership.mockResolvedValue(mockMembership)
      mockDb.updateInvitation.mockResolvedValue({ ...mockInvitation, status: 'accepted' })
      mockDb.createAuditLog.mockResolvedValue({})

      // Act
      const result = await membershipService.acceptInvitation('invitation-token-123', '550e8400-e29b-41d4-a716-446655440000')

      // Assert
      expect(result.data).toEqual(mockMembership)
      expect(result.error).toBeUndefined()
      expect(mockDb.createMembership).toHaveBeenCalled()
      expect(mockDb.updateInvitation).toHaveBeenCalledWith(
        mockInvitation.id,
        { status: 'accepted' }
      )
      expect(mockDb.createAuditLog).toHaveBeenCalled()
    })

    it('should return error if invitation token is invalid', async () => {
      // Arrange
      mockDb.getInvitationByToken.mockResolvedValue(null)

      // Act
      const result = await membershipService.acceptInvitation('invalid-token', '550e8400-e29b-41d4-a716-446655440000')

      // Assert
      expect(result.error).toBe('Invalid invitation token')
      expect(result.code).toBe('INVALID_INVITATION_TOKEN')
      expect(result.data).toBeUndefined()
      expect(mockDb.createMembership).not.toHaveBeenCalled()
    })

    it('should return error if invitation is expired', async () => {
      // Arrange
      const expiredInvitation = {
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      }
      mockDb.getInvitationByToken.mockResolvedValue(expiredInvitation)
      mockDb.updateInvitation.mockResolvedValue({ ...expiredInvitation, status: 'expired' })

      // Act
      const result = await membershipService.acceptInvitation('invitation-token-123', '550e8400-e29b-41d4-a716-446655440000')

      // Assert
      expect(result.error).toBe('Invitation has expired')
      expect(result.code).toBe('INVITATION_EXPIRED')
      expect(result.data).toBeUndefined()
      expect(mockDb.updateInvitation).toHaveBeenCalledWith(
        expiredInvitation.id,
        { status: 'expired' }
      )
      expect(mockDb.createMembership).not.toHaveBeenCalled()
    })

    it('should return error if invitation is not pending', async () => {
      // Arrange
      const acceptedInvitation = { ...mockInvitation, status: 'accepted' as const }
      mockDb.getInvitationByToken.mockResolvedValue(acceptedInvitation)

      // Act
      const result = await membershipService.acceptInvitation('invitation-token-123', '550e8400-e29b-41d4-a716-446655440000')

      // Assert
      expect(result.error).toBe('Invitation is no longer valid')
      expect(result.code).toBe('INVITATION_NOT_PENDING')
      expect(result.data).toBeUndefined()
      expect(mockDb.createMembership).not.toHaveBeenCalled()
    })
  })

  describe('revokeInvitation', () => {
    it('should revoke invitation successfully', async () => {
      // Arrange
      mockDb.getInvitation.mockResolvedValue(mockInvitation)
      mockDb.updateInvitation.mockResolvedValue({ ...mockInvitation, status: 'revoked' })
      mockDb.createAuditLog.mockResolvedValue({})

      // Act
      const result = await membershipService.revokeInvitation('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440008')

      // Assert
      expect(result.data).toEqual({ ...mockInvitation, status: 'revoked' })
      expect(result.error).toBeUndefined()
      expect(mockDb.updateInvitation).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440004',
        { status: 'revoked' }
      )
      expect(mockDb.createAuditLog).toHaveBeenCalled()
    })

    it('should return error if invitation not found', async () => {
      // Arrange
      mockDb.getInvitation.mockResolvedValue(null)

      // Act
      const result = await membershipService.revokeInvitation('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440008')

      // Assert
      expect(result.error).toBe('Invitation not found')
      expect(result.code).toBe('INVITATION_NOT_FOUND')
      expect(result.data).toBeUndefined()
      expect(mockDb.updateInvitation).not.toHaveBeenCalled()
    })

    it('should return error if invitation is not pending', async () => {
      // Arrange
      const acceptedInvitation = { ...mockInvitation, status: 'accepted' as const }
      mockDb.getInvitation.mockResolvedValue(acceptedInvitation)

      // Act
      const result = await membershipService.revokeInvitation('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440008')

      // Assert
      expect(result.error).toBe('Only pending invitations can be revoked')
      expect(result.code).toBe('INVITATION_NOT_PENDING')
      expect(result.data).toBeUndefined()
      expect(mockDb.updateInvitation).not.toHaveBeenCalled()
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role successfully', async () => {
      // Arrange
      const updatedMembership = { ...mockMembership, roleId: '550e8400-e29b-41d4-a716-446655440009' }
      mockDb.getMembership.mockResolvedValue(mockMembership)
      mockDb.updateMembership.mockResolvedValue(updatedMembership)
      mockDb.createAuditLog.mockResolvedValue({})

      // Act
      const result = await membershipService.updateMemberRole(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440009',
        '550e8400-e29b-41d4-a716-446655440006'
      )

      // Assert
      expect(result.data).toEqual(updatedMembership)
      expect(result.error).toBeUndefined()
      expect(mockDb.updateMembership).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440002',
        { roleId: '550e8400-e29b-41d4-a716-446655440009' }
      )
    })
  })

  describe('updateMembershipStatus', () => {
    it('should update membership status successfully', async () => {
      // Arrange
      const updatedMembership = { ...mockMembership, status: 'inactive' as const }
      mockDb.getMembership.mockResolvedValue(mockMembership)
      mockDb.updateMembership.mockResolvedValue(updatedMembership)
      mockDb.createAuditLog.mockResolvedValue({})

      // Act
      const result = await membershipService.updateMembershipStatus(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440002',
        'inactive',
        '550e8400-e29b-41d4-a716-446655440006'
      )

      // Assert
      expect(result.data).toEqual(updatedMembership)
      expect(result.error).toBeUndefined()
      expect(mockDb.updateMembership).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440002',
        { status: 'inactive' }
      )
    })
  })
})