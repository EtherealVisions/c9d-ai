import superjson from 'superjson'

/**
 * Serialize complex objects for passing between server and client components
 * Uses superjson to handle Date, Map, Set, undefined, etc.
 */
export function serialize<T>(data: T): string {
  return superjson.stringify(data)
}

/**
 * Deserialize data received from server components
 */
export function deserialize<T>(serialized: string): T {
  return superjson.parse(serialized)
}

/**
 * Create a serializable version of the environment config
 * This ensures only the necessary data is passed to client components
 */
export function createSerializableEnvConfig(envConfig: any) {
  return {
    nodeEnv: envConfig.nodeEnv,
    isDevelopment: envConfig.isDevelopment,
    isProduction: envConfig.isProduction,
    isTest: envConfig.isTest,
    isStaging: envConfig.isStaging,
    totalVariables: envConfig.totalVariables,
    phaseStatus: {
      success: envConfig.phaseStatus?.success || false,
      tokenSource: envConfig.phaseStatus?.tokenSource?.source || null,
      variableCount: envConfig.phaseStatus?.variableCount || 0,
    },
    // Only include primitive values that are safe to serialize
    variables: Object.keys(envConfig.variables || {}).reduce((acc, key) => {
      const value = envConfig.variables[key]
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        acc[key] = value
      }
      return acc
    }, {} as Record<string, string | number | boolean>)
  }
}

/**
 * Type-safe wrapper for passing data through Next.js boundaries
 */
export function createServerData<T>(data: T): { __serialized: string; __type: 'server-data' } {
  return {
    __serialized: serialize(data),
    __type: 'server-data'
  }
}

/**
 * Type-safe wrapper for receiving data in client components
 */
export function parseServerData<T>(data: { __serialized: string; __type: 'server-data' }): T {
  if (data.__type !== 'server-data') {
    throw new Error('Invalid server data format')
  }
  return deserialize<T>(data.__serialized)
}

