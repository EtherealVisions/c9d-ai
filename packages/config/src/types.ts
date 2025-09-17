// Shared types for Phase.dev configuration
// These types can be used in both browser and server contexts

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