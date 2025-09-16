// Onboarding System TypeScript Models
// Requirements: 1.1, 2.1, 6.1

export interface OnboardingPathRow {
  id: string
  name: string
  description: string | null
  target_role: string
  subscription_tier: string | null
  estimated_duration: number
  is_active: boolean
  prerequisites: string[]
  learning_objectives: string[]
  success_criteria: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OnboardingPathInsert extends Omit<OnboardingPathRow, 'id' | 'created_at' | 'updated_at'> {}
export interface OnboardingPathUpdate extends Partial<OnboardingPathInsert> {}

export interface OnboardingStepRow {
  id: string
  path_id: string
  title: string
  description: string | null
  step_type: 'tutorial' | 'exercise' | 'setup' | 'validation' | 'milestone'
  step_order: number
  estimated_time: number
  is_required: boolean
  dependencies: string[]
  content: Record<string, unknown>
  interactive_elements: Record<string, unknown>
  success_criteria: Record<string, unknown>
  validation_rules: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OnboardingStepInsert extends Omit<OnboardingStepRow, 'id' | 'created_at' | 'updated_at'> {}
export interface OnboardingStepUpdate extends Partial<OnboardingStepInsert> {}

export interface OnboardingSessionRow {
  id: string
  user_id: string
  organization_id: string | null
  path_id: string | null
  session_type: 'individual' | 'team_admin' | 'team_member'
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  current_step_id: string | null
  current_step_index: number
  progress_percentage: number
  time_spent: number
  started_at: string
  last_active_at: string
  completed_at: string | null
  paused_at: string | null
  session_metadata: Record<string, unknown>
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OnboardingSessionInsert extends Omit<OnboardingSessionRow, 'id' | 'created_at' | 'updated_at'> {}
export interface OnboardingSessionUpdate extends Partial<OnboardingSessionInsert> {}

export interface UserProgressRow {
  id: string
  session_id: string
  step_id: string
  user_id: string
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  started_at: string | null
  completed_at: string | null
  time_spent: number
  attempts: number
  score: number | null
  feedback: Record<string, unknown>
  user_actions: Record<string, unknown>
  step_result: Record<string, unknown>
  errors: Record<string, unknown>
  achievements: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserProgressInsert extends Omit<UserProgressRow, 'id' | 'created_at' | 'updated_at'> {}
export interface UserProgressUpdate extends Partial<UserProgressInsert> {}

export interface TeamInvitationRow {
  id: string
  organization_id: string
  invited_by: string | null
  email: string
  role: string
  custom_message: string | null
  onboarding_path_override: string | null
  invitation_token: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: string
  accepted_at: string | null
  onboarding_session_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TeamInvitationInsert extends Omit<TeamInvitationRow, 'id' | 'invitation_token' | 'created_at' | 'updated_at'> {}
export interface TeamInvitationUpdate extends Partial<TeamInvitationInsert> {}

export interface OrganizationOnboardingConfigRow {
  id: string
  organization_id: string
  welcome_message: string | null
  branding_assets: Record<string, unknown>
  custom_content: Record<string, unknown>
  role_configurations: Record<string, unknown>
  mandatory_modules: string[]
  completion_requirements: Record<string, unknown>
  notification_settings: Record<string, unknown>
  integration_settings: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationOnboardingConfigInsert extends Omit<OrganizationOnboardingConfigRow, 'id' | 'created_at' | 'updated_at'> {}
export interface OrganizationOnboardingConfigUpdate extends Partial<OrganizationOnboardingConfigInsert> {}

export interface OnboardingAnalyticsRow {
  id: string
  organization_id: string | null
  session_id: string | null
  user_id: string | null
  event_type: string
  event_data: Record<string, unknown>
  path_id: string | null
  step_id: string | null
  timestamp: string
  user_agent: string | null
  ip_address: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface OnboardingAnalyticsInsert extends Omit<OnboardingAnalyticsRow, 'id' | 'created_at'> {}

export interface OnboardingContentRow {
  id: string
  content_type: 'text' | 'html' | 'markdown' | 'video' | 'image' | 'interactive' | 'template'
  title: string
  description: string | null
  content_data: Record<string, unknown>
  media_urls: string[]
  interactive_config: Record<string, unknown>
  tags: string[]
  version: number
  is_active: boolean
  organization_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface OnboardingContentInsert extends Omit<OnboardingContentRow, 'id' | 'created_at' | 'updated_at'> {}
export interface OnboardingContentUpdate extends Partial<OnboardingContentInsert> {}

export interface OnboardingMilestoneRow {
  id: string
  name: string
  description: string | null
  milestone_type: 'progress' | 'achievement' | 'completion' | 'time_based'
  criteria: Record<string, unknown>
  reward_data: Record<string, unknown>
  points: number
  is_active: boolean
  organization_id: string | null
  created_at: string
  updated_at: string
}

export interface OnboardingMilestoneInsert extends Omit<OnboardingMilestoneRow, 'id' | 'created_at' | 'updated_at'> {}
export interface OnboardingMilestoneUpdate extends Partial<OnboardingMilestoneInsert> {}

export interface UserAchievementRow {
  id: string
  user_id: string
  session_id: string
  milestone_id: string
  earned_at: string
  achievement_data: Record<string, unknown>
  created_at: string
}

export interface UserAchievementInsert extends Omit<UserAchievementRow, 'id' | 'created_at'> {}

// Composite types for API responses and business logic
export interface OnboardingPath extends OnboardingPathRow {
  steps?: OnboardingStep[]
}

export interface OnboardingStep extends OnboardingStepRow {
  path?: OnboardingPath
}

export interface OnboardingSession extends OnboardingSessionRow {
  user?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  organization?: {
    id: string
    name: string
    slug: string
  }
  path?: OnboardingPath
  current_step?: OnboardingStep
  progress?: UserProgress[]
}

export interface UserProgress extends UserProgressRow {
  step?: OnboardingStep
  session?: OnboardingSession
}

export interface TeamInvitation extends TeamInvitationRow {
  organization?: {
    id: string
    name: string
    slug: string
  }
  invited_by_user?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  onboarding_path?: OnboardingPath
}

// Enums for type safety
export const OnboardingSessionType = {
  INDIVIDUAL: 'individual',
  TEAM_ADMIN: 'team_admin',
  TEAM_MEMBER: 'team_member'
} as const

export const OnboardingSessionStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned'
} as const

export const OnboardingStepType = {
  TUTORIAL: 'tutorial',
  EXERCISE: 'exercise',
  SETUP: 'setup',
  VALIDATION: 'validation',
  MILESTONE: 'milestone'
} as const

export const UserProgressStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  FAILED: 'failed'
} as const

export const TeamInvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
} as const

export const OnboardingContentType = {
  TEXT: 'text',
  HTML: 'html',
  MARKDOWN: 'markdown',
  VIDEO: 'video',
  IMAGE: 'image',
  INTERACTIVE: 'interactive',
  TEMPLATE: 'template'
} as const

export const OnboardingMilestoneType = {
  PROGRESS: 'progress',
  ACHIEVEMENT: 'achievement',
  COMPLETION: 'completion',
  TIME_BASED: 'time_based'
} as const

// Business logic types
export interface OnboardingContext {
  userId: string
  organizationId?: string
  userRole?: string
  subscriptionTier?: string
  preferences?: Record<string, unknown>
}

export interface StepResult {
  stepId: string
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  timeSpent: number
  userActions: Record<string, unknown>
  feedback?: Record<string, unknown>
  errors?: Record<string, unknown>
  achievements?: Record<string, unknown>
}

export interface OnboardingProgress {
  sessionId: string
  currentStepIndex: number
  completedSteps: string[]
  skippedSteps: string[]
  milestones: UserAchievementRow[]
  overallProgress: number
  timeSpent: number
  lastUpdated: string
}

export interface OnboardingCustomization {
  organizationId: string
  welcomeMessage: string
  brandingAssets: Record<string, unknown>
  customSteps: Record<string, unknown>[]
  roleSpecificContent: Record<string, Record<string, unknown>>
  integrationSettings: Record<string, unknown>[]
}

export interface OnboardingAnalytics {
  organizationId?: string
  period: {
    start: string
    end: string
  }
  metrics: {
    totalSessions: number
    completedSessions: number
    averageCompletionTime: number
    averageStepsCompleted: number
    mostSkippedSteps: Array<{
      stepId: string
      stepTitle: string
      skipCount: number
    }>
    commonBlockers: Array<{
      stepId: string
      stepTitle: string
      blockerType: string
      frequency: number
    }>
    satisfactionScore: number
  }
  completionRates: Array<{
    pathId: string
    pathName: string
    completionRate: number
  }>
  dropOffPoints: Array<{
    stepId: string
    stepTitle: string
    dropOffRate: number
  }>
}

export interface OnboardingMetrics {
  totalSessions: number
  completedSessions: number
  averageCompletionTime: number
  averageStepsCompleted: number
  mostSkippedSteps: Array<{
    stepId: string
    stepTitle: string
    skipCount: number
  }>
  commonBlockers: Array<{
    stepId: string
    stepTitle: string
    blockerType: string
    frequency: number
  }>
  satisfactionScore: number
}