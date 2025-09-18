/**
 * Clerk-specific error mapping and handling
 * Maps Clerk API errors to our authentication error system
 * Requirements: 10.1, 10.2, 10.5
 */

import { AuthenticationError, AuthErrorCode, AuthErrorContext } from './authentication-errors';

/**
 * Clerk error structure (based on Clerk API documentation)
 */
export interface ClerkError {
  code: string;
  message: string;
  longMessage?: string;
  meta?: Record<string, any>;
}

/**
 * Clerk API error response structure
 */
export interface ClerkAPIError extends Error {
  errors?: ClerkError[];
  status?: number;
  clerkError?: boolean;
}

/**
 * Map Clerk error codes to our authentication error codes
 */
const CLERK_ERROR_CODE_MAP: Record<string, AuthErrorCode> = {
  // Authentication errors
  'form_identifier_not_found': AuthErrorCode.INVALID_CREDENTIALS,
  'form_password_incorrect': AuthErrorCode.INVALID_CREDENTIALS,
  'form_identifier_exists': AuthErrorCode.EMAIL_ALREADY_EXISTS,
  'session_exists': AuthErrorCode.INVALID_SESSION,
  'session_token_invalid': AuthErrorCode.INVALID_SESSION,
  'session_token_expired': AuthErrorCode.SESSION_EXPIRED,
  
  // Password errors
  'form_password_pwned': AuthErrorCode.PASSWORD_COMPROMISED,
  'form_password_validation_failed': AuthErrorCode.WEAK_PASSWORD,
  'form_password_too_common': AuthErrorCode.WEAK_PASSWORD,
  'form_password_length_too_short': AuthErrorCode.WEAK_PASSWORD,
  
  // Email verification errors
  'form_identifier_not_verified': AuthErrorCode.EMAIL_NOT_VERIFIED,
  'verification_expired': AuthErrorCode.VERIFICATION_CODE_EXPIRED,
  'verification_failed': AuthErrorCode.VERIFICATION_FAILED,
  'form_code_incorrect': AuthErrorCode.VERIFICATION_CODE_INVALID,
  'form_code_expired': AuthErrorCode.VERIFICATION_CODE_EXPIRED,
  
  // Account state errors
  'user_locked': AuthErrorCode.ACCOUNT_LOCKED,
  'user_suspended': AuthErrorCode.ACCOUNT_SUSPENDED,
  'user_deleted': AuthErrorCode.ACCOUNT_DELETED,
  'too_many_requests': AuthErrorCode.TOO_MANY_ATTEMPTS,
  
  // Two-factor authentication errors
  'form_2fa_required': AuthErrorCode.TWO_FACTOR_REQUIRED,
  'form_2fa_invalid': AuthErrorCode.INVALID_TWO_FACTOR_CODE,
  'form_backup_code_invalid': AuthErrorCode.INVALID_TWO_FACTOR_CODE,
  'totp_invalid': AuthErrorCode.INVALID_TWO_FACTOR_CODE,
  'sms_code_invalid': AuthErrorCode.INVALID_TWO_FACTOR_CODE,
  
  // Social authentication errors
  'oauth_error': AuthErrorCode.SOCIAL_AUTH_FAILED,
  'oauth_access_denied': AuthErrorCode.SOCIAL_AUTH_FAILED,
  'external_account_not_found': AuthErrorCode.SOCIAL_ACCOUNT_NOT_LINKED,
  'external_account_exists': AuthErrorCode.SOCIAL_ACCOUNT_ALREADY_LINKED,
  
  // Rate limiting
  'rate_limit_exceeded': AuthErrorCode.RATE_LIMITED,
  'request_timeout': AuthErrorCode.NETWORK_ERROR,
  
  // Generic errors
  'authentication_invalid': AuthErrorCode.AUTHENTICATION_FAILED,
  'authorization_invalid': AuthErrorCode.AUTHENTICATION_FAILED,
  'clerk_js_error': AuthErrorCode.AUTHENTICATION_FAILED
};

/**
 * Map Clerk error messages to more user-friendly versions
 */
const CLERK_MESSAGE_MAP: Record<string, string> = {
  'form_identifier_not_found': 'No account found with this email address.',
  'form_password_incorrect': 'The password you entered is incorrect.',
  'form_identifier_exists': 'An account with this email already exists.',
  'form_password_pwned': 'This password has been compromised in a data breach. Please choose a different password.',
  'form_password_validation_failed': 'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.',
  'form_identifier_not_verified': 'Please verify your email address before signing in.',
  'verification_expired': 'The verification link has expired. Please request a new one.',
  'form_code_incorrect': 'The verification code is incorrect. Please try again.',
  'user_locked': 'Your account has been temporarily locked. Please contact support.',
  'too_many_requests': 'Too many attempts. Please wait before trying again.',
  'oauth_access_denied': 'Social sign-in was cancelled or denied.',
  'rate_limit_exceeded': 'Too many requests. Please wait a moment and try again.'
};

/**
 * Extract authentication context from Clerk error
 */
function extractAuthContext(clerkError: ClerkAPIError, additionalContext: Partial<AuthErrorContext> = {}): AuthErrorContext {
  const context: AuthErrorContext = {
    timestamp: new Date(),
    ...additionalContext
  };

  // Extract metadata from Clerk error
  if (clerkError.errors && clerkError.errors.length > 0) {
    const firstError = clerkError.errors[0];
    context.metadata = {
      clerkErrorCode: firstError.code,
      clerkMessage: firstError.message,
      clerkLongMessage: firstError.longMessage,
      clerkMeta: firstError.meta,
      ...context.metadata
    };
  }

  return context;
}

/**
 * Map Clerk error to AuthenticationError
 */
export function mapClerkError(
  error: ClerkAPIError | Error,
  context: Partial<AuthErrorContext> = {}
): AuthenticationError {
  // Handle non-Clerk errors
  if (!isClerkError(error)) {
    // Check for network errors in non-Clerk errors
    if (error.message?.includes('Network error') || error.message?.includes('fetch') || error.message?.includes('network')) {
      return new AuthenticationError(
        AuthErrorCode.NETWORK_ERROR,
        'Network connection error occurred',
        context,
        [],
        { originalError: error.message }
      );
    }
    
    return new AuthenticationError(
      AuthErrorCode.AUTHENTICATION_FAILED,
      error.message || 'Authentication failed',
      context,
      [],
      { originalError: error.name || 'Unknown' }
    );
  }

  const clerkError = error as ClerkAPIError;
  
  // Handle network/connection errors
  if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Network error')) {
    return new AuthenticationError(
      AuthErrorCode.NETWORK_ERROR,
      'Network connection error occurred',
      extractAuthContext(clerkError, context),
      [],
      { originalError: error.message }
    );
  }

  // Handle service unavailable
  if (clerkError.status === 503 || clerkError.status === 502) {
    return new AuthenticationError(
      AuthErrorCode.SERVICE_UNAVAILABLE,
      'Authentication service is temporarily unavailable',
      extractAuthContext(clerkError, context),
      [],
      { httpStatus: clerkError.status }
    );
  }

  // Handle rate limiting
  if (clerkError.status === 429) {
    return new AuthenticationError(
      AuthErrorCode.RATE_LIMITED,
      'Too many requests. Please wait and try again.',
      extractAuthContext(clerkError, context),
      [],
      { httpStatus: clerkError.status }
    );
  }

  // Handle Clerk-specific errors
  if (clerkError.errors && clerkError.errors.length > 0) {
    const firstError = clerkError.errors[0];
    const authCode = CLERK_ERROR_CODE_MAP[firstError.code] || AuthErrorCode.AUTHENTICATION_FAILED;
    const message = CLERK_MESSAGE_MAP[firstError.code] || firstError.longMessage || firstError.message;

    return new AuthenticationError(
      authCode,
      message,
      extractAuthContext(clerkError, context),
      [],
      {
        clerkErrorCode: firstError.code,
        clerkMessage: firstError.message,
        clerkLongMessage: firstError.longMessage,
        clerkMeta: firstError.meta
      }
    );
  }

  // Fallback for unknown Clerk errors
  return new AuthenticationError(
    AuthErrorCode.AUTHENTICATION_FAILED,
    clerkError.message || 'Authentication failed',
    extractAuthContext(clerkError, context),
    [],
    { originalError: clerkError.message }
  );
}

/**
 * Type guard to check if error is a Clerk error
 */
export function isClerkError(error: any): error is ClerkAPIError {
  return (
    error &&
    (error.clerkError === true ||
     (error.errors && Array.isArray(error.errors)) ||
     error.message?.includes('Clerk') ||
     error.name?.includes('Clerk'))
  );
}

/**
 * Handle Clerk authentication errors with logging
 */
export function handleClerkError(
  error: unknown,
  context: Partial<AuthErrorContext> = {},
  logError: boolean = true
): AuthenticationError {
  const authError = mapClerkError(error as ClerkAPIError, context);
  
  if (logError) {
    console.error('Clerk authentication error:', {
      authCode: authError.authCode,
      message: authError.message,
      context: authError.context,
      debugInfo: authError.debugInfo,
      originalError: error
    });
  }

  return authError;
}

/**
 * Extract field-specific errors from Clerk validation errors
 */
export function extractClerkFieldErrors(clerkError: ClerkAPIError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  if (!clerkError.errors) {
    return fieldErrors;
  }

  clerkError.errors.forEach(error => {
    const field = extractFieldFromClerkError(error.code);
    const message = CLERK_MESSAGE_MAP[error.code] || error.longMessage || error.message;
    
    if (field) {
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(message);
    } else {
      // If no specific field, add to general errors
      if (!fieldErrors.general) {
        fieldErrors.general = [];
      }
      fieldErrors.general.push(message);
    }
  });

  return fieldErrors;
}

/**
 * Extract field name from Clerk error code
 */
function extractFieldFromClerkError(errorCode: string): string | null {
  const fieldMap: Record<string, string> = {
    'form_identifier_not_found': 'email',
    'form_identifier_exists': 'email',
    'form_identifier_not_verified': 'email',
    'form_password_incorrect': 'password',
    'form_password_pwned': 'password',
    'form_password_validation_failed': 'password',
    'form_password_too_common': 'password',
    'form_password_length_too_short': 'password',
    'form_code_incorrect': 'code',
    'form_code_expired': 'code',
    'form_2fa_invalid': 'twoFactorCode',
    'form_backup_code_invalid': 'backupCode',
    'totp_invalid': 'totpCode',
    'sms_code_invalid': 'smsCode'
  };

  return fieldMap[errorCode] || null;
}

/**
 * Create authentication error from Clerk sign-in attempt
 */
export function createSignInError(
  clerkError: ClerkAPIError,
  email?: string,
  context: Partial<AuthErrorContext> = {}
): AuthenticationError {
  return handleClerkError(clerkError, {
    ...context,
    metadata: {
      email,
      action: 'sign-in',
      ...context.metadata
    }
  });
}

/**
 * Create authentication error from Clerk sign-up attempt
 */
export function createSignUpError(
  clerkError: ClerkAPIError,
  email?: string,
  context: Partial<AuthErrorContext> = {}
): AuthenticationError {
  return handleClerkError(clerkError, {
    ...context,
    metadata: {
      email,
      action: 'sign-up',
      ...context.metadata
    }
  });
}

/**
 * Create authentication error from Clerk verification attempt
 */
export function createVerificationError(
  clerkError: ClerkAPIError,
  verificationType: 'email' | 'phone' | 'totp' | 'sms',
  context: Partial<AuthErrorContext> = {}
): AuthenticationError {
  return handleClerkError(clerkError, {
    ...context,
    metadata: {
      verificationType,
      action: 'verification',
      ...context.metadata
    }
  });
}

/**
 * Create authentication error from Clerk social authentication attempt
 */
export function createSocialAuthError(
  clerkError: ClerkAPIError,
  provider: string,
  context: Partial<AuthErrorContext> = {}
): AuthenticationError {
  return handleClerkError(clerkError, {
    ...context,
    metadata: {
      provider,
      action: 'social-auth',
      ...context.metadata
    }
  });
}