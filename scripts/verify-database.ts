#!/usr/bin/env tsx

/**
 * Database verification script
 * This script validates that the database schema is properly set up
 * with all required tables, RLS policies, and seed data.
 */

import { getDatabase } from '../apps/web/lib/db/connection'
import { DATABASE_TABLES } from '../apps/web/lib/models/types'

async function main() {
  console.log('🔍 Verifying database schema...\n')
  
  try {
    const results = await validateDatabaseSchema()
    
    // Check tables
    console.log('📋 Table Status:')
    let allTablesExist = true
    for (const table of DATABASE_TABLES) {
      const status = results.tables[table] ? '✅' : '❌'
      console.log(`  ${status} ${table}`)
      if (!results.tables[table]) allTablesExist = false
    }
    
    // Check permissions
    console.log('\n🔐 Permissions Status:')
    const permissionsStatus = results.permissions ? '✅' : '❌'
    console.log(`  ${permissionsStatus} System permissions seeded`)
    
    // Check system roles
    console.log('\n👥 System Roles Status:')
    const rolesStatus = results.systemRoles ? '✅' : '❌'
    console.log(`  ${rolesStatus} System roles created`)
    
    // Overall status
    const allValid = allTablesExist && results.permissions && results.systemRoles
    console.log('\n📊 Overall Status:')
    console.log(`  ${allValid ? '✅' : '❌'} Database schema ${allValid ? 'valid' : 'invalid'}`)
    
    if (!allValid) {
      console.log('\n⚠️  Some components are missing. Please run the migrations:')
      console.log('   supabase migration up')
      process.exit(1)
    } else {
      console.log('\n🎉 Database schema is properly configured!')
    }
    
  } catch (error) {
    console.error('❌ Error validating database schema:', error)
    console.log('\n💡 Make sure your Supabase environment variables are set:')
    console.log('   NEXT_PUBLIC_SUPABASE_URL')
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}