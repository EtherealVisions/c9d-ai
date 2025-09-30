/**
 * Tests for the root configuration system
 */

import * as fs from 'fs'
import * as path from 'path'
import { 
  loadPhaseConfiguration, 
  loadAppConfiguration 
} from '../config-loader'
import { 
  validatePhaseAppsConfig, 
  validateResolvedConfig,
  validateConfigurationFile,
  ConfigValidationResult
} from '../config-validator'
import { 
  getCurrentAppConfig,
  getAppConfig,
  listAllConfigurations,
  validateAllConfigurations,
  getPhaseAppName,
  getEnvironment,
  findMonorepoRoot,
  generateConfigurationReport
} from '../config-utils'

// Mock file system for testing
const mockFs = {
  '/test-repo/pnpm-workspace.yaml': 'packages:\n  - "apps/*"\n  - "packages/*"',
  '/test-repo/.phase-apps.json': JSON.stringify({
    version: '1.0.0',
    apps: {
      web: {
        phaseAppName: 'AI.C9d.Web',
        environment: 'development',
        fallbackEnvFiles: ['.env.local', '.env'],
        validation: { strict: true }
      }
    },
    packages: {
      ui: {
        phaseAppName: 'AI.C9d.Shared',
        environment: 'development'
      }
    },
    defaults: {
      environment: 'development',
      fallbackEnvFiles: ['.env.local', '.env'],
      timeout: 5000,
      retries: 3
    }
  }),
  '/test-repo/apps/web/package.json': JSON.stringify({
    name: '@c9d/web',
    phase: {
      appName: 'AI.C9d.Web',
      environment: 'staging'
    }
  }),
  '/test-repo/packages/ui/package.json': JSON.stringify({
    name: '@c9d/ui',
    phase: {
      appName: 'AI.C9d.Shared'
    }
  })
}

// Mock fs functions
jest.mock('fs')
jest.mock('path')

const mockFsSync = fs as jest.Mocked<typeof fs>
const mockPath = path as jest.Mocked<typeof path>

describe('Root Configuration System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup path mocks
    mockPath.join.mockImplementation((...args) => args.join('/'))
    mockPath.basename.mockImplementation((p) => p.split('/').pop() || '')
    mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'))
    mockPath.relative.mockImplementation((from, to) => {
      const fromParts = from.split('/')
      const toParts = to.split('/')
      const commonLength = Math.min(fromParts.length, toParts.length)
      let i = 0
      while (i < commonLength && fromParts[i] === toParts[i]) {
        i++
      }
      return toParts.slice(i).join('/')
    })
    mockPath.parse.mockImplementation((p) => ({
      root: '/',
      dir: p.split('/').slice(0, -1).join('/'),
      base: p.split('/').pop() || '',
      ext: '',
      name: p.split('/').pop()?.split('.')[0] || ''
    }))
    
    // Setup fs mocks
    mockFsSync.existsSync.mockImplementation((filePath) => {
      return Object.keys(mockFs).includes(filePath as string)
    })
    
    mockFsSync.readFileSync.mockImplementation((filePath) => {
      const content = mockFs[filePath as keyof typeof mockFs]
      if (!content) {
        throw new Error(`File not found: ${filePath}`)
      }
      return content
    })
  })

  describe('Configuration Loading', () => {
    it('should load configuration with precedence system', () => {
      const result = loadPhaseConfiguration('/test-repo/apps/web')
      
      expect(result.success).toBe(true)
      expect(result.config).toBeTruthy()
      expect(result.config?.phaseAppName).toBe('AI.C9d.Web')
      expect(result.config?.environment).toBe('staging') // From package.json (higher precedence)
      expect(result.source).toBe('package.json')
    })

    it('should fall back to root configuration when package.json has no phase config', () => {
      // Mock package.json without phase config
      mockFsSync.readFileSync.mockImplementation((filePath) => {
        if (filePath === '/test-repo/packages/ui/package.json') {
          return JSON.stringify({ name: '@c9d/ui' })
        }
        return mockFs[filePath as keyof typeof mockFs] || ''
      })

      const result = loadPhaseConfiguration('/test-repo/packages/ui')
      
      expect(result.success).toBe(true)
      expect(result.config?.phaseAppName).toBe('AI.C9d.Shared')
      expect(result.source).toBe('root-config')
    })

    it('should apply defaults when no specific configuration exists', () => {
      const result = loadPhaseConfiguration('/test-repo/packages/ui')
      
      expect(result.success).toBe(true)
      expect(result.config?.timeout).toBe(5000) // From defaults
      expect(result.config?.retries).toBe(3) // From defaults
    })
  })

  describe('Configuration Validation', () => {
    it('should validate root configuration file', () => {
      const result = validatePhaseAppsConfig('/test-repo/.phase-apps.json')
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      // Mock invalid configuration
      mockFsSync.readFileSync.mockImplementation((filePath) => {
        if (filePath === '/test-repo/.phase-apps.json') {
          return JSON.stringify({
            apps: {
              web: {
                // Missing phaseAppName
                environment: 'development'
              }
            }
          })
        }
        return mockFs[filePath as keyof typeof mockFs] || ''
      })

      const result = validatePhaseAppsConfig('/test-repo/.phase-apps.json')
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing required field: version')
      expect(result.errors.some(error => error.includes('phaseAppName'))).toBe(true)
    })

    it('should validate resolved configuration', () => {
      const config = {
        appName: 'web',
        phaseAppName: 'AI.C9d.Web',
        environment: 'development',
        fallbackEnvFiles: ['.env.local', '.env'],
        validation: { strict: true },
        timeout: 5000,
        retries: 3
      }

      const result = validateResolvedConfig(config)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Configuration Utilities', () => {
    it('should get phase app name for current directory', () => {
      const appName = getPhaseAppName('/test-repo/apps/web')
      expect(appName).toBe('AI.C9d.Web')
    })

    it('should get environment for current directory', () => {
      const environment = getEnvironment('/test-repo/apps/web')
      expect(environment).toBe('staging') // From package.json override
    })

    it('should find monorepo root', () => {
      const root = findMonorepoRoot('/test-repo/apps/web')
      expect(root).toBe('/test-repo')
    })

    it('should list all configurations', () => {
      // Mock directory listing
      mockFsSync.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === '/test-repo/apps') {
          return [{ name: 'web', isDirectory: () => true }] as any
        }
        if (dirPath === '/test-repo/packages') {
          return [{ name: 'ui', isDirectory: () => true }] as any
        }
        return []
      })

      const result = listAllConfigurations('/test-repo')
      
      expect(result.apps).toHaveLength(1)
      expect(result.packages).toHaveLength(1)
      expect(result.apps[0].name).toBe('web')
      expect(result.packages[0].name).toBe('ui')
    })

    it('should validate all configurations', () => {
      // Mock directory listing
      mockFsSync.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === '/test-repo/apps') {
          return [{ name: 'web', isDirectory: () => true }] as any
        }
        if (dirPath === '/test-repo/packages') {
          return [{ name: 'ui', isDirectory: () => true }] as any
        }
        return []
      })

      const result = validateAllConfigurations('/test-repo')
      
      expect(result.valid).toBe(true)
      expect(result.results).toHaveLength(2)
      expect(result.globalErrors).toHaveLength(0)
    })

    it('should generate configuration report', () => {
      // Mock directory listing
      mockFsSync.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === '/test-repo/apps') {
          return [{ name: 'web', isDirectory: () => true }] as any
        }
        if (dirPath === '/test-repo/packages') {
          return [{ name: 'ui', isDirectory: () => true }] as any
        }
        return []
      })

      const report = generateConfigurationReport('/test-repo')
      
      expect(report).toContain('# Phase.dev Configuration Report')
      expect(report).toContain('## Summary')
      expect(report).toContain('✅ Valid')
      expect(report).toContain('## Apps')
      expect(report).toContain('## Packages')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing root configuration file', () => {
      mockFsSync.existsSync.mockImplementation((filePath) => {
        return filePath !== '/test-repo/.phase-apps.json'
      })

      const result = loadPhaseConfiguration('/test-repo/apps/web')
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('.phase-apps.json not found in root directory')
    })

    it('should handle invalid JSON in configuration file', () => {
      mockFsSync.readFileSync.mockImplementation((filePath) => {
        if (filePath === '/test-repo/.phase-apps.json') {
          return 'invalid json'
        }
        return mockFs[filePath as keyof typeof mockFs] || ''
      })

      const result = loadPhaseConfiguration('/test-repo/apps/web')
      
      expect(result.success).toBe(false)
      expect(result.errors.some(error => error.includes('Failed to parse'))).toBe(true)
    })

    it('should handle missing monorepo root', () => {
      mockFsSync.existsSync.mockImplementation(() => false)

      const result = loadPhaseConfiguration('/some/random/path')
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Could not find monorepo root (no pnpm-workspace.yaml found)')
    })
  })

  describe('Business Rules', () => {
    it('should warn about duplicate phase app names', () => {
      // Mock configuration with duplicates
      mockFsSync.readFileSync.mockImplementation((filePath) => {
        if (filePath === '/test-repo/.phase-apps.json') {
          return JSON.stringify({
            version: '1.0.0',
            apps: {
              web: { phaseAppName: 'AI.C9d.Duplicate' },
              api: { phaseAppName: 'AI.C9d.Duplicate' }
            }
          })
        }
        return mockFs[filePath as keyof typeof mockFs] || ''
      })

      const result = validatePhaseAppsConfig('/test-repo/.phase-apps.json')
      
      expect(result.warnings.some(warning => 
        warning.includes('Duplicate phaseAppName')
      )).toBe(true)
    })

    it('should validate environment values', () => {
      // Mock configuration with invalid environment
      mockFsSync.readFileSync.mockImplementation((filePath) => {
        if (filePath === '/test-repo/.phase-apps.json') {
          return JSON.stringify({
            version: '1.0.0',
            apps: {
              web: { 
                phaseAppName: 'AI.C9d.Web',
                environment: 'invalid-env'
              }
            }
          })
        }
        return mockFs[filePath as keyof typeof mockFs] || ''
      })

      const result = validatePhaseAppsConfig('/test-repo/.phase-apps.json')
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(error => 
        error.includes('environment') && error.includes('development, staging, production')
      )).toBe(true)
    })
  })
})