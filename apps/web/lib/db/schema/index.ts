/**
 * Drizzle Schema Definitions
 * 
 * This file exports all database schema definitions for use with Drizzle ORM.
 * Schemas are organized by domain and imported from individual files.
 * 
 * Usage:
 * - Import specific schemas: import { users, organizations } from '@/lib/db/schema'
 * - Import all schemas: import * as schema from '@/lib/db/schema'
 */

// Core entity schemas
export * from './users'
export * from './organizations'
export * from './roles'

// Content and onboarding schemas
export * from './content'
export * from './invitations'
export * from './audit'

// Re-export all table schemas for Drizzle ORM
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

// Import relations
import { allRelations } from './relations'

// Schema object for Drizzle ORM initialization
export const schema = {
  // Core entities
  users,
  organizations,
  organizationMemberships,
  roles,
  permissions,
  
  // Content and onboarding
  onboardingPaths,
  onboardingSteps,
  onboardingSessions,
  userProgress,
  onboardingContent,
  organizationOnboardingConfigs,
  
  // Invitations and achievements
  invitations,
  teamInvitations,
  onboardingMilestones,
  userAchievements,
  
  // Audit and analytics
  auditLogs,
  onboardingAnalytics,
  systemMetrics,
  errorLogs,
  
  // Relations
  ...allRelations
} as const

// Type exports for Drizzle ORM integration
export type Schema = typeof schema

// Database table names for type safety
export const TABLE_NAMES = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  ORGANIZATION_MEMBERSHIPS: 'organization_memberships',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  ONBOARDING_PATHS: 'onboarding_paths',
  ONBOARDING_STEPS: 'onboarding_steps',
  ONBOARDING_SESSIONS: 'onboarding_sessions',
  USER_PROGRESS: 'user_progress',
  ONBOARDING_CONTENT: 'onboarding_content',
  ORGANIZATION_ONBOARDING_CONFIGS: 'organization_onboarding_configs',
  INVITATIONS: 'invitations',
  TEAM_INVITATIONS: 'team_invitations',
  ONBOARDING_MILESTONES: 'onboarding_milestones',
  USER_ACHIEVEMENTS: 'user_achievements',
  AUDIT_LOGS: 'audit_logs',
  ONBOARDING_ANALYTICS: 'onboarding_analytics',
  SYSTEM_METRICS: 'system_metrics',
  ERROR_LOGS: 'error_logs'
} as const

export type TableName = keyof typeof TABLE_NAMES