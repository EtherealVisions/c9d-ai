// Unit tests for PhaseTokenLoader
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { PhaseTokenLoader, TokenSource } from '../phase-token-loader'

// Mock fs functions
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}))

// Mock path functions
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((path) => {
    const parts = path.split('/')
    return parts.slice(0, -1).join('/') || '/'
  })
}))

const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)
const mockJoin = vi.mocked(join)

describe('PhaseTokenLoader', () => {
  const originalEnv = process.env
  const originalCwd = process.cwd
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Reset environment
    process.env = { ...originalEnv }
    delete process.env.PHASE_SERVICE_TOKEN
    
    // Mock process.cwd
    process.cwd = vi.fn(() => '/current/dir')
    
    // Setup default mock implementations
    mockJoin.mockImplementation((...args) => args.join('/'))
    mockExistsSync.mockReturnValue(false)
    mockReadFileSync.mockReturnValue('')
  })
  
  afterEach(() => {
    // Restore original environment and functions
    process.env = originalEnv
    process.cwd = originalCwd
    vi.restoreAllMocks()
  })
  
  describe('loadServiceToken', () => {
    it('should return token from process.env with highest priority', () => {
      // Setup
      process.env.PHASE_SERVICE_TOKEN = 'process-env-token'
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toEqual({
        source: 'process.env',
        token: 'process-env-token'
      })
    })
    
    it('should return token from local .env.local when process.env is not available', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => path === '/current/dir/.env.local')
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.env.local') {
          return 'PHASE_SERVICE_TOKEN=local-env-local-token\nOTHER_VAR=value'
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toEqual({
        source: 'local.env.local',
        token: 'local-env-local-token',
        path: '/current/dir/.env.local'
      })
    })
    
    it('should return token from local .env when higher priority sources are not available', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => path === '/current/dir/.env')
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.env') {
          return 'PHASE_SERVICE_TOKEN=local-env-token'
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toEqual({
        source: 'local.env',
        token: 'local-env-token',
        path: '/current/dir/.env'
      })
    })
    
    it('should return token from root .env.local when local sources are not available', () => {
      // Setup - mock workspace root detection
      mockExistsSync.mockImplementation((path) => {
        return path === '/workspace/root/pnpm-workspace.yaml' || 
               path === '/workspace/root/.env.local'
      })
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/workspace/root/.env.local') {
          return 'PHASE_SERVICE_TOKEN=root-env-local-token'
        }
        return ''
      })
      
      // Mock process.cwd to return a subdirectory
      process.cwd = vi.fn(() => '/workspace/root/apps/web')
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toEqual({
        source: 'root.env.local',
        token: 'root-env-local-token',
        path: '/workspace/root/.env.local'
      })
    })
    
    it('should return token from root .env as last resort', () => {
      // Setup - mock workspace root detection
      mockExistsSync.mockImplementation((path) => {
        return path === '/workspace/root/pnpm-workspace.yaml' || 
               path === '/workspace/root/.env'
      })
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/workspace/root/.env') {
          return 'PHASE_SERVICE_TOKEN=root-env-token'
        }
        return ''
      })
      
      // Mock process.cwd to return a subdirectory
      process.cwd = vi.fn(() => '/workspace/root/apps/web')
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toEqual({
        source: 'root.env',
        token: 'root-env-token',
        path: '/workspace/root/.env'
      })
    })
    
    it('should return null when no token is found in any source', () => {
      // Setup - no files exist and no process.env
      mockExistsSync.mockReturnValue(false)
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toBeNull()
    })
    
    it('should respect precedence order when multiple sources have tokens', () => {
      // Setup - multiple sources have tokens
      process.env.PHASE_SERVICE_TOKEN = 'process-env-token'
      
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockImplementation((path) => {
        const pathStr = String(path)
        if (pathStr.includes('.env.local')) {
          return 'PHASE_SERVICE_TOKEN=env-local-token'
        }
        if (pathStr.includes('.env')) {
          return 'PHASE_SERVICE_TOKEN=env-token'
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify - should return process.env token (highest priority)
      expect(result).toEqual({
        source: 'process.env',
        token: 'process-env-token'
      })
    })
    
    it('should handle quoted tokens correctly', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => path === '/current/dir/.env')
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.env') {
          return 'PHASE_SERVICE_TOKEN="quoted-token"\nOTHER_VAR=\'single-quoted\''
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toEqual({
        source: 'local.env',
        token: 'quoted-token',
        path: '/current/dir/.env'
      })
    })
    
    it('should handle single-quoted tokens correctly', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => path === '/current/dir/.env')
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.env') {
          return "PHASE_SERVICE_TOKEN='single-quoted-token'"
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toEqual({
        source: 'local.env',
        token: 'single-quoted-token',
        path: '/current/dir/.env'
      })
    })
    
    it('should skip empty tokens', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => 
        path === '/current/dir/.env.local' || path === '/current/dir/.env'
      )
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.env.local') {
          return 'PHASE_SERVICE_TOKEN=\nOTHER_VAR=value'
        }
        if (path === '/current/dir/.env') {
          return 'PHASE_SERVICE_TOKEN=valid-token'
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify - should skip empty token and use next source
      expect(result).toEqual({
        source: 'local.env',
        token: 'valid-token',
        path: '/current/dir/.env'
      })
    })
    
    it('should skip commented lines and empty lines', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => path === '/current/dir/.env')
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.env') {
          return `# This is a comment
          
# PHASE_SERVICE_TOKEN=commented-token
PHASE_SERVICE_TOKEN=actual-token
# Another comment`
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toEqual({
        source: 'local.env',
        token: 'actual-token',
        path: '/current/dir/.env'
      })
    })
    
    it('should handle file read errors gracefully', () => {
      // Setup
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify - should return null when all files fail to read
      expect(result).toBeNull()
    })
    
    it('should use provided rootPath instead of auto-detection', () => {
      // Setup
      const customRootPath = '/custom/root'
      mockExistsSync.mockImplementation((path) => path === '/custom/root/.env')
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/custom/root/.env') {
          return 'PHASE_SERVICE_TOKEN=custom-root-token'
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken(customRootPath)
      
      // Verify
      expect(result).toEqual({
        source: 'root.env',
        token: 'custom-root-token',
        path: '/custom/root/.env'
      })
    })
  })
  
  describe('findWorkspaceRoot', () => {
    it('should find workspace root with pnpm-workspace.yaml', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => 
        path === '/workspace/root/pnpm-workspace.yaml'
      )
      
      // Mock process.cwd to return a subdirectory
      process.cwd = vi.fn(() => '/workspace/root/apps/web')
      
      // Execute - use a method that calls findWorkspaceRoot internally
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify by checking the calls made to existsSync
      expect(mockExistsSync).toHaveBeenCalledWith('/workspace/root/pnpm-workspace.yaml')
    })
    
    it('should find workspace root with turbo.json', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => 
        path === '/workspace/root/turbo.json'
      )
      
      // Mock process.cwd to return a subdirectory
      process.cwd = vi.fn(() => '/workspace/root/packages/config')
      
      // Execute
      PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(mockExistsSync).toHaveBeenCalledWith('/workspace/root/turbo.json')
    })
    
    it('should find workspace root with .git directory', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => 
        path === '/workspace/root/.git'
      )
      
      // Mock process.cwd to return a subdirectory
      process.cwd = vi.fn(() => '/workspace/root/deep/nested/dir')
      
      // Execute
      PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(mockExistsSync).toHaveBeenCalledWith('/workspace/root/.git')
    })
    
    it('should return starting path when no workspace root indicators found', () => {
      // Setup - no workspace indicators exist
      mockExistsSync.mockReturnValue(false)
      
      // Mock process.cwd
      process.cwd = vi.fn(() => '/some/random/path')
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify - should still try to load from current directory
      expect(mockExistsSync).toHaveBeenCalledWith('/some/random/path/.env.local')
      expect(mockExistsSync).toHaveBeenCalledWith('/some/random/path/.env')
    })
  })
  
  describe('getTokenSourceDiagnostics', () => {
    it('should return diagnostics for all potential sources', () => {
      // Setup
      process.env.PHASE_SERVICE_TOKEN = 'process-env-token'
      mockExistsSync.mockImplementation((path) => 
        path === '/current/dir/.env.local' || path === '/current/dir/.env'
      )
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.env.local') {
          return 'OTHER_VAR=value'
        }
        if (path === '/current/dir/.env') {
          return 'PHASE_SERVICE_TOKEN=env-token'
        }
        return ''
      })
      
      // Execute
      const diagnostics = PhaseTokenLoader.getTokenSourceDiagnostics()
      
      // Verify
      expect(diagnostics).toHaveLength(3) // process.env, local.env.local, local.env
      
      expect(diagnostics[0]).toEqual({
        source: 'process.env',
        exists: true,
        hasToken: true,
        isActive: true
      })
      
      expect(diagnostics[1]).toEqual({
        source: 'local.env.local',
        path: '/current/dir/.env.local',
        exists: true,
        hasToken: false,
        isActive: false
      })
      
      expect(diagnostics[2]).toEqual({
        source: 'local.env',
        path: '/current/dir/.env',
        exists: true,
        hasToken: true,
        isActive: false
      })
    })
    
    it('should include root sources when workspace root is different', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => 
        path === '/workspace/root/pnpm-workspace.yaml' ||
        path === '/workspace/root/.env.local' ||
        path === '/workspace/root/.env'
      )
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/workspace/root/.env') {
          return 'PHASE_SERVICE_TOKEN=root-token'
        }
        return ''
      })
      
      // Mock process.cwd to return a subdirectory
      process.cwd = vi.fn(() => '/workspace/root/apps/web')
      
      // Execute
      const diagnostics = PhaseTokenLoader.getTokenSourceDiagnostics()
      
      // Verify - should include root sources
      expect(diagnostics).toHaveLength(5) // process.env, local.env.local, local.env, root.env.local, root.env
      
      const rootEnvDiagnostic = diagnostics.find(d => d.source === 'root.env')
      expect(rootEnvDiagnostic).toEqual({
        source: 'root.env',
        path: '/workspace/root/.env',
        exists: true,
        hasToken: true,
        isActive: true
      })
    })
  })
  
  describe('validateTokenFormat', () => {
    it('should return true for valid token format', () => {
      const validTokens = [
        'ph_test_1234567890abcdef',
        'valid-token-123',
        'a'.repeat(50),
        'token_with_underscores_123'
      ]
      
      validTokens.forEach(token => {
        expect(PhaseTokenLoader.validateTokenFormat(token)).toBe(true)
      })
    })
    
    it('should return false for invalid token format', () => {
      const invalidTokens = [
        '',
        '   ',
        'short',
        'token with spaces',
        null as any,
        undefined as any,
        123 as any
      ]
      
      invalidTokens.forEach(token => {
        expect(PhaseTokenLoader.validateTokenFormat(token)).toBe(false)
      })
    })
  })
  
  describe('getValidatedToken', () => {
    it('should return token source when token is valid', () => {
      // Setup
      process.env.PHASE_SERVICE_TOKEN = 'valid-token-123456'
      
      // Execute
      const result = PhaseTokenLoader.getValidatedToken()
      
      // Verify
      expect(result).toEqual({
        source: 'process.env',
        token: 'valid-token-123456'
      })
    })
    
    it('should return null when token format is invalid', () => {
      // Setup
      process.env.PHASE_SERVICE_TOKEN = 'short'
      
      // Execute
      const result = PhaseTokenLoader.getValidatedToken()
      
      // Verify
      expect(result).toBeNull()
    })
    
    it('should return null when no token is found', () => {
      // Setup - no token in any source
      mockExistsSync.mockReturnValue(false)
      
      // Execute
      const result = PhaseTokenLoader.getValidatedToken()
      
      // Verify
      expect(result).toBeNull()
    })
  })
  
  describe('edge cases', () => {
    it('should handle malformed .env files gracefully', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => path === '/current/dir/.env')
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.env') {
          return 'MALFORMED LINE WITHOUT EQUALS\nPHASE_SERVICE_TOKEN=valid-token\nANOTHER=MALFORMED='
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify - should still find the valid token
      expect(result).toEqual({
        source: 'local.env',
        token: 'valid-token',
        path: '/current/dir/.env'
      })
    })
    
    it('should handle tokens with special characters', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => path === '/current/dir/.env')
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.env') {
          return 'PHASE_SERVICE_TOKEN=token-with-special-chars_123!@#$%^&*()'
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toEqual({
        source: 'local.env',
        token: 'token-with-special-chars_123!@#$%^&*()',
        path: '/current/dir/.env'
      })
    })
    
    it('should handle whitespace around token values', () => {
      // Setup
      mockExistsSync.mockImplementation((path) => path === '/current/dir/.env')
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/current/dir/.env') {
          return 'PHASE_SERVICE_TOKEN  =  token-with-whitespace  '
        }
        return ''
      })
      
      // Execute
      const result = PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(result).toEqual({
        source: 'local.env',
        token: 'token-with-whitespace',
        path: '/current/dir/.env'
      })
    })
  })
})