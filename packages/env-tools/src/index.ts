/**
 * @coordinated/env-tools
 * Shared environment management utilities
 */

export * from './types'
export * from './config-loader'
export * from './config-validator'
export * from './config-utils'
export * from './validator'
export * from './env-validator'
export * from './env-wrapper'
export * from './vercel-adapter'
export * from './environment-manager'
export * from './validation-scripts'

// Re-export commonly used functions
export { loadPhaseSecrets, isContainerEnvironment, runEnvWrapper } from './env-wrapper'
export { validateEnvironment, printValidationSummary } from './validator'
export { 
  loadEnvConfig, 
  findEnvConfig, 
  validateEnvironment as validateEnvVars, 
  validateAllEnvironments 
} from './env-validator'
export { loadAppConfig, loadPhaseConfiguration, loadAppConfiguration } from './config-loader'
export { validatePhaseAppsConfig, validateResolvedConfig, validateConfigurationFile } from './config-validator'
export { 
  getCurrentAppConfig, 
  getAppConfig, 
  listAllConfigurations, 
  validateAllConfigurations,
  getPhaseAppName,
  getEnvironment,
  getFallbackEnvFiles,
  isStrictValidation,
  findMonorepoRoot,
  generateConfigurationReport
} from './config-utils'
export { loadVercelPhaseSecrets, VercelPhaseWebpackPlugin } from './vercel-adapter'
export { EnvironmentManager, environmentManager } from './environment-manager'
export { EnvironmentValidator, validateAllApplications } from './validation-scripts'