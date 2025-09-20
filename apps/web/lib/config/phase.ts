/**
 * Edge-safe Phase.dev configuration wrapper
 * This module provides Phase.dev integration that works in Edge Runtime
 */

import { getEdgeConfig, getConfigValue } from './edge-config';

// Re-export edge-safe functionality
export { getEdgeConfig, getConfigValue, getAppConfig } from './edge-config';

/**
 * Edge-safe function to check if Phase.dev is configured
 */
export function isPhaseConfigured(): boolean {
  const token = getConfigValue('PHASE_SERVICE_TOKEN');
  return !!token && token.length > 0;
}

/**
 * Edge-safe configuration loading
 * In Edge Runtime, we can only use environment variables that are already loaded
 */
export async function loadEnvironmentConfig() {
  const config = getEdgeConfig();
  
  // In Edge Runtime, we return the current environment variables
  // Phase.dev secret loading must happen at build time or in Node.js runtime
  return {
    success: true,
    variables: config.getAll(),
    source: 'environment' as const,
    phaseAvailable: isPhaseConfigured(),
    error: null
  };
}

/**
 * Simplified environment info for edge runtime
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: getConfigValue('NODE_ENV', 'development'),
    isProduction: getConfigValue('NODE_ENV') === 'production',
    isDevelopment: getConfigValue('NODE_ENV') === 'development',
    isEdgeRuntime: typeof (globalThis as any).EdgeRuntime !== 'undefined',
    hasPhaseToken: isPhaseConfigured(),
    appName: 'AI.C9d.Web'
  };
}

/**
 * Get required environment variables for the app
 */
export function getRequiredEnvVars(): string[] {
  const nodeEnv = getConfigValue('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  ];
  
  if (isProduction) {
    required.push(
      'DATABASE_URL',
      'CLERK_SECRET_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  
  return required;
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(): {
  isValid: boolean;
  missing: string[];
  warnings: string[];
} {
  const config = getEdgeConfig();
  const required = getRequiredEnvVars();
  const validation = config.validate(required);
  
  const warnings: string[] = [];
  
  if (!isPhaseConfigured()) {
    warnings.push('Phase.dev token not configured - using environment variables only');
  }
  
  return {
    isValid: validation.isValid,
    missing: validation.missing,
    warnings
  };
}

// For backward compatibility with existing code
export const loadFromPhase = loadEnvironmentConfig;

export function getPhaseConfig() {
  return {
    token: getConfigValue('PHASE_SERVICE_TOKEN'),
    appName: 'AI.C9d.Web',
    environment: getConfigValue('NODE_ENV', 'development')
  };
}

// Stub for EnvironmentFallbackManager that works in Edge Runtime
export class EnvironmentFallbackManager {
  async loadEnvironment(appName: string, environment: string, options?: any) {
    return loadEnvironmentConfig();
  }
  
  getCachedConfig() {
    return getEdgeConfig().getAll();
  }
  
  clearCache() {
    // No-op in edge runtime
  }
}

// Stub for Phase SDK errors
export class PhaseSDKError extends Error {
  code: string;
  isRetryable: boolean;
  
  constructor(message: string, code: string = 'EDGE_RUNTIME_ERROR') {
    super(message);
    this.name = 'PhaseSDKError';
    this.code = code;
    this.isRetryable = false;
  }
}

export const PhaseSDKErrorCode = {
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  INVALID_TOKEN: 'INVALID_TOKEN',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SECRET_NOT_FOUND: 'SECRET_NOT_FOUND',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;
