// Edge Runtime and Build-Safe Configuration Package
// This package is designed to work in all environments: Node.js, Edge Runtime, and build time

// Always safe exports
export * from './types'
export * from './app-config'

// Check if we're in a Node.js environment
const isNodeEnvironment = typeof process !== 'undefined' && 
  process.versions && 
  process.versions.node &&
  typeof window === 'undefined'

// Build-safe stubs for Phase.dev functionality
export const loadFromPhase = async (): Promise<{ 
  success: boolean; 
  error?: string; 
  variables?: Record<string, string>; 
  source?: string 
}> => {
  return { 
    success: false, 
    error: 'Phase.dev functionality not available in Edge Runtime/Build environment',
    source: 'stub'
  }
}

export const loadEnvironmentVariables = () => {
  return { 
    success: false, 
    error: 'Environment loading not available in Edge Runtime/Build environment' 
  }
}

export const PhaseTokenLoader = {
  loadServiceToken: async () => null
}

export class PhaseSDKClient {
  async getSecrets() {
    return []
  }
}

export const PhaseSDKCache = {
  get: (key: string) => null,
  set: (key: string, value: any) => undefined,
  clear: () => undefined
}

// Conditionally export real implementation or stubs based on environment
let EnvironmentFallbackManager: any;

if (isNodeEnvironment) {
  // In Node.js, use the real implementation
  try {
    const { EnvironmentFallbackManager: RealManager } = require('./environment-fallback-manager');
    EnvironmentFallbackManager = RealManager;
  } catch (e) {
    console.warn('Failed to load real EnvironmentFallbackManager:', e);
    // Fall back to stub if loading fails
    EnvironmentFallbackManager = {
      loadWithFallback: async (options?: any) => ({
        success: false,
        error: 'Failed to load real EnvironmentFallbackManager',
        variables: process.env || {},
        source: 'fallback-stub',
        nodeEnv: process.env.NODE_ENV || 'production',
        isDevelopment: false,
        isProduction: true,
        isTest: false,
        isStaging: false,
        totalVariables: Object.keys(process.env || {}).length,
        loadedFiles: [],
        phaseAvailable: false,
        phaseConfigLoaded: false,
        phaseVariableCount: 0,
        phaseStatus: {
          available: false,
          success: false,
          variableCount: 0,
          error: 'Failed to load real implementation',
          source: 'fallback'
        },
        diagnostics: {
          loadingOrder: ['fallback-stub'],
          tokenSourceDiagnostics: []
        }
      }),
      loadLocalEnvironment: async (environment?: string, rootPath?: string) => ({
        variables: {},
        loadedFiles: [],
        errors: []
      }),
      validateConfig: (config?: any, requiredVars?: string[]) => ({
        isValid: true,
        missingVars: [],
        errors: [],
        warnings: []
      }),
      createTestConfig: (variables: Record<string, string> = {}, options: any = {}) => ({
        nodeEnv: variables.NODE_ENV || 'test',
        isDevelopment: variables.NODE_ENV === 'development',
        isProduction: variables.NODE_ENV === 'production',
        isTest: variables.NODE_ENV === 'test',
        isStaging: variables.NODE_ENV === 'staging',
        phaseAvailable: false,
        phaseConfigLoaded: false,
        phaseVariableCount: 0,
        loadedFiles: [],
        totalVariables: Object.keys(variables).length,
        phaseStatus: {
          available: false,
          success: false,
          variableCount: 0,
          source: 'fallback'
        },
        variables,
        diagnostics: {
          loadingOrder: ['test-config'],
          tokenSourceDiagnostics: []
        },
        ...options
      }),
      getDiagnosticInfo: (config?: any) => ({
        summary: 'Fallback stub',
        details: {},
        recommendations: []
      })
    };
  }
} else {
  // In Edge Runtime or browser, use stubs
  EnvironmentFallbackManager = {
    loadWithFallback: async (options?: any) => ({
      success: false,
      error: 'Environment fallback not available in Edge Runtime/Build environment',
      variables: process.env || {},
      source: 'edge-stub',
      nodeEnv: process.env.NODE_ENV || 'production',
      isDevelopment: false,
      isProduction: true,
      isTest: false,
      isStaging: false,
      totalVariables: Object.keys(process.env || {}).length,
      loadedFiles: [],
      phaseAvailable: false,
      phaseConfigLoaded: false,
      phaseVariableCount: 0,
      phaseStatus: {
        available: false,
        success: false,
        variableCount: 0,
        error: 'Edge Runtime stub',
        source: 'fallback'
      },
      diagnostics: {
        loadingOrder: ['edge-stub'],
        tokenSourceDiagnostics: []
      }
    }),
    loadLocalEnvironment: async (environment?: string, rootPath?: string) => ({
      variables: {},
      loadedFiles: [],
      errors: []
    }),
    validateConfig: (config?: any, requiredVars?: string[]) => ({
      isValid: true,
      missingVars: [],
      errors: [],
      warnings: []
    }),
    createTestConfig: (variables: Record<string, string> = {}, options: any = {}) => ({
      nodeEnv: variables.NODE_ENV || 'test',
      isDevelopment: variables.NODE_ENV === 'development',
      isProduction: variables.NODE_ENV === 'production',
      isTest: variables.NODE_ENV === 'test',
      isStaging: variables.NODE_ENV === 'staging',
      phaseAvailable: false,
      phaseConfigLoaded: false,
      phaseVariableCount: 0,
      loadedFiles: [],
      totalVariables: Object.keys(variables).length,
      phaseStatus: {
        available: false,
        success: false,
        variableCount: 0,
        source: 'fallback'
      },
      variables,
      diagnostics: {
        loadingOrder: ['test-config'],
        tokenSourceDiagnostics: []
      },
      ...options
    }),
    getDiagnosticInfo: (config?: any) => ({
      summary: 'Edge Runtime stub',
      details: {},
      recommendations: []
    })
  };
}

export { EnvironmentFallbackManager };