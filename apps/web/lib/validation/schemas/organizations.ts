/**
 * Organizations Validation Schemas
 * 
 * This file contains Zod validation schemas for organization-related operations.
 * Schemas are generated from Drizzle definitions and extended with business rules.
 */

import { z } from 'zod'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { organizations, organizationMemberships } from '@/lib/db/schema/organizations'
import { selectUserSchema } from './users'
import { selectRoleSchema } from './roles'

// Constants
const MEMBERSHIP_STATUSES = ['active', 'inactive', 'pending'] as const

// Auto-generated base schemas from Drizzle
export const selectOrganizationSchema = createSelectSchema(organizations)
export const insertOrganizationSchema = createInsertSchema(organizations)
export const selectOrganizationMembershipSchema = createSelectSchema(organizationMemberships)
export const insertOrganizationMembershipSchema = createInsertSchema(organizationMemberships)

// Legacy alias for backward compatibility
export const baseOrganizationSchema = selectOrganizationSchema

// Organization validation schemas with business rules using drizzle-zod
export const createOrganizationSchema = z.object({
  name: z.string()
    .min(1, 'Organization name is required')
    .max(255, 'Organization name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\s\-_&.,'()]+$/, 'Organization name contains invalid characters'),
  
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .transform(val => val.toLowerCase())
    .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Slug cannot start or end with a hyphen')
    .refine(val => !val.includes('--'), 'Slug cannot contain consecutive hyphens'),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable()
    .optional(),
  
  avatarUrl: z.string()
    .url('Invalid avatar URL')
    .max(500, 'Avatar URL must be less than 500 characters')
    .nullable()
    .optional(),
  
  metadata: z.record(z.unknown())
    .default({})
    .refine(val => Object.keys(val).length <= 50, 'Metadata cannot have more than 50 keys')
    .optional(),
  
  settings: z.record(z.unknown())
    .default({})
    .refine(val => Object.keys(val).length <= 100, 'Settings cannot have more than 100 keys')
    .optional()
})

export const updateOrganizationSchema = createOrganizationSchema.omit({
  slug: true // Slug should not be updatable after creation
}).partial()

// Organization membership schemas with business rules using drizzle-zod
export const createOrganizationMembershipSchema = z.object({
  userId: z.string()
    .uuid('Invalid user ID'),
  
  organizationId: z.string()
    .uuid('Invalid organization ID'),
  
  roleId: z.string()
    .uuid('Invalid role ID'),
  
  status: z.enum(MEMBERSHIP_STATUSES)
    .default('active')
})

export const updateOrganizationMembershipSchema = z.object({
  roleId: z.string().uuid('Invalid role ID').optional(),
  status: z.enum(MEMBERSHIP_STATUSES).optional()
})

// API Response schemas with transformations and composition
export const organizationApiResponseSchema = selectOrganizationSchema.extend({
  memberCount: z.number().int().min(0).default(0),
  isOwner: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false),
  userPermissions: z.array(z.string()).default([])
})

// Nested schema composition for membership with relations
export const organizationMembershipApiResponseSchema = selectOrganizationMembershipSchema.extend({
  user: selectUserSchema.pick({
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    avatarUrl: true
  }).extend({
    fullName: z.string().nullable().transform((val, ctx) => {
      const user = ctx.path[0] as any
      if (val) return val
      if (user?.firstName && user?.lastName) {
        return `${user.firstName} ${user.lastName}`.trim()
      }
      return user?.firstName || user?.lastName || null
    })
  }),
  organization: selectOrganizationSchema.pick({
    id: true,
    name: true,
    slug: true,
    avatarUrl: true
  }),
  role: selectRoleSchema.pick({
    id: true,
    name: true,
    description: true,
    permissions: true
  })
})

// List response schemas
export const organizationListResponseSchema = z.object({
  organizations: z.array(organizationApiResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
})

export const organizationMembershipListResponseSchema = z.object({
  members: z.array(organizationMembershipApiResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
})

// Bulk operations schemas
export const bulkCreateOrganizationsSchema = z.object({
  organizations: z.array(createOrganizationSchema)
    .min(1, 'At least one organization is required')
    .max(100, 'Cannot create more than 100 organizations at once')
})

export const bulkUpdateOrganizationsSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    data: updateOrganizationSchema
  }))
    .min(1, 'At least one update is required')
    .max(100, 'Cannot update more than 100 organizations at once')
})

// Search and filter schemas
export const organizationSearchSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  memberCountMin: z.number().int().min(0).optional(),
  memberCountMax: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'memberCount']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
})

// Type exports
export type CreateOrganization = z.infer<typeof createOrganizationSchema>
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>
export type CreateOrganizationMembership = z.infer<typeof createOrganizationMembershipSchema>
export type UpdateOrganizationMembership = z.infer<typeof updateOrganizationMembershipSchema>

// API Response types
export type OrganizationApiResponse = z.infer<typeof organizationApiResponseSchema>
export type OrganizationMembershipApiResponse = z.infer<typeof organizationMembershipApiResponseSchema>
export type OrganizationListResponse = z.infer<typeof organizationListResponseSchema>
export type OrganizationMembershipListResponse = z.infer<typeof organizationMembershipListResponseSchema>

// Database schema types (simplified)
export type SelectOrganization = z.infer<typeof baseOrganizationSchema>
export type InsertOrganization = Omit<SelectOrganization, 'id' | 'createdAt' | 'updatedAt'>
export type SelectOrganizationMembership = {
  id: string
  userId: string
  organizationId: string
  roleId: string
  status: string
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
}
export type InsertOrganizationMembership = Omit<SelectOrganizationMembership, 'id' | 'createdAt' | 'updatedAt' | 'joinedAt'>

// Search and bulk operation types
export type OrganizationSearch = z.infer<typeof organizationSearchSchema>
export type BulkCreateOrganizations = z.infer<typeof bulkCreateOrganizationsSchema>
export type BulkUpdateOrganizations = z.infer<typeof bulkUpdateOrganizationsSchema>

// Validation helper functions
export function validateCreateOrganization(data: unknown): CreateOrganization {
  return createOrganizationSchema.parse(data)
}

export function validateUpdateOrganization(data: unknown): UpdateOrganization {
  return updateOrganizationSchema.parse(data)
}

export function validateOrganizationSearch(data: unknown): OrganizationSearch {
  return organizationSearchSchema.parse(data)
}

// Safe parsing functions that return results instead of throwing
export function safeValidateCreateOrganization(data: unknown) {
  return createOrganizationSchema.safeParse(data)
}

export function safeValidateUpdateOrganization(data: unknown) {
  return updateOrganizationSchema.safeParse(data)
}

export function safeValidateOrganizationSearch(data: unknown) {
  return organizationSearchSchema.safeParse(data)
}