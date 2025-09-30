#!/usr/bin/env node

/**
 * CLI tool for validating Phase.dev configuration
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { 
  validateAllConfigurations,
  generateConfigurationReport,
  listAllConfigurations,
  findMonorepoRoot
} from './config-utils'
import { validateConfigurationFile } from './config-validator'

const program = new Command()

program
  .name('validate-config')
  .description('Validate Phase.dev configuration across the monorepo')
  .version('1.0.0')

program
  .command('all')
  .description('Validate all configurations in the monorepo')
  .option('-r, --root <path>', 'Monorepo root path')
  .option('--report', 'Generate detailed report')
  .action(async (options) => {
    const rootPath = options.root || findMonorepoRoot()
    
    if (!rootPath) {
      console.error(chalk.red('❌ Could not find monorepo root'))
      process.exit(1)
    }
    
    console.log(chalk.blue('🔍 Validating Phase.dev configurations...'))
    console.log(chalk.gray(`Root: ${rootPath}`))
    console.log()
    
    const validation = validateAllConfigurations(rootPath)
    
    // Print summary
    if (validation.valid) {
      console.log(chalk.green('✅ All configurations are valid'))
    } else {
      console.log(chalk.red('❌ Configuration validation failed'))
    }
    
    // Print global errors
    if (validation.globalErrors.length > 0) {
      console.log(chalk.red('\n🚨 Global Errors:'))
      for (const error of validation.globalErrors) {
        console.log(chalk.red(`  • ${error}`))
      }
    }
    
    // Print individual results
    const hasIssues = validation.results.some(r => !r.valid || r.warnings.length > 0)
    if (hasIssues) {
      console.log(chalk.yellow('\n⚠️  Individual Results:'))
      
      for (const result of validation.results) {
        const icon = result.valid ? '✅' : '❌'
        const typeColor = result.type === 'app' ? chalk.blue : chalk.cyan
        console.log(`${icon} ${typeColor(result.type)} ${chalk.bold(result.name)}`)
        
        if (result.errors.length > 0) {
          for (const error of result.errors) {
            console.log(chalk.red(`    • ${error}`))
          }
        }
        
        if (result.warnings.length > 0) {
          for (const warning of result.warnings) {
            console.log(chalk.yellow(`    ⚠ ${warning}`))
          }
        }
      }
    }
    
    // Generate report if requested
    if (options.report) {
      console.log(chalk.blue('\n📊 Generating detailed report...'))
      const report = generateConfigurationReport(rootPath)
      console.log('\n' + report)
    }
    
    process.exit(validation.valid ? 0 : 1)
  })

program
  .command('file <path>')
  .description('Validate a specific configuration file')
  .action(async (filePath) => {
    console.log(chalk.blue(`🔍 Validating configuration file: ${filePath}`))
    console.log()
    
    const result = validateConfigurationFile(filePath)
    
    if (result.valid) {
      console.log(chalk.green('✅ Configuration file is valid'))
    } else {
      console.log(chalk.red('❌ Configuration file validation failed'))
    }
    
    if (result.errors.length > 0) {
      console.log(chalk.red('\n🚨 Errors:'))
      for (const error of result.errors) {
        console.log(chalk.red(`  • ${error}`))
      }
    }
    
    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'))
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  • ${warning}`))
      }
    }
    
    if (result.suggestions && result.suggestions.length > 0) {
      console.log(chalk.blue('\n💡 Suggestions:'))
      for (const suggestion of result.suggestions) {
        console.log(chalk.blue(`  • ${suggestion}`))
      }
    }
    
    process.exit(result.valid ? 0 : 1)
  })

program
  .command('list')
  .description('List all configurations in the monorepo')
  .option('-r, --root <path>', 'Monorepo root path')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const rootPath = options.root || findMonorepoRoot()
    
    if (!rootPath) {
      console.error(chalk.red('❌ Could not find monorepo root'))
      process.exit(1)
    }
    
    const configurations = listAllConfigurations(rootPath)
    
    if (options.json) {
      console.log(JSON.stringify(configurations, null, 2))
      return
    }
    
    console.log(chalk.blue('📋 Phase.dev Configurations'))
    console.log(chalk.gray(`Root: ${rootPath}`))
    console.log()
    
    if (configurations.apps.length > 0) {
      console.log(chalk.blue('📱 Apps:'))
      for (const { name, config } of configurations.apps) {
        console.log(`  ${chalk.bold(name)}`)
        console.log(`    Phase App: ${chalk.cyan(config.phaseAppName)}`)
        console.log(`    Environment: ${chalk.green(config.environment)}`)
        console.log(`    Strict: ${config.validation.strict ? chalk.red('Yes') : chalk.gray('No')}`)
        console.log()
      }
    }
    
    if (configurations.packages.length > 0) {
      console.log(chalk.cyan('📦 Packages:'))
      for (const { name, config } of configurations.packages) {
        console.log(`  ${chalk.bold(name)}`)
        console.log(`    Phase App: ${chalk.cyan(config.phaseAppName)}`)
        console.log(`    Environment: ${chalk.green(config.environment)}`)
        console.log()
      }
    }
    
    if (configurations.errors.length > 0) {
      console.log(chalk.red('🚨 Errors:'))
      for (const error of configurations.errors) {
        console.log(chalk.red(`  • ${error}`))
      }
    }
  })

program
  .command('report')
  .description('Generate a detailed configuration report')
  .option('-r, --root <path>', 'Monorepo root path')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .action(async (options) => {
    const rootPath = options.root || findMonorepoRoot()
    
    if (!rootPath) {
      console.error(chalk.red('❌ Could not find monorepo root'))
      process.exit(1)
    }
    
    console.log(chalk.blue('📊 Generating configuration report...'))
    const report = generateConfigurationReport(rootPath)
    
    if (options.output) {
      const fs = await import('fs')
      fs.writeFileSync(options.output, report)
      console.log(chalk.green(`✅ Report saved to: ${options.output}`))
    } else {
      console.log('\n' + report)
    }
  })

// Handle help
program.on('--help', () => {
  console.log('')
  console.log(chalk.blue('Examples:'))
  console.log('  $ validate-config all                    # Validate all configurations')
  console.log('  $ validate-config all --report           # Generate detailed report')
  console.log('  $ validate-config file .phase-apps.json  # Validate specific file')
  console.log('  $ validate-config list --json            # List configurations as JSON')
  console.log('  $ validate-config report -o report.txt   # Save report to file')
  console.log('')
  console.log(chalk.blue('Configuration Files:'))
  console.log('  .phase-apps.json       Root configuration mapping')
  console.log('  package.json           App-specific phase configuration')
  console.log('  env.config.json        Environment validation rules')
  console.log('')
})

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('❌ Invalid command: %s'), program.args.join(' '))
  console.log(chalk.gray('See --help for a list of available commands.'))
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

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp()
}