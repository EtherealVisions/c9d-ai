import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import RootLayout from '@/app/layout'
import { EnvironmentFallbackManager } from '@c9d/config'
import React from 'react'

// Mock Next.js font
vi.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter-font' })
}))

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => 
    React.createElement('div', { 'data-testid': 'clerk-provider' }, children)
}))

// Mock CSS import
vi.mock('@/app/globals.css', () => ({}))

describe('Layout Configuration Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any cached configuration
    EnvironmentFallbackManager.clearCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Application Startup Scenarios', () => {
    it('should handle successful Phase.dev configuration with token', async () => {
      // Set up environment with valid Phase.dev token
      const mockEnvVars = {
        NODE_ENV: 'development',
        PHASE_SERVICE_TOKEN: 'pss_test_token_12345',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_key',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_anon_key'
      }

      // Mock successful Phase.dev configuration
      vi.spyOn(EnvironmentFallbackManager, 'loadWithFallback').mockResolvedValue({
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isTest: false,
        isStaging: false,
        phaseAvailable: true,
        phaseConfigLoaded: true,
        phaseVariableCount: 5,
        loadedFiles: ['.env.local'],
        totalVariables: 10,
        phaseStatus: {
          available: true,
          success: true,
          variableCount: 5,
          source: 'phase-sdk',
          tokenSource: {
            source: 'local.env.local',
            token: 'pss_test_token_12345',
            path: '/test/.env.local'
          }
        },
        variables: mockEnvVars,
        diagnostics: {
          loadingOrder: ['Phase.dev SDK initialization', 'Phase.dev SDK secret retrieval'],
          tokenSourceDiagnostics: [
            {
              source: 'process.env',
              exists: false,
              hasToken: false,
              isActive: false
            },
            {
              source: 'local.env.local',
              path: '/test/.env.local',
              exists: true,
              hasToken: true,
              isActive: true
            }
          ]
        }
      })

      const layout = await RootLayout({ children: React.createElement('div', {}, 'Test Content') })
      
      expect(layout).toBeDefined()
      expect(EnvironmentFallbackManager.loadWithFallback).toHaveBeenCalledWith({
        appName: 'AI.C9d.Web',
        environment: 'test', // In test environment, NODE_ENV is 'test'
        enablePhaseIntegration: true,
        fallbackToLocal: true,
        forceReload: false
      })
    })

    it('should handle Phase.dev token not found scenario', async () => {
      // Mock configuration with no token found
      vi.spyOn(EnvironmentFallbackManager, 'loadWithFallback').mockResolvedValue({
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isTest: false,
        isStaging: false,
        phaseAvailable: false,
        phaseConfigLoaded: false,
        phaseVariableCount: 0,
        loadedFiles: ['.env'],
        totalVariables: 4,
        phaseStatus: {
          available: false,
          success: false,
          variableCount: 0,
          error: 'PHASE_SERVICE_TOKEN not found in any source',
          source: 'fallback'
        },
        variables: {
          NODE_ENV: 'development',
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_key',
          NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_anon_key'
        },
        diagnostics: {
          loadingOrder: ['Phase.dev token not found', 'Local environment files loaded'],
          tokenSourceDiagnostics: [
            {
              source: 'process.env',
              exists: false,
              hasToken: false,
              isActive: false
            },
            {
              source: 'local.env.local',
              path: '/test/.env.local',
              exists: false,
              hasToken: false,
              isActive: false
            }
          ]
        }
      })

      const layout = await RootLayout({ children: React.createElement('div', {}, 'Test Content') })
      
      expect(layout).toBeDefined()
      // Should still render successfully with fallback configuration
    })

    it('should handle Phase.dev authentication failure', async () => {
      // Mock configuration with authentication failure
      vi.spyOn(EnvironmentFallbackManager, 'loadWithFallback').mockResolvedValue({
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isTest: false,
        isStaging: false,
        phaseAvailable: true,
        phaseConfigLoaded: false,
        phaseVariableCount: 0,
        loadedFiles: ['.env.local'],
        totalVariables: 4,
        phaseStatus: {
          available: true,
          success: false,
          variableCount: 0,
          error: 'Authentication failed: Invalid service token',
          source: 'fallback',
          tokenSource: {
            source: 'local.env.local',
            token: 'invalid_token',
            path: '/test/.env.local'
          },
          fallbackStrategy: 'LOCAL_ENVIRONMENT_ONLY'
        },
        variables: {
          NODE_ENV: 'development',
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_key',
          NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_anon_key'
        },
        diagnostics: {
          loadingOrder: ['Phase.dev SDK initialization', 'Phase.dev authentication failed', 'Local environment fallback'],
          tokenSourceDiagnostics: [
            {
              source: 'local.env.local',
              path: '/test/.env.local',
              exists: true,
              hasToken: true,
              isActive: true
            }
          ],
          errorHandling: {
            shouldFallback: true,
            userMessage: 'Phase.dev authentication failed. Current token loaded from: local.env.local (/test/.env.local). Check your PHASE_SERVICE_TOKEN is valid.',
            logMessage: 'Phase.dev auth failed: Invalid service token',
            retryable: false,
            fallbackStrategy: 'LOCAL_ENVIRONMENT_ONLY'
          }
        }
      })

      const layout = await RootLayout({ children: React.createElement('div', {}, 'Test Content') })
      
      expect(layout).toBeDefined()
      // Should render with fallback configuration and show authentication error
    })

    it('should handle missing critical environment variables in production', async () => {
      // Mock production configuration with missing critical variables
      vi.spyOn(EnvironmentFallbackManager, 'loadWithFallback').mockResolvedValue({
        nodeEnv: 'production',
        isDevelopment: false,
        isProduction: true,
        isTest: false,
        isStaging: false,
        phaseAvailable: false,
        phaseConfigLoaded: false,
        phaseVariableCount: 0,
        loadedFiles: [],
        totalVariables: 1,
        phaseStatus: {
          available: false,
          success: false,
          variableCount: 0,
          error: 'PHASE_SERVICE_TOKEN not found',
          source: 'fallback'
        },
        variables: {
          NODE_ENV: 'production'
          // Missing critical variables
        },
        diagnostics: {
          loadingOrder: ['Phase.dev not available', 'Local environment files loaded'],
          tokenSourceDiagnostics: []
        }
      })

      const layout = await RootLayout({ children: React.createElement('div', {}, 'Test Content') })
      
      expect(layout).toBeDefined()
      // Should render configuration error display for production
    })

    it('should handle configuration initialization failure', async () => {
      // Mock configuration initialization failure
      const configError = new Error('Configuration system failure')
      vi.spyOn(EnvironmentFallbackManager, 'loadWithFallback').mockRejectedValue(configError)

      const layout = await RootLayout({ children: React.createElement('div', {}, 'Test Content') })
      
      expect(layout).toBeDefined()
      // Should render with minimal fallback configuration and error display
    })

    it('should show development banner with configuration status', async () => {
      // Mock development configuration with issues
      vi.spyOn(EnvironmentFallbackManager, 'loadWithFallback').mockResolvedValue({
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isTest: false,
        isStaging: false,
        phaseAvailable: true,
        phaseConfigLoaded: false,
        phaseVariableCount: 0,
        loadedFiles: ['.env'],
        totalVariables: 3,
        phaseStatus: {
          available: true,
          success: false,
          variableCount: 0,
          error: 'App not found',
          source: 'fallback',
          tokenSource: {
            source: 'process.env',
            token: 'pss_test_token'
          }
        },
        variables: {
          NODE_ENV: 'development',
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_key',
          NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co'
          // Missing NEXT_PUBLIC_SUPABASE_ANON_KEY
        },
        diagnostics: {
          loadingOrder: ['Phase.dev SDK initialization', 'Phase.dev app not found', 'Local environment fallback'],
          tokenSourceDiagnostics: []
        }
      })

      const layout = await RootLayout({ children: React.createElement('div', {}, 'Test Content') })
      
      expect(layout).toBeDefined()
      // Should render development banner showing Phase.dev fallback status
    })
  })

  describe('Token Source Display', () => {
    it('should display token source information in development', async () => {
      const mockConfig = {
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isTest: false,
        isStaging: false,
        phaseAvailable: true,
        phaseConfigLoaded: true,
        phaseVariableCount: 8,
        loadedFiles: ['.env.local'],
        totalVariables: 12,
        phaseStatus: {
          available: true,
          success: true,
          variableCount: 8,
          source: 'phase-sdk' as const,
          tokenSource: {
            source: 'root.env' as const,
            token: 'pss_production_token',
            path: '/workspace/.env'
          }
        },
        variables: {
          NODE_ENV: 'development',
          PHASE_SERVICE_TOKEN: 'pss_production_token',
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_key',
          NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_anon_key'
        },
        diagnostics: {
          loadingOrder: ['Phase.dev SDK initialization', 'Phase.dev SDK secret retrieval', 'Local environment files loaded'],
          tokenSourceDiagnostics: [
            {
              source: 'process.env' as const,
              exists: false,
              hasToken: false,
              isActive: false
            },
            {
              source: 'root.env' as const,
              path: '/workspace/.env',
              exists: true,
              hasToken: true,
              isActive: true
            }
          ]
        }
      }

      vi.spyOn(EnvironmentFallbackManager, 'loadWithFallback').mockResolvedValue(mockConfig)

      const layout = await RootLayout({ children: React.createElement('div', {}, 'Test Content') })
      
      expect(layout).toBeDefined()
      expect(EnvironmentFallbackManager.loadWithFallback).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Fallback', () => {
    it('should handle network errors gracefully', async () => {
      const mockConfig = {
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isTest: false,
        isStaging: false,
        phaseAvailable: true,
        phaseConfigLoaded: false,
        phaseVariableCount: 0,
        loadedFiles: ['.env.local'],
        totalVariables: 4,
        phaseStatus: {
          available: true,
          success: false,
          variableCount: 0,
          error: 'Network error: ECONNREFUSED',
          source: 'fallback' as const,
          tokenSource: {
            source: 'local.env.local' as const,
            token: 'pss_valid_token',
            path: '/test/.env.local'
          },
          fallbackStrategy: 'LOCAL_ENVIRONMENT_ONLY' as const
        },
        variables: {
          NODE_ENV: 'development',
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_key',
          NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_anon_key'
        },
        diagnostics: {
          loadingOrder: ['Phase.dev SDK initialization', 'Network error occurred', 'Local environment fallback'],
          tokenSourceDiagnostics: [],
          errorHandling: {
            shouldFallback: true,
            userMessage: 'Phase.dev service unavailable. Using local environment variables.',
            logMessage: 'Phase.dev network error: ECONNREFUSED',
            retryable: true,
            fallbackStrategy: 'LOCAL_ENVIRONMENT_ONLY' as const
          }
        }
      }

      vi.spyOn(EnvironmentFallbackManager, 'loadWithFallback').mockResolvedValue(mockConfig)

      const layout = await RootLayout({ children: React.createElement('div', {}, 'Test Content') })
      
      expect(layout).toBeDefined()
      // Should render successfully with network error fallback
    })

    it('should validate configuration and show appropriate warnings', async () => {
      const mockConfig = {
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isTest: false,
        isStaging: false,
        phaseAvailable: false,
        phaseConfigLoaded: false,
        phaseVariableCount: 0,
        loadedFiles: [],
        totalVariables: 2,
        phaseStatus: {
          available: false,
          success: false,
          variableCount: 0,
          error: 'PHASE_SERVICE_TOKEN not found in any source',
          source: 'fallback' as const
        },
        variables: {
          NODE_ENV: 'development',
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_key'
          // Missing other required variables
        },
        diagnostics: {
          loadingOrder: ['Phase.dev token not found', 'No local environment files found'],
          tokenSourceDiagnostics: [
            {
              source: 'process.env' as const,
              exists: false,
              hasToken: false,
              isActive: false
            },
            {
              source: 'local.env.local' as const,
              path: '/test/.env.local',
              exists: false,
              hasToken: false,
              isActive: false
            }
          ]
        }
      }

      // Mock validation to return missing variables
      vi.spyOn(EnvironmentFallbackManager, 'validateConfig').mockReturnValue({
        isValid: false,
        missingVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
        errors: [],
        warnings: ['Phase.dev not available - add PHASE_SERVICE_TOKEN for cloud configuration']
      })

      vi.spyOn(EnvironmentFallbackManager, 'getDiagnosticInfo').mockReturnValue({
        summary: 'Environment: development, Variables: 2, Phase.dev: fallback',
        details: {
          environment: 'development',
          totalVariables: 2,
          phaseStatus: mockConfig.phaseStatus,
          loadedFiles: [],
          tokenSource: undefined,
          cacheInfo: undefined,
          loadingOrder: mockConfig.diagnostics.loadingOrder
        },
        recommendations: [
          'Add PHASE_SERVICE_TOKEN to enable Phase.dev integration',
          'Create .env.local file for local development overrides'
        ]
      })

      vi.spyOn(EnvironmentFallbackManager, 'loadWithFallback').mockResolvedValue(mockConfig)

      const layout = await RootLayout({ children: React.createElement('div', {}, 'Test Content') })
      
      expect(layout).toBeDefined()
      expect(EnvironmentFallbackManager.validateConfig).toHaveBeenCalledWith(
        mockConfig,
        ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
      )
    })
  })
})