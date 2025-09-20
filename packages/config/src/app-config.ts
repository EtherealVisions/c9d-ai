/**
 * Application configuration management with build-time safety
 */

import type { ConfigValue, ConfigSource } from './types'

/**
 * Simple configuration manager that works in all environments
 */
export class AppConfig {
  private static instance: AppConfig | null = null
  private config: Map<string, ConfigValue> = new Map()
  private initialized = false

  private constructor() {}

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig()
    }
    return AppConfig.instance
  }

  /**
   * Initialize configuration with environment variables
   */
  initialize(): void {
    if (this.initialized) return

    // Only load from process.env if available (Node.js environment)
    if (typeof process !== 'undefined' && process.env) {
      // Load common environment variables
      const envVars = [
        'NODE_ENV',
        'VERCEL',
        'CI',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY',
        'DATABASE_URL',
        'PHASE_SERVICE_TOKEN'
      ]

      for (const key of envVars) {
        const value = process.env[key]
        if (value !== undefined) {
          this.config.set(key, value)
        }
      }
    }

    this.initialized = true
  }

  /**
   * Get a configuration value
   */
  get(key: string): ConfigValue | undefined {
    // Try to get from internal config first
    if (this.config.has(key)) {
      return this.config.get(key)
    }

    // Fallback to process.env if available
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key]
    }

    return undefined
  }

  /**
   * Set a configuration value
   */
  set(key: string, value: ConfigValue): void {
    this.config.set(key, value)
  }

  /**
   * Check if a configuration key exists
   */
  has(key: string): boolean {
    return this.config.has(key) || (
      typeof process !== 'undefined' && 
      process.env && 
      key in process.env
    )
  }

  /**
   * Get all configuration as an object
   */
  getAll(): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = {}
    
    // Add internal config
    for (const [key, value] of this.config.entries()) {
      result[key] = value
    }

    // Add process.env if available
    if (typeof process !== 'undefined' && process.env) {
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined && !result.hasOwnProperty(key)) {
          result[key] = value
        }
      }
    }

    return result
  }

  /**
   * Clear all configuration
   */
  clear(): void {
    this.config.clear()
    this.initialized = false
  }
}

/**
 * Get the global app configuration instance
 */
export function getAppConfig(): AppConfig {
  const config = AppConfig.getInstance()
  if (!config['initialized']) {
    config.initialize()
  }
  return config
}

/**
 * Initialize the app configuration
 */
export function initializeAppConfig(): AppConfig {
  const config = AppConfig.getInstance()
  config.initialize()
  return config
}