/**
 * Invitations Validation Schemas
 * 
 * This file contains Zod validation schemas for invitation-related operations.
 * Schemas are manually defined to ensure type safety and compatibility.
 */

import { z } from 'zod'

// Constants for validation
const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'revoked'] as const
const TEAM_INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'revoked'] as const
const MILESTONE_TYPES = ['onboarding', 'training', 'certification', 'achievement'] as const

// Base invitation schema
export const baseInvitationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  roleId: z.string().uuid(),
  invitedBy: z.string().uuid(),
  token: z.string(),
  status: z.enum(INVITATION_STATUSES),
  metadata: z.record(z.unknown()).default({}),
  expiresAt: z.date(),
  acceptedAt: z.date().nullable(),
  revokedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Invitation validation schemas
export const createInvitationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  roleId: z.string().uuid('Invalid role ID'),
  invitedBy: z.string().uuid('Invalid inviter user ID'),
  status: z.enum(INVITATION_STATUSES).default('pending'),
  expiresAt: z.date()
    .min(new Date(), 'Expiration date must be in the future')
    .max(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'Expiration date cannot be more than 30 days from now'),
  metadata: z.object({
    customMessage: z.string().max(1000).optional(),
    source: z.enum(['admin', 'api', 'bulk_import', 'self_service']).default('admin'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    tags: z.array(z.string().max(50)).max(10).default([]),
    restrictions: z.object({
      ipWhitelist: z.array(z.string().ip()).default([]),
      domainRestrictions: z.array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)).default([]),
      maxAttempts: z.number().int().min(1).max(10).default(3)
    }).default({})
  }).default({})
})

export const updateInvitationSchema = z.object({
  status: z.enum(INVITATION_STATUSES).optional(),
  expiresAt: z.date()
    .min(new Date(), 'Expiration date must be in the future')
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  acceptedAt: z.date().nullable().optional(),
  revokedAt: z.date().nullable().optional()
})

// Team invitation schemas
export const createTeamInvitationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  email: z.string().email('Invalid email format'),
  roleId: z.string().uuid('Invalid role ID'),
  invitedBy: z.string().uuid('Invalid inviter user ID'),
  status: z.enum(TEAM_INVITATION_STATUSES).default('pending'),
  metadata: z.record(z.unknown()).default({}),
  expiresAt: z.date()
})

export const updateTeamInvitationSchema = z.object({
  status: z.enum(TEAM_INVITATION_STATUSES).optional(),
  metadata: z.record(z.unknown()).optional(),
  expiresAt: z.date().optional(),
  acceptedAt: z.date().nullable().optional(),
  revokedAt: z.date().nullable().optional(),
  onboardingSessionId: z.string().uuid().nullable().optional()
})

// Onboarding milestone schemas
export const createOnboardingMilestoneSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable(),
  organizationId: z.string().uuid(),
  isActive: z.boolean().default(true),
  milestoneType: z.enum(MILESTONE_TYPES),
  criteria: z.record(z.unknown()).default({}),
  rewardData: z.record(z.unknown()).default({}),
  points: z.number().int().min(0).default(0)
})

export const updateOnboardingMilestoneSchema = createOnboardingMilestoneSchema.partial()

// User achievement schemas
export const createUserAchievementSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  milestoneId: z.string().uuid('Invalid milestone ID'),
  achievementData: z.object({
    score: z.number().min(0).max(100).optional(),
    completionTime: z.number().int().min(0).optional(),
    attempts: z.number().int().min(1).default(1),
    context: z.record(z.unknown()).default({}),
    evidence: z.array(z.object({
      type: z.enum(['screenshot', 'file', 'link', 'text']),
      data: z.string(),
      metadata: z.record(z.unknown()).default({})
    })).default([])
  }).default({})
})

// API Response schemas
export const invitationApiResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  roleId: z.string().uuid(),
  invitedBy: z.string().uuid(),
  token: z.string(),
  status: z.enum(INVITATION_STATUSES),
  metadata: z.record(z.unknown()),
  expiresAt: z.date(),
  acceptedAt: z.date().nullable(),
  revokedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  canAccept: z.boolean().default(true),
  canRevoke: z.boolean().default(true)
})

export const teamInvitationApiResponseSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  acceptedAt: z.date().nullable().optional(),
  revokedAt: z.date().nullable().optional(),
  expiresAt: z.date().optional(),
  status: z.enum(TEAM_INVITATION_STATUSES).optional(),
  metadata: z.record(z.unknown()).optional(),
  organizationId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  invitedBy: z.string().uuid().optional(),
  onboardingSessionId: z.string().uuid().nullable().optional(),
  canAccept: z.boolean().default(true),
  canRevoke: z.boolean().default(true)
})

// List response schemas
export const invitationListResponseSchema = z.object({
  invitations: z.array(invitationApiResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
})

export const teamInvitationListResponseSchema = z.object({
  invitations: z.array(teamInvitationApiResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
})

// Type exports
export type CreateInvitation = z.infer<typeof createInvitationSchema>
export type UpdateInvitation = z.infer<typeof updateInvitationSchema>
export type CreateTeamInvitation = z.infer<typeof createTeamInvitationSchema>
export type UpdateTeamInvitation = z.infer<typeof updateTeamInvitationSchema>
export type CreateOnboardingMilestone = z.infer<typeof createOnboardingMilestoneSchema>
export type UpdateOnboardingMilestone = z.infer<typeof updateOnboardingMilestoneSchema>
export type CreateUserAchievement = z.infer<typeof createUserAchievementSchema>

// API Response types
export type InvitationApiResponse = z.infer<typeof invitationApiResponseSchema>
export type TeamInvitationApiResponse = z.infer<typeof teamInvitationApiResponseSchema>
export type InvitationListResponse = z.infer<typeof invitationListResponseSchema>
export type TeamInvitationListResponse = z.infer<typeof teamInvitationListResponseSchema>

// Database schema types (simplified)
export type SelectInvitation = z.infer<typeof baseInvitationSchema>
export type InsertInvitation = Omit<SelectInvitation, 'id' | 'createdAt' | 'updatedAt'>