/**
 * Configuration utilities for monorepo-wide usage
 */

import * as fs from 'fs'
import * as path from 'path'
import { loadPhaseConfiguration, loadAppConfiguration } from './config-loader'
import { validatePhaseAppsConfig, validateResolvedConfig, ConfigValidationResult } from './config-validator'
import { ResolvedAppConfig, PhaseAppsConfig } from './types'

/**
 * Get configuration for current working directory
 */
export function getCurrentAppConfig(): ResolvedAppConfig | null {
  return loadAppConfiguration()
}

/**
 * Get configuration for specific app/package
 */
export function getAppConfig(appName: string, rootPath?: string): ResolvedAppConfig | null {
  const root = rootPath || findMonorepoRoot()
  if (!root) return null
  
  // Try apps first
  const appPath = path.join(root, 'apps', appName)
  if (fs.existsSync(appPath)) {
    return loadAppConfiguration(appPath)
  }
  
  // Try packages
  const packagePath = path.join(root, 'packages', appName)
  if (fs.existsSync(packagePath)) {
    return loadAppConfiguration(packagePath)
  }
  
  return null
}

/**
 * List all configured apps and packages
 */
export function listAllConfigurations(rootPath?: string): {
  apps: Array<{ name: string; config: ResolvedAppConfig }>
  packages: Array<{ name: string; config: ResolvedAppConfig }>
  errors: string[]
} {
  const root = rootPath || findMonorepoRoot()
  const result = {
    apps: [] as Array<{ name: string; config: ResolvedAppConfig }>,
    packages: [] as Array<{ name: string; config: ResolvedAppConfig }>,
    errors: [] as string[]
  }
  
  if (!root) {
    result.errors.push('Could not find monorepo root')
    return result
  }
  
  // Load apps
  const appsDir = path.join(root, 'apps')
  if (fs.existsSync(appsDir)) {
    const apps = fs.readdirSync(appsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    
    for (const appName of apps) {
      const config = getAppConfig(appName, root)
      if (config) {
        result.apps.push({ name: appName, config })
      } else {
        result.errors.push(`No configuration found for app: ${appName}`)
      }
    }
  }
  
  // Load packages
  const packagesDir = path.join(root, 'packages')
  if (fs.existsSync(packagesDir)) {
    const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    
    for (const packageName of packages) {
      const config = getAppConfig(packageName, root)
      if (config) {
        result.packages.push({ name: packageName, config })
      } else {
        result.errors.push(`No configuration found for package: ${packageName}`)
      }
    }
  }
  
  return result
}

/**
 * Validate all configurations in the monorepo
 */
export function validateAllConfigurations(rootPath?: string): {
  valid: boolean
  results: Array<{
    name: string
    type: 'app' | 'package'
    valid: boolean
    errors: string[]
    warnings: string[]
  }>
  globalErrors: string[]
} {
  const root = rootPath || findMonorepoRoot()
  const results: Array<{
    name: string
    type: 'app' | 'package'
    valid: boolean
    errors: string[]
    warnings: string[]
  }> = []
  const globalErrors: string[] = []
  
  if (!root) {
    return {
      valid: false,
      results: [],
      globalErrors: ['Could not find monorepo root']
    }
  }
  
  // Validate root configuration file
  const rootConfigPath = path.join(root, '.phase-apps.json')
  const rootValidation = validatePhaseAppsConfig(rootConfigPath)
  if (!rootValidation.valid) {
    globalErrors.push(...rootValidation.errors)
  }
  
  // Get all configurations
  const allConfigs = listAllConfigurations(root)
  globalErrors.push(...allConfigs.errors)
  
  // Validate each app configuration
  for (const { name, config } of allConfigs.apps) {
    const validation = validateResolvedConfig(config)
    results.push({
      name,
      type: 'app',
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    })
  }
  
  // Validate each package configuration
  for (const { name, config } of allConfigs.packages) {
    const validation = validateResolvedConfig(config)
    results.push({
      name,
      type: 'package',
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    })
  }
  
  const allValid = globalErrors.length === 0 && results.every(r => r.valid)
  
  return {
    valid: allValid,
    results,
    globalErrors
  }
}

/**
 * Get Phase.dev app name for current directory
 */
export function getPhaseAppName(appPath?: string): string | null {
  const config = loadAppConfiguration(appPath)
  return config?.phaseAppName || null
}

/**
 * Get environment for current directory
 */
export function getEnvironment(appPath?: string): string {
  const config = loadAppConfiguration(appPath)
  return config?.environment || 'development'
}

/**
 * Get fallback environment files for current directory
 */
export function getFallbackEnvFiles(appPath?: string): string[] {
  const config = loadAppConfiguration(appPath)
  return config?.fallbackEnvFiles || ['.env.local', '.env']
}

/**
 * Check if strict validation is enabled
 */
export function isStrictValidation(appPath?: string): boolean {
  const config = loadAppConfiguration(appPath)
  return config?.validation?.strict || false
}

/**
 * Get timeout configuration
 */
export function getTimeout(appPath?: string): number {
  const config = loadAppConfiguration(appPath)
  return config?.timeout || 5000
}

/**
 * Get retry configuration
 */
export function getRetries(appPath?: string): number {
  const config = loadAppConfiguration(appPath)
  return config?.retries || 3
}

/**
 * Find monorepo root directory
 */
export function findMonorepoRoot(startPath?: string): string | null {
  let currentPath = startPath || process.cwd()
  
  while (currentPath !== path.parse(currentPath).root) {
    if (fs.existsSync(path.join(currentPath, 'pnpm-workspace.yaml'))) {
      return currentPath
    }
    currentPath = path.dirname(currentPath)
  }
  
  return null
}

/**
 * Check if current directory is an app
 */
export function isApp(appPath?: string): boolean {
  const cwd = appPath || process.cwd()
  const root = findMonorepoRoot(cwd)
  if (!root) return false
  
  const relativePath = path.relative(root, cwd)
  return relativePath.startsWith('apps/')
}

/**
 * Check if current directory is a package
 */
export function isPackage(appPath?: string): boolean {
  const cwd = appPath || process.cwd()
  const root = findMonorepoRoot(cwd)
  if (!root) return false
  
  const relativePath = path.relative(root, cwd)
  return relativePath.startsWith('packages/')
}

/**
 * Get app/package name from path
 */
export function getAppName(appPath?: string): string {
  const cwd = appPath || process.cwd()
  return path.basename(cwd)
}

/**
 * Create default configuration for an app/package
 */
export function createDefaultConfig(
  name: string, 
  type: 'app' | 'package',
  phaseAppName?: string
): ResolvedAppConfig {
  return {
    appName: name,
    phaseAppName: phaseAppName || `AI.C9d.${name}`,
    environment: 'development',
    fallbackEnvFiles: ['.env.local', '.env'],
    validation: { strict: type === 'app' },
    timeout: 5000,
    retries: 3
  }
}

/**
 * Update root configuration file
 */
export function updateRootConfiguration(
  updates: Partial<PhaseAppsConfig>,
  rootPath?: string
): { success: boolean; errors: string[] } {
  const root = rootPath || findMonorepoRoot()
  if (!root) {
    return {
      success: false,
      errors: ['Could not find monorepo root']
    }
  }
  
  const configPath = path.join(root, '.phase-apps.json')
  
  try {
    let existingConfig: PhaseAppsConfig = {
      version: '1.0.0',
      apps: {},
      packages: {}
    }
    
    // Load existing configuration if it exists
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      existingConfig = JSON.parse(content)
    }
    
    // Merge updates
    const updatedConfig: PhaseAppsConfig = {
      ...existingConfig,
      ...updates,
      apps: { ...existingConfig.apps, ...updates.apps },
      packages: { ...existingConfig.packages, ...updates.packages },
      defaults: { ...existingConfig.defaults, ...updates.defaults }
    }
    
    // Validate before saving
    const validation = validatePhaseAppsConfig(configPath)
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      }
    }
    
    // Write updated configuration
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2))
    
    return {
      success: true,
      errors: []
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to update configuration: ${error instanceof Error ? error.message : String(error)}`]
    }
  }
}

/**
 * Generate configuration report
 */
export function generateConfigurationReport(rootPath?: string): string {
  const validation = validateAllConfigurations(rootPath)
  const allConfigs = listAllConfigurations(rootPath)
  
  let report = '# Phase.dev Configuration Report\n\n'
  
  // Summary
  report += `## Summary\n`
  report += `- **Status**: ${validation.valid ? '✅ Valid' : '❌ Invalid'}\n`
  report += `- **Apps**: ${allConfigs.apps.length}\n`
  report += `- **Packages**: ${allConfigs.packages.length}\n`
  report += `- **Total Errors**: ${validation.globalErrors.length + validation.results.reduce((sum, r) => sum + r.errors.length, 0)}\n`
  report += `- **Total Warnings**: ${validation.results.reduce((sum, r) => sum + r.warnings.length, 0)}\n\n`
  
  // Global errors
  if (validation.globalErrors.length > 0) {
    report += `## Global Errors\n`
    for (const error of validation.globalErrors) {
      report += `- ❌ ${error}\n`
    }
    report += '\n'
  }
  
  // Apps
  if (allConfigs.apps.length > 0) {
    report += `## Apps\n`
    for (const { name, config } of allConfigs.apps) {
      const result = validation.results.find(r => r.name === name && r.type === 'app')
      const status = result?.valid ? '✅' : '❌'
      report += `### ${status} ${name}\n`
      report += `- **Phase App**: ${config.phaseAppName}\n`
      report += `- **Environment**: ${config.environment}\n`
      report += `- **Strict Validation**: ${config.validation.strict ? 'Yes' : 'No'}\n`
      
      if (result && result.errors.length > 0) {
        report += `- **Errors**:\n`
        for (const error of result.errors) {
          report += `  - ${error}\n`
        }
      }
      
      if (result && result.warnings.length > 0) {
        report += `- **Warnings**:\n`
        for (const warning of result.warnings) {
          report += `  - ${warning}\n`
        }
      }
      
      report += '\n'
    }
  }
  
  // Packages
  if (allConfigs.packages.length > 0) {
    report += `## Packages\n`
    for (const { name, config } of allConfigs.packages) {
      const result = validation.results.find(r => r.name === name && r.type === 'package')
      const status = result?.valid ? '✅' : '❌'
      report += `### ${status} ${name}\n`
      report += `- **Phase App**: ${config.phaseAppName}\n`
      report += `- **Environment**: ${config.environment}\n`
      
      if (result && result.errors.length > 0) {
        report += `- **Errors**:\n`
        for (const error of result.errors) {
          report += `  - ${error}\n`
        }
      }
      
      if (result && result.warnings.length > 0) {
        report += `- **Warnings**:\n`
        for (const warning of result.warnings) {
          report += `  - ${warning}\n`
        }
      }
      
      report += '\n'
    }
  }
  
  return report
}