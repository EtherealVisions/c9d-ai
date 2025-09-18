/**
 * Comprehensive tests for the authentication error handling system
 * Tests all components: AuthenticationError, Clerk mapping, logging, and service
 * Requirements: 10.1, 10.2, 10.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  AuthenticationError, 
  AuthErrorCode, 
  AuthErrorFactory,
  isAuthenticationError,
  createAuthError
} from '../authentication-errors';
import { 
  mapClerkError, 
  isClerkError, 
  handleClerkError,
  extractClerkFieldErrors,
  createSignInError,
  createSignUpError
} from '../clerk-error-mapper';
import { 
  AuthErrorLogger, 
  AuthEventType, 
  AuthLogLevel,
  authErrorLogger,
  AuthLogger
} from '../auth-error-logger';
import { 
  AuthErrorService,
  authErrorService,
  AuthErrorHandler
} from '../../services/auth-error-service';

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(console, mockConsole);
  
  // Clear shared state
  authErrorLogger.clearOldLogs(0); // Clear all logs
  authErrorService.clearErrorHistory(0); // Clear all error history
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthenticationError Class', () => {
  it('should create authentication error with all properties', () => {
    const context = {
      userId: 'user123',
      clerkUserId: 'clerk123',
      sessionId: 'session123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };

    const error = new AuthenticationError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Invalid credentials provided',
      context,
      [],
      { originalError: 'test' },
      'req123'
    );

    expect(error.authCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(error.message).toBe('Invalid credentials provided');
    expect(error.statusCode).toBe(401);
    expect(error.context.userId).toBe('user123');
    expect(error.context.clerkUserId).toBe('clerk123');
    expect(error.requestId).toBe('req123');
    expect(error.userFriendlyMessage).toContain('email or password');
    expect(error.recoveryActions).toHaveLength(3); // Default recovery actions
    expect(error.debugInfo.originalError).toBe('test');
  });

  it('should generate appropriate recovery actions for different error types', () => {
    const emailNotVerifiedError = new AuthenticationError(
      AuthErrorCode.EMAIL_NOT_VERIFIED,
      'Email not verified'
    );

    const accountLockedError = new AuthenticationError(
      AuthErrorCode.ACCOUNT_LOCKED,
      'Account locked'
    );

    const twoFactorError = new AuthenticationError(
      AuthErrorCode.TWO_FACTOR_REQUIRED,
      '2FA required'
    );

    expect(emailNotVerifiedError.recoveryActions[0].label).toBe('Resend Verification');
    expect(accountLockedError.recoveryActions[0].label).toBe('Contact Support');
    expect(twoFactorError.recoveryActions[0].label).toBe('Enter 2FA Code');
  });

  it('should provide user-friendly messages for all error codes', () => {
    const testCases = [
      { code: AuthErrorCode.INVALID_CREDENTIALS, expectedText: 'email or password' },
      { code: AuthErrorCode.EMAIL_NOT_VERIFIED, expectedText: 'verify your email' },
      { code: AuthErrorCode.ACCOUNT_LOCKED, expectedText: 'temporarily locked' },
      { code: AuthErrorCode.SESSION_EXPIRED, expectedText: 'session has expired' },
      { code: AuthErrorCode.TWO_FACTOR_REQUIRED, expectedText: 'Two-factor authentication' },
      { code: AuthErrorCode.NETWORK_ERROR, expectedText: 'Network connection' },
      { code: AuthErrorCode.SERVICE_UNAVAILABLE, expectedText: 'temporarily unavailable' }
    ];

    testCases.forEach(({ code, expectedText }) => {
      const error = new AuthenticationError(code, 'Test message');
      expect(error.userFriendlyMessage.toLowerCase()).toContain(expectedText.toLowerCase());
    });
  });

  it('should convert to JSON with all authentication-specific fields', () => {
    const error = new AuthenticationError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Test error',
      { userId: 'user123' },
      [],
      { debug: 'info' }
    );

    const json = error.toJSON();

    expect(json).toHaveProperty('authCode', AuthErrorCode.INVALID_CREDENTIALS);
    expect(json).toHaveProperty('context');
    expect(json).toHaveProperty('recoveryActions');
    expect(json).toHaveProperty('userFriendlyMessage');
    expect(json).toHaveProperty('debugInfo');
    expect(json.context.userId).toBe('user123');
  });

  it('should provide sanitized client JSON', () => {
    const error = new AuthenticationError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Test error',
      { userId: 'user123' },
      [],
      { sensitiveInfo: 'secret' }
    );

    const clientJson = error.toClientJSON();

    expect(clientJson).toHaveProperty('code');
    expect(clientJson).toHaveProperty('message');
    expect(clientJson).toHaveProperty('recoveryActions');
    expect(clientJson).toHaveProperty('requestId');
    expect(clientJson).toHaveProperty('timestamp');
    expect(clientJson).not.toHaveProperty('debugInfo');
    expect(clientJson).not.toHaveProperty('context');
  });
});

describe('AuthErrorFactory', () => {
  it('should create specific error types with factory methods', () => {
    const invalidCredentialsError = AuthErrorFactory.invalidCredentials();
    const emailNotVerifiedError = AuthErrorFactory.emailNotVerified('test@example.com');
    const accountLockedError = AuthErrorFactory.accountLocked('too many attempts');
    const sessionExpiredError = AuthErrorFactory.sessionExpired('session123');

    expect(invalidCredentialsError.authCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(emailNotVerifiedError.authCode).toBe(AuthErrorCode.EMAIL_NOT_VERIFIED);
    expect(emailNotVerifiedError.context.metadata?.email).toBe('test@example.com');
    expect(accountLockedError.authCode).toBe(AuthErrorCode.ACCOUNT_LOCKED);
    expect(accountLockedError.context.metadata?.lockReason).toBe('too many attempts');
    expect(sessionExpiredError.authCode).toBe(AuthErrorCode.SESSION_EXPIRED);
    expect(sessionExpiredError.context.sessionId).toBe('session123');
  });
});

describe('Clerk Error Mapping', () => {
  it('should identify Clerk errors correctly', () => {
    const clerkError = {
      errors: [{ code: 'form_password_incorrect', message: 'Password incorrect' }]
    };
    const regularError = new Error('Regular error');
    const clerkLikeError = { message: 'Clerk error occurred', clerkError: true };

    expect(isClerkError(clerkError)).toBe(true);
    expect(isClerkError(regularError)).toBe(false);
    expect(isClerkError(clerkLikeError)).toBe(true);
  });

  it('should map Clerk error codes to authentication error codes', () => {
    const testCases = [
      {
        clerkError: { errors: [{ code: 'form_password_incorrect', message: 'Wrong password' }] },
        expectedCode: AuthErrorCode.INVALID_CREDENTIALS
      },
      {
        clerkError: { errors: [{ code: 'form_identifier_exists', message: 'Email exists' }] },
        expectedCode: AuthErrorCode.EMAIL_ALREADY_EXISTS
      },
      {
        clerkError: { errors: [{ code: 'form_password_pwned', message: 'Password compromised' }] },
        expectedCode: AuthErrorCode.PASSWORD_COMPROMISED
      },
      {
        clerkError: { errors: [{ code: 'form_identifier_not_verified', message: 'Email not verified' }] },
        expectedCode: AuthErrorCode.EMAIL_NOT_VERIFIED
      },
      {
        clerkError: { errors: [{ code: 'user_locked', message: 'Account locked' }] },
        expectedCode: AuthErrorCode.ACCOUNT_LOCKED
      }
    ];

    testCases.forEach(({ clerkError, expectedCode }) => {
      const authError = mapClerkError(clerkError as any);
      expect(authError.authCode).toBe(expectedCode);
    });
  });

  it('should handle network and service errors', () => {
    const networkError = { message: 'Network error occurred', status: undefined };
    const serviceUnavailableError = { status: 503, errors: [] };
    const rateLimitError = { status: 429, errors: [] };

    const networkAuthError = mapClerkError(networkError as any);
    const serviceAuthError = mapClerkError(serviceUnavailableError as any);
    const rateLimitAuthError = mapClerkError(rateLimitError as any);

    expect(networkAuthError.authCode).toBe(AuthErrorCode.NETWORK_ERROR);
    expect(serviceAuthError.authCode).toBe(AuthErrorCode.SERVICE_UNAVAILABLE);
    expect(rateLimitAuthError.authCode).toBe(AuthErrorCode.RATE_LIMITED);
  });

  it('should extract field errors from Clerk validation errors', () => {
    const clerkError = {
      errors: [
        { code: 'form_password_incorrect', message: 'Password is wrong' },
        { code: 'form_identifier_not_found', message: 'Email not found' },
        { code: 'form_code_incorrect', message: 'Code is invalid' }
      ]
    };

    const fieldErrors = extractClerkFieldErrors(clerkError as any);

    expect(fieldErrors).toHaveProperty('password');
    expect(fieldErrors).toHaveProperty('email');
    expect(fieldErrors).toHaveProperty('code');
    expect(fieldErrors.password[0]).toContain('password you entered is incorrect');
    expect(fieldErrors.email[0]).toContain('No account found');
    expect(fieldErrors.code[0]).toContain('verification code is incorrect');
  });

  it('should create context-specific errors', () => {
    const clerkError = { errors: [{ code: 'form_password_incorrect', message: 'Wrong password' }] };
    
    const signInError = createSignInError(clerkError as any, 'test@example.com');
    const signUpError = createSignUpError(clerkError as any, 'test@example.com');

    expect(signInError.context.metadata?.email).toBe('test@example.com');
    expect(signInError.context.metadata?.action).toBe('sign-in');
    expect(signUpError.context.metadata?.action).toBe('sign-up');
  });
});

describe('Authentication Error Logger', () => {
  let logger: AuthErrorLogger;

  beforeEach(() => {
    logger = AuthErrorLogger.getInstance();
  });

  it('should log authentication errors with proper structure', () => {
    const error = new AuthenticationError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Test error',
      { userId: 'user123', ipAddress: '192.168.1.1' }
    );

    logger.logError(error, AuthEventType.SIGN_IN_FAILURE, { testMetadata: 'value' });

    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining('AUTH ERROR:'),
      expect.objectContaining({
        level: AuthLogLevel.ERROR,
        eventType: AuthEventType.SIGN_IN_FAILURE,
        userId: 'user123',
        ipAddress: '192.168.1.1'
      })
    );
  });

  it('should log successful authentication events', () => {
    const context = { userId: 'user123', sessionId: 'session123' };
    
    logger.logSuccess(AuthEventType.SIGN_IN_SUCCESS, context, { provider: 'email' });

    expect(mockConsole.info).toHaveBeenCalledWith(
      expect.stringContaining('AUTH INFO:'),
      expect.objectContaining({
        level: AuthLogLevel.INFO,
        eventType: AuthEventType.SIGN_IN_SUCCESS,
        userId: 'user123',
        sessionId: 'session123'
      })
    );
  });

  it('should determine appropriate log levels for different error types', () => {
    const criticalError = new AuthenticationError(AuthErrorCode.ACCOUNT_LOCKED, 'Account locked');
    const errorError = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid creds');
    const warnError = new AuthenticationError(AuthErrorCode.EMAIL_NOT_VERIFIED, 'Email not verified');

    logger.logError(criticalError, AuthEventType.ACCOUNT_LOCKED);
    logger.logError(errorError, AuthEventType.SIGN_IN_FAILURE);
    logger.logError(warnError, AuthEventType.VERIFICATION_FAILURE);

    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL:'),
      expect.any(Object)
    );
    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining('ERROR:'),
      expect.any(Object)
    );
    expect(mockConsole.warn).toHaveBeenCalledWith(
      expect.stringContaining('WARNING:'),
      expect.any(Object)
    );
  });

  it('should track authentication metrics', () => {
    const error1 = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Error 1');
    const error2 = new AuthenticationError(AuthErrorCode.ACCOUNT_LOCKED, 'Error 2');

    logger.logError(error1, AuthEventType.SIGN_IN_FAILURE);
    logger.logError(error2, AuthEventType.ACCOUNT_LOCKED);
    logger.logSuccess(AuthEventType.SIGN_IN_SUCCESS, { userId: 'user123' });

    const metrics = logger.getMetrics();

    expect(metrics.totalAttempts).toBe(3);
    expect(metrics.successfulAttempts).toBe(1);
    expect(metrics.failedAttempts).toBe(2);
    expect(metrics.accountLockouts).toBe(1);
  });

  it('should provide convenience logging functions', () => {
    const error = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Test error');
    const context = { userId: 'user123' };

    AuthLogger.logSignInAttempt(context);
    AuthLogger.logSignInSuccess(context);
    AuthLogger.logSignInFailure(error);
    AuthLogger.logSocialAuthFailure('google', error);

    expect(mockConsole.info).toHaveBeenCalledTimes(2); // attempt and success
    expect(mockConsole.error).toHaveBeenCalledTimes(2); // failure and social failure
  });
});

describe('Authentication Error Service', () => {
  let service: AuthErrorService;

  beforeEach(() => {
    service = AuthErrorService.getInstance();
  });

  it('should handle different types of errors', () => {
    const authError = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Auth error');
    const clerkError = { errors: [{ code: 'form_password_incorrect', message: 'Wrong password' }] };
    const regularError = new Error('Regular error');
    const unknownError = 'String error';

    const handledAuthError = service.handleError(authError);
    const handledClerkError = service.handleError(clerkError);
    const handledRegularError = service.handleError(regularError);
    const handledUnknownError = service.handleError(unknownError);

    expect(handledAuthError).toBeInstanceOf(AuthenticationError);
    expect(handledClerkError).toBeInstanceOf(AuthenticationError);
    expect(handledRegularError).toBeInstanceOf(AuthenticationError);
    expect(handledUnknownError).toBeInstanceOf(AuthenticationError);

    expect(handledAuthError.authCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(handledClerkError.authCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(handledRegularError.authCode).toBe(AuthErrorCode.AUTHENTICATION_FAILED);
    expect(handledUnknownError.authCode).toBe(AuthErrorCode.AUTHENTICATION_FAILED);
  });

  it('should handle context-specific errors', () => {
    const error = new Error('Test error');
    
    const signInError = service.handleSignInError(error, 'test@example.com');
    const signUpError = service.handleSignUpError(error, 'test@example.com');
    const verificationError = service.handleVerificationError(error, 'email');
    const socialError = service.handleSocialAuthError(error, 'google');

    expect(signInError.context.metadata?.action).toBe('sign-in');
    expect(signInError.context.metadata?.email).toBe('test@example.com');
    expect(signUpError.context.metadata?.action).toBe('sign-up');
    expect(verificationError.context.metadata?.verificationType).toBe('email');
    expect(socialError.context.metadata?.provider).toBe('google');
  });

  it('should provide recovery suggestions', () => {
    const invalidCredsError = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid creds');
    const emailNotVerifiedError = new AuthenticationError(AuthErrorCode.EMAIL_NOT_VERIFIED, 'Email not verified');
    const networkError = new AuthenticationError(AuthErrorCode.NETWORK_ERROR, 'Network error');

    const credsSuggestions = service.getRecoverySuggestions(invalidCredsError);
    const emailSuggestions = service.getRecoverySuggestions(emailNotVerifiedError);
    const networkSuggestions = service.getRecoverySuggestions(networkError);

    expect(credsSuggestions).toContain('Double-check your email and password');
    expect(credsSuggestions).toContain('Try using the "Forgot Password" option');
    
    expect(emailSuggestions).toContain('Check your email inbox for a verification message');
    expect(emailSuggestions).toContain('Look in your spam or junk folder');
    
    expect(networkSuggestions).toContain('Check your internet connection');
    expect(networkSuggestions).toContain('Try refreshing the page');
  });

  it('should attempt error recovery', async () => {
    const error = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid creds');
    
    const retryResult = await service.attemptRecovery(error, 'retry');
    const resendResult = await service.attemptRecovery(error, 'resend-verification');

    expect(retryResult).toHaveProperty('success');
    expect(retryResult).toHaveProperty('recoveryAction', 'retry');
    expect(retryResult).toHaveProperty('message');
    
    expect(resendResult.success).toBe(true);
    expect(resendResult.recoveryAction).toBe('resend-verification');
    expect(resendResult.message).toBe('Verification email sent');
  });

  it('should generate error statistics', () => {
    // Create some test errors
    const error1 = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Error 1');
    const error2 = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Error 2');
    const error3 = new AuthenticationError(AuthErrorCode.ACCOUNT_LOCKED, 'Error 3');

    service.handleError(error1);
    service.handleError(error2);
    service.handleError(error3);

    const stats = service.getErrorStats();

    expect(stats.totalErrors).toBe(3);
    expect(stats.errorsByType[AuthErrorCode.INVALID_CREDENTIALS]).toBe(2);
    expect(stats.errorsByType[AuthErrorCode.ACCOUNT_LOCKED]).toBe(1);
    expect(stats.topErrors).toHaveLength(2);
    expect(stats.topErrors[0].code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(stats.topErrors[0].count).toBe(2);
  });
});

describe('AuthErrorHandler Convenience Functions', () => {
  it('should provide convenient error handling functions', () => {
    const clerkError = { errors: [{ code: 'form_password_incorrect', message: 'Wrong password' }] };
    
    const signInError = AuthErrorHandler.handleSignInError(clerkError, 'test@example.com');
    const signUpError = AuthErrorHandler.handleSignUpError(clerkError, 'test@example.com');
    const verificationError = AuthErrorHandler.handleVerificationError(clerkError, 'email');
    const socialError = AuthErrorHandler.handleSocialAuthError(clerkError, 'google');

    expect(signInError).toBeInstanceOf(AuthenticationError);
    expect(signUpError).toBeInstanceOf(AuthenticationError);
    expect(verificationError).toBeInstanceOf(AuthenticationError);
    expect(socialError).toBeInstanceOf(AuthenticationError);

    expect(signInError.context.metadata?.action).toBe('sign-in');
    expect(signUpError.context.metadata?.action).toBe('sign-up');
    expect(verificationError.context.metadata?.verificationType).toBe('email');
    expect(socialError.context.metadata?.provider).toBe('google');
  });

  it('should provide error statistics and recovery suggestions', () => {
    const error = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid creds');
    
    const suggestions = AuthErrorHandler.getRecoverySuggestions(error);
    const stats = AuthErrorHandler.getErrorStats();

    expect(suggestions).toBeInstanceOf(Array);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(stats).toHaveProperty('totalErrors');
    expect(stats).toHaveProperty('errorsByType');
    expect(stats).toHaveProperty('topErrors');
  });
});

describe('Type Guards and Utilities', () => {
  it('should correctly identify authentication errors', () => {
    const authError = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Auth error');
    const regularError = new Error('Regular error');
    const customError = { message: 'Custom error' };

    expect(isAuthenticationError(authError)).toBe(true);
    expect(isAuthenticationError(regularError)).toBe(false);
    expect(isAuthenticationError(customError)).toBe(false);
  });

  it('should create authentication errors with helper function', () => {
    const error = createAuthError(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Test error',
      { userId: 'user123' },
      { debug: 'info' }
    );

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.authCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(error.message).toBe('Test error');
    expect(error.context.userId).toBe('user123');
    expect(error.debugInfo.debug).toBe('info');
  });
});

describe('Integration Tests', () => {
  it('should handle complete error flow from Clerk error to recovery', async () => {
    const clerkError = {
      errors: [{ 
        code: 'form_password_incorrect', 
        message: 'Password is incorrect',
        longMessage: 'The password you entered is incorrect. Please try again.'
      }]
    };

    // Handle the error
    const authError = AuthErrorHandler.handleSignInError(clerkError, 'test@example.com', {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    });

    // Verify error properties
    expect(authError.authCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(authError.userFriendlyMessage).toContain('email or password');
    expect(authError.context.metadata?.email).toBe('test@example.com');
    expect(authError.context.ipAddress).toBe('192.168.1.1');
    expect(authError.recoveryActions.length).toBeGreaterThan(0);

    // Get recovery suggestions
    const suggestions = AuthErrorHandler.getRecoverySuggestions(authError);
    expect(suggestions).toContain('Double-check your email and password');

    // Attempt recovery
    const recoveryResult = await AuthErrorHandler.attemptRecovery(authError, 'retry');
    expect(recoveryResult).toHaveProperty('success');
    expect(recoveryResult).toHaveProperty('recoveryAction', 'retry');

    // Verify logging occurred
    expect(mockConsole.error).toHaveBeenCalled();
  });

  it('should handle suspicious activity detection', () => {
    const context = { 
      userId: 'user123', 
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };

    // Simulate multiple failed attempts
    for (let i = 0; i < 6; i++) {
      const error = new AuthenticationError(
        AuthErrorCode.INVALID_CREDENTIALS,
        `Failed attempt ${i + 1}`,
        context
      );
      
      authErrorLogger.logError(error, AuthEventType.SIGN_IN_FAILURE);
    }

    // Should have logged suspicious activity
    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL:'),
      expect.objectContaining({
        eventType: AuthEventType.SUSPICIOUS_ACTIVITY,
        message: expect.stringContaining('rapid_failed_attempts')
      })
    );
  });

  it('should maintain error history and provide analytics', () => {
    const errors = [
      AuthErrorCode.INVALID_CREDENTIALS,
      AuthErrorCode.INVALID_CREDENTIALS,
      AuthErrorCode.EMAIL_NOT_VERIFIED,
      AuthErrorCode.ACCOUNT_LOCKED
    ];

    // Generate test errors
    errors.forEach((code, index) => {
      const error = new AuthenticationError(code, `Error ${index}`);
      authErrorService.handleError(error);
    });

    // Get statistics
    const stats = authErrorService.getErrorStats();
    
    expect(stats.totalErrors).toBe(4);
    expect(stats.errorsByType[AuthErrorCode.INVALID_CREDENTIALS]).toBe(2);
    expect(stats.errorsByType[AuthErrorCode.EMAIL_NOT_VERIFIED]).toBe(1);
    expect(stats.errorsByType[AuthErrorCode.ACCOUNT_LOCKED]).toBe(1);
    
    expect(stats.topErrors[0].code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(stats.topErrors[0].count).toBe(2);
    expect(stats.topErrors[0].percentage).toBe(50);
  });
});