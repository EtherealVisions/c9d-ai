/**
 * Migration Runner
 * 
 * This file provides programmatic access to migration functionality
 * for integration with the application and development tools.
 */

import { join } from 'path'
import { 
  getMigrationStatus, 
  runPendingMigrations, 
  validateMigrations,
  ensureMigrationTable,
  type MigrationStatus
} from './migrations/migration-utils'

const MIGRATIONS_DIR = join(__dirname, 'migrations')

/**
 * Migration runner class for programmatic access
 */
export class MigrationRunner {
  private migrationsDir: string

  constructor(migrationsDir?: string) {
    this.migrationsDir = migrationsDir || MIGRATIONS_DIR
  }

  /**
   * Initialize migration system
   */
  async initialize(): Promise<void> {
    await ensureMigrationTable()
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    return await getMigrationStatus(this.migrationsDir)
  }

  /**
   * Run pending migrations
   */
  async runPending(): Promise<{
    executed: string[]
    failed: string[]
    skipped: string[]
  }> {
    return await runPendingMigrations(this.migrationsDir)
  }

  /**
   * Validate migration integrity
   */
  async validate(): Promise<{
    valid: boolean
    issues: string[]
  }> {
    return await validateMigrations(this.migrationsDir)
  }

  /**
   * Check if migrations are needed
   */
  async hasPendingMigrations(): Promise<boolean> {
    const status = await this.getStatus()
    return status.pending.length > 0
  }

  /**
   * Auto-migrate in development
   */
  async autoMigrate(): Promise<boolean> {
    const nodeEnv = process.env.NODE_ENV || 'development'
    
    // Only auto-migrate in development
    if (nodeEnv !== 'development') {
      console.warn('[Migration] Auto-migration is only available in development mode')
      return false
    }

    try {
      await this.initialize()
      
      const hasPending = await this.hasPendingMigrations()
      if (!hasPending) {
        console.log('[Migration] No pending migrations')
        return true
      }

      console.log('[Migration] Running pending migrations in development mode...')
      const result = await this.runPending()
      
      if (result.failed.length > 0) {
        console.error('[Migration] Some migrations failed:', result.failed)
        return false
      }

      console.log('[Migration] Auto-migration completed successfully')
      return true

    } catch (error) {
      console.error('[Migration] Auto-migration failed:', error)
      return false
    }
  }

  /**
   * Health check for migration system
   */
  async healthCheck(): Promise<{
    healthy: boolean
    issues: string[]
    status: MigrationStatus
  }> {
    const issues: string[] = []
    let status: MigrationStatus

    try {
      await this.initialize()
      status = await this.getStatus()
      
      // Check for failed migrations
      if (status.failed.length > 0) {
        issues.push(`${status.failed.length} failed migrations found`)
      }

      // Validate migration integrity
      const validation = await this.validate()
      if (!validation.valid) {
        issues.push(...validation.issues)
      }

    } catch (error) {
      issues.push(`Migration system error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      status = {
        pending: [],
        applied: [],
        failed: [],
        total: 0
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      status
    }
  }
}

/**
 * Default migration runner instance
 */
export const migrationRunner = new MigrationRunner()

/**
 * Initialize migrations on module load in development
 */
if (process.env.NODE_ENV === 'development') {
  // Auto-initialize in development, but don't block module loading
  migrationRunner.initialize().catch(error => {
    console.warn('[Migration] Failed to initialize migration system:', error)
  })
}