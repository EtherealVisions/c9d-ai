// Environment configuration utilities with Phase.dev integration and fallback support
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Environment variable loading priority:
 * 1. process.env (runtime environment variables)
 * 2. .env.local
 * 3. .env.{NODE_ENV} (e.g., .env.development, .env.production, .env.test)
 * 4. .env
 * 5. Phase.dev (if PHASE_SERVICE_TOKEN is available)
 * 6. Default values
 */

interface EnvConfig {
  [key: string]: string;
}

let envCache: EnvConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load environment variables from .env files
 * @param rootPath Root path to search for .env files
 * @returns Parsed environment variables
 */
function loadEnvFiles(rootPath: string = process.cwd()): EnvConfig {
  const env: EnvConfig = {};
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Define the order of .env files to load (later files override earlier ones)
  const envFiles = [
    '.env',
    `.env.${nodeEnv}`,
    '.env.local'
  ];

  for (const envFile of envFiles) {
    const envPath = join(rootPath, envFile);
    if (existsSync(envPath)) {
      try {
        const envContent = readFileSync(envPath, 'utf8');
        const parsed = parseEnvFile(envContent);
        Object.assign(env, parsed);
        console.log(`[Config] Loaded ${Object.keys(parsed).length} variables from ${envFile}`);
      } catch (error) {
        console.warn(`[Config] Failed to load ${envFile}:`, error instanceof Error ? error.message : 'Unknown error');
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
function parseEnvFile(content: string): EnvConfig {
  const env: EnvConfig = {};
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
 * Load and cache all environment variables
 * @param forceReload Force reload from files
 * @returns Combined environment variables
 */
function loadAllEnvVars(forceReload: boolean = false): EnvConfig {
  const now = Date.now();
  
  // Return cached values if still valid
  if (!forceReload && envCache && (now - cacheTimestamp) < CACHE_TTL) {
    return envCache;
  }

  // Start with process.env (highest priority)
  const allEnv: EnvConfig = { ...process.env as EnvConfig };
  
  // Load from .env files (lower priority)
  const fileEnv = loadEnvFiles();
  
  // Merge with file env (process.env takes precedence)
  const mergedEnv = {
    ...fileEnv,
    ...allEnv
  };

  // Cache the result
  envCache = mergedEnv;
  cacheTimestamp = now;

  console.log(`[Config] Loaded ${Object.keys(mergedEnv).length} total environment variables`);
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
 * Get Phase.dev service token from environment
 * @returns Phase.dev service token or null if not available
 */
export const getPhaseServiceToken = (): string | null => {
  return getOptionalEnvVar('PHASE_SERVICE_TOKEN') || null;
};

/**
 * Check if Phase.dev integration is available
 * @returns True if Phase.dev service token is available
 */
export const isPhaseDevAvailable = (): boolean => {
  return getPhaseServiceToken() !== null;
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
  
  return {
    nodeEnv,
    isDevelopment,
    isProduction,
    isTest,
    phaseServiceToken: getPhaseServiceToken(),
    isPhaseDevAvailable: isPhaseDevAvailable()
  };
};