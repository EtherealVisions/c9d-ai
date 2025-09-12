import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAuthenticationError,
  createAuthorizationError,
  createValidationError,
  createNotFoundError,
  createConflictError,
  createInvalidCredentialsError,
  createTokenExpiredError,
  createUnauthorizedError,
  createInsufficientPermissionsError,
  createOrganizationNotFoundError,
  createUserNotFoundError,
  createDuplicateOrganizationError,
  createInvalidEmailError,
  createRequiredFieldError,
  isBaseError,
  isAuthenticationError,
  isAuthorizationError,
  isValidationError,
  isNotFoundError,
  isConflictError,
  getUserFriendlyMessage,
  normalizeError,
  logError,
} from '../error-utils';
import {
  ErrorCode,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '../custom-errors';

// Mock console methods
const mockConsoleError = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleInfo = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.console = {
    ...global.console,
    error: mockConsoleError,
    warn: mockConsoleWarn,
    info: mockConsoleInfo,
  };
});

describe('Error Utils', () => {
  const mockRequestId = 'test-request-id';

  describe('Error Factory Functions', () => {
    it('should create authentication error', () => {
      const error = createAuthenticationError(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
        { test: 'details' },
        mockRequestId
      );

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(error.message).toBe('Invalid credentials');
      expect(error.requestId).toBe(mockRequestId);
    });

    it('should create authorization error', () => {
      const error = createAuthorizationError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        'Insufficient permissions'
      );

      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_PERMISSIONS);
    });

    it('should create validation error with field errors', () => {
      const fieldErrors = { email: ['Invalid format'] };
      const error = createValidationError(
        ErrorCode.INVALID_INPUT_FORMAT,
        'Validation failed',
        fieldErrors
      );

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.fieldErrors).toEqual(fieldErrors);
    });

    it('should create not found error', () => {
      const error = createNotFoundError(
        ErrorCode.ORGANIZATION_NOT_FOUND,
        'Organization not found'
      );

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.code).toBe(ErrorCode.ORGANIZATION_NOT_FOUND);
    });

    it('should create conflict error', () => {
      const error = createConflictError(
        ErrorCode.DUPLICATE_ORGANIZATION,
        'Organization exists'
      );

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.code).toBe(ErrorCode.DUPLICATE_ORGANIZATION);
    });
  });

  describe('Common Error Factory Functions', () => {
    it('should create invalid credentials error', () => {
      const error = createInvalidCredentialsError(mockRequestId);
      
      expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(error.message).toBe('Invalid email or password provided');
      expect(error.requestId).toBe(mockRequestId);
    });

    it('should create token expired error', () => {
      const error = createTokenExpiredError();
      
      expect(error.code).toBe(ErrorCode.TOKEN_EXPIRED);
      expect(error.message).toBe('Authentication token has expired');
    });

    it('should create unauthorized error', () => {
      const error = createUnauthorizedError();
      
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED_ACCESS);
      expect(error.message).toBe('Authentication required to access this resource');
    });

    it('should create insufficient permissions error with resource and action', () => {
      const error = createInsufficientPermissionsError('organization', 'delete');
      
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_PERMISSIONS);
      expect(error.message).toBe('Insufficient permissions to delete organization');
      expect(error.details).toEqual({ resource: 'organization', action: 'delete' });
    });

    it('should create organization not found error', () => {
      const orgId = 'org-123';
      const error = createOrganizationNotFoundError(orgId);
      
      expect(error.code).toBe(ErrorCode.ORGANIZATION_NOT_FOUND);
      expect(error.message).toBe(`Organization with ID ${orgId} not found`);
      expect(error.details).toEqual({ organizationId: orgId });
    });

    it('should create user not found error', () => {
      const userId = 'user-123';
      const error = createUserNotFoundError(userId);
      
      expect(error.code).toBe(ErrorCode.USER_NOT_FOUND);
      expect(error.message).toBe(`User with ID ${userId} not found`);
      expect(error.details).toEqual({ userId });
    });

    it('should create duplicate organization error', () => {
      const name = 'Test Org';
      const error = createDuplicateOrganizationError(name);
      
      expect(error.code).toBe(ErrorCode.DUPLICATE_ORGANIZATION);
      expect(error.message).toBe(`Organization with name '${name}' already exists`);
      expect(error.details).toEqual({ organizationName: name });
    });

    it('should create invalid email error', () => {
      const email = 'invalid-email';
      const error = createInvalidEmailError(email);
      
      expect(error.code).toBe(ErrorCode.INVALID_EMAIL);
      expect(error.fieldErrors).toEqual({ email: ['Must be a valid email address'] });
      expect(error.details).toEqual({ providedEmail: email });
    });

    it('should create required field error', () => {
      const field = 'name';
      const error = createRequiredFieldError(field);
      
      expect(error.code).toBe(ErrorCode.REQUIRED_FIELD_MISSING);
      expect(error.fieldErrors).toEqual({ [field]: ['This field is required'] });
      expect(error.details).toEqual({ missingField: field });
    });
  });

  describe('Error Type Guards', () => {
    it('should identify BaseError instances', () => {
      const error = createInvalidCredentialsError();
      const regularError = new Error('Regular error');
      
      expect(isBaseError(error)).toBe(true);
      expect(isBaseError(regularError)).toBe(false);
      expect(isBaseError('string error')).toBe(false);
      expect(isBaseError(null)).toBe(false);
    });

    it('should identify AuthenticationError instances', () => {
      const authError = createInvalidCredentialsError();
      const authzError = createInsufficientPermissionsError();
      
      expect(isAuthenticationError(authError)).toBe(true);
      expect(isAuthenticationError(authzError)).toBe(false);
    });

    it('should identify AuthorizationError instances', () => {
      const authzError = createInsufficientPermissionsError();
      const authError = createInvalidCredentialsError();
      
      expect(isAuthorizationError(authzError)).toBe(true);
      expect(isAuthorizationError(authError)).toBe(false);
    });

    it('should identify ValidationError instances', () => {
      const validationError = createInvalidEmailError('test');
      const authError = createInvalidCredentialsError();
      
      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(authError)).toBe(false);
    });

    it('should identify NotFoundError instances', () => {
      const notFoundError = createOrganizationNotFoundError('123');
      const authError = createInvalidCredentialsError();
      
      expect(isNotFoundError(notFoundError)).toBe(true);
      expect(isNotFoundError(authError)).toBe(false);
    });

    it('should identify ConflictError instances', () => {
      const conflictError = createDuplicateOrganizationError('test');
      const authError = createInvalidCredentialsError();
      
      expect(isConflictError(conflictError)).toBe(true);
      expect(isConflictError(authError)).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for known error codes', () => {
      const error = createInvalidCredentialsError();
      const message = getUserFriendlyMessage(error);
      
      expect(message).toBe('The email or password you entered is incorrect. Please try again.');
    });

    it('should return original message for unknown error codes', () => {
      const error = new InternalServerError('Custom error message');
      const message = getUserFriendlyMessage(error);
      
      expect(message).toBe('Something went wrong on our end. Please try again later.');
    });
  });

  describe('normalizeError', () => {
    it('should return BaseError as-is', () => {
      const error = createInvalidCredentialsError();
      const normalized = normalizeError(error);
      
      expect(normalized).toBe(error);
    });

    it('should convert regular Error to InternalServerError', () => {
      const error = new Error('Regular error');
      const normalized = normalizeError(error, mockRequestId);
      
      expect(normalized).toBeInstanceOf(InternalServerError);
      expect(normalized.message).toBe('Regular error');
      expect(normalized.requestId).toBe(mockRequestId);
      expect(normalized.details).toEqual({ originalError: 'Error' });
    });

    it('should convert string to InternalServerError', () => {
      const error = 'String error';
      const normalized = normalizeError(error, mockRequestId);
      
      expect(normalized).toBeInstanceOf(InternalServerError);
      expect(normalized.message).toBe('String error');
      expect(normalized.requestId).toBe(mockRequestId);
    });

    it('should convert unknown error to InternalServerError', () => {
      const error = { unknown: 'error' };
      const normalized = normalizeError(error, mockRequestId);
      
      expect(normalized).toBeInstanceOf(InternalServerError);
      expect(normalized.message).toBe('An unknown error occurred');
      expect(normalized.details).toEqual({ error });
    });
  });

  describe('logError', () => {
    it('should log server errors with console.error', () => {
      const error = new InternalServerError('Server error');
      const context = { userId: '123' };
      
      logError(error, context);
      
      expect(mockConsoleError).toHaveBeenCalledWith('Server Error:', {
        ...error.toJSON(),
        context,
      });
    });

    it('should log client errors with console.warn', () => {
      const error = createInvalidCredentialsError();
      
      logError(error);
      
      expect(mockConsoleWarn).toHaveBeenCalledWith('Client Error:', {
        ...error.toJSON(),
        context: undefined,
      });
    });

    it('should log other errors with console.info', () => {
      // Create a custom error with status code < 400
      const error = new (class extends InternalServerError {
        readonly statusCode = 200;
      })('Info error');
      
      logError(error);
      
      expect(mockConsoleInfo).toHaveBeenCalledWith('Error:', {
        ...error.toJSON(),
        context: undefined,
      });
    });
  });
});