import { NextRequest, NextResponse } from 'next/server';
import { BaseError, InternalServerError } from './custom-errors';
import { normalizeError, logError } from './error-utils';

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    fieldErrors?: Record<string, string[]>;
    timestamp: string;
    requestId: string;
  };
}

/**
 * Generate a unique request ID
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Extract request ID from headers or generate new one
 */
export const getRequestId = (request?: NextRequest): string => {
  if (request?.headers.get('x-request-id')) {
    return request.headers.get('x-request-id')!;
  }
  return generateRequestId();
};

/**
 * Format error for API response
 */
export const formatApiError = (error: BaseError, requestId: string): ApiErrorResponse => {
  const response: ApiErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp.toISOString(),
      requestId,
    },
  };

  // Add details if present
  if (error.details) {
    response.error.details = error.details;
  }

  // Add field errors for validation errors
  if ('fieldErrors' in error && error.fieldErrors) {
    (response.error as any).fieldErrors = error.fieldErrors;
  }

  return response;
};

/**
 * Create error response with proper headers
 */
export const createErrorResponse = (
  error: BaseError,
  requestId: string,
  headers?: Record<string, string>
): NextResponse => {
  const errorResponse = formatApiError(error, requestId);
  
  const responseHeaders = {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
    ...headers,
  };

  // Add retry-after header for rate limit errors
  if ('retryAfter' in error && error.retryAfter) {
    (responseHeaders as any)['Retry-After'] = error.retryAfter.toString();
  }

  return NextResponse.json(errorResponse, {
    status: error.statusCode,
    headers: responseHeaders,
  });
};

/**
 * Global API error handler for Next.js API routes
 */
export const handleApiError = (
  error: unknown,
  request?: NextRequest,
  context?: Record<string, any>
): NextResponse => {
  const requestId = getRequestId(request);
  const normalizedError = normalizeError(error, requestId);
  
  // Log the error
  logError(normalizedError, {
    ...context,
    url: request?.url,
    method: request?.method,
    userAgent: request?.headers.get('user-agent'),
    ip: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip'),
  });

  return createErrorResponse(normalizedError, requestId);
};

/**
 * Async error handler wrapper for API routes
 */
export const withErrorHandler = <T extends any[], R>(
  handler: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract request from args if available
      const request = args.find(arg => arg instanceof NextRequest) as NextRequest | undefined;
      return handleApiError(error, request);
    }
  };
};

/**
 * Error handler middleware for API routes
 */
export const errorHandlerMiddleware = (
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) => {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, request, context);
    }
  };
};

/**
 * Validation error helper
 */
export const createValidationErrorResponse = (
  fieldErrors: Record<string, string[]>,
  message: string = 'Validation failed',
  requestId?: string
): NextResponse => {
  const error = new (class extends BaseError {
    readonly code = 'VALIDATION_ERROR' as any;
    readonly statusCode = 400;
    constructor(
      message: string,
      public readonly fieldErrors: Record<string, string[]>,
      requestId?: string
    ) {
      super(message, { fieldErrors }, requestId);
    }
  })(message, fieldErrors, requestId);

  return createErrorResponse(error, requestId || generateRequestId());
};

/**
 * Success response helper
 */
export const createSuccessResponse = <T>(
  data: T,
  status: number = 200,
  headers?: Record<string, string>
): NextResponse => {
  return NextResponse.json(
    { data, success: true },
    { status, headers }
  );
};