/**
 * Authentication-specific error handling system
 * Implements comprehensive error mapping, user-friendly messages, and recovery actions
 * Requirements: 10.1, 10.2, 10.5
 */

import { BaseError, ErrorCode } from './custom-errors';

/**
 * Authentication-specific error codes
 */
export enum AuthErrorCode {
  // Credential errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  PASSWORD_COMPROMISED = 'PASSWORD_COMPROMISED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  
  // Account state errors
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  
  // Session errors
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_SESSION = 'INVALID_SESSION',
  SESSION_REQUIRED = 'SESSION_REQUIRED',
  
  // Token errors
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REQUIRED = 'TOKEN_REQUIRED',
  
  // Two-factor authentication errors
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  INVALID_TWO_FACTOR_CODE = 'INVALID_TWO_FACTOR_CODE',
  TWO_FACTOR_SETUP_REQUIRED = 'TWO_FACTOR_SETUP_REQUIRED',
  
  // Social authentication errors
  SOCIAL_AUTH_FAILED = 'SOCIAL_AUTH_FAILED',
  SOCIAL_ACCOUNT_NOT_LINKED = 'SOCIAL_ACCOUNT_NOT_LINKED',
  SOCIAL_ACCOUNT_ALREADY_LINKED = 'SOCIAL_ACCOUNT_ALREADY_LINKED',
  
  // Verification errors
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  VERIFICATION_CODE_EXPIRED = 'VERIFICATION_CODE_EXPIRED',
  VERIFICATION_CODE_INVALID = 'VERIFICATION_CODE_INVALID',
  VERIFICATION_ATTEMPTS_EXCEEDED = 'VERIFICATION_ATTEMPTS_EXCEEDED',
  
  // Network and service errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Generic authentication error
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED'
}

/**
 * Recovery action types for authentication errors
 */
export interface RecoveryAction {
  type: 'primary' | 'secondary' | 'tertiary';
  label: string;
  action: string; // URL or action identifier
  description?: string;
  icon?: string;
}

/**
 * Authentication error context for debugging
 */
export interface AuthErrorContext {
  userId?: string;
  clerkUserId?: string;
  organizationId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
  attemptCount?: number;
  lastAttempt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Enhanced authentication error class
 */
export class AuthenticationError extends BaseError {
  readonly statusCode = 401;
  public readonly authCode: AuthErrorCode;
  public readonly context: AuthErrorContext;
  public readonly recoveryActions: RecoveryAction[];
  public readonly userFriendlyMessage: string;
  public readonly debugInfo: Record<string, any>;

  constructor(
    authCode: AuthErrorCode,
    message: string,
    context: Partial<AuthErrorContext> = {},
    recoveryActions: RecoveryAction[] = [],
    debugInfo: Record<string, any> = {},
    requestId?: string
  ) {
    super(message, { authCode, context, debugInfo }, requestId);
    
    this.authCode = authCode;
    this.context = {
      timestamp: new Date(),
      ...context
    };
    this.recoveryActions = recoveryActions.length > 0 ? recoveryActions : this.getDefaultRecoveryActions(authCode);
    this.userFriendlyMessage = this.getUserFriendlyMessage(authCode, message);
    this.debugInfo = debugInfo;
  }

  get code(): ErrorCode {
    return this.authCode as any;
  }

  /**
   * Get user-friendly message for the error
   */
  private getUserFriendlyMessage(authCode: AuthErrorCode, originalMessage: string): string {
    const messageMap: Record<AuthErrorCode, string> = {
      [AuthErrorCode.INVALID_CREDENTIALS]: 'The email or password you entered is incorrect. Please check your credentials and try again.',
      [AuthErrorCode.WEAK_PASSWORD]: 'Your password is too weak. Please choose a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.',
      [AuthErrorCode.PASSWORD_COMPROMISED]: 'This password has been found in a data breach. Please choose a different password for your security.',
      [AuthErrorCode.EMAIL_NOT_VERIFIED]: 'Please verify your email address before signing in. Check your inbox for a verification email.',
      [AuthErrorCode.EMAIL_ALREADY_EXISTS]: 'An account with this email address already exists. Try signing in instead, or use a different email address.',
      
      [AuthErrorCode.ACCOUNT_LOCKED]: 'Your account has been temporarily locked for security reasons. Please contact support or try again later.',
      [AuthErrorCode.ACCOUNT_SUSPENDED]: 'Your account has been suspended. Please contact support for assistance.',
      [AuthErrorCode.ACCOUNT_DELETED]: 'This account has been deleted and cannot be accessed.',
      [AuthErrorCode.TOO_MANY_ATTEMPTS]: 'Too many failed attempts. Please wait a few minutes before trying again.',
      
      [AuthErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again to continue.',
      [AuthErrorCode.INVALID_SESSION]: 'Your session is invalid. Please sign in again.',
      [AuthErrorCode.SESSION_REQUIRED]: 'You need to be signed in to access this page.',
      
      [AuthErrorCode.INVALID_TOKEN]: 'The authentication token is invalid or has been tampered with.',
      [AuthErrorCode.TOKEN_EXPIRED]: 'Your authentication token has expired. Please sign in again.',
      [AuthErrorCode.TOKEN_REQUIRED]: 'An authentication token is required for this action.',
      
      [AuthErrorCode.TWO_FACTOR_REQUIRED]: 'Two-factor authentication is required. Please enter your verification code.',
      [AuthErrorCode.INVALID_TWO_FACTOR_CODE]: 'The two-factor authentication code is incorrect. Please try again.',
      [AuthErrorCode.TWO_FACTOR_SETUP_REQUIRED]: 'Two-factor authentication setup is required for your account.',
      
      [AuthErrorCode.SOCIAL_AUTH_FAILED]: 'Social authentication failed. Please try again or use a different sign-in method.',
      [AuthErrorCode.SOCIAL_ACCOUNT_NOT_LINKED]: 'This social account is not linked to your profile. Please link it first or sign in with a different method.',
      [AuthErrorCode.SOCIAL_ACCOUNT_ALREADY_LINKED]: 'This social account is already linked to another user account.',
      
      [AuthErrorCode.VERIFICATION_FAILED]: 'Email verification failed. Please check the verification link and try again.',
      [AuthErrorCode.VERIFICATION_CODE_EXPIRED]: 'The verification code has expired. Please request a new one.',
      [AuthErrorCode.VERIFICATION_CODE_INVALID]: 'The verification code is invalid. Please check and try again.',
      [AuthErrorCode.VERIFICATION_ATTEMPTS_EXCEEDED]: 'Too many verification attempts. Please request a new verification code.',
      
      [AuthErrorCode.NETWORK_ERROR]: 'Network connection error. Please check your internet connection and try again.',
      [AuthErrorCode.SERVICE_UNAVAILABLE]: 'Authentication service is temporarily unavailable. Please try again in a few minutes.',
      [AuthErrorCode.RATE_LIMITED]: 'You\'re making requests too quickly. Please wait a moment and try again.',
      
      [AuthErrorCode.AUTHENTICATION_FAILED]: 'Authentication failed. Please try again or contact support if the problem persists.'
    };

    return messageMap[authCode] || originalMessage;
  }

  /**
   * Get default recovery actions for the error
   */
  private getDefaultRecoveryActions(authCode: AuthErrorCode): RecoveryAction[] {
    const actionMap: Record<AuthErrorCode, RecoveryAction[]> = {
      [AuthErrorCode.INVALID_CREDENTIALS]: [
        { type: 'primary', label: 'Try Again', action: 'retry', icon: 'refresh' },
        { type: 'secondary', label: 'Forgot Password?', action: '/forgot-password', icon: 'key' },
        { type: 'tertiary', label: 'Create Account', action: '/sign-up', icon: 'user-plus' }
      ],
      [AuthErrorCode.EMAIL_NOT_VERIFIED]: [
        { type: 'primary', label: 'Resend Verification', action: 'resend-verification', icon: 'mail' },
        { type: 'secondary', label: 'Check Spam Folder', action: 'check-spam', description: 'The email might be in your spam folder', icon: 'alert-triangle' },
        { type: 'tertiary', label: 'Contact Support', action: '/support', icon: 'help-circle' }
      ],
      [AuthErrorCode.EMAIL_ALREADY_EXISTS]: [
        { type: 'primary', label: 'Sign In Instead', action: '/sign-in', icon: 'log-in' },
        { type: 'secondary', label: 'Forgot Password?', action: '/forgot-password', icon: 'key' },
        { type: 'tertiary', label: 'Use Different Email', action: 'retry', icon: 'mail' }
      ],
      [AuthErrorCode.ACCOUNT_LOCKED]: [
        { type: 'primary', label: 'Contact Support', action: '/support', icon: 'help-circle' },
        { type: 'secondary', label: 'Try Again Later', action: 'retry-later', description: 'Wait 15 minutes and try again', icon: 'clock' }
      ],
      [AuthErrorCode.SESSION_EXPIRED]: [
        { type: 'primary', label: 'Sign In Again', action: '/sign-in', icon: 'log-in' },
        { type: 'secondary', label: 'Go Home', action: '/', icon: 'home' }
      ],
      [AuthErrorCode.TWO_FACTOR_REQUIRED]: [
        { type: 'primary', label: 'Enter 2FA Code', action: 'show-2fa', icon: 'shield' },
        { type: 'secondary', label: 'Use Backup Code', action: 'use-backup-code', icon: 'key' },
        { type: 'tertiary', label: 'Get Help', action: '/support', icon: 'help-circle' }
      ],
      [AuthErrorCode.VERIFICATION_CODE_EXPIRED]: [
        { type: 'primary', label: 'Request New Code', action: 'resend-code', icon: 'refresh' },
        { type: 'secondary', label: 'Go Back', action: 'go-back', icon: 'arrow-left' }
      ],
      [AuthErrorCode.NETWORK_ERROR]: [
        { type: 'primary', label: 'Try Again', action: 'retry', icon: 'refresh' },
        { type: 'secondary', label: 'Check Connection', action: 'check-connection', description: 'Verify your internet connection', icon: 'wifi' }
      ],
      [AuthErrorCode.SERVICE_UNAVAILABLE]: [
        { type: 'primary', label: 'Try Again', action: 'retry', icon: 'refresh' },
        { type: 'secondary', label: 'Check Status', action: '/status', description: 'View service status page', icon: 'activity' },
        { type: 'tertiary', label: 'Contact Support', action: '/support', icon: 'help-circle' }
      ]
    };

    return actionMap[authCode] || [
      { type: 'primary', label: 'Try Again', action: 'retry', icon: 'refresh' },
      { type: 'secondary', label: 'Contact Support', action: '/support', icon: 'help-circle' }
    ];
  }

  /**
   * Convert to JSON with authentication-specific fields
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      authCode: this.authCode,
      context: this.context,
      recoveryActions: this.recoveryActions,
      userFriendlyMessage: this.userFriendlyMessage,
      debugInfo: this.debugInfo
    };
  }

  /**
   * Get sanitized version for client-side consumption
   */
  toClientJSON(): Record<string, any> {
    return {
      code: this.authCode,
      message: this.userFriendlyMessage,
      recoveryActions: this.recoveryActions,
      requestId: this.requestId,
      timestamp: this.timestamp.toISOString()
    };
  }
}

/**
 * Type guard for authentication errors
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Create authentication error with context
 */
export function createAuthError(
  code: AuthErrorCode,
  message: string,
  context: Partial<AuthErrorContext> = {},
  debugInfo: Record<string, any> = {}
): AuthenticationError {
  return new AuthenticationError(code, message, context, [], debugInfo);
}

/**
 * Authentication error factory functions for common scenarios
 */
export const AuthErrorFactory = {
  invalidCredentials: (context?: Partial<AuthErrorContext>) =>
    createAuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid credentials provided', context),

  emailNotVerified: (email: string, context?: Partial<AuthErrorContext>) =>
    createAuthError(AuthErrorCode.EMAIL_NOT_VERIFIED, 'Email verification required', {
      ...context,
      metadata: { email, ...context?.metadata }
    }),

  accountLocked: (reason: string, context?: Partial<AuthErrorContext>) =>
    createAuthError(AuthErrorCode.ACCOUNT_LOCKED, 'Account temporarily locked', {
      ...context,
      metadata: { lockReason: reason, ...context?.metadata }
    }),

  sessionExpired: (sessionId?: string, context?: Partial<AuthErrorContext>) =>
    createAuthError(AuthErrorCode.SESSION_EXPIRED, 'Session has expired', {
      ...context,
      sessionId,
      metadata: { sessionId, ...context?.metadata }
    }),

  twoFactorRequired: (context?: Partial<AuthErrorContext>) =>
    createAuthError(AuthErrorCode.TWO_FACTOR_REQUIRED, 'Two-factor authentication required', context),

  socialAuthFailed: (provider: string, reason: string, context?: Partial<AuthErrorContext>) =>
    createAuthError(AuthErrorCode.SOCIAL_AUTH_FAILED, `${provider} authentication failed`, {
      ...context,
      metadata: { provider, reason, ...context?.metadata }
    }),

  networkError: (context?: Partial<AuthErrorContext>) =>
    createAuthError(AuthErrorCode.NETWORK_ERROR, 'Network connection error', context),

  serviceUnavailable: (context?: Partial<AuthErrorContext>) =>
    createAuthError(AuthErrorCode.SERVICE_UNAVAILABLE, 'Authentication service unavailable', context),

  rateLimited: (retryAfter: number, context?: Partial<AuthErrorContext>) =>
    createAuthError(AuthErrorCode.RATE_LIMITED, 'Rate limit exceeded', {
      ...context,
      metadata: { retryAfter, ...context?.metadata }
    })
};