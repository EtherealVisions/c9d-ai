/**
 * Environment resolver for Phase.dev
 * 
 * Determines which Phase environment to use based on various factors.
 */

import { ResolverOptions } from './types';

/**
 * Resolve the target Phase environment
 */
export function resolveEnvironment(options: ResolverOptions = {}): string {
  const { appName, globalEnv, envMap, autoDetect = true } = options;
  
  // 1. Check app-specific override
  if (appName) {
    const appOverride = process.env[`PHASE_ENV__${appName}`];
    if (appOverride) {
      return appOverride;
    }
    
    // 2. Check environment map
    if (process.env.PHASE_ENV_MAP || envMap) {
      const map = parseEnvMap(envMap || process.env.PHASE_ENV_MAP || '');
      if (map[appName]) {
        return map[appName];
      }
    }
  }
  
  // 3. Use global Phase environment
  if (process.env.PHASE_ENV && process.env.PHASE_ENV !== 'auto') {
    return process.env.PHASE_ENV;
  }
  
  if (globalEnv && globalEnv !== 'auto') {
    return globalEnv;
  }
  
  // 4. Auto-detect from context
  if (autoDetect) {
    return detectEnvironment();
  }
  
  // Default to development
  return 'development';
}

/**
 * Parse environment map string
 * Format: "WEB=feature-123,API=staging,DOCS=production"
 */
function parseEnvMap(envMap: string): Record<string, string> {
  const map: Record<string, string> = {};
  
  if (!envMap) return map;
  
  const pairs = envMap.split(',');
  for (const pair of pairs) {
    const [app, env] = pair.split('=');
    if (app && env) {
      map[app.trim()] = env.trim();
    }
  }
  
  return map;
}

/**
 * Auto-detect environment from context
 */
function detectEnvironment(): string {
  // Vercel environment detection
  if (process.env.VERCEL_ENV) {
    switch (process.env.VERCEL_ENV) {
      case 'production':
        return 'production';
      case 'preview':
        return 'staging';
      case 'development':
        return 'development';
      default:
        return 'development';
    }
  }
  
  // GitHub Actions environment detection
  if (process.env.GITHUB_ACTIONS) {
    // Check branch name
    if (process.env.GITHUB_REF === 'refs/heads/main') {
      return 'production';
    }
    if (process.env.GITHUB_REF === 'refs/heads/develop') {
      return 'staging';
    }
    // Pull requests and feature branches
    return 'development';
  }
  
  // Docker/Container environment
  if (process.env.CONTAINER || process.env.CURSOR_CONTAINER) {
    // Use explicitly set environment or default to development
    return process.env.PHASE_ENV || 'development';
  }
  
  // Node environment
  if (process.env.NODE_ENV) {
    switch (process.env.NODE_ENV) {
      case 'production':
        return 'production';
      case 'test':
        return 'staging';
      case 'development':
      default:
        return 'development';
    }
  }
  
  // Default to development for local
  return 'development';
}

// Export for testing
export { parseEnvMap, detectEnvironment };