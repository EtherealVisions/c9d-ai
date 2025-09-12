/**
 * End-to-End Tests for User Registration, Organization Creation, and Role Management
 * Tests complete user flows from registration through organization management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createTypedSupabaseClient } from '@/lib/models/database'
import { organizationService } from '@/lib/services/organization-service'
import { membershipService } from '@/lib/services/membership-service'
import { userService } from '@/lib/services/user-service'

// Mock external dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  clerkClient: {
    users: {
      getUser: vi.fn(),
      updateUser: vi.fn()
    }
  }
}))

vi.mock('@/lib/models/database', () => ({
  createTypedSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn()
    })),
    rpc: vi.fn()
  })),
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ValidationError'
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'NotFoundError'
    }
  },
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'DatabaseError'
    }
  }
}))

describe('End-to-End User Organization Flow', () => {
  let mockSupabase: any
  let mockAuth: any
  let mockCurrentUser: any
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    mockSupabase = createTypedSupabaseClient()
    mockAuth = vi.mocked(require('@clerk/nextjs/server').auth)
    mockCurrentUser = vi.mocked(require('@clerk/nextjs/server').currentUser)
    user = userEvent.setup()
    
    // Set up proper mock chain for Supabase
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn()
    }
    
    mockSupabase.from.mockReturnValue(mockChain)
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete User Registration Flow', () => {
    it('should complete user registration and create first organization', async () => {
      const newUserData = {
        clerkUserId: 'clerk_new_user_123',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }

      // Step 1: User signs up with Clerk
      mockAuth.mockReturnValue({ userId: newUserData.clerkUserId })
      mockCurrentUser.mockResolvedValue({
        id: newUserData.clerkUserId,
        emailAddresses: [{ emailAddress: newUserData.email }],
        firstName: newUserData.firstName,
        lastName: newUserData.lastName
      })

      // Step 2: User doesn't exist in database yet
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // Not found
      })

      // Step 3: Create user in database
      const createdUser = {
        id: 'user-new-123',
        clerk_user_id: newUserData.clerkUserId,
        email: newUserData.email,
        first_name: newUserData.firstName,
        last_name: newUserData.lastName,
        created_at: new Date(),
        updated_at: new Date()
      }

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: createdUser,
        error: null
      })

      // Step 4: Create first organization
      const firstOrganization = {
        id: 'org-first-123',
        name: 'John\'s Organization',
        slug: 'johns-organization',
        created_at: new Date(),
        updated_at: new Date()
      }

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: firstOrganization,
        error: null
      })

      // Step 5: Create owner membership
      const ownerMembership = {
        id: 'membership-owner-123',
        user_id: createdUser.id,
        organization_id: firstOrganization.id,
        role_id: 'role-owner',
        status: 'active',
        created_at: new Date()
      }

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: ownerMembership,
        error: null
      })

      // Execute the flow
      const userResult = await userService.getCurrentUser()
      expect(userResult.success).toBe(true)
      expect(userResult.data?.email).toBe(newUserData.email)

      const orgResult = await organizationService.createOrganization({
        name: 'John\'s Organization',
        description: 'My first organization'
      }, createdUser.id)

      expect(orgResult.success).toBe(true)
      expect(orgResult.data?.name).toBe('John\'s Organization')

      // Verify owner membership was created
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: createdUser.id,
          organization_id: firstOrganization.id,
          role_id: expect.stringContaining('owner')
        })
      )
    })

    it('should handle registration errors gracefully', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk_user_123' })
      mockCurrentUser.mockResolvedValue({
        id: 'clerk_user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }]
      })

      // Simulate database error during user creation
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const result = await userService.getCurrentUser()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database connection failed')
    })
  })

  describe('Organization Creation and Management Flow', () => {
    it('should create organization and set up initial roles', async () => {
      const userId = 'user-123'
      const organizationData = {
        name: 'Test Company',
        description: 'A test organization',
        settings: {
          allowPublicSignup: false,
          requireApproval: true
        }
      }

      // Mock organization creation
      const createdOrg = {
        id: 'org-123',
        name: organizationData.name,
        slug: 'test-company',
        description: organizationData.description,
        settings: organizationData.settings,
        created_at: new Date(),
        updated_at: new Date()
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: createdOrg,
        error: null
      })

      // Mock owner membership creation
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: {
          id: 'membership-123',
          user_id: userId,
          organization_id: createdOrg.id,
          role_id: 'role-owner',
          status: 'active'
        },
        error: null
      })

      const result = await organizationService.createOrganization(organizationData, userId)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe(organizationData.name)
      expect(result.data?.slug).toBe('test-company')

      // Verify organization was created with correct settings
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: organizationData.name,
          description: organizationData.description,
          settings: organizationData.settings
        })
      )
    })

    it('should handle organization name conflicts', async () => {
      const userId = 'user-123'
      const organizationData = {
        name: 'Existing Company',
        description: 'This name already exists'
      }

      // Mock organization creation failure due to unique constraint
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { 
          code: '23505', // Unique constraint violation
          message: 'duplicate key value violates unique constraint'
        }
      })

      const result = await organizationService.createOrganization(organizationData, userId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Organization name already exists')
    })
  })

  describe('Member Invitation and Role Management Flow', () => {
    it('should complete member invitation flow', async () => {
      const organizationId = 'org-123'
      const inviterUserId = 'user-owner'
      const inviteeEmail = 'newmember@example.com'
      const roleId = 'role-member'

      // Step 1: Create invitation
      const invitation = {
        id: 'invitation-123',
        organization_id: organizationId,
        email: inviteeEmail,
        role_id: roleId,
        invited_by: inviterUserId,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        created_at: new Date()
      }

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: invitation,
        error: null
      })

      const inviteResult = await membershipService.inviteUser({
        organizationId,
        email: inviteeEmail,
        roleId,
        invitedBy: inviterUserId
      })

      expect(inviteResult.success).toBe(true)
      expect(inviteResult.data?.email).toBe(inviteeEmail)

      // Step 2: User accepts invitation
      const acceptingUserId = 'user-new-member'
      
      // Mock invitation lookup
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: invitation,
        error: null
      })

      // Mock membership creation
      const membership = {
        id: 'membership-new',
        user_id: acceptingUserId,
        organization_id: organizationId,
        role_id: roleId,
        status: 'active',
        created_at: new Date()
      }

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: membership,
        error: null
      })

      // Mock invitation status update
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { ...invitation, status: 'accepted' },
        error: null
      })

      const acceptResult = await membershipService.acceptInvitation(
        invitation.id,
        acceptingUserId
      )

      expect(acceptResult.success).toBe(true)
      expect(acceptResult.data?.status).toBe('active')

      // Verify invitation was marked as accepted
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'accepted' })
      )
    })

    it('should handle role changes for existing members', async () => {
      const organizationId = 'org-123'
      const memberId = 'user-member'
      const oldRoleId = 'role-member'
      const newRoleId = 'role-admin'

      // Mock current membership
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          id: 'membership-123',
          user_id: memberId,
          organization_id: organizationId,
          role_id: oldRoleId,
          status: 'active'
        },
        error: null
      })

      // Mock role update
      mockSupabase.from().update().eq().eq().select().single.mockResolvedValue({
        data: {
          id: 'membership-123',
          user_id: memberId,
          organization_id: organizationId,
          role_id: newRoleId,
          status: 'active'
        },
        error: null
      })

      const result = await membershipService.updateMemberRole(
        organizationId,
        memberId,
        newRoleId
      )

      expect(result.success).toBe(true)
      expect(result.data?.roleId).toBe(newRoleId)

      // Verify role was updated
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({ role_id: newRoleId })
      )
    })

    it('should prevent unauthorized role changes', async () => {
      const organizationId = 'org-123'
      const memberId = 'user-member'
      const newRoleId = 'role-owner'
      const requestingUserId = 'user-regular-member'

      // Mock requesting user's membership (regular member, not admin)
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: {
          id: 'membership-requester',
          user_id: requestingUserId,
          organization_id: organizationId,
          role_id: 'role-member',
          status: 'active'
        },
        error: null
      })

      const result = await membershipService.updateMemberRole(
        organizationId,
        memberId,
        newRoleId,
        requestingUserId
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient permissions')
    })
  })

  describe('Organization Context Switching Flow', () => {
    it('should switch between multiple organizations', async () => {
      const userId = 'user-123'
      const org1Id = 'org-456'
      const org2Id = 'org-789'

      // Mock user's organizations
      const userOrganizations = [
        {
          id: 'membership-1',
          user_id: userId,
          organization_id: org1Id,
          role_id: 'role-admin',
          status: 'active',
          organization: {
            id: org1Id,
            name: 'First Organization',
            slug: 'first-org'
          }
        },
        {
          id: 'membership-2',
          user_id: userId,
          organization_id: org2Id,
          role_id: 'role-member',
          status: 'active',
          organization: {
            id: org2Id,
            name: 'Second Organization',
            slug: 'second-org'
          }
        }
      ]

      mockSupabase.from().select().eq().mockResolvedValue({
        data: userOrganizations,
        error: null
      })

      const organizations = await organizationService.getUserOrganizations(userId)

      expect(organizations.success).toBe(true)
      expect(organizations.data).toHaveLength(2)

      // Test context switching
      const firstOrg = organizations.data?.[0]
      const secondOrg = organizations.data?.[1]

      expect(firstOrg?.name).toBe('First Organization')
      expect(secondOrg?.name).toBe('Second Organization')

      // Verify different permissions in different contexts
      // This would typically be handled by the frontend context provider
      expect(firstOrg?.role).toBe('admin')
      expect(secondOrg?.role).toBe('member')
    })

    it('should handle organization access revocation', async () => {
      const userId = 'user-123'
      const organizationId = 'org-456'

      // Mock revoked access (membership not found or inactive)
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found
      })

      const result = await organizationService.getOrganization(organizationId, userId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Access denied')
    })
  })

  describe('Complete User Journey Integration', () => {
    it('should complete full user journey from signup to organization management', async () => {
      // This test simulates a complete user journey
      const journeyData = {
        user: {
          clerkUserId: 'clerk_journey_user',
          email: 'journey@example.com',
          firstName: 'Journey',
          lastName: 'User'
        },
        organization: {
          name: 'Journey Company',
          description: 'End-to-end test organization'
        },
        invitee: {
          email: 'teammate@example.com',
          roleId: 'role-admin'
        }
      }

      // Step 1: User registration
      mockAuth.mockReturnValue({ userId: journeyData.user.clerkUserId })
      mockCurrentUser.mockResolvedValue({
        id: journeyData.user.clerkUserId,
        emailAddresses: [{ emailAddress: journeyData.user.email }],
        firstName: journeyData.user.firstName,
        lastName: journeyData.user.lastName
      })

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({
          data: {
            id: 'user-journey',
            clerk_user_id: journeyData.user.clerkUserId,
            email: journeyData.user.email
          },
          error: null
        })

      mockSupabase.from().insert().select().single
        .mockResolvedValueOnce({
          data: {
            id: 'user-journey',
            clerk_user_id: journeyData.user.clerkUserId,
            email: journeyData.user.email
          },
          error: null
        })

      const userResult = await userService.getCurrentUser()
      expect(userResult.success).toBe(true)

      // Step 2: Organization creation
      mockSupabase.from().insert().select().single
        .mockResolvedValueOnce({
          data: {
            id: 'org-journey',
            name: journeyData.organization.name,
            slug: 'journey-company'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'membership-owner',
            user_id: 'user-journey',
            organization_id: 'org-journey',
            role_id: 'role-owner'
          },
          error: null
        })

      const orgResult = await organizationService.createOrganization(
        journeyData.organization,
        'user-journey'
      )
      expect(orgResult.success).toBe(true)

      // Step 3: Invite team member
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: {
          id: 'invitation-journey',
          organization_id: 'org-journey',
          email: journeyData.invitee.email,
          role_id: journeyData.invitee.roleId
        },
        error: null
      })

      const inviteResult = await membershipService.inviteUser({
        organizationId: 'org-journey',
        email: journeyData.invitee.email,
        roleId: journeyData.invitee.roleId,
        invitedBy: 'user-journey'
      })
      expect(inviteResult.success).toBe(true)

      // Step 4: Verify organization management capabilities
      mockSupabase.from().select().eq().mockResolvedValue({
        data: [
          {
            id: 'membership-owner',
            user_id: 'user-journey',
            organization_id: 'org-journey',
            role_id: 'role-owner',
            organization: { name: journeyData.organization.name }
          }
        ],
        error: null
      })

      const userOrgs = await organizationService.getUserOrganizations('user-journey')
      expect(userOrgs.success).toBe(true)
      expect(userOrgs.data).toHaveLength(1)
      expect(userOrgs.data?.[0].name).toBe(journeyData.organization.name)

      console.log('✅ Complete user journey test passed')
    })
  })
})