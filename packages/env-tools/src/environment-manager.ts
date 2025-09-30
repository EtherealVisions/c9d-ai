/**
 * Enhanced Environment Configuration Management System
 * Provides robust environment variable loading with Phase.dev integration and fallback mechanisms
 */

import * as fs from 'fs'
import * as path from 'path'
import chalk from 'chalk'
import { loadAppConfig } from './config-loader'
import { loadPhaseSecrets, isContainerEnvironment } from './env-wrapper'
import { validateEnvironment, printValidationSummary } from './validator'
import { AppEnvConfig, EnvironmentManagerOptions, EnvironmentLoadResult } from './types'
import { EnvironmentError, EnvironmentErrorFactory, formatErrors } from './error-messages'

export class EnvironmentManager {
  private options: EnvironmentManagerOptions
  private loadedSources: string[] = []
  private validationResults: any = null

  constructor(options: EnvironmentManagerOptions = {}) {
    this.options = {
      debug: false,
      strict: true,
      enablePhase: true,
      enableValidation: true,
      fallbackToLocal: true,
      ...options
    }
  }

  /**
   * Load environment configuration with comprehensive fallback strategy
   */
  async loadEnvironment(appPath?: string): Promise<EnvironmentLoadResult> {
    const startTime = Date.now()
    const cwd = appPath || process.cwd()
    
    if (this.options.debug) {
      console.log(chalk.blue(`🔧 Environment Manager: Loading configuration for ${path.basename(cwd)}`))
    }

    // Reset state
    this.loadedSources = []
    this.validationResults = null

    try {
      // Step 1: Load app configuration
      const appConfig = await this.loadAppConfiguration(cwd)
      
      // Step 2: Load Phase.dev secrets (if enabled)
      let phaseLoaded = false
      if (this.options.enablePhase && !isContainerEnvironment()) {
        phaseLoaded = await this.loadPhaseConfiguration(cwd, appConfig)
      }

      // Step 3: Load local environment files (if Phase failed or as fallback)
      if (!phaseLoaded && this.options.fallbackToLocal) {
        await this.loadLocalEnvironmentFiles(cwd, appConfig)
      }

      // Step 4: Validate environment (if enabled)
      if (this.options.enableValidation && appConfig) {
        this.validationResults = await this.validateConfiguration(appConfig)
      }

      const duration = Date.now() - startTime
      
      return {
        success: true,
        sources: this.loadedSources,
        appConfig,
        validation: this.validationResults,
        phaseEnabled: phaseLoaded,
        duration,
        errors: []
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (this.options.debug) {
        console.error(chalk.red(`❌ Environment loading failed: ${errorMessage}`))
      }

      return {
        success: false,
        sources: this.loadedSources,
        appConfig: null,
        validation: null,
        phaseEnabled: false,
        duration: Date.now() - startTime,
        errors: [errorMessage]
      }
    }
  }

  /**
   * Load app-specific configuration
   */
  private async loadAppConfiguration(cwd: string): Promise<AppEnvConfig | null> {
    try {
      const config = loadAppConfig(cwd)
      
      if (config) {
        this.loadedSources.push('app-config')
        if (this.options.debug) {
          console.log(chalk.green(`✅ Loaded app configuration: ${config.displayName || config.appName}`))
        }
      } else if (this.options.debug) {
        console.log(chalk.yellow(`⚠️  No app configuration found in ${cwd}`))
      }

      return config
    } catch (error) {
      if (this.options.debug) {
        console.warn(chalk.yellow(`⚠️  Failed to load app configuration: ${error}`))
      }
      return null
    }
  }

  /**
   * Load Phase.dev secrets with enhanced error handling
   */
  private async loadPhaseConfiguration(cwd: string, appConfig: AppEnvConfig | null): Promise<boolean> {
    try {
      const phaseLoaded = await loadPhaseSecrets({
        appNamespace: this.getAppNamespace(cwd, appConfig),
        cwd
      })

      if (phaseLoaded) {
        this.loadedSources.push('phase.dev')
        if (this.options.debug) {
          console.log(chalk.green('✅ Phase.dev secrets loaded successfully'))
        }
      }

      return phaseLoaded
    } catch (error) {
      if (this.options.debug) {
        console.warn(chalk.yellow(`⚠️  Phase.dev loading failed: ${error}`))
      }
      return false
    }
  }

  /**
   * Load local environment files with fallback strategy
   */
  private async loadLocalEnvironmentFiles(cwd: string, appConfig: AppEnvConfig | null): Promise<void> {
    const dotenv = require('dotenv')
    
    // Determine environment files to try
    const envFiles = this.getEnvironmentFiles(cwd, appConfig)
    
    for (const envFile of envFiles) {
      const envPath = path.resolve(cwd, envFile)
      
      if (fs.existsSync(envPath)) {
        try {
          const result = dotenv.config({ path: envPath })
          
          if (result.error) {
            throw result.error
          }

          this.loadedSources.push(`local:${envFile}`)
          
          if (this.options.debug) {
            console.log(chalk.green(`✅ Loaded environment from ${envFile}`))
          }
          
          // Stop after first successful load
          return
        } catch (error) {
          if (this.options.debug) {
            console.warn(chalk.yellow(`⚠️  Failed to load ${envFile}: ${error}`))
          }
        }
      }
    }

    // If no files found, log warning
    if (this.loadedSources.length === 0) {
      const message = `No environment files found. Tried: ${envFiles.join(', ')}`
      
      if (this.options.debug) {
        console.warn(chalk.yellow(`⚠️  ${message}`))
      }
      
      if (this.options.strict) {
        throw new Error(message)
      }
    }
  }

  /**
   * Validate environment configuration
   */
  private async validateConfiguration(appConfig: AppEnvConfig): Promise<any> {
    try {
      const result = await validateEnvironment(appConfig)
      
      if (this.options.debug) {
        printValidationSummary(result, appConfig)
      }

      if (!result.valid && this.options.strict) {
        throw new Error(`Environment validation failed: ${result.errors.join(', ')}`)
      }

      return result
    } catch (error) {
      if (this.options.strict) {
        throw error
      }
      
      if (this.options.debug) {
        console.warn(chalk.yellow(`⚠️  Validation failed: ${error}`))
      }
      
      return { valid: false, errors: [String(error)], warnings: [] }
    }
  }

  /**
   * Get app namespace for Phase.dev
   */
  private getAppNamespace(cwd: string, appConfig: AppEnvConfig | null): string | undefined {
    // Try from options first
    if (this.options.appNamespace) {
      return this.options.appNamespace
    }

    // Try from app config
    if (appConfig?.appName) {
      return appConfig.appName
    }

    // Try from directory name
    const dirName = path.basename(cwd)
    return dirName
  }

  /**
   * Get environment files to try in order
   */
  private getEnvironmentFiles(cwd: string, appConfig: AppEnvConfig | null): string[] {
    const nodeEnv = process.env.NODE_ENV || 'development'
    
    // Start with app config defaults
    const files: string[] = []
    
    if (appConfig?.defaults?.envFile) {
      files.push(appConfig.defaults.envFile)
    }
    
    if (appConfig?.defaults?.fallbackFiles) {
      files.push(...appConfig.defaults.fallbackFiles)
    }

    // Add standard environment files if not already included
    const standardFiles = [
      `.env.${nodeEnv}.local`,
      `.env.${nodeEnv}`,
      '.env.local',
      '.env'
    ]

    for (const file of standardFiles) {
      if (!files.includes(file)) {
        files.push(file)
      }
    }

    return files
  }

  /**
   * Get current environment status
   */
  getStatus(): EnvironmentStatus {
    return {
      loaded: this.loadedSources.length > 0,
      sources: this.loadedSources,
      validated: this.validationResults !== null,
      valid: this.validationResults?.valid || false,
      phaseEnabled: this.loadedSources.includes('phase.dev'),
      containerEnvironment: isContainerEnvironment()
    }
  }

  /**
   * Clear loaded environment (for testing)
   */
  reset(): void {
    this.loadedSources = []
    this.validationResults = null
  }
}

export interface EnvironmentStatus {
  loaded: boolean
  sources: string[]
  validated: boolean
  valid: boolean
  phaseEnabled: boolean
  containerEnvironment: boolean
}

// Export singleton instance
export const environmentManager = new EnvironmentManager()