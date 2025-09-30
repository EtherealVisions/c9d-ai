/**
 * Type definitions for @coordinated/phase-client
 */

export type AppNamespace = 'WEB' | 'API' | 'DOCS' | 'STUDIO' | 'COST' | 'INTEGRATION' | 'SHARED';

export interface CacheConfig {
  enabled?: boolean;
  ttl?: number; // seconds
  maxMemoryMB?: number; // maximum memory usage in MB (optional)
}

export interface PhaseConfig {
  /**
   * The app namespace (e.g., 'WEB', 'API', 'DOCS')
   * Optional - will auto-detect from .phase.json if not provided
   */
  appNamespace?: AppNamespace | string;
  
  /**
   * Phase.dev read token for this app
   */
  token: string;
  
  /**
   * Override environment or 'auto' for automatic detection
   */
  phaseEnv?: string;
  
  /**
   * Fail on missing required variables
   */
  strict?: boolean;
  
  /**
   * Remove namespace prefix from keys (default: true)
   */
  stripPrefix?: boolean;
  
  /**
   * Cache configuration
   */
  cache?: CacheConfig;
  
  /**
   * Custom Phase.dev API endpoint (for self-hosted)
   */
  apiUrl?: string;
  
  /**
   * Timeout for API requests (ms)
   */
  timeout?: number;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

export interface EnvVars {
  [key: string]: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  key: string;
  message: string;
  required: boolean;
}

export interface ValidationWarning {
  key: string;
  message: string;
}

export interface SecretMetadata {
  key: string;
  value: string;
  environment: string;
  project: string;
  lastModified?: Date;
  version?: string;
}

export interface ResolverOptions {
  appName?: string;
  globalEnv?: string;
  envMap?: string;
  autoDetect?: boolean;
}

export interface CacheEntry {
  data: EnvVars;
  expires: number;
  environment: string;
  checksum?: string;
}

export interface PhaseResponse {
  secrets: Record<string, string>;
  environment: string;
  project: string;
  timestamp: string;
}