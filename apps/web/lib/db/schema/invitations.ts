/**
 * Invitations Schema Definition for Drizzle ORM
 * 
 * This file defines the invitations and team invitations table schemas
 * for managing organization and team invitations with proper relationships.
 */

import { pgTable, uuid, varchar, timestamp, jsonb, text, index, integer, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organizations } from './organizations'
import { users } from './users'
import { roles } from './roles'
import { onboardingPaths, onboardingSessions } from './content'

/**
 * Invitations table schema
 * Manages organization invitations for user onboarding
 */
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  token: varchar('token', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'accepted', 'expired', 'revoked'
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  revokedAt: timestamp('revoked_at'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  organizationIdIdx: index('invitations_organization_id_idx').on(table.organizationId),
  emailIdx: index('invitations_email_idx').on(table.email),
  tokenIdx: index('invitations_token_idx').on(table.token),
  statusIdx: index('invitations_status_idx').on(table.status),
  invitedByIdx: index('invitations_invited_by_idx').on(table.invitedBy),
  expiresAtIdx: index('invitations_expires_at_idx').on(table.expiresAt),
  // Composite indexes
  orgEmailIdx: index('invitations_org_email_idx').on(table.organizationId, table.email),
  statusExpiresIdx: index('invitations_status_expires_idx').on(table.status, table.expiresAt)
}))

/**
 * Team invitations table schema
 * Enhanced invitations with onboarding path customization and team context
 */
export const teamInvitations = pgTable('team_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').references(() => users.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 100 }).notNull(), // Role name or identifier
  customMessage: text('custom_message'),
  onboardingPathOverride: uuid('onboarding_path_override').references(() => onboardingPaths.id),
  invitationToken: varchar('invitation_token', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'accepted', 'expired', 'revoked'
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  onboardingSessionId: uuid('onboarding_session_id').references(() => onboardingSessions.id),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  organizationIdIdx: index('team_invitations_organization_id_idx').on(table.organizationId),
  emailIdx: index('team_invitations_email_idx').on(table.email),
  invitationTokenIdx: index('team_invitations_invitation_token_idx').on(table.invitationToken),
  statusIdx: index('team_invitations_status_idx').on(table.status),
  invitedByIdx: index('team_invitations_invited_by_idx').on(table.invitedBy),
  expiresAtIdx: index('team_invitations_expires_at_idx').on(table.expiresAt),
  onboardingPathOverrideIdx: index('team_invitations_onboarding_path_override_idx').on(table.onboardingPathOverride),
  // Composite indexes
  orgEmailIdx: index('team_invitations_org_email_idx').on(table.organizationId, table.email),
  statusExpiresIdx: index('team_invitations_status_expires_idx').on(table.status, table.expiresAt)
}))

/**
 * Onboarding milestones table schema
 * Defines achievement milestones within the onboarding process
 */
export const onboardingMilestones = pgTable('onboarding_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  milestoneType: varchar('milestone_type', { length: 50 }).notNull(), // 'progress', 'achievement', 'completion', 'time_based'
  criteria: jsonb('criteria').notNull().default({}), // Criteria for earning milestone
  rewardData: jsonb('reward_data').notNull().default({}), // Reward information
  points: integer('points').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }), // null for global milestones
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  milestoneTypeIdx: index('onboarding_milestones_milestone_type_idx').on(table.milestoneType),
  organizationIdIdx: index('onboarding_milestones_organization_id_idx').on(table.organizationId),
  isActiveIdx: index('onboarding_milestones_is_active_idx').on(table.isActive),
  nameIdx: index('onboarding_milestones_name_idx').on(table.name)
}))

/**
 * User achievements table schema
 * Tracks milestones earned by users during onboarding
 */
export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').notNull().references(() => onboardingSessions.id, { onDelete: 'cascade' }),
  milestoneId: uuid('milestone_id').notNull().references(() => onboardingMilestones.id, { onDelete: 'cascade' }),
  earnedAt: timestamp('earned_at').defaultNow().notNull(),
  achievementData: jsonb('achievement_data').notNull().default({}), // Additional achievement context
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  userIdIdx: index('user_achievements_user_id_idx').on(table.userId),
  sessionIdIdx: index('user_achievements_session_id_idx').on(table.sessionId),
  milestoneIdIdx: index('user_achievements_milestone_id_idx').on(table.milestoneId),
  earnedAtIdx: index('user_achievements_earned_at_idx').on(table.earnedAt),
  // Composite indexes
  userMilestoneIdx: index('user_achievements_user_milestone_idx').on(table.userId, table.milestoneId),
  sessionMilestoneIdx: index('user_achievements_session_milestone_idx').on(table.sessionId, table.milestoneId)
}))

/**
 * Relations definitions
 */
export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id]
  }),
  role: one(roles, {
    fields: [invitations.roleId],
    references: [roles.id]
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id]
  })
}))

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [teamInvitations.organizationId],
    references: [organizations.id]
  }),
  inviter: one(users, {
    fields: [teamInvitations.invitedBy],
    references: [users.id]
  }),
  onboardingPathOverride: one(onboardingPaths, {
    fields: [teamInvitations.onboardingPathOverride],
    references: [onboardingPaths.id]
  }),
  onboardingSession: one(onboardingSessions, {
    fields: [teamInvitations.onboardingSessionId],
    references: [onboardingSessions.id]
  })
}))

export const onboardingMilestonesRelations = relations(onboardingMilestones, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [onboardingMilestones.organizationId],
    references: [organizations.id]
  }),
  achievements: many(userAchievements)
}))

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id]
  }),
  session: one(onboardingSessions, {
    fields: [userAchievements.sessionId],
    references: [onboardingSessions.id]
  }),
  milestone: one(onboardingMilestones, {
    fields: [userAchievements.milestoneId],
    references: [onboardingMilestones.id]
  })
}))

/**
 * Type definitions derived from schema
 */
export type Invitation = typeof invitations.$inferSelect
export type NewInvitation = typeof invitations.$inferInsert
export type InvitationUpdate = Partial<Omit<NewInvitation, 'id' | 'token' | 'createdAt' | 'updatedAt'>>

export type TeamInvitation = typeof teamInvitations.$inferSelect
export type NewTeamInvitation = typeof teamInvitations.$inferInsert
export type TeamInvitationUpdate = Partial<Omit<NewTeamInvitation, 'id' | 'invitationToken' | 'createdAt' | 'updatedAt'>>

export type OnboardingMilestone = typeof onboardingMilestones.$inferSelect
export type NewOnboardingMilestone = typeof onboardingMilestones.$inferInsert
export type OnboardingMilestoneUpdate = Partial<Omit<NewOnboardingMilestone, 'id' | 'createdAt' | 'updatedAt'>>

export type UserAchievement = typeof userAchievements.$inferSelect
export type NewUserAchievement = typeof userAchievements.$inferInsert

/**
 * Extended types with populated relations
 */
export type InvitationWithRelations = Invitation & {
  organization: {
    id: string
    name: string
    slug: string
  }
  role: {
    id: string
    name: string
    permissions: string[]
  }
  inviter: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
}

export type TeamInvitationWithRelations = TeamInvitation & {
  organization: {
    id: string
    name: string
    slug: string
  }
  inviter?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
  onboardingPathOverride?: {
    id: string
    name: string
    description: string | null
  }
}

/**
 * Enum constants for type safety
 */
export const INVITATION_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
} as const

export const TEAM_INVITATION_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
} as const

export const MILESTONE_TYPES = {
  PROGRESS: 'progress',
  ACHIEVEMENT: 'achievement',
  COMPLETION: 'completion',
  TIME_BASED: 'time_based'
} as const

export type InvitationStatus = keyof typeof INVITATION_STATUSES
export type TeamInvitationStatus = keyof typeof TEAM_INVITATION_STATUSES
export type MilestoneType = keyof typeof MILESTONE_TYPES