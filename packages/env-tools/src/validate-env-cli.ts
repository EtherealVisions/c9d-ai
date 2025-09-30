#!/usr/bin/env node

/**
 * CLI tool for validating environment variables
 */

import { Command } from 'commander'
import chalk from 'chalk'
import * as path from 'path'
import { 
  loadEnvConfig,
  findEnvConfig,
  validateEnvironment,
  validateAllEnvironments,
  EnvValidationResult
} from './env-validator'
import { findMonorepoRoot } from './config-utils'

const program = new Command()

program
  .name('validate-env')
  .description('Validate environment variables against configuration')
  .version('1.0.0')

program
  .command('app <appPath>')
  .description('Validate environment variables for a specific app')
  .option('-e, --env <environment>', 'Environment to validate against', 'development')
  .option('--config <path>', 'Path to env.config.json file')
  .option('--strict', 'Enable strict validation mode')
  .option('--json', 'Output results as JSON')
  .action(async (appPath, options) => {
    try {
      const configPath = options.config || findEnvConfig(appPath)
      
      if (!configPath) {
        console.error(chalk.red(`❌ No environment configuration found in: ${appPath}`))
        console.error(chalk.gray('Expected: env.config.json'))
        process.exit(1)
      }
      
      console.log(chalk.blue(`🔍 Validating environment variables for: ${path.basename(appPath)}`))
      console.log(chalk.gray(`Config: ${configPath}`))
      console.log(chalk.gray(`Environment: ${options.env}`))
      console.log()
      
      const config = loadEnvConfig(configPath)
      
      // Override strict mode if specified
      if (options.strict) {
        config.validation = { ...config.validation, strict: true }
      }
      
      const result = validateEnvironment(process.env, config, options.env)
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2))
        process.exit(result.valid ? 0 : 1)
      }
      
      printValidationResult(result, config.displayName)
      process.exit(result.valid ? 0 : 1)
      
    } catch (error) {
      console.error(chalk.red(`❌ Validation failed: ${error instanceof Error ? error.message : String(error)}`))
      process.exit(1)
    }
  })

program
  .command('all')
  .description('Validate environment variables for all apps in the monorepo')
  .option('-r, --root <path>', 'Monorepo root path')
  .option('-e, --env <environment>', 'Environment to validate against', 'development')
  .option('--json', 'Output results as JSON')
  .option('--summary', 'Show only summary')
  .action(async (options) => {
    try {
      const rootPath = options.root || findMonorepoRoot()
      
      if (!rootPath) {
        console.error(chalk.red('❌ Could not find monorepo root'))
        process.exit(1)
      }
      
      console.log(chalk.blue('🔍 Validating environment variables across monorepo...'))
      console.log(chalk.gray(`Root: ${rootPath}`))
      console.log(chalk.gray(`Environment: ${options.env}`))
      console.log()
      
      const validation = validateAllEnvironments(rootPath, options.env)
      
      if (options.json) {
        console.log(JSON.stringify(validation, null, 2))
        process.exit(validation.valid ? 0 : 1)
      }
      
      // Print summary
      const { summary } = validation
      console.log(chalk.blue('📊 Validation Summary'))
      console.log(`  Total apps: ${summary.total}`)
      console.log(`  ${chalk.green('✅ Valid:')} ${summary.valid}`)
      console.log(`  ${chalk.red('❌ Invalid:')} ${summary.invalid}`)
      console.log(`  ${chalk.red('🚨 Errors:')} ${summary.errors}`)
      console.log(`  ${chalk.yellow('⚠️  Warnings:')} ${summary.warnings}`)
      console.log()
      
      if (validation.valid) {
        console.log(chalk.green('✅ All environment validations passed'))
      } else {
        console.log(chalk.red('❌ Environment validation failed'))
      }
      
      // Print individual results unless summary only
      if (!options.summary && validation.results.length > 0) {
        console.log(chalk.blue('\n📋 Individual Results:'))
        
        for (const { app, result } of validation.results) {
          const icon = result.valid ? '✅' : '❌'
          console.log(`\n${icon} ${chalk.bold(app)}`)
          
          if (result.errors.length > 0) {
            console.log(chalk.red('  🚨 Errors:'))
            for (const error of result.errors) {
              console.log(chalk.red(`    • ${error.message}`))
              if (error.suggestion) {
                console.log(chalk.gray(`      💡 ${error.suggestion}`))
              }
            }
          }
          
          if (result.warnings.length > 0) {
            console.log(chalk.yellow('  ⚠️  Warnings:'))
            for (const warning of result.warnings) {
              console.log(chalk.yellow(`    • ${warning.message}`))
              if (warning.suggestion) {
                console.log(chalk.gray(`      💡 ${warning.suggestion}`))
              }
            }
          }
          
          if (result.suggestions.length > 0) {
            console.log(chalk.blue('  💡 Suggestions:'))
            for (const suggestion of result.suggestions) {
              console.log(chalk.blue(`    • ${suggestion}`))
            }
          }
        }
      }
      
      process.exit(validation.valid ? 0 : 1)
      
    } catch (error) {
      console.error(chalk.red(`❌ Validation failed: ${error instanceof Error ? error.message : String(error)}`))
      process.exit(1)
    }
  })

program
  .command('check <variable>')
  .description('Check a specific environment variable')
  .option('-a, --app <appPath>', 'App path to get configuration from')
  .option('--config <path>', 'Path to env.config.json file')
  .action(async (variable, options) => {
    try {
      if (!options.app && !options.config) {
        console.error(chalk.red('❌ Either --app or --config must be specified'))
        process.exit(1)
      }
      
      const configPath = options.config || findEnvConfig(options.app)
      
      if (!configPath) {
        console.error(chalk.red(`❌ No environment configuration found`))
        process.exit(1)
      }
      
      const config = loadEnvConfig(configPath)
      const allVars = [...config.envVars.required, ...config.envVars.optional]
      const varDef = allVars.find(v => v.name === variable)
      
      if (!varDef) {
        console.error(chalk.red(`❌ Variable '${variable}' not found in configuration`))
        process.exit(1)
      }
      
      const value = process.env[variable]
      
      console.log(chalk.blue(`🔍 Checking environment variable: ${variable}`))
      console.log()
      
      // Variable definition
      console.log(chalk.bold('Definition:'))
      console.log(`  Name: ${chalk.cyan(varDef.name)}`)
      console.log(`  Description: ${varDef.description}`)
      console.log(`  Type: ${varDef.type}`)
      console.log(`  Required: ${config.envVars.required.includes(varDef) ? chalk.red('Yes') : chalk.gray('No')}`)
      if (varDef.example) {
        console.log(`  Example: ${chalk.gray(varDef.example)}`)
      }
      if (varDef.enum) {
        console.log(`  Allowed values: ${varDef.enum.join(', ')}`)
      }
      console.log()
      
      // Current value
      console.log(chalk.bold('Current Value:'))
      if (value === undefined) {
        console.log(`  ${chalk.red('Not set')}`)
      } else if (varDef.sensitive) {
        console.log(`  ${chalk.gray('[REDACTED - sensitive value]')}`)
      } else {
        console.log(`  ${chalk.green(value)}`)
      }
      console.log()
      
      // Validation
      if (value !== undefined && value !== '') {
        const result = validateEnvironment({ [variable]: value }, {
          ...config,
          envVars: {
            required: config.envVars.required.includes(varDef) ? [varDef] : [],
            optional: config.envVars.optional.includes(varDef) ? [varDef] : []
          }
        })
        
        if (result.valid) {
          console.log(chalk.green('✅ Variable is valid'))
        } else {
          console.log(chalk.red('❌ Variable is invalid'))
          for (const error of result.errors) {
            console.log(chalk.red(`  • ${error.message}`))
            if (error.suggestion) {
              console.log(chalk.gray(`    💡 ${error.suggestion}`))
            }
          }
        }
      } else {
        const isRequired = config.envVars.required.includes(varDef)
        if (isRequired) {
          console.log(chalk.red('❌ Required variable is missing'))
        } else {
          console.log(chalk.yellow('⚠️  Optional variable is not set'))
        }
        
        if (varDef.default !== undefined) {
          console.log(chalk.blue(`💡 Default value would be: ${varDef.default}`))
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Check failed: ${error instanceof Error ? error.message : String(error)}`))
      process.exit(1)
    }
  })

program
  .command('report')
  .description('Generate a detailed environment validation report')
  .option('-r, --root <path>', 'Monorepo root path')
  .option('-e, --env <environment>', 'Environment to validate against', 'development')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('--format <format>', 'Output format (text|json|markdown)', 'text')
  .action(async (options) => {
    try {
      const rootPath = options.root || findMonorepoRoot()
      
      if (!rootPath) {
        console.error(chalk.red('❌ Could not find monorepo root'))
        process.exit(1)
      }
      
      console.log(chalk.blue('📊 Generating environment validation report...'))
      
      const validation = validateAllEnvironments(rootPath, options.env)
      let report: string
      
      switch (options.format) {
        case 'json':
          report = JSON.stringify(validation, null, 2)
          break
        case 'markdown':
          report = generateMarkdownReport(validation, options.env)
          break
        default:
          report = generateTextReport(validation, options.env)
      }
      
      if (options.output) {
        const fs = await import('fs')
        fs.writeFileSync(options.output, report)
        console.log(chalk.green(`✅ Report saved to: ${options.output}`))
      } else {
        console.log('\n' + report)
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Report generation failed: ${error instanceof Error ? error.message : String(error)}`))
      process.exit(1)
    }
  })

// Helper function to print validation results
function printValidationResult(result: EnvValidationResult, appName: string): void {
  const { summary } = result
  
  console.log(chalk.blue(`📊 Validation Results for ${appName}`))
  console.log(`  Total variables: ${summary.total}`)
  console.log(`  Required: ${summary.required}`)
  console.log(`  Optional: ${summary.optional}`)
  console.log(`  ${chalk.green('✅ Valid:')} ${summary.valid}`)
  console.log(`  ${chalk.red('❌ Missing:')} ${summary.missing}`)
  console.log(`  ${chalk.red('🚨 Invalid:')} ${summary.invalid}`)
  console.log()
  
  if (result.valid) {
    console.log(chalk.green('✅ All environment variables are valid'))
  } else {
    console.log(chalk.red('❌ Environment validation failed'))
  }
  
  if (result.errors.length > 0) {
    console.log(chalk.red('\n🚨 Errors:'))
    for (const error of result.errors) {
      console.log(chalk.red(`  • ${error.message}`))
      if (error.suggestion) {
        console.log(chalk.gray(`    💡 ${error.suggestion}`))
      }
    }
  }
  
  if (result.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Warnings:'))
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`  • ${warning.message}`))
      if (warning.suggestion) {
        console.log(chalk.gray(`    💡 ${warning.suggestion}`))
      }
    }
  }
  
  if (result.suggestions.length > 0) {
    console.log(chalk.blue('\n💡 Suggestions:'))
    for (const suggestion of result.suggestions) {
      console.log(chalk.blue(`  • ${suggestion}`))
    }
  }
}

// Generate text report
function generateTextReport(validation: any, environment: string): string {
  const lines: string[] = []
  
  lines.push('# Environment Validation Report')
  lines.push(`Environment: ${environment}`)
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  
  lines.push('## Summary')
  lines.push(`Total apps: ${validation.summary.total}`)
  lines.push(`Valid: ${validation.summary.valid}`)
  lines.push(`Invalid: ${validation.summary.invalid}`)
  lines.push(`Total errors: ${validation.summary.errors}`)
  lines.push(`Total warnings: ${validation.summary.warnings}`)
  lines.push('')
  
  lines.push('## Individual Results')
  for (const { app, result } of validation.results) {
    lines.push(`### ${app}`)
    lines.push(`Status: ${result.valid ? 'VALID' : 'INVALID'}`)
    lines.push(`Variables: ${result.summary.total} (${result.summary.required} required, ${result.summary.optional} optional)`)
    lines.push(`Valid: ${result.summary.valid}, Missing: ${result.summary.missing}, Invalid: ${result.summary.invalid}`)
    
    if (result.errors.length > 0) {
      lines.push('\nErrors:')
      for (const error of result.errors) {
        lines.push(`- ${error.message}`)
        if (error.suggestion) {
          lines.push(`  Suggestion: ${error.suggestion}`)
        }
      }
    }
    
    if (result.warnings.length > 0) {
      lines.push('\nWarnings:')
      for (const warning of result.warnings) {
        lines.push(`- ${warning.message}`)
        if (warning.suggestion) {
          lines.push(`  Suggestion: ${warning.suggestion}`)
        }
      }
    }
    
    lines.push('')
  }
  
  return lines.join('\n')
}

// Generate markdown report
function generateMarkdownReport(validation: any, environment: string): string {
  const lines: string[] = []
  
  lines.push('# Environment Validation Report')
  lines.push('')
  lines.push(`**Environment:** ${environment}`)
  lines.push(`**Generated:** ${new Date().toISOString()}`)
  lines.push('')
  
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Count |')
  lines.push('|--------|-------|')
  lines.push(`| Total apps | ${validation.summary.total} |`)
  lines.push(`| Valid | ${validation.summary.valid} |`)
  lines.push(`| Invalid | ${validation.summary.invalid} |`)
  lines.push(`| Total errors | ${validation.summary.errors} |`)
  lines.push(`| Total warnings | ${validation.summary.warnings} |`)
  lines.push('')
  
  lines.push('## Individual Results')
  lines.push('')
  
  for (const { app, result } of validation.results) {
    const status = result.valid ? '✅' : '❌'
    lines.push(`### ${status} ${app}`)
    lines.push('')
    lines.push(`**Status:** ${result.valid ? 'VALID' : 'INVALID'}`)
    lines.push(`**Variables:** ${result.summary.total} (${result.summary.required} required, ${result.summary.optional} optional)`)
    lines.push(`**Valid:** ${result.summary.valid}, **Missing:** ${result.summary.missing}, **Invalid:** ${result.summary.invalid}`)
    lines.push('')
    
    if (result.errors.length > 0) {
      lines.push('**Errors:**')
      lines.push('')
      for (const error of result.errors) {
        lines.push(`- ❌ ${error.message}`)
        if (error.suggestion) {
          lines.push(`  - 💡 ${error.suggestion}`)
        }
      }
      lines.push('')
    }
    
    if (result.warnings.length > 0) {
      lines.push('**Warnings:**')
      lines.push('')
      for (const warning of result.warnings) {
        lines.push(`- ⚠️ ${warning.message}`)
        if (warning.suggestion) {
          lines.push(`  - 💡 ${warning.suggestion}`)
        }
      }
      lines.push('')
    }
  }
  
  return lines.join('\n')
}

// Handle help
program.on('--help', () => {
  console.log('')
  console.log(chalk.blue('Examples:'))
  console.log('  $ validate-env app apps/web                    # Validate web app')
  console.log('  $ validate-env app apps/web --env production   # Validate for production')
  console.log('  $ validate-env all                            # Validate all apps')
  console.log('  $ validate-env all --summary                  # Show summary only')
  console.log('  $ validate-env check DATABASE_URL --app apps/web  # Check specific variable')
  console.log('  $ validate-env report --format markdown       # Generate markdown report')
  console.log('')
  console.log(chalk.blue('Configuration Files:'))
  console.log('  env.config.json        Environment variable definitions')
  console.log('  .phase-apps.json       Phase.dev app mappings')
  console.log('')
})

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('❌ Invalid command: %s'), program.args.join(' '))
  console.log(chalk.gray('See --help for a list of available commands.'))
  process.exit(1)
})

// Parse command line arguments
program.parse()

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp()
}