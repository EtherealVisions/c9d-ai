/**
 * Database Relations Definition for Drizzle ORM
 * 
 * This file defines all relationships between database tables to avoid circular dependencies.
 * Relations are defined separately from table schemas to ensure proper import order.
 */

import { relations } from 'drizzle-orm'

// Import all table schemas
import { users } from './users'
import { organizations, organizationMemberships } from './organizations'
import { roles, permissions } from './roles'
import { 
  onboardingPaths, 
  onboardingSteps, 
  onboardingSessions, 
  userProgress, 
  onboardingContent, 
  organizationOnboardingConfigs 
} from './content'
import { 
  invitations, 
  teamInvitations, 
  onboardingMilestones, 
  userAchievements 
} from './invitations'
import { 
  auditLogs, 
  onboardingAnalytics, 
  systemMetrics, 
  errorLogs 
} from './audit'

/**
 * User relations
 */
export const usersRelations = relations(users, ({ many }) => ({
  // User can have multiple organization memberships
  memberships: many(organizationMemberships),
  
  // User can send multiple invitations
  sentInvitations: many(invitations, {
    relationName: 'inviter'
  }),
  
  // User can send multiple team invitations
  sentTeamInvitations: many(teamInvitations, {
    relationName: 'inviter'
  }),
  
  // User can have multiple onboarding sessions
  onboardingSessions: many(onboardingSessions),
  
  // User can have multiple progress records
  progressRecords: many(userProgress),
  
  // User can have multiple achievements
  achievements: many(userAchievements),
  
  // User can create content
  createdContent: many(onboardingContent, {
    relationName: 'creator'
  }),
  
  // User can have multiple audit log entries
  auditLogs: many(auditLogs),
  
  // User can have analytics events
  analyticsEvents: many(onboardingAnalytics),
  
  // User can have system metrics
  systemMetrics: many(systemMetrics),
  
  // User can have error logs
  errorLogs: many(errorLogs),
  
  // User can resolve error logs
  resolvedErrors: many(errorLogs, {
    relationName: 'resolver'
  })
}))

/**
 * Organization relations
 */
export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  // Organization can have multiple memberships
  memberships: many(organizationMemberships),
  
  // Organization can have multiple roles
  roles: many(roles),
  
  // Organization can have multiple invitations
  invitations: many(invitations),
  
  // Organization can have multiple team invitations
  teamInvitations: many(teamInvitations),
  
  // Organization can have multiple onboarding sessions
  onboardingSessions: many(onboardingSessions),
  
  // Organization can have custom content
  customContent: many(onboardingContent),
  
  // Organization can have onboarding configuration
  onboardingConfig: one(organizationOnboardingConfigs),
  
  // Organization can have custom milestones
  customMilestones: many(onboardingMilestones),
  
  // Organization can have multiple audit log entries
  auditLogs: many(auditLogs),
  
  // Organization can have analytics events
  analyticsEvents: many(onboardingAnalytics),
  
  // Organization can have system metrics
  systemMetrics: many(systemMetrics),
  
  // Organization can have error logs
  errorLogs: many(errorLogs)
}))

/**
 * Organization membership relations
 */
export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  // Membership belongs to one user
  user: one(users, {
    fields: [organizationMemberships.userId],
    references: [users.id]
  }),
  
  // Membership belongs to one organization
  organization: one(organizations, {
    fields: [organizationMemberships.organizationId],
    references: [organizations.id]
  }),
  
  // Membership has one role
  role: one(roles, {
    fields: [organizationMemberships.roleId],
    references: [roles.id]
  })
}))

/**
 * Role relations
 */
export const rolesRelations = relations(roles, ({ one, many }) => ({
  // Role belongs to one organization
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id]
  }),
  
  // Role can have multiple memberships
  memberships: many(organizationMemberships),
  
  // Role can be used in multiple invitations
  invitations: many(invitations)
}))

/**
 * Permission relations (standalone entities)
 */
export const permissionsRelations = relations(permissions, ({ }) => ({
  // Permissions don't have direct relations since they're referenced by JSON arrays in roles
}))

/**
 * Onboarding path relations
 */
export const onboardingPathsRelations = relations(onboardingPaths, ({ many }) => ({
  steps: many(onboardingSteps),
  sessions: many(onboardingSessions),
  teamInvitationOverrides: many(teamInvitations, {
    relationName: 'pathOverride'
  }),
  analyticsEvents: many(onboardingAnalytics)
}))

/**
 * Onboarding step relations
 */
export const onboardingStepsRelations = relations(onboardingSteps, ({ one, many }) => ({
  path: one(onboardingPaths, {
    fields: [onboardingSteps.pathId],
    references: [onboardingPaths.id]
  }),
  progress: many(userProgress),
  currentSessions: many(onboardingSessions, {
    relationName: 'currentStep'
  }),
  analyticsEvents: many(onboardingAnalytics)
}))

/**
 * Onboarding session relations
 */
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
  progress: many(userProgress),
  achievements: many(userAchievements),
  teamInvitations: many(teamInvitations, {
    relationName: 'onboardingSession'
  }),
  analyticsEvents: many(onboardingAnalytics)
}))

/**
 * User progress relations
 */
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

/**
 * Onboarding content relations
 */
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

/**
 * Organization onboarding config relations
 */
export const organizationOnboardingConfigsRelations = relations(organizationOnboardingConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationOnboardingConfigs.organizationId],
    references: [organizations.id]
  })
}))

/**
 * Invitation relations
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

/**
 * Team invitation relations
 */
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

/**
 * Onboarding milestone relations
 */
export const onboardingMilestonesRelations = relations(onboardingMilestones, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [onboardingMilestones.organizationId],
    references: [organizations.id]
  }),
  achievements: many(userAchievements)
}))

/**
 * User achievement relations
 */
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
 * Audit log relations
 */
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  }),
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id]
  })
}))

/**
 * Onboarding analytics relations
 */
export const onboardingAnalyticsRelations = relations(onboardingAnalytics, ({ one }) => ({
  organization: one(organizations, {
    fields: [onboardingAnalytics.organizationId],
    references: [organizations.id]
  }),
  session: one(onboardingSessions, {
    fields: [onboardingAnalytics.sessionId],
    references: [onboardingSessions.id]
  }),
  user: one(users, {
    fields: [onboardingAnalytics.userId],
    references: [users.id]
  }),
  path: one(onboardingPaths, {
    fields: [onboardingAnalytics.pathId],
    references: [onboardingPaths.id]
  }),
  step: one(onboardingSteps, {
    fields: [onboardingAnalytics.stepId],
    references: [onboardingSteps.id]
  })
}))

/**
 * System metrics relations
 */
export const systemMetricsRelations = relations(systemMetrics, ({ one }) => ({
  organization: one(organizations, {
    fields: [systemMetrics.organizationId],
    references: [organizations.id]
  }),
  user: one(users, {
    fields: [systemMetrics.userId],
    references: [users.id]
  })
}))

/**
 * Error log relations
 */
export const errorLogsRelations = relations(errorLogs, ({ one }) => ({
  user: one(users, {
    fields: [errorLogs.userId],
    references: [users.id]
  }),
  organization: one(organizations, {
    fields: [errorLogs.organizationId],
    references: [organizations.id]
  }),
  resolvedBy: one(users, {
    fields: [errorLogs.resolvedBy],
    references: [users.id]
  })
}))

// Export all relations for use in schema
export const allRelations = {
  usersRelations,
  organizationsRelations,
  organizationMembershipsRelations,
  rolesRelations,
  permissionsRelations,
  onboardingPathsRelations,
  onboardingStepsRelations,
  onboardingSessionsRelations,
  userProgressRelations,
  onboardingContentRelations,
  organizationOnboardingConfigsRelations,
  invitationsRelations,
  teamInvitationsRelations,
  onboardingMilestonesRelations,
  userAchievementsRelations,
  auditLogsRelations,
  onboardingAnalyticsRelations,
  systemMetricsRelations,
  errorLogsRelations
}