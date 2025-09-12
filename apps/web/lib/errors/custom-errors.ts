/**
 * Custom error classes for the account management and organizational modeling system
 */

export enum ErrorCode {
  // Authentication Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',

  // Authorization Errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ORGANIZATION_ACCESS_DENIED = 'ORGANIZATION_ACCESS_DENIED',

  // Validation Errors
  INVALID_EMAIL = 'INVALID_EMAIL',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_SLUG = 'INVALID_SLUG',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',

  // Organization Errors
  ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND',
  DUPLICATE_ORGANIZATION = 'DUPLICATE_ORGANIZATION',
  MEMBERSHIP_LIMIT_EXCEEDED = 'MEMBERSHIP_LIMIT_EXCEEDED',
  ORGANIZATION_CREATION_FAILED = 'ORGANIZATION_CREATION_FAILED',

  // User Errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  DUPLICATE_USER = 'DUPLICATE_USER',
  USER_CREATION_FAILED = 'USER_CREATION_FAILED',

  // System Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Base error class for all custom errors
 */
export abstract class BaseError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.details = details;
    this.requestId = requestId;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      requestId: this.requestId,
      details: this.details,
    };
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends BaseError {
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
 * Authorization related errors
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
 * Validation related errors
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

  toJSON() {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors,
    };
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends BaseError {
  readonly statusCode = 404;

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
 * Conflict errors (duplicate resources, etc.)
 */
export class ConflictError extends BaseError {
  readonly statusCode = 409;

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
 * Rate limiting errors
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

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Internal server errors
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
 * Database related errors
 */
export class DatabaseError extends BaseError {
  readonly code = ErrorCode.DATABASE_ERROR;
  readonly statusCode = 500;

  constructor(
    message: string,
    public readonly operation?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      operation: this.operation,
    };
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends BaseError {
  readonly code = ErrorCode.EXTERNAL_SERVICE_ERROR;
  readonly statusCode = 502;

  constructor(
    message: string,
    public readonly service?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, details, requestId);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      service: this.service,
    };
  }
}