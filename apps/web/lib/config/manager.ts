import { 
  loadFromPhase, 
  getPhaseConfig,
  EnvironmentFallbackManager,
  PhaseSDKError,
  PhaseSDKErrorCode
} from '@c9d/config';

/**
 * Configuration manager interface
 */
export interface ConfigManager {
  initialize(): Promise<void>;
  get(key: string): string | undefined;
  getAll(): Record<string, string>;
  refresh(): Promise<void>;
  isInitialized(): boolean;
}

/**
 * Configuration validation rules
 */
export interface ValidationRule {
  key: string;
  required: boolean;
  validator?: (value: string) => boolean;
  errorMessage?: string;
}

/**
 * Configuration manager options
 */
export interface ConfigManagerOptions {
  validationRules?: ValidationRule[];
  enableCaching?: boolean;
  cacheTTL?: number;
  fallbackToEnv?: boolean;
}

/**
 * Centralized configuration manager with Phase.dev integration
 */
export class CentralizedConfigManager implements ConfigManager {
  private config: Record<string, string> = {};
  private initialized: boolean = false;
  private validationRules: ValidationRule[] = [];
  private enableCaching: boolean = true;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes
  private fallbackToEnv: boolean = true;
  private lastRefresh: number = 0;
  private fallbackManager: EnvironmentFallbackManager;
  private lastError: Error | null = null;
  private lastPhaseError: Error | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(options: ConfigManagerOptions = {}) {
    this.validationRules = options.validationRules || [];
    this.enableCaching = options.enableCaching ?? true;
    this.cacheTTL = options.cacheTTL ?? this.cacheTTL;
    this.fallbackToEnv = options.fallbackToEnv ?? true;
    this.fallbackManager = new EnvironmentFallbackManager();
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    try {
      this.logInfo('Initializing configuration manager...');
      
      // Use the new EnvironmentFallbackManager to load configuration
      const result = await this.fallbackManager.loadEnvironment('AI.C9d.Web', 'development', {
        fallbackToLocal: this.fallbackToEnv,
        forceReload: true
      });
      
      if (result.success) {
        this.config = result.variables;
        this.logInfo(`Successfully loaded ${Object.keys(this.config).length} variables from ${result.source}`);
        
        if (result.tokenSource) {
          this.logInfo(`Token source: ${result.tokenSource.source}`);
        }
      } else {
        // Track the Phase.dev error for statistics
        this.lastPhaseError = new Error(result.error || 'Phase.dev configuration failed');
        
        if (this.fallbackToEnv) {
          this.logWarn('Phase.dev configuration failed, falling back to environment variables');
          this.config = { ...process.env } as Record<string, string>;
        } else {
          this.logError('Phase.dev configuration failed and fallback is disabled', this.lastPhaseError);
          this.lastError = this.lastPhaseError;
          throw this.lastPhaseError;
        }
      }

      // Validate required configuration (with fallback handling)
      try {
        this.validateConfiguration();
      } catch (error) {
        if (this.fallbackToEnv) {
          this.logWarn('Configuration validation failed, but fallback is enabled');
          // Continue with partial configuration
        } else {
          throw error;
        }
      }

      this.initialized = true;
      this.lastRefresh = Date.now();
      this.lastError = null;
      
      // Start health check monitoring
      this.startHealthCheckMonitoring();
      
      this.logInfo(`Successfully initialized with ${Object.keys(this.config).length} configuration variables`);
      
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error('Unknown initialization error');
      this.logError('Failed to initialize configuration manager', this.lastError);
      
      if (this.fallbackToEnv) {
        this.logWarn('Falling back to local environment variables');
        this.config = { ...process.env } as Record<string, string>;
        
        try {
          this.validateConfiguration();
          this.initialized = true;
          this.lastRefresh = Date.now();
        } catch (validationError) {
          this.lastError = validationError instanceof Error ? validationError : new Error('Validation failed');
          throw this.lastError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Get a configuration value by key
   * @param key Configuration key
   * @returns Configuration value or undefined
   */
  get(key: string): string | undefined {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized. Call initialize() first.');
    }

    // Check if cache needs refresh
    if (this.shouldRefreshCache()) {
      console.log('[ConfigManager] Cache expired, refreshing in background...');
      this.refresh().catch(error => {
        console.warn('[ConfigManager] Background refresh failed:', error);
      });
    }

    return this.config[key];
  }

  /**
   * Get all configuration values
   * @returns All configuration values
   */
  getAll(): Record<string, string> {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized. Call initialize() first.');
    }

    return { ...this.config };
  }

  /**
   * Refresh configuration from Phase.dev
   */
  async refresh(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized. Call initialize() first.');
    }

    // Store current config as backup
    const backupConfig = { ...this.config };

    try {
      this.logInfo('Refreshing configuration...');
      
      const result = await this.fallbackManager.loadEnvironment('AI.C9d.Web', 'development', {
        fallbackToLocal: this.fallbackToEnv,
        forceReload: true
      });
      
      if (result.success) {
        this.config = result.variables;
        this.validateConfiguration();
        this.lastError = null; // Clear error on successful refresh
        this.logInfo(`Configuration refreshed successfully from ${result.source}`);
      } else {
        throw new Error(result.error || 'Failed to refresh configuration');
      }

      this.lastRefresh = Date.now();
      
    } catch (error) {
      // Restore backup configuration on failure
      this.config = backupConfig;
      
      this.lastError = error instanceof Error ? error : new Error('Unknown refresh error');
      this.logError('Failed to refresh configuration', this.lastError);
      
      // Don't throw if we have fallback configuration
      if (this.fallbackToEnv) {
        this.logWarn('Refresh failed but continuing with existing configuration');
        return;
      }
      
      throw error;
    }
  }

  /**
   * Check if the configuration manager is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Add validation rules
   * @param rules Validation rules to add
   */
  addValidationRules(rules: ValidationRule[]): void {
    this.validationRules.push(...rules);
  }

  /**
   * Validate configuration against defined rules
   * @throws Error if validation fails
   */
  private validateConfiguration(): void {
    const errors: string[] = [];

    for (const rule of this.validationRules) {
      const value = this.config[rule.key];

      if (rule.required && !value) {
        errors.push(`Required configuration variable '${rule.key}' is missing`);
        continue;
      }

      if (value && rule.validator && !rule.validator(value)) {
        errors.push(rule.errorMessage || `Configuration variable '${rule.key}' failed validation`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Check if cache should be refreshed
   * @returns True if cache should be refreshed
   */
  private shouldRefreshCache(): boolean {
    if (!this.enableCaching) {
      return false;
    }

    return (Date.now() - this.lastRefresh) > this.cacheTTL;
  }

  /**
   * Get configuration statistics
   * @returns Configuration statistics
   */
  getStats(): {
    initialized: boolean;
    configCount: number;
    lastRefresh: Date;
    cacheEnabled: boolean;
    phaseConfigured: boolean;
    lastError: Error | null;
    healthy: boolean;
  } {
    return {
      initialized: this.initialized,
      configCount: Object.keys(this.config).length,
      lastRefresh: new Date(this.lastRefresh),
      cacheEnabled: this.enableCaching,
      phaseConfigured: true, // Always true with new SDK integration
      lastError: this.lastError || this.lastPhaseError,
      healthy: this.isHealthy()
    };
  }

  /**
   * Get health status of the configuration manager
   * @returns Health status information
   */
  getHealthStatus(): {
    healthy: boolean;
    initialized: boolean;
    lastError: Error | null;
    phaseHealth: any;
    configValidation: { valid: boolean; errors: string[] };
  } {
    const configValidation = this.validateConfigurationSafe();
    
    return {
      healthy: this.isHealthy(),
      initialized: this.initialized,
      lastError: this.lastError,
      phaseHealth: null, // Health status is now handled by the SDK
      configValidation
    };
  }

  /**
   * Perform a health check
   * @returns Promise resolving to health status
   */
  async performHealthCheck(): Promise<{
    healthy: boolean;
    checks: {
      initialization: boolean;
      phaseConnection: boolean;
      configValidation: boolean;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const checks = {
      initialization: this.initialized,
      phaseConnection: true,
      configValidation: true
    };

    // Check Phase.dev connection using new SDK
    if (this.initialized) {
      try {
        const result = await loadFromPhase(true);
        if (!result.success) {
          checks.phaseConnection = false;
          errors.push(`Phase.dev connection failed: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        checks.phaseConnection = false;
        errors.push(`Phase.dev connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Check configuration validation
    const validationResult = this.validateConfigurationSafe();
    if (!validationResult.valid) {
      checks.configValidation = false;
      errors.push(...validationResult.errors);
    }

    return {
      healthy: checks.initialization && checks.phaseConnection && checks.configValidation,
      checks,
      errors
    };
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Perform health check every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        if (!health.healthy) {
          this.logWarn(`Health check failed: ${health.errors.join(', ')}`);
        }
      } catch (error) {
        this.logError('Health check monitoring failed', error instanceof Error ? error : new Error('Unknown error'));
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop health check monitoring
   */
  private stopHealthCheckMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check if the configuration manager is healthy
   * @returns True if healthy
   */
  private isHealthy(): boolean {
    return this.initialized && this.lastError === null && this.lastPhaseError === null;
  }

  /**
   * Validate configuration safely without throwing
   * @returns Validation result
   */
  private validateConfigurationSafe(): { valid: boolean; errors: string[] } {
    try {
      this.validateConfiguration();
      return { valid: true, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      return { valid: false, errors: [errorMessage] };
    }
  }

  /**
   * Log info message with consistent formatting
   * @param message Message to log
   */
  private logInfo(message: string): void {
    console.log(`[ConfigManager] ${message}`);
  }

  /**
   * Log warning message with consistent formatting
   * @param message Message to log
   */
  private logWarn(message: string): void {
    console.warn(`[ConfigManager] ${message}`);
  }

  /**
   * Log error message with consistent formatting
   * @param message Message to log
   * @param error Error object
   */
  private logError(message: string, error: Error): void {
    console.error(`[ConfigManager] ${message}:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHealthCheckMonitoring();
    this.initialized = false;
    this.config = {};
    this.lastError = null;
  }
}

/**
 * Default validation rules for common configuration variables
 */
export const DEFAULT_VALIDATION_RULES: ValidationRule[] = [
  {
    key: 'DATABASE_URL',
    required: true,
    validator: (value: string) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
    errorMessage: 'DATABASE_URL must be a valid PostgreSQL connection string'
  },
  {
    key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    required: true,
    validator: (value: string) => value.startsWith('pk_'),
    errorMessage: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a valid Clerk publishable key'
  },
  {
    key: 'CLERK_SECRET_KEY',
    required: true,
    validator: (value: string) => value.startsWith('sk_'),
    errorMessage: 'CLERK_SECRET_KEY must be a valid Clerk secret key'
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    validator: (value: string) => value.startsWith('https://'),
    errorMessage: 'NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL'
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    validator: (value: string) => value.length > 50,
    errorMessage: 'SUPABASE_SERVICE_ROLE_KEY must be a valid service role key'
  }
];

/**
 * Create a singleton configuration manager instance
 */
let configManagerInstance: CentralizedConfigManager | null = null;

/**
 * Get the singleton configuration manager instance
 * @param options Configuration manager options (only used on first call)
 * @returns Configuration manager instance
 */
export function getConfigManager(options?: ConfigManagerOptions): CentralizedConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new CentralizedConfigManager({
      validationRules: DEFAULT_VALIDATION_RULES,
      ...options
    });
  }
  
  return configManagerInstance;
}

/**
 * Reset the singleton configuration manager (for testing purposes)
 */
export function resetConfigManager(): void {
  configManagerInstance = null;
}

/**
 * Initialize the global configuration manager
 * @param options Configuration manager options
 * @returns Promise resolving to the initialized configuration manager
 */
export async function initializeGlobalConfig(options?: ConfigManagerOptions): Promise<CentralizedConfigManager> {
  const manager = getConfigManager(options);
  
  if (!manager.isInitialized()) {
    await manager.initialize();
  }
  
  return manager;
}

/**
 * Get a configuration value using the global configuration manager
 * @param key Configuration key
 * @returns Configuration value or undefined
 */
export function getConfig(key: string): string | undefined {
  const manager = getConfigManager();
  
  if (!manager.isInitialized()) {
    throw new Error('Global configuration manager not initialized. Call initializeGlobalConfig() first.');
  }
  
  return manager.get(key);
}

/**
 * Get all configuration values using the global configuration manager
 * @returns All configuration values
 */
export function getAllConfig(): Record<string, string> {
  const manager = getConfigManager();
  
  if (!manager.isInitialized()) {
    throw new Error('Global configuration manager not initialized. Call initializeGlobalConfig() first.');
  }
  
  return manager.getAll();
}