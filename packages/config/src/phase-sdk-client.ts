// Phase.dev SDK Client Wrapper with Token-Aware Authentication
import { PhaseTokenLoader, TokenSource } from './phase-token-loader'
import { PhaseErrorHandler } from './phase-error-handler'
import { PhaseMonitoring } from './phase-monitoring'

// Import Phase SDK
import Phase from '@phase.dev/phase-node'

/**
 * Phase.dev SDK configuration interface
 */
export interface PhaseSDKConfig {
  serviceToken: string
  appName: string
  environment: string
}

/**
 * Phase.dev SDK result interface
 */
export interface PhaseSDKResult {
  success: boolean
  secrets: Record<string, string>
  error?: string
  source: 'phase-sdk' | 'fallback'
  tokenSource?: TokenSource
}

/**
 * Phase.dev SDK error types
 */
export enum PhaseSDKErrorCode {
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  APP_NOT_FOUND = 'APP_NOT_FOUND',
  ENVIRONMENT_NOT_FOUND = 'ENVIRONMENT_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SDK_ERROR = 'SDK_ERROR'
}

/**
 * Phase.dev SDK error interface
 */
export interface PhaseSDKError {
  code: PhaseSDKErrorCode
  message: string
  details?: Record<string, unknown>
  isRetryable: boolean
  tokenSource?: TokenSource
}

/**
 * Phase.dev SDK Client with token-aware authentication
 * 
 * This class wraps the official Phase.dev Node.js SDK and provides:
 * - Automatic token loading from multiple sources
 * - Token source tracking for better error messages
 * - Connection testing functionality
 * - Proper error handling with SDK-specific error types
 */
export class PhaseSDKClient {
  private client: any = null
  private config: PhaseSDKConfig | null = null
  private tokenSource: TokenSource | null = null
  private initialized: boolean = false

  /**
   * Initialize the Phase.dev SDK client with token loading
   * @param appName Phase.dev application name
   * @param environment Environment name (development, staging, production)
   * @param rootPath Optional workspace root path for token loading
   * @returns Promise resolving to true if initialization successful
   */
  async initialize(appName: string, environment: string, rootPath?: string): Promise<boolean> {
    const operationId = `sdk-init-${Date.now()}`
    const startTime = performance.now()
    
    try {
      // Start monitoring the initialization
      PhaseMonitoring.startOperation(operationId, 'sdk-initialization')
      
      // Load service token from multiple sources
      this.tokenSource = PhaseTokenLoader.getValidatedToken(rootPath)
      
      if (!this.tokenSource) {
        throw this.createError(
          PhaseSDKErrorCode.TOKEN_NOT_FOUND,
          'PHASE_SERVICE_TOKEN not found in any source (process.env, .env.local, .env, root .env.local, root .env)',
          { rootPath },
          false
        )
      }

      // Validate required parameters
      if (!appName || !appName.trim()) {
        throw this.createError(
          PhaseSDKErrorCode.SDK_ERROR,
          'App name is required for Phase.dev SDK initialization',
          { appName },
          false,
          this.tokenSource
        )
      }

      if (!environment || !environment.trim()) {
        throw this.createError(
          PhaseSDKErrorCode.SDK_ERROR,
          'Environment is required for Phase.dev SDK initialization',
          { environment },
          false,
          this.tokenSource
        )
      }

      // Create SDK configuration
      this.config = {
        serviceToken: this.tokenSource.token,
        appName: appName.trim(),
        environment: environment.trim()
      }

      // Initialize Phase.dev SDK client with service token
      this.client = new Phase(this.config.serviceToken)
      
      // Call init() to initialize the session
      await this.client.init()

      this.initialized = true
      
      const duration = performance.now() - startTime
      
      // Log successful initialization with monitoring
      PhaseMonitoring.logSDKInitialization(
        true,
        duration,
        this.config.appName,
        this.config.environment,
        this.tokenSource || undefined
      )
      
      // End monitoring with success
      PhaseMonitoring.endOperation(operationId, true)
      
      console.log(`[PhaseSDKClient] Initialized successfully`)
      console.log(`[PhaseSDKClient] App: ${this.config.appName}`)
      console.log(`[PhaseSDKClient] Environment: ${this.config.environment}`)
      console.log(`[PhaseSDKClient] Token source: ${this.tokenSource.source}`)
      
      return true

    } catch (error) {
      this.initialized = false
      this.client = null
      this.config = null
      
      const duration = performance.now() - startTime
      let sdkError: PhaseSDKError
      
      if (this.isPhaseSDKError(error)) {
        sdkError = error
      } else {
        // Handle SDK-specific errors
        sdkError = this.handleSDKError(error, 'initialization')
      }
      
      // Log failed initialization with monitoring
      PhaseMonitoring.logSDKInitialization(
        false,
        duration,
        appName,
        environment,
        this.tokenSource || undefined,
        sdkError
      )
      
      // End monitoring with failure
      PhaseMonitoring.endOperation(operationId, false, undefined, sdkError)
      
      this.logError(sdkError, 'initialization')
      throw sdkError
    }
  }

  /**
   * Get secrets from Phase.dev using the SDK
   * @returns Promise resolving to PhaseSDKResult
   */
  async getSecrets(): Promise<PhaseSDKResult> {
    if (!this.initialized || !this.client || !this.config) {
      return {
        success: false,
        secrets: {},
        error: 'Phase.dev SDK client not initialized',
        source: 'fallback',
        tokenSource: this.tokenSource || undefined
      }
    }

    const operationId = `secret-retrieval-${Date.now()}`
    const startTime = performance.now()
    
    try {
      // Start monitoring the secret retrieval
      PhaseMonitoring.startOperation(operationId, 'secret-retrieval', this.tokenSource || undefined)
      
      console.log(`[PhaseSDKClient] Fetching secrets for app: ${this.config.appName}, env: ${this.config.environment}`)
      
      // Use SDK to get secrets - need to find the app ID first
      const app = this.client.apps.find((a: any) => a.name === this.config!.appName)
      if (!app) {
        throw new Error(`App "${this.config!.appName}" not found in Phase.dev`)
      }

      // Use SDK to get secrets
      const secrets = await this.client.get({
        appId: app.id,
        envName: this.config.environment
      })

      // Transform SDK response to our format
      const secretsMap: Record<string, string> = {}
      
      if (secrets && Array.isArray(secrets)) {
        // SDK returns an array of Secret objects
        secrets.forEach((secret) => {
          if (secret && secret.key && secret.value && typeof secret.value === 'string') {
            secretsMap[secret.key] = secret.value
          }
        })
      }

      const duration = performance.now() - startTime
      const variableCount = Object.keys(secretsMap).length
      
      // Log successful secret retrieval with monitoring
      PhaseMonitoring.logSecretRetrieval(
        true,
        duration,
        variableCount,
        this.tokenSource || undefined,
        false // not from cache
      )
      
      // End monitoring with success
      PhaseMonitoring.endOperation(operationId, true, {
        variableCount,
        cacheHit: false
      })

      console.log(`[PhaseSDKClient] Successfully fetched ${variableCount} secrets`)
      
      return {
        success: true,
        secrets: secretsMap,
        source: 'phase-sdk',
        tokenSource: this.tokenSource || undefined
      }

    } catch (error) {
      const duration = performance.now() - startTime
      const sdkError = this.handleSDKError(error, 'secret retrieval')
      
      // Log failed secret retrieval with monitoring
      PhaseMonitoring.logSecretRetrieval(
        false,
        duration,
        0,
        this.tokenSource || undefined,
        false,
        sdkError
      )
      
      // End monitoring with failure
      PhaseMonitoring.endOperation(operationId, false, undefined, sdkError)
      
      this.logError(sdkError, 'secret retrieval')
      
      return {
        success: false,
        secrets: {},
        error: sdkError.message,
        source: 'fallback',
        tokenSource: this.tokenSource || undefined
      }
    }
  }

  /**
   * Test connection to Phase.dev service
   * @returns Promise resolving to true if connection successful
   */
  async testConnection(): Promise<boolean> {
    if (!this.initialized || !this.client || !this.config) {
      return false
    }

    try {
      // Try to fetch secrets as a connection test
      const result = await this.getSecrets()
      return result.success
    } catch (error) {
      console.error(`[PhaseSDKClient] Connection test failed:`, error)
      return false
    }
  }

  /**
   * Clear any cached data and reset client state
   */
  clearCache(): void {
    // Phase.dev SDK handles its own caching, so we just log this action
    console.log(`[PhaseSDKClient] Cache clear requested (SDK handles internal caching)`)
  }

  /**
   * Get the token source information
   * @returns TokenSource or null if no token loaded
   */
  getTokenSource(): TokenSource | null {
    return this.tokenSource
  }

  /**
   * Get current configuration
   * @returns PhaseSDKConfig or null if not initialized
   */
  getConfig(): PhaseSDKConfig | null {
    return this.config
  }

  /**
   * Check if client is initialized
   * @returns True if client is initialized and ready
   */
  isInitialized(): boolean {
    return this.initialized && !!this.client && !!this.config
  }

  /**
   * Handle SDK-specific errors and convert to PhaseSDKError
   * @param error Original error from SDK
   * @param operation Operation that failed
   * @returns PhaseSDKError
   */
  private handleSDKError(error: any, operation: string): PhaseSDKError {
    // Check if it's already a PhaseSDKError
    if (this.isPhaseSDKError(error)) {
      return error
    }

    const errorMessage = error?.message || error?.toString() || 'Unknown SDK error'
    
    // Map common SDK errors to our error codes
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('authentication')) {
      return this.createError(
        PhaseSDKErrorCode.AUTHENTICATION_FAILED,
        `Phase.dev authentication failed during ${operation}. Check your service token.`,
        { originalError: errorMessage },
        false,
        this.tokenSource
      )
    }
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return this.createError(
        PhaseSDKErrorCode.APP_NOT_FOUND,
        `Phase.dev app "${this.config?.appName}" or environment "${this.config?.environment}" not found during ${operation}.`,
        { originalError: errorMessage, appName: this.config?.appName, environment: this.config?.environment },
        false,
        this.tokenSource
      )
    }
    
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return this.createError(
        PhaseSDKErrorCode.AUTHENTICATION_FAILED,
        `Phase.dev access denied during ${operation}. Check your service token permissions.`,
        { originalError: errorMessage },
        false,
        this.tokenSource
      )
    }
    
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return this.createError(
        PhaseSDKErrorCode.RATE_LIMIT_EXCEEDED,
        `Phase.dev rate limit exceeded during ${operation}. Please retry later.`,
        { originalError: errorMessage },
        true,
        this.tokenSource
      )
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
      return this.createError(
        PhaseSDKErrorCode.NETWORK_ERROR,
        `Network error during ${operation}. Phase.dev service may be unavailable.`,
        { originalError: errorMessage },
        true,
        this.tokenSource
      )
    }
    
    if (errorMessage.toLowerCase().includes('token') && errorMessage.toLowerCase().includes('invalid')) {
      return this.createError(
        PhaseSDKErrorCode.INVALID_TOKEN,
        `Invalid service token during ${operation}. Please check your PHASE_SERVICE_TOKEN.`,
        { originalError: errorMessage },
        false,
        this.tokenSource
      )
    }
    
    // Default to SDK_ERROR for unknown errors
    return this.createError(
      PhaseSDKErrorCode.SDK_ERROR,
      `Phase.dev SDK error during ${operation}: ${errorMessage}`,
      { originalError: errorMessage },
      false,
      this.tokenSource
    )
  }

  /**
   * Log error using PhaseErrorHandler for consistent formatting
   * @param error PhaseSDKError to log
   * @param operation Operation that failed
   */
  private logError(error: PhaseSDKError, operation: string): void {
    const logData = PhaseErrorHandler.formatErrorForLogging(error, this.tokenSource, operation)
    console.error(`[PhaseSDKClient] ${operation} failed:`, logData)
  }

  /**
   * Create a PhaseSDKError
   * @param code Error code
   * @param message Error message
   * @param details Additional error details
   * @param isRetryable Whether the error is retryable
   * @param tokenSource Token source information
   * @returns PhaseSDKError
   */
  private createError(
    code: PhaseSDKErrorCode,
    message: string,
    details?: Record<string, unknown>,
    isRetryable: boolean = false,
    tokenSource?: TokenSource | null
  ): PhaseSDKError {
    return {
      code,
      message,
      details,
      isRetryable,
      tokenSource: tokenSource || undefined
    }
  }

  /**
   * Check if an error is a PhaseSDKError
   * @param error Error to check
   * @returns True if error is PhaseSDKError
   */
  private isPhaseSDKError(error: any): error is PhaseSDKError {
    return error && typeof error === 'object' && 'code' in error && 'message' in error && 'isRetryable' in error
  }

  /**
   * Get diagnostic information about the client state
   * @returns Diagnostic information
   */
  getDiagnostics(): {
    initialized: boolean
    hasClient: boolean
    hasConfig: boolean
    tokenSource?: TokenSource
    config?: PhaseSDKConfig
  } {
    return {
      initialized: this.initialized,
      hasClient: !!this.client,
      hasConfig: !!this.config,
      tokenSource: this.tokenSource || undefined,
      config: this.config || undefined
    }
  }
}