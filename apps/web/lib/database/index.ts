/**
 * Database Client Module
 * 
 * This module provides the Supabase client for database operations.
 * Created to resolve module resolution issues in tests.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

export default createSupabaseClient