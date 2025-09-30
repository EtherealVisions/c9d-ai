/**
 * Shared environment wrapper for all apps
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import chalk from 'chalk'
import { loadAppConfig } from './config-loader'
import { validateEnvironment, printValidationSummary } from './validator'
import { EnvWrapperOptions } from './types'

/**
 * Escape shell arguments to preserve quotes and spaces
 */
function escapeShellArg(arg: string): string {
  // If argument already contains spaces or quotes, it likely needs to be preserved as-is
  if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
    // If it's already quoted, preserve it
    if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
      return arg;
    }
    // Otherwise, wrap in quotes
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return arg;
}

/**
 * Join command arguments preserving quoted arguments
 */
function joinCommandArgs(args: string[]): string {
  return args.map(escapeShellArg).join(' ');
}

/**
 * Enhanced container environment detection
 */
export function isContainerEnvironment(): boolean {
  return !!(
    process.env.CONTAINER ||
    process.env.CODESPACES ||
    process.env.CURSOR_CONTAINER ||
    process.env.CI ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.VERCEL ||
    process.env.RENDER ||
    process.env.FLY_APP_NAME ||
    process.env.KUBERNETES_SERVICE_HOST ||
    fs.existsSync('/.dockerenv') ||
    fs.existsSync('/run/.containerenv')
  )
}

/**
 * Find the project root directory
 */
async function findProjectRoot(startPath: string = process.cwd()): Promise<string | null> {
  let currentPath = startPath;

  while (currentPath !== '/') {
    // Check for common root indicators
    if (fs.existsSync(path.join(currentPath, '.phase.json')) ||
      fs.existsSync(path.join(currentPath, 'pnpm-workspace.yaml')) ||
      fs.existsSync(path.join(currentPath, 'lerna.json')) ||
      fs.existsSync(path.join(currentPath, '.git'))) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }

  return null;
}

/**
 * Get Phase app configuration from package.json or .phase.json
 */
async function getPhaseConfig(cwd: string = process.cwd()): Promise<{
  appName?: string;
  environment?: string;
} | null> {
  try {
    // First check package.json
    const packageJsonPath = path.join(cwd, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      if (packageJson.phase?.app) {
        const nodeEnv = process.env.NODE_ENV || 'development';
        const environment = packageJson.phase.environments?.[nodeEnv] || nodeEnv;

        return {
          appName: packageJson.phase.app,
          environment
        };
      }
    }

    // Try reading .phase.json directly
    const projectRoot = await findProjectRoot(cwd);
    if (projectRoot) {
      const phaseJsonPath = path.join(projectRoot, '.phase.json');
      if (fs.existsSync(phaseJsonPath)) {
        try {
          const phaseJson = JSON.parse(fs.readFileSync(phaseJsonPath, 'utf-8'));
          const appName = path.basename(cwd);
          const appConfig = phaseJson.apps?.[appName] || phaseJson.packages?.[appName];

          if (appConfig?.phaseApp) {
            const nodeEnv = process.env.NODE_ENV || 'development';
            const environment = appConfig.environments?.[nodeEnv] || nodeEnv;
            return {
              appName: appConfig.phaseApp,
              environment
            };
          }
        } catch {
          // Could not parse .phase.json
        }
      }
    }

    return null;
  } catch (error) {
    console.debug('Could not read Phase configuration:', error);
    return null;
  }
}

/**
 * Load Phase secrets with enhanced error handling
 */
export async function loadPhaseSecrets(options: {
  appNamespace?: string;
  cwd?: string;
} = {}): Promise<boolean> {
  const token = process.env.PHASE_SERVICE_TOKEN;

  if (!token || !token.trim()) {
    return false;
  }

  try {
    console.log(chalk.blue('🔐 Phase.dev token detected, loading secrets...'));

    // Debug: Log raw token info in CI
    const isCI = process.env.CI || process.env.VERCEL || process.env.GITHUB_ACTIONS;
    if (isCI) {
      console.log(chalk.gray(`  Raw token length: ${token.length}`));
      console.log(chalk.gray(`  Raw token starts with: "${token.substring(0, 15)}..."`));
      console.log(chalk.gray(`  Raw token ends with: "...${token.substring(token.length - 10)}"`));
      console.log(chalk.gray(`  Has quotes: ${token.includes('"') || token.includes("'")}`));
      console.log(chalk.gray(`  Has newlines: ${token.includes('\n') || token.includes('\r')}`));
    }

    // Clean the token - remove any quotes, whitespace, and newlines
    const cleanToken = token
      .trim()
      .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
      .replace(/\r?\n/g, '')        // Remove newlines
      .replace(/\s+/g, '')          // Remove any internal whitespace
      .trim();

    if (isCI) {
      console.log(chalk.gray(`  Clean token length: ${cleanToken.length}`));
      console.log(chalk.gray(`  Clean token starts with: "${cleanToken.substring(0, 15)}..."`));
    }

    if (cleanToken.length < 10) {
      console.warn(chalk.yellow('⚠️  Phase token appears too short'));
      return false;
    }

    // Basic token format check - but be very lenient in CI
    if (!cleanToken.startsWith('phs_') && !cleanToken.startsWith('pss_service:')) {
      if (isCI) {
        console.warn(chalk.yellow('⚠️  Phase token format unusual, attempting to proceed in CI environment'));
        // In CI, try to proceed anyway if the token looks reasonable
        if (cleanToken.length < 20) {
          console.warn(chalk.yellow('⚠️  Token too short, skipping Phase.dev integration'));
          return false;
        }
      } else {
        console.warn(chalk.yellow('⚠️  Phase token format appears invalid'));
        return false;
      }
    }

    // Get app namespace from options or auto-detect
    let appNamespace = options.appNamespace;
    if (!appNamespace) {
      const phaseConfig = await getPhaseConfig(options.cwd);
      if (phaseConfig?.appName) {
        // Extract the namespace from the full app name
        // e.g., "App.Coordinated.Web" -> "web"
        const parts = phaseConfig.appName.split('.');
        appNamespace = parts[parts.length - 1].toLowerCase();
      }
    }

    console.log(chalk.gray(`  Using namespace: ${appNamespace || 'default'}`));

    const { PhaseClient } = await import('@coordinated/phase-client');
    const client = new PhaseClient({
      token: cleanToken,
      appNamespace: appNamespace as any,
      debug: process.env.PHASE_DEBUG === 'true',
      strict: false
    } as any);

    const secrets = await client.getSecrets();

    // Merge Phase secrets into process.env
    Object.entries(secrets).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        process.env[key] = String(value);
      }
    });

    // Ensure the Phase token is preserved for child processes
    process.env.PHASE_SERVICE_TOKEN = cleanToken;

    // Debug: Log token info in CI environments
    if (process.env.CI || process.env.VERCEL) {
      console.log(chalk.gray(`  Token length: ${cleanToken.length}, starts with: ${cleanToken.substring(0, 10)}...`));
    }

    console.log(chalk.green('✅ Loaded secrets from Phase.dev'));
    return true;
  } catch (error: any) {
    const isCI = process.env.CI || process.env.VERCEL || process.env.GITHUB_ACTIONS;

    // Enhanced error handling with CI-specific messaging
    if (error.message?.includes('Invalid token format')) {
      if (isCI) {
        console.warn(chalk.yellow('⚠️  Phase token format issue in CI environment'));
        console.debug('Token validation failed, but continuing with existing environment variables');
      } else {
        console.error(chalk.red('❌ Phase token format is invalid'));
        console.debug('Token should start with "phs_" or "pss_service:" and be at least 10 characters');
      }
    } else if (error.message?.includes('unauthorized')) {
      console.error(chalk.red('❌ Phase token is unauthorized'));
      console.debug('Check that your token has access to the specified app/environment');
    } else if (error.message?.includes('network')) {
      console.error(chalk.red('❌ Network error connecting to Phase.dev'));
      console.debug('Check your internet connection and proxy settings');
    } else {
      if (isCI) {
        console.warn(chalk.yellow(`⚠️  Phase.dev connection issue in CI: ${error.message}`));
      } else {
        console.error(chalk.red('❌ Failed to load Phase secrets:'), error.message);
      }
    }

    console.warn(chalk.yellow('   Continuing with existing environment variables\n'));
    return false;
  }
}



export async function runEnvWrapper(args: string[], options: EnvWrapperOptions & { debug?: boolean; verbose?: boolean } = {}): Promise<void> {
  // Parse command line arguments
  const dashDashIndex = args.indexOf('--')
  if (dashDashIndex === -1) {
    console.error(chalk.red('Usage: env-wrapper [-e .env.file] [--config env.config.json] -- <command>'))
    console.error(chalk.gray('  -e, --env         Environment file to load'));
    console.error(chalk.gray('  --config          App environment configuration file'));
    console.error(chalk.gray('  --no-phase        Disable Phase.dev integration'));
    console.error(chalk.gray('  --no-validation   Skip environment validation'));
    process.exit(1)
  }

  const envArgs = args.slice(0, dashDashIndex)
  const command = args.slice(dashDashIndex + 1)

  if (command.length === 0) {
    console.error(chalk.red('No command specified after "--"'))
    process.exit(1)
  }

  // Parse environment arguments
  let envFile: string | undefined;
  let configFile: string | undefined;
  let noPhase = false;
  let noValidation = false;

  for (let i = 0; i < envArgs.length; i++) {
    const arg = envArgs[i];
    if (arg === '-e' || arg === '--env') {
      envFile = envArgs[++i];
    } else if (arg === '--config') {
      configFile = envArgs[++i];
    } else if (arg === '--no-phase') {
      noPhase = true;
    } else if (arg === '--no-validation') {
      noValidation = true;
    }
  }

  const isContainer = isContainerEnvironment()
  const debug = options.debug || process.env.ENV_WRAPPER_DEBUG === 'true'
  const verbose = options.verbose || process.env.ENV_WRAPPER_VERBOSE === 'true'

  if (verbose || debug) {
    console.log(chalk.blue('\n🔧 Environment Wrapper Configuration:'))
    console.log(chalk.gray(`  Debug mode: ${debug ? 'enabled' : 'disabled'}`))
    console.log(chalk.gray(`  Verbose mode: ${verbose ? 'enabled' : 'disabled'}`))
    console.log(chalk.gray(`  Container environment: ${isContainer ? 'detected' : 'not detected'}`))
    console.log(chalk.gray(`  Working directory: ${process.cwd()}`))
    console.log(chalk.gray(`  Command: ${command.join(' ')}`))
  }

  console.log('\n' + '='.repeat(60))

  // Load .env file first (to get PHASE_SERVICE_TOKEN if present)
  if (envFile || !isContainer) {
    // Load app config to get default env file
    const appConfig = configFile ? loadAppConfig(path.dirname(configFile)) : loadAppConfig();

    // Determine env file to use
    const finalEnvFile = envFile || appConfig?.defaults?.envFile || '.env.development';

    console.log(chalk.cyan(`📁 Loading environment from ${finalEnvFile}`));

    const envPath = path.resolve(process.cwd(), finalEnvFile);
    if (fs.existsSync(envPath)) {
      const dotenv = require('dotenv');
      const result = dotenv.config({ path: envPath });

      if (result.error) {
        console.error(chalk.red(`❌ Error loading ${finalEnvFile}:`), result.error);
        if (debug) {
          console.error(chalk.red('Stack trace:'), result.error.stack);
        }
        process.exit(1);
      }

      console.log(chalk.green(`✅ Loaded environment from ${finalEnvFile}`));
      
      if (verbose && result.parsed) {
        const keys = Object.keys(result.parsed);
        console.log(chalk.gray(`  Variables loaded: ${keys.length}`));
        if (debug) {
          keys.forEach(key => {
            const value = result.parsed![key];
            const displayValue = value && value.length > 30 
              ? `${value.substring(0, 30)}...` 
              : value;
            console.log(chalk.gray(`    ${key}=${displayValue}`));
          });
        }
      }
    } else {
      // Try fallback files
      const fallbackFiles = appConfig?.defaults?.fallbackFiles || ['.env.local', '.env'];
      let foundFallback = false;
      for (const fallback of fallbackFiles) {
        const fallbackPath = path.resolve(process.cwd(), fallback);
        if (fs.existsSync(fallbackPath)) {
          console.log(chalk.yellow(`⚠️  ${finalEnvFile} not found, using ${fallback}`));
          const dotenv = require('dotenv');
          const result = dotenv.config({ path: fallbackPath });
          
          if (verbose && result.parsed) {
            const keys = Object.keys(result.parsed);
            console.log(chalk.gray(`  Fallback variables loaded: ${keys.length}`));
          }
          
          foundFallback = true;
          break;
        }
      }
      if (!foundFallback) {
        console.log(chalk.yellow(`⚠️  ${finalEnvFile} not found, continuing without it`));
        if (debug) {
          console.log(chalk.gray(`  Searched paths:`));
          console.log(chalk.gray(`    ${envPath}`));
          fallbackFiles.forEach(fallback => {
            console.log(chalk.gray(`    ${path.resolve(process.cwd(), fallback)}`));
          });
        }
      }
    }
  } else if (isContainer) {
    console.log(chalk.cyan('🐳 Container environment detected, using runtime environment variables'));
  }

  // Load Phase secrets after .env file is loaded (so PHASE_SERVICE_TOKEN is available)
  let phaseLoaded = false;
  if (!noPhase && options.phaseEnabled !== false) {
    phaseLoaded = await loadPhaseSecrets({
      appNamespace: options.appNamespace,
      cwd: process.cwd()
    });
  }

  // Run validation if enabled
  if (!noValidation && options.validation !== false) {
    console.log('\n' + chalk.blue('🔍 Validating environment variables...'));

    const appConfig = configFile ? loadAppConfig(path.dirname(configFile)) : loadAppConfig();

    if (appConfig && appConfig.envVars) {
      // Ensure displayName is set
      if (!appConfig.displayName) {
        appConfig.displayName = appConfig.appName || 'Application';
      }
      const result = await validateEnvironment(appConfig);
      printValidationSummary(result, appConfig);

      if (!result.valid && appConfig.validation?.strict !== false) {
        console.log('\n' + chalk.red('❌ Environment validation failed!'));
        process.exit(1);
      }
    }
  }

  console.log('='.repeat(60) + '\n')

  // Execute the command with preserved arguments
  const commandString = joinCommandArgs(command);
  console.log(chalk.cyan(`Running: ${commandString}`));

  // Debug: Verify token is still available before spawning
  if (process.env.CI || process.env.VERCEL) {
    const token = process.env.PHASE_SERVICE_TOKEN;
    if (token) {
      console.log(chalk.gray(`  Spawning with token length: ${token.length}`));
    } else {
      console.log(chalk.yellow('  ⚠️  No PHASE_SERVICE_TOKEN in environment before spawn'));
    }
  }

  const child = spawn(commandString, {
    stdio: 'inherit',
    shell: true,
    env: process.env // Pass full environment including Phase token
  });

  child.on('error', (error) => {
    console.error(chalk.red('Failed to start command:'), error);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}