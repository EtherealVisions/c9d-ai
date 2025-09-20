/**
 * Simplified test suite for MembershipService
 * Tests the actual methods that exist in the service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { membershipService } from '../membership-service'
import type { CreateMembershipData, UpdateMembershipData } from '../membership-service'

// Mock the database
vi.mock('../../models/database', () => ({
  createTypedSupabaseClient: vi.fn(() => ({
    createMembership: vi.fn(),
    getMembership: vi.fn(),
    updateMembership: vi.fn(),
    deleteMembership: vi.fn(),
    getOrganizationWithMembers: vi.fn()
  })),
  DatabaseError: class extends Error {},
  NotFoundError: class extends Error {},
  ValidationError: class extends Error {}
}))

// Mock the schemas
vi.mock('../../models/schemas', () => ({
  validateCreateMembership: vi.fn((data) => data),
  validateUpdateMembership: vi.fn((data) => data),
  validateCreateInvitation: vi.fn((data) => data),
  validateUpdateInvitation: vi.fn((data) => data)
}))

describe('MembershipService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createMembership', () => {
    it('should create membership successfully', async () => {
      const membershipData: CreateMembershipData = {
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-1'
      }

      // Mock successful creation
      const mockDb = (membershipService as any).db
      mockDb.createMembership = vi.fn().mockResolvedValue({
        id: 'membership-1',
        ...membershipData,
        status: 'active',
        joinedAt: new Date()
      })

      const result = await membershipService.createMembership(membershipData)

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    it('should handle creation errors', async () => {
      const membershipData: CreateMembershipData = {
        userId: 'user-1',
        organizationId: 'org-1',
        roleId: 'role-1'
      }

      // Mock database error
      const mockDb = (membershipService as any).db
      mockDb.createMembership = vi.fn().mockRejectedValue(new Error('Database error'))

      const result = await membershipService.createMembership(membershipData)

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })
  })

  describe('getMembership', () => {
    it('should get membership successfully', async () => {
      const userId = 'user-1'
      const organizationId = 'org-1'

      // Mock successful retrieval
      const mockDb = (membershipService as any).db
      mockDb.getMembership = vi.fn().mockResolvedValue({
        id: 'membership-1',
        userId,
        organizationId,
        roleId: 'role-1',
        status: 'active'
      })

      const result = await membershipService.getMembership(userId, organizationId)

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    it('should handle not found errors', async () => {
      const userId = 'user-1'
      const organizationId = 'org-1'

      // Mock not found
      const mockDb = (membershipService as any).db
      mockDb.getMembership = vi.fn().mockResolvedValue(null)

      const result = await membershipService.getMembership(userId, organizationId)

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })
  })

  describe('updateMembership', () => {
    it('should update membership successfully', async () => {
      const userId = 'user-1'
      const organizationId = 'org-1'
      const updateData: UpdateMembershipData = {
        roleId: 'role-2'
      }

      // Mock successful update
      const mockDb = (membershipService as any).db
      mockDb.updateMembership = vi.fn().mockResolvedValue({
        id: 'membership-1',
        userId,
        organizationId,
        roleId: 'role-2',
        status: 'active'
      })

      const result = await membershipService.updateMembership(userId, organizationId, updateData, 'admin-1')

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()
    })
  })

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      const userId = 'user-1'
      const organizationId = 'org-1'
      const removedBy = 'admin-1'

      // Mock successful removal
      const mockDb = (membershipService as any).db
      mockDb.deleteMembership = vi.fn().mockResolvedValue(true)

      const result = await membershipService.removeMember(userId, organizationId, removedBy)

      expect(result.data).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('getOrganizationMembers', () => {
    it('should get organization members successfully', async () => {
      const organizationId = 'org-1'

      // Mock successful retrieval
      const mockDb = (membershipService as any).db
      mockDb.getOrganizationWithMembers = vi.fn().mockResolvedValue({
        id: organizationId,
        members: [
          { id: 'membership-1', userId: 'user-1', roleId: 'role-1' },
          { id: 'membership-2', userId: 'user-2', roleId: 'role-2' }
        ]
      })

      const result = await membershipService.getOrganizationMembers(organizationId)

      expect(result.data).toBeDefined()
      expect(result.error).toBeUndefined()
    })
  })
})