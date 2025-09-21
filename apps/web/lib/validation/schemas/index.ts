/**
 * Validation Schemas Index
 * 
 * This file exports all validation schemas for easy importing throughout the application.
 * Schemas are organized by domain and provide both strict validation and safe parsing options.
 */

// User validation schemas
export * from './users'

// Organization validation schemas
export * from './organizations'

// Role and permission validation schemas
export * from './roles'

// Content validation schemas
export * from './content'

// Invitation validation schemas
export * from './invitations'

// Business rule validation schemas
export * from './business-rules'

// Common validation utilities
import { z } from 'zod'

// Common schemas used across multiple domains
export const uuidSchema = z.string().uuid('Invalid UUID format')
export const emailSchema = z.string().email('Invalid email format')
export const urlSchema = z.string().url('Invalid URL format')
export const dateSchema = z.date()
export const timestampSchema = z.string().datetime('Invalid timestamp format')

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
})

export const paginationResponseSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0)
})

// Sort schema
export const sortSchema = z.object({
  sortBy: z.string().min(1),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Search schema
export const searchSchema = z.object({
  query: z.string().min(1).max(255).optional(),
  filters: z.record(z.unknown()).optional()
}).merge(paginationSchema).merge(sortSchema)

// API response wrapper schemas
export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional()
  })

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string()
  })).optional(),
  code: z.string().optional()
})

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([
    successResponseSchema(dataSchema),
    errorResponseSchema
  ])

// Common validation error codes
export const VALIDATION_ERROR_CODES = {
  REQUIRED: 'REQUIRED',
  INVALID_FORMAT: 'INVALID_FORMAT',
  TOO_SHORT: 'TOO_SHORT',
  TOO_LONG: 'TOO_LONG',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_URL: 'INVALID_URL',
  INVALID_UUID: 'INVALID_UUID',
  INVALID_DATE: 'INVALID_DATE',
  DUPLICATE: 'DUPLICATE',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED'
} as const

// Type exports for common schemas
export type Pagination = z.infer<typeof paginationSchema>
export type PaginationResponse = z.infer<typeof paginationResponseSchema>
export type Sort = z.infer<typeof sortSchema>
export type Search = z.infer<typeof searchSchema>
export type SuccessResponse<T> = {
  success: true
  data: T
  message?: string
}
export type ErrorResponse = z.infer<typeof errorResponseSchema>
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse

// Validation helper functions
export function createSuccessResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  }
}

export function createErrorResponse(
  error: string,
  details?: Array<{ field: string; message: string; code: string }>,
  code?: string
): ErrorResponse {
  return {
    success: false,
    error,
    ...(details && { details }),
    ...(code && { code })
  }
}

// Safe validation wrapper
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  error?: string
  details?: Array<{ field: string; message: string; code: string }>
} {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return {
      success: true,
      data: result.data
    }
  }
  
  return {
    success: false,
    error: 'Validation failed',
    details: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}