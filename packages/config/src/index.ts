// Configuration utilities exports with build-time safety
// Always export types and app config - they're safe for all environments
export * from './types'
export * from './constants'
export * from './app-config'

// Detect build environment to avoid Node.js API usage during build
const isBuildTime = typeof process !== 'undefined' && (
  process.env.NODE_ENV === 'production' && (
    process.env.VERCEL === '1' ||
    process.env.CI === '1' ||
    process.env.NEXT_PHASE === 'phase-production-build'
  )
)

const isEdgeRuntime = typeof (globalThis as any).EdgeRuntime !== 'undefined'

// Build-time and Edge Runtime stubs
export const loadFromPhase = async (): Promise<{ success: boolean; error?: string; variables?: Record<string, string>; source?: string }> => {
  if (isEdgeRuntime) {
    return { success: false, error: 'Phase.dev not available in Edge Runtime' }
  }
  if (isBuildTime) {
    return { success: false, error: 'Phase.dev not available during build' }
  }

  // Runtime - try to load the actual module
  try {
    const { loadFromPhase: actualLoadFromPhase } = await import('./phase')
    return actualLoadFromPhase()
  } catch (error) {
    return { success: false, error: 'Failed to load Phase.dev modules' }
  }
}

export const loadEnvironmentVariables = () => {
  if (isEdgeRuntime || isBuildTime) {
    return { success: false, error: 'Environment loading not available in build/edge runtime' }
  }

  try {
    const { loadEnvironmentVariables: actualLoad } = require('./env')
    return actualLoad()
  } catch (error) {
    return { success: false, error: 'Failed to load environment variables' }
  }
}

export const PhaseTokenLoader = {
  loadServiceToken: async () => {
    if (isEdgeRuntime || isBuildTime) {
      return null
    }

    try {
      const { PhaseTokenLoader: actualLoader } = await import('./phase-token-loader')
      return actualLoader.loadServiceToken()
    } catch (error) {
      return null
    }
  }
}

export const PhaseSDKClient = class {
  async getSecrets() {
    if (isEdgeRuntime || isBuildTime) {
      return []
    }

    try {
      const { PhaseSDKClient: ActualClient } = await import('./phase-sdk-client')
      const client = new ActualClient()
      return client.getSecrets()
    } catch (error) {
      return []
    }
  }
}

export const PhaseSDKCache = {
  get: (key: string) => {
    if (isEdgeRuntime || isBuildTime) {
      return null
    }

    try {
      const { PhaseSDKCache: actualCache } = require('./phase-sdk-cache')
      return actualCache.get(key)
    } catch (error) {
      return null
    }
  },
  set: (key: string, value: any) => {
    if (isEdgeRuntime || isBuildTime) {
      return
    }

    try {
      const { PhaseSDKCache: actualCache } = require('./phase-sdk-cache')
      return actualCache.set(key, value)
    } catch (error) {
      return
    }
  },
  clear: () => {
    if (isEdgeRuntime || isBuildTime) {
      return
    }

    try {
      const { PhaseSDKCache: actualCache } = require('./phase-sdk-cache')
      return actualCache.clear()
    } catch (error) {
      return
    }
  }
}

export const EnvironmentFallbackManager = {
  loadWithFallback: async (options?: any) => {
    if (isEdgeRuntime) {
      return { success: false, error: 'Environment fallback not available in Edge Runtime' }
    }
    if (isBuildTime) {
      return { success: false, error: 'Environment fallback not available during build' }
    }

    try {
      const { EnvironmentFallbackManager: actualManager } = await import('./environment-fallback-manager')
      return actualManager.loadWithFallback(options)
    } catch (error) {
      return { success: false, error: 'Failed to load environment fallback manager' }
    }
  },
  loadLocalEnvironment: async (environment?: string, rootPath?: string) => {
    if (isEdgeRuntime || isBuildTime) {
      return { success: false, variables: {}, loadedFiles: [] }
    }

    try {
      const { EnvironmentFallbackManager: actualManager } = await import('./environment-fallback-manager')
      return actualManager.loadLocalEnvironment(environment, rootPath)
    } catch (error) {
      return { success: false, variables: {}, loadedFiles: [] }
    }
  }
}

// Conditional exports for runtime-only modules
if (!isEdgeRuntime && !isBuildTime) {
  // Only export these at runtime
  try {
    // Warn about Vercel CI build environment
    if (process.env.VERCEL === '1' && process.env.CI === '1') {
      console.warn(
        '[Config] Detected Vercel CI build environment (VERCEL=1, CI=1). ' +
        'Configuration loading may be limited during build. ' +
        'Consider using direct process.env access for build-time configuration.'
      )
    }
  } catch (error) {
    // Ignore errors during conditional export
  }
}