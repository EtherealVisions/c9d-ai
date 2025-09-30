/**
 * User Validation Schemas
 * 
 * This file contains Zod validation schemas for user-related operations.
 * Schemas are generated from Drizzle definitions and extended with business rules.
 */

import { z } from 'zod'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { users } from '@/lib/db/schema/users'

// Auto-generated base schemas from Drizzle
export const selectUserSchema = createSelectSchema(users)
export const insertUserSchema = createInsertSchema(users)

// Custom validation schemas with business rules using drizzle-zod
export const createUserSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  
  clerkUserId: z.string()
    .min(1, 'Clerk user ID is required')
    .max(255, 'Clerk user ID must be less than 255 characters')
    .regex(/^user_[a-zA-Z0-9]+$/, 'Invalid Clerk user ID format'),
  
  firstName: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .nullable()
    .optional(),
  
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .nullable()
    .optional(),
  
  avatarUrl: z.string()
    .url('Invalid avatar URL format')
    .max(500, 'Avatar URL must be less than 500 characters')
    .nullable()
    .optional(),
  
  preferences: z.record(z.unknown())
    .default({})
    .optional()
    .refine(
      (prefs) => {
        if (!prefs) return true
        // Validate preferences structure
        const validKeys = ['theme', 'language', 'notifications', 'accessibility', 'privacy']
        return Object.keys(prefs).every(key => validKeys.includes(key))
      },
      'Invalid preference keys'
    )
})

export const updateUserSchema = z.object({
  firstName: z.string()
    .min(1, 'First name cannot be empty')
    .max(100, 'First name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .nullable()
    .optional(),
  
  lastName: z.string()
    .min(1, 'Last name cannot be empty')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .nullable()
    .optional(),
  
  avatarUrl: z.string()
    .url('Invalid avatar URL format')
    .max(500, 'Avatar URL must be less than 500 characters')
    .nullable()
    .optional(),
  
  preferences: z.record(z.unknown())
    .refine(
      (prefs) => {
        if (!prefs) return true
        const validKeys = ['theme', 'language', 'notifications', 'accessibility', 'privacy']
        return Object.keys(prefs).every(key => validKeys.includes(key))
      },
      'Invalid preference keys'
    )
    .optional()
})

// API request/response schemas with transformations
export const userApiResponseSchema = selectUserSchema.extend({
  fullName: z.string().nullable().transform((val, ctx) => {
    // Auto-generate fullName from firstName and lastName if not provided
    const user = ctx.path[0] as any
    if (val) return val
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`.trim()
    }
    if (user?.firstName) return user.firstName
    if (user?.lastName) return user.lastName
    return null
  }),
  membershipCount: z.number().int().min(0).default(0),
  lastLoginAt: z.date().nullable().optional(),
  isActive: z.boolean().default(true)
})

export const userListResponseSchema = z.object({
  users: z.array(userApiResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
})

// Complex schema composition for user creation with organization membership
export const createUserWithMembershipSchema = z.object({
  user: createUserSchema,
  membership: z.object({
    organizationId: z.string().uuid('Invalid organization ID'),
    roleId: z.string().uuid('Invalid role ID'),
    status: z.enum(['active', 'pending']).default('active')
  }).optional(),
  sendInvitation: z.boolean().default(false),
  invitationMessage: z.string().max(500, 'Invitation message must be less than 500 characters').optional()
}).refine(
  (data) => {
    // If sending invitation, membership must be provided
    if (data.sendInvitation && !data.membership) {
      return false
    }
    return true
  },
  {
    message: 'Membership information is required when sending invitation',
    path: ['membership']
  }
)

// Bulk user operations with validation
export const bulkCreateUsersSchema = z.object({
  users: z.array(createUserSchema)
    .min(1, 'At least one user is required')
    .max(100, 'Cannot create more than 100 users at once')
    .refine(
      (users) => {
        // Check for duplicate emails
        const emails = users.map(u => u.email.toLowerCase())
        return new Set(emails).size === emails.length
      },
      'Duplicate email addresses found'
    ),
  defaultOrganizationId: z.string().uuid('Invalid organization ID').optional(),
  defaultRoleId: z.string().uuid('Invalid role ID').optional(),
  sendWelcomeEmails: z.boolean().default(true)
})

// User search and filter schemas
export const userSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(255).optional(),
  email: z.string().email().optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  isActive: z.boolean().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'email', 'firstName', 'lastName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// User preferences validation schemas
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code').default('en'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    inApp: z.boolean().default(true),
    marketing: z.boolean().default(false)
  }).default({}),
  accessibility: z.object({
    highContrast: z.boolean().default(false),
    reducedMotion: z.boolean().default(false),
    screenReader: z.boolean().default(false),
    fontSize: z.enum(['small', 'medium', 'large']).default('medium')
  }).default({}),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'organization', 'private']).default('organization'),
    activityTracking: z.boolean().default(true),
    dataSharing: z.boolean().default(false)
  }).default({})
})

// Type exports for TypeScript integration
export type CreateUser = z.infer<typeof createUserSchema>
export type UpdateUser = z.infer<typeof updateUserSchema>
export type UserApiResponse = z.infer<typeof userApiResponseSchema>
export type UserListResponse = z.infer<typeof userListResponseSchema>
export type UserSearch = z.infer<typeof userSearchSchema>
export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type SelectUser = z.infer<typeof selectUserSchema>
export type InsertUser = z.infer<typeof insertUserSchema>
export type CreateUserWithMembership = z.infer<typeof createUserWithMembershipSchema>
export type BulkCreateUsers = z.infer<typeof bulkCreateUsersSchema>

// Validation helper functions
export function validateCreateUser(data: unknown): CreateUser {
  return createUserSchema.parse(data)
}

export function validateUpdateUser(data: unknown): UpdateUser {
  return updateUserSchema.parse(data)
}

export function validateUserSearch(data: unknown): UserSearch {
  return userSearchSchema.parse(data)
}

export function validateUserPreferences(data: unknown): UserPreferences {
  return userPreferencesSchema.parse(data)
}

// Safe parsing functions that return results instead of throwing
export function safeValidateCreateUser(data: unknown) {
  return createUserSchema.safeParse(data)
}

export function safeValidateUpdateUser(data: unknown) {
  return updateUserSchema.safeParse(data)
}

export function safeValidateUserSearch(data: unknown) {
  return userSearchSchema.safeParse(data)
}

export function safeValidateUserPreferences(data: unknown) {
  return userPreferencesSchema.safeParse(data)
}