/**
 * Vercel-specific adapter for Phase.dev integration
 * Handles environment loading during build and runtime
 */

import { loadPhaseSecrets } from './env-wrapper'
import chalk from 'chalk'

/**
 * Load Phase secrets for Vercel environment
 * This function is designed to work in both build and runtime contexts
 */
export async function loadVercelPhaseSecrets(): Promise<void> {
  // Skip if no Phase token is available
  if (!process.env.PHASE_SERVICE_TOKEN) {
    console.log(chalk.gray('No PHASE_SERVICE_TOKEN found, skipping Phase.dev integration'))
    return
  }

  try {
    // Detect Vercel environment
    const isVercelBuild = process.env.VERCEL === '1'
    const vercelEnv = process.env.VERCEL_ENV // 'production' | 'preview' | 'development'
    
    console.log(chalk.blue('🔐 Loading Phase.dev secrets for Vercel...'))
    console.log(chalk.gray(`  Vercel Environment: ${vercelEnv || 'unknown'}`))
    console.log(chalk.gray(`  Build Phase: ${isVercelBuild ? 'Yes' : 'No'}`))
    
    // Determine app namespace based on current directory
    const cwd = process.cwd()
    const appName = cwd.includes('apps/trendgate') ? 'trendgate' : 
                   cwd.includes('apps/api-portal') ? 'api-portal' :
                   cwd.includes('apps/docs') ? 'docs' : undefined
    
    // Load secrets with proper namespace
    const success = await loadPhaseSecrets({
      appNamespace: appName,
      cwd
    })
    
    if (success) {
      console.log(chalk.green('✅ Phase.dev secrets loaded successfully'))
      
      // For build-time, write critical env vars to .env file for Next.js
      if (isVercelBuild && process.env.NEXT_PUBLIC_VARS) {
        const fs = await import('fs')
        const publicVars = process.env.NEXT_PUBLIC_VARS.split(',')
        const envContent = publicVars
          .filter(key => process.env[key])
          .map(key => `${key}=${process.env[key]}`)
          .join('\n')
        
        if (envContent) {
          fs.writeFileSync('.env.production', envContent)
          console.log(chalk.green('✅ Created .env.production for build-time variables'))
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to load Phase secrets in Vercel:'), error)
    // Don't fail the build - continue with existing env vars
  }
}

/**
 * Webpack plugin for injecting Phase secrets at build time
 */
export class VercelPhaseWebpackPlugin {
  apply(compiler: any) {
    compiler.hooks.beforeRun.tapPromise('VercelPhasePlugin', async () => {
      await loadVercelPhaseSecrets()
    })
  }
}

// Auto-run if this file is executed directly
if (require.main === module) {
  loadVercelPhaseSecrets().catch(console.error)
}









