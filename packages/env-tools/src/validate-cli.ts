#!/usr/bin/env node

/**
 * Enhanced environment validation CLI
 * Supports single app validation and monorepo-wide validation
 */

import chalk from 'chalk'
import { program } from 'commander'
import { EnvironmentValidator, validateAllApplications } from './validation-scripts'
import { EnvironmentManager } from './environment-manager'

program
  .name('validate-env')
  .description('Validate environment configuration for applications')
  .version('1.0.0')

program
  .command('app [path]')
  .description('Validate environment for a specific application')
  .option('-d, --debug', 'Enable debug output')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-s, --strict', 'Exit with error code on validation failure')
  .option('--json', 'Output results as JSON')
  .action(async (appPath, options) => {
    const validator = new EnvironmentValidator(options.debug || options.verbose)
    const path = appPath || process.cwd()
    
    try {
      if (options.verbose) {
        console.log(chalk.blue(`🔍 Validating application at: ${path}`))
      }
      
      const report = await validator.validateApplication(path)
      
      if (options.json) {
        console.log(JSON.stringify(report, null, 2))
      }
      
      if (!report.valid) {
        if (options.debug) {
          console.error(chalk.red('❌ Validation failed with detailed errors:'))
          console.error(JSON.stringify(report, null, 2))
        }
        
        if (options.strict) {
          console.error(chalk.red('💥 Exiting due to validation failure (strict mode)'))
          process.exit(1)
        } else {
          console.warn(chalk.yellow('⚠️  Validation failed but continuing (non-strict mode)'))
        }
      }
      
      process.exit(0)
    } catch (error: any) {
      if (options.debug) {
        console.error(chalk.red('❌ Validation failed with stack trace:'))
        console.error(error)
      } else {
        console.error(chalk.red('❌ Validation failed:'), error.message || error)
      }
      
      // Provide helpful suggestions based on error type
      if (error.code === 'ENOENT') {
        console.error(chalk.yellow('💡 Suggestion: Check that the path exists and is accessible'))
      } else if (error.message?.includes('package.json')) {
        console.error(chalk.yellow('💡 Suggestion: Ensure package.json exists and is valid JSON'))
      } else if (error.message?.includes('Phase')) {
        console.error(chalk.yellow('💡 Suggestion: Check Phase.dev configuration and service token'))
      }
      
      process.exit(1)
    }
  })

program
  .command('all')
  .description('Validate environment for all applications in monorepo')
  .option('-d, --debug', 'Enable debug output')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-s, --strict', 'Exit with error code if any validation fails')
  .option('--json', 'Output results as JSON')
  .option('--summary', 'Show only summary results')
  .action(async (options) => {
    try {
      if (options.verbose) {
        console.log(chalk.blue('🔍 Validating all applications in monorepo...'))
      }
      
      const reports = await validateAllApplications(options.debug || options.verbose)
      
      if (options.json) {
        console.log(JSON.stringify(reports, null, 2))
        return
      }
      
      const failedApps = reports.filter(r => !r.valid)
      const passedApps = reports.filter(r => r.valid)
      
      if (options.summary) {
        console.log(chalk.blue('\n📊 Validation Summary:'))
        console.log(chalk.green(`  ✅ Passed: ${passedApps.length}`))
        console.log(chalk.red(`  ❌ Failed: ${failedApps.length}`))
        console.log(chalk.gray(`  📁 Total: ${reports.length}`))
      }
      
      if (failedApps.length > 0) {
        if (options.debug) {
          console.error(chalk.red('\n❌ Failed applications with details:'))
          failedApps.forEach(app => {
            console.error(chalk.red(`  • ${app.appName || 'Unknown'}`))
            console.error(chalk.gray(`    ${JSON.stringify(app, null, 4)}`))
          })
        } else if (!options.summary) {
          console.error(chalk.red(`\n❌ ${failedApps.length} application(s) failed validation:`))
          failedApps.forEach(app => {
            console.error(chalk.red(`  • ${app.appName || 'Unknown'}`))
          })
        }
        
        if (options.strict) {
          console.error(chalk.red('\n💥 Exiting due to validation failures (strict mode)'))
          process.exit(1)
        } else {
          console.warn(chalk.yellow('\n⚠️  Some validations failed but continuing (non-strict mode)'))
        }
      } else {
        console.log(chalk.green('\n✅ All applications passed validation'))
      }
      
      process.exit(0)
    } catch (error: any) {
      if (options.debug) {
        console.error(chalk.red('❌ Validation failed with stack trace:'))
        console.error(error)
      } else {
        console.error(chalk.red('❌ Validation failed:'), error.message || error)
      }
      
      // Provide helpful suggestions
      if (error.message?.includes('monorepo')) {
        console.error(chalk.yellow('💡 Suggestion: Ensure you are running from the monorepo root'))
      } else if (error.message?.includes('workspace')) {
        console.error(chalk.yellow('💡 Suggestion: Check pnpm-workspace.yaml configuration'))
      }
      
      process.exit(1)
    }
  })

program
  .command('status [path]')
  .description('Show environment status for an application')
  .option('-d, --debug', 'Enable debug output')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--json', 'Output status as JSON')
  .option('--watch', 'Watch for changes and update status')
  .action(async (appPath, options) => {
    const manager = new EnvironmentManager({ debug: options.debug || options.verbose })
    const path = appPath || process.cwd()
    
    const showStatus = async () => {
      try {
        await manager.loadEnvironment(path)
        const status = manager.getStatus()
        
        if (options.json) {
          console.log(JSON.stringify(status, null, 2))
          return
        }
        
        console.log(chalk.blue.bold('\n📊 Environment Status:'))
        console.log(chalk.gray(`  Application: ${path}`))
        console.log(chalk.gray(`  Loaded: ${status.loaded ? '✅' : '❌'}`))
        console.log(chalk.gray(`  Sources: ${status.sources.join(', ') || 'none'}`))
        console.log(chalk.gray(`  Phase.dev: ${status.phaseEnabled ? '✅' : '❌'}`))
        console.log(chalk.gray(`  Validated: ${status.validated ? '✅' : '❌'}`))
        console.log(chalk.gray(`  Valid: ${status.valid ? '✅' : '❌'}`))
        console.log(chalk.gray(`  Container: ${status.containerEnvironment ? '✅' : '❌'}`))
        
        if (options.verbose && !status.valid) {
          console.log(chalk.red('\n🚨 Validation Issues:'))
          console.log(chalk.red(`  • Environment validation failed`))
        }
        
      } catch (error: any) {
        if (options.debug) {
          console.error(chalk.red('❌ Status check failed with stack trace:'))
          console.error(error)
        } else {
          console.error(chalk.red('❌ Status check failed:'), error.message || error)
        }
        
        if (!options.watch) {
          process.exit(1)
        }
      }
    }
    
    await showStatus()
    
    if (options.watch) {
      console.log(chalk.blue('\n👀 Watching for changes... (Press Ctrl+C to exit)'))
      
      const fs = await import('fs')
      const watchPaths = [
        `${path}/package.json`,
        `${path}/.env`,
        `${path}/.env.local`,
        `${path}/.env.development`,
        `${path}/env.config.json`
      ]
      
      watchPaths.forEach(watchPath => {
        try {
          fs.watchFile(watchPath, { interval: 1000 }, () => {
            console.log(chalk.blue(`\n🔄 Change detected in ${watchPath}`))
            showStatus()
          })
        } catch (error) {
          // File doesn't exist, ignore
        }
      })
      
      // Keep process alive
      process.stdin.resume()
    }
  })

// Default command (backward compatibility)
program
  .action(async () => {
    const validator = new EnvironmentValidator(false)
    
    try {
      const report = await validator.validateApplication(process.cwd())
      
      if (!report.valid) {
        process.exit(1)
      }
      
      process.exit(0)
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error)
      process.exit(1)
    }
  })

// Handle help
program.on('--help', () => {
  console.log('')
  console.log(chalk.blue('Examples:'))
  console.log('  $ validate-env                    # Validate current directory')
  console.log('  $ validate-env app ./apps/web     # Validate specific app')
  console.log('  $ validate-env all --strict       # Validate all apps (strict mode)')
  console.log('  $ validate-env status --verbose   # Show detailed status')
  console.log('  $ validate-env status --watch     # Watch for changes')
  console.log('')
  console.log(chalk.blue('Environment Variables:'))
  console.log('  PHASE_SERVICE_TOKEN    Phase.dev service token')
  console.log('  PHASE_ENV             Phase.dev environment')
  console.log('  NODE_ENV              Node environment')
  console.log('')
})

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('❌ Unknown command. Use --help for available commands.'))
  process.exit(1)
})

// Handle unknown options
program.on('option:unknown', (option) => {
  console.error(chalk.red(`❌ Unknown option: ${option}`))
  console.log(chalk.gray('Use --help to see available options'))
  process.exit(1)
})

// Parse command line arguments
program.parse()

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp()
}