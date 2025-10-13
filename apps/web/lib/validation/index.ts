/**
 * Validation Module Index
 * 
 * This file exports all validation utilities, schemas, error handling,
 * and middleware for easy importing throughout the application.
 */

import { z } from 'zod'

// Export schemas - explicit exports to avoid conflicts
export {
  // User schemas
  createUserSchema,
  updateUserSchema,
  userApiResponseSchema,
  selectUserSchema,
  insertUserSchema,
  userListResponseSchema,
  createUserWithMembershipSchema,
  bulkCreateUsersSchema,
  userSearchSchema,
  userPreferencesSchema,
  
  // Organization schemas
  baseOrganizationSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationApiResponseSchema,
  selectOrganizationSchema,
  insertOrganizationSchema,
  selectOrganizationMembershipSchema,
  insertOrganizationMembershipSchema,
  createOrganizationMembershipSchema,
  updateOrganizationMembershipSchema,
  
  // Role schemas
  selectRoleSchema,
  insertRoleSchema,
  createRoleSchema,
  updateRoleSchema,
  roleApiResponseSchema,
  baseRoleSchema,
  
  // Permission schemas
  selectPermissionSchema,
  insertPermissionSchema,
  createPermissionSchema,
  updatePermissionSchema,
  
  // Invitation schemas
  baseInvitationSchema,
  createInvitationSchema,
  updateInvitationSchema,
  invitationApiResponseSchema,
  
  // Onboarding schemas
  createOnboardingPathSchema,
  updateOnboardingPathSchema,
  createOnboardingStepSchema,
  updateOnboardingStepSchema,
  createOnboardingSessionSchema,
  updateOnboardingSessionSchema,
  updateUserProgressSchema,
  createOnboardingContentSchema,
  updateOnboardingContentSchema,
  createOrganizationOnboardingConfigSchema,
  updateOrganizationOnboardingConfigSchema,
  
  // Content schemas
  CreateContent,
  UpdateContent,
  
  // Auth schemas
  signInSchema,
  signUpSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  twoFactorSchema,
  
  // Common schemas
  paginationSchema,
  sortSchema,
  dateRangeSchema,
  
  // Response schemas
  errorResponseSchema,
  successResponseSchema,
  apiResponseSchema,
  
  // Search schemas
  UserSearch,
  OrganizationSearch,
  RoleSearch,
  PermissionSearch,
  
  // Type exports
  type User,
  type Organization,
  type Role,
  type Permission,
  type Invitation,
  type UserInsert,
  type UserUpdate,
  type OrganizationInsert,
  type OrganizationUpdate,
  type RoleInsert,
  type RoleUpdate,
  type ApiResponse,
  type SuccessResponse,
  type ErrorResponse
} from './schemas'

// Export validation utilities - explicit exports to avoid conflicts
export {
  ValidationError,
  ValidationResult,
  ValidationErrorDetail,
  safeValidate,
  validateWithSchema,
  createValidationError,
  createValidationErrorResponse,
  formatValidationErrors,
  isValidationError,
  mergeSchemas,
  createApiResponseSchema,
  createPaginatedResponseSchema,
  transformZodError,
  // Use utils version of these to avoid conflicts
  createErrorResponse as createErrorResponseUtil,
  createSuccessResponse as createSuccessResponseUtil
} from './utils'

// Export error handling
export {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  errorResponseSchema as errorSchema,
  ErrorDetail,
  BusinessRuleError,
  PermissionError,
  handleApiError,
  isAppError,
  createErrorResponse,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createValidationErrorResponse,
  createInternalServerError
} from './errors'

// Export middleware
export {
  validateRequest,
  validateApiRequest,
  withValidation,
  RequestContext,
  ValidationMiddlewareOptions,
  ValidatedApiHandler,
  createValidatedHandler,
  validateSearchParams,
  validateBody,
  validateParams
} from './middleware'

// Re-export commonly used Zod utilities
export { z } from 'zod'

// Re-export key types and classes for convenience
export type {
  ValidationResult,
  ValidationErrorDetail
} from './utils'

export type {
  ErrorDetail,
  ErrorResponse
} from './errors'

export type {
  RequestContext,
  ValidationMiddlewareOptions,
  ValidatedApiHandler
} from './middleware'

export {
  ValidationError,
  BusinessRuleError,
  PermissionError,
  ResourceError,
  ERROR_CODES,
  ERROR_SEVERITY
} from './errors'

export {
  withValidation,
  withBodyValidation,
  withQueryValidation,
  withParamsValidation,
  withAuth,
  withOrgContext,
  withPermissions,
  withErrorHandling,
  withResponseFormatting,
  withCors,
  withLogging,
  compose
} from './middleware'

// Validation constants
export const VALIDATION_CONSTANTS = {
  MAX_STRING_LENGTH: 10000,
  MAX_ARRAY_LENGTH: 1000,
  MAX_OBJECT_KEYS: 100,
  MAX_NESTED_DEPTH: 10,
  
  // Common regex patterns
  PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    SLUG: /^[a-z0-9-]+$/,
    HEX_COLOR: /^#[0-9A-F]{6}$/i,
    URL: /^https?:\/\/.+/,
    PHONE: /^\+?[1-9]\d{1,14}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  },
  
  // Common validation messages
  MESSAGES: {
    REQUIRED: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_UUID: 'Please enter a valid UUID',
    INVALID_URL: 'Please enter a valid URL',
    TOO_SHORT: 'This field is too short',
    TOO_LONG: 'This field is too long',
    INVALID_FORMAT: 'This field has an invalid format',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    FORBIDDEN: 'Access to this resource is forbidden',
    NOT_FOUND: 'The requested resource was not found',
    DUPLICATE: 'This resource already exists'
  }
} as const

// Common validation schemas
export const commonSchemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format'),
  slug: z.string().regex(VALIDATION_CONSTANTS.PATTERNS.SLUG, 'Invalid slug format'),
  hexColor: z.string().regex(VALIDATION_CONSTANTS.PATTERNS.HEX_COLOR, 'Invalid hex color format'),
  phone: z.string().regex(VALIDATION_CONSTANTS.PATTERNS.PHONE, 'Invalid phone number format'),
  password: z.string().regex(VALIDATION_CONSTANTS.PATTERNS.PASSWORD, 
    'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character'),
  
  // Pagination schema
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0)
  }),
  
  // Sort schema
  sort: z.object({
    field: z.string().min(1),
    order: z.enum(['asc', 'desc']).default('desc')
  }),
  
  // Date range schema
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date()
  }).refine(
    (data) => data.startDate <= data.endDate,
    'Start date must be before or equal to end date'
  ),
  
  // Metadata schema
  metadata: z.record(z.unknown()).default({}),
  
  // Tags schema
  tags: z.array(z.string().min(1).max(50)).max(20).default([])
} as const

// Validation helper functions
export const validationHelpers = {
  // Check if string is valid UUID
  isUuid: (value: string): boolean => {
    return VALIDATION_CONSTANTS.PATTERNS.UUID.test(value)
  },
  
  // Check if string is valid email
  isEmail: (value: string): boolean => {
    return VALIDATION_CONSTANTS.PATTERNS.EMAIL.test(value)
  },
  
  // Check if string is valid URL
  isUrl: (value: string): boolean => {
    return VALIDATION_CONSTANTS.PATTERNS.URL.test(value)
  },
  
  // Check if string is valid slug
  isSlug: (value: string): boolean => {
    return VALIDATION_CONSTANTS.PATTERNS.SLUG.test(value)
  },
  
  // Sanitize string for database storage
  sanitizeString: (value: string): string => {
    return value.trim().replace(/\s+/g, ' ')
  },
  
  // Generate validation error message
  createErrorMessage: (field: string, rule: string, value?: unknown): string => {
    const messages = VALIDATION_CONSTANTS.MESSAGES
    switch (rule) {
      case 'required':
        return `${field} is required`
      case 'email':
        return `${field} must be a valid email address`
      case 'uuid':
        return `${field} must be a valid UUID`
      case 'url':
        return `${field} must be a valid URL`
      case 'min':
        return `${field} is too short`
      case 'max':
        return `${field} is too long`
      default:
        return `${field} is invalid`
    }
  }
} as const

// Export validation presets for common use cases
export const validationPresets = {
  // API route validation
  apiRoute: {
    requireAuth: true,
    requireOrg: false,
    permissions: []
  },
  
  // Admin API route validation
  adminApiRoute: {
    requireAuth: true,
    requireOrg: true,
    permissions: ['admin:read', 'admin:write']
  },
  
  // Public API route validation
  publicApiRoute: {
    requireAuth: false,
    requireOrg: false,
    permissions: []
  },
  
  // User management validation
  userManagement: {
    requireAuth: true,
    requireOrg: true,
    permissions: ['user:read', 'user:write']
  },
  
  // Organization management validation
  orgManagement: {
    requireAuth: true,
    requireOrg: true,
    permissions: ['organization:read', 'organization:write']
  }
} as const

// Export type utilities
export type ValidationPreset = keyof typeof validationPresets
export type CommonSchema = keyof typeof commonSchemas
export type ValidationPattern = keyof typeof VALIDATION_CONSTANTS.PATTERNS
export type ValidationMessage = keyof typeof VALIDATION_CONSTANTS.MESSAGES