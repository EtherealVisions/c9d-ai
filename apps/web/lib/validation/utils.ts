/**
 * Validation Utilities
 * 
 * This file contains utility functions for validation, error handling,
 * and schema composition to support the Zod validation system.
 */

import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// Validation error types
export interface ValidationErrorDetail {
  field: string
  message: string
  code: string
  value?: unknown
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationErrorDetail[]
  message?: string
}

export class ValidationError extends Error {
  public readonly errors: ValidationErrorDetail[]
  public readonly statusCode: number

  constructor(message: string, errors: ValidationErrorDetail[], statusCode: number = 400) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
    this.statusCode = statusCode
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors,
      statusCode: this.statusCode
    }
  }

  toApiResponse() {
    return {
      success: false,
      error: this.message,
      details: this.errors,
      code: 'VALIDATION_ERROR'
    }
  }
}

// Validation utility functions
export function createValidationResult<T>(
  success: boolean,
  data?: T,
  errors?: ValidationErrorDetail[],
  message?: string
): ValidationResult<T> {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(errors && { errors }),
    ...(message && { message })
  }
}

export function createSuccessResult<T>(data: T, message?: string): ValidationResult<T> {
  return createValidationResult(true, data, undefined, message)
}

export function createErrorResult<T = never>(
  errors: ValidationErrorDetail[],
  message: string = 'Validation failed'
): ValidationResult<T> {
  return {
    success: false,
    errors,
    message
  }
}

// Zod error transformation utilities
export function transformZodError(error: z.ZodError): ValidationErrorDetail[] {
  return error.errors.map(err => ({
    field: err.path.join('.') || 'root',
    message: err.message,
    code: err.code,
    value: 'received' in err ? err.received : undefined
  }))
}

export function formatZodError(error: z.ZodError): ValidationError {
  const details = transformZodError(error)
  return new ValidationError('Validation failed', details)
}

// Safe validation wrapper
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options?: {
    throwOnError?: boolean
    customMessage?: string
  }
): ValidationResult<T> {
  const { throwOnError = false, customMessage } = options || {}
  
  try {
    const result = schema.safeParse(data)
    
    if (result.success) {
      return createSuccessResult(result.data)
    }
    
    const errors = transformZodError(result.error)
    const message = customMessage || 'Validation failed'
    
    if (throwOnError) {
      throw new ValidationError(message, errors)
    }
    
    return createErrorResult(errors, message)
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    
    const message = customMessage || 'Unexpected validation error'
    const validationError = new ValidationError(message, [{
      field: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR'
    }])
    
    if (throwOnError) {
      throw validationError
    }
    
    return createErrorResult(validationError.errors, message)
  }
}

// Async validation wrapper
export async function safeValidateAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options?: {
    throwOnError?: boolean
    customMessage?: string
  }
): Promise<ValidationResult<T>> {
  const { throwOnError = false, customMessage } = options || {}
  
  try {
    const result = await schema.safeParseAsync(data)
    
    if (result.success) {
      return createSuccessResult(result.data)
    }
    
    const errors = transformZodError(result.error)
    const message = customMessage || 'Validation failed'
    
    if (throwOnError) {
      throw new ValidationError(message, errors)
    }
    
    return createErrorResult(errors, message)
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    
    const message = customMessage || 'Unexpected validation error'
    const validationError = new ValidationError(message, [{
      field: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR'
    }])
    
    if (throwOnError) {
      throw validationError
    }
    
    return createErrorResult(validationError.errors, message)
  }
}

// Batch validation utilities
export function validateBatch<T>(
  schema: z.ZodSchema<T>,
  items: unknown[],
  options?: {
    stopOnFirstError?: boolean
    includeIndex?: boolean
  }
): ValidationResult<T[]> {
  const { stopOnFirstError = false, includeIndex = true } = options || {}
  const results: T[] = []
  const allErrors: ValidationErrorDetail[] = []
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const result = safeValidate(schema, item)
    
    if (result.success && result.data) {
      results.push(result.data)
    } else if (result.errors) {
      const indexedErrors = includeIndex
        ? result.errors.map(err => ({
            ...err,
            field: `[${i}].${err.field}`
          }))
        : result.errors
      
      allErrors.push(...indexedErrors)
      
      if (stopOnFirstError) {
        break
      }
    }
  }
  
  if (allErrors.length > 0) {
    return createErrorResult(allErrors, `Validation failed for ${allErrors.length} items`)
  }
  
  return createSuccessResult(results, `Successfully validated ${results.length} items`)
}

// Schema composition utilities
export function createPaginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().min(1),
      limit: z.number().int().min(1).max(100),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0)
    })
  })
}

export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.union([
    z.object({
      success: z.literal(true),
      data: dataSchema,
      message: z.string().optional()
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
      details: z.array(z.object({
        field: z.string(),
        message: z.string(),
        code: z.string()
      })).optional(),
      code: z.string().optional()
    })
  ])
}

export function createSearchSchema<T extends z.ZodTypeAny>(filterSchema: T) {
  return z.object({
    query: z.string().min(1).max(255).optional(),
    filters: filterSchema.optional(),
    pagination: z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20)
    }).default({}),
    sort: z.object({
      field: z.string().min(1),
      order: z.enum(['asc', 'desc']).default('desc')
    }).optional()
  })
}

// Request validation middleware utilities
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  options?: {
    customMessage?: string
    allowEmpty?: boolean
  }
): Promise<T> {
  const { customMessage, allowEmpty = false } = options || {}
  
  try {
    const body = await request.json()
    
    if (!allowEmpty && (!body || Object.keys(body).length === 0)) {
      throw new ValidationError(
        customMessage || 'Request body is required',
        [{
          field: 'body',
          message: 'Request body cannot be empty',
          code: 'REQUIRED'
        }]
      )
    }
    
    const result = safeValidate(schema, body, {
      throwOnError: true,
      customMessage
    })
    
    if (!result.success || !result.data) {
      throw new ValidationError(
        customMessage || 'Invalid request body',
        result.errors || []
      )
    }
    
    return result.data
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    
    if (error instanceof SyntaxError) {
      throw new ValidationError(
        'Invalid JSON in request body',
        [{
          field: 'body',
          message: 'Request body must be valid JSON',
          code: 'INVALID_JSON'
        }]
      )
    }
    
    throw new ValidationError(
      customMessage || 'Failed to parse request body',
      [{
        field: 'body',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'PARSE_ERROR'
      }]
    )
  }
}

export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  options?: {
    customMessage?: string
  }
): T {
  const { customMessage } = options || {}
  
  try {
    const { searchParams } = new URL(request.url)
    const params: Record<string, unknown> = {}
    
    // Convert URLSearchParams to object
    for (const [key, value] of searchParams.entries()) {
      // Handle array parameters (e.g., ?tags=a&tags=b)
      if (params[key]) {
        if (Array.isArray(params[key])) {
          (params[key] as unknown[]).push(value)
        } else {
          params[key] = [params[key], value]
        }
      } else {
        params[key] = value
      }
    }
    
    const result = safeValidate(schema, params, {
      throwOnError: true,
      customMessage
    })
    
    if (!result.success || !result.data) {
      throw new ValidationError(
        customMessage || 'Invalid query parameters',
        result.errors || []
      )
    }
    
    return result.data
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    
    throw new ValidationError(
      customMessage || 'Failed to validate query parameters',
      [{
        field: 'query',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'VALIDATION_ERROR'
      }]
    )
  }
}

export function validatePathParams<T>(
  params: Record<string, string | string[]>,
  schema: z.ZodSchema<T>,
  options?: {
    customMessage?: string
  }
): T {
  const { customMessage } = options || {}
  
  try {
    const result = safeValidate(schema, params, {
      throwOnError: true,
      customMessage
    })
    
    if (!result.success || !result.data) {
      throw new ValidationError(
        customMessage || 'Invalid path parameters',
        result.errors || []
      )
    }
    
    return result.data
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    
    throw new ValidationError(
      customMessage || 'Failed to validate path parameters',
      [{
        field: 'params',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'VALIDATION_ERROR'
      }]
    )
  }
}

// Error response utilities
export function createValidationErrorResponse(
  error: ValidationError,
  status: number = 400
): NextResponse {
  return NextResponse.json(error.toApiResponse(), { status })
}

export function createErrorResponse(
  message: string,
  details?: ValidationErrorDetail[],
  status: number = 400,
  code?: string
): NextResponse {
  return NextResponse.json({
    success: false,
    error: message,
    ...(details && { details }),
    ...(code && { code })
  }, { status })
}

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message })
  }, { status })
}

// Validation middleware factory
export function createValidationMiddleware<TBody = unknown, TQuery = unknown, TParams = unknown>(
  schemas: {
    body?: z.ZodSchema<TBody>
    query?: z.ZodSchema<TQuery>
    params?: z.ZodSchema<TParams>
  }
) {
  return async (
    request: NextRequest,
    context: { params?: Record<string, string | string[]> }
  ): Promise<{
    body?: TBody
    query?: TQuery
    params?: TParams
  }> => {
    const result: {
      body?: TBody
      query?: TQuery
      params?: TParams
    } = {}
    
    try {
      // Validate request body
      if (schemas.body) {
        result.body = await validateRequestBody(request, schemas.body)
      }
      
      // Validate query parameters
      if (schemas.query) {
        result.query = validateQueryParams(request, schemas.query)
      }
      
      // Validate path parameters
      if (schemas.params && context.params) {
        result.params = validatePathParams(context.params, schemas.params)
      }
      
      return result
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      
      throw new ValidationError(
        'Validation middleware error',
        [{
          field: 'middleware',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'MIDDLEWARE_ERROR'
        }]
      )
    }
  }
}

// Type guards and utility types
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError
}

// Schema transformation utilities
export function makeOptional<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial()
}

export function makeRequired<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  fields: (keyof T)[]
) {
  const shape = schema.shape
  const requiredShape: Partial<T> = {}
  
  for (const field of fields) {
    if (field in shape) {
      requiredShape[field] = shape[field]
    }
  }
  
  return schema.extend(requiredShape as T)
}

export function omitFields<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  fields: K[]
) {
  const omitObj = fields.reduce((acc, field) => {
    acc[field] = true
    return acc
  }, {} as Record<K, true>)
  return schema.omit(omitObj as any)
}

export function pickFields<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  fields: K[]
) {
  const pickObj = fields.reduce((acc, field) => {
    acc[field] = true
    return acc
  }, {} as Record<K, true>)
  return schema.pick(pickObj as any)
}

// Conditional validation utilities
export function conditionalValidation<T>(
  condition: (data: unknown) => boolean,
  trueSchema: z.ZodSchema<T>,
  falseSchema: z.ZodSchema<T>
): z.ZodSchema<T> {
  return z.custom<T>((data) => {
    const schema = condition(data) ? trueSchema : falseSchema
    return schema.parse(data)
  })
}

export function dependentValidation<T extends Record<string, unknown>>(
  dependencies: Record<keyof T, (data: T) => boolean>
): z.ZodEffects<z.ZodType<T>, T> {
  return z.custom<T>().refine(
    (data) => {
      for (const [field, validator] of Object.entries(dependencies)) {
        if (!validator(data as T)) {
          return false
        }
      }
      return true
    },
    'Dependent validation failed'
  )
}

// Export all utilities
export {
  z,
  type z as ZodType
}