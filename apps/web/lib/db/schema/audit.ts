/**
 * Audit Schema Definition for Drizzle ORM
 * 
 * This file defines the audit logging and analytics table schemas
 * for tracking system activities and onboarding analytics.
 */

import { pgTable, uuid, varchar, timestamp, jsonb, text, index, integer, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organizations } from './organizations'
import { users } from './users'
import { onboardingSessions, onboardingSteps, onboardingPaths } from './content'

/**
 * Audit logs table schema
 * Tracks all significant system activities for compliance and debugging
 */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // null for system actions
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(), // e.g., 'user.created', 'organization.updated'
  resourceType: varchar('resource_type', { length: 50 }).notNull(), // e.g., 'user', 'organization', 'invitation'
  resourceId: uuid('resource_id'), // ID of the affected resource
  metadata: jsonb('metadata').notNull().default({}), // Additional context data
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 255 }), // Browser/app session ID
  requestId: varchar('request_id', { length: 255 }), // Request tracing ID
  severity: varchar('severity', { length: 20 }).notNull().default('info'), // 'debug', 'info', 'warn', 'error', 'critical'
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  organizationIdIdx: index('audit_logs_organization_id_idx').on(table.organizationId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceTypeIdx: index('audit_logs_resource_type_idx').on(table.resourceType),
  resourceIdIdx: index('audit_logs_resource_id_idx').on(table.resourceId),
  severityIdx: index('audit_logs_severity_idx').on(table.severity),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  // Composite indexes for common queries
  userActionIdx: index('audit_logs_user_action_idx').on(table.userId, table.action),
  orgActionIdx: index('audit_logs_org_action_idx').on(table.organizationId, table.action),
  resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  timeRangeIdx: index('audit_logs_time_range_idx').on(table.createdAt, table.organizationId)
}))

/**
 * Onboarding analytics table schema
 * Tracks detailed analytics for onboarding processes and user behavior
 */
export const onboardingAnalytics = pgTable('onboarding_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => onboardingSessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 100 }).notNull(), // e.g., 'step_started', 'step_completed', 'session_paused'
  eventData: jsonb('event_data').notNull().default({}), // Event-specific data
  pathId: uuid('path_id').references(() => onboardingPaths.id, { onDelete: 'set null' }),
  stepId: uuid('step_id').references(() => onboardingSteps.id, { onDelete: 'set null' }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  deviceInfo: jsonb('device_info').notNull().default({}), // Device and browser information
  performanceMetrics: jsonb('performance_metrics').notNull().default({}), // Load times, interaction delays
  metadata: jsonb('metadata').notNull().default({}), // Additional context
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  organizationIdIdx: index('onboarding_analytics_organization_id_idx').on(table.organizationId),
  sessionIdIdx: index('onboarding_analytics_session_id_idx').on(table.sessionId),
  userIdIdx: index('onboarding_analytics_user_id_idx').on(table.userId),
  eventTypeIdx: index('onboarding_analytics_event_type_idx').on(table.eventType),
  pathIdIdx: index('onboarding_analytics_path_id_idx').on(table.pathId),
  stepIdIdx: index('onboarding_analytics_step_id_idx').on(table.stepId),
  timestampIdx: index('onboarding_analytics_timestamp_idx').on(table.timestamp),
  // Composite indexes for analytics queries
  orgEventIdx: index('onboarding_analytics_org_event_idx').on(table.organizationId, table.eventType),
  sessionEventIdx: index('onboarding_analytics_session_event_idx').on(table.sessionId, table.eventType),
  pathEventIdx: index('onboarding_analytics_path_event_idx').on(table.pathId, table.eventType),
  timeRangeIdx: index('onboarding_analytics_time_range_idx').on(table.timestamp, table.organizationId)
}))

/**
 * System metrics table schema
 * Stores aggregated system performance and usage metrics
 */
export const systemMetrics = pgTable('system_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricType: varchar('metric_type', { length: 100 }).notNull(), // e.g., 'api_response_time', 'database_query_time'
  metricName: varchar('metric_name', { length: 100 }).notNull(), // Specific metric identifier
  value: jsonb('value').notNull(), // Metric value (can be number, object, array)
  unit: varchar('unit', { length: 20 }), // e.g., 'ms', 'count', 'percentage'
  tags: jsonb('tags').notNull().default({}), // Metric tags for filtering/grouping
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  aggregationPeriod: varchar('aggregation_period', { length: 20 }), // e.g., '1m', '5m', '1h', '1d'
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  metricTypeIdx: index('system_metrics_metric_type_idx').on(table.metricType),
  metricNameIdx: index('system_metrics_metric_name_idx').on(table.metricName),
  organizationIdIdx: index('system_metrics_organization_id_idx').on(table.organizationId),
  timestampIdx: index('system_metrics_timestamp_idx').on(table.timestamp),
  aggregationPeriodIdx: index('system_metrics_aggregation_period_idx').on(table.aggregationPeriod),
  // Composite indexes for metrics queries
  typeNameIdx: index('system_metrics_type_name_idx').on(table.metricType, table.metricName),
  orgMetricIdx: index('system_metrics_org_metric_idx').on(table.organizationId, table.metricType),
  timeRangeIdx: index('system_metrics_time_range_idx').on(table.timestamp, table.metricType)
}))

/**
 * Error logs table schema
 * Dedicated table for application errors and exceptions
 */
export const errorLogs = pgTable('error_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  errorType: varchar('error_type', { length: 100 }).notNull(), // e.g., 'ValidationError', 'DatabaseError'
  errorMessage: text('error_message').notNull(),
  errorStack: text('error_stack'), // Stack trace
  errorCode: varchar('error_code', { length: 50 }), // Application-specific error code
  severity: varchar('severity', { length: 20 }).notNull().default('error'), // 'warn', 'error', 'critical'
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }),
  requestId: varchar('request_id', { length: 255 }),
  endpoint: varchar('endpoint', { length: 255 }), // API endpoint or page URL
  httpMethod: varchar('http_method', { length: 10 }), // GET, POST, etc.
  httpStatus: integer('http_status'), // HTTP status code
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  context: jsonb('context').notNull().default({}), // Additional error context
  resolved: boolean('resolved').notNull().default(false),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  errorTypeIdx: index('error_logs_error_type_idx').on(table.errorType),
  severityIdx: index('error_logs_severity_idx').on(table.severity),
  userIdIdx: index('error_logs_user_id_idx').on(table.userId),
  organizationIdIdx: index('error_logs_organization_id_idx').on(table.organizationId),
  endpointIdx: index('error_logs_endpoint_idx').on(table.endpoint),
  resolvedIdx: index('error_logs_resolved_idx').on(table.resolved),
  createdAtIdx: index('error_logs_created_at_idx').on(table.createdAt),
  // Composite indexes
  typeResolvedIdx: index('error_logs_type_resolved_idx').on(table.errorType, table.resolved),
  severityResolvedIdx: index('error_logs_severity_resolved_idx').on(table.severity, table.resolved)
}))

/**
 * Relations definitions
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

/**
 * Type definitions derived from schema
 */
export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
export type AuditLogUpdate = Partial<Omit<NewAuditLog, 'id' | 'createdAt'>>

export type OnboardingAnalytics = typeof onboardingAnalytics.$inferSelect
export type NewOnboardingAnalytics = typeof onboardingAnalytics.$inferInsert

export type SystemMetric = typeof systemMetrics.$inferSelect
export type NewSystemMetric = typeof systemMetrics.$inferInsert

export type ErrorLog = typeof errorLogs.$inferSelect
export type NewErrorLog = typeof errorLogs.$inferInsert
export type ErrorLogUpdate = Partial<Omit<NewErrorLog, 'id' | 'createdAt'>>

/**
 * Extended types with populated relations
 */
export type AuditLogWithRelations = AuditLog & {
  user?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
  organization?: {
    id: string
    name: string
    slug: string
  }
}

/**
 * Enum constants for type safety
 */
export const AUDIT_ACTIONS = {
  // User actions
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  
  // Organization actions
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',
  ORGANIZATION_DELETED: 'organization.deleted',
  
  // Membership actions
  MEMBERSHIP_CREATED: 'membership.created',
  MEMBERSHIP_UPDATED: 'membership.updated',
  MEMBERSHIP_DELETED: 'membership.deleted',
  
  // Invitation actions
  INVITATION_SENT: 'invitation.sent',
  INVITATION_ACCEPTED: 'invitation.accepted',
  INVITATION_REVOKED: 'invitation.revoked',
  
  // Role actions
  ROLE_CREATED: 'role.created',
  ROLE_UPDATED: 'role.updated',
  ROLE_DELETED: 'role.deleted',
  
  // Content actions
  CONTENT_CREATED: 'content.created',
  CONTENT_UPDATED: 'content.updated',
  CONTENT_DELETED: 'content.deleted'
} as const

export const AUDIT_SEVERITIES = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const

export const ERROR_SEVERITIES = {
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const

export const ONBOARDING_EVENT_TYPES = {
  SESSION_STARTED: 'session_started',
  SESSION_PAUSED: 'session_paused',
  SESSION_RESUMED: 'session_resumed',
  SESSION_COMPLETED: 'session_completed',
  SESSION_ABANDONED: 'session_abandoned',
  STEP_STARTED: 'step_started',
  STEP_COMPLETED: 'step_completed',
  STEP_SKIPPED: 'step_skipped',
  STEP_FAILED: 'step_failed',
  MILESTONE_EARNED: 'milestone_earned',
  FEEDBACK_SUBMITTED: 'feedback_submitted'
} as const

export type AuditAction = keyof typeof AUDIT_ACTIONS
export type AuditSeverity = keyof typeof AUDIT_SEVERITIES
export type ErrorSeverity = keyof typeof ERROR_SEVERITIES
export type OnboardingEventType = keyof typeof ONBOARDING_EVENT_TYPES