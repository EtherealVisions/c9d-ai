// Browser/Edge-safe configuration exports
// This file contains only exports that work in browser and edge environments

export * from './types';
export * from './constants';

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

// Check if we're in a browser environment
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Check if we're in production
export function isProduction(): boolean {
  return getEnvVar('NODE_ENV') === 'production';
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

// Simple validation for required environment variables
export function validateEnvVars(required: string[]): {
  isValid: boolean;
  missing: string[];
} {
  const missing = required.filter(key => !getEnvVar(key));
  return {
    isValid: missing.length === 0,
    missing
  };
}

// Export a simplified environment config that doesn't use file system
export const edgeConfig = {
  get: getConfig,
  getAll: getAllEnvVars,
  validate: validateEnvVars,
  isProduction,
  isBrowser
};