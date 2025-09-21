/**
 * Comprehensive Migration System Tests
 * 
 * This test suite validates all migration functionality
 * with exceptional coverage and reliability.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

// Mock filesystem operations
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn()
}))

// Mock database connection
const mockDb = {
  execute: vi.fn(),
  transaction: vi.fn()
}

vi.mock('../../lib/db/connection', () => ({
  db: mockDb
}))

// Mock SQL template literal
vi.mock('drizzle-orm', () => ({
  sql: {
    raw: vi.fn((query, params) => ({ query, params }))
  }
}))

describe('Migration System - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  describe('Migration Table Management', () => {
    it('should ensure migration table exists', async () => {
      // Arrange
      mockDb.execute.mockResolvedValue([])
      
      // Act
      const { ensureMigrationTable } = await import('../../lib/db/migrations/migration-utils')
      await ensureMigrationTable()
      
      // Assert
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('CREATE TABLE IF NOT EXISTS drizzle_migrations')
        })
      )
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_drizzle_migrations_executed_at')
        })
      )
    })

    it('should handle migration table creation failure', async () => {
      // Arrange
      mockDb.execute.mockRejectedValue(new Error('Table creation failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act & Assert
      const { ensureMigrationTable } = await import('../../lib/db/migrations/migration-utils')
      await expect(ensureMigrationTable()).rejects.toThrow('Table creation failed')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to ensure migration table'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Migration File Loading', () => {
    it('should load migration files successfully', async () => {
      // Arrange
      const mockFiles = ['0001_initial_schema.sql', '0002_add_users.sql', 'invalid_file.txt']
      const mockContent1 = `-- UP MIGRATION
CREATE TABLE users (id UUID PRIMARY KEY);
-- DOWN MIGRATION
DROP TABLE users;`
      const mockContent2 = `-- UP MIGRATION
ALTER TABLE users ADD COLUMN email VARCHAR(255);
-- DOWN MIGRATION
ALTER TABLE users DROP COLUMN email;`
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile)
        .mockResolvedValueOnce(mockContent1)
        .mockResolvedValueOnce(mockContent2)
      
      // Act
      const { loadMigrationFiles } = await import('../../lib/db/migrations/migration-utils')
      const migrations = await loadMigrationFiles('/test/migrations')
      
      // Assert
      expect(migrations).toHaveLength(2)
      expect(migrations[0]).toEqual({
        id: '0001',
        name: 'initial schema',
        filename: '0001_initial_schema.sql',
        up: 'CREATE TABLE users (id UUID PRIMARY KEY);',
        down: 'DROP TABLE users;',
        checksum: expect.any(String)
      })
      expect(migrations[1]).toEqual({
        id: '0002',
        name: 'add users',
        filename: '0002_add_users.sql',
        up: 'ALTER TABLE users ADD COLUMN email VARCHAR(255);',
        down: 'ALTER TABLE users DROP COLUMN email;',
        checksum: expect.any(String)
      })
    })

    it('should handle migration files without down migration', async () => {
      // Arrange
      const mockFiles = ['0001_initial_schema.sql']
      const mockContent = `-- UP MIGRATION
CREATE TABLE users (id UUID PRIMARY KEY);`
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      
      // Act
      const { loadMigrationFiles } = await import('../../lib/db/migrations/migration-utils')
      const migrations = await loadMigrationFiles('/test/migrations')
      
      // Assert
      expect(migrations).toHaveLength(1)
      expect(migrations[0].down).toBeUndefined()
    })

    it('should skip invalid migration filenames', async () => {
      // Arrange
      const mockFiles = ['invalid_name.sql', 'also_invalid.sql']
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      
      // Act
      const { loadMigrationFiles } = await import('../../lib/db/migrations/migration-utils')
      const migrations = await loadMigrationFiles('/test/migrations')
      
      // Assert
      expect(migrations).toHaveLength(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping invalid migration filename')
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle file loading errors', async () => {
      // Arrange
      vi.mocked(readdir).mockRejectedValue(new Error('Directory not found'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act & Assert
      const { loadMigrationFiles } = await import('../../lib/db/migrations/migration-utils')
      await expect(loadMigrationFiles('/invalid/path')).rejects.toThrow('Directory not found')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load migration files'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should sort migration files by ID', async () => {
      // Arrange
      const mockFiles = ['0003_third.sql', '0001_first.sql', '0002_second.sql']
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      
      // Act
      const { loadMigrationFiles } = await import('../../lib/db/migrations/migration-utils')
      const migrations = await loadMigrationFiles('/test/migrations')
      
      // Assert
      expect(migrations).toHaveLength(3)
      expect(migrations[0].id).toBe('0001')
      expect(migrations[1].id).toBe('0002')
      expect(migrations[2].id).toBe('0003')
    })
  })

  describe('Applied Migrations', () => {
    it('should get applied migrations successfully', async () => {
      // Arrange
      const mockAppliedMigrations = [
        {
          id: '0001',
          name: 'initial schema',
          executed_at: '2023-01-01T00:00:00Z',
          checksum: 'abc123',
          success: true,
          error_message: null
        },
        {
          id: '0002',
          name: 'add users',
          executed_at: '2023-01-02T00:00:00Z',
          checksum: 'def456',
          success: true,
          error_message: null
        }
      ]
      
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockAppliedMigrations) // getAppliedMigrations
      
      // Act
      const { getAppliedMigrations } = await import('../../lib/db/migrations/migration-utils')
      const applied = await getAppliedMigrations()
      
      // Assert
      expect(applied).toHaveLength(2)
      expect(applied[0]).toEqual({
        id: '0001',
        name: 'initial schema',
        executedAt: new Date('2023-01-01T00:00:00Z'),
        checksum: 'abc123',
        success: true,
        errorMessage: null
      })
    })

    it('should handle applied migrations query failure', async () => {
      // Arrange
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockRejectedValueOnce(new Error('Query failed'))
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act & Assert
      const { getAppliedMigrations } = await import('../../lib/db/migrations/migration-utils')
      await expect(getAppliedMigrations()).rejects.toThrow('Query failed')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get applied migrations'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Migration Status', () => {
    it('should get migration status correctly', async () => {
      // Arrange
      const mockFiles = ['0001_initial.sql', '0002_users.sql', '0003_roles.sql']
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      const mockApplied = [
        {
          id: '0001',
          name: 'initial',
          executed_at: '2023-01-01T00:00:00Z',
          checksum: 'abc123',
          success: true,
          error_message: null
        },
        {
          id: '0002',
          name: 'users',
          executed_at: '2023-01-02T00:00:00Z',
          checksum: 'def456',
          success: false,
          error_message: 'Migration failed'
        }
      ]
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations
      
      // Act
      const { getMigrationStatus } = await import('../../lib/db/migrations/migration-utils')
      const status = await getMigrationStatus('/test/migrations')
      
      // Assert
      expect(status.total).toBe(3)
      expect(status.applied).toHaveLength(1) // Only successful ones
      expect(status.failed).toHaveLength(1)
      expect(status.pending).toHaveLength(1) // 0003 is pending
      expect(status.pending[0].id).toBe('0003')
    })

    it('should handle migration status errors', async () => {
      // Arrange
      vi.mocked(readdir).mockRejectedValue(new Error('Directory error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act & Assert
      const { getMigrationStatus } = await import('../../lib/db/migrations/migration-utils')
      await expect(getMigrationStatus('/invalid/path')).rejects.toThrow('Directory error')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get migration status'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Migration Execution', () => {
    it('should execute migration successfully', async () => {
      // Arrange
      const migration = {
        id: '0001',
        name: 'initial schema',
        filename: '0001_initial_schema.sql',
        up: 'CREATE TABLE users (id UUID PRIMARY KEY);',
        down: 'DROP TABLE users;',
        checksum: 'abc123'
      }
      
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          execute: mockDb.execute
        })
      })
      mockDb.transaction = mockTransaction
      mockDb.execute.mockResolvedValue([])
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // Act
      const { executeMigration } = await import('../../lib/db/migrations/migration-utils')
      await executeMigration(migration)
      
      // Assert
      expect(mockTransaction).toHaveBeenCalled()
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'CREATE TABLE users (id UUID PRIMARY KEY);'
        })
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully executed migration 0001')
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle migration execution failure', async () => {
      // Arrange
      const migration = {
        id: '0001',
        name: 'initial schema',
        filename: '0001_initial_schema.sql',
        up: 'INVALID SQL;',
        checksum: 'abc123'
      }
      
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        throw new Error('SQL syntax error')
      })
      mockDb.transaction = mockTransaction
      mockDb.execute.mockResolvedValue([]) // For recording failure
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act & Assert
      const { executeMigration } = await import('../../lib/db/migrations/migration-utils')
      await expect(executeMigration(migration)).rejects.toThrow('SQL syntax error')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to execute migration 0001'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should record migration failure in database', async () => {
      // Arrange
      const migration = {
        id: '0001',
        name: 'initial schema',
        filename: '0001_initial_schema.sql',
        up: 'INVALID SQL;',
        checksum: 'abc123'
      }
      
      const mockTransaction = vi.fn().mockRejectedValue(new Error('SQL error'))
      mockDb.transaction = mockTransaction
      mockDb.execute.mockResolvedValue([])
      
      // Act
      const { executeMigration } = await import('../../lib/db/migrations/migration-utils')
      try {
        await executeMigration(migration)
      } catch (error) {
        // Expected to throw
      }
      
      // Assert - Should record failure
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('INSERT INTO drizzle_migrations')
        })
      )
    })
  })

  describe('Migration Rollback', () => {
    it('should rollback migration successfully', async () => {
      // Arrange
      const migration = {
        id: '0001',
        name: 'initial schema',
        filename: '0001_initial_schema.sql',
        up: 'CREATE TABLE users (id UUID PRIMARY KEY);',
        down: 'DROP TABLE users;',
        checksum: 'abc123'
      }
      
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          execute: mockDb.execute
        })
      })
      mockDb.transaction = mockTransaction
      mockDb.execute.mockResolvedValue([])
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // Act
      const { rollbackMigration } = await import('../../lib/db/migrations/migration-utils')
      await rollbackMigration(migration)
      
      // Assert
      expect(mockTransaction).toHaveBeenCalled()
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'DROP TABLE users;'
        })
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully rolled back migration 0001')
      )
      
      consoleSpy.mockRestore()
    })

    it('should throw error for migration without rollback script', async () => {
      // Arrange
      const migration = {
        id: '0001',
        name: 'initial schema',
        filename: '0001_initial_schema.sql',
        up: 'CREATE TABLE users (id UUID PRIMARY KEY);',
        checksum: 'abc123'
      }
      
      // Act & Assert
      const { rollbackMigration } = await import('../../lib/db/migrations/migration-utils')
      await expect(rollbackMigration(migration)).rejects.toThrow(
        'Migration 0001 does not have a rollback script'
      )
    })

    it('should handle rollback failure', async () => {
      // Arrange
      const migration = {
        id: '0001',
        name: 'initial schema',
        filename: '0001_initial_schema.sql',
        up: 'CREATE TABLE users (id UUID PRIMARY KEY);',
        down: 'DROP TABLE users;',
        checksum: 'abc123'
      }
      
      const mockTransaction = vi.fn().mockRejectedValue(new Error('Rollback failed'))
      mockDb.transaction = mockTransaction
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act & Assert
      const { rollbackMigration } = await import('../../lib/db/migrations/migration-utils')
      await expect(rollbackMigration(migration)).rejects.toThrow('Rollback failed')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to rollback migration 0001'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Pending Migrations Execution', () => {
    it('should run all pending migrations successfully', async () => {
      // Arrange
      const mockFiles = ['0001_initial.sql', '0002_users.sql']
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      const mockApplied: any[] = [] // No applied migrations
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations
      
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({ execute: mockDb.execute })
      })
      mockDb.transaction = mockTransaction
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // Act
      const { runPendingMigrations } = await import('../../lib/db/migrations/migration-utils')
      const result = await runPendingMigrations('/test/migrations')
      
      // Assert
      expect(result.executed).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
      expect(result.executed).toContain('0001')
      expect(result.executed).toContain('0002')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 pending migrations')
      )
      
      consoleSpy.mockRestore()
    })

    it('should stop on first migration failure', async () => {
      // Arrange
      const mockFiles = ['0001_initial.sql', '0002_users.sql']
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      const mockApplied: any[] = []
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations
      
      let callCount = 0
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        if (callCount === 0) {
          callCount++
          return await callback({ execute: mockDb.execute })
        } else {
          throw new Error('Second migration failed')
        }
      })
      mockDb.transaction = mockTransaction
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act
      const { runPendingMigrations } = await import('../../lib/db/migrations/migration-utils')
      const result = await runPendingMigrations('/test/migrations')
      
      // Assert
      expect(result.executed).toHaveLength(1)
      expect(result.failed).toHaveLength(1)
      expect(result.executed).toContain('0001')
      expect(result.failed).toContain('0002')
      
      consoleSpy.mockRestore()
    })

    it('should handle no pending migrations', async () => {
      // Arrange
      const mockFiles = ['0001_initial.sql']
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      const mockApplied = [
        {
          id: '0001',
          name: 'initial',
          executed_at: '2023-01-01T00:00:00Z',
          checksum: expect.any(String),
          success: true,
          error_message: null
        }
      ]
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // Act
      const { runPendingMigrations } = await import('../../lib/db/migrations/migration-utils')
      const result = await runPendingMigrations('/test/migrations')
      
      // Assert
      expect(result.executed).toHaveLength(0)
      expect(result.failed).toHaveLength(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No pending migrations')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Migration Validation', () => {
    it('should validate migrations successfully', async () => {
      // Arrange
      const mockFiles = ['0001_initial.sql', '0002_users.sql']
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      const mockApplied = [
        {
          id: '0001',
          name: 'initial',
          executed_at: '2023-01-01T00:00:00Z',
          checksum: expect.any(String),
          success: true,
          error_message: null
        }
      ]
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations
      
      // Act
      const { validateMigrations } = await import('../../lib/db/migrations/migration-utils')
      const validation = await validateMigrations('/test/migrations')
      
      // Assert
      expect(validation.valid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('should detect checksum mismatches', async () => {
      // Arrange
      const mockFiles = ['0001_initial.sql']
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      const mockApplied = [
        {
          id: '0001',
          name: 'initial',
          executed_at: '2023-01-01T00:00:00Z',
          checksum: 'different_checksum',
          success: true,
          error_message: null
        }
      ]
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations
      
      // Act
      const { validateMigrations } = await import('../../lib/db/migrations/migration-utils')
      const validation = await validateMigrations('/test/migrations')
      
      // Assert
      expect(validation.valid).toBe(false)
      expect(validation.issues).toContain(
        expect.stringContaining('Migration 0001 checksum mismatch')
      )
    })

    it('should detect missing migration files', async () => {
      // Arrange
      const mockFiles: string[] = [] // No files
      const mockApplied = [
        {
          id: '0001',
          name: 'initial',
          executed_at: '2023-01-01T00:00:00Z',
          checksum: 'abc123',
          success: true,
          error_message: null
        }
      ]
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations
      
      // Act
      const { validateMigrations } = await import('../../lib/db/migrations/migration-utils')
      const validation = await validateMigrations('/test/migrations')
      
      // Assert
      expect(validation.valid).toBe(false)
      expect(validation.issues).toContain(
        expect.stringContaining('Applied migration 0001 has no corresponding file')
      )
    })

    it('should detect gaps in migration sequence', async () => {
      // Arrange
      const mockFiles = ['0001_initial.sql', '0003_skip_two.sql'] // Missing 0002
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      const mockApplied: any[] = []
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations
      
      // Act
      const { validateMigrations } = await import('../../lib/db/migrations/migration-utils')
      const validation = await validateMigrations('/test/migrations')
      
      // Assert
      expect(validation.valid).toBe(false)
      expect(validation.issues).toContain(
        expect.stringContaining('Gap in migration sequence between 0001 and 0003')
      )
    })

    it('should handle validation errors gracefully', async () => {
      // Arrange
      vi.mocked(readdir).mockRejectedValue(new Error('Validation error'))
      
      // Act
      const { validateMigrations } = await import('../../lib/db/migrations/migration-utils')
      const validation = await validateMigrations('/invalid/path')
      
      // Assert
      expect(validation.valid).toBe(false)
      expect(validation.issues).toContain(
        expect.stringContaining('Validation failed: Validation error')
      )
    })
  })

  describe('Migration Runner', () => {
    it('should initialize migration runner', async () => {
      // Act
      const { MigrationRunner } = await import('../../lib/db/migration-runner')
      const runner = new MigrationRunner('/test/migrations')
      
      // Assert
      expect(runner).toBeDefined()
    })

    it('should initialize migration system', async () => {
      // Arrange
      mockDb.execute.mockResolvedValue([])
      
      // Act
      const { MigrationRunner } = await import('../../lib/db/migration-runner')
      const runner = new MigrationRunner('/test/migrations')
      await runner.initialize()
      
      // Assert
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('CREATE TABLE IF NOT EXISTS drizzle_migrations')
        })
      )
    })

    it('should check for pending migrations', async () => {
      // Arrange
      const mockFiles = ['0001_initial.sql', '0002_users.sql']
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      const mockApplied = [
        {
          id: '0001',
          name: 'initial',
          executed_at: '2023-01-01T00:00:00Z',
          checksum: expect.any(String),
          success: true,
          error_message: null
        }
      ]
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations
      
      // Act
      const { MigrationRunner } = await import('../../lib/db/migration-runner')
      const runner = new MigrationRunner('/test/migrations')
      const hasPending = await runner.hasPendingMigrations()
      
      // Assert
      expect(hasPending).toBe(true)
    })

    it('should perform health check', async () => {
      // Arrange
      const mockFiles = ['0001_initial.sql']
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      const mockApplied = [
        {
          id: '0001',
          name: 'initial',
          executed_at: '2023-01-01T00:00:00Z',
          checksum: expect.any(String),
          success: true,
          error_message: null
        }
      ]
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations (status)
        .mockResolvedValueOnce([]) // ensureMigrationTable (validate)
        .mockResolvedValueOnce([]) // ensureMigrationTable index (validate)
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations (validate)
      
      // Act
      const { MigrationRunner } = await import('../../lib/db/migration-runner')
      const runner = new MigrationRunner('/test/migrations')
      const health = await runner.healthCheck()
      
      // Assert
      expect(health.healthy).toBe(true)
      expect(health.issues).toHaveLength(0)
      expect(health.status).toBeDefined()
    })

    it('should auto-migrate in development', async () => {
      // Arrange
      process.env.NODE_ENV = 'development'
      const mockFiles = ['0001_initial.sql']
      const mockContent = '-- UP MIGRATION\nCREATE TABLE test;'
      const mockApplied: any[] = []
      
      vi.mocked(readdir).mockResolvedValue(mockFiles as any)
      vi.mocked(readFile).mockResolvedValue(mockContent)
      mockDb.execute
        .mockResolvedValueOnce([]) // ensureMigrationTable
        .mockResolvedValueOnce([]) // ensureMigrationTable index
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations (hasPending)
        .mockResolvedValueOnce([]) // ensureMigrationTable (runPending)
        .mockResolvedValueOnce([]) // ensureMigrationTable index (runPending)
        .mockResolvedValueOnce(mockApplied) // getAppliedMigrations (runPending)
      
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({ execute: mockDb.execute })
      })
      mockDb.transaction = mockTransaction
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // Act
      const { MigrationRunner } = await import('../../lib/db/migration-runner')
      const runner = new MigrationRunner('/test/migrations')
      const result = await runner.autoMigrate()
      
      // Assert
      expect(result).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Running pending migrations in development mode')
      )
      
      consoleSpy.mockRestore()
    })

    it('should not auto-migrate in production', async () => {
      // Arrange
      process.env.NODE_ENV = 'production'
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Act
      const { MigrationRunner } = await import('../../lib/db/migration-runner')
      const runner = new MigrationRunner('/test/migrations')
      const result = await runner.autoMigrate()
      
      // Assert
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-migration is only available in development mode')
      )
      
      consoleSpy.mockRestore()
    })
  })
})