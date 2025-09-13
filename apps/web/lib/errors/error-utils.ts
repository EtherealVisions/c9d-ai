import { 
  BaseError, 
  ErrorCode, 
  AuthenticationError, 
  AuthorizationError, 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  InternalServerError,
  DatabaseError,
  isBaseError
} from './custom-errors';

/**
 * Error factory functions for creating specific error types
 */
export const createAuthenticationError = (
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  requestId?: string
) => new AuthenticationError(message);

export const createAuthorizationError = (
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  requestId?: string
) => new AuthorizationError(message);

export const createValidationError = (
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
  details?: Record<string, any>,
  requestId?: string
) => new ValidationError(message, { code, requestId, fieldErrors });

export const createNotFoundError = (
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  requestId?: string
) => new NotFoundError(message);

export const createConflictError = (
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  requestId?: string
) => new ConflictError(message);

/**
 * Common error factory functions
 */
export const createInvalidCredentialsError = (requestId?: string) =>
  createAuthenticationError(
    ErrorCode.INVALID_CREDENTIALS,
    'Invalid email or password provided',
    undefined,
    requestId
  );

export const createTokenExpiredError = (requestId?: string) =>
  createAuthenticationError(
    ErrorCode.TOKEN_EXPIRED,
    'Authentication token has expired',
    undefined,
    requestId
  );

export const createUnauthorizedError = (requestId?: string) =>
  createAuthenticationError(
    ErrorCode.UNAUTHORIZED_ACCESS,
    'Authentication required to access this resource',
    undefined,
    requestId
  );

export const createInsufficientPermissionsError = (
  resource?: string,
  action?: string,
  requestId?: string
) =>
  createAuthorizationError(
    ErrorCode.INSUFFICIENT_PERMISSIONS,
    `Insufficient permissions to ${action || 'access'} ${resource || 'this resource'}`,
    { resource, action },
    requestId
  );

export const createOrganizationNotFoundError = (orgId: string, requestId?: string) =>
  createNotFoundError(
    ErrorCode.ORGANIZATION_NOT_FOUND,
    `Organization with ID ${orgId} not found`,
    { organizationId: orgId },
    requestId
  );

export const createUserNotFoundError = (userId: string, requestId?: string) =>
  createNotFoundError(
    ErrorCode.USER_NOT_FOUND,
    `User with ID ${userId} not found`,
    { userId },
    requestId
  );

export const createDuplicateOrganizationError = (name: string, requestId?: string) =>
  createConflictError(
    ErrorCode.DUPLICATE_ORGANIZATION,
    `Organization with name '${name}' already exists`,
    { organizationName: name },
    requestId
  );

export const createInvalidEmailError = (email: string, requestId?: string) =>
  createValidationError(
    ErrorCode.INVALID_EMAIL,
    'Invalid email format provided',
    { email: ['Must be a valid email address'] },
    { providedEmail: email },
    requestId
  );

export const createRequiredFieldError = (field: string, requestId?: string) =>
  createValidationError(
    ErrorCode.REQUIRED_FIELD_MISSING,
    `Required field '${field}' is missing`,
    { [field]: ['This field is required'] },
    { missingField: field },
    requestId
  );

/**
 * Error type guards
 */
export { isBaseError } from './custom-errors';

export const isAuthenticationError = (error: unknown): error is AuthenticationError =>
  error instanceof AuthenticationError;

export const isAuthorizationError = (error: unknown): error is AuthorizationError =>
  error instanceof AuthorizationError;

export const isValidationError = (error: unknown): error is ValidationError =>
  error instanceof ValidationError;

export const isNotFoundError = (error: unknown): error is NotFoundError =>
  error instanceof NotFoundError;

export const isConflictError = (error: unknown): error is ConflictError =>
  error instanceof ConflictError;

/**
 * Error message mapping for user-friendly messages
 */
export const getUserFriendlyMessage = (error: BaseError): string => {
  const messageMap: Record<ErrorCode, string> = {
    [ErrorCode.VALIDATION_ERROR]: 'The information provided is not valid. Please check your input and try again.',
    [ErrorCode.NOT_FOUND]: 'The requested resource could not be found.',
    [ErrorCode.UNAUTHORIZED]: 'You are not authorized to access this resource.',
    [ErrorCode.FORBIDDEN]: 'You don\'t have permission to perform this action.',
    [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again later.',
    [ErrorCode.INVALID_INPUT_FORMAT]: 'The information you entered is not in the correct format.',
    [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
    [ErrorCode.DUPLICATE_USER]: 'A user with this email already exists.',
    [ErrorCode.DUPLICATE_ORGANIZATION]: 'An organization with this name already exists. Please choose a different name.',
    [ErrorCode.INVALID_CREDENTIALS]: 'The email or password you entered is incorrect. Please try again.',
    [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please sign in again.',
    [ErrorCode.UNAUTHORIZED_ACCESS]: 'You need to sign in to access this page.',
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to perform this action.',
    [ErrorCode.ORGANIZATION_NOT_FOUND]: 'The organization you\'re looking for doesn\'t exist or has been removed.',
    [ErrorCode.USER_NOT_FOUND]: 'The user you\'re looking for could not be found.',
    [ErrorCode.INVALID_EMAIL]: 'Please enter a valid email address.',
    [ErrorCode.REQUIRED_FIELD_MISSING]: 'Please fill in all required fields.',
  };

  return messageMap[error.code] || error.message;
};

/**
 * Convert unknown error to BaseError
 */
export const normalizeError = (error: unknown, requestId?: string): BaseError => {
  if (isBaseError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message);
  }

  if (typeof error === 'string') {
    return new InternalServerError(error);
  }

  return new InternalServerError('An unknown error occurred');
};

/**
 * Log error with appropriate level
 */
export const logError = (error: BaseError, context?: Record<string, any>) => {
  const logData = {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
    requestId: error.requestId,
    stack: error.stack,
    context,
  };

  // In production, you would use a proper logging service
  if (error.statusCode >= 500) {
    console.error('Server Error:', logData);
  } else if (error.statusCode >= 400) {
    console.warn('Client Error:', logData);
  } else {
    console.info('Error:', logData);
  }
};