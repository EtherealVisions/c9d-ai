/**
 * Configuration loader for app-specific environment settings
 * Implements precedence system: package.json > root config > defaults
 */

import * as fs from 'fs'
import * as path from 'path'
import { 
  AppEnvConfig, 
  PhaseAppsConfig, 
  ResolvedAppConfig, 
  ConfigurationLoadResult,
  AppPhaseConfig,
  PackagePhaseConfig,
  DefaultPhaseConfig
} from './types'

/**
 * Load app-specific environment configuration with precedence system
 * Precedence order:
 * 1. package.json phase configuration (highest priority)
 * 2. Root .phase-apps.json configuration
 * 3. Default values (lowest priority)
 */
export function loadAppConfig(appPath?: string): AppEnvConfig | null {
  const cwd = appPath || process.cwd()
  
  // Try env.config.json first (legacy support)
  const configPath = path.join(cwd, 'env.config.json')
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return config as AppEnvConfig
    } catch (error) {
      console.warn(`Failed to parse env.config.json: ${error}`)
    }
  }
  
  // Try package.json env section (legacy support)
  const packagePath = path.join(cwd, 'package.json')
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
      if (pkg.envConfig) {
        return pkg.envConfig as AppEnvConfig
      }
    } catch (error) {
      console.warn(`Failed to parse package.json: ${error}`)
    }
  }
  
  return null
}

/**
 * Load Phase.dev configuration with precedence system
 */
export function loadPhaseConfiguration(appPath?: string): ConfigurationLoadResult {
  const cwd = appPath || process.cwd()
  const errors: string[] = []
  
  try {
    const appName = getAppName(cwd)
    const rootPath = findRootPath(cwd)
    
    if (!rootPath) {
      return {
        success: false,
        config: null,
        source: 'defaults',
        errors: ['Could not find monorepo root (no pnpm-workspace.yaml found)']
      }
    }
    
    // Load root configuration
    const rootConfig = loadRootConfiguration(rootPath)
    if (!rootConfig.success) {
      errors.push(...rootConfig.errors)
    }
    
    // Load package.json configuration (highest priority)
    const packageConfig = loadPackageConfiguration(cwd)
    
    // Resolve configuration with precedence
    const resolvedConfig = resolveConfiguration(
      appName,
      packageConfig,
      rootConfig.config,
      isPackage(cwd, rootPath)
    )
    
    if (!resolvedConfig) {
      return {
        success: false,
        config: null,
        source: 'defaults',
        errors: [`No configuration found for app/package: ${appName}`]
      }
    }
    
    // Determine source
    let source: 'package.json' | 'root-config' | 'defaults' = 'defaults'
    if (packageConfig) {
      source = 'package.json'
    } else if (rootConfig.config) {
      source = 'root-config'
    }
    
    return {
      success: true,
      config: resolvedConfig,
      source,
      errors
    }
    
  } catch (error) {
    return {
      success: false,
      config: null,
      source: 'defaults',
      errors: [`Configuration loading failed: ${error instanceof Error ? error.message : String(error)}`]
    }
  }
}

/**
 * Load root .phase-apps.json configuration
 */
function loadRootConfiguration(rootPath: string): { success: boolean; config: PhaseAppsConfig | null; errors: string[] } {
  const configPath = path.join(rootPath, '.phase-apps.json')
  
  if (!fs.existsSync(configPath)) {
    return {
      success: false,
      config: null,
      errors: ['.phase-apps.json not found in root directory']
    }
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(configContent) as PhaseAppsConfig
    
    // Basic validation
    const validationResult = validateRootConfiguration(config)
    if (!validationResult.valid) {
      return {
        success: false,
        config: null,
        errors: validationResult.errors
      }
    }
    
    return {
      success: true,
      config,
      errors: []
    }
  } catch (error) {
    return {
      success: false,
      config: null,
      errors: [`Failed to parse .phase-apps.json: ${error instanceof Error ? error.message : String(error)}`]
    }
  }
}

/**
 * Load package.json phase configuration
 */
function loadPackageConfiguration(appPath: string): AppPhaseConfig | null {
  const packagePath = path.join(appPath, 'package.json')
  
  if (!fs.existsSync(packagePath)) {
    return null
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
    return pkg.phase || null
  } catch (error) {
    console.warn(`Failed to parse package.json phase configuration: ${error}`)
    return null
  }
}

/**
 * Resolve configuration with precedence system
 */
function resolveConfiguration(
  appName: string,
  packageConfig: AppPhaseConfig | null,
  rootConfig: PhaseAppsConfig | null,
  isPackageType: boolean
): ResolvedAppConfig | null {
  // Get base configuration from root config
  const baseConfig = isPackageType 
    ? rootConfig?.packages?.[appName]
    : rootConfig?.apps?.[appName]
  
  if (!baseConfig && !packageConfig) {
    return null
  }
  
  // Apply defaults
  const defaults: DefaultPhaseConfig = {
    environment: 'development',
    fallbackEnvFiles: ['.env.local', '.env'],
    validation: { strict: false },
    timeout: 5000,
    retries: 3,
    ...rootConfig?.defaults
  }
  
  // Merge configurations with precedence: package.json > root config > defaults
  const resolved: ResolvedAppConfig = {
    appName,
    phaseAppName: packageConfig?.phaseAppName || baseConfig?.phaseAppName || `AI.C9d.${appName}`,
    environment: packageConfig?.environment || baseConfig?.environment || defaults.environment!,
    fallbackEnvFiles: packageConfig?.fallbackEnvFiles || baseConfig?.fallbackEnvFiles || defaults.fallbackEnvFiles!,
    validation: {
      strict: packageConfig?.validation?.strict ?? baseConfig?.validation?.strict ?? defaults.validation?.strict ?? false
    },
    timeout: packageConfig?.timeout || baseConfig?.timeout || defaults.timeout!,
    retries: packageConfig?.retries || baseConfig?.retries || defaults.retries!
  }
  
  return resolved
}

/**
 * Validate root configuration structure
 */
function validateRootConfiguration(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!config.version) {
    errors.push('Missing required field: version')
  }
  
  if (!config.apps || typeof config.apps !== 'object') {
    errors.push('Missing or invalid required field: apps')
  }
  
  // Validate app configurations
  if (config.apps) {
    for (const [appName, appConfig] of Object.entries(config.apps)) {
      if (!appConfig || typeof appConfig !== 'object') {
        errors.push(`Invalid app configuration for: ${appName}`)
        continue
      }
      
      const app = appConfig as any
      if (!app.phaseAppName) {
        errors.push(`Missing phaseAppName for app: ${appName}`)
      }
      
      if (app.environment && !['development', 'staging', 'production'].includes(app.environment)) {
        errors.push(`Invalid environment for app ${appName}: ${app.environment}`)
      }
    }
  }
  
  // Validate package configurations
  if (config.packages) {
    for (const [packageName, packageConfig] of Object.entries(config.packages)) {
      if (!packageConfig || typeof packageConfig !== 'object') {
        errors.push(`Invalid package configuration for: ${packageName}`)
        continue
      }
      
      const pkg = packageConfig as any
      if (!pkg.phaseAppName) {
        errors.push(`Missing phaseAppName for package: ${packageName}`)
      }
      
      if (pkg.environment && !['development', 'staging', 'production'].includes(pkg.environment)) {
        errors.push(`Invalid environment for package ${packageName}: ${pkg.environment}`)
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get app/package name from path
 */
function getAppName(appPath: string): string {
  return path.basename(appPath)
}

/**
 * Determine if the current path is a package or app
 */
function isPackage(currentPath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, currentPath)
  return relativePath.startsWith('packages/')
}

/**
 * Find monorepo root path
 */
function findRootPath(startPath: string): string | null {
  let currentPath = startPath
  
  while (currentPath !== path.parse(currentPath).root) {
    if (fs.existsSync(path.join(currentPath, 'pnpm-workspace.yaml'))) {
      return currentPath
    }
    currentPath = path.dirname(currentPath)
  }
  
  return null
}

/**
 * Legacy function for backward compatibility
 */
export function loadAppConfiguration(appPath?: string): ResolvedAppConfig | null {
  const result = loadPhaseConfiguration(appPath)
  return result.success ? result.config : null
}