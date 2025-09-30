/**
 * Configuration validation utilities
 */

import * as fs from 'fs'
import * as path from 'path'
import { PhaseAppsConfig, ResolvedAppConfig } from './types'

export interface ConfigValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate .phase-apps.json configuration file
 */
export function validatePhaseAppsConfig(configPath: string): ConfigValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check if file exists
  if (!fs.existsSync(configPath)) {
    return {
      valid: false,
      errors: [`Configuration file not found: ${configPath}`],
      warnings: []
    }
  }
  
  let config: PhaseAppsConfig
  
  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    config = JSON.parse(content)
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`],
      warnings: []
    }
  }
  
  // Validate schema structure
  validateSchema(config, errors, warnings)
  
  // Validate business rules
  validateBusinessRules(config, errors, warnings)
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate configuration schema
 */
function validateSchema(config: any, errors: string[], warnings: string[]): void {
  // Required fields
  if (!config.version) {
    errors.push('Missing required field: version')
  } else if (typeof config.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(config.version)) {
    errors.push('Invalid version format. Expected semantic version (e.g., "1.0.0")')
  }
  
  if (!config.apps) {
    errors.push('Missing required field: apps')
  } else if (typeof config.apps !== 'object' || Array.isArray(config.apps)) {
    errors.push('Field "apps" must be an object')
  }
  
  // Optional fields validation
  if (config.packages && (typeof config.packages !== 'object' || Array.isArray(config.packages))) {
    errors.push('Field "packages" must be an object')
  }
  
  if (config.defaults && (typeof config.defaults !== 'object' || Array.isArray(config.defaults))) {
    errors.push('Field "defaults" must be an object')
  }
  
  // Validate apps
  if (config.apps && typeof config.apps === 'object') {
    for (const [appName, appConfig] of Object.entries(config.apps)) {
      validateAppConfig(appName, appConfig as any, 'app', errors, warnings)
    }
  }
  
  // Validate packages
  if (config.packages && typeof config.packages === 'object') {
    for (const [packageName, packageConfig] of Object.entries(config.packages)) {
      validatePackageConfig(packageName, packageConfig as any, errors, warnings)
    }
  }
  
  // Validate defaults
  if (config.defaults) {
    validateDefaultsConfig(config.defaults, errors, warnings)
  }
}

/**
 * Validate app configuration
 */
function validateAppConfig(name: string, config: any, type: 'app' | 'package', errors: string[], warnings: string[]): void {
  const prefix = `${type} "${name}"`
  
  if (!config || typeof config !== 'object') {
    errors.push(`${prefix}: configuration must be an object`)
    return
  }
  
  // Required fields
  if (!config.phaseAppName) {
    errors.push(`${prefix}: missing required field "phaseAppName"`)
  } else if (typeof config.phaseAppName !== 'string') {
    errors.push(`${prefix}: "phaseAppName" must be a string`)
  } else if (!/^[a-zA-Z0-9._-]+$/.test(config.phaseAppName)) {
    errors.push(`${prefix}: "phaseAppName" contains invalid characters. Use only letters, numbers, dots, hyphens, and underscores`)
  }
  
  // Optional fields
  if (config.environment && !['development', 'staging', 'production'].includes(config.environment)) {
    errors.push(`${prefix}: "environment" must be one of: development, staging, production`)
  }
  
  if (config.fallbackEnvFiles) {
    if (!Array.isArray(config.fallbackEnvFiles)) {
      errors.push(`${prefix}: "fallbackEnvFiles" must be an array`)
    } else {
      config.fallbackEnvFiles.forEach((file: any, index: number) => {
        if (typeof file !== 'string') {
          errors.push(`${prefix}: "fallbackEnvFiles[${index}]" must be a string`)
        }
      })
    }
  }
  
  if (config.validation) {
    if (typeof config.validation !== 'object') {
      errors.push(`${prefix}: "validation" must be an object`)
    } else if (config.validation.strict !== undefined && typeof config.validation.strict !== 'boolean') {
      errors.push(`${prefix}: "validation.strict" must be a boolean`)
    }
  }
  
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 30000) {
      errors.push(`${prefix}: "timeout" must be a number between 1000 and 30000`)
    }
  }
  
  if (config.retries !== undefined) {
    if (typeof config.retries !== 'number' || config.retries < 0 || config.retries > 10) {
      errors.push(`${prefix}: "retries" must be a number between 0 and 10`)
    }
  }
  
  // Warnings for best practices
  if (!config.environment) {
    warnings.push(`${prefix}: no default environment specified, will use "development"`)
  }
  
  if (!config.fallbackEnvFiles || config.fallbackEnvFiles.length === 0) {
    warnings.push(`${prefix}: no fallback environment files specified`)
  }
}

/**
 * Validate package configuration
 */
function validatePackageConfig(name: string, config: any, errors: string[], warnings: string[]): void {
  validateAppConfig(name, config, 'package', errors, warnings)
  
  // Package-specific validation
  if (config.validation && config.validation.strict === true) {
    warnings.push(`package "${name}": strict validation is unusual for packages, consider using it only for apps`)
  }
}

/**
 * Validate defaults configuration
 */
function validateDefaultsConfig(config: any, errors: string[], warnings: string[]): void {
  if (config.environment && !['development', 'staging', 'production'].includes(config.environment)) {
    errors.push('defaults: "environment" must be one of: development, staging, production')
  }
  
  if (config.fallbackEnvFiles) {
    if (!Array.isArray(config.fallbackEnvFiles)) {
      errors.push('defaults: "fallbackEnvFiles" must be an array')
    } else {
      config.fallbackEnvFiles.forEach((file: any, index: number) => {
        if (typeof file !== 'string') {
          errors.push(`defaults: "fallbackEnvFiles[${index}]" must be a string`)
        }
      })
    }
  }
  
  if (config.validation) {
    if (typeof config.validation !== 'object') {
      errors.push('defaults: "validation" must be an object')
    } else if (config.validation.strict !== undefined && typeof config.validation.strict !== 'boolean') {
      errors.push('defaults: "validation.strict" must be a boolean')
    }
  }
  
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 30000) {
      errors.push('defaults: "timeout" must be a number between 1000 and 30000')
    }
  }
  
  if (config.retries !== undefined) {
    if (typeof config.retries !== 'number' || config.retries < 0 || config.retries > 10) {
      errors.push('defaults: "retries" must be a number between 0 and 10')
    }
  }
}

/**
 * Validate business rules
 */
function validateBusinessRules(config: PhaseAppsConfig, errors: string[], warnings: string[]): void {
  // Check for duplicate phaseAppNames
  const phaseAppNames = new Set<string>()
  const duplicates = new Set<string>()
  
  // Collect from apps
  if (config.apps) {
    for (const [appName, appConfig] of Object.entries(config.apps)) {
      if (appConfig.phaseAppName) {
        if (phaseAppNames.has(appConfig.phaseAppName)) {
          duplicates.add(appConfig.phaseAppName)
        }
        phaseAppNames.add(appConfig.phaseAppName)
      }
    }
  }
  
  // Collect from packages
  if (config.packages) {
    for (const [packageName, packageConfig] of Object.entries(config.packages)) {
      if (packageConfig.phaseAppName) {
        if (phaseAppNames.has(packageConfig.phaseAppName)) {
          duplicates.add(packageConfig.phaseAppName)
        }
        phaseAppNames.add(packageConfig.phaseAppName)
      }
    }
  }
  
  // Report duplicates
  for (const duplicate of duplicates) {
    warnings.push(`Duplicate phaseAppName "${duplicate}" found. This may cause environment variable conflicts.`)
  }
  
  // Check for reasonable timeout values
  const checkTimeout = (name: string, timeout: number | undefined, type: string) => {
    if (timeout && timeout > 10000) {
      warnings.push(`${type} "${name}": timeout of ${timeout}ms is quite high, consider reducing for better performance`)
    }
  }
  
  if (config.apps) {
    for (const [appName, appConfig] of Object.entries(config.apps)) {
      checkTimeout(appName, appConfig.timeout, 'app')
    }
  }
  
  if (config.packages) {
    for (const [packageName, packageConfig] of Object.entries(config.packages)) {
      checkTimeout(packageName, packageConfig.timeout, 'package')
    }
  }
  
  if (config.defaults?.timeout) {
    checkTimeout('defaults', config.defaults.timeout, 'defaults')
  }
}

/**
 * Validate resolved app configuration
 */
export function validateResolvedConfig(config: ResolvedAppConfig): ConfigValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!config.phaseAppName) {
    errors.push('Missing phaseAppName in resolved configuration')
  }
  
  if (!config.environment) {
    errors.push('Missing environment in resolved configuration')
  }
  
  if (!config.fallbackEnvFiles || config.fallbackEnvFiles.length === 0) {
    warnings.push('No fallback environment files configured')
  }
  
  if (config.timeout < 1000) {
    warnings.push('Timeout is very low, may cause connection issues')
  }
  
  if (config.retries > 5) {
    warnings.push('High retry count may cause slow failure recovery')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate configuration file format and provide suggestions
 */
export function validateConfigurationFile(filePath: string): ConfigValidationResult & { suggestions?: string[] } {
  const result = validatePhaseAppsConfig(filePath)
  const suggestions: string[] = []
  
  // Add suggestions based on common issues
  if (result.errors.some(error => error.includes('phaseAppName'))) {
    suggestions.push('Phase app names should follow the pattern: AI.C9d.AppName')
    suggestions.push('Use only letters, numbers, dots, hyphens, and underscores in phase app names')
  }
  
  if (result.errors.some(error => error.includes('environment'))) {
    suggestions.push('Valid environments are: development, staging, production')
  }
  
  if (result.warnings.some(warning => warning.includes('fallback'))) {
    suggestions.push('Consider adding fallback environment files like [".env.local", ".env"]')
  }
  
  if (result.warnings.some(warning => warning.includes('timeout'))) {
    suggestions.push('Recommended timeout range: 3000-8000ms for most applications')
  }
  
  return {
    ...result,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  }
}