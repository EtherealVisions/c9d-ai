#!/usr/bin/env node
/**
 * Enhanced Vercel prebuild script to load Phase.dev secrets
 * This runs before the main build process in Vercel
 */

import { program } from 'commander'
import chalk from 'chalk'
import { loadVercelPhaseSecrets } from './vercel-adapter'

// Configure the CLI program
program
  .name('vercel-phase-prebuild')
  .description('Vercel prebuild integration for Phase.dev')
  .version('1.0.0')
  .option('-d, --debug', 'Enable debug output')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--strict', 'Exit with error code on failure (blocks build)')
  .option('--dry-run', 'Show what would be done without executing')
  .option('--timeout <seconds>', 'Timeout for Phase.dev API calls', '30')
  .action(async (options) => {
    try {
      // Set debug/verbose flags in environment
      if (options.debug) {
        process.env.PHASE_DEBUG = 'true'
        process.env.ENV_WRAPPER_DEBUG = 'true'
      }
      if (options.verbose) {
        process.env.ENV_WRAPPER_VERBOSE = 'true'
      }

      console.log(chalk.blue('🚀 Running Vercel prebuild Phase.dev integration...'))
      
      if (options.verbose) {
        console.log(chalk.gray(`  Debug mode: ${options.debug ? 'enabled' : 'disabled'}`))
        console.log(chalk.gray(`  Strict mode: ${options.strict ? 'enabled' : 'disabled'}`))
        console.log(chalk.gray(`  Timeout: ${options.timeout}s`))
        console.log(chalk.gray(`  Vercel environment: ${process.env.VERCEL_ENV || 'not set'}`))
        console.log(chalk.gray(`  Node environment: ${process.env.NODE_ENV || 'not set'}`))
      }

      if (options.dryRun) {
        console.log(chalk.blue('🔍 Dry run mode - showing what would be executed:'))
        console.log(chalk.gray('  Would load Phase.dev secrets for Vercel build'))
        console.log(chalk.gray('  Would inject environment variables into process.env'))
        console.log(chalk.gray('  Would validate configuration'))
        return
      }

      // Set timeout
      const timeout = parseInt(options.timeout) * 1000
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${options.timeout}s`)), timeout)
      })

      // Load secrets with timeout
      await Promise.race([
        loadVercelPhaseSecrets(),
        timeoutPromise
      ])
      
      console.log(chalk.green('✅ Prebuild Phase.dev integration complete'))
      
      if (options.verbose) {
        const envVarCount = Object.keys(process.env).length
        console.log(chalk.gray(`  Total environment variables: ${envVarCount}`))
        
        // Show Phase.dev specific variables (without values)
        const phaseVars = Object.keys(process.env).filter(key => 
          key.startsWith('PHASE_') || 
          key.includes('DATABASE') || 
          key.includes('API') ||
          key.startsWith('NEXT_PUBLIC_')
        )
        if (phaseVars.length > 0) {
          console.log(chalk.gray(`  Phase.dev related variables: ${phaseVars.length}`))
          if (options.debug) {
            phaseVars.forEach(key => {
              const value = process.env[key]
              const displayValue = value && value.length > 20 
                ? `${value.substring(0, 20)}...` 
                : value
              console.log(chalk.gray(`    ${key}=${displayValue}`))
            })
          }
        }
      }
      
    } catch (error: any) {
      if (options.debug) {
        console.error(chalk.red('❌ Prebuild Phase.dev integration failed with stack trace:'))
        console.error(error)
      } else {
        console.error(chalk.red('❌ Prebuild Phase.dev integration failed:'), error.message || error)
      }
      
      // Provide helpful suggestions based on error type
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        console.error(chalk.yellow('💡 Suggestion: Increase timeout with --timeout option or check network connectivity'))
      } else if (error.message?.includes('token')) {
        console.error(chalk.yellow('💡 Suggestion: Check PHASE_SERVICE_TOKEN environment variable in Vercel settings'))
      } else if (error.message?.includes('unauthorized')) {
        console.error(chalk.yellow('💡 Suggestion: Verify Phase.dev token has correct permissions'))
      } else if (error.message?.includes('network')) {
        console.error(chalk.yellow('💡 Suggestion: Check network connectivity and Phase.dev service status'))
      }
      
      if (options.strict) {
        console.error(chalk.red('💥 Exiting with error due to strict mode'))
        process.exit(1)
      } else {
        console.warn(chalk.yellow('⚠️  Continuing build without Phase.dev integration'))
        process.exit(0)
      }
    }
  })

// Handle help
program.on('--help', () => {
  console.log('')
  console.log(chalk.blue('Examples:'))
  console.log('  $ vercel-phase-prebuild')
  console.log('  $ vercel-phase-prebuild --debug')
  console.log('  $ vercel-phase-prebuild --strict --timeout 60')
  console.log('  $ vercel-phase-prebuild --dry-run --verbose')
  console.log('')
  console.log(chalk.blue('Environment Variables:'))
  console.log('  PHASE_SERVICE_TOKEN    Phase.dev service token (required)')
  console.log('  VERCEL_ENV            Vercel environment (production, preview, development)')
  console.log('  NODE_ENV              Node environment')
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

// If no arguments provided, run with default options
if (!process.argv.slice(2).length) {
  program.parse(['node', 'vercel-phase-prebuild'])
}









