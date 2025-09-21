/**
 * Database Utilities
 * 
 * This file provides utility functions for database operations,
 * transaction management, and error handling.
 */

import { db, type DrizzleDatabase } from './connection'
import { sql } from 'drizzle-orm'

/**
 * Transaction wrapper with proper error handling
 */
export async function withTransaction<T>(
  callback: (tx: DrizzleDatabase) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    try {
      return await callback(tx)
    } catch (error) {
      // Transaction will be automatically rolled back
      console.error('[Database] Transaction failed:', error)
      throw error
    }
  })
}

/**
 * Execute raw SQL with proper error handling
 */
export async function executeRawSQL(query: string, params?: any[]): Promise<any[]> {
  try {
    const result = await db.execute(sql.raw(query, params))
    return result
  } catch (error) {
    console.error('[Database] Raw SQL execution failed:', error)
    throw error
  }
}

/**
 * Check if a table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      )
    `)
    
    return result[0]?.exists === true
  } catch (error) {
    console.error(`[Database] Failed to check if table '${tableName}' exists:`, error)
    return false
  }
}

/**
 * Get table row count
 */
export async function getTableRowCount(tableName: string): Promise<number> {
  try {
    const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`))
    return Number(result[0]?.count || 0)
  } catch (error) {
    console.error(`[Database] Failed to get row count for table '${tableName}':`, error)
    return 0
  }
}

/**
 * Validate database schema integrity
 */
export async function validateSchemaIntegrity(): Promise<{
  valid: boolean
  issues: string[]
  tables: Record<string, boolean>
}> {
  const issues: string[] = []
  const tables: Record<string, boolean> = {}
  
  // Required tables for the application
  const requiredTables = [
    'users',
    'organizations', 
    'organization_memberships',
    'roles',
    'permissions',
    'role_permissions',
    'invitations',
    'audit_logs',
    'onboarding_content',
    'content_templates',
    'interactive_elements'
  ]
  
  try {
    // Check if all required tables exist
    for (const tableName of requiredTables) {
      const exists = await tableExists(tableName)
      tables[tableName] = exists
      
      if (!exists) {
        issues.push(`Missing required table: ${tableName}`)
      }
    }
    
    // Check for foreign key constraints
    const constraintResult = await db.execute(sql`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
    `)
    
    const foreignKeys = constraintResult.length
    if (foreignKeys === 0) {
      issues.push('No foreign key constraints found - data integrity may be compromised')
    }
    
    // Check for indexes on commonly queried columns
    const indexResult = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `)
    
    const indexes = indexResult.length
    if (indexes < 5) {
      issues.push('Insufficient indexes found - query performance may be poor')
    }
    
  } catch (error) {
    issues.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return {
    valid: issues.length === 0,
    issues,
    tables
  }
}

/**
 * Get database version and configuration info
 */
export async function getDatabaseInfo(): Promise<{
  version: string
  encoding: string
  timezone: string
  maxConnections: number
  sharedBuffers: string
}> {
  try {
    const versionResult = await db.execute(sql`SELECT version()`)
    const configResult = await db.execute(sql`
      SELECT name, setting 
      FROM pg_settings 
      WHERE name IN ('server_encoding', 'timezone', 'max_connections', 'shared_buffers')
    `)
    
    const config = configResult.reduce((acc: any, row: any) => {
      acc[row.name] = row.setting
      return acc
    }, {})
    
    return {
      version: versionResult[0]?.version || 'Unknown',
      encoding: config.server_encoding || 'Unknown',
      timezone: config.timezone || 'Unknown',
      maxConnections: Number(config.max_connections || 0),
      sharedBuffers: config.shared_buffers || 'Unknown'
    }
    
  } catch (error) {
    console.error('[Database] Failed to get database info:', error)
    return {
      version: 'Unknown',
      encoding: 'Unknown', 
      timezone: 'Unknown',
      maxConnections: 0,
      sharedBuffers: 'Unknown'
    }
  }
}

/**
 * Clean up test data (useful for testing)
 */
export async function cleanupTestData(): Promise<void> {
  try {
    await withTransaction(async (tx) => {
      // Delete in reverse dependency order to avoid foreign key violations
      await tx.execute(sql`DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 hour'`)
      await tx.execute(sql`DELETE FROM invitations WHERE email LIKE '%test%' OR email LIKE '%example%'`)
      await tx.execute(sql`DELETE FROM organization_memberships WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%' OR email LIKE '%example%')`)
      await tx.execute(sql`DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example%'`)
      await tx.execute(sql`DELETE FROM organizations WHERE name LIKE '%Test%' OR name LIKE '%Example%'`)
    })
    
    console.log('[Database] Test data cleanup completed')
  } catch (error) {
    console.error('[Database] Test data cleanup failed:', error)
    throw error
  }
}

/**
 * Seed initial data (useful for development and testing)
 */
export async function seedInitialData(): Promise<void> {
  try {
    await withTransaction(async (tx) => {
      // Check if system roles exist
      const rolesResult = await tx.execute(sql`
        SELECT COUNT(*) as count FROM roles WHERE is_system_role = true
      `)
      
      const systemRolesCount = Number(rolesResult[0]?.count || 0)
      
      if (systemRolesCount === 0) {
        // Create system roles
        await tx.execute(sql`
          INSERT INTO roles (name, description, is_system_role, permissions) VALUES
          ('Admin', 'Full system administrator access', true, '["admin", "user.read", "user.write", "organization.read", "organization.write"]'),
          ('Member', 'Standard organization member', true, '["user.read", "organization.read"]'),
          ('Viewer', 'Read-only access', true, '["user.read", "organization.read"]')
          ON CONFLICT (name) DO NOTHING
        `)
        
        console.log('[Database] System roles seeded')
      }
      
      // Check if system permissions exist
      const permissionsResult = await tx.execute(sql`
        SELECT COUNT(*) as count FROM permissions
      `)
      
      const permissionsCount = Number(permissionsResult[0]?.count || 0)
      
      if (permissionsCount === 0) {
        // Create system permissions
        await tx.execute(sql`
          INSERT INTO permissions (name, description, resource, action) VALUES
          ('admin', 'Full administrative access', 'system', 'all'),
          ('user.read', 'Read user information', 'user', 'read'),
          ('user.write', 'Create and update users', 'user', 'write'),
          ('organization.read', 'Read organization information', 'organization', 'read'),
          ('organization.write', 'Create and update organizations', 'organization', 'write'),
          ('content.read', 'Read content and templates', 'content', 'read'),
          ('content.write', 'Create and update content', 'content', 'write')
          ON CONFLICT (name) DO NOTHING
        `)
        
        console.log('[Database] System permissions seeded')
      }
    })
    
    console.log('[Database] Initial data seeding completed')
  } catch (error) {
    console.error('[Database] Initial data seeding failed:', error)
    throw error
  }
}