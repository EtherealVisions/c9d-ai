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
  try {
    // Get configuration using centralized configuration manager
    const supabaseUrl = getConfigWithFallback('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getConfigWithFallback('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    // Validate configuration
    const validation = validateSupabaseConfig(supabaseUrl, supabaseKey);
    
    if (!validation.valid) {
      const nodeEnv = getConfigWithFallback('NODE_ENV') || 'development';
      const isVercel = getConfigWithFallback('VERCEL') === '1';
      
      // During build time, return a mock client to prevent build failures
      if (nodeEnv === 'production' || process.env.NODE_ENV === 'production') {
        console.warn('[Database] Missing or invalid Supabase configuration - using mock client for build:', validation.errors);
        return {
          from: () => ({
            select: () => ({ data: null, error: null }),
            insert: () => ({ data: null, error: null }),
            update: () => ({ data: null, error: null }),
            delete: () => ({ data: null, error: null })
          })
        } as any;
      }
      
      // In development or other environments, throw an error with detailed information
      const errorMessage = `Invalid Supabase configuration:\n${validation.errors.join('\n')}`;
      console.error('[Database] Supabase configuration error:', {
        errors: validation.errors,
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        nodeEnv,
        isVercel,
        configInitialized: isConfigInitialized()
      });
      
      throw new Error(errorMessage);
    }
    
    console.log('[Database] Creating Supabase client with centralized configuration');
    return createClient(supabaseUrl!, supabaseKey!);
    
  } catch (error) {
    console.error('[Database] Failed to create Supabase client:', error);
    
    // Re-throw configuration errors
    if (error instanceof Error && error.message.includes('configuration')) {
      throw error;
    }
    
    // For other errors, provide a more helpful message
    throw new Error(`Failed to initialize database connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  for (const table of DATABASE_TABLES) {
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