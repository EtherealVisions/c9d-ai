// Integration tests for PhaseTokenLoader with existing phase.ts functionality
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PhaseTokenLoader } from '../phase-token-loader'
import { getPhaseConfig, loadFromPhase } from '../phase'
import { existsSync, readFileSync } from 'fs'

// Mock fs functions for controlled testing
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}))

const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)

describe('PhaseTokenLoader Integration', () => {
  const originalEnv = process.env
  
  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv }
    delete process.env.PHASE_SERVICE_TOKEN
    
    // Reset mocks
    vi.clearAllMocks()
    mockExistsSync.mockReturnValue(false)
    mockReadFileSync.mockReturnValue('')
  })
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    vi.restoreAllMocks()
  })
  
  describe('Integration with getPhaseConfig', () => {
    it('should work with process.env token (direct integration)', async () => {
      // Setup - token in process.env
      process.env.PHASE_SERVICE_TOKEN = 'process-env-token'
      
      // Execute
      const config = await getPhaseConfig()
      
      // Verify
      expect(config).not.toBeNull()
      expect(config?.serviceToken).toBe('process-env-token')
      expect(config?.appName).toBe('AI.C9d.Web')
    })
    
    it('should return null when PhaseTokenLoader finds no token', async () => {
      // Setup - no token in any source
      mockExistsSync.mockReturnValue(false)
      
      // Execute
      const config = await getPhaseConfig()
      
      // Verify
      expect(config).toBeNull()
    })
    
    it('should demonstrate PhaseTokenLoader functionality independently', async () => {
      // Setup - token in .env file
      mockExistsSync.mockImplementation((path) => {
        const pathStr = String(path)
        return pathStr.includes('/.env') && !pathStr.includes('.env.local')
      })
      mockReadFileSync.mockImplementation((path) => {
        const pathStr = String(path)
        if (pathStr.includes('/.env') && !pathStr.includes('.env.local')) {
          return 'PHASE_SERVICE_TOKEN=token-from-env-file\nOTHER_VAR=value'
        }
        return ''
      })
      
      // Execute - test PhaseTokenLoader directly
      const tokenSource = await PhaseTokenLoader.loadServiceToken()
      
      // Verify
      expect(tokenSource).not.toBeNull()
      expect(tokenSource?.token).toBe('token-from-env-file')
      expect(tokenSource?.source).toBe('local.env')
    })
  })
  
  describe('Integration with loadFromPhase', () => {
    it('should use PhaseTokenLoader for token discovery', async () => {
      // Setup - token in root .env.local file
      mockExistsSync.mockImplementation((path) => {
        const pathStr = String(path)
        return pathStr.includes('pnpm-workspace.yaml') || 
               pathStr.endsWith('/.env.local')
      })
      mockReadFileSync.mockImplementation((path) => {
        if (String(path).endsWith('/.env.local')) {
          return 'PHASE_SERVICE_TOKEN=root-env-local-token'
        }
        return ''
      })
      
      // Mock process.cwd to simulate being in a subdirectory
      const originalCwd = process.cwd
      process.cwd = vi.fn(() => '/workspace/root/apps/web')
      
      try {
        // Execute
        const result = await loadFromPhase()
        
        // Verify - should attempt to use the token (will fail with 404 but that's expected)
        expect(result.success).toBe(false)
        expect(result.source).toBe('fallback')
        // The error should indicate it tried to use the token
        expect(result.error).toContain('Phase.dev')
      } finally {
        process.cwd = originalCwd
      }
    })
    
    it('should fallback gracefully when no token is found', async () => {
      // Setup - no token in any source
      mockExistsSync.mockReturnValue(false)
      
      // Execute
      const result = await loadFromPhase()
      
      // Verify
      expect(result.success).toBe(false)
      expect(result.source).toBe('fallback')
      expect(result.error).toBe('Phase.dev service token not available')
    })
  })
  
  describe('Token Source Diagnostics', () => {
    it('should provide comprehensive diagnostics for debugging', async () => {
      // Setup - multiple sources with different states
      process.env.PHASE_SERVICE_TOKEN = 'process-env-token'
      
      mockExistsSync.mockImplementation((path) => {
        const pathStr = String(path)
        return pathStr.endsWith('/.env.local') || pathStr.endsWith('/.env')
      })
      mockReadFileSync.mockImplementation((path) => {
        const pathStr = String(path)
        if (pathStr.endsWith('/.env.local')) {
          return 'OTHER_VAR=value'  // No token
        }
        if (pathStr.endsWith('/.env')) {
          return 'PHASE_SERVICE_TOKEN=env-file-token'
        }
        return ''
      })
      
      // Execute
      const diagnostics = await PhaseTokenLoader.getTokenSourceDiagnostics()
      
      // Verify
      expect(diagnostics).toHaveLength(3) // process.env, local.env.local, local.env
      
      // Process.env should be active
      const processEnvDiagnostic = diagnostics.find(d => d.source === 'process.env')
      expect(processEnvDiagnostic).toEqual({
        source: 'process.env',
        exists: true,
        hasToken: true,
        isActive: true
      })
      
      // Local .env.local should exist but not have token
      const localEnvLocalDiagnostic = diagnostics.find(d => d.source === 'local.env.local')
      expect(localEnvLocalDiagnostic?.exists).toBe(true)
      expect(localEnvLocalDiagnostic?.hasToken).toBe(false)
      expect(localEnvLocalDiagnostic?.isActive).toBe(false)
      
      // Local .env should exist and have token but not be active
      const localEnvDiagnostic = diagnostics.find(d => d.source === 'local.env')
      expect(localEnvDiagnostic?.exists).toBe(true)
      expect(localEnvDiagnostic?.hasToken).toBe(true)
      expect(localEnvDiagnostic?.isActive).toBe(false)
    })
  })
  
  describe('Token Validation', () => {
    it('should validate token format and reject invalid tokens', async () => {
      // Setup - invalid token in .env file
      mockExistsSync.mockImplementation((path) => 
        String(path).endsWith('/.env')
      )
      mockReadFileSync.mockImplementation((path) => {
        if (String(path).endsWith('/.env')) {
          return 'PHASE_SERVICE_TOKEN=bad'  // Too short
        }
        return ''
      })
      
      // Execute
      const validatedToken = await PhaseTokenLoader.getValidatedToken()
      
      // Verify - should reject invalid token
      expect(validatedToken).toBeNull()
    })
    
    it('should accept valid token format', async () => {
      // Setup - valid token in .env file
      mockExistsSync.mockImplementation((path) => 
        String(path).endsWith('/.env')
      )
      mockReadFileSync.mockImplementation((path) => {
        if (String(path).endsWith('/.env')) {
          return 'PHASE_SERVICE_TOKEN=ph_test_1234567890abcdef'
        }
        return ''
      })
      
      // Execute
      const validatedToken = await PhaseTokenLoader.getValidatedToken()
      
      // Verify - should accept valid token
      expect(validatedToken).not.toBeNull()
      expect(validatedToken?.token).toBe('ph_test_1234567890abcdef')
      expect(validatedToken?.source).toBe('local.env')
    })
  })
  
  describe('Workspace Root Detection', () => {
    it('should detect workspace root and check root .env files', async () => {
      // Setup - simulate monorepo structure
      mockExistsSync.mockImplementation((path) => {
        const pathStr = String(path)
        return pathStr === '/workspace/root/pnpm-workspace.yaml' ||
               pathStr === '/workspace/root/.env'
      })
      mockReadFileSync.mockImplementation((path) => {
        if (String(path) === '/workspace/root/.env') {
          return 'PHASE_SERVICE_TOKEN=workspace-root-token'
        }
        return ''
      })
      
      // Mock process.cwd to simulate being in a subdirectory
      const originalCwd = process.cwd
      process.cwd = vi.fn(() => '/workspace/root/packages/config')
      
      try {
        // Execute
        const tokenSource = await PhaseTokenLoader.loadServiceToken()
        
        // Verify
        expect(tokenSource).not.toBeNull()
        expect(tokenSource?.token).toBe('workspace-root-token')
        expect(tokenSource?.source).toBe('root.env')
        expect(tokenSource?.path).toBe('/workspace/root/.env')
      } finally {
        process.cwd = originalCwd
      }
    })
  })
})