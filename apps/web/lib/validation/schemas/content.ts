/**
 * Content Validation Schemas
 * 
 * This file contains Zod validation schemas for content-related operations.
 * Schemas are manually defined to ensure type safety and compatibility.
 */

import { z } from 'zod'

// Constants
const SESSION_STATUSES = ['not_started', 'in_progress', 'completed', 'paused', 'failed'] as const
const SESSION_TYPES = ['onboarding', 'training', 'assessment', 'custom'] as const
const PROGRESS_STATUSES = ['not_started', 'in_progress', 'completed', 'skipped'] as const

// Onboarding path schemas
export const createOnboardingPathSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  targetRole: z.string().max(100).optional(),
  estimatedDuration: z.number().int().min(0).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  prerequisites: z.array(z.string().uuid()).default([]),
  successCriteria: z.record(z.unknown()).default({})
})

export const updateOnboardingPathSchema = createOnboardingPathSchema.partial()

// Onboarding step schemas
export const createOnboardingStepSchema = z.object({
  description: z.string().max(1000).nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  successCriteria: z.record(z.unknown()).default({}),
  pathId: z.string().uuid(),
  stepOrder: z.number().int().min(0),
  title: z.string().min(1).max(255),
  content: z.string().max(10000),
  stepType: z.enum(['text', 'video', 'interactive', 'assessment']).default('text'),
  isRequired: z.boolean().default(true),
  estimatedTime: z.number().int().min(0).optional(),
  resources: z.array(z.object({
    type: z.enum(['link', 'file', 'video', 'document']),
    url: z.string().url(),
    title: z.string().max(255),
    description: z.string().max(500).optional()
  })).default([]),
  validationRules: z.record(z.unknown()).default({})
})

export const updateOnboardingStepSchema = createOnboardingStepSchema.partial()

// Onboarding session schemas
export const createOnboardingSessionSchema = z.object({
  preferences: z.record(z.unknown()).default({}),
  userId: z.string().uuid(),
  organizationId: z.string().uuid().nullable().optional(),
  status: z.enum(SESSION_STATUSES).default('not_started'),
  sessionType: z.enum(SESSION_TYPES).default('onboarding'),
  pathId: z.string().uuid().nullable().optional(),
  currentStepId: z.string().uuid().nullable().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().nullable().optional(),
  timeSpent: z.number().int().min(0).default(0),
  progress: z.number().min(0).max(100).default(0),
  sessionMetadata: z.record(z.unknown()).default({})
})

export const updateOnboardingSessionSchema = createOnboardingSessionSchema.partial()

// User progress schemas
export const createUserProgressSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(PROGRESS_STATUSES).default('not_started'),
  timeSpent: z.number().int().min(0).default(0),
  startedAt: z.date().optional(),
  completedAt: z.date().nullable().optional(),
  stepId: z.string().uuid(),
  sessionId: z.string().uuid(),
  progress: z.number().min(0).max(100).default(0),
  attempts: z.number().int().min(0).default(0),
  score: z.number().min(0).max(100).nullable().optional(),
  feedback: z.string().max(2000).nullable().optional(),
  validationData: z.record(z.unknown()).default({}),
  achievements: z.array(z.string().uuid()).default([])
})

export const updateUserProgressSchema = createUserProgressSchema.partial()

// Onboarding content schemas
export const createOnboardingContentSchema = z.object({
  description: z.string().max(1000).nullable().optional(),
  organizationId: z.string().uuid(),
  isActive: z.boolean().default(true),
  title: z.string().min(1).max(255),
  content: z.string().max(50000),
  contentType: z.enum(['html', 'markdown', 'json', 'text']).default('html'),
  version: z.string().max(50).default('1.0.0'),
  tags: z.array(z.string().max(50)).default([]),
  createdBy: z.string().uuid()
})

export const updateOnboardingContentSchema = createOnboardingContentSchema.partial()

// Organization onboarding config schemas
export const createOrganizationOnboardingConfigSchema = z.object({
  organizationId: z.string().uuid(),
  isActive: z.boolean().default(true),
  welcomeMessage: z.string().max(2000).optional(),
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
    reminders: z.boolean().default(false),
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
  }).default({})
})

export const updateOrganizationOnboardingConfigSchema = createOrganizationOnboardingConfigSchema.partial()

// API Response schemas
export const onboardingPathApiResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  targetRole: z.string(),
  subscriptionTier: z.string().nullable(),
  estimatedDuration: z.number().nullable(),
  difficulty: z.string(),
  prerequisites: z.array(z.string()),
  successCriteria: z.record(z.unknown()),
  metadata: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
  stepCount: z.number().int().min(0),
  completionRate: z.number().min(0).max(100),
  averageCompletionTime: z.number().nullable()
})

export const onboardingSessionApiResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid().nullable(),
  pathId: z.string().uuid().nullable(),
  sessionType: z.enum(SESSION_TYPES),
  status: z.enum(SESSION_STATUSES),
  currentStepId: z.string().uuid().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  timeSpent: z.number().int().min(0),
  progress: z.number().min(0).max(100),
  preferences: z.record(z.unknown()),
  sessionMetadata: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable()
  }),
  path: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable()
  }).nullable(),
  currentStep: z.object({
    id: z.string().uuid(),
    title: z.string(),
    stepOrder: z.number().int()
  }).nullable(),
  totalSteps: z.number().int().min(0)
})

// Type exports
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

// API Response types
export type OnboardingPathApiResponse = z.infer<typeof onboardingPathApiResponseSchema>
export type OnboardingSessionApiResponse = z.infer<typeof onboardingSessionApiResponseSchema>

// Search and filter schemas
export type ContentSearch = {
  query?: string
  contentType?: string
  organizationId?: string
  isActive?: boolean
  tags?: string[]
  createdAfter?: Date
  createdBefore?: Date
  sortBy?: 'title' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// Validation helper functions
export function validateCreateContent(data: unknown): CreateOnboardingContent {
  return createOnboardingContentSchema.parse(data)
}

export function validateUpdateContent(data: unknown): UpdateOnboardingContent {
  return updateOnboardingContentSchema.parse(data)
}

export function validateCreateStep(data: unknown): CreateOnboardingStep {
  return createOnboardingStepSchema.parse(data)
}

export function validateUpdateStep(data: unknown): UpdateOnboardingStep {
  return updateOnboardingStepSchema.parse(data)
}

// Safe parsing functions that return results instead of throwing
export function safeValidateCreateContent(data: unknown) {
  return createOnboardingContentSchema.safeParse(data)
}

export function safeValidateUpdateContent(data: unknown) {
  return updateOnboardingContentSchema.safeParse(data)
}

// Type aliases for backward compatibility
export type CreateContent = CreateOnboardingContent
export type UpdateContent = UpdateOnboardingContent
export type ContentApiResponse = OnboardingPathApiResponse