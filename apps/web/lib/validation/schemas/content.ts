/**
 * Content Validation Schemas
 * 
 * This file contains Zod validation schemas for onboarding content and related operations.
 * Schemas are generated from Drizzle definitions and extended with business rules.
 */

import { z } from 'zod'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { 
  onboardingPaths, 
  onboardingSteps, 
  onboardingSessions, 
  userProgress, 
  onboardingContent,
  organizationOnboardingConfigs,
  ONBOARDING_SESSION_TYPES,
  ONBOARDING_SESSION_STATUSES,
  ONBOARDING_STEP_TYPES,
  USER_PROGRESS_STATUSES,
  ONBOARDING_CONTENT_TYPES
} from '@/lib/db/schema/content'

// Base schemas generated from Drizzle definitions
export const selectOnboardingPathSchema = createSelectSchema(onboardingPaths)
export const insertOnboardingPathSchema = createInsertSchema(onboardingPaths)
export const selectOnboardingStepSchema = createSelectSchema(onboardingSteps)
export const insertOnboardingStepSchema = createInsertSchema(onboardingSteps)
export const selectOnboardingSessionSchema = createSelectSchema(onboardingSessions)
export const insertOnboardingSessionSchema = createInsertSchema(onboardingSessions)
export const selectUserProgressSchema = createSelectSchema(userProgress)
export const insertUserProgressSchema = createInsertSchema(userProgress)
export const selectOnboardingContentSchema = createSelectSchema(onboardingContent)
export const insertOnboardingContentSchema = createInsertSchema(onboardingContent)
export const selectOrganizationOnboardingConfigSchema = createSelectSchema(organizationOnboardingConfigs)
export const insertOrganizationOnboardingConfigSchema = createInsertSchema(organizationOnboardingConfigs)

// Onboarding path validation schemas
export const createOnboardingPathSchema = insertOnboardingPathSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  name: z.string()
    .min(1, 'Path name is required')
    .max(255, 'Path name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\s\-_()]+$/, 'Path name contains invalid characters'),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable(),
  
  targetRole: z.string()
    .min(1, 'Target role is required')
    .max(100, 'Target role must be less than 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Target role can only contain letters, numbers, hyphens, and underscores'),
  
  subscriptionTier: z.enum(['free', 'starter', 'professional', 'enterprise'])
    .nullable(),
  
  estimatedDuration: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(10080, 'Duration cannot exceed 1 week (10080 minutes)'),
  
  isActive: z.boolean().default(true),
  
  prerequisites: z.array(z.object({
    type: z.enum(['role', 'permission', 'completion', 'custom']),
    value: z.string().min(1),
    description: z.string().optional()
  })).default([]),
  
  learningObjectives: z.array(z.string().min(1).max(500))
    .min(1, 'At least one learning objective is required')
    .max(10, 'Cannot have more than 10 learning objectives'),
  
  successCriteria: z.object({
    completionRate: z.number().min(0).max(100).default(100),
    timeLimit: z.number().int().min(0).optional(),
    requiredSteps: z.array(z.string().uuid()).default([]),
    customCriteria: z.record(z.unknown()).default({})
  }).default({}),
  
  metadata: z.record(z.unknown()).default({})
})

export const updateOnboardingPathSchema = createOnboardingPathSchema.partial().omit({
  targetRole: true // Target role cannot be changed after creation
})

// Onboarding step validation schemas
export const createOnboardingStepSchema = insertOnboardingStepSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  pathId: z.string().uuid('Invalid path ID'),
  
  title: z.string()
    .min(1, 'Step title is required')
    .max(255, 'Step title must be less than 255 characters'),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable(),
  
  stepType: z.enum(Object.values(ONBOARDING_STEP_TYPES) as [string, ...string[]]),
  
  stepOrder: z.number()
    .int('Step order must be an integer')
    .min(1, 'Step order must be at least 1'),
  
  estimatedTime: z.number()
    .int('Estimated time must be an integer')
    .min(1, 'Estimated time must be at least 1 minute')
    .max(480, 'Estimated time cannot exceed 8 hours (480 minutes)'),
  
  isRequired: z.boolean().default(true),
  
  dependencies: z.array(z.string().uuid('Invalid dependency step ID')).default([]),
  
  content: z.object({
    type: z.enum(['text', 'html', 'markdown', 'video', 'interactive']),
    data: z.unknown(),
    resources: z.array(z.object({
      type: z.enum(['link', 'file', 'video', 'image']),
      url: z.string().url(),
      title: z.string(),
      description: z.string().optional()
    })).default([])
  }).default({}),
  
  interactiveElements: z.object({
    components: z.array(z.object({
      type: z.enum(['form', 'quiz', 'checklist', 'upload', 'integration']),
      config: z.record(z.unknown()),
      validation: z.record(z.unknown()).optional()
    })).default([]),
    actions: z.array(z.object({
      type: z.enum(['navigate', 'submit', 'validate', 'complete']),
      config: z.record(z.unknown())
    })).default([])
  }).default({}),
  
  successCriteria: z.object({
    completionType: z.enum(['automatic', 'manual', 'validation']).default('manual'),
    validationRules: z.array(z.object({
      field: z.string(),
      rule: z.enum(['required', 'format', 'custom']),
      value: z.unknown().optional(),
      message: z.string()
    })).default([]),
    minimumScore: z.number().min(0).max(100).optional(),
    timeLimit: z.number().int().min(0).optional()
  }).default({}),
  
  validationRules: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({})
})

export const updateOnboardingStepSchema = createOnboardingStepSchema.partial().omit({
  pathId: true, // Path cannot be changed
  stepOrder: true // Order should be managed separately
})

// Onboarding session validation schemas
export const createOnboardingSessionSchema = insertOnboardingSessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  lastActiveAt: true
}).extend({
  userId: z.string().uuid('Invalid user ID'),
  organizationId: z.string().uuid('Invalid organization ID').nullable(),
  pathId: z.string().uuid('Invalid path ID').nullable(),
  
  sessionType: z.enum(Object.values(ONBOARDING_SESSION_TYPES) as [string, ...string[]]),
  
  status: z.enum(Object.values(ONBOARDING_SESSION_STATUSES) as [string, ...string[]])
    .default('active'),
  
  currentStepId: z.string().uuid('Invalid step ID').nullable(),
  currentStepIndex: z.number().int().min(0).default(0),
  progressPercentage: z.number().int().min(0).max(100).default(0),
  timeSpent: z.number().int().min(0).default(0),
  
  sessionMetadata: z.object({
    startReason: z.enum(['invitation', 'self_service', 'admin_assigned']).optional(),
    customizations: z.record(z.unknown()).default({}),
    integrations: z.record(z.unknown()).default({})
  }).default({}),
  
  preferences: z.object({
    notifications: z.boolean().default(true),
    reminders: z.boolean().default(true),
    pace: z.enum(['self_paced', 'guided', 'scheduled']).default('self_paced'),
    language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default('en')
  }).default({})
})

export const updateOnboardingSessionSchema = z.object({
  status: z.enum(Object.values(ONBOARDING_SESSION_STATUSES) as [string, ...string[]]).optional(),
  currentStepId: z.string().uuid('Invalid step ID').nullable().optional(),
  currentStepIndex: z.number().int().min(0).optional(),
  progressPercentage: z.number().int().min(0).max(100).optional(),
  timeSpent: z.number().int().min(0).optional(),
  sessionMetadata: z.record(z.unknown()).optional(),
  preferences: z.record(z.unknown()).optional(),
  completedAt: z.date().nullable().optional(),
  pausedAt: z.date().nullable().optional()
})

// User progress validation schemas
export const createUserProgressSchema = insertUserProgressSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  sessionId: z.string().uuid('Invalid session ID'),
  stepId: z.string().uuid('Invalid step ID'),
  userId: z.string().uuid('Invalid user ID'),
  
  status: z.enum(Object.values(USER_PROGRESS_STATUSES) as [string, ...string[]])
    .default('not_started'),
  
  timeSpent: z.number().int().min(0).default(0),
  attempts: z.number().int().min(0).default(0),
  score: z.number().int().min(0).max(100).nullable(),
  
  feedback: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comments: z.string().max(1000).optional(),
    suggestions: z.string().max(1000).optional(),
    difficulty: z.enum(['too_easy', 'just_right', 'too_hard']).optional()
  }).default({}),
  
  userActions: z.array(z.object({
    action: z.string(),
    timestamp: z.date(),
    data: z.record(z.unknown()).optional()
  })).default([]),
  
  stepResult: z.object({
    outputs: z.record(z.unknown()).default({}),
    artifacts: z.array(z.object({
      type: z.string(),
      url: z.string().url(),
      metadata: z.record(z.unknown()).optional()
    })).default([]),
    validationResults: z.record(z.unknown()).default({})
  }).default({}),
  
  errors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    timestamp: z.date(),
    context: z.record(z.unknown()).optional()
  })).default([]),
  
  achievements: z.array(z.object({
    id: z.string().uuid(),
    earnedAt: z.date(),
    data: z.record(z.unknown()).optional()
  })).default([])
})

export const updateUserProgressSchema = z.object({
  status: z.enum(Object.values(USER_PROGRESS_STATUSES) as [string, ...string[]]).optional(),
  timeSpent: z.number().int().min(0).optional(),
  attempts: z.number().int().min(0).optional(),
  score: z.number().int().min(0).max(100).nullable().optional(),
  feedback: z.record(z.unknown()).optional(),
  userActions: z.array(z.record(z.unknown())).optional(),
  stepResult: z.record(z.unknown()).optional(),
  errors: z.array(z.record(z.unknown())).optional(),
  achievements: z.array(z.record(z.unknown())).optional(),
  startedAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional()
})

// Onboarding content validation schemas
export const createOnboardingContentSchema = insertOnboardingContentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  contentType: z.enum(Object.values(ONBOARDING_CONTENT_TYPES) as [string, ...string[]]),
  
  title: z.string()
    .min(1, 'Content title is required')
    .max(255, 'Content title must be less than 255 characters'),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable(),
  
  contentData: z.record(z.unknown()).default({}),
  
  mediaUrls: z.array(z.string().url('Invalid media URL')).default([]),
  
  interactiveConfig: z.object({
    components: z.array(z.record(z.unknown())).default([]),
    settings: z.record(z.unknown()).default({})
  }).default({}),
  
  tags: z.array(z.string().min(1).max(50))
    .max(20, 'Cannot have more than 20 tags')
    .default([]),
  
  version: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  organizationId: z.string().uuid('Invalid organization ID').nullable(),
  createdBy: z.string().uuid('Invalid creator ID').nullable()
})

export const updateOnboardingContentSchema = createOnboardingContentSchema.partial().omit({
  organizationId: true, // Organization cannot be changed
  createdBy: true // Creator cannot be changed
}).extend({
  version: z.number().int().min(1).optional()
})

// Organization onboarding config validation schemas
export const createOrganizationOnboardingConfigSchema = insertOrganizationOnboardingConfigSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  organizationId: z.string().uuid('Invalid organization ID'),
  
  welcomeMessage: z.string()
    .max(2000, 'Welcome message must be less than 2000 characters')
    .nullable(),
  
  brandingAssets: z.object({
    logo: z.string().url().optional(),
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
    secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
    favicon: z.string().url().optional(),
    customCss: z.string().max(10000).optional()
  }).default({}),
  
  customContent: z.record(z.unknown()).default({}),
  
  roleConfigurations: z.record(z.object({
    defaultPath: z.string().uuid().optional(),
    customizations: z.record(z.unknown()).default({}),
    permissions: z.array(z.string()).default([])
  })).default({}),
  
  mandatoryModules: z.array(z.string().uuid()).default([]),
  
  completionRequirements: z.object({
    minimumSteps: z.number().int().min(0).optional(),
    minimumTime: z.number().int().min(0).optional(),
    requiredModules: z.array(z.string().uuid()).default([]),
    customCriteria: z.record(z.unknown()).default({})
  }).default({}),
  
  notificationSettings: z.object({
    welcome: z.boolean().default(true),
    progress: z.boolean().default(true),
    completion: z.boolean().default(true),
    reminders: z.boolean().default(true),
    customNotifications: z.record(z.boolean()).default({})
  }).default({}),
  
  integrationSettings: z.object({
    slack: z.object({
      enabled: z.boolean().default(false),
      webhookUrl: z.string().url().optional(),
      channels: z.array(z.string()).default([])
    }).optional(),
    email: z.object({
      enabled: z.boolean().default(true),
      templates: z.record(z.string()).default({})
    }).default({}),
    sso: z.object({
      enabled: z.boolean().default(false),
      provider: z.string().optional(),
      config: z.record(z.unknown()).default({})
    }).optional()
  }).default({}),
  
  isActive: z.boolean().default(true)
})

export const updateOrganizationOnboardingConfigSchema = createOrganizationOnboardingConfigSchema.partial().omit({
  organizationId: true // Organization cannot be changed
})

// API response schemas
export const onboardingPathApiResponseSchema = selectOnboardingPathSchema.extend({
  stepCount: z.number().int().min(0),
  activeSessionCount: z.number().int().min(0),
  completionRate: z.number().min(0).max(100),
  averageCompletionTime: z.number().min(0).nullable()
})

export const onboardingSessionApiResponseSchema = selectOnboardingSessionSchema.extend({
  path: z.object({
    id: z.string().uuid(),
    name: z.string(),
    estimatedDuration: z.number().int()
  }).nullable(),
  currentStep: z.object({
    id: z.string().uuid(),
    title: z.string(),
    stepType: z.string(),
    estimatedTime: z.number().int()
  }).nullable(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable()
  }),
  completedSteps: z.number().int().min(0),
  totalSteps: z.number().int().min(0)
})

// Type exports for TypeScript integration
export type CreateOnboardingPath = z.infer<typeof createOnboardingPathSchema>
export type UpdateOnboardingPath = z.infer<typeof updateOnboardingPathSchema>
export type CreateOnboardingStep = z.infer<typeof createOnboardingStepSchema>
export type UpdateOnboardingStep = z.infer<typeof updateOnboardingStepSchema>
export type CreateOnboardingSession = z.infer<typeof createOnboardingSessionSchema>
export type UpdateOnboardingSession = z.infer<typeof updateOnboardingSessionSchema>
export type CreateUserProgress = z.infer<typeof createUserProgressSchema>
export type UpdateUserProgress = z.infer<typeof updateUserProgressSchema>
export type CreateOnboardingContent = z.infer<typeof createOnboardingContentSchema>
export type UpdateOnboardingContent = z.infer<typeof updateOnboardingContentSchema>
export type CreateOrganizationOnboardingConfig = z.infer<typeof createOrganizationOnboardingConfigSchema>
export type UpdateOrganizationOnboardingConfig = z.infer<typeof updateOrganizationOnboardingConfigSchema>
export type OnboardingPathApiResponse = z.infer<typeof onboardingPathApiResponseSchema>
export type OnboardingSessionApiResponse = z.infer<typeof onboardingSessionApiResponseSchema>

// Validation helper functions
export function validateCreateOnboardingPath(data: unknown): CreateOnboardingPath {
  return createOnboardingPathSchema.parse(data)
}

export function validateUpdateOnboardingPath(data: unknown): UpdateOnboardingPath {
  return updateOnboardingPathSchema.parse(data)
}

export function validateCreateOnboardingStep(data: unknown): CreateOnboardingStep {
  return createOnboardingStepSchema.parse(data)
}

export function validateUpdateOnboardingStep(data: unknown): UpdateOnboardingStep {
  return updateOnboardingStepSchema.parse(data)
}

export function validateCreateOnboardingSession(data: unknown): CreateOnboardingSession {
  return createOnboardingSessionSchema.parse(data)
}

export function validateUpdateOnboardingSession(data: unknown): UpdateOnboardingSession {
  return updateOnboardingSessionSchema.parse(data)
}

export function validateCreateUserProgress(data: unknown): CreateUserProgress {
  return createUserProgressSchema.parse(data)
}

export function validateUpdateUserProgress(data: unknown): UpdateUserProgress {
  return updateUserProgressSchema.parse(data)
}

export function validateCreateOnboardingContent(data: unknown): CreateOnboardingContent {
  return createOnboardingContentSchema.parse(data)
}

export function validateUpdateOnboardingContent(data: unknown): UpdateOnboardingContent {
  return updateOnboardingContentSchema.parse(data)
}

export function validateCreateOrganizationOnboardingConfig(data: unknown): CreateOrganizationOnboardingConfig {
  return createOrganizationOnboardingConfigSchema.parse(data)
}

export function validateUpdateOrganizationOnboardingConfig(data: unknown): UpdateOrganizationOnboardingConfig {
  return updateOrganizationOnboardingConfigSchema.parse(data)
}

// Safe parsing functions
export function safeValidateCreateOnboardingPath(data: unknown) {
  return createOnboardingPathSchema.safeParse(data)
}

export function safeValidateUpdateOnboardingPath(data: unknown) {
  return updateOnboardingPathSchema.safeParse(data)
}

export function safeValidateCreateOnboardingStep(data: unknown) {
  return createOnboardingStepSchema.safeParse(data)
}

export function safeValidateUpdateOnboardingStep(data: unknown) {
  return updateOnboardingStepSchema.safeParse(data)
}

export function safeValidateCreateOnboardingSession(data: unknown) {
  return createOnboardingSessionSchema.safeParse(data)
}

export function safeValidateUpdateOnboardingSession(data: unknown) {
  return updateOnboardingSessionSchema.safeParse(data)
}

export function safeValidateCreateUserProgress(data: unknown) {
  return createUserProgressSchema.safeParse(data)
}

export function safeValidateUpdateUserProgress(data: unknown) {
  return updateUserProgressSchema.safeParse(data)
}

export function safeValidateCreateOnboardingContent(data: unknown) {
  return createOnboardingContentSchema.safeParse(data)
}

export function safeValidateUpdateOnboardingContent(data: unknown) {
  return updateOnboardingContentSchema.safeParse(data)
}

export function safeValidateCreateOrganizationOnboardingConfig(data: unknown) {
  return createOrganizationOnboardingConfigSchema.safeParse(data)
}

export function safeValidateUpdateOrganizationOnboardingConfig(data: unknown) {
  return updateOrganizationOnboardingConfigSchema.safeParse(data)
}