/**
 * Custom error classes for the application
 */

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_USER = 'DUPLICATE_USER',
  DUPLICATE_ORGANIZATION = 'DUPLICATE_ORGANIZATION',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_EMAIL = 'INVALID_EMAIL',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING'
}

export class ValidationError extends Error {
  public readonly code: ErrorCode
  public readonly requestId?: string
  public readonly fieldErrors?: Record<string, string[]>

  constructor(
    message: string,
    options?: {
      code?: ErrorCode
      requestId?: string
      fieldErrors?: Record<string, string[]>
    }
  ) {
    super(message)
    this.name = 'ValidationError'
    this.code = options?.code ?? ErrorCode.VALIDATION_ERROR
    this.requestId = options?.requestId
    this.fieldErrors = options?.fieldErrors
  }
}

export class NotFoundError extends Error {
  public readonly code = ErrorCode.NOT_FOUND

  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends Error {
  public readonly code = ErrorCode.UNAUTHORIZED

  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  public readonly code = ErrorCode.FORBIDDEN

  constructor(message: string = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class DatabaseError extends Error {
  public readonly code = ErrorCode.DATABASE_ERROR

  constructor(message: string, public readonly originalError?: any) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Base error class
export class BaseError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly timestamp: Date
  public readonly requestId?: string

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    requestId?: string
  ) {
    super(message)
    this.name = 'BaseError'
    this.code = code
    this.statusCode = statusCode
    this.timestamp = new Date()
    this.requestId = requestId
  }
}

// Authentication error
export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorCode.UNAUTHORIZED, 401)
    this.name = 'AuthenticationError'
  }
}

// Authorization error
export class AuthorizationError extends BaseError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, ErrorCode.FORBIDDEN, 403)
    this.name = 'AuthorizationError'
  }
}

// Conflict error
export class ConflictError extends BaseError {
  constructor(message: string = 'Resource conflict') {
    super(message, ErrorCode.VALIDATION_ERROR, 409)
    this.name = 'ConflictError'
  }
}

// Internal server error
export class InternalServerError extends BaseError {
  constructor(message: string = 'Internal server error') {
    super(message, ErrorCode.INTERNAL_ERROR, 500)
    this.name = 'InternalServerError'
  }
}

// Utility function to check if an error is a BaseError
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError
}