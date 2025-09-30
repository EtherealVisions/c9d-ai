/**
 * Environment variable configuration types
 */

export interface EnvVariable {
  name: string
  required: boolean
  description: string
  example?: string
  sensitive?: boolean // Don't show value in logs
}

/**
 * Phase Apps Configuration Types
 */
export interface PhaseAppsConfig {
  $schema?: string
  version: string
  apps: Record<string, AppPhaseConfig>
  packages: Record<string, PackagePhaseConfig>
  defaults?: DefaultPhaseConfig
}

export interface AppPhaseConfig {
  phaseAppName: string
  environment?: 'development' | 'staging' | 'production'
  fallbackEnvFiles?: string[]
  validation?: ValidationConfig
  timeout?: number
  retries?: number
}

export interface PackagePhaseConfig {
  phaseAppName: string
  environment?: 'development' | 'staging' | 'production'
  fallbackEnvFiles?: string[]
  validation?: ValidationConfig
  timeout?: number
  retries?: number
}

export interface DefaultPhaseConfig {
  environment?: 'development' | 'staging' | 'production'
  fallbackEnvFiles?: string[]
  validation?: ValidationConfig
  timeout?: number
  retries?: number
}

export interface ValidationConfig {
  strict?: boolean
}

export interface ConfigurationLoadResult {
  success: boolean
  config: ResolvedAppConfig | null
  source: 'package.json' | 'root-config' | 'defaults'
  errors: string[]
}

export interface ResolvedAppConfig {
  appName: string
  phaseAppName: string
  environment: string
  fallbackEnvFiles: string[]
  validation: ValidationConfig
  timeout: number
  retries: number
}

export interface AppEnvConfig {
  appName: string
  displayName: string
  defaults?: {
    envFile?: string
    fallbackFiles?: string[]
  }
  envVars: {
    required: EnvVariable[]
    optional: EnvVariable[]
  }
  validation?: {
    strict?: boolean
  }
  // Custom validation function
  customValidation?: (env: NodeJS.ProcessEnv) => { valid: boolean; errors: string[] }
  // Pre/post hooks
  beforeValidation?: () => Promise<void>
  afterValidation?: (valid: boolean) => Promise<void>
}

export interface EnvWrapperOptions {
  configPath?: string // Path to app env config
  phaseEnabled?: boolean
  debug?: boolean
  strict?: boolean // Exit on validation failure
  appNamespace?: string // Phase app namespace override
  validation?: boolean // Enable/disable validation
}

export interface EnvironmentManagerOptions {
  debug?: boolean
  strict?: boolean // Exit on validation failure
  enablePhase?: boolean // Enable Phase.dev integration
  enableValidation?: boolean // Enable environment validation
  fallbackToLocal?: boolean // Fallback to local .env files
  appNamespace?: string // Phase app namespace override
}

export interface EnvironmentLoadResult {
  success: boolean
  sources: string[] // List of loaded sources (e.g., 'phase.dev', 'local:.env.development')
  appConfig: AppEnvConfig | null
  validation: any | null // Validation results
  phaseEnabled: boolean
  duration: number // Load time in milliseconds
  errors: string[]
}

export interface EnvironmentValidationError {
  variable: string
  message: string
  suggestion?: string
  example?: string
}