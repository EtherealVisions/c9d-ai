// Phase.dev Error Handler with Token Source Awareness
import { PhaseSDKErrorCode, PhaseSDKError } from './phase-sdk-client'
import { TokenSource } from './types'

/**
 * Error handling result interface
 */
export interface PhaseErrorHandlingResult {
  shouldFallback: boolean
  userMessage: string
  logMessage: string
  retryable: boolean
  fallbackStrategy: FallbackStrategy
  debugInfo?: Record<string, unknown>
}

/**
 * Fallback strategies for different error types
 */
export enum FallbackStrategy {
  LOCAL_ENV_ONLY = 'LOCAL_ENV_ONLY',
  RETRY_WITH_BACKOFF = 'RETRY_WITH_BACKOFF',
  CACHE_FALLBACK = 'CACHE_FALLBACK',
  FAIL_FAST = 'FAIL_FAST',
  GRACEFUL_DEGRADATION = 'GRACEFUL_DEGRADATION'
}

/**
 * Phase.dev Error Handler
 * 
 * Provides comprehensive error handling for Phase.dev SDK integration with:
 * - Token source awareness for better debugging
 * - Specific error messages for different failure scenarios
 * - Fallback strategy recommendations
 * - Retry logic guidance
 */
export class PhaseErrorHandler {
  /**
   * Handle Phase.dev SDK errors with token source awareness
   * @param error PhaseSDKError or unknown error
   * @param tokenSource Token source information for debugging
   * @param operation Operation that failed (for context)
   * @returns Error handling result with fallback strategy
   */
  static handleSDKError(
    error: PhaseSDKError | unknown,
    tokenSource?: TokenSource | null,
    operation: string = 'Phase.dev operation'
  ): PhaseErrorHandlingResult {
    // Convert unknown errors to PhaseSDKError if needed
    const sdkError = this.normalizeError(error, tokenSource)
    
    switch (sdkError.code) {
      case PhaseSDKErrorCode.TOKEN_NOT_FOUND:
        return this.handleTokenNotFoundError(sdkError, tokenSource, operation)
      
      case PhaseSDKErrorCode.AUTHENTICATION_FAILED:
        return this.handleAuthenticationError(sdkError, tokenSource, operation)
      
      case PhaseSDKErrorCode.INVALID_TOKEN:
        return this.handleInvalidTokenError(sdkError, tokenSource, operation)
      
      case PhaseSDKErrorCode.APP_NOT_FOUND:
        return this.handleAppNotFoundError(sdkError, tokenSource, operation)
      
      case PhaseSDKErrorCode.ENVIRONMENT_NOT_FOUND:
        return this.handleEnvironmentNotFoundError(sdkError, tokenSource, operation)
      
      case PhaseSDKErrorCode.NETWORK_ERROR:
        return this.handleNetworkError(sdkError, tokenSource, operation)
      
      case PhaseSDKErrorCode.RATE_LIMIT_EXCEEDED:
        return this.handleRateLimitError(sdkError, tokenSource, operation)
      
      case PhaseSDKErrorCode.SDK_ERROR:
      default:
        return this.handleGenericSDKError(sdkError, tokenSource, operation)
    }
  }

  /**
   * Handle TOKEN_NOT_FOUND error - no token found in any source
   */
  private static handleTokenNotFoundError(
    error: PhaseSDKError,
    tokenSource: TokenSource | null | undefined,
    operation: string
  ): PhaseErrorHandlingResult {
    const tokenGuidance = this.generateTokenGuidance(null)
    
    return {
      shouldFallback: true,
      userMessage: `Phase.dev configuration missing: ${tokenGuidance}`,
      logMessage: `[Phase.dev] ${operation} failed: No PHASE_SERVICE_TOKEN found in any source`,
      retryable: false,
      fallbackStrategy: FallbackStrategy.LOCAL_ENV_ONLY,
      debugInfo: {
        errorCode: error.code,
        checkedSources: [
          'process.env.PHASE_SERVICE_TOKEN',
          'local .env.local',
          'local .env',
          'root .env.local',
          'root .env'
        ],
        suggestion: 'Add PHASE_SERVICE_TOKEN to one of the checked sources'
      }
    }
  }

  /**
   * Handle AUTHENTICATION_FAILED error - token exists but authentication failed
   */
  private static handleAuthenticationError(
    error: PhaseSDKError,
    tokenSource: TokenSource | null | undefined,
    operation: string
  ): PhaseErrorHandlingResult {
    const tokenGuidance = this.generateTokenGuidance(tokenSource)
    
    return {
      shouldFallback: true,
      userMessage: `Phase.dev authentication failed. ${tokenGuidance}. Verify your token is valid and has proper permissions.`,
      logMessage: `[Phase.dev] ${operation} failed: Authentication failed with token from ${tokenSource?.source || 'unknown source'}`,
      retryable: false,
      fallbackStrategy: FallbackStrategy.LOCAL_ENV_ONLY,
      debugInfo: {
        errorCode: error.code,
        tokenSource: tokenSource?.source,
        tokenPath: tokenSource?.path,
        suggestion: 'Check token validity in Phase.dev console and verify permissions'
      }
    }
  }

  /**
   * Handle INVALID_TOKEN error - token format is invalid
   */
  private static handleInvalidTokenError(
    error: PhaseSDKError,
    tokenSource: TokenSource | null | undefined,
    operation: string
  ): PhaseErrorHandlingResult {
    const tokenGuidance = this.generateTokenGuidance(tokenSource)
    
    return {
      shouldFallback: true,
      userMessage: `Phase.dev token is invalid. ${tokenGuidance}. Check the token format and ensure it's copied correctly.`,
      logMessage: `[Phase.dev] ${operation} failed: Invalid token format from ${tokenSource?.source || 'unknown source'}`,
      retryable: false,
      fallbackStrategy: FallbackStrategy.LOCAL_ENV_ONLY,
      debugInfo: {
        errorCode: error.code,
        tokenSource: tokenSource?.source,
        tokenPath: tokenSource?.path,
        suggestion: 'Regenerate token in Phase.dev console and update configuration'
      }
    }
  }

  /**
   * Handle APP_NOT_FOUND error - Phase.dev app doesn't exist
   */
  private static handleAppNotFoundError(
    error: PhaseSDKError,
    tokenSource: TokenSource | null | undefined,
    operation: string
  ): PhaseErrorHandlingResult {
    const appName = error.details?.appName as string || 'unknown'
    
    return {
      shouldFallback: true,
      userMessage: `Phase.dev app "${appName}" not found. Create the app in Phase.dev console or check the app name configuration.`,
      logMessage: `[Phase.dev] ${operation} failed: App "${appName}" not found`,
      retryable: false,
      fallbackStrategy: FallbackStrategy.LOCAL_ENV_ONLY,
      debugInfo: {
        errorCode: error.code,
        appName,
        tokenSource: tokenSource?.source,
        suggestion: 'Create the app in Phase.dev console or verify app name spelling'
      }
    }
  }

  /**
   * Handle ENVIRONMENT_NOT_FOUND error - Phase.dev environment doesn't exist
   */
  private static handleEnvironmentNotFoundError(
    error: PhaseSDKError,
    tokenSource: TokenSource | null | undefined,
    operation: string
  ): PhaseErrorHandlingResult {
    const appName = error.details?.appName as string || 'unknown'
    const environment = error.details?.environment as string || 'unknown'
    
    return {
      shouldFallback: true,
      userMessage: `Phase.dev environment "${environment}" not found in app "${appName}". Create the environment or check the environment name.`,
      logMessage: `[Phase.dev] ${operation} failed: Environment "${environment}" not found in app "${appName}"`,
      retryable: false,
      fallbackStrategy: FallbackStrategy.LOCAL_ENV_ONLY,
      debugInfo: {
        errorCode: error.code,
        appName,
        environment,
        tokenSource: tokenSource?.source,
        suggestion: 'Create the environment in Phase.dev console or verify environment name'
      }
    }
  }

  /**
   * Handle NETWORK_ERROR - Phase.dev service unavailable
   */
  private static handleNetworkError(
    error: PhaseSDKError,
    tokenSource: TokenSource | null | undefined,
    operation: string
  ): PhaseErrorHandlingResult {
    return {
      shouldFallback: true,
      userMessage: 'Phase.dev service is temporarily unavailable. Using local environment variables.',
      logMessage: `[Phase.dev] ${operation} failed: Network error - ${error.message}`,
      retryable: true,
      fallbackStrategy: FallbackStrategy.RETRY_WITH_BACKOFF,
      debugInfo: {
        errorCode: error.code,
        tokenSource: tokenSource?.source,
        networkError: error.details?.originalError,
        suggestion: 'Check network connectivity and Phase.dev service status'
      }
    }
  }

  /**
   * Handle RATE_LIMIT_EXCEEDED - too many requests
   */
  private static handleRateLimitError(
    error: PhaseSDKError,
    tokenSource: TokenSource | null | undefined,
    operation: string
  ): PhaseErrorHandlingResult {
    const retryAfter = error.details?.retryAfter as number || 60
    
    return {
      shouldFallback: true,
      userMessage: `Phase.dev rate limit exceeded. Please retry in ${retryAfter} seconds.`,
      logMessage: `[Phase.dev] ${operation} failed: Rate limit exceeded, retry after ${retryAfter}s`,
      retryable: true,
      fallbackStrategy: FallbackStrategy.RETRY_WITH_BACKOFF,
      debugInfo: {
        errorCode: error.code,
        retryAfter,
        tokenSource: tokenSource?.source,
        suggestion: 'Implement exponential backoff or reduce request frequency'
      }
    }
  }

  /**
   * Handle generic SDK errors
   */
  private static handleGenericSDKError(
    error: PhaseSDKError,
    tokenSource: TokenSource | null | undefined,
    operation: string
  ): PhaseErrorHandlingResult {
    return {
      shouldFallback: true,
      userMessage: 'Phase.dev service error occurred. Using local environment variables.',
      logMessage: `[Phase.dev] ${operation} failed: ${error.message}`,
      retryable: error.isRetryable,
      fallbackStrategy: error.isRetryable ? FallbackStrategy.RETRY_WITH_BACKOFF : FallbackStrategy.LOCAL_ENV_ONLY,
      debugInfo: {
        errorCode: error.code,
        tokenSource: tokenSource?.source,
        originalError: error.details?.originalError,
        suggestion: 'Check Phase.dev service status and configuration'
      }
    }
  }

  /**
   * Generate user-friendly token guidance based on token source
   */
  private static generateTokenGuidance(tokenSource: TokenSource | null | undefined): string {
    if (!tokenSource) {
      return 'PHASE_SERVICE_TOKEN not found. Add it to process.env, .env.local, or .env file'
    }

    const sourceDescriptions = {
      'process.env': 'environment variable PHASE_SERVICE_TOKEN',
      'local.env.local': 'local .env.local file',
      'local.env': 'local .env file',
      'root.env.local': 'workspace root .env.local file',
      'root.env': 'workspace root .env file'
    }

    const sourceDesc = sourceDescriptions[tokenSource.source] || tokenSource.source
    const pathInfo = tokenSource.path ? ` (${tokenSource.path})` : ''
    
    return `Token loaded from ${sourceDesc}${pathInfo}`
  }

  /**
   * Normalize unknown errors to PhaseSDKError
   */
  private static normalizeError(
    error: PhaseSDKError | unknown,
    tokenSource?: TokenSource | null
  ): PhaseSDKError {
    // If it's already a PhaseSDKError, return as-is
    if (this.isPhaseSDKError(error)) {
      return error
    }

    // Convert unknown errors to PhaseSDKError
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return {
      code: PhaseSDKErrorCode.SDK_ERROR,
      message: errorMessage,
      details: { originalError: error },
      isRetryable: false,
      tokenSource: tokenSource || undefined
    }
  }

  /**
   * Type guard to check if error is PhaseSDKError
   */
  private static isPhaseSDKError(error: any): error is PhaseSDKError {
    return error && 
           typeof error === 'object' && 
           'code' in error && 
           'message' in error && 
           'isRetryable' in error
  }

  /**
   * Create fallback mechanisms for different error types
   */
  static createFallbackMechanism(strategy: FallbackStrategy): {
    description: string
    implementation: string
    retryLogic?: {
      maxAttempts: number
      baseDelay: number
      maxDelay: number
    }
  } {
    switch (strategy) {
      case FallbackStrategy.LOCAL_ENV_ONLY:
        return {
          description: 'Fall back to local environment variables only',
          implementation: 'Load environment variables from .env files without Phase.dev integration'
        }
      
      case FallbackStrategy.RETRY_WITH_BACKOFF:
        return {
          description: 'Retry with exponential backoff',
          implementation: 'Retry Phase.dev operation with increasing delays',
          retryLogic: {
            maxAttempts: 3,
            baseDelay: 1000, // 1 second
            maxDelay: 10000  // 10 seconds
          }
        }
      
      case FallbackStrategy.CACHE_FALLBACK:
        return {
          description: 'Use cached Phase.dev data if available',
          implementation: 'Return previously cached secrets if Phase.dev is unavailable'
        }
      
      case FallbackStrategy.FAIL_FAST:
        return {
          description: 'Fail immediately without fallback',
          implementation: 'Throw error immediately for critical configuration issues'
        }
      
      case FallbackStrategy.GRACEFUL_DEGRADATION:
        return {
          description: 'Continue with reduced functionality',
          implementation: 'Operate with limited features when Phase.dev is unavailable'
        }
      
      default:
        return {
          description: 'Default fallback to local environment',
          implementation: 'Use local environment variables as default fallback'
        }
    }
  }

  /**
   * Get troubleshooting steps for specific error codes
   */
  static getTroubleshootingSteps(errorCode: PhaseSDKErrorCode): string[] {
    switch (errorCode) {
      case PhaseSDKErrorCode.TOKEN_NOT_FOUND:
        return [
          'Add PHASE_SERVICE_TOKEN to your environment variables',
          'Create a .env.local file with PHASE_SERVICE_TOKEN=your_token',
          'Verify the token is not empty or whitespace',
          'Check file permissions on .env files'
        ]
      
      case PhaseSDKErrorCode.AUTHENTICATION_FAILED:
      case PhaseSDKErrorCode.INVALID_TOKEN:
        return [
          'Verify the token in Phase.dev console',
          'Regenerate the service token if needed',
          'Check token permissions and scope',
          'Ensure token is copied correctly without extra characters'
        ]
      
      case PhaseSDKErrorCode.APP_NOT_FOUND:
        return [
          'Create the app in Phase.dev console',
          'Verify the app name spelling and case',
          'Check if the token has access to the app',
          'Ensure the app is not deleted or archived'
        ]
      
      case PhaseSDKErrorCode.ENVIRONMENT_NOT_FOUND:
        return [
          'Create the environment in Phase.dev console',
          'Verify the environment name spelling and case',
          'Check if the environment exists in the correct app',
          'Ensure the token has access to the environment'
        ]
      
      case PhaseSDKErrorCode.NETWORK_ERROR:
        return [
          'Check internet connectivity',
          'Verify Phase.dev service status',
          'Check firewall and proxy settings',
          'Try again after a few minutes'
        ]
      
      case PhaseSDKErrorCode.RATE_LIMIT_EXCEEDED:
        return [
          'Wait for the rate limit to reset',
          'Implement exponential backoff in retry logic',
          'Reduce the frequency of API calls',
          'Consider caching to reduce API usage'
        ]
      
      default:
        return [
          'Check Phase.dev service status',
          'Verify all configuration is correct',
          'Review Phase.dev documentation',
          'Contact Phase.dev support if issue persists'
        ]
    }
  }

  /**
   * Format error for logging with token source information
   */
  static formatErrorForLogging(
    error: PhaseSDKError,
    tokenSource?: TokenSource | null,
    operation?: string
  ): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      operation: operation || 'unknown',
      errorCode: error.code,
      message: error.message,
      isRetryable: error.isRetryable,
      tokenSource: tokenSource ? {
        source: tokenSource.source,
        path: tokenSource.path,
        // Never log the actual token value
        hasToken: !!tokenSource.token,
        tokenLength: tokenSource.token?.length || 0
      } : null,
      details: error.details,
      troubleshootingSteps: this.getTroubleshootingSteps(error.code)
    }
  }

  /**
   * Create user-friendly error message with actionable guidance
   */
  static createUserFriendlyMessage(
    error: PhaseSDKError,
    tokenSource?: TokenSource | null
  ): string {
    const result = this.handleSDKError(error, tokenSource)
    const troubleshootingSteps = this.getTroubleshootingSteps(error.code)
    
    let message = result.userMessage
    
    if (troubleshootingSteps.length > 0) {
      message += '\n\nTroubleshooting steps:'
      troubleshootingSteps.forEach((step, index) => {
        message += `\n${index + 1}. ${step}`
      })
    }
    
    return message
  }
}