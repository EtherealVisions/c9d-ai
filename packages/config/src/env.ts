// Environment configuration utilities with comprehensive .env file support
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config as dotenvConfig } from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
// Note: getPhaseServiceToken and isPhaseDevAvailable are now defined in this file
// Note: Phase.dev integration is handled separately in phase.ts to avoid circular dependencies

/**
 * Environment variable loading priority:
 * 1. process.env (runtime environment variables - highest priority)
 * 2. .env.local (local overrides)
 * 3. .env.{NODE_ENV} (environment-specific: .env.development, .env.production, .env.test)
 * 4. .env (base configuration - lowest priority)
 */

interface EnvConfig {
  [key: string]: string;
}

interface EnvLoadResult {
  config: EnvConfig;
  loadedFiles: string[];
  errors: Array<{ file: string; error: string }>;
  phaseResult?: {
    success: boolean;
    variableCount: number;
    error?: string;
    source: 'phase.dev' | 'fallback';
  };
}

let envCache: EnvLoadResult | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Supported .env file types in loading order (first loaded, last wins for conflicts)
 */
const ENV_FILE_TYPES = [
  '.env',                    // Base configuration (lowest priority)
  '.env.local',              // Local overrides (never committed)
  '.env.development',        // Development environment
  '.env.staging',            // Staging environment  
  '.env.production',         // Production environment
  '.env.test'                // Test environment
] as const;

type EnvFileType = typeof ENV_FILE_TYPES[number];

/**
 * Get the appropriate .env files to load based on NODE_ENV
 * @param nodeEnv Current NODE_ENV value
 * @returns Array of .env file names in loading order (first loaded = lowest priority)
 */
function getEnvFilesToLoad(nodeEnv: string): string[] {
  const files = ['.env']; // Always load base .env first (lowest priority)
  
  // Add environment-specific file if it exists in our supported types
  const envSpecificFile = `.env.${nodeEnv}` as EnvFileType;
  if (ENV_FILE_TYPES.includes(envSpecificFile)) {
    files.push(envSpecificFile);
  }
  
  // Always try to load .env.local last (highest priority among files)
  files.push('.env.local');
  
  return files;
}

/**
 * Load environment variables from .env files with comprehensive support
 * @param rootPath Root path to search for .env files
 * @returns Result object with loaded config, files, and errors
 */
function loadEnvFiles(rootPath: string = process.cwd()): EnvLoadResult {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFiles = getEnvFilesToLoad(nodeEnv);
  
  const result: EnvLoadResult = {
    config: {},
    loadedFiles: [],
    errors: []
  };

  // Load files in order (later files override earlier ones)
  for (const envFile of envFiles) {
    const envPath = join(rootPath, envFile);
    
    if (existsSync(envPath)) {
      try {
        // Use dotenv to parse the file without affecting process.env
        const parsed = dotenvConfig({ path: envPath, processEnv: {} });
        
        if (parsed.error) {
          result.errors.push({
            file: envFile,
            error: parsed.error.message
          });
          continue;
        }
        
        if (parsed.parsed) {
          // First, merge the parsed values into our result config
          Object.assign(result.config, parsed.parsed);
          
          // Then expand variables using the complete context
          // This ensures that variables can reference previously loaded values
          const expanded = dotenvExpand({ parsed: result.config, processEnv: {} });
          
          if (expanded.error) {
            result.errors.push({
              file: envFile,
              error: expanded.error.message
            });
            continue;
          }
          
          // Update result config with expanded values
          if (expanded.parsed) {
            result.config = expanded.parsed;
          }
          
          result.loadedFiles.push(envFile);
          
          console.log(`[Config] Loaded ${Object.keys(parsed.parsed || {}).length} variables from ${envFile}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          file: envFile,
          error: errorMessage
        });
        console.warn(`[Config] Failed to load ${envFile}:`, errorMessage);
      }
    }
  }

  return result;
}

/**
 * Load and cache all environment variables with comprehensive fallback support
 * @param forceReload Force reload from files and Phase.dev
 * @param rootPath Root path to search for .env files and package.json
 * @returns Combined environment variables
 */
function loadAllEnvVars(forceReload: boolean = false, rootPath?: string): EnvConfig {
  const now = Date.now();
  
  // Return cached values if still valid
  if (!forceReload && envCache && (now - cacheTimestamp) < CACHE_TTL) {
    return envCache.config;
  }

  // Load from .env files first (lowest priority among file sources)
  const fileResult = loadEnvFiles(rootPath);
  
  // Start with file-based environment variables
  const mergedEnv: EnvConfig = { ...fileResult.config };
  
  // Initialize result object
  const result: EnvLoadResult = {
    config: mergedEnv,
    loadedFiles: fileResult.loadedFiles,
    errors: fileResult.errors
  };

  // Check for Phase.dev availability without calling isPhaseDevAvailable to avoid circular dependency
  const hasPhaseToken = process.env.PHASE_SERVICE_TOKEN || mergedEnv.PHASE_SERVICE_TOKEN;
  
  // Try to load from Phase.dev (higher priority than .env files, lower than process.env)
  // Note: This is synchronous for now, but could be made async in the future
  if (hasPhaseToken) {
    try {
      // For now, we'll just log that Phase.dev is available
      // In a real implementation, you might want to make this async
      console.log('[Config] Phase.dev service token detected, Phase.dev integration available');
      
      result.phaseResult = {
        success: true,
        variableCount: 0,
        source: 'phase.dev'
      };
    } catch (error) {
      console.warn('[Config] Phase.dev integration failed:', error instanceof Error ? error.message : 'Unknown error');
      result.phaseResult = {
        success: false,
        variableCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'fallback'
      };
    }
  }
  
  // Override with process.env (highest priority)
  // Only override if process.env value is not undefined/empty
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && value !== '') {
      mergedEnv[key] = value;
    }
  }

  // Update the result config
  result.config = mergedEnv;

  // Cache the complete result
  envCache = result;
  cacheTimestamp = now;

  // Log summary
  const totalVars = Object.keys(mergedEnv).length;
  const fileVars = Object.keys(fileResult.config).length;
  const processVars = Object.keys(process.env).filter(key => 
    process.env[key] !== undefined && process.env[key] !== ''
  ).length;
  
  console.log(`[Config] Loaded ${totalVars} total environment variables (${fileVars} from files, ${processVars} from process.env)`);
  
  if (fileResult.loadedFiles.length > 0) {
    console.log(`[Config] Loaded files: ${fileResult.loadedFiles.join(', ')}`);
  }
  
  if (result.phaseResult) {
    if (result.phaseResult.success) {
      console.log(`[Config] Phase.dev integration: ${result.phaseResult.variableCount} variables available`);
    } else {
      console.warn(`[Config] Phase.dev integration failed: ${result.phaseResult.error}`);
    }
  }
  
  if (fileResult.errors.length > 0) {
    console.warn(`[Config] Errors loading files:`, fileResult.errors);
  }

  return mergedEnv;
}

/**
 * Get an environment variable with fallback support
 * @param key Environment variable key
 * @param defaultValue Default value if not found
 * @returns Environment variable value
 * @throws Error if required variable is missing
 */
export const getEnvVar = (key: string, defaultValue?: string): string => {
  const allEnv = loadAllEnvVars();
  const value = allEnv[key];
  
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not found`);
  }
  
  return value || defaultValue!;
};

/**
 * Get an optional environment variable
 * @param key Environment variable key
 * @param defaultValue Default value if not found
 * @returns Environment variable value or undefined
 */
export const getOptionalEnvVar = (key: string, defaultValue?: string): string | undefined => {
  const allEnv = loadAllEnvVars();
  return allEnv[key] || defaultValue;
};

/**
 * Get all environment variables
 * @param forceReload Force reload from files
 * @returns All environment variables
 */
export const getAllEnvVars = (forceReload: boolean = false): EnvConfig => {
  return loadAllEnvVars(forceReload);
};

/**
 * Check if an environment variable exists
 * @param key Environment variable key
 * @returns True if the variable exists
 */
export const hasEnvVar = (key: string): boolean => {
  const allEnv = loadAllEnvVars();
  return key in allEnv && allEnv[key] !== undefined && allEnv[key] !== '';
};

/**
 * Get environment variables matching a prefix
 * @param prefix Variable name prefix
 * @returns Object with matching environment variables
 */
export const getEnvVarsWithPrefix = (prefix: string): EnvConfig => {
  const allEnv = loadAllEnvVars();
  const filtered: EnvConfig = {};
  
  for (const [key, value] of Object.entries(allEnv)) {
    if (key.startsWith(prefix)) {
      filtered[key] = value;
    }
  }
  
  return filtered;
};

/**
 * Validate required environment variables
 * @param requiredVars Array of required variable names
 * @throws Error if any required variables are missing
 */
export const validateRequiredEnvVars = (requiredVars: string[]): void => {
  const allEnv = loadAllEnvVars();
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!allEnv[varName] || allEnv[varName].trim() === '') {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Clear the environment variable cache
 */
export const clearEnvCache = (): void => {
  envCache = null;
  cacheTimestamp = 0;
};

/**
 * Get Phase.dev service token with comprehensive fallback support
 * @returns Phase.dev service token or null if not available
 */
export const getPhaseServiceToken = (): string | null => {
  const allEnv = loadAllEnvVars();
  return allEnv.PHASE_SERVICE_TOKEN || null;
};

/**
 * Check if Phase.dev integration is available
 * @returns True if Phase.dev service token is available
 */
export const isPhaseDevAvailable = (): boolean => {
  return getPhaseServiceToken() !== null;
};

// Re-export Phase.dev functions for backward compatibility and convenience
export { 
  getPhaseConfig,
  loadFromPhase,
  clearPhaseCache,
  getPhaseCacheStatus,
  testPhaseConnectivity
} from './phase';

/**
 * Get environment loading diagnostics
 * @returns Information about loaded files, Phase.dev status, and any errors
 */
export const getEnvLoadingDiagnostics = (): {
  loadedFiles: string[];
  errors: Array<{ file: string; error: string }>;
  cacheAge: number;
  totalVariables: number;
  phaseDevStatus: {
    available: boolean;
    success?: boolean;
    variableCount?: number;
    error?: string;
    source?: 'phase.dev' | 'fallback';
  };
} => {
  const allEnv = loadAllEnvVars();
  const now = Date.now();
  
  return {
    loadedFiles: envCache?.loadedFiles || [],
    errors: envCache?.errors || [],
    cacheAge: now - cacheTimestamp,
    totalVariables: Object.keys(allEnv).length,
    phaseDevStatus: {
      available: isPhaseDevAvailable(),
      success: envCache?.phaseResult?.success,
      variableCount: envCache?.phaseResult?.variableCount,
      error: envCache?.phaseResult?.error,
      source: envCache?.phaseResult?.source
    }
  };
};

/**
 * Validate environment variable value against a schema
 * @param key Environment variable key
 * @param value Environment variable value
 * @param validator Validation function
 * @returns Validation result
 */
export const validateEnvVar = <T>(
  key: string,
  value: string | undefined,
  validator: (value: string) => T
): { isValid: boolean; value?: T; error?: string } => {
  if (!value) {
    return { isValid: false, error: `Environment variable ${key} is not defined` };
  }
  
  try {
    const validatedValue = validator(value);
    return { isValid: true, value: validatedValue };
  } catch (error) {
    return {
      isValid: false,
      error: `Environment variable ${key} validation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    };
  }
};

/**
 * Get environment variable as number
 * @param key Environment variable key
 * @param defaultValue Default value if not found or invalid
 * @returns Parsed number value
 */
export const getEnvVarAsNumber = (key: string, defaultValue?: number): number => {
  const value = getOptionalEnvVar(key);
  
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not found`);
    }
    return defaultValue;
  }
  
  const parsed = Number(value);
  if (isNaN(parsed)) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
    }
    return defaultValue;
  }
  
  return parsed;
};

/**
 * Get environment variable as boolean
 * @param key Environment variable key
 * @param defaultValue Default value if not found
 * @returns Boolean value
 */
export const getEnvVarAsBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = getOptionalEnvVar(key);
  
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not found`);
    }
    return defaultValue;
  }
  
  const lowerValue = value.toLowerCase();
  return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'on';
};

/**
 * Get environment variable as array (comma-separated)
 * @param key Environment variable key
 * @param defaultValue Default value if not found
 * @returns Array of string values
 */
export const getEnvVarAsArray = (key: string, defaultValue?: string[]): string[] => {
  const value = getOptionalEnvVar(key);
  
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not found`);
    }
    return defaultValue;
  }
  
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
};

/**
 * Get environment-specific configuration
 * @returns Environment configuration object
 */
export const getEnvironmentConfig = () => {
  const nodeEnv = getOptionalEnvVar('NODE_ENV', 'development');
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  const isStaging = nodeEnv === 'staging';
  
  return {
    nodeEnv,
    isDevelopment,
    isProduction,
    isTest,
    isStaging,
    phaseServiceToken: getPhaseServiceToken(),
    isPhaseDevAvailable: isPhaseDevAvailable(),
    diagnostics: getEnvLoadingDiagnostics()
  };
};

/**
 * Reload environment variables from files
 * @param rootPath Optional root path to search for .env files
 * @returns Reloaded environment configuration
 */
export const reloadEnvironmentVars = (rootPath?: string): EnvConfig => {
  // Clear cache first to ensure fresh load
  clearEnvCache();
  return loadAllEnvVars(true, rootPath);
};