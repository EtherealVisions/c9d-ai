/**
 * Shared environment validation logic
 */

import chalk from 'chalk'
import { AppEnvConfig, EnvVariable } from './types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export async function validateEnvironment(config: AppEnvConfig): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  console.log(chalk.blue(`🔍 Validating ${config.displayName} environment variables...\n`))

  // Run before hook if provided
  if (config.beforeValidation) {
    await config.beforeValidation()
  }

  // Validate required variables
  const isCI = process.env.CI || process.env.VERCEL || process.env.GITHUB_ACTIONS;

  for (const envVar of config.envVars.required) {
    const value = process.env[envVar.name]

    // Check if this variable is required for the current context
    const isRequired = (envVar as any).buildRequired !== false || !isCI;

    if (!value) {
      if (isRequired) {
        console.log(chalk.red(`❌ ${envVar.name}: MISSING (required)`))
        console.log(chalk.gray(`   ${envVar.description}`))
        if (envVar.example) {
          console.log(chalk.gray(`   Example: ${envVar.example}\n`))
        }
        errors.push(`Missing required: ${envVar.name}`)
      } else {
        console.log(chalk.yellow(`⚠️  ${envVar.name}: Not set (build-time optional)`))
        console.log(chalk.gray(`   ${envVar.description}`))
        console.log(chalk.gray(`   Required at runtime but optional during build\n`))
        warnings.push(`Build-time optional: ${envVar.name}`)
      }
    } else {
      const displayValue = getDisplayValue(envVar, value)
      console.log(chalk.green(`✅ ${envVar.name}: ${displayValue}`))
    }
  }

  // Check optional variables
  if (config.envVars.optional.length > 0) {
    console.log(chalk.yellow('\nOptional variables:'))

    for (const envVar of config.envVars.optional) {
      const value = process.env[envVar.name]

      if (!value) {
        console.log(chalk.yellow(`⚠️  ${envVar.name}: Not set (optional)`))
        console.log(chalk.gray(`   ${envVar.description}\n`))
        warnings.push(`Optional not set: ${envVar.name}`)
      } else {
        const displayValue = getDisplayValue(envVar, value)
        console.log(chalk.green(`✅ ${envVar.name}: ${displayValue}`))
      }
    }
  }

  // Run custom validation if provided
  if (config.customValidation) {
    const customResult = config.customValidation(process.env)
    if (!customResult.valid) {
      errors.push(...customResult.errors)
    }
  }

  const valid = errors.length === 0

  // Run after hook if provided
  if (config.afterValidation) {
    await config.afterValidation(valid)
  }

  return { valid, errors, warnings }
}

function getDisplayValue(envVar: EnvVariable, value: string): string {
  // Hide sensitive values
  if (envVar.sensitive ||
    envVar.name.includes('SECRET') ||
    envVar.name.includes('KEY') ||
    envVar.name.includes('TOKEN') ||
    envVar.name.includes('PASSWORD')) {
    return value.substring(0, 10) + '...'
  }

  // Truncate long values
  if (value.length > 50) {
    return value.substring(0, 50) + '...'
  }

  return value
}

export function printValidationSummary(result: ValidationResult, config: AppEnvConfig): void {
  if (!result.valid) {
    console.log(chalk.red('\n❌ Environment validation failed!'))
    console.log(chalk.red('\n📋 Required environment variables are missing:'))
    result.errors.forEach(error => console.log(chalk.red(`   ${error}`)))

    // Print setup instructions if provided
    printSetupInstructions(config)
  } else {
    console.log(chalk.green('\n✅ All required environment variables are set!'))

    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Some optional variables are not configured'))
      console.log(chalk.yellow('   This may limit functionality but won\'t prevent the app from running'))
    }
  }
}

function printSetupInstructions(config: AppEnvConfig): void {
  console.log(chalk.cyan('\n📚 Setup Instructions:'))
  console.log(chalk.white('1. Copy env.example to .env.development:'))
  console.log(chalk.gray('   cp env.example .env.development'))
  console.log(chalk.white('\n2. Fill in the missing values in .env.development'))
  console.log(chalk.white('\n3. Or configure secrets in Phase.dev dashboard'))
}