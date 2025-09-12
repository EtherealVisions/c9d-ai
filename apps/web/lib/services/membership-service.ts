/**
 * MembershipService - Comprehensive membership management service
 * Provides operations for managing user-organization relationships, invitations, and membership status
 */

import { createTypedSupabaseClient, DatabaseError, NotFoundError, ValidationError } from '../models/database'
import { validateCreateMembership, validateUpdateMembership, validateCreateInvitation, validateUpdateInvitation } from '../models/schemas'
import type { Membership, Invitation, MembershipStatus, InvitationStatus } from '../models/types'
import crypto from 'crypto'

export interface CreateMembershipData {
  userId: string
  organizationId: string
  roleId: string
  status?: MembershipStatus
  joinedAt?: Date
}

export interface UpdateMembershipData {
  roleId?: string
  status?: MembershipStatus
}

export interface CreateInvitationData {
  organizationId: string
  email: string
  roleId: string
  invitedBy: string
  expiresAt?: Date
}

export interface MembershipServiceResult<T> {
  data?: T
  error?: string
  code?: string
}

export class MembershipService {
  private db = createTypedSupabaseClient()

  /**
   * Create a new membership for a user in an organization
   */
  async createMembership(
    membershipData: CreateMembershipData
  ): Promise<MembershipServiceResult<Membership>> {
    try {
      // Validate the membership data
      const validatedData = validateCreateMembership({
        ...membershipData,
        status: membershipData.status || 'active',
        joinedAt: membershipData.joinedAt || new Date()
      })

      // Check if membership already exists
      const existingMembership = await this.db.getMembership(
        validatedData.userId,
        validatedData.organizationId
      )

      if (existingMembership) {
        return {
          error: 'User is already a member of this organization',
          code: 'MEMBERSHIP_EXISTS'
        }
      }

      // Create the membership
      const membership = await this.db.createMembership(validatedData)

      // Log the membership creation
      await this.logMembershipActivity(
        validatedData.userId,
        validatedData.organizationId,
        'membership.created',
        'membership',
        membership.id,
        {
          userId: validatedData.userId,
          organizationId: validatedData.organizationId,
          roleId: validatedData.roleId,
          status: validatedData.status
        }
      )

      return { data: membership }
    } catch (error) {
      console.error('Error creating membership:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: 'VALIDATION_ERROR'
        }
      }

      // Check if it's a Zod validation error
      if (error && typeof error === 'object' && 'issues' in error) {
        return {
          error: JSON.stringify(error.issues || error.errors || []),
          code: 'VALIDATION_ERROR'
        }
      }

      if (error instanceof DatabaseError && error.message.includes('foreign key')) {
        return {
          error: 'Invalid user, organization, or role ID',
          code: 'INVALID_REFERENCE'
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to create membership',
        code: 'CREATE_MEMBERSHIP_ERROR'
      }
    }
  }

  /**
   * Get membership by user and organization
   */
  async getMembership(
    userId: string,
    organizationId: string
  ): Promise<MembershipServiceResult<Membership>> {
    try {
      const membership = await this.db.getMembership(userId, organizationId)
      
      if (!membership) {
        return {
          error: 'Membership not found',
          code: 'MEMBERSHIP_NOT_FOUND'
        }
      }

      return { data: membership }
    } catch (error) {
      console.error('Error getting membership:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get membership',
        code: 'GET_MEMBERSHIP_ERROR'
      }
    }
  }

  /**
   * Update membership information
   */
  async updateMembership(
    userId: string,
    organizationId: string,
    updateData: UpdateMembershipData,
    updatedBy: string
  ): Promise<MembershipServiceResult<Membership>> {
    try {
      // Validate the update data
      const validatedData = validateUpdateMembership(updateData)

      // Check if membership exists
      const existingMembership = await this.db.getMembership(userId, organizationId)
      if (!existingMembership) {
        return {
          error: 'Membership not found',
          code: 'MEMBERSHIP_NOT_FOUND'
        }
      }

      // Update the membership
      const updatedMembership = await this.db.updateMembership(userId, organizationId, validatedData)

      // Log the membership update
      await this.logMembershipActivity(
        updatedBy,
        organizationId,
        'membership.updated',
        'membership',
        updatedMembership.id,
        {
          targetUserId: userId,
          updatedFields: Object.keys(updateData),
          previousValues: {
            roleId: existingMembership.roleId,
            status: existingMembership.status
          },
          newValues: validatedData
        }
      )

      return { data: updatedMembership }
    } catch (error) {
      console.error('Error updating membership:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: 'VALIDATION_ERROR'
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to update membership',
        code: 'UPDATE_MEMBERSHIP_ERROR'
      }
    }
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(
    userId: string,
    organizationId: string,
    removedBy: string
  ): Promise<MembershipServiceResult<void>> {
    try {
      // Check if membership exists
      const existingMembership = await this.db.getMembership(userId, organizationId)
      if (!existingMembership) {
        return {
          error: 'Membership not found',
          code: 'MEMBERSHIP_NOT_FOUND'
        }
      }

      // Delete the membership
      await this.db.deleteMembership(userId, organizationId)

      // Log the membership removal
      await this.logMembershipActivity(
        removedBy,
        organizationId,
        'membership.removed',
        'membership',
        existingMembership.id,
        {
          targetUserId: userId,
          previousMembership: {
            roleId: existingMembership.roleId,
            status: existingMembership.status,
            joinedAt: existingMembership.joinedAt
          }
        }
      )

      return { data: undefined }
    } catch (error) {
      console.error('Error removing member:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to remove member',
        code: 'REMOVE_MEMBER_ERROR'
      }
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    userId: string,
    organizationId: string,
    roleId: string,
    updatedBy: string
  ): Promise<MembershipServiceResult<Membership>> {
    return this.updateMembership(
      userId,
      organizationId,
      { roleId },
      updatedBy
    )
  }

  /**
   * Update membership status
   */
  async updateMembershipStatus(
    userId: string,
    organizationId: string,
    status: MembershipStatus,
    updatedBy: string
  ): Promise<MembershipServiceResult<Membership>> {
    return this.updateMembership(
      userId,
      organizationId,
      { status },
      updatedBy
    )
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string): Promise<MembershipServiceResult<any>> {
    try {
      const organizationWithMembers = await this.db.getOrganizationWithMembers(organizationId)
      
      if (!organizationWithMembers) {
        return {
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        }
      }

      return { data: organizationWithMembers.memberships }
    } catch (error) {
      console.error('Error getting organization members:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get organization members',
        code: 'GET_ORGANIZATION_MEMBERS_ERROR'
      }
    }
  }

  /**
   * Create an invitation to join an organization
   */
  async inviteUser(
    invitationData: CreateInvitationData
  ): Promise<MembershipServiceResult<Invitation>> {
    try {
      // Generate secure token
      const token = this.generateInvitationToken()
      
      // Set default expiration to 7 days from now
      const expiresAt = invitationData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      // Validate the invitation data
      const validatedData = validateCreateInvitation({
        ...invitationData,
        expiresAt
      })

      // Check if user is already a member
      const existingUser = await this.db.getUserByEmail(validatedData.email)
      if (existingUser) {
        const existingMembership = await this.db.getMembership(
          existingUser.id,
          validatedData.organizationId
        )
        
        if (existingMembership) {
          return {
            error: 'User is already a member of this organization',
            code: 'USER_ALREADY_MEMBER'
          }
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await this.db.getInvitationByOrgAndEmail(
        validatedData.organizationId,
        validatedData.email,
        'pending'
      )

      if (existingInvitation) {
        return {
          error: 'User already has a pending invitation to this organization',
          code: 'INVITATION_EXISTS'
        }
      }

      // Create the invitation
      const invitation = await this.db.createInvitation({
        ...validatedData,
        token,
        status: 'pending'
      })

      // Log the invitation creation
      await this.logMembershipActivity(
        validatedData.invitedBy,
        validatedData.organizationId,
        'invitation.created',
        'invitation',
        invitation.id,
        {
          email: validatedData.email,
          roleId: validatedData.roleId,
          expiresAt: expiresAt.toISOString()
        }
      )

      return { data: invitation }
    } catch (error) {
      console.error('Error creating invitation:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: 'VALIDATION_ERROR'
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to create invitation',
        code: 'CREATE_INVITATION_ERROR'
      }
    }
  }

  /**
   * Accept an invitation and create membership
   */
  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<MembershipServiceResult<Membership>> {
    try {
      // Get invitation by token
      const invitation = await this.getInvitationByToken(token)
      
      if (!invitation.data) {
        return {
          error: 'Invalid invitation token',
          code: 'INVALID_INVITATION_TOKEN'
        }
      }

      const inv = invitation.data

      // Check if invitation is still valid
      if (inv.status !== 'pending') {
        return {
          error: 'Invitation is no longer valid',
          code: 'INVITATION_NOT_PENDING'
        }
      }

      if (new Date() > inv.expiresAt) {
        // Mark invitation as expired
        await this.updateInvitationStatus(inv.id, 'expired', userId)
        return {
          error: 'Invitation has expired',
          code: 'INVITATION_EXPIRED'
        }
      }

      // Check if user is already a member
      const existingMembership = await this.db.getMembership(userId, inv.organizationId)
      if (existingMembership) {
        // Mark invitation as accepted even though membership exists
        await this.updateInvitationStatus(inv.id, 'accepted', userId)
        return {
          error: 'User is already a member of this organization',
          code: 'USER_ALREADY_MEMBER'
        }
      }

      // Create membership
      const membershipResult = await this.createMembership({
        userId,
        organizationId: inv.organizationId,
        roleId: inv.roleId,
        status: 'active'
      })

      if (membershipResult.error) {
        return membershipResult
      }

      // Mark invitation as accepted
      await this.updateInvitationStatus(inv.id, 'accepted', userId)

      // Log the invitation acceptance
      await this.logMembershipActivity(
        userId,
        inv.organizationId,
        'invitation.accepted',
        'invitation',
        inv.id,
        {
          email: inv.email,
          membershipId: membershipResult.data!.id
        }
      )

      return membershipResult
    } catch (error) {
      console.error('Error accepting invitation:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to accept invitation',
        code: 'ACCEPT_INVITATION_ERROR'
      }
    }
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(
    invitationId: string,
    revokedBy: string
  ): Promise<MembershipServiceResult<Invitation>> {
    try {
      const invitation = await this.db.getInvitation(invitationId)
      
      if (!invitation) {
        return {
          error: 'Invitation not found',
          code: 'INVITATION_NOT_FOUND'
        }
      }

      if (invitation.status !== 'pending') {
        return {
          error: 'Only pending invitations can be revoked',
          code: 'INVITATION_NOT_PENDING'
        }
      }

      // Update invitation status to revoked
      const updatedInvitation = await this.updateInvitationStatus(invitationId, 'revoked', revokedBy)

      if (updatedInvitation.error) {
        return updatedInvitation
      }

      // Log the invitation revocation
      await this.logMembershipActivity(
        revokedBy,
        invitation.organizationId,
        'invitation.revoked',
        'invitation',
        invitationId,
        {
          email: invitation.email,
          originalInviter: invitation.invitedBy
        }
      )

      return updatedInvitation
    } catch (error) {
      console.error('Error revoking invitation:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to revoke invitation',
        code: 'REVOKE_INVITATION_ERROR'
      }
    }
  }

  /**
   * Get pending invitation by organization and email
   */
  async getPendingInvitation(
    organizationId: string,
    email: string
  ): Promise<MembershipServiceResult<Invitation>> {
    try {
      const invitation = await this.db.getInvitationByOrgAndEmail(organizationId, email, 'pending')
      
      if (!invitation) {
        return {
          error: 'No pending invitation found',
          code: 'INVITATION_NOT_FOUND'
        }
      }

      return { data: invitation }
    } catch (error) {
      console.error('Error getting pending invitation:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get pending invitation',
        code: 'GET_INVITATION_ERROR'
      }
    }
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<MembershipServiceResult<Invitation>> {
    try {
      const invitation = await this.db.getInvitationByToken(token)
      
      if (!invitation) {
        return {
          error: 'Invitation not found',
          code: 'INVITATION_NOT_FOUND'
        }
      }

      return { data: invitation }
    } catch (error) {
      console.error('Error getting invitation by token:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get invitation',
        code: 'GET_INVITATION_ERROR'
      }
    }
  }

  /**
   * Get organization invitations
   */
  async getOrganizationInvitations(
    organizationId: string,
    status?: InvitationStatus
  ): Promise<MembershipServiceResult<Invitation[]>> {
    try {
      const invitations = await this.db.getInvitationsByOrganization(organizationId, status)
      return { data: invitations }
    } catch (error) {
      console.error('Error getting organization invitations:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get organization invitations',
        code: 'GET_ORGANIZATION_INVITATIONS_ERROR'
      }
    }
  }

  /**
   * Update invitation status
   */
  private async updateInvitationStatus(
    invitationId: string,
    status: InvitationStatus,
    updatedBy: string
  ): Promise<MembershipServiceResult<Invitation>> {
    try {
      const validatedData = validateUpdateInvitation({ status })
      const updatedInvitation = await this.db.updateInvitation(invitationId, validatedData)

      return { data: updatedInvitation }
    } catch (error) {
      console.error('Error updating invitation status:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to update invitation status',
        code: 'UPDATE_INVITATION_ERROR'
      }
    }
  }

  /**
   * Generate secure invitation token
   */
  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Log membership activity to audit log
   */
  private async logMembershipActivity(
    userId: string,
    organizationId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.db.createAuditLog({
        userId,
        organizationId,
        action,
        resourceType,
        resourceId,
        metadata
      })
    } catch (error) {
      console.error('Failed to log membership activity:', error)
      // Don't throw error for logging failures
    }
  }
}

// Export singleton instance
export const membershipService = new MembershipService()