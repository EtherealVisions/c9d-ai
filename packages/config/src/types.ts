// Shared types for Phase.dev configuration
// These types can be used in both browser and server contexts

/**
 * Configuration value type
 */
export type ConfigValue = string | number | boolean | undefined

/**
 * Configuration source type
 */
export type ConfigSource = 'phase.dev' | 'environment' | 'fallback' | 'default'

/**
 * Configuration load result
 */
export interface ConfigLoadResult {
  success: boolean
  source: ConfigSource
  variables: Record<string, string>
  error?: string
}

/**
 * Phase.dev load result
 */
export interface PhaseLoadResult {
  success: boolean
  error?: string
  source?: ConfigSource
  variables?: Record<string, string>
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  [key: string]: ConfigValue
}

/**
 * Token source information for debugging and tracking
 */
export interface TokenSource {
  source: 'process.env' | 'local.env.local' | 'local.env' | 'root.env.local' | 'root.env'
  token: string
  path?: string
}

/**
 * Phase.dev configuration options
 */
export interface PhaseConfig {
  appName?: string
  environment?: string
  serviceToken?: string
  enableFallback?: boolean
  cacheEnabled?: boolean
}