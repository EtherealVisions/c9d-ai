// Edge-safe environment fallback manager
// This module provides environment management without Node.js-specific APIs

import { getAllEnvVars, getEnvVar, expandEnvVars, validateRequiredEnvVars } from './env.edge';

interface EnvironmentConfig {
  variables: Record<string, string>;
  metadata: {
    totalCount: number;
    phaseVariableCount: number;
    localFileCount: number;
    loadedFiles: string[];
    phaseStatus: 'success' | 'fallback' | 'error';
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
    phaseAvailable: boolean;
    phaseConfigLoaded: boolean;
    tokenSource?: string;
    loadTime: number;
    fallbackStrategy?: string;
  };
  errors: Array<{ source: string; error: string }>;
  validation: {
    isValid: boolean;
    missingVars: string[];
    warnings: string[];
  };
}

let configCache: EnvironmentConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 1 minute for edge runtime

export class EnvironmentFallbackManager {
  private appName: string;
  private environment: string;
  private rootPath: string;
  private requiredVars: string[] = [];

  constructor(appName: string, environment: string = 'development', rootPath: string = '') {
    this.appName = appName;
    this.environment = environment;
    this.rootPath = rootPath;
  }

  setRequiredVars(vars: string[]): void {
    this.requiredVars = vars;
  }

  async loadEnvironmentWithFallback(): Promise<EnvironmentConfig> {
    const startTime = Date.now();
    
    // Check cache
    if (configCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      console.log('[EnvironmentFallbackManager] Using cached configuration (age: ' + 
        Math.floor((Date.now() - cacheTimestamp) / 1000) + 's)');
      return configCache;
    }

    console.log('[EnvironmentFallbackManager] Loading environment configuration');
    console.log(`[EnvironmentFallbackManager] App: ${this.appName}, Environment: ${this.environment}`);
    
    const errors: Array<{ source: string; error: string }> = [];
    const loadedFiles: string[] = [];
    let phaseVariableCount = 0;
    let phaseStatus: 'success' | 'fallback' | 'error' = 'fallback';
    let tokenSource: string | undefined;
    let fallbackStrategy = 'EDGE_RUNTIME';

    // In edge runtime, we only have access to process.env
    const envVars = getAllEnvVars();
    loadedFiles.push('process.env');

    // Check for Phase.dev token
    const phaseToken = getEnvVar('PHASE_SERVICE_TOKEN');
    if (phaseToken) {
      tokenSource = 'process.env';
      console.log('[EnvironmentFallbackManager] Phase.dev token found in process.env');
      // In edge runtime, we can't actually use Phase.dev SDK
      phaseStatus = 'fallback';
      errors.push({
        source: 'phase.dev',
        error: 'Phase.dev SDK is not compatible with Edge Runtime'
      });
    }

    // Expand variables
    const expandedVars = expandEnvVars(envVars);

    // Validate required variables
    const validation = validateRequiredEnvVars(this.requiredVars);
    
    const warnings: string[] = [];
    if (!phaseToken) {
      warnings.push('No Phase.dev token found in environment');
    }
    if (phaseStatus === 'fallback') {
      warnings.push('Using Edge Runtime fallback - file system access not available');
    }

    const config: EnvironmentConfig = {
      variables: expandedVars,
      metadata: {
        totalCount: Object.keys(expandedVars).length,
        phaseVariableCount,
        localFileCount: 0, // No file access in edge runtime
        loadedFiles,
        phaseStatus,
        nodeEnv: this.environment,
        isDevelopment: this.environment === 'development',
        isProduction: this.environment === 'production',
        phaseAvailable: !!phaseToken,
        phaseConfigLoaded: false,
        tokenSource,
        loadTime: Date.now() - startTime,
        fallbackStrategy
      },
      errors,
      validation: {
        isValid: validation.isValid,
        missingVars: validation.missing,
        warnings
      }
    };

    // Cache the result
    configCache = config;
    cacheTimestamp = Date.now();

    console.log(`[EnvironmentFallbackManager] Environment loading completed in ${config.metadata.loadTime}ms`);
    console.log(`[EnvironmentFallbackManager] Total variables: ${config.metadata.totalCount}`);
    console.log(`[EnvironmentFallbackManager] Phase.dev status: ${config.metadata.phaseStatus}`);

    return config;
  }

  getConfig(): EnvironmentConfig | null {
    return configCache;
  }

  clearCache(): void {
    configCache = null;
    cacheTimestamp = 0;
  }

  getCachedConfig(): EnvironmentConfig | null {
    if (configCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      return configCache;
    }
    return null;
  }
}

// Export singleton instance
export const environmentManager = new EnvironmentFallbackManager(
  getEnvVar('PHASE_APP_NAME') || 'AI.C9d.Web',
  getEnvVar('NODE_ENV') || 'development'
);
