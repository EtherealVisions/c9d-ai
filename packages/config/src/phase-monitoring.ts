// Phase.dev Monitoring and Logging System with Token Source Tracking
import { TokenSource } from './types'
import { PhaseSDKError, PhaseSDKErrorCode } from './phase-sdk-client'
import { FallbackStrategy } from './phase-error-handler'

/**
 * Performance metrics for Phase.dev operations
 */
export interface PhasePerformanceMetrics {
  operation: string
  startTime: number
  endTime: number
  duration: number
  success: boolean
  errorCode?: PhaseSDKErrorCode
  tokenSource?: TokenSource
  variableCount?: number
  cacheHit?: boolean
  retryCount?: number
}

/**
 * Error rate tracking
 */
export interface PhaseErrorRate {
  timeWindow: string
  totalOperations: number
  errorCount: number
  errorRate: number
  errorsByCode: Record<PhaseSDKErrorCode, number>
  fallbackUsage: Record<FallbackStrategy, number>
}

/**
 * Configuration diagnostics information
 */
export interface PhaseConfigDiagnostics {
  timestamp: string
  tokenLoadingProcess: {
    checkedSources: Array<{
      source: TokenSource['source']
      path?: string
      exists: boolean
      hasToken: boolean
      isActive: boolean
      checkOrder: number
    }>
    activeToken?: {
      source: TokenSource['source']
      path?: string
      tokenLength: number
      isValid: boolean
    }
    loadingTime: number
  }
  sdkInitialization: {
    success: boolean
    duration: number
    appName?: string
    environment?: string
    error?: string
  }
  secretRetrieval: {
    attempted: boolean
    success: boolean
    duration?: number
    variableCount?: number
    error?: string
  }
  fallbackUsage: {
    triggered: boolean
    strategy?: FallbackStrategy
    reason?: string
  }
}

/**
 * Secure logging configuration
 */
export interface SecureLoggingConfig {
  redactSensitiveData: boolean
  showTokenSources: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  includeStackTraces: boolean
  maxLogEntrySize: number
}

/**
 * Log entry structure
 */
export interface PhaseLogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  operation: string
  message: string
  tokenSource?: {
    source: TokenSource['source']
    path?: string
    hasToken: boolean
    tokenLength?: number
  }
  performance?: {
    duration: number
    success: boolean
    variableCount?: number
  }
  error?: {
    code: PhaseSDKErrorCode
    message: string
    isRetryable: boolean
    fallbackStrategy?: FallbackStrategy
  }
  metadata?: Record<string, unknown>
}

/**
 * Phase.dev Monitoring and Logging System
 * 
 * Provides comprehensive monitoring, logging, and diagnostics for Phase.dev integration:
 * - Secure logging that redacts sensitive information but shows token sources
 * - Performance metrics tracking for SDK operations
 * - Error rate monitoring and fallback usage tracking
 * - Detailed configuration diagnostics
 * - Token source tracking for debugging without exposing token values
 */
export class PhaseMonitoring {
  private static performanceMetrics: PhasePerformanceMetrics[] = []
  private static errorRates: Map<string, PhaseErrorRate> = new Map()
  private static logEntries: PhaseLogEntry[] = []
  private static config: SecureLoggingConfig = {
    redactSensitiveData: true,
    showTokenSources: true,
    logLevel: 'info',
    includeStackTraces: false,
    maxLogEntrySize: 10000
  }
  
  // Performance tracking
  private static activeOperations: Map<string, {
    operation: string
    startTime: number
    tokenSource?: TokenSource
  }> = new Map()

  /**
   * Configure secure logging settings
   * @param newConfig Logging configuration
   */
  static configure(newConfig: Partial<SecureLoggingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.log('info', 'monitoring-config', 'Phase.dev monitoring configuration updated', {
      metadata: { config: this.config }
    })
  }

  /**
   * Start tracking a Phase.dev operation
   * @param operationId Unique operation identifier
   * @param operation Operation name
   * @param tokenSource Token source information
   */
  static startOperation(operationId: string, operation: string, tokenSource?: TokenSource): void {
    this.activeOperations.set(operationId, {
      operation,
      startTime: performance.now(),
      tokenSource
    })
    
    this.log('debug', operation, `Started ${operation}`, {
      tokenSource: this.sanitizeTokenSource(tokenSource),
      metadata: { operationId }
    })
  }

  /**
   * End tracking a Phase.dev operation
   * @param operationId Unique operation identifier
   * @param success Whether operation succeeded
   * @param result Operation result data
   * @param error Error information if failed
   */
  static endOperation(
    operationId: string,
    success: boolean,
    result?: {
      variableCount?: number
      cacheHit?: boolean
      retryCount?: number
    },
    error?: PhaseSDKError
  ): void {
    const activeOp = this.activeOperations.get(operationId)
    if (!activeOp) {
      console.warn(`Attempted to end unknown operation: ${operationId}`)
      return
    }

    const endTime = performance.now()
    const duration = endTime - activeOp.startTime

    // Create performance metric
    const metric: PhasePerformanceMetrics = {
      operation: activeOp.operation,
      startTime: activeOp.startTime,
      endTime,
      duration,
      success,
      tokenSource: activeOp.tokenSource,
      errorCode: error?.code,
      variableCount: result?.variableCount,
      cacheHit: result?.cacheHit,
      retryCount: result?.retryCount
    }

    this.performanceMetrics.push(metric)
    this.activeOperations.delete(operationId)

    // Log operation completion
    const level = success ? 'info' : 'error'
    const message = success 
      ? `Completed ${activeOp.operation} successfully in ${Math.round(duration)}ms`
      : `Failed ${activeOp.operation} after ${Math.round(duration)}ms`

    this.log(level, activeOp.operation, message, {
      tokenSource: this.sanitizeTokenSource(activeOp.tokenSource),
      performance: {
        duration: Math.round(duration),
        success,
        variableCount: result?.variableCount
      },
      error: error ? {
        code: error.code,
        message: this.redactSensitiveInfo(error.message),
        isRetryable: error.isRetryable,
        fallbackStrategy: this.getFallbackStrategyFromError(error)
      } : undefined,
      metadata: {
        operationId,
        cacheHit: result?.cacheHit,
        retryCount: result?.retryCount
      }
    })

    // Update error rates if operation failed
    if (!success && error) {
      this.updateErrorRates(activeOp.operation, error)
    }

    // Clean up old metrics (keep last 1000 entries)
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000)
    }
  }

  /**
   * Log Phase.dev configuration diagnostics
   * @param diagnostics Configuration diagnostics information
   */
  static logConfigurationDiagnostics(diagnostics: PhaseConfigDiagnostics): void {
    this.log('info', 'configuration-diagnostics', 'Phase.dev configuration diagnostics', {
      metadata: {
        timestamp: diagnostics.timestamp,
        tokenLoading: {
          checkedSources: diagnostics.tokenLoadingProcess.checkedSources.map(source => ({
            source: source.source,
            path: source.path,
            exists: source.exists,
            hasToken: source.hasToken,
            isActive: source.isActive,
            checkOrder: source.checkOrder
          })),
          activeToken: diagnostics.tokenLoadingProcess.activeToken ? {
            source: diagnostics.tokenLoadingProcess.activeToken.source,
            path: diagnostics.tokenLoadingProcess.activeToken.path,
            tokenLength: diagnostics.tokenLoadingProcess.activeToken.tokenLength,
            isValid: diagnostics.tokenLoadingProcess.activeToken.isValid
          } : undefined,
          loadingTime: diagnostics.tokenLoadingProcess.loadingTime
        },
        sdkInitialization: {
          success: diagnostics.sdkInitialization.success,
          duration: diagnostics.sdkInitialization.duration,
          appName: diagnostics.sdkInitialization.appName,
          environment: diagnostics.sdkInitialization.environment,
          error: diagnostics.sdkInitialization.error ? this.redactSensitiveInfo(diagnostics.sdkInitialization.error) : undefined
        },
        secretRetrieval: {
          attempted: diagnostics.secretRetrieval.attempted,
          success: diagnostics.secretRetrieval.success,
          duration: diagnostics.secretRetrieval.duration,
          variableCount: diagnostics.secretRetrieval.variableCount,
          error: diagnostics.secretRetrieval.error ? this.redactSensitiveInfo(diagnostics.secretRetrieval.error) : undefined
        },
        fallbackUsage: diagnostics.fallbackUsage
      }
    })
  }

  /**
   * Log token loading process with detailed source information
   * @param tokenSources Array of token source diagnostics
   * @param activeToken Currently active token source
   * @param loadingTime Time taken to load token
   */
  static logTokenLoadingProcess(
    tokenSources: Array<{
      source: TokenSource['source']
      path?: string
      exists: boolean
      hasToken: boolean
      isActive: boolean
    }>,
    activeToken?: TokenSource,
    loadingTime?: number
  ): void {
    const message = activeToken 
      ? `Token loaded successfully from ${activeToken.source}`
      : 'No valid token found in any source'

    this.log('info', 'token-loading', message, {
      tokenSource: this.sanitizeTokenSource(activeToken),
      metadata: {
        loadingTime: loadingTime || 0,
        checkedSources: tokenSources.map((source, index) => ({
          checkOrder: index + 1,
          source: source.source,
          path: source.path,
          exists: source.exists,
          hasToken: source.hasToken,
          isActive: source.isActive
        })),
        totalSourcesChecked: tokenSources.length,
        sourcesWithToken: tokenSources.filter(s => s.hasToken).length
      }
    })
  }

  /**
   * Log SDK initialization with performance and error details
   * @param success Whether initialization succeeded
   * @param duration Time taken for initialization
   * @param appName Application name
   * @param environment Environment name
   * @param tokenSource Token source used
   * @param error Error if initialization failed
   */
  static logSDKInitialization(
    success: boolean,
    duration: number,
    appName: string,
    environment: string,
    tokenSource?: TokenSource,
    error?: PhaseSDKError
  ): void {
    const level = success ? 'info' : 'error'
    const message = success 
      ? `Phase.dev SDK initialized successfully for ${appName}/${environment}`
      : `Phase.dev SDK initialization failed for ${appName}/${environment}`

    this.log(level, 'sdk-initialization', message, {
      tokenSource: this.sanitizeTokenSource(tokenSource),
      performance: {
        duration: Math.round(duration),
        success
      },
      error: error ? {
        code: error.code,
        message: this.redactSensitiveInfo(error.message),
        isRetryable: error.isRetryable
      } : undefined,
      metadata: {
        appName,
        environment
      }
    })
  }

  /**
   * Log secret retrieval operation with performance metrics
   * @param success Whether retrieval succeeded
   * @param duration Time taken for retrieval
   * @param variableCount Number of variables retrieved
   * @param tokenSource Token source used
   * @param cacheHit Whether result came from cache
   * @param error Error if retrieval failed
   */
  static logSecretRetrieval(
    success: boolean,
    duration: number,
    variableCount: number,
    tokenSource?: TokenSource,
    cacheHit?: boolean,
    error?: PhaseSDKError
  ): void {
    const level = success ? 'info' : 'error'
    const cacheInfo = cacheHit ? ' (from cache)' : ''
    const message = success 
      ? `Retrieved ${variableCount} secrets in ${Math.round(duration)}ms${cacheInfo}`
      : `Secret retrieval failed after ${Math.round(duration)}ms`

    this.log(level, 'secret-retrieval', message, {
      tokenSource: this.sanitizeTokenSource(tokenSource),
      performance: {
        duration: Math.round(duration),
        success,
        variableCount
      },
      error: error ? {
        code: error.code,
        message: this.redactSensitiveInfo(error.message),
        isRetryable: error.isRetryable,
        fallbackStrategy: this.getFallbackStrategyFromError(error)
      } : undefined,
      metadata: {
        cacheHit: cacheHit || false
      }
    })
  }

  /**
   * Log fallback usage with strategy and reason
   * @param strategy Fallback strategy used
   * @param reason Reason for fallback
   * @param tokenSource Token source information
   * @param originalError Original error that triggered fallback
   */
  static logFallbackUsage(
    strategy: FallbackStrategy,
    reason: string,
    tokenSource?: TokenSource,
    originalError?: PhaseSDKError
  ): void {
    this.log('warn', 'fallback-usage', `Fallback triggered: ${strategy}`, {
      tokenSource: this.sanitizeTokenSource(tokenSource),
      error: originalError ? {
        code: originalError.code,
        message: this.redactSensitiveInfo(originalError.message),
        isRetryable: originalError.isRetryable,
        fallbackStrategy: strategy
      } : undefined,
      metadata: {
        fallbackStrategy: strategy,
        reason: this.redactSensitiveInfo(reason)
      }
    })
  }

  /**
   * Get performance metrics for a specific operation
   * @param operation Operation name (optional, returns all if not specified)
   * @param timeWindow Time window in milliseconds (optional)
   * @returns Performance metrics
   */
  static getPerformanceMetrics(operation?: string, timeWindow?: number): {
    metrics: PhasePerformanceMetrics[]
    summary: {
      totalOperations: number
      successRate: number
      averageDuration: number
      p95Duration: number
      errorsByCode: Record<PhaseSDKErrorCode, number>
    }
  } {
    const now = Date.now()
    let filteredMetrics = this.performanceMetrics

    // Filter by time window if specified
    if (timeWindow) {
      const cutoff = now - timeWindow
      filteredMetrics = filteredMetrics.filter(m => m.endTime >= cutoff)
    }

    // Filter by operation if specified
    if (operation) {
      filteredMetrics = filteredMetrics.filter(m => m.operation === operation)
    }

    // Calculate summary statistics
    const totalOperations = filteredMetrics.length
    const successfulOps = filteredMetrics.filter(m => m.success).length
    const successRate = totalOperations > 0 ? successfulOps / totalOperations : 0

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b)
    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0
    const p95Index = Math.floor(durations.length * 0.95)
    const p95Duration = durations.length > 0 ? durations[p95Index] || durations[durations.length - 1] : 0

    const errorsByCode: Record<PhaseSDKErrorCode, number> = {} as Record<PhaseSDKErrorCode, number>
    filteredMetrics.filter(m => !m.success && m.errorCode).forEach(m => {
      const code = m.errorCode!
      errorsByCode[code] = (errorsByCode[code] || 0) + 1
    })

    return {
      metrics: filteredMetrics,
      summary: {
        totalOperations,
        successRate,
        averageDuration,
        p95Duration,
        errorsByCode
      }
    }
  }

  /**
   * Get error rates for a specific time window
   * @param timeWindow Time window identifier (e.g., 'last-hour', 'last-day')
   * @param windowSize Window size in milliseconds
   * @returns Error rate information
   */
  static getErrorRates(timeWindow: string = 'last-hour', windowSize: number = 3600000): PhaseErrorRate {
    const cached = this.errorRates.get(timeWindow)
    const now = Date.now()

    // Return cached if recent (within 5 minutes)
    if (cached && (now - new Date(cached.timeWindow).getTime()) < 300000) {
      return cached
    }

    // Calculate new error rates
    const cutoff = now - windowSize
    const recentMetrics = this.performanceMetrics.filter(m => m.endTime >= cutoff)
    
    const totalOperations = recentMetrics.length
    const errorCount = recentMetrics.filter(m => !m.success).length
    const errorRate = totalOperations > 0 ? errorCount / totalOperations : 0

    const errorsByCode: Record<PhaseSDKErrorCode, number> = {} as Record<PhaseSDKErrorCode, number>
    const fallbackUsage: Record<FallbackStrategy, number> = {} as Record<FallbackStrategy, number>

    recentMetrics.filter(m => !m.success && m.errorCode).forEach(m => {
      const code = m.errorCode!
      errorsByCode[code] = (errorsByCode[code] || 0) + 1
      
      // Infer fallback strategy from error code
      const strategy = this.inferFallbackStrategy(code)
      fallbackUsage[strategy] = (fallbackUsage[strategy] || 0) + 1
    })

    const errorRateData: PhaseErrorRate = {
      timeWindow: new Date(now).toISOString(),
      totalOperations,
      errorCount,
      errorRate,
      errorsByCode,
      fallbackUsage
    }

    this.errorRates.set(timeWindow, errorRateData)
    return errorRateData
  }

  /**
   * Get recent log entries
   * @param level Minimum log level to include
   * @param limit Maximum number of entries to return
   * @param operation Filter by operation (optional)
   * @returns Recent log entries
   */
  static getRecentLogs(
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    limit: number = 100,
    operation?: string
  ): PhaseLogEntry[] {
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 }
    const minPriority = levelPriority[level]

    let filteredLogs = this.logEntries.filter(entry => 
      levelPriority[entry.level] >= minPriority
    )

    if (operation) {
      filteredLogs = filteredLogs.filter(entry => entry.operation === operation)
    }

    return filteredLogs.slice(-limit).reverse() // Most recent first
  }

  /**
   * Export monitoring data for external analysis
   * @param includeRawMetrics Whether to include raw performance metrics
   * @returns Monitoring data export
   */
  static exportMonitoringData(includeRawMetrics: boolean = false): {
    summary: {
      totalOperations: number
      successRate: number
      averageDuration: number
      errorRates: Record<string, PhaseErrorRate>
    }
    performanceMetrics?: PhasePerformanceMetrics[]
    recentLogs: PhaseLogEntry[]
    configuration: SecureLoggingConfig
  } {
    const performanceData = this.getPerformanceMetrics()
    const errorRates: Record<string, PhaseErrorRate> = {}
    
    // Get error rates for different time windows
    errorRates['last-hour'] = this.getErrorRates('last-hour', 3600000)
    errorRates['last-day'] = this.getErrorRates('last-day', 86400000)

    return {
      summary: {
        totalOperations: performanceData.summary.totalOperations,
        successRate: performanceData.summary.successRate,
        averageDuration: performanceData.summary.averageDuration,
        errorRates
      },
      performanceMetrics: includeRawMetrics ? performanceData.metrics : undefined,
      recentLogs: this.getRecentLogs('info', 50),
      configuration: this.config
    }
  }

  /**
   * Clear all monitoring data
   */
  static clearMonitoringData(): void {
    this.performanceMetrics = []
    this.errorRates.clear()
    this.logEntries = []
    this.activeOperations.clear()
    
    this.log('info', 'monitoring', 'All monitoring data cleared')
  }

  /**
   * Test helper: Get direct access to performance metrics for testing
   * @internal
   */
  static _getPerformanceMetricsArray(): PhasePerformanceMetrics[] {
    return this.performanceMetrics
  }

  /**
   * Test helper: Directly manipulate metrics for testing
   * @internal
   */
  static _setMetricEndTime(index: number, endTime: number): void {
    if (this.performanceMetrics[index]) {
      this.performanceMetrics[index].endTime = endTime
    }
  }

  /**
   * Internal logging method
   */
  private static log(
    level: 'debug' | 'info' | 'warn' | 'error',
    operation: string,
    message: string,
    data?: {
      tokenSource?: ReturnType<typeof PhaseMonitoring.sanitizeTokenSource>
      performance?: {
        duration: number
        success: boolean
        variableCount?: number
      }
      error?: {
        code: PhaseSDKErrorCode
        message: string
        isRetryable: boolean
        fallbackStrategy?: FallbackStrategy
      }
      metadata?: Record<string, unknown>
    }
  ): void {
    // Check if we should log this level
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 }
    if (levelPriority[level] < levelPriority[this.config.logLevel]) {
      return
    }

    const entry: PhaseLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      message: this.truncateMessage(message),
      tokenSource: data?.tokenSource,
      performance: data?.performance,
      error: data?.error ? {
        ...data.error,
        message: this.redactSensitiveInfo(data.error.message)
      } : undefined,
      metadata: data?.metadata
    }

    this.logEntries.push(entry)

    // Keep only recent log entries (last 1000)
    if (this.logEntries.length > 1000) {
      this.logEntries = this.logEntries.slice(-1000)
    }

    // Output to console based on level
    const consoleMessage = `[Phase.dev] ${operation}: ${message}`
    const consoleData = this.config.showTokenSources && data ? {
      ...data,
      error: data.error ? {
        ...data.error,
        message: this.redactSensitiveInfo(data.error.message)
      } : undefined
    } : undefined

    switch (level) {
      case 'debug':
        console.debug(consoleMessage, consoleData)
        break
      case 'info':
        console.log(consoleMessage, consoleData)
        break
      case 'warn':
        console.warn(consoleMessage, consoleData)
        break
      case 'error':
        console.error(consoleMessage, consoleData)
        break
    }
  }

  /**
   * Sanitize token source for logging (never expose actual token)
   */
  private static sanitizeTokenSource(tokenSource?: TokenSource): {
    source: TokenSource['source']
    path?: string
    hasToken: boolean
    tokenLength?: number
  } | undefined {
    if (!tokenSource) return undefined

    return {
      source: tokenSource.source,
      path: tokenSource.path,
      hasToken: !!tokenSource.token,
      tokenLength: tokenSource.token?.length || 0
    }
  }

  /**
   * Redact sensitive information from messages
   */
  private static redactSensitiveInfo(message: string): string {
    if (!message || typeof message !== 'string') {
      return message || ''
    }

    if (!this.config.redactSensitiveData) {
      return message
    }

    // Redact common sensitive patterns
    return message
      .replace(/token[=:\s]+[a-zA-Z0-9_-]{3,}/gi, 'token=[REDACTED]')
      .replace(/key[=:\s]+[a-zA-Z0-9_-]{3,}/gi, 'key=[REDACTED]')
      .replace(/secret[=:\s]+[a-zA-Z0-9_-]{3,}/gi, 'secret=[REDACTED]')
      .replace(/password[=:\s]+\S+/gi, 'password=[REDACTED]')
      .replace(/auth[=:\s]+[a-zA-Z0-9_-]{3,}/gi, 'auth=[REDACTED]')
  }

  /**
   * Truncate message if it exceeds maximum size
   */
  private static truncateMessage(message: string): string {
    if (message.length <= this.config.maxLogEntrySize) {
      return message
    }

    const truncated = message.substring(0, this.config.maxLogEntrySize - 20)
    return `${truncated}... [truncated]`
  }

  /**
   * Update error rates tracking
   */
  private static updateErrorRates(operation: string, error: PhaseSDKError): void {
    // This is handled in getErrorRates() method which calculates rates on demand
    // We could implement real-time tracking here if needed
  }

  /**
   * Get fallback strategy from error (for logging purposes)
   */
  private static getFallbackStrategyFromError(error: PhaseSDKError): FallbackStrategy | undefined {
    // This would typically come from the error handler, but we can infer it
    return this.inferFallbackStrategy(error.code)
  }

  /**
   * Infer fallback strategy from error code
   */
  private static inferFallbackStrategy(errorCode: PhaseSDKErrorCode): FallbackStrategy {
    switch (errorCode) {
      case PhaseSDKErrorCode.TOKEN_NOT_FOUND:
      case PhaseSDKErrorCode.AUTHENTICATION_FAILED:
      case PhaseSDKErrorCode.INVALID_TOKEN:
      case PhaseSDKErrorCode.APP_NOT_FOUND:
      case PhaseSDKErrorCode.ENVIRONMENT_NOT_FOUND:
        return FallbackStrategy.LOCAL_ENV_ONLY
      
      case PhaseSDKErrorCode.NETWORK_ERROR:
      case PhaseSDKErrorCode.RATE_LIMIT_EXCEEDED:
        return FallbackStrategy.RETRY_WITH_BACKOFF
      
      default:
        return FallbackStrategy.GRACEFUL_DEGRADATION
    }
  }
}