/**
 * User Validation Schemas
 * 
 * This file contains Zod validation schemas for user-related operations.
 * Schemas are generated from Drizzle definitions and extended with business rules.
 */

import { z } from 'zod'

// Base schemas for user operations
export const selectUserSchema = z.object({
  id: z.string().uuid(),
  clerkUserId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  preferences: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const insertUserSchema = selectUserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

// Custom validation schemas with business rules
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
    .nullable(),
  
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .nullable(),
  
  avatarUrl: z.string()
    .url('Invalid avatar URL format')
    .max(500, 'Avatar URL must be less than 500 characters')
    .nullable(),
  
  preferences: z.record(z.unknown())
    .default({})
    .refine(
      (prefs) => {
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

// API request/response schemas
export const userApiResponseSchema = selectUserSchema.extend({
  fullName: z.string().nullable(),
  membershipCount: z.number().int().min(0),
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