/**
 * Database Client Module
 * 
 * This module provides the Supabase client for database operations.
 * Created to resolve module resolution issues in tests and build environments.
 */

import { createClient } from '@supabase/supabase-js'

// Build-time detection
const isBuildTime = typeof process !== 'undefined' && (
  process.env.NODE_ENV === 'production' && (
    process.env.VERCEL === '1' || 
    process.env.CI === '1'
  )
)

// Get configuration with validation
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const nodeEnv = process.env.NODE_ENV
  const isVercel = process.env.VERCEL === '1'

  // Validation errors
  const errors: string[] = []
  
  if (!supabaseUrl) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  } else if (!supabaseUrl.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL')
  }
  
  if (!supabaseAnonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    nodeEnv,
    isVercel,
    errors,
    isValid: errors.length === 0
  }
}

// Mock client for build/test environments
function createMockSupabaseClient() {
  console.warn('[Database] Using mock Supabase client - configuration invalid or build environment')
  
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
  } as any
}

export function createSupabaseClient() {
  const config = getSupabaseConfig()
  
  // Log configuration status
  if (config.isVercel) {
    console.log('[Database] Detected Vercel environment')
  }
  
  if (!config.isValid) {
    console.warn('[Database] Missing or invalid Supabase configuration - using mock client for build:', config.errors)
    return createMockSupabaseClient()
  }

  try {
    console.log('[Database] Creating Supabase client with valid configuration')
    return createClient(config.supabaseUrl!, config.supabaseAnonKey!)
  } catch (error) {
    console.error('[Database] Failed to create Supabase client:', error)
    return createMockSupabaseClient()
  }
}

export default createSupabaseClient