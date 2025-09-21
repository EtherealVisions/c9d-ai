#!/usr/bin/env tsx
/**
 * Database Migration CLI
 * 
 * This script provides command-line interface for managing database migrations.
 * Usage: tsx scripts/migrate.ts [command] [options]
 */

import { join } from 'path'
import { 
  getMigrationStatus, 
  runPendingMigrations, 
  validateMigrations,
  rollbackMigration,
  loadMigrationFiles
} from '../lib/db/migrations/migration-utils'

const MIGRATIONS_DIR = join(__dirname, '../lib/db/migrations')

/**
 * Display help information
 */
function showHelp() {
  console.log(`
Database Migration CLI

Usage: tsx scripts/migrate.ts [command] [options]

Commands:
  status      Show migration status
  up          Run all pending migrations
  down [id]   Rollback a specific migration
  validate    Validate migration integrity
  help        Show this help message

Examples:
  tsx scripts/migrate.ts status
  tsx scripts/migrate.ts up
  tsx scripts/migrate.ts down 0001
  tsx scripts/migrate.ts validate
`)
}

/**
 * Show migration status
 */
async function showStatus() {
  try {
    console.log('📊 Checking migration status...\n')
    
    const status = await getMigrationStatus(MIGRATIONS_DIR)
    
    console.log(`Total migrations: ${status.total}`)
    console.log(`Applied: ${status.applied.length}`)
    console.log(`Pending: ${status.pending.length}`)
    console.log(`Failed: ${status.failed.length}\n`)
    
    if (status.applied.length > 0) {
      console.log('✅ Applied migrations:')
      status.applied.forEach(m => {
        console.log(`  ${m.id}: ${m.name} (${m.executedAt.toISOString()})`)
      })
      console.log()
    }
    
    if (status.pending.length > 0) {
      console.log('⏳ Pending migrations:')
      status.pending.forEach(m => {
        console.log(`  ${m.id}: ${m.name}`)
      })
      console.log()
    }
    
    if (status.failed.length > 0) {
      console.log('❌ Failed migrations:')
      status.failed.forEach(m => {
        console.log(`  ${m.id}: ${m.name} - ${m.errorMessage}`)
      })
      console.log()
    }
    
  } catch (error) {
    console.error('❌ Failed to get migration status:', error)
    process.exit(1)
  }
}

/**
 * Run pending migrations
 */
async function runMigrations() {
  try {
    console.log('🚀 Running pending migrations...\n')
    
    const result = await runPendingMigrations(MIGRATIONS_DIR)
    
    if (result.executed.length > 0) {
      console.log('✅ Successfully executed migrations:')
      result.executed.forEach(id => console.log(`  ${id}`))
      console.log()
    }
    
    if (result.failed.length > 0) {
      console.log('❌ Failed migrations:')
      result.failed.forEach(id => console.log(`  ${id}`))
      console.log()
      process.exit(1)
    }
    
    if (result.executed.length === 0 && result.failed.length === 0) {
      console.log('✨ No pending migrations to run')
    }
    
  } catch (error) {
    console.error('❌ Failed to run migrations:', error)
    process.exit(1)
  }
}

/**
 * Rollback a migration
 */
async function rollbackMigrationById(migrationId: string) {
  try {
    console.log(`🔄 Rolling back migration ${migrationId}...\n`)
    
    const migrationFiles = await loadMigrationFiles(MIGRATIONS_DIR)
    const migration = migrationFiles.find(m => m.id === migrationId)
    
    if (!migration) {
      console.error(`❌ Migration ${migrationId} not found`)
      process.exit(1)
    }
    
    if (!migration.down) {
      console.error(`❌ Migration ${migrationId} does not have a rollback script`)
      process.exit(1)
    }
    
    await rollbackMigration(migration)
    console.log(`✅ Successfully rolled back migration ${migrationId}`)
    
  } catch (error) {
    console.error(`❌ Failed to rollback migration ${migrationId}:`, error)
    process.exit(1)
  }
}

/**
 * Validate migrations
 */
async function validateMigrationsIntegrity() {
  try {
    console.log('🔍 Validating migration integrity...\n')
    
    const validation = await validateMigrations(MIGRATIONS_DIR)
    
    if (validation.valid) {
      console.log('✅ All migrations are valid')
    } else {
      console.log('❌ Migration validation failed:')
      validation.issues.forEach(issue => {
        console.log(`  • ${issue}`)
      })
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Failed to validate migrations:', error)
    process.exit(1)
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  switch (command) {
    case 'status':
      await showStatus()
      break
      
    case 'up':
      await runMigrations()
      break
      
    case 'down':
      const migrationId = args[1]
      if (!migrationId) {
        console.error('❌ Migration ID required for rollback')
        console.log('Usage: tsx scripts/migrate.ts down [migration-id]')
        process.exit(1)
      }
      await rollbackMigrationById(migrationId)
      break
      
    case 'validate':
      await validateMigrationsIntegrity()
      break
      
    case 'help':
    case '--help':
    case '-h':
      showHelp()
      break
      
    default:
      console.error(`❌ Unknown command: ${command}`)
      showHelp()
      process.exit(1)
  }
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Migration CLI failed:', error)
    process.exit(1)
  })
}