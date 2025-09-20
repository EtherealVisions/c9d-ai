/**
 * Legacy database utilities - use lib/models for new code
 * This file is kept for backward compatibility with existing code
 */

import { createClient } from '@supabase/supabase-js'
import { getAppConfigSync, isConfigInitialized } from './config/init'
import { getConfigManager } from './config/manager'

// Re-export types from the new models for backward compatibility
export type {
  UserRow as User,
  OrganizationRow as Organization,
  MembershipRow as OrganizationMembership,
  RoleRow as Role,
  PermissionRow as Permission,
  InvitationRow as Invitation,
  AuditLogRow as AuditLog,
  DatabaseTable
} from './models'

export { DATABASE_TABLES } from './models/types'

/**
 * Get configuration value with comprehensive fallback logic
 */
function getConfigWithFallback(key: string): string | undefined {
  try {
    // First try the configuration manager if initialized
    if (isConfigInitialized()) {
      const configManager = getConfigManager();
      const value = configManager.get(key);
      if (value) {
        return value;
      }
    }
    
    // Fallback to sync config access
    const syncValue = getAppConfigSync(key);
    if (syncValue) {
      return syncValue;
    }
    
    // Final fallback to process.env
    return process.env[key];
    
  } catch (error) {
    console.warn(`[Database] Failed to get config '${key}', using process.env fallback:`, error);
    return process.env[key];
  }
}

/**
 * Validate Supabase configuration
 */
function validateSupabaseConfig(url?: string, key?: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  } else if (!url.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL');
  }
  
  if (!key) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  } else if (key.length < 50) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid (too short)');
  }
  
  return { valid: errors.length === 0, errors };
}

// Create Supabase client with centralized configuration
export function createSupabaseClient() {
  // Build-time detection
  const isBuildTime = typeof process !== 'undefined' && (
    process.env.NEXT_PHASE === 'phase-production-build' || 
    (process.env.VERCEL === '1' && process.env.CI === '1')
  )
  
  // Return mock client immediately during build
  if (isBuildTime) {
    console.warn('[Database] Build-time detected - using mock client');
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Build-time mock' } })
          }),
          limit: () => Promise.resolve({ data: [], error: null })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Build-time mock' } })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'Build-time mock' } })
            })
          })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: null })
        })
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null })
      },
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ data: null, error: { message: 'Build-time mock' } }),
          download: () => Promise.resolve({ data: null, error: { message: 'Build-time mock' } })
        })
      }
    } as any;
  }

  try {
    // Get configuration using centralized configuration manager
    const supabaseUrl = getConfigWithFallback('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getConfigWithFallback('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    // Validate configuration
    const validation = validateSupabaseConfig(supabaseUrl, supabaseKey);
    
    if (!validation.valid) {
      const nodeEnv = getConfigWithFallback('NODE_ENV') || 'development';
      const isVercel = getConfigWithFallback('VERCEL') === '1';
      
      // During build time or invalid config, return a mock client to prevent build failures
      console.warn('[Database] Missing or invalid Supabase configuration - using mock client:', validation.errors);
      return {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'Mock client' } })
            }),
            limit: () => Promise.resolve({ data: [], error: null })
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'Mock client' } })
            })
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'Mock client' } })
              })
            })
          }),
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null })
          })
        }),
        auth: {
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          signOut: () => Promise.resolve({ error: null })
        },
        storage: {
          from: () => ({
            upload: () => Promise.resolve({ data: null, error: { message: 'Mock client' } }),
            download: () => Promise.resolve({ data: null, error: { message: 'Mock client' } })
          })
        }
      } as any;
    }
    
    console.log('[Database] Creating Supabase client with centralized configuration');
    return createClient(supabaseUrl!, supabaseKey!);
    
  } catch (error) {
    console.error('[Database] Failed to create Supabase client:', error);
    
    // Return mock client on any error during build
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Error fallback mock' } })
          }),
          limit: () => Promise.resolve({ data: [], error: null })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Error fallback mock' } })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'Error fallback mock' } })
            })
          })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: null })
        })
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null })
      },
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ data: null, error: { message: 'Error fallback mock' } }),
          download: () => Promise.resolve({ data: null, error: { message: 'Error fallback mock' } })
        })
      }
    } as any;
  }
}

// Utility function to validate database schema
export async function validateDatabaseSchema() {
  const supabase = createSupabaseClient()
  
  const results = {
    tables: {} as Record<string, boolean>,
    permissions: false,
    systemRoles: false
  }
  
  // Check if all required tables exist
  const tables = ['users', 'organizations', 'organization_memberships', 'roles', 'permissions', 'invitations', 'audit_logs'] as const
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1)
      results.tables[table] = !error
    } catch (err) {
      results.tables[table] = false
    }
  }
  
  // Check if system permissions exist
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('name')
      .in('name', ['admin', 'user.read', 'organization.read'])
    
    results.permissions = !error && data && data.length >= 3
  } catch (err) {
    results.permissions = false
  }
  
  // Check if system roles exist
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('name')
      .eq('is_system_role', true)
      .in('name', ['Admin', 'Member', 'Viewer'])
    
    results.systemRoles = !error && data && data.length >= 3
  } catch (err) {
    results.systemRoles = false
  }
  
  return results
}