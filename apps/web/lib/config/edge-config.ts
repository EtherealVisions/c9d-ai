/**
 * Edge-safe configuration management
 * This module provides configuration management that works in Edge Runtime,
 * browser environments, and Node.js without using Node-specific APIs.
 */

export interface EdgeConfig {
  get(key: string): string | undefined;
  getAll(): Record<string, string>;
  has(key: string): boolean;
  validate(required: string[]): { isValid: boolean; missing: string[] };
}

/**
 * Edge-safe environment configuration
 * Works in all environments: Node.js, Edge Runtime, and Browser
 */
export class EdgeEnvironmentConfig implements EdgeConfig {
  private config: Record<string, string> = {};
  
  constructor() {
    // Initialize with environment variables if available
    if (typeof process !== 'undefined' && process.env) {
      // In Node.js or Edge Runtime with process.env
      // Filter out undefined values
      Object.entries(process.env).forEach(([key, value]) => {
        if (value !== undefined) {
          this.config[key] = value;
        }
      });
    }
  }
  
  get(key: string): string | undefined {
    return this.config[key];
  }
  
  getAll(): Record<string, string> {
    return { ...this.config };
  }
  
  has(key: string): boolean {
    return key in this.config;
  }
  
  validate(required: string[]): { isValid: boolean; missing: string[] } {
    const missing = required.filter(key => !this.has(key) || !this.get(key));
    return {
      isValid: missing.length === 0,
      missing
    };
  }
}

// Singleton instance
let configInstance: EdgeConfig | null = null;

/**
 * Get the edge-safe configuration instance
 */
export function getEdgeConfig(): EdgeConfig {
  if (!configInstance) {
    configInstance = new EdgeEnvironmentConfig();
  }
  return configInstance;
}

/**
 * Helper function to get a config value with a fallback
 */
export function getConfigValue(key: string, fallback?: string): string {
  const value = getEdgeConfig().get(key);
  if (value === undefined && fallback === undefined) {
    console.warn(`[EdgeConfig] Missing environment variable: ${key}`);
  }
  return value ?? fallback ?? '';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getConfigValue('NODE_ENV') === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getConfigValue('NODE_ENV') === 'development';
}

/**
 * Get application configuration with proper typing
 */
export function getAppConfig() {
  const config = getEdgeConfig();
  
  return {
    // Clerk configuration
    clerkPublishableKey: config.get('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
    clerkSecretKey: config.get('CLERK_SECRET_KEY'),
    clerkSignInUrl: config.get('NEXT_PUBLIC_CLERK_SIGN_IN_URL'),
    clerkSignUpUrl: config.get('NEXT_PUBLIC_CLERK_SIGN_UP_URL'),
    clerkAfterSignInUrl: config.get('NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL'),
    clerkAfterSignUpUrl: config.get('NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL'),
    
    // Supabase configuration
    supabaseUrl: config.get('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: config.get('SUPABASE_SERVICE_ROLE_KEY'),
    databaseUrl: config.get('DATABASE_URL'),
    
    // App configuration
    appUrl: config.get('NEXT_PUBLIC_APP_URL'),
    apiUrl: config.get('NEXT_PUBLIC_API_URL'),
    nodeEnv: config.get('NODE_ENV') || 'development',
    
    // Phase configuration (if available)
    phaseServiceToken: config.get('PHASE_SERVICE_TOKEN'),
    
    // Helper methods
    isProduction: isProduction(),
    isDevelopment: isDevelopment(),
    
    // Get a specific config value
    get: (key: string) => config.get(key),
    
    // Validate required configs
    validate: (required: string[]) => config.validate(required)
  };
}

// Export types for use in other modules
export type AppConfig = ReturnType<typeof getAppConfig>;
