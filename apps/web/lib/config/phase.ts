// Import fetch - use built-in fetch in modern environments
import fetch from 'node-fetch';

/**
 * Configuration interface for Phase.dev integration
 */
export interface PhaseConfig {
  serviceToken: string;
  appName: string;
  environment?: string;
}

/**
 * Retry configuration for Phase.dev API calls
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Error types for Phase.dev integration
 */
export enum PhaseErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Custom error class for Phase.dev operations
 */
export class PhaseError extends Error {
  public readonly type: PhaseErrorType;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    type: PhaseErrorType,
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'PhaseError';
    this.type = type;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.timestamp = new Date();
  }
}

/**
 * Interface for environment variable loader
 */
export interface EnvironmentLoader {
  loadEnvironment(config: PhaseConfig): Promise<Record<string, string>>;
  getCachedEnvironment(): Record<string, string>;
}

/**
 * Phase.dev API client for loading environment variables
 */
export class PhaseEnvironmentLoader implements EnvironmentLoader {
  private cache: Record<string, string> = {};
  private cacheTimestamp: number = 0;
  private readonly cacheTTL: number = 5 * 60 * 1000; // 5 minutes
  private readonly baseUrl: string = 'https://console.phase.dev/api';
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };
  private lastError: PhaseError | null = null;

  /**
   * Load environment variables from Phase.dev
   * @param config Phase.dev configuration
   * @returns Promise resolving to environment variables
   */
  async loadEnvironment(config: PhaseConfig): Promise<Record<string, string>> {
    try {
      // Check cache first
      if (this.isCacheValid()) {
        this.logInfo('Using cached environment variables');
        return this.cache;
      }

      this.logInfo('Fetching environment variables from Phase.dev');
      
      const envVars = await this.loadWithRetry(config);
      
      // Update cache
      this.cache = envVars;
      this.cacheTimestamp = Date.now();
      this.lastError = null; // Clear any previous errors

      this.logInfo(`Successfully loaded ${Object.keys(envVars).length} environment variables`);
      return envVars;

    } catch (error) {
      const phaseError = this.normalizeError(error);
      this.lastError = phaseError;
      this.logError('Failed to load environment variables', phaseError);
      
      // Return cached data if available and error is retryable
      if (Object.keys(this.cache).length > 0 && phaseError.retryable) {
        this.logWarn('Falling back to cached environment variables due to retryable error');
        return this.cache;
      }
      
      throw phaseError;
    }
  }

  /**
   * Load environment variables with retry logic
   * @param config Phase.dev configuration
   * @returns Promise resolving to environment variables
   */
  private async loadWithRetry(config: PhaseConfig): Promise<Record<string, string>> {
    let lastError: PhaseError | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt);
          this.logInfo(`Retrying Phase.dev API call (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}) after ${delay}ms delay`);
          await this.sleep(delay);
        }

        const envVars = await this.makeApiCall(config);
        
        if (attempt > 0) {
          this.logInfo(`Phase.dev API call succeeded on attempt ${attempt + 1}`);
        }
        
        return envVars;

      } catch (error) {
        const phaseError = this.normalizeError(error);
        lastError = phaseError;

        // Don't retry for non-retryable errors
        if (!phaseError.retryable) {
          this.logError(`Non-retryable error encountered: ${phaseError.type}`, phaseError);
          throw phaseError;
        }

        // Don't retry on the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          this.logError(`All retry attempts exhausted (${this.retryConfig.maxRetries + 1} attempts)`, phaseError);
          throw phaseError;
        }

        this.logWarn(`Retryable error on attempt ${attempt + 1}: ${phaseError.message}`);
      }
    }

    throw lastError || new PhaseError('Unknown error during retry attempts', PhaseErrorType.UNKNOWN);
  }

  /**
   * Make the actual API call to Phase.dev
   * @param config Phase.dev configuration
   * @returns Promise resolving to environment variables
   */
  private async makeApiCall(config: PhaseConfig): Promise<Record<string, string>> {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${this.baseUrl}/v1/secrets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.serviceToken}`,
          'Content-Type': 'application/json',
          'X-App-Name': config.appName,
          ...(config.environment && { 'X-Environment': config.environment })
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.createErrorFromResponse(response);
      }

      const data = await response.json() as any;
      const secrets = data?.secrets || [];
      
      // Transform the response into a key-value object
      const envVars: Record<string, string> = {};
      if (Array.isArray(secrets)) {
        secrets.forEach((secret: any) => {
          if (secret?.key && secret?.value) {
            envVars[secret.key] = secret.value;
          }
        });
      }

      return envVars;

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new PhaseError('Request timeout', PhaseErrorType.TIMEOUT, undefined, true);
      }
      
      // If it's already a PhaseError, re-throw it
      if (error instanceof PhaseError) {
        throw error;
      }
      
      // Normalize other errors (including fetch network errors)
      throw this.normalizeError(error);
    }
  }

  /**
   * Get cached environment variables
   * @returns Cached environment variables
   */
  getCachedEnvironment(): Record<string, string> {
    return { ...this.cache };
  }

  /**
   * Check if cache is still valid
   * @returns True if cache is valid
   */
  private isCacheValid(): boolean {
    return Object.keys(this.cache).length > 0 && 
           (Date.now() - this.cacheTimestamp) < this.cacheTTL;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache = {};
    this.cacheTimestamp = 0;
  }

  /**
   * Get the last error that occurred
   * @returns Last error or null
   */
  getLastError(): PhaseError | null {
    return this.lastError;
  }

  /**
   * Get health status of the Phase.dev integration
   * @returns Health status information
   */
  getHealthStatus(): {
    healthy: boolean;
    lastError: PhaseError | null;
    cacheValid: boolean;
    lastSuccessfulFetch: Date | null;
  } {
    return {
      healthy: this.lastError === null || (this.lastError.retryable && this.isCacheValid()),
      lastError: this.lastError,
      cacheValid: this.isCacheValid(),
      lastSuccessfulFetch: this.cacheTimestamp > 0 ? new Date(this.cacheTimestamp) : null
    };
  }

  /**
   * Calculate delay for retry attempts using exponential backoff
   * @param attempt Attempt number (0-based)
   * @returns Delay in milliseconds
   */
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   * @param ms Milliseconds to sleep
   * @returns Promise that resolves after the delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Normalize various error types into PhaseError
   * @param error Original error
   * @returns Normalized PhaseError
   */
  private normalizeError(error: any): PhaseError {
    if (error instanceof PhaseError) {
      return error;
    }

    if (error instanceof Error) {
      // Handle fetch errors
      if (error.name === 'AbortError') {
        return new PhaseError('Request timeout', PhaseErrorType.TIMEOUT, undefined, true);
      }

      // Handle network errors
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return new PhaseError(`Network error: ${error.message}`, PhaseErrorType.NETWORK, undefined, true);
      }

      // Handle other errors
      return new PhaseError(error.message, PhaseErrorType.UNKNOWN, undefined, false);
    }

    return new PhaseError('Unknown error occurred', PhaseErrorType.UNKNOWN, undefined, false);
  }

  /**
   * Create PhaseError from HTTP response
   * @param response HTTP response
   * @returns PhaseError
   */
  private createErrorFromResponse(response: any): PhaseError {
    const statusCode = response.status;
    const statusText = response.statusText;

    switch (statusCode) {
      case 401:
        return new PhaseError(
          `Authentication failed: ${statusText}`,
          PhaseErrorType.AUTHENTICATION,
          statusCode,
          false
        );
      case 429:
        return new PhaseError(
          `Rate limit exceeded: ${statusText}`,
          PhaseErrorType.RATE_LIMIT,
          statusCode,
          true
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new PhaseError(
          `Server error: ${statusCode} ${statusText}`,
          PhaseErrorType.SERVER_ERROR,
          statusCode,
          true
        );
      default:
        return new PhaseError(
          `API error: ${statusCode} ${statusText}`,
          PhaseErrorType.UNKNOWN,
          statusCode,
          statusCode >= 500
        );
    }
  }

  /**
   * Log info message with consistent formatting
   * @param message Message to log
   */
  private logInfo(message: string): void {
    console.log(`[Phase.dev] ${message}`);
  }

  /**
   * Log warning message with consistent formatting
   * @param message Message to log
   */
  private logWarn(message: string): void {
    console.warn(`[Phase.dev] ${message}`);
  }

  /**
   * Log error message with consistent formatting and error details
   * @param message Message to log
   * @param error Error object
   */
  private logError(message: string, error: PhaseError): void {
    console.error(`[Phase.dev] ${message}:`, {
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
      timestamp: error.timestamp.toISOString()
    });
  }
}

/**
 * Load environment variables with comprehensive fallback logic
 * @param config Phase.dev configuration
 * @param fallbackToLocal Whether to fallback to local environment variables
 * @returns Promise resolving to environment variables
 */
export async function loadEnvironmentWithFallback(
  config: PhaseConfig,
  fallbackToLocal: boolean = true
): Promise<Record<string, string>> {
  const loader = new PhaseEnvironmentLoader();
  
  // Load local environment variables first (from .env files and process.env)
  const localEnv = await loadLocalEnvironmentVariables();
  
  try {
    // Try to load from Phase.dev
    const phaseEnv = await loader.loadEnvironment(config);
    
    // Merge environment variables with proper precedence:
    // 1. process.env (highest priority - runtime environment)
    // 2. Phase.dev variables (medium priority - remote configuration)
    // 3. Local .env files (lowest priority - local fallback)
    const mergedEnv = {
      ...localEnv.fileEnv,      // .env files (lowest priority)
      ...phaseEnv,              // Phase.dev (medium priority)
      ...localEnv.processEnv    // process.env (highest priority)
    };
    
    console.log(`[Phase.dev] Successfully loaded environment with ${Object.keys(phaseEnv).length} Phase.dev variables, ${Object.keys(localEnv.fileEnv).length} file variables, and ${Object.keys(localEnv.processEnv).length} process variables`);
    return mergedEnv;
    
  } catch (error) {
    const phaseError = error instanceof PhaseError ? error : new PhaseError(
      error instanceof Error ? error.message : 'Unknown error',
      PhaseErrorType.UNKNOWN
    );

    console.error('[Phase.dev] Failed to load from Phase.dev:', {
      type: phaseError.type,
      message: phaseError.message,
      retryable: phaseError.retryable,
      statusCode: phaseError.statusCode
    });

    if (!fallbackToLocal) {
      throw phaseError;
    }
    
    console.warn('[Phase.dev] Falling back to local environment variables only');
    
    // Fallback to local environment variables only
    const fallbackEnv = {
      ...localEnv.fileEnv,
      ...localEnv.processEnv
    };
    
    console.log(`[Phase.dev] Using ${Object.keys(fallbackEnv).length} local environment variables as fallback`);
    return fallbackEnv;
  }
}

/**
 * Load local environment variables from .env files and process.env
 * @returns Object containing file-based and process environment variables
 */
async function loadLocalEnvironmentVariables(): Promise<{
  fileEnv: Record<string, string>;
  processEnv: Record<string, string>;
}> {
  const processEnv = { ...process.env } as Record<string, string>;
  const fileEnv = await loadEnvFiles();
  
  return { fileEnv, processEnv };
}

/**
 * Load environment variables from .env files
 * @param rootPath Root path to search for .env files
 * @returns Parsed environment variables from files
 */
async function loadEnvFiles(rootPath: string = process.cwd()): Promise<Record<string, string>> {
  // Try to use the shared config package if available
  try {
    const { getAllEnvVars } = await import('@c9d/config');
    return getAllEnvVars(true); // Force reload to get fresh data
  } catch (error) {
    // Fallback to manual loading if shared package is not available
    console.warn('[Phase.dev] Shared config package not available, using manual .env loading');
    return loadEnvFilesManually(rootPath);
  }
}

/**
 * Manually load environment variables from .env files
 * @param rootPath Root path to search for .env files
 * @returns Parsed environment variables
 */
async function loadEnvFilesManually(rootPath: string): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Define the order of .env files to load (later files override earlier ones)
  const envFiles = [
    '.env',
    `.env.${nodeEnv}`,
    '.env.local'
  ];

  // Dynamic import for Node.js modules
  const fs = await import('fs');
  const path = await import('path');

  for (const envFile of envFiles) {
    const envPath = path.join(rootPath, envFile);
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const parsed = parseEnvFileContent(envContent);
        Object.assign(env, parsed);
        console.log(`[Phase.dev] Loaded ${Object.keys(parsed).length} variables from ${envFile}`);
      } catch (error) {
        console.warn(`[Phase.dev] Failed to load ${envFile}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  return env;
}

/**
 * Parse .env file content
 * @param content File content
 * @returns Parsed environment variables
 */
function parseEnvFileContent(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Parse key=value pairs
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, equalIndex).trim();
    let value = trimmedLine.slice(equalIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

/**
 * Validate Phase.dev configuration
 * @param config Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validatePhaseConfig(config: Partial<PhaseConfig>): asserts config is PhaseConfig {
  if (!config.serviceToken) {
    throw new Error('Phase.dev service token is required (PHASE_SERVICE_TOKEN)');
  }
  
  if (!config.appName || config.appName.trim() === '') {
    throw new Error('Phase.dev app name is required');
  }
  
  if (config.serviceToken.length < 10) {
    throw new Error('Phase.dev service token appears to be invalid (too short)');
  }
}

/**
 * Create Phase.dev configuration from environment variables
 * @returns Phase.dev configuration
 */
export function createPhaseConfigFromEnv(): PhaseConfig | null {
  const serviceToken = process.env.PHASE_SERVICE_TOKEN;
  
  if (!serviceToken) {
    return null;
  }
  
  return {
    serviceToken,
    appName: 'AI.C9d.Web',
    environment: process.env.NODE_ENV || 'development'
  };
}