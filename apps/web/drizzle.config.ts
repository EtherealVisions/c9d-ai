/**
 * Drizzle Kit Configuration
 * 
 * This file configures Drizzle Kit for database migrations, introspection,
 * and development tools like Drizzle Studio.
 */

import { defineConfig } from 'drizzle-kit'

// Import configuration function with error handling
let getAppConfigSync: ((key: string) => string | undefined) | undefined

try {
  const configModule = require('./lib/config/init')
  getAppConfigSync = configModule.getAppConfigSync
} catch (error) {
  console.warn('[Drizzle Config] Could not load config module, using process.env only:', error)
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
    console.warn(`[Drizzle Config] Failed to get config '${key}', using process.env fallback:`, error)
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

export default defineConfig({
  // Database connection
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  
  // Schema configuration
  schema: './lib/db/schema/*',
  out: './lib/db/migrations',
  
  // Migration configuration
  migrations: {
    table: 'drizzle_migrations',
    schema: 'public',
  },
  
  // Introspection configuration
  introspect: {
    casing: 'camel',
  },
  
  // Development tools
  verbose: true,
  strict: true,
  
  // Drizzle Studio configuration
  studio: {
    port: 4983,
    host: '127.0.0.1',
  },
})