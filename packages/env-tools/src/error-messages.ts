/**
 * Enhanced error messages for environment configuration
 * Provides clear, actionable error messages with suggestions
 */

import chalk from 'chalk'

export interface ErrorContext {
  variable?: string
  value?: string
  expected?: string
  appName?: string
  source?: string
}

export class EnvironmentError extends Error {
  public readonly code: string
  public readonly context: ErrorContext
  public readonly suggestion: string

  constructor(code: string, message: string, context: ErrorContext = {}, suggestion = '') {
    super(message)
    this.name = 'EnvironmentError'
    this.code = code
    this.context = context
    this.suggestion = suggestion
  }

  /**
   * Format error for display
   */
  format(): string {
    const lines = [
      chalk.red.bold(`❌ ${this.code}: ${this.message}`)
    ]

    if (this.context.variable) {
      lines.push(chalk.gray(`   Variable: ${this.context.variable}`))
    }

    if (this.context.appName) {
      lines.push(chalk.gray(`   Application: ${this.context.appName}`))
    }

    if (this.context.source) {
      lines.push(chalk.gray(`   Source: ${this.context.source}`))
    }

    if (this.suggestion) {
      lines.push(chalk.cyan(`   💡 ${this.suggestion}`))
    }

    return lines.join('\n')
  }
}

/**
 * Environment error factory with predefined error types
 */
export class EnvironmentErrorFactory {
  
  static missingRequired(variable: string, appName?: string): EnvironmentError {
    return new EnvironmentError(
      'MISSING_REQUIRED_VAR',
      `Required environment variable '${variable}' is not set`,
      { variable, appName },
      `Set ${variable} in your environment or Phase.dev configuration`
    )
  }

  static invalidFormat(variable: string, value: string, expected: string): EnvironmentError {
    return new EnvironmentError(
      'INVALID_FORMAT',
      `Environment variable '${variable}' has invalid format`,
      { variable, value: value.substring(0, 20) + '...', expected },
      `Expected format: ${expected}`
    )
  }

  static phaseConnectionFailed(error: string): EnvironmentError {
    return new EnvironmentError(
      'PHASE_CONNECTION_FAILED',
      'Failed to connect to Phase.dev',
      { source: 'phase.dev' },
      'Check your PHASE_SERVICE_TOKEN and internet connection'
    )
  }

  static phaseTokenInvalid(token?: string): EnvironmentError {
    const tokenPreview = token ? token.substring(0, 10) + '...' : 'not provided'
    
    return new EnvironmentError(
      'PHASE_TOKEN_INVALID',
      'Phase.dev service token is invalid or expired',
      { value: tokenPreview, source: 'phase.dev' },
      'Generate a new service token from Phase.dev dashboard'
    )
  }

  static phaseAppNotFound(appName: string): EnvironmentError {
    return new EnvironmentError(
      'PHASE_APP_NOT_FOUND',
      `Phase.dev app '${appName}' not found`,
      { appName, source: 'phase.dev' },
      'Check app name in package.json phase configuration'
    )
  }

  static phaseEnvironmentNotFound(environment: string, appName: string): EnvironmentError {
    return new EnvironmentError(
      'PHASE_ENV_NOT_FOUND',
      `Phase.dev environment '${environment}' not found for app '${appName}'`,
      { expected: environment, appName, source: 'phase.dev' },
      'Create the environment in Phase.dev dashboard or check environment mapping'
    )
  }

  static configFileNotFound(filePath: string): EnvironmentError {
    return new EnvironmentError(
      'CONFIG_FILE_NOT_FOUND',
      `Environment configuration file not found: ${filePath}`,
      { source: filePath },
      'Create env.config.json file or check file path'
    )
  }

  static configFileInvalid(filePath: string, parseError: string): EnvironmentError {
    return new EnvironmentError(
      'CONFIG_FILE_INVALID',
      `Invalid configuration file: ${filePath}`,
      { source: filePath },
      `Fix JSON syntax error: ${parseError}`
    )
  }

  static envFileNotFound(filePath: string): EnvironmentError {
    return new EnvironmentError(
      'ENV_FILE_NOT_FOUND',
      `Environment file not found: ${filePath}`,
      { source: filePath },
      'Create the environment file or check file path'
    )
  }

  static envFileInvalid(filePath: string, parseError: string): EnvironmentError {
    return new EnvironmentError(
      'ENV_FILE_INVALID',
      `Invalid environment file: ${filePath}`,
      { source: filePath },
      `Fix environment file syntax: ${parseError}`
    )
  }

  static databaseConnectionFailed(url?: string): EnvironmentError {
    const urlPreview = url ? url.substring(0, 20) + '...' : 'not provided'
    
    return new EnvironmentError(
      'DATABASE_CONNECTION_FAILED',
      'Failed to connect to database',
      { variable: 'DATABASE_URL', value: urlPreview },
      'Check DATABASE_URL format and database availability'
    )
  }

  static clerkConfigurationInvalid(): EnvironmentError {
    return new EnvironmentError(
      'CLERK_CONFIG_INVALID',
      'Clerk authentication configuration is invalid',
      { source: 'clerk' },
      'Check CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
    )
  }

  static validationFailed(errors: string[]): EnvironmentError {
    return new EnvironmentError(
      'VALIDATION_FAILED',
      `Environment validation failed with ${errors.length} error(s)`,
      {},
      'Fix the validation errors listed above'
    )
  }

  static networkError(service: string, error: string): EnvironmentError {
    return new EnvironmentError(
      'NETWORK_ERROR',
      `Network error connecting to ${service}`,
      { source: service },
      `Check internet connection and ${service} service status`
    )
  }

  static permissionDenied(resource: string): EnvironmentError {
    return new EnvironmentError(
      'PERMISSION_DENIED',
      `Permission denied accessing ${resource}`,
      { source: resource },
      'Check access permissions and credentials'
    )
  }

  static timeoutError(operation: string, timeout: number): EnvironmentError {
    return new EnvironmentError(
      'TIMEOUT_ERROR',
      `Operation '${operation}' timed out after ${timeout}ms`,
      {},
      'Check network connection or increase timeout value'
    )
  }
}

/**
 * Format multiple errors for display
 */
export function formatErrors(errors: EnvironmentError[]): string {
  if (errors.length === 0) {
    return ''
  }

  const lines = [
    chalk.red.bold(`\n🚨 ${errors.length} Environment Error(s):`),
    chalk.gray('='.repeat(60))
  ]

  errors.forEach((error, index) => {
    lines.push(`\n${index + 1}. ${error.format()}`)
  })

  lines.push(chalk.gray('\n' + '='.repeat(60)))

  return lines.join('\n')
}

/**
 * Create user-friendly setup instructions based on errors
 */
export function generateSetupInstructions(errors: EnvironmentError[]): string {
  const instructions = [
    chalk.cyan.bold('\n📚 Setup Instructions:')
  ]

  const hasPhaseErrors = errors.some(e => e.code.startsWith('PHASE_'))
  const hasMissingVars = errors.some(e => e.code === 'MISSING_REQUIRED_VAR')
  const hasConfigErrors = errors.some(e => e.code.includes('CONFIG_'))

  if (hasPhaseErrors) {
    instructions.push(
      chalk.white('\n1. Phase.dev Setup:'),
      chalk.gray('   • Check PHASE_SERVICE_TOKEN is set correctly'),
      chalk.gray('   • Verify app configuration in package.json'),
      chalk.gray('   • Ensure environments exist in Phase.dev dashboard')
    )
  }

  if (hasMissingVars) {
    instructions.push(
      chalk.white('\n2. Missing Variables:'),
      chalk.gray('   • Set required variables in Phase.dev or .env files'),
      chalk.gray('   • Check variable names and formats'),
      chalk.gray('   • Refer to env.config.json for requirements')
    )
  }

  if (hasConfigErrors) {
    instructions.push(
      chalk.white('\n3. Configuration Files:'),
      chalk.gray('   • Create missing env.config.json files'),
      chalk.gray('   • Fix JSON syntax errors'),
      chalk.gray('   • Validate configuration schema')
    )
  }

  instructions.push(
    chalk.white('\n4. Get Help:'),
    chalk.gray('   • Run: pnpm validate:env:debug for detailed output'),
    chalk.gray('   • Check documentation for setup guides'),
    chalk.gray('   • Contact team for Phase.dev access')
  )

  return instructions.join('\n')
}