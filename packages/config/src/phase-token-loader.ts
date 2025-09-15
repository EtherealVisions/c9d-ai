// Phase.dev Service Token Loader with multiple source support
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { PhaseMonitoring } from './phase-monitoring'

/**
 * Token source information for debugging and tracking
 */
export interface TokenSource {
  source: 'process.env' | 'local.env.local' | 'local.env' | 'root.env.local' | 'root.env'
  token: string
  path?: string
}

/**
 * Phase.dev Service Token Loader
 * 
 * Implements token loading from multiple sources with precedence order:
 * 1. process.env (highest priority)
 * 2. local .env.local
 * 3. local .env
 * 4. root .env.local
 * 5. root .env (lowest priority)
 */
export class PhaseTokenLoader {
  /**
   * Load PHASE_SERVICE_TOKEN from multiple sources with precedence order
   * @param rootPath Optional workspace root path (auto-detected if not provided)
   * @returns TokenSource object with token and source information, or null if not found
   */
  static loadServiceToken(rootPath?: string): TokenSource | null {
    // 1. Check process.env first (highest priority)
    if (process.env.PHASE_SERVICE_TOKEN) {
      return {
        source: 'process.env',
        token: process.env.PHASE_SERVICE_TOKEN
      }
    }
    
    const currentDir = process.cwd()
    const workspaceRoot = rootPath || this.findWorkspaceRoot(currentDir)
    
    // 2. Check local .env.local
    const localEnvLocal = this.loadTokenFromFile(join(currentDir, '.env.local'))
    if (localEnvLocal) {
      return {
        source: 'local.env.local',
        token: localEnvLocal,
        path: join(currentDir, '.env.local')
      }
    }
    
    // 3. Check local .env
    const localEnv = this.loadTokenFromFile(join(currentDir, '.env'))
    if (localEnv) {
      return {
        source: 'local.env',
        token: localEnv,
        path: join(currentDir, '.env')
      }
    }
    
    // 4. Check root .env.local
    if (workspaceRoot !== currentDir) {
      const rootEnvLocal = this.loadTokenFromFile(join(workspaceRoot, '.env.local'))
      if (rootEnvLocal) {
        return {
          source: 'root.env.local',
          token: rootEnvLocal,
          path: join(workspaceRoot, '.env.local')
        }
      }
    }
    
    // 5. Check root .env
    if (workspaceRoot !== currentDir) {
      const rootEnv = this.loadTokenFromFile(join(workspaceRoot, '.env'))
      if (rootEnv) {
        return {
          source: 'root.env',
          token: rootEnv,
          path: join(workspaceRoot, '.env')
        }
      }
    }
    
    return null
  }

  /**
   * Load PHASE_SERVICE_TOKEN with monitoring integration
   * @param rootPath Optional workspace root path (auto-detected if not provided)
   * @returns TokenSource object with token and source information, or null if not found
   */
  static loadServiceTokenWithMonitoring(rootPath?: string): TokenSource | null {
    const startTime = performance.now()
    
    // Get diagnostics first (without causing circular dependency)
    const diagnostics = this.getTokenSourceDiagnosticsInternal(rootPath)
    
    // Load the token
    const token = this.loadServiceToken(rootPath)
    
    const loadTime = performance.now() - startTime
    
    // Log token loading with monitoring
    PhaseMonitoring.logTokenLoadingProcess(
      diagnostics,
      token || undefined,
      loadTime
    )
    
    return token
  }
  
  /**
   * Load PHASE_SERVICE_TOKEN from a specific .env file
   * @param filePath Path to the .env file
   * @returns Token value or null if not found
   */
  private static loadTokenFromFile(filePath: string): string | null {
    if (!existsSync(filePath)) {
      return null
    }
    
    try {
      const content = readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue
        }
        
        // Look for PHASE_SERVICE_TOKEN assignment
        const match = trimmedLine.match(/^PHASE_SERVICE_TOKEN\s*=\s*(.*)$/)
        if (match) {
          let value = match[1].trim()
          
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          
          // Return token if it's not empty
          if (value.length > 0) {
            return value
          }
        }
      }
    } catch (error) {
      // Silently ignore file read errors and continue to next source
      console.warn(`[PhaseTokenLoader] Failed to read ${filePath}:`, error instanceof Error ? error.message : 'Unknown error')
    }
    
    return null
  }
  
  /**
   * Find workspace root by looking for workspace indicators
   * @param startPath Starting directory path
   * @returns Workspace root path
   */
  private static findWorkspaceRoot(startPath: string): string {
    let currentPath = startPath
    
    // Look for workspace indicators going up the directory tree
    while (currentPath !== dirname(currentPath)) {
      // Check for common workspace root indicators
      const indicators = [
        'pnpm-workspace.yaml',
        'pnpm-lock.yaml',
        'turbo.json',
        'lerna.json',
        'rush.json',
        '.git'
      ]
      
      for (const indicator of indicators) {
        if (existsSync(join(currentPath, indicator))) {
          return currentPath
        }
      }
      
      // Move up one directory
      currentPath = dirname(currentPath)
    }
    
    // If no workspace root found, return the starting path
    return startPath
  }
  
  /**
   * Get token source information for debugging
   * @param rootPath Optional workspace root path
   * @returns Array of all potential token sources with their status
   */
  static getTokenSourceDiagnostics(rootPath?: string): Array<{
    source: TokenSource['source']
    path?: string
    exists: boolean
    hasToken: boolean
    isActive: boolean
  }> {
    return this.getTokenSourceDiagnosticsInternal(rootPath)
  }

  /**
   * Internal method to get token source diagnostics without circular dependency
   * @param rootPath Optional workspace root path
   * @returns Array of all potential token sources with their status
   */
  private static getTokenSourceDiagnosticsInternal(rootPath?: string): Array<{
    source: TokenSource['source']
    path?: string
    exists: boolean
    hasToken: boolean
    isActive: boolean
  }> {
    const currentDir = process.cwd()
    const workspaceRoot = rootPath || this.findWorkspaceRoot(currentDir)
    const activeToken = this.loadServiceToken(rootPath)
    
    const sources: Array<{
      source: TokenSource['source']
      path?: string
      exists: boolean
      hasToken: boolean
      isActive: boolean
    }> = []
    
    // Process.env
    sources.push({
      source: 'process.env',
      exists: true,
      hasToken: !!process.env.PHASE_SERVICE_TOKEN,
      isActive: activeToken?.source === 'process.env'
    })
    
    // Local .env.local
    const localEnvLocalPath = join(currentDir, '.env.local')
    sources.push({
      source: 'local.env.local',
      path: localEnvLocalPath,
      exists: existsSync(localEnvLocalPath),
      hasToken: !!this.loadTokenFromFile(localEnvLocalPath),
      isActive: activeToken?.source === 'local.env.local'
    })
    
    // Local .env
    const localEnvPath = join(currentDir, '.env')
    sources.push({
      source: 'local.env',
      path: localEnvPath,
      exists: existsSync(localEnvPath),
      hasToken: !!this.loadTokenFromFile(localEnvPath),
      isActive: activeToken?.source === 'local.env'
    })
    
    // Root .env.local (only if different from current directory)
    if (workspaceRoot !== currentDir) {
      const rootEnvLocalPath = join(workspaceRoot, '.env.local')
      sources.push({
        source: 'root.env.local',
        path: rootEnvLocalPath,
        exists: existsSync(rootEnvLocalPath),
        hasToken: !!this.loadTokenFromFile(rootEnvLocalPath),
        isActive: activeToken?.source === 'root.env.local'
      })
    }
    
    // Root .env (only if different from current directory)
    if (workspaceRoot !== currentDir) {
      const rootEnvPath = join(workspaceRoot, '.env')
      sources.push({
        source: 'root.env',
        path: rootEnvPath,
        exists: existsSync(rootEnvPath),
        hasToken: !!this.loadTokenFromFile(rootEnvPath),
        isActive: activeToken?.source === 'root.env'
      })
    }
    
    return sources
  }
  
  /**
   * Validate that a token has the expected format
   * @param token Token to validate
   * @returns True if token appears to be valid format
   */
  static validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false
    }
    
    // Basic validation - Phase.dev tokens are typically long strings
    // This is a basic check and can be enhanced based on actual token format
    return token.length >= 10 && !token.includes(' ')
  }
  
  /**
   * Get the currently active token with validation
   * @param rootPath Optional workspace root path
   * @returns TokenSource with validated token, or null if no valid token found
   */
  static getValidatedToken(rootPath?: string): TokenSource | null {
    const tokenSource = this.loadServiceTokenWithMonitoring(rootPath)
    
    if (!tokenSource) {
      return null
    }
    
    if (!this.validateTokenFormat(tokenSource.token)) {
      console.warn(`[PhaseTokenLoader] Invalid token format from source: ${tokenSource.source}`)
      return null
    }
    
    return tokenSource
  }
}