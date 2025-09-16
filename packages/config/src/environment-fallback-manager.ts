// Environment Fallback Manager with Token Source Tracking
import { PhaseSDKClient, PhaseSDKResult } from './phase-sdk-client'
import { PhaseTokenLoader, TokenSource } from './phase-token-loader'
import { PhaseErrorHandler, PhaseErrorHandlingResult, FallbackStrategy } from './phase-error-handler'
import { PhaseMonitoring } from './phase-monitoring'
// Note: File system operations are only available in Node.js environment

/**
 * Environment configuration result interface
 */
export interface EnvironmentConfig {
  // Core environment information
  nodeEnv: string
  isDevelopment: boolean
  isProduction: boolean
  isTest: boolean
  isStaging: boolean
  
  // Phase.dev integration status
  phaseAvailable: boolean
  phaseConfigLoaded: boolean
  phaseVariableCount: number
  
  // File loading information
  loadedFiles: string[]
  totalVariables: number
  
  // Phase.dev detailed status
  phaseStatus: {
    available: boolean
    success: boolean
    variableCount: number
    error?: string
    source: 'phase-sdk' | 'phase.dev' | 'fallback'
    tokenSource?: TokenSource
    fallbackStrategy?: FallbackStrategy
  }
  
  // Environment variables (merged from all sources)
  variables: Record<string, string>
  
  // Diagnostics and debugging information
  diagnostics: {
    tokenSourceDiagnostics?: Array<{
      source: TokenSource['source']
      path?: string
      exists: boolean
      hasToken: boolean
      isActive: boolean
    }>
    loadingOrder: string[]
    errorHandling?: PhaseErrorHandlingResult
    cacheInfo?: {
      cached: boolean
      age: number
      ttl: number
    }
  }
}

/**
 * Environment loading options
 */
export interface EnvironmentLoadingOptions {
  appName?: string
  environment?: string
  rootPath?: string
  forceReload?: boolean
  enablePhaseIntegration?: boolean
  fallbackToLocal?: boolean
  cacheTimeout?: number
}

/**
 * Local environment file types in loading order (first loaded = lowest priority)
 */
const LOCAL_ENV_FILES = [
  '.env',                    // Base configuration (lowest priority)
  '.env.local',              // Local overrides (never committed)
  '.env.development',        // Development environment
  '.env.staging',            // Staging environment  
  '.env.production',         // Production environment
  '.env.test'                // Test environment
] as const

/**
 * Environment Fallback Manager
 * 
 * Provides graceful degradation for Phase.dev integration with comprehensive fallback mechanisms:
 * - Automatic token loading from multiple sources
 * - Token source tracking for debugging
 * - Graceful fallback to local environment variables
 * - Comprehensive error handling and logging
 * - Merge strategies for Phase.dev and local variables
 */
export class EnvironmentFallbackManager {
  private static cache: Map<string, {
    config: EnvironmentConfig
    timestamp: number
    ttl: number
  }> = new Map()

  /**
   * Load environment configuration with comprehensive fallback support
   * @param options Environment loading options
   * @returns Promise resolving to complete environment configuration
   */
  static async loadWithFallback(options: EnvironmentLoadingOptions = {}): Promise<EnvironmentConfig> {
    const {
      appName = 'AI.C9d.Web',
      environment = process.env.NODE_ENV || 'development',
      rootPath = process.cwd(),
      forceReload = false,
      enablePhaseIntegration = true,
      fallbackToLocal = true,
      cacheTimeout = 5 * 60 * 1000 // 5 minutes
    } = options

    // Check cache first
    const cacheKey = `${appName}-${environment}-${rootPath}`
    if (!forceReload) {
      const cached = this.getCachedConfig(cacheKey)
      if (cached) {
        console.log(`[EnvironmentFallbackManager] Using cached configuration (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`)
        return cached.config
      }
    }

    const startTime = Date.now()
    const loadingOrder: string[] = []
    let tokenSourceDiagnostics: Array<{
      source: TokenSource['source']
      path?: string
      exists: boolean
      hasToken: boolean
      isActive: boolean
    }> = []

    console.log(`[EnvironmentFallbackManager] Loading environment configuration`)
    console.log(`[EnvironmentFallbackManager] App: ${appName}, Environment: ${environment}`)
    console.log(`[EnvironmentFallbackManager] Root path: ${rootPath}`)

    // Initialize base configuration
    let config: EnvironmentConfig = {
      nodeEnv: environment,
      isDevelopment: environment === 'development',
      isProduction: environment === 'production',
      isTest: environment === 'test',
      isStaging: environment === 'staging',
      phaseAvailable: false,
      phaseConfigLoaded: false,
      phaseVariableCount: 0,
      loadedFiles: [],
      totalVariables: 0,
      phaseStatus: {
        available: false,
        success: false,
        variableCount: 0,
        source: 'fallback'
      },
      variables: {},
      diagnostics: {
        loadingOrder,
        tokenSourceDiagnostics
      }
    }

    let phaseResult: PhaseSDKResult | null = null
    let errorHandling: PhaseErrorHandlingResult | null = null

    // Step 1: Try Phase.dev integration if enabled
    if (enablePhaseIntegration) {
      try {
        loadingOrder.push('Phase.dev SDK initialization')
        
        // Get token source diagnostics for debugging
        tokenSourceDiagnostics = await PhaseTokenLoader.getTokenSourceDiagnostics(rootPath)
        config.diagnostics.tokenSourceDiagnostics = tokenSourceDiagnostics
        
        const sdkClient = new PhaseSDKClient()
        const initialized = await sdkClient.initialize(appName, environment, rootPath)
        
        if (initialized) {
          loadingOrder.push('Phase.dev SDK secret retrieval')
          phaseResult = await sdkClient.getSecrets()
          
          if (phaseResult.success) {
            console.log(`[EnvironmentFallbackManager] Successfully loaded ${Object.keys(phaseResult.secrets).length} secrets from Phase.dev SDK`)
            console.log(`[EnvironmentFallbackManager] Token source: ${phaseResult.tokenSource?.source}`)
            
            config.phaseAvailable = true
            config.phaseConfigLoaded = true
            config.phaseVariableCount = Object.keys(phaseResult.secrets).length
            config.phaseStatus = {
              available: true,
              success: true,
              variableCount: Object.keys(phaseResult.secrets).length,
              source: 'phase-sdk',
              tokenSource: phaseResult.tokenSource
            }
            
            // Merge Phase.dev secrets into variables (Phase.dev has higher priority than local files)
            Object.assign(config.variables, phaseResult.secrets)
            loadingOrder.push(`Phase.dev secrets merged (${Object.keys(phaseResult.secrets).length} variables)`)
          } else {
            console.warn(`[EnvironmentFallbackManager] Phase.dev SDK failed: ${phaseResult.error}`)
            
            // Handle the error and determine fallback strategy
            const sdkError = {
              code: 'SDK_ERROR' as any,
              message: phaseResult.error || 'Unknown SDK error',
              isRetryable: false,
              tokenSource: phaseResult.tokenSource
            }
            
            errorHandling = PhaseErrorHandler.handleSDKError(sdkError, phaseResult.tokenSource, 'environment loading')
            config.diagnostics.errorHandling = errorHandling
            
            // Log fallback usage with monitoring
            PhaseMonitoring.logFallbackUsage(
              errorHandling.fallbackStrategy,
              errorHandling.userMessage,
              phaseResult.tokenSource,
              sdkError
            )
            
            config.phaseStatus = {
              available: !!phaseResult.tokenSource,
              success: false,
              variableCount: 0,
              error: phaseResult.error,
              source: 'fallback',
              tokenSource: phaseResult.tokenSource,
              fallbackStrategy: errorHandling.fallbackStrategy
            }
            
            loadingOrder.push(`Phase.dev failed: ${errorHandling.fallbackStrategy}`)
          }
        } else {
          console.warn(`[EnvironmentFallbackManager] Phase.dev SDK initialization failed`)
          
          const tokenSource = sdkClient.getTokenSource()
          config.phaseStatus = {
            available: !!tokenSource,
            success: false,
            variableCount: 0,
            error: 'SDK initialization failed',
            source: 'fallback',
            tokenSource: tokenSource || undefined
          }
          
          loadingOrder.push('Phase.dev SDK initialization failed')
        }
      } catch (error) {
        console.error(`[EnvironmentFallbackManager] Phase.dev integration error:`, error)
        
        // Handle the error
        errorHandling = PhaseErrorHandler.handleSDKError(error, null, 'environment loading')
        config.diagnostics.errorHandling = errorHandling
        
        // Log fallback usage with monitoring
        PhaseMonitoring.logFallbackUsage(
          errorHandling.fallbackStrategy,
          errorHandling.userMessage,
          undefined,
          errorHandling as any
        )
        
        config.phaseStatus = {
          available: false,
          success: false,
          variableCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          source: 'fallback',
          fallbackStrategy: errorHandling.fallbackStrategy
        }
        
        loadingOrder.push(`Phase.dev error: ${errorHandling.fallbackStrategy}`)
      }
    } else {
      loadingOrder.push('Phase.dev integration disabled')
    }

    // Step 2: Load local environment files (fallback or supplement)
    if (fallbackToLocal || !phaseResult?.success) {
      const localConfig = await this.loadLocalEnvironment(environment, rootPath)
      
      // Merge local variables (local files have lower priority than Phase.dev but higher than process.env defaults)
      const localVarCount = Object.keys(localConfig.variables).length
      
      // Only add variables that don't already exist from Phase.dev
      let addedLocalVars = 0
      for (const [key, value] of Object.entries(localConfig.variables)) {
        if (!(key in config.variables)) {
          config.variables[key] = value
          addedLocalVars++
        }
      }
      
      config.loadedFiles = localConfig.loadedFiles
      loadingOrder.push(`Local environment files loaded (${localVarCount} total, ${addedLocalVars} new variables)`)
      
      console.log(`[EnvironmentFallbackManager] Loaded ${localVarCount} variables from local files (${addedLocalVars} new)`)
      if (localConfig.loadedFiles.length > 0) {
        console.log(`[EnvironmentFallbackManager] Loaded files: ${localConfig.loadedFiles.join(', ')}`)
      }
    }

    // Step 3: Override with process.env (highest priority)
    let processEnvCount = 0
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined && value !== '') {
        const wasOverridden = key in config.variables
        config.variables[key] = value
        if (wasOverridden) {
          processEnvCount++
        }
      }
    }
    
    if (processEnvCount > 0) {
      loadingOrder.push(`Process environment overrides applied (${processEnvCount} variables)`)
      console.log(`[EnvironmentFallbackManager] Applied ${processEnvCount} process.env overrides`)
    }

    // Update final counts
    config.totalVariables = Object.keys(config.variables).length
    
    // Add cache information to diagnostics
    config.diagnostics.cacheInfo = {
      cached: false,
      age: 0,
      ttl: cacheTimeout
    }

    // Cache the result
    this.setCachedConfig(cacheKey, config, cacheTimeout)

    const loadTime = Date.now() - startTime
    
    // Log comprehensive configuration diagnostics with monitoring
    const diagnostics = {
      timestamp: new Date().toISOString(),
      tokenLoadingProcess: {
        checkedSources: (config.diagnostics.tokenSourceDiagnostics || []).map((source, index) => ({
          ...source,
          checkOrder: index + 1
        })),
        activeToken: config.phaseStatus.tokenSource ? {
          source: config.phaseStatus.tokenSource.source,
          path: config.phaseStatus.tokenSource.path,
          tokenLength: config.phaseStatus.tokenSource.token?.length || 0,
          isValid: true
        } : undefined,
        loadingTime: loadTime
      },
      sdkInitialization: {
        success: config.phaseStatus.success,
        duration: loadTime,
        appName,
        environment,
        error: config.phaseStatus.error
      },
      secretRetrieval: {
        attempted: config.phaseStatus.available,
        success: config.phaseStatus.success,
        duration: loadTime,
        variableCount: config.phaseVariableCount,
        error: config.phaseStatus.error
      },
      fallbackUsage: {
        triggered: !config.phaseStatus.success,
        strategy: config.phaseStatus.fallbackStrategy,
        reason: config.phaseStatus.error
      }
    }
    
    PhaseMonitoring.logConfigurationDiagnostics(diagnostics)
    
    console.log(`[EnvironmentFallbackManager] Environment loading completed in ${loadTime}ms`)
    console.log(`[EnvironmentFallbackManager] Total variables: ${config.totalVariables}`)
    console.log(`[EnvironmentFallbackManager] Phase.dev status: ${config.phaseStatus.success ? 'success' : 'fallback'}`)
    
    if (config.phaseStatus.tokenSource) {
      console.log(`[EnvironmentFallbackManager] Token source: ${config.phaseStatus.tokenSource.source}`)
    }

    return config
  }

  /**
   * Load local environment variables from .env files (server-side only)
   * @param environment Current environment (development, production, etc.)
   * @param rootPath Root path to search for .env files
   * @returns Local environment configuration
   */
  static async loadLocalEnvironment(environment: string = 'development', rootPath: string = process.cwd()): Promise<{
    variables: Record<string, string>
    loadedFiles: string[]
    errors: Array<{ file: string; error: string }>
  }> {
    const result = {
      variables: {} as Record<string, string>,
      loadedFiles: [] as string[],
      errors: [] as Array<{ file: string; error: string }>
    }

    // Only run on server-side (Node.js environment)
    if (typeof window !== 'undefined') {
      console.warn('[EnvironmentFallbackManager] File system access not available in browser environment');
      return result;
    }

    // Determine which .env files to load based on environment
    const envFiles = this.getEnvFilesToLoad(environment)
    
    console.log(`[EnvironmentFallbackManager] Loading local environment files for: ${environment}`)
    console.log(`[EnvironmentFallbackManager] Checking files: ${envFiles.join(', ')}`)

    try {
      // Dynamic imports to avoid bundling in client code
      const fs = await import('fs');
      const path = await import('path');
      const { config: dotenvConfig } = await import('dotenv');
      const { expand: dotenvExpand } = await import('dotenv-expand');

      // Get workspace root for loading root .env files
      const currentDir = process.cwd()
      let workspaceRoot: string
      
      try {
        // Try to access the private method for workspace root detection
        workspaceRoot = (PhaseTokenLoader as any)['findWorkspaceRoot']?.(currentDir) || currentDir
      } catch (error) {
        // Fallback to current directory if method is not available (e.g., in tests)
        workspaceRoot = currentDir
      }
      
      // Determine directories to check for .env files
      const dirsToCheck: Array<{ path: string; label: string }> = []
      
      // Always check workspace root first (lowest priority)
      if (workspaceRoot !== currentDir) {
        dirsToCheck.push({ path: workspaceRoot, label: 'workspace root' })
      }
      
      // Then check current directory (higher priority)
      dirsToCheck.push({ path: rootPath, label: 'current directory' })

      // Load files in order (later directories and files override earlier ones)
      for (const { path: dirPath, label } of dirsToCheck) {
        for (const envFile of envFiles) {
          const envPath = path.join(dirPath, envFile)
          
          if (fs.existsSync(envPath)) {
            try {
              // Use dotenv to parse the file without affecting process.env
              const parsed = dotenvConfig({ path: envPath, processEnv: {} })
              
              if (parsed.error) {
                result.errors.push({
                  file: `${label}/${envFile}`,
                  error: parsed.error.message
                })
                continue
              }
              
              if (parsed.parsed) {
                // First, merge the parsed values into our result
                Object.assign(result.variables, parsed.parsed)
                
                // Then expand variables using the complete context
                const expanded = dotenvExpand({ parsed: result.variables, processEnv: {} })
                
                if (expanded.error) {
                  result.errors.push({
                    file: `${label}/${envFile}`,
                    error: expanded.error.message
                  })
                  continue
                }
                
                // Update result with expanded values
                if (expanded.parsed) {
                  result.variables = expanded.parsed
                }
                
                const fileLabel = dirPath === workspaceRoot && workspaceRoot !== currentDir ? `${envFile} (workspace root)` : envFile
                result.loadedFiles.push(fileLabel)
                
                console.log(`[EnvironmentFallbackManager] Loaded ${Object.keys(parsed.parsed || {}).length} variables from ${fileLabel}`)
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              result.errors.push({
                file: `${label}/${envFile}`,
                error: errorMessage
              })
              console.warn(`[EnvironmentFallbackManager] Failed to load ${label}/${envFile}:`, errorMessage)
            }
          }
        }
      }
    } catch (error) {
      console.warn('[EnvironmentFallbackManager] File system modules not available, skipping .env file loading');
    }

    return result
  }

  /**
   * Merge Phase.dev secrets with local environment variables
   * @param phaseSecrets Secrets from Phase.dev
   * @param localVariables Local environment variables
   * @param tokenSource Token source information for logging
   * @returns Merged environment configuration
   */
  static mergeWithLocalEnv(
    phaseSecrets: Record<string, string>,
    localVariables: Record<string, string>,
    tokenSource?: TokenSource
  ): Record<string, string> {
    console.log(`[EnvironmentFallbackManager] Merging Phase.dev secrets with local environment`)
    console.log(`[EnvironmentFallbackManager] Phase.dev variables: ${Object.keys(phaseSecrets).length}`)
    console.log(`[EnvironmentFallbackManager] Local variables: ${Object.keys(localVariables).length}`)
    
    if (tokenSource) {
      console.log(`[EnvironmentFallbackManager] Token source: ${tokenSource.source}`)
    }

    // Start with local variables as base (lowest priority)
    const merged = { ...localVariables }
    
    // Override with Phase.dev secrets (higher priority)
    let overrideCount = 0
    for (const [key, value] of Object.entries(phaseSecrets)) {
      if (key in merged) {
        overrideCount++
      }
      merged[key] = value
    }
    
    console.log(`[EnvironmentFallbackManager] Merged ${Object.keys(merged).length} total variables`)
    console.log(`[EnvironmentFallbackManager] Phase.dev overrode ${overrideCount} local variables`)

    return merged
  }

  /**
   * Get appropriate .env files to load based on NODE_ENV
   * @param nodeEnv Current NODE_ENV value
   * @returns Array of .env file names in loading order (first loaded = lowest priority)
   */
  private static getEnvFilesToLoad(nodeEnv: string): string[] {
    const files = ['.env'] // Always load base .env first (lowest priority)
    
    // Add environment-specific file
    const envSpecificFile = `.env.${nodeEnv}`
    if (LOCAL_ENV_FILES.includes(envSpecificFile as any)) {
      files.push(envSpecificFile)
    }
    
    // Always try to load .env.local last (highest priority among files)
    files.push('.env.local')
    
    return files
  }

  /**
   * Get cached configuration if still valid
   * @param cacheKey Cache key
   * @returns Cached configuration or null
   */
  private static getCachedConfig(cacheKey: string): {
    config: EnvironmentConfig
    timestamp: number
  } | null {
    const cached = this.cache.get(cacheKey)
    
    if (!cached) {
      return null
    }
    
    const now = Date.now()
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(cacheKey)
      return null
    }
    
    // Update cache info in diagnostics
    cached.config.diagnostics.cacheInfo = {
      cached: true,
      age: now - cached.timestamp,
      ttl: cached.ttl
    }
    
    return cached
  }

  /**
   * Set cached configuration
   * @param cacheKey Cache key
   * @param config Configuration to cache
   * @param ttl Time to live in milliseconds
   */
  private static setCachedConfig(cacheKey: string, config: EnvironmentConfig, ttl: number): void {
    this.cache.set(cacheKey, {
      config: { ...config }, // Deep copy to avoid mutations
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Clear all cached configurations
   */
  static clearCache(): void {
    this.cache.clear()
    console.log(`[EnvironmentFallbackManager] Cache cleared`)
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  static getCacheStats(): {
    size: number
    keys: string[]
    oldestEntry?: number
    newestEntry?: number
  } {
    const now = Date.now()
    let oldestEntry: number | undefined
    let newestEntry: number | undefined
    
    for (const entry of this.cache.values()) {
      if (oldestEntry === undefined || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp
      }
      if (newestEntry === undefined || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp
      }
    }
    
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      oldestEntry: oldestEntry ? now - oldestEntry : undefined,
      newestEntry: newestEntry ? now - newestEntry : undefined
    }
  }

  /**
   * Create a minimal environment configuration for testing
   * @param variables Environment variables
   * @param options Additional options
   * @returns Minimal environment configuration
   */
  static createTestConfig(
    variables: Record<string, string> = {},
    options: Partial<EnvironmentConfig> = {}
  ): EnvironmentConfig {
    const nodeEnv = variables.NODE_ENV || 'test'
    
    return {
      nodeEnv,
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
      isTest: nodeEnv === 'test',
      isStaging: nodeEnv === 'staging',
      phaseAvailable: false,
      phaseConfigLoaded: false,
      phaseVariableCount: 0,
      loadedFiles: [],
      totalVariables: Object.keys(variables).length,
      phaseStatus: {
        available: false,
        success: false,
        variableCount: 0,
        source: 'fallback'
      },
      variables,
      diagnostics: {
        loadingOrder: ['test-config'],
        tokenSourceDiagnostics: []
      },
      ...options
    }
  }

  /**
   * Validate environment configuration
   * @param config Environment configuration to validate
   * @param requiredVars Required environment variables
   * @returns Validation result
   */
  static validateConfig(
    config: EnvironmentConfig,
    requiredVars: string[] = []
  ): {
    isValid: boolean
    missingVars: string[]
    errors: string[]
    warnings: string[]
  } {
    const missingVars: string[] = []
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check required variables
    for (const varName of requiredVars) {
      if (!config.variables[varName] || config.variables[varName].trim() === '') {
        missingVars.push(varName)
      }
    }
    
    // Check for common issues
    if (!config.phaseStatus.success && config.phaseStatus.available) {
      warnings.push('Phase.dev is available but failed to load secrets')
    }
    
    if (config.totalVariables === 0) {
      warnings.push('No environment variables loaded')
    }
    
    if (config.loadedFiles.length === 0 && !config.phaseStatus.success) {
      warnings.push('No .env files found and Phase.dev not available')
    }
    
    const isValid = missingVars.length === 0 && errors.length === 0
    
    return {
      isValid,
      missingVars,
      errors,
      warnings
    }
  }

  /**
   * Get diagnostic information for troubleshooting
   * @param config Environment configuration
   * @returns Diagnostic information
   */
  static getDiagnosticInfo(config: EnvironmentConfig): {
    summary: string
    details: Record<string, unknown>
    recommendations: string[]
  } {
    const recommendations: string[] = []
    
    // Analyze Phase.dev status
    if (!config.phaseStatus.available) {
      recommendations.push('Add PHASE_SERVICE_TOKEN to enable Phase.dev integration')
    } else if (!config.phaseStatus.success) {
      recommendations.push('Check Phase.dev configuration and token validity')
      if (config.phaseStatus.error) {
        recommendations.push(`Phase.dev error: ${config.phaseStatus.error}`)
      }
    }
    
    // Analyze local file loading
    if (config.loadedFiles.length === 0) {
      recommendations.push('Create .env.local file for local development overrides')
    }
    
    // Analyze variable count
    if (config.totalVariables < 5) {
      recommendations.push('Consider adding more environment variables for better configuration')
    }
    
    const summary = `Environment: ${config.nodeEnv}, Variables: ${config.totalVariables}, Phase.dev: ${config.phaseStatus.success ? 'active' : 'fallback'}`
    
    return {
      summary,
      details: {
        environment: config.nodeEnv,
        totalVariables: config.totalVariables,
        phaseStatus: config.phaseStatus,
        loadedFiles: config.loadedFiles,
        tokenSource: config.phaseStatus.tokenSource,
        cacheInfo: config.diagnostics.cacheInfo,
        loadingOrder: config.diagnostics.loadingOrder
      },
      recommendations
    }
  }
}