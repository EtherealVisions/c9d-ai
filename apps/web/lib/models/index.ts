/**
 * Core data models and utilities for Account Management & Organizational Modeling
 * This module provides TypeScript interfaces, validation schemas, and database utilities
 */

// Export all types and interfaces
export type {
  // Core entity types
  User,
  Organization,
  Membership,
  Role,
  Permission,
  Invitation,
  AuditLog,
  
  // Base types
  BaseEntity,
  MembershipStatus,
  InvitationStatus,
  DatabaseTable,
  
  // Database row types
  UserRow,
  OrganizationRow,
  MembershipRow,
  RoleRow,
  PermissionRow,
  InvitationRow,
  AuditLogRow,
  
  // Extended types with relations
  UserWithMemberships,
  OrganizationWithMembers,
  MembershipWithRelations
} from './types'

// Export validation schemas
export {
  // Entity schemas
  userSchema,
  organizationSchema,
  membershipSchema,
  roleSchema,
  permissionSchema,
  invitationSchema,
  auditLogSchema,
  
  // Create schemas
  createUserSchema,
  createOrganizationSchema,
  createMembershipSchema,
  createRoleSchema,
  createPermissionSchema,
  createInvitationSchema,
  createAuditLogSchema,
  
  // Update schemas
  updateUserSchema,
  updateOrganizationSchema,
  updateMembershipSchema,
  updateRoleSchema,
  updateInvitationSchema,
  
  // Database row schemas
  userRowSchema,
  organizationRowSchema,
  membershipRowSchema,
  roleRowSchema,
  permissionRowSchema,
  invitationRowSchema,
  auditLogRowSchema,
  
  // Enum schemas
  membershipStatusSchema,
  invitationStatusSchema,
  
  // Validation helper functions
  validateUser,
  validateCreateUser,
  validateUpdateUser,
  validateOrganization,
  validateCreateOrganization,
  validateUpdateOrganization,
  validateMembership,
  validateCreateMembership,
  validateUpdateMembership,
  validateRole,
  validateCreateRole,
  validateUpdateRole,
  validatePermission,
  validateCreatePermission,
  validateInvitation,
  validateCreateInvitation,
  validateUpdateInvitation,
  validateAuditLog,
  validateCreateAuditLog
} from './schemas'

// Export transformation utilities
export {
  transformUserRow,
  transformOrganizationRow,
  transformMembershipRow,
  transformRoleRow,
  transformPermissionRow,
  transformInvitationRow,
  transformAuditLogRow,
  transformUserToRow,
  transformOrganizationToRow,
  transformMembershipToRow,
  transformRoleToRow,
  transformPermissionToRow,
  transformInvitationToRow,
  transformAuditLogToRow,
  transformRows,
  transformRowSafe
} from './transformers'

// Export database utilities
export {
  TypedSupabaseClient,
  createTypedSupabaseClient,
  validateDatabaseSchema,
  DatabaseError,
  NotFoundError,
  ValidationError
} from './database'

export type {
  DatabaseConfig,
  QueryOptions
} from './database'

// Export constants
export { DATABASE_TABLES } from './types'

// Export onboarding types
export type {
  // Onboarding row types
  OnboardingPathRow,
  OnboardingStepRow,
  OnboardingSessionRow,
  UserProgressRow,
  TeamInvitationRow,
  OrganizationOnboardingConfigRow,
  OnboardingAnalyticsRow,
  OnboardingContentRow,
  OnboardingMilestoneRow,
  UserAchievementRow,
  
  // Onboarding insert/update types
  OnboardingPathInsert,
  OnboardingPathUpdate,
  OnboardingStepInsert,
  OnboardingStepUpdate,
  OnboardingSessionInsert,
  OnboardingSessionUpdate,
  UserProgressInsert,
  UserProgressUpdate,
  TeamInvitationInsert,
  TeamInvitationUpdate,
  OrganizationOnboardingConfigInsert,
  OrganizationOnboardingConfigUpdate,
  OnboardingAnalyticsInsert,
  OnboardingContentInsert,
  OnboardingContentUpdate,
  OnboardingMilestoneInsert,
  OnboardingMilestoneUpdate,
  UserAchievementInsert,
  
  // Onboarding composite types
  OnboardingPath,
  OnboardingStep,
  OnboardingSession,
  UserProgress,
  TeamInvitation,
  
  // Onboarding business logic types
  OnboardingContext,
  StepResult,
  OnboardingProgress,
  OnboardingCustomization,
  OnboardingAnalytics,
  OnboardingMetrics
} from './onboarding-types'

// Export onboarding enums
export {
  OnboardingSessionType,
  OnboardingSessionStatus,
  OnboardingStepType,
  UserProgressStatus,
  TeamInvitationStatus,
  OnboardingContentType,
  OnboardingMilestoneType
} from './onboarding-types'