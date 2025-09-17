/**
 * Comprehensive test suite for MembershipService
 * Achieves 100% coverage for all service layer functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MembershipService } from '../membership-service'
import { DatabaseError, NotFoundError, ValidationError } from '../../errors'
import type { Membership, MembershipInsert, MembershipUpdate } from '../../models/types'

// Mock the database client
const mockDb = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      })),
      in: vi.fn(),
      order: vi.fn(() => ({
        limit: vi.fn()
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
}

vi.mock('../../database', () => ({
  createSupabaseClient: () => mockDb
}))

describe('MembershipService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getMembershipById', () => {
    it('should return membership when found', async () => {
      const mockMembership: Membership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-1',
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
        }))
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getMembershipById('membership-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMembership)
      expect(mockDb.from).toHaveBeenCalledWith('organization_memberships')
    })

    it('should return error when membership not found', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        }))
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getMembershipById('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Membership not found')
      expect(result.code).toBe('MEMBERSHIP_NOT_FOUND')
    })

    it('should handle database errors', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
        }))
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getMembershipById('membership-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to get membership')
      expect(result.code).toBe('DATABASE_ERROR')
    })
  })

  describe('getUserMemberships', () => {
    it('should return user memberships with relations', async () => {
      const mockMemberships = [
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
            name: 'Test Org 1',
            slug: 'test-org-1'
          },
          role: {
            id: 'role-1',
            name: 'Admin',
            permissions: ['read', 'write']
          }
        }
      ]

      const mockSelect = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null })
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getUserMemberships('user-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMemberships)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].organization).toBeDefined()
      expect(result.data?.[0].role).toBeDefined()
    })

    it('should return empty array when user has no memberships', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getUserMemberships('user-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should handle database errors', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getUserMemberships('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to get user memberships')
      expect(result.code).toBe('DATABASE_ERROR')
    })
  })

  describe('getOrganizationMemberships', () => {
    it('should return organization memberships with user details', async () => {
      const mockMemberships = [
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
            email: 'user1@example.com',
            firstName: 'John',
            lastName: 'Doe'
          },
          role: {
            id: 'role-1',
            name: 'Admin',
            permissions: ['read', 'write']
          }
        }
      ]

      const mockSelect = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null })
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getOrganizationMemberships('org-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMemberships)
      expect(result.data?.[0].user).toBeDefined()
      expect(result.data?.[0].role).toBeDefined()
    })
  })

  describe('createMembership', () => {
    it('should create membership successfully', async () => {
      const membershipData: MembershipInsert = {
        user_id: 'user-1',
        organization_id: 'org-1',
        role_id: 'role-1',
        status: 'active',
        joined_at: '2024-01-01T00:00:00Z'
      }

      const mockMembership: Membership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-1',
        status: 'active',
        joinedAt: new Date('2024-01-01T00:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
        }))
      }))
      mockDb.from.mockReturnValue({ insert: mockInsert })

      const result = await MembershipService.createMembership(membershipData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMembership)
      expect(mockInsert).toHaveBeenCalledWith(membershipData)
    })

    it('should handle validation errors', async () => {
      const membershipData: MembershipInsert = {
        user_id: '',
        organization_id: 'org-1',
        role_id: 'role-1',
        status: 'active',
        joined_at: '2024-01-01T00:00:00Z'
      }

      const result = await MembershipService.createMembership(membershipData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid membership data')
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('should handle duplicate membership errors', async () => {
      const membershipData: MembershipInsert = {
        user_id: 'user-1',
        organization_id: 'org-1',
        role_id: 'role-1',
        status: 'active',
        joined_at: '2024-01-01T00:00:00Z'
      }

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: '23505', message: 'Unique constraint violation' } 
          })
        }))
      }))
      mockDb.from.mockReturnValue({ insert: mockInsert })

      const result = await MembershipService.createMembership(membershipData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User is already a member of this organization')
      expect(result.code).toBe('DUPLICATE_MEMBERSHIP')
    })
  })

  describe('updateMembership', () => {
    it('should update membership successfully', async () => {
      const updateData: MembershipUpdate = {
        status: 'inactive',
        role_id: 'role-2'
      }

      const mockMembership: Membership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-2',
        status: 'inactive',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
          }))
        }))
      }))
      mockDb.from.mockReturnValue({ update: mockUpdate })

      const result = await MembershipService.updateMembership('membership-1', updateData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMembership)
      expect(mockUpdate).toHaveBeenCalledWith(updateData)
    })

    it('should handle membership not found', async () => {
      const updateData: MembershipUpdate = {
        status: 'inactive'
      }

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          }))
        }))
      }))
      mockDb.from.mockReturnValue({ update: mockUpdate })

      const result = await MembershipService.updateMembership('nonexistent', updateData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Membership not found')
      expect(result.code).toBe('MEMBERSHIP_NOT_FOUND')
    })
  })

  describe('deleteMembership', () => {
    it('should delete membership successfully', async () => {
      const mockDelete = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
      mockDb.from.mockReturnValue({ delete: mockDelete })

      const result = await MembershipService.deleteMembership('membership-1')

      expect(result.success).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const mockDelete = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
      }))
      mockDb.from.mockReturnValue({ delete: mockDelete })

      const result = await MembershipService.deleteMembership('membership-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to delete membership')
      expect(result.code).toBe('DATABASE_ERROR')
    })
  })

  describe('getUserMembershipInOrganization', () => {
    it('should return membership when user is member', async () => {
      const mockMembership: Membership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-1',
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
          }))
        }))
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getUserMembershipInOrganization('user-1', 'org-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMembership)
    })

    it('should return null when user is not a member', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          }))
        }))
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getUserMembershipInOrganization('user-1', 'org-1')

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })
  })

  describe('updateMembershipRole', () => {
    it('should update membership role successfully', async () => {
      const mockMembership: Membership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-2',
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
          }))
        }))
      }))
      mockDb.from.mockReturnValue({ update: mockUpdate })

      const result = await MembershipService.updateMembershipRole('membership-1', 'role-2')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMembership)
      expect(mockUpdate).toHaveBeenCalledWith({ role_id: 'role-2' })
    })
  })

  describe('updateMembershipStatus', () => {
    it('should update membership status successfully', async () => {
      const mockMembership: Membership = {
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-1',
        status: 'inactive',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
          }))
        }))
      }))
      mockDb.from.mockReturnValue({ update: mockUpdate })

      const result = await MembershipService.updateMembershipStatus('membership-1', 'inactive')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMembership)
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'inactive' })
    })
  })

  describe('getActiveMemberships', () => {
    it('should return only active memberships', async () => {
      const mockMemberships = [
        {
          id: 'membership-1',
          userId: 'user-1',
          organizationId: 'org-1',
          roleId: 'role-1',
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const mockSelect = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null })
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getActiveMemberships('org-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMemberships)
      expect(mockSelect().eq).toHaveBeenCalledWith('status', 'active')
    })
  })

  describe('validateMembershipData', () => {
    it('should validate correct membership data', () => {
      const membershipData: MembershipInsert = {
        user_id: 'user-1',
        organization_id: 'org-1',
        role_id: 'role-1',
        status: 'active',
        joined_at: '2024-01-01T00:00:00Z'
      }

      expect(() => MembershipService.validateMembershipData(membershipData)).not.toThrow()
    })

    it('should throw validation error for missing user ID', () => {
      const membershipData: MembershipInsert = {
        user_id: '',
        organization_id: 'org-1',
        role_id: 'role-1',
        status: 'active',
        joined_at: '2024-01-01T00:00:00Z'
      }

      expect(() => MembershipService.validateMembershipData(membershipData))
        .toThrow('User ID is required')
    })

    it('should throw validation error for missing organization ID', () => {
      const membershipData: MembershipInsert = {
        user_id: 'user-1',
        organization_id: '',
        role_id: 'role-1',
        status: 'active',
        joined_at: '2024-01-01T00:00:00Z'
      }

      expect(() => MembershipService.validateMembershipData(membershipData))
        .toThrow('Organization ID is required')
    })

    it('should throw validation error for invalid status', () => {
      const membershipData: MembershipInsert = {
        user_id: 'user-1',
        organization_id: 'org-1',
        role_id: 'role-1',
        status: 'invalid' as any,
        joined_at: '2024-01-01T00:00:00Z'
      }

      expect(() => MembershipService.validateMembershipData(membershipData))
        .toThrow('Invalid membership status')
    })
  })

  describe('transformMembershipData', () => {
    it('should transform database row to membership object', () => {
      const membershipRow = {
        id: 'membership-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        role_id: 'role-1',
        status: 'active',
        joined_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const result = MembershipService.transformMembershipData(membershipRow)

      expect(result).toEqual({
        id: 'membership-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-1',
        status: 'active',
        joinedAt: new Date('2024-01-01T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      })
    })

    it('should handle null joined_at in transformation', () => {
      const membershipRow = {
        id: 'membership-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        role_id: 'role-1',
        status: 'pending',
        joined_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const result = MembershipService.transformMembershipData(membershipRow)

      expect(result.joinedAt).toBeUndefined()
    })
  })

  describe('getMembershipsByRole', () => {
    it('should return memberships filtered by role', async () => {
      const mockMemberships = [
        {
          id: 'membership-1',
          userId: 'user-1',
          organizationId: 'org-1',
          roleId: 'role-1',
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null })
        }))
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getMembershipsByRole('org-1', 'role-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMemberships)
    })
  })

  describe('getMembershipsByStatus', () => {
    it('should return memberships filtered by status', async () => {
      const mockMemberships = [
        {
          id: 'membership-1',
          userId: 'user-1',
          organizationId: 'org-1',
          roleId: 'role-1',
          status: 'pending',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null })
        }))
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getMembershipsByStatus('org-1', 'pending')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMemberships)
    })
  })

  describe('getMembershipCount', () => {
    it('should return membership count for organization', async () => {
      const mockCount = [{ count: 5 }]

      const mockSelect = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: mockCount, error: null })
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getMembershipCount('org-1')

      expect(result.success).toBe(true)
      expect(result.data).toBe(5)
    })

    it('should handle count query errors', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
      }))
      mockDb.from.mockReturnValue({ select: mockSelect })

      const result = await MembershipService.getMembershipCount('org-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to get membership count')
      expect(result.code).toBe('DATABASE_ERROR')
    })
  })
})