/**
 * Onboarding Validation Schemas
 * Requirements: 1.1, 2.1, 6.1
 */

import { z } from 'zod'

// Enum schemas
export const onboardingSessionTypeSchema = z.enum(['individual', 'team_admin', 'team_member'])
export const onboardingSessionStatusSchema = z.enum(['active', 'paused', 'completed', 'abandoned'])
export const onboardingStepTypeSchema = z.enum(['tutorial', 'exercise', 'setup', 'validation', 'milestone'])
export const userProgressStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'skipped', 'failed'])
export const teamInvitationStatusSchema = z.enum(['pending', 'accepted', 'expired', 'revoked'])
export const onboardingContentTypeSchema = z.enum(['text', 'html', 'markdown', 'video', 'image', 'interactive', 'template'])
export const onboardingMilestoneTypeSchema = z.enum(['progress', 'achievement', 'completion', 'time_based'])

// Base validation schemas
export const onboardingPathSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullable(),
  target_role: z.string().min(1, 'Target role is required'),
  subscription_tier: z.string().nullable(),
  estimated_duration: z.number().int().min(0, 'Duration must be non-negative'),
  is_active: z.boolean(),
  prerequisites: z.array(z.string()),
  learning_objectives: z.array(z.string()),
  success_criteria: z.record(z.unknown()),
  metadata: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string()
})

export const onboardingStepSchema = z.object({
  id: z.string().uuid(),
  path_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullable(),
  step_type: onboardingStepTypeSchema,
  step_order: z.number().int().min(1, 'Step order must be positive'),
  estimated_time: z.number().int().min(0, 'Estimated time must be non-negative'),
  is_required: z.boolean(),
  dependencies: z.array(z.string().uuid()),
  content: z.record(z.unknown()),
  interactive_elements: z.record(z.unknown()),
  success_criteria: z.record(z.unknown()),
  validation_rules: z.record(z.unknown()),
  metadata: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string()
})

export const onboardingSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),
  path_id: z.string().uuid().nullable(),
  session_type: onboardingSessionTypeSchema,
  status: onboardingSessionStatusSchema,
  current_step_id: z.string().uuid().nullable(),
  current_step_index: z.number().int().min(0),
  progress_percentage: z.number().min(0).max(100),
  time_spent: z.number().int().min(0),
  started_at: z.string(),
  last_active_at: z.string(),
  completed_at: z.string().nullable(),
  paused_at: z.string().nullable(),
  session_metadata: z.record(z.unknown()),
  preferences: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string()
})

export const userProgressSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  step_id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: userProgressStatusSchema,
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  time_spent: z.number().int().min(0),
  attempts: z.number().int().min(0),
  score: z.number().min(0).max(100).nullable(),
  feedback: z.record(z.unknown()),
  user_actions: z.record(z.unknown()),
  step_result: z.record(z.unknown()),
  errors: z.record(z.unknown()),
  achievements: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string()
})

export const teamInvitationSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  invited_by: z.string().uuid().nullable(),
  email: z.string().email('Invalid email format'),
  role: z.string().min(1, 'Role is required'),
  custom_message: z.string().nullable(),
  onboarding_path_override: z.string().uuid().nullable(),
  invitation_token: z.string(),
  status: teamInvitationStatusSchema,
  expires_at: z.string(),
  accepted_at: z.string().nullable(),
  onboarding_session_id: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string()
})

export const organizationOnboardingConfigSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  welcome_message: z.string().nullable(),
  branding_assets: z.record(z.unknown()),
  custom_content: z.record(z.unknown()),
  role_configurations: z.record(z.unknown()),
  mandatory_modules: z.array(z.string()),
  completion_requirements: z.record(z.unknown()),
  notification_settings: z.record(z.unknown()),
  integration_settings: z.record(z.unknown()),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
})

export const onboardingAnalyticsSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),
  session_id: z.string().uuid().nullable(),
  user_id: z.string().uuid().nullable(),
  event_type: z.string().min(1, 'Event type is required'),
  event_data: z.record(z.unknown()),
  path_id: z.string().uuid().nullable(),
  step_id: z.string().uuid().nullable(),
  timestamp: z.string(),
  user_agent: z.string().nullable(),
  ip_address: z.string().nullable(),
  metadata: z.record(z.unknown()),
  created_at: z.string()
})

export const onboardingContentSchema = z.object({
  id: z.string().uuid(),
  content_type: onboardingContentTypeSchema,
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullable(),
  content_data: z.record(z.unknown()),
  media_urls: z.array(z.string().url()),
  interactive_config: z.record(z.unknown()),
  tags: z.array(z.string()),
  version: z.number().int().min(1),
  is_active: z.boolean(),
  organization_id: z.string().uuid().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string()
})

export const onboardingMilestoneSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullable(),
  milestone_type: onboardingMilestoneTypeSchema,
  criteria: z.record(z.unknown()),
  reward_data: z.record(z.unknown()),
  points: z.number().int().min(0),
  is_active: z.boolean(),
  organization_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string()
})

export const userAchievementSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_id: z.string().uuid(),
  milestone_id: z.string().uuid(),
  earned_at: z.string(),
  achievement_data: z.record(z.unknown()),
  created_at: z.string()
})

// Create schemas (for inserts)
export const createOnboardingPathSchema = onboardingPathSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const createOnboardingStepSchema = onboardingStepSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const createOnboardingSessionSchema = onboardingSessionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const createUserProgressSchema = userProgressSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const createTeamInvitationSchema = teamInvitationSchema.omit({
  id: true,
  invitation_token: true,
  created_at: true,
  updated_at: true
})

export const createOrganizationOnboardingConfigSchema = organizationOnboardingConfigSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const createOnboardingAnalyticsSchema = onboardingAnalyticsSchema.omit({
  id: true,
  created_at: true
})

export const createOnboardingContentSchema = onboardingContentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const createOnboardingMilestoneSchema = onboardingMilestoneSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const createUserAchievementSchema = userAchievementSchema.omit({
  id: true,
  created_at: true
})

// Update schemas (for updates)
export const updateOnboardingPathSchema = createOnboardingPathSchema.partial()
export const updateOnboardingStepSchema = createOnboardingStepSchema.partial()
export const updateOnboardingSessionSchema = createOnboardingSessionSchema.partial()
export const updateUserProgressSchema = createUserProgressSchema.partial()
export const updateTeamInvitationSchema = createTeamInvitationSchema.partial()
export const updateOrganizationOnboardingConfigSchema = createOrganizationOnboardingConfigSchema.partial()
export const updateOnboardingContentSchema = createOnboardingContentSchema.partial()
export const updateOnboardingMilestoneSchema = createOnboardingMilestoneSchema.partial()

// Business logic schemas
export const onboardingContextSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  userRole: z.string().optional(),
  subscriptionTier: z.string().optional(),
  preferences: z.record(z.unknown()).optional()
})

export const stepResultSchema = z.object({
  stepId: z.string().uuid(),
  status: userProgressStatusSchema,
  timeSpent: z.number().int().min(0),
  userActions: z.array(z.record(z.unknown())),
  feedback: z.record(z.unknown()).optional(),
  errors: z.array(z.record(z.unknown())).optional(),
  achievements: z.array(z.record(z.unknown())).optional()
})

export const onboardingProgressSchema = z.object({
  sessionId: z.string().uuid(),
  currentStepIndex: z.number().int().min(0),
  completedSteps: z.array(z.string().uuid()),
  skippedSteps: z.array(z.string().uuid()),
  milestones: z.array(userAchievementSchema),
  overallProgress: z.number().min(0).max(100),
  timeSpent: z.number().int().min(0),
  lastUpdated: z.string()
})

// Validation helper functions
export function validateOnboardingPath(data: unknown) {
  return onboardingPathSchema.parse(data)
}

export function validateCreateOnboardingPath(data: unknown) {
  return createOnboardingPathSchema.parse(data)
}

export function validateUpdateOnboardingPath(data: unknown) {
  return updateOnboardingPathSchema.parse(data)
}

export function validateOnboardingStep(data: unknown) {
  return onboardingStepSchema.parse(data)
}

export function validateCreateOnboardingStep(data: unknown) {
  return createOnboardingStepSchema.parse(data)
}

export function validateUpdateOnboardingStep(data: unknown) {
  return updateOnboardingStepSchema.parse(data)
}

export function validateOnboardingSession(data: unknown) {
  return onboardingSessionSchema.parse(data)
}

export function validateCreateOnboardingSession(data: unknown) {
  return createOnboardingSessionSchema.parse(data)
}

export function validateUpdateOnboardingSession(data: unknown) {
  return updateOnboardingSessionSchema.parse(data)
}

export function validateUserProgress(data: unknown) {
  return userProgressSchema.parse(data)
}

export function validateCreateUserProgress(data: unknown) {
  return createUserProgressSchema.parse(data)
}

export function validateUpdateUserProgress(data: unknown) {
  return updateUserProgressSchema.parse(data)
}

export function validateTeamInvitation(data: unknown) {
  return teamInvitationSchema.parse(data)
}

export function validateCreateTeamInvitation(data: unknown) {
  return createTeamInvitationSchema.parse(data)
}

export function validateUpdateTeamInvitation(data: unknown) {
  return updateTeamInvitationSchema.parse(data)
}

export function validateOrganizationOnboardingConfig(data: unknown) {
  return organizationOnboardingConfigSchema.parse(data)
}

export function validateCreateOrganizationOnboardingConfig(data: unknown) {
  return createOrganizationOnboardingConfigSchema.parse(data)
}

export function validateUpdateOrganizationOnboardingConfig(data: unknown) {
  return updateOrganizationOnboardingConfigSchema.parse(data)
}

export function validateOnboardingAnalytics(data: unknown) {
  return onboardingAnalyticsSchema.parse(data)
}

export function validateCreateOnboardingAnalytics(data: unknown) {
  return createOnboardingAnalyticsSchema.parse(data)
}

export function validateOnboardingContent(data: unknown) {
  return onboardingContentSchema.parse(data)
}

export function validateCreateOnboardingContent(data: unknown) {
  return createOnboardingContentSchema.parse(data)
}

export function validateUpdateOnboardingContent(data: unknown) {
  return updateOnboardingContentSchema.parse(data)
}

export function validateOnboardingMilestone(data: unknown) {
  return onboardingMilestoneSchema.parse(data)
}

export function validateCreateOnboardingMilestone(data: unknown) {
  return createOnboardingMilestoneSchema.parse(data)
}

export function validateUpdateOnboardingMilestone(data: unknown) {
  return updateOnboardingMilestoneSchema.parse(data)
}

export function validateUserAchievement(data: unknown) {
  return userAchievementSchema.parse(data)
}

export function validateCreateUserAchievement(data: unknown) {
  return createUserAchievementSchema.parse(data)
}

export function validateOnboardingContext(data: unknown) {
  return onboardingContextSchema.parse(data)
}

export function validateStepResult(data: unknown) {
  return stepResultSchema.parse(data)
}

export function validateOnboardingProgress(data: unknown) {
  return onboardingProgressSchema.parse(data)
}