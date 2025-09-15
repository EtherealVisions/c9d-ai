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
  ExternalServiceError
} from './custom-errors';

/**
 * Error factory functions for creating specific error types
 */
export const createAuthenticationError = (
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  requestId?: string
) => new AuthenticationError(code, message, details, requestId);

export const createAuthorizationError = (
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  requestId?: string
) => new AuthorizationError(code, message, details, requestId);

export const createValidationError = (
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
  details?: Record<string, any>,
  requestId?: string
) => new ValidationError(code, message, fieldErrors, details, requestId);

export const createNotFoundError = (
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  requestId?: string
) => new NotFoundError(code, message, details, requestId);

export const createConflictError = (
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  requestId?: string
) => new ConflictError(code, message, details, requestId);

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
export const isBaseError = (error: unknown): error is BaseError =>
  error instanceof BaseError;

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
  const messageMap: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.INVALID_CREDENTIALS]: 'The email or password you entered is incorrect. Please try again.',
    [ErrorCode.ACCOUNT_LOCKED]: 'Your account has been temporarily locked for security reasons. Please contact support.',
    [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please sign in again.',
    [ErrorCode.UNAUTHORIZED_ACCESS]: 'You need to sign in to access this page.',
    [ErrorCode.AUTHENTICATION_REQUIRED]: 'Please sign in to continue.',
    
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to perform this action.',
    [ErrorCode.ROLE_NOT_FOUND]: 'The specified role could not be found.',
    [ErrorCode.PERMISSION_DENIED]: 'Access denied. You don\'t have the required permissions.',
    [ErrorCode.ORGANIZATION_ACCESS_DENIED]: 'You don\'t have access to this organization.',
    
    [ErrorCode.INVALID_EMAIL]: 'Please enter a valid email address.',
    [ErrorCode.REQUIRED_FIELD_MISSING]: 'Please fill in all required fields.',
    [ErrorCode.INVALID_SLUG]: 'Organization name contains invalid characters. Please use only letters, numbers, and hyphens.',
    [ErrorCode.PASSWORD_TOO_WEAK]: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.',
    [ErrorCode.INVALID_INPUT_FORMAT]: 'The information you entered is not in the correct format.',
    
    [ErrorCode.ORGANIZATION_NOT_FOUND]: 'The organization you\'re looking for doesn\'t exist or has been removed.',
    [ErrorCode.DUPLICATE_ORGANIZATION]: 'An organization with this name already exists. Please choose a different name.',
    [ErrorCode.MEMBERSHIP_LIMIT_EXCEEDED]: 'This organization has reached its member limit.',
    [ErrorCode.ORGANIZATION_CREATION_FAILED]: 'We couldn\'t create the organization. Please try again.',
    
    [ErrorCode.USER_NOT_FOUND]: 'User not found.',
    [ErrorCode.DUPLICATE_USER]: 'A user with this email already exists.',
    [ErrorCode.USER_CREATION_FAILED]: 'We couldn\'t create your account. Please try again.',
    
    [ErrorCode.DATABASE_ERROR]: 'We\'re experiencing technical difficulties. Please try again later.',
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'We\'re having trouble connecting to our services. Please try again later.',
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Something went wrong on our end. Please try again later.',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'You\'re making requests too quickly. Please wait a moment and try again.',
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
    return new InternalServerError(error.message, { originalError: error.name }, requestId);
  }

  if (typeof error === 'string') {
    return new InternalServerError(error, undefined, requestId);
  }

  return new InternalServerError('An unknown error occurred', { error }, requestId);
};

/**
 * Log error with appropriate level
 */
export const logError = (error: BaseError, context?: Record<string, any>) => {
  const logData = {
    ...error.toJSON(),
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