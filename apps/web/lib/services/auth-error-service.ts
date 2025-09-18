/**
 * Authentication Error Service
 * Central service for handling, logging, and recovering from authentication errors
 * Requirements: 10.1, 10.2, 10.5
 */

import { AuthenticationError, AuthErrorCode, AuthErrorContext, createAuthError } from '@/lib/errors/authentication-errors';
import { mapClerkError, isClerkError, ClerkAPIError } from '@/lib/errors/clerk-error-mapper';
import { AuthLogger, AuthEventType } from '@/lib/errors/auth-error-logger';

/**
 * Authentication error handling options
 */
export interface AuthErrorHandlingOptions {
  logError?: boolean;
  includeContext?: boolean;
  enableRecovery?: boolean;
  notifyUser?: boolean;
  trackMetrics?: boolean;
}

/**
 * Authentication error recovery result
 */
export interface AuthErrorRecoveryResult {
  success: boolean;
  error?: AuthenticationError;
  recoveryAction?: string;
  message?: string;
  nextStep?: string;
}

/**
 * Authentication error statistics
 */
export interface AuthErrorStats {
  totalErrors: number;
  errorsByType: Record<AuthErrorCode, number>;
  errorsByHour: Record<string, number>;
  topErrors: Array<{ code: AuthErrorCode; count: number; percentage: number }>;
  recoverySuccessRate: number;
  averageResolutionTime: number;
}

/**
 * Authentication Error Service Class
 */
export class AuthErrorService {
  private static instance: AuthErrorService;
  private errorHistory: Map<string, AuthenticationError[]> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();
  private recoverySuccesses: Map<string, number> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthErrorService {
    if (!AuthErrorService.instance) {
      AuthErrorService.instance = new AuthErrorService();
    }
    return AuthErrorService.instance;
  }

  /**
   * Handle any authentication error
   */
  public handleError(
    error: unknown,
    context: Partial<AuthErrorContext> = {},
    options: AuthErrorHandlingOptions = {}
  ): AuthenticationError {
    const {
      logError = true,
      includeContext = true,
      enableRecovery = true,
      notifyUser = false,
      trackMetrics = true
    } = options;

    let authError: AuthenticationError;

    // Convert to AuthenticationError
    if (error instanceof AuthenticationError) {
      authError = error;
    } else if (isClerkError(error)) {
      authError = mapClerkError(error as ClerkAPIError, context);
    } else if (error instanceof Error) {
      authError = this.createGenericAuthError(error, context);
    } else {
      authError = this.createUnknownAuthError(error, context);
    }

    // Add additional context if requested
    if (includeContext) {
      authError = this.enrichErrorContext(authError, context);
    }

    // Log the error
    if (logError) {
      this.logAuthError(authError);
    }

    // Track metrics
    if (trackMetrics) {
      this.trackErrorMetrics(authError);
    }

    // Store in history for analysis
    this.storeErrorInHistory(authError);

    return authError;
  }

  /**
   * Handle sign-in errors specifically
   */
  public handleSignInError(
    error: unknown,
    email?: string,
    context: Partial<AuthErrorContext> = {}
  ): AuthenticationError {
    const enrichedContext = {
      ...context,
      metadata: {
        email,
        action: 'sign-in',
        ...context.metadata
      }
    };

    const authError = this.handleError(error, enrichedContext);
    AuthLogger.logSignInFailure(authError, { email });
    
    return authError;
  }

  /**
   * Handle sign-up errors specifically
   */
  public handleSignUpError(
    error: unknown,
    email?: string,
    context: Partial<AuthErrorContext> = {}
  ): AuthenticationError {
    const enrichedContext = {
      ...context,
      metadata: {
        email,
        action: 'sign-up',
        ...context.metadata
      }
    };

    const authError = this.handleError(error, enrichedContext);
    AuthLogger.logSignUpFailure(authError, { email });
    
    return authError;
  }

  /**
   * Handle verification errors specifically
   */
  public handleVerificationError(
    error: unknown,
    verificationType: 'email' | 'phone' | 'totp' | 'sms',
    context: Partial<AuthErrorContext> = {}
  ): AuthenticationError {
    const enrichedContext = {
      ...context,
      metadata: {
        verificationType,
        action: 'verification',
        ...context.metadata
      }
    };

    const authError = this.handleError(error, enrichedContext);
    AuthLogger.logVerificationFailure(authError, { verificationType });
    
    return authError;
  }

  /**
   * Handle social authentication errors specifically
   */
  public handleSocialAuthError(
    error: unknown,
    provider: string,
    context: Partial<AuthErrorContext> = {}
  ): AuthenticationError {
    const enrichedContext = {
      ...context,
      metadata: {
        provider,
        action: 'social-auth',
        ...context.metadata
      }
    };

    const authError = this.handleError(error, enrichedContext);
    AuthLogger.logSocialAuthFailure(provider, authError);
    
    return authError;
  }

  /**
   * Attempt to recover from authentication error
   */
  public async attemptRecovery(
    error: AuthenticationError,
    recoveryAction: string,
    context: Partial<AuthErrorContext> = {}
  ): Promise<AuthErrorRecoveryResult> {
    const errorKey = this.getErrorKey(error);
    const currentAttempts = this.recoveryAttempts.get(errorKey) || 0;
    
    // Increment recovery attempts
    this.recoveryAttempts.set(errorKey, currentAttempts + 1);

    try {
      const result = await this.executeRecoveryAction(error, recoveryAction, context);
      
      if (result.success) {
        // Increment success count
        const currentSuccesses = this.recoverySuccesses.get(errorKey) || 0;
        this.recoverySuccesses.set(errorKey, currentSuccesses + 1);
        
        // Log successful recovery
        AuthLogger.logSignInSuccess({
          userId: error.context.userId,
          clerkUserId: error.context.clerkUserId,
          ...context
        }, {
          recoveryAction,
          originalError: error.authCode,
          attemptCount: currentAttempts + 1
        });
      }

      return result;
    } catch (recoveryError) {
      const recoveryAuthError = this.handleError(recoveryError, context, { logError: true });
      
      return {
        success: false,
        error: recoveryAuthError,
        recoveryAction,
        message: 'Recovery attempt failed'
      };
    }
  }

  /**
   * Get error recovery suggestions
   */
  public getRecoverySuggestions(error: AuthenticationError): string[] {
    const suggestions: string[] = [];

    switch (error.authCode) {
      case AuthErrorCode.INVALID_CREDENTIALS:
        suggestions.push(
          'Double-check your email and password',
          'Try using the "Forgot Password" option',
          'Ensure Caps Lock is not enabled',
          'Check for typos in your email address'
        );
        break;

      case AuthErrorCode.EMAIL_NOT_VERIFIED:
        suggestions.push(
          'Check your email inbox for a verification message',
          'Look in your spam or junk folder',
          'Request a new verification email',
          'Ensure you\'re using the correct email address'
        );
        break;

      case AuthErrorCode.ACCOUNT_LOCKED:
        suggestions.push(
          'Wait for the lockout period to expire',
          'Contact support for immediate assistance',
          'Check if you have any security notifications',
          'Review recent account activity'
        );
        break;

      case AuthErrorCode.TWO_FACTOR_REQUIRED:
        suggestions.push(
          'Open your authenticator app',
          'Use a backup code if available',
          'Ensure your device time is synchronized',
          'Contact support if you lost access to your 2FA device'
        );
        break;

      case AuthErrorCode.NETWORK_ERROR:
        suggestions.push(
          'Check your internet connection',
          'Try refreshing the page',
          'Disable VPN if you\'re using one',
          'Try using a different network'
        );
        break;

      case AuthErrorCode.SERVICE_UNAVAILABLE:
        suggestions.push(
          'Wait a few minutes and try again',
          'Check our status page for service updates',
          'Try using a different browser',
          'Clear your browser cache and cookies'
        );
        break;

      default:
        suggestions.push(
          'Try refreshing the page',
          'Clear your browser cache',
          'Try using a different browser',
          'Contact support if the problem persists'
        );
    }

    return suggestions;
  }

  /**
   * Get authentication error statistics
   */
  public getErrorStats(timeRangeHours: number = 24): AuthErrorStats {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentErrors: AuthenticationError[] = [];

    // Collect recent errors from history
    for (const errors of this.errorHistory.values()) {
      recentErrors.push(...errors.filter(error => error.timestamp >= cutoff));
    }

    // Calculate statistics
    const totalErrors = recentErrors.length;
    const errorsByType: Record<AuthErrorCode, number> = {} as any;
    const errorsByHour: Record<string, number> = {};

    recentErrors.forEach(error => {
      // Count by type
      errorsByType[error.authCode] = (errorsByType[error.authCode] || 0) + 1;
      
      // Count by hour
      const hour = error.timestamp.toISOString().slice(0, 13);
      errorsByHour[hour] = (errorsByHour[hour] || 0) + 1;
    });

    // Calculate top errors
    const topErrors = Object.entries(errorsByType)
      .map(([code, count]) => ({
        code: code as AuthErrorCode,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate recovery success rate
    const totalRecoveryAttempts = Array.from(this.recoveryAttempts.values()).reduce((sum, count) => sum + count, 0);
    const totalRecoverySuccesses = Array.from(this.recoverySuccesses.values()).reduce((sum, count) => sum + count, 0);
    const recoverySuccessRate = totalRecoveryAttempts > 0 ? (totalRecoverySuccesses / totalRecoveryAttempts) * 100 : 0;

    return {
      totalErrors,
      errorsByType,
      errorsByHour,
      topErrors,
      recoverySuccessRate,
      averageResolutionTime: 0 // Would need to track resolution times
    };
  }

  /**
   * Clear error history (for memory management)
   */
  public clearErrorHistory(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    for (const [key, errors] of this.errorHistory.entries()) {
      const recentErrors = errors.filter(error => error.timestamp >= cutoff);
      if (recentErrors.length > 0) {
        this.errorHistory.set(key, recentErrors);
      } else {
        this.errorHistory.delete(key);
      }
    }
  }

  /**
   * Create generic authentication error from regular Error
   */
  private createGenericAuthError(error: Error, context: Partial<AuthErrorContext>): AuthenticationError {
    let authCode = AuthErrorCode.AUTHENTICATION_FAILED;
    
    // Try to infer error type from message
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      authCode = AuthErrorCode.NETWORK_ERROR;
    } else if (message.includes('timeout')) {
      authCode = AuthErrorCode.SERVICE_UNAVAILABLE;
    } else if (message.includes('credential') || message.includes('password')) {
      authCode = AuthErrorCode.INVALID_CREDENTIALS;
    }

    return createAuthError(authCode, error.message, context, {
      originalError: error.name,
      stack: error.stack
    });
  }

  /**
   * Create authentication error for unknown error types
   */
  private createUnknownAuthError(error: unknown, context: Partial<AuthErrorContext>): AuthenticationError {
    return createAuthError(
      AuthErrorCode.AUTHENTICATION_FAILED,
      'An unknown authentication error occurred',
      context,
      { originalError: String(error) }
    );
  }

  /**
   * Enrich error context with additional information
   */
  private enrichErrorContext(error: AuthenticationError, additionalContext: Partial<AuthErrorContext>): AuthenticationError {
    const enrichedContext = {
      ...error.context,
      ...additionalContext,
      metadata: {
        ...error.context.metadata,
        ...additionalContext.metadata
      }
    };

    return new AuthenticationError(
      error.authCode,
      error.message,
      enrichedContext,
      error.recoveryActions,
      error.debugInfo,
      error.requestId
    );
  }

  /**
   * Log authentication error
   */
  private logAuthError(error: AuthenticationError): void {
    const eventType = this.getEventTypeFromError(error);
    AuthLogger.logSignInFailure(error, {
      service: 'AuthErrorService',
      errorCode: error.authCode
    });
  }

  /**
   * Track error metrics
   */
  private trackErrorMetrics(error: AuthenticationError): void {
    // This would integrate with your metrics/monitoring system
    // For now, we'll just log the metric
    console.info('Auth Error Metric:', {
      code: error.authCode,
      timestamp: error.timestamp,
      userId: error.context.userId,
      sessionId: error.context.sessionId
    });
  }

  /**
   * Store error in history for analysis
   */
  private storeErrorInHistory(error: AuthenticationError): void {
    const key = this.getErrorKey(error);
    const existing = this.errorHistory.get(key) || [];
    existing.push(error);
    
    // Keep only last 100 errors per key
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100);
    }
    
    this.errorHistory.set(key, existing);
  }

  /**
   * Execute recovery action
   */
  private async executeRecoveryAction(
    error: AuthenticationError,
    recoveryAction: string,
    context: Partial<AuthErrorContext>
  ): Promise<AuthErrorRecoveryResult> {
    // This would implement actual recovery logic
    // For now, we'll simulate recovery attempts
    
    switch (recoveryAction) {
      case 'retry':
        return {
          success: Math.random() > 0.3, // 70% success rate for demo
          recoveryAction,
          message: 'Retry attempt completed',
          nextStep: 'Please try signing in again'
        };
        
      case 'resend-verification':
        return {
          success: true,
          recoveryAction,
          message: 'Verification email sent',
          nextStep: 'Check your email for the verification link'
        };
        
      case 'resend-code':
        return {
          success: true,
          recoveryAction,
          message: 'New verification code sent',
          nextStep: 'Enter the new verification code'
        };
        
      default:
        return {
          success: false,
          recoveryAction,
          message: 'Recovery action not implemented'
        };
    }
  }

  /**
   * Get event type from error
   */
  private getEventTypeFromError(error: AuthenticationError): AuthEventType {
    const action = error.context.metadata?.action;
    
    switch (action) {
      case 'sign-in':
        return AuthEventType.SIGN_IN_FAILURE;
      case 'sign-up':
        return AuthEventType.SIGN_UP_FAILURE;
      case 'verification':
        return AuthEventType.VERIFICATION_FAILURE;
      case 'social-auth':
        return AuthEventType.SOCIAL_AUTH_FAILURE;
      default:
        return AuthEventType.SIGN_IN_FAILURE;
    }
  }

  /**
   * Get unique key for error tracking
   */
  private getErrorKey(error: AuthenticationError): string {
    return `${error.authCode}_${error.context.userId || 'anonymous'}_${error.context.ipAddress || 'unknown'}`;
  }
}

/**
 * Global authentication error service instance
 */
export const authErrorService = AuthErrorService.getInstance();

/**
 * Convenience functions for common error handling scenarios
 */
export const AuthErrorHandler = {
  handleSignInError: (error: unknown, email?: string, context?: Partial<AuthErrorContext>) =>
    authErrorService.handleSignInError(error, email, context),

  handleSignUpError: (error: unknown, email?: string, context?: Partial<AuthErrorContext>) =>
    authErrorService.handleSignUpError(error, email, context),

  handleVerificationError: (error: unknown, type: 'email' | 'phone' | 'totp' | 'sms', context?: Partial<AuthErrorContext>) =>
    authErrorService.handleVerificationError(error, type, context),

  handleSocialAuthError: (error: unknown, provider: string, context?: Partial<AuthErrorContext>) =>
    authErrorService.handleSocialAuthError(error, provider, context),

  attemptRecovery: (error: AuthenticationError, action: string, context?: Partial<AuthErrorContext>) =>
    authErrorService.attemptRecovery(error, action, context),

  getRecoverySuggestions: (error: AuthenticationError) =>
    authErrorService.getRecoverySuggestions(error),

  getErrorStats: (timeRangeHours?: number) =>
    authErrorService.getErrorStats(timeRangeHours)
};