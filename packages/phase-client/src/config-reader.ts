/**
 * Read Phase configuration from .phase.json or package.json
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';

interface PhaseAppConfig {
  phaseApp: string;
  environments?: Record<string, string>;
}

interface PhaseRootConfig {
  apps?: Record<string, PhaseAppConfig>;
  packages?: Record<string, PhaseAppConfig>;
  defaults?: {
    environment?: string;
  };
}

interface PackageJsonPhaseConfig {
  app?: string;
  environments?: Record<string, string>;
}

/**
 * Find the project root (where .phase.json might be)
 */
function findProjectRoot(startPath: string = process.cwd()): string | null {
  let currentPath = startPath;
  
  while (currentPath !== '/') {
    // Check for common root indicators
    if (existsSync(resolve(currentPath, '.phase.json')) ||
        existsSync(resolve(currentPath, 'pnpm-workspace.yaml')) ||
        existsSync(resolve(currentPath, 'lerna.json')) ||
        existsSync(resolve(currentPath, '.git'))) {
      return currentPath;
    }
    
    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }
  
  return null;
}

/**
 * Get the app/package name from the current directory
 */
function getCurrentAppName(cwd: string = process.cwd()): { type: 'app' | 'package', name: string } | null {
  const projectRoot = findProjectRoot(cwd);
  if (!projectRoot) return null;
  
  const relativePath = cwd.replace(projectRoot, '').replace(/^\//, '');
  const parts = relativePath.split('/');
  
  if (parts[0] === 'apps' && parts[1]) {
    return { type: 'app', name: parts[1] };
  }
  
  if (parts[0] === 'packages' && parts[1]) {
    return { type: 'package', name: parts[1] };
  }
  
  // If we're in the root or can't determine, try to get from package.json
  const packageJsonPath = resolve(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const name = packageJson.name;
      if (name) {
        // Extract the last part of scoped package name
        const nameParts = name.split('/');
        const shortName = nameParts[nameParts.length - 1];
        return { type: 'package', name: shortName };
      }
    } catch (error) {
      // Ignore
    }
  }
  
  return null;
}

/**
 * Read Phase configuration from .phase.json
 */
function readPhaseJsonConfig(cwd: string = process.cwd()): PhaseAppConfig | null {
  const projectRoot = findProjectRoot(cwd);
  if (!projectRoot) return null;
  
  const phaseJsonPath = resolve(projectRoot, '.phase.json');
  if (!existsSync(phaseJsonPath)) return null;
  
  try {
    const config: PhaseRootConfig = JSON.parse(readFileSync(phaseJsonPath, 'utf-8'));
    const appInfo = getCurrentAppName(cwd);
    
    if (!appInfo) return null;
    
    if (appInfo.type === 'app' && config.apps?.[appInfo.name]) {
      return config.apps[appInfo.name];
    }
    
    if (appInfo.type === 'package') {
      if (config.packages?.[appInfo.name]) {
        return config.packages[appInfo.name];
      }
      // Fall back to default package config
      if (config.packages?.default) {
        return config.packages.default;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error reading .phase.json:', error);
    return null;
  }
}

/**
 * Read Phase configuration from package.json
 */
function readPackageJsonPhaseConfig(cwd: string = process.cwd()): PhaseAppConfig | null {
  const packageJsonPath = resolve(cwd, 'package.json');
  
  if (!existsSync(packageJsonPath)) return null;
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    // Support both 'appName' (new format) and 'app' (legacy format)
    const appName = packageJson.phase?.appName || packageJson.phase?.app;
    
    if (appName) {
      return {
        phaseApp: appName,
        environments: packageJson.phase.environments
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get Phase configuration for the current project
 */
export function readPhaseConfig(cwd?: string): PhaseAppConfig | null {
  const workingDir = cwd || process.cwd();
  
  // First, try .phase.json (project-wide config)
  const phaseJsonConfig = readPhaseJsonConfig(workingDir);
  if (phaseJsonConfig) {
    return phaseJsonConfig;
  }
  
  // Then, try package.json (app-specific override)
  const packageJsonConfig = readPackageJsonPhaseConfig(workingDir);
  if (packageJsonConfig) {
    return packageJsonConfig;
  }
  
  return null;
}

/**
 * Get the Phase app name for the current project
 */
export function getPhaseAppName(fallback?: string): string {
  const config = readPhaseConfig();
  
  if (config?.phaseApp) {
    return config.phaseApp;
  }
  
  // If a fallback is provided, use it as-is (no assumptions about naming)
  if (fallback) {
    return fallback;
  }
  
  // No default - the caller must handle this case
  throw new Error('No Phase app configuration found. Please create a .phase.json file or add phase.app to package.json');
}

/**
 * Get the environment name from Phase config or default
 */
export function getPhaseEnvironment(nodeEnv?: string): string {
  const config = readPhaseConfig();
  const env = nodeEnv || process.env.NODE_ENV || 'development';
  
  if (config?.environments && config.environments[env]) {
    return config.environments[env];
  }
  
  // Default to the node env value
  return env;
}