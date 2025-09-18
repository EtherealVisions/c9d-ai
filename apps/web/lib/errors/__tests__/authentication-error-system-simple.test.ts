/**
 * Simplified tests for the authentication error handling system
 * Focuses on core functionality without shared state issues
 * Requirements: 10.1, 10.2, 10.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  AuthenticationError, 
  AuthErrorCode, 
  AuthErrorFactory,
  isAuthenticationError
} from '../authentication-errors';
import { 
  mapClerkError, 
  isClerkError, 
  extractClerkFieldErrors
} from '../clerk-error-mapper';

describe('Authentication Error System - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthenticationError Class', () => {
    it('should create authentication error with correct properties', () => {
      const error = new AuthenticationError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials provided',
        { userId: 'user123' }
      );

      expect(error.authCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      expect(error.statusCode).toBe(401);
      expect(error.userFriendlyMessage).toContain('email or password');
      expect(error.recoveryActions.length).toBeGreaterThan(0);
      expect(error.context.userId).toBe('user123');
    });

    it('should provide appropriate recovery actions', () => {
      const emailError = new AuthenticationError(AuthErrorCode.EMAIL_NOT_VERIFIED, 'Email not verified');
      const lockedError = new AuthenticationError(AuthErrorCode.ACCOUNT_LOCKED, 'Account locked');

      expect(emailError.recoveryActions[0].label).toBe('Resend Verification');
      expect(lockedError.recoveryActions[0].label).toBe('Contact Support');
    });

    it('should convert to client-safe JSON', () => {
      const error = new AuthenticationError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Test error',
        { userId: 'user123' },
        [],
        { sensitiveData: 'secret' }
      );

      const clientJson = error.toClientJSON();

      expect(clientJson).toHaveProperty('code');
      expect(clientJson).toHaveProperty('message');
      expect(clientJson).toHaveProperty('recoveryActions');
      expect(clientJson).not.toHaveProperty('debugInfo');
      expect(clientJson).not.toHaveProperty('context');
    });
  });

  describe('AuthErrorFactory', () => {
    it('should create specific error types', () => {
      const invalidCredsError = AuthErrorFactory.invalidCredentials();
      const emailError = AuthErrorFactory.emailNotVerified('test@example.com');
      const lockedError = AuthErrorFactory.accountLocked('too many attempts');

      expect(invalidCredsError.authCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      expect(emailError.authCode).toBe(AuthErrorCode.EMAIL_NOT_VERIFIED);
      expect(emailError.context.metadata?.email).toBe('test@example.com');
      expect(lockedError.context.metadata?.lockReason).toBe('too many attempts');
    });
  });

  describe('Clerk Error Mapping', () => {
    it('should identify Clerk errors', () => {
      const clerkError = { errors: [{ code: 'form_password_incorrect', message: 'Wrong password' }] };
      const regularError = new Error('Regular error');

      expect(isClerkError(clerkError)).toBe(true);
      expect(isClerkError(regularError)).toBe(false);
    });

    it('should map Clerk error codes correctly', () => {
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
        }
      ];

      testCases.forEach(({ clerkError, expectedCode }) => {
        const authError = mapClerkError(clerkError as any);
        expect(authError.authCode).toBe(expectedCode);
      });
    });

    it('should handle network errors', () => {
      const networkError = { message: 'Network error occurred' };
      const authError = mapClerkError(networkError as any);
      expect(authError.authCode).toBe(AuthErrorCode.NETWORK_ERROR);
    });

    it('should handle service errors', () => {
      const serviceError = { status: 503, errors: [] };
      const rateLimitError = { status: 429, errors: [] };

      const serviceAuthError = mapClerkError(serviceError as any);
      const rateLimitAuthError = mapClerkError(rateLimitError as any);

      expect(serviceAuthError.authCode).toBe(AuthErrorCode.SERVICE_UNAVAILABLE);
      expect(rateLimitAuthError.authCode).toBe(AuthErrorCode.RATE_LIMITED);
    });

    it('should extract field errors', () => {
      const clerkError = {
        errors: [
          { code: 'form_password_incorrect', message: 'Password is wrong' },
          { code: 'form_identifier_not_found', message: 'Email not found' }
        ]
      };

      const fieldErrors = extractClerkFieldErrors(clerkError as any);

      expect(fieldErrors).toHaveProperty('password');
      expect(fieldErrors).toHaveProperty('email');
      expect(fieldErrors.password.length).toBeGreaterThan(0);
      expect(fieldErrors.email.length).toBeGreaterThan(0);
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify authentication errors', () => {
      const authError = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Auth error');
      const regularError = new Error('Regular error');

      expect(isAuthenticationError(authError)).toBe(true);
      expect(isAuthenticationError(regularError)).toBe(false);
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide appropriate messages for all error codes', () => {
      const testCases = [
        { code: AuthErrorCode.INVALID_CREDENTIALS, expectedText: 'email or password' },
        { code: AuthErrorCode.EMAIL_NOT_VERIFIED, expectedText: 'verify your email' },
        { code: AuthErrorCode.ACCOUNT_LOCKED, expectedText: 'temporarily locked' },
        { code: AuthErrorCode.SESSION_EXPIRED, expectedText: 'session has expired' },
        { code: AuthErrorCode.TWO_FACTOR_REQUIRED, expectedText: 'Two-factor authentication' },
        { code: AuthErrorCode.NETWORK_ERROR, expectedText: 'Network connection' }
      ];

      testCases.forEach(({ code, expectedText }) => {
        const error = new AuthenticationError(code, 'Test message');
        expect(error.userFriendlyMessage.toLowerCase()).toContain(expectedText.toLowerCase());
      });
    });
  });

  describe('Recovery Actions', () => {
    it('should provide contextual recovery actions', () => {
      const invalidCredsError = new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid creds');
      const emailError = new AuthenticationError(AuthErrorCode.EMAIL_NOT_VERIFIED, 'Email not verified');
      const twoFactorError = new AuthenticationError(AuthErrorCode.TWO_FACTOR_REQUIRED, '2FA required');

      expect(invalidCredsError.recoveryActions.some(action => action.label.includes('Try Again'))).toBe(true);
      expect(invalidCredsError.recoveryActions.some(action => action.label.includes('Forgot Password'))).toBe(true);

      expect(emailError.recoveryActions.some(action => action.label.includes('Resend Verification'))).toBe(true);
      expect(emailError.recoveryActions.some(action => action.label.includes('Check Spam'))).toBe(true);

      expect(twoFactorError.recoveryActions.some(action => action.label.includes('Enter 2FA Code'))).toBe(true);
      expect(twoFactorError.recoveryActions.some(action => action.label.includes('Use Backup Code'))).toBe(true);
    });
  });

  describe('Error Context', () => {
    it('should preserve error context information', () => {
      const context = {
        userId: 'user123',
        clerkUserId: 'clerk123',
        sessionId: 'session123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { action: 'sign-in', email: 'test@example.com' }
      };

      const error = new AuthenticationError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Test error',
        context
      );

      expect(error.context.userId).toBe('user123');
      expect(error.context.clerkUserId).toBe('clerk123');
      expect(error.context.sessionId).toBe('session123');
      expect(error.context.ipAddress).toBe('192.168.1.1');
      expect(error.context.userAgent).toBe('Mozilla/5.0');
      expect(error.context.metadata?.action).toBe('sign-in');
      expect(error.context.metadata?.email).toBe('test@example.com');
    });
  });

  describe('Debug Information', () => {
    it('should include debug information for troubleshooting', () => {
      const debugInfo = {
        clerkErrorCode: 'form_password_incorrect',
        originalError: 'ClerkAPIError',
        stack: 'Error stack trace'
      };

      const error = new AuthenticationError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Test error',
        {},
        [],
        debugInfo
      );

      expect(error.debugInfo.clerkErrorCode).toBe('form_password_incorrect');
      expect(error.debugInfo.originalError).toBe('ClerkAPIError');
      expect(error.debugInfo.stack).toBe('Error stack trace');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize to JSON with all fields', () => {
      const error = new AuthenticationError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Test error',
        { userId: 'user123' },
        [],
        { debug: 'info' }
      );

      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'AuthenticationError');
      expect(json).toHaveProperty('authCode', AuthErrorCode.INVALID_CREDENTIALS);
      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('statusCode', 401);
      expect(json).toHaveProperty('context');
      expect(json).toHaveProperty('recoveryActions');
      expect(json).toHaveProperty('userFriendlyMessage');
      expect(json).toHaveProperty('debugInfo');
      expect(json).toHaveProperty('timestamp');
    });
  });
});