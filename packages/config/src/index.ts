// Edge Runtime and Build-Safe Configuration Package
// This package is designed to work in all environments: Node.js, Edge Runtime, and build time

// Always safe exports
export * from './types'
export * from './app-config'

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

export const EnvironmentFallbackManager = {
  loadWithFallback: async (options?: any) => ({
    success: false,
    error: 'Environment fallback not available in Edge Runtime/Build environment'
  }),
  loadLocalEnvironment: async (environment?: string, rootPath?: string) => ({
    success: false,
    variables: {},
    loadedFiles: []
  })
}