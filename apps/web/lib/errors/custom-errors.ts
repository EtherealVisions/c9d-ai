/**
 * Custom error types for the application
 */

export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ORGANIZATION_ACCESS_DENIED = 'ORGANIZATION_ACCESS_DENIED',
  
  // Validation errors
  INVALID_EMAIL = 'INVALID_EMAIL',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_SLUG = 'INVALID_SLUG',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Organization errors
  ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND',
  DUPLICATE_ORGANIZATION = 'DUPLICATE_ORGANIZATION',
  MEMBERSHIP_LIMIT_EXCEEDED = 'MEMBERSHIP_LIMIT_EXCEEDED',
  ORGANIZATION_CREATION_FAILED = 'ORGANIZATION_CREATION_FAILED',
  
  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  DUPLICATE_USER = 'DUPLICATE_USER',
  USER_CREATION_FAILED = 'USER_CREATION_FAILED',
  
  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Generic errors
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Base error class that all custom errors extend
 */
export abstract class BaseError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    message: string,
    public readonly details?: Record<string, any>,
    requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.requestId = requestId;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging and API responses
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Basic authentication related errors (401)
 * @deprecated Use AuthenticationError from authentication-errors.ts instead
 */
export class BasicAuthenticationError extends BaseError {
  readonly statusCode = 401;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }
}

/**
 * Authorization related errors (403)
 */
export class AuthorizationError extends BaseError {
  readonly statusCode = 403;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }
}

/**
 * Validation related errors (400)
 */
export class ValidationError extends BaseError {
  readonly statusCode = 400;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors
    };
  }
}

/**
 * Not found errors (404)
 */
export class NotFoundError extends BaseError {
  readonly statusCode = 404;

  constructor(
    public readonly code: ErrorCode,
    message: string = 'Resource not found',
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }
}

/**
 * Conflict errors (409)
 */
export class ConflictError extends BaseError {
  readonly statusCode = 409;

  constructor(
    public readonly code: ErrorCode,
    message: string = 'Conflict',
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }
}

/**
 * Internal server errors (500)
 */
export class InternalServerError extends BaseError {
  readonly code = ErrorCode.INTERNAL_SERVER_ERROR;
  readonly statusCode = 500;

  constructor(
    message: string = 'Internal server error',
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }
}

/**
 * Database related errors (500)
 */
export class DatabaseError extends BaseError {
  readonly code = ErrorCode.DATABASE_ERROR;
  readonly statusCode = 500;

  constructor(
    message: string = 'Database error',
    public readonly operation?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      operation: this.operation
    };
  }
}

/**
 * External service errors (502)
 */
export class ExternalServiceError extends BaseError {
  readonly code = ErrorCode.EXTERNAL_SERVICE_ERROR;
  readonly statusCode = 502;

  constructor(
    message: string = 'External service error',
    public readonly service?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      service: this.service
    };
  }
}

/**
 * Rate limit errors (429)
 */
export class RateLimitError extends BaseError {
  readonly code = ErrorCode.RATE_LIMIT_EXCEEDED;
  readonly statusCode = 429;

  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
}

// Legacy error classes for backward compatibility
export class UnauthorizedError extends BasicAuthenticationError {
  constructor(message: string = 'Unauthorized') {
    super(ErrorCode.UNAUTHORIZED_ACCESS, message);
  }
}

export class ForbiddenError extends AuthorizationError {
  constructor(message: string = 'Forbidden') {
    super(ErrorCode.PERMISSION_DENIED, message);
  }
}

/**
 * Type guard to check if an error is a BaseError
 */
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}