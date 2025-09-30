/**
 * Environment validation scripts for all applications
 * Provides comprehensive validation with clear error messages
 */

import chalk from 'chalk'
import { EnvironmentManager } from './environment-manager'
import { AppEnvConfig, EnvironmentValidationError } from './types'

export class EnvironmentValidator {
  private manager: EnvironmentManager

  constructor(debug = false) {
    this.manager = new EnvironmentManager({
      debug,
      strict: false, // Don't exit on validation failure in validator
      enablePhase: true,
      enableValidation: true,
      fallbackToLocal: true
    })
  }

  /**
   * Validate environment for a specific application
   */
  async validateApplication(appPath: string): Promise<ValidationReport> {
    const startTime = Date.now()
    
    console.log(chalk.blue.bold(`\n🔍 Validating Environment Configuration`))
    console.log(chalk.gray(`Application: ${appPath}`))
    console.log(chalk.gray('='.repeat(60)))

    try {
      // Load environment configuration
      const result = await this.manager.loadEnvironment(appPath)
      
      if (!result.success) {
        return {
          valid: false,
          appName: 'Unknown',
          errors: result.errors.map(error => ({
            variable: 'SYSTEM',
            message: error,
            suggestion: 'Check application configuration and Phase.dev setup'
          })),
          warnings: [],
          sources: result.sources,
          duration: Date.now() - startTime
        }
      }

      // Generate validation report
      const report = this.generateValidationReport(result, startTime)
      
      // Print detailed results
      this.printValidationReport(report)
      
      return report

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      console.error(chalk.red(`❌ Validation failed: ${errorMessage}`))
      
      return {
        valid: false,
        appName: 'Unknown',
        errors: [{
          variable: 'SYSTEM',
          message: errorMessage,
          suggestion: 'Check application setup and configuration files'
        }],
        warnings: [],
        sources: [],
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Generate comprehensive validation report
   */
  private generateValidationReport(result: any, startTime: number): ValidationReport {
    const appConfig = result.appConfig
    const validation = result.validation
    
    const errors: EnvironmentValidationError[] = []
    const warnings: EnvironmentValidationError[] = []

    if (appConfig && validation) {
      // Process validation errors
      if (validation.errors) {
        validation.errors.forEach((error: string) => {
          const variable = this.extractVariableFromError(error)
          const envVar = this.findEnvVarConfig(variable, appConfig)
          
          errors.push({
            variable,
            message: error,
            suggestion: this.generateSuggestion(variable, envVar),
            example: envVar?.example
          })
        })
      }

      // Process validation warnings
      if (validation.warnings) {
        validation.warnings.forEach((warning: string) => {
          const variable = this.extractVariableFromError(warning)
          const envVar = this.findEnvVarConfig(variable, appConfig)
          
          warnings.push({
            variable,
            message: warning,
            suggestion: this.generateSuggestion(variable, envVar),
            example: envVar?.example
          })
        })
      }
    }

    return {
      valid: validation?.valid || false,
      appName: appConfig?.displayName || appConfig?.appName || 'Unknown',
      errors,
      warnings,
      sources: result.sources,
      duration: Date.now() - startTime
    }
  }

  /**
   * Print detailed validation report
   */
  private printValidationReport(report: ValidationReport): void {
    console.log(chalk.blue(`\n📊 Validation Summary:`))
    console.log(chalk.gray(`  Application: ${report.appName}`))
    console.log(chalk.gray(`  Duration: ${report.duration}ms`))
    console.log(chalk.gray(`  Sources: ${report.sources.join(', ') || 'none'}`))

    if (report.valid) {
      console.log(chalk.green.bold(`\n✅ Environment validation passed!`))
      
      if (report.warnings.length > 0) {
        console.log(chalk.yellow(`\n⚠️  ${report.warnings.length} optional variable(s) not configured:`))
        report.warnings.forEach(warning => {
          console.log(chalk.yellow(`   • ${warning.variable}: ${warning.message}`))
          if (warning.suggestion) {
            console.log(chalk.gray(`     ${warning.suggestion}`))
          }
        })
      }
    } else {
      console.log(chalk.red.bold(`\n❌ Environment validation failed!`))
      
      if (report.errors.length > 0) {
        console.log(chalk.red(`\n🚨 ${report.errors.length} required variable(s) missing:`))
        
        report.errors.forEach(error => {
          console.log(chalk.red(`\n   ❌ ${error.variable}`))
          console.log(chalk.gray(`      ${error.message}`))
          
          if (error.suggestion) {
            console.log(chalk.cyan(`      💡 ${error.suggestion}`))
          }
          
          if (error.example) {
            console.log(chalk.gray(`      Example: ${error.example}`))
          }
        })
      }

      // Print setup instructions
      this.printSetupInstructions(report)
    }

    console.log(chalk.gray('\n' + '='.repeat(60)))
  }

  /**
   * Print setup instructions for missing variables
   */
  private printSetupInstructions(report: ValidationReport): void {
    console.log(chalk.cyan.bold(`\n📚 Setup Instructions:`))
    
    console.log(chalk.white(`\n1. Choose your configuration method:`))
    console.log(chalk.gray(`   Option A: Use Phase.dev (Recommended)`))
    console.log(chalk.gray(`   Option B: Use local .env files`))
    
    console.log(chalk.white(`\n2. For Phase.dev setup:`))
    console.log(chalk.gray(`   • Set PHASE_SERVICE_TOKEN in your environment`))
    console.log(chalk.gray(`   • Configure secrets in Phase.dev dashboard`))
    console.log(chalk.gray(`   • Ensure app is properly configured in package.json`))
    
    console.log(chalk.white(`\n3. For local .env setup:`))
    console.log(chalk.gray(`   • Copy .env.example to .env.development`))
    console.log(chalk.gray(`   • Fill in the missing values`))
    
    if (report.errors.length > 0) {
      console.log(chalk.white(`\n4. Required variables to configure:`))
      report.errors.forEach(error => {
        console.log(chalk.gray(`   • ${error.variable}${error.example ? ` = ${error.example}` : ''}`))
      })
    }
  }

  /**
   * Extract variable name from error message
   */
  private extractVariableFromError(error: string): string {
    const match = error.match(/Missing required: (\w+)/) || 
                  error.match(/Optional not set: (\w+)/) ||
                  error.match(/(\w+):/)
    
    return match ? match[1] : 'UNKNOWN'
  }

  /**
   * Find environment variable configuration
   */
  private findEnvVarConfig(variable: string, appConfig: AppEnvConfig): any {
    const allVars = [
      ...(appConfig.envVars?.required || []),
      ...(appConfig.envVars?.optional || [])
    ]
    
    return allVars.find(v => v.name === variable)
  }

  /**
   * Generate helpful suggestion for missing variable
   */
  private generateSuggestion(variable: string, envVar: any): string {
    if (!envVar) {
      return `Configure ${variable} in your environment`
    }

    const suggestions = []
    
    if (envVar.sensitive) {
      suggestions.push('Use Phase.dev for secure storage')
    }
    
    if (envVar.example) {
      suggestions.push(`Use format: ${envVar.example}`)
    }
    
    if (variable.includes('URL')) {
      suggestions.push('Ensure URL is accessible and properly formatted')
    }
    
    if (variable.includes('KEY') || variable.includes('SECRET')) {
      suggestions.push('Generate from the respective service dashboard')
    }

    return suggestions.length > 0 
      ? suggestions.join(', ')
      : `Set ${variable} according to your environment needs`
  }
}

export interface ValidationReport {
  valid: boolean
  appName: string
  errors: EnvironmentValidationError[]
  warnings: EnvironmentValidationError[]
  sources: string[]
  duration: number
}

/**
 * Validate all applications in the monorepo
 */
export async function validateAllApplications(debug = false): Promise<ValidationReport[]> {
  const validator = new EnvironmentValidator(debug)
  const apps = ['apps/api-portal', 'apps/trendgate', 'apps/docs']
  
  console.log(chalk.blue.bold(`\n🔍 Validating All Applications`))
  console.log(chalk.gray('='.repeat(60)))
  
  const reports: ValidationReport[] = []
  
  for (const app of apps) {
    try {
      const report = await validator.validateApplication(app)
      reports.push(report)
    } catch (error) {
      console.error(chalk.red(`❌ Failed to validate ${app}: ${error}`))
      reports.push({
        valid: false,
        appName: app,
        errors: [{
          variable: 'SYSTEM',
          message: String(error),
          suggestion: 'Check application configuration'
        }],
        warnings: [],
        sources: [],
        duration: 0
      })
    }
  }
  
  // Print overall summary
  const validApps = reports.filter(r => r.valid).length
  const totalApps = reports.length
  
  console.log(chalk.blue.bold(`\n📊 Overall Summary:`))
  console.log(chalk.gray(`  Applications validated: ${totalApps}`))
  console.log(chalk.gray(`  Passed validation: ${validApps}`))
  console.log(chalk.gray(`  Failed validation: ${totalApps - validApps}`))
  
  if (validApps === totalApps) {
    console.log(chalk.green.bold(`\n✅ All applications passed validation!`))
  } else {
    console.log(chalk.red.bold(`\n❌ ${totalApps - validApps} application(s) failed validation`))
  }
  
  return reports
}