/**
 * Authentication error logging and debugging support
 * Provides comprehensive logging, monitoring, and debugging capabilities
 * Requirements: 10.1, 10.2, 10.5
 */

import { AuthenticationError, AuthErrorContext } from './authentication-errors';

/**
 * Log levels for authentication errors
 */
export enum AuthLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Authentication event types for logging
 */
export enum AuthEventType {
  SIGN_IN_ATTEMPT = 'sign_in_attempt',
  SIGN_IN_SUCCESS = 'sign_in_success',
  SIGN_IN_FAILURE = 'sign_in_failure',
  SIGN_UP_ATTEMPT = 'sign_up_attempt',
  SIGN_UP_SUCCESS = 'sign_up_success',
  SIGN_UP_FAILURE = 'sign_up_failure',
  VERIFICATION_ATTEMPT = 'verification_attempt',
  VERIFICATION_SUCCESS = 'verification_success',
  VERIFICATION_FAILURE = 'verification_failure',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  PASSWORD_RESET_FAILURE = 'password_reset_failure',
  TWO_FACTOR_ATTEMPT = 'two_factor_attempt',
  TWO_FACTOR_SUCCESS = 'two_factor_success',
  TWO_FACTOR_FAILURE = 'two_factor_failure',
  SOCIAL_AUTH_ATTEMPT = 'social_auth_attempt',
  SOCIAL_AUTH_SUCCESS = 'social_auth_success',
  SOCIAL_AUTH_FAILURE = 'social_auth_failure',
  SESSION_EXPIRED = 'session_expired',
  ACCOUNT_LOCKED = 'account_locked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'
}

/**
 * Authentication log entry structure
 */
export interface AuthLogEntry {
  id: string;
  timestamp: Date;
  level: AuthLogLevel;
  eventType: AuthEventType;
  message: string;
  context: AuthErrorContext;
  error?: AuthenticationError;
  metadata: Record<string, any>;
  environment: string;
  version: string;
  requestId?: string;
  sessionId?: string;
  userId?: string;
  clerkUserId?: string;
  organizationId?: string;
  userAgent?: string;
  ipAddress?: string;
  fingerprint?: string;
}

/**
 * Authentication metrics for monitoring
 */
export interface AuthMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  errorsByType: Record<string, number>;
  averageResponseTime: number;
  peakAttempts: number;
  suspiciousActivities: number;
  accountLockouts: number;
  rateLimitHits: number;
}

/**
 * Authentication error logger class
 */
export class AuthErrorLogger {
  private static instance: AuthErrorLogger;
  private logs: AuthLogEntry[] = [];
  private metrics: AuthMetrics = {
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    errorsByType: {},
    averageResponseTime: 0,
    peakAttempts: 0,
    suspiciousActivities: 0,
    accountLockouts: 0,
    rateLimitHits: 0
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthErrorLogger {
    if (!AuthErrorLogger.instance) {
      AuthErrorLogger.instance = new AuthErrorLogger();
    }
    return AuthErrorLogger.instance;
  }

  /**
   * Generate unique log entry ID
   */
  private generateLogId(): string {
    return `auth_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current environment
   */
  private getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Get application version
   */
  private getVersion(): string {
    return process.env.npm_package_version || '1.0.0';
  }

  /**
   * Extract request information from context
   */
  private extractRequestInfo(context: AuthErrorContext): {
    userAgent?: string;
    ipAddress?: string;
    fingerprint?: string;
  } {
    return {
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      fingerprint: context.metadata?.fingerprint
    };
  }

  /**
   * Log authentication error
   */
  public logError(
    error: AuthenticationError,
    eventType: AuthEventType,
    additionalMetadata: Record<string, any> = {}
  ): void {
    const requestInfo = this.extractRequestInfo(error.context);
    
    const logEntry: AuthLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: this.getLogLevel(error),
      eventType,
      message: error.userFriendlyMessage,
      context: error.context,
      error,
      metadata: {
        ...error.debugInfo,
        ...additionalMetadata,
        authCode: error.authCode,
        recoveryActions: error.recoveryActions.map(action => action.type)
      },
      environment: this.getEnvironment(),
      version: this.getVersion(),
      requestId: error.requestId,
      sessionId: error.context.sessionId,
      userId: error.context.userId,
      clerkUserId: error.context.clerkUserId,
      organizationId: error.context.organizationId,
      ...requestInfo
    };

    this.logs.push(logEntry);
    this.updateMetrics(error, eventType);
    this.outputLog(logEntry);
    this.checkForSuspiciousActivity(logEntry);
  }

  /**
   * Log successful authentication event
   */
  public logSuccess(
    eventType: AuthEventType,
    context: Partial<AuthErrorContext>,
    metadata: Record<string, any> = {}
  ): void {
    const logEntry: AuthLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: AuthLogLevel.INFO,
      eventType,
      message: `Authentication event: ${eventType}`,
      context: { timestamp: new Date(), ...context },
      metadata,
      environment: this.getEnvironment(),
      version: this.getVersion(),
      userId: context.userId,
      clerkUserId: context.clerkUserId,
      organizationId: context.organizationId,
      sessionId: context.sessionId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress
    };

    this.logs.push(logEntry);
    this.metrics.totalAttempts++;
    this.metrics.successfulAttempts++;
    this.outputLog(logEntry);
  }

  /**
   * Determine log level based on error type
   */
  private getLogLevel(error: AuthenticationError): AuthLogLevel {
    switch (error.authCode) {
      case 'ACCOUNT_LOCKED':
      case 'ACCOUNT_SUSPENDED':
      case 'TOO_MANY_ATTEMPTS':
        return AuthLogLevel.CRITICAL;
      
      case 'INVALID_CREDENTIALS':
      case 'AUTHENTICATION_FAILED':
      case 'SESSION_EXPIRED':
        return AuthLogLevel.ERROR;
      
      case 'EMAIL_NOT_VERIFIED':
      case 'TWO_FACTOR_REQUIRED':
      case 'VERIFICATION_CODE_INVALID':
        return AuthLogLevel.WARN;
      
      case 'NETWORK_ERROR':
      case 'SERVICE_UNAVAILABLE':
        return AuthLogLevel.ERROR;
      
      default:
        return AuthLogLevel.INFO;
    }
  }

  /**
   * Update authentication metrics
   */
  private updateMetrics(error: AuthenticationError, eventType: AuthEventType): void {
    this.metrics.totalAttempts++;
    this.metrics.failedAttempts++;
    
    // Update error type counts
    const errorType = error.authCode;
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
    
    // Track specific events
    switch (error.authCode) {
      case 'ACCOUNT_LOCKED':
        this.metrics.accountLockouts++;
        break;
      case 'RATE_LIMITED':
        this.metrics.rateLimitHits++;
        break;
      case 'TOO_MANY_ATTEMPTS':
        this.metrics.suspiciousActivities++;
        break;
    }
  }

  /**
   * Output log entry to appropriate destination
   */
  private outputLog(logEntry: AuthLogEntry): void {
    const logData = {
      id: logEntry.id,
      timestamp: logEntry.timestamp.toISOString(),
      level: logEntry.level,
      eventType: logEntry.eventType,
      message: logEntry.message,
      userId: logEntry.userId,
      clerkUserId: logEntry.clerkUserId,
      organizationId: logEntry.organizationId,
      sessionId: logEntry.sessionId,
      requestId: logEntry.requestId,
      ipAddress: logEntry.ipAddress,
      userAgent: logEntry.userAgent,
      metadata: logEntry.metadata,
      environment: logEntry.environment
    };

    // Console output with appropriate level
    switch (logEntry.level) {
      case AuthLogLevel.DEBUG:
        console.debug('🔍 AUTH DEBUG:', logData);
        break;
      case AuthLogLevel.INFO:
        console.info('ℹ️ AUTH INFO:', logData);
        break;
      case AuthLogLevel.WARN:
        console.warn('⚠️ AUTH WARNING:', logData);
        break;
      case AuthLogLevel.ERROR:
        console.error('❌ AUTH ERROR:', logData);
        break;
      case AuthLogLevel.CRITICAL:
        console.error('🚨 AUTH CRITICAL:', logData);
        break;
    }

    // In production, you would send to external logging service
    if (this.getEnvironment() === 'production') {
      this.sendToExternalLogger(logEntry);
    }
  }

  /**
   * Send log entry to external logging service
   */
  private sendToExternalLogger(logEntry: AuthLogEntry): void {
    // Implementation would depend on your logging service (e.g., DataDog, Sentry, etc.)
    // For now, we'll just prepare the data structure
    const externalLogData = {
      ...logEntry,
      timestamp: logEntry.timestamp.toISOString(),
      service: 'c9d-auth',
      tags: [
        `environment:${logEntry.environment}`,
        `level:${logEntry.level}`,
        `event_type:${logEntry.eventType}`,
        `auth_code:${logEntry.error?.authCode || 'success'}`
      ]
    };

    // Example: Send to external service
    // await fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(externalLogData)
    // });
  }

  /**
   * Check for suspicious activity patterns
   */
  private checkForSuspiciousActivity(logEntry: AuthLogEntry): void {
    const recentLogs = this.getRecentLogs(5 * 60 * 1000); // Last 5 minutes
    const userLogs = recentLogs.filter(log => 
      log.ipAddress === logEntry.ipAddress || 
      log.userId === logEntry.userId
    );

    // Check for rapid failed attempts
    const failedAttempts = userLogs.filter(log => 
      log.level === AuthLogLevel.ERROR || log.level === AuthLogLevel.CRITICAL
    );

    if (failedAttempts.length >= 5) {
      this.logSuspiciousActivity('rapid_failed_attempts', logEntry, {
        attemptCount: failedAttempts.length,
        timeWindow: '5_minutes'
      });
    }

    // Check for multiple IP addresses for same user
    if (logEntry.userId) {
      const userIPs = new Set(
        userLogs
          .filter(log => log.userId === logEntry.userId)
          .map(log => log.ipAddress)
          .filter(Boolean)
      );

      if (userIPs.size > 3) {
        this.logSuspiciousActivity('multiple_ip_addresses', logEntry, {
          ipCount: userIPs.size,
          ips: Array.from(userIPs)
        });
      }
    }
  }

  /**
   * Log suspicious activity
   */
  private logSuspiciousActivity(
    activityType: string,
    originalLog: AuthLogEntry,
    details: Record<string, any>
  ): void {
    const suspiciousLogEntry: AuthLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: AuthLogLevel.CRITICAL,
      eventType: AuthEventType.SUSPICIOUS_ACTIVITY,
      message: `Suspicious activity detected: ${activityType}`,
      context: originalLog.context,
      metadata: {
        activityType,
        originalLogId: originalLog.id,
        ...details
      },
      environment: this.getEnvironment(),
      version: this.getVersion(),
      userId: originalLog.userId,
      clerkUserId: originalLog.clerkUserId,
      ipAddress: originalLog.ipAddress,
      userAgent: originalLog.userAgent
    };

    this.logs.push(suspiciousLogEntry);
    this.metrics.suspiciousActivities++;
    this.outputLog(suspiciousLogEntry);
  }

  /**
   * Get recent log entries
   */
  private getRecentLogs(timeWindowMs: number): AuthLogEntry[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.logs.filter(log => log.timestamp >= cutoff);
  }

  /**
   * Get authentication metrics
   */
  public getMetrics(): AuthMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent error logs
   */
  public getRecentErrors(limit: number = 50): AuthLogEntry[] {
    return this.logs
      .filter(log => log.error)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get logs by user
   */
  public getLogsByUser(userId: string, limit: number = 20): AuthLogEntry[] {
    return this.logs
      .filter(log => log.userId === userId || log.clerkUserId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get logs by IP address
   */
  public getLogsByIP(ipAddress: string, limit: number = 20): AuthLogEntry[] {
    return this.logs
      .filter(log => log.ipAddress === ipAddress)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear old logs (for memory management)
   */
  public clearOldLogs(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - olderThanMs);
    this.logs = this.logs.filter(log => log.timestamp >= cutoff);
  }

  /**
   * Export logs for analysis
   */
  public exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'id', 'timestamp', 'level', 'eventType', 'message', 
        'userId', 'clerkUserId', 'ipAddress', 'userAgent'
      ];
      
      const csvRows = this.logs.map(log => [
        log.id,
        log.timestamp.toISOString(),
        log.level,
        log.eventType,
        log.message,
        log.userId || '',
        log.clerkUserId || '',
        log.ipAddress || '',
        log.userAgent || ''
      ]);

      return [headers, ...csvRows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.logs, null, 2);
  }
}

/**
 * Global authentication error logger instance
 */
export const authErrorLogger = AuthErrorLogger.getInstance();

/**
 * Convenience functions for logging authentication events
 */
export const AuthLogger = {
  logSignInAttempt: (context: Partial<AuthErrorContext>, metadata?: Record<string, any>) =>
    authErrorLogger.logSuccess(AuthEventType.SIGN_IN_ATTEMPT, context, metadata),

  logSignInSuccess: (context: Partial<AuthErrorContext>, metadata?: Record<string, any>) =>
    authErrorLogger.logSuccess(AuthEventType.SIGN_IN_SUCCESS, context, metadata),

  logSignInFailure: (error: AuthenticationError, metadata?: Record<string, any>) =>
    authErrorLogger.logError(error, AuthEventType.SIGN_IN_FAILURE, metadata),

  logSignUpAttempt: (context: Partial<AuthErrorContext>, metadata?: Record<string, any>) =>
    authErrorLogger.logSuccess(AuthEventType.SIGN_UP_ATTEMPT, context, metadata),

  logSignUpSuccess: (context: Partial<AuthErrorContext>, metadata?: Record<string, any>) =>
    authErrorLogger.logSuccess(AuthEventType.SIGN_UP_SUCCESS, context, metadata),

  logSignUpFailure: (error: AuthenticationError, metadata?: Record<string, any>) =>
    authErrorLogger.logError(error, AuthEventType.SIGN_UP_FAILURE, metadata),

  logVerificationAttempt: (context: Partial<AuthErrorContext>, metadata?: Record<string, any>) =>
    authErrorLogger.logSuccess(AuthEventType.VERIFICATION_ATTEMPT, context, metadata),

  logVerificationSuccess: (context: Partial<AuthErrorContext>, metadata?: Record<string, any>) =>
    authErrorLogger.logSuccess(AuthEventType.VERIFICATION_SUCCESS, context, metadata),

  logVerificationFailure: (error: AuthenticationError, metadata?: Record<string, any>) =>
    authErrorLogger.logError(error, AuthEventType.VERIFICATION_FAILURE, metadata),

  logSocialAuthAttempt: (provider: string, context: Partial<AuthErrorContext>, metadata?: Record<string, any>) =>
    authErrorLogger.logSuccess(AuthEventType.SOCIAL_AUTH_ATTEMPT, context, { provider, ...metadata }),

  logSocialAuthSuccess: (provider: string, context: Partial<AuthErrorContext>, metadata?: Record<string, any>) =>
    authErrorLogger.logSuccess(AuthEventType.SOCIAL_AUTH_SUCCESS, context, { provider, ...metadata }),

  logSocialAuthFailure: (provider: string, error: AuthenticationError, metadata?: Record<string, any>) =>
    authErrorLogger.logError(error, AuthEventType.SOCIAL_AUTH_FAILURE, { provider, ...metadata }),

  logSessionExpired: (context: Partial<AuthErrorContext>, metadata?: Record<string, any>) =>
    authErrorLogger.logSuccess(AuthEventType.SESSION_EXPIRED, context, metadata),

  logAccountLocked: (error: AuthenticationError, metadata?: Record<string, any>) =>
    authErrorLogger.logError(error, AuthEventType.ACCOUNT_LOCKED, metadata),

  logRateLimitExceeded: (error: AuthenticationError, metadata?: Record<string, any>) =>
    authErrorLogger.logError(error, AuthEventType.RATE_LIMIT_EXCEEDED, metadata)
};