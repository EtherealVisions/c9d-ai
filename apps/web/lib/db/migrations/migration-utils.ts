/**
 * Database Migration Utilities
 * 
 * This file provides utilities for managing database migrations,
 * including validation, rollback capabilities, and migration tracking.
 */

import { db } from '../connection'
import { sql } from 'drizzle-orm'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Migration record structure
 */
export interface MigrationRecord {
  id: string
  name: string
  executedAt: Date
  checksum: string
  success: boolean
  errorMessage?: string
}

/**
 * Migration file structure
 */
export interface MigrationFile {
  id: string
  name: string
  filename: string
  up: string
  down?: string
  checksum: string
}

/**
 * Migration status
 */
export interface MigrationStatus {
  pending: MigrationFile[]
  applied: MigrationRecord[]
  failed: MigrationRecord[]
  total: number
}

/**
 * Ensure migration tracking table exists
 */
export async function ensureMigrationTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS drizzle_migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    
    // Create index for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_drizzle_migrations_executed_at 
      ON drizzle_migrations(executed_at)
    `)
    
    console.log('[Migration] Migration tracking table ensured')
  } catch (error) {
    console.error('[Migration] Failed to ensure migration table:', error)
    throw error
  }
}

/**
 * Calculate checksum for migration content
 */
function calculateChecksum(content: string): string {
  // Simple checksum calculation (in production, use crypto.createHash)
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Load migration files from directory
 */
export async function loadMigrationFiles(migrationsDir: string): Promise<MigrationFile[]> {
  try {
    const files = await readdir(migrationsDir)
    const migrationFiles: MigrationFile[] = []
    
    for (const filename of files) {
      if (!filename.endsWith('.sql')) continue
      
      const filePath = join(migrationsDir, filename)
      const content = await readFile(filePath, 'utf-8')
      
      // Parse migration ID and name from filename
      // Expected format: 0001_initial_schema.sql
      const match = filename.match(/^(\d+)_(.+)\.sql$/)
      if (!match) {
        console.warn(`[Migration] Skipping invalid migration filename: ${filename}`)
        continue
      }
      
      const [, id, name] = match
      
      // Split up and down migrations if present
      const sections = content.split('-- DOWN MIGRATION')
      const up = sections[0].replace('-- UP MIGRATION', '').trim()
      const down = sections[1]?.trim()
      
      migrationFiles.push({
        id,
        name: name.replace(/_/g, ' '),
        filename,
        up,
        down,
        checksum: calculateChecksum(up)
      })
    }
    
    // Sort by ID
    return migrationFiles.sort((a, b) => a.id.localeCompare(b.id))
    
  } catch (error) {
    console.error('[Migration] Failed to load migration files:', error)
    throw error
  }
}

/**
 * Get applied migrations from database
 */
export async function getAppliedMigrations(): Promise<MigrationRecord[]> {
  try {
    await ensureMigrationTable()
    
    const result = await db.execute(sql`
      SELECT id, name, executed_at, checksum, success, error_message
      FROM drizzle_migrations
      ORDER BY executed_at ASC
    `)
    
    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      executedAt: new Date(row.executed_at),
      checksum: row.checksum,
      success: row.success,
      errorMessage: row.error_message
    }))
    
  } catch (error) {
    console.error('[Migration] Failed to get applied migrations:', error)
    throw error
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(migrationsDir: string): Promise<MigrationStatus> {
  try {
    const [migrationFiles, appliedMigrations] = await Promise.all([
      loadMigrationFiles(migrationsDir),
      getAppliedMigrations()
    ])
    
    const appliedIds = new Set(appliedMigrations.map(m => m.id))
    const pending = migrationFiles.filter(f => !appliedIds.has(f.id))
    const failed = appliedMigrations.filter(m => !m.success)
    
    return {
      pending,
      applied: appliedMigrations.filter(m => m.success),
      failed,
      total: migrationFiles.length
    }
    
  } catch (error) {
    console.error('[Migration] Failed to get migration status:', error)
    throw error
  }
}

/**
 * Execute a single migration
 */
export async function executeMigration(migration: MigrationFile): Promise<void> {
  try {
    console.log(`[Migration] Executing migration ${migration.id}: ${migration.name}`)
    
    await db.transaction(async (tx) => {
      // Execute the migration SQL
      await tx.execute(sql.raw(migration.up))
      
      // Record the migration
      await tx.execute(sql`
        INSERT INTO drizzle_migrations (id, name, checksum, success)
        VALUES (${migration.id}, ${migration.name}, ${migration.checksum}, true)
        ON CONFLICT (id) DO UPDATE SET
          executed_at = NOW(),
          checksum = EXCLUDED.checksum,
          success = true,
          error_message = NULL,
          updated_at = NOW()
      `)
    })
    
    console.log(`[Migration] Successfully executed migration ${migration.id}`)
    
  } catch (error) {
    console.error(`[Migration] Failed to execute migration ${migration.id}:`, error)
    
    // Record the failure
    try {
      await db.execute(sql`
        INSERT INTO drizzle_migrations (id, name, checksum, success, error_message)
        VALUES (${migration.id}, ${migration.name}, ${migration.checksum}, false, ${error instanceof Error ? error.message : 'Unknown error'})
        ON CONFLICT (id) DO UPDATE SET
          executed_at = NOW(),
          success = false,
          error_message = EXCLUDED.error_message,
          updated_at = NOW()
      `)
    } catch (recordError) {
      console.error('[Migration] Failed to record migration failure:', recordError)
    }
    
    throw error
  }
}

/**
 * Rollback a migration
 */
export async function rollbackMigration(migration: MigrationFile): Promise<void> {
  if (!migration.down) {
    throw new Error(`Migration ${migration.id} does not have a rollback script`)
  }
  
  try {
    console.log(`[Migration] Rolling back migration ${migration.id}: ${migration.name}`)
    
    await db.transaction(async (tx) => {
      // Execute the rollback SQL
      await tx.execute(sql.raw(migration.down!))
      
      // Remove the migration record
      await tx.execute(sql`
        DELETE FROM drizzle_migrations WHERE id = ${migration.id}
      `)
    })
    
    console.log(`[Migration] Successfully rolled back migration ${migration.id}`)
    
  } catch (error) {
    console.error(`[Migration] Failed to rollback migration ${migration.id}:`, error)
    throw error
  }
}

/**
 * Run all pending migrations
 */
export async function runPendingMigrations(migrationsDir: string): Promise<{
  executed: string[]
  failed: string[]
  skipped: string[]
}> {
  const result = {
    executed: [] as string[],
    failed: [] as string[],
    skipped: [] as string[]
  }
  
  try {
    const status = await getMigrationStatus(migrationsDir)
    
    if (status.pending.length === 0) {
      console.log('[Migration] No pending migrations')
      return result
    }
    
    console.log(`[Migration] Found ${status.pending.length} pending migrations`)
    
    for (const migration of status.pending) {
      try {
        await executeMigration(migration)
        result.executed.push(migration.id)
      } catch (error) {
        console.error(`[Migration] Failed to execute migration ${migration.id}:`, error)
        result.failed.push(migration.id)
        
        // Stop on first failure to maintain consistency
        break
      }
    }
    
    console.log(`[Migration] Migration run completed: ${result.executed.length} executed, ${result.failed.length} failed`)
    
  } catch (error) {
    console.error('[Migration] Failed to run pending migrations:', error)
    throw error
  }
  
  return result
}

/**
 * Validate migration integrity
 */
export async function validateMigrations(migrationsDir: string): Promise<{
  valid: boolean
  issues: string[]
}> {
  const issues: string[] = []
  
  try {
    const [migrationFiles, appliedMigrations] = await Promise.all([
      loadMigrationFiles(migrationsDir),
      getAppliedMigrations()
    ])
    
    // Check for checksum mismatches
    for (const applied of appliedMigrations) {
      const file = migrationFiles.find(f => f.id === applied.id)
      if (file && file.checksum !== applied.checksum) {
        issues.push(`Migration ${applied.id} checksum mismatch - file may have been modified after execution`)
      }
    }
    
    // Check for missing migration files
    for (const applied of appliedMigrations) {
      const file = migrationFiles.find(f => f.id === applied.id)
      if (!file) {
        issues.push(`Applied migration ${applied.id} has no corresponding file`)
      }
    }
    
    // Check for gaps in migration sequence
    const sortedFiles = migrationFiles.sort((a, b) => a.id.localeCompare(b.id))
    for (let i = 1; i < sortedFiles.length; i++) {
      const current = parseInt(sortedFiles[i].id)
      const previous = parseInt(sortedFiles[i - 1].id)
      if (current !== previous + 1) {
        issues.push(`Gap in migration sequence between ${sortedFiles[i - 1].id} and ${sortedFiles[i].id}`)
      }
    }
    
  } catch (error) {
    issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}