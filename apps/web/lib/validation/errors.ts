/**
 * Validation Error Handling
 * 
 * This file contains structured error handling for validation failures,
 * API error responses, and error transformation utilities.
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'

// Error code constants
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_TYPE: 'INVALID_TYPE',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  INVALID_LENGTH: 'INVALID_LENGTH',
  INVALID_PATTERN: 'INVALID_PATTERN',
  CUSTOM_VALIDATION: 'CUSTOM_VALIDATION',
  
  // Business rule errors
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  INVALID_STATE: 'INVALID_STATE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Authentication/Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const

export type ErrorCode = keyof typeof ERROR_CODES

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

export type ErrorSeverity = keyof typeof ERROR_SEVERITY

// Structured error detail interface
export interface ErrorDetail {
  field: string
  message: string
  code: ErrorCode
  value?: unknown
  context?: Record<string, unknown>
}

// Base error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
    value: z.unknown().optional(),
    context: z.record(z.unknown()).optional()
  })).optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
})

export type ErrorResponse = z.infer<typeof errorResponseSchema>

// Validation error class
export class ValidationError extends Error {
  public readonly code: ErrorCode
  public readonly details: ErrorDetail[]
  public readonly severity: ErrorSeverity
  public readonly statusCode: number
  public readonly timestamp: Date
  public readonly requestId?: string

  constructor(
    message: string,
    details: ErrorDetail[],
    options?: {
      code?: ErrorCode
      severity?: ErrorSeverity
      statusCode?: number
      requestId?: string
    }
  ) {
    super(message)
    this.name = 'ValidationError'
    this.code = options?.code || 'VALIDATION_FAILED'
    this.details = details
    this.severity = options?.severity || 'MEDIUM'
    this.statusCode = options?.statusCode || 400
    this.timestamp = new Date()
    this.requestId = options?.requestId
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      severity: this.severity.toLowerCase() as 'low' | 'medium' | 'high' | 'critical'
    }
  }

  toResponse(): NextResponse {
    return NextResponse.json(this.toJSON(), { status: this.statusCode })
  }
}

// Business rule error class
export class BusinessRuleError extends ValidationError {
  constructor(
    message: string,
    rule: string,
    context?: Record<string, unknown>,
    options?: {
      severity?: ErrorSeverity
      statusCode?: number
      requestId?: string
    }
  ) {
    super(
      message,
      [{
        field: 'business_rule',
        message,
        code: 'BUSINESS_RULE_VIOLATION',
        context: { rule, ...context }
      }],
      {
        code: 'BUSINESS_RULE_VIOLATION',
        severity: options?.severity || 'HIGH',
        statusCode: options?.statusCode || 422,
        requestId: options?.requestId
      }
    )
  }
}

// Permission error class
export class PermissionError extends ValidationError {
  constructor(
    message: string,
    requiredPermission: string,
    context?: Record<string, unknown>,
    options?: {
      statusCode?: number
      requestId?: string
    }
  ) {
    super(
      message,
      [{
        field: 'permission',
        message,
        code: 'PERMISSION_DENIED',
        context: { requiredPermission, ...context }
      }],
      {
        code: 'PERMISSION_DENIED',
        severity: 'HIGH',
        statusCode: options?.statusCode || 403,
        requestId: options?.requestId
      }
    )
  }
}

// Resource error class
export class ResourceError extends ValidationError {
  constructor(
    message: string,
    resourceType: string,
    resourceId?: string,
    options?: {
      code?: 'RESOURCE_NOT_FOUND' | 'DUPLICATE_RESOURCE'
      statusCode?: number
      requestId?: string
    }
  ) {
    const code = options?.code || 'RESOURCE_NOT_FOUND'
    const statusCode = options?.statusCode || (code === 'RESOURCE_NOT_FOUND' ? 404 : 409)
    
    super(
      message,
      [{
        field: 'resource',
        message,
        code,
        context: { resourceType, resourceId }
      }],
      {
        code,
        severity: 'MEDIUM',
        statusCode,
        requestId: options?.requestId
      }
    )
  }
}

// Zod error transformation utilities
export function transformZodError(
  error: z.ZodError,
  options?: {
    requestId?: string
    severity?: ErrorSeverity
  }
): ValidationError {
  const details: ErrorDetail[] = error.errors.map(err => {
    let code: ErrorCode = 'VALIDATION_FAILED'
    
    // Map Zod error codes to our error codes
    switch (err.code) {
      case 'invalid_type':
        code = 'INVALID_TYPE'
        break
      case 'invalid_string':
        code = 'INVALID_FORMAT'
        break
      case 'too_small':
      case 'too_big':
        code = 'OUT_OF_RANGE'
        break
      case 'invalid_literal':
      case 'unrecognized_keys':
        code = 'INVALID_FORMAT'
        break
      case 'custom':
        code = 'CUSTOM_VALIDATION'
        break
      default:
        code = 'VALIDATION_FAILED'
    }
    
    return {
      field: err.path.join('.') || 'root',
      message: err.message,
      code,
      value: 'received' in err ? err.received : undefined,
      context: {
        zodCode: err.code,
        expected: 'expected' in err ? err.expected : undefined
      }
    }
  })
  
  return new ValidationError(
    'Validation failed',
    details,
    {
      code: 'VALIDATION_FAILED',
      severity: options?.severity || 'MEDIUM',
      requestId: options?.requestId
    }
  )
}

// Error factory functions
export function createValidationError(
  message: string,
  field: string,
  code: ErrorCode = 'VALIDATION_FAILED',
  value?: unknown,
  context?: Record<string, unknown>
): ValidationError {
  return new ValidationError(message, [{
    field,
    message,
    code,
    value,
    context
  }])
}

export function createBusinessRuleError(
  message: string,
  rule: string,
  context?: Record<string, unknown>
): BusinessRuleError {
  return new BusinessRuleError(message, rule, context)
}

export function createPermissionError(
  message: string,
  requiredPermission: string,
  context?: Record<string, unknown>
): PermissionError {
  return new PermissionError(message, requiredPermission, context)
}

export function createResourceNotFoundError(
  resourceType: string,
  resourceId?: string
): ResourceError {
  return new ResourceError(
    `${resourceType} not found${resourceId ? ` with ID: ${resourceId}` : ''}`,
    resourceType,
    resourceId,
    { code: 'RESOURCE_NOT_FOUND' }
  )
}

export function createDuplicateResourceError(
  resourceType: string,
  resourceId?: string
): ResourceError {
  return new ResourceError(
    `${resourceType} already exists${resourceId ? ` with ID: ${resourceId}` : ''}`,
    resourceType,
    resourceId,
    { code: 'DUPLICATE_RESOURCE' }
  )
}

// Error aggregation utilities
export function aggregateErrors(errors: ValidationError[]): ValidationError {
  const allDetails: ErrorDetail[] = []
  let highestSeverity: ErrorSeverity = 'LOW'
  let highestStatusCode = 400
  
  for (const error of errors) {
    allDetails.push(...error.details)
    
    // Determine highest severity
    const severityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
    if (severityLevels[error.severity] > severityLevels[highestSeverity]) {
      highestSeverity = error.severity
    }
    
    // Determine highest status code
    if (error.statusCode > highestStatusCode) {
      highestStatusCode = error.statusCode
    }
  }
  
  return new ValidationError(
    `Multiple validation errors occurred (${allDetails.length} errors)`,
    allDetails,
    {
      code: 'VALIDATION_FAILED',
      severity: highestSeverity,
      statusCode: highestStatusCode
    }
  )
}

// Error context utilities
export function addErrorContext(
  error: ValidationError,
  context: Record<string, unknown>
): ValidationError {
  const updatedDetails = error.details.map(detail => ({
    ...detail,
    context: { ...detail.context, ...context }
  }))
  
  return new ValidationError(
    error.message,
    updatedDetails,
    {
      code: error.code,
      severity: error.severity,
      statusCode: error.statusCode,
      requestId: error.requestId
    }
  )
}

export function setErrorRequestId(
  error: ValidationError,
  requestId: string
): ValidationError {
  return new ValidationError(
    error.message,
    error.details,
    {
      code: error.code,
      severity: error.severity,
      statusCode: error.statusCode,
      requestId
    }
  )
}

// Error filtering and grouping
export function filterErrorsByField(
  error: ValidationError,
  field: string
): ErrorDetail[] {
  return error.details.filter(detail => 
    detail.field === field || detail.field.startsWith(`${field}.`)
  )
}

export function groupErrorsByField(
  error: ValidationError
): Record<string, ErrorDetail[]> {
  const grouped: Record<string, ErrorDetail[]> = {}
  
  for (const detail of error.details) {
    const rootField = detail.field.split('.')[0]
    if (!grouped[rootField]) {
      grouped[rootField] = []
    }
    grouped[rootField].push(detail)
  }
  
  return grouped
}

export function getErrorSummary(error: ValidationError): {
  totalErrors: number
  errorsByCode: Record<string, number>
  errorsByField: Record<string, number>
  severity: ErrorSeverity
} {
  const errorsByCode: Record<string, number> = {}
  const errorsByField: Record<string, number> = {}
  
  for (const detail of error.details) {
    errorsByCode[detail.code] = (errorsByCode[detail.code] || 0) + 1
    
    const rootField = detail.field.split('.')[0]
    errorsByField[rootField] = (errorsByField[rootField] || 0) + 1
  }
  
  return {
    totalErrors: error.details.length,
    errorsByCode,
    errorsByField,
    severity: error.severity
  }
}

// Error response utilities
export function createErrorResponse(
  error: ValidationError | Error | string,
  options?: {
    statusCode?: number
    requestId?: string
    includeStack?: boolean
  }
): NextResponse {
  const { statusCode = 500, requestId, includeStack = false } = options || {}
  
  if (error instanceof ValidationError) {
    return error.toResponse()
  }
  
  const message = typeof error === 'string' ? error : error.message
  const stack = includeStack && error instanceof Error ? error.stack : undefined
  
  const response: ErrorResponse = {
    success: false,
    error: message,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId,
    severity: 'high',
    ...(stack && { details: [{ field: 'stack', message: stack, code: 'INTERNAL_ERROR' }] })
  }
  
  return NextResponse.json(response, { status: statusCode })
}

// Type guards
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function isBusinessRuleError(error: unknown): error is BusinessRuleError {
  return error instanceof BusinessRuleError
}

export function isPermissionError(error: unknown): error is PermissionError {
  return error instanceof PermissionError
}

export function isResourceError(error: unknown): error is ResourceError {
  return error instanceof ResourceError
}

// Error logging utilities
export function logError(
  error: ValidationError,
  context?: Record<string, unknown>
): void {
  const logData = {
    timestamp: error.timestamp.toISOString(),
    message: error.message,
    code: error.code,
    severity: error.severity,
    statusCode: error.statusCode,
    requestId: error.requestId,
    details: error.details,
    context
  }
  
  // Log based on severity
  switch (error.severity) {
    case 'CRITICAL':
      console.error('CRITICAL ERROR:', logData)
      break
    case 'HIGH':
      console.error('HIGH SEVERITY ERROR:', logData)
      break
    case 'MEDIUM':
      console.warn('MEDIUM SEVERITY ERROR:', logData)
      break
    case 'LOW':
      console.info('LOW SEVERITY ERROR:', logData)
      break
  }
}

// Export error classes and utilities
export { ValidationError as default }