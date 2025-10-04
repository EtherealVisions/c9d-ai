/**
 * Build-time environment configuration
 * This module provides environment variables during the build process
 * without relying on external services like Phase.dev
 */

/**
 * Get environment variable with build-time safety
 * @param key Environment variable key
 * @returns Environment variable value or undefined
 */
export function getBuildEnv(key: string): string | undefined {
  // During build time, use process.env directly
  // Vercel injects environment variables into process.env during build
  const value = process.env[key];
  
  // Skip values that are literal variable references
  if (value && value.startsWith('$')) {
    console.warn(`[BuildEnv] Skipping literal variable ${key}: ${value}`);
    return undefined;
  }
  
  return value;
}

/**
 * Get required environment variable with build-time safety
 * @param key Environment variable key
 * @returns Environment variable value
 * @throws Error if variable is not set
 */
export function getRequiredBuildEnv(key: string): string {
  const value = getBuildEnv(key);
  
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value;
}

/**
 * Check if we're in a build environment
 * @returns True if in build environment
 */
export function isBuildEnvironment(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build' || 
         (process.env.VERCEL === '1' && process.env.CI === '1');
}

/**
 * Get all build environment variables
 * @returns Object with all non-literal environment variables
 */
export function getAllBuildEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(process.env)) {
    if (value && !value.startsWith('$')) {
      env[key] = value;
    }
  }
  
  return env;
}

/**
 * Validate required environment variables for build
 * @returns Validation result
 */
export function validateBuildEnv(): {
  valid: boolean;
  missing: string[];
  literal: string[];
} {
  const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing: string[] = [];
  const literal: string[] = [];
  
  for (const key of required) {
    const value = process.env[key];
    
    if (!value) {
      missing.push(key);
    } else if (value.startsWith('$')) {
      literal.push(key);
    }
  }
  
  return {
    valid: missing.length === 0 && literal.length === 0,
    missing,
    literal
  };
}