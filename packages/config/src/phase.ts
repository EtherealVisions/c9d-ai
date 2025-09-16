// Phase.dev integration for secure environment variable management
// Note: File system operations are only available in Node.js environment
import { PhaseSDKClient, PhaseSDKResult } from './phase-sdk-client';
import { TokenSource } from './phase-token-loader';

/**
 * Phase.dev configuration interface
 */
interface PhaseConfig {
  serviceToken: string;
  appName: string;
  environment?: string;
}

/**
 * Phase.dev environment variable result
 */
interface PhaseEnvResult {
  variables: Record<string, string>;
  success: boolean;
  error?: string;
  source: 'phase.dev' | 'phase-sdk' | 'fallback';
  tokenSource?: TokenSource;
}

/**
 * Default Phase.dev configuration
 */
const DEFAULT_PHASE_CONFIG: Partial<PhaseConfig> = {
  appName: 'AI.C9d.Web', // Fallback if package.json doesn't have phase config
  environment: 'development'
};

/**
 * Get Phase.dev app name from package.json (server-side only)
 * @param rootPath Root path to search for package.json
 * @returns Phase.dev app name or default
 */
async function getPhaseAppNameFromPackageJson(rootPath: string = process.cwd()): Promise<string> {
  // Only run on server-side (Node.js environment)
  if (typeof window !== 'undefined') {
    console.warn('[Phase.dev] File system access not available in browser environment');
    return DEFAULT_PHASE_CONFIG.appName || 'AI.C9d.Web';
  }

  try {
    // Dynamic imports to avoid bundling in client code
    const fs = await import('fs');
    const path = await import('path');
    
    const packageJsonPath = path.join(rootPath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check for phase.dev configuration in package.json
      if (packageJson.phase?.appName) {
        return packageJson.phase.appName;
      }
      
      // Check for phasedev configuration (alternative naming)
      if (packageJson.phasedev?.appName) {
        return packageJson.phasedev.appName;
      }
      
      // Fallback to package name if available
      if (packageJson.name) {
        // Convert package name to Phase.dev app name format
        // e.g., "@c9d/web" -> "C9d.Web"
        const name = packageJson.name.replace(/^@/, '').replace(/[\/\-]/g, '.');
        return name.split('.').map((part: string) => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join('.');
      }
    }
  } catch (error) {
    console.warn('[Phase.dev] Failed to read package.json:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  return DEFAULT_PHASE_CONFIG.appName || 'AI.C9d.Web';
}

/**
 * Cache for Phase.dev environment variables with SDK-compatible TTL
 */
interface PhaseCacheEntry {
  variables: Record<string, string>;
  timestamp: number;
  source: 'phase-sdk' | 'phase.dev';
  tokenSource?: TokenSource;
}

let phaseCache: PhaseCacheEntry | null = null;
const PHASE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes - SDK-compatible TTL

/**
 * Global SDK client instance for reuse
 */
let globalSDKClient: PhaseSDKClient | null = null;

// Note: getPhaseServiceToken and isPhaseDevAvailable are now defined in env.ts to avoid circular dependencies

/**
 * Get Phase.dev service token with fallback
 * This function is defined here to avoid circular dependencies
 * @returns Phase.dev service token or null
 */
function getPhaseServiceTokenInternal(): string | null {
  // Use PhaseTokenLoader for comprehensive token loading
  try {
    const { PhaseTokenLoader } = require('./phase-token-loader');
    const tokenSource = PhaseTokenLoader.loadServiceToken();
    return tokenSource ? tokenSource.token : null;
  } catch (error) {
    // Fallback to simple process.env check if PhaseTokenLoader fails
    return process.env.PHASE_SERVICE_TOKEN || null;
  }
}

/**
 * Get Phase.dev configuration (async)
 * @param overrides Optional configuration overrides
 * @param rootPath Root path to search for package.json
 * @returns Phase.dev configuration object
 */
export const getPhaseConfig = async (
  overrides: Partial<PhaseConfig> = {},
  rootPath?: string
): Promise<PhaseConfig | null> => {
  const serviceToken = getPhaseServiceTokenInternal();
  
  if (!serviceToken) {
    return null;
  }
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const appName = (overrides.appName && overrides.appName.trim()) || await getPhaseAppNameFromPackageJson(rootPath);
  
  return {
    serviceToken,
    appName,
    environment: (overrides.environment && overrides.environment.trim()) || nodeEnv
  };
};

/**
 * Get Phase.dev configuration synchronously (uses defaults)
 * @param overrides Optional configuration overrides
 * @returns Phase.dev configuration object
 */
export const getPhaseConfigSync = (
  overrides: Partial<PhaseConfig> = {}
): PhaseConfig | null => {
  const serviceToken = getPhaseServiceTokenInternal();
  
  if (!serviceToken) {
    return null;
  }
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const appName = (overrides.appName && overrides.appName.trim()) || DEFAULT_PHASE_CONFIG.appName || 'AI.C9d.Web';
  
  return {
    serviceToken,
    appName,
    environment: (overrides.environment && overrides.environment.trim()) || nodeEnv
  };
};

/**
 * Fetch environment variables using Phase.dev SDK
 * @param config Phase.dev configuration
 * @param rootPath Optional root path for token loading
 * @returns Promise resolving to Phase.dev SDK result
 */
async function fetchFromPhaseSDK(config: PhaseConfig, rootPath?: string): Promise<PhaseSDKResult> {
  try {
    console.log(`[Phase.dev SDK] Fetching environment variables for app: ${config.appName}, env: ${config.environment}`);
    
    // Reuse global SDK client if available and initialized
    if (!globalSDKClient || !globalSDKClient.isInitialized()) {
      globalSDKClient = new PhaseSDKClient();
      
      const initialized = await globalSDKClient.initialize(
        config.appName,
        config.environment || 'development',
        rootPath
      );
      
      if (!initialized) {
        throw new Error('Failed to initialize Phase.dev SDK client');
      }
    }
    
    // Get secrets using SDK
    const result = await globalSDKClient.getSecrets();
    
    if (result.success) {
      console.log(`[Phase.dev SDK] Successfully fetched ${Object.keys(result.secrets).length} secrets`);
      console.log(`[Phase.dev SDK] Token source: ${result.tokenSource?.source}`);
    } else {
      console.error(`[Phase.dev SDK] Failed to fetch secrets:`, result.error);
    }
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Phase.dev SDK] Failed to fetch environment variables:', errorMessage);
    
    // Get token source for better error messages
    const tokenSource = globalSDKClient?.getTokenSource();
    
    // Format error message to match test expectations
    const formattedError = errorMessage.includes('Phase.dev') 
      ? errorMessage 
      : `Phase.dev API error: ${errorMessage}`;
    
    return {
      success: false,
      secrets: {},
      error: formattedError,
      source: 'fallback',
      tokenSource: tokenSource ?? undefined
    };
  }
}

/**
 * Load environment variables from Phase.dev with caching
 * @param forceReload Force reload from Phase.dev API
 * @param config Optional Phase.dev configuration overrides
 * @param rootPath Root path to search for package.json
 * @returns Promise resolving to environment variables result
 */
export async function loadFromPhase(
  forceReload: boolean = false,
  config?: Partial<PhaseConfig>,
  rootPath?: string
): Promise<PhaseEnvResult> {
  const phaseConfig = await getPhaseConfig(config, rootPath);
  
  if (!phaseConfig) {
    return {
      variables: {},
      success: false,
      error: 'Phase.dev service token not available',
      source: 'fallback'
    };
  }
  
  const now = Date.now();
  
  // Return cached values if still valid and not forcing reload
  if (!forceReload && phaseCache && (now - phaseCache.timestamp) < PHASE_CACHE_TTL) {
    console.log('[Phase.dev SDK] Using cached environment variables');
    console.log(`[Phase.dev SDK] Cache age: ${Math.round((now - phaseCache.timestamp) / 1000)}s`);
    console.log(`[Phase.dev SDK] Token source: ${phaseCache.tokenSource?.source}`);
    
    return {
      variables: phaseCache.variables,
      success: true,
      source: phaseCache.source,
      tokenSource: phaseCache.tokenSource
    };
  }
  
  try {
    const response = await fetchFromPhaseSDK(phaseConfig, rootPath);
    
    if (response.success) {
      // Cache the successful response
      phaseCache = {
        variables: response.secrets,
        timestamp: now,
        source: 'phase-sdk',
        tokenSource: response.tokenSource
      };
      
      console.log(`[Phase.dev SDK] Successfully loaded ${Object.keys(response.secrets).length} environment variables`);
      console.log(`[Phase.dev SDK] Token source: ${response.tokenSource?.source}`);
      
      return {
        variables: response.secrets,
        success: true,
        source: 'phase-sdk',
        tokenSource: response.tokenSource
      };
    } else {
      console.warn('[Phase.dev SDK] Failed to load environment variables:', response.error);
      return {
        variables: {},
        success: false,
        error: response.error || 'Phase.dev API error: Unknown SDK error',
        source: 'fallback',
        tokenSource: response.tokenSource
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Phase.dev SDK] Error loading environment variables:', errorMessage);
    
    // Try to get token source from global client for debugging
    const tokenSource = globalSDKClient?.getTokenSource();
    
    // Format error message to match test expectations
    const formattedError = errorMessage.includes('Phase.dev') 
      ? errorMessage 
      : `Phase.dev API error: ${errorMessage}`;
    
    return {
      variables: {},
      success: false,
      error: formattedError,
      source: 'fallback',
      tokenSource: tokenSource ?? undefined
    };
  }
}

/**
 * Clear Phase.dev cache and SDK client
 */
export const clearPhaseCache = (): void => {
  phaseCache = null;
  if (globalSDKClient) {
    globalSDKClient.clearCache();
    globalSDKClient = null;
  }
  console.log('[Phase.dev SDK] Cache and client cleared');
};

/**
 * Get Phase.dev cache status with token source information
 * @returns Cache status information including token source for debugging
 */
export const getPhaseCacheStatus = (): {
  isCached: boolean;
  age: number;
  variableCount: number;
  source?: 'phase-sdk' | 'phase.dev';
  tokenSource?: TokenSource;
} => {
  if (!phaseCache) {
    return {
      isCached: false,
      age: 0,
      variableCount: 0
    };
  }
  
  return {
    isCached: true,
    age: Date.now() - phaseCache.timestamp,
    variableCount: Object.keys(phaseCache.variables).length,
    source: phaseCache.source,
    tokenSource: phaseCache.tokenSource
  };
};

/**
 * Test Phase.dev connectivity
 * @param config Optional Phase.dev configuration overrides
 * @param rootPath Root path to search for package.json
 * @returns Promise resolving to connectivity test result
 */
export async function testPhaseConnectivity(
  config?: Partial<PhaseConfig>,
  rootPath?: string
): Promise<{
  success: boolean;
  error?: string;
  responseTime: number;
}> {
  const startTime = Date.now();
  
  try {
    const result = await loadFromPhase(true, config, rootPath);
    const responseTime = Date.now() - startTime;
    
    return {
      success: result.success,
      error: result.error,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Format error message to match test expectations
    const formattedError = errorMessage.includes('Phase.dev') 
      ? errorMessage 
      : `Phase.dev API error: ${errorMessage}`;
    
    return {
      success: false,
      error: formattedError,
      responseTime
    };
  }
}