/**
 * API Validation Middleware
 * 
 * This file contains middleware functions for validating API requests,
 * handling errors, and providing consistent API response formatting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { 
  ValidationError, 
  BusinessRuleError, 
  PermissionError, 
  ResourceError,
  transformZodError,
  createErrorResponse,
  isValidationError
} from './errors'
import { 
  validateRequestBody, 
  validateQueryParams, 
  validatePathParams,
  createSuccessResponse
} from './utils'

// Request context interface
export interface RequestContext {
  userId?: string
  orgId?: string
  requestId: string
  timestamp: Date
  userAgent?: string
  ip?: string
}

// Validation middleware options
export interface ValidationMiddlewareOptions {
  requireAuth?: boolean
  requireOrg?: boolean
  permissions?: string[]
  rateLimit?: {
    requests: number
    windowMs: number
  }
  customValidation?: (context: RequestContext) => Promise<void> | void
}

// API handler type with validation
export type ValidatedApiHandler<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
  TResponse = unknown
> = (
  request: NextRequest,
  context: {
    params?: TParams
    body?: TBody
    query?: TQuery
    requestContext: RequestContext
  }
) => Promise<NextResponse<TResponse>>

// Create validation middleware
export function withValidation<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
  TResponse = unknown
>(
  schemas: {
    body?: z.ZodSchema<TBody>
    query?: z.ZodSchema<TQuery>
    params?: z.ZodSchema<TParams>
  },
  handler: ValidatedApiHandler<TBody, TQuery, TParams, TResponse>,
  options: ValidationMiddlewareOptions = {}
) {
  return async (
    request: NextRequest,
    context: { params?: Record<string, string | string[]> }
  ): Promise<NextResponse> => {
    const requestId = crypto.randomUUID()
    const timestamp = new Date()
    
    try {
      // Create request context
      const requestContext: RequestContext = {
        requestId,
        timestamp,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            undefined
      }
      
      // Authentication validation
      if (options.requireAuth || options.requireOrg || options.permissions) {
        const { userId, orgId } = auth()
        
        if (options.requireAuth && !userId) {
          throw new ValidationError(
            'Authentication required',
            [{
              field: 'auth',
              message: 'User must be authenticated',
              code: 'UNAUTHORIZED'
            }],
            { statusCode: 401, requestId }
          )
        }
        
        if (options.requireOrg && !orgId) {
          throw new ValidationError(
            'Organization context required',
            [{
              field: 'organization',
              message: 'User must be in an organization context',
              code: 'FORBIDDEN'
            }],
            { statusCode: 403, requestId }
          )
        }
        
        requestContext.userId = userId || undefined
        requestContext.orgId = orgId || undefined
        
        // Permission validation (would be implemented with actual permission checking)
        if (options.permissions && options.permissions.length > 0) {
          // This would integrate with your permission system
          // For now, we'll assume permissions are valid if user is authenticated
          if (!userId) {
            throw new PermissionError(
              'Insufficient permissions',
              options.permissions.join(', '),
              { requestId }
            )
          }
        }
      }
      
      // Rate limiting (basic implementation)
      if (options.rateLimit) {
        // This would integrate with your rate limiting system
        // For now, we'll skip the actual rate limiting logic
      }
      
      // Custom validation
      if (options.customValidation) {
        await options.customValidation(requestContext)
      }
      
      // Validate request data
      const validatedData: {
        body?: TBody
        query?: TQuery
        params?: TParams
      } = {}
      
      // Validate request body
      if (schemas.body) {
        try {
          validatedData.body = await validateRequestBody(request, schemas.body)
        } catch (error) {
          if (error instanceof ValidationError) {
            throw new ValidationError(
              error.message,
              error.details,
              { ...error, requestId }
            )
          }
          throw error
        }
      }
      
      // Validate query parameters
      if (schemas.query) {
        try {
          validatedData.query = validateQueryParams(request, schemas.query)
        } catch (error) {
          if (error instanceof ValidationError) {
            throw new ValidationError(
              error.message,
              error.details,
              { ...error, requestId }
            )
          }
          throw error
        }
      }
      
      // Validate path parameters
      if (schemas.params && context.params) {
        try {
          validatedData.params = validatePathParams(context.params, schemas.params)
        } catch (error) {
          if (error instanceof ValidationError) {
            throw new ValidationError(
              error.message,
              error.details,
              { ...error, requestId }
            )
          }
          throw error
        }
      }
      
      // Call the handler with validated data
      return await handler(request, {
        ...validatedData,
        requestContext
      })
      
    } catch (error) {
      // Handle different types of errors
      if (isValidationError(error)) {
        return error.toResponse()
      }
      
      if (error instanceof z.ZodError) {
        const validationError = transformZodError(error, { requestId })
        return validationError.toResponse()
      }
      
      // Handle unexpected errors
      console.error('Unexpected API error:', error)
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        { statusCode: 500, requestId }
      )
    }
  }
}

// Convenience middleware factories
export function withBodyValidation<TBody, TResponse = unknown>(
  schema: z.ZodSchema<TBody>,
  handler: ValidatedApiHandler<TBody, unknown, unknown, TResponse>,
  options: ValidationMiddlewareOptions = {}
) {
  return withValidation({ body: schema }, handler, options)
}

export function withQueryValidation<TQuery, TResponse = unknown>(
  schema: z.ZodSchema<TQuery>,
  handler: ValidatedApiHandler<unknown, TQuery, unknown, TResponse>,
  options: ValidationMiddlewareOptions = {}
) {
  return withValidation({ query: schema }, handler, options)
}

export function withParamsValidation<TParams, TResponse = unknown>(
  schema: z.ZodSchema<TParams>,
  handler: ValidatedApiHandler<unknown, unknown, TParams, TResponse>,
  options: ValidationMiddlewareOptions = {}
) {
  return withValidation({ params: schema }, handler, options)
}

export function withAuth<TResponse = unknown>(
  handler: ValidatedApiHandler<unknown, unknown, unknown, TResponse>,
  options: Omit<ValidationMiddlewareOptions, 'requireAuth'> = {}
) {
  return withValidation({}, handler, { ...options, requireAuth: true })
}

export function withOrgContext<TResponse = unknown>(
  handler: ValidatedApiHandler<unknown, unknown, unknown, TResponse>,
  options: Omit<ValidationMiddlewareOptions, 'requireAuth' | 'requireOrg'> = {}
) {
  return withValidation({}, handler, { 
    ...options, 
    requireAuth: true, 
    requireOrg: true 
  })
}

export function withPermissions<TResponse = unknown>(
  permissions: string[],
  handler: ValidatedApiHandler<unknown, unknown, unknown, TResponse>,
  options: Omit<ValidationMiddlewareOptions, 'requireAuth' | 'permissions'> = {}
) {
  return withValidation({}, handler, { 
    ...options, 
    requireAuth: true, 
    permissions 
  })
}

// Error handling middleware
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('API Error:', error)
      
      if (isValidationError(error)) {
        return error.toResponse()
      }
      
      if (error instanceof z.ZodError) {
        const validationError = transformZodError(error)
        return validationError.toResponse()
      }
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        { statusCode: 500 }
      )
    }
  }) as T
}

// Response formatting middleware
export function withResponseFormatting<T extends (...args: any[]) => Promise<any>>(
  handler: T
): (...args: Parameters<T>) => Promise<NextResponse> {
  return async (...args: Parameters<T>): Promise<NextResponse> => {
    try {
      const result = await handler(...args)
      
      // If result is already a NextResponse, return it
      if (result instanceof NextResponse) {
        return result
      }
      
      // Otherwise, wrap in success response
      return createSuccessResponse(result)
    } catch (error) {
      if (isValidationError(error)) {
        return error.toResponse()
      }
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        { statusCode: 500 }
      )
    }
  }
}

// CORS middleware
export function withCors(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  options: {
    origin?: string | string[]
    methods?: string[]
    headers?: string[]
    credentials?: boolean
  } = {}
) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = false
  } = options
  
  return async (request: NextRequest, context: any): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': Array.isArray(origin) ? origin.join(', ') : origin,
          'Access-Control-Allow-Methods': methods.join(', '),
          'Access-Control-Allow-Headers': headers.join(', '),
          ...(credentials && { 'Access-Control-Allow-Credentials': 'true' })
        }
      })
    }
    
    // Handle actual requests
    const response = await handler(request, context)
    
    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', Array.isArray(origin) ? origin.join(', ') : origin)
    response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
    response.headers.set('Access-Control-Allow-Headers', headers.join(', '))
    
    if (credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    
    return response
  }
}

// Logging middleware
export function withLogging<T extends (request: NextRequest, context: any) => Promise<NextResponse>>(
  handler: T,
  options: {
    logRequests?: boolean
    logResponses?: boolean
    logErrors?: boolean
    sensitiveFields?: string[]
  } = {}
): T {
  const {
    logRequests = true,
    logResponses = false,
    logErrors = true,
    sensitiveFields = ['password', 'token', 'secret', 'key']
  } = options
  
  return (async (request: NextRequest, context: any): Promise<NextResponse> => {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()
    
    // Log request
    if (logRequests) {
      console.log(`[${requestId}] ${request.method} ${request.url}`, {
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      })
    }
    
    try {
      const response = await handler(request, context)
      const duration = Date.now() - startTime
      
      // Log response
      if (logResponses) {
        console.log(`[${requestId}] Response ${response.status}`, {
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        })
      }
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log error
      if (logErrors) {
        console.error(`[${requestId}] Error after ${duration}ms:`, error)
      }
      
      throw error
    }
  }) as T
}

// Compose multiple middleware
export function compose<T extends (request: NextRequest, context: any) => Promise<NextResponse>>(
  ...middlewares: Array<(handler: T) => T>
): (handler: T) => T {
  return (handler: T): T => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}

// Export middleware utilities
export {
  ValidationError,
  BusinessRuleError,
  PermissionError,
  ResourceError,
  createErrorResponse,
  createSuccessResponse
}