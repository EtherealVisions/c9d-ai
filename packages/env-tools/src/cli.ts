#!/usr/bin/env node

/**
 * Enhanced CLI entry point for env-wrapper
 * Provides proper error handling, help messages, and debug modes
 */

import { program } from 'commander'
import chalk from 'chalk'
import { runEnvWrapper } from './env-wrapper'

// Configure the CLI program
program
  .name('env-wrapper')
  .description('Environment wrapper for Phase.dev integration')
  .version('1.0.0')
  .option('-e, --env <file>', 'Environment file to load')
  .option('--config <file>', 'App environment configuration file')
  .option('--no-phase', 'Disable Phase.dev integration')
  .option('--no-validation', 'Skip environment validation')
  .option('-d, --debug', 'Enable debug output')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--dry-run', 'Show what would be executed without running')
  .allowUnknownOption() // Allow unknown options to be passed to the command
  .argument('<command...>', 'Command to execute with environment')
  .action(async (command, options) => {
    try {
      // Set debug/verbose flags in environment
      if (options.debug) {
        process.env.ENV_WRAPPER_DEBUG = 'true'
      }
      if (options.verbose) {
        process.env.ENV_WRAPPER_VERBOSE = 'true'
      }

      // Debug: Log environment variable status at CLI entry point
      const isCI = process.env.CI || process.env.VERCEL || process.env.GITHUB_ACTIONS;
      if (options.debug || (isCI && options.verbose)) {
        const token = process.env.PHASE_SERVICE_TOKEN;
        console.log(chalk.gray(`[CLI Debug] PHASE_SERVICE_TOKEN at entry: ${token ? `"${token.substring(0, 20)}..." (length: ${token.length})` : 'NOT SET'}`));
      }

      if (options.dryRun) {
        console.log(chalk.blue('🔍 Dry run mode - showing what would be executed:'))
        console.log(chalk.gray(`Command: ${command.join(' ')}`))
        console.log(chalk.gray(`Options: ${JSON.stringify(options, null, 2)}`))
        return
      }

      // Convert commander options to env-wrapper format
      const args = []
      
      if (options.env) {
        args.push('-e', options.env)
      }
      if (options.config) {
        args.push('--config', options.config)
      }
      if (options.noPhase) {
        args.push('--no-phase')
      }
      if (options.noValidation) {
        args.push('--no-validation')
      }
      
      args.push('--', ...command)

      await runEnvWrapper(args, {
        debug: options.debug,
        verbose: options.verbose
      })
    } catch (error: any) {
      if (options.debug) {
        console.error(chalk.red('❌ Fatal error with stack trace:'))
        console.error(error)
      } else {
        console.error(chalk.red('❌ Fatal error:'), error.message || error)
      }
      
      if (error.code === 'ENOENT') {
        console.error(chalk.yellow('💡 Suggestion: Check that the command exists and is in your PATH'))
      } else if (error.code === 'EACCES') {
        console.error(chalk.yellow('💡 Suggestion: Check file permissions'))
      }
      
      process.exit(1)
    }
  })

// Handle help for no arguments
program.on('--help', () => {
  console.log('')
  console.log(chalk.blue('Examples:'))
  console.log('  $ env-wrapper npm run dev')
  console.log('  $ env-wrapper -e .env.production npm run build')
  console.log('  $ env-wrapper --config env.config.json npm test')
  console.log('  $ env-wrapper --no-phase --debug npm run start')
  console.log('')
  console.log(chalk.blue('Environment Variables:'))
  console.log('  PHASE_SERVICE_TOKEN    Phase.dev service token')
  console.log('  PHASE_ENV             Phase.dev environment (development, staging, production)')
  console.log('  PHASE_DEBUG           Enable Phase.dev debug output')
  console.log('')
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
  process.exit(1)
}