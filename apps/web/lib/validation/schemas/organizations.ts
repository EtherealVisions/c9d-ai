/**
 * Organization Validation Schemas
 * 
 * This file contains Zod validation schemas for organization-related operations.
 * Schemas are generated from Drizzle definitions and extended with business rules.
 */

import { z } from 'zod'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { organizations, organizationMemberships } from '@/lib/db/schema/organizations'

// Base schemas generated from Drizzle definitions
export const selectOrganizationSchema = createSelectSchema(organizations)
export const insertOrganizationSchema = createInsertSchema(organizations)
export const selectOrganizationMembershipSchema = createSelectSchema(organizationMemberships)
export const insertOrganizationMembershipSchema = createInsertSchema(organizationMemberships)

// Organization validation schemas
export const createOrganizationSchema = insertOrganizationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  name: z.string()
    .min(1, 'Organization name is required')
    .max(255, 'Organization name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\s\-_&.()]+$/, 'Organization name contains invalid characters'),
  
  slug: z.string()
    .min(3, 'Organization slug must be at least 3 characters')
    .max(100, 'Organization slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .refine(
      (slug) => !slug.startsWith('-') && !slug.endsWith('-'),
      'Slug cannot start or end with a hyphen'
    )
    .refine(
      (slug) => !slug.includes('--'),
      'Slug cannot contain consecutive hyphens'
    ),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable(),
  
  avatarUrl: z.string()
    .url('Invalid avatar URL format')
    .max(500, 'Avatar URL must be less than 500 characters')
    .nullable(),
  
  metadata: z.record(z.unknown())
    .default({})
    .refine(
      (metadata) => {
        // Validate metadata structure
        const validKeys = ['industry', 'size', 'website', 'location', 'founded', 'tags']
        return Object.keys(metadata).every(key => validKeys.includes(key))
      },
      'Invalid metadata keys'
    ),
  
  settings: z.record(z.unknown())
    .default({})
    .refine(
      (settings) => {
        // Validate settings structure
        const validKeys = ['branding', 'features', 'integrations', 'security', 'billing']
        return Object.keys(settings).every(key => validKeys.includes(key))
      },
      'Invalid settings keys'
    )
})

export const updateOrganizationSchema = createOrganizationSchema.partial().omit({
  slug: true // Slug cannot be updated after creation
}).extend({
  name: z.string()
    .min(1, 'Organization name cannot be empty')
    .max(255, 'Organization name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\s\-_&.()]+$/, 'Organization name contains invalid characters')
    .optional(),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable()
    .optional(),
  
  avatarUrl: z.string()
    .url('Invalid avatar URL format')
    .max(500, 'Avatar URL must be less than 500 characters')
    .nullable()
    .optional()
})

// Organization membership validation schemas
export const createOrganizationMembershipSchema = insertOrganizationMembershipSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  joinedAt: true
}).extend({
  userId: z.string()
    .uuid('Invalid user ID format'),
  
  organizationId: z.string()
    .uuid('Invalid organization ID format'),
  
  roleId: z.string()
    .uuid('Invalid role ID format'),
  
  status: z.enum(['active', 'inactive', 'pending'])
    .default('pending')
})

export const updateOrganizationMembershipSchema = z.object({
  roleId: z.string()
    .uuid('Invalid role ID format')
    .optional(),
  
  status: z.enum(['active', 'inactive', 'pending'])
    .optional()
})

// API request/response schemas
export const organizationApiResponseSchema = selectOrganizationSchema.extend({
  memberCount: z.number().int().min(0),
  roleCount: z.number().int().min(0),
  isOwner: z.boolean().default(false),
  userRole: z.string().nullable().optional(),
  userPermissions: z.array(z.string()).default([])
})

export const organizationMembershipApiResponseSchema = selectOrganizationMembershipSchema.extend({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    avatarUrl: z.string().url().nullable(),
    fullName: z.string().nullable()
  }),
  organization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    avatarUrl: z.string().url().nullable()
  }),
  role: z.object({
    id: z.string().uuid(),
    name: z.string(),
    permissions: z.array(z.string())
  })
})

export const organizationListResponseSchema = z.object({
  organizations: z.array(organizationApiResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
})

export const organizationMemberListResponseSchema = z.object({
  members: z.array(organizationMembershipApiResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
})

// Organization search and filter schemas
export const organizationSearchSchema = z.object({
  query: z.string().min(1).max(255).optional(),
  name: z.string().max(255).optional(),
  slug: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'memberCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const organizationMemberSearchSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  query: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  roleId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  joinedAfter: z.date().optional(),
  joinedBefore: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['joinedAt', 'email', 'status']).default('joinedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Organization settings validation schemas
export const organizationSettingsSchema = z.object({
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
    secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
    logo: z.string().url().optional(),
    favicon: z.string().url().optional()
  }).default({}),
  
  features: z.object({
    onboardingEnabled: z.boolean().default(true),
    analyticsEnabled: z.boolean().default(true),
    invitationsEnabled: z.boolean().default(true),
    publicProfile: z.boolean().default(false)
  }).default({}),
  
  integrations: z.object({
    slack: z.object({
      enabled: z.boolean().default(false),
      webhookUrl: z.string().url().optional()
    }).optional(),
    discord: z.object({
      enabled: z.boolean().default(false),
      webhookUrl: z.string().url().optional()
    }).optional(),
    email: z.object({
      enabled: z.boolean().default(true),
      provider: z.enum(['sendgrid', 'mailgun', 'ses']).default('sendgrid')
    }).default({})
  }).default({}),
  
  security: z.object({
    twoFactorRequired: z.boolean().default(false),
    sessionTimeout: z.number().int().min(15).max(1440).default(480), // minutes
    ipWhitelist: z.array(z.string().ip()).default([]),
    allowedDomains: z.array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)).default([])
  }).default({}),
  
  billing: z.object({
    plan: z.enum(['free', 'starter', 'professional', 'enterprise']).default('free'),
    billingEmail: z.string().email().optional(),
    invoicePrefix: z.string().max(10).optional()
  }).default({})
})

export const organizationMetadataSchema = z.object({
  industry: z.string().max(100).optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  website: z.string().url().optional(),
  location: z.string().max(255).optional(),
  founded: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  tags: z.array(z.string().max(50)).max(10).default([])
})

// Type exports for TypeScript integration
export type CreateOrganization = z.infer<typeof createOrganizationSchema>
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>
export type CreateOrganizationMembership = z.infer<typeof createOrganizationMembershipSchema>
export type UpdateOrganizationMembership = z.infer<typeof updateOrganizationMembershipSchema>
export type OrganizationApiResponse = z.infer<typeof organizationApiResponseSchema>
export type OrganizationMembershipApiResponse = z.infer<typeof organizationMembershipApiResponseSchema>
export type OrganizationListResponse = z.infer<typeof organizationListResponseSchema>
export type OrganizationMemberListResponse = z.infer<typeof organizationMemberListResponseSchema>
export type OrganizationSearch = z.infer<typeof organizationSearchSchema>
export type OrganizationMemberSearch = z.infer<typeof organizationMemberSearchSchema>
export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>
export type OrganizationMetadata = z.infer<typeof organizationMetadataSchema>
export type SelectOrganization = z.infer<typeof selectOrganizationSchema>
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>
export type SelectOrganizationMembership = z.infer<typeof selectOrganizationMembershipSchema>
export type InsertOrganizationMembership = z.infer<typeof insertOrganizationMembershipSchema>

// Validation helper functions
export function validateCreateOrganization(data: unknown): CreateOrganization {
  return createOrganizationSchema.parse(data)
}

export function validateUpdateOrganization(data: unknown): UpdateOrganization {
  return updateOrganizationSchema.parse(data)
}

export function validateCreateOrganizationMembership(data: unknown): CreateOrganizationMembership {
  return createOrganizationMembershipSchema.parse(data)
}

export function validateUpdateOrganizationMembership(data: unknown): UpdateOrganizationMembership {
  return updateOrganizationMembershipSchema.parse(data)
}

export function validateOrganizationSearch(data: unknown): OrganizationSearch {
  return organizationSearchSchema.parse(data)
}

export function validateOrganizationMemberSearch(data: unknown): OrganizationMemberSearch {
  return organizationMemberSearchSchema.parse(data)
}

export function validateOrganizationSettings(data: unknown): OrganizationSettings {
  return organizationSettingsSchema.parse(data)
}

export function validateOrganizationMetadata(data: unknown): OrganizationMetadata {
  return organizationMetadataSchema.parse(data)
}

// Safe parsing functions that return results instead of throwing
export function safeValidateCreateOrganization(data: unknown) {
  return createOrganizationSchema.safeParse(data)
}

export function safeValidateUpdateOrganization(data: unknown) {
  return updateOrganizationSchema.safeParse(data)
}

export function safeValidateCreateOrganizationMembership(data: unknown) {
  return createOrganizationMembershipSchema.safeParse(data)
}

export function safeValidateUpdateOrganizationMembership(data: unknown) {
  return updateOrganizationMembershipSchema.safeParse(data)
}

export function safeValidateOrganizationSearch(data: unknown) {
  return organizationSearchSchema.safeParse(data)
}

export function safeValidateOrganizationMemberSearch(data: unknown) {
  return organizationMemberSearchSchema.safeParse(data)
}

export function safeValidateOrganizationSettings(data: unknown) {
  return organizationSettingsSchema.safeParse(data)
}

export function safeValidateOrganizationMetadata(data: unknown) {
  return organizationMetadataSchema.safeParse(data)
}