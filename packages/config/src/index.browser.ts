// Browser/Edge-safe configuration exports
// This file contains only exports that work in browser and edge environments

// Export types and constants first
export * from './types';
export * from './constants';

// Export edge-safe modules with explicit imports to avoid conflicts
export {
  // From env.edge
  getEnvVar,
  getConfig,
  getAllEnvVars,
  loadEnvironmentConfig,
  getPhaseServiceToken,
  isPhaseDevAvailable,
  validateRequiredEnvVars,
  expandEnvVars,
  loadEnvFromFiles,
  loadEnvironment,
  getEnv,
  config
} from './env.edge';

export {
  // From environment-fallback-manager.edge
  EnvironmentFallbackManager,
  environmentManager
} from './environment-fallback-manager.edge';

export {
  // From phase-token-loader.edge (renamed to avoid conflicts)
  loadPhaseServiceToken,
  getTokenSourceDiagnostics,
  hasPhaseServiceToken,
  getMaskedToken,
  type TokenSource,
  type TokenLoadResult
} from './phase-token-loader.edge';

export {
  // From phase.edge (renamed to avoid conflicts)
  initializePhase,
  loadPhaseConfig,
  isPhaseConfigured,
  getPhaseStatus,
  type PhaseConfig,
  type PhaseInitResult
} from './phase.edge';

export {
  // From phase-sdk-client.edge
  PhaseSDKClient,
  createPhaseClient,
  Phase,
  type PhaseSDKConfig,
  type PhaseSecret,
  type PhaseSDKResult
} from './phase-sdk-client.edge';

export {
  // From phase-sdk-cache.edge
  PhaseSDKCache,
  phaseSDKCache,
  type CacheEntry,
  type CacheStats
} from './phase-sdk-cache.edge';

// Re-export monitoring and error handling if they're edge-safe
// These modules should already be edge-safe as they don't appear in the error logs
export * from './phase-error-handler';
export * from './phase-monitoring';

// For backward compatibility
export { validateRequiredEnvVars as validateEnvVars } from './env.edge';
export { config as edgeConfig } from './env.edge';

// Re-export utility functions
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function isProduction(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'production';
  }
  return false;
}