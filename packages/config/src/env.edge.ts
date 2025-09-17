// Edge-safe environment configuration utilities
// This module provides environment variable access without Node.js-specific APIs

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

// Edge-safe environment variable access
export function getEnvVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

// Edge-safe config getter with fallback
export function getConfig(key: string, fallback?: string): string {
  const value = getEnvVar(key);
  if (value === undefined && fallback === undefined) {
    console.warn(`[Config] Missing environment variable: ${key}`);
  }
  return value ?? fallback ?? '';
}

// Get all environment variables (edge-safe)
export function getAllEnvVars(): Record<string, string> {
  if (typeof process !== 'undefined' && process.env) {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
    return env;
  }
  return {};
}

// Edge-safe environment loader that only uses process.env
export async function loadEnvironmentConfig(): Promise<EnvLoadResult> {
  const config = getAllEnvVars();
  
  return {
    config,
    loadedFiles: ['process.env'],
    errors: [],
    phaseResult: {
      success: false,
      variableCount: Object.keys(config).length,
      source: 'fallback'
    }
  };
}

// Edge-safe Phase.dev token access
export function getPhaseServiceToken(skipFileSystemSearch = false): string | null {
  return getEnvVar('PHASE_SERVICE_TOKEN') || null;
}

// Check if Phase.dev is available
export function isPhaseDevAvailable(): boolean {
  return !!getPhaseServiceToken(true);
}

// Edge-safe validation
export function validateRequiredEnvVars(required: string[]): {
  isValid: boolean;
  missing: string[];
} {
  const missing = required.filter(key => !getEnvVar(key));
  return {
    isValid: missing.length === 0,
    missing
  };
}

// Edge-safe expansion (basic implementation without dotenv-expand)
export function expandEnvVars(config: EnvConfig): EnvConfig {
  const expanded: EnvConfig = {};
  
  // Simple variable expansion
  for (const [key, value] of Object.entries(config)) {
    let expandedValue = value;
    
    // Replace ${VAR} and $VAR patterns
    expandedValue = expandedValue.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, p1, p2) => {
      const varName = p1 || p2;
      return config[varName] || getEnvVar(varName) || match;
    });
    
    expanded[key] = expandedValue;
  }
  
  return expanded;
}

// Re-export functions with the same interface as the Node.js version
export { 
  loadEnvironmentConfig as loadEnvFromFiles,
  loadEnvironmentConfig as loadEnvironment,
  getEnvVar as getEnv
};

// Export configuration object
export const config = {
  get: getConfig,
  getAll: getAllEnvVars,
  validate: validateRequiredEnvVars,
  isPhaseAvailable: isPhaseDevAvailable
};
