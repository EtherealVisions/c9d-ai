/**
 * Legacy database utilities - use lib/models for new code
 * This file is kept for backward compatibility with existing code
 */

import { createClient } from '@supabase/supabase-js'
import { getAppConfigSync } from './config/init'

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

export { DATABASE_TABLES } from './models'

// Create Supabase client (will need environment variables)
export function createSupabaseClient() {
  // Try to get configuration from the configuration manager first, fallback to process.env
  const supabaseUrl = getAppConfigSync('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = getAppConfigSync('NEXT_PUBLIC_SUPABASE_ANON_KEY') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    // During build time, return a mock client to prevent build failures
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      console.warn('Missing Supabase environment variables - using mock client for build')
      return {} as any
    }
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseKey)
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