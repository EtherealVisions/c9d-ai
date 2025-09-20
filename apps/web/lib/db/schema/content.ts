/**
 * Content Schema Definition for Drizzle ORM
 * 
 * This file defines the onboarding content and related table schemas
 * for the content management system with proper relationships and constraints.
 */

import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer, index, text } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organizations } from './organizations'
import { users } from './users'

/**
 * Onboarding paths table schema
 * Defines structured onboarding journeys for different roles and contexts
 */
export const onboardingPaths = pgTable('onboarding_paths', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  targetRole: varchar('target_role', { length: 100 }).notNull(),
  subscriptionTier: varchar('subscription_tier', { length: 50 }),
  estimatedDuration: integer('estimated_duration').notNull(), // in minutes
  isActive: boolean('is_active').notNull().default(true),
  prerequisites: jsonb('prerequisites').notNull().default([]), // Array of prerequisite conditions
  learningObjectives: jsonb('learning_objectives').notNull().default([]), // Array of learning goals
  successCriteria: jsonb('success_criteria').notNull().default({}), // Completion criteria
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  targetRoleIdx: index('onboarding_paths_target_role_idx').on(table.targetRole),
  subscriptionTierIdx: index('onboarding_paths_subscription_tier_idx').on(table.subscriptionTier),
  isActiveIdx: index('onboarding_paths_is_active_idx').on(table.isActive),
  nameIdx: index('onboarding_paths_name_idx').on(table.name)
}))

/**
 * Onboarding steps table schema
 * Defines individual steps within onboarding paths
 */
export const onboardingSteps = pgTable('onboarding_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  pathId: uuid('path_id').notNull().references(() => onboardingPaths.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  stepType: varchar('step_type', { length: 50 }).notNull(), // 'tutorial', 'exercise', 'setup', 'validation', 'milestone'
  stepOrder: integer('step_order').notNull(),
  estimatedTime: integer('estimated_time').notNull(), // in minutes
  isRequired: boolean('is_required').notNull().default(true),
  dependencies: jsonb('dependencies').notNull().default([]), // Array of step IDs that must be completed first
  content: jsonb('content').notNull().default({}), // Step content data
  interactiveElements: jsonb('interactive_elements').notNull().default({}), // Interactive components config
  successCriteria: jsonb('success_criteria').notNull().default({}), // Step completion criteria
  validationRules: jsonb('validation_rules').notNull().default({}), // Validation logic
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  pathIdIdx: index('onboarding_steps_path_id_idx').on(table.pathId),
  stepTypeIdx: index('onboarding_steps_step_type_idx').on(table.stepType),
  stepOrderIdx: index('onboarding_steps_step_order_idx').on(table.stepOrder),
  isRequiredIdx: index('onboarding_steps_is_required_idx').on(table.isRequired),
  // Composite index for path + order
  pathOrderIdx: index('onboarding_steps_path_order_idx').on(table.pathId, table.stepOrder)
}))

/**
 * Onboarding sessions table schema
 * Tracks individual user onboarding sessions
 */
export const onboardingSessions = pgTable('onboarding_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  pathId: uuid('path_id').references(() => onboardingPaths.id),
  sessionType: varchar('session_type', { length: 50 }).notNull(), // 'individual', 'team_admin', 'team_member'
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'paused', 'completed', 'abandoned'
  currentStepId: uuid('current_step_id').references(() => onboardingSteps.id),
  currentStepIndex: integer('current_step_index').notNull().default(0),
  progressPercentage: integer('progress_percentage').notNull().default(0),
  timeSpent: integer('time_spent').notNull().default(0), // in minutes
  startedAt: timestamp('started_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  pausedAt: timestamp('paused_at'),
  sessionMetadata: jsonb('session_metadata').notNull().default({}),
  preferences: jsonb('preferences').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  userIdIdx: index('onboarding_sessions_user_id_idx').on(table.userId),
  organizationIdIdx: index('onboarding_sessions_organization_id_idx').on(table.organizationId),
  pathIdIdx: index('onboarding_sessions_path_id_idx').on(table.pathId),
  statusIdx: index('onboarding_sessions_status_idx').on(table.status),
  sessionTypeIdx: index('onboarding_sessions_session_type_idx').on(table.sessionType),
  lastActiveAtIdx: index('onboarding_sessions_last_active_at_idx').on(table.lastActiveAt)
}))

/**
 * User progress table schema
 * Tracks individual step progress within onboarding sessions
 */
export const userProgress = pgTable('user_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => onboardingSessions.id, { onDelete: 'cascade' }),
  stepId: uuid('step_id').notNull().references(() => onboardingSteps.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('not_started'), // 'not_started', 'in_progress', 'completed', 'skipped', 'failed'
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  timeSpent: integer('time_spent').notNull().default(0), // in minutes
  attempts: integer('attempts').notNull().default(0),
  score: integer('score'), // Optional scoring
  feedback: jsonb('feedback').notNull().default({}), // User feedback data
  userActions: jsonb('user_actions').notNull().default({}), // Actions taken by user
  stepResult: jsonb('step_result').notNull().default({}), // Results/outputs from step
  errors: jsonb('errors').notNull().default({}), // Error information
  achievements: jsonb('achievements').notNull().default({}), // Achievements earned
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  sessionIdIdx: index('user_progress_session_id_idx').on(table.sessionId),
  stepIdIdx: index('user_progress_step_id_idx').on(table.stepId),
  userIdIdx: index('user_progress_user_id_idx').on(table.userId),
  statusIdx: index('user_progress_status_idx').on(table.status),
  // Composite indexes
  sessionStepIdx: index('user_progress_session_step_idx').on(table.sessionId, table.stepId),
  userStepIdx: index('user_progress_user_step_idx').on(table.userId, table.stepId)
}))

/**
 * Onboarding content table schema
 * Stores reusable content pieces for onboarding
 */
export const onboardingContent = pgTable('onboarding_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentType: varchar('content_type', { length: 50 }).notNull(), // 'text', 'html', 'markdown', 'video', 'image', 'interactive', 'template'
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  contentData: jsonb('content_data').notNull().default({}), // Main content data
  mediaUrls: jsonb('media_urls').notNull().default([]), // Array of media URLs
  interactiveConfig: jsonb('interactive_config').notNull().default({}), // Interactive element configuration
  tags: jsonb('tags').notNull().default([]), // Array of tags for categorization
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }), // null for global content
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  contentTypeIdx: index('onboarding_content_content_type_idx').on(table.contentType),
  organizationIdIdx: index('onboarding_content_organization_id_idx').on(table.organizationId),
  createdByIdx: index('onboarding_content_created_by_idx').on(table.createdBy),
  isActiveIdx: index('onboarding_content_is_active_idx').on(table.isActive),
  titleIdx: index('onboarding_content_title_idx').on(table.title)
}))

/**
 * Organization onboarding configuration table schema
 * Stores organization-specific onboarding customizations
 */
export const organizationOnboardingConfigs = pgTable('organization_onboarding_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }).unique(),
  welcomeMessage: text('welcome_message'),
  brandingAssets: jsonb('branding_assets').notNull().default({}), // Logo, colors, etc.
  customContent: jsonb('custom_content').notNull().default({}), // Custom content overrides
  roleConfigurations: jsonb('role_configurations').notNull().default({}), // Role-specific configurations
  mandatoryModules: jsonb('mandatory_modules').notNull().default([]), // Required modules for organization
  completionRequirements: jsonb('completion_requirements').notNull().default({}), // Custom completion criteria
  notificationSettings: jsonb('notification_settings').notNull().default({}), // Notification preferences
  integrationSettings: jsonb('integration_settings').notNull().default({}), // Third-party integrations
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  organizationIdIdx: index('org_onboarding_configs_organization_id_idx').on(table.organizationId),
  isActiveIdx: index('org_onboarding_configs_is_active_idx').on(table.isActive)
}))

/**
 * Relations definitions
 */
export const onboardingPathsRelations = relations(onboardingPaths, ({ many }) => ({
  steps: many(onboardingSteps),
  sessions: many(onboardingSessions)
}))

export const onboardingStepsRelations = relations(onboardingSteps, ({ one, many }) => ({
  path: one(onboardingPaths, {
    fields: [onboardingSteps.pathId],
    references: [onboardingPaths.id]
  }),
  progress: many(userProgress),
  sessions: many(onboardingSessions, {
    fields: [onboardingSteps.id],
    references: [onboardingSessions.currentStepId]
  })
}))

export const onboardingSessionsRelations = relations(onboardingSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [onboardingSessions.userId],
    references: [users.id]
  }),
  organization: one(organizations, {
    fields: [onboardingSessions.organizationId],
    references: [organizations.id]
  }),
  path: one(onboardingPaths, {
    fields: [onboardingSessions.pathId],
    references: [onboardingPaths.id]
  }),
  currentStep: one(onboardingSteps, {
    fields: [onboardingSessions.currentStepId],
    references: [onboardingSteps.id]
  }),
  progress: many(userProgress)
}))

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  session: one(onboardingSessions, {
    fields: [userProgress.sessionId],
    references: [onboardingSessions.id]
  }),
  step: one(onboardingSteps, {
    fields: [userProgress.stepId],
    references: [onboardingSteps.id]
  }),
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id]
  })
}))

export const onboardingContentRelations = relations(onboardingContent, ({ one }) => ({
  organization: one(organizations, {
    fields: [onboardingContent.organizationId],
    references: [organizations.id]
  }),
  creator: one(users, {
    fields: [onboardingContent.createdBy],
    references: [users.id]
  })
}))

export const organizationOnboardingConfigsRelations = relations(organizationOnboardingConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationOnboardingConfigs.organizationId],
    references: [organizations.id]
  })
}))

/**
 * Type definitions derived from schema
 */
export type OnboardingPath = typeof onboardingPaths.$inferSelect
export type NewOnboardingPath = typeof onboardingPaths.$inferInsert
export type OnboardingPathUpdate = Partial<Omit<NewOnboardingPath, 'id' | 'createdAt' | 'updatedAt'>>

export type OnboardingStep = typeof onboardingSteps.$inferSelect
export type NewOnboardingStep = typeof onboardingSteps.$inferInsert
export type OnboardingStepUpdate = Partial<Omit<NewOnboardingStep, 'id' | 'createdAt' | 'updatedAt'>>

export type OnboardingSession = typeof onboardingSessions.$inferSelect
export type NewOnboardingSession = typeof onboardingSessions.$inferInsert
export type OnboardingSessionUpdate = Partial<Omit<NewOnboardingSession, 'id' | 'createdAt' | 'updatedAt'>>

export type UserProgress = typeof userProgress.$inferSelect
export type NewUserProgress = typeof userProgress.$inferInsert
export type UserProgressUpdate = Partial<Omit<NewUserProgress, 'id' | 'createdAt' | 'updatedAt'>>

export type OnboardingContent = typeof onboardingContent.$inferSelect
export type NewOnboardingContent = typeof onboardingContent.$inferInsert
export type OnboardingContentUpdate = Partial<Omit<NewOnboardingContent, 'id' | 'createdAt' | 'updatedAt'>>

export type OrganizationOnboardingConfig = typeof organizationOnboardingConfigs.$inferSelect
export type NewOrganizationOnboardingConfig = typeof organizationOnboardingConfigs.$inferInsert
export type OrganizationOnboardingConfigUpdate = Partial<Omit<NewOrganizationOnboardingConfig, 'id' | 'createdAt' | 'updatedAt'>>

/**
 * Enum constants for type safety
 */
export const ONBOARDING_SESSION_TYPES = {
  INDIVIDUAL: 'individual',
  TEAM_ADMIN: 'team_admin',
  TEAM_MEMBER: 'team_member'
} as const

export const ONBOARDING_SESSION_STATUSES = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned'
} as const

export const ONBOARDING_STEP_TYPES = {
  TUTORIAL: 'tutorial',
  EXERCISE: 'exercise',
  SETUP: 'setup',
  VALIDATION: 'validation',
  MILESTONE: 'milestone'
} as const

export const USER_PROGRESS_STATUSES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  FAILED: 'failed'
} as const

export const ONBOARDING_CONTENT_TYPES = {
  TEXT: 'text',
  HTML: 'html',
  MARKDOWN: 'markdown',
  VIDEO: 'video',
  IMAGE: 'image',
  INTERACTIVE: 'interactive',
  TEMPLATE: 'template'
} as const