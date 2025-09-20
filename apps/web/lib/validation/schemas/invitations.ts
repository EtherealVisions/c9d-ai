/**
 * Invitations Validation Schemas
 * 
 * This file contains Zod validation schemas for invitation-related operations.
 * Schemas are generated from Drizzle definitions and extended with business rules.
 */

import { z } from 'zod'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { 
  invitations, 
  teamInvitations, 
  onboardingMilestones, 
  userAchievements,
  INVITATION_STATUSES,
  TEAM_INVITATION_STATUSES,
  MILESTONE_TYPES
} from '@/lib/db/schema/invitations'

// Base schemas generated from Drizzle definitions
export const selectInvitationSchema = createSelectSchema(invitations)
export const insertInvitationSchema = createInsertSchema(invitations)
export const selectTeamInvitationSchema = createSelectSchema(teamInvitations)
export const insertTeamInvitationSchema = createInsertSchema(teamInvitations)
export const selectOnboardingMilestoneSchema = createSelectSchema(onboardingMilestones)
export const insertOnboardingMilestoneSchema = createInsertSchema(onboardingMilestones)
export const selectUserAchievementSchema = createSelectSchema(userAchievements)
export const insertUserAchievementSchema = createInsertSchema(userAchievements)

// Invitation validation schemas
export const createInvitationSchema = insertInvitationSchema.omit({
  id: true,
  token: true,
  createdAt: true,
  updatedAt: true,
  acceptedAt: true,
  revokedAt: true
}).extend({
  organizationId: z.string().uuid('Invalid organization ID'),
  
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  
  roleId: z.string().uuid('Invalid role ID'),
  
  invitedBy: z.string().uuid('Invalid inviter user ID'),
  
  status: z.enum(Object.values(INVITATION_STATUSES) as [string, ...string[]])
    .default('pending'),
  
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
  status: z.enum(Object.values(INVITATION_STATUSES) as [string, ...string[]]).optional(),
  expiresAt: z.date()
    .min(new Date(), 'Expiration date must be in the future')
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  acceptedAt: z.date().nullable().optional(),
  revokedAt: z.date().nullable().optional()
})

// Team invitation validation schemas
export const createTeamInvitationSchema = insertTeamInvitationSchema.omit({
  id: true,
  invitationToken: true,
  createdAt: true,
  updatedAt: true,
  acceptedAt: true,
  onboardingSessionId: true
}).extend({
  organizationId: z.string().uuid('Invalid organization ID'),
  
  invitedBy: z.string().uuid('Invalid inviter user ID').nullable(),
  
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  
  role: z.string()
    .min(1, 'Role is required')
    .max(100, 'Role must be less than 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Role can only contain letters, numbers, hyphens, and underscores'),
  
  customMessage: z.string()
    .max(2000, 'Custom message must be less than 2000 characters')
    .nullable(),
  
  onboardingPathOverride: z.string().uuid('Invalid onboarding path ID').nullable(),
  
  status: z.enum(Object.values(TEAM_INVITATION_STATUSES) as [string, ...string[]])
    .default('pending'),
  
  expiresAt: z.date()
    .min(new Date(), 'Expiration date must be in the future')
    .max(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'Expiration date cannot be more than 30 days from now'),
  
  metadata: z.object({
    source: z.enum(['admin', 'api', 'bulk_import', 'team_lead']).default('admin'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    teamContext: z.object({
      teamId: z.string().uuid().optional(),
      teamName: z.string().max(255).optional(),
      department: z.string().max(100).optional()
    }).optional(),
    onboardingPreferences: z.object({
      startDate: z.date().optional(),
      pace: z.enum(['self_paced', 'guided', 'scheduled']).default('self_paced'),
      language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default('en'),
      notifications: z.boolean().default(true)
    }).default({}),
    customizations: z.record(z.unknown()).default({})
  }).default({})
})

export const updateTeamInvitationSchema = z.object({
  status: z.enum(Object.values(TEAM_INVITATION_STATUSES) as [string, ...string[]]).optional(),
  customMessage: z.string().max(2000).nullable().optional(),
  onboardingPathOverride: z.string().uuid().nullable().optional(),
  expiresAt: z.date().min(new Date()).optional(),
  metadata: z.record(z.unknown()).optional(),
  acceptedAt: z.date().nullable().optional(),
  onboardingSessionId: z.string().uuid().nullable().optional()
})

// Onboarding milestone validation schemas
export const createOnboardingMilestoneSchema = insertOnboardingMilestoneSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  name: z.string()
    .min(1, 'Milestone name is required')
    .max(255, 'Milestone name must be less than 255 characters'),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable(),
  
  milestoneType: z.enum(Object.values(MILESTONE_TYPES) as [string, ...string[]]),
  
  criteria: z.object({
    type: z.enum(['step_completion', 'time_based', 'score_based', 'custom']),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'greater_than', 'less_than', 'contains', 'exists']),
      value: z.unknown(),
      weight: z.number().min(0).max(1).default(1)
    })).min(1, 'At least one condition is required'),
    aggregation: z.enum(['all', 'any', 'weighted_average']).default('all'),
    threshold: z.number().min(0).max(100).optional()
  }).default({}),
  
  rewardData: z.object({
    type: z.enum(['badge', 'certificate', 'points', 'unlock', 'custom']).optional(),
    title: z.string().max(255).optional(),
    description: z.string().max(1000).optional(),
    imageUrl: z.string().url().optional(),
    metadata: z.record(z.unknown()).default({})
  }).default({}),
  
  points: z.number().int().min(0).max(10000).default(0),
  
  isActive: z.boolean().default(true),
  
  organizationId: z.string().uuid('Invalid organization ID').nullable()
})

export const updateOnboardingMilestoneSchema = createOnboardingMilestoneSchema.partial().omit({
  organizationId: true // Organization cannot be changed
})

// User achievement validation schemas
export const createUserAchievementSchema = insertUserAchievementSchema.omit({
  id: true,
  createdAt: true,
  earnedAt: true
}).extend({
  userId: z.string().uuid('Invalid user ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  milestoneId: z.string().uuid('Invalid milestone ID'),
  
  achievementData: z.object({
    score: z.number().min(0).max(100).optional(),
    completionTime: z.number().int().min(0).optional(), // in minutes
    attempts: z.number().int().min(1).default(1),
    context: z.record(z.unknown()).default({}),
    evidence: z.array(z.object({
      type: z.enum(['screenshot', 'file', 'link', 'text']),
      data: z.string(),
      metadata: z.record(z.unknown()).optional()
    })).default([])
  }).default({})
})

// Bulk invitation schemas
export const bulkInvitationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  invitedBy: z.string().uuid('Invalid inviter user ID'),
  roleId: z.string().uuid('Invalid role ID'),
  
  invitations: z.array(z.object({
    email: z.string().email('Invalid email format').toLowerCase(),
    customMessage: z.string().max(1000).optional(),
    metadata: z.record(z.unknown()).default({})
  })).min(1, 'At least one invitation is required').max(100, 'Cannot send more than 100 invitations at once'),
  
  expiresAt: z.date()
    .min(new Date(), 'Expiration date must be in the future')
    .max(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'Expiration date cannot be more than 30 days from now'),
  
  globalMetadata: z.record(z.unknown()).default({})
})

export const bulkTeamInvitationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  invitedBy: z.string().uuid('Invalid inviter user ID').nullable(),
  role: z.string().min(1).max(100),
  
  invitations: z.array(z.object({
    email: z.string().email('Invalid email format').toLowerCase(),
    customMessage: z.string().max(2000).optional(),
    onboardingPathOverride: z.string().uuid().nullable().optional(),
    metadata: z.record(z.unknown()).default({})
  })).min(1, 'At least one invitation is required').max(50, 'Cannot send more than 50 team invitations at once'),
  
  expiresAt: z.date()
    .min(new Date(), 'Expiration date must be in the future')
    .max(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'Expiration date cannot be more than 30 days from now'),
  
  globalCustomMessage: z.string().max(2000).optional(),
  globalOnboardingPathOverride: z.string().uuid().nullable().optional(),
  globalMetadata: z.record(z.unknown()).default({})
})

// Invitation acceptance schemas
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  userInfo: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    preferences: z.record(z.unknown()).default({})
  }).optional()
})

export const acceptTeamInvitationSchema = z.object({
  invitationToken: z.string().min(1, 'Invitation token is required'),
  userInfo: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    preferences: z.record(z.unknown()).default({})
  }).optional(),
  onboardingPreferences: z.object({
    startImmediately: z.boolean().default(true),
    pace: z.enum(['self_paced', 'guided', 'scheduled']).default('self_paced'),
    notifications: z.boolean().default(true)
  }).default({})
})

// API response schemas
export const invitationApiResponseSchema = selectInvitationSchema.extend({
  organization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    avatarUrl: z.string().url().nullable()
  }),
  role: z.object({
    id: z.string().uuid(),
    name: z.string(),
    permissions: z.array(z.string())
  }),
  inviter: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    fullName: z.string().nullable()
  }),
  isExpired: z.boolean(),
  canResend: z.boolean(),
  canRevoke: z.boolean()
})

export const teamInvitationApiResponseSchema = selectTeamInvitationSchema.extend({
  organization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    avatarUrl: z.string().url().nullable()
  }),
  inviter: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    fullName: z.string().nullable()
  }).nullable(),
  onboardingPathOverride: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    estimatedDuration: z.number().int()
  }).nullable(),
  isExpired: z.boolean(),
  canResend: z.boolean(),
  canRevoke: z.boolean()
})

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

// Search and filter schemas
export const invitationSearchSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  query: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  status: z.enum(Object.values(INVITATION_STATUSES) as [string, ...string[]]).optional(),
  roleId: z.string().uuid().optional(),
  invitedBy: z.string().uuid().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  expiresAfter: z.date().optional(),
  expiresBefore: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'expiresAt', 'email', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const teamInvitationSearchSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  query: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  status: z.enum(Object.values(TEAM_INVITATION_STATUSES) as [string, ...string[]]).optional(),
  role: z.string().max(100).optional(),
  invitedBy: z.string().uuid().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  expiresAfter: z.date().optional(),
  expiresBefore: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'expiresAt', 'email', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Type exports for TypeScript integration
export type CreateInvitation = z.infer<typeof createInvitationSchema>
export type UpdateInvitation = z.infer<typeof updateInvitationSchema>
export type CreateTeamInvitation = z.infer<typeof createTeamInvitationSchema>
export type UpdateTeamInvitation = z.infer<typeof updateTeamInvitationSchema>
export type CreateOnboardingMilestone = z.infer<typeof createOnboardingMilestoneSchema>
export type UpdateOnboardingMilestone = z.infer<typeof updateOnboardingMilestoneSchema>
export type CreateUserAchievement = z.infer<typeof createUserAchievementSchema>
export type BulkInvitation = z.infer<typeof bulkInvitationSchema>
export type BulkTeamInvitation = z.infer<typeof bulkTeamInvitationSchema>
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>
export type AcceptTeamInvitation = z.infer<typeof acceptTeamInvitationSchema>
export type InvitationApiResponse = z.infer<typeof invitationApiResponseSchema>
export type TeamInvitationApiResponse = z.infer<typeof teamInvitationApiResponseSchema>
export type InvitationListResponse = z.infer<typeof invitationListResponseSchema>
export type TeamInvitationListResponse = z.infer<typeof teamInvitationListResponseSchema>
export type InvitationSearch = z.infer<typeof invitationSearchSchema>
export type TeamInvitationSearch = z.infer<typeof teamInvitationSearchSchema>

// Validation helper functions
export function validateCreateInvitation(data: unknown): CreateInvitation {
  return createInvitationSchema.parse(data)
}

export function validateUpdateInvitation(data: unknown): UpdateInvitation {
  return updateInvitationSchema.parse(data)
}

export function validateCreateTeamInvitation(data: unknown): CreateTeamInvitation {
  return createTeamInvitationSchema.parse(data)
}

export function validateUpdateTeamInvitation(data: unknown): UpdateTeamInvitation {
  return updateTeamInvitationSchema.parse(data)
}

export function validateCreateOnboardingMilestone(data: unknown): CreateOnboardingMilestone {
  return createOnboardingMilestoneSchema.parse(data)
}

export function validateUpdateOnboardingMilestone(data: unknown): UpdateOnboardingMilestone {
  return updateOnboardingMilestoneSchema.parse(data)
}

export function validateCreateUserAchievement(data: unknown): CreateUserAchievement {
  return createUserAchievementSchema.parse(data)
}

export function validateBulkInvitation(data: unknown): BulkInvitation {
  return bulkInvitationSchema.parse(data)
}

export function validateBulkTeamInvitation(data: unknown): BulkTeamInvitation {
  return bulkTeamInvitationSchema.parse(data)
}

export function validateAcceptInvitation(data: unknown): AcceptInvitation {
  return acceptInvitationSchema.parse(data)
}

export function validateAcceptTeamInvitation(data: unknown): AcceptTeamInvitation {
  return acceptTeamInvitationSchema.parse(data)
}

export function validateInvitationSearch(data: unknown): InvitationSearch {
  return invitationSearchSchema.parse(data)
}

export function validateTeamInvitationSearch(data: unknown): TeamInvitationSearch {
  return teamInvitationSearchSchema.parse(data)
}

// Safe parsing functions
export function safeValidateCreateInvitation(data: unknown) {
  return createInvitationSchema.safeParse(data)
}

export function safeValidateUpdateInvitation(data: unknown) {
  return updateInvitationSchema.safeParse(data)
}

export function safeValidateCreateTeamInvitation(data: unknown) {
  return createTeamInvitationSchema.safeParse(data)
}

export function safeValidateUpdateTeamInvitation(data: unknown) {
  return updateTeamInvitationSchema.safeParse(data)
}

export function safeValidateCreateOnboardingMilestone(data: unknown) {
  return createOnboardingMilestoneSchema.safeParse(data)
}

export function safeValidateUpdateOnboardingMilestone(data: unknown) {
  return updateOnboardingMilestoneSchema.safeParse(data)
}

export function safeValidateCreateUserAchievement(data: unknown) {
  return createUserAchievementSchema.safeParse(data)
}

export function safeValidateBulkInvitation(data: unknown) {
  return bulkInvitationSchema.safeParse(data)
}

export function safeValidateBulkTeamInvitation(data: unknown) {
  return bulkTeamInvitationSchema.safeParse(data)
}

export function safeValidateAcceptInvitation(data: unknown) {
  return acceptInvitationSchema.safeParse(data)
}

export function safeValidateAcceptTeamInvitation(data: unknown) {
  return acceptTeamInvitationSchema.safeParse(data)
}

export function safeValidateInvitationSearch(data: unknown) {
  return invitationSearchSchema.safeParse(data)
}

export function safeValidateTeamInvitationSearch(data: unknown) {
  return teamInvitationSearchSchema.safeParse(data)
}