/**
 * Drizzle Database Connection
 * 
 * This file provides the Drizzle database client configuration and connection setup.
 * It handles environment-specific configuration and connection pooling.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Import configuration function with error handling
let getAppConfigSync: ((key: string) => string | undefined) | undefined

try {
  const configModule = require('../config/init')
  getAppConfigSync = configModule.getAppConfigSync
} catch (error) {
  console.warn('[Database Connection] Could not load config module, using process.env only:', error)
  getAppConfigSync = undefined
}

/**
 * Get configuration value with fallback to process.env
 */
function getConfigValue(key: string): string | undefined {
  try {
    // Try to get from configuration manager first if available
    if (getAppConfigSync) {
      const configValue = getAppConfigSync(key)
      if (configValue) {
        return configValue
      }
    }
  } catch (error) {
    // Fallback to process.env if config manager fails
    console.warn(`[Database Connection] Failed to get config '${key}', using process.env fallback:`, error)
  }
  
  return process.env[key]
}

/**
 * Get database URL with proper fallback logic
 */
function getDatabaseUrl(): string {
  // First try DATABASE_URL (direct PostgreSQL connection)
  const databaseUrl = getConfigValue('DATABASE_URL')
  if (databaseUrl) {
    return databaseUrl
  }
  
  // Fallback to constructing from Supabase configuration
  const supabaseUrl = getConfigValue('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getConfigValue('SUPABASE_SERVICE_ROLE_KEY')
  
  if (supabaseUrl && serviceRoleKey) {
    // Extract project reference from Supabase URL
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
    return `postgresql://postgres:${serviceRoleKey}@db.${projectRef}.supabase.co:5432/postgres`
  }
  
  throw new Error(
    'Database configuration not found. Please set DATABASE_URL or configure Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)'
  )
}

/**
 * Create PostgreSQL connection with appropriate configuration
 */
function createPostgresConnection() {
  const databaseUrl = getDatabaseUrl()
  const nodeEnv = getConfigValue('NODE_ENV') || 'development'
  
  // Connection configuration based on environment
  const connectionConfig = {
    // Connection pooling
    max: nodeEnv === 'production' ? 20 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    
    // SSL configuration for production
    ssl: nodeEnv === 'production' ? 'require' as const : false,
    
    // Prepared statements for better performance
    prepare: true,
    
    // Transform column names from snake_case to camelCase
    transform: {
      column: {
        from: postgres.fromCamel,
        to: postgres.toCamel,
      },
    },
  }
  
  return postgres(databaseUrl, connectionConfig)
}

/**
 * Global database connection instance
 * Uses singleton pattern to ensure single connection pool
 */
let globalConnection: postgres.Sql | undefined

/**
 * Get or create the database connection
 */
export function getConnection(): postgres.Sql {
  if (!globalConnection) {
    globalConnection = createPostgresConnection()
  }
  return globalConnection
}

/**
 * Create Drizzle database instance with schema
 */
export function createDrizzleDatabase() {
  const connection = getConnection()
  
  return drizzle(connection, {
    schema,
    logger: getConfigValue('NODE_ENV') === 'development',
  })
}

/**
 * Database instance for use throughout the application
 */
export const db = createDrizzleDatabase()

/**
 * Type definition for the database instance
 */
export type DrizzleDatabase = typeof db

/**
 * Close database connection (useful for testing and cleanup)
 */
export async function closeConnection(): Promise<void> {
  if (globalConnection) {
    await globalConnection.end()
    globalConnection = undefined
  }
}