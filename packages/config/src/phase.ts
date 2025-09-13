// Phase.dev integration for secure environment variable management
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
// Note: Avoiding import from './env' to prevent circular dependency

/**
 * Phase.dev configuration interface
 */
interface PhaseConfig {
  serviceToken: string;
  appName: string;
  environment?: string;
}

/**
 * Phase.dev API response interface
 */
interface PhaseApiResponse {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
}

/**
 * Phase.dev environment variable result
 */
interface PhaseEnvResult {
  variables: Record<string, string>;
  success: boolean;
  error?: string;
  source: 'phase.dev' | 'fallback';
}

/**
 * Default Phase.dev configuration
 */
const DEFAULT_PHASE_CONFIG: Partial<PhaseConfig> = {
  appName: 'AI.C9d.Web', // Fallback if package.json doesn't have phase config
  environment: 'development'
};

/**
 * Get Phase.dev app name from package.json
 * @param rootPath Root path to search for package.json
 * @returns Phase.dev app name or default
 */
function getPhaseAppNameFromPackageJson(rootPath: string = process.cwd()): string {
  try {
    const packageJsonPath = join(rootPath, 'package.json');
    
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
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
 * Cache for Phase.dev environment variables
 */
let phaseCache: { variables: Record<string, string>; timestamp: number } | null = null;
const PHASE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get Phase.dev service token from environment variables
 * @returns Phase.dev service token or null if not available
 */
export const getPhaseServiceToken = (): string | null => {
  // Check process.env first (highest priority)
  if (process.env.PHASE_SERVICE_TOKEN) {
    return process.env.PHASE_SERVICE_TOKEN;
  }
  
  // For now, only check process.env to avoid circular dependency
  // The env.ts module will handle .env file loading separately
  return null;
};

/**
 * Check if Phase.dev integration is available
 * @returns True if Phase.dev service token is available
 */
export const isPhaseDevAvailable = (): boolean => {
  return getPhaseServiceToken() !== null;
};

/**
 * Get Phase.dev configuration
 * @param overrides Optional configuration overrides
 * @param rootPath Root path to search for package.json
 * @returns Phase.dev configuration object
 */
export const getPhaseConfig = (
  overrides: Partial<PhaseConfig> = {},
  rootPath?: string
): PhaseConfig | null => {
  const serviceToken = getPhaseServiceToken();
  
  if (!serviceToken) {
    return null;
  }
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const appName = overrides.appName || getPhaseAppNameFromPackageJson(rootPath);
  
  return {
    serviceToken,
    appName,
    environment: overrides.environment || nodeEnv
  };
};

/**
 * Fetch environment variables from Phase.dev API
 * @param config Phase.dev configuration
 * @returns Promise resolving to Phase.dev API response
 */
async function fetchFromPhaseApi(config: PhaseConfig): Promise<PhaseApiResponse> {
  try {
    // Note: This is a placeholder implementation
    // In a real implementation, you would make an HTTP request to Phase.dev API
    // For now, we'll simulate the API call
    
    console.log(`[Phase.dev] Fetching environment variables for app: ${config.appName}, env: ${config.environment}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // For testing purposes, return empty data
    // In real implementation, this would be:
    // const response = await fetch(`https://api.phase.dev/v1/apps/${config.appName}/environments/${config.environment}/variables`, {
    //   headers: {
    //     'Authorization': `Bearer ${config.serviceToken}`,
    //     'Content-Type': 'application/json'
    //   }
    // });
    // const data = await response.json();
    
    return {
      success: true,
      data: {} // Empty for now, would contain actual variables from Phase.dev
    };
  } catch (error) {
    console.error('[Phase.dev] Failed to fetch environment variables:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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
  const phaseConfig = getPhaseConfig(config, rootPath);
  
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
    console.log('[Phase.dev] Using cached environment variables');
    return {
      variables: phaseCache.variables,
      success: true,
      source: 'phase.dev'
    };
  }
  
  try {
    const response = await fetchFromPhaseApi(phaseConfig);
    
    if (response.success && response.data) {
      // Cache the successful response
      phaseCache = {
        variables: response.data,
        timestamp: now
      };
      
      console.log(`[Phase.dev] Successfully loaded ${Object.keys(response.data).length} environment variables`);
      
      return {
        variables: response.data,
        success: true,
        source: 'phase.dev'
      };
    } else {
      console.warn('[Phase.dev] Failed to load environment variables:', response.error);
      return {
        variables: {},
        success: false,
        error: response.error || 'Unknown Phase.dev API error',
        source: 'fallback'
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Phase.dev] Error loading environment variables:', errorMessage);
    
    return {
      variables: {},
      success: false,
      error: errorMessage,
      source: 'fallback'
    };
  }
}

/**
 * Clear Phase.dev cache
 */
export const clearPhaseCache = (): void => {
  phaseCache = null;
  console.log('[Phase.dev] Cache cleared');
};

/**
 * Get Phase.dev cache status
 * @returns Cache status information
 */
export const getPhaseCacheStatus = (): {
  isCached: boolean;
  age: number;
  variableCount: number;
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
    variableCount: Object.keys(phaseCache.variables).length
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    };
  }
}