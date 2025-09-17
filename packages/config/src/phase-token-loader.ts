// Phase.dev Service Token Loader with multiple source support
// WARNING: This module is SERVER-ONLY and should never be used in browser environments
// It uses Node.js fs module and handles sensitive service tokens
import { PhaseMonitoring } from './phase-monitoring'
import { TokenSource } from './types'

// Re-export TokenSource for backward compatibility
export type { TokenSource }

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
   * Load PHASE_SERVICE_TOKEN from multiple sources with precedence order (async)
   * @param rootPath Optional workspace root path (auto-detected if not provided)
   * @returns TokenSource object with token and source information, or null if not found
   */
  static async loadServiceToken(rootPath?: string): Promise<TokenSource | null> {
    // 1. Check process.env first (highest priority)
    if (process.env.PHASE_SERVICE_TOKEN) {
      return {
        source: 'process.env',
        token: process.env.PHASE_SERVICE_TOKEN
      }
    }

    // Only run file system operations on server-side
    if (typeof window !== 'undefined') {
      console.warn('[PhaseTokenLoader] File system access not available in browser environment');
      return null;
    }

    try {
      // Dynamic imports to avoid bundling in client code
      const path = await import('path');
      
      const currentDir = process.cwd()
      const workspaceRoot = rootPath || await this.findWorkspaceRoot(currentDir)
      
      // 2. Check local .env.local
      const localEnvLocal = await this.loadTokenFromFile(path.join(currentDir, '.env.local'))
      if (localEnvLocal) {
        return {
          source: 'local.env.local',
          token: localEnvLocal,
          path: path.join(currentDir, '.env.local')
        }
      }
      
      // 3. Check local .env
      const localEnv = await this.loadTokenFromFile(path.join(currentDir, '.env'))
      if (localEnv) {
        return {
          source: 'local.env',
          token: localEnv,
          path: path.join(currentDir, '.env')
        }
      }
      
      // 4. Check root .env.local
      if (workspaceRoot !== currentDir) {
        const rootEnvLocal = await this.loadTokenFromFile(path.join(workspaceRoot, '.env.local'))
        if (rootEnvLocal) {
          return {
            source: 'root.env.local',
            token: rootEnvLocal,
            path: path.join(workspaceRoot, '.env.local')
          }
        }
      }
      
      // 5. Check root .env
      if (workspaceRoot !== currentDir) {
        const rootEnv = await this.loadTokenFromFile(path.join(workspaceRoot, '.env'))
        if (rootEnv) {
          return {
            source: 'root.env',
            token: rootEnv,
            path: path.join(workspaceRoot, '.env')
          }
        }
      }
    } catch (error) {
      console.warn('[PhaseTokenLoader] File system modules not available, using process.env only');
    }
    
    return null
  }

  /**
   * Load PHASE_SERVICE_TOKEN synchronously (process.env only)
   * @returns TokenSource object with token and source information, or null if not found
   */
  static loadServiceTokenSync(): TokenSource | null {
    // Only check process.env for synchronous access
    if (process.env.PHASE_SERVICE_TOKEN) {
      return {
        source: 'process.env',
        token: process.env.PHASE_SERVICE_TOKEN
      }
    }
    
    return null
  }

  /**
   * Load PHASE_SERVICE_TOKEN with monitoring integration (async)
   * @param rootPath Optional workspace root path (auto-detected if not provided)
   * @returns TokenSource object with token and source information, or null if not found
   */
  static async loadServiceTokenWithMonitoring(rootPath?: string): Promise<TokenSource | null> {
    const startTime = performance.now()
    
    // Get diagnostics first (without causing circular dependency)
    const diagnostics = await this.getTokenSourceDiagnosticsInternal(rootPath)
    
    // Load the token
    const token = await this.loadServiceToken(rootPath)
    
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
   * Load PHASE_SERVICE_TOKEN from a specific .env file (async)
   * @param filePath Path to the .env file
   * @returns Token value or null if not found
   */
  private static async loadTokenFromFile(filePath: string): Promise<string | null> {
    // Only run on server-side
    if (typeof window !== 'undefined') {
      return null;
    }

    try {
      // Dynamic imports to avoid bundling in client code
      const fs = await import('fs');
      
      if (!fs.existsSync(filePath)) {
        return null
      }
      
      const content = fs.readFileSync(filePath, 'utf8')
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
   * Find workspace root by looking for workspace indicators (async)
   * @param startPath Starting directory path
   * @returns Workspace root path
   */
  private static async findWorkspaceRoot(startPath: string): Promise<string> {
    // Only run on server-side
    if (typeof window !== 'undefined') {
      return startPath;
    }

    try {
      // Dynamic imports to avoid bundling in client code
      const fs = await import('fs');
      const path = await import('path');
      
      let currentPath = startPath
      
      // Look for workspace indicators going up the directory tree
      while (currentPath !== path.dirname(currentPath)) {
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
          if (fs.existsSync(path.join(currentPath, indicator))) {
            return currentPath
          }
        }
        
        // Move up one directory
        currentPath = path.dirname(currentPath)
      }
    } catch (error) {
      console.warn('[PhaseTokenLoader] File system modules not available for workspace root detection');
    }
    
    // If no workspace root found, return the starting path
    return startPath
  }
  
  /**
   * Get token source information for debugging (async)
   * @param rootPath Optional workspace root path
   * @returns Array of all potential token sources with their status
   */
  static async getTokenSourceDiagnostics(rootPath?: string): Promise<Array<{
    source: TokenSource['source']
    path?: string
    exists: boolean
    hasToken: boolean
    isActive: boolean
  }>> {
    return await this.getTokenSourceDiagnosticsInternal(rootPath)
  }

  /**
   * Internal method to get token source diagnostics without circular dependency (async)
   * @param rootPath Optional workspace root path
   * @returns Array of all potential token sources with their status
   */
  private static async getTokenSourceDiagnosticsInternal(rootPath?: string): Promise<Array<{
    source: TokenSource['source']
    path?: string
    exists: boolean
    hasToken: boolean
    isActive: boolean
  }>> {
    const sources: Array<{
      source: TokenSource['source']
      path?: string
      exists: boolean
      hasToken: boolean
      isActive: boolean
    }> = []

    // Process.env (always available)
    sources.push({
      source: 'process.env',
      exists: true,
      hasToken: !!process.env.PHASE_SERVICE_TOKEN,
      isActive: !!process.env.PHASE_SERVICE_TOKEN
    })

    // Only check file sources on server-side
    if (typeof window !== 'undefined') {
      return sources;
    }

    try {
      // Dynamic imports to avoid bundling in client code
      const path = await import('path');
      const fs = await import('fs');
      
      const currentDir = process.cwd()
      const workspaceRoot = rootPath || await this.findWorkspaceRoot(currentDir)
      const activeToken = await this.loadServiceToken(rootPath)
      
      // Update process.env active status based on actual active token
      sources[0].isActive = activeToken?.source === 'process.env'
      
      // Local .env.local
      const localEnvLocalPath = path.join(currentDir, '.env.local')
      sources.push({
        source: 'local.env.local',
        path: localEnvLocalPath,
        exists: fs.existsSync(localEnvLocalPath),
        hasToken: !!(await this.loadTokenFromFile(localEnvLocalPath)),
        isActive: activeToken?.source === 'local.env.local'
      })
      
      // Local .env
      const localEnvPath = path.join(currentDir, '.env')
      sources.push({
        source: 'local.env',
        path: localEnvPath,
        exists: fs.existsSync(localEnvPath),
        hasToken: !!(await this.loadTokenFromFile(localEnvPath)),
        isActive: activeToken?.source === 'local.env'
      })
      
      // Root .env.local (only if different from current directory)
      if (workspaceRoot !== currentDir) {
        const rootEnvLocalPath = path.join(workspaceRoot, '.env.local')
        sources.push({
          source: 'root.env.local',
          path: rootEnvLocalPath,
          exists: fs.existsSync(rootEnvLocalPath),
          hasToken: !!(await this.loadTokenFromFile(rootEnvLocalPath)),
          isActive: activeToken?.source === 'root.env.local'
        })
      }
      
      // Root .env (only if different from current directory)
      if (workspaceRoot !== currentDir) {
        const rootEnvPath = path.join(workspaceRoot, '.env')
        sources.push({
          source: 'root.env',
          path: rootEnvPath,
          exists: fs.existsSync(rootEnvPath),
          hasToken: !!(await this.loadTokenFromFile(rootEnvPath)),
          isActive: activeToken?.source === 'root.env'
        })
      }
    } catch (error) {
      console.warn('[PhaseTokenLoader] File system modules not available for diagnostics');
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
   * Get the currently active token with validation (async)
   * @param rootPath Optional workspace root path
   * @returns TokenSource with validated token, or null if no valid token found
   */
  static async getValidatedToken(rootPath?: string): Promise<TokenSource | null> {
    const tokenSource = await this.loadServiceTokenWithMonitoring(rootPath)
    
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